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
  Npc,
  CoinDrop,
} from "./types";
import {
  LEVELS,
  GROUND_Y,
  FINALE_LEVEL_INDEX,
  BOW_LEVEL_INDEX,
  VILLAGE_LEVEL_INDEX,
  VILLAGE_NPCS,
  SHOP_ITEMS,
  CASTLE_TRIGGER_X,
  DRAGON_ARENA_X,
  CAGE_X,
  type EnemySpawn,
  type LevelDef,
} from "./levels";
import { sfx, playMusic, type MusicTrack } from "./audio";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export { GROUND_Y };
export const GRAVITY = 0.6;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7.5;
export const JUMP_FORCE = -12;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;

const SWIM_GRAVITY = 0.14;
const SWIM_SPEED = 3.2;

const BIOME_NAMES: Record<Biome, string> = {
  sunny: "Sunny Forest",
  night: "Night Forest",
  beach: "Sunny Beach",
  ocean: "The Deep Ocean",
  village: "The Village",
  desert: "Burning Desert",
  snow: "Frozen Wastes",
  dark: "Creepy Forest",
  fire: "Fire Landscape",
  castle: "The Dragon's Castle",
};

function makeEnemy(spawn: EnemySpawn): Enemy {
  const { kind } = spawn;
  const flying = kind === "winged";
  const swimming = kind === "fish";
  const width = kind === "tentacle" ? 44 : kind === "insect" ? 38 : kind === "fish" ? 46 : 40;
  const height = flying ? 34 : kind === "fish" ? 28 : kind === "insect" ? 30 : 42;
  const baseY = spawn.y ?? (flying ? 300 : GROUND_Y - height);
  return {
    kind,
    x: spawn.x,
    y: baseY,
    baseY,
    width,
    height,
    vx: flying ? 2 : swimming ? 1.8 : kind === "insect" ? 2.6 : 1.3,
    vy: 0,
    health: kind === "tentacle" ? 3 : kind === "fish" ? 2 : kind === "insect" ? 1 : 2,
    patrolStart: spawn.patrolStart,
    patrolEnd: spawn.patrolEnd,
    flash: 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

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
    hasBow: false,
    arrowsLeft: 0,
    tnt: 0,
    hasKey: false,
    coins: 0,
    items: [],
    reachedVillage: false,
  };
}

function createDragon(): Dragon {
  return {
    x: DRAGON_ARENA_X + 260,
    y: 170,
    width: 110,
    height: 70,
    health: 200,
    maxHealth: 200,
    state: "flying",
    timer: 0,
    fireballs: [],
    restCount: 0,
    flash: 0,
    dir: -1,
  };
}

function levelPails(level: LevelDef): Pail[] {
  if (!level.finale) return [];
  return [
    { x: DRAGON_ARENA_X - 160, y: GROUND_Y - 34, width: 34, height: 34 },
    { x: DRAGON_ARENA_X + 180, y: GROUND_Y - 34, width: 34, height: 34 },
    { x: DRAGON_ARENA_X + 520, y: GROUND_Y - 34, width: 34, height: 34 },
  ];
}

/** Builds state for a level, carrying over the player's stats when given. */
export function loadLevel(levelIndex: number, carry?: Player, asVillageHub = false): GameState {
  const level = LEVELS[levelIndex]!;
  const player = carry ? { ...carry, items: [...carry.items] } : createPlayer();

  player.x = 60;
  player.y = GROUND_Y - PLAYER_HEIGHT;
  player.vx = 0;
  player.vy = 0;
  player.facing = "right";
  player.onGround = false;
  player.attacking = false;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.invulnerable = 0;
  player.tnt = 0;
  player.hasKey = false;

  if (levelIndex >= BOW_LEVEL_INDEX && !player.hasBow) {
    player.hasBow = true;
    player.arrowsLeft = Math.max(player.arrowsLeft, 20);
  }
  if (!player.hasBow) player.weapon = "sword";
  if (levelIndex === VILLAGE_LEVEL_INDEX) player.reachedVillage = true;

  const villageHub = levelIndex === VILLAGE_LEVEL_INDEX && asVillageHub;

  return {
    mode: "playing",
    cameraX: 0,
    levelIndex,
    levelName: level.name,
    worldWidth: level.width,
    exitX: level.finale ? Number.POSITIVE_INFINITY : level.width - 120,
    swim: level.swim === true,
    levelBanner: 200,
    levelCompleteTimer: 0,
    player,
    enemies: villageHub ? [] : level.enemies.map(makeEnemy),
    chests: level.chests.map((c: Chest) => ({ ...c })),
    platforms: [
      { x: 0, y: GROUND_Y, width: level.width, height: 80 },
      ...level.platforms.map((p: Platform) => ({ ...p })),
    ],
    particles: [],
    arrows: [],
    pails: levelPails(level),
    dragon: null,
    tntList: [],
    keyDrop: null,
    cage: level.finale ? { x: CAGE_X, y: GROUND_Y - 96, width: 80, height: 96, open: false } : null,
    message: "",
    messageTimer: 0,
    cutsceneTimer: 0,
    cutscenePhase: 0,
    castleCutsceneDone: false,
    dragonIntroDone: false,
    keys: {},
    started: false,
    biome: level.biome,
    biomeLabelTimer: 0,
    owlTimer: 0,
    coins: [],
    npcs: villageHub ? VILLAGE_NPCS.map((npc: Npc) => ({ ...npc })) : [],
    dialogLines: [],
    dialogIndex: 0,
    dialogSpeaker: "",
    villageFree: villageHub,
    shopMessage: "",
  };
}

