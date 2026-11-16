import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import { withTransaction } from './database.mjs';
import { isTrackingPro } from './shipments.mjs';

const accepted = 'If the address is eligible, a confirmation link will be sent.';
const legacyEvents = ['delivery_exception', 'out_for_delivery', 'delivered'];
const eventLabels = new Map([
  ['delivery_exception', 'Delivery exception'], ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'], ['delivery_appointment_scheduled', 'Delivery appointment scheduled'],
]);
const notificationOptions = new Set(['current_status', ...eventLabels.keys()]);
const emailFormat = /^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/;
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const uuidFormat = new RegExp('^' + uuid + '$');
const tokenFormat = new RegExp(`^(${uuid})\\.([1-9]\\d{0,9})\\.([A-Za-z0-9_-]{43})$`);
const currentParty = `EXISTS (
  SELECT 1 FROM shipment_parties p WHERE p.shipment_id = s.shipment_id AND lower(p.email) = s.email
)`;
const invalid = (_req, res) => res.status(404).json({ error: 'This link is invalid or expired.' });

function notificationEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && emailFormat.test(email) ? email : null;
}

function subscriptionInput(body) {
  const pro = typeof body?.pro === 'string' ? body.pro.trim().toUpperCase() : '';
  if (!isTrackingPro(pro)) return { error: 'Enter a valid shipment number.' };
  const expanded = ['emails', 'events', 'personalMessage', 'senderEmail'].some(field => Object.hasOwn(body, field));
  if (!expanded) {
    const email = notificationEmail(body.email);
    if (!email) return { error: 'Enter a valid shipment number and email address.' };
    return { pro, emails: [email], events: legacyEvents, personalMessage: '', senderEmail: null };
  }

  if (!Array.isArray(body.emails) || body.emails.length < 1 || body.emails.length > 6) {
    return { error: 'Enter one to six recipient email addresses.' };
  }
  const emails = body.emails.map(notificationEmail);
  if (emails.includes(null)) return { error: 'Enter a valid email address for each recipient.' };
  const senderEmail = notificationEmail(body.senderEmail);
  if (!senderEmail) return { error: 'Enter a valid sender email address.' };
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 5 ||
      body.events.some(option => !notificationOptions.has(option))) {
    return { error: 'Select at least one valid update option.' };
  }
  const message = body.personalMessage ?? '';
  if (typeof message !== 'string' || message.length > 150 || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(message)) {
    return { error: 'Enter a personal message of up to 150 characters.' };
  }
  return { pro, emails: [...new Set(emails)], events: [...new Set(body.events)], personalMessage: message.trim(), senderEmail };
}

function statusLabel(status) {
  if (status === 'created') return 'Shipment created';
  return eventLabels.get(status) ?? status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}

function makeTransport(environment, appOrigin) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, RECORDS_EMAIL_ENABLED } = process.env;
  if (environment !== 'production' || RECORDS_EMAIL_ENABLED !== 'true' || !appOrigin || !SMTP_HOST || !SMTP_USER ||
      !SMTP_PASSWORD || !emailFormat.test(SMTP_FROM || '')) return null;
  const port = Number(SMTP_PORT || 465);
  if (![465, 587, 2525].includes(port)) return null;
  const client = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 8_000, greetingTimeout: 8_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return { send: (message) => client.sendMail({ from: SMTP_FROM, ...message }), close: () => client.close() };
}

