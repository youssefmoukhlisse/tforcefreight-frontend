const A = '/assets/';

const navGroups = [
  { label: 'Tracking', items: [['Track a Shipment', '/ltl/apps/Tracking'], ['Tracking Help', '/ltl/apps/TrackingHelp']] },
  { label: 'Shipping', items: [['Rate Estimate', '/ltl/apps/RateEstimate'], ['Transit Times', '/ltl/apps/TransitTimes'], ['Pickup Request', '/ltl/apps/PickupRequest'], ['Restricted Goods', '/ltl/apps/RestrictedGoods']] },
  { label: 'Services', wide: true, items: [
    ['TForce Freight LTL', '/ltl/apps/TForceFreightLTL'], ['Guaranteed', '/ltl/apps/Guaranteed'], ['Canada', '/ltl/apps/Canada'], ['Mexico', '/ltl/apps/Mexico'],
    ['Puerto Rico/U.S. Virgin Islands', '/ltl/apps/PuertoRicoUSVirginIslands'], ['Hawaii/Guam', '/ltl/apps/HawaiiGuam'], ['Alaska', '/ltl/apps/Alaska'], ['Tradeshow', '/ltl/apps/TradeShowServices'],
    ['Specialized Solutions', '/ltl/apps/SpecializedSolutions'], ['Volume Pricing', '/ltl/apps/VolumePricing'], ['Truckload', '/ltl/apps/Truckload'], ['Density-Based Rating', '/ltl/apps/DensityBasedRating'],
    ['UPS Ground with Freight Pricing', '/ltl/apps/UPSGroundWithFreightPricing'], ['Other Services', '/ltl/apps/OtherServices']
  ]},
  { label: 'Tools & Forms', wide: true, items: [
    ['Service Information', '/ltl/apps/ServiceInformation'], ['Additional Shipping Information', '/ltl/apps/AdditionalShippingInformation'], ['Rules Tariff', '/ltl/apps/RulesTariffs'],
    ['Bill Of Lading Downloads', '/ltl/apps/BillofLadingDownloads'], ['Technology Solutions', '/ltl/apps/TechnologySolutions'], ['Density Calculator', '/ltl/apps/DensityCalculator'],
    ['Freezable Protection Advisory', '/ltl/apps/FreezableProtectionAdvisory'], ['Claims', '/ltl/apps/Claims']
  ]},
  { label: 'MyLTL', lock: true, items: [['Log In', '/ltl/apps/MyLTL'], ['Sign Up', '/ltl/apps/MyLTLSignup'], ['Create Bill of Lading', '/ltl/apps/BillofLadingDownloads'], ['Shipping Documents', '/ltl/apps/ShippingDocuments']] }
];

