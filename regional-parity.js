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

const regionalVisualSources = {
  Canada: {
    officialMap: 'canada-map-WEB.JPG',
    officialMapLabel: 'Official TForce Freight Canada coverage map',
    hero: {
      file: 'regional-canada-hero.jpg', width: 1800, height: 1200,
      alt: 'The Ambassador Bridge spanning the Detroit River between Windsor, Ontario, and Detroit, Michigan',
      credit: 'U.S. Environmental Protection Agency',
      source: 'https://commons.wikimedia.org/wiki/File:Ambassador_Bridge.jpg',
      license: 'U.S. public domain',
    },
    map: {
      file: 'regional-canada-map.svg', width: 700, height: 410,
      alt: 'Map of Canada showing provincial and territorial boundaries and selected cities',
      caption: 'Selected cities and regional boundaries · Made with Natural Earth',
    },
  },
  PuertoRicoUSVirginIslands: {
    officialMap: 'PR-Web.jpg',
    officialMapLabel: 'Official TForce Freight Puerto Rico and U.S. Virgin Islands service map',
    hero: {
      file: 'regional-san-juan-hero.jpg', width: 1280, height: 378,
      alt: 'San Felipe del Morro overlooking San Juan Bay, Puerto Rico',
      credit: 'Mariordo (Mario Roberto Durán Ortiz)',
      source: 'https://commons.wikimedia.org/wiki/File:Panorama_Fortaleza_San_Felipe_del_Morro_SJU_06_2019_7295.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    map: {
      file: 'regional-caribbean-map.svg', width: 530, height: 450,
      alt: 'Illustrative diagram from Jacksonville to San Juan and onward to the U.S. Virgin Islands',
      caption: 'Illustrative route diagram · Made with Natural Earth',
    },
  },
};

function regionalVisualHero(key) {
  const hero = regionalVisualSources[key].hero;
  if (!hero) return '';
  const credit = informationLink(hero.credit, hero.source, true);
  const license = hero.licenseUrl ? ` · ${informationLink(hero.license, hero.licenseUrl, true)}` : ` · ${informationEscape(hero.license)}`;
  return `<figure class="regional-visual-hero">
    <img src="/assets/${hero.file}" alt="${informationEscape(hero.alt)}" width="${hero.width}" height="${hero.height}">
    <figcaption>${credit}${license} · cropped</figcaption>
  </figure>`;
}

