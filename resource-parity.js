function resourceParityBody(key, page) {
  const sourceUrl = `${informationOrigin}${informationBase}${key}`;

  switch (key) {
    case 'UPSGroundWithFreightPricing':
      return resourceParityGround(sourceUrl);
    case 'SmallBusinessResources':
      return resourceParitySmallBusiness(sourceUrl, page.groups);
    case 'CargoClaimsInformation':
      return resourceParityCargoClaims(sourceUrl, page.documents[0]);
    case 'FactSheet':
      return resourceParityFactSheet(sourceUrl);
    default:
      return null;
  }
}

function resourceParityHero(photo, title, description, imageDescription = '') {
  const caption = title ? `<div class="resource-hero-caption"><h2>${informationEscape(title)}</h2><p>${informationEscape(description)}</p></div>` : '';
  return `<div class="resource-hero"><img src="/assets/${photo}" alt="${informationEscape(imageDescription)}" width="1600" height="400">${caption}</div>`;
}

function resourceParityGround(sourceUrl) {
  return `<div class="resource-parity">
    ${resourceParityHero('hero-ltl.jpg', 'Move Your Shipment Without a Pallet', 'Compare the UPS Ground parcel option and TForce Freight LTL using the details of your shipment.', 'Forklift loading palletized TForce Freight for comparison with parcel shipping')}
    <div class="resource-inner">
      <div class="resource-article resource-ground">
        <section>
          <h2>Move Your Packages Off of the Pallet</h2>
          <p>For a shipment of several packages that can travel separately, consider whether to use TForce Freight’s LTL network or send each piece through the UPS Ground parcel network. The program is designed for combined shipments in the 151–500 lb range.</p>
          <p>Use the shipment’s total weight, package dimensions and destination when comparing the two service options. ${informationLink('Rate Estimate', 'RateEstimate')} illustrates the shipment details needed to request a quote.</p>
          <p>Ground with Freight Pricing is offered through the UPS network in the 48 contiguous states. ${informationLink('Confirm availability with TForce Freight', sourceUrl)}.</p>
        </section>
        <section>
          <h2>Great Service with Significant Savings</h2>
          <p>The parcel option offers day-definite service for qualifying shipments of separate packages. Compare the full cost of each service based on the shipment’s destination, total weight and handling needs.</p>
          <p>When evaluating separate parcels against a palletized shipment, consider these cost differences.</p>
          <ul>
            <li>Fuel surcharges are calculated differently for parcel shipments.</li>
            <li>Shipping individual pieces removes the cost and weight of the pallet.</li>
            <li>Package delivery does not require a liftgate or an inside freight delivery.</li>
          </ul>
        </section>
        <section>
          <h2>A New Dimension of Customer Service</h2>
          <p>UPS Quantum View Manage<sup>®</sup> offers shipment reporting, while Quantum View Notify<sup>®</sup> sends updates on package progress and delivery. These tools help shippers and recipients plan around delivery status.</p>
        </section>
        <section>
          <h2>Which Packages are Allowed?</h2>
          <p>For each package, the carrier publishes these UPS Ground limits.</p>
          <ul>
            <li>Weight up to 150 lb.</li>
            <li>Length and girth up to 165 in combined.</li>
            <li>Longest side up to 108 in.</li>
            <li>Large, light packages may be priced using dimensional weight.</li>
          </ul>
          <p>${informationLink('Review current limits and service terms', sourceUrl)} before shipping.</p>
        </section>
      </div>
      <p class="resource-service-note"><small>*TForce Freight resells UPS Ground with Freight Pricing. Other UPS services are outside that authorization.</small></p>
    </div>
  </div>`;
}