const servicePages = {
  '/ltl/apps/TForceFreightLTL': {
    title: 'TForce Freight LTL', crumb: 'Services', hero: 'hero-ltl.jpg', tagline: 'Speed. Coverage. Flexibility. And guaranteed reliability.*',
    html: `<p>TForce Freight’s extensive transportation network, experienced employees, and efficient systems mean your freight will be picked up and delivered on time.</p><h3>Services Include:</h3><ul><li>Regional, interregional & long-haul service, all with one pickup</li><li>More than 13,000 one and two day lanes</li><li>Cross-continent three- and four-day service</li><li>Technologies to improve shipping, tracking & billing</li><li>Single carrier responsibility</li><li>Offshore and international shipping</li></ul><p><a data-route href="/ltl/apps/RateEstimate">Complete an LTL rate quote</a></p><p>For critical shipments, upgrade to our <a data-route href="/ltl/apps/SpecializedSolutions">Specialized Solutions</a> service. Have occasional large LTL shipments? We offer volume pricing on select lanes.</p><p><small>*See the Rules Tariff and Terms and Conditions and any other applicable contract, as other restrictions may apply.</small></p>`
  },
  '/ltl/apps/Guaranteed': { title: 'Guaranteed', crumb: 'Services', tagline: 'The speed you need. Guaranteed.', html: `<p>For time-sensitive LTL freight, TForce Freight Guaranteed services provide delivery options backed by the applicable terms and tariff.</p><h3>Reliable options for critical freight</h3><p>Select the guaranteed service that matches your delivery window. Service availability and eligibility must be confirmed through authorized rating and transit-time systems.</p>` },
  '/ltl/apps/Canada': { title: 'Canada', crumb: 'Services', tagline: 'Cross-border shipping made easier.', html: `<p>TForce Freight provides LTL transportation between the United States and Canada, supported by an extensive service-center network.</p><h3>Plan your shipment</h3><p>Use the public shipping information and contact Customer Service for current customs, documentation, and coverage requirements.</p>` },
  '/ltl/apps/Mexico': { title: 'Mexico', crumb: 'Services', tagline: 'North American LTL coverage.', html: `<p>TForce Freight offers cross-border transportation options for shipments moving between the United States and Mexico.</p><p>Documentation, customs brokerage, service availability, and pricing require confirmation for each shipment.</p>` },
  '/ltl/apps/PuertoRicoUSVirginIslands': { title: 'Puerto Rico/U.S. Virgin Islands', crumb: 'Services', tagline: 'Offshore service connections.', html: `<p>Access LTL service information for Puerto Rico and the U.S. Virgin Islands, including planning and documentation resources.</p>` },
  '/ltl/apps/HawaiiGuam': { title: 'Hawaii/Guam', crumb: 'Services', tagline: 'Integrated offshore transportation.', html: `<p>Plan shipments to and from Hawaii and Guam with ocean-connected LTL service options. Contact Customer Service to verify schedules and documentation.</p>` },
  '/ltl/apps/Alaska': { title: 'Alaska', crumb: 'Services', tagline: 'Dependable service to and from Alaska.', html: `<p>Review service options for Alaska freight and contact TForce Freight for current schedules, restrictions, and quote requirements.</p>` },
  '/ltl/apps/TradeShowServices': { title: 'Tradeshow', crumb: 'Services', tagline: 'Transportation support for exhibits and events.', html: `<p>Trade show and convention transportation service is available for LTL and volume shipments throughout the U.S.</p><p>For current coordination support, call <strong>(800) 988-9889</strong>.</p>` },
  '/ltl/apps/SpecializedSolutions': { title: 'Specialized Solutions', crumb: 'Services', tagline: 'Customized solutions for unique, time-sensitive needs.', html: `<p>The Specialized Solutions team supports unique, time-sensitive, guaranteed, and truckload needs.</p><p>Email <a href="mailto:SpecializedSolutions@tforcefreight.com">SpecializedSolutions@tforcefreight.com</a> to get started.</p>` },
  '/ltl/apps/VolumePricing': { title: 'Volume Pricing', crumb: 'Services', tagline: 'Options for occasional large LTL shipments.', html: `<p>Volume pricing may be available on select lanes for shipments that require more capacity than a standard LTL movement.</p><p>Eligibility, capacity, and price require an authorized quote.</p>` },
  '/ltl/apps/Truckload': { title: 'Truckload', crumb: 'Services', tagline: 'Capacity for larger shipment needs.', html: `<p>Contact the Specialized Solutions team for truckload requirements, time-sensitive moves, and customized transportation planning.</p>` },
  '/ltl/apps/DensityBasedRating': { title: 'Density-Based Rating', crumb: 'Services', tagline: 'A transparent way to describe freight characteristics.', html: `<p>Density-based rating uses shipment dimensions and weight to determine freight density. Accurate measurements are required for reliable rating.</p><p><a data-route href="/ltl/apps/DensityCalculator">Use the Density Calculator</a></p>` },
  '/ltl/apps/UPSGroundWithFreightPricing': { title: 'UPS Ground with Freight Pricing', crumb: 'Services', tagline: 'Information for the legacy combined service.', html: `<p>This public information page is reproduced for structural parity. Current availability, eligibility, and account access must be confirmed with TForce Freight.</p>` },
  '/ltl/apps/OtherServices': { title: 'Other Services', crumb: 'Services', tagline: 'Additional transportation resources.', html: `<p>Explore specialized handling, offshore coverage, trade show support, volume pricing, and other service options.</p>` },
  '/ltl/apps/RestrictedGoods': { title: 'Restricted Goods', crumb: 'Shipping', tagline: 'Review requirements before shipping.', html: `<p>Some commodities are prohibited or require special handling, documentation, packaging, or advance authorization.</p><p>Consult the current Rules Tariff and Customer Service before tendering regulated or restricted goods.</p>` },
  '/ltl/apps/ServiceInformation': { title: 'Service Information', crumb: 'Tools & Forms', tagline: 'Plan with current service resources.', html: `<p>Access transit planning, service-center, holiday, weather, and coverage information used when preparing an LTL shipment.</p><div class="about-cards">${miniCard('icon-calendar-grey.svg','Transit Times','Estimate delivery timing.','/ltl/apps/TransitTimes')}${miniCard('icon-forklift.svg','Pickup Request','Prepare a pickup request.','/ltl/apps/PickupRequest')}${miniCard('icon-clipboard.svg','Shipping Information','Review shipment resources.','/ltl/apps/AdditionalShippingInformation')}${miniCard('icon-question-mark-bubble.svg','Customer Service','Find help and contacts.','/ltl/apps/ContactUs')}</div>` },
  '/ltl/apps/AdditionalShippingInformation': { title: 'Additional Shipping Information', crumb: 'Tools & Forms', tagline: 'Resources for processing your shipment.', html: `<p>Review fuel surcharge information, holiday schedules, documentation resources, restricted goods, and other details used to prepare freight.</p><h3>Important</h3><p>Operational values change over time. Live rates, schedules, and documents must be obtained from authorized sources before shipment.</p>` },
  '/ltl/apps/RulesTariffs': { title: 'Rules Tariff', crumb: 'Tools & Forms', tagline: 'Rules, terms, and service conditions.', html: `<p>The governing tariff and applicable terms define service rules, limits, charges, and responsibilities.</p><p>This frontend does not reproduce controlled or time-sensitive tariff documents. Use the official published document for a transaction.</p>` },
  '/ltl/apps/BillofLadingDownloads': { title: 'Bill Of Lading Downloads', crumb: 'Tools & Forms', tagline: 'Shipping document resources.', html: `<p>Prepare and download the appropriate bill of lading documents for your shipment.</p><p>Document generation and customer-specific data will be connected only after backend and data-access approval.</p>` },
  '/ltl/apps/TechnologySolutions': { title: 'Technology Solutions', crumb: 'Tools & Forms', tagline: 'Tools that connect shipping workflows.', html: `<p>Technology resources support rating, shipping, tracking, document exchange, and account workflows.</p><p>Production integrations require authorized credentials, endpoints, and data-use approval.</p>` },
  '/ltl/apps/FreezableProtectionAdvisory': { title: 'Freezable Protection Advisory', crumb: 'Tools & Forms', tagline: 'Seasonal information for temperature-sensitive freight.', html: `<p>Weather conditions can affect shipments vulnerable to freezing. Review current advisories and service availability before tendering freight.</p>` },
  '/ltl/apps/Claims': { title: 'Claims', crumb: 'Tools & Forms', tagline: 'Claims information and resources.', html: `<p>Review claim requirements and supporting documentation. A live claim submission workflow is outside the frontend milestone and requires authorized systems.</p>` },
  '/ltl/apps/SmallBusinessResources': { title: 'Small Business Resources', crumb: 'Shipping', tagline: 'New to LTL shipping?', html: `<p>Learn the fundamentals of less-than-truckload shipping, including packaging, freight class, dimensions, documents, pickup planning, and tracking.</p>` },
  '/ltl/apps/Technology': { title: 'Technology Solutions', crumb: 'Tools & Forms', tagline: 'Connected freight tools.', html: `<p>Explore technology options that support shipping and visibility workflows.</p>` }
};

