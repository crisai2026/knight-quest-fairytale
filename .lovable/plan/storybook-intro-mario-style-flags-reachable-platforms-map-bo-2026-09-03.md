# Storybook intro, Mario-style flags, reachable platforms, map boss face

## 1. Intro cutscene: a storybook opens

- The intro starts as a closed book on a dark table; it opens with an animated page-turn, and each intro line is written on the left page while the scene is drawn on the right page (parchment frame, gold border, page-turn sound on each line).
- Story beats stay the same, with two changes:
  - The minions that carry the princess are only the horned furry and the tentacle monster. The winged monster is removed from the cutscene (it remains a normal enemy in levels).
  - They now **walk** the princess to the level portal instead of flying off.
  - New final beat: Zarvok the Wizard seals the portal with magic (purple rune ring, lock snap sound) before the mayor asks the knight for help.
- Skipping with any key/tap still works.

## 2. Flags: Mario-style celebration

For every chapter and every scene flag (not only ocean):

- Grabbing the flag stops normal play: the knight slides/holds the pole, the cloth slides down, and a short victory fanfare plays (level-clear jingle; bigger chapter fanfare for boss flags).
- The knight then does a celebration: a couple of victory jumps with arm raised, sparkles and confetti particles.
- After the celebration the existing "Level Complete" / next-scene transition runs as it does now.

## 3. Platforms reachable by a normal jump

- The knight's jump clears about 120px, so any platform more than ~90px above the surface below it is currently unreachable.
- Every level's platform list is re-laid out so each platform is at most ~80px above the ground or above a nearby lower platform, forming climbable staircases; the high ones stay in the level but get a stepping-stone below them.
- Enemies that patrol platforms keep their platform assignments (their y is adjusted to the new platform heights so nothing floats or falls).

## 4. World map: boss face on selection

- On the world map screen, selecting a level (arrow keys or a mouse/tap click on its tile) shows a large portrait panel at the top of the screen with that level's boss face, the boss name, the chapter name and the biome.
- Locked levels show a shadowed silhouette with a padlock instead of the face.
- Clicking a tile selects it; clicking again (or Enter) confirms as today.

## Technical notes

- `src/lib/game/engine.ts`: rewrite `drawIntro` as a book frame + per-phase scene; drop `winged` from `introMinion` calls and walk the princess group toward a drawn portal; add a wizard-seals-portal phase and one extra `INTRO_LINES` entry.
- Flag: extend `FlagDrop` handling with a `celebrate` timer in `GameState`; on pickup enter a short celebration state before setting `mode = "levelcomplete"` / `advanceScene()`. Add `victoryFanfare` (and a bigger chapter variant) to `src/lib/game/audio.ts`.
- Platforms: adjust the `plat(...)` y values in `src/lib/game/levels.ts` (including `FOREST_PLATFORMS`, per-level lists, scene lists and `VILLAGE_PLATFORMS`) so vertical gaps stay <= 80px; verify enemy spawn `y` values still land on platforms.
- Map: in `drawMapScreen`, reserve a top band and call the existing `drawBossFace` helper for `LEVELS[state.mapCursor].boss`; add a canvas click handler in `src/components/GameCanvas.tsx` that maps click coordinates to a map tile when `mode === "map"`.
