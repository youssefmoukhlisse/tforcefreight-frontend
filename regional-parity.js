const regionalRoutes = {
  Canada: renderCanadaService,
  Mexico: renderMexicoService,
  PuertoRicoUSVirginIslands: renderPuertoRicoService,
  HawaiiGuam: renderHawaiiGuamService,
  Alaska: renderAlaskaService
};

const canadaGatewayRows = [
  ['Calgary, AB', 'Salt Lake City, UT', 'Western U.S.', 'Coutts, AB'],
  ['Calgary, AB', 'South Holland, IL', 'Eastern U.S.', 'Emerson, MB'],
  ['Dartmouth, NS', 'Portland, ME', 'Entire U.S.', 'St. Stephen, NB'],
  ['Edmonton, AB', 'Salt Lake City, UT', 'Western U.S.', 'Coutts, AB'],
  ['Edmonton, AB', 'South Holland, IL', 'Eastern U.S.', 'Emerson, MB'],
  ['Montreal, PQ', 'Harrisburg, PA', 'U.S. (excluding New England and New York)', 'LaColle, PQ'],
  ['Montreal, PQ', 'Newburgh, N.Y.', 'New England and New York', 'LaColle, PQ'],
  ['Ottawa, ON', 'Harrisburg, PA', 'U.S. (excluding New England and New York)', 'LaColle, PQ'],
  ['Ottawa, ON', 'Newburgh, N.Y.', 'New England and New York', 'LaColle, PQ'],
  ['Quebec City, PQ', 'Harrisburg, PA', 'U.S. (excluding New England and New York)', 'LaColle, PQ'],
  ['Quebec City, PQ', 'Newburgh, N.Y.', 'New England and New York', 'LaColle, PQ'],
  ['Regina, SK', 'South Holland, IL', 'Entire U.S.', 'Emerson, MB'],
  ['Thunder Bay, ON', 'Detroit, MI', 'Midwest U.S.', 'Sarnia, ON'],
  ['Thunder Bay, ON', 'Harrisburg, PA', 'Eastern U.S.', 'Queenston, ON'],
  ['Thunder Bay, ON', 'South Holland, IL', 'Western U.S.', 'Sarnia, ON'],
  ['Toronto, ON', 'Detroit, MI', 'Midwest U.S.', 'Sarnia, ON'],
  ['Toronto, ON', 'Harrisburg, PA', 'Eastern U.S.', 'Queenston, ON'],
  ['Toronto, ON', 'South Holland, IL', 'Western U.S.', 'Sarnia, ON'],
  ['Vancouver, BC', 'Seattle, WA', 'Entire U.S.', 'White Rock, BC'],
  ['Victoria, BC', 'Seattle, WA', 'Entire U.S.', 'White Rock, BC'],
  ['Whitehorse, YT', 'Seattle, WA', 'Entire U.S.', 'White Rock, BC'],
  ['Windsor, ON', 'Detroit, MI', 'Entire U.S.', 'Windsor, ON'],
  ['Winnipeg, MB', 'South Holland, IL', 'Entire U.S.', 'Emerson, MB'],
  ['Yellowknife, NT', 'Seattle, WA', 'Entire U.S.', 'White Rock, BC']
];

const regionalCensus = 'https://www.census.gov/foreign-trade/aes/index.html';

function regionalReferenceLink(key, label) {
  return informationLink(label, `${informationOrigin}${informationBase}${key}`);
}

function regionalCoverageMap(file, label) {
  return `<p class="regional-map-link">${informationLink(label, `${informationOrigin}/ltl/img/${file}`, true)}</p>`;
}

function regionalContact() {
  return informationLink('(800)333-7400', 'tel:+18003337400');
}

function regionalOffshoreTariff() {
  return informationLink('UPGF 105 tariff', `${informationOrigin}/downloads/${informationOffshoreRules[1]}`, true);
}

function regionalList(items, type = 'ul') {
  return `<${type}>${items.map(item => `<li>${item}</li>`).join('')}</${type}>`;
}

function regionalSection(title, content, id = '') {
  const idAttribute = id ? ` id="${informationEscape(id)}"` : '';
  return `<section${idAttribute}><h2>${informationEscape(title)}</h2>${content}</section>`;
}

