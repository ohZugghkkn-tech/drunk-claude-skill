"""Beispiel: den Node-Prompt-Builder aus Python aufrufen.

Der Builder wird in diesem Repo als JavaScript ausgeliefert
(``prompt-builder.js``). Damit es keine zweite, driftende Implementierung gibt,
ruft dieses Beispiel den Builder per Subprozess auf.

Voraussetzung: Node.js ist installiert (siehe ``npm test``).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BUILDER = REPO_ROOT / "prompt-builder.js"

INPUT = "0.6 --mood flirty --drink cocktail I need ideas for a social learning product"


def build_prompt(user_input: str) -> str:
    """Baue einen Drunk-Genius-Prompt und gib ihn als String zurueck."""
    result = subprocess.run(
        ["node", str(BUILDER), *user_input.split()],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(REPO_ROOT),
    )
    return result.stdout


def main() -> int:
    if not BUILDER.exists():
        print(f"Builder nicht gefunden: {BUILDER}", file=sys.stderr)
        return 1

    try:
        prompt = build_prompt(INPUT)
    except FileNotFoundError:
        print("Node.js wurde nicht gefunden. Bitte Node installieren.", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"Builder fehlgeschlagen: {error.stderr}", file=sys.stderr)
        return 1

    print(prompt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
