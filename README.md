# Freight frontend reconstruction and independent shipment portal

The existing freight information frontend is retained. The independent shipment portal issues its own nine-digit tracking numbers and accepts previously issued `INT-` numbers. It reads and writes its own PostgreSQL data and does not connect to the TForce Freight network. The new workflows do not submit pickups or obtain freight quotes.

## Application and local preview

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Set DATABASE_URL, APP_ORIGIN, RECORDS_ENCRYPTION_KEY and RECORDS_SETUP_TOKEN.
node --env-file=.env server/index.mjs
```

Open `http://127.0.0.1:8080/admin/` and use **Set up first administrator** with the setup token. Enroll a time-based authenticator and save the recovery codes before continuing. Public tracking is at `/ltl/apps/Tracking` and `/tracking/`. Running `node scripts/serve-preview.mjs` still supports static frontend review, without the shipment service.

## Railway

The Dockerfile serves the application and the existing frontend on port `8080`; `/healthz` checks the database once configured. See [deployment, data and API details](docs/SHIPMENT-PORTAL.md). The `tracking/staging` branch is deployed to the staging service only.

## Verification

Run `pnpm test` and use the PostgreSQL integration test settings described in [the portal documentation](docs/SHIPMENT-PORTAL.md). See also the [frontend visual regression workflow](docs/VISUAL_AUDIT.md), [informational difference matrix](docs/INFORMATIONAL-PARITY.md), and [operational difference matrix](docs/OPERATIONAL-PARITY.md).

## Rights and integration note

The information preview retains previously bundled reference assets. The independent tracking and administration pages use their own identity and do not use reference shipment data. MyLTL uses an official-site handoff. Enter carrier-issued numbers only on the carrier's own tracking site.
