# Knight & Princess Platformer Prototype

## Goal
Build a small, playable 2D platformer prototype in the browser where a knight traverses one level, fights monsters, loots chests, and defeats a dragon boss to save the princess.

## Game Design

### Controls
- **W** – walk left/right (hold)
- **Shift** – sprint (drains hunger)
- **Space** – jump
- **F** – sword poke (attack enemies/boss)
- **E** – interact: open chests, eat food from chests

### Stats
- **Health**: 5 hearts. Bandage heals 2.5 (halfway), first-aid kit heals to full.
- **Hunger**: 5 units. Sprinting drains hunger. Food from chests restores hunger.

### Level Flow
1. Knight starts on the left of a single scrolling level.
2. Traverse platforms, avoid or fight patrolling monster enemies with sword.
3. Open chests for bandages, first-aid kits, and food.
4. Reach the right side to trigger the dragon boss arena.
5. Boss phase: dragon flies and breathes fire; when it lands to rest, the player throws TNT (auto-thrown when near resting dragon, or press E/F) to damage it. Repeat until defeated.
6. Ending cutscene: dragon explodes, princess thanks the knight, kisses him, "The End".

## Technical Approach

- **Engine**: HTML5 Canvas rendered inside a React component in the TanStack Start app.
- **Game loop**: `requestAnimationFrame` with a fixed time step.
- **State**: Single game state object (player, enemies, chests, boss, particles, camera) managed via refs to avoid React re-render overhead.
- **Input**: Global keyboard listeners for W/Shift/Space/F/E.
- **Rendering**: Canvas 2D context drawing simple shapes/sprites. No external game engine.
- **UI overlay**: HTML/Tailwind HUD for health, hunger, and messages.

## File Plan

```text
src/routes/index.tsx          # Home route: renders the game
src/components/GameCanvas.tsx   # Canvas + game loop + input handlers
src/lib/game/GameEngine.ts    # Core state, update loop, collision
src/lib/game/entities.ts      # Player, Enemy, Chest, Dragon, TNT types/helpers
src/lib/game/render.ts        # Drawing functions
src/lib/game/constants.ts     # Canvas size, gravity, speeds, keys
```

## Build Steps

1. Set up the canvas component and input system.
2. Implement player movement: walk, sprint, jump, gravity, platforms.
3. Add hunger drain from sprinting and food healing.
4. Add enemies with simple patrol AI and sword combat.
5. Add chests with interact logic for bandages, first-aid kits, and food.
6. Build the dragon boss: fly/fire phase, land/rest phase, TNT damage, explosion on defeat.
7. Build the ending cutscene (princess dialog + kiss + "The End").
8. Add HUD and polish (start screen, game-over/restart).

## Out of Scope for This Prototype

- Multiple levels
- Save/load
- Sound or music
- Sprite art (use colored shapes + emoji as placeholders)
- Mobile touch controls

## Deliverable
A single playable web page at `/` where Felix can immediately test the controls and beat the dragon.
