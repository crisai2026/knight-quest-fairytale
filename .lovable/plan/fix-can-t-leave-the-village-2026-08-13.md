# Fix: can't leave the village

## What's happening

The village gate is at x 2680 and only opens when you press E while standing against it. But Old Man Fenwick stands at x 2600, and villagers grab any E press within 80 pixels. Pressed against the gate the knight's centre sits at ~2662 — only 62 pixels from Fenwick — so every E press starts his "Still uphill. Both ways." line instead of opening the gate. The knight is stuck talking to him forever.

Two supporting problems make it worse:
- Villager interaction is checked before the gate, so the gate never gets a chance at the key press.
- The gate prompt ("Press E to leave the village") flashes only for a moment while you're pushed back, so it's easy to miss.

## The fix

1. Move Old Man Fenwick away from the gate (to around x 2200) so he no longer overlaps the exit zone.
2. Give the gate priority: when the knight is standing in the exit zone, the gate handles the E press and villagers are skipped.
3. Keep the "Press E to leave the village" prompt on screen the whole time the knight is in the exit zone, so the way out is obvious.

## Technical notes

- `src/lib/game/levels.ts`: change the `goose` (Fenwick) NPC x from 2600 to 2200.
- `src/lib/game/engine.ts`: in the update step, compute `atExit = p.x + p.width >= state.exitX` before the village NPC block and skip `updateNpcs` when `atExit` is true; refresh the exit message every frame while `atExit`.
- No other level or boss logic changes.
