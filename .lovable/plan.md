# Shark boss: single water bolt instead of 3-shot spread

For the Ocean test chapter (Level 4), make the Giant Shark's attack easier to dodge by replacing the triple spread with a single aimed water bolt.

## Changes

1. **Single bolt attack** in `src/lib/game/engine.ts`:
   - Replace the shark's `for (const spread of [-0.28, 0, 0.28])` loop with a single projectile aimed directly at the knight.
   - Keep the lowered velocity (4) and radius (9) from the previous tuning.

2. **Balance check**:
   - Make sure the shorter rest window still provides enough pressure when combined with the easier-to-dodge single bolt.
   - Tweak rest frames or projectile speed if the fight becomes too easy or still too punishing.

Only the Ocean chapter's Giant Shark attack pattern changes.
