const informationOrigin = 'https://www.tforcefreight.com';
const informationBase = '/ltl/apps/';

const informationGroups = {
  AboutUs: { title: 'About Us', hero: 'hero-about-us.jpg', cards: [
    ['Contact Us', 'ContactUs', 'icon-envelope.svg', 'For specific questions, please reach out to us directly.'],
    ['Announcements', 'Announcements', 'icon-bullhorn.svg'],
    ['Fact Sheet', 'FactSheet', 'icon-bullets.svg'],
    ['Careers', 'https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight', 'icon-briefcase.svg']
  ] },
  ServiceInformation: { title: 'Service Information', section: 'Tools & Forms', cards: [
    ['Service Point Inquiry', 'ServicePointInquiry', 'icon-question-mark-bubble.svg', 'Determine the service available for a location and the nearest service center.'],
    ['Service Point Download', 'ServicePointDownload'],
    ['Service Center Directory', 'ServiceCenterDirectory']
  ] },
  AdditionalShippingInformation: { title: 'Additional Shipping Information', section: 'Tools & Forms', cards: [
    ['Fuel Surcharge', 'FuelSurcharge'],
    ['Freight Holidays', 'TForceFreightHolidays'],
    ['Packing Instructions', 'PackingInstructions', 'icon-holding-box.svg'],
    ['Fleet Guide', 'FleetGuide']
  ] },
  Claims: { title: 'Claims', section: 'Tools & Forms', cards: [
    ['Cargo Claims Information', 'CargoClaimsInformation', 'icon-clipboard.svg'],
    ['Cargo Claim Status', 'CargoClaimStatus'],
    ['Overcharge Claim Information', 'OverchargeClaimInformation']
  ] },
  TechnologySolutions: { title: 'Technology Solutions', section: 'Tools & Forms', cards: [
    ['EDI Information', 'EDIInformation'],
    ['API Information', 'https://developer.tforcefreight.com/'],
    ['Rating Software', 'TForceFreightRatingSoftware']
  ] },
  RestrictedGoods: { title: 'Restricted Goods', section: 'Shipping', cards: [
    ['Tobacco and Vape', 'RestrictedGoods/Tobacco'],
    ['Alcohol', 'RestrictedGoods/Alcohol'],
    ['Hemp', 'RestrictedGoods/Hemp'],
    ['Firearms and Ammunition', 'RestrictedGoods/FirearmsandAmmunition']
  ] },
  OtherServices: { title: 'Other Services', section: 'Services', cards: [
    ['Associations', 'Associations'],
    ['Temperature Protection', 'TemperatureProtection'],
    ['Government', 'Government']
  ] },
  SmallBusinessResources: { title: 'Small Business Resources', groups: [
    ['Basic Information', [['Freight 101', 'Freight101'], ['About TForce Freight', 'AboutUs']]],
    ['Unique TForce Freight Solutions', [['UPS® Ground with Freight Pricing*', 'UPSGroundWithFreightPricing'], ['Density-Based Rating', 'DensityBasedRating']]],
    ['Planning & Preparing', [['Transit Times', 'TransitTimes'], ["Add’l Shipping Tools", 'AdditionalShippingInformation']]],
    ['Get Started', [['Request a Quote', 'RateEstimate'], ['Request Consult', 'EmailTForceFreightCustomerSupport']]]
  ] }
};

const informationRules = ['LTL Rules Tariff (U.S., Canada and Mexico)', 'UPGF-102-T-20260817.pdf'];
const informationOffshoreRules = ['LTL Offshore Rules Tariff (Alaska, Puerto Rico, U.S. Virgin Islands, Hawaii, and Guam)', 'upgf-105-20260629.pdf'];
const informationMexicoBol = ['TForce Freight Mexico Bill of Lading Form', 'TFF-Mexico-BOL-Form.pdf'];
const informationTradeshowBol = ['TForce Freight Tradeshow Bill of Lading Form', 'TFF-Tradeshow-BOL-Form.pdf'];
const informationServiceSection = 'Services';
const informationToolsSection = 'Tools & Forms';