function miniCard(icon, title, body, href) {
  return `<article class="about-card"><img src="${A}${icon}" alt=""><h3>${title}</h3><p>${body}</p><a data-route href="${href}">Learn More</a></article>`;
}

function alerts() {
  return `<div class="site-alert red" data-alert><div class="alert-inner"><img src="${A}icon-alert-lightgrey.svg" alt=""><p>Need customized solutions for your shipment? Contact our Specialized Solutions Team for all of your unique, time sensitive needs, and Truckload needs. Email <a href="mailto:SpecializedSolutions@tforcefreight.com">SpecializedSolutions@tforcefreight.com</a> to get started or learn more at <a data-route href="/ltl/apps/SpecializedSolutions">Specialized Solutions.</a></p><button class="alert-close" aria-label="Close alert"><img src="${A}icon-close-lightgrey.svg" alt=""></button></div></div>
  <div class="site-alert blue" data-alert><div class="alert-inner"><img src="${A}icon-alert-lightgrey.svg" alt=""><p>We're Hiring! Join our growing team at TForce Freight - <a href="https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight">TForce Freight Careers</a></p><button class="alert-close" aria-label="Close alert"><img src="${A}icon-close-lightgrey.svg" alt=""></button></div></div>`;
}

function navMarkup(mobile = false) {
  if (mobile) {
    return navGroups.map((group, i) => `<div class="mobile-group"><button aria-expanded="false" data-mobile-group="${i}">${group.label}</button><div class="mobile-submenu">${group.items.map(([t,h]) => `<a data-route href="${h}">${t}</a>`).join('')}</div></div>`).join('') + `<a data-route href="/ltl/apps/AboutUs">About Us</a><a href="https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight">Careers</a><a data-route href="/ltl/apps/ContactUs">Customer Service</a>`;
  }
  return navGroups.map((group, i) => `<div class="nav-item"><button class="nav-button ${group.lock ? 'lock' : ''}" aria-expanded="false" data-nav-group="${i}">${group.label}</button><div class="dropdown ${group.wide ? 'wide' : ''}">${group.items.map(([t,h]) => `<a data-route href="${h}">${t}</a>`).join('')}</div></div>`).join('') + `<a data-route href="/ltl/apps/AboutUs">About Us</a><a href="https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight">Careers</a>`;
}

