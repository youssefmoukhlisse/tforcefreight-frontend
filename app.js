const A = '/assets/';
const OFFICIAL_SITE = 'https://www.tforcefreight.com';
const OFFICIAL_HOME = OFFICIAL_SITE + '/ltl/apps/Home';
const CONTACT = '/ltl/apps/ContactUs';
const CAREERS = 'https://efjm.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/TForceFreight';
const dismissedAlerts = new Set();

const navGroups = [
  { label: 'Tracking', href: '/ltl/apps/Tracking' },
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
  { label: 'MyLTL', lock: true, wide: true, items: [
    ['Create Bill of Lading','CreateBillOfLading'], ['Manage Bills of Lading','ManageBOL'], ['Documents','Imaging'],
    ['Billing','Billing'], ['Notify','Notify'], ['Reports','Reports'], ['Customize','Customize'],
    ['Create a Shipment','UPSGroundwithFreightPricingShipping'], ['View Shipment History','UPSGroundwithFreightPricingShippingHistory']
  ].map(([label, route]) => [label, OFFICIAL_SITE + '/ltl/myltl/' + route]) }
];

function alerts() {
  const entries = [
    ['red', 'specialized', 'Need customized solutions for your shipment? Contact our Specialized Solutions Team for all of your unique, time sensitive needs, and Truckload needs. Email <a href="mailto:SpecializedSolutions@tforcefreight.com">SpecializedSolutions@tforcefreight.com</a> to get started or learn more at <a data-route href="/ltl/apps/SpecializedSolutions">Specialized Solutions.</a>'],
    ['blue', 'careers', `We're Hiring! Join our growing team at TForce Freight - <a href="${CAREERS}">TForce Freight Careers</a>`]
  ];
  return `<div class="site-alerts" id="site-alerts">${entries.map(([color, id, message]) => `<div class="site-alert ${color}" data-alert="${id}"${dismissedAlerts.has(id) ? ' hidden' : ''}><div class="alert-inner"><img src="${A}icon-alert-lightgrey.svg" alt=""><p>${message}</p><button type="button" class="alert-close" aria-label="Close ${id} alert"><img src="${A}icon-close-lightgrey.svg" alt=""></button></div></div>`).join('')}</div>`;
}

function navLink(label, href, attributes = '') {
  return `<a ${href.startsWith('/') ? 'data-route ' : ''}href="${href}" ${attributes}>${label}</a>`;
}

function navMarkup(mobile = false) {
  const prefix = mobile ? 'compact' : 'desktop';
  const groups = navGroups.map((group, i) => {
    if (group.href) return navLink(group.label, group.href);
    const id = `${prefix}-submenu-${i}`;
    const links = (items) => items.map(([text,href]) => navLink(text,href)).join('');
    const submenu = group.lock ? `<div><strong>Less Than Truckload</strong>${links(group.items.slice(0,7))}</div><div><strong>UPS Ground with Freight Pricing</strong>${links(group.items.slice(7))}</div>` : links(group.items);
    return `<div class="${mobile ? 'mobile-group' : 'nav-item'}"><button type="button" class="nav-button${group.lock ? ' lock' : ''}" aria-expanded="false" aria-controls="${id}" ${mobile ? 'data-mobile-group' : 'data-nav-group'}="${i}">${group.label}</button><div id="${id}" class="${mobile ? 'mobile-submenu' : 'dropdown'}${group.wide ? ' wide' : ''}${group.lock ? ' locked-menu' : ''}">${submenu}</div></div>`;
  }).join('');
  return groups + navLink('About Us','/ltl/apps/AboutUs') + navLink('Careers',CAREERS) + (mobile ? navLink('Customer Service',CONTACT) + navLink('Log in','/ltl/apps/MyLTL') + navLink('Sign Up','/ltl/apps/MyLTLSignup') : '');
}

