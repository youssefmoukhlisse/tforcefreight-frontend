import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import express from 'express';
import pg from 'pg';

import { createAuth, matchTotpStep, parseAuthEncryptionKey, totpAtStep } from '../server/auth.mjs';

test('TOTP matches the RFC 6238 SHA-1 reference codes', () => {
  const secret = Buffer.from('12345678901234567890');
  const vectors = [
    [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
    [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
  ];
  for (const [seconds, expected] of vectors) {
    assert.equal(totpAtStep(secret, Math.floor(seconds / 30), 8), expected);
  }
});

test('TOTP permits one step of clock drift and rejects reused time steps', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(matchTotpStep(secret, '287082', null, 2), 1);
  assert.equal(matchTotpStep(secret, '287082', 1, 2), null);
  assert.equal(matchTotpStep(secret, '287082', null, 3), null);
  assert.equal(matchTotpStep(secret, 'foobar', null, 2), null);
});

test('authenticator key must decode to 32 bytes', () => {
  const key = randomBytes(32);
  assert.deepEqual(parseAuthEncryptionKey(key.toString('hex')), key);
  assert.deepEqual(parseAuthEncryptionKey(key.toString('base64url')), key);
  assert.deepEqual(parseAuthEncryptionKey(key.toString('base64')), key);
  assert.throws(() => parseAuthEncryptionKey(randomBytes(24).toString('base64url')));
});

function authenticatorCode(base32, step = Math.floor(Date.now() / 30_000)) {
  const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = Array.from(base32, (letter) => digits.indexOf(letter).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g).map((octet) => parseInt(octet, 2)));
  return totpAtStep(key, step);
}

const dbUrl = process.env.TEST_AUTH_DATABASE_URL;

