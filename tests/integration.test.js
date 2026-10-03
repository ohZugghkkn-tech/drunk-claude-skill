'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPrompt } = require('../prompt-builder');
const { validateIdeaOutput } = require('../validator');

/**
 * Simuliert das, was das LLM laut Prompt-Vertrag tun soll:
 * Platzhalter im Builder-Output werden mit echten Ideen gefuellt.
 */
function fillTemplate(prompt) {
  const usedEmoji = (prompt.match(/[\u{1F37A}\u{1F377}\u{1F943}\u{1F378}\u{1F9DA}]/u) || ['\u{1F943}'])[0];
  const headerLine = prompt.split('\n').find((l) => /(GENIUS|TIPSY)/.test(l));
  const reasons = [
    'Because removing the step is cheaper than optimizing it.',
    'The weird version is faster to build than the safe version.',
    'Users forgive strange if the payoff arrives in the same session.',
    'The idea turns a hidden cost into a visible badge of honor.',
    'Nobody remembers a feature, everybody remembers a moment.',
  ];
  const labels = prompt.match(/\[idea \d+ —[^\]]*\]/g) || [];
  const ideas = labels.map((label, i) =>
    `${usedEmoji} [idea ${i + 1} — sharp, funny, oddly insightful]\n   *why it's not stupid:* ${reasons[i % reasons.length]}`
  );
  return `${headerLine}\n\n${ideas.join('\n\n')}\n`;
}

test('End-to-End: Builder-Prompt -> ausgefuellte Ideen -> Validator akzeptiert', () => {
  for (const intensity of ['0.2', '0.5', '0.8', '1.0']) {
    const prompt = buildPrompt(`${intensity} test request`);
    const filled = fillTemplate(prompt);
    const expected = (prompt.match(/\[idea \d+/g) || []).length;
    const result = validateIdeaOutput(filled);
    assert.equal(result.valid, true,
      `Intensitaet ${intensity} (${expected} Ideen): Validator lehnt den vertragsgemaessen Output ab -> ${JSON.stringify(result.errors)}`);
    assert.equal(result.ideaCount, expected, `Intensitaet ${intensity}: Validator zaehlt ${result.ideaCount} statt ${expected} Ideen`);
  }
});

test('End-to-End: Anzahl der angefragten Ideen stimmt mit dem Qualitaets-Gate ueberein', () => {
  // SKILL.md 5. fordert mindestens 2 originale Ideen, das Quality Gate soll also
  // fuer jede vom Builder erzeugte Ideen-Anzahl (2..5) erfuellbar sein.
  for (const intensity of ['0.1', '0.5', '0.7', '0.95']) {
    const prompt = buildPrompt(`${intensity} test`);
    const count = (prompt.match(/\[idea \d+/g) || []).length;
    assert.ok(count >= 2, `Builder darf nie weniger als 2 Ideen anfordern (war: ${count})`);
  }
});