export function respawnInVillage(state: GameState) {
  const fresh = { ...state.player };
  fresh.health = fresh.maxHealth;
  fresh.hunger = fresh.maxHunger;
  replaceState(state, loadLevel(VILLAGE_LEVEL_INDEX, fresh, true));
  showMessage(state, "You wake up safe in the village.", 160);
}

export function createInitialState(): GameState {
  return loadLevel(0);
}

/** Mutates `state` in place so the caller's ref keeps pointing at live state. */
function replaceState(state: GameState, next: GameState) {
  const started = state.started;
  Object.assign(state, next);
  state.started = started;
}

export function goToLevel(state: GameState, levelIndex: number) {
  replaceState(state, loadLevel(levelIndex, state.player));
}

export function restartLevel(state: GameState) {
  const fresh = { ...state.player };
  fresh.health = fresh.maxHealth;
  fresh.hunger = fresh.maxHunger;
  replaceState(state, loadLevel(state.levelIndex, fresh));
}

export function restartGame(state: GameState) {
  replaceState(state, loadLevel(0));
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

function biomeFor(state: GameState, x: number): Biome {
  const level = LEVELS[state.levelIndex]!;
  if (!level.bands) return level.biome;
  let current = level.bands[0]!.biome;
  for (const band of level.bands) if (x >= band.from) current = band.biome;
  return current;
}

function updatePlayer(state: GameState) {
  const p = state.player;
  const keys = state.keys;
  const swim = state.swim;

  let moveLeft = false;
  let moveRight = false;

  if (keys["a"] || keys["arrowleft"]) moveLeft = true;
  if (keys["d"] || keys["arrowright"]) moveRight = true;

  const sprinting = keys["shift"] && p.hunger > 0;
  const speed = swim ? SWIM_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;

  if (moveLeft && !moveRight) {
    p.vx = -speed;
    p.facing = "left";
  } else if (moveRight && !moveLeft) {
    p.vx = speed;
    p.facing = "right";
  } else {
    p.vx = swim ? p.vx * 0.85 : 0;
  }

  if (sprinting && !swim && (moveLeft || moveRight)) {
    p.hunger = Math.max(0, p.hunger - 0.008);
    if (p.hunger <= 0) showMessage(state, "Too hungry to sprint!");
  }

  if (swim) {
    if (keys[" "] || keys["w"] || keys["arrowup"]) p.vy -= 0.42;
    if (keys["s"] || keys["arrowdown"]) p.vy += 0.3;
    p.vy = clamp(p.vy * 0.94 + SWIM_GRAVITY, -4.2, 4);
  } else {
    if (keys[" "] && p.onGround) {
      p.vy = JUMP_FORCE;
      p.onGround = false;
      keys[" "] = false;
    }
    p.vy += GRAVITY;
  }

  // R switches weapon back and forth (bow unlocks in the village)
  if (keys["r"]) {
    if (p.hasBow) {
      p.weapon = p.weapon === "sword" ? "bow" : "sword";
      showMessage(state, p.weapon === "bow" ? "Bow equipped — F to shoot" : "Sword equipped — F to swing", 70);
    } else {
      showMessage(state, "You don't have a bow yet!", 80);
    }
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

  p.x += p.vx;
  p.y += p.vy;

  p.x = clamp(p.x, 0, state.worldWidth - p.width);
  if (swim) p.y = Math.max(60, p.y);

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

  const nextBiome = biomeFor(state, p.x);
  if (nextBiome !== state.biome) {
    state.biome = nextBiome;
    state.biomeLabelTimer = 180;
    showMessage(state, BIOME_NAMES[nextBiome], 120);
  }
  if (state.biomeLabelTimer > 0) state.biomeLabelTimer--;

  // Creepy forest ambience
  if (state.biome === "dark") {
    state.owlTimer--;
    if (state.owlTimer <= 0) {
      state.owlTimer = 180 + Math.floor(Math.random() * 220);
      sfx.owl();
    }
  }

  // Village hub: villagers, shop and the exit gate
  const atExit = p.x + p.width >= state.exitX - 8;
  if (state.levelIndex === VILLAGE_LEVEL_INDEX && state.villageFree && !atExit) {
    updateNpcs(state);
    if (state.mode !== "playing") return;
  }

  // Castle cutscene then the boss
  if (state.levelIndex === FINALE_LEVEL_INDEX) {
    if (!state.castleCutsceneDone && p.x >= CASTLE_TRIGGER_X) {
      state.castleCutsceneDone = true;
      state.mode = "cutscene";
      state.cutsceneTimer = 0;
      state.cutscenePhase = 0;
      return;
    }
    const bossReady =
      state.castleCutsceneDone &&
      p.x >= DRAGON_ARENA_X - 200 &&
      state.dragon === null &&
      state.keyDrop === null &&
      state.cage &&
      !state.cage.open;

    if (bossReady && !state.dragonIntroDone) {
      state.dragonIntroDone = true;
      sfx.dragonRoar();
      startDialog(state, "The Dragon", [
        "So. A little knight with a little sword.",
        "Do you know how many knights I have roasted? Neither do I. I stopped counting.",
        "The princess stays in her cage. You stay in my belly.",
        "Enough talk. BURN!",
      ]);
      return;
    }
    if (bossReady && state.dragonIntroDone) {
      state.dragon = createDragon();
      showMessage(state, "The dragon! Grab TNT from a pail, throw it when it lands.", 180);
    }
  }

  // Level exit
  if (atExit) {
    if (state.levelIndex === VILLAGE_LEVEL_INDEX && !state.villageFree) {
      state.mode = "cutscene";
      state.cutsceneTimer = 0;
      state.cutscenePhase = 0;
      return;
    }
    if (state.levelIndex === VILLAGE_LEVEL_INDEX) {
      if (state.keys["e"]) {
        state.keys["e"] = false;
        state.mode = "levelcomplete";
        state.levelCompleteTimer = 0;
      } else {
        p.x = state.exitX - p.width - 2;
        showMessage(state, "Press E to leave the village", 40);
      }
      return;
    }
    state.mode = "levelcomplete";
    state.levelCompleteTimer = 0;
  }
}

function startDialog(state: GameState, speaker: string, lines: string[]) {
  state.mode = "dialog";
  state.dialogSpeaker = speaker;
  state.dialogLines = lines;
  state.dialogIndex = 0;
  state.keys["e"] = false;
  sfx.talk();
}

function nearestNpc(state: GameState): Npc | null {
  const p = state.player;
  let best: Npc | null = null;
  let bestDist = 80;
  for (const npc of state.npcs) {
    const d = Math.abs(p.x + p.width / 2 - npc.x);
    if (d < bestDist) {
      best = npc;
      bestDist = d;
    }
  }
  return best;
}

function updateNpcs(state: GameState) {
  const npc = nearestNpc(state);
  if (!npc || !state.keys["e"]) return;
  state.keys["e"] = false;
  const p = state.player;

  if (npc.kind === "shop") {
    state.mode = "shop";
    state.shopMessage = "";
    sfx.talk();
    return;
  }

  if (npc.done) {
    startDialog(state, npc.name, [npc.doneLine ?? npc.lines[0]!]);
    return;
  }

  // Villager wants an item the knight may be carrying
  if (npc.wants && !p.items.includes(npc.wants)) {
    startDialog(state, npc.name, npc.lines);
    return;
  }

  const lines = [...npc.lines];
  if (npc.wants) {
    p.items = p.items.filter((i) => i !== npc.wants);
    lines.push(`(You hand over the ${npc.wants}.)`);
  }
  if (npc.gives) {
    p.items.push(npc.gives);
    lines.push(`You received: ${npc.gives}!`);
  }
  if (npc.reward) {
    p.coins += npc.reward;
    sfx.coin();
    lines.push(`You received ${npc.reward} coins!`);
  }
  npc.done = true;
  startDialog(state, npc.name, lines);
}

function spawnCoins(state: GameState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    state.coins.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - Math.random() * 20,
      vy: -3 - Math.random() * 2,
      value: 1,
      spin: Math.random() * Math.PI,
    });
  }
}