const informationDetails = {
  ContactUs: { title: 'Contact TForce Freight', breadcrumb: 'Contact Us', parent: 'AboutUs', body: informationContact },
  Announcements: { title: 'Announcements', parent: 'AboutUs' },
  FactSheet: { title: 'Fact Sheet', parent: 'AboutUs', headings: ['TForce Freight LTL Products', 'Service Coverage', 'Service Features', 'Other Services', 'Network Infrastructure', 'Home Office'] },
  EmailTForceFreightCustomerSupport: { title: 'Email TForce Freight Customer Support', parent: 'ContactUs', externalAction: 'Open the official contact form' },
  TForceFreightLTL: { title: 'TForce Freight LTL', section: informationServiceSection, hero: 'hero-ltl.jpg', body: informationLtl },
  Guaranteed: { title: 'Guaranteed', section: informationServiceSection, parent: 'TForceFreightLTL', links: [
    ['Rate Estimate', 'RateEstimate'], ['Schedule a pickup', 'PickupRequest'], ['TForce Freight Specialized Solutions', 'SpecializedSolutions'],
    ['Request a TForce Freight Specialized Solutions Quote', 'SpecializedSolutionsRequestForm'], ['Contact TForce Freight Customer Service Online', 'EmailTForceFreightCustomerSupport']
  ], documents: [informationRules] },
  Canada: { title: 'Canada', section: informationServiceSection, headings: ['Features', 'Rating', 'Customs Clearance / Customs Brokerage / Shipping Documentation to Canada (Northbound)', 'Customs Clearance / Customs Brokerage / Shipping Documentation from Canada (Southbound)'], links: [['TForce Freight Rating Software', 'TForceFreightRatingSoftware']], documents: [
    ['USMCA Certificate of Origin', 'TFF-USMCA-Fillable-Form-US.pdf'], ['Certificate of Origin Instructions', 'Certificate-of-Origin-Inst.pdf'], ['Commercial Invoice', '/ltl/forms/docs/ci1bp.pdf'], ['Export Express form', '/ltl/forms/docs/OTC-394-Export-Express.pdf']
  ] },
  Mexico: { title: 'Mexico', section: informationServiceSection, documents: [
    ['USMCA Certificate of Origin', 'TFF-USMCA-Fillable-Form-US.PDF'], ['Certificate of Origin Instructions', 'Certificate-of-Origin-Inst.pdf'], informationMexicoBol,
    ['Commercial Invoice', 'Commerical-Invoice-Entry.pdf'], ['Packing List', 'Packing-List-Entry.pdf']
  ], links: [['Automated Export System', 'https://www.census.gov/foreign-trade/aes/index.html'], ['Border Wait Times', 'https://bwt.cbp.gov/']] },
  PuertoRicoUSVirginIslands: { title: 'Puerto Rico/U.S. Virgin Islands', section: informationServiceSection, headings: ['Service', 'Shipping Details', 'To San Juan', 'From San Juan', 'Rating', 'Puerto Rico/U.S. Virgin Islands Electronic Export Information (EEI)'], documents: [informationOffshoreRules] },
  HawaiiGuam: { title: 'Hawaii / Guam', section: informationServiceSection, headings: ['Service', 'Shipping Details', 'Rates and Charges'], documents: [informationOffshoreRules] },
  Alaska: { title: 'Alaska', section: informationServiceSection, headings: ['Service', 'Shipping Details', 'Rating Information'], documents: [informationOffshoreRules] },
  TradeShowServices: { title: 'Trade Show Services', section: informationServiceSection, headings: ['Features', 'Range of Services', 'Tips for trouble-free trade show shipping'], links: [['Tradeshow@TForceFreight.com', 'mailto:tradeshow@tforcefreight.com?subject=Trade%20Show%20Inquiry']], documents: [
    ['Tradeshow Guide', 'Tradeshow-Guide.pdf'], ['Tradeshow Calendar', 'Tradeshow-Calendar.pdf'], informationTradeshowBol
  ] },
  SpecializedSolutions: { title: 'Specialized Solutions', section: informationServiceSection, links: [['Guaranteed', 'Guaranteed'], ['Request a TForce Freight Specialized Solutions Quote', 'SpecializedSolutionsRequestForm']] },
  SpecializedSolutionsRequestForm: { title: 'TForce Freight Specialized Solutions Request Form', parent: 'SpecializedSolutions', externalAction: 'Open the official request form' },
  VolumePricing: { title: 'Volume Pricing', section: informationServiceSection, links: [['Rate Estimate', 'RateEstimate'], ['SpecializedSolutions@TForceFreight.com', 'mailto:SpecializedSolutions@tforcefreight.com']] },
  Truckload: { title: 'Truckload', section: informationServiceSection, headings: ['We Find The Best Way To Move Your Freight', 'Equipment Types:', 'Our Truckload Experts will help with:'], links: [['Guaranteed', 'Guaranteed'], ['Submit a request online', 'EmailTForceFreightCustomerSupport']] },
  DensityBasedRating: { title: 'Density-Based Rating', section: informationServiceSection, headings: ['Simplify Your LTL Shipping', 'TForce Freight Density-Based Rating eliminates the need for freight classification'], links: [['Rate Estimate', 'RateEstimate'], ['Contact TForce Freight', 'ContactUs']] },
  UPSGroundWithFreightPricing: { title: 'UPS® Ground with Freight Pricing*', section: informationServiceSection, headings: ['Move Your Shipment Without a Pallet', 'Move Your Packages Off of the Pallet', 'Great Service with Significant Savings', 'A New Dimension of Customer Service', 'Which Packages are Allowed?'] },
  RulesTariffs: { title: 'Rules Tariff', section: informationToolsSection, documents: [informationRules, informationOffshoreRules], showFormsHeading: true },
  BillofLadingDownloads: { title: 'Bill of Lading Downloads', section: informationToolsSection, documents: [
    ['TForce Freight Bill of Lading Form', 'TFF-BOL-Form.pdf'],
    ['TForce Freight Density Bill of Lading Form', 'TFF-BOL-Density.pdf'],
    informationTradeshowBol, informationMexicoBol,
    ['TForce Freight US Government Bill of Lading Form', 'TFF-US-Gov-BOL-Form.pdf']
  ] },
  FreezableProtectionAdvisory: { title: 'Freezable Protection Advisory', section: informationToolsSection, links: [['Canada Environment web site', 'https://weather.gc.ca/canada_e.html']] },
  FuelSurcharge: { title: 'Fuel Surcharge', parent: 'AdditionalShippingInformation', body: informationSurcharge },
  TForceFreightHolidays: { title: 'TForce Freight Holidays', parent: 'AdditionalShippingInformation', headings: ['TForce Freight Holiday Schedule - U.S. (*)', 'TForce Freight Holiday Schedule - Canada (*)', 'TForce Freight Holiday Schedule - Mexico (*)', 'TForce Freight Holiday Schedule - Puerto Rico (*)'], links: [['Rules Tariff', 'RulesTariffs']] },
  PackingInstructions: { title: 'Packing Instructions', parent: 'AdditionalShippingInformation', headings: ['Preparing Your Shipments for Transport', 'Stacking a Pallet', 'Labeling Shipments', 'Labeling Guide'] },
  FleetGuide: { title: 'Fleet Guide', parent: 'AdditionalShippingInformation', body: informationFleet },
  EDIInformation: { title: 'EDI Information', parent: 'TechnologySolutions', headings: ['EDI Features', 'EDI Benefits', 'Equipment Required', 'Put EDI to work for you!'], documents: [
    ['204 Motor Carrier Load Tender', 'TFF-204-4010.pdf'], ['211 Motor Carrier Bill of Lading', 'TFF-211-4010.pdf'],
    ['210 Motor Carrier Freight Details and Invoice', 'TFF-210-4010.pdf'], ['214 Transportation Carrier Shipment Status Message', 'TFF-214-4010.pdf'],
    ['820 Payment Order / Remittance Advice', 'TFF-820-4010.pdf'], ['997 Functional Acknowledgment', 'TFF-997-4010.pdf'],
    ['Electronic Bill of Lading Flat File', 'TFF-Ebolflat.pdf'], ['Invoice Flat File', 'TFF-Invoice-flat-file.pdf'], ['Invoice Flat File Acknowledgment', 'TFF-Invoice-flat-ackn.pdf']
  ], links: [['TForce Freight Trading Partner EDI Form', `${informationOrigin}/downloads/TFF-Trading-Partner-EDI-Form.doc`]] },
  TForceFreightRatingSoftware: { title: 'TForce Freight Rating Software', parent: 'TechnologySolutions', headings: ['Features', 'Download'], links: [['U.S. Class Rates License Agreement', `${informationOrigin}/ltl/img/TForce-Freight-Rating-Software-License-Agreement.pdf`]] },
  CargoClaimsInformation: { title: 'Cargo Claims Information', parent: 'Claims', headings: ['Lost or Damaged Shipments', 'For a Shipment Shortage', 'How to Have a Shortage Traced', 'For Visible Damage', 'For Concealed Loss or Damage', 'Requesting Inspections', 'The Claim, Defined', 'How to File a Claim', 'How Your Claim will be Processed', 'Insurance Requirements'], links: [['Rules Tariff', 'RulesTariffs'], ['Check the status', 'CargoClaimStatus']], documents: [['TForce Freight Standard Claim Form', 'Claims-Form.pdf']], showFormsHeading: true },
  CargoClaimStatus: { title: 'Cargo Claim Status', parent: 'Claims', externalAction: 'Check a claim on the official site' },
  OverchargeClaimInformation: { title: 'Overcharge Claim Information', parent: 'Claims', headings: ['How to File an Overcharge Claim:'], links: [['overchargeclaims1@tforcefreight.com', 'mailto:overchargeclaims1@tforcefreight.com']], documents: [['TForce Freight Overcharge Claim Form', 'TFF-OC-Claims.pdf']], showFormsHeading: true },
  'RestrictedGoods/Tobacco': { title: 'Tobacco and Vape', parent: 'RestrictedGoods' },
  'RestrictedGoods/Alcohol': { title: 'Alcohol', parent: 'RestrictedGoods', headings: ['Guidelines for Shipping Alcohol'], documents: [informationRules] },
  'RestrictedGoods/Hemp': { title: 'Hemp', parent: 'RestrictedGoods', headings: ['Special Procedures for Shipping Hemp'], links: [['Tobacco and Vape Policy', 'RestrictedGoods/Tobacco']] },
  'RestrictedGoods/FirearmsandAmmunition': { title: 'Firearms and Ammunition', parent: 'RestrictedGoods', headings: ['Special Procedures for Shipping Firearms'] },
  Associations: { title: 'Associations', parent: 'OtherServices', headings: ['TForce Freight Savings Program', 'Get Exclusive Discounts', 'Member benefits', 'Ready to get started?'], links: [['associations@tforcefreight.com', 'mailto:associations@tforcefreight.com?subject=Customer%20Request%20for%20Additional%20Information%20-%20Associations']] },
  TemperatureProtection: { title: 'Temperature Protection', parent: 'OtherServices', headings: ['Temperature Controlled Service'], links: [['Freezable protection advisory', 'FreezableProtectionAdvisory'], ['Transit Times', 'TransitTimes']], documents: [informationRules] },
  Government: { title: 'Government', parent: 'OtherServices', links: [['government@tforcefreight.com', 'mailto:government@tforcefreight.com']] },
  Freight101: { title: 'Freight 101', parent: 'SmallBusinessResources', headings: ["We're Here to Help", "Let's start with the basics. What is LTL?", 'How do I prepare an LTL Shipment?', 'What is freight class?', 'Do I really need a freight class? (Short answer: no.)', 'Prefer to avoid pallets?', 'I have a few more questions. Who do I contact?'], links: [['Contact Us', 'ContactUs'], ['Shipment Guide', 'PackingInstructions'], ['Density-Based Rating', 'DensityBasedRating'], ['UPS Ground with Freight Pricing', 'UPSGroundWithFreightPricing'], ['Email Us', 'EmailTForceFreightCustomerSupport']] },
  TForceFreightPrivacyNotice: { title: 'TForce Freight Privacy Notice', externalAction: 'Read the official TForce Freight privacy notice' }
};

