const operationsOrigin = 'https://www.tforcefreight.com';
const operationsPath = '/ltl/apps/';
const operationsCountryList = ['United States', 'Canada', 'Mexico'];
const operationsServiceCrumb = 'Tools &amp; Forms &gt; <a data-route href="/ltl/apps/ServiceInformation">Service Information</a>';
const operationsClassList = [50, 55, 60, 65, 70, 77.5, 85, 92.5, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
const operationsRegions = {
  'United States': 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Guam|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Puerto Rico|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming',
  Canada: 'Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon',
  Mexico: 'Aguascalientes|Baja California|Baja California Sur|Campeche|Chiapas|Chihuahua|Ciudad de México|Coahuila|Colima|Durango|Guanajuato|Guerrero|Hidalgo|Jalisco|México|Michoacán|Morelos|Nayarit|Nuevo León|Oaxaca|Puebla|Querétaro|Quintana Roo|San Luis Potosí|Sinaloa|Sonora|Tabasco|Tamaulipas|Tlaxcala|Veracruz|Yucatán|Zacatecas'
};

function operationField(id, label, attributes = '') {
  return `<div class="operation-field"><label for="${id}">${label}</label>
    <input id="${id}" ${label.endsWith('*') ? 'required' : ''} ${attributes}></div>`;
}

function operationSelect(id, label, options, selected = '') {
  return `<div class="operation-field"><label for="${id}">${label}</label>
    <select id="${id}" ${label.endsWith('*') ? 'required' : ''}>${options.map(option => `<option${option === selected ? ' selected' : ''}${option === '--' || option === 'Select One' ? ' value=""' : ''}>${option}</option>`).join('')}</select></div>`;
}

function operationCountry(id, label, options = operationsCountryList) {
  return operationSelect(id, label, options, 'United States');
}

function operationDate(id, label, offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return operationField(id, label, `type="date" value="${value}"`);
}

function operationTabs(name, options, selected) {
  return `<div class="operation-tabs">${options.map(([value, label]) => `<label>
    <input type="radio" name="${name}" value="${value}" ${value === selected ? 'checked' : ''}>
    <span>${label}</span></label>`).join('')}</div>`;
}

function operationButtons(submit, reset, className = '') {
  return `<div class="operation-actions ${className}"><button class="operation-button" type="submit" disabled>${submit}</button>
    <button class="operation-button operation-button-outline" type="reset">${reset}</button></div>`;
}

function operationLoginBanner(text) {
  return `<div class="operation-login"><p><strong>Log In</strong> ${text}</p>
    <p><a href="${operationsOrigin}${operationsPath}Home" class="operation-button">Log In</a></p></div>`;
}

function operationStatus() {
  return '<p class="operation-status" role="status" hidden></p>';
}

function operationTracking() {
  return pageShell('Tracking', '', `<section class="operation operation-tracking">
    <h3>Track the status of your shipment by PRO or BOL number.</h3>
    <form data-operation-form action="#main-content">
      ${operationTabs('operation-tracking-mode', [['pro','PRO'], ['reference','Reference']], 'pro')}
      <div data-tracking-pane="pro" class="operation-tracking-pro">
        <label for="operation-pro">PRO Numbers *</label>
        <textarea id="operation-pro" required aria-describedby="operation-pro-hint"></textarea>
        <p id="operation-pro-hint">Enter up to 25 PRO Numbers. One per line.</p>
      </div>
      <div data-tracking-pane="reference" class="operation-tracking-reference" hidden>
        ${operationField('operation-reference', 'Shipment Reference (BOL or PO) *')}
        <div class="operation-tracking-dates">${operationDate('operation-from-date','Ship From Date *',-30)}${operationDate('operation-to-date','Ship To Date *')}</div>
        <div class="operation-tracking-dates">${operationCountry('operation-origin','Origin Country')}${operationField('operation-origin-zip','ZIP Code')}</div>
        <div class="operation-tracking-dates">${operationCountry('operation-destination','Destination Country')}${operationField('operation-destination-zip','ZIP Code')}</div>
      </div>
      ${operationStatus()}${operationButtons('Track', 'Reset', 'operation-tracking-actions')}
    </form>
    <section class="operation-tracking-api"><h3>Customize Your Tracking With APIs</h3>
      <p>Give your customers access to package tracking information through your website.</p>
      <p><a href="https://developer.tforcefreight.com/">Learn more about Tracking API</a></p>
    </section>
  </section>`);
}

function operationTransit() {
  const transitCountries = ['Canada', 'Mexico', 'United States'];
  return pageShell('Transit Times', 'Shipping', `<section class="operation operation-transit">
    <h4>Submit a Request</h4>
    <form data-operation-form action="#main-content">
      <div class="operation-transit-grid">
        ${operationCountry('operation-transit-origin', 'Origin Country Code', transitCountries)}
        ${operationField('operation-transit-origin-zip','Origin ZIP Code','required data-operation-postal')}
        ${operationCountry('operation-transit-destination', 'Destination Country Code', transitCountries)}
        ${operationField('operation-transit-destination-zip','Destination ZIP Code','required data-operation-postal')}
      </div>
      ${operationStatus()}${operationButtons('Submit','Clear')}
    </form></section>`);
}

function operationPickup() {
  return pageShell('Pickup Request', 'Shipping', `<section class="operation operation-pickup">
    ${operationLoginBanner('to utilize your address information and access enhanced functionality.')}
    <div class="operation-pickup-copy">
      <p>Registered MyLTL users can complete a pick-up request online by logging in to MyLTL.</p>
      <p>If you are new to TForce Freight, please sign-up for a MyLTL account to start taking advantage of what TForce Freight has to offer!</p>
      <p>Should you require immediate assistance with LTL pickups or weekend/holiday delivery,</p>
      <p>please contact TForce Freight Customer Service at <strong>(800)333-7400</strong> option 1.</p>
    </div></section>`);
}

function operationAccordion(title, body, open) {
  return `<details class="operation-accordion"${open ? ' open' : ''}>
    <summary>${title}</summary><div class="operation-accordion-body">${body}</div></details>`;
}

function operationRateRow(index, mode) {
  const isDimension = mode === 'dimensions';
  return `<fieldset class="operation-commodity-row"><legend class="sr-only">Commodity ${index}</legend>
    <strong class="operation-commodity-number">${index}</strong>
    ${isDimension ? operationField(`operation-rate-length-${index}`,'Length (in) *','type="number" min="0.01" step="any"') : operationSelect(`operation-rate-class-${index}`,'Class *',['--', ...operationsClassList])}
    ${isDimension ? operationField(`operation-rate-width-${index}`,'Width (in) *','type="number" min="0.01" step="any"') : ''}
    ${isDimension ? operationField(`operation-rate-height-${index}`,'Height (in) *','type="number" min="0.01" step="any"') : ''}
    ${operationField(`operation-rate-weight-${index}`,'Weight (lbs) *','type="number" min="0.01" step="any"')}
    ${operationField(`operation-rate-nmfc-${index}`,'NMFC-Sub No.')}
    <button type="button" class="operation-row-reset" data-operation-row-reset>Reset</button></fieldset>`;
}

function operationRate() {
  return pageShell('Rate Estimate', 'Shipping', `<section class="operation operation-rate">
    ${operationLoginBanner('to receive your negotiated rates (if applicable) and access enhanced functionality.')}
    <form data-operation-form data-rate-form action="#main-content">
      ${operationAccordion('Shipment Information', `<div class="operation-rate-grid">
        ${operationCountry('operation-rate-from','Ship From *')}${operationField('operation-rate-origin-zip','ZIP Code *','data-operation-postal')}
        ${operationCountry('operation-rate-to','Ship To *')}${operationField('operation-rate-destination-zip','ZIP Code *','data-operation-postal')}
      </div><div class="operation-rate-grid">
        <div class="operation-field"><label for="operation-hazmat">Shipment contains hazardous materials</label>
          <label class="operation-switch"><input type="checkbox" id="operation-hazmat"><span data-operation-switch>No</span></label></div>
        ${operationDate('operation-rate-date','Shipping Date *',1)}
      </div><div class="operation-rate-grid operation-rate-discount">
        ${operationField('operation-discount','Discount','type="number" min="0" max="100" value="0"')}${operationField('operation-minimum','Floor Minimum','type="number" min="0" value="0"')}
      </div><p class="operation-rate-note operation-rate-discount-note">Discount will be applied to the current TForce Freight rate tariff. Discount and Floor Minimum fields should remain blank unless contractual terms and tariffs are known.<span class="operation-rate-mobile-guidance"> Customers with current TForce Freight pricing can <a href="${operationsOrigin}${operationsPath}Home">log in</a> to request an estimate using their agreement. TForce Freight validates the values entered.</span></p>
      <label class="operation-check"><input type="checkbox">Request Quote Number</label>
      <p class="operation-rate-note">A quote number should be requested to ensure proper billing of any promotional discount, if applicable. A quote number is not required to apply contractual discounts.</p>`, true)}
      ${operationAccordion('Commodity Information', `<p class="operation-rating-label">Rate this shipment using</p>
        ${operationTabs('operation-rating-mode', [['class','NMFC Class'], ['dimensions','Dimensions']], 'class')}
        <div data-operation-commodities>${operationRateRow(1, 'class')}</div>
        <button type="button" class="operation-button operation-button-outline operation-compact-button" data-operation-add-commodity>+ Add Another Commodity</button>
        <div class="operation-volume"><strong>New Service Added – TForce Freight Volume Rating</strong>
          <details class="operation-volume-help"><summary aria-label="About Linear Feet">?</summary>
            <p>Enter the total length the shipment occupies in the trailer, measured in feet.</p></details>
          <div class="operation-field operation-linear-feet"><label for="operation-linear-feet">Linear Feet</label>
            <div class="operation-linear-control">
              <button type="button" data-linear-step="-1" aria-label="Decrease linear feet">−</button>
              <input id="operation-linear-feet" type="number" min="0" value="0">
              <button type="button" data-linear-step="1" aria-label="Increase linear feet">+</button>
            </div>
          </div></div>`, true)}
      ${operationAccordion('Value Added Services <small>LTL Guaranteed (*) Eligible Services</small>', `<div class="operation-service-options">
        ${['Inside Pickup','Inside Delivery','Liftgate Pickup','Liftgate Delivery','Residential Pickup','Residential Delivery','Limited Access Pickup','Limited Access Delivery','Appointment Delivery','Protect From Freezing'].map(option => `<label class="operation-check"><input type="checkbox">${option}</label>`).join('')}
        </div>`, false)}
      ${operationStatus()}${operationButtons('Get Rate', 'Reset', 'operation-rate-actions')}
    </form></section>`);
}

function operationDensityRow(index) {
  const fields = [
    ['length','Length (in)', 'a'], ['width','Width (in)', 'a'], ['height','Height (in)', 'a'],
    ['unit','Weight(lb)', 'b'], ['count','# of Units', 'a']
  ];
  const rowFields = fields.map(([name, label, footnote]) => operationField(`operation-density-${name}-${index}`,`${label}<sup>${footnote}</sup>`, `type="number" min="${name === 'count' ? '1' : '0.01'}" step="${name === 'count' ? '1' : 'any'}" data-density-field="${name}"`));
  return `<fieldset class="operation-density-row"><legend class="sr-only">Handling unit ${index}</legend>
    <strong>${index}</strong>${rowFields.join('')}<span aria-hidden="true">=</span>
    ${operationField(`operation-density-cubic-${index}`,'Cubic Feet','value="00.0" readonly data-density-field="cubic"')}
    ${operationField(`operation-density-weight-${index}`,'Weight (lb)<sup>c</sup>','type="number" min="0.01" step="any" data-density-field="weight"')}
    ${operationField(`operation-density-result-${index}`,'Density','value="00.0" readonly data-density-field="density"')}
    <button type="button" class="operation-row-reset" data-operation-row-reset>Reset</button></fieldset>`;
}

function operationDensity() {
  return pageShell('Density Calculator', 'Tools &amp; Forms', `<section class="operation operation-density">
    <form data-operation-density action="#main-content">
      <fieldset class="operation-density-modes"><legend>Calculate Density by:</legend>
        ${[['unit','Handling Unit Weight'], ['handling','Total Weight by Handling Units'], ['total','Total Weight']].map(([value,label])=>`<label class="operation-check"><input type="radio" name="operation-density-mode" value="${value}" ${value === 'unit' ? 'checked' : ''}>${label}</label>`).join('')}
      </fieldset>
      <div class="operation-density-heading">Totals by Handling Unit</div>
      <div data-operation-density-rows>${operationDensityRow(1)}</div>
      <div class="operation-density-row operation-density-totals">
        <strong>Totals</strong>
        ${operationField('operation-density-total-count','# of Units<sup>a</sup>','value="0" readonly')}
        <span aria-hidden="true">=</span>
        ${operationField('operation-density-total-cubic','Cubic Feet','value="00.0" readonly')}
        ${operationField('operation-density-total-weight','Weight (lb)<sup>c</sup>','type="number" min="0.01" step="any" placeholder="Enter Weight" readonly')}
        ${operationField('operation-density-total-result','Density','value="00.0" readonly')}
      </div>
      <button type="button" class="operation-button operation-button-outline operation-compact-button" data-operation-add-density>+ Add Another Row</button>
      ${operationStatus()}${operationButtons('Submit','Clear')}
      <p>a. Required field<br>b. Required field when total handling weight is not entered<br>c. Required field when unit weight is not entered</p>
      <p><strong>The results provided are based on the information entered and may differ based on actual shipment characteristics</strong></p>
    </form>
    <div class="operation-density-guide">
      <article><h4>How to Measure a Shipment and Determine Handling Unit Density</h4>
      <ol><li>Measure dimensions of the handling unit in inches at its greatest distance.</li>
      <li>Multiply length × width × height to determine cubic inches.</li>
      <li>Divide cubic inches by 1,728 to calculate cubic feet.</li>
      <li>Divide total handling unit weight by cubic feet to determine density.</li></ol></article>
      <img src="/assets/boxes.jpg" alt="Boxes on a pallet" width="339" height="283">
    </div></section>`);
}

function operationServiceLookup(directory) {
  const title = directory ? 'Service Center Directory' : 'Service Point Inquiry';
  const modes = directory ? [['state','State'], ['zip','ZIP Code']] : [['zip','ZIP Code'], ['city','City']];
  return pageShell(title, operationsServiceCrumb, `<section class="operation operation-service-lookup ${directory ? 'operation-directory' : ''}">
    <p>${directory ? 'Find TForce Freight service centers, agencies, partners and service standards maps.' : 'Search for service points using the form below'}</p>
    <div class="operation-lookup-layout">
      <form data-operation-form data-operation-lookup action="#main-content">
        ${operationCountry('operation-service-country', 'Country *')}
        <fieldset class="operation-lookup-modes"><legend class="sr-only">Search by</legend>
          ${modes.map(([mode,label],index)=>`<label class="operation-check"><input type="radio" name="operation-lookup-mode" value="${mode}" ${index === 0 ? 'checked' : ''}>${label}</label>`).join('')}
        </fieldset>
        <div data-lookup-pane="zip">${operationField('operation-service-zip', directory ? 'ZIP Code *' : 'ZIP Code', 'required data-operation-postal')}</div>
        ${directory ? '' : `<div data-lookup-pane="city" hidden>${operationField('operation-service-city','City *')}</div>`}
        <div data-lookup-pane="${directory ? 'state' : 'city'}">${operationSelect('operation-service-state','State *',['Select One', ...operationsRegions['United States'].split('|')])}</div>
        ${operationStatus()}${operationButtons(directory ? 'Search' : 'Submit', directory ? 'Reset' : 'Clear')}
      </form>
      ${directory ? '<img class="operation-service-map" src="/assets/north-america-map.jpg" alt="North America">' : ''}
    </div>
    ${directory ? '' : `<p><strong>Note:</strong> If you need to determine the transit times between two points, try our <a data-route href="${operationsPath}TransitTimes">Transit Times</a> Inquiry application.</p>`}
  </section>`);
}

function operationDownloads() {
  const groups = [
    ['Direct ZIP Codes only', 'drzips'],
    ['Direct ZIP Codes and City/State Names', 'usctzip'],
    ['Direct ZIP Codes and City/State Names and TForce Freight Service Center Identifier', 'ussctzip']
  ];
  const files = [['All','','Complete archive'], ['U.S.','_US','ZIP archive'], ['Canada','_CA','Postal Code archive'], ['Mexico','_MX','Postcode archive']];
  return pageShell('Service Point Download', operationsServiceCrumb, `<section class="operation operation-downloads">
    <p><strong>Direct Points Data Files</strong></p>
    ${groups.map(([title, file])=>`<section><h3>${title}</h3><ul class="operation-download-grid">
      ${files.map(([country,suffix,label])=>`<li><p><strong>${country}</strong></p><p>${label}</p>
        <a href="${operationsOrigin}/ltl/PublicPages/DownloadFile?path=${encodeURIComponent(`/downloads/${file}${suffix}.zip`)}">Download<span class="sr-only"> ${country} ${title}</span></a></li>`).join('')}
    </ul></section>`).join('')}
  </section>`);
}

function operationMyLtl(signup) {
  const title = signup ? 'Sign Up for MyLTL' : 'Log In to MyLTL';
  return pageShell(title, '', `<section class="operation operation-identity">
    <p>Open the official TForce Freight website and select <strong>${signup ? 'Sign Up' : 'Log in'}</strong>.</p>
    <a class="operation-button" href="${operationsOrigin}${operationsPath}Home">Open TForce Freight</a>
  </section>`);
}

function operationShippingDocuments() {
  return pageShell('Shipping Documents', 'MyLTL', `<section class="operation operation-identity">
    <p>Sign in to MyLTL on the official TForce Freight website to access your shipment documents.</p>
    <a class="operation-button" href="${operationsOrigin}${operationsPath}Home">Open TForce Freight</a>
  </section>`);
}

const operationPages = {
  tracking: ['Tracking', operationTracking],
  trackinghelp: ['Tracking', operationTracking],
  rateestimate: ['Rate Estimate', operationRate],
  transittimes: ['Transit Times', operationTransit],
  pickuprequest: ['Pickup Request', operationPickup],
  densitycalculator: ['Density Calculator', operationDensity],
  servicepointinquiry: ['Service Point Inquiry', () => operationServiceLookup(false)],
  servicepointdownload: ['Service Point Download', operationDownloads],
  servicecenterdirectory: ['Service Center Directory', () => operationServiceLookup(true)],
  shippingdocuments: ['Shipping Documents', operationShippingDocuments],
  myltl: ['Log In to MyLTL', () => operationMyLtl(false)],
  myltlsignup: ['Sign Up for MyLTL', () => operationMyLtl(true)]
};

function operationForPath(path) {
  const lowerPath = path.toLowerCase();
  if (!lowerPath.startsWith(operationsPath)) return null;
  const key = lowerPath.slice(operationsPath.length);
  return Object.hasOwn(operationPages, key) ? operationPages[key] : null;
}

function operationPage(path) {
  return operationForPath(path)?.[1]() ?? null;
}

function operationPageTitle(path) {
  return operationForPath(path)?.[0] ?? null;
}

function setOperationPane(form, selector, mode) {
  form.querySelectorAll(selector).forEach(pane => {
    pane.hidden = pane.getAttribute(selector.slice(1, -1)) !== mode;
    pane.querySelectorAll('input, textarea, select').forEach(control => { control.disabled = pane.hidden; });
  });
}

function operationShowStatus(form, message) {
  const status = form.querySelector('.operation-status');
  status.hidden = !message;
  status.textContent = message;
}

function operationAdjustPostal(country, input) {
  const label = input.labels[0];
  const postalLabel = country.value === 'Canada' ? 'Postal Code' : country.value === 'Mexico' ? 'Postcode' : 'ZIP Code';
  label.textContent = label.textContent.replace(/ZIP Code|Postal Code|Postcode/, postalLabel);
  input.maxLength = country.value === 'Canada' ? 7 : 5;
  input.inputMode = country.value === 'Canada' ? 'text' : 'numeric';
  input.pattern = country.value === 'Canada' ? '[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]' : '[0-9]{5}';
}

function operationSyncPostal(form, selectIds, inputIds) {
  selectIds.forEach((id, index) => {
    const country = form.querySelector('#' + id);
    const input = form.querySelector('#' + inputIds[index]);
    if (!country || !input) return;
    const sync = () => operationAdjustPostal(country, input);
    sync();
    country.addEventListener('change', sync);
    form.addEventListener('reset', () => setTimeout(sync, 0));
  });
}

function operationBindRate(form) {
  const rows = form.querySelector('[data-operation-commodities]');
  const add = form.querySelector('[data-operation-add-commodity]');
  const modeInputs = form.querySelectorAll('[name="operation-rating-mode"]');
  const getMode = () => form.querySelector('[name="operation-rating-mode"]:checked').value;
  const renderRows = count => {
    const matchingValues = new Map([...rows.querySelectorAll('input, select')].map(field => [field.id,field.value]));
    rows.innerHTML = Array.from({length: count}, (_, index) => operationRateRow(index + 1, getMode())).join('');
    rows.querySelectorAll('input, select').forEach(field => {
      if (matchingValues.has(field.id)) field.value = matchingValues.get(field.id);
    });
    add.disabled = count >= 20;
  };
  modeInputs.forEach(input => input.addEventListener('change', () => renderRows(rows.children.length)));
  add.addEventListener('click', () => {
    renderRows(rows.children.length + 1);
    rows.lastElementChild.querySelector('input, select').focus();
  });
  const hazmat = form.querySelector('#operation-hazmat');
  const switchText = form.querySelector('[data-operation-switch]');
  hazmat.addEventListener('change', () => { switchText.textContent = hazmat.checked ? 'Yes' : 'No'; });
  const linearFeet = form.querySelector('#operation-linear-feet');
  form.querySelectorAll('[data-linear-step]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.linearStep === '1') linearFeet.stepUp();
      else linearFeet.stepDown();
    });
  });
  form.addEventListener('reset', () => setTimeout(() => {
    renderRows(1);
    switchText.textContent = 'No';
  }, 0));
}

