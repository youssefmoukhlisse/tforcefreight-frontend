import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, join, resolve } from 'node:path';
import { totpAtStep } from '../server/auth.mjs';

const [baseUrl, destination, mode] = process.argv.slice(2);
if (!baseUrl || !destination) throw new Error('Usage: node scripts/tracking-e2e.mjs BASE_URL DESTINATION [--verify-existing]');
const origin = new URL(baseUrl).origin;
const folder = resolve(destination);
await mkdir(folder, { recursive: true });
const reportPath = join(folder, 'report.json');
const auditModules = process.env.TFORCE_AUDIT_MODULES;
const require = createRequire(auditModules ? resolve(auditModules, 'tracking-test-require.cjs') : import.meta.url);
const { chromium } = require(auditModules ? resolve(auditModules, 'playwright') : 'playwright');
const browser = await chromium.launch({ channel: process.env.TFORCE_CHROME_CHANNEL || 'chrome' });
const baseViewport = { width: 1512, height: 1084 };
const checks = [];
const screenshots = [];
const consoleErrors = [];
const started = new Date().toISOString();
const viewportSizes = [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[375,812]];
const report = { origin, started, checks, screenshots, consoleErrors };

function watch(page) {
  page.on('pageerror', error => consoleErrors.push({ source: new URL(page.url()).pathname, message: error.message }));
  return page;
}
function pass(check, detail) { checks.push({ check, detail, result: 'passed' }); console.log('PASS ' + check); }
async function json(context, path, data, method = 'POST') {
  return context.request.fetch(origin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, data });
}
async function snapshot(page, name) {
  const path = join(folder, name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  screenshots.push({ name, file: basename(path), viewport: page.viewportSize() });
}
async function fill(page, values) {
  for (const [id, value] of Object.entries(values)) await page.locator('#' + id).fill(String(value));
}
async function search(page, numbers) {
  await page.locator('#track-numbers').fill(numbers.join('\n'));
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/tracking/search')),
    page.getByRole('button', { name: 'Track', exact: true }).click(),
  ]);
  assert.equal(response.status(), 200, 'tracking POST');
  const body = await response.json();
  await page.waitForFunction(() => document.getElementById('track-output').getAttribute('aria-busy') === 'false');
  return body;
}
async function verifyPublic(context, pro, status = 'delivered') {
  const tab = watch(await context.newPage());
  await tab.goto(origin + '/ltl/apps/Tracking');
  const {results} = await search(tab, [pro]);
  assert.equal(results[0].shipments[0].status, status);
  await tab.getByRole('button', { name: 'Show Details +' }).click();
  await tab.getByRole('table', { name: 'Shipment progress' }).waitFor();
  return tab;
}
function base32Key(raw) {
  let value = 0, bits = 0;
  const bytes = [];
  for (const character of raw) {
    const digit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character);
    assert.ok(digit >= 0, 'Unexpected authenticator alphabet');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >> bits) & 255); }
  }
  return Buffer.from(bytes);
}
async function hiddenInput() {
  if (!process.stdin.isTTY) return JSON.parse(await readFile('/dev/stdin', 'utf8'));
  console.log('Ready for test-only credentials (hidden).');
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  let input = '';
  try {
    for await (const chunk of process.stdin) {
      if (chunk.includes('\u0003')) throw new Error('Test credentials input canceled.');
      input += chunk;
      if (/[\r\n]/.test(input)) break;
    }
    return JSON.parse(input.trim());
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}
async function signIn(page, credentials) {
  await page.goto(origin + '/admin/');
  if (credentials.bootstrap) {
    await page.getByRole('heading', {name:'Set up first administrator', exact:true}).waitFor();
    await fill(page, {email:credentials.email, password:credentials.password, 'verify-password':credentials.password, setupToken:credentials.setupToken});
    await page.getByRole('button', {name:'Set Up Authenticator', exact:true}).click();
    await page.locator('#authenticator-secret').waitFor();
  } else {
    await page.getByRole('heading', {name:'Sign in', exact:true}).waitFor();
    await fill(page, {email:credentials.email,password:credentials.password});
    await page.getByRole('button', {name:'Continue to Verification',exact:true}).click();
    await page.locator('#code').waitFor();
  }
  const secret = credentials.bootstrap ? await page.locator('#authenticator-secret').inputValue() : credentials.authenticatorSecret;
  assert.ok(secret, 'A disposable authenticator secret is required.');
  await page.locator('#code').fill(totpAtStep(base32Key(secret), Math.floor(Date.now()/30000)));
  await page.getByRole('button', {name:'Verify and Sign In',exact:true}).click();
  if (credentials.bootstrap) {
    await page.getByRole('button', {name:'Continue to Dashboard',exact:true}).click();
  }
  await page.getByRole('heading', { name: 'Dashboard Overview', exact: true }).waitFor({ timeout: 12_000 });
}
async function enterEvent(page, fields) {
  await page.locator('#event-status').selectOption(fields.status);
  await fill(page, { source:'QA dispatch simulation', timeZone:'America/New_York', city:fields.city, state:fields.state,
    eventDate:fields.day, eventTime:fields.time, trailer:fields.trailer, ...(fields.signed ? {signedBy:'QA Receiver'} : {}) });
  const api = page.waitForResponse(response => response.url().endsWith('/events') && response.request().method() === 'POST');
  await page.getByRole('button', { name:'Record Event',exact:true }).click();
  const response = await api;
  assert.equal(response.status(), 201, `Record ${fields.status}: ${await response.text()}`);
  await page.getByText('Tracking event recorded.', {exact:true}).waitFor();
  await page.waitForFunction(() => document.querySelector('#source')?.value === '');
}

try {
  if (mode === '--verify-existing') {
    const original = JSON.parse(await readFile(reportPath, 'utf8'));
    assert.equal(original.origin, origin);
    const context = await browser.newContext({ viewport:baseViewport });
    const tab = await verifyPublic(context, original.pro);
    const count = await tab.locator('.progress-table tbody tr').count();
    assert.equal(count, original.eventCount);
    pass('Post-restart persistence', `${original.pro} and ${count} historical events still present`);
    original.checks.push(...checks);
    original.verifiedAfterRestart = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(original, null, 2) + '\n');
    await context.close();
  } else {
    const credentials = await hiddenInput();
    const adminContext = await browser.newContext({ viewport:baseViewport });
    const publicContext = await browser.newContext({ viewport:baseViewport });
    const page = watch(await adminContext.newPage());
    const publicPage = watch(await publicContext.newPage());
    const {tracking, status} = await (await publicContext.request.get(origin + '/healthz')).json();
    assert.equal(status, 'ok');
    assert.equal(tracking, 'ready');
    const config = await (await publicContext.request.get(origin + '/api/config')).json();
    report.environment = config.environment;
    assert.equal(config.notificationsEnabled, false);
    const noSession = await publicContext.request.get(origin + '/api/admin/shipments');
    assert.equal(noSession.status(), 401);
    pass('Anonymous admin access denied', 'HTTP 401');
    await signIn(page, credentials);
    pass('Admin sign-in and authenticator MFA', 'Authenticated dashboard loaded');
    const cookies = await adminContext.cookies();
    const session = cookies.find(cookie => cookie.name.endsWith('records_session'));
    assert.ok(session?.httpOnly && session.sameSite === 'Strict' && (!origin.startsWith('https://') || session.secure));
    pass('Session cookie controls', 'HttpOnly and SameSite=Strict; Secure on HTTPS');

    await page.goto(origin + '/admin/#new');
    await page.locator('#shipment-form').waitFor();
    const fixture = 'QA-' + Date.now().toString(36).toUpperCase();
    const fields = {
      reference:fixture + '-REF', pieces:1, weight:2725,
      pickupDate:'2026-08-18', estimatedDeliveryDate:'2026-08-21',
      'shipFrom-company':'SYNTHETIC ORIGIN LLC', 'shipFrom-contact':'QA Sender', 'shipFrom-address':'TEST PRIVATE STREET',
      'shipFrom-city':'Atlanta', 'shipFrom-state':'GA', 'shipFrom-postalCode':'30303', 'shipFrom-email':'qa-sender@example.test',
      'shipTo-company':'SYNTHETIC RECEIVER CO', 'shipTo-contact':'QA Recipient', 'shipTo-address':'DO NOT PUBLISH TEST ADDRESS',
      'shipTo-city':'Columbia', 'shipTo-state':'MD', 'shipTo-postalCode':'21044', 'shipTo-email':'qa-recipient@example.test',
    };
    await fill(page, fields);
    await page.getByLabel('Service type').selectOption('LTL');
    await page.locator('[name=shareNames]').check();
    await page.locator('[name=shareDetails]').check();
    const create = page.waitForResponse(response => response.url().endsWith('/api/admin/shipments') && response.request().method() === 'POST');
    await page.locator('#shipment-form').getByRole('button', {name:'Create Shipment'}).click();
    const created = await create;
    assert.equal(created.status(), 201, 'Admin created a shipment');
    const { shipment } = await created.json();
    const pro = report.pro = shipment.pro;
    assert.match(pro, /^[1-9][0-9]{8}$/);
    assert.match(shipment.bol, /^[0-9]{11}$/);
    assert.match(shipment.po, /^CA01226[0-9]{5}A$/);
    assert.equal(shipment.service, 'LTL');
    await page.waitForURL('**/#shipment/*/summary');
    await page.getByText(shipment.bol, { exact: true }).waitFor();
    await page.getByText(shipment.po, { exact: true }).waitFor();
    pass('Create shipment and issue internal PRO, BOL and PO', 'All three generated numbers appear on the shipment summary');
    const duplicate = await json(adminContext, '/api/admin/shipments', { ...shipment, pro, shipFrom:shipment.shipFrom, shipTo:shipment.shipTo });
    assert.equal(duplicate.status(), 409, 'A duplicate PRO request must be rejected');
    pass('Duplicate PRO rejected', 'HTTP 409');

    await page.getByRole('navigation',{name:'Shipment sections'}).getByRole('link',{name:'Tracking Events'}).click();
    const events = [
      {status:'picked_up', city:'Atlanta', state:'GA', day:'2026-08-18', time:'17:15', trailer:'QA100'},
      {status:'in_transit', city:'Atlanta', state:'GA', day:'2026-08-18', time:'19:03', trailer:'QA100'},
      {status:'departed_service_center', city:'Atlanta', state:'GA', day:'2026-08-18', time:'20:47', trailer:'QA101'},
      {status:'arrived_at_service_center', city:'Charlotte', state:'NC', day:'2026-08-19', time:'00:28', trailer:'QA101'},
      {status:'departed_service_center', city:'Charlotte', state:'NC', day:'2026-08-19', time:'14:25', trailer:'QA102'},
      {status:'arrived_at_service_center', city:'Baltimore', state:'MD', day:'2026-08-19', time:'23:10', trailer:'QA102'},
      {status:'out_for_delivery', city:'Baltimore', state:'MD', day:'2026-08-20', time:'10:12', trailer:'QA103'},
      {status:'delivered', city:'Baltimore', state:'MD', day:'2026-08-20', time:'11:52', trailer:'QA103', signed:true},
    ];
    for (const event of events.slice(0,2)) await enterEvent(page, event);
    pass('Record confirmed pickup and transit', 'Two events created through the admin UI');

    await publicPage.goto(origin + '/ltl/apps/Tracking');
    await publicPage.getByRole('button',{name:'Track',exact:true}).click();
    await publicPage.getByRole('alert').getByText('Enter at least one internal PRO number.').waitFor();
    await publicPage.locator('#track-numbers').fill('not-an-internal-pro');
    await publicPage.getByRole('button',{name:'Track',exact:true}).click();
    await publicPage.getByRole('alert').getByText(/Enter a 9-digit internal PRO number/).waitFor();
    const unknown = '012345678';
    const transit = await search(publicPage,[pro,unknown]);
    assert.equal(transit.results[0].shipments[0].status,'in_transit');
    assert.equal(transit.results[1].shipments.length,0);
    const publicJSON = JSON.stringify(transit);
    for (const phrase of ['qa-recipient@example.test','TEST PRIVATE STREET','QA Recipient','QA dispatch simulation']) assert.ok(!publicJSON.includes(phrase));
    pass('Public lookup, validation, multiple PROs and redaction', 'Empty/invalid numbers rejected, unknown separated and street/contact data absent');
    await publicPage.goto(origin + '/');
    await publicPage.locator('#home-pro').fill(pro);
    const homeSearch = publicPage.waitForResponse(response => response.url().endsWith('/api/tracking/search'));
    await publicPage.locator('.track-form').getByRole('button', { name:'Track', exact:true }).click();
    assert.equal((await (await homeSearch).json()).results[0].shipments[0].pro, pro);
    pass('Homepage forwards 9-digit PRO', 'Tracking opens and searches the entered number');
    const show = publicPage.getByRole('button',{name:'Show Details +'});
    await show.click();
    await publicPage.getByRole('table',{name:'Shipment progress'}).waitFor();
    assert.equal(await publicPage.locator('.progress-table tbody tr').count(), 2);
    await publicPage.locator('.hide-row').getByRole('button',{name:'Hide Details −'}).click();
    assert.equal(await publicPage.getByRole('table',{name:'Shipment progress'}).count(), 0);
    await publicPage.locator('.result-group>summary').click();
    assert.equal(await publicPage.locator('.shipment[open]').isVisible(), false);
    await publicPage.locator('.result-group>summary').click();
    pass('Result accordion and Show/Hide Details', 'Both levels and timeline visibility work');

    for (const event of events.slice(2)) await enterEvent(page,event);
    const delivered = await search(publicPage,[pro]);
    assert.equal(delivered.results[0].shipments[0].status,'delivered');
    assert.equal(delivered.results[0].shipments[0].delivery.signedBy,null);
    assert.equal(delivered.results[0].shipments[0].events[0].eventTime,'11:52');
    assert.equal(delivered.results[0].shipments[0].events.length,events.length);
    report.eventCount = events.length;
    pass('New delivery event appears publicly in order', 'Latest first with America/New_York local time; signature withheld from PRO-only search');

    const ref = {mode:'reference',kind:'bol',number:shipment.bol, fromDate:'2026-08-18',toDate:'2026-08-20',originZip:'30303',destinationZip:'21044'};
    const rejected = await json(publicContext,'/api/tracking/search',{...ref,destinationZip:'11111'});
    assert.equal((await rejected.json()).results[0].shipments.length,0);
    await publicPage.locator('label[for="mode-reference"]').click();
    await publicPage.locator('#reference-kind').selectOption('bol');
    await fill(publicPage, {'reference-number':ref.number,'from-date':ref.fromDate,'to-date':ref.toDate,'origin-zip':ref.originZip,'destination-zip':ref.destinationZip});
    const reference = publicPage.waitForResponse(response => response.url().endsWith('/api/tracking/search'));
    await publicPage.getByRole('button',{name:'Track',exact:true}).click();
    const referenceData = await (await reference).json();
    assert.equal(referenceData.results[0].shipments[0].pro,pro);
    assert.equal(referenceData.results[0].shipments[0].delivery.signedBy,'QA Receiver');
    const poLookup = await json(publicContext, '/api/tracking/search', { ...ref, kind: 'po', number: shipment.po });
    assert.equal((await poLookup.json()).results[0].shipments[0].pro, pro);
    await publicPage.getByRole('button',{name:'Reset',exact:true}).click();
    await publicPage.getByRole('radio',{name:'PRO',exact:true}).waitFor({state:'attached'});
    assert.equal(await publicPage.getByRole('radio',{name:'PRO',exact:true}).isChecked(),true);
    await publicPage.locator('#track-numbers').waitFor({state:'visible'});
    assert.equal(await publicPage.locator('.result-group').count(),0);
    pass('Generated BOL and PO reference lookup, ZIP verification and reset', 'Wrong ZIP found nothing; verified search returned permitted delivery details');

    const attack = await publicContext.request.post(origin + '/api/tracking/search', {
      headers:{Origin:'https://invalid.example.test','Content-Type':'application/json'},data:{mode:'pro',numbers:[pro]},
    });
    assert.equal(attack.status(),403);
    pass('Cross-origin API request rejected', 'HTTP 403');

    await page.goto(origin + '/admin/#overview');
    await page.getByRole('heading',{name:'Dashboard Overview',exact:true}).waitFor();
    await page.getByRole('link',{name:pro,exact:true}).first().waitFor();
    await snapshot(page,'admin-overview');
    await page.goto(origin + '/admin/#shipment/' + shipment.id + '/events');
    await page.getByRole('heading',{name:'Shipment Progress',exact:true}).waitFor();
    await snapshot(page,'admin-tracking-events');

    await search(publicPage,[pro]);
    await publicPage.getByRole('button',{name:'Send Updates',exact:true}).click();
    await publicPage.getByText('Email updates are currently unavailable for this shipment.').waitFor();
    await publicPage.getByRole('button',{name:'Close',exact:true}).click();
    pass('Staging mail disabled', 'UI states email is unavailable; no mail sent');
    await snapshot(publicPage,'tracking-reference-layout-collapsed');
    await publicPage.getByRole('button',{name:'Show Details +'}).click();
    await snapshot(publicPage,'tracking-reference-layout-expanded');
    report.geometry = await publicPage.evaluate(() => Object.fromEntries(
      ['.site-header','.track-switch','#track-numbers','.result-group>summary','.shipment>summary','.progress-rail','.panel-title','.progress-table table'].map(selector => {
        const node = document.querySelector(selector), box = node.getBoundingClientRect(), styles = getComputedStyle(node);
        return [selector, {x:box.x,y:box.y,w:box.width,h:box.height,background:styles.backgroundColor,font:styles.fontFamily}];
      })));

    for (const [width,height] of viewportSizes) {
      await publicPage.setViewportSize({width,height});
      const sizes = await publicPage.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth}));
      assert.equal(sizes.scroll,sizes.width,`No horizontal document overflow at ${width}×${height}`);
      await snapshot(publicPage,`tracking-${width}x${height}`);
    }
    pass('Six responsive viewports', viewportSizes.map(([w,h])=>`${w}×${h}`).join(', ') + '; no document overflow');
    assert.deepEqual(consoleErrors, [], 'No uncaught page errors');
    pass('No uncaught browser errors', 'Public tracking and admin');
    report.finished = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
} finally { await browser.close(); }
