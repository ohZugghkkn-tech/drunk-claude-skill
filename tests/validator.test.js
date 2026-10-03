'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateIdeaOutput, normalizeWhitespace } = require('../validator');

const EMOJI = '🥃';
const HEADER_MID = `${EMOJI} DRUNK GENIUS BREAKTHROUGHS:`;
const HEADER_LOW = '🍺 SLIGHTLY TIPSY GENIUS THOUGHTS:';
const HEADER_HIGH = `${EMOJI} BLACKOUT GENIUS — I DON'T REMEMBER WRITING THIS:`;

function makeOutput(ideaCount, header = HEADER_MID, reason = 'Because the idea actually removes a step instead of adding one.') {
  const blocks = Array.from({ length: ideaCount }, (_, i) =>
    `${EMOJI} [idea ${i + 1} — sharp, funny, oddly insightful]\n   *why it's not stupid:* ${reason}`
  );
  return `${header}\n\n${blocks.join('\n\n')}\n`;
}

// ---------------------------------------------------------------------------
// Gueltige Ausgaben
// ---------------------------------------------------------------------------

test('das eingebaute Demo-Sample des Validators ist gueltig', () => {
  const sample = `${EMOJI} DRUNK GENIUS BREAKTHROUGHS:

${EMOJI} [idea one — sharp, funny, oddly insightful]
   *why it's not stupid:* People pay more attention when a product feels like a secret friend, not a chore.

${EMOJI} [idea two — sharp, funny, oddly insightful]
   *why it's not stupid:* If the app changes with the user's mood, it stops feeling like software and starts feeling like a companion.
`;
  const result = validateIdeaOutput(sample);
  assert.equal(result.valid, true, `Demo-Sample muss gueltig sein, Fehler: ${JSON.stringify(result.errors)}`);
  assert.deepEqual(result.errors, []);
});

test('Low-Intensity-Format mit 2 Ideen (Builder-Output bei < 0.4) ist gueltig', () => {
  const result = validateIdeaOutput(makeOutput(2, HEADER_LOW));
  assert.equal(result.valid, true, `2-Ideen-Format wird abgelehnt: ${JSON.stringify(result.errors)}`);
});

test('Standardformat mit 3 Ideen ist gueltig', () => {
  const result = validateIdeaOutput(makeOutput(3));
  assert.equal(result.valid, true, `3-Ideen-Format wird abgelehnt: ${JSON.stringify(result.errors)}`);
});

test('Blackout-Format mit 5 Ideen ist gueltig', () => {
  const result = validateIdeaOutput(makeOutput(5, HEADER_HIGH));
  assert.equal(result.valid, true, `5-Ideen-Format wird abgelehnt: ${JSON.stringify(result.errors)}`);
  assert.equal(result.ideaCount, 5);
});

test('Variante "it is not stupid" wird akzeptiert', () => {
  const out = makeOutput(3).replace(/\*why it's not stupid:\*/g, '*why it is not stupid:*');
  assert.equal(validateIdeaOutput(out).valid, true);
});

test('Ideen-Marker mit normalem Bindestrich werden akzeptiert (LLM-Varianz)', () => {
  const out = makeOutput(3).replace(/—/g, '-');
  assert.equal(validateIdeaOutput(out).valid, true, 'einzelner Bindestrich statt Em-Dash darf nicht scheitern');
});

// ---------------------------------------------------------------------------
// Ungueltige Ausgaben
// ---------------------------------------------------------------------------

test('leerer Output ist ungueltig', () => {
  const r = validateIdeaOutput('');
  assert.equal(r.valid, false);
  assert.equal(r.ideaCount, 0);
  assert.equal(r.headerDetected, false);
});

test('zu kurzer Output ist ungueltig', () => {
  assert.equal(validateIdeaOutput('too short').valid, false);
});

test('fehlender Header ist ungueltig', () => {
  const r = validateIdeaOutput(makeOutput(3).replace(HEADER_MID, 'SOME OTHER HEADER:'));
  assert.equal(r.valid, false);
  assert.equal(r.headerDetected, false);
});

test('fehlendes Getraenk-Emoji ist ungueltig', () => {
  const out = makeOutput(3).replace(/🥃/g, '');
  assert.equal(validateIdeaOutput(out).valid, false);
});

test('generische Buzzword-Ausgabe ist ungueltig', () => {
  const out = `${HEADER_MID}\n\n${EMOJI} [add gamification to optimize engagement]\n   *why it's not stupid:* Synergistic leverage of data-driven insights.`;
  assert.equal(validateIdeaOutput(out).valid, false);
});

test('zu wenige Begruendungszeilen sind ungueltig', () => {
  const out = `${HEADER_MID}\n\n${EMOJI} [idea 1 — sharp, funny, oddly insightful]\n   *why it's not stupid:* Only one reason here.`;
  assert.equal(validateIdeaOutput(out).valid, false);
});

test('reframte Buzzwords sind erlaubt (SKILL.md 4.2: "unless they are reframed")', () => {
  const out = makeOutput(3) + `\n${EMOJI} [add gamification, but only as a punishment for the people who demanded gamification]\n   *why it's not stupid:* The reframe turns a growth hack into a statement.\n`;
  const r = validateIdeaOutput(out);
  assert.equal(r.valid, true, 'reframte Buzzwords werden als generisch abgelehnt (False Positive)');
});

// ---------------------------------------------------------------------------
// API-Form
// ---------------------------------------------------------------------------

test('Rueckgabeobjekt hat immer dieselben Felder (auch im Frueh-Ausgang)', () => {
  const keys = ['valid', 'errors', 'ideaCount', 'headerDetected', 'emojiCount'];
  for (const input of ['', 'x', makeOutput(3)]) {
    const r = validateIdeaOutput(input);
    for (const key of keys) {
      assert.ok(Object.hasOwn(r, key), `Feld "${key}" fehlt fuer Input ${JSON.stringify(input.slice(0, 12))}`);
    }
  }
});

test('validateIdeaOutput stuerzt bei Nicht-String-Eingaben nicht ab', () => {
  for (const input of [null, undefined, 42, {}, []]) {
    assert.doesNotThrow(() => validateIdeaOutput(input));
    assert.equal(validateIdeaOutput(input).valid, false);
  }
});

test('normalizeWhitespace normalisiert', () => {
  assert.equal(normalizeWhitespace('  a\n\t b   c '), 'a b c');
  assert.equal(normalizeWhitespace(null), '');
  assert.equal(normalizeWhitespace(undefined), '');
});