const resourceCardImages = {
  Freight101: ['hero-ltl.jpg', '78%'],
  AboutUs: ['hero-about-us.jpg', '92%'],
  UPSGroundWithFreightPricing: ['hero-ltl.jpg', '52%'],
  DensityBasedRating: ['boxes.jpg', '50%'],
  TransitTimes: ['home-truck.jpg', '42%'],
  AdditionalShippingInformation: ['icon-clipboard.svg', '50%'],
  RateEstimate: ['icon-holding-box.svg', '50%'],
  EmailTForceFreightCustomerSupport: ['icon-envelope.svg', '50%'],
};

function resourceParitySmallBusiness(sourceUrl, groups) {
  const cards = groups.map(([title, links]) => `<section>
    <h2>${informationEscape(title)}</h2>
    <ul>${links.map(([label, path]) => {
      const [photo, position] = resourceCardImages[path] ?? ['icon-clipboard.svg', '50%'];
      return `<li><a class="resource-card" href="${informationBase}${informationEscape(path)}" data-route>
        <img src="/assets/${photo}" class="${photo.endsWith('.svg') ? 'resource-card-icon' : ''}" style="object-position:${position} center" alt="" loading="lazy">
        <span>${informationEscape(label)}<strong aria-hidden="true">➜</strong></span>
      </a></li>`;
    }).join('')}</ul>
  </section>`).join('');

  return `<div class="resource-parity resource-small-business">
    ${resourceParityHero('hero-about-us.jpg', 'Get Started with Freight Shipping', 'Find the freight services and shipping tools that fit your small business.')}
    <div class="resource-inner">
      <section class="resource-small-intro">
        <h2>New to LTL? Start here</h2>
        <p>Choosing a freight service starts with the goods you’re sending, where they are going and when they need to arrive. LTL, or less-than-truckload shipping, lets you share trailer space when your shipment does not fill a full truck.</p>
        <p>Learn how LTL shipments are prepared and priced, check transit times and find the shipping documents you need. Once you know your shipment details, request a quote or contact the freight team to discuss your options.</p>
      </section>
      <div class="resource-card-groups">${cards}</div>
      <p class="resource-service-note"><small>*TForce Freight resells UPS Ground with Freight Pricing. See the ${informationLink('official small business resources', sourceUrl)} for current service information.</small></p>
    </div>
  </div>`;
}

