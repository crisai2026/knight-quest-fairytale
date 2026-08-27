# 10 Levels, 10 Bosses, Village Hub

The game becomes a hub-and-levels adventure: an opening cutscene, a village you always return to, a world map of portals, and 10 themed levels that each end in a boss fight.

## Opening cutscene

Before the game starts, a skippable cutscene (press any key / tap to skip):

1. The dragon lands over the village with the wizard at his side.
2. He orders his monster minions to carry the princess away.
3. Mayor Bumbleworth begs the knight to save her.
4. The knight steps out into the village hub.

## The 10 levels and bosses

| # | Level | Boss |
|---|-------|------|
| 1 | Sunny forest | Giant furry horned monster |
| 2 | Night forest | Giant owl |
| 3 | Beach | Giant crab |
| 4 | Ocean | Giant shark |
| 5 | Sky | Thunder cloud |
| 6 | Jungle | Gorilla |
| 7 | Snow field | Polar bear |
| 8 | Desert | Scorpion |
| 9 | Snow mountain | The Wizard (dragon's second in command) |
| 10 | Dragon's castle | The Dragon — free the princess |

Every level keeps its regular monsters, then the boss arena at the end.

## Boss rule

All bosses work like the dragon: they attack, then tire and rest — grab TNT from the pails and throw it while they are down. Each boss has its own attacks:

- Furry giant: charges and stomps shockwaves
- Owl: dive swoops and feather darts
- Crab: claw sweeps and sand spray
- Shark: underwater lunges
- Thunder cloud: lightning strikes on the ground below
- Gorilla: throws rocks and pounds the ground
- Polar bear: charges and hurls snowballs
- Scorpion: stinger jabs and burrowing
- Wizard: teleports, fires magic bolts, summons two minions
- Dragon: fireballs, unchanged

HP and speed scale up level by level, with the wizard and dragon the hardest.

## Village hub and world map

- The village is no longer a level. After the cutscene, and after every boss you beat, you land back in the village.
- A **world map board** in the village shows all 10 levels. Locked ones are dark with a padlock; unlocked ones show the boss's face and level name.
- Picking a level opens the matching **portal** in the village — the portal is themed to the level (water portal for ocean, sand swirl for beach, storm clouds for sky, etc.) and shows the boss face inside the ring. Walk into it to start.
- Shop stays in the village and stays open between levels; coins carry over.

## Villager mini-games

Each villager has an activity that fits who they are, replayable for coins:

- **Farmer Bram** — feed the animals: toss food to hungry pigs, chickens and the cow before the timer runs out.
- **Nan Crumb** — catch the loaves falling from her window before they hit the ground.
- **Tilda the Tailor** — flower picking: gather the flower colours she calls out, in order.
- **Old Man Fenwick** — spoon-fighting target practice: hit the dummies with sword or bow for a score.

Beating your best score pays extra coins, so the village stays worth visiting.

## Progression

- Levels unlock one by one; level 10 only opens after the wizard falls.
- Health, hunger, arrows, coins, bow and shop upgrades all carry across.
- Dying sends you back to the village, not to the start of the game; you can re-enter the level from the portal.

## Technical notes

- `levels.ts` grows to 10 defs plus new biomes (`jungle`, `sky`, `mountain`) and a separate village hub scene that is no longer indexed as a level.
- New `BossDef` type in a `bosses.ts` module: HP, rest cadence, attack list; the existing dragon becomes one entry so the TNT/pail code is shared by all ten.
- `GameState` gains `unlockedLevels`, `selectedLevel`, and `hubMode`; progress persists in localStorage.
- New game modes: `intro` (cutscene), `hub`, `map`, `minigame`.
- Mini-games run as small self-contained modes drawn on the same canvas, returning coins to the shared player state.
- New enemy/boss draw routines in `engine.ts`; boss faces on the map are drawn from those same routines at small scale, so no image assets are needed.
- Music: existing cheery/creepy/rock tracks reused per biome, with a new tense boss variant and a wizard theme.

This is a large build, so it will land in stages: cutscene + hub/map/portals first, then bosses, then mini-games.
