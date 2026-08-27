# Level start screen, real monster minions, and food pickups

Three changes to the knight game.

## 1. "Click to start" before a level begins

Right now walking into the portal drops you straight into the level. Instead:

- Entering the portal shows a level start card: level number, name/biome, the boss face, and "Click or press Space to start".
- The level only begins (timers, enemies, music) once you confirm. Esc returns you to the village.
- Works with mouse click, tap, and keyboard, so it works on phones too.

## 2. The princess is carried off by real level monsters

The intro cutscene currently uses two generic red blobs. They will be replaced by the actual monster art used in the levels — the horned furry, the tentacle monster, and a winged monster flying alongside — so kids recognise them again when they meet them in levels 1, 2 and 5.

## 3. Food jumps out of chests like coins, and says what it is

- Opening a chest no longer instantly refills hunger. It pops out 1-3 food items that arc out and bounce on the ground, exactly like coins do.
- Each food item is drawn as a recognisable little sprite: bread loaf, apple, cheese wedge, roast chicken leg, or berries.
- Walk over one (or press E) to eat it: hunger goes up, an eating sound plays, and a message says which food it was, e.g. "Ate an apple! +2 hunger".
- Different foods restore different amounts (berries small, chicken large), so several pieces are worth collecting.
- Uneaten food stays on the ground for the rest of the level.

## Technical notes

- `src/lib/game/types.ts`: add a `FoodDrop` type (`kind`, position, velocity, `hungerValue`) and a `foods: FoodDrop[]` array on `GameState`; add a `levelstart` game mode.
- `src/lib/game/engine.ts`:
  - `spawnFoods()` / `updateFoods()` / `drawFoods()` modelled on the existing `spawnCoins`/`updateCoins`/`drawCoins` pair, including gravity, ground bounce and magnet-style pickup radius.
  - `updateChests()` spawns food drops instead of applying hunger directly; `food` chests spawn 2-3, other chests may drop 1.
  - Portal entry sets `mode = "levelstart"` and stores the pending level; key/click handler starts the level via the existing level-load path.
  - New `drawLevelStart()` overlay reusing the existing boss-portrait helper.
  - Intro cutscene drawing reuses the existing enemy draw helpers for furry/tentacle/winged instead of the placeholder ellipses.
- `src/components/GameCanvas.tsx`: forward canvas clicks/taps as a start action during `levelstart`.
- `src/lib/game/audio.ts`: add a short "eat/crunch" sfx.