function resourceParityCargoClaims(sourceUrl, [formName, file]) {
  const formPath = `/downloads/${file}`;
  const viewUrl = `${informationOrigin}${formPath}`;
  const downloadUrl = `${informationOrigin}/ltl/PublicPages/DownloadFile?path=${encodeURIComponent(formPath)}`;
  return `<div class="resource-parity resource-inner">
    <div class="resource-article resource-claims">
      <section class="resource-claim-forms">
        <h2>Forms</h2>
        <div class="resource-form-row">
          <span class="resource-form-icon" aria-hidden="true">PDF</span>
          <div>
            <strong>${informationEscape(formName)}</strong>
            <div>Adobe PDF format</div>
            <div class="resource-form-actions">
              ${informationLink('View', viewUrl, true, `View ${formName}`)}
              ${informationLink('Download', downloadUrl, false, `Download ${formName}`)}
              ${informationLink('Print', viewUrl, true, 'Open the claim form in a new tab for printing')}
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2>Lost or Damaged Shipments</h2>
        <p>Inspect each delivery when it arrives. Compare the freight with your delivery receipt, look for obvious damage, and ask the driver to review any issues before signing. Keep the shipping documents with any notes and photographs you collect.</p>
      </section>
      <section>
        <h2>For a Shipment Shortage</h2>
        <p>Recount the pieces you received and compare that number with the receipt. Write the quantity and description of the missing items on both copies of the delivery receipt so the service center has a record of the shortage.</p>
      </section>
      <section>
        <h2>How to Have a Shortage Traced</h2>
        <p>The service center can use the delivery exception to look for the missing freight. If you need follow-up, ask the local service center for its Over, Short &amp; Damage team. Before contacting the team, gather details that could help identify the containers or their contents.</p>
        <ul>
          <li>Freight bill or PRO number.</li>
          <li>Bill date listed on your delivery receipt.</li>
          <li>Shipper and recipient names and addresses.</li>
          <li>Number of pieces originally listed.</li>
          <li>Count of the missing pieces.</li>
          <li>Original shipment weight.</li>
          <li>Delivery date.</li>
          <li>A description of each missing piece, including visible markings and dimensions.</li>
          <li>Part and serial numbers, if available.</li>
          <li>Any identifying information on the container or contents.</li>
        </ul>
      </section>
      <section>
        <h2>For Visible Damage</h2>
        <p>When a carton or other container shows damage, check the contents with the driver. Record both the condition of the packaging and what you found inside. Write the same specific observations on your copy and the carrier’s copy of the delivery receipt.</p>
        <p>For an item that can still be repaired or used, keep the freight and contact the carrier to discuss the next step. Check the ${informationLink('official cargo claims instructions', sourceUrl)} before refusing any part of a shipment.</p>
      </section>
      <section>
        <h2>For Concealed Loss or Damage</h2>
        <p>Unpack and check the goods promptly after delivery. If you discover damage that was not visible at delivery, notify TForce Freight and ask about an inspection. Save the cartons, packing material and freight as you found them, along with photos and the delivery paperwork.</p>
        <p>TForce Freight’s published instructions call for reporting concealed loss or damage within five business days of delivery. ${informationLink('Confirm the official instructions', sourceUrl)} for your shipment.</p>
      </section>
      <section>
        <h2>Requesting Inspections</h2>
        <p>Ask your local service center or Customer Service at <strong>${informationLink('(800) 333-7400', 'tel:+18003337400')}</strong> whether the freight needs an inspection. Keep a written record of your observations, including the condition of the cartons, labels and goods. Take photos with enough context to identify the affected pieces.</p>
        <p>Retain the inspection findings with the other evidence. Filing for payment still requires a separate written claim.</p>
      </section>
      <section>
        <h2>The Claim, Defined</h2>
        <p>A cargo claim is a written request from the owner of the goods for payment for a loss or damage during transit. The applicable contract and ${informationLink('Rules Tariff', 'RulesTariffs')} determine what the carrier may pay. Some commodities have different limits under the National Motor Freight Classification or specific tariff items.</p>
        <p>If the value of the freight exceeds the applicable limit, speak with your TForce Freight account manager about coverage and review what is recorded on the bill of lading.</p>
      </section>
      <section>
        <h2>How to File a Claim</h2>
        <p>Identify the loss, collect the shipment records and calculate the amount you are claiming. Keep a copy of the completed claim and supporting materials for your records.</p>
        <p>TForce Freight requests a single submission by mail or fax. Check the ${informationLink('official filing instructions', sourceUrl)} and the tariff for applicable deadlines and exceptions.</p>
        <ol>
          <li>Calculate the actual amount of loss. Document any repair, discount or salvage that reduces that amount.</li>
          <li>Complete the ${informationLink(formName, downloadUrl)} or prepare a letter that identifies the shipment and states the amount claimed.</li>
          <li>Collect supporting materials.
            <ul>
              <li>Vendor invoice with the purchase price and discounts.</li>
              <li>Freight invoice.</li>
              <li>Bill of lading.</li>
              <li>Repair invoices where relevant.</li>
            </ul>
          </li>
          <li>Send the written claim and documentation using the carrier’s published channels.
            <address>Claims Processing<br>TForce Freight<br>P.O. Box 1216<br>Richmond, VA 23218</address>
            <p>Fax <strong>(866) 580-1944</strong>.</p>
          </li>
        </ol>
      </section>
      <section>
        <h2>How Your Claim will be Processed</h2>
        <p>When the carrier registers a claim, it assigns a reference number and an investigator. Use the claim number when providing additional documents or checking progress.</p>
        <p>National Motor Freight Classification item 300120 addresses written acknowledgment, disposition and updates while a claim remains open. ${informationLink('Read the carrier’s explanation of the process', sourceUrl)}.</p>
        <p>Save the acknowledgment and read any requests for supporting material. It may specify what the examiner needs to continue reviewing your claim.</p>
        <p>To follow up, ${informationLink('check the status', 'CargoClaimStatus')} online, contact your account manager, or call Customer Service at <strong>${informationLink('(800) 333-7400', 'tel:+18003337400')}</strong>. The Claims Department can also assist at <strong>${informationLink('(888) 653-9720', 'tel:+18886539720')}</strong>.</p>
      </section>
      <section>
        <h2>Insurance Requirements</h2>
        <p>TForce Freight reports that it maintains automobile, general liability, cargo and workers’ compensation coverage. Review the ${informationLink('official cargo claims information', sourceUrl)} and the contract that applies to your shipment for liability and coverage details.</p>
      </section>
    </div>
  </div>`;
}

