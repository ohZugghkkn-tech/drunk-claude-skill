'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  buildPrompt,
  normalizeIntensity,
  moodMap,
  drinkMap,
  DEFAULT_REQUEST,
} = require('../prompt-builder');

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

test('leere Eingabe liefert die dokumentierten Defaults', () => {
  const r = parseArgs('');
  assert.equal(r.intensity, 0.5);
  assert.equal(r.mood, 'chaotic');
  assert.equal(r.drink, 'beer');
  assert.ok(r.text.length > 0, 'Fallback-Request-Text muss gesetzt sein');
});

test('parseArgs stuerzt bei Nicht-String-Eingaben nicht ab', () => {
  for (const input of [null, undefined, 42, {}, []]) {
    assert.doesNotThrow(() => parseArgs(input));
  }
});

// ---------------------------------------------------------------------------
// Flag-Parsing
// ---------------------------------------------------------------------------

test('lange Flags mit Leerzeichen und mit "="', () => {
  assert.deepEqual(parseArgs('--intensity 0.7 --mood flirty --drink wine idee').intensity, 0.7);
  assert.equal(parseArgs('--intensity 0.7 --mood flirty --drink wine idee').mood, 'flirty');
  assert.equal(parseArgs('--intensity 0.7 --mood flirty --drink wine idee').drink, 'wine');
  assert.equal(parseArgs('--intensity=0.7 --mood=flirty --drink=wine idee').intensity, 0.7);
  assert.equal(parseArgs('--intensity=0.7 --mood=flirty --drink=wine idee').mood, 'flirty');
  assert.equal(parseArgs('--intensity=0.7 --mood=flirty --drink=wine idee').drink, 'wine');
});

test('kurze Flags -i/-m/-d funktionieren', () => {
  const r = parseArgs('-i 0.9 -m melancholy -d absinthe idee');
  assert.equal(r.intensity, 0.9);
  assert.equal(r.mood, 'melancholy');
  assert.equal(r.drink, 'absinthe');
});

test('kurzes Flag mit "=" wird ebenfalls geparst (-i=0.9)', () => {
  const r = parseArgs('-i=0.9 idee');
  assert.equal(r.intensity, 0.9, 'Kurz-Alias mit "=" darf nicht in den User-Text fallen');
  assert.equal(r.text, 'idee');
});

test('Flags sind case-insensitiv', () => {
  const r = parseArgs('--INTENSITY 0.8 --MOOD Aggressive --DRINK Whiskey text');
  assert.equal(r.intensity, 0.8);
  assert.equal(r.mood, 'aggressive');
  assert.equal(r.drink, 'whiskey');
});

test('Positionsargument-Intensitaet (dokumentiert: 0.2 / 0.5 / 0.8 / 1.0)', () => {
  assert.equal(parseArgs('0.2 text').intensity, 0.2);
  assert.equal(parseArgs('0.5 text').intensity, 0.5);
  assert.equal(parseArgs('0.8 text').intensity, 0.8);
  assert.equal(parseArgs('1.0 text').intensity, 1);
  assert.equal(parseArgs('.8 text').intensity, 0.8);
});

test('ganzzahlige Positionswerte bleiben Text (nur Dezimalnotation ist Intensitaet)', () => {
  const r = parseArgs('1 idea for a habit app');
  assert.equal(r.intensity, 0.5);
  assert.equal(r.text, '1 idea for a habit app');
});

// ---------------------------------------------------------------------------
// Zahlen im Fliesstext duerfen NICHT als Intensitaet interpretiert werden
// ---------------------------------------------------------------------------

test('Zahlen im User-Text bleiben im User-Text (Bug: "3 ideas" -> Blackout)', () => {
  const r = parseArgs('I need 3 ideas for a habit app');
  assert.equal(r.intensity, 0.5, 'eine Zahl im Satz darf die Intensitaet nicht veraendern');
  assert.equal(r.text, 'I need 3 ideas for a habit app');
});

test('Jahreszahlen und Mengen im Text bleiben erhalten', () => {
  const r = parseArgs('Top 10 ideas for 2024');
  assert.equal(r.intensity, 0.5);
  assert.equal(r.text, 'Top 10 ideas for 2024');
});

test('"give me 5 wild ideas" verliert die 5 nicht', () => {
  const r = parseArgs('give me 5 wild ideas');
  assert.equal(r.intensity, 0.5);
  assert.equal(r.text, 'give me 5 wild ideas');
});

// ---------------------------------------------------------------------------
// Slash-Kommandos
// ---------------------------------------------------------------------------

test('/drunk wird als Kommando entfernt', () => {
  const r = parseArgs('/drunk 0.8 --mood aggressive text');
  assert.equal(r.intensity, 0.8);
  assert.equal(r.text, 'text');
});

test('/drunk-genius wird vollstaendig entfernt (Bug: "-genius" bleibt im Text)', () => {
  const r = parseArgs('/drunk-genius 0.8 --mood aggressive text');
  assert.equal(r.text, 'text');
});

test('/drunk-genuis (Tippfehler-Variante) wird vollstaendig entfernt', () => {
  const r = parseArgs('/drunk-genuis 0.8 text');
  assert.equal(r.text, 'text');
});

// ---------------------------------------------------------------------------
// README "Quick usage" muss vom Parser verstanden werden
// ---------------------------------------------------------------------------

