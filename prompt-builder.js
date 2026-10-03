'use strict';

const moodMap = {
  chaotic: 'chaotic',
  philosophical: 'philosophical',
  melancholy: 'melancholy',
  aggressive: 'aggressive',
  flirty: 'flirty',
};

const drinkMap = {
  beer: '🍺',
  wine: '🍷',
  whiskey: '🥃',
  cocktail: '🍸',
  absinthe: '🧚',
};

// Aus SKILL.md Abschnitt 3 (Technique Routing).
const TECHNIQUES = [
  'hold-my-beer',
  '3am-diner',
  'drunk-uncle',
  'beer-goggles',
  'what-if-but-wrong',
  'last-call',
  'karaoke',
  'bar-fight',
];

const DEFAULT_REQUEST = 'Generate bizarre-but-useful ideas for a product, brand, or concept.';

const MIN_INTENSITY = 0.1;
const MAX_INTENSITY = 1;

const validMoods = new Set(Object.keys(moodMap));
const validDrinks = new Set(Object.keys(drinkMap));

const LONG_FLAGS = new Set(['intensity', 'mood', 'drink']);
const SHORT_FLAGS = { i: 'intensity', m: 'mood', d: 'drink' };

// Positionsargument: nur Dezimalnotation (0.8, .8, 1.0), siehe SKILL.md 2.1.
const POSITIONAL_INTENSITY = /^(?:\d+\.\d+|\.\d+)$/;

function normalizeIntensity(value) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;

  if (Number.isNaN(numeric)) {
    return 0.5;
  }

  // ±Infinity wird auf die Bandgrenzen geclampt, nicht auf den Default.
  if (!Number.isFinite(numeric)) {
    return numeric > 0 ? MAX_INTENSITY : MIN_INTENSITY;
  }

  return Math.min(MAX_INTENSITY, Math.max(MIN_INTENSITY, Number(numeric.toFixed(2))));
}

/**
 * `/mood`, `/intensity=0.6`, `/drink ...` (README-Quick-Usage) werden auf die
 * Flag-Notation abgebildet, damit Slash-Flags nicht im User-Text landen.
 */
function normalizeFlagToken(token) {
  const slash = token.match(/^\/(intensity|mood|drink|i|m|d)(=.*)?$/i);
  if (slash) {
    return `--${slash[1].toLowerCase()}${slash[2] || ''}`;
  }
  return token;
}

function isFlagToken(token) {
  const match = token.match(/^--?([A-Za-z]+)(?:=.*)?$/);
  if (!match) return false;
  const name = match[1].toLowerCase();
  return LONG_FLAGS.has(name) || Object.hasOwn(SHORT_FLAGS, name);
}

function applyFlag(flags, key, value) {
  const raw = String(value ?? '').trim();

  if (key === 'intensity') {
    if (raw === '' || !Number.isFinite(Number(raw))) return false;
    flags.intensity = normalizeIntensity(Number(raw));
    return true;
  }

  if (key === 'mood') {
    if (!validMoods.has(raw.toLowerCase())) return false;
    flags.mood = raw.toLowerCase();
    return true;
  }

  if (key === 'drink') {
    if (!validDrinks.has(raw.toLowerCase())) return false;
    flags.drink = raw.toLowerCase();
    return true;
  }

  return false;
}

function isPositionalIntensity(token) {
  if (!POSITIONAL_INTENSITY.test(token)) return false;
  const value = Number(token);
  return value > 0 && value <= MAX_INTENSITY;
}

function parseArgs(input = '') {
  const raw = String(input ?? '')
    .replace(/^\/(?:drunk-genius|drunk-genuis|drunk)\b/i, '')
    .trim();

  const flags = {
    intensity: 0.5,
    mood: 'chaotic',
    drink: 'beer',
    text: '',
  };

  const tokens = raw ? raw.split(/\s+/).filter(Boolean).map(normalizeFlagToken) : [];
  if (tokens.length === 0) {
    flags.text = DEFAULT_REQUEST;
    return flags;
  }

  const collectedText = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    const match = token.match(/^--?([A-Za-z]+)(?:=(.*))?$/);

    if (match) {
      const name = match[1].toLowerCase();
      const key = SHORT_FLAGS[name] || (LONG_FLAGS.has(name) ? name : null);

      if (key) {
        const inline = match[2];

        if (inline !== undefined) {
          applyFlag(flags, key, inline);
          i += 1;
          continue;
        }

        const next = tokens[i + 1];
        if (next !== undefined && !isFlagToken(next) && applyFlag(flags, key, next)) {
          i += 2;
          continue;
        }

        i += 1;
        continue;
      }
    }

    // Nur ein fuehrendes Dezimal-Literal ist eine Intensitaet. Zahlen im
    // Fliesstext ("I need 3 ideas", "Top 10 ideas for 2024") bleiben Text.
    if (collectedText.length === 0 && isPositionalIntensity(token)) {
      flags.intensity = normalizeIntensity(Number(token));
      i += 1;
      continue;
    }

    collectedText.push(token);
    i += 1;
  }

  flags.text = collectedText.join(' ') || DEFAULT_REQUEST;
  return flags;
}

