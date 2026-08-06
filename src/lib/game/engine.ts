import type {
  GameState,
  Player,
  Enemy,
  Chest,
  Platform,
  Particle,
  Dragon,
  Fireball,
  TNT,
} from "./types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const WORLD_WIDTH = 2600;
export const GROUND_Y = 520;
export const GRAVITY = 0.6;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7.5;
export const JUMP_FORCE = -12;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const DRAGON_ARENA_X = 2100;

const GROUND: Platform = { x: 0, y: GROUND_Y, width: WORLD_WIDTH, height: 80 };

const PLATFORMS: Platform[] = [
  { x: 280, y: 430, width: 160, height: 20 },
  { x: 560, y: 360, width: 140, height: 20 },
  { x: 820, y: 430, width: 180, height: 20 },
  { x: 1120, y: 340, width: 120, height: 20 },
  { x: 1380, y: 400, width: 160, height: 20 },
  { x: 1660, y: 320, width: 140, height: 20 },
];

const ENEMIES: Enemy[] = [
  { x: 420, y: GROUND_Y - 40, width: 40, height: 40, vx: 1.2, health: 2, patrolStart: 360, patrolEnd: 560, flash: 0 },
  { x: 900, y: GROUND_Y - 40, width: 40, height: 40, vx: -1.5, health: 2, patrolStart: 840, patrolEnd: 1000, flash: 0 },
  { x: 1200, y: GROUND_Y - 40, width: 40, height: 40, vx: 1.3, health: 2, patrolStart: 1140, patrolEnd: 1300, flash: 0 },
  { x: 1560, y: GROUND_Y - 40, width: 40, height: 40, vx: -1.1, health: 2, patrolStart: 1500, patrolEnd: 1700, flash: 0 },
];

const CHESTS: Chest[] = [
  { x: 340, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "bandage", label: "Bandage" },
  { x: 620, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "food", label: "Food" },
  { x: 1160, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "firstaid", label: "First Aid" },
  { x: 1700, y: GROUND_Y - 20 - 24, width: 32, height: 24, opened: false, item: "food", label: "Food" },
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
  };
}

