import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const modulePath = (name) => process.env.TFORCE_AUDIT_MODULES
  ? resolve(process.env.TFORCE_AUDIT_MODULES, name)
  : require.resolve(name);
const { chromium } = require(modulePath('playwright'));
const { PNG } = require(modulePath('pngjs'));
const pixelmatchExport = await import(pathToFileURL(require.resolve(modulePath('pixelmatch'))).href);
const pixelmatch = pixelmatchExport.default;

const defaultViewports = ['1920x1080', '1440x900', '1024x768', '768x1024', '390x844', '375x812'];
const interactionControls = {
  'shipping-open': { original: '#navbarDropdownShipping', replica: 'Shipping' },
  'services-open': { original: '#navbarDropdownServices', replica: 'Services' },
  'tools-open': { original: '#navbarDropdownToolsForms', replica: 'Tools & Forms' },
  'myltl-open': { original: '#navbarDropdownMyLTL', replica: /MyLTL/ },
  'mobile-open': { original: '.navbar-toggler', replica: /^(open menu|menu|toggle navigation)$/i },
};
const defaultRoutes = [
  '/',
  ...[
    'Tracking', 'TrackingHelp', 'RateEstimate', 'TransitTimes', 'PickupRequest',
    'RestrictedGoods', 'TForceFreightLTL', 'Guaranteed', 'Canada', 'Mexico',
    'PuertoRicoUSVirginIslands', 'HawaiiGuam', 'Alaska', 'TradeShowServices',
    'SpecializedSolutions', 'VolumePricing', 'Truckload', 'DensityBasedRating',
    'UPSGroundWithFreightPricing', 'OtherServices', 'ServiceInformation',
    'ServicePointInquiry', 'ServicePointDownload', 'ServiceCenterDirectory',
    'AdditionalShippingInformation', 'RulesTariffs', 'BillofLadingDownloads',
    'TechnologySolutions', 'DensityCalculator', 'FreezableProtectionAdvisory',
    'Claims', 'ShippingDocuments', 'SmallBusinessResources', 'MyLTL',
    'MyLTLSignup', 'AboutUs', 'Announcements', 'FactSheet', 'ContactUs',
    'TForceFreightPrivacyNotice', 'FuelSurcharge', 'TForceFreightHolidays',
    'PackingInstructions', 'FleetGuide', 'EDIInformation', 'TForceFreightRatingSoftware',
    'CargoClaimsInformation', 'CargoClaimStatus', 'OverchargeClaimInformation',
    'RestrictedGoods/Tobacco', 'RestrictedGoods/Alcohol', 'RestrictedGoods/Hemp',
    'RestrictedGoods/FirearmsandAmmunition', 'Associations', 'TemperatureProtection',
    'Government', 'Freight101', 'EmailTForceFreightCustomerSupport',
    'SpecializedSolutionsRequestForm',
  ].map((route) => '/ltl/apps/' + route),
];

function viewportFromLabel(label) {
  if (!/^\d{3,4}x\d{3,4}$/.test(label)) throw new Error('Invalid viewport ' + label);
  const [width, height] = label.split('x').map(Number);
  return { label, width, height };
}

function safeUrl(value) {
  const url = new URL(value);
  return url.origin + url.pathname;
}

function summarizeText(text) {
  const normalized = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  return {
    characters: text.length,
    words: normalized ? normalized.split(' ').length : 0,
    sha256: createHash('sha256').update(text).digest('hex'),
    normalizedSha256: createHash('sha256').update(normalized).digest('hex'),
  };
}