export function createNotifications({ pool, requireRole, audit, appOrigin, environment, signingKey, testTransport = null }) {
  const transport = testTransport || makeTransport(environment, appOrigin);
  const publicTracking = express.Router();
  const admin = express.Router();
  const canManage = requireRole('admin', 'operator');

  function signature(action, id, generation) {
    return createHmac('sha256', signingKey).update(`shipment-updates:${action}:${id}:${generation}`).digest('base64url');
  }
  function makeLink(action, row) {
    const token = `${row.subscription_id}.${row.generation}.${signature(action, row.subscription_id, row.generation)}`;
    return `${appOrigin}/shipment-updates#action=${action}&token=${token}`;
  }
  function openToken(action, token) {
    const match = typeof token === 'string' && tokenFormat.exec(token);
    if (!match) return null;
    const [, id, generation, mac] = match;
    if (Number(generation) > 2_147_483_647 || !timingSafeEqual(Buffer.from(mac), Buffer.from(signature(action, id, generation)))) return null;
    return { id, generation: Number(generation) };
  }

  publicTracking.post('/subscriptions', async (req, res) => {
    if (!transport) return res.status(503).json({ error: 'Email updates are not configured.' });
    const { pro, emails, events, personalMessage, senderEmail, error } = subscriptionInput(req.body);
    if (error) return res.status(400).json({ error });
    // A public claim of an address does not opt anyone in. Every matched recipient confirms individually.
    // Acquire conflicting recipient rows in the same order across concurrent multi-address requests.
    await pool.query(`
      WITH recipients AS (
        SELECT DISTINCT t.shipment_id, lower(p.email) AS email
        FROM tracking_numbers t JOIN shipment_parties p ON p.shipment_id=t.shipment_id
        WHERE t.pro_number=$1 AND lower(p.email)=ANY($2::text[])
          AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM shipment_parties sender
            WHERE sender.shipment_id=t.shipment_id AND lower(sender.email)=$3))
      ), requested AS (
        INSERT INTO notification_subscriptions (shipment_id,email,event_options,personal_message)
        SELECT shipment_id,email,$4::text[],$5 FROM recipients ORDER BY email
        ON CONFLICT (shipment_id,email) DO UPDATE SET state='pending', generation=notification_subscriptions.generation+1,
          requested_at=now(), confirmed_at=NULL, revoked_at=NULL,
          event_options=excluded.event_options, personal_message=excluded.personal_message
        WHERE notification_subscriptions.state <> 'active'
          AND notification_subscriptions.requested_at <= now() - interval '24 hours'
        RETURNING id,generation
      )
      INSERT INTO notification_logs (subscription_id,generation,type)
      SELECT id,generation,'confirmation' FROM requested
    `, [pro, emails, senderEmail, events, personalMessage]);
    res.status(202).json({ message: accepted });
  });

  publicTracking.post('/subscriptions/confirm', async (req, res) => {
    const token = openToken('confirm', req.body?.token);
    if (!token) return invalid(req, res);
    const confirmed = await withTransaction(pool, async client => {
      const { rows: [subscription] } = await client.query(`
        UPDATE notification_subscriptions s SET state='active',confirmed_at=COALESCE(s.confirmed_at, now())
        WHERE s.id=$1 AND s.generation=$2 AND s.state IN ('pending','active')
          AND s.requested_at > now() - interval '24 hours' AND ${currentParty}
        RETURNING id,generation,event_options
      `, [token.id, token.generation]);
      if (!subscription) return false;
      if (subscription.event_options.includes('current_status')) {
        await client.query(`INSERT INTO notification_logs (subscription_id,generation,type)
          VALUES ($1,$2,'current_status') ON CONFLICT DO NOTHING`, [subscription.id, subscription.generation]);
      }
      return true;
    });
    if (!confirmed) return invalid(req, res);
    res.json({ message: 'You are subscribed to shipment updates.' });
  });

  publicTracking.post('/subscriptions/unsubscribe', async (req, res) => {
    const token = openToken('unsubscribe', req.body?.token);
    if (!token) return invalid(req, res);
    const result = await pool.query(`
      UPDATE notification_subscriptions SET state='revoked', revoked_at=COALESCE(revoked_at, now())
      WHERE id=$1 AND generation=$2
    `, [token.id, token.generation]);
    if (!result.rowCount) return invalid(req, res);
    res.json({ message: 'You are unsubscribed from shipment updates.' });
  });

  admin.get('/notifications', canManage, async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const [subs, logs] = await Promise.all([
      pool.query(`SELECT s.id,s.shipment_id AS "shipmentId",t.pro_number AS "trackingNumber",
        s.email,s.state,s.created_at AS "createdAt" FROM notification_subscriptions s
        JOIN tracking_numbers t ON t.shipment_id=s.shipment_id ORDER BY s.requested_at DESC LIMIT $1`, [limit]),
      pool.query(`SELECT n.id,n.type,n.status,n.created_at AS "createdAt",t.pro_number AS "trackingNumber"
        FROM notification_logs n JOIN notification_subscriptions s ON s.id=n.subscription_id
        JOIN tracking_numbers t ON t.shipment_id=s.shipment_id ORDER BY n.created_at DESC LIMIT $1`, [limit]),
    ]);
    res.json({ subscriptions: subs.rows, logs: logs.rows });
  });

  admin.patch('/notifications/:id', canManage, async (req, res) => {
    if (!uuidFormat.test(req.params.id) || req.body?.state !== 'revoked') {
      return res.status(400).json({ error: 'Select a valid subscription and action.' });
    }
    const subscription = await withTransaction(pool, async client => {
      const { rows: [subscription] } = await client.query(`
        UPDATE notification_subscriptions SET state='revoked',revoked_at=COALESCE(revoked_at,now())
        WHERE id=$1 RETURNING id,state
      `, [req.params.id]);
      if (subscription) await audit(client, { actorId: req.user.id, action: 'notification.revoked', targetType: 'subscription', targetId: subscription.id });
      return subscription;
    });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found.' });
    res.json({ subscription });
  });

  async function onConfirmedEvent(client, {shipmentId, eventId, status}) {
    if (!transport || !eventLabels.has(status)) return;
    await client.query(`
      INSERT INTO notification_logs (subscription_id,event_id,generation,type,event_status)
      SELECT s.id,$2,s.generation,'status',$3 FROM notification_subscriptions s
      WHERE s.shipment_id=$1 AND s.state='active' AND $3=ANY(s.event_options) AND ${currentParty} ON CONFLICT DO NOTHING
    `, [shipmentId, eventId, status]);
  }

  let inFlight = Promise.resolve();
  let closed = false;
  let timer;
  async function dispatch() {
    const lease = randomUUID();
    const { rows: [job] } = await pool.query(`
      UPDATE notification_logs n SET status='sending',attempts=attempts+1,
        available_at=now() + interval '2 minutes',lease_id=$1 WHERE n.id=(
        SELECT id FROM notification_logs WHERE status IN ('queued','sending')
          AND available_at<=now() AND attempts<3
        ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING n.*
    `, [lease]);
    if (!job) {
      await pool.query(`
        UPDATE notification_logs SET status='failed',lease_id=NULL,failure_code='LEASE_EXPIRED'
        WHERE status='sending' AND attempts>=3 AND available_at<=now()
      `);
      return;
    }
    const {rows:[recipient]} = await pool.query(`
      SELECT s.email,s.personal_message,t.pro_number,h.status AS current_status FROM notification_subscriptions s
      JOIN tracking_numbers t ON t.shipment_id=s.shipment_id JOIN shipments h ON h.id=s.shipment_id
      WHERE s.id=$1 AND s.generation=$2 AND ${currentParty}
        AND (($3='confirmation' AND s.state='pending' AND s.requested_at > now() - interval '24 hours')
          OR ($3='current_status' AND s.state='active' AND 'current_status'=ANY(s.event_options))
          OR ($3='status' AND s.state='active' AND h.status=$5 AND $5=ANY(s.event_options) AND $4=(
            SELECT e.id FROM tracking_events e WHERE e.shipment_id=s.shipment_id
              AND e.deleted_at IS NULL AND e.kind='confirmed' ORDER BY e.occurred_at DESC,e.created_at DESC,e.id DESC LIMIT 1
          )))
    `, [job.subscription_id,job.generation,job.type,job.event_id,job.event_status]);
    if (!recipient) {
      await pool.query("UPDATE notification_logs SET status='canceled',lease_id=NULL WHERE id=$1 AND lease_id=$2", [job.id,lease]);
      return;
    }
    const confirm = job.type === 'confirmation';
    const snapshot = job.type === 'current_status';
    const status = snapshot ? recipient.current_status : job.event_status;
    const subject = confirm ? 'Confirm shipment updates' : `${snapshot ? 'Current shipment status' : 'Shipment update'}: ${statusLabel(status)}`;
    const note = recipient.personal_message ? `\n\nPersonal message supplied with this request:\n${recipient.personal_message}` : '';
    const text = confirm
      ? `Confirm email updates for internal shipment ${recipient.pro_number}:\n${makeLink('confirm', job)}\n\nThe link expires in 24 hours. Ignore this email if you did not request it.`
      : `Internal shipment ${recipient.pro_number}: ${statusLabel(status)}.${note}\n\nOpen the independent tracking portal: ${appOrigin}/tracking/\n\nUnsubscribe: ${makeLink('unsubscribe', job)}`;
    try {
      await transport.send({ to: recipient.email, subject, text });
    } catch {
      await pool.query(`
        UPDATE notification_logs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,
          available_at=now()+interval '5 minutes',lease_id=NULL,failure_code='TRANSPORT_ERROR'
        WHERE id=$1 AND lease_id=$2
      `, [job.id,lease]);
      return;
    }
    await pool.query("UPDATE notification_logs SET status='sent',sent_at=now(),lease_id=NULL,failure_code=NULL WHERE id=$1 AND lease_id=$2", [job.id,lease]);
  }

  function poll() {
    if (closed) return;
    inFlight = dispatch().catch(() => console.error('Notification dispatch failed.')).finally(() => {
      if (!closed) timer = setTimeout(poll, 3500).unref();
    });
  }
  if (transport) poll();
  async function stop() { closed = true; clearTimeout(timer); await inFlight; transport?.close?.(); }
  return { publicTracking, admin, onConfirmedEvent, enabled: Boolean(transport), stop };
}
