import type {
  GameState,
  Player,
  Enemy,
  Chest,
  Platform,
  Dragon,
  Fireball,
  TNT,
  Arrow,
  Pail,
  Biome,
} from "./types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const WORLD_WIDTH = 6200;
export const GROUND_Y = 520;
export const GRAVITY = 0.6;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7.5;
export const JUMP_FORCE = -12;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;

export const SCARY_START = 1800;
export const LAVA_START = 3300;
export const CASTLE_START = 4600;
export const DRAGON_ARENA_X = 4900;
export const CAGE_X = 5700;

const GROUND: Platform = { x: 0, y: GROUND_Y, width: WORLD_WIDTH, height: 80 };

const PLATFORMS: Platform[] = [
  { x: 280, y: 430, width: 160, height: 20 },
  { x: 560, y: 360, width: 140, height: 20 },
  { x: 820, y: 430, width: 180, height: 20 },
  { x: 1120, y: 340, width: 120, height: 20 },
  { x: 1380, y: 400, width: 160, height: 20 },
  { x: 1660, y: 320, width: 140, height: 20 },
  { x: 1980, y: 420, width: 170, height: 20 },
  { x: 2280, y: 350, width: 140, height: 20 },
  { x: 2600, y: 420, width: 160, height: 20 },
  { x: 2950, y: 330, width: 140, height: 20 },
  { x: 3450, y: 420, width: 150, height: 20 },
  { x: 3750, y: 350, width: 140, height: 20 },
  { x: 4080, y: 420, width: 160, height: 20 },
  { x: 4380, y: 340, width: 140, height: 20 },
  { x: 4750, y: 420, width: 150, height: 20 },
];

