# Top-down village hub

The village stops being a side-scrolling platformer screen and becomes a small top-down town you walk around in all four directions, Zelda-style. Levels, bosses and mini-games are unchanged.

## How it plays

- Arrows / WASD move the knight up, down, left and right (diagonals allowed). No gravity, no jumping in the village; the jump button does nothing there.
- The town is a square-ish map (about 1600 x 1200) that scrolls in both directions as you walk, with the knight drawn from above (head, shoulders, sword) and facing the direction he walks.
- Solid things block you: house walls, the well, fences, trees, market stalls, the pond edge and the outer town wall. Paths of dirt and grass connect everything.
- Press E next to anything to use it, same as today: villagers for mini-games, Pim for the shop, the mayor for chat, the world-map board, and the portal.
- The portal sits in a clearing on the right side of town, still showing the selected chapter/scene; walking up and pressing E opens the "click to start" card as it does now.
- Touch controls keep the same D-pad, with the left/right buttons joined by up/down while in the village.

## Town layout

- Town square in the middle with the well and the world-map board.
- Pim's shop and the mayor's house on the north side.
- Bram's farm (fenced animal pen) to the west, Nan's bakery north-east, Tilda's tailor shop south, Fenwick's training yard with dummies south-east.
- A short road east leads out to the portal clearing.

## What stays the same

- Health, hunger, coins, arrows, shop upgrades, saved progress, mini-games, the world map screen and every level/boss.
- Hunger keeps ticking, but there are no enemies in town.

## Technical notes

- `src/lib/game/types.ts`: `GameState` gains `topDown: boolean`; `Player` gains `facing4` ("up" | "down" | "left" | "right"). `Npc` gains a `y`.
- `src/lib/game/levels.ts`: replace `VILLAGE_WIDTH` / `VILLAGE_PLATFORMS` with `VILLAGE_W`, `VILLAGE_H`, a `VILLAGE_SOLIDS` rect list, a `VILLAGE_PROPS` list (houses, trees, well, fences, stalls, pond, dummies) and NPC positions in x/y. `MAP_BOARD_X` / `PORTAL_X` become x/y points.
- `src/lib/game/engine.ts`:
  - `loadVillage` sets `topDown = true` and loads the new solids/props.
  - `updatePlayer` branches: when `topDown`, apply 8-way velocity with friction, no gravity, and resolve collisions against `VILLAGE_SOLIDS` per axis; otherwise unchanged platformer code.
  - Camera: clamp both `cameraX` and a new `cameraY` in top-down mode; all village draw calls offset by both.
  - `nearestNpc` and the board/portal checks use 2D distance instead of `Math.abs(cx - x)`.
  - New draw routines: `drawVillageGround` (grass/paths/pond tiles), `drawVillageProps` (depth-sorted with the knight so he walks behind houses/trees), `drawKnightTopDown`, plus top-down variants of the map board and portal.
  - Death/respawn in the village puts the knight back at the town gate.
- `src/components/GameCanvas.tsx`: add up/down touch buttons (shown in the village), leave keyboard handling as is.
