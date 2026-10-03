const { buildPrompt } = require('../prompt-builder');

const input = "0.8 --mood aggressive --drink whiskey I need weird but useful ideas for a SaaS tool for remote teams";

const prompt = buildPrompt(input);
console.log(prompt);
