import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

import { Router } from 'express';

const ROLES = new Set(['admin', 'operator', 'viewer']);
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SCRYPT = { N: 2 ** 15, r: 8, p: 3, maxmem: 48 * 1024 ** 2 };
const DUMMY_PASSWORD_HASH = 'scrypt-v1:' + Buffer.alloc(16).toString('base64url') + ':' + Buffer.alloc(32).toString('base64url');
const derive = promisify(scrypt);
const SESSION_AGE = 8 * 60 * 60 * 1000;
const ISSUER = 'Shipment Records';

function authError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

function issueSecret() {
  return randomBytes(32).toString('base64url');
}

function tokenHash(token) {
  return typeof token === 'string' && TOKEN.test(token) ? digest(token) : null;
}

function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)) {
    throw authError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  }
  return email;
}

function validateNewPassword(password) {
  const size = typeof password === 'string' ? Buffer.byteLength(password) : 0;
  if (size < 15 || size > 128) {
    throw authError(400, 'INVALID_PASSWORD', 'Use a password between 15 and 128 bytes.');
  }
}

export function parseAuthEncryptionKey(input) {
  const key = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : /^[\da-f]{64}$/i.test(input ?? '')
      ? Buffer.from(input, 'hex')
      : /^[A-Za-z0-9_+\/-]{43}=?$/.test(input ?? '')
        ? Buffer.from(input, 'base64url')
        : null;
  if (!key || key.length !== 32) throw new Error('Configure a random 32-byte encryption key for authenticator secrets.');
  return key;
}

function sealMfaSecret(secret, key, userId) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function openMfaSecret(sealed, key, userId) {
  const envelope = Buffer.from(sealed, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, envelope.subarray(0, 12));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(envelope.subarray(12, 28));
  return Buffer.concat([decipher.update(envelope.subarray(28)), decipher.final()]);
}

function encodeBase32(bytes) {
  let result = '';
  let value = 0;
  let bits = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(value >>> bits) & 31];
    }
  }
  if (bits) result += BASE32[(value << (5 - bits)) & 31];
  return result;
}

export function totpAtStep(secret, step, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = hmac.at(-1) & 15;
  const code = (hmac.readUInt32BE(offset) & 0x7fff_ffff) % (10 ** digits);
  return String(code).padStart(digits, '0');
}

export function matchTotpStep(secret, code, previousStep, currentStep = Math.floor(Date.now() / 30_000)) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
  const supplied = Buffer.from(code);
  for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
    if (step < 0 || (previousStep !== null && step <= Number(previousStep))) continue;
    if (timingSafeEqual(Buffer.from(totpAtStep(secret, step)), supplied)) return step;
  }
  return null;
}

export async function audit(client, { actorId = null, action, targetType, targetId = null, metadata = {} }) {
  await client.query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [actorId, action, targetType, targetId === null ? null : String(targetId), metadata],
  );
}

function publicUser({ id, email, role }) {
  return { id, email, role };
}

function listedUser(user) {
  return {
    ...publicUser(user),
    active: user.active,
    createdAt: user.created_at,
    mfaEnabled: user.totp_enabled,
  };
}

async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function lockedUser(client, id) {
  const result = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id]);
  return result.rows[0];
}

async function clearCredentials(client, userId) {
  await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM auth_challenges WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM auth_password_resets WHERE user_id = $1', [userId]);
}

