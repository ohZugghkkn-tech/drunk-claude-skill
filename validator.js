'use strict';

const MIN_IDEAS = 2;
const MIN_PROSE_WORDS = 25;

function normalizeWhitespace(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

// Der Prompt-Builder gibt Platzhalter mit Em-Dash aus, erzeugte Antworten
// variieren aber zwischen —, – und -. Alle drei sind gueltige Ideen-Marker.
const IDEA_MARKER = /\[[^\]]*(?:—|–|-)[^\]]*\]/g;
const REASON_LINE = /\*why (?:it's|it is) not stupid:\*/gi;
const DRINK_EMOJI = /🍺|🍷|🥃|🍸|🧚/gu;

const GENERIC_PATTERNS = [
  'make it more intuitive',
  'add gamification',
  'optimize engagement',
  'synergistic',
  'ai-powered',
  'increase user retention',
  'leverage data-driven insights',
];

// SKILL.md 4.2: generische Phrasen sind nur dann ein Fehler, wenn sie nicht
// reframed wurden.
const REFRAME_MARKERS = /\b(?:but|instead|only if|unless|except|rather than|as a punishment|reframe[ds]?)\b/i;

function validateIdeaOutput(output = '') {
  const text = String(output ?? '');
  const errors = [];

  if (!text || normalizeWhitespace(text).length < 30) {
    return {
      valid: false,
      errors: ['Output is empty or too short to be valid.'],
      ideaCount: 0,
      headerDetected: false,
      emojiCount: 0,
    };
  }

  const hasHeader = /(slightly tipsy genius thoughts|drunk genius breakthroughs|blackout genius)/i.test(text);
  if (!hasHeader) {
    errors.push('Missing valid output header.');
  }

  const reasonMatches = (text.match(REASON_LINE) || []).length;
  if (reasonMatches < MIN_IDEAS) {
    errors.push('Output does not contain enough explanation lines.');
  }

  const ideaMarkers = (text.match(IDEA_MARKER) || []).length;
  if (ideaMarkers < MIN_IDEAS) {
    errors.push('Output does not contain enough idea lines.');
  }

  const emojiMatches = (text.match(DRINK_EMOJI) || []).length;
  if (emojiMatches === 0) {
    errors.push('Output is missing a drink emoji.');
  }

  const genericLines = [];
  for (const line of text.split('\n')) {
    const lower = line.toLowerCase();
    const hit = GENERIC_PATTERNS.find((pattern) => lower.includes(pattern));
    if (hit && !REFRAME_MARKERS.test(line)) {
      genericLines.push(hit);
    }
  }
  if (genericLines.length > 0) {
    errors.push('Output looks generic and unoriginal.');
  }

  const prose = normalizeWhitespace(text);
  const sentenceCount = prose
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 3).length;
  const wordCount = prose.split(/\s+/).filter(Boolean).length;

  if (sentenceCount < MIN_IDEAS || wordCount < MIN_PROSE_WORDS) {
    errors.push('Output is too sparse to be a meaningful set of ideas.');
  }

  return {
    valid: errors.length === 0,
    errors,
    ideaCount: reasonMatches,
    headerDetected: hasHeader,
    emojiCount: emojiMatches,
  };
}

module.exports = {
  validateIdeaOutput,
  normalizeWhitespace,
};

if (require.main === module) {
  const sample = `🥃 DRUNK GENIUS BREAKTHROUGHS:

🥃 [idea one — sharp, funny, oddly insightful]
   *why it's not stupid:* People pay more attention when a product feels like a secret friend, not a chore.

🥃 [idea two — sharp, funny, oddly insightful]
   *why it's not stupid:* If the app changes with the user's mood, it stops feeling like software and starts feeling like a companion.
`;

  console.log(validateIdeaOutput(sample));
}
