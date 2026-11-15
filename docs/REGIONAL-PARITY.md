# Regional service page comparison

The test compared fresh Chrome screenshots of five local preview pages with the same archived original screenshots used for the preceding Railway comparison. Each route was tested at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 375×812. The figures are mean full-page pixel differences over the six viewports. Lower is closer. They include unmatched page area and do not measure text identity.

| Route | Prior Railway difference | Updated local difference | Restored content and structure |
| --- | ---: | ---: | --- |
| `/ltl/apps/Canada` | 87.19% | 44.69% | Blue service guidance, features and rating sections, 24 published gateway rows, linked customs sections and four document rows. |
| `/ltl/apps/Mexico` | 77.43% | 45.66% | Service options in reference order, five official document entries with view and download actions, agency links and telephone contacts. |
| `/ltl/apps/PuertoRicoUSVirginIslands` | 86.27% | 58.49% | Service, shipping, rating and EEI sections, published outbound and return schedules, official tariff and Census links. |
| `/ltl/apps/HawaiiGuam` | 76.53% | 45.56% | Coverage, ocean service, delivery and shipping documentation sections, three rate components, tariff and contact links. |
| `/ltl/apps/Alaska` | 71.59% | 47.68% | Service and shipping details, two rate components, tariff and contact links. |

All 30 updated local captures returned HTTP 200 with zero browser errors, broken images, failed assets or document-level horizontal overflow. The Canada gateway table scrolls within its labeled region on narrow viewports. The full report, captures, overlays and pixel differences are in the `tforce-regional-local` audit output. The regional retest did not verify a new Railway deployment.

The regional hero photographs and map files account for part of the remaining visual difference. Authorization to republish these assets and the complete original copy was not established. The pages link to the corresponding first-party maps and source material. Canada’s historical 2022 border notice is represented by a link to carrier guidance to avoid presenting a historical mandate as current. Reference PDF print actions and the Mexico software download remain available from the official pages.

## Canada and Puerto Rico/U.S. Virgin Islands follow-up

Both routes restore the widescreen photo and in-column map layout with the reusable photographs and derived maps documented in [REGIONAL-MEDIA.md](REGIONAL-MEDIA.md). The original carrier maps remain linked. Canada retains all four gateway columns without side-scrolling at 375px and 390px; its customs links and bilingual invoice actions remain in the relevant sections. The islands page uses the carrier's published sailing days in two responsive tables, and links to the official route, tariff, and government filing information for current shipping details.

Use the same original captures in the previous published Playwright report to compare this follow-up. It changes only the two regional pages and their scoped styles. The photos and map drawings are distinct from the carrier originals, and full text identity is outside this measurement.