function buildMatrix(report) {
  const lines = [
    '# TForce Freight visual comparison',
    '',
    `Original: ${report.original}`,
    `Replica: ${report.replica}`,
    `Chrome: ${report.browserVersion}`,
    `Page state: ${report.auditState}`,
    `Captured: ${report.comparable} comparable cases of ${report.tested}`,
    '',
    report.method,
    '',
    '| Route | Viewport | Original (HTTP, state, image) | Replica (HTTP, state, image) | Different | Missing area (px) | Exact visible text |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
  ];
  const outcome = (result) => {
    const size = result.image ? `${result.imageWidth}×${result.imageHeight}` : '—';
    return `${result.httpStatus ?? '—'}, ${result.state}, ${size}`;
  };
  for (const entry of report.cases) {
    const { route, viewport, reference, candidate, comparison } = entry;
    const difference = comparison?.differencePercent;
    const score = Number.isFinite(difference) ? difference.toFixed(3) + '%' : '—';
    const exact = comparison?.comparable ? (comparison.bodyTextExact ? 'yes' : 'no') : '—';
    lines.push(`| \`${route}\` | ${viewport.label} | ${outcome(reference)} | ${outcome(candidate)} | ${score} | ${comparison?.unmatchedAreaPixels ?? '—'} | ${exact} |`);
  }
  return lines.join('\n') + '\n';
}

async function collectDom(page) {
  return page.evaluate(() => {
    const round = (value) => Math.round(value * 100) / 100;
    const inspect = (element) => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        element: element.tagName.toLowerCase(),
        id: element.id || undefined,
        classes: [...element.classList],
        x: round(rect.x),
        y: round(rect.y + scrollY),
        width: round(rect.width),
        height: round(rect.height),
        font: css.fontFamily,
        fontSize: css.fontSize,
        fontWeight: css.fontWeight,
        lineHeight: css.lineHeight,
        letterSpacing: css.letterSpacing,
        color: css.color,
        background: css.backgroundColor,
        margin: css.margin,
        padding: css.padding,
        gap: css.gap,
        border: css.border,
        shadow: css.boxShadow,
      };
    };
    const main = document.querySelector('main, #main-content, #mainContent, [role=main]');
    const primary = [...document.querySelectorAll('h1, h2')].find((element) => {
      const style = getComputedStyle(element);
      return element.getClientRects().length && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    return {
      title: document.title,
      heading: primary?.innerText.trim() || '',
      bodyText: document.body.innerText,
      mainText: main?.innerText || '',
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      fontStatus: document.fonts.status,
      imageCount: document.images.length,
      brokenImages: [...document.images]
        .filter((image) => image.currentSrc && (!image.complete || image.naturalWidth === 0))
        .map((image) => new URL(image.currentSrc).pathname),
      loadedFonts: [...document.fonts]
        .filter((font) => font.status === 'loaded')
        .map((font) => ({ family: font.family, weight: font.weight, style: font.style })),
      counts: Object.fromEntries(['a', 'form', 'input', 'select', 'textarea', 'ul', 'table', 'button', 'iframe'].map(
        (selector) => [selector, document.querySelectorAll(selector).length])),
      layout: [...document.querySelectorAll(
        'header, nav, main, footer, [role=main], h1, h2, form, table, .site-alert, .cookie-notice',
      )].filter((element) => element.getClientRects().length > 0).slice(0, 40).map(inspect),
    };
  });
}

async function openInteraction(page, side, auditState) {
  if (auditState === 'initial') return;
  if (auditState === 'first-field-focus') {
    await page.locator('input:visible:not([type="hidden"]):not([type="submit"]), select:visible, textarea:visible')
      .first().focus({ timeout: 5000 });
    return;
  }
  const control = interactionControls[auditState];
  const target = side === 'original'
    ? page.locator(control.original).filter({ visible: true }).first()
    : page.getByRole('button', { name: control.replica, exact: typeof control.replica === 'string' }).first();
  await target.click({ timeout: 5000 });
  await target.and(page.locator('[aria-expanded="true"]')).waitFor({ timeout: 5000 });
}

