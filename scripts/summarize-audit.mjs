import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const [destination, ...inputs] = process.argv.slice(2);
const separator = inputs.indexOf('--after');
const baselinePaths = inputs.slice(0, separator < 0 ? inputs.length : separator);
const deployedPaths = separator < 0 ? [] : inputs.slice(separator + 1);
if (!destination || !baselinePaths.length) {
  throw new Error('Usage: node scripts/summarize-audit.mjs matrix.md baseline-dir [baseline-dir ...] [--after deployed-dir ...]');
}

async function collect(directories) {
  const routes = new Map();
  for (const directory of directories) {
    for (const name of await readdir(directory)) {
      if (!name.endsWith('.json') || name === 'report.json') continue;
      const entry = JSON.parse(await readFile(resolve(directory, name), 'utf8'));
      if (!entry.route || !entry.viewport || !entry.reference || !entry.candidate) continue;
      const route = routes.get(entry.route) || new Map();
      route.set(entry.viewport.label, entry);
      routes.set(entry.route, route);
    }
  }
  return routes;
}

function ranges(entries) {
  if (!entries?.size) return '—';
  const scores = [...entries.values()].map((entry) => entry.comparison?.differencePercent).filter(Number.isFinite);
  if (!scores.length) return `0/${entries.size} comparable`;
  const min = Math.min(...scores).toFixed(2);
  const max = Math.max(...scores).toFixed(2);
  return `${min}–${max}% (${scores.length}/${entries.size})`;
}

function issues(entries) {
  const cases = entries ? [...entries.values()] : [];
  const flags = [];
  if (cases.some(({ reference }) => reference.state !== 'rendered')) {
    flags.push('Review reference status or redirect before scoring.');
  }
  if (cases.some(({ reference, candidate }) => reference.state === 'rendered' && candidate.state !== 'rendered')) {
    flags.push('P0: Restore missing candidate route or document its official destination.');
  }
  if (cases.some(({ candidate }) => candidate.scrollWidth > candidate.width)) {
    flags.push('P1: Remove horizontal overflow at the affected widths.');
  }
  if (cases.some(({ candidate }) => candidate.pageErrors?.length || candidate.brokenImages?.length)) {
    flags.push('P1: Resolve runtime or image failures in the case JSON.');
  }
  if (cases.some(({ reference, candidate, comparison }) => comparison?.comparable
    && reference.counts?.input !== candidate.counts?.input)) {
    flags.push('P1: Compare public form structure and available fields.');
  }
  if (cases.some(({ comparison }) => comparison?.comparable && !comparison.bodyTextExact)) {
    flags.push('P2: Compare visible copy, ordering and layout using the pair.');
  }
  return flags.join(' ') || '—';
}

function evidence(entries) {
  if (!entries?.size) return '—';
  const entry = entries.get('1440x900') || entries.values().next().value;
  return ['original', 'replica', 'diff', 'overlay'].map((label, index) => {
    const file = [entry.reference.image, entry.candidate.image, entry.comparison?.diffImage, entry.comparison?.overlayImage][index];
    return file ? `[${label}](${encodeURI(relative(dirname(resolve(destination)), file))})` : null;
  }).filter(Boolean).join(' · ') || '—';
}

const [baseline, deployed] = await Promise.all([collect(baselinePaths), collect(deployedPaths)]);
const routes = new Set([...baseline.keys(), ...deployed.keys()]);
const rows = [
  '# TForce Freight Difference Matrix',
  '',
  'Ranges show the lowest and highest measured full-page pixel mismatch across the tested viewports. Each mismatch percentage includes unmatched capture area. Ratios show comparable cases over attempted cases. An unavailable or redirected capture has no score. Individual JSON records include computed dimensions and typography.',
  '',
  '| Route | Baseline visual difference | Deployed visual difference | Evidence, baseline | Evidence, deployed | Findings and repair targets |',
  '| --- | --- | --- | --- | --- | --- |',
];
for (const route of [...routes].sort()) {
  const before = baseline.get(route);
  const after = deployed.get(route);
  rows.push(`| \`${route}\` | ${ranges(before)} | ${ranges(after)} | ${evidence(before)} | ${evidence(after)} | ${issues(after || before)} |`);
}
await writeFile(destination, rows.join('\n') + '\n');
console.log(destination, routes.size + ' routes');
