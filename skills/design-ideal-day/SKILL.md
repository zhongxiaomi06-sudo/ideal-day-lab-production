---
name: design-ideal-day
description: "Turn a person's day constraints into a humane 24-hour plan and demonstrate the tradeoffs in the Ideal Day Lab miniapp."
---

# Design an Ideal Day

Use this skill when someone wants to shape, rebalance, or reflect on one day. Do not use it for multi-week project management or medical sleep advice.

## Workflow

1. Preserve fixed commitments, desired sleep, care, recovery, and the user's own labels. Separate facts from preferences.
2. Draft one complete 24-hour allocation. Name the main tradeoff instead of pretending every preference fits.
3. Translate the draft into blocks the user can reproduce in `apps/ideal-day-lab`; do not claim it was imported unless you actually entered it.
4. Run `node scripts/showcase.mjs --json`, start the returned package, and open the returned URL at 390×844.
5. Perform the manifest steps in the real miniapp. Report what the time ring and comparison view reveal, plus any unsupported request.

Never diagnose productivity or wellbeing. A static schedule in chat is not a completed showcase.