test('README-Quick-Usage (/intensity ... /mood ... /drink ...) wird geparst', () => {
  const request = 'I need ideas for a health app that feels emotionally addictive without being manipulative.';
  const r = parseArgs(`/intensity 0.6 /mood chaotic /drink whiskey ${request}`);
  assert.equal(r.intensity, 0.6);
  assert.equal(r.mood, 'chaotic');
  assert.equal(r.drink, 'whiskey', 'README-Doku nutzt /drink <wert>, das muss ankommen');
  assert.equal(r.text, request, 'Slash-Flags duerfen nicht in den User-Text lecken');
});

// ---------------------------------------------------------------------------
// normalizeIntensity
// ---------------------------------------------------------------------------

test('normalizeIntensity clampt auf 0.1 - 1.0', () => {
  assert.equal(normalizeIntensity(0.55), 0.55);
  assert.equal(normalizeIntensity(0.999), 1);
  assert.equal(normalizeIntensity(5), 1);
  assert.equal(normalizeIntensity(0), 0.1);
  assert.equal(normalizeIntensity(-1), 0.1);
  assert.equal(normalizeIntensity(NaN), 0.5);
  assert.equal(normalizeIntensity(Infinity), 1);
  assert.equal(normalizeIntensity(-Infinity), 0.1);
  assert.equal(normalizeIntensity(undefined), 0.5);
});

test('normalizeIntensity akzeptiert numerische Strings', () => {
  assert.equal(normalizeIntensity('0.7'), 0.7, 'String-Eingaben sollten nicht still auf 0.5 fallen');
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------

test('buildPrompt enthaelt Parameter, Regeln und User-Request', () => {
  const p = buildPrompt('0.8 --mood philosophical --drink whiskey Ideen fuer eine Habit-App');
  assert.match(p, /^You are Drunk Genius/m);
  assert.match(p, /^Intensity: 0\.8$/m);
  assert.match(p, /^Mood: philosophical$/m);
  assert.match(p, /^Drink: whiskey$/m);
  assert.match(p, /Ideen fuer eine Habit-App$/);
  assert.match(p, /Do not produce medical, legal, or safety-critical advice/);
});

test('buildPrompt nutzt das Getraenk-Emoji korrekt', () => {
  assert.match(buildPrompt('--drink wine x'), /🍷/);
  assert.match(buildPrompt('--drink absinthe x'), /🧚/);
  assert.doesNotMatch(buildPrompt('--drink wine x'), /🥃/);
});

test('buildPrompt Anzahl Ideen + Header passen zu den Intensitaets-Baendern', () => {
  // Werte als Strings, damit "1.0" nicht zu "1" verkuerzt wird.
  const bands = [
    ['0.1', 2, 'SLIGHTLY TIPSY GENIUS THOUGHTS'],
    ['0.29', 2, 'SLIGHTLY TIPSY GENIUS THOUGHTS'],
    ['0.3', 2, 'DRUNK GENIUS BREAKTHROUGHS'],
    ['0.5', 3, 'DRUNK GENIUS BREAKTHROUGHS'],
    ['0.7', 4, 'DRUNK GENIUS BREAKTHROUGHS'],
    ['0.9', 5, 'BLACKOUT GENIUS'],
    ['1.0', 5, 'BLACKOUT GENIUS'],
  ];
  for (const [intensity, expectedCount, header] of bands) {
    const p = buildPrompt(`${intensity} request`);
    const placeholders = (p.match(/\[idea \d+/g) || []).length;
    assert.equal(placeholders, expectedCount, `Intensitaet ${intensity} => ${expectedCount} Ideen`);
    assert.match(p, new RegExp(header));
    const reasons = (p.match(/\*why it's not stupid:\*/g) || []).length;
    assert.equal(reasons, expectedCount, 'jede Idee braucht eine Begruendungszeile');
  }
});

test('buildPrompt gibt bei Intensitaet >= 0.7 Techniken mit (SKILL.md Abschnitt 3)', () => {
  const techniqueSlugs = [
    'hold-my-beer', '3am-diner', 'drunk-uncle', 'beer-goggles',
    'what-if-but-wrong', 'last-call', 'karaoke', 'bar-fight',
  ];
  const p = buildPrompt('0.7 request');
  const hits = techniqueSlugs.filter((slug) => p.includes(slug));
  assert.ok(hits.length >= 2, `bei 0.7 muessen 2 Techniken geroutet werden, gefunden: ${hits.length}`);

  const pBlackout = buildPrompt('1.0 request');
  const blackoutHits = techniqueSlugs.filter((slug) => pBlackout.includes(slug));
  assert.ok(blackoutHits.length >= 3, 'bei 1.0 muessen mehrere Techniken kombiniert werden');
});

test('buildPrompt ist deterministisch und ohne Emoji-Duplikate im Header', () => {
  const a = buildPrompt('0.5 test');
  const b = buildPrompt('0.5 test');
  assert.equal(a, b);
  const header = a.split('\n').find((line) => line.includes('DRUNK GENIUS'));
  assert.equal((header.match(/🍺/g) || []).length, 1);
});

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

test('die Tabellen enthalten genau die dokumentierten Werte', () => {
  assert.deepEqual(Object.keys(moodMap).sort(), ['aggressive', 'chaotic', 'flirty', 'melancholy', 'philosophical']);
  assert.deepEqual(Object.keys(drinkMap).sort(), ['absinthe', 'beer', 'cocktail', 'whiskey', 'wine']);
});

test('leere Eingabe erzeugt trotzdem einen Prompt mit Request', () => {
  const prompt = buildPrompt('');
  assert.ok(prompt.includes(DEFAULT_REQUEST), 'buildPrompt("") darf keinen leeren User-Request ausgeben');
  assert.match(prompt, /^User request:\n\S/m);
});