function updateCoins(state: GameState) {
  const p = state.player;
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const c = state.coins[i]!;
    c.vy += GRAVITY * 0.4;
    c.y = Math.min(GROUND_Y - 12, c.y + c.vy);
    if (c.y >= GROUND_Y - 12) c.vy = 0;
    c.spin += 0.15;
    const dx = p.x + p.width / 2 - c.x;
    const dy = p.y + p.height / 2 - c.y;
    if (Math.hypot(dx, dy) < 46) {
      p.coins += c.value;
      sfx.coin();
      state.coins.splice(i, 1);
    }
  }
}

const HIT_SOUND: Record<Enemy["kind"], () => void> = {
  furry: () => sfx.furryHit(),
  tentacle: () => sfx.tentacleHit(),
  fish: () => sfx.fishHit(),
  winged: () => sfx.wingedHit(),
  insect: () => sfx.insectHit(),
};

function damageEnemy(state: GameState, e: Enemy, amount: number) {
  e.health -= amount;
  e.flash = 10;
  HIT_SOUND[e.kind]();
  spawnParticle(state, e.x + e.width / 2, e.y + e.height / 2, "#22c55e", 5, 3);
  if (e.health <= 0) {
    spawnExplosion(state, e.x + e.width / 2, e.y + e.height / 2);
    spawnCoins(state, e.x + e.width / 2, e.y + e.height / 2, 1 + Math.floor(Math.random() * 3));
  }
}


