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

const validMoods = new Set(Object.keys(moodMap));
const validDrinks = new Set(Object.keys(drinkMap));

function normalizeIntensity(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0.1, Number(value.toFixed(2))));
}

function parseArgs(input = '') {
  const raw = String(input ?? '').trim();
  const tokens = raw
    .replace(/^\/(?:drunk|drunk-genius|drunk-genuis)\b/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const flags = {
    intensity: 0.5,
    mood: 'chaotic',
    drink: 'beer',
    text: '',
  };

  if (tokens.length === 0) {
    return flags;
  }

  let i = 0;
  let collectedText = [];

  while (i < tokens.length) {
    const token = tokens[i];

    if (/^--?intensity$/i.test(token) || /^--?i$/i.test(token)) {
      const next = tokens[i + 1];
      const parsed = Number(next);
      if (!Number.isNaN(parsed)) {
        flags.intensity = normalizeIntensity(parsed);
        i += 2;
        continue;
      }
      const eqValue = token.includes('=') ? token.split('=')[1] : null;
      if (eqValue) {
        const parsedEq = Number(eqValue);
        if (!Number.isNaN(parsedEq)) {
          flags.intensity = normalizeIntensity(parsedEq);
          i += 1;
          continue;
        }
      }
      i += 1;
      continue;
    }

    if (/^--?intensity=/i.test(token)) {
      const value = token.split('=')[1];
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        flags.intensity = normalizeIntensity(parsed);
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    if (/^--?mood$/i.test(token) || /^--?m$/i.test(token)) {
      const next = tokens[i + 1];
      if (next && validMoods.has(next.toLowerCase())) {
        flags.mood = next.toLowerCase();
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (/^--?mood=/i.test(token)) {
      const value = token.split('=')[1];
      if (value && validMoods.has(value.toLowerCase())) {
        flags.mood = value.toLowerCase();
      }
      i += 1;
      continue;
    }

    if (/^--?drink$/i.test(token) || /^--?d$/i.test(token)) {
      const next = tokens[i + 1];
      if (next && validDrinks.has(next.toLowerCase())) {
        flags.drink = next.toLowerCase();
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (/^--?drink=/i.test(token)) {
      const value = token.split('=')[1];
      if (value && validDrinks.has(value.toLowerCase())) {
        flags.drink = value.toLowerCase();
      }
      i += 1;
      continue;
    }

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      flags.intensity = normalizeIntensity(Number(token));
      i += 1;
      continue;
    }

    collectedText.push(token);
    i += 1;
  }

  flags.text = collectedText.join(' ') || 'Generate bizarre-but-useful ideas for a product, brand, or concept.';
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

function buildPrompt(input = '') {
  const options = parseArgs(input);
  const emoji = drinkMap[options.drink] || drinkMap.beer;
  const header = getHeader(emoji, options.intensity);
  const ideaCount = options.intensity >= 0.9 ? 5 : options.intensity >= 0.7 ? 4 : options.intensity >= 0.4 ? 3 : 2;

  const ideaLines = Array.from({ length: ideaCount }, (_, index) => {
    const label = `idea ${index + 1}`;
    return [
      `${emoji} [${label} — sharp, funny, oddly insightful]`,
      `   *why it's not stupid:* [one sentence of twisted logic]`,
      '',
    ].join('\n');
  }).join('\n');

  return [
    'You are Drunk Genius, a creative ideation mode for an LLM.',
    '',
    'Core objective: generate novel, funny, and surprisingly useful ideas. Reject generic, safe, or purely aesthetic output.',
    `Intensity: ${options.intensity}`,
    `Mood: ${options.mood}`,
    `Drink: ${options.drink}`,
    '',
    'Rules:',
    '- Keep the tone loose, conversational, and a little unfiltered.',
    '- Target wild-but-valuable ideas, not random nonsense.',
    '- Do not produce medical, legal, or safety-critical advice.',
    '- Keep each idea actionable in some form.',
    '- Do not use corporate-safe buzzwords without a specific twist.',
    '- Every idea must be funny AND insightful.',
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
  moodMap,
  drinkMap,
  validMoods,
  validDrinks,
};

if (require.main === module) {
  const sample = '0.8 --mood philosophical --drink whiskey I need weird but useful ideas for a habit app';
  console.log(buildPrompt(sample));
}
