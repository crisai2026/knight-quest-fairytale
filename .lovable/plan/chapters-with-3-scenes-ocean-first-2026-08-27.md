# Chapters with 3 Scenes (Ocean first)

Each level becomes a **chapter** made of **3 scenes**. Trying it on the Ocean chapter (Level 4) only; the other nine levels keep working exactly as they do now.

## How it plays

1. **Scene 1 — Shallow reef.** Swim right through fish enemies and chests. At the far right end stands a small victory flag; grab it and Scene 2 loads immediately (health, hunger, coins, arrows all carry over).
2. **Scene 2 — Deeper trench.** A longer, harder stretch: more fish, tighter platforms. Another small flag at the end leads to Scene 3.
3. **Scene 3 — Boss arena.** The Giant Shark fight, with TNT pails as usual. When it dies it drops a **big golden victory flag** (larger pole, bigger cloth, stronger glow). Taking that flag completes the chapter, unlocks Level 5 and returns you to the village.

Dying restarts the current scene, not the whole chapter. On-screen banner shows "The Deep Ocean — Scene 2 of 3".

## Ocean look

Add an underwater background layer to the ocean biome: branching coral clusters (pink, orange, purple) sitting along the seabed, plus tall seaweed fronds that sway with a slow sine wave, drawn at two parallax depths behind the action so the water feels alive. Existing bubbles/light shafts stay.

## Harder shark

- Health 85 → 170, so it needs roughly twice the TNT.
- Shorter rest window (vulnerable phase 300 → 200 frames) and a longer active phase.
- Faster charges and a 3-shot spread of water bolts instead of single shots.

## Technical notes

- `src/lib/game/levels.ts`: add optional `scenes?: SceneDef[]` to `LevelDef` (`width`, `platforms`, `enemies`, `chests`, `boss?`). Fill it in for the ocean level; levels without `scenes` behave as a single scene as today.
- `src/lib/game/types.ts`: add `sceneIndex` / `sceneCount` to `GameState`, and `big: boolean` + `isSceneExit: boolean` to `FlagDrop`.
- `src/lib/game/engine.ts`:
  - `loadLevel(levelIndex, carry, progress, sceneIndex = 0)` picks the scene's geometry; boss/pails only spawn on the boss scene.
  - Pre-plant a scene-exit flag near the right edge for non-boss scenes.
  - `updateFlagDrop` branches: scene-exit flag → `advanceScene()` (reload next scene keeping player stats); boss flag → existing unlock + save + `levelcomplete`.
  - `restartLevel` reloads the current `sceneIndex`.
  - `drawFlagDrop` scales pole/cloth for the big flag; new `drawCoralAndSeaweed` in the ocean background pass.
- `src/lib/game/bosses.ts`: tune the `shark` entry (hp, restFrames, activeFrames, attackEvery, speed).