function header({showAlerts = false} = {}) {
  return `${showAlerts ? alerts() : ''}<header class="site-header"><div class="header-shell"><a class="brand" data-route href="/ltl/apps/Home">TForce Freight Home</a><nav class="utility-nav" aria-label="Utilities Menu">${showAlerts ? '<button type="button" data-alert-toggle aria-controls="site-alerts">Alerts</button>' : ''}<a class="login-link" data-route href="/ltl/apps/MyLTL">Log in</a><a data-route href="/ltl/apps/MyLTLSignup">Sign Up</a></nav><button type="button" class="search-trigger" aria-expanded="false" aria-controls="site-search-panel">Search</button><nav class="desktop-nav" aria-label="Primary">${navMarkup()}</nav><a class="customer-service" data-route href="${CONTACT}">Customer Service</a><div class="mobile-actions"><button type="button" class="mobile-search" aria-label="Search" aria-expanded="false" aria-controls="site-search-panel"></button><button type="button" class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="mobile-navigation"></button></div><nav id="mobile-navigation" class="mobile-menu" aria-label="Mobile navigation">${navMarkup(true)}</nav></div><div id="site-search-panel" class="search-panel"><form class="search-row" action="/ltl/apps/SearchResults" data-search-form><label class="sr-only" for="site-search">Search</label><input id="site-search" name="q" type="search" placeholder="Search" required><button>Search</button></form></div></header>`;
}

function footer() {
  return `<section class="help-band"><div class="help-band-heading"><img src="${A}icon-customer-service-white.svg" alt=""><strong>Need Help?</strong></div><p>Can't find what you are looking for? Have additional questions? <a data-route href="${CONTACT}">Contact Us</a></p></section><footer class="site-footer"><div class="container"><img src="${A}TFI-International-Company.svg" alt="TFI International Company"><ul class="footer-links"><li><a class="external" href="https://tfiintl.com/en/terms-of-use/">Website Terms of Use</a></li><li><a class="external" href="https://tfiintl.com/en/governance/">Governance</a></li><li><a data-route href="/ltl/apps/RulesTariffs">Tariff</a></li><li><a href="#cookie-settings" data-cookie-settings>Cookie Settings</a></li></ul><p class="copyright">Copyright ©2021-${new Date().getFullYear()} TForce Freight</p><p class="preview-credit">Frontend preview · <a href="${OFFICIAL_HOME}">Official TForce Freight site</a></p></div></footer>`;
}

function cookieNotice() {
  if (sessionStorage.getItem('tff-cookie-dismissed')) return '';
  return `<aside class="cookie-notice" role="dialog" aria-label="Cookie notice"><button type="button" class="cookie-close" aria-label="Close">×</button><h2>This website uses cookies</h2><p>We do this to better understand how visitors use our site and to offer you a more personal experience. Please see our <a class="external" data-route href="/ltl/apps/TForceFreightPrivacyNotice">Privacy Notice</a> for more information. You can manage your preferences by selecting <a href="#cookie-settings" data-cookie-settings>Cookie Settings</a>.</p></aside>`;
}

function homePage() {
  const cards = [
    ['icon-holding-box.svg','Rate Estimate','Obtain a rate estimate to begin processing your shipment.','Quote and Ship','/ltl/apps/RateEstimate'],
    ['icon-calendar-grey.svg','Transit Times','Determine transit times and the estimated date of delivery for your shipment.','Transit Times','/ltl/apps/TransitTimes'],
    ['icon-forklift.svg','Pickup Request','Request a TForce Freight pickup for your shipment(s).','Pickup Request','/ltl/apps/PickupRequest'],
    ['icon-clipboard.svg','Shipping Information','Additional information including fuel surcharges, holiday schedules and information for processing your TForce Freight shipment.','Shipping Information','/ltl/apps/AdditionalShippingInformation']
  ];
  return `<main id="main-content" class="home-page"><section class="hero-home"><img src="${A}home-truck.jpg" alt="TForce Freight tractor trailer" width="1553" height="848"><div class="track-card"><div class="track-title"><img src="${A}icon-track.svg" alt=""><span>Track</span></div><form class="track-form" data-operational-form data-feature="Shipment tracking"><label class="sr-only" for="home-pro">PRO Number</label><textarea id="home-pro" name="pro" placeholder="PRO Number" rows="1" required></textarea><button aria-label="Track"><svg aria-hidden="true" viewBox="0 0 18 18" width="17" height="17"><path d="M2 9h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button></form></div></section><section class="home-content"><div class="home-shell"><h1 class="home-title">Get Started with TForce Freight LTL</h1><hr><div class="feature-grid">${cards.map(([icon,title,body,label,href]) => `<article class="feature-card"><h3><img src="${A}${icon}" alt=""><span>${title}</span></h3><p>${title === 'Shipping Information' ? body.replace('TForce Freight shipment.', '<br>TForce Freight shipment.') : body}</p><a data-route href="${href}">${label}</a></article>`).join('')}</div><div class="ltl-help"><img src="${A}icon-question-mark-bubble.svg" alt=""><span>Unfamiliar with LTL Shipping?</span><a data-route href="/ltl/apps/SmallBusinessResources">Learn More &gt;&gt;</a></div></div></section></main>`;
}