async function capture(context, baseUrl, route, file, side, auditState) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedAssets = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && ['font', 'image', 'stylesheet', 'script'].includes(response.request().resourceType())) {
      failedAssets.push({ status: response.status(), url: safeUrl(response.url()) });
    }
  });
  const result = { route, pageErrors, consoleErrors, failedAssets };
  try {
    const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: 'commit', timeout: 65000 });
    result.httpStatus = response?.status() ?? null;
    await page.waitForLoadState('domcontentloaded', { timeout: 45000 });
    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    try {
      await page.waitForLoadState('load', { timeout: 12000 });
    } catch {
      result.loadTimeout = true;
    }
    await page.evaluate(async () => {
      const images = [...document.images].filter((image) => image.loading !== 'lazy');
      await Promise.race([
        Promise.all([document.fonts.ready, ...images.map((image) => image.decode().catch(() => {}))]),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    });
    await openInteraction(page, side, auditState);
    result.finalUrl = safeUrl(page.url());
    const { bodyText, mainText, ...dom } = await collectDom(page);
    Object.assign(result, dom, { bodyText: summarizeText(bodyText), mainText: summarizeText(mainText) });
    const screenshot = await page.screenshot({ path: file, fullPage: true, animations: 'disabled', timeout: 25000 });
    result.image = file;
    result.imageWidth = screenshot.readUInt32BE(16);
    result.imageHeight = screenshot.readUInt32BE(20);
    const unavailable = /^(404|page not found|access denied|request blocked|service unavailable)\b/i;
    if (result.httpStatus < 200 || result.httpStatus >= 300 || unavailable.test(result.heading) || unavailable.test(result.title)) {
      result.state = 'unavailable';
    } else if (new URL(page.url()).origin !== new URL(baseUrl).origin) {
      result.state = 'redirected';
    } else {
      result.state = 'rendered';
    }
  } catch (error) {
    result.state = 'capture-error';
    result.error = String(error.message).split('\n')[0];
  } finally {
    await page.close();
  }
  return result;
}

async function compare(reference, candidate, prefix) {
  if (!reference.image || !candidate.image) return null;
  const width = Math.max(reference.imageWidth, candidate.imageWidth);
  const height = Math.max(reference.imageHeight, candidate.imageHeight);
  const overlapWidth = Math.min(reference.imageWidth, candidate.imageWidth);
  const overlapHeight = Math.min(reference.imageHeight, candidate.imageHeight);
  if (width * height > 24000000) return { error: 'Combined screenshot exceeds the 24 million pixel comparison limit.' };
  const original = PNG.sync.read(await readFile(reference.image));
  const replica = PNG.sync.read(await readFile(candidate.image));
  const originalCanvas = new PNG({ width, height, fill: true });
  const replicaCanvas = new PNG({ width, height, fill: true });
  const diff = new PNG({ width, height });
  const overlay = new PNG({ width, height });
  originalCanvas.data.fill(255);
  replicaCanvas.data.fill(255);
  PNG.bitblt(original, originalCanvas, 0, 0, original.width, original.height, 0, 0);
  PNG.bitblt(replica, replicaCanvas, 0, 0, replica.width, replica.height, 0, 0);
  pixelmatch(originalCanvas.data, replicaCanvas.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: false,
    diffMask: true,
  });
  let mismatched = 0;
  let unmatchedArea = 0;
  let pixelsInUnion = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inOriginal = x < original.width && y < original.height;
      const inReplica = x < replica.width && y < replica.height;
      const index = (y * width + x) * 4;
      if (inOriginal || inReplica) pixelsInUnion++;
      if (inOriginal !== inReplica) {
        unmatchedArea++;
        diff.data[index] = 235;
        diff.data[index + 1] = 160;
        diff.data[index + 2] = 30;
        diff.data[index + 3] = 255;
      } else if (inOriginal && diff.data[index + 3]) {
        mismatched++;
      }
      for (let channel = 0; channel < 3; channel++) {
        overlay.data[index + channel] = Math.round(
          (originalCanvas.data[index + channel] + replicaCanvas.data[index + channel]) / 2,
        );
      }
      overlay.data[index + 3] = 255;
    }
  }
  const diffImage = prefix + '-diff.png';
  const overlayImage = prefix + '-overlay.png';
  await Promise.all([writeFile(diffImage, PNG.sync.write(diff)), writeFile(overlayImage, PNG.sync.write(overlay))]);
  const comparable = reference.state === 'rendered' && candidate.state === 'rendered';
  return {
    comparable,
    diffImage,
    overlayImage,
    overlapPixels: overlapWidth * overlapHeight,
    pixelsInUnion,
    mismatchedOverlapPixels: mismatched,
    unmatchedAreaPixels: unmatchedArea,
    differencePercent: comparable ? (mismatched + unmatchedArea) * 100 / pixelsInUnion : null,
    bodyTextExact: comparable && reference.bodyText.sha256 === candidate.bodyText.sha256,
    mainTextExact: comparable && Boolean(reference.mainText.characters)
      && reference.mainText.sha256 === candidate.mainText.sha256,
  };
}

