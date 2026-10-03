# Fehleranalyse: drunk-claude-skill

Stand: geprüft auf Commit `6aba517` (Branch `arena/01a101b8-drunk-claude-skill`).
Vorgehen: jede Datei gelesen, alles Ausführbare ausgeführt, danach eine Testsuite
geschrieben, die das **dokumentierte** Verhalten (README + SKILL.md) als Soll definiert.

Ergebnis: **16 Befunde** — 12 echte Fehler im Code, 3 Doku/Manifest-Abweichungen,
1 fehlende Testinfrastruktur. Alle sind behoben. Neue Tests: **62 Tests in 5 Dateien, alle grün**.
Testergebnis nach den Fixes: `# tests 62 / # pass 62 / # fail 0`.

---

## 1. Code-Fehler (ausgeführt und reproduziert)

### F1 — Zahlen im Fließtext kapern die Intensität (hoch)
`prompt-builder.js:125` (Original): `if (/^\d+(?:\.\d+)?$/.test(token)) { flags.intensity = ... }`

| Eingabe | vorher | jetzt |
|---|---|---|
| `I need 3 ideas for a habit app` | Intensität **1** (Blackout), `3` aus dem Text gelöscht | 0.5, Text unverändert |
| `give me 5 wild ideas` | Intensität **1**, `5` gelöscht | 0.5, Text unverändert |
| `Top 10 ideas for 2024` | Intensität **1**, `10`+`2024` gelöscht → „Top ideas for“ | 0.5, Text unverändert |

Wirkung: Der Standardfall „Brainstorming mit Zahlen“ landete still im Blackout-Modus und
verlor Wörter aus der Anfrage. Fix: Positionsargument nur noch in Dezimalnotation
(`0.8`, `.8`, `1.0`), nur vor dem ersten Fließtext-Token.

### F2 — Slash-Kommandos werden unvollständig entfernt (mittel)
`prompt-builder.js:30`: `/^\/(?:drunk|drunk-genius|drunk-genuis)\b/i` — `\b` greift schon vor dem
Bindestrich, deshalb wurde nur `/drunk` entfernt.

| Eingabe | vorher | jetzt |
|---|---|---|
| `/drunk-genius 0.8 Text` | Request = `-genius Text` | Request = `Text` |
| `/drunk-genuis 0.8 Text` | Request = `-genuis Text` | Request = `Text` |

### F3 — README-Syntax wird vom Parser nicht verstanden (hoch, Doku ≠ Code)
README „Quick usage“ zeigt `/intensity 0.6 /mood chaotic /drink whiskey`. Der Parser kannte
nur `--intensity`. Ergebnis vorher: Intensität 0.5, Mood `chaotic`, **Drink `beer`** und der
komplette Flag-Block landete im User-Text („Request: /intensity /mood chaotic /drink whiskey …“).
Fix: `/intensity`, `/mood`, `/drink` (inkl. `=Wert` und Kurzformen) werden auf die Flag-Notation
normalisiert.

### F4 — `-i=0.9` / `--i=0.9` fällt durch + toter Code (niedrig)
Der `=`-Zweig in `prompt-builder.js:60-66` war unerreichbar, weil das umgebende Muster `^--?intensity$`
kein `=` zulässt. `-i=0.9 Ideen` wurde als Text behandelt. Jetzt geparst; der tote Zweig ist weg.

### F5 — Leerer Prompt bei leerer Eingabe (mittel)
`prompt-builder.js:42` (Early-Return): `buildPrompt('')` erzeugte einen Prompt mit leerem
`User request:`. Jetzt greift der Fallback-Request in **allen** Pfaden.

### F6 — Numerische Strings fallen still auf Default (niedrig)
`normalizeIntensity('0.7')` → `0.5`, weil `typeof value !== 'number'`. Die Funktion ist
öffentlich exportiert; ein Aufrufer mit CLI-/JSON-Wert konfigurierte damit unbemerkt falsch.
Jetzt werden numerische Strings übernommen, Junk bleibt bei 0.5, `±Infinity` clampt auf die Bandgrenzen.