function enemy(
  kind: Enemy["kind"],
  x: number,
  patrolStart: number,
  patrolEnd: number,
  opts: { y?: number; health?: number; vx?: number } = {}
): Enemy {
  const flying = kind === "winged";
  const width = kind === "tentacle" ? 44 : 40;
  const height = flying ? 34 : 42;
  const baseY = opts.y ?? (flying ? 300 : GROUND_Y - height);
  return {
    kind,
    x,
    y: baseY,
    baseY,
    width,
    height,
    vx: opts.vx ?? (flying ? 2 : 1.3),
    health: opts.health ?? (kind === "furry" ? 2 : kind === "tentacle" ? 3 : 2),
    patrolStart,
    patrolEnd,
    flash: 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

const ENEMIES: Enemy[] = [
  // Sunny forest
  enemy("furry", 420, 360, 600),
  enemy("furry", 900, 840, 1040),
  enemy("winged", 1150, 1080, 1400, { y: 300 }),
  enemy("furry", 1560, 1500, 1720),
  // Scary forest
  enemy("tentacle", 2000, 1940, 2180),
  enemy("winged", 2350, 2250, 2600, { y: 280 }),
  enemy("tentacle", 2700, 2620, 2880),
  enemy("furry", 3000, 2940, 3180),
  enemy("winged", 3150, 3000, 3300, { y: 240 }),
  // Lava land
  enemy("tentacle", 3500, 3440, 3680),
  enemy("winged", 3850, 3750, 4100, { y: 270 }),
  enemy("furry", 4150, 4080, 4320),
  enemy("tentacle", 4400, 4340, 4560),
  enemy("winged", 4500, 4380, 4600, { y: 230 }),
];

const CHESTS: Chest[] = [
  { x: 340, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "bandage", label: "Bandage" },
  { x: 620, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "food", label: "Food" },
  { x: 1160, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "arrows", label: "Arrows" },
  { x: 1700, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "food", label: "Food" },
  { x: 2200, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "firstaid", label: "First Aid" },
  { x: 2800, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "arrows", label: "Arrows" },
  { x: 3200, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "food", label: "Food" },
  { x: 3600, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "bandage", label: "Bandage" },
  { x: 4200, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "arrows", label: "Arrows" },
  { x: 4650, y: GROUND_Y - 24, width: 32, height: 24, opened: false, item: "firstaid", label: "First Aid" },
];

const PAILS: Pail[] = [
  { x: DRAGON_ARENA_X - 120, y: GROUND_Y - 34, width: 34, height: 34 },
  { x: DRAGON_ARENA_X + 380, y: GROUND_Y - 34, width: 34, height: 34 },
];

function createPlayer(): Player {
  return {
    x: 60,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    facing: "right",
    health: 5,
    maxHealth: 5,
    hunger: 5,
    maxHunger: 5,
    onGround: false,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    invulnerable: 0,
    weapon: "sword",
    arrowsLeft: 15,
    tnt: 0,
    hasKey: false,
  };
}

function createDragon(): Dragon {
  return {
    x: DRAGON_ARENA_X + 260,
    y: 170,
    width: 110,
    height: 70,
    health: 20,
    maxHealth: 20,
    state: "flying",
    timer: 0,
    fireballs: [],
    restCount: 0,
    flash: 0,
    dir: -1,
  };
}

export function createInitialState(): GameState {
  return {
    mode: "playing",
    cameraX: 0,
    player: createPlayer(),
    enemies: ENEMIES.map((e) => ({ ...e })),
    chests: CHESTS.map((c) => ({ ...c })),
    platforms: [GROUND, ...PLATFORMS.map((p) => ({ ...p }))],
    particles: [],
    arrows: [],
    pails: PAILS.map((p) => ({ ...p })),
    dragon: null,
    tntList: [],
    keyDrop: null,
    cage: { x: CAGE_X, y: GROUND_Y - 96, width: 80, height: 96, open: false },
    message: "",
    messageTimer: 0,
    cutsceneTimer: 0,
    cutscenePhase: 0,
    keys: {},
    started: false,
    biome: "sunny",
    biomeLabelTimer: 0,
  };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function showMessage(state: GameState, text: string, frames = 120) {
  state.message = text;
  state.messageTimer = frames;
}

function spawnParticle(state: GameState, x: number, y: number, color: string, count = 1, speed = 3) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const mag = Math.random() * speed + 1;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function spawnExplosion(state: GameState, x: number, y: number) {
  spawnParticle(state, x, y, "#ef4444", 30, 6);
  spawnParticle(state, x, y, "#f59e0b", 20, 5);
  spawnParticle(state, x, y, "#6b7280", 15, 4);
}

function biomeFor(x: number): Biome {
  if (x >= CASTLE_START) return "castle";
  if (x >= LAVA_START) return "lava";
  if (x >= SCARY_START) return "scary";
  return "sunny";
}

const BIOME_NAMES: Record<Biome, string> = {
  sunny: "Sunny Forest",
  scary: "Scary Forest",
  lava: "Lava Lands",
  castle: "The Dragon's Castle",
};

function updatePlayer(state: GameState) {
  const p = state.player;
  const keys = state.keys;

  let moveLeft = false;
  let moveRight = false;

  if (keys["a"] || keys["arrowleft"]) moveLeft = true;
  if (keys["d"] || keys["arrowright"]) moveRight = true;

  const sprinting = keys["shift"] && p.hunger > 0;
  const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;

  if (moveLeft && !moveRight) {
    p.vx = -speed;
    p.facing = "left";
  } else if (moveRight && !moveLeft) {
    p.vx = speed;
    p.facing = "right";
  } else {
    p.vx = 0;
  }

  if (sprinting && (moveLeft || moveRight)) {
    p.hunger = Math.max(0, p.hunger - 0.008);
    if (p.hunger <= 0) showMessage(state, "Too hungry to sprint!");
  }

  if (keys[" "] && p.onGround) {
    p.vy = JUMP_FORCE;
    p.onGround = false;
    keys[" "] = false;
  }

  // R switches weapon back and forth
  if (keys["r"]) {
    p.weapon = p.weapon === "sword" ? "bow" : "sword";
    showMessage(state, p.weapon === "bow" ? "Bow equipped — F to shoot" : "Sword equipped — F to swing", 70);
    keys["r"] = false;
  }

  if (keys["f"] && p.attackCooldown <= 0 && !p.attacking) {
    if (p.weapon === "sword") {
      p.attacking = true;
      p.attackTimer = 12;
      p.attackCooldown = 25;
    } else if (p.arrowsLeft > 0) {
      p.arrowsLeft--;
      p.attackCooldown = 22;
      p.attacking = true;
      p.attackTimer = 8;
      const arrow: Arrow = {
        x: p.facing === "right" ? p.x + p.width : p.x,
        y: p.y + 18,
        vx: p.facing === "right" ? 12 : -12,
        vy: -1.2,
        life: 90,
      };
      state.arrows.push(arrow);
      keys["f"] = false;
    } else {
      showMessage(state, "Out of arrows! Find a chest.", 70);
      p.attackCooldown = 30;
      keys["f"] = false;
    }
  }

  if (p.attacking) {
    p.attackTimer--;
    if (p.attackTimer <= 0) p.attacking = false;
  }
  if (p.attackCooldown > 0) p.attackCooldown--;

  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;

  p.x = clamp(p.x, 0, WORLD_WIDTH - p.width);

  p.onGround = false;
  for (const platform of state.platforms) {
    if (rectsOverlap(p, platform)) {
      const prevY = p.y - p.vy;
      if (prevY + p.height <= platform.y + 4 && p.vy >= 0) {
        p.y = platform.y - p.height;
        p.vy = 0;
        p.onGround = true;
      } else if (prevY >= platform.y + platform.height - 4 && p.vy < 0) {
        p.y = platform.y + platform.height;
        p.vy = 0;
      } else if (p.x + p.width / 2 < platform.x + platform.width / 2) {
        p.x = platform.x - p.width;
      } else {
        p.x = platform.x + platform.width;
      }
    }
  }

  if (p.y > CANVAS_HEIGHT + 100) p.health = 0;
  if (p.invulnerable > 0) p.invulnerable--;

  const nextBiome = biomeFor(p.x);
  if (nextBiome !== state.biome) {
    state.biome = nextBiome;
    state.biomeLabelTimer = 180;
    showMessage(state, BIOME_NAMES[nextBiome], 120);
  }
  if (state.biomeLabelTimer > 0) state.biomeLabelTimer--;

  if (p.x >= DRAGON_ARENA_X - 200 && state.dragon === null && state.cage.open === false && state.keyDrop === null) {
    state.dragon = createDragon();
    showMessage(state, "The dragon! Grab TNT from a pail, throw it when it lands.", 180);
  }
}

function damageEnemy(state: GameState, e: Enemy, amount: number) {
  e.health -= amount;
  e.flash = 10;
  spawnParticle(state, e.x + e.width / 2, e.y + e.height / 2, "#22c55e", 5, 3);
  if (e.health <= 0) spawnExplosion(state, e.x + e.width / 2, e.y + e.height / 2);
}

function updateEnemies(state: GameState) {
  const p = state.player;

  for (const e of state.enemies) {
    if (e.health <= 0) continue;

    e.x += e.vx;
    if (e.x <= e.patrolStart || e.x + e.width >= e.patrolEnd) e.vx *= -1;
    e.x = clamp(e.x, e.patrolStart, e.patrolEnd - e.width);

    e.wobble += e.kind === "winged" ? 0.12 : 0.06;
    if (e.kind === "winged") {
      e.y = e.baseY + Math.sin(e.wobble) * 40;
    } else if (e.kind === "tentacle") {
      e.y = e.baseY + Math.sin(e.wobble) * 3;
    }

    if (e.flash > 0) e.flash--;

    if (rectsOverlap(p, e) && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      p.vx = p.x < e.x ? -6 : 6;
      p.vy = -4;
      showMessage(state, "Ouch!", 60);
    }

    if (p.weapon === "sword" && p.attacking && p.attackTimer > 6) {
      const reach = 50;
      const attackBox = {
        x: p.facing === "right" ? p.x + p.width : p.x - reach,
        y: p.y,
        width: reach,
        height: p.height,
      };
      if (rectsOverlap(attackBox, e)) damageEnemy(state, e, 1);
    }
  }

  state.enemies = state.enemies.filter((e) => e.health > 0);
}

function updateArrows(state: GameState) {
  for (let i = state.arrows.length - 1; i >= 0; i--) {
    const a = state.arrows[i]!;
    a.x += a.vx;
    a.y += a.vy;
    a.vy += 0.06;
    a.life--;

    let hit = false;
    for (const e of state.enemies) {
      if (e.health <= 0) continue;
      if (rectsOverlap({ x: a.x - 4, y: a.y - 2, width: 12, height: 5 }, e)) {
        damageEnemy(state, e, 1);
        hit = true;
        break;
      }
    }

    const d = state.dragon;
    if (!hit && d && rectsOverlap({ x: a.x - 4, y: a.y - 2, width: 12, height: 5 }, d)) {
      spawnParticle(state, a.x, a.y, "#94a3b8", 4, 2);
      hit = true;
    }

    if (hit || a.life <= 0 || a.y > GROUND_Y) {
      state.arrows.splice(i, 1);
    }
  }
  state.enemies = state.enemies.filter((e) => e.health > 0);
}

function updateChests(state: GameState) {
  const p = state.player;
  if (!state.keys["e"]) return;

  let used = false;
  for (const chest of state.chests) {
    if (chest.opened) continue;
    const dx = p.x + p.width / 2 - (chest.x + chest.width / 2);
    const dy = p.y + p.height / 2 - (chest.y + chest.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      chest.opened = true;
      used = true;
      spawnParticle(state, chest.x + chest.width / 2, chest.y + chest.height / 2, "#eab308", 8, 3);
      if (chest.item === "bandage") {
        p.health = Math.min(p.maxHealth, p.health + 2.5);
        showMessage(state, "Bandage! +2.5 health");
      } else if (chest.item === "firstaid") {
        p.health = p.maxHealth;
        showMessage(state, "First aid kit! Full health");
      } else if (chest.item === "food") {
        p.hunger = p.maxHunger;
        showMessage(state, "Food! Hunger restored");
      } else {
        p.arrowsLeft += 12;
        showMessage(state, "+12 arrows");
      }
    }
  }

  // TNT pails
  for (const pail of state.pails) {
    const dx = p.x + p.width / 2 - (pail.x + pail.width / 2);
    if (Math.abs(dx) < 70 && Math.abs(p.y - pail.y) < 90 && p.tnt < 5) {
      p.tnt = 5;
      used = true;
      showMessage(state, "Took TNT from the pail (5)", 80);
    }
  }

  if (used) state.keys["e"] = false;
}

function updateDragon(state: GameState) {
  if (state.dragon === null) return;
  const d = state.dragon;
  const p = state.player;

  d.timer++;
  if (d.flash > 0) d.flash--;

  for (let i = d.fireballs.length - 1; i >= 0; i--) {
    const fb = d.fireballs[i]!;
    fb.x += fb.vx;
    fb.y += fb.vy;
    fb.life--;
    if (fb.life <= 0 || fb.y > GROUND_Y) {
      d.fireballs.splice(i, 1);
      continue;
    }
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const dx = fb.x - cx;
    const dy = fb.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) < fb.radius + p.width / 2 && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      d.fireballs.splice(i, 1);
      showMessage(state, "Fire!", 60);
    }
  }

  const groundY = GROUND_Y - d.height;
  const flyY = 160;

  switch (d.state) {
    case "flying": {
      d.y = flyY + Math.sin(d.timer * 0.05) * 20;
      d.x += d.dir * 1.6;
      if (d.x < DRAGON_ARENA_X - 100) d.dir = 1;
      if (d.x > DRAGON_ARENA_X + 500) d.dir = -1;
      if (d.timer % 70 === 0) {
        d.fireballs.push({
          x: d.x + d.width / 2,
          y: d.y + d.height,
          vx: (p.x - d.x) * 0.006,
          vy: 3 + Math.random() * 2,
          radius: 10,
          life: 160,
        } satisfies Fireball);
      }
      if (d.timer > 200) {
        d.state = "landing";
        d.timer = 0;
      }
      break;
    }
    case "landing": {
      d.y += (groundY - d.y) * 0.08;
      if (Math.abs(d.y - groundY) < 2) {
        d.y = groundY;
        d.state = "resting";
        d.timer = 0;
        showMessage(state, "The dragon landed — throw TNT with E!", 90);
      }
      break;
    }
    case "resting": {
      if (d.timer > 330) {
        d.state = "taking_off";
        d.timer = 0;
      }
      break;
    }
    case "taking_off": {
      d.y += (flyY - d.y) * 0.08;
      if (Math.abs(d.y - flyY) < 2) {
        d.y = flyY;
        d.state = "flying";
        d.timer = 0;
        d.restCount++;
      }
      break;
    }
  }

  if (d.state === "resting" && state.keys["e"] && p.tnt > 0 && state.tntList.length < 3) {
    const dx = p.x + p.width / 2 - (d.x + d.width / 2);
    const dy = p.y + p.height / 2 - (d.y + d.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < 320) {
      p.tnt--;
      state.tntList.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: p.facing === "right" ? 9 : -9,
        vy: -6,
        fuse: 55,
        exploded: false,
      });
      state.keys["e"] = false;
    }
  }
}