function pageShell(title, crumb, content) {
  return `<main id="main-content" class="page-main"><div class="container"><div class="breadcrumbs"><a data-route href="/ltl/apps/Home">Home</a> &gt; ${crumb ? `${crumb} &gt; ` : ''}${title}</div><h1 class="page-title">${title}</h1>${content}</div></main>`;
}

function privacyPage() {
  const notice = `${OFFICIAL_SITE}/ltl/apps/TForceFreightPrivacyNotice`;
  const contact = OFFICIAL_SITE + CONTACT;
  return `<main id="main-content" class="preview-privacy">
    <header class="container preview-privacy-heading"><h1>TForce Freight Privacy Notice</h1></header>
    <div class="container preview-privacy-content">
      <article aria-label="Guide to the official privacy notice">
        <section>
          <h2>Privacy Policy</h2>
          <p>The TForce Freight notice describes how the carrier handles personal information in connection with its website and freight services. This page is a guide to the notice. <a href="${notice}">Read the official TForce Freight Privacy Notice</a> for the complete wording and current terms.</p>
        </section>
        <section>
          <h2>Personal Information</h2>
          <p>The notice explains what it considers personal information about an identifiable person. It distinguishes that information from certain business contact details.</p>
        </section>
        <section>
          <h2>Information Collection and Use</h2>
          <p>The carrier's policy describes information associated with shipments and accounts. The types of information discussed include:</p>
          <ul><li>Contact information for shippers and recipients.</li><li>Identity information used to confirm a person's identity.</li><li>Billing information, and optional information provided by the customer.</li></ul>
          <p>The notice also describes how the carrier uses information for:</p>
          <ul><li>Transporting and tracking freight, and providing shipment updates.</li><li>Customer service, account administration, and billing.</li><li>Improving its services and meeting business or legal obligations.</li></ul>
        </section>
        <section>
          <h2>Disclosure of Personal Information</h2>
          <p>The official policy describes situations in which information may be disclosed, including to companies supporting freight services, in connection with investigations, or as part of a business transfer. The full notice sets out the conditions for those disclosures.</p>
        </section>
        <section>
          <h2>Knowledge and Consent</h2>
          <p>The notice explains how the carrier handles information supplied by customers and about shipment recipients. It also describes the conditions that apply to withdrawing consent. For guidance about a specific shipment or request, use the official contact page.</p>
        </section>
        <section>
          <h2>Protection and Retention</h2>
          <p>The official policy describes the carrier's safeguards for the information it holds. It also addresses the limits of those protections for information visible on packaging or shipping labels.</p>
          <p>The notice explains how the carrier determines the time needed to keep information, including the purpose of collection and applicable requirements.</p>
        </section>
        <section>
          <h2>Changes to the Privacy Notice</h2>
          <p>Check the <a href="${notice}">official notice</a> for the version currently published by TForce Freight.</p>
        </section>
        <section>
          <h2>Access and Corrections</h2>
          <p>The official notice directs requests to access, correct, or update personal information to the carrier's <a href="${contact}">Contact Us page</a>.</p>
        </section>
        <section>
          <h2>Preview cookie preferences</h2>
          <p>Closing the cookie notice on this demo stores a preference in your current browser session. This demo does not load analytics or advertising scripts.</p>
          <p><a href="#cookie-settings" data-cookie-settings>Cookie Settings</a></p>
        </section>
      </article>
    </div>
  </main>`;
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
  if (/^\/ltl\/apps\/searchresults$/i.test(p)) return searchResultsPage();
  if (/^\/ltl\/apps\/tforcefreightprivacynotice$/i.test(p)) return privacyPage();
  if (/^\/ltl\/myltl\//i.test(p)) {
    const official = navGroups.find(group => group.lock).items.find(([,href]) => new URL(href).pathname.toLowerCase() === p.toLowerCase())?.[1] || OFFICIAL_HOME;
    return pageShell('MyLTL','',`<p><a class="btn btn-primary" href="${official}">Continue to official MyLTL</a></p>`);
  }
  const rendered = (typeof operationPage === 'function' && operationPage(p)) || (typeof informationPage === 'function' && informationPage(p));
  if (rendered) return rendered;
  if (/^\/ltl\/apps\/technology$/i.test(p)) return informationPage('/ltl/apps/TechnologySolutions');
  return notFoundPage();
}