const informationPages = { ...informationGroups, ...informationDetails };
const informationRoutes = new Map(Object.keys(informationPages).map(key => [`${informationBase}${key}`.toLowerCase(), key]));

function informationEscape(value) {
  const escaped = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => escaped[character]);
}

function informationPageTitle(path) {
  return informationPages[informationRoutes.get(path.toLowerCase())]?.title ?? null;
}

function informationLink(label, destination, externalNewTab = false, accessibleLabel = '') {
  const external = /^(https?:|mailto:|tel:)/i.test(destination);
  const href = external ? destination : `${informationBase}${destination}`;
  const behavior = externalNewTab ? ' target="_blank" rel="noopener noreferrer"' : external ? '' : ' data-route';
  const ariaLabel = accessibleLabel ? ` aria-label="${informationEscape(accessibleLabel)}"` : '';
  return `<a href="${informationEscape(href)}"${behavior}${ariaLabel}>${informationEscape(label)}</a>`;
}

function informationDocuments(page) {
  if (!page.documents) return '';
  const items = page.documents.map(([label, file]) => {
    const path = file.startsWith('/') ? file : `/downloads/${file}`;
    const view = informationLink('View', `${informationOrigin}${path}`, true, `View ${label}`);
    const download = informationLink('Download', `${informationOrigin}/ltl/PublicPages/DownloadFile?path=${encodeURIComponent(path)}`, false, `Download ${label}`);
    return `<li><strong>${informationEscape(label)}</strong><div class="info-document-actions">${view}${download}</div></li>`;
  }).join('');
  const heading = page.showFormsHeading ? '<h2>Forms</h2>' : '';
  return `${heading}<ul class="info-document-list">${items}</ul>`;
}