function updateTNT(state: GameState) {
  const d = state.dragon;

  for (let i = state.tntList.length - 1; i >= 0; i--) {
    const t = state.tntList[i]!;
    t.vy += GRAVITY * 0.5;
    t.x += t.vx;
    t.y += t.vy;
    t.fuse--;

    if (d && !t.exploded && rectsOverlap({ x: t.x - 6, y: t.y - 6, width: 12, height: 12 }, d)) {
      t.fuse = 0;
    }

    if (t.fuse <= 0 && !t.exploded) {
      t.exploded = true;
      spawnExplosion(state, t.x, t.y);
      if (d) {
        const dx = t.x - (d.x + d.width / 2);
        const dy = t.y - (d.y + d.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 130) {
          d.health--;
          d.flash = 12;
          spawnParticle(state, d.x + d.width / 2, d.y + d.height / 2, "#f97316", 12, 5);
          if (d.health <= 0) {
            spawnExplosion(state, d.x + d.width / 2, d.y + d.height / 2);
            spawnExplosion(state, d.x + d.width / 2 + 40, d.y + d.height / 2);
            state.keyDrop = { x: d.x + d.width / 2, y: d.y + d.height / 2, vy: 0, collected: false };
            state.dragon = null;
            showMessage(state, "The dragon explodes and drops a key!", 200);
          } else {
            showMessage(state, `Dragon hit! ${d.health} HP left`, 60);
          }
        }
      }
      state.tntList.splice(i, 1);
    } else if (t.y > CANVAS_HEIGHT + 100) {
      state.tntList.splice(i, 1);
    }
  }
}