function render(path = location.pathname, push = false, search = location.search) {
  const p = normalizePath(path);
  if (push && p + search !== location.pathname + location.search) history.pushState({}, '', p + search);
  document.title = p === '/ltl/apps/Home' ? 'TForce Freight' : `${routeTitle(p)} | TForce Freight`;
  document.getElementById('app').innerHTML = `${header({showAlerts: p === '/ltl/apps/Home'})}${routeContent(p)}${footer()}${cookieNotice()}`;
  bindEvents();
  window.scrollTo(0, 0);
}

function routeTitle(p) {
  if (/^\/ltl\/apps\/searchresults$/i.test(p)) return 'Search Results';
  const title = (typeof operationPageTitle === 'function' && operationPageTitle(p)) || (typeof informationPageTitle === 'function' && informationPageTitle(p));
  if (title) return title;
  return /^\/ltl\/apps\/technology$/i.test(p) ? 'Technology Solutions' : (p.startsWith('/ltl/myltl/') ? 'MyLTL' : 'Page Not Found');
}

function searchResultsPage() {
  const query = new URLSearchParams(location.search).get('q')?.trim() || '';
  const entries = [...new Map([
    ...navGroups.flatMap(group => group.href ? [[group.label,group.href]] : group.items),
    ['About Us','/ltl/apps/AboutUs'], ['Contact Us',CONTACT], ['Service Center Directory','/ltl/apps/ServiceCenterDirectory'],
    ['Service Point Inquiry','/ltl/apps/ServicePointInquiry'], ['Service Point Download','/ltl/apps/ServicePointDownload']
  ].map(([label,path]) => [path,[label,path]])).values()];
  const matches = query ? entries.filter(([label]) => query.toLowerCase().split(/\s+/).every(term => label.toLowerCase().includes(term))) : [];
  return pageShell('Search Results','',matches.length ? `<ul class="prose">${matches.map(([label,path])=>`<li>${navLink(label,path)}</li>`).join('')}</ul>` : '<p>No matching pages. Use the navigation or try another search.</p>');
}

function bindEvents() {
  document.querySelectorAll('a[data-route]').forEach(link => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.origin);
    if (/^\/ltl\/apps\/tracking(?:help)?\/?$/i.test(url.pathname)) return;
    if (url.origin === location.origin && !url.hash) { event.preventDefault(); render(url.pathname, true, url.search); }
  }));
  document.querySelectorAll('[data-alert] .alert-close').forEach(button => button.addEventListener('click', () => {
    const alert = button.closest('[data-alert]');
    dismissedAlerts.add(alert.dataset.alert);
    alert.hidden = true;
  }));
  document.querySelector('[data-alert-toggle]')?.addEventListener('click', () => {
    const alerts = [...document.querySelectorAll('[data-alert]')];
    const show = alerts.some(alert => alert.hidden);
    for (const alert of alerts) {
      alert.hidden = !show;
      if (show) dismissedAlerts.delete(alert.dataset.alert);
      else dismissedAlerts.add(alert.dataset.alert);
    }
  });
  bindHeaderControls();
  document.querySelector('[data-search-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const q = event.currentTarget.querySelector('input').value.trim();
    if (q) render('/ltl/apps/SearchResults', true, '?' + new URLSearchParams({q}));
  });
  document.querySelectorAll('[data-operational-form]').forEach(form => form.addEventListener('submit', operationalSubmit));
  bindCookieOnly();
  if (typeof bindOperations === 'function') bindOperations();
}