export function createAuth({
  pool,
  secureCookies,
  appOrigin,
  encryptionKey,
  setupToken = process.env.RECORDS_SETUP_TOKEN,
}) {
  const key = parseAuthEncryptionKey(encryptionKey);
  const router = Router();
  const cookieName = secureCookies ? '__Host-records_session' : 'records_session';
  const cookieOptions = { path: '/', httpOnly: true, sameSite: 'strict', secure: Boolean(secureCookies) };
  const configuredOrigin = appOrigin ? new URL(appOrigin).origin : null;
  const setupHash = typeof setupToken === 'string' && setupToken.length >= 32 ? digest(setupToken) : null;
  let activeDerivations = 0;
  let nextCleanup = 0;

  function checkOrigin(req) {
    if (SAFE_METHODS.has(req.method)) return;
    const expected = configuredOrigin ?? req.protocol + '://' + req.get('host');
    if (req.get('origin') !== expected || req.get('sec-fetch-site') === 'cross-site') {
      throw authError(403, 'FORBIDDEN_ORIGIN', 'This action requires a request from the dashboard.');
    }
  }

  function readSessionHash(req) {
    const cookies = (req.get('cookie') ?? '').split(/;\s*/);
    const prefix = cookieName + '=';
    const match = cookies.find((cookie) => cookie.startsWith(prefix));
    return tokenHash(match?.slice(prefix.length));
  }

  async function authenticate(req) {
    checkOrigin(req);
    const hash = readSessionHash(req);
    if (!hash) return null;
    const lookup = await pool.query(
      "SELECT u.id, u.email, u.role FROM auth_sessions s JOIN users u ON u.id = s.user_id " +
      "WHERE s.token_hash = $1 AND u.active AND u.totp_enabled AND s.expires_at > now() " +
      "AND s.last_used_at > now() - interval '1 hour'",
      [hash],
    );
    const user = lookup.rows[0];
    if (!user) return null;
    await pool.query(
      "UPDATE auth_sessions SET last_used_at = now() WHERE token_hash = $1 AND last_used_at < now() - interval '5 minutes'",
      [hash],
    );
    req.authSessionHash = hash;
    req.user = publicUser(user);
    return req.user;
  }

  async function requireAuth(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!(await authenticate(req))) throw authError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
    next();
  }

  function requireRole(...roles) {
    return async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      const user = req.user ?? await authenticate(req);
      if (!user) throw authError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
      if (!roles.includes(user.role)) throw authError(403, 'FORBIDDEN', 'Your role does not allow this action.');
      next();
    };
  }

  async function derivePassword(password, salt) {
    if (activeDerivations >= 3) {
      throw authError(503, 'AUTH_BUSY', 'Sign-in is busy. Try again shortly.');
    }
    activeDerivations += 1;
    try {
      return await derive(password, salt, 32, SCRYPT);
    } finally {
      activeDerivations -= 1;
    }
  }

  async function makePasswordHash(password) {
    const salt = randomBytes(16);
    const hashed = await derivePassword(password, salt);
    return ['scrypt-v1', salt.toString('base64url'), hashed.toString('base64url')].join(':');
  }

  async function checkPassword(password, stored) {
    const [version, salt, hash] = (stored ?? DUMMY_PASSWORD_HASH).split(':');
    if (version !== 'scrypt-v1') throw new Error('Unknown password hash format');
    const actual = await derivePassword(password, Buffer.from(salt, 'base64url'));
    const match = timingSafeEqual(actual, Buffer.from(hash, 'base64url'));
    return Boolean(stored && match);
  }

  async function sweepExpiredAuthData() {
    if (Date.now() < nextCleanup) return;
    nextCleanup = Date.now() + 15 * 60 * 1000;
    try {
      await pool.query("DELETE FROM auth_rate_limits WHERE window_start < now() - interval '1 hour'");
      await pool.query("DELETE FROM auth_sessions WHERE expires_at <= now() OR last_used_at <= now() - interval '1 hour'");
      await pool.query('DELETE FROM auth_challenges WHERE expires_at <= now()');
      await pool.query('DELETE FROM auth_password_resets WHERE expires_at <= now()');
    } catch {
      // The credential checks below enforce expiry independently of cleanup.
    }
  }

  async function hitLimit(req, res, operation, maxPerIp, account, maxPerAccount = 8) {
    await sweepExpiredAuthData();
    const bucketWindow = Math.floor(Date.now() / 600_000) * 600_000;
    const buckets = [[operation + ':ip:' + (req.ip ?? req.socket.remoteAddress), maxPerIp]];
    if (account) buckets.push([operation + ':account:' + account, maxPerAccount]);
    for (const [name, max] of buckets) {
      const result = await pool.query(
        'INSERT INTO auth_rate_limits (bucket, window_start, hits) VALUES ($1, $2, 1) ' +
        'ON CONFLICT (bucket, window_start) DO UPDATE SET hits = auth_rate_limits.hits + 1 ' +
        'WHERE auth_rate_limits.hits < $3 RETURNING hits',
        [digest(name), new Date(bucketWindow), max],
      );
      if (result.rowCount === 0) {
        res.set('Retry-After', String(Math.max(1, Math.ceil((bucketWindow + 600_000 - Date.now()) / 1000))));
        throw authError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Wait and try again.');
      }
    }
  }

  async function newChallenge(client, user) {
    let mfaSetup;
    if (!user.totp_enabled) {
      const seed = user.totp_secret
        ? openMfaSecret(user.totp_secret, key, user.id)
        : randomBytes(20);
      if (!user.totp_secret) {
        await client.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [sealMfaSecret(seed, key, user.id), user.id]);
      }
      const secret = encodeBase32(seed);
      const label = encodeURIComponent(ISSUER) + ':' + encodeURIComponent(user.email);
      const uri = 'otpauth://totp/' + label + '?secret=' + secret + '&issuer=' + encodeURIComponent(ISSUER) + '&algorithm=SHA1&digits=6&period=30';
      mfaSetup = { secret, uri };
    }
    await client.query('DELETE FROM auth_challenges WHERE user_id = $1', [user.id]);
    const challenge = issueSecret();
    await client.query(
      "INSERT INTO auth_challenges (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '5 minutes')",
      [digest(challenge), user.id],
    );
    return { challenge, ...(mfaSetup ? { mfaSetup } : {}) };
  }

  async function newReset(client, userId) {
    await client.query('DELETE FROM auth_password_resets WHERE user_id = $1', [userId]);
    const resetToken = issueSecret();
    await client.query(
      "INSERT INTO auth_password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
      [digest(resetToken), userId],
    );
    return resetToken;
  }

  async function verifyAdminSession(client, req) {
    const result = await client.query(
      "SELECT u.id FROM users u JOIN auth_sessions s ON s.user_id = u.id " +
      "WHERE u.id = $1 AND u.active AND u.role = 'admin' AND u.totp_enabled " +
      "AND s.token_hash = $2 AND s.expires_at > now() AND s.last_used_at > now() - interval '1 hour' FOR UPDATE OF u",
      [req.user.id, req.authSessionHash],
    );
    if (result.rowCount !== 1) {
      throw authError(403, 'FORBIDDEN', 'Your session no longer allows this action.');
    }
  }

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
    checkOrigin(req);
    if (!SAFE_METHODS.has(req.method) && !req.is('application/json')) {
      throw authError(415, 'JSON_REQUIRED', 'Send the request as JSON.');
    }
    next();
  });

  router.get('/setup', async (req, res) => {
    const existing = setupHash && await pool.query('SELECT id FROM users LIMIT 1');
    res.json({ available: Boolean(existing && existing.rowCount === 0) });
  });

  router.post('/setup', async (req, res) => {
    await hitLimit(req, res, 'setup', 8);
    const { setupToken: supplied, email: rawEmail, password } = req.body ?? {};
    if (!setupHash || typeof supplied !== 'string' || supplied.length > 256 || !timingSafeEqual(digest(supplied), setupHash)) {
      throw authError(403, 'SETUP_UNAVAILABLE', 'The setup token is invalid or first setup is closed.');
    }
    const email = normalizeEmail(rawEmail);
    validateNewPassword(password);
    const passwordHash = await makePasswordHash(password);
    const result = await transaction(pool, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(243953102, 1)');
      const existing = await client.query('SELECT id FROM users LIMIT 1');
      if (existing.rowCount) throw authError(409, 'SETUP_CLOSED', 'First setup has already been completed.');
      const inserted = await client.query(
        "INSERT INTO users (id, email, role, password_hash) VALUES ($1, $2, 'admin', $3) RETURNING *",
        [randomUUID(), email, passwordHash],
      );
      const user = inserted.rows[0];
      await audit(client, { actorId: user.id, action: 'auth.owner_created', targetType: 'user', targetId: user.id });
      return newChallenge(client, user);
    });
    res.status(201).json(result);
  });

  router.post('/login', async (req, res) => {
    const { email: rawEmail, password } = req.body ?? {};
    const email = normalizeEmail(rawEmail);
    await hitLimit(req, res, 'login', 32, email);
    const genericFailure = authError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
    if (typeof password !== 'string' || Buffer.byteLength(password) > 128) throw genericFailure;
    const lookup = await pool.query('SELECT id, password_hash FROM users WHERE email = $1 AND active', [email]);
    const record = lookup.rows[0];
    if (!(await checkPassword(password, record?.password_hash))) {
      if (record) await audit(pool, { action: 'auth.login_failed', targetType: 'user', targetId: record.id });
      throw genericFailure;
    }
    const result = await transaction(pool, async (client) => {
      const user = await lockedUser(client, record.id);
      if (!user?.active || user.password_hash !== record.password_hash) throw genericFailure;
      return newChallenge(client, user);
    });
    res.json(result);
  });

  router.post('/mfa', async (req, res) => {
    await hitLimit(req, res, 'mfa', 40);
    const { challenge, code } = req.body ?? {};
    const hash = tokenHash(challenge);
    const genericFailure = authError(401, 'INVALID_MFA', 'The code is incorrect, used, or expired. Sign in again if needed.');
    if (!hash) throw genericFailure;
    const lookup = await pool.query('SELECT user_id FROM auth_challenges WHERE token_hash = $1 AND expires_at > now()', [hash]);
    if (!lookup.rowCount) throw genericFailure;

    const result = await transaction(pool, async (client) => {
      const user = await lockedUser(client, lookup.rows[0].user_id);
      if (!user?.active || !user.totp_secret || !user.password_hash) return null;
      const valid = await client.query(
        'SELECT attempts FROM auth_challenges WHERE token_hash = $1 AND expires_at > now() AND attempts < 5 FOR UPDATE',
        [hash],
      );
      if (!valid.rowCount) return null;
      const secret = openMfaSecret(user.totp_secret, key, user.id);
      const step = matchTotpStep(secret, code, user.totp_last_step);
      if (step === null) {
        await client.query('UPDATE auth_challenges SET attempts = attempts + 1 WHERE token_hash = $1', [hash]);
        return null;
      }
      await client.query('UPDATE users SET totp_enabled = true, totp_last_step = $1 WHERE id = $2', [step, user.id]);
      await client.query('DELETE FROM auth_challenges WHERE token_hash = $1', [hash]);
      let recoveryCodes;
      if (!user.totp_enabled) {
        recoveryCodes = Array.from({ length: 8 }, issueSecret);
        await client.query(
          'INSERT INTO auth_recovery_codes (token_hash, user_id) SELECT unnest($1::bytea[]), $2',
          [recoveryCodes.map(digest), user.id],
        );
        await audit(client, { actorId: user.id, action: 'auth.mfa_enrolled', targetType: 'user', targetId: user.id });
      }
      const session = issueSecret();
      await client.query(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '8 hours')",
        [digest(session), user.id],
      );
      await audit(client, { actorId: user.id, action: 'auth.login', targetType: 'user', targetId: user.id });
      return { session, user: publicUser(user), ...(recoveryCodes ? { recoveryCodes } : {}) };
    });
    if (!result) throw genericFailure;
    const { session, ...body } = result;
    res.cookie(cookieName, session, { ...cookieOptions, maxAge: SESSION_AGE });
    res.json(body);
  });

  router.get('/session', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post('/logout', async (req, res) => {
    const hash = readSessionHash(req);
    if (hash) {
      await transaction(pool, async (client) => {
        const removed = await client.query('DELETE FROM auth_sessions WHERE token_hash = $1 RETURNING user_id', [hash]);
        const userId = removed.rows[0]?.user_id;
        if (userId) await audit(client, { actorId: userId, action: 'auth.logout', targetType: 'user', targetId: userId });
      });
    }
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });

  router.post('/reset', async (req, res) => {
    await hitLimit(req, res, 'reset', 12);
    const { token, password } = req.body ?? {};
    const hash = tokenHash(token);
    const genericFailure = authError(400, 'INVALID_RESET_TOKEN', 'The reset token is invalid or has expired.');
    if (!hash) throw genericFailure;
    validateNewPassword(password);
    const lookup = await pool.query('SELECT user_id FROM auth_password_resets WHERE token_hash = $1 AND expires_at > now()', [hash]);
    if (!lookup.rowCount) throw genericFailure;
    const passwordHash = await makePasswordHash(password);
    const result = await transaction(pool, async (client) => {
      const user = await lockedUser(client, lookup.rows[0].user_id);
      if (!user?.active) throw genericFailure;
      const removed = await client.query('DELETE FROM auth_password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING user_id', [hash]);
      if (!removed.rowCount) throw genericFailure;
      await clearCredentials(client, user.id);
      await client.query(
        'UPDATE users SET password_hash = $1, totp_secret = CASE WHEN totp_enabled THEN totp_secret END WHERE id = $2',
        [passwordHash, user.id],
      );
      await audit(client, { actorId: user.id, action: 'auth.password_reset', targetType: 'user', targetId: user.id });
      return newChallenge(client, { ...user, totp_secret: user.totp_enabled ? user.totp_secret : null });
    });
    res.clearCookie(cookieName, cookieOptions).json(result);
  });

  router.post('/recover', async (req, res) => {
    const { email: rawEmail, recoveryCode, password } = req.body ?? {};
    const email = normalizeEmail(rawEmail);
    await hitLimit(req, res, 'recovery', 12, email, 5);
    const genericFailure = authError(400, 'INVALID_RECOVERY_CODE', 'The email or recovery code is invalid.');
    const hash = tokenHash(recoveryCode);
    if (!hash) throw genericFailure;
    validateNewPassword(password);
    const lookup = await pool.query(
      'SELECT u.id FROM users u JOIN auth_recovery_codes c ON c.user_id = u.id WHERE u.email = $1 AND u.active AND c.token_hash = $2',
      [email, hash],
    );
    if (!lookup.rowCount) throw genericFailure;
    const passwordHash = await makePasswordHash(password);
    const result = await transaction(pool, async (client) => {
      const user = await lockedUser(client, lookup.rows[0].id);
      if (!user?.active) throw genericFailure;
      const used = await client.query('DELETE FROM auth_recovery_codes WHERE token_hash = $1 AND user_id = $2 RETURNING user_id', [hash, user.id]);
      if (!used.rowCount) throw genericFailure;
      await client.query('DELETE FROM auth_recovery_codes WHERE user_id = $1', [user.id]);
      await clearCredentials(client, user.id);
      await client.query(
        'UPDATE users SET password_hash = $1, totp_enabled = false, totp_secret = NULL, totp_last_step = NULL WHERE id = $2',
        [passwordHash, user.id],
      );
      await audit(client, { actorId: user.id, action: 'auth.account_recovered', targetType: 'user', targetId: user.id });
      return newChallenge(client, { ...user, totp_enabled: false, totp_secret: null });
    });
    res.clearCookie(cookieName, cookieOptions).json(result);
  });

  router.get('/users', requireRole('admin'), async (req, res) => {
    const result = await pool.query('SELECT id, email, role, active, created_at, totp_enabled FROM users ORDER BY email');
    res.json({ users: result.rows.map(listedUser) });
  });

  router.post('/users', requireRole('admin'), async (req, res) => {
    const { email: rawEmail, role } = req.body ?? {};
    const email = normalizeEmail(rawEmail);
    if (!ROLES.has(role)) throw authError(400, 'INVALID_ROLE', 'Select a valid role.');
    const result = await transaction(pool, async (client) => {
      await verifyAdminSession(client, req);
      const inserted = await client.query(
        'INSERT INTO users (id, email, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING *',
        [randomUUID(), email, role],
      );
      const user = inserted.rows[0];
      if (!user) throw authError(409, 'USER_EXISTS', 'This email already belongs to an account.');
      const resetToken = await newReset(client, user.id);
      await audit(client, { actorId: req.user.id, action: 'auth.user_invited', targetType: 'user', targetId: user.id, metadata: { role } });
      return { user: listedUser(user), resetToken };
    });
    res.status(201).json(result);
  });

  router.patch('/users/:id', requireRole('admin'), async (req, res) => {
    const id = req.params.id;
    const { role, active } = req.body ?? {};
    if (!UUID.test(id)) throw authError(404, 'USER_NOT_FOUND', 'User not found.');
    if (id.toLowerCase() === req.user.id) throw authError(409, 'SELF_CHANGE', 'Another admin must change your access.');
    if ((role === undefined && active === undefined) ||
        (role !== undefined && !ROLES.has(role)) || (active !== undefined && typeof active !== 'boolean')) {
      throw authError(400, 'INVALID_USER_CHANGE', 'Select a valid role or account status.');
    }
    const result = await transaction(pool, async (client) => {
      // Serialize role changes with other admin writes to keep at least one active owner.
      await client.query('SELECT pg_advisory_xact_lock(243953102, 1)');
      await verifyAdminSession(client, req);
      const user = await lockedUser(client, id);
      if (!user) throw authError(404, 'USER_NOT_FOUND', 'User not found.');
      const nextRole = role ?? user.role;
      const nextActive = active ?? user.active;
      if (user.role === nextRole && user.active === nextActive) return listedUser(user);
      const updated = await client.query('UPDATE users SET role = $1, active = $2 WHERE id = $3 RETURNING *', [nextRole, nextActive, id]);
      await clearCredentials(client, id);
      await audit(client, {
        actorId: req.user.id,
        action: 'auth.access_changed',
        targetType: 'user',
        targetId: id,
        metadata: { previousRole: user.role, previousActive: user.active, role: nextRole, active: nextActive },
      });
      return listedUser(updated.rows[0]);
    });
    res.json({ user: result });
  });

  router.post('/users/:id/reset', requireRole('admin'), async (req, res) => {
    const id = req.params.id;
    if (!UUID.test(id)) throw authError(404, 'USER_NOT_FOUND', 'User not found.');
    const resetToken = await transaction(pool, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(243953102, 1)');
      await verifyAdminSession(client, req);
      const user = await lockedUser(client, id);
      if (!user?.active) throw authError(404, 'USER_NOT_FOUND', 'Active user not found.');
      const token = await newReset(client, user.id);
      await audit(client, { actorId: req.user.id, action: 'auth.password_reset_issued', targetType: 'user', targetId: user.id });
      return token;
    });
    res.json({ resetToken });
  });

  return { router, requireAuth, requireRole };
}