function updateKeyAndCage(state: GameState) {
  const p = state.player;
  const k = state.keyDrop;

  if (k && !k.collected) {
    k.vy += GRAVITY * 0.4;
    k.y = Math.min(GROUND_Y - 16, k.y + k.vy);
    if (k.y >= GROUND_Y - 16) k.vy = 0;
    const dx = p.x + p.width / 2 - k.x;
    const dy = p.y + p.height / 2 - k.y;
    if (Math.sqrt(dx * dx + dy * dy) < 60 && state.keys["e"]) {
      k.collected = true;
      p.hasKey = true;
      state.keys["e"] = false;
      spawnParticle(state, k.x, k.y, "#facc15", 12, 3);
      showMessage(state, "Got the cage key! Free the princess.", 160);
    }
  }

  const cage = state.cage;
  if (!cage.open && p.hasKey && state.keys["e"]) {
    const dx = p.x + p.width / 2 - (cage.x + cage.width / 2);
    if (Math.abs(dx) < 90) {
      cage.open = true;
      state.keys["e"] = false;
      spawnParticle(state, cage.x + cage.width / 2, cage.y + cage.height / 2, "#facc15", 20, 4);
      state.mode = "cutscene";
      state.cutsceneTimer = 0;
      state.cutscenePhase = 0;
    }
  }
}