function operationBindLookup(form) {
  const country = form.querySelector('#operation-service-country');
  const zip = form.querySelector('#operation-service-zip');
  const state = form.querySelector('#operation-service-state');
  const mode = () => form.querySelector('[name="operation-lookup-mode"]:checked').value;
  const updateLookup = () => {
    setOperationPane(form, '[data-lookup-pane]', mode());
    operationAdjustPostal(country, zip);
  };
  const updateCountry = () => {
    state.replaceChildren(new Option('Select One', ''), ...operationsRegions[country.value].split('|').map(region => new Option(region, region)));
    updateLookup();
  };
  form.querySelectorAll('[name="operation-lookup-mode"]').forEach(input => input.addEventListener('change', updateLookup));
  country.addEventListener('change', updateCountry);
  form.addEventListener('reset', () => setTimeout(updateCountry, 0));
  updateLookup();
}

function operationBindTracking(form) {
  const pro = form.querySelector('#operation-pro');
  if (!pro) return;
  const getMode = () => form.querySelector('[name="operation-tracking-mode"]:checked').value;
  const sync = () => {
    setOperationPane(form, '[data-tracking-pane]', getMode());
    operationShowStatus(form, '');
  };
  form.querySelectorAll('[name="operation-tracking-mode"]').forEach(input => input.addEventListener('change', sync));
  pro.addEventListener('input', () => {
    const count = pro.value.split(/\r?\n/).filter(line => line.trim()).length;
    pro.setCustomValidity(count > 25 ? 'Enter up to 25 PRO Numbers. One per line.' : '');
  });
  form.addEventListener('reset', () => setTimeout(() => {
    pro.setCustomValidity('');
    sync();
  }, 0));
  sync();
}

