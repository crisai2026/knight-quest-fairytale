# Shark boss tuning: less twitch, more damage-window pressure

For the Ocean test chapter (Level 4), retune the Giant Shark boss so the difficulty comes from short vulnerable windows rather than fast reflex dodging.

## Changes

1. **Shorter rest window** in `src/lib/game/bosses.ts`:
   - Reduce the shark's `restFrames` so the vulnerable phase lasts less time.
   - Keep `hp` at 170 and TNT damage at 10; the challenge becomes landing TNT hits before the shark wakes up.

2. **Slower water bolts** in `src/lib/game/engine.ts`:
   - Lower the velocity multiplier in the shark's 3-shot spread attack (currently multiplied by 6).
   - Slower bolts are easier to dodge, reducing twitch/reflex difficulty while the shorter rest raises the damage-output pressure.

3. **Play-test balance check**:
   - Verify the boss still feels threatening but not unfair on both keyboard and mobile touch controls.
   - Adjust the exact numbers if the fight becomes too long or too easy.

No other bosses or levels change; this only affects the Ocean chapter's Giant Shark.
