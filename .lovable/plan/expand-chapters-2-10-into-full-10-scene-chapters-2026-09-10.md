# Expand chapters 2-10 into full 10-scene chapters

Chapter 1 (Sunny Forest) is the template everyone liked: 10 scenes, each with its own look
(weather / time of day) and its own small gameplay twist, unlocked one by one, with the boss
in scene 10. This applies the same treatment to the other nine chapters.

## What each chapter gets

- 10 scenes, named for their place, unlocked in order by catching the flag.
- Scene 10 is that chapter's boss arena (bosses stay as they are).
- Its own weather/time-of-day looks, so scenes inside a chapter also look different from each other.
- Its own monsters only (night forest = tentacles, sky = winged, desert = insects, ocean = fish, etc.).
- One brand-new signature twist per chapter, layered on top of the existing ones
  (wind, rain/slippery, fog, falling acorns, moving platforms, bounce mushrooms, time limit).

## New signature twist per chapter

| Chapter | New twist |
|---|---|
| 2 Night Forest | Darkness: a lantern circle of light, the rest of the screen dimmed |
| 3 Beach | Rising tide: water level creeps up and pushes you to higher ground |
| 4 Deep Ocean | Currents: zones that drag the knight sideways while swimming |
| 5 High Sky | Crumbling clouds: platforms fall away shortly after you stand on them |
| 6 Jungle | Vines/swing pads that fling you across gaps |
| 7 Snow Field | Ice: very slippery ground plus snow gusts |
| 8 Desert | Sandstorm: periodic blindness + heat that drains hunger faster |
| 9 Snow Mountain | Falling rocks/avalanche and steep climbs |
| 10 Dragon's Castle | Fire jets from the floor on a timed rhythm |

Each new twist is one simple, readable mechanic — telegraphed, not reflex-based, matching how
chapter 1 plays.

## Scene shape inside a chapter

Same rhythm chapter 1 uses, so it feels familiar but fresh:
1 warm-up, 2 platforming, 3 monster gauntlet, 4 the chapter's new twist introduced,
5 moving platforms, 6 timed run, 7 bounce/launch scene, 8 twist + weather at full strength,
9 everything mixed, 10 boss.

## Technical notes

- `src/lib/game/types.ts`: extend `SceneSky` with the new looks (night, tide, sandstorm, ice,
  ember) and add scene flags for the new mechanics (`darkness`, `tide`, `current`,
  `crumbling`, `swing`, `firejets`, `heat`).
- `src/lib/game/levels.ts`: add a `scenes: SceneDef[]` array of 10 to every chapter, built with
  the existing `plat`/`mplat`/`chest`/enemy helpers plus per-chapter spawn helpers. Chapter 4's
  three existing ocean scenes are expanded to 10. Reachability pass (`makeReachable`) keeps
  applying to all new scenes.
- `src/lib/game/engine.ts`: load the new flags from `SceneDef` into `GameState`, implement the
  new mechanics in the update loop, and add their drawing (lantern mask, tide water, current
  arrows, crumbling platform crack, swing pads, fire jets, sandstorm haze) to the render pass.
- Chapter map / scene map already generalise over `level.scenes`, so scene selection, progress
  saving and old-save compatibility need no structural change; verify each chapter opens its
  scene list.
- Verify with typecheck, build, and a browser pass through several chapters' scene maps.

## Scope note

This is a large content pass. Implementation will go chapter by chapter so each one can be
played and adjusted before moving on.
