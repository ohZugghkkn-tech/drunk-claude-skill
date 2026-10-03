# Drunk Genius Skill

A lightweight, LLM-agnostic creative ideation skill for brainstorming, product thinking, narrative generation, and idea expansion.

This repo is designed to be copied into another project, attached to a prompt system, or used as a template for any model that supports system/user prompts.

## What's inside

- `SKILL.md` — the main reusable prompt system
- `prompt-builder.js` — builds a valid prompt from intensity, mood, drink, and user input
- `validator.js` — checks generated output against the quality gate
- `references/persona.md` — the personality layer
- `references/moods/` — five distinct creative moods
- `references/techniques/` — eight techniques that steer the ideation style
- `examples/` — plain-language and code examples for generic LLM integration
- `tests/` — Node test-runner suite (`npm test`)

## Core idea

The skill increases creative output by dialing up a controlled form of cognitive disinhibition:

- low intensity = safe brainstorming
- medium intensity = strong, useful creative ideas
- high intensity = wild, weird, and highly novel ideas

It is intentionally not a production decision-maker. It is a creative mode, not a factual authority.

## Quick usage

Use the prompt in any app that supports a system prompt or instruction block.

Example:

```text
/intensity 0.6
/mood chaotic
/drink whiskey

I need ideas for a health app that feels emotionally addictive without being manipulative.
```

The same parameters work with flag syntax (`--intensity 0.6`, `--mood=chaotic`, `--drink whiskey`)
and as short flags (`-i 0.6 -m chaotic -d whiskey`). With `prompt-builder.js`:

```js
const { buildPrompt } = require('./prompt-builder');

buildPrompt('--intensity 0.6 --mood chaotic --drink whiskey I need ideas for a health app');
```

Check generated output before shipping it:

```js
const { validateIdeaOutput } = require('./validator');

validateIdeaOutput(llmOutput); // => { valid, errors, ideaCount, headerDetected, emojiCount }
```

## Tests

```bash
npm test
```

## Output format

```text
🥃 DRUNK GENIUS BREAKTHROUGHS:

🥃 [wild idea one — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]

🥃 [wild idea two — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]

🥃 [wild idea three — sharp, funny, oddly insightful]
   *why it's not stupid:* [one line of twisted logic]
```

## License

MIT
