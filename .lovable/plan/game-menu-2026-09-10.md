# Game Menu

A painted title screen that opens before the story, plus the same menu reachable at any time during play.

## What the player sees

On loading the game, instead of jumping straight into the storybook:

- A hand-painted scene: the knight on a rock with his sword raised, minions (furry and tentacle) circling the rock below, and in the misty background the dragon on the castle, the princess in her cage, and the wizard Zarvok with his staff.
- The title "Knight & Princess" above the art.
- A column of buttons on one side:
  - **Continue** — picks up from the last save (village hub with all unlocked chapters, coins, bow, hearts). Greyed out when there is no save yet.
  - **New Game** — wipes the save and starts the storybook intro from page one. Asks "Start over? Your progress will be lost." when a save exists.
  - **Restart** — same action as New Game; shown only when a save exists, so returning players have an obvious way to wipe and replay.
  - **Music: On / Off** — toggles the music, same setting the current speaker button uses.

## Reaching the menu during play

- A small "Menu" button in the corner (replaces the current music button, which moves inside the menu).
- Esc on desktop opens it too.
- Opening it pauses the game; Continue (labelled "Resume" in this case) returns to exactly where you were, New Game / Restart go back to the beginning.

## Technical notes

- New game mode `"menu"` in `src/lib/game/types.ts`; `createInitialState()` in `engine.ts` returns state in `menu` mode instead of `intro`.
- `MENU_ITEMS` list with hit rectangles; new `drawMenuScreen(ctx, state)` and `handleMenuClick(state, x, y)` exported from `engine.ts`, wired in `GameCanvas.tsx` next to the existing `handleMapClick` call. Arrow keys/W/S move the cursor, Enter/E activates, matching the world-map menu conventions.
- Save detection: small `hasSave()` helper reading `SAVE_KEY` from localStorage.
- New Game: `resetProgress()` then rebuild state from a fresh progress object and enter `intro`.
- Continue from the title screen: `loadVillage(createPlayer(progress), progress)`. Continue from a paused game: restore the snapshot taken when the menu opened (`menuReturn` field on state).
- Music toggle calls the existing `isMusicEnabled` / `setMusicEnabled` from `src/lib/game/audio.ts`; `musicForState` returns the `storybook` track while in `menu` so the title screen has music.
- Art drawn with canvas primitives in the same style as `drawIntroScene`: rock silhouette, knight with raised sword, two minions, castle/dragon/princess/wizard on a dusk gradient with fog bands.
- Touch layout: buttons sized for tapping, stacked and centred when the canvas is in the phone "cover" scale.