function resourceParityFactSheet(sourceUrl) {
  return `<div class="resource-parity">
    ${resourceParityHero('home-truck.jpg')}
    <div class="resource-inner">
      <div class="resource-article resource-facts">
        <p>TForce Freight provides less-than-truckload transportation for businesses across North America. Its services offer regional, long-haul and cross-border options, with online tools for comparing rates, planning shipments, preparing documents and tracking freight along the way.</p>
        <section>
          <h2>TForce Freight LTL Products</h2>
          <ul>
            <li><strong>${informationLink('TForce Freight LTL', 'TForceFreightLTL')}</strong> covers regional, interregional and long-haul freight.</li>
            <li><strong>${informationLink('TForce Freight LTL Guaranteed', 'Guaranteed')}</strong> offers day-definite delivery.</li>
            <li><strong>${informationLink('Specialized Solutions', 'SpecializedSolutions')}</strong> offers expedited and multimodal options, including scheduled delivery for eligible shipments.</li>
          </ul>
        </section>
        <section>
          <h2>Service Coverage</h2>
          <ul>
            <li>All 50 U.S. states and Canada.</li>
            <li>More than 600 points in Mexico, including major cities.</li>
            <li>Puerto Rico, the U.S. Virgin Islands and Guam.</li>
            <li>Over 13,000 lanes with one- or two-day service.</li>
          </ul>
        </section>
        <section>
          <h2>Service Features</h2>
          <ul>
            <li>Regional and long-distance service for palletized and heavy LTL freight.</li>
            <li>Pricing and service options based on shipment requirements.</li>
            <li>Online ${informationLink('rate estimates', 'RateEstimate')} and tools for preparing freight shipments.</li>
            <li>Electronic customs clearance and documentation for cross-border moves.</li>
            <li>Shipment tracking and account tools for freight administration and billing.</li>
          </ul>
        </section>
        <section>
          <h2>Other Services</h2>
          <ul>
            <li>Trade show freight</li>
            <li>Government freight</li>
            <li>UPS<sup>®</sup> Ground with Freight Pricing*</li>
            <li>Density-based rating</li>
            <li>Volume pricing</li>
            <li>Consolidation and distribution</li>
          </ul>
        </section>
        <section>
          <h2>Network Infrastructure</h2>
          <ul>
            <li>At least 178 facilities across North America.</li>
            <li>More than 15,000 trailers.</li>
            <li>More than 3,300 tractors.</li>
          </ul>
          <p>${informationLink('Official fact sheet', sourceUrl)} for the carrier’s published figures.</p>
        </section>
        <section>
          <h2>Home Office</h2>
          <address>9954 Mayland Drive, 3rd Floor<br>Suite 3000, Henrico, VA 23233</address>
        </section>
      </div>
      <p class="resource-service-note"><small>*TForce Freight resells UPS Ground with Freight Pricing. Other UPS services are outside that authorization.</small></p>
    </div>
  </div>`;
}
