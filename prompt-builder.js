const moodMap = {
  chaotic: "chaotic",
  philosophical: "philosophical",
  melancholy: "melancholy",
  aggressive: "aggressive",
  flirty: "flirty",
};

const drinkMap = {
  beer: "🍺",
  wine: "🍷",
  whiskey: "🥃",
  cocktail: "🍸",
  absinthe: "🧚",
};

function parseArgs(input) {
  const args = input.trim().split(/\s+/);
  const flags = {
    intensity: 0.5,
    mood: "chaotic",
    drink: "beer",
    text: "",
  };

  if (!args.length) return flags;

  const filtered = args.filter(Boolean);

  for (let i = 0; i < filtered.length; i++) {
    const token = filtered[i];

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      const value = Number(token);
      flags.intensity = Math.max(0.1, Math.min(1, value));
      continue;
    }

    if (token.startsWith("--mood")) {
      const value = token.includes("=") ? token.split("=")[1] : filtered[i + 1];
      if (value && moodMap[value]) {
        flags.mood = value;
        if (token.includes("=")) continue;
        i += 1;
      }
      continue;
    }

    if (token.startsWith("--drink")) {
      const value = token.includes("=") ? token.split("=")[1] : filtered[i + 1];
      if (value && drinkMap[value]) {
        flags.drink = value;
        if (token.includes("=")) continue;
        i += 1;
      }
      continue;
    }

    if (!flags.text) {
      flags.text = filtered.slice(i).join(" ");
      break;
    }
  }

  return flags;
}

function buildPrompt(input) {
  const options = parseArgs(input);
  const emoji = drinkMap[options.drink] || drinkMap.beer;
  const header = options.intensity >= 0.9
    ? `${emoji} BLACKOUT GENIUS — I DON'T REMEMBER WRITING THIS:`
    : options.intensity < 0.3
      ? `${emoji} SLIGHTLY TIPSY GENIUS THOUGHTS:`
      : `${emoji} DRUNK GENIUS BREAKTHROUGHS:`;

  return `You are Drunk Genius.

Persona: be wildly creative, playful, sharp, and weirdly useful. Keep it casual and conversational.
Intensity: ${options.intensity}
Mood: ${options.mood}
Drink: ${options.drink}

Rules:
- Generate exactly 3 strong ideas.
- Each idea must be funny and insightful.
- Reject normal boring ideas.
- Focus on novel angles, surprising reframes, and useful chaos.
- Do not produce legal, medical, or safety-critical advice.
- Use a playful, loosely bar-room tone.
- Keep the output concise but vivid.

Output format:
${header}

${emoji} [wild idea one — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]

${emoji} [wild idea two — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]

${emoji} [wild idea three — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]

User request:
${options.text || "Generate bizarre-but-useful ideas for a product or concept."}
`;
}

module.exports = { parseArgs, buildPrompt };

if (require.main === module) {
  const sample = '/drunk 0.7 --mood philosophical --drink whiskey I need weird but useful ideas for a habit app';
  console.log(buildPrompt(sample));
}