function updateParticles(state: GameState) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i]!;
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.15;
    pt.life--;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}

function updateCamera(state: GameState) {
  const target = state.player.x - CANVAS_WIDTH / 3;
  state.cameraX += (target - state.cameraX) * 0.1;
  state.cameraX = clamp(state.cameraX, 0, WORLD_WIDTH - CANVAS_WIDTH);
}

function updateCutscene(state: GameState) {
  state.cutsceneTimer++;
  const phaseDuration = 180;
  state.cutscenePhase = Math.floor(state.cutsceneTimer / phaseDuration);

  if (state.cutscenePhase === 0) {
    state.message = "The cage swings open!";
  } else if (state.cutscenePhase === 1) {
    state.message = "Princess: Thank you, brave knight!";
  } else if (state.cutscenePhase === 2) {
    state.message = "*kiss*";
  } else {
    state.mode = "won";
    state.message = "The End";
  }
  state.messageTimer = 10;
}

export function updateGame(state: GameState) {
  if (state.mode === "won" || state.mode === "gameover") return;

  if (state.mode === "cutscene") {
    updateCutscene(state);
    updateParticles(state);
    return;
  }

  updatePlayer(state);
  updateEnemies(state);
  updateArrows(state);
  updateChests(state);
  updateDragon(state);
  updateTNT(state);
  updateKeyAndCage(state);
  updateParticles(state);
  updateCamera(state);

  if (state.player.health <= 0) {
    state.mode = "gameover";
    state.message = "Game Over — Refresh to try again";
    state.messageTimer = 300;
  }

  if (state.messageTimer > 0) state.messageTimer--;
  if (state.messageTimer <= 0) state.message = "";
}

export function handleKeyDown(state: GameState, key: string) {
  state.keys[key] = true;
  if (!state.started && key !== "") state.started = true;
}

export function handleKeyUp(state: GameState, key: string) {
  state.keys[key] = false;
}

/* ---------------- Rendering ---------------- */

