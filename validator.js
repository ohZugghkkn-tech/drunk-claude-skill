function normalizeWhitespace(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function validateIdeaOutput(output = '') {
  const text = String(output ?? '');
  const errors = [];

  if (!text || normalizeWhitespace(text).length < 30) {
    return {
      valid: false,
      errors: ['Output is empty or too short to be valid.'],
      ideaCount: 0,
      headerDetected: false,
    };
  }

  const hasHeader = /(slightly tipsy genius thoughts|drunk genius breakthroughs|blackout genius)/i.test(text);
  if (!hasHeader) {
    errors.push('Missing valid output header.');
  }

  const reasonMatches = (text.match(/\*why (?:it's|it is) not stupid:\*/gi) || []).length;
  if (reasonMatches < 2) {
    errors.push('Output does not contain enough explanation lines.');
  }

  const ideaMarkers = (text.match(/\[[^\]]+—[^\]]+\]/g) || []).length;
  if (ideaMarkers < 2) {
    errors.push('Output does not contain enough idea lines.');
  }

  const emojiMatches = (text.match(/🍺|🍷|🥃|🍸|🧚/g) || []).length;
  if (emojiMatches === 0) {
    errors.push('Output is missing a drink emoji.');
  }

  const genericPatterns = [
    'make it more intuitive',
    'add gamification',
    'optimize engagement',
    'synergistic',
    'ai-powered',
    'increase user retention',
    'leverage data-driven insights',
  ];

  const lower = text.toLowerCase();
  const hasGenericFailure = genericPatterns.some((pattern) => lower.includes(pattern));
  if (hasGenericFailure) {
    errors.push('Output looks generic and unoriginal.');
  }

  const sentenceCount = (text.split(/[.!?]/).filter(Boolean).length || 0);
  if (sentenceCount < 4) {
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