function operationDensityFields(row) {
  return Object.fromEntries([...row.querySelectorAll('[data-density-field]')].map(field => [field.dataset.densityField,field]));
}

function operationBindDensity(form) {
  const rows = form.querySelector('[data-operation-density-rows]');
  const add = form.querySelector('[data-operation-add-density]');
  const count = form.querySelector('#operation-density-total-count');
  const cubic = form.querySelector('#operation-density-total-cubic');
  const weight = form.querySelector('#operation-density-total-weight');
  const result = form.querySelector('#operation-density-total-result');
  const getMode = () => form.querySelector('[name="operation-density-mode"]:checked').value;
  const setMode = () => {
    const mode = getMode();
    weight.readOnly = mode !== 'total';
    weight.required = mode === 'total';
    for (const row of rows.children) {
      const fields = operationDensityFields(row);
      for (const key of ['length','width','height','count']) fields[key].required = true;
      fields.unit.readOnly = mode !== 'unit';
      fields.unit.required = mode === 'unit';
      fields.weight.readOnly = mode !== 'handling';
      fields.weight.required = mode === 'handling';
    }
  };
  form.querySelectorAll('[name="operation-density-mode"]').forEach(input => input.addEventListener('change', () => {
    weight.value = '';
    result.value = '00.0';
    for (const row of rows.children) {
      const fields = operationDensityFields(row);
      fields.weight.value = '';
      fields.density.value = '00.0';
    }
    operationShowStatus(form, '');
    setMode();
  }));
  add.addEventListener('click', () => {
    rows.insertAdjacentHTML('beforeend', operationDensityRow(rows.children.length + 1));
    setMode();
    rows.lastElementChild.querySelector('input').focus();
    add.disabled = rows.children.length >= 20;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const mode = getMode();
    let totalCubic = 0;
    let totalCount = 0;
    let totalWeight = mode === 'total' ? Number(weight.value) : 0;
    for (const row of rows.children) {
      const fields = operationDensityFields(row);
      const units = Number(fields.count.value);
      const rowCubic = Number(fields.length.value) * Number(fields.width.value) * Number(fields.height.value) * units / 1728;
      const rowWeight = mode === 'unit' ? Number(fields.unit.value) * units : Number(fields.weight.value);
      fields.cubic.value = rowCubic.toFixed(1);
      if (mode !== 'handling') fields.weight.value = mode === 'total' ? '' : rowWeight.toFixed(1);
      fields.density.value = mode === 'total' ? '00.0' : (rowWeight / rowCubic).toFixed(1);
      totalCubic += rowCubic;
      totalCount += units;
      if (mode !== 'total') totalWeight += rowWeight;
    }
    count.value = totalCount;
    cubic.value = totalCubic.toFixed(1);
    if (mode !== 'total') weight.value = totalWeight.toFixed(1);
    result.value = (totalWeight / totalCubic).toFixed(1);
    operationShowStatus(form, 'Density calculated in your browser.');
  });
  form.addEventListener('reset', () => setTimeout(() => {
    rows.innerHTML = operationDensityRow(1);
    add.disabled = false;
    operationShowStatus(form, '');
    setMode();
  }, 0));
  setMode();
}