function regionalTable(caption, headers, rows, showCaption = false) {
  const className = showCaption ? 'regional-table regional-sailing-table' : 'regional-table regional-gateway-table';
  const headingCells = headers.map(header => `<th scope="col">${informationEscape(header)}</th>`).join('');
  const bodyRows = rows.map(row => `<tr>${row.map(cell => `<td>${informationEscape(cell)}</td>`).join('')}</tr>`).join('');
  return `<div class="regional-table-scroll" role="region" aria-label="${informationEscape(caption)}" tabindex="0">
    <table class="${className}"><caption${showCaption ? '' : ' class="sr-only"'}>${informationEscape(caption)}</caption>
    <thead><tr>${headingCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function regionalDocuments(documents, labels) {
  const rows = documents.map(([, file], index) => {
    const [label, format] = labels[index];
    const viewPath = file.startsWith('/') ? file : `/downloads/${file}`;
    const downloadPath = viewPath.replace(/^\/ltl\/forms\//, '/forms/');
    return `<li>
      <strong>${informationEscape(label)}</strong><span>${informationEscape(format)}</span>
      <div class="regional-document-actions">
        ${informationLink('View', `${informationOrigin}${viewPath}`, true, `View ${label}`)}
        ${informationLink('Download', `${informationOrigin}/ltl/PublicPages/DownloadFile?path=${encodeURIComponent(downloadPath)}`, false, `Download ${label}`)}
      </div>
    </li>`;
  });
  return `<ul class="regional-document-list">${rows.join('')}</ul>`;
}

function renderCanadaService(page) {
  const northbound = page.headings[2];
  const southbound = page.headings[3];
  const features = regionalList([
    'Service across Canadian provinces', 'Customs-bonded facilities', 'PARS clearance at border crossings',
    'C-TPAT, PIP, CSA and FAST carrier programs', 'Online shipment tracking', 'Access to customs documents', 'Freight charges consolidated on an invoice'
  ]);
  const rating = regionalList([
    'U.S.–Canada rating references include UPGF 525 (NMFC) and UPGF 580 (density).',
    'UPGF 570 is the NMFC rating reference for service between Mexico and Canada.',
    `Canada rating tools are available through ${informationLink('TForce Freight Rating Software', 'TForceFreightRatingSoftware')}.`,
    'Border processing and bonded storage can affect charges.',
    'Request Canadian quotes in U.S. or Canadian currency.'
  ]);
  const forms = regionalDocuments(page.documents, [
    ['USMCA/CUSMA/T-MEC Certification of Origin', 'Adobe PDF format'],
    ['Certificate of Origin Instructions', 'Adobe PDF format'],
    ['Canada Customs Invoice Form CI1', 'Adobe PDF format'],
    ['Export Express Instructions & Forms', 'Adobe PDF format']
  ]);
  return `<aside class="regional-notice">
    <img src="/assets/icon-alert-lightgrey.svg" width="20" height="20" alt="">
    <div>Canada cross-border shipping<br>${regionalReferenceLink('Canada', 'Check the carrier’s current border service and documentation guidance.')}</div>
  </aside>
  <article class="regional-service">
    <p>Review TForce Freight service points, border gateways and shipping documents for freight moving between the United States and Canada.</p>
    ${regionalSection('Features', features)}
    ${regionalCoverageMap('canada-map-WEB.JPG', 'View the TForce Freight Canada coverage map')}
    ${regionalSection('Rating', rating)}
    <nav class="regional-anchor-links" aria-label="Customs clearance topics"><a href="#northbound">${informationEscape(northbound)}</a><a href="#southbound">${informationEscape(southbound)}</a></nav>
    ${regionalTable('Gateway service centers', ['Destination', 'Gateway Service Center', 'Origin U.S. Markets', 'Border Crossing'], canadaGatewayRows)}
    ${regionalSection(northbound, `<p>The carrier provides a commercial invoice, certificate of origin resources, and Export Express forms. Confirm required paperwork and customs brokerage arrangements before shipping.</p>
      <h3>Border Crossing</h3><p>A broker can arrange PARS clearance at the border. The carrier may hold shipments that have not cleared customs at a bonded facility.</p>
      <h3>Delivery in Canada</h3><p>Final delivery follows customs clearance.</p>
      <h3>PARS/INPARS Capability</h3><p>Confirm the PARS identifier with your customs broker and the carrier.</p>`, 'northbound')}
    ${regionalSection(southbound, `<p>Canadian freight can move to TForce Freight service points in the U.S., Puerto Rico and Mexico.</p>
      <h3>Border Service / Customs Clearance</h3><p>Confirm U.S. broker and PAPS requirements before tendering freight.</p>
      <h3>U.S. Delivery</h3><p>Final delivery follows customs clearance.</p>`, 'southbound')}
    ${regionalSection('Forms', `<p>Confirm the applicable customs documentation with your broker.</p>${forms}`)}
    <p>${regionalReferenceLink('Canada', 'Read the official Canada service page')}</p>
  </article>`;
}

function renderMexicoService(page) {
  const forms = regionalDocuments(page.documents, [
    ['USMCA/CUSMA/T-MEC Certification of Origin', 'Adobe PDF format 639Kb'],
    ['Certificate of Origin Instructions', 'Adobe PDF format 84Kb'],
    ['TForce Freight Mexico Bill of Lading Form', 'Adobe PDF format 691Kb'],
    ['Commercial Invoice', 'Adobe PDF format 66Kb'],
    ['Packing List', 'Adobe PDF format 121Kb']
  ]);
  return `<article class="regional-service regional-mexico">
    ${regionalSection('More Options to Mexico', `<p>Review service and brokerage options for LTL freight moving across the U.S.–Mexico border.</p>
      <p><strong>TForce Freight Standard LTL:</strong> Door-to-door ground transportation on both sides of the border, with customs brokerage arranged for the shipment.</p>
      <p><strong>Door-to-Border Transportation:</strong> Coordinate freight to or from a TForce Freight gateway for transfer to a border carrier.</p>
      <p><strong>Non-Contiguous U.S. and Canada:</strong> Check the carrier’s coverage for freight moving between Mexico, Canada, and U.S. offshore points.</p>`)}
    ${regionalCoverageMap('Mexico-Web.jpg', 'View the TForce Freight Mexico facility and border crossing map')}
    <h3>All TForce Freight services to Mexico offer:</h3>
    ${regionalList(['Bilingual customer support', 'Shipment tracking'])}
    <h3>TForce Freight Standard LTL services add:</h3>
    ${regionalList(['Quotes for door-to-door transportation', 'Visibility from pickup through final delivery'])}
    ${regionalSection('Forms', `<p>Ask your broker which commercial invoice and origin certification are required. Download the carrier’s published forms below.</p>${forms}
      <p>${regionalReferenceLink('Mexico', 'View the official Mexico rating software entry')}</p>`)}
    ${regionalSection('Links', informationList(page.links))}
    <p>U.S. and Canadian callers can contact ${regionalContact()}. In Mexico, dial 00 + 1 + ${informationLink('(804)231-8555', 'tel:+18042318555')}.</p>
    <p>${regionalReferenceLink('Mexico', 'Read the official Mexico service page')}</p>
  </article>`;
}

function renderPuertoRicoService() {
  const toSanJuan = regionalTable('To San Juan', ['From', 'Sailing', 'Departure Day', 'Arrival Day'], [
    ['Jacksonville, FL', '1st sailing', 'Tuesday', 'Friday'],
    ['Jacksonville, FL', '2nd sailing', 'Friday', 'Monday']
  ], true);
  const fromSanJuan = regionalTable('From San Juan', ['To', 'Sailing', 'Departure Day', 'Arrival Day'], [
    ['Jacksonville, FL', 'Single sailing', 'Friday', 'Monday']
  ], true);
  return `<article class="regional-service regional-puerto-rico">
    ${regionalSection('Service', regionalList(['Puerto Rico and U.S. Virgin Islands coverage', 'Online shipment tracking', 'Consolidated billing', 'Bilingual staff', 'Cross-docking and container options']))}
    ${regionalCoverageMap('PR-Web.jpg', 'View the TForce Freight Puerto Rico and U.S. Virgin Islands service map')}
    ${regionalSection('Shipping Details', `<h3>Service to Puerto Rico and the U.S. Virgin Islands</h3>
      <p>Southbound freight can originate at carrier service points in the U.S., Canada and Mexico. Northbound freight can originate at carrier service points in Puerto Rico.</p>
      <h3>Ocean Service</h3><p>Jacksonville, FL is the gateway for ocean freight moving to and from San Juan.</p>
      ${toSanJuan}${fromSanJuan}
      <p>${regionalReferenceLink('PuertoRicoUSVirginIslands', 'Confirm sailing dates on the official service page')}</p>
      <h3>Island Delivery</h3><p>The San Juan service center handles Puerto Rico deliveries and freight transferring to the U.S. Virgin Islands. Confirm pickup options with the carrier.</p>
      <h3>Documentation</h3><p>Confirm the applicable bill of lading, commercial invoice and Electronic Export Information before shipment.</p>
      ${regionalList(['Commercial invoice with shipment description and declared value', 'Consignee name, address and contact details', 'Tax bond or exemption identification, where available'])}`)}
    ${regionalSection('Rating', `<p>Ask the carrier which charge components apply to your destination.</p>
      ${regionalList(['Mainland freight to the gateway', 'Ocean freight to San Juan', 'Island delivery, where available', 'Electronic Export Information preparation', 'Clearance and documentation', 'Port charges'])}
      <h3>Calculating Cubic Feet</h3><p>Multiply length, width and height in inches, then divide by 1,728.</p>
      <p>See the ${regionalOffshoreTariff()} or contact International Customer Service at ${regionalContact()}.</p>`)}
    ${regionalSection('Puerto Rico/U.S. Virgin Islands Electronic Export Information (EEI)', `<p>Review filing and exemption requirements through the U.S. Census Bureau’s ${informationLink('Automated Export System', regionalCensus)}.</p>
      ${regionalList(['Shipper files the EEI electronically.', 'Shipper confirms that the shipment qualifies for an exemption.', 'Shipper authorizes the carrier to file the EEI.'], 'ol')}
      <p>Puerto Rico operations support: ${informationLink('(800)526-5926', 'tel:+18005265926')}.</p>`)}
    <p>${regionalReferenceLink('PuertoRicoUSVirginIslands', 'Read the official Puerto Rico and U.S. Virgin Islands service page')}</p>
  </article>`;
}

function renderHawaiiGuamService() {
  return `<article class="regional-service">
    ${regionalCoverageMap('HA-Guam_WEB3.png', 'View the TForce Freight Hawaii and Guam service map')}
    ${regionalSection('Service', regionalList(['Freight service to the Hawaiian Islands and Guam', 'Coverage includes six Hawaiian islands, with limited service on Molokai and Lanai']))}
    ${regionalSection('Shipping Details', `<h3>Ocean Services to Hawaii</h3><p>The published schedule lists two sailings a week from Long Beach. Confirm the departure date before booking.</p>
      <h3>Island Delivery</h3><p>The carrier publishes an estimated five days from sailing to Honolulu, with additional time for neighboring islands.</p>
      <p>The carrier estimates approximately 12 days from sailing in Hawaii to Guam.</p>
      <h3>Shipping Documentation</h3><p>For shipments to Hawaii:</p>${regionalList(['Standard bill of lading'])}
      <p>For shipments to Guam:</p>${regionalList(['Standard bill of lading', 'Two copies of the commercial invoice with shipment value and Schedule B number'])}`)}
    ${regionalSection('Rates and Charges', `<p>Published rate components for Hawaii and Guam:</p>
      ${regionalList(['Mainland charges to the gateway service center', 'Ocean charges from the gateway to the island service center', 'Island delivery charges to the final destination'], 'ol')}
      <h3>Calculating Cubic Feet</h3><p>Multiply length, width and height in inches, then divide by 1,728. The carrier can confirm how shipment density affects your quote.</p>
      <p>See the ${regionalOffshoreTariff()} or contact International Customer Service at ${regionalContact()}.</p>`)}
    <p>${regionalReferenceLink('HawaiiGuam', 'Read the official Hawaii and Guam service page')}</p>
  </article>`;
}

function renderAlaskaService() {
  return `<article class="regional-service">
    ${regionalCoverageMap('Alaska-WEB.JPG', 'View the TForce Freight Alaska service map')}
    ${regionalSection('Service', regionalList(['Direct service covering more than 99% of Alaska’s population', 'Connections to carrier service points in the U.S., Canada, Mexico and Puerto Rico']))}
    ${regionalSection('Shipping Details', `<h3>Alaska Delivery</h3><p>Freight moves from the port to its destination by truck or ferry.</p>
      <h3>Documentation</h3><p>Shipments use a standard bill of lading. Confirm shipment-specific requirements with the carrier.</p>
      <h3>Simple Invoicing</h3><p>The carrier consolidates freight charges on one invoice.</p>`)}
    ${regionalSection('Rating Information', `<p>Alaska rates have two components:</p>
      ${regionalList(['Transportation between the origin or destination and the consolidation point in Kent, WA 98032.', 'Transportation between the consolidation point and the Alaska service point. Refer to UPGF 105, section 4.'])}
      <p>See the ${regionalOffshoreTariff()} or contact International Customer Service at ${regionalContact()}.</p>`)}
    <p>${regionalReferenceLink('Alaska', 'Read the official Alaska service page')}</p>
  </article>`;
}

function regionalParityBody(key, page) {
  const render = Object.hasOwn(regionalRoutes, key) ? regionalRoutes[key] : null;
  return render ? render(page) : null;
}