function header(showAlerts = false) {
  return `${showAlerts ? alerts() : ''}<header class="site-header"><div class="header-shell"><a class="brand" data-route href="/ltl/apps/Home">TForce Freight Home</a><nav class="utility-nav" aria-label="Utilities"><a data-route href="/ltl/apps/MyLTL">♟ Log in</a><a data-route href="/ltl/apps/MyLTLSignup">Sign Up</a></nav><button class="search-trigger" aria-expanded="false">Search</button><nav class="desktop-nav" aria-label="Primary">${navMarkup()}</nav><a class="customer-service" data-route href="/ltl/apps/ContactUs">Customer Service</a><div class="mobile-actions"><button class="mobile-search" aria-label="Search"></button><button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false"></button></div><nav class="mobile-menu" aria-label="Mobile navigation">${navMarkup(true)}</nav></div><div class="search-panel"><form class="search-row" data-search-form><label class="sr-only" for="site-search">Search</label><input id="site-search" type="search" placeholder="Search"><button>Search</button></form></div></header>`;
}

function footer() {
  return `<section class="help-band"><img src="${A}icon-customer-service-white.svg" alt=""><strong>Need Help?</strong><span>Can't find what you are looking for? Have additional questions? <a data-route href="/ltl/apps/ContactUs">Contact Us</a></span></section><footer class="site-footer"><div class="container"><img src="${A}TFI-International-Company.svg" alt="A TFI International Company"><ul class="footer-links"><li><a href="https://tfiintl.com/en/terms-of-use/">Website Terms of Use ↗</a></li><li><a href="https://tfiintl.com/en/governance/">Governance ↗</a></li><li><a data-route href="/ltl/apps/RulesTariffs">Tariff</a></li><li><a href="#cookie-settings" data-cookie-settings>Cookie Settings</a></li></ul><p>Copyright ©2021-${new Date().getFullYear()} TForce Freight</p></div></footer>`;
}

function cookieNotice() {
  if (sessionStorage.getItem('tff-cookie-dismissed')) return '';
  return `<aside class="cookie-notice" role="dialog" aria-label="Cookie notice"><button class="cookie-close" aria-label="Close">×</button><h2>This website uses cookies</h2><p>We do this to better understand how visitors use our site and to offer you a more personal experience. Please see our <a data-route href="/ltl/apps/TForceFreightPrivacyNotice">Privacy Notice</a> for more information. You can manage your preferences by selecting <a href="#cookie-settings" data-cookie-settings>Cookie Settings</a>.</p></aside>`;
}

function homePage() {
  const cards = [
    ['icon-holding-box.svg','Rate Estimate','Obtain a rate estimate to begin processing your shipment.','Quote and Ship','/ltl/apps/RateEstimate'],
    ['icon-calendar-grey.svg','Transit Times','Determine transit times and the estimated date of delivery for your shipment.','Transit Times','/ltl/apps/TransitTimes'],
    ['icon-forklift.svg','Pickup Request','Request a TForce Freight pickup for your shipment(s).','Pickup Request','/ltl/apps/PickupRequest'],
    ['icon-clipboard.svg','Shipping Information','Additional information including fuel surcharges, holiday schedules and information for processing your TForce Freight shipment.','Shipping Information','/ltl/apps/AdditionalShippingInformation']
  ];
  return `<main id="main-content"><section class="hero-home"><img src="${A}home-truck.jpg" alt="TForce Freight tractor trailer"><div class="track-card"><div class="track-title"><img src="${A}icon-track.svg" alt=""><span>Track</span></div><form class="track-form" data-operational-form data-feature="Shipment tracking"><label class="sr-only" for="home-pro">PRO Number</label><input id="home-pro" name="pro" placeholder="PRO Number" required><button aria-label="Track">→</button></form></div></section><section class="home-content"><div class="container"><h1 class="home-title">Get Started with TForce Freight LTL</h1><div class="feature-grid">${cards.map(([icon,title,body,label,href]) => `<article class="feature-card"><h3><img src="${A}${icon}" alt=""><span>${title}</span></h3><p>${body}</p><a data-route href="${href}">${label}</a></article>`).join('')}</div><div class="ltl-help"><img src="${A}icon-question-mark-bubble.svg" alt=""><span>Unfamiliar with LTL Shipping?</span><a data-route href="/ltl/apps/SmallBusinessResources">Learn More &gt;&gt;</a></div></div></section></main>`;
}

function pageShell(title, crumb, content) {
  return `<main id="main-content" class="page-main"><div class="container"><div class="breadcrumbs"><a data-route href="/ltl/apps/Home">Home</a> &gt; ${crumb ? `${crumb} &gt; ` : ''}${title}</div><h1 class="page-title">${title}</h1>${content}</div></main>`;
}

function genericPage(page) {
  const hero = page.hero ? `<section class="inpage-hero"><img src="${A}${page.hero}" alt="${page.title}"><div class="hero-copy"><h1>${page.title}</h1><p>${page.tagline || ''}</p></div></section>` : '';
  const body = `<div class="content-grid"><article class="prose">${!page.hero && page.tagline ? `<h2>${page.tagline}</h2>` : ''}${page.html}</article><aside class="side-card"><h3>Quick Links</h3><a data-route href="/ltl/apps/RateEstimate">Rate Estimate</a><a data-route href="/ltl/apps/TransitTimes">Transit Times</a><a data-route href="/ltl/apps/PickupRequest">Pickup Request</a><a data-route href="/ltl/apps/ContactUs">Customer Service</a></aside></div>`;
  return hero ? `<main id="main-content">${hero}<div class="container page-main"><div class="breadcrumbs"><a data-route href="/ltl/apps/Home">Home</a> &gt; ${page.crumb} &gt; ${page.title}</div>${body}</div></main>` : pageShell(page.title, page.crumb, body);
}