function updateEnemies(state: GameState) {
  const p = state.player;

  for (const e of state.enemies) {
    if (e.health <= 0) continue;

    if (e.kind === "fish") {
      // Homes in on the knight through the water
      const dx = p.x + p.width / 2 - (e.x + e.width / 2);
      const dy = p.y + p.height / 2 - (e.y + e.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      e.vx += (dx / dist) * 0.06;
      e.vy += (dy / dist) * 0.05;
      e.vx = clamp(e.vx, -2.4, 2.4);
      e.vy = clamp(e.vy, -2, 2);
      e.x += e.vx;
      e.y += e.vy;
      e.x = clamp(e.x, e.patrolStart - 200, e.patrolEnd + 200);
      e.y = clamp(e.y, 80, GROUND_Y - e.height);
    } else if (e.kind === "insect") {
      e.x += e.vx;
      if (e.x <= e.patrolStart || e.x + e.width >= e.patrolEnd) e.vx *= -1;
      e.wobble += 0.16;
      e.y = e.baseY - Math.abs(Math.sin(e.wobble)) * 34;
    } else {
      e.x += e.vx;
      if (e.x <= e.patrolStart || e.x + e.width >= e.patrolEnd) e.vx *= -1;
      e.x = clamp(e.x, e.patrolStart, e.patrolEnd - e.width);
      e.wobble += e.kind === "winged" ? 0.12 : 0.06;
      if (e.kind === "winged") {
        e.y = e.baseY + Math.sin(e.wobble) * 40;
      } else if (e.kind === "tentacle") {
        e.y = e.baseY + Math.sin(e.wobble) * 3;
      }
    }

    if (e.kind === "fish") e.wobble += 0.2;
    if (e.flash > 0) e.flash--;

    if (rectsOverlap(p, e) && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      p.vx = p.x < e.x ? -6 : 6;
      p.vy = -4;
      sfx.hurt();
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
    a.vy += state.swim ? 0.02 : 0.06;
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
      sfx.chest();
      spawnCoins(state, chest.x + chest.width / 2, chest.y, 3 + Math.floor(Math.random() * 4));
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
      } else if (p.hasBow) {
        p.arrowsLeft += 12;
        showMessage(state, "+12 arrows");
      } else {
        p.hunger = p.maxHunger;
        showMessage(state, "Just a snack — no bow yet");
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
      sfx.hurt();
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
        sfx.dragonFire();
        d.fireballs.push({
          x: d.x + d.width / 2,
          y: d.y + d.height,
          vx: (p.x - d.x) * 0.006,
          vy: 3 + Math.random() * 2,
          radius: 10,
          life: 160,
        } satisfies Fireball);
      }
      if (d.timer > 180) {
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
      if (d.timer > 420) {
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
      sfx.explosion();
      spawnExplosion(state, t.x, t.y);
      if (d) {
        const dx = t.x - (d.x + d.width / 2);
        const dy = t.y - (d.y + d.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 130) {
          d.health -= 10;
          d.flash = 12;
          spawnParticle(state, d.x + d.width / 2, d.y + d.height / 2, "#f97316", 12, 5);
          if (d.health <= 0) {
            sfx.dragonRoar(0.55);
            playMusic(null);
            spawnExplosion(state, d.x + d.width / 2, d.y + d.height / 2);
            spawnExplosion(state, d.x + d.width / 2 + 40, d.y + d.height / 2);
            state.keyDrop = { x: d.x + d.width / 2, y: d.y + d.height / 2, vy: 0, collected: false };
            state.dragon = null;
            showMessage(state, "The dragon roars, explodes and drops a key!", 200);
          } else {
            sfx.dragonRoar(0.3);
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
  if (cage && !cage.open && p.hasKey && state.keys["e"]) {
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
  state.cameraX = clamp(state.cameraX, 0, Math.max(0, state.worldWidth - CANVAS_WIDTH));
}

const MAYOR_LINES = [
  "Mayor Bumbleworth: The monsters are gone — you saved our village!",
  "Mayor Bumbleworth: You are welcome to look around as long as you want.",
  "Mayor Bumbleworth: Talk to the villagers, visit the shop, then head right when you're ready.",
];

function updateCutscene(state: GameState) {
  state.cutsceneTimer++;
  const phaseDuration = 150;
  state.cutscenePhase = Math.floor(state.cutsceneTimer / phaseDuration);

  // The mayor thanks the knight at the end of the village level
  if (state.levelIndex === VILLAGE_LEVEL_INDEX && !state.villageFree) {
    const line = MAYOR_LINES[state.cutscenePhase];
    if (line) {
      state.message = line;
      state.messageTimer = 10;
    } else {
      state.villageFree = true;
      state.enemies = [];
      state.npcs = VILLAGE_NPCS.map((npc: Npc) => ({ ...npc }));
      state.player.x = state.exitX - 260;
      state.mode = "playing";
      showMessage(state, "Free roam: talk to villagers with E. Press E at the gate to leave.", 220);
    }
    return;
  }

  // The walk-up-to-the-castle cutscene happens before the cage is opened
  const beforeBoss = state.cage !== null && !state.cage.open;

  if (beforeBoss) {
    state.player.x += 1.4;
    updateCamera(state);
    if (state.cutscenePhase === 0) state.message = "The knight reaches the dragon's castle...";
    else if (state.cutscenePhase === 1) state.message = "A roar shakes the walls.";
    else {
      state.mode = "playing";
      showMessage(state, "Boss fight! Take TNT from a pail with E.", 180);
      return;
    }
    state.messageTimer = 10;
    return;
  }

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

/** Picks the music that fits what's happening right now. */
function musicForState(state: GameState): MusicTrack {
  if (!state.started) return null;
  if (state.mode === "gameover") return null;
  if (state.mode === "won" || (state.cage?.open ?? false)) return "beautiful";
  if (state.dragon) return "rock";
  if (state.levelIndex === FINALE_LEVEL_INDEX && state.dragonIntroDone && !state.keyDrop) return "rock";
  if (state.mode === "cutscene" && state.levelIndex === FINALE_LEVEL_INDEX) return null;
  if (state.biome === "dark") return "creepy";
  if (state.biome === "fire") return "fire";
  if (state.biome === "castle") return null;
  return "cheery";
}

function buyItem(state: GameState, key: string) {
  const entry = SHOP_ITEMS.find((i) => i.key === key);
  if (!entry) return;
  const p = state.player;
  if (p.coins < entry.cost) {
    sfx.deny();
    state.shopMessage = "Not enough coins!";
    return;
  }
  p.coins -= entry.cost;
  sfx.buy();
  if (entry.key === "1") {
    p.health = p.maxHealth;
    state.shopMessage = "Patched up — full health!";
  } else if (entry.key === "2") {
    p.arrowsLeft += 15;
    state.shopMessage = "+15 arrows";
  } else if (entry.key === "3") {
    p.hunger = p.maxHunger;
    state.shopMessage = "Belly full!";
  } else {
    p.maxHealth += 1;
    p.health = p.maxHealth;
    state.shopMessage = "You feel tougher — max health up!";
  }
}

export function updateGame(state: GameState) {
  playMusic(musicForState(state));

  if (state.mode === "won" || state.mode === "gameover") return;

  if (state.mode === "dialog" || state.mode === "shop") {
    updateParticles(state);
    return;
  }

  if (state.mode === "levelcomplete") {
    state.levelCompleteTimer++;
    updateParticles(state);
    if (state.levelCompleteTimer > 130) goToLevel(state, state.levelIndex + 1);
    return;
  }

  if (state.mode === "cutscene") {
    updateCutscene(state);
    updateParticles(state);
    return;
  }

  updatePlayer(state);
  if (state.mode !== "playing") return;
  updateEnemies(state);
  updateArrows(state);
  updateChests(state);
  updateCoins(state);
  updateDragon(state);
  updateTNT(state);
  updateKeyAndCage(state);
  updateParticles(state);
  updateCamera(state);

  if (state.player.health <= 0) {
    state.mode = "gameover";
    state.message = "Game Over";
    state.messageTimer = 300;
  }

  if (state.messageTimer > 0) state.messageTimer--;
  if (state.messageTimer <= 0) state.message = "";
}

export function handleKeyDown(state: GameState, key: string) {
  if (state.mode === "gameover" && (key === "enter" || key === " ")) {
    restartLevel(state);
    return;
  }
  if (state.mode === "gameover" && key === "v" && state.player.reachedVillage) {
    respawnInVillage(state);
    return;
  }
  if (state.mode === "won" && (key === "enter" || key === " ")) {
    restartGame(state);
    return;
  }
  if (state.mode === "dialog") {
    if (key === "e" || key === "enter" || key === " ") {
      state.dialogIndex++;
      sfx.talk();
      if (state.dialogIndex >= state.dialogLines.length) {
        state.mode = "playing";
        state.dialogLines = [];
        state.keys["e"] = false;
      }
    }
    return;
  }
  if (state.mode === "shop") {
    if (key === "escape" || key === "e" || key === "enter") {
      state.mode = "playing";
      state.keys["e"] = false;
      return;
    }
    buyItem(state, key);
    return;
  }
  state.keys[key] = true;
  if (!state.started && key !== "") state.started = true;
}

export function handleKeyUp(state: GameState, key: string) {
  state.keys[key] = false;
}

/* ---------------- Rendering ---------------- */

const PLATFORM_COLORS: Record<Biome, [string, string]> = {
  sunny: ["#4ade80", "#78350f"],
  night: ["#1e293b", "#0f172a"],
  beach: ["#fde68a", "#b45309"],
  ocean: ["#0e7490", "#134e4a"],
  village: ["#a3a3a3", "#57534e"],
  desert: ["#fbbf24", "#92400e"],
  snow: ["#f8fafc", "#94a3b8"],
  dark: ["#1c1917", "#0c0a09"],
  fire: ["#f97316", "#450a0a"],
  castle: ["#475569", "#334155"],
};

function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform, cameraX: number, biome: Biome) {
  const [top, body] = PLATFORM_COLORS[biome];
  ctx.fillStyle = body;
  ctx.fillRect(platform.x - cameraX, platform.y, platform.width, platform.height);
  ctx.fillStyle = top;
  ctx.fillRect(platform.x - cameraX, platform.y, platform.width, 6);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, style: "green" | "night" | "dead") {
  ctx.fillStyle = style === "green" ? "#7c3f16" : "#1c1917";
  ctx.fillRect(x, GROUND_Y - 90, 14, 90);
  ctx.fillStyle = style === "green" ? "#16a34a" : style === "night" ? "#14532d" : "#0c0a09";
  ctx.beginPath();
  ctx.moveTo(x - 26, GROUND_Y - 80);
  ctx.lineTo(x + 7, GROUND_Y - 150);
  ctx.lineTo(x + 40, GROUND_Y - 80);
  ctx.closePath();
  ctx.fill();
  if (style === "dead") {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 2, GROUND_Y - 110, 3, 3);
    ctx.fillRect(x + 10, GROUND_Y - 110, 3, 3);
  }
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "#a16207";
  ctx.fillRect(x, GROUND_Y - 110, 12, 110);
  ctx.fillStyle = "#15803d";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x + 6 + i * 22, GROUND_Y - 112, 26, 9, i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "#d6d3d1";
  ctx.fillRect(x, GROUND_Y - 120, 110, 120);
  ctx.fillStyle = "#7f1d1d";
  ctx.beginPath();
  ctx.moveTo(x - 12, GROUND_Y - 120);
  ctx.lineTo(x + 55, GROUND_Y - 176);
  ctx.lineTo(x + 122, GROUND_Y - 120);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x + 44, GROUND_Y - 52, 26, 52);
  ctx.fillStyle = "#fcd34d";
  ctx.fillRect(x + 14, GROUND_Y - 100, 22, 22);
  ctx.fillRect(x + 76, GROUND_Y - 100, 22, 22);
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "#15803d";
  ctx.fillRect(x, GROUND_Y - 90, 18, 90);
  ctx.fillRect(x - 18, GROUND_Y - 62, 18, 12);
  ctx.fillRect(x - 18, GROUND_Y - 62, 10, 34);
  ctx.fillRect(x + 18, GROUND_Y - 76, 18, 12);
  ctx.fillRect(x + 26, GROUND_Y - 76, 10, 40);
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.biome;
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  const stops: Record<Biome, [string, string]> = {
    sunny: ["#7dd3fc", "#bbf7d0"],
    night: ["#0b1120", "#1e293b"],
    beach: ["#38bdf8", "#fde68a"],
    ocean: ["#0c4a6e", "#082f49"],
    village: ["#93c5fd", "#d9f99d"],
    desert: ["#fcd34d", "#fbbf24"],
    snow: ["#cbd5e1", "#f8fafc"],
    dark: ["#020617", "#0f172a"],
    fire: ["#450a0a", "#b45309"],
    castle: ["#1e1b4b", "#312e81"],
  };
  gradient.addColorStop(0, stops[b][0]);
  gradient.addColorStop(1, stops[b][1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const now = Date.now();

  if (b === "sunny" || b === "beach" || b === "village") {
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
  }

  if (b === "night" || b === "dark" || b === "snow") {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(650, 90, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 173 - state.cameraX * 0.2) % CANVAS_WIDTH;
      ctx.fillRect((sx + CANVAS_WIDTH) % CANVAS_WIDTH, (i * 37) % 220, 2, 2);
    }
  }

  if (b === "sunny" || b === "night" || b === "dark") {
    const style = b === "sunny" ? "green" : b === "night" ? "night" : "dead";
    for (let i = 0; i < 24; i++) {
      const sx = i * 320 + 120 - state.cameraX * 0.7;
      if (sx > -80 && sx < CANVAS_WIDTH + 80) drawTree(ctx, sx, style);
    }
  }

  if (b === "beach") {
    for (let i = 0; i < 16; i++) {
      const sx = i * 340 + 160 - state.cameraX * 0.7;
      if (sx > -60 && sx < CANVAS_WIDTH + 60) drawPalm(ctx, sx);
    }
    ctx.fillStyle = "rgba(14,165,233,0.55)";
    ctx.fillRect(0, GROUND_Y - 26, CANVAS_WIDTH, 26);
  }

  if (b === "village") {
    for (let i = 0; i < 14; i++) {
      const sx = i * 360 + 200 - state.cameraX * 0.6;
      if (sx > -140 && sx < CANVAS_WIDTH + 140) drawHouse(ctx, sx);
    }
  }

  if (b === "desert") {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.lineTo(x, GROUND_Y - 60 - Math.sin((x + state.cameraX * 0.3) / 120) * 30);
    }
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      const sx = i * 340 + 180 - state.cameraX * 0.7;
      if (sx > -60 && sx < CANVAS_WIDTH + 60) drawCactus(ctx, sx);
    }
  }

  if (b === "ocean") {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 6; i++) {
      const sx = i * 200 - (state.cameraX * 0.3) % 200;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + 70, 0);
      ctx.lineTo(sx + 160, CANVAS_HEIGHT);
      ctx.lineTo(sx + 40, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(191,219,254,0.5)";
    for (let i = 0; i < 40; i++) {
      const bx = (i * 211 - state.cameraX * 0.4) % CANVAS_WIDTH;
      const by = (CANVAS_HEIGHT - ((now / 14 + i * 90) % CANVAS_HEIGHT)) | 0;
      ctx.beginPath();
      ctx.arc((bx + CANVAS_WIDTH) % CANVAS_WIDTH, by, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (b === "snow") {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 70; i++) {
      const sx = (i * 137 + Math.sin(now / 900 + i) * 30 - state.cameraX * 0.3) % CANVAS_WIDTH;
      const sy = (now / 12 + i * 71) % CANVAS_HEIGHT;
      ctx.fillRect((sx + CANVAS_WIDTH) % CANVAS_WIDTH, sy, 3, 3);
    }
  }

  if (b === "fire") {
    ctx.fillStyle = "#f97316";
    for (let i = 0; i < 30; i++) {
      const t = (now / 20 + i * 40) % 400;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(((i * 97 - state.cameraX * 0.5) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH, GROUND_Y - t, 3, 6);
      ctx.globalAlpha = 1;
    }
  }

  if (b === "castle") {
    ctx.fillStyle = "#111827";
    for (let i = 0; i < 6; i++) {
      const tx = i * 170 - (state.cameraX * 0.4) % 170;
      ctx.fillRect(tx, 150, 90, GROUND_Y - 150);
      ctx.fillRect(tx - 10, 120, 110, 34);
    }
  }

  if (b === "dark") {
    const fog = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 520);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function drawGroundStrip(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.biome;
  const ground: Record<Biome, [string, string]> = {
    sunny: ["#166534", "#4ade80"],
    night: ["#0b1120", "#1e293b"],
    beach: ["#d97706", "#fde68a"],
    ocean: ["#164e63", "#0891b2"],
    village: ["#57534e", "#a3a3a3"],
    desert: ["#b45309", "#fbbf24"],
    snow: ["#94a3b8", "#ffffff"],
    dark: ["#0c0a09", "#1c1917"],
    fire: ["#7f1d1d", "#f97316"],
    castle: ["#1f2937", "#4b5563"],
  };
  ctx.fillStyle = ground[b][0];
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  ctx.fillStyle = ground[b][1];
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);
}

function drawExitGate(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!Number.isFinite(state.exitX)) return;
  const x = state.exitX - state.cameraX;
  if (x < -80 || x > CANVAS_WIDTH + 80) return;
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x, GROUND_Y - 120, 12, 120);
  ctx.fillRect(x + 78, GROUND_Y - 120, 12, 120);
  ctx.fillRect(x, GROUND_Y - 132, 90, 14);
  ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
  ctx.fillRect(x + 12, GROUND_Y - 118, 66, 118);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("EXIT", x + 26, GROUND_Y - 138);
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
    ctx.fillStyle = flash ? "#ffffff" : "#b45309";
    for (let i = 0; i < e.width; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 8);
      ctx.lineTo(x + i + 4, y - 2);
      ctx.lineTo(x + i + 8, y + 8);
      ctx.closePath();
      ctx.fill();
    }
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
  } else if (e.kind === "fish") {
    const dir = e.vx >= 0 ? 1 : -1;
    ctx.fillStyle = flash ? "#ffffff" : "#0ea5e9";
    ctx.beginPath();
    ctx.ellipse(x + e.width / 2, y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // tail
    ctx.beginPath();
    const tailX = dir > 0 ? x : x + e.width;
    ctx.moveTo(tailX, y + e.height / 2);
    ctx.lineTo(tailX - dir * 16, y - 2 + Math.sin(e.wobble) * 3);
    ctx.lineTo(tailX - dir * 16, y + e.height + 2 - Math.sin(e.wobble) * 3);
    ctx.closePath();
    ctx.fill();
    // teeth + eye
    ctx.fillStyle = "#f8fafc";
    for (let i = 0; i < 4; i++) {
      const tx = dir > 0 ? x + e.width - 6 - i * 6 : x + 2 + i * 6;
      ctx.beginPath();
      ctx.moveTo(tx, y + e.height / 2 + 2);
      ctx.lineTo(tx + 3, y + e.height / 2 + 9);
      ctx.lineTo(tx + 6, y + e.height / 2 + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(dir > 0 ? x + e.width - 16 : x + 10, y + 7, 6, 6);
  } else if (e.kind === "insect") {
    ctx.fillStyle = flash ? "#ffffff" : "#166534";
    ctx.beginPath();
    ctx.ellipse(x + e.width / 2, y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? "#ffffff" : "#052e16";
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + e.width / 2 + i * 10, y + e.height - 4);
      ctx.lineTo(x + e.width / 2 + i * 16, y + e.height + 8);
      ctx.stroke();
    }
    // crab claws
    const clawOpen = Math.abs(Math.sin(e.wobble * 1.6)) * 8;
    const clawColor = flash ? "#ffffff" : "#dc2626";
    for (const side of [-1, 1] as const) {
      const cx = side > 0 ? x + e.width + 12 : x - 12;
      const armFrom = side > 0 ? x + e.width - 6 : x + 6;
      ctx.strokeStyle = clawColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(armFrom, y + e.height / 2);
      ctx.lineTo(cx, y + e.height / 2 - 2);
      ctx.stroke();
      ctx.fillStyle = clawColor;
      ctx.beginPath();
      ctx.moveTo(cx, y + e.height / 2 - 2);
      ctx.lineTo(cx + side * 14, y + e.height / 2 - 8 - clawOpen);
      ctx.lineTo(cx + side * 9, y + e.height / 2 - 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, y + e.height / 2 - 2);
      ctx.lineTo(cx + side * 14, y + e.height / 2 + 6 + clawOpen);
      ctx.lineTo(cx + side * 9, y + e.height / 2 - 2);
      ctx.closePath();
      ctx.fill();
    }
    // antennae
    ctx.strokeStyle = flash ? "#ffffff" : "#052e16";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + e.width - 8, y + 6);
    ctx.lineTo(x + e.width + 6, y - 8);
    ctx.moveTo(x + 8, y + 6);
    ctx.lineTo(x - 6, y - 8);
    ctx.stroke();
    ctx.fillStyle = "#f87171";
    ctx.fillRect(x + e.width - 14, y + 8, 6, 6);
    ctx.fillRect(x + 8, y + 8, 6, 6);
  } else {
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
  if (!cage) return;
  const x = cage.x - state.cameraX;
  const y = cage.y;

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

function drawCoins(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const c of state.coins) {
    const x = c.x - state.cameraX;
    if (x < -20 || x > CANVAS_WIDTH + 20) continue;
    const w = Math.abs(Math.cos(c.spin)) * 9 + 2;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.ellipse(x, c.y, w, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawNpc(ctx: CanvasRenderingContext2D, npc: Npc, cameraX: number, active: boolean) {
  const x = npc.x - cameraX;
  if (x < -60 || x > CANVAS_WIDTH + 60) return;
  const y = GROUND_Y - 46;
  ctx.fillStyle = npc.color;
  ctx.fillRect(x - 12, y + 14, 24, 32);
  ctx.fillStyle = "#fcd7b6";
  ctx.beginPath();
  ctx.arc(x, y + 6, 11, 0, Math.PI * 2);
  ctx.fill();
  if (npc.kind === "mayor") {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x - 12, y - 8, 24, 6);
    ctx.fillRect(x - 6, y - 14, 12, 8);
  } else if (npc.kind === "shop") {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x - 26, y - 34, 52, 18);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SHOP", x - 16, y - 21);
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 5, y + 4, 3, 3);
  ctx.fillRect(x + 3, y + 4, 3, 3);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px sans-serif";
  ctx.fillText(npc.name, x - ctx.measureText(npc.name).width / 2, y - 40);

  if (active) {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Press E", x - 22, y - 56);
  }
}

function drawDialog(ctx: CanvasRenderingContext2D, state: GameState) {
  const line = state.dialogLines[state.dialogIndex];
  if (!line) return;
  const boxH = 110;
  const y = CANVAS_HEIGHT - boxH - 40;
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fillRect(40, y, CANVAS_WIDTH - 80, boxH);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, y, CANVAS_WIDTH - 80, boxH);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(state.dialogSpeaker, 60, y + 28);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "15px sans-serif";
  const words = line.split(" ");
  let current = "";
  let lineY = y + 56;
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > CANVAS_WIDTH - 130) {
      ctx.fillText(current, 60, lineY);
      lineY += 20;
      current = word;
    } else {
      current = test;
    }
  }
  ctx.fillText(current, 60, lineY);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";
  ctx.fillText("Press E to continue", CANVAS_WIDTH - 200, y + boxH - 12);
}

function drawShop(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
  ctx.fillRect(120, 100, CANVAS_WIDTH - 240, 380);
  ctx.strokeStyle = "#14b8a6";
  ctx.lineWidth = 3;
  ctx.strokeRect(120, 100, CANVAS_WIDTH - 240, 380);
  ctx.fillStyle = "#5eead4";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Pim's Village Shop", 150, 140);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`Your coins: ${state.player.coins}`, 150, 172);
  ctx.font = "15px sans-serif";
  SHOP_ITEMS.forEach((item, i) => {
    ctx.fillStyle = state.player.coins >= item.cost ? "#f8fafc" : "#64748b";
    ctx.fillText(`[${item.key}]  ${item.label}`, 150, 214 + i * 34);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`${item.cost}c`, CANVAS_WIDTH - 200, 214 + i * 34);
  });
  if (state.shopMessage) {
    ctx.fillStyle = "#4ade80";
    ctx.fillText(state.shopMessage, 150, 380);
  }
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText("Press a number to buy • E or Esc to leave", 150, 440);
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
  drawExitGate(ctx, state);

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
  drawCoins(ctx, state);

  const talkTarget = state.npcs.length ? nearestNpc(state) : null;
  for (const npc of state.npcs) drawNpc(ctx, npc, state.cameraX, npc === talkTarget && state.mode === "playing");

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
    state.swim
      ? "A/D: swim • W/Space: rise • S: dive • R: sword/bow • F: attack • E: chests"
      : "A/D: walk • Shift: sprint • Space: jump • R: sword/bow • F: attack • E: chests, TNT pail, key & cage",
    12,
    CANVAS_HEIGHT - 10
  );

  if (state.levelBanner > 0) {
    state.levelBanner--;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    const name = state.levelName;
    ctx.fillText(name, CANVAS_WIDTH / 2 - ctx.measureText(name).width / 2, 90);
  } else if (state.biomeLabelTimer > 0) {
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

  if (state.player.hasKey && state.cage && !state.cage.open) {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px sans-serif";
    const t = "You have the key — run right to the cage and press E!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, 104);
  }

  if (state.mode === "levelcomplete") {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 32px sans-serif";
    const t = "Level Complete!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    const next = LEVELS[state.levelIndex + 1]?.name ?? "";
    ctx.fillText(next, CANVAS_WIDTH / 2 - ctx.measureText(next).width / 2, CANVAS_HEIGHT / 2 + 26);
  }

  if (state.mode === "dialog") drawDialog(ctx, state);
  if (state.mode === "shop") drawShop(ctx, state);
}
