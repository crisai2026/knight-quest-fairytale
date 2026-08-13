# 7 Levels, New Monsters, Tougher Dragon

Rework the single continuous world into 7 separate levels, each with its own theme, monster type, and exit. Health, hunger, arrows and TNT carry over between levels.

## The 7 levels

| # | Theme | Enemies | Notes |
|---|-------|---------|-------|
| 1 | Sunny forest | Furry horned monsters | Sword only |
| 2 | Night forest (same layout, dark) | Tentacle monsters | Moonlight, fireflies, dark palette |
| 3 | Beach | Furry + tentacle mix | Sand, palms, waves |
| 4 | Ocean (underwater) | New fish monsters | Swimming movement |
| 5 | Village | Winged monsters | Bow and arrows unlocked here |
| 6 | Desert | Insect monsters | Dunes, cacti, heat haze |
| 7 | Finale | None, then the dragon | Snow field → dark creepy forest (owl sounds, no enemies) → fire landscape → castle cutscene → boss fight |

## Level flow

- Each level ends at an exit gate on the right. Reaching it shows a short "Level Complete" card, then loads the next level.
- Player stats (hearts, hunger, arrows, TNT, weapon) carry forward.
- Dying restarts the current level, not the whole game.
- A level banner ("Level 3 — Beach") shows at the start of each level.

## Ocean level (4)

Underwater swimming: low gravity, floating drift, hold jump to swim up, down key to dive. Fish monsters swim toward the knight in all directions instead of patrolling on the ground. Bubbles and light shafts in the background.

## Level 7 finale

1. Snow biome: quiet snowy platforming, falling snow.
2. Dark creepy forest: no enemies, black twisted trees, owl hoots, low ambient sound.
3. Fire landscape: cracked ground, embers, lava glow.
4. Cutscene: the knight walks up to the dragon's castle.
5. Boss fight, unchanged rules: grab TNT from pails while the dragon rests, throw it, dragon now has **50 health** instead of 20. Then the key drops and frees the princess from the cage.

## Enemies

- **Fish** (new, ocean): swims freely, homes in on the knight, killed by sword or arrows.
- **Insect** (new, desert): fast skittering ground enemy that hops.
- Existing furry, tentacle and winged monsters keep their behaviour; winged ones still need the bow.

## Weapons

Bow stays locked until level 5 — pressing R before that shows "You don't have a bow yet". From level 5 on, R toggles sword/bow as it does today.

## Technical notes

- Add `src/lib/game/levels.ts` with a per-level definition: biome, platforms, enemy spawns, chests, pails, exit position, and length.
- `GameState` gains `levelIndex`, `levelComplete`, and a carried-over player snapshot; `Biome` type extends to `night`, `beach`, `ocean`, `village`, `desert`, `snow`, `dark`, `fire`, `castle`.
- `EnemyKind` extends with `fish` and `insect`; add their update and draw functions in `engine.ts`.
- Swim physics gated on `biome === "ocean"` inside the player update.
- Owl hoots via small procedural WebAudio tones (no asset files) so the creepy forest has sound without adding binaries.
- Dragon `maxHealth` 20 → 50; TNT pail refills tuned so the longer fight stays winnable.
