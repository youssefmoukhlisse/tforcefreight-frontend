import { createHmac, hkdfSync } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { migrate, databasePool } from './database.mjs';
import { createAuth, audit } from './auth.mjs';
import { createShipmentRouters } from './shipments.mjs';
import { createNotifications } from './notifications.mjs';
import { createCustomerImportRouter } from './customers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const environment = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const secure = process.env.NODE_ENV === 'production';
const url = process.env.DATABASE_URL;
const enabled = Boolean(url);
const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;
const configuredOrigin = process.env.APP_ORIGIN || (railwayHost ? 'https://' + railwayHost : undefined);
const origin = configuredOrigin ? new URL(configuredOrigin).origin : undefined;
const port = Number(process.env.PORT || 8080);
const app = express();
app.disable('x-powered-by');
if (process.env.RAILWAY_ENVIRONMENT_ID) app.set('trust proxy', 1);
const sharedStaticFiles = new Set([
  'app.js', 'app.css', 'shell.css', 'information.js', 'information.css', 'operations.js', 'operations.css',
  'regional-parity.js', 'regional-parity.css', 'resource-parity.js', 'resource-parity.css', 'canada-detail.css', 'islands-detail.css',
]);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (secure && req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});
const privateCsp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
const restrictedPage = (req, res, next) => {
  res.set('Content-Security-Policy', privateCsp);
  noStore(req, res, next);
};

app.use('/api', noStore, (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const expected = origin || `${req.protocol}://${req.get('host')}`;
    const sent = req.get('origin');
    if ((sent && sent !== expected) || req.get('sec-fetch-site') === 'cross-site') {
      return res.status(403).json({ error: 'Cross-origin request denied.' });
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Expected application/json.' });
  }
  next();
}, express.json({ limit: '3mb', strict: true }));

let pool;
let notifications;
let cleanup;
if (enabled) {
  const key = process.env.RECORDS_ENCRYPTION_KEY;
  if (!key || !/^[A-Za-z0-9_-]{43}$/.test(key) || Buffer.from(key, 'base64url').length !== 32) {
    throw new Error('A 32-byte base64url RECORDS_ENCRYPTION_KEY is required.');
  }
  if (secure && !origin?.startsWith('https://')) throw new Error('A verified HTTPS APP_ORIGIN is required.');
  const deriveKey = label => Buffer.from(hkdfSync('sha256', Buffer.from(key, 'base64url'), '', label, 32));
  pool = databasePool(url);
  await migrate(pool);
  const { router: auth, requireAuth, requireRole } = createAuth({ pool, secureCookies: secure, appOrigin: origin, encryptionKey: key });
  notifications = createNotifications({ pool, requireRole, audit, appOrigin: origin, environment, signingKey: deriveKey('email-consent-v1') });
  const { admin, publicTracking } = createShipmentRouters({
    pool, requireAuth, requireRole, audit, onConfirmedEvent: notifications.onConfirmedEvent,
    signDocumentKey: deriveKey('redacted-bol-ticket-v1'),
  });
  app.use('/api/auth', auth);
  const rateKey = deriveKey('request-limiter-v1');
  app.use('/api/tracking', async (req, res, next) => {
    const bucket = Math.floor(Date.now() / 60_000);
    const key = createHmac('sha256', rateKey).update(req.ip ?? 'unavailable').digest('hex');
    const { rows } = await pool.query(
      'INSERT INTO public_request_limits(subject,bucket,hits) VALUES($1,$2,1) ON CONFLICT(subject,bucket) DO UPDATE SET hits=public_request_limits.hits+1 RETURNING hits',
      [key, bucket],
    );
    if (rows[0].hits > 30) return res.set('Retry-After', '60').status(429).json({ error: 'Too many requests. Try again shortly.' });
    next();
  });
  app.use('/api/tracking', notifications.publicTracking, publicTracking);
  app.use('/api/admin/customers', createCustomerImportRouter({ pool, requireAuth, requireRole, audit }));
  app.use('/api/admin', notifications.admin, admin);
  cleanup = setInterval(() => {
    pool.query('DELETE FROM public_request_limits WHERE bucket < $1', [Math.floor(Date.now() / 60_000) - 60])
      .catch(() => console.error('Request limiter cleanup failed.'));
  }, 3_600_000);
  cleanup.unref();
}

app.get('/api/config', (_req, res) => res.json({ environment, trackingEnabled: enabled, notificationsEnabled: notifications?.enabled ?? false }));
app.get('/healthz', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (pool) await pool.query('SELECT 1');
  res.json({ status: 'ok', tracking: enabled ? 'ready' : 'disabled' });
});
app.use('/api', (_req, res) => res.status(enabled ? 404 : 503).json({ error: enabled ? 'Endpoint not found.' : 'Shipment tracking is not configured.' }));

app.get(/^\/admin$/, (_req, res) => res.redirect(302, '/admin/'));
app.use('/admin/', restrictedPage, express.static(resolve(root, 'admin'), { fallthrough: true, index: 'index.html' }));
app.use('/tracking/', restrictedPage, express.static(resolve(root, 'tracking'), { fallthrough: true, index: 'index.html' }));
const trackingPaths = ['/tracking', '/ltl/apps/Tracking', '/ltl/apps/TrackingHelp'];
app.get(trackingPaths, restrictedPage, (_req, res) => res.sendFile(resolve(root, 'tracking/index.html')));
app.get('/shipment-updates', restrictedPage, (_req, res) => res.sendFile(resolve(root, 'tracking/subscription.html')));
app.use('/assets', express.static(resolve(root, 'assets'), { immutable: true, maxAge: '30d', redirect: false }));
app.get(/.*/, (req, res) => {
  const name = req.path.slice(1);
  if (sharedStaticFiles.has(name)) return res.sendFile(resolve(root, name));
  if (req.path === '/' || /^\/ltl\/(?:apps|myltl)\//i.test(req.path)) return res.sendFile(resolve(root, 'index.html'));
  return res.status(404).type('text/plain').send('Not found');
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status);
  if (status >= 400 && status < 500) {
    const message = error.type === 'entity.parse.failed' ? 'Invalid JSON.'
      : error.type === 'entity.too.large' ? 'Request is too large.'
      : error.message;
    return res.status(status).json({ error: message, ...(error.code ? { code: error.code } : {}) });
  }
  const code = typeof error.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'internal';
  console.error(`Server request failed (${req.method}, ${code}).`);
  return res.status(500).json({ error: 'The request could not be completed.' });
});

const server = app.listen(port, process.env.HOST || (secure ? '0.0.0.0' : '127.0.0.1'), () => console.log(`Shipment portal listening on port ${port}.`));
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
async function stop() {
  clearInterval(cleanup);
  await notifications?.stop();
  await new Promise(resolve => server.close(resolve));
  await pool?.end();
}
process.once('SIGTERM', () => void stop());
process.once('SIGINT', () => void stop());