function informationContact() {
  return `<section class="info-contact">
    <h2>Email</h2><p>Please ${informationLink('email', 'EmailTForceFreightCustomerSupport')} us with your comments and questions.</p>
    <h2>Correspondence</h2>
    <p><strong>Mailing Addresses<br>General Office</strong></p>
    <p>TForce Freight<br>9954 Mayland Drive, 3rd Floor, Suite 3000<br>Henrico, VA 23233<br><br>TForce Freight<br>PO Box 1216<br>Richmond, VA 23218</p>
    <h2>Customer Service</h2>
    <p><strong>${informationLink('(800)333-7400', 'tel:+18003337400')}</strong><br>Dial toll-free from the United States, Canada, Guam, Puerto Rico and the U.S. Virgin Islands. For rating, tracking, proof of delivery, lane information and problem resolution.</p>
    <p>From outside the United States or Canada, dial <strong>${informationLink('(804)231-8555', 'tel:+18042318555')}</strong>.</p>
    <h3>Accounts Receivable Inquiries</h3>
    <p><strong>${informationLink('1-833-445-2556', 'tel:+18334452556')}</strong><br>${informationLink('accountsreceivable@ar.tforcefreight.com', 'mailto:accountsreceivable@ar.tforcefreight.com')}</p>
    <h3>Remittance (Payment Details)</h3>
    <p>${informationLink('paymentremit@ar.tforcefreight.com', 'mailto:paymentremit@ar.tforcefreight.com')}<br>${informationLink('Official payment addresses', `${informationOrigin}${informationBase}ContactUs`)}</p>
    <h2>Services</h2>
    <p><strong>International and Offshore Coverage<br>${informationLink('(800)333-7400', 'tel:+18003337400')}</strong></p>
    <p><strong>TForce Freight Expedited<br>${informationLink('(800)644-0900', 'tel:+18006440900')}</strong></p>
    <p><strong>Trade Show<br>${informationLink('(800)988-9889', 'tel:+18009889889')}</strong></p>
    <p><strong>Consolidation &amp; Distribution<br>${informationLink('(866)598-5814', 'tel:+18665985814')}</strong></p>
    <p><strong>Government<br>${informationLink('(800)227-8046', 'tel:+18002278046')}</strong></p>
    <p><strong>Volume Pricing<br>${informationLink('(800)266-6902', 'tel:+18002666902')}</strong></p>
    <p>${informationLink('Employment Verification', `${informationOrigin}/downloads/Employment_Verification_Directions_for_Requestors.pdf`, true)}</p>
  </section>`;
}