function bindHeaderControls() {
  document.querySelectorAll('[data-nav-group]').forEach(button => button.addEventListener('click', () => {
    const item = button.closest('.nav-item');
    const open = !item.classList.contains('open');
    closeDesktopMenus();
    item.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  }));
  document.querySelector('.menu-toggle')?.addEventListener('click', event => {
    const menu = document.querySelector('.mobile-menu');
    const show = !menu.classList.contains('open');
    closeSearch();
    menu.classList.toggle('open', show);
    event.currentTarget.setAttribute('aria-expanded', String(show));
  });
  document.querySelectorAll('[data-mobile-group]').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('.mobile-group'); group.classList.toggle('open'); button.setAttribute('aria-expanded', group.classList.contains('open'));
  }));
  document.querySelectorAll('.search-trigger,.mobile-search').forEach(button => button.addEventListener('click', () => {
    const panel = document.querySelector('.search-panel');
    const show = !panel.classList.contains('open');
    closeSearch();
    closeMobileMenu();
    closeDesktopMenus();
    if (show) {
      panel.classList.add('open');
      button.setAttribute('aria-expanded','true');
      panel.querySelector('input').focus();
    }
  }));
}

function bindCookieOnly() {
  const close = document.querySelector('.cookie-close');
  if (close) close.onclick = () => { sessionStorage.setItem('tff-cookie-dismissed','1'); close.closest('.cookie-notice').remove(); };
}

function closeDesktopMenus() {
  document.querySelectorAll('.nav-item.open').forEach(item => {
    item.classList.remove('open');
    item.querySelector('[data-nav-group]')?.setAttribute('aria-expanded','false');
  });
}

function closeMobileMenu() {
  document.querySelector('.mobile-menu')?.classList.remove('open');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
}

function closeSearch() {
  document.querySelector('.search-panel')?.classList.remove('open');
  document.querySelectorAll('.search-trigger,.mobile-search').forEach(button => button.setAttribute('aria-expanded','false'));
}

function operationalSubmit(event) {
  event.preventDefault();
  if (event.currentTarget.matches('.track-form')) {
    const input = event.currentTarget.querySelector('textarea');
    const numbers = input.value.trim().toUpperCase().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (numbers.length <= 25 && numbers.length && numbers.every(number => /^(?:[0-9]{9}|INT-[A-Z0-9][A-Z0-9-]{3,31})$/.test(number))) {
      try { sessionStorage.setItem('independent-tracking-search', numbers.join('\n')); } catch {}
    }
    location.assign('/ltl/apps/Tracking');
    return;
  }
  if (!event.currentTarget.reportValidity()) return;
  const message = event.currentTarget.querySelector('.form-message') || document.createElement('div');
  message.className = 'form-message show';
  message.setAttribute('role','status');
  message.textContent = 'This preview does not send requests or return live results.';
  if (!message.parentNode) (event.currentTarget.classList.contains('track-form') ? event.currentTarget.parentElement : event.currentTarget).append(message);
}

document.addEventListener('click', event => {
  if (!event.target.closest('.nav-item')) closeDesktopMenus();
  if (!event.target.closest('.site-header')) { closeMobileMenu(); closeSearch(); }
  const appRoot = document.getElementById('app');
  if (appRoot && event.target.closest('[data-cookie-settings]')) {
    event.preventDefault();
    sessionStorage.removeItem('tff-cookie-dismissed');
    if (!document.querySelector('.cookie-notice')) appRoot.insertAdjacentHTML('beforeend', cookieNotice());
    bindCookieOnly();
    document.querySelector('.cookie-close')?.focus();
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const opener = document.querySelector('.site-header [aria-expanded="true"]');
  closeDesktopMenus();
  closeMobileMenu();
  closeSearch();
  opener?.focus();
});

const portalHeader = document.getElementById('portal-site-header');
if (portalHeader) {
  portalHeader.innerHTML = header();
  bindHeaderControls();
} else {
  window.addEventListener('popstate', () => render());
  render();
}
