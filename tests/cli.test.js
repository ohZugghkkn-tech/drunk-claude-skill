'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, { cwd: ROOT, encoding: 'utf8' });
}

const PYTHON_AVAILABLE = run('python3', ['--version']).status === 0;

test('CLI: node prompt-builder.js nutzt das Argument aus argv', () => {
  const result = run('node', ['prompt-builder.js', '0.8', '--mood', 'aggressive', '--drink', 'whiskey', 'Ideen fuer Remote-Teams']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Intensity: 0\.8$/m);
  assert.match(result.stdout, /^Mood: aggressive$/m);
  assert.match(result.stdout, /^Drink: whiskey$/m);
  assert.match(result.stdout, /Ideen fuer Remote-Teams$/m);
  assert.match(result.stdout, /references\/moods\/aggressive\.md/);
});

test('CLI: node prompt-builder.js faellt ohne Argumente auf das Sample zurueck', () => {
  const result = run('node', ['prompt-builder.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^User request:\n\S/m);
  assert.match(result.stdout, /I need weird but useful ideas for a habit app/);
});

test('CLI: node validator.js akzeptiert sein Sample', () => {
  const result = run('node', ['validator.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid: true/);
  assert.match(result.stdout, /errors: \[\]/);
});

test('Beispiel: examples/node-usage.js laeuft durch', () => {
  const result = run('node', ['examples/node-usage.js']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRUNK GENIUS BREAKTHROUGHS/);
});

test('Beispiel: examples/python-usage.py laeuft durch', { skip: PYTHON_AVAILABLE ? false : 'python3 nicht installiert' }, () => {
  const result = run('python3', ['examples/python-usage.py']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Intensity: 0\.6$/m);
  assert.match(result.stdout, /^Drink: cocktail$/m);
});

test('Modul-Exporte sind intakt', () => {
  const builder = require('../prompt-builder');
  for (const name of ['parseArgs', 'buildPrompt', 'normalizeIntensity', 'moodMap', 'drinkMap', 'validMoods', 'validDrinks', 'TECHNIQUES']) {
    assert.ok(builder[name] !== undefined, `prompt-builder exportiert ${name} nicht`);
  }
  const validator = require('../validator');
  for (const name of ['validateIdeaOutput', 'normalizeWhitespace']) {
    assert.ok(validator[name] !== undefined, `validator exportiert ${name} nicht`);
  }
});