const countrySelect = (id, label) => `<div class="field"><label for="${id}">${label}</label><select id="${id}" required><option>United States</option><option>Canada</option><option>Mexico</option></select></div>`;
const textField = (id, label, type='text', placeholder='') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${placeholder}" ${label.includes('*') ? 'required' : ''}></div>`;

function rateEstimatePage() {
  return pageShell('Rate Estimate','Shipping',`<div class="login-banner"><span><strong>Log In</strong> to receive your negotiated rates (if applicable) and access enhanced functionality.</span><a class="btn btn-primary" data-route href="/ltl/apps/MyLTL">Log In</a></div><form data-operational-form data-feature="Rate estimate"><section class="form-card form-section"><button type="button" class="form-section-title">Shipment Information</button><div class="form-body"><div class="field-grid">${countrySelect('rate-from-country','Ship From *')}${textField('rate-from-zip','ZIP Code *')}${countrySelect('rate-to-country','Ship To *')}${textField('rate-to-zip','ZIP Code *')}<div class="field"><label>Shipment contains hazardous materials</label><label class="check-line"><input type="checkbox"> No</label></div>${textField('rate-date','Shipping Date *','text','MM/DD/YYYY')}<div></div><div></div>${textField('rate-discount','Discount','number')}${textField('rate-floor','Floor Minimum','number')}</div><p class="required-note">Discount will be applied to the current TForce Freight rate tariff. Discount and Floor Minimum fields should remain blank unless contractual terms and tariffs are known.</p><label class="check-line"><input type="checkbox"> Request Quote Number</label></div></section><section class="form-card form-section"><button type="button" class="form-section-title">Commodity Information</button><div class="form-body"><p>Rate this shipment using</p><div class="rating-tabs"><button type="button">NMFC Class</button><button type="button">Dimensions</button></div><div class="commodity-row"><div class="commodity-number">1</div><div class="field"><label for="rate-class">Class *</label><select id="rate-class" required><option value="">--</option>${[50,55,60,65,70,77.5,85,92.5,100,110,125,150,175,200,250,300,400,500].map(v=>`<option>${v}</option>`).join('')}</select></div>${textField('rate-weight','Weight (lbs) *','number')}${textField('rate-nmfc','NMFC-Sub No.')}${textField('rate-linear','Linear Feet','number')}</div><div class="actions"><button type="button" class="btn btn-secondary">+ Add Another Commodity</button></div><div class="volume-notice">New Service Added — TForce Freight Volume Rating ⓘ</div></div></section><section class="form-card form-section collapsed"><button type="button" class="form-section-title">Value Added Services — LTL Guaranteed (*) Eligible Services</button><div class="form-body"><label class="check-line"><input type="checkbox"> Inside pickup or delivery</label><label class="check-line"><input type="checkbox"> Liftgate service</label></div></section><div class="form-message" role="status"></div><div class="actions"><button class="btn btn-primary">Get Rate</button><button type="reset" class="btn btn-secondary">Reset</button></div></form>`);
}

function transitPage() {
  return pageShell('Transit Times','Shipping',`<h2>Submit a Request</h2><form data-operational-form data-feature="Transit times"><div class="field-grid cols-2">${countrySelect('origin-country','Origin Country Code')}${textField('origin-zip','Origin ZIP Code *')}${countrySelect('destination-country','Destination Country Code')}${textField('destination-zip','Destination ZIP Code *')}</div><div class="form-message" role="status"></div><div class="actions"><button class="btn btn-primary">Submit</button><button type="reset" class="btn btn-secondary">Clear</button></div></form>`);
}