function informationLtl() {
  return `<section class="info-ltl">
    <div>
      <h2>Speed. Coverage. Flexibility. And ${informationLink('guaranteed', 'Guaranteed')} reliability.*</h2>
      <p>TForce Freight’s extensive transportation network, experienced employees, and efficient systems mean your freight will be picked up and delivered on time.</p>
      <h3>Services Include:</h3>
      <ul><li>Regional, interregional &amp; long-haul service, all with one pickup</li><li>More than 13,000 one and two day lanes</li><li>Cross-continent three- and four-day service</li><li>Technologies to improve shipping, tracking &amp; billing</li><li>Single carrier responsibility</li><li>Offshore and international shipping</li></ul>
      <p>${informationLink('Complete a LTL rate quote', 'RateEstimate')}</p>
      <p>${informationLink('Specialized Solutions', 'SpecializedSolutions')} · ${informationLink('Volume Pricing', 'VolumePricing')}</p>
      <p><small>*See the ${informationLink('Tariff', 'RulesTariffs')} and ${informationLink('Terms and Conditions', 'https://tfiintl.com/en/terms-of-use/')} and any other applicable contract, as other restrictions may apply.</small></p>
    </div>
    <img src="/assets/north-america-map.jpg" alt="North American TForce Freight service coverage">
  </section>`;
}