function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform, cameraX: number, biome: Biome) {
  const top = biome === "sunny" ? "#4ade80" : biome === "scary" ? "#334155" : biome === "lava" ? "#7c2d12" : "#475569";
  const body = biome === "sunny" ? "#78350f" : biome === "scary" ? "#1e293b" : biome === "lava" ? "#450a0a" : "#334155";
  ctx.fillStyle = body;
  ctx.fillRect(platform.x - cameraX, platform.y, platform.width, platform.height);
  ctx.fillStyle = top;
  ctx.fillRect(platform.x - cameraX, platform.y, platform.width, 6);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, scary: boolean) {
  ctx.fillStyle = scary ? "#1c1917" : "#7c3f16";
  ctx.fillRect(x, GROUND_Y - 90, 14, 90);
  ctx.fillStyle = scary ? "#0f172a" : "#16a34a";
  ctx.beginPath();
  ctx.moveTo(x - 26, GROUND_Y - 80);
  ctx.lineTo(x + 7, GROUND_Y - 150);
  ctx.lineTo(x + 40, GROUND_Y - 80);
  ctx.closePath();
  ctx.fill();
  if (scary) {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 2, GROUND_Y - 110, 3, 3);
    ctx.fillRect(x + 10, GROUND_Y - 110, 3, 3);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.biome;
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  if (b === "sunny") {
    gradient.addColorStop(0, "#7dd3fc");
    gradient.addColorStop(1, "#bbf7d0");
  } else if (b === "scary") {
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1f2937");
  } else if (b === "lava") {
    gradient.addColorStop(0, "#450a0a");
    gradient.addColorStop(1, "#b45309");
  } else {
    gradient.addColorStop(0, "#1e1b4b");
    gradient.addColorStop(1, "#312e81");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (b === "sunny") {
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(680, 90, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 380 - state.cameraX * 0.3) % 1600) - 200;
      ctx.beginPath();
      ctx.arc(cx, 90 + (i % 3) * 40, 26, 0, Math.PI * 2);
      ctx.arc(cx + 30, 90 + (i % 3) * 40, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b === "scary") {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(650, 90, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 173 - state.cameraX * 0.2) % WORLD_WIDTH + WORLD_WIDTH) % WORLD_WIDTH;
      ctx.fillRect(sx % CANVAS_WIDTH, (i * 37) % 220, 2, 2);
    }
  } else if (b === "castle") {
    ctx.fillStyle = "#111827";
    for (let i = 0; i < 6; i++) {
      const tx = i * 170 - (state.cameraX * 0.4) % 170;
      ctx.fillRect(tx, 150, 90, GROUND_Y - 150);
      ctx.fillRect(tx - 10, 120, 110, 34);
    }
  }

  // Scenery trees
  if (b === "sunny" || b === "scary") {
    for (let i = 0; i < 20; i++) {
      const wx = i * 320 + 120;
      const sx = wx - state.cameraX * 0.7;
      if (sx > -80 && sx < CANVAS_WIDTH + 80) drawTree(ctx, sx, b === "scary");
    }
  }

  if (b === "lava") {
    ctx.fillStyle = "#f97316";
    for (let i = 0; i < 30; i++) {
      const t = (Date.now() / 20 + i * 40) % 400;
      ctx.globalAlpha = 0.5;
      ctx.fillRect((i * 97 - state.cameraX * 0.5) % CANVAS_WIDTH, GROUND_Y - t, 3, 6);
      ctx.globalAlpha = 1;
    }
  }
}