function pickupPage() {
  return pageShell('Pickup Request','Shipping',`<p class="login-note"><strong>Log In</strong> to utilize your address information and access enhanced functionality.</p><p>Registered MyLTL users can complete a pick-up request online by logging in to MyLTL.</p><p>Should you require immediate assistance with LTL pickups or weekend/holiday delivery, please contact TForce Freight Customer Service at <strong>(800)333-7400</strong> option 1.</p><form data-operational-form data-feature="Pickup request"><section class="form-card form-section"><button type="button" class="form-section-title">Pickup Time</button><div class="form-body"><div class="field-grid cols-3">${textField('pickup-date','Pickup Date *','text','MM/DD/YYYY')}${textField('ready-at','Shipment Ready At *','time')}${textField('pickup-close','Pickup Close *','time')}</div></div></section><section class="form-card form-section"><button type="button" class="form-section-title">Pickup Information</button><div class="form-body"><div class="field-grid cols-3">${textField('pickup-company','Company *')}${textField('pickup-contact','Contact Name *')}${textField('pickup-address','Street Address *')}${countrySelect('pickup-country','Country *')}${textField('pickup-zip','ZIP Code *')}${textField('pickup-city','City *')}${textField('pickup-state','State *')}${textField('pickup-phone','Phone *','tel')}${textField('pickup-email','Email *','email')}</div></div></section><section class="form-card form-section"><button type="button" class="form-section-title">Requester Information</button><div class="form-body"><div class="field-grid cols-3">${textField('requester-name','Requester Name *')}${textField('requester-company','Company *')}${textField('requester-phone','Phone *','tel')}${textField('requester-email','Email *','email')}</div></div></section><section class="form-card form-section"><button type="button" class="form-section-title">Shipment Information</button><div class="form-body"><div class="field-grid cols-3">${textField('pieces','Pieces *','number')}${textField('weight','Weight *','number')}${textField('description','Description/NMFC *')}${textField('delivery-zip','Destination ZIP Code *')}</div><label class="check-line"><input type="checkbox"> Hazmat</label><label class="check-line"><input type="checkbox"> The freight shipment for this pickup request is guaranteed</label><div class="field"><label for="instructions">Additional Instructions (up to 60 characters)</label><textarea id="instructions" maxlength="60"></textarea></div></div></section><div class="form-message" role="status"></div><div class="actions"><button class="btn btn-primary">Review</button><button type="reset" class="btn btn-secondary">Clear</button></div></form>`);
}

function trackingPage() {
  return pageShell('Track a Shipment','Tracking',`<div class="content-grid"><article><p>Enter one or more PRO numbers to track a shipment.</p><form data-operational-form data-feature="Shipment tracking"><div class="field"><label for="tracking-pro">PRO Number *</label><textarea id="tracking-pro" placeholder="Enter PRO numbers, one per line" required></textarea></div><div class="form-message" role="status"></div><div class="actions"><button class="btn btn-primary">Track</button><button type="reset" class="btn btn-secondary">Clear</button></div></form></article><aside class="side-card"><h3>Tracking options</h3><a href="#">PRO Number</a><a href="#">Reference Number</a><a data-route href="/ltl/apps/ContactUs">Tracking Help</a></aside></div>`);
}

function densityPage() {
  return pageShell('Density Calculator','Tools & Forms',`<form data-density-form><p><strong>Calculate Density by:</strong></p><label class="check-line"><input type="radio" name="density-mode" checked> Handling Unit Weight</label><div class="density-table"><table><thead><tr><th>#</th><th>Length (in)</th><th>Width (in)</th><th>Height (in)</th><th>Weight (lb)</th><th>Cubic Feet</th><th>Density</th></tr></thead><tbody><tr><td>1</td>${['length','width','height','weight'].map(x=>`<td><input type="number" min="0" step="any" data-density="${x}" aria-label="${x}"></td>`).join('')}<td data-cubic>—</td><td data-density-result>—</td></tr></tbody></table></div><div class="form-message" role="status"></div><div class="actions"><button class="btn btn-primary">Submit</button><button type="reset" class="btn btn-secondary">Clear</button></div></form><article class="prose"><h2>How to Measure a Shipment and Determine Handling Unit Density</h2><ol><li>Measure dimensions of the handling unit in inches at its greatest distance.</li><li>Multiply length × width × height to determine cubic inches.</li><li>Divide cubic inches by 1,728 to calculate cubic feet.</li><li>Divide total handling unit weight by cubic feet to determine density.</li></ol></article>`);
}

function aboutPage() {
  return `<main id="main-content"><section class="inpage-hero"><img src="${A}hero-about-us.jpg" alt="About Us"><div class="hero-copy"><h1>About Us</h1></div></section><div class="container page-main"><div class="breadcrumbs"><a data-route href="/ltl/apps/Home">Home</a> &gt; About Us</div><div class="about-cards">${miniCard('icon-envelope.svg','Contact Us','For specific questions, please reach out to us directly.','/ltl/apps/ContactUs')}${miniCard('icon-bullhorn.svg','Announcements','TForce Freight news and press releases.','/ltl/apps/Announcements')}${miniCard('icon-bullets.svg','Fact Sheet','An overview of TForce Freight services and capabilities.','/ltl/apps/FactSheet')}${miniCard('icon-briefcase.svg','Careers','Explore TForce Freight job opportunities.','https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight')}</div></div></main>`;
}