### F7 — Validator lehnt das Format ab, das der Builder selbst erzeugt (hoch)
`validator.js:29` (`ideaMarkers < 2`) + `validator.js:55` (`sentenceCount < 4`).

* 2 Ideen = das dokumentierte Low-Intensity-Format (< 0.4, `SLIGHTLY TIPSY GENIUS THOUGHTS`) → **ungültig**.
* Das **eingebaute Demo-Sample des Validators** (`node validator.js`) war selbst `valid: false`.
* `sentenceCount` wurde auf `text.split(/[.!?]/)` gezählt — der abschließende Zeilenumbruch
  ergab einen zusätzlichen „Satz“. Dadurch galt: identischer Inhalt **mit** Trailing-Newline =
  gültig, **ohne** = ungültig. Nichtdeterministische Bewertung.
Fix: Satz-/Wortzählung normalisiert Leerraum (`>= 2` Sätze, `>= 25` Wörter) und ist
whitespace-unabhängig; das Demo-Sample ist jetzt gültig.

### F8 — Ideen-Marker nur mit Em-Dash (niedrig)
`validator.js:28`: Muster verlangte `—`. LLM-Antworten mit `-` oder `–` wurden abgelehnt.
Jetzt sind alle drei Varianten gültig.

### F9 — Inkonsistente Rückgabeform (niedrig)
Der Early-Return (`validator.js:10-16`) lieferte kein `emojiCount`, der Normalfall schon.
Konsumenten mit destrukturierendem Zugriff bekamen `undefined`. Jetzt immer 5 Felder.

### F10 — Generisch-Check widerspricht SKILL.md 4.2 (mittel)
`validator.js:49`: Jede der 7 Phrasen führte sofort zu „Output looks generic“ — auch wenn sie
reframed wurde. SKILL.md 4.2 sagt ausdrücklich: „These are weak **unless they are reframed** in a
distinctive and unexpected way.“ Beispiel, das vorher fälschlich abgelehnt wurde:
`🥃 [add gamification, but only as a punishment for the people who demanded gamification]`.
Fix: Eine Phrase zählt nur noch als Fehler, wenn ihre Zeile **kein** Reframe-Signal enthält
(`but`, `instead`, `only if`, `unless`, `except`, `rather than`, `reframe(d)`). Reine Buzzword-Suppe
wird weiter erkannt.

### F11 — Dokumentiertes Technik-Routing war nicht implementiert (mittel)
SKILL.md Abschnitt 3: „At intensity 0.7 or above, combine two techniques. At intensity 0.9 or
above, combine three.“ `buildPrompt` gab Techniken nie aus — der Prompt enthielt nur
`Intensity/Mood/Drink`, keinen Hinweis auf `references/techniques/*.md`. Als Prompt-System ist
das eine unerfüllte Zusage.
Fix: `selectTechniques()` wählt deterministisch (Hash über den Request, damit identische Eingaben
identische Prompts liefern) 2 Techniken ab 0.7 bzw. 3 ab 0.9 und listet die zugehörigen Dateipfade
sowie `references/persona.md` und `references/moods/<mood>.md` im Prompt.

### F12 — `examples/python-usage.py` war nicht lauffähig (mittel)
`python3 examples/python-usage.py` → `ModuleNotFoundError: No module named 'prompt_builder'`
(Exit 1). Das importierte Modul existiert im Repo nicht; der Builder ist JavaScript.
Fix: Das Beispiel ruft `prompt-builder.js` per Subprozess auf (keine zweite, driftende
Implementierung) und beendet sich sauber. `node prompt-builder.js <args>` nutzte außerdem
`argv` gar nicht — jetzt wertet die CLI Argumente aus und fällt sonst auf das Sample zurück.

---

## 2. Doku / Manifest (Abweichungen ohne Laufzeitfehler)

| # | Befund | Belegt durch | Fix |
|---|---|---|---|
| F13 | `manifest.json` Version `1.0.0` vs. SKILL.md `2.3` | Test `SKILL.md, manifest.json und package.json haben dieselbe Version` | Manifest/package.json auf `2.3.0` |
| F14 | `validator.js` fehlt in `manifest.files` und im README | `manifest.json`, README „What's inside“ | beide ergänzt |
| F15 | Beispiel sagt 3 Ideen bei Intensität 0.7, Builder liefert 4 | `examples/generic-llm.md` | Beispiel auf 4 korrigiert, Ideen-Leiter in SKILL.md Abschnitt 5 dokumentiert |
| — | Kein `package.json` / kein `npm test` / kein Testverzeichnis | `npm test` → `ENOENT` | `package.json` + `tests/` ergänzt |