function createDragon(): Dragon {
  return {
    x: DRAGON_ARENA_X + 200,
    y: 180,
    width: 96,
    height: 64,
    health: 3,
    maxHealth: 3,
    state: "flying",
    timer: 0,
    fireballs: [],
    restCount: 0,
    flash: 0,
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
    dragon: null,
    tnt: null,
    message: "",
    messageTimer: 0,
    cutsceneTimer: 0,
    cutscenePhase: 0,
    keys: {},
    started: false,
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

function showMessage(state: GameState, text: string) {
  state.message = text;
  state.messageTimer = 120;
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
    if (p.hunger <= 0) {
      showMessage(state, "Too hungry to sprint!");
    }
  }

  if (keys[" "] && p.onGround) {
    p.vy = JUMP_FORCE;
    p.onGround = false;
    keys[" "] = false;
  }

  if (keys["f"] && p.attackCooldown <= 0 && !p.attacking) {
    p.attacking = true;
    p.attackTimer = 12;
    p.attackCooldown = 25;
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

  if (p.y > CANVAS_HEIGHT + 100) {
    p.health = 0;
  }

  if (p.invulnerable > 0) p.invulnerable--;

  if (p.x >= DRAGON_ARENA_X - 100 && state.dragon === null) {
    state.dragon = createDragon();
    showMessage(state, "Dragon appears! Throw TNT when it rests.");
  }
}

function updateEnemies(state: GameState) {
  const p = state.player;

  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;

    enemy.x += enemy.vx;
    if (enemy.x <= enemy.patrolStart || enemy.x + enemy.width >= enemy.patrolEnd) {
      enemy.vx *= -1;
    }
    enemy.x = clamp(enemy.x, enemy.patrolStart, enemy.patrolEnd - enemy.width);

    if (enemy.flash > 0) enemy.flash--;

    if (rectsOverlap(p, enemy) && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      p.vx = p.x < enemy.x ? -6 : 6;
      p.vy = -4;
      showMessage(state, "Ouch!");
    }

    if (p.attacking && p.attackTimer > 6) {
      const reach = 50;
      const attackBox = {
        x: p.facing === "right" ? p.x + p.width : p.x - reach,
        y: p.y,
        width: reach,
        height: p.height,
      };
      if (rectsOverlap(attackBox, enemy)) {
        enemy.health--;
        enemy.flash = 10;
        spawnParticle(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#22c55e", 5, 3);
        if (enemy.health <= 0) {
          spawnExplosion(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        }
      }
    }
  }

  state.enemies = state.enemies.filter((e) => e.health > 0);
}

function updateChests(state: GameState) {
  const p = state.player;

  if (!state.keys["e"]) return;

  for (const chest of state.chests) {
    if (chest.opened) continue;
    const dx = p.x + p.width / 2 - (chest.x + chest.width / 2);
    const dy = p.y + p.height / 2 - (chest.y + chest.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      chest.opened = true;
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
      }
    }
  }
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
    if (fb.life <= 0) {
      d.fireballs.splice(i, 1);
      continue;
    }
    const playerCenter = { x: p.x + p.width / 2, y: p.y + p.height / 2 };
    const dx = fb.x - playerCenter.x;
    const dy = fb.y - playerCenter.y;
    if (Math.sqrt(dx * dx + dy * dy) < fb.radius + p.width / 2 && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      d.fireballs.splice(i, 1);
      showMessage(state, "Fire!");
    }
  }

  const groundY = GROUND_Y - d.height;
  const flyY = 160;

  switch (d.state) {
    case "flying": {
      d.y = flyY + Math.sin(d.timer * 0.05) * 20;
      if (d.timer % 90 === 0) {
        const fb: Fireball = {
          x: d.x,
          y: d.y + d.height / 2,
          vx: (p.x - d.x) * 0.006,
          vy: 3 + Math.random() * 2,
          radius: 10,
          life: 120,
        };
        d.fireballs.push(fb);
      }
      if (d.timer > 240) {
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
      }
      break;
    }
    case "resting": {
      if (d.timer > 180) {
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

  if (d.state === "resting" && state.keys["e"] && state.tnt === null) {
    const dx = p.x + p.width / 2 - (d.x + d.width / 2);
    const dy = p.y + p.height / 2 - (d.y + d.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < 220) {
      state.tnt = {
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: p.facing === "right" ? 6 : -6,
        vy: -6,
        fuse: 45,
        exploded: false,
      };
    }
  }
}

function updateTNT(state: GameState) {
  if (state.tnt === null) return;
  const t = state.tnt;
  const d = state.dragon;

  t.vy += GRAVITY * 0.5;
  t.x += t.vx;
  t.y += t.vy;
  t.fuse--;

  if (d && !t.exploded && rectsOverlap({ x: t.x, y: t.y, width: 12, height: 12 }, d)) {
    t.fuse = 0;
  }

  if (t.fuse <= 0 && !t.exploded) {
    t.exploded = true;
    spawnExplosion(state, t.x, t.y);
    if (d) {
      const dx = t.x - (d.x + d.width / 2);
      const dy = t.y - (d.y + d.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        d.health--;
        d.flash = 15;
        spawnParticle(state, d.x + d.width / 2, d.y + d.height / 2, "#f97316", 12, 5);
        if (d.health <= 0) {
          spawnExplosion(state, d.x + d.width / 2, d.y + d.height / 2);
          state.dragon = null;
          state.mode = "cutscene";
          state.cutsceneTimer = 0;
          state.cutscenePhase = 0;
          showMessage(state, "Dragon defeated!");
        } else {
          showMessage(state, `Dragon hit! ${d.health} left`);
          d.state = "taking_off";
          d.timer = 0;
        }
      }
    }
    state.tnt = null;
  } else if (t.y > CANVAS_HEIGHT + 100) {
    state.tnt = null;
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
    state.message = "Princess: Thank you, brave knight!";
  } else if (state.cutscenePhase === 1) {
    state.message = "Princess: You saved me from the dragon!";
  } else if (state.cutscenePhase === 2) {
    state.message = "*kiss*";
  } else if (state.cutscenePhase >= 3) {
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
  updateChests(state);
  updateDragon(state);
  updateTNT(state);
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
  if (!state.started && key !== "") {
    state.started = true;
  }
}

export function handleKeyUp(state: GameState, key: string) {
  state.keys[key] = false;
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  cameraX: number
) {
  ctx.fillStyle = color;
  ctx.fillRect(x - cameraX, y, width, height);
}

function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform, cameraX: number) {
  drawRect(ctx, platform.x, platform.y, platform.width, platform.height, "#4b5563", cameraX);
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(platform.x - cameraX, platform.y, platform.width, 6);
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, cameraX: number) {
  const x = p.x - cameraX;
  const y = p.y;

  if (p.invulnerable > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(x, y, p.width, p.height);

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(x + 4, y + 4, p.width - 8, p.height - 8);

  ctx.fillStyle = "#fbbf24";
  if (p.facing === "right") {
    ctx.fillRect(x + p.width - 10, y + 8, 8, 8);
  } else {
    ctx.fillRect(x + 2, y + 8, 8, 8);
  }

  if (p.attacking) {
    ctx.fillStyle = "#e5e7eb";
    const reach = 46;
    const ax = p.facing === "right" ? x + p.width - 4 : x - reach + 4;
    ctx.fillRect(ax, y + 16, reach, 6);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, cameraX: number) {
  const x = enemy.x - cameraX;
  const y = enemy.y;
  ctx.fillStyle = enemy.flash > 0 ? "#ffffff" : "#ef4444";
  ctx.fillRect(x, y, enemy.width, enemy.height);
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(x + 6, y + 8, 8, 8);
  ctx.fillRect(x + enemy.width - 14, y + 8, 8, 8);
}

function drawChest(ctx: CanvasRenderingContext2D, chest: Chest, cameraX: number) {
  const x = chest.x - cameraX;
  const y = chest.y;
  ctx.fillStyle = chest.opened ? "#78350f" : "#b45309";
  ctx.fillRect(x, y, chest.width, chest.height);
  ctx.fillStyle = "#f59e0b";
  ctx.strokeRect(x + 4, y + 4, chest.width - 8, chest.height - 8);
  if (!chest.opened) {
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(x + chest.width / 2 - 3, y + chest.height / 2 - 2, 6, 4);
  }
}

function drawDragon(ctx: CanvasRenderingContext2D, d: Dragon, cameraX: number) {
  const x = d.x - cameraX;
  const y = d.y;

  if (d.flash > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

  ctx.fillStyle = "#16a34a";
  ctx.fillRect(x, y, d.width, d.height);

  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(x + d.width, y + 16);
  ctx.lineTo(x + d.width + 24, y + 8);
  ctx.lineTo(x + d.width, y + 28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.fillRect(x + d.width - 16, y + 10, 10, 10);
  ctx.fillRect(x + d.width - 16, y + 34, 10, 10);

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

function drawPrincess(ctx: CanvasRenderingContext2D, state: GameState) {
  const x = DRAGON_ARENA_X + 120 - state.cameraX;
  const y = GROUND_Y - 44;
  ctx.fillStyle = "#ec4899";
  ctx.fillRect(x, y, 28, 44);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(x + 6, y + 6, 16, 12);
  ctx.fillStyle = "#fce7f3";
  ctx.fillRect(x + 4, y + 20, 20, 24);
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const pt of state.particles) {
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - state.cameraX, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#1e293b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#f1f5f9";
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 73) % WORLD_WIDTH) - state.cameraX * 0.2;
    const sy = (i * 37) % 200;
    ctx.fillRect(sx < 0 ? sx + WORLD_WIDTH : sx, sy, 2, 2);
  }

  for (const platform of state.platforms) {
    drawPlatform(ctx, platform, state.cameraX);
  }

  for (const chest of state.chests) {
    drawChest(ctx, chest, state.cameraX);
  }

  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy, state.cameraX);
  }

  if (state.dragon) {
    drawDragon(ctx, state.dragon, state.cameraX);
  }

  if (state.mode === "cutscene" || state.mode === "won") {
    drawPrincess(ctx, state);
  }

  drawPlayer(ctx, state.player, state.cameraX);

  if (state.tnt) {
    drawTNT(ctx, state.tnt, state.cameraX);
  }

  drawParticles(ctx, state);

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px sans-serif";
  ctx.fillText("A/D or Arrows: walk  •  Shift: sprint  •  Space: jump  •  F: sword  •  E: open chests / throw TNT", 16, CANVAS_HEIGHT - 16);

  if (state.dragon && state.dragon.state === "resting") {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("DRAGON RESTING — Press E to throw TNT!", CANVAS_WIDTH / 2 - 160, 80);
  }
}
