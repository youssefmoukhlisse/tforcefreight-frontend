# TForce Freight Frontend Reconstruction

Public-facing frontend reconstruction of `tforcefreight.com`, built from publicly accessible pages and assets. The current milestone deliberately excludes live tracking, pickup submission, freight quoting, authentication, customer data, and other backend integrations.

## Local preview

```bash
node scripts/serve-preview.mjs
```

Open `http://127.0.0.1:4173`. The preview and production support direct navigation to frontend routes.

## Railway

The repository contains a production Dockerfile. Railway can deploy it directly and should expose container port `8080`.

## Verification

See the [visual regression workflow](docs/VISUAL_AUDIT.md), [informational difference matrix](docs/INFORMATIONAL-PARITY.md), and [operational difference matrix](docs/OPERATIONAL-PARITY.md). The screenshots under `test-results` are from the initial reconstruction. The audit runner writes new captures, overlays, metrics and errors to its configured output directory.

## Rights and integration note

The preview retains previously bundled reference assets. Public availability is not a reuse license. This pass did not add original assets or republish whole pages of original copy without clearance; pages that need that material link to the official source. MyLTL uses an official-site handoff, and the preview forms do not submit shipment or customer data.