const original = process.env.TFORCE_ORIGINAL || 'https://www.tforcefreight.com';
const replica = process.env.TFORCE_REPLICA || 'https://tforcefreight-web-production.up.railway.app';
const auditState = process.env.TFORCE_AUDIT_STATE || 'initial';
if (!['initial', 'first-field-focus', ...Object.keys(interactionControls)].includes(auditState)) {
  throw new Error('Unsupported audit state: ' + auditState);
}
const viewports = (process.env.TFORCE_VIEWPORTS?.split(',') || defaultViewports).map(viewportFromLabel);
const specifiedRoutes = process.env.TFORCE_ROUTES_FILE
  ? (await readFile(process.env.TFORCE_ROUTES_FILE, 'utf8')).split(/\r?\n/).filter((line) => line.startsWith('/'))
  : process.argv.slice(3);
const excludedRoutes = process.env.TFORCE_EXCLUDE_ROUTES?.split(',') || [];
const routes = [...new Set(specifiedRoutes.length ? specifiedRoutes : defaultRoutes)]
  .filter((route) => !excludedRoutes.includes(route));
const outDir = resolve(process.argv[2] || 'test-results/visual-audit');
const concurrency = Number(process.env.TFORCE_AUDIT_WORKERS || 3);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
  throw new Error('TFORCE_AUDIT_WORKERS must be an integer from 1 to 8');
}
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.TFORCE_CHROME_CHANNEL ? { channel: process.env.TFORCE_CHROME_CHANNEL } : {}),
});
const browserVersion = browser.version();
const queue = routes.flatMap((route, routeIndex) => viewports.map((viewport) => ({ route, routeIndex, viewport })));
const cases = [];
const startedAt = new Date().toISOString();
try {
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const { route, routeIndex, viewport } = queue.shift();
      const slug = route.split('/').filter(Boolean).at(-1)?.replace(/[^a-zA-Z0-9-]/g, '-') || 'home';
      const prefix = resolve(outDir, String(routeIndex).padStart(2, '0') + '-' + slug + '-' + viewport.label);
      const settings = {
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1, locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce',
      };
      const referenceContext = await browser.newContext(settings);
      const candidateContext = await browser.newContext(settings);
      try {
        const [reference, candidate] = await Promise.all([
          capture(referenceContext, original, route, prefix + '-original.png', 'original', auditState),
          capture(candidateContext, replica, route, prefix + '-replica.png', 'replica', auditState),
        ]);
        let comparison;
        try {
          comparison = await compare(reference, candidate, prefix);
        } catch (error) {
          comparison = { comparable: false, error: String(error.message).split('\n')[0] };
        }
        const record = { route, viewport, reference, candidate, comparison };
        cases.push(record);
        await writeFile(prefix + '.json', JSON.stringify(record, null, 2) + '\n');
        const difference = comparison?.differencePercent;
        console.log(route, viewport.label, reference.state, candidate.state,
          Number.isFinite(difference) ? difference.toFixed(3) + '% different' : 'not comparable');
      } finally {
        await Promise.all([referenceContext.close(), candidateContext.close()]);
      }
    }
  }));
} finally {
  await browser.close();
}
const report = {
  original,
  replica,
  startedAt,
  finishedAt: new Date().toISOString(),
  browserVersion,
  auditState,
  method: 'Full-page Playwright PNGs, 1× scale, pixelmatch threshold 0.1 with antialiasing excluded; unmatched image area counts as different.',
  tested: cases.length,
  comparable: cases.filter((record) => record.comparison?.comparable).length,
  cases: cases.sort((first, second) => routes.indexOf(first.route) - routes.indexOf(second.route)
    || viewports.indexOf(first.viewport) - viewports.indexOf(second.viewport)),
};
await Promise.all([
  writeFile(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n'),
  writeFile(resolve(outDir, 'matrix.md'), buildMatrix(report)),
]);
console.log('Report:', resolve(outDir, 'report.json'));