function informationTable(caption, headers, groups) {
  const header = headers.map(label => `<th scope="col">${informationEscape(label)}</th>`).join('');
  const bodies = groups.map(([name, rows]) => {
    const rowGroupHeading = name ? `<tr><th scope="rowgroup" colspan="${headers.length}">${informationEscape(name)}</th></tr>` : '';
    const data = rows.map(([label, ...cells]) => `<tr><th scope="row">${informationEscape(label)}</th>${cells.map(value => `<td>${informationEscape(value)}</td>`).join('')}</tr>`).join('');
    return `<tbody>${rowGroupHeading}${data}</tbody>`;
  }).join('');
  return `<div class="info-table-scroll" role="region" aria-label="${informationEscape(caption)}" tabindex="0"><table><caption>${informationEscape(caption)}</caption><thead><tr>${header}</tr></thead>${bodies}</table></div>`;
}

function informationFleet() {
  const groups = [
    ['Linehaul Units**', [
      ["28' Roll Up Door", `27' 4"`, `9' 1"`, `8' 3"`, `8' 8"`, `7' 8"`, '2,044'],
      ["28' Swing Open Door", `27' 4"`, `8' 10"`, `8' 1"`, `8' 8"`, `7' 8"`, '1,940']
    ]],
    ['City Units', [
      ["40' Roll Up Door", `39' 6"`, `8' 0"`, `7' 8"`, `7' 8"`, `7' 5"`, '2,600'],
      ["45' Roll Up Door", `44' 1"`, `8' 10"`, `7' 8"`, `8' 5"`, `7' 3"`, '3,010'],
      ["45' Swing Open Door", `44' 5"`, `8' 11"`, `7' 7"`, `8' 7"`, `7' 8"`, '3,070'],
      ["48' Roll Up Door", `47' 1"`, `9' 3"`, `8' 3"`, `9' 0"`, `7' 8"`, '3,530'],
      ["48' Swing Open Door", `47' 6"`, `9' 3"`, `8' 1"`, `9' 0"`, `8' 2"`, '3,520']
    ]]
  ];
  return informationTable('Trailers', ['Type', 'L', 'H', 'W', 'Door Height', 'Door Width', 'Cubic Capacity'], groups);
}