---

## 3. Geprüfe Verdachtsfälle, die **keine** Fehler sind

Damit die Liste belastbar bleibt — diese Punkte habe ich getestet und verworfen:

* `--mood grumpy ideas` / `--drink water ideas`: Wert bleibt als Text erhalten, Default wird genutzt. Korrekt, weil der Builder nur dokumentierte Werte akzeptiert.
* `-1`, `2.0`, `2024` als Positions-Token: landen als Text, nicht als Intensität. Beabsichtigt (dokumentierter Bereich 0.1–1.0).
* `null`/`undefined`/`42` als Eingabe an beide Module: kein Absturz (`parseArgs`, `validateIdeaOutput`).
* Getränk-Emojis: `beer 🍺`, `wine 🍷`, `whiskey 🥃`, `cocktail 🍸`, `absinthe 🧚` — vollständig und stimmig.
* Mood-Liste und Technik-Routing-Tabelle in SKILL.md stimmen exakt mit `references/moods/` (5) und `references/techniques/` (8) überein; alle Dateien existieren, alle Technik-Dateien haben die vier Pflichtabschnitte.
* Header-Schwellen (`< 0.3`, `>= 0.9`) sind zwischen SKILL.md und Code konsistent.
* `LICENSE` ist MIT, Manifest nennt MIT. `manifest.json` ist valides JSON.
* Alle im README/SKILL.md referenzierten Pfade existieren.

---

## 4. Bewusste Grenzen (nicht geändert)

* **Buzzword-Erkennung bleibt eine Heuristik.** Sie prüft Reframe-Wörter in derselben Zeile; „add gamification because people love points“ käme durch. Eine inhaltliche Bewertung kann ein Regex-Validator nicht leisten — dafür ist der LLM-Durchlauf mit SKILL.md Abschnitt 4 zuständig.
* **Technik-Auswahl ist deterministisch, aber nicht semantisch.** SKILL.md Abschnitt 3 routet nach Problem-Muster („challenge assumptions“ → `what-if-but-wrong`). Ein Parser kann das nicht leisten; der Prompt nennt daher Techniken, die das Modell anhand des Requests gewichten soll. Bewusste Arbeitsteilung: Code = Struktur/Gate, LLM = Semantik.
* **Kein Python-Port des Builders.** Eine zweite Implementierung würde driften; deshalb der Subprozess-Aufruf im Beispiel.
* **`validator.emojiCount` zählt Emojis im Gesamttext**, also auch in zitierten Ideen. Für ein Gate ausreichend, kein Bug.

---

## 5. Testsuite (`npm test`)

| Datei | Umfang | Prüft |
|---|---|---|
| `tests/prompt-builder.test.js` | 24 Tests | Defaults, Flag-Varianten, Zahlen im Text, Slash-Kommandos, Clamping, Ideen-Anzahl/Header je Band, Technik-Routing, Determinismus |
| `tests/validator.test.js` | 16 Tests | alle drei Intensitäts-Formate, Whitespace-Unabhängigkeit, Dash-Varianten, Rückgabeform, Fehlerfälle, Reframe-Ausnahme |
| `tests/docs-consistency.test.js` | 14 Tests | Versionen, Manifest-Vollständigkeit, Doku↔Dateien für Moods/Techniken, Beispiel- vs. Builder-Verhalten |
| `tests/integration.test.js` | 2 Tests | Builder-Prompt → gefüllte Ideen → Validator akzeptiert (alle Bänder) |
| `tests/cli.test.js` | 6 Tests | CLI-Argumente, Demo-Samples, beide Beispielskripte, Export-Oberfläche |

Ausführen:

```bash
npm test        # node --test
node validator.js
node prompt-builder.js "0.8 --mood aggressive --drink whiskey Ideen fuer Remote-Teams"
```
