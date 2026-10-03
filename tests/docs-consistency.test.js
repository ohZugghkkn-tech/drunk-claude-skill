'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const skillMd = read('SKILL.md');
const readme = read('README.md');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const genericExample = read('examples/generic-llm.md');

// ---------------------------------------------------------------------------
// Versionen
// ---------------------------------------------------------------------------

function majorMinor(version) {
  const [major, minor = '0'] = String(version).split('.');
  return `${Number(major)}.${Number(minor)}`;
}

test('SKILL.md, manifest.json und package.json haben dieselbe Version', () => {
  const skillVersion = skillMd.match(/^version:\s*(\S+)\s*$/m)[1];
  assert.equal(majorMinor(manifest.version), majorMinor(skillVersion), 'manifest.json-Version weicht von SKILL.md ab');
  assert.equal(majorMinor(pkg.version), majorMinor(skillVersion), 'package.json-Version weicht von SKILL.md ab');
});

// ---------------------------------------------------------------------------
// Manifest / README Vollstaendigkeit
// ---------------------------------------------------------------------------

test('manifest.json listet alle ausgelieferten JS-Module', () => {
  const modules = fs.readdirSync(ROOT).filter((f) => f.endsWith('.js'));
  for (const mod of modules) {
    assert.ok(manifest.files.includes(mod), `manifest.files fehlt: ${mod}`);
  }
  assert.ok(manifest.files.includes('references'));
  assert.ok(manifest.files.includes('examples'));
});

test('README "What\'s inside" erwaehnt alle Top-Level-Module', () => {
  for (const mod of ['prompt-builder.js', 'validator.js']) {
    assert.ok(readme.includes(mod), `README erwaehnt ${mod} nicht`);
  }
});

test('main-Eintraege zeigen auf existierende Dateien', () => {
  assert.ok(fs.existsSync(path.join(ROOT, manifest.main)));
  assert.ok(fs.existsSync(path.join(ROOT, pkg.main)));
});

// ---------------------------------------------------------------------------
// Referenzen: Dateien <-> Doku
// ---------------------------------------------------------------------------

test('alle in README/SKILL.md referenzierten Pfade existieren', () => {
  const refs = new Set();
  for (const doc of [readme, skillMd]) {
    for (const m of doc.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|js))`/g)) refs.add(m[1]);
    for (const m of doc.matchAll(/`(references\/[A-Za-z0-9_./-]+\/)`/g)) refs.add(m[1]);
  }
  for (const rel of refs) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `referenzierter Pfad fehlt: ${rel}`);
  }
});

test('SKILL.md Mood-Liste == Mood-Dateien', () => {
  const documented = skillMd
    .slice(skillMd.indexOf('Accepted moods:'), skillMd.indexOf('Default: chaotic'))
    .match(/^-\s*(\w+)$/gm)
    .map((l) => l.replace('-', '').trim())
    .sort();
  const files = fs.readdirSync(path.join(ROOT, 'references/moods'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''))
    .sort();
  assert.deepEqual(documented, files);
});

test('SKILL.md Technik-Routing == Technik-Dateien', () => {
  const documented = [...skillMd.matchAll(/->\s*`([a-z0-9-]+)`/g)].map((m) => m[1]).sort();
  const files = fs.readdirSync(path.join(ROOT, 'references/techniques'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''))
    .sort();
  assert.deepEqual(documented, files);
});

test('jede Technik-Datei hat die vier Pflichtabschnitte', () => {
  const dir = path.join(ROOT, 'references/techniques');
  for (const file of fs.readdirSync(dir)) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const section of ['## When to use', '## Method', '## Example', '## Why it works']) {
      assert.ok(content.includes(section), `${file} fehlt: ${section}`);
    }
  }
});

test('jede Mood-Datei hat Voice/Best for/Example shift', () => {
  const dir = path.join(ROOT, 'references/moods');
  for (const file of fs.readdirSync(dir)) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const section of ['## Voice', '## Best for', '## Example shift']) {
      assert.ok(content.includes(section), `${file} fehlt: ${section}`);
    }
  }
});

test('SKILL.md nennt genau die acht dokumentierten Techniken in der Routing-Tabelle', () => {
  const routed = [...skillMd.matchAll(/->\s*`([a-z0-9-]+)`/g)];
  assert.equal(routed.length, 8, 'SKILL.md Routing-Tabelle muss 8 Techniken nennen');
  assert.equal(new Set(routed.map((m) => m[1])).size, 8, 'keine Technik darf doppelt sein');
});

// ---------------------------------------------------------------------------
// Beispiel-Dokumente vs. Code
// ---------------------------------------------------------------------------

test('examples/generic-llm.md nennt dieselbe Ideen-Anzahl wie der Builder', () => {
  const { buildPrompt } = require('../prompt-builder');
  const intensity = Number(genericExample.match(/-\s*intensity:\s*([\d.]+)/)[1]);
  const claimed = Number(genericExample.match(/Generate\s+(\d+)\s+creative ideas/)[1]);
  const built = (buildPrompt(`${intensity} test`).match(/\[idea \d+/g) || []).length;
  assert.equal(claimed, built, `Doku sagt ${claimed} Ideen bei Intensitaet ${intensity}, Builder liefert ${built}`);
});

test('README Output-Format entspricht dem Builder-Standardformat', () => {
  const { buildPrompt } = require('../prompt-builder');
  const defaultPrompt = buildPrompt('0.5 test');
  assert.ok(readme.includes('DRUNK GENIUS BREAKTHROUGHS:'), 'README muss den Standard-Header zeigen');
  assert.equal((defaultPrompt.match(/\[idea \d+/g) || []).length, 3, 'Default (0.5) muss 3 Ideen anfordern');
  // README zeigt die drei strukturbildenden Zeilen des Formats.
  const readmeBlocks = (readme.match(/\*why it's not stupid:\*/g) || []).length;
  assert.equal(readmeBlocks, 3, 'README-Beispiel muss 3 Ideen-Bloecke zeigen');
});

test('README dokumentiert die acht Techniken und fuenf Moods korrekt', () => {
  assert.match(readme, /eight techniques/);
  assert.match(readme, /five distinct creative moods/);
});

// ---------------------------------------------------------------------------
// Lizenz
// ---------------------------------------------------------------------------

test('LICENSE ist MIT und manifest.setzt MIT', () => {
  assert.match(read('LICENSE'), /^MIT License/);
  assert.equal(manifest.license, 'MIT');
  assert.equal(pkg.license, 'MIT');
});