function regionalVisualMap(key) {
  const { map, officialMap, officialMapLabel } = regionalVisualSources[key];
  if (!map) return regionalCoverageMap(officialMap, officialMapLabel);
  return `<figure class="regional-visual-map">
    <img src="/assets/${map.file}" alt="${informationEscape(map.alt)}" width="${map.width}" height="${map.height}">
    <figcaption>${informationEscape(map.caption)} · ${informationLink(officialMapLabel, `${informationOrigin}/ltl/img/${officialMap}`, true)}</figcaption>
  </figure>`;
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
    'LTL service across all Canadian provinces',
    'Customs-bonded facilities throughout the Canadian network',
    'PARS shipment references for brokers arranging clearance before the freight reaches the border',
    'Carrier participation in C-TPAT, PIP, CSA and FAST programs',
    `Online ${informationLink('shipment tracking', 'Tracking')} from pickup through delivery`,
    'Electronic access to customs documents through the carrier’s document imaging system',
    'Freight charges consolidated on one invoice'
  ]);
  const rating = regionalList([
    'Use the carrier’s UPGF 525 reference for NMFC class rates or UPGF 580 for density rates on freight between the United States and Canada.',
    'Check UPGF 570 for the carrier’s NMFC rates on freight moving between Canada and Mexico.',
    `Canada rating tools are available through ${informationLink('TForce Freight Rating Software', 'TForceFreightRatingSoftware')}.`,
    'The carrier lists a border processing fee for Canada freight. Ask whether bonded storage charges apply if the shipment is held inland while awaiting customs release.',
    'Request a quote in U.S. dollars or Canadian dollars, and confirm which currency the quote uses.'
  ]);
  const documentLabels = [
    ['USMCA/CUSMA/T-MEC Certification of Origin', '639Kb'],
    ['Certificate of Origin Instructions', '84Kb'],
    ['Canada Customs Invoice Form CI1', '19Kb'],
    ['Export Express Instructions & Forms', '1013Kb']
  ];
  const documentRows = page.documents.map(([, file], index) => {
    const [label, size] = documentLabels[index];
    const viewPath = file.startsWith('/') ? file : `/downloads/${file}`;
    const viewUrl = `${informationOrigin}${viewPath}`;
    const downloadPath = viewPath.replace(/^\/ltl\/forms\//, '/forms/');
    const downloadUrl = `${informationOrigin}/ltl/PublicPages/DownloadFile?path=${encodeURIComponent(downloadPath)}`;
    const download = index === 2
      ? `<span class="canada-download-languages">Download: ${informationLink('English', downloadUrl, false, `Download ${label} from the carrier`)} / ${informationLink('French', 'https://www.cbsa-asfc.gc.ca/publications/forms-formulaires/ci1-fra.html', true, 'Canada Customs Invoice in French from CBSA')}</span>`
      : informationLink('Download', downloadUrl, false, `Download ${label}`);
    return `<li>
      <span class="canada-pdf-icon" aria-hidden="true">PDF</span>
      <div><strong>${informationEscape(label)}</strong><div>Adobe PDF format ${size}</div>
        <div class="regional-document-actions">
          ${informationLink('View', viewUrl, true, `View ${label}`)}
          ${download}
          ${informationLink('Print', viewUrl, true, `Open ${label} in the PDF viewer for printing`)}
        </div>
      </div>
    </li>`;
  });
  const forms = `<ul class="regional-document-list canada-document-list">${documentRows.join('')}</ul>`;
  return `<aside class="regional-notice">
    <p><img src="/assets/icon-alert-lightgrey.svg" width="20" height="20" alt=""> TForce Freight’s January 2022 bulletin addressed driver vaccination at the Canada border.</p>
    <p>Before scheduling a cross-border shipment, ${regionalReferenceLink('Canada', 'review the carrier’s latest Canada service information')} and confirm the documents and clearance steps for your route.</p>
  </aside>
  ${regionalVisualHero('Canada')}
  <article class="regional-service regional-canada">
    <p>TForce Freight serves major markets and extended-service locations in Canada. Use the ${informationLink('service point inquiry', 'ServicePointInquiry')} to check service for an origin or destination before arranging a cross-border shipment.</p>
    ${regionalSection('Features', features)}
    ${regionalVisualMap('Canada')}
    ${regionalSection('Rating', rating)}
    <nav class="regional-anchor-links" aria-label="Customs clearance topics"><a href="#northbound">Learn more about ${informationEscape(northbound)}</a><a href="#southbound">Learn more about ${informationEscape(southbound)}</a></nav>
    ${regionalTable('Gateway service centers', ['Destination', 'Gateway Service Center', 'Origin U.S. Markets', 'Border Crossing'], canadaGatewayRows)}
    ${regionalSection(northbound, `<p>Start with a ${informationLink('commercial invoice', `${informationOrigin}/ltl/forms/docs/ci1bp.pdf`, true)} that identifies the goods, declared value and currency. Ask a broker whether you should provide a ${informationLink('certificate of origin', `${informationOrigin}/downloads/certificate_of_origin_data_entry.pdf`, true)}. The carrier also publishes an ${informationLink('Export Express form', `${informationOrigin}/ltl/forms/docs/OTC-394-Export-Express.pdf`, true)} for Canadian shipments.</p>
      <p>Choose a customs broker before tendering the shipment. Confirm who will submit the entry, which documents the broker needs, and who will handle brokerage fees, duties or taxes. The importer of record can ask the broker for the customs entry record.</p>
      <p>U.S. sellers shipping to customers without a Canadian broker can ask a broker whether a non-resident importer arrangement suits their sales and delivery terms. The ${regionalReferenceLink('Canada', 'carrier’s Canada service page')} describes that option and the network’s shipping procedures.</p>
      <p><strong>Border Crossing</strong><br>Provide the PARS reference to your broker before the freight reaches the crossing. A shipment awaiting release may be kept at a bonded facility.</p>
      <p><strong>Delivery in Canada</strong><br>The carrier schedules final delivery after the shipment clears customs.</p>
      <p><strong>PARS/INPARS Capability</strong><br>TForce Freight lists 2205 as its PARS carrier code. It combines that code with the shipment’s nine-digit PRO number. Give the resulting reference to your broker, and confirm whether the shipment will clear at the border or at an inland sufferance warehouse.</p>`, 'northbound')}
    ${regionalSection(southbound, `<p>Canadian freight can move to TForce Freight service points in the U.S., Puerto Rico and Mexico.</p>
      <p><strong>Border Service / Customs Clearance</strong><br>Confirm with the U.S. customs broker which documents, shipment reference and point of clearance apply. The carrier describes PAPS for border processing and in-bond transport for cargo continuing to a designated inland clearance point. Confirm current entry requirements before tendering freight.</p>
      <p><strong>U.S. Delivery</strong><br>The carrier schedules final delivery after U.S. customs release.</p>`, 'southbound')}
    ${regionalSection('Forms', `<p>Use the <strong>Canada Customs Invoice</strong> and the <strong>USMCA/CUSMA/T-MEC Certification of Origin</strong> as applicable. Ask your broker which forms and supporting paperwork are needed for the shipment.</p>${forms}`)}
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

function regionalIslandSailings(caption, portHeading, sailings) {
  const port = `<th scope="rowgroup" rowspan="${sailings.length}">Jacksonville, FL</th>`;
  const rows = sailings.map(([sailing, departure, arrival], index) => `<tr>
    ${index === 0 ? port : ''}<td>${sailing}</td><td>${departure}</td><td>${arrival}</td>
  </tr>`).join('');
  return `<table class="regional-table regional-sailing-table">
    <caption>${caption}</caption>
    <thead><tr><th scope="col">${portHeading}</th><th scope="col">Sailing</th><th scope="col">Departure Day</th><th scope="col">Arrival Day</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderPuertoRicoService() {
  const key = 'PuertoRicoUSVirginIslands';
  const directory = `${informationOrigin}${informationBase}ServiceCenterDirectory`;
  const jurisdiction = informationLink('Puerto Rico Department of the Treasury', 'https://hacienda.pr.gov/documentos/declaracion-de-importacion-declaration-imports');
  const aes = informationLink('Automated Export System (AES)', regionalCensus, true);
  const aesSetup = informationLink('AESDirect registration and filing instructions', 'https://www.trade.gov/filing-your-export-shipments-through-automated-export-system-aes');
  const regulations = 'https://www.ecfr.gov/current/title-15/subtitle-B/chapter-I/part-30';
  const filingRules = informationLink('federal filing rules', `${regulations}/subpart-A/section-30.2`);
  const partyResponsibilities = informationLink('filer and carrier responsibilities', `${regulations}/subpart-A/section-30.3`);
  const exemptions = informationLink('applicable exemption', `${regulations}/subpart-D/section-30.37`);
  const toSanJuan = regionalIslandSailings('To San Juan', 'From', [
    ['1st sailing', 'Tuesday', 'Friday'],
    ['2nd sailing', 'Friday', 'Monday']
  ]);
  const fromSanJuan = regionalIslandSailings('From San Juan', 'To', [
    ['Single sailing', 'Friday', 'Monday']
  ]);
  return `${regionalVisualHero(key)}
  <article class="regional-service regional-puerto-rico">
    ${regionalSection('Service', regionalList([
      'Freight coverage throughout Puerto Rico and the U.S. Virgin Islands',
      'Online tracking from pickup to destination',
      'Freight charges consolidated on one invoice',
      'Bilingual support',
      'Cross-docking and full-container transport options for shipments that need a custom arrangement'
    ]))}
    ${regionalVisualMap(key)}
    ${regionalSection('Shipping Details', `<h3>Service to Puerto Rico and the U.S. Virgin Islands</h3>
      <p>Regular ocean service connects the U.S. mainland with Puerto Rico and the U.S. Virgin Islands. Southbound loads can start at TForce Freight service points in the United States, Canada, or Mexico. For northbound service, freight can originate at a Puerto Rico service point.</p>
      <h3>Ocean Service</h3>
      <p>Ocean shipments are consolidated in ${informationLink('Jacksonville, FL', directory)} and move through its port. Check the ${regionalReferenceLink(key, 'carrier’s sailing schedule')} before booking. The published departures and arrivals for San Juan are listed below.</p>
      <div class="islands-schedule">${toSanJuan}${fromSanJuan}</div>
      <h3>Island Delivery</h3>
      <p>The ${informationLink('San Juan agency service center', directory)} serves delivery points throughout Puerto Rico. Consignees may also collect their freight at the service center. Loads continuing to the U.S. Virgin Islands transfer in San Juan for onward transport.</p>
      <h3>Documentation</h3>
      <p>Prepare a standard bill of lading (BOL) and a commercial invoice for Puerto Rico shipments. The lane, commodity and value determine whether Electronic Export Information (EEI) must also be filed. The filing options below apply to qualifying freight for Puerto Rico and the U.S. Virgin Islands.</p>
      <p>Inbound goods for Puerto Rico must be declared to the ${jurisdiction} before release. The declaration and invoice establish the value of the goods for applicable taxes. Consignees can use the department’s electronic import declaration to complete that step. Freight waits for release before final delivery. Provide the carrier with the following details to help the consignee complete clearance.</p>
      ${regionalList([
        'Commercial invoice listing the goods and their declared value',
        'Consignee’s name and delivery address, plus a phone number if available for arrival and tax clearance notifications',
        'Tax bond number or exemption identification, if applicable'
      ])}`)}
    ${regionalSection('Rating', `<p>Six components can contribute to a Puerto Rico freight rate.</p>
      ${regionalList([
        'Mainland transportation is the first leg. To calculate the freight charge for that leg, use the shipment’s origin ZIP code and the applicable mainland gateway ZIP code with your negotiated pricing program.',
        'For the ocean leg to the San Juan service center, the carrier compares the cubic-foot rate with the rate per hundred pounds and applies the higher charge.',
        `Puerto Rico final delivery can also be priced by volume or by hundredweight. The ${regionalOffshoreTariff()} covers both the ocean leg and island delivery. Freight to the U.S. Virgin Islands carries an additional charge for the ocean leg out of San Juan. Arrange local delivery in the U.S. Virgin Islands separately as a special service.`,
        `EEI preparation and processing can add a separate charge. Filing through ${aes} yourself or documenting a valid exemption can change how the carrier assesses that fee. See the filing options below and check the applicable tariff before shipping.`,
        'A documentation charge covers ocean and Puerto Rico Treasury paperwork and clearance. Shipments to the U.S. Virgin Islands have their own documentation charge.',
        'The port fee covers expenses such as security, container screening and use of a chassis.'
      ])}
      <h3>Calculating Cubic Feet</h3>
      <p>The carrier measures freight when it reaches the gateway. Multiply its length, width and height in inches, then divide by 1,728 to convert cubic inches to cubic feet. This volume is used when calculating dimensional charges for Puerto Rico and U.S. Virgin Islands lanes.</p>
      <p><strong>Check the ${regionalOffshoreTariff()} for current offshore rates and charges. International Customer Service at ${regionalContact()} can explain which rules apply and provide a copy of the tariff on request.</strong></p>`)}
    ${regionalSection('Puerto Rico/U.S. Virgin Islands Electronic Export Information (EEI)', `<p>The U.S. Census Bureau’s Foreign Trade Regulations cover shipments between the U.S. mainland and Puerto Rico, and shipments from the mainland or Puerto Rico to the U.S. Virgin Islands. Evaluate the filing requirement for each shipment. The commonly used low-value exemption generally applies when the value per Schedule B or HTSUSA classification is $2,500 or less and no mandatory filing rule applies. Review the ${filingRules} for the shipment’s route, destination and goods.</p>
      <p>The U.S. Principal Party in Interest (USPPI), or its authorized agent, prepares the filing. The filing identifies the USPPI, commonly by its Employer Identification Number (EIN). The carrier needs the applicable filing or exemption citation before it can move the shipment, and it records the citation on its outbound manifest where required. See the federal ${partyResponsibilities} for which information each party provides.</p>
      <p>The Census Bureau offers the ${aes} for electronic filing. Shippers can use the online AESDirect service in the Automated Commercial Environment (ACE) portal. New filers can follow the ${aesSetup} to set up portal access.</p>
      <p>Use one of the following options when preparing the first page of the bill of lading. Keep the supporting documents with the shipment records.</p>
      ${regionalList([
        `File the EEI as the shipper.<br>Submit the information through AES and retain the Internal Transaction Number (ITN) after the system accepts the filing. Put the declared value and the filing citation on the bill of lading so the carrier can record the proof of filing. TForce Freight lists reduced processing charges when the shipper files and records the filing properly. Check the current tariff for the charge that applies.`,
        `Claim an exemption when the shipment qualifies.<br>Confirm that the commodity and destination meet the ${exemptions}. Combine the value of items under the same classification when evaluating the low-value threshold, subject to the reporting rules for domestic and foreign goods. Goods that require an export license may still require a filing regardless of value. Record the declared value and the applicable exemption citation on the bill of lading. Use “NOEEI” with the provision that applies, such as 30.37(a) for eligible low-value shipments. TForce Freight lists an EEI fee exemption for properly documented claims.`,
        `Authorize TForce Freight to file on your behalf.<br>Provide written authorization and the information needed for filing before tendering the shipment. Keep a copy of the authorization and freight records. Put the declared value and the instruction for the carrier to file on the bill of lading. The carrier lists a preparation and processing charge for this service. For filing help, call the Puerto Rico operations center at <strong>${informationLink('(800)526-5926', 'tel:+18005265926')}</strong>.`
      ], 'ol')}`)}
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