function bindOperations() {
  const allForms = document.querySelectorAll('[data-operation-form], [data-operation-density]');
  for (const form of allForms) {
    form.addEventListener('click', event => {
      const reset = event.target.closest('[data-operation-row-reset]');
      if (!reset) return;
      reset.closest('fieldset').querySelectorAll('input, select').forEach(field => { field.value = field.defaultValue ?? ''; });
      operationShowStatus(form, '');
    });
    if (form.hasAttribute('data-operation-density')) {
      operationBindDensity(form);
      form.querySelector('[type="submit"]').disabled = false;
      continue;
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      operationShowStatus(form, 'This preview does not submit requests. Use the official TForce Freight site for live results.');
    });
    form.addEventListener('reset', () => operationShowStatus(form, ''));
    operationBindTracking(form);
    if (form.hasAttribute('data-rate-form')) operationBindRate(form);
    if (form.hasAttribute('data-operation-lookup')) operationBindLookup(form);
    operationSyncPostal(form,
      ['operation-origin','operation-destination','operation-transit-origin','operation-transit-destination','operation-rate-from','operation-rate-to'],
      ['operation-origin-zip','operation-destination-zip','operation-transit-origin-zip','operation-transit-destination-zip','operation-rate-origin-zip','operation-rate-destination-zip']);
    form.querySelector('[type="submit"]').disabled = false;
  }
}