function contactPage() {
  return pageShell('Contact TForce Freight','About Us',`<div class="content-grid"><article class="prose"><h2>Email</h2><p><a href="mailto:CustomerService@tforcefreight.com">Please email us with your comments and questions.</a></p><h2>Correspondence</h2><h3>General Office</h3><p>TForce Freight<br>9954 Mayland Drive, 3rd Floor, Suite 3000<br>Henrico, VA 23233</p><p>TForce Freight<br>PO Box 1216<br>Richmond, VA 23218</p><h2>Customer Service</h2><p><strong>(800)333-7400</strong></p><p>Dial toll-free from the United States, Canada, Guam, Puerto Rico and the U.S. Virgin Islands. For rating, tracking, proof of delivery, lane information and problem resolution.</p><p>From outside the United States or Canada, dial <strong>(804)231-8555</strong>.</p><h3>Accounts Receivable Inquiries</h3><p>1-833-445-2556<br><a href="mailto:accountsreceivable@ar.tforcefreight.com">accountsreceivable@ar.tforcefreight.com</a></p><h2>Services</h2><p><strong>International and Offshore Coverage:</strong> (800)333-7400</p><p><strong>TForce Freight Expedited:</strong> (800)644-0900</p><p><strong>Trade Show:</strong> (800)988-9889</p></article><aside class="side-card"><h3>Customer Service</h3><a href="tel:18003337400">(800) 333-7400</a><a data-route href="/ltl/apps/Tracking">Track a Shipment</a><a data-route href="/ltl/apps/RateEstimate">Rate Estimate</a></aside></div>`);
}

function myLtlPage(signup=false) {
  return pageShell(signup ? 'Sign Up for MyLTL' : 'MyLTL','MyLTL',`<div class="content-grid"><article class="prose"><h2>${signup ? 'Create an account' : 'Access your shipping tools'}</h2><p>${signup ? 'Account enrollment is hosted in an authorized identity system.' : 'MyLTL provides account-specific shipping, documents, billing, and visibility tools.'}</p><div class="form-message show">The live identity and authentication workflow is not part of this frontend milestone. No credentials are collected on this site.</div><div class="actions"><a class="btn btn-primary" href="https://www.tforcefreight.com/ltl/apps/Home">Continue to the authorized TForce Freight site</a></div></article><aside class="side-card"><h3>Account tools</h3><a href="#">Shipping history</a><a href="#">Bills and documents</a><a href="#">Notifications</a></aside></div>`);
}

function privacyPage() {
  return pageShell('TForce Freight Privacy Notice','',`<article class="prose"><p>This reconstructed frontend does not collect or transmit shipment, account, or customer information. Operational forms are disabled until authorized backend integrations are approved.</p><p>For the current official privacy notice and cookie practices, consult the original TForce Freight website and applicable TFI International policies.</p><h2>Cookie preferences</h2><p>This preview stores only a session value when the cookie notice is dismissed and does not load analytics or advertising scripts.</p></article>`);
}

function notFoundPage() {
  return `<main id="main-content" class="not-found"><h1>404</h1><h2>Page not found</h2><p>The page you requested could not be found.</p><a class="btn btn-primary" data-route href="/ltl/apps/Home">Return Home</a></main>`;
}

function normalizePath(path) {
  if (path === '/' || /^\/ltl\/apps\/home\/?$/i.test(path)) return '/ltl/apps/Home';
  return path.replace(/\/$/, '') || '/ltl/apps/Home';
}

function routeContent(path) {
  const p = normalizePath(path);
  if (p === '/ltl/apps/Home') return homePage();
  if (p === '/ltl/apps/RateEstimate') return rateEstimatePage();
  if (p === '/ltl/apps/TransitTimes') return transitPage();
  if (p === '/ltl/apps/PickupRequest') return pickupPage();
  if (p === '/ltl/apps/Tracking' || p === '/ltl/apps/TrackingHelp') return trackingPage();
  if (p === '/ltl/apps/DensityCalculator') return densityPage();
  if (p === '/ltl/apps/AboutUs') return aboutPage();
  if (p === '/ltl/apps/ContactUs') return contactPage();
  if (p === '/ltl/apps/MyLTL') return myLtlPage(false);
  if (p === '/ltl/apps/MyLTLSignup') return myLtlPage(true);
  if (p === '/ltl/apps/TForceFreightPrivacyNotice') return privacyPage();
  if (servicePages[p]) return genericPage(servicePages[p]);
  if (['/ltl/apps/Announcements','/ltl/apps/FactSheet','/ltl/apps/ShippingDocuments'].includes(p)) return genericPage({title:p.split('/').pop().replace(/([A-Z])/g,' $1').trim(),crumb:'About Us',tagline:'Public information and resources.',html:'<p>This public-facing section is included for structural parity. Content that depends on controlled documents or account systems will be connected only with authorized access.</p>'});
  return notFoundPage();
}

function render(path = location.pathname, push = false) {
  const p = normalizePath(path);
  if (push && p !== location.pathname) history.pushState({}, '', p);
  document.title = p === '/ltl/apps/Home' ? 'TForce Freight' : `${routeTitle(p)} | TForce Freight`;
  document.getElementById('app').innerHTML = `${header(p === '/ltl/apps/Home')}${routeContent(p)}${footer()}${cookieNotice()}`;
  bindEvents();
  window.scrollTo(0, 0);
}

