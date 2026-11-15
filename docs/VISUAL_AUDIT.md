# Visual audit

The Playwright harness opens the original and the replica in separate fresh browser contexts. Both contexts use the same Chrome or Chromium version, viewport, locale, light color scheme and 1× device scale. The default inventory covers the public navigation and secondary links found during the audit.

To install the audit tools without changing the frontend's dependencies, use a separate directory:

```sh
audit_deps="$(mktemp -d)"
npm --prefix "$audit_deps" install playwright pngjs pixelmatch
node "$audit_deps/node_modules/playwright/cli.js" install chromium
TFORCE_AUDIT_MODULES="$audit_deps/node_modules" node scripts/visual-audit.mjs /tmp/tforce-visual-audit
```

Pass paths after the output directory to select a subset:

```sh
TFORCE_AUDIT_MODULES="$audit_deps/node_modules" node scripts/visual-audit.mjs /tmp/tforce-home-audit / /ltl/apps/RateEstimate
```

The default viewports are 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 375×812.

| Environment variable | Behavior |
| --- | --- |
| `TFORCE_ORIGINAL` | Original origin, defaults to `https://www.tforcefreight.com` |
| `TFORCE_REPLICA` | Replica origin, defaults to the production Railway URL. Set a local origin to test a checkout. |
| `TFORCE_AUDIT_MODULES` | Directory containing Playwright, pngjs and pixelmatch |
| `TFORCE_CHROME_CHANNEL` | Set to `chrome` to use installed Chrome |
| `TFORCE_ROUTES_FILE` | Text file with one absolute URL path per line |
| `TFORCE_EXCLUDE_ROUTES` | Comma-separated paths to exclude when splitting the audit into batches |
| `TFORCE_VIEWPORTS` | Comma-separated `widthxheight` values |
| `TFORCE_AUDIT_WORKERS` | Number of concurrent screenshot pairs, defaults to 3 |
| `TFORCE_AUDIT_STATE` | `initial`, `mobile-open`, `shipping-open`, `services-open`, `tools-open`, `myltl-open` or `first-field-focus`. Choose a viewport that exposes the requested control. |

Each case saves the full-page originals, replica screenshots, a 50/50 overlay, the mismatch image and a JSON record. Red marks a pixel difference and amber marks an area present in only one capture. The report includes viewport and screenshot dimensions, visible text digests, selected computed CSS and geometry, image failures, runtime errors and status codes. Its mismatch percentage divides the counted mismatch plus unmatched area by the union of the screenshot areas. Pixelmatch uses threshold 0.1 and ignores antialiasing differences.

The audit records HTTP failures, external redirects and capture errors separately. Available screenshots are kept as evidence, with no parity score for those pairs. Rendering data and page content reflect the moment of capture. Fresh alerts and session behavior can change between runs, so review the overlay and route status alongside any percentage. The optional interaction cases open public menus or focus a field. They do not submit forms or enter credentials.