function drawGroundStrip(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.biome;
  const color = b === "sunny" ? "#166534" : b === "scary" ? "#0b1120" : b === "lava" ? "#7f1d1d" : "#1f2937";
  const topColor = b === "sunny" ? "#4ade80" : b === "scary" ? "#1e293b" : b === "lava" ? "#f97316" : "#4b5563";
  ctx.fillStyle = color;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  ctx.fillStyle = topColor;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, cameraX: number) {
  const x = p.x - cameraX;
  const y = p.y;

  if (p.invulnerable > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x, y, p.width, p.height);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x + 4, y + 14, p.width - 8, p.height - 18);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x + 4, y + 2, p.width - 8, 12);
  ctx.fillStyle = "#0f172a";
  if (p.facing === "right") ctx.fillRect(x + p.width - 12, y + 5, 8, 5);
  else ctx.fillRect(x + 4, y + 5, 8, 5);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x + p.width / 2 - 2, y - 6, 4, 8);

  if (p.weapon === "sword") {
    if (p.attacking) {
      ctx.fillStyle = "#e5e7eb";
      const reach = 46;
      const ax = p.facing === "right" ? x + p.width - 4 : x - reach + 4;
      ctx.fillRect(ax, y + 16, reach, 6);
    } else {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(p.facing === "right" ? x + p.width : x - 4, y + 10, 4, 24);
    }
  } else {
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const bx = p.facing === "right" ? x + p.width + 2 : x - 2;
    ctx.arc(bx, y + 24, 14, p.facing === "right" ? -Math.PI / 2 : Math.PI / 2, p.facing === "right" ? Math.PI / 2 : (3 * Math.PI) / 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, cameraX: number) {
  const x = e.x - cameraX;
  const y = e.y;
  const flash = e.flash > 0;

  if (e.kind === "furry") {
    ctx.fillStyle = flash ? "#ffffff" : "#92400e";
    ctx.fillRect(x, y + 6, e.width, e.height - 6);
    // fur tufts
    ctx.fillStyle = flash ? "#ffffff" : "#b45309";
    for (let i = 0; i < e.width; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 8);
      ctx.lineTo(x + i + 4, y - 2);
      ctx.lineTo(x + i + 8, y + 8);
      ctx.closePath();
      ctx.fill();
    }
    // horns
    ctx.fillStyle = "#f5f5f4";
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 6);
    ctx.lineTo(x - 6, y - 14);
    ctx.lineTo(x + 10, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + e.width - 2, y + 6);
    ctx.lineTo(x + e.width + 6, y - 14);
    ctx.lineTo(x + e.width - 10, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.fillRect(x + 8, y + 16, 7, 7);
    ctx.fillRect(x + e.width - 15, y + 16, 7, 7);
  } else if (e.kind === "tentacle") {
    ctx.fillStyle = flash ? "#ffffff" : "#7e22ce";
    ctx.beginPath();
    ctx.arc(x + e.width / 2, y + 16, e.width / 2, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x, y + 16, e.width, 10);
    ctx.strokeStyle = flash ? "#ffffff" : "#a855f7";
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const tx = x + 4 + i * ((e.width - 8) / 4);
      ctx.beginPath();
      ctx.moveTo(tx, y + 26);
      ctx.quadraticCurveTo(tx + Math.sin(e.wobble + i) * 8, y + 34, tx + Math.sin(e.wobble + i) * 5, y + 44);
      ctx.stroke();
    }
    ctx.fillStyle = "#f0abfc";
    ctx.fillRect(x + 10, y + 10, 6, 6);
    ctx.fillRect(x + e.width - 16, y + 10, 6, 6);
  } else {
    // winged
    const flap = Math.sin(e.wobble * 2) * 10;
    ctx.fillStyle = flash ? "#ffffff" : "#be123c";
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.lineTo(x - 22, y + 2 - flap);
    ctx.lineTo(x - 4, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + e.width, y + 14);
    ctx.lineTo(x + e.width + 22, y + 2 - flap);
    ctx.lineTo(x + e.width + 4, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? "#ffffff" : "#e11d48";
    ctx.fillRect(x, y + 6, e.width, e.height - 6);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(x + 7, y + 14, 7, 6);
    ctx.fillRect(x + e.width - 14, y + 14, 7, 6);
  }
}

function drawChest(ctx: CanvasRenderingContext2D, chest: Chest, cameraX: number) {
  const x = chest.x - cameraX;
  const y = chest.y;
  ctx.fillStyle = chest.opened ? "#78350f" : "#b45309";
  ctx.fillRect(x, y, chest.width, chest.height);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, chest.width - 8, chest.height - 8);
  if (!chest.opened) {
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(x + chest.width / 2 - 3, y + chest.height / 2 - 2, 6, 4);
  }
}

function drawPail(ctx: CanvasRenderingContext2D, pail: Pail, cameraX: number) {
  const x = pail.x - cameraX;
  const y = pail.y;
  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + pail.width, y);
  ctx.lineTo(x + pail.width - 6, y + pail.height);
  ctx.lineTo(x + 6, y + pail.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(x + 5, y - 10, 8, 12);
  ctx.fillRect(x + 16, y - 14, 8, 16);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(x + 7, y - 14, 3, 5);
  ctx.fillRect(x + 18, y - 18, 3, 5);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "10px sans-serif";
  ctx.fillText("TNT", x + 6, y + 22);
}

