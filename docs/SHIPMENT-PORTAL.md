# Independent shipment portal

The staged application uses Node 24, Express, vanilla HTML/CSS/JavaScript and PostgreSQL. It shares the repository and Railway project with the existing informational frontend; the staged database is isolated from production. Shipment numbers are internal IDs in the `INT-` namespace. App status and timeline come from database records and never use reference screenshot data.

## Staging and first sign-in

1. Use a separate persistent Railway PostgreSQL service in the staging environment. Set `DATABASE_URL` to the database's Railway private variable reference. Keep the database TCP port private.
2. Set `APP_ENV=staging`, `APP_ORIGIN` to the exact HTTPS base URL, `PORT=8080`, and `RECORDS_ENCRYPTION_KEY` to a randomly generated 32-byte base64url string. Keep that key stable across deploys and backups; it protects enrolled authenticators. Use a different key and database for each environment.
3. Set `RECORDS_SETUP_TOKEN` to a second securely generated value (at least 32 characters). At `/admin/` select **Set up first administrator**, enter the token, set a unique password, enroll a time-based authenticator, and store the offline recovery codes. Once any user exists, first setup is disabled. Remove the bootstrap variable after setting up the owner.
4. Use authorized test records and example addresses only in staging. Confirm `GET /healthz` says `tracking: ready`.

The `admin` role manages users, sensitive event corrections/removals, shipment documents, and audit history. `operator` manages shipments, adds events, and revokes subscriptions. `viewer` can read shipments and the timeline. There are no preset accounts or default passwords. Password recovery for enrolled admins uses an offline recovery code; an admin can generate a short-lived reset or first-enrollment token for another account.

## Database and privacy

- `users`, `auth_sessions`, `auth_challenges`, `auth_password_resets`, `auth_recovery_codes`, `auth_rate_limits`, and `audit_logs` hold auth state and administrative history. Passwords are salted scrypt hashes; TOTP secrets are encrypted. Login and public lookup carry database-backed limits.
- `shipments`, `tracking_numbers`, `shipment_parties`, `tracking_events`, and `shipment_documents` hold the shipment lifecycle, party information and PDF documents. SQL constraints and a trigger protect permanent numbers. The transaction locks the shipment and checks a version on changes. The current status is determined by the latest confirmed event. An expected event does not establish that a delivery or a pickup occurred.
- `notification_subscriptions` and `notification_logs` persist confirmed subscriptions and their outbox/history. Schema migrations use a database lock and record the checksum of each applied file. Add new migrations for future changes rather than editing applied files.
- Public PRO lookup returns a limited result without addresses, names of individual contacts, phones, emails, internal notes, or documents. Shipment company names and selected identifiers require the operator to enable sharing. Viewing a signature requires approved sharing and the matching shipment date range and both postal codes. A public BOL link requires a separately approved redacted copy and expires after five minutes; proof of delivery remains private. Review any PDF before marking a redacted BOL for sharing.

## API

| Scope | Endpoints |
| --- | --- |
| Public read | `GET /healthz`, `GET /api/config` |
| Public tracking | `POST /api/tracking/search` (up to 25 PROs or a ZIP-verified reference); `GET /api/tracking/documents/:documentId` (valid ticket) |
| Public updates | `POST /api/tracking/subscriptions`, `POST /api/tracking/subscriptions/confirm`, `POST /api/tracking/subscriptions/unsubscribe` |
| Authentication | `GET, POST /api/auth/setup`; `POST /api/auth/login`, `/mfa`, `/logout`, `/reset`, `/recover`; `GET /api/auth/session` |
| Accounts | `GET, POST /api/auth/users`; `PATCH /api/auth/users/:id`; `POST /api/auth/users/:id/reset` |
| Shipment admin | `GET /api/admin/stats`; `GET, POST /api/admin/shipments`; `GET, PATCH /api/admin/shipments/:id` |
| Shipment events and PDFs | `GET, POST /api/admin/shipments/:id/events` and `/documents`; `PATCH, DELETE /api/admin/shipments/:id/events/:eventId`; `GET, DELETE /api/admin/shipments/:id/documents/:documentId` |
| Admin records | `GET /api/admin/customers`, `/audit`, `/notifications`; `PATCH /api/admin/notifications/:id` |

Authenticated writes require same-origin JSON and a valid session. Search uses JSON request bodies instead of placing shipment numbers in URLs. Auth and shipment API responses are not cached.

## Email

Staging never sends live email. For a future production release, the operator must set and verify an authorized SMTP host, port, sender, and credentials in Railway (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `RECORDS_EMAIL_ENABLED=true`). Confirm the provider permits transactional mail from the configured sender. Subscription requests return a generic result and only enqueue confirmation for an address already attached to the shipment. The recipient must confirm; a signed unsubscribe link is included with qualifying status emails. The worker rechecks the active subscription and current confirmed event before dispatching.

## Verification

Unit and integration tests: run `pnpm test`. For PostgreSQL integration tests, provide **disposable**, locally isolated test databases in `TEST_AUTH_DATABASE_URL`, `TEST_SHIPMENT_DATABASE_URL` and `TEST_NOTIFICATION_DATABASE_URL`. The tests create isolated schemas. Notification tests use an in-process transport and cannot send external mail.

Browser E2E: run `node scripts/tracking-e2e.mjs BASE_URL OUTPUT_DIR` in a terminal with Chrome and Playwright installed. If Playwright is bundled separately, set `TFORCE_AUDIT_MODULES` to the directory containing it. At the hidden prompt enter JSON with `bootstrap: true` and the fields `email`, `password` and `setupToken` for a fresh **test** deployment. For an already enrolled test user use `bootstrap: false` and `authenticatorSecret` in place of the setup token. Do not use first-setup tests against a database with real records. The test creates a clearly marked synthetic shipment, exercises the complete public lookup, and saves screenshots at six viewports. Restart the **application**, then rerun with `--verify-existing` and the same output directory to verify that the shipment and timeline persisted.
