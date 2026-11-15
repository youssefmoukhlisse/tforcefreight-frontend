# Informational page difference matrix

The public source and the existing implementation were checked before these changes. Each route below was checked on `https://www.tforcefreight.com/ltl/apps/` and returned HTTP 200. The matrix describes the initial difference, the change in this patch, and what still differs. It does not stand in for the Playwright screenshots and pixel measurements.

P1 identifies a missing route, a document or service destination, or a material section difference. P2 identifies other page structure and asset differences. The route names in the first column are relative to `/ltl/apps/`.

| Route | Priority | Before and after | Remaining difference |
| --- | --- | --- | --- |
| `AboutUs` | P1 | Replaced the image overlay heading and bordered generic cards with the reference order of breadcrumb, title, existing hero and four linked modules. | Several card descriptions and exact spacing. |
| `ContactUs` | P1 | Removed the extra rate and tracking sidebar. Added the verified official contact-form path, remittance email and employment verification link. | Full department text and exact paragraph hierarchy. |
| `Announcements` | P1 | Replaced the generic placeholder with the reference title, About Us breadcrumb and official page link. | Hero `Hero-Announcements.jpg` and announcements content. |
| `FactSheet` | P1 | Replaced the placeholder with the verified topic order and official page link. | Hero `Fact1.jpg` and full section bodies. |
| `EmailTForceFreightCustomerSupport` | P1 | Added the local route and linked the official contact form. | Live customer form stays on the official domain. |
| `ServiceInformation` | P1 | Replaced four unrelated cards with Service Point Inquiry, Service Point Download and Service Center Directory, in that order. | Hero `SvcInfo.jpg`, `icon-arrow-download.svg`, `icon-directory.svg`, two descriptions, and spacing. |
| `AdditionalShippingInformation` | P1 | Replaced generic copy with linked Fuel Surcharge, Freight Holidays, Packing Instructions and Fleet Guide modules. | Hero `Hero-Additional-Shipping-Info.jpg`, `icon-fuel-gauge.svg`, `icon-bell.svg`, `icon-truck.svg` and descriptions. |
| `Claims` | P1 | Replaced the single generic paragraph with Cargo Claims Information, Cargo Claim Status and Overcharge Claim Information modules. | `icon-checkmark.svg`, `icon-money.svg` and descriptions. |
| `TechnologySolutions` | P1 | Replaced generic text with EDI Information, API Information and Rating Software modules, including the official API site link. | `icon-contracts.svg`, `icon-report.svg`, `icon-rate.svg` and descriptions. |
| `RestrictedGoods` | P1 | Replaced the text placeholder with four linked policy categories. | Hero `Hero-Restricted.jpg`, card descriptions and spacing. |
| `OtherServices` | P1 | Replaced generic copy with the Associations, Temperature Protection and Government module order. | Hero `Hero-Other-Services.jpg`, `icon-associations.svg`, `icon-thermometer.svg`, `icon-government.svg` and descriptions. |
| `SmallBusinessResources` | P1 | Added four verified link groups and all eight actions. | Hero and eight photos (`Hero-Small-Business-Resources.jpg`, `SOCS-Sub-1.jpg` through `SOCS-Sub-8.jpg`), exact wording and module shapes. |
| `TForceFreightLTL` | P1 | Reordered title and hero, restored the existing coverage map and verified links to Guaranteed, quote, tariff and terms. | Complete paragraphs, exact map alignment and details. |
| `Guaranteed` | P2 | Replaced summary with verified related actions and official tariff link. | Hero `Hero-Guaranteed.jpg`, full wording and CTA arrangement. |
| `Canada` | P2 | Added section order, rating tool destination and published shipping document links. | Hero `Canada1-V2.png`, `canada-map-WEB.JPG`, alert presentation and exact sections. |
| `Mexico` | P2 | Added verified forms and official agency links. | Hero `Mexico1-V2.png`, `Mexico-Web.jpg`, `icon-zip.png`, form instructions and legacy executable link. |
| `PuertoRicoUSVirginIslands` | P2 | Added service topics with current official offshore tariff destination. | Hero `Hero-Puerto-Rico.jpg`, `PR-Web.jpg`, section bodies and repeated agency links. |
| `HawaiiGuam` | P2 | Matched public title spacing and restored shipping headings and official offshore tariff link. | Hero `Hawaii1.jpg`, `HA-Guam_WEB3.png` and exact text. |
| `Alaska` | P2 | Added service, shipping and rating topics plus official offshore tariff. | Hero `Alaska1.jpg`, `Alaska-WEB.JPG` and exact text. |
| `TradeShowServices` | P2 | Corrected title, added section names and official guide, calendar, BOL and contact links. | Hero `Hero-Tradeshow.jpg`, body and layout. |
| `SpecializedSolutions` | P1 | Added verified Guaranteed and specialized quote links. | Hero `Urgent1.jpg`, verbatim body and form CTA placement. |
| `SpecializedSolutionsRequestForm` | P1 | Added local destination with link to the official quote form. | Live quote form remains on the official domain. |
| `VolumePricing` | P2 | Restored the official rate estimate and contact destinations. | Hero `Hero-Volume-Pricing.jpg`, exact prose and arrangement. |
| `Truckload` | P2 | Added visible section names and verified quote-related links. | Hero `Hero-Truckload.jpg`, equipment list and exact prose. |
| `DensityBasedRating` | P2 | Added checked section titles and the reference rate and contact links. | Hero `DBR1.jpg` and complete informational and promotional text. |
| `UPSGroundWithFreightPricing` | P2 | Replaced the placeholder tagline with verified section names and official page handoff. | Hero `Hero-UPS-GFP.jpg`, full wording and arrangement. |
| `RulesTariffs` | P1 | Restored the forms list and two official view/download destinations. | PDF icon `icon-pdf.png`, source paragraphs, print action and row spacing. |
| `BillofLadingDownloads` | P1 | Replaced placeholder with all five verified form names and real view/download links. | PDF icon, print action and individual source descriptions. |
| `FreezableProtectionAdvisory` | P1 | Exposed the official advisory and Environment Canada link. | Live advisory wording and `/downloads/weather.jpg`. |
| `FuelSurcharge` | P1 | Added previously missing route with observed sections, the dated published value and official tariff. | Live surcharge updates and exact tab/table behavior. |
| `TForceFreightHolidays` | P1 | Added previously missing route with four verified schedule labels and official links. | Hero `Hero-Holiday.jpg`, dates and source tables. |
| `PackingInstructions` | P1 | Added previously missing route with verified topic order. | `Boxes1.jpg`, `Boxes2.jpg`, complete instructions and their section layout. |
| `FleetGuide` | P1 | Added previously missing route with published trailer types and dimensions. | Exact table styling and source notes. |
| `EDIInformation` | P1 | Added previously missing route, nine document destinations and the partner form link. | Exact section bodies, document icons and spacing. |
| `TForceFreightRatingSoftware` | P1 | Added previously missing route and official license agreement link. | Software download controls, features and agreement state. |
| `CargoClaimsInformation` | P1 | Added previously missing route, claim topics and current official claims form. | Exact wording, original section hierarchy and form icon. |
| `CargoClaimStatus` | P1 | Added previously missing route and official status action. | The shipment-specific lookup stays on the official domain. |
| `OverchargeClaimInformation` | P1 | Added previously missing route and official claim form and contact links. | Exact instructions and document layout. |
| `RestrictedGoods/Tobacco` | P1 | Added the verified child route and official policy link. | Full policy text and source links. |
| `RestrictedGoods/Alcohol` | P1 | Added the verified child route, guideline heading and official tariff. | Full guideline and exact section layout. |
| `RestrictedGoods/Hemp` | P1 | Added the verified child route, procedure heading and tobacco policy link. | Full procedure text. |
| `RestrictedGoods/FirearmsandAmmunition` | P1 | Added the verified child route, procedure heading and official policy link. | Full procedure text. |
| `Associations` | P1 | Added the previously missing route, subsection labels and official contact email. | Hero `Hero-Associations.jpg` and full program copy. |
| `TemperatureProtection` | P1 | Added the previously missing route and advisory, transit and tariff links. | Detailed current restrictions and exact layout. |
| `Government` | P1 | Added previously missing route and official contact email. | Hero `Hero-Government.jpg` and full page text. |
| `Freight101` | P1 | Added the previously missing route with topic names and verified guidance links. | Hero `Hero-Freight101.jpg`, complete paragraphs and guide PDF links. |
| `TForceFreightPrivacyNotice` | P1 | Replaced placeholder as the destination for the shipping company's notice with a link to that official policy. | The official policy and its conditions stay on the source domain. |

The source layout uses a `1400px` maximum content width, a `1600px` maximum hero width, `30px` module padding, and a card grid that changes from four columns to two and then one. The reference Service Information cards use a `40 × 40px` icon, `25px` icon-to-label space, and `20px` bold headings. The informational CSS incorporates those measured rules. The recreated pages still need comparison at each viewport because the reference's complete markup, copy and assets affect their geometry.

Images and descriptions listed as remaining gaps were publicly visible in the reference, but permission to republish them was not established for this patch. Existing assets were retained. Official PDFs are linked at the publisher's URLs. The direct view link opens the PDF in the browser viewer, where visitors can print it. Time-varying data, authenticated documents and customer submissions are handled by the official destinations.

The follow-up adds section-by-section structure to the largest measured visual gaps. Regional pages use public route and shipping-document facts; resource pages restore the article, card or form-download structure. The privacy page provides a clearly labeled guide alongside the official notice and this preview's cookie controls. The guide is not the complete policy. Official maps, unavailable hero assets and exact long-form copy are still outside parity where reuse permission has not been confirmed.