function drawDragon(ctx: CanvasRenderingContext2D, d: Dragon, cameraX: number) {
  const x = d.x - cameraX;
  const y = d.y;

  if (d.flash > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

  ctx.fillStyle = "#166534";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + d.width - 20, y - 26);
  ctx.lineTo(x + d.width - 40, y + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#16a34a";
  ctx.fillRect(x, y, d.width, d.height);

  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(x + d.width, y + 16);
  ctx.lineTo(x + d.width + 28, y + 6);
  ctx.lineTo(x + d.width, y + 32);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.fillRect(x + d.width - 18, y + 10, 10, 10);
  ctx.fillRect(x + d.width - 18, y + 36, 10, 10);

  ctx.fillStyle = "#fca5a5";
  for (let i = 0; i < d.width; i += 16) {
    ctx.beginPath();
    ctx.moveTo(x + i + 8, y + d.height);
    ctx.lineTo(x + i, y + d.height + 12);
    ctx.lineTo(x + i + 16, y + d.height + 12);
    ctx.closePath();
    ctx.fill();
  }

  for (const fb of d.fireballs) {
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(fb.x - cameraX, fb.y, fb.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTNT(ctx: CanvasRenderingContext2D, t: TNT, cameraX: number) {
  const x = t.x - cameraX;
  const y = t.y;
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(x - 6, y - 6, 12, 12);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(x - 2, y - 10, 4, 6);
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Arrow, cameraX: number) {
  const x = a.x - cameraX;
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x - 8, a.y, 16, 3);
  ctx.fillStyle = "#e5e7eb";
  if (a.vx > 0) ctx.fillRect(x + 8, a.y - 2, 6, 7);
  else ctx.fillRect(x - 14, a.y - 2, 6, 7);
}

function drawCage(ctx: CanvasRenderingContext2D, state: GameState) {
  const cage = state.cage;
  const x = cage.x - state.cameraX;
  const y = cage.y;

  // princess inside
  const px = x + cage.width / 2 - 14;
  const py = y + cage.height - 48;
  ctx.fillStyle = "#ec4899";
  ctx.fillRect(px, py + 14, 28, 34);
  ctx.fillStyle = "#fcd34d";
  ctx.fillRect(px + 4, py, 20, 16);
  ctx.fillStyle = "#fbcfe8";
  ctx.fillRect(px + 7, py + 4, 14, 12);

  if (!cage.open) {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, cage.width, cage.height);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (cage.width / 5) * i, y);
      ctx.lineTo(x + (cage.width / 5) * i, y + cage.height);
      ctx.stroke();
    }
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + cage.width - 8, y + cage.height / 2 - 6, 12, 12);
  } else {
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + cage.height);
    ctx.moveTo(x, y);
    ctx.lineTo(x + cage.width, y);
    ctx.stroke();
  }
}

function drawKeyDrop(ctx: CanvasRenderingContext2D, state: GameState) {
  const k = state.keyDrop;
  if (!k || k.collected) return;
  const x = k.x - state.cameraX;
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(x, k.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 5, k.y - 2, 18, 4);
  ctx.fillRect(x + 18, k.y + 2, 4, 6);
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - state.cameraX, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackground(ctx, state);
  drawGroundStrip(ctx, state);

  for (const platform of state.platforms) {
    if (platform.y === GROUND_Y) continue;
    if (platform.x - state.cameraX > CANVAS_WIDTH || platform.x + platform.width - state.cameraX < 0) continue;
    drawPlatform(ctx, platform, state.cameraX, state.biome);
  }

  for (const chest of state.chests) drawChest(ctx, chest, state.cameraX);
  for (const pail of state.pails) drawPail(ctx, pail, state.cameraX);
  for (const e of state.enemies) drawEnemy(ctx, e, state.cameraX);

  drawCage(ctx, state);
  drawKeyDrop(ctx, state);

  if (state.dragon) drawDragon(ctx, state.dragon, state.cameraX);

  drawPlayer(ctx, state.player, state.cameraX);

  for (const t of state.tntList) drawTNT(ctx, t, state.cameraX);
  for (const a of state.arrows) drawArrow(ctx, a, state.cameraX);

  drawParticles(ctx, state);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    "A/D: walk • Shift: sprint • Space: jump • R: sword/bow • F: attack • E: chests, TNT pail, key & cage",
    12,
    CANVAS_HEIGHT - 10
  );

  if (state.biomeLabelTimer > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    const name = BIOME_NAMES[state.biome];
    ctx.fillText(name, CANVAS_WIDTH / 2 - ctx.measureText(name).width / 2, 120);
  }

  if (state.dragon && state.dragon.state === "resting") {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px sans-serif";
    const t = state.player.tnt > 0 ? "DRAGON RESTING — Press E to throw TNT!" : "DRAGON RESTING — Get TNT from a pail!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, 80);
  }

  if (state.player.hasKey && !state.cage.open) {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px sans-serif";
    const t = "You have the key — run right to the cage and press E!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, 104);
  }
}