function informationSurcharge() {
  return `<h2>Class Based Shipment</h2>
    ${informationTable('Fuel Surcharge for Class Based Shipments', ['Effective Date', 'LTL Fuel Surcharge'], [['', [['11/11/2026', '56.4%']]]])}
    <p>Published value as observed on November 15, 2026. ${informationLink('Check the latest fuel surcharge', `${informationOrigin}${informationBase}FuelSurcharge`)}.</p>
    <h2>Density Based Shipment</h2>
    <p>${informationLink('TForce Freight Rules Tariff', 'RulesTariffs')}</p>
    ${informationDocuments({ documents: [informationRules] })}`;
}

function informationCards(cards) {
  const items = cards.map(([title, href, icon, description]) => `
    <section class="info-card">
      <h2>${icon ? `<img src="/assets/${icon}" width="40" height="40" alt="">` : ''}${informationEscape(title)}</h2>
      ${description ? `<p>${informationEscape(description)}</p>` : ''}
      ${informationLink('Learn More', href, false, `Learn more about ${title}`)}
    </section>`).join('');
  return `<div class="info-card-grid">${items}</div>`;
}

function informationList(links) {
  return `<ul class="info-link-list">${links.map(([label, href]) => `<li>${informationLink(label, href)}</li>`).join('')}</ul>`;
}

function informationBody(page, key) {
  if (page.body) return page.body();
  if (page.cards) return informationCards(page.cards);
  const source = informationLink(page.externalAction ?? `View ${page.title} on the official TForce Freight site`, `${informationOrigin}${informationBase}${key}`);
  if (page.groups) {
    const groups = page.groups.map(([title, links]) => `<section><h2>${informationEscape(title)}</h2>${informationList(links)}</section>`).join('');
    return `<div class="info-resource-groups">${groups}</div><p class="info-source">${source}</p>`;
  }
  const headings = page.headings ? `<ul class="info-section-list">${page.headings.map(title => `<li>${informationEscape(title)}</li>`).join('')}</ul>` : '';
  const links = page.links ? informationList(page.links) : '';
  return `${informationDocuments(page)}${headings}${links}<p class="info-source">${source}</p>`;
}

function informationPage(path) {
  const key = informationRoutes.get(path.toLowerCase());
  if (!key) return null;
  const page = informationPages[key];
  const title = informationEscape(page.title);
  const parent = page.parent && informationPages[page.parent];
  const section = page.section ?? parent?.section;
  const crumbs = [informationLink('Home', 'Home')];
  if (section) crumbs.push(informationEscape(section));
  if (parent) crumbs.push(informationLink(parent.title, page.parent));
  crumbs.push(`<span aria-current="page">${informationEscape(page.breadcrumb ?? page.title)}</span>`);
  const hero = page.hero ? `<div class="info-hero"><img src="/assets/${page.hero}" alt=""></div>` : '';
  return `<main id="main-content" class="information-page">
    <header class="container info-heading">
      <nav aria-label="Breadcrumb" class="info-breadcrumb">${crumbs.join('<span aria-hidden="true"> &gt; </span>')}</nav>
      <h1>${title}</h1>
    </header>
    ${hero}
    <div class="container info-content">${informationBody(page, key)}</div>
  </main>`;
}