function getHeader(emoji, intensity) {
  if (intensity >= 0.9) {
    return `${emoji} BLACKOUT GENIUS — I DON'T REMEMBER WRITING THIS:`;
  }

  if (intensity < 0.3) {
    return `${emoji} SLIGHTLY TIPSY GENIUS THOUGHTS:`;
  }

  return `${emoji} DRUNK GENIUS BREAKTHROUGHS:`;
}

function getIdeaCount(intensity) {
  if (intensity >= 0.9) return 5;
  if (intensity >= 0.7) return 4;
  if (intensity >= 0.4) return 3;
  return 2;
}

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return hash;
}

/**
 * SKILL.md Abschnitt 3: ab 0.7 zwei Techniken, ab 0.9 mehrere (drei).
 * Die Auswahl ist deterministisch, damit identische Eingaben identische
 * Prompts erzeugen.
 */
function selectTechniques(text, intensity) {
  const count = intensity >= 0.9 ? 3 : intensity >= 0.7 ? 2 : 0;
  if (count === 0) return [];

  const start = stableHash(String(text || '')) % TECHNIQUES.length;
  const picked = [];

  for (let i = 0; i < TECHNIQUES.length && picked.length < count; i += 1) {
    const slug = TECHNIQUES[(start + i) % TECHNIQUES.length];
    if (!picked.includes(slug)) picked.push(slug);
  }

  return picked;
}

function buildPrompt(input = '') {
  const options = parseArgs(input);
  const emoji = drinkMap[options.drink] || drinkMap.beer;
  const header = getHeader(emoji, options.intensity);
  const ideaCount = getIdeaCount(options.intensity);
  const techniques = selectTechniques(options.text, options.intensity);

  const ideaLines = Array.from({ length: ideaCount }, (_, index) => {
    const label = `idea ${index + 1}`;
    return [
      `${emoji} [${label} — sharp, funny, oddly insightful]`,
      `   *why it's not stupid:* [one sentence of twisted logic]`,
      '',
    ].join('\n');
  }).join('\n');

  const techniqueLines = techniques.length
    ? [
        'Techniques to combine:',
        ...techniques.map((slug) => `- ${slug} (references/techniques/${slug}.md)`),
        '',
      ]
    : [];

  return [
    'You are Drunk Genius, a creative ideation mode for an LLM.',
    '',
    'Core objective: generate novel, funny, and surprisingly useful ideas. Reject generic, safe, or purely aesthetic output.',
    `Intensity: ${options.intensity}`,
    `Mood: ${options.mood}`,
    `Drink: ${options.drink}`,
    '',
    'Reference material:',
    '- references/persona.md',
    `- references/moods/${options.mood}.md`,
    '',
    ...techniqueLines,
    'Rules:',
    '- Keep the tone loose, conversational, and a little unfiltered.',
    '- Target wild-but-valuable ideas, not random nonsense.',
    '- Do not produce medical, legal, or safety-critical advice.',
    '- Keep each idea actionable in some form.',
    '- Do not use corporate-safe buzzwords without a specific twist.',
    '- Every idea must be funny AND insightful.',
    `- Output exactly ${ideaCount} ideas.`,
    '',
    'Output format:',
    `${header}`,
    '',
    ideaLines.trim(),
    '',
    'User request:',
    options.text,
  ].join('\n');
}

module.exports = {
  parseArgs,
  buildPrompt,
  normalizeIntensity,
  getHeader,
  getIdeaCount,
  selectTechniques,
  moodMap,
  drinkMap,
  validMoods,
  validDrinks,
  TECHNIQUES,
  DEFAULT_REQUEST,
};

if (require.main === module) {
  const cliInput = process.argv.slice(2).join(' ').trim();
  const sample =
    cliInput || '0.8 --mood philosophical --drink whiskey I need weird but useful ideas for a habit app';
  console.log(buildPrompt(sample));
}
