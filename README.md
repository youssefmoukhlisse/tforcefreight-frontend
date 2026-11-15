# TForce Freight Frontend Reconstruction

Public-facing frontend reconstruction of `tforcefreight.com`, built from publicly accessible pages and assets. The current milestone deliberately excludes live tracking, pickup submission, freight quoting, authentication, customer data, and other backend integrations.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`. Client-side routes work after the initial page loads; production uses the included Nginx fallback.

## Railway

The repository contains a production Dockerfile. Railway can deploy it directly and should expose container port `8080`.

## Verification

Reference screenshots captured from the public original are stored in `test-results/reference`. Current and diff folders are intentionally ignored because they are generated during QA.

## Rights and integration note

Assets in `assets` were downloaded from the publicly accessible original site at the owner's request. Before a public production launch, confirm ongoing rights to every logo, photograph, document, and third-party mark. Live operational forms require separately authorized APIs and are not implemented in this frontend milestone.