function routeTitle(p) {
  if (servicePages[p]) return servicePages[p].title;
  return ({'/ltl/apps/RateEstimate':'Rate Estimate','/ltl/apps/TransitTimes':'Transit Times','/ltl/apps/PickupRequest':'Pickup Request','/ltl/apps/Tracking':'Track a Shipment','/ltl/apps/DensityCalculator':'Density Calculator','/ltl/apps/AboutUs':'About Us','/ltl/apps/ContactUs':'Contact TForce Freight','/ltl/apps/MyLTL':'MyLTL','/ltl/apps/MyLTLSignup':'Sign Up','/ltl/apps/TForceFreightPrivacyNotice':'Privacy Notice'})[p] || 'TForce Freight';
}

function bindEvents() {
  document.querySelectorAll('a[data-route]').forEach(link => link.addEventListener('click', event => {
    const url = new URL(link.href, location.origin);
    if (url.origin === location.origin) { event.preventDefault(); render(url.pathname, true); }
  }));
  document.querySelectorAll('[data-alert] .alert-close').forEach(button => button.addEventListener('click', () => button.closest('[data-alert]').remove()));
  document.querySelectorAll('[data-nav-group]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const item = button.closest('.nav-item');
    document.querySelectorAll('.nav-item.open').forEach(open => { if (open !== item) open.classList.remove('open'); });
    item.classList.toggle('open');
    button.setAttribute('aria-expanded', item.classList.contains('open'));
  }));
  document.addEventListener('click', closeDesktopMenus, { once: true });
  document.querySelector('.menu-toggle')?.addEventListener('click', event => {
    const menu = document.querySelector('.mobile-menu');
    menu.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', menu.classList.contains('open'));
  });
  document.querySelectorAll('[data-mobile-group]').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('.mobile-group'); group.classList.toggle('open'); button.setAttribute('aria-expanded', group.classList.contains('open'));
  }));
  const toggleSearch = () => document.querySelector('.search-panel')?.classList.toggle('open');
  document.querySelector('.search-trigger')?.addEventListener('click', toggleSearch);
  document.querySelector('.mobile-search')?.addEventListener('click', toggleSearch);
  document.querySelector('[data-search-form]')?.addEventListener('submit', event => { event.preventDefault(); const q = event.currentTarget.querySelector('input').value.trim(); if (q) render('/ltl/apps/ServiceInformation', true); });
  document.querySelectorAll('.form-section-title').forEach(button => button.addEventListener('click', () => button.closest('.form-section').classList.toggle('collapsed')));
  document.querySelectorAll('[data-operational-form]').forEach(form => form.addEventListener('submit', operationalSubmit));
  document.querySelector('[data-density-form]')?.addEventListener('submit', densitySubmit);
  document.querySelector('[data-density-form]')?.addEventListener('reset', () => setTimeout(() => { document.querySelector('[data-cubic]').textContent='—'; document.querySelector('[data-density-result]').textContent='—'; }, 0));
  document.querySelector('.cookie-close')?.addEventListener('click', () => { sessionStorage.setItem('tff-cookie-dismissed','1'); document.querySelector('.cookie-notice')?.remove(); });
  document.querySelectorAll('[data-cookie-settings]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); sessionStorage.removeItem('tff-cookie-dismissed'); if (!document.querySelector('.cookie-notice')) document.body.insertAdjacentHTML('beforeend', cookieNotice()); bindCookieOnly(); }));
}

function bindCookieOnly() {
  document.querySelector('.cookie-close')?.addEventListener('click', () => { sessionStorage.setItem('tff-cookie-dismissed','1'); document.querySelector('.cookie-notice')?.remove(); });
}

function closeDesktopMenus() { document.querySelectorAll('.nav-item.open').forEach(item => item.classList.remove('open')); }

function operationalSubmit(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const message = event.currentTarget.querySelector('.form-message') || document.createElement('div');
  message.className = 'form-message show';
  message.textContent = `${event.currentTarget.dataset.feature} is presented as a frontend-only workflow. No data was sent. Live results require the authorized backend integration planned for the next phase.`;
  if (!message.parentNode) event.currentTarget.prepend(message);
  message.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function densitySubmit(event) {
  event.preventDefault();
  const values = Object.fromEntries([...event.currentTarget.querySelectorAll('[data-density]')].map(input => [input.dataset.density, Number(input.value)]));
  const message = event.currentTarget.querySelector('.form-message');
  if (!values.length || !values.width || !values.height || !values.weight) { message.className='form-message show'; message.textContent='Enter length, width, height, and weight to calculate density.'; return; }
  const cubic = (values.length * values.width * values.height) / 1728;
  const density = values.weight / cubic;
  document.querySelector('[data-cubic]').textContent = cubic.toFixed(2);
  document.querySelector('[data-density-result]').textContent = density.toFixed(2);
  message.className='form-message show'; message.textContent='Density calculated locally in your browser. No shipment data was transmitted.';
}

window.addEventListener('popstate', () => render(location.pathname, false));
render();
