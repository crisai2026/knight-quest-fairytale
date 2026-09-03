# World map: chapters → scenes

Two-step world map. The first screen keeps the 10 chapter tiles it has today. Clicking a chapter opens a second screen showing that chapter's scenes as tiles; clicking an unlocked scene sets the portal to that exact scene.

Only **Chapter 1 — Sunny Forest** gets the full 10-scene treatment now. Chapter 4 (Ocean) keeps its 3 scenes. The other chapters still show a single "Scene 1" tile and behave exactly as today.

## How it plays

1. Open the map board in the village → chapter grid (as now).
2. Click a chapter → scene screen: title band with the chapter name and its boss, then a row of scene tiles (1…10). The last tile is marked **Boss Fight** with the boss face; earlier tiles show a simple scene icon and name.
3. Locked scenes show a padlock. A scene unlocks once the previous one is cleared, so at first only Scene 1 of Sunny Forest is open.
4. Click an unlocked scene → back to the village with the portal set to "Sunny Forest — Scene 3". Entering the portal starts that scene directly; the start card names the scene.
5. Clearing a scene by grabbing its flag still chains straight into the next scene, and now also records the unlock permanently. Beating the boss in Scene 10 finishes the chapter and unlocks Chapter 2 as before.
6. A Back button (and Esc) returns from the scene screen to the chapter grid.

## Sunny Forest, 10 scenes

Nine platforming stretches through the forest with the existing furry enemies and chests, gently ramping up: slightly wider maps, more enemies and tighter platform spacing as the number climbs. Scene 10 is the Furry King arena with the TNT pails, ending with the big golden chapter flag.

## Technical notes

- `src/lib/game/levels.ts`: fill `scenes` for level 0 with 10 `SceneDef`s (the 10th `boss: true`). All scene platforms already run through `makeReachable`.
- `src/lib/game/types.ts`: add `mapView: "chapters" | "scenes"`, `mapChapter: number`, `mapSceneCursor: number`, `selectedScene: number`, and `sceneProgress: Record<number, number>` (scenes cleared per chapter) to `GameState`.
- `src/lib/game/engine.ts`:
  - `Progress` + save/load gain `sceneProgress`; `progressFrom`/`saveProgress` carry it.
  - `startLevel(state, levelIndex, sceneIndex)`; the portal / `levelstart` path passes `state.selectedScene`; `confirmLevelStart` uses it.
  - `advanceScene` and the boss-flag branch bump `sceneProgress[levelIndex]` and save.
  - `handleMapClick`: in `chapters` view a click on an unlocked tile switches to `scenes` view for that chapter (instead of setting the portal immediately); in `scenes` view it picks the scene or hits Back.
  - Keyboard map handling mirrors this: arrows move the cursor in the active view, E confirms, Esc goes scenes → chapters → close.
  - New `drawMapScenes` renders the scene grid; `drawMapScreen` dispatches on `mapView`.
  - `drawLevelStart` and the village portal label show the scene name when the chapter has scenes.
- Chapters without a `scenes` array report a single scene, so the scene screen works uniformly.
