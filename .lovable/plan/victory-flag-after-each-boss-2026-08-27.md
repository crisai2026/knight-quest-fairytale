# Victory Flag After Each Boss

Right now, when a boss's health hits zero the screen instantly flashes "Boss Defeated!" and auto-returns you to the village. Instead, the boss will drop a **flag** that the knight has to walk over and pick up to finish the level.

## What changes

1. **Boss drops a flag** — when a boss dies, a themed flag (colored to match the level: green forest, blue ocean, sand desert, white snow, etc.) pops out where the boss stood, bounces to the ground and plants itself with a gentle waving animation and a glow so it is easy to spot. Coins still drop as they do now.
2. **Take the flag to advance** — a hint appears: "Grab the victory flag!". Walking into it (or pressing E next to it) picks it up: a flag-raise sound, sparkle burst, and the level-complete screen shows "Level Complete — flag taken!" before returning to the village with the next level unlocked.
3. **No flag, no exit** — the level does not end on its own anymore; the player stays in control after the kill until the flag is collected. Enemies that are still alive can still hurt you on the way.
4. **Final level (dragon) unchanged** — the dragon still drops the cage key so you can free the princess; the flag is for levels 1-9.
5. **Progress saving** — unlocking the next level and saving now happen at flag pickup, not at the moment the boss dies.

## Technical notes

- Add a `flagDrop` field (`x`, `y`, `vy`, `planted`, `collected`, `color`) to `GameState` in `src/lib/game/types.ts`.
- In `defeatBoss` (`src/lib/game/engine.ts`): keep the explosion/coins, set `flagDrop` instead of switching to `levelcomplete`; keep the existing final-level key branch.
- New `updateFlagDrop` in the update loop: gravity until it lands on ground, then overlap check with the player to trigger unlock + save + `mode = "levelcomplete"`.
- New `drawFlagDrop` in the render pass: pole, waving cloth using a sine offset, glow, plus an on-screen hint while it is uncollected.
- Add a short `flagRaise` chime to `src/lib/game/audio.ts`.
