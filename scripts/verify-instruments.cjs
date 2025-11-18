#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

function parseBackend(fileContent) {
  const objMatch = fileContent.match(/const\s+INSTRUMENT_CONFIG\s*=\s*\{([\s\S]*?)\n\};/m);
  if (!objMatch) return [];
  const body = objMatch[1];
  const lines = body.split(/\n/);
  const keys = [];
  const topKeyRegex = /^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_]+))\s*:\s*\{/;
  for (const line of lines) {
    const m = line.match(topKeyRegex);
    if (m) {
      keys.push(m[1] || m[2] || m[3]);
    }
  }
  return keys.sort();
}

function parseInstrumentSelection(fileContent) {
  const names = [];
  const nameRegex = /name:\s*'([^']+)'/g;
  let m;
  while ((m = nameRegex.exec(fileContent)) !== null) {
    names.push(m[1]);
  }
  return Array.from(new Set(names)).sort();
}

function parseResultsOptions(fileContent) {
  const arrMatch = fileContent.match(/const\s+INSTRUMENTS_OPTIONS\s*=\s*\[([\s\S]*?)\];/m);
  if (!arrMatch) return [];
  const body = arrMatch[1];
  const strRegex = /'([^']+)'/g;
  const names = [];
  let m;
  while ((m = strRegex.exec(body)) !== null) {
    names.push(m[1]);
  }
  return names.sort();
}

function diff(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const onlyA = a.filter(x => !sb.has(x));
  const onlyB = b.filter(x => !sa.has(x));
  return { onlyA, onlyB };
}

try {
  const backendPath = 'backend/src/adapters/nextjs-adapter.js';
  const instSelPath = 'frontend/src/components/InstrumentSelectionScreen.tsx';
  const resultsPath = 'frontend/src/components/ResultsScreen.tsx';

  const backend = read(backendPath);
  const instSel = read(instSelPath);
  const results = read(resultsPath);

  const backendNames = parseBackend(backend);
  // Ignore internal/default keys that are not real instruments
  const backendNamesFiltered = backendNames.filter(n => n !== 'Other');
  const instSelNames = parseInstrumentSelection(instSel);
  const resultsNames = parseResultsOptions(results);

  const frontendNames = Array.from(new Set([...instSelNames, ...resultsNames])).sort();

  console.log('Backend instruments:', backendNamesFiltered.length);
  console.log(backendNamesFiltered.join(', '));
  console.log('\nFrontend instruments (combined):', frontendNames.length);
  console.log(frontendNames.join(', '));

  const bvsf = diff(backendNamesFiltered, frontendNames);
  const fvsb = diff(frontendNames, backendNamesFiltered);

  let ok = true;
  if (bvsf.onlyA.length) {
    console.error('\nInstruments present in backend but missing in frontend:');
    bvsf.onlyA.forEach(n => console.error('  -', n));
    ok = false;
  }
  if (fvsb.onlyA.length) {
    console.error('\nInstruments present in frontend but missing in backend:');
    fvsb.onlyA.forEach(n => console.error('  -', n));
    ok = false;
  }

  if (ok) {
    console.log('\n✅ Instrument lists are synchronized between backend and frontend.');
    process.exit(0);
  } else {
    console.error('\n❌ Instrument mismatch detected. Please sync names exactly. See .github/copilot-instructions.md for guidance.');
    process.exit(2);
  }
} catch (err) {
  console.error('Error verifying instruments:', err);
  process.exit(3);
}