test('auth routes protect sessions, roles, password reset, and offline recovery', {
  skip: !dbUrl && 'Set TEST_AUTH_DATABASE_URL to an isolated test PostgreSQL server.',
  timeout: 30_000,
}, async (t) => {
  const db = new pg.Pool({ connectionString: dbUrl });
  const schema = 'auth_test_' + randomBytes(8).toString('hex');
  let pool;
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await db.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
    await db.end();
  });
  await db.query('CREATE SCHEMA ' + schema);
  pool = new pg.Pool({ connectionString: dbUrl, options: '-c search_path=' + schema });
  await pool.query(await readFile(new URL('../server/migrations/001-auth.sql', import.meta.url), 'utf8'));

  const app = express();
  app.use(express.json());
  const setupToken = randomBytes(32).toString('base64url');
  const auth = createAuth({ pool, secureCookies: false, encryptionKey: randomBytes(32), setupToken });
  app.use('/api/auth', auth.router);
  app.use((error, req, res, next) => {
    res.status(error.status ?? 500).json({ error: error.message, code: error.code });
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  const fetchAuth = async (path, { method = 'GET', body, cookie, originOverride } = {}) => {
    const headers = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers.Origin = originOverride ?? origin;
    }
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(origin + '/api/auth' + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      setCookie: response.headers.get('set-cookie'),
      cache: response.headers.get('cache-control'),
    };
  };
  const post = (path, body, cookie) => fetchAuth(path, { method: 'POST', body, cookie });

  assert.equal((await fetchAuth('/session')).status, 401);
  assert.equal((await fetchAuth('/setup')).body.available, true);
  const credentials = {
    email: 'test-owner@example.invalid',
    password: randomBytes(24).toString('base64url'),
  };
  const bootstrap = { setupToken, ...credentials };
  assert.equal((await fetchAuth('/setup', { method: 'POST', body: bootstrap, originOverride: 'https://other.example.invalid' })).status, 403);
  assert.equal((await post('/setup', { ...bootstrap, setupToken: 'incorrect' })).status, 403);
  const setup = await post('/setup', bootstrap);
  assert.equal(setup.status, 201, setup.body.error);
  assert.equal(setup.cache, 'no-store');
  assert.equal((await fetchAuth('/setup')).body.available, false);
  assert.equal((await post('/setup', bootstrap)).status, 409);
  assert.equal(setup.setCookie, null);

  const step = Math.floor(Date.now() / 30_000);
  const initialCode = authenticatorCode(setup.body.mfaSetup.secret, step);
  const enrollments = await Promise.all([
    post('/mfa', { challenge: setup.body.challenge, code: initialCode }),
    post('/mfa', { challenge: setup.body.challenge, code: initialCode }),
  ]);
  assert.deepEqual(enrollments.map(({ status }) => status).sort(), [200, 401]);
  const enrollment = enrollments.find(({ status }) => status === 200);
  const owner = enrollment.body.user;
  const ownerCookie = enrollment.setCookie.split(';')[0];
  assert.equal(owner.role, 'admin');
  assert.equal(enrollment.body.recoveryCodes.length, 8);
  assert.match(enrollment.setCookie, /HttpOnly/);
  assert.match(enrollment.setCookie, /SameSite=Strict/);
  assert.equal((await fetchAuth('/session', { cookie: ownerCookie })).body.user.id, owner.id);

  const login = await post('/login', credentials);
  assert.equal(login.status, 200);
  assert.equal(login.body.mfaSetup, undefined);
  assert.equal((await post('/mfa', { challenge: login.body.challenge, code: initialCode })).status, 401);
  assert.equal((await post('/mfa', {
    challenge: login.body.challenge, code: authenticatorCode(setup.body.mfaSetup.secret, step + 1),
  })).status, 200);

  const invite = await post('/users', { email: 'test-viewer@example.invalid', role: 'viewer' }, ownerCookie);
  assert.equal(invite.status, 201);
  const viewerPassword = randomBytes(24).toString('base64url');
  const redeemed = await post('/reset', { token: invite.body.resetToken, password: viewerPassword });
  assert.equal(redeemed.status, 200);
  assert.equal((await post('/reset', { token: invite.body.resetToken, password: viewerPassword })).status, 400);
  const viewerStep = Math.floor(Date.now() / 30_000);
  const activated = await post('/mfa', {
    challenge: redeemed.body.challenge,
    code: authenticatorCode(redeemed.body.mfaSetup.secret, viewerStep),
  });
  assert.equal(activated.status, 200);
  const viewerCookie = activated.setCookie.split(';')[0];
  assert.equal((await fetchAuth('/users', { cookie: viewerCookie })).status, 403);
  const promoted = await fetchAuth('/users/' + invite.body.user.id, {
    method: 'PATCH', body: { role: 'operator' }, cookie: ownerCookie,
  });
  assert.equal(promoted.body.user.role, 'operator');
  assert.equal((await fetchAuth('/session', { cookie: viewerCookie })).status, 401);

  const issuedReset = await post('/users/' + invite.body.user.id + '/reset', {}, ownerCookie);
  assert.equal(issuedReset.status, 200);
  const newViewerPassword = randomBytes(24).toString('base64url');
  const operatorReset = await post('/reset', { token: issuedReset.body.resetToken, password: newViewerPassword });
  assert.equal(operatorReset.status, 200);
  assert.equal(operatorReset.body.mfaSetup, undefined);
  assert.equal((await post('/login', { email: invite.body.user.email, password: viewerPassword })).status, 401);
  const operatorMfa = await post('/mfa', {
    challenge: operatorReset.body.challenge,
    code: authenticatorCode(redeemed.body.mfaSetup.secret, viewerStep + 1),
  });
  assert.equal(operatorMfa.status, 200);
  assert.equal(operatorMfa.body.user.role, 'operator');

  const recovery = {
    email: credentials.email, recoveryCode: enrollment.body.recoveryCodes[0],
    password: randomBytes(24).toString('base64url'),
  };
  const recovered = await post('/recover', recovery);
  assert.equal(recovered.status, 200);
  assert.notEqual(recovered.body.mfaSetup.secret, setup.body.mfaSetup.secret);
  assert.equal((await post('/recover', recovery)).status, 400);
  assert.equal((await fetchAuth('/session', { cookie: ownerCookie })).status, 401);
  assert.equal((await post('/login', credentials)).status, 401);
  const completedRecovery = await post('/mfa', {
    challenge: recovered.body.challenge,
    code: authenticatorCode(recovered.body.mfaSetup.secret),
  });
  assert.equal(completedRecovery.status, 200);
  const recoveredCookie = completedRecovery.setCookie.split(';')[0];
  assert.equal((await post('/logout', {}, recoveredCookie)).status, 204);
  assert.equal((await fetchAuth('/session', { cookie: recoveredCookie })).status, 401);

  const logs = await pool.query('SELECT action FROM audit_logs ORDER BY id');
  assert.ok(logs.rows.some(({ action }) => action === 'auth.access_changed'));
  assert.ok(logs.rows.some(({ action }) => action === 'auth.account_recovered'));
});
