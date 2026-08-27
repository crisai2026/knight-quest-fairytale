import type {
  GameState,
  Player,
  Enemy,
  Chest,
  Platform,
  Boss,
  Projectile,
  TNT,
  Arrow,
  Pail,
  Biome,
  BossKind,
  Npc,
} from "./types";
import {
  LEVELS,
  GROUND_Y,
  FINAL_LEVEL_INDEX,
  VILLAGE_NPCS,
  VILLAGE_WIDTH,
  VILLAGE_PLATFORMS,
  SHOP_ITEMS,
  MAP_BOARD_X,
  PORTAL_X,
  type EnemySpawn,
  type LevelDef,
} from "./levels";
import { BOSSES, createBoss } from "./bosses";
import { createMinigame, drawMinigame, updateMinigame } from "./minigames";
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
const TNT_DAMAGE = 10;
const SAVE_KEY = "knight-quest-progress";

const BIOME_NAMES: Record<Biome, string> = {
  sunny: "Sunny Forest",
  night: "Night Forest",
  beach: "Sunny Beach",
  ocean: "The Deep Ocean",
  sky: "The High Sky",
  jungle: "Wild Jungle",
  snow: "Frozen Wastes",
  desert: "Burning Desert",
  mountain: "Snow Mountain",
  village: "The Village",
  dark: "Creepy Forest",
  fire: "Fire Landscape",
  castle: "The Dragon's Castle",
};

/* ---------------- Progress ---------------- */

type Progress = {
  unlockedLevels: number;
  coins: number;
  maxHealth: number;
  hasBow: boolean;
  arrows: number;
  bestScores: Record<string, number>;
};

function loadProgress(): Progress {
  const fallback: Progress = { unlockedLevels: 1, coins: 0, maxHealth: 5, hasBow: true, arrows: 20, bestScores: {} };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return fallback;
  }
}

function saveProgress(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    const data: Progress = {
      unlockedLevels: state.unlockedLevels,
      coins: state.player.coins,
      maxHealth: state.player.maxHealth,
      hasBow: state.player.hasBow,
      arrows: state.player.arrowsLeft,
      bestScores: state.bestScores,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage disabled — progress simply isn't kept */
  }
}

export function resetProgress() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------- Building state ---------------- */

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

function createPlayer(progress: Progress): Player {
  return {
    x: 60,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    facing: "right",
    health: progress.maxHealth,
    maxHealth: progress.maxHealth,
    hunger: 5,
    maxHunger: 5,
    onGround: false,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    invulnerable: 0,
    weapon: "sword",
    hasBow: progress.hasBow,
    arrowsLeft: progress.arrows,
    tnt: 0,
    hasKey: false,
    coins: progress.coins,
    items: [],
    reachedVillage: true,
  };
}

export function bossArenaX(level: LevelDef) {
  return level.width - 700;
}

function levelPails(level: LevelDef): Pail[] {
  const ax = bossArenaX(level);
  return [
    { x: ax - 180, y: GROUND_Y - 34, width: 34, height: 34 },
    { x: ax + 160, y: GROUND_Y - 34, width: 34, height: 34 },
    { x: ax + 460, y: GROUND_Y - 34, width: 34, height: 34 },
  ];
}

function baseState(carry: Player, progress: Progress): GameState {
  return {
    mode: "playing",
    scene: "level",
    cameraX: 0,
    levelIndex: 0,
    levelName: "",
    worldWidth: 1000,
    exitX: Number.POSITIVE_INFINITY,
    swim: false,
    levelBanner: 200,
    levelCompleteTimer: 0,
    player: carry,
    enemies: [],
    chests: [],
    platforms: [],
    particles: [],
    arrows: [],
    pails: [],
    boss: null,
    bossIntroDone: false,
    bossDefeated: false,
    tntList: [],
    keyDrop: null,
    cage: null,
    message: "",
    messageTimer: 0,
    cutsceneTimer: 0,
    cutscenePhase: 0,
    keys: {},
    started: false,
    biome: "village",
    biomeLabelTimer: 0,
    owlTimer: 0,
    coins: [],
    npcs: [],
    dialogLines: [],
    dialogIndex: 0,
    dialogSpeaker: "",
    shopMessage: "",
    unlockedLevels: progress.unlockedLevels,
    selectedLevel: Math.min(progress.unlockedLevels - 1, LEVELS.length - 1),
    mapCursor: Math.min(progress.unlockedLevels - 1, LEVELS.length - 1),
    minigame: null,
    bestScores: progress.bestScores,
  };
}

function refreshPlayer(player: Player) {
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
}

export function loadLevel(levelIndex: number, carry: Player, progress: Progress): GameState {
  const level = LEVELS[levelIndex]!;
  const player = { ...carry, items: [...carry.items] };
  refreshPlayer(player);

  const state = baseState(player, progress);
  state.scene = "level";
  state.levelIndex = levelIndex;
  state.levelName = level.name;
  state.worldWidth = level.width;
  state.swim = level.swim === true;
  state.biome = level.biome;
  state.enemies = level.enemies.map(makeEnemy);
  state.chests = level.chests.map((c: Chest) => ({ ...c }));
  state.platforms = [
    { x: 0, y: GROUND_Y, width: level.width, height: 80 },
    ...level.platforms.map((p: Platform) => ({ ...p })),
  ];
  state.pails = levelPails(level);
  state.cage =
    levelIndex === FINAL_LEVEL_INDEX
      ? { x: level.width - 200, y: GROUND_Y - 96, width: 80, height: 96, open: false }
      : null;
  return state;
}

export function loadVillage(carry: Player, progress: Progress): GameState {
  const player = { ...carry, items: [...carry.items] };
  refreshPlayer(player);
  player.health = player.maxHealth;
  player.hunger = player.maxHunger;
  player.x = 120;

  const state = baseState(player, progress);
  state.scene = "village";
  state.levelName = "The Village";
  state.worldWidth = VILLAGE_WIDTH;
  state.biome = "village";
  state.platforms = [
    { x: 0, y: GROUND_Y, width: VILLAGE_WIDTH, height: 80 },
    ...VILLAGE_PLATFORMS.map((p) => ({ ...p })),
  ];
  state.npcs = VILLAGE_NPCS.map((npc: Npc) => ({ ...npc }));
  state.levelBanner = 160;
  return state;
}

export function createInitialState(): GameState {
  const progress = loadProgress();
  const state = loadVillage(createPlayer(progress), progress);
  state.mode = "intro";
  state.cutsceneTimer = 0;
  state.cutscenePhase = 0;
  return state;
}

/** Mutates `state` in place so the caller's ref keeps pointing at live state. */
function replaceState(state: GameState, next: GameState) {
  const started = state.started;
  Object.assign(state, next);
  state.started = started;
}

function progressFrom(state: GameState): Progress {
  return {
    unlockedLevels: state.unlockedLevels,
    coins: state.player.coins,
    maxHealth: state.player.maxHealth,
    hasBow: state.player.hasBow,
    arrows: state.player.arrowsLeft,
    bestScores: state.bestScores,
  };
}

export function goToVillage(state: GameState) {
  saveProgress(state);
  replaceState(state, loadVillage(state.player, progressFrom(state)));
}

export function startLevel(state: GameState, levelIndex: number) {
  saveProgress(state);
  replaceState(state, loadLevel(levelIndex, state.player, progressFrom(state)));
}

export function restartLevel(state: GameState) {
  const fresh = { ...state.player };
  fresh.health = fresh.maxHealth;
  fresh.hunger = fresh.maxHunger;
  const progress = progressFrom(state);
  if (state.scene === "village") replaceState(state, loadVillage(fresh, progress));
  else replaceState(state, loadLevel(state.levelIndex, fresh, progress));
}

export function restartGame(state: GameState) {
  const progress = progressFrom(state);
  replaceState(state, loadVillage(state.player, progress));
}

/* ---------------- Helpers ---------------- */

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

function startDialog(state: GameState, speaker: string, lines: string[]) {
  state.mode = "dialog";
  state.dialogSpeaker = speaker;
  state.dialogLines = lines;
  state.dialogIndex = 0;
  state.keys["e"] = false;
  sfx.talk();
}

/* ---------------- Player ---------------- */

function updatePlayer(state: GameState) {
  const p = state.player;
  const keys = state.keys;
  const swim = state.swim;

  const moveLeft = keys["a"] || keys["arrowleft"];
  const moveRight = keys["d"] || keys["arrowright"];

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

  if (keys["r"]) {
    if (p.hasBow) {
      p.weapon = p.weapon === "sword" ? "bow" : "sword";
      showMessage(state, p.weapon === "bow" ? "Bow equipped — F to shoot" : "Sword equipped — F to swing", 70);
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
  if (state.biomeLabelTimer > 0) state.biomeLabelTimer--;

  if (state.scene === "village") {
    updateVillage(state);
    return;
  }

  // Boss trigger near the end of the level
  const level = LEVELS[state.levelIndex]!;
  const arenaX = bossArenaX(level);
  if (!state.bossDefeated && state.boss === null && p.x >= arenaX - 240) {
    const def = BOSSES[level.boss];
    if (!state.bossIntroDone) {
      state.bossIntroDone = true;
      sfx.dragonRoar();
      startDialog(state, def.name, def.taunt);
      return;
    }
    state.boss = createBoss(level.boss, arenaX, GROUND_Y);
    showMessage(state, `${def.name}! Grab TNT from a pail, throw it while it rests.`, 200);
  }
}

/* ---------------- Village hub ---------------- */

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

function updateVillage(state: GameState) {
  const p = state.player;
  const cx = p.x + p.width / 2;

  // World map board
  if (Math.abs(cx - MAP_BOARD_X) < 70) {
    if (state.keys["e"]) {
      state.keys["e"] = false;
      state.mode = "map";
      state.mapCursor = state.selectedLevel;
      sfx.talk();
      return;
    }
    showMessage(state, "Press E to read the world map", 20);
  }

  // Portal
  if (Math.abs(cx - PORTAL_X) < 80) {
    if (state.keys["e"]) {
      state.keys["e"] = false;
      startLevel(state, state.selectedLevel);
      return;
    }
    showMessage(state, `Press E to enter the ${LEVELS[state.selectedLevel]!.short} portal`, 20);
  }

  const npc = nearestNpc(state);
  if (!npc || !state.keys["e"]) return;
  state.keys["e"] = false;

  if (npc.kind === "shop") {
    state.mode = "shop";
    state.shopMessage = "";
    sfx.talk();
    return;
  }

  if (npc.minigame) {
    const best = state.bestScores[npc.minigame] ?? 0;
    state.minigame = createMinigame(npc.minigame, best);
    state.mode = "minigame";
    sfx.talk();
    return;
  }

  startDialog(state, npc.name, npc.lines);
}

/* ---------------- Coins, enemies, arrows ---------------- */

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
      e.wobble += 0.2;
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
      if (e.kind === "winged") e.y = e.baseY + Math.sin(e.wobble) * 40;
      else if (e.kind === "tentacle") e.y = e.baseY + Math.sin(e.wobble) * 3;
    }

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

    const b = state.boss;
    if (!hit && b && rectsOverlap({ x: a.x - 4, y: a.y - 2, width: 12, height: 5 }, b)) {
      spawnParticle(state, a.x, a.y, "#94a3b8", 4, 2);
      hit = true;
    }

    if (hit || a.life <= 0 || a.y > GROUND_Y) state.arrows.splice(i, 1);
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
    if (Math.hypot(dx, dy) < 60) {
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
      } else {
        p.arrowsLeft += 12;
        showMessage(state, "+12 arrows");
      }
    }
  }

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

/* ---------------- Bosses ---------------- */

function bossAttack(state: GameState, b: Boss) {
  const def = BOSSES[b.kind];
  const p = state.player;
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const push = (proj: Partial<Projectile>) => {
    b.projectiles.push({
      x: from.x,
      y: from.y,
      vx: 0,
      vy: 0,
      radius: 10,
      life: 200,
      color: def.projectileColor,
      shape: def.projectileShape,
      ...proj,
    } as Projectile);
  };

  const dx = p.x + p.width / 2 - from.x;
  const dy = p.y + p.height / 2 - from.y;
  const dist = Math.hypot(dx, dy) || 1;

  switch (b.kind) {
    case "cloud":
      // lightning drops straight down onto the knight
      push({ x: p.x + p.width / 2, y: b.y + b.height, vx: 0, vy: 9, radius: 9, life: 90 });
      break;
    case "wizard":
      push({ vx: (dx / dist) * 5, vy: (dy / dist) * 5, radius: 11, life: 160 });
      push({ vx: (dx / dist) * 4, vy: (dy / dist) * 4 - 1.6, radius: 8, life: 160 });
      break;
    case "gorilla":
    case "furryking":
      push({ vx: dx > 0 ? 6 : -6, vy: -7, radius: 12, life: 200 });
      break;
    case "owl":
      push({ vx: (dx / dist) * 6, vy: (dy / dist) * 6, radius: 8, life: 150 });
      break;
    case "shark":
      push({ vx: (dx / dist) * 5.5, vy: (dy / dist) * 5.5, radius: 9, life: 160 });
      break;
    case "scorpion":
      push({ vx: dx > 0 ? 7 : -7, vy: -2, radius: 8, life: 140 });
      break;
    case "bear":
      push({ vx: dx > 0 ? 5.5 : -5.5, vy: -5, radius: 12, life: 200 });
      break;
    case "crab":
      push({ vx: dx > 0 ? 5 : -5, vy: -6, radius: 10, life: 180 });
      push({ vx: dx > 0 ? 3 : -3, vy: -8, radius: 8, life: 180 });
      break;
    default:
      sfx.dragonFire();
      push({ vx: dx * 0.006, vy: 3 + Math.random() * 2, radius: 11, life: 180 });
  }
}

function updateBoss(state: GameState) {
  const b = state.boss;
  if (!b) return;
  const def = BOSSES[b.kind];
  const p = state.player;
  const level = LEVELS[state.levelIndex]!;
  const arenaX = bossArenaX(level);

  b.timer++;
  if (b.flash > 0) b.flash--;

  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const fb = b.projectiles[i]!;
    fb.x += fb.vx;
    fb.y += fb.vy;
    if (fb.shape === "rock" || fb.shape === "ball") fb.vy += 0.12;
    fb.life--;
    if (fb.life <= 0 || fb.y > GROUND_Y + 20) {
      b.projectiles.splice(i, 1);
      continue;
    }
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    if (Math.hypot(fb.x - cx, fb.y - cy) < fb.radius + p.width / 2 && p.invulnerable <= 0) {
      p.health = Math.max(0, p.health - 1);
      p.invulnerable = 40;
      b.projectiles.splice(i, 1);
      sfx.hurt();
      showMessage(state, "Hit!", 50);
    }
  }

  switch (b.state) {
    case "active": {
      if (b.flying) {
        b.y = b.hoverY + Math.sin(b.timer * 0.05) * 22;
        b.x += b.dir * def.speed;
        if (b.x < arenaX - 120) b.dir = 1;
        if (b.x > arenaX + 520) b.dir = -1;
      } else {
        // charges towards the knight along the ground
        const target = p.x + p.width / 2 - b.width / 2;
        b.dir = target > b.x ? 1 : -1;
        b.x += b.dir * def.speed;
        b.x = clamp(b.x, arenaX - 200, arenaX + 620);
        b.y = b.restY - Math.abs(Math.sin(b.timer * 0.08)) * 6;
        if (rectsOverlap(p, b) && p.invulnerable <= 0) {
          p.health = Math.max(0, p.health - 1);
          p.invulnerable = 50;
          p.vx = b.dir * 8;
          p.vy = -6;
          sfx.hurt();
        }
      }
      if (b.timer % def.attackEvery === 0) bossAttack(state, b);
      if (b.timer > def.activeFrames) {
        b.state = "landing";
        b.timer = 0;
      }
      break;
    }
    case "landing": {
      b.y += (b.restY - b.y) * 0.09;
      if (Math.abs(b.y - b.restY) < 2) {
        b.y = b.restY;
        b.state = "resting";
        b.timer = 0;
        showMessage(state, `${b.name} is tired — throw TNT with E!`, 90);
      }
      break;
    }
    case "resting": {
      if (b.timer > def.restFrames) {
        b.state = "taking_off";
        b.timer = 0;
      }
      break;
    }
    case "taking_off": {
      b.y += (b.hoverY - b.y) * 0.09;
      if (Math.abs(b.y - b.hoverY) < 2) {
        b.y = b.hoverY;
        b.state = "active";
        b.timer = 0;
        b.restCount++;
      }
      break;
    }
  }

  if (b.state === "resting" && state.keys["e"] && p.tnt > 0 && state.tntList.length < 3) {
    const dist = Math.hypot(p.x + p.width / 2 - (b.x + b.width / 2), p.y + p.height / 2 - (b.y + b.height / 2));
    if (dist < 340) {
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

function defeatBoss(state: GameState, b: Boss) {
  sfx.dragonRoar(0.55);
  spawnExplosion(state, b.x + b.width / 2, b.y + b.height / 2);
  spawnExplosion(state, b.x + b.width / 2 + 40, b.y + b.height / 2);
  spawnCoins(state, b.x + b.width / 2, b.y + b.height / 2, 12);
  state.boss = null;
  state.bossDefeated = true;

  if (state.levelIndex === FINAL_LEVEL_INDEX) {
    playMusic(null);
    state.keyDrop = { x: b.x + b.width / 2, y: b.y + b.height / 2, vy: 0, collected: false };
    showMessage(state, "The dragon explodes and drops the cage key!", 220);
    return;
  }

  state.unlockedLevels = Math.max(state.unlockedLevels, state.levelIndex + 2);
  state.selectedLevel = Math.min(state.unlockedLevels - 1, LEVELS.length - 1);
  saveProgress(state);
  state.mode = "levelcomplete";
  state.levelCompleteTimer = 0;
}

function updateTNT(state: GameState) {
  const b = state.boss;

  for (let i = state.tntList.length - 1; i >= 0; i--) {
    const t = state.tntList[i]!;
    t.vy += GRAVITY * 0.5;
    t.x += t.vx;
    t.y += t.vy;
    t.fuse--;

    if (b && !t.exploded && rectsOverlap({ x: t.x - 6, y: t.y - 6, width: 12, height: 12 }, b)) t.fuse = 0;

    if (t.fuse <= 0 && !t.exploded) {
      t.exploded = true;
      sfx.explosion();
      spawnExplosion(state, t.x, t.y);
      if (b) {
        const dist = Math.hypot(t.x - (b.x + b.width / 2), t.y - (b.y + b.height / 2));
        if (dist < 140) {
          b.health -= TNT_DAMAGE;
          b.flash = 12;
          spawnParticle(state, b.x + b.width / 2, b.y + b.height / 2, "#f97316", 12, 5);
          if (b.health <= 0) {
            defeatBoss(state, b);
          } else {
            sfx.dragonRoar(0.3);
            showMessage(state, `${b.name} hit! ${b.health} HP left`, 60);
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
    if (Math.hypot(p.x + p.width / 2 - k.x, p.y + p.height / 2 - k.y) < 60 && state.keys["e"]) {
      k.collected = true;
      p.hasKey = true;
      state.keys["e"] = false;
      spawnParticle(state, k.x, k.y, "#facc15", 12, 3);
      showMessage(state, "Got the cage key! Free the princess.", 160);
    }
  }

  const cage = state.cage;
  if (cage && !cage.open && p.hasKey && state.keys["e"]) {
    if (Math.abs(p.x + p.width / 2 - (cage.x + cage.width / 2)) < 90) {
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

/* ---------------- Cutscenes ---------------- */

const INTRO_LINES = [
  "A quiet morning in the village...",
  "A shadow falls: the Dragon lands, and beside him stands Zarvok the Wizard.",
  "Dragon: \"Minions! Take the princess to my castle!\"",
  "The monsters carry the princess away into the sky.",
  "Mayor Bumbleworth: \"Brave knight — only you can bring her home!\"",
];

function updateIntro(state: GameState) {
  state.cutsceneTimer++;
  state.cutscenePhase = Math.floor(state.cutsceneTimer / 190);
  if (state.cutscenePhase >= INTRO_LINES.length) endIntro(state);
}

function endIntro(state: GameState) {
  state.mode = "playing";
  state.cutsceneTimer = 0;
  state.cutscenePhase = 0;
  showMessage(state, "Read the map board, then step into the portal.", 220);
}

function updateCutscene(state: GameState) {
  state.cutsceneTimer++;
  state.cutscenePhase = Math.floor(state.cutsceneTimer / 150);

  if (state.cutscenePhase === 0) state.message = "The cage swings open!";
  else if (state.cutscenePhase === 1) state.message = "Princess: Thank you, brave knight!";
  else if (state.cutscenePhase === 2) state.message = "*kiss*";
  else {
    state.mode = "won";
    state.message = "The End";
  }
  state.messageTimer = 10;
}

/* ---------------- Music ---------------- */

function musicForState(state: GameState): MusicTrack {
  if (!state.started) return null;
  if (state.mode === "gameover") return null;
  if (state.mode === "intro") return "creepy";
  if (state.mode === "won" || (state.cage?.open ?? false)) return "beautiful";
  if (state.boss) return "rock";
  if (state.biome === "night" || state.biome === "dark" || state.biome === "mountain") return "creepy";
  if (state.biome === "castle") return "fire";
  return "cheery";
}

/* ---------------- Shop ---------------- */

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
  saveProgress(state);
}

/* ---------------- Main loop ---------------- */

export function updateGame(state: GameState) {
  playMusic(musicForState(state));

  if (state.mode === "won" || state.mode === "gameover") return;

  if (state.mode === "intro") {
    updateIntro(state);
    return;
  }

  if (state.mode === "map") return;

  if (state.mode === "minigame") {
    const m = state.minigame;
    if (m) {
      const payout = updateMinigame(m, state.keys);
      if (payout !== null) {
        state.player.coins += payout;
        state.bestScores[m.kind] = m.best;
        saveProgress(state);
      }
    }
    return;
  }

  if (state.mode === "dialog" || state.mode === "shop") {
    updateParticles(state);
    return;
  }

  if (state.mode === "levelcomplete") {
    state.levelCompleteTimer++;
    updateParticles(state);
    if (state.levelCompleteTimer > 150) goToVillage(state);
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
  updateBoss(state);
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
  if (state.mode === "intro") {
    endIntro(state);
    state.started = true;
    return;
  }
  if (state.mode === "gameover") {
    if (key === "enter" || key === " ") {
      restartLevel(state);
      return;
    }
    if (key === "v") {
      goToVillage(state);
      return;
    }
    return;
  }
  if (state.mode === "won" && (key === "enter" || key === " ")) {
    restartGame(state);
    return;
  }
  if (state.mode === "map") {
    if (key === "a" || key === "arrowleft") state.mapCursor = Math.max(0, state.mapCursor - 1);
    else if (key === "d" || key === "arrowright") state.mapCursor = Math.min(LEVELS.length - 1, state.mapCursor + 1);
    else if (key === "w" || key === "arrowup") state.mapCursor = Math.max(0, state.mapCursor - 5);
    else if (key === "s" || key === "arrowdown") state.mapCursor = Math.min(LEVELS.length - 1, state.mapCursor + 5);
    else if (key === "e" || key === "enter" || key === " ") {
      if (state.mapCursor < state.unlockedLevels) {
        state.selectedLevel = state.mapCursor;
        state.mode = "playing";
        state.keys["e"] = false;
        sfx.buy();
        showMessage(state, `Portal set to ${LEVELS[state.selectedLevel]!.short}. Walk right into it!`, 200);
      } else {
        sfx.deny();
      }
    } else if (key === "escape") {
      state.mode = "playing";
      state.keys["e"] = false;
    }
    return;
  }
  if (state.mode === "minigame") {
    const m = state.minigame;
    if (m?.finished && (key === "e" || key === "enter" || key === "escape")) {
      state.minigame = null;
      state.mode = "playing";
      state.keys["e"] = false;
      return;
    }
    if (key === "escape") {
      state.minigame = null;
      state.mode = "playing";
      state.keys["e"] = false;
      return;
    }
    state.keys[key] = true;
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
  sky: ["#e0f2fe", "#93c5fd"],
  jungle: ["#15803d", "#3f2c14"],
  snow: ["#f8fafc", "#94a3b8"],
  desert: ["#fbbf24", "#92400e"],
  mountain: ["#e2e8f0", "#64748b"],
  village: ["#a3a3a3", "#57534e"],
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

function drawTree(ctx: CanvasRenderingContext2D, x: number, style: "green" | "night" | "dead" | "jungle") {
  ctx.fillStyle = style === "green" || style === "jungle" ? "#7c3f16" : "#1c1917";
  ctx.fillRect(x, GROUND_Y - 90, 14, 90);
  ctx.fillStyle =
    style === "green" ? "#16a34a" : style === "jungle" ? "#166534" : style === "night" ? "#14532d" : "#0c0a09";
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
    sky: ["#38bdf8", "#e0f2fe"],
    jungle: ["#14532d", "#65a30d"],
    snow: ["#cbd5e1", "#f8fafc"],
    desert: ["#fcd34d", "#fbbf24"],
    mountain: ["#334155", "#e2e8f0"],
    village: ["#93c5fd", "#d9f99d"],
    dark: ["#020617", "#0f172a"],
    fire: ["#450a0a", "#b45309"],
    castle: ["#1e1b4b", "#312e81"],
  };
  gradient.addColorStop(0, stops[b][0]);
  gradient.addColorStop(1, stops[b][1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const now = Date.now();

  if (b === "sunny" || b === "beach" || b === "village" || b === "sky" || b === "jungle") {
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

  if (b === "night" || b === "dark" || b === "snow" || b === "mountain") {
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

  if (b === "mountain") {
    ctx.fillStyle = "#94a3b8";
    for (let i = 0; i < 8; i++) {
      const mx = i * 380 - state.cameraX * 0.35;
      ctx.beginPath();
      ctx.moveTo(mx - 200, GROUND_Y);
      ctx.lineTo(mx, 130);
      ctx.lineTo(mx + 200, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(mx - 46, 220);
      ctx.lineTo(mx, 130);
      ctx.lineTo(mx + 46, 220);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
    }
  }

  if (b === "sunny" || b === "night" || b === "dark" || b === "jungle") {
    const style = b === "sunny" ? "green" : b === "night" ? "night" : b === "jungle" ? "jungle" : "dead";
    for (let i = 0; i < 24; i++) {
      const sx = i * 320 + 120 - state.cameraX * 0.7;
      if (sx > -80 && sx < CANVAS_WIDTH + 80) drawTree(ctx, sx, style);
    }
  }

  if (b === "jungle") {
    ctx.strokeStyle = "rgba(21,128,61,0.7)";
    ctx.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      const vx = ((i * 190 - state.cameraX * 0.5) % 1400) - 100;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.quadraticCurveTo(vx + 20, 90, vx - 10, 190);
      ctx.stroke();
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
      const sx = i * 200 - ((state.cameraX * 0.3) % 200);
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

  if (b === "sky") {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 10; i++) {
      const cx = ((i * 260 - state.cameraX * 0.5) % 2200) - 200;
      const cy = 200 + (i % 4) * 70;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (b === "snow" || b === "mountain") {
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
      ctx.fillRect((((i * 97 - state.cameraX * 0.5) % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH, GROUND_Y - t, 3, 6);
      ctx.globalAlpha = 1;
    }
  }

  if (b === "castle") {
    ctx.fillStyle = "#111827";
    for (let i = 0; i < 6; i++) {
      const tx = i * 170 - ((state.cameraX * 0.4) % 170);
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
    sky: ["#bae6fd", "#f8fafc"],
    jungle: ["#14532d", "#4d7c0f"],
    snow: ["#94a3b8", "#ffffff"],
    desert: ["#b45309", "#fbbf24"],
    mountain: ["#64748b", "#f1f5f9"],
    village: ["#57534e", "#a3a3a3"],
    dark: ["#0c0a09", "#1c1917"],
    fire: ["#7f1d1d", "#f97316"],
    castle: ["#1f2937", "#4b5563"],
  };
  ctx.fillStyle = ground[b][0];
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  ctx.fillStyle = ground[b][1];
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
    ctx.fillStyle = "#e5e7eb";
    if (p.attacking) {
      const reach = 46;
      const ax = p.facing === "right" ? x + p.width - 4 : x - reach + 4;
      ctx.fillRect(ax, y + 16, reach, 6);
    } else {
      ctx.fillRect(p.facing === "right" ? x + p.width : x - 4, y + 10, 4, 24);
    }
  } else {
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const bx = p.facing === "right" ? x + p.width + 2 : x - 2;
    ctx.arc(
      bx,
      y + 24,
      14,
      p.facing === "right" ? -Math.PI / 2 : Math.PI / 2,
      p.facing === "right" ? Math.PI / 2 : (3 * Math.PI) / 2
    );
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
    ctx.beginPath();
    const tailX = dir > 0 ? x : x + e.width;
    ctx.moveTo(tailX, y + e.height / 2);
    ctx.lineTo(tailX - dir * 16, y - 2 + Math.sin(e.wobble) * 3);
    ctx.lineTo(tailX - dir * 16, y + e.height + 2 - Math.sin(e.wobble) * 3);
    ctx.closePath();
    ctx.fill();
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

/** Small head-only portrait, used on the map board and inside the portal. */
export function drawBossFace(ctx: CanvasRenderingContext2D, kind: BossKind, cx: number, cy: number, r: number) {
  const def = BOSSES[kind];
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.accent;
  if (kind === "furryking" || kind === "bear" || kind === "gorilla") {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.3);
    ctx.lineTo(cx - r * 1.2, cy - r * 1.2);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.8, cy - r * 0.3);
    ctx.lineTo(cx + r * 1.2, cy - r * 1.2);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "owl") {
    ctx.beginPath();
    ctx.arc(cx - r * 0.4, cy - r * 0.1, r * 0.38, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.4, cy - r * 0.1, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "crab" || kind === "scorpion") {
    ctx.beginPath();
    ctx.arc(cx - r * 0.7, cy - r * 0.7, r * 0.3, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.7, cy - r * 0.7, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "shark") {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.2);
    ctx.lineTo(cx + r, cy + r * 0.2);
    ctx.lineTo(cx, cy + r * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "cloud") {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.2, cy - r * 0.6);
    ctx.lineTo(cx + r * 0.2, cy);
    ctx.lineTo(cx - r * 0.05, cy);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.7);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.05, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "wizard") {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 0.4);
    ctx.lineTo(cx, cy - r * 1.8);
    ctx.lineTo(cx + r, cy - r * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "dragon") {
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.6, cy);
    ctx.lineTo(cx + r * 1.5, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#fde047";
  ctx.fillRect(cx - r * 0.5, cy - r * 0.25, r * 0.3, r * 0.3);
  ctx.fillRect(cx + r * 0.2, cy - r * 0.25, r * 0.3, r * 0.3);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(cx - r * 0.42, cy - r * 0.18, r * 0.14, r * 0.16);
  ctx.fillRect(cx + r * 0.28, cy - r * 0.18, r * 0.14, r * 0.16);
}

function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, cameraX: number) {
  const def = BOSSES[b.kind];
  const x = b.x - cameraX;
  const y = b.y;
  const w = b.width;
  const h = b.height;

  if (b.flash > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
    // still draw projectiles when flashing
  } else {
    ctx.fillStyle = def.color;

    if (b.kind === "owl") {
      const flap = Math.sin(b.timer * 0.14) * 16;
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x - 46, y + 6 - flap);
      ctx.lineTo(x + 6, y + h - 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w, y + h / 2);
      ctx.lineTo(x + w + 46, y + 6 - flap);
      ctx.lineTo(x + w - 6, y + h - 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawBossFace(ctx, b.kind, x + w / 2, y + h / 2 - 6, 22);
    } else if (b.kind === "cloud") {
      ctx.fillStyle = def.color;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(x + 18 + i * 24, y + h / 2 + Math.sin(b.timer * 0.05 + i) * 5, 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x + w / 2 - 30, y + h / 2 - 6, 12, 12);
      ctx.fillRect(x + w / 2 + 16, y + h / 2 - 6, 12, 12);
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 8, y + h);
      ctx.lineTo(x + w / 2 + 10, y + h + 26);
      ctx.lineTo(x + w / 2, y + h + 26);
      ctx.lineTo(x + w / 2 + 16, y + h + 58);
      ctx.lineTo(x + w / 2 - 12, y + h + 22);
      ctx.lineTo(x + w / 2 - 2, y + h + 22);
      ctx.closePath();
      ctx.fill();
    } else if (b.kind === "shark") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w, y + h / 2);
      ctx.lineTo(x + w + 40, y - 10);
      ctx.lineTo(x + w + 40, y + h + 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 16, y);
      ctx.lineTo(x + w / 2, y - 34);
      ctx.lineTo(x + w / 2 + 16, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = def.accent;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 6 + i * 12, y + h / 2 + 6);
        ctx.lineTo(x + 12 + i * 12, y + h / 2 + 20);
        ctx.lineTo(x + 18 + i * 12, y + h / 2 + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x + 18, y + h / 2 - 12, 10, 10);
    } else if (b.kind === "crab") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 6, w / 2, h / 2, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x, y + h / 2 + 4, w, h / 2 - 4);
      const claw = Math.abs(Math.sin(b.timer * 0.1)) * 14;
      ctx.fillStyle = def.color;
      for (const side of [-1, 1] as const) {
        const cx = side > 0 ? x + w + 30 : x - 30;
        ctx.fillRect(side > 0 ? x + w : x - 34, y + h / 2, 34, 10);
        ctx.beginPath();
        ctx.moveTo(cx, y + h / 2);
        ctx.lineTo(cx + side * 32, y + h / 2 - 12 - claw);
        ctx.lineTo(cx + side * 16, y + h / 2 + 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, y + h / 2 + 6);
        ctx.lineTo(cx + side * 32, y + h / 2 + 20 + claw);
        ctx.lineTo(cx + side * 16, y + h / 2 + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#fde047";
      ctx.fillRect(x + w / 2 - 24, y + 8, 12, 12);
      ctx.fillRect(x + w / 2 + 12, y + 8, 12, 12);
    } else if (b.kind === "scorpion") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 10, w / 2, h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x + w - 10, y + h / 2);
      ctx.quadraticCurveTo(x + w + 60, y + 10, x + w + 10, y - 30);
      ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(x + w + 6, y - 36, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      for (const side of [0, 1]) {
        ctx.fillRect(x - 30 + side * 6, y + h / 2, 34, 8);
        ctx.beginPath();
        ctx.arc(x - 32, y + h / 2 + 4 - side * 12, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fde047";
      ctx.fillRect(x + 22, y + h / 2 - 4, 10, 10);
      ctx.fillRect(x + 42, y + h / 2 - 4, 10, 10);
    } else if (b.kind === "wizard") {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 20);
      ctx.lineTo(x + w + 6, y + h);
      ctx.lineTo(x - 6, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fcd7b6";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 22, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 24, y + 14);
      ctx.lineTo(x + w / 2, y - 44);
      ctx.lineTo(x + w / 2 + 24, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(x + w / 2 - 6, y + 30, 12, 26);
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + w + 4, y + h);
      ctx.lineTo(x + w - 6, y - 10);
      ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(x + w - 6, y - 16, 11 + Math.sin(b.timer * 0.15) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x + w / 2 - 9, y + 18, 5, 5);
      ctx.fillRect(x + w / 2 + 4, y + 18, 5, 5);
    } else if (b.kind === "dragon") {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 10);
      ctx.lineTo(x + w - 20, y - 30);
      ctx.lineTo(x + w - 46, y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.moveTo(x + w, y + 16);
      ctx.lineTo(x + w + 32, y + 6);
      ctx.lineTo(x + w, y + 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x + w - 20, y + 12, 11, 11);
      ctx.fillRect(x + w - 20, y + 40, 11, 11);
      ctx.fillStyle = "#fca5a5";
      for (let i = 0; i < w; i += 16) {
        ctx.beginPath();
        ctx.moveTo(x + i + 8, y + h);
        ctx.lineTo(x + i, y + h + 12);
        ctx.lineTo(x + i + 16, y + h + 12);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // furryking, gorilla, bear — big shaggy bruisers
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y + 14, w, h - 14);
      ctx.fillStyle = def.accent;
      for (let i = 0; i < w; i += 10) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + 16);
        ctx.lineTo(x + i + 5, y + 2);
        ctx.lineTo(x + i + 10, y + 16);
        ctx.closePath();
        ctx.fill();
      }
      const swing = Math.sin(b.timer * 0.12) * 12;
      ctx.fillStyle = def.color;
      ctx.fillRect(x - 18, y + 26 + swing, 22, 40);
      ctx.fillRect(x + w - 4, y + 26 - swing, 22, 40);
      drawBossFace(ctx, b.kind, x + w / 2, y + 34, 22);
    }
  }

  for (const fb of b.projectiles) {
    const px = fb.x - cameraX;
    ctx.fillStyle = fb.color;
    if (fb.shape === "bolt") {
      ctx.beginPath();
      ctx.moveTo(px - 6, fb.y - 12);
      ctx.lineTo(px + 6, fb.y);
      ctx.lineTo(px, fb.y);
      ctx.lineTo(px + 8, fb.y + 14);
      ctx.lineTo(px - 4, fb.y + 2);
      ctx.lineTo(px + 2, fb.y + 2);
      ctx.closePath();
      ctx.fill();
    } else if (fb.shape === "feather") {
      ctx.beginPath();
      ctx.ellipse(px, fb.y, fb.radius + 4, fb.radius / 2, Math.atan2(fb.vy, fb.vx), 0, Math.PI * 2);
      ctx.fill();
    } else if (fb.shape === "rock") {
      ctx.fillRect(px - fb.radius, fb.y - fb.radius, fb.radius * 2, fb.radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(px, fb.y, fb.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTNT(ctx: CanvasRenderingContext2D, t: TNT, cameraX: number) {
  const x = t.x - cameraX;
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(x - 6, t.y - 6, 12, 12);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(x - 2, t.y - 10, 4, 6);
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

  ctx.fillStyle = "#0f172a";
  ctx.font = "11px sans-serif";
  ctx.fillText(npc.name, x - ctx.measureText(npc.name).width / 2, y - 40);

  if (active) {
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Press E", x - 22, y - 56);
  }
}

function drawMapBoard(ctx: CanvasRenderingContext2D, state: GameState) {
  const x = MAP_BOARD_X - state.cameraX;
  if (x < -120 || x > CANVAS_WIDTH + 120) return;
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x - 6, GROUND_Y - 70, 12, 70);
  ctx.fillRect(x - 60, GROUND_Y - 70, 12, 70);
  ctx.fillRect(x + 48, GROUND_Y - 70, 12, 70);
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(x - 70, GROUND_Y - 160, 140, 96);
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 5;
  ctx.strokeRect(x - 70, GROUND_Y - 160, 140, 96);
  ctx.fillStyle = "#78350f";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("WORLD MAP", x - 46, GROUND_Y - 136);
  ctx.font = "12px sans-serif";
  ctx.fillText(`${state.unlockedLevels}/10 unlocked`, x - 42, GROUND_Y - 112);
  ctx.fillText("Press E", x - 24, GROUND_Y - 86);
}

function drawPortal(ctx: CanvasRenderingContext2D, state: GameState) {
  const x = PORTAL_X - state.cameraX;
  if (x < -160 || x > CANVAS_WIDTH + 160) return;
  const level = LEVELS[state.selectedLevel]!;
  const themeColors: Record<Biome, string> = {
    sunny: "#4ade80",
    night: "#4338ca",
    beach: "#f59e0b",
    ocean: "#06b6d4",
    sky: "#38bdf8",
    jungle: "#16a34a",
    snow: "#e0f2fe",
    desert: "#fbbf24",
    mountain: "#94a3b8",
    village: "#a3a3a3",
    dark: "#1e293b",
    fire: "#f97316",
    castle: "#7c3aed",
  };
  const color = themeColors[level.biome];
  const t = Date.now() / 400;
  const cy = GROUND_Y - 90;

  ctx.fillStyle = "#334155";
  ctx.fillRect(x - 74, GROUND_Y - 180, 16, 180);
  ctx.fillRect(x + 58, GROUND_Y - 180, 16, 180);
  ctx.fillRect(x - 74, GROUND_Y - 196, 148, 18);

  for (let i = 4; i >= 0; i--) {
    ctx.globalAlpha = 0.25 + i * 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, cy, 54 - i * 6 + Math.sin(t + i) * 3, 84 - i * 10 + Math.cos(t + i) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawBossFace(ctx, level.boss, x, cy, 26);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px sans-serif";
  const label = level.short;
  ctx.fillText(label, x - ctx.measureText(label).width / 2, GROUND_Y - 208);
}

function drawMapScreen(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "rgba(2,6,23,0.92)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("World Map", 40, 52);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "13px sans-serif";
  ctx.fillText("A/D or arrows to choose • E to set the portal • Esc to close", 40, 76);

  LEVELS.forEach((level, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const cx = 120 + col * 145;
    const cy = 190 + row * 190;
    const unlocked = i < state.unlockedLevels;
    const selected = i === state.mapCursor;

    ctx.fillStyle = unlocked ? "#1e293b" : "#0f172a";
    ctx.fillRect(cx - 62, cy - 74, 124, 148);
    ctx.strokeStyle = selected ? "#facc15" : unlocked ? "#475569" : "#1e293b";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(cx - 62, cy - 74, 124, 148);

    if (unlocked) {
      drawBossFace(ctx, level.boss, cx, cy - 12, 30);
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 18, cy - 18, 36, 30);
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 14, Math.PI, 0);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
    }

    ctx.fillStyle = unlocked ? "#f8fafc" : "#475569";
    ctx.font = "bold 13px sans-serif";
    const t1 = `${i + 1}. ${level.short}`;
    ctx.fillText(t1, cx - ctx.measureText(t1).width / 2, cy + 44);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = unlocked ? "#94a3b8" : "#334155";
    const t2 = unlocked ? BOSSES[level.boss].name : "Locked";
    ctx.fillText(t2, cx - ctx.measureText(t2).width / 2, cy + 62);
  });
}

function drawIntro(ctx: CanvasRenderingContext2D, state: GameState) {
  const phase = state.cutscenePhase;
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, phase === 0 ? "#7dd3fc" : "#450a0a");
  grad.addColorStop(1, phase === 0 ? "#bbf7d0" : "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#57534e";
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  for (let i = 0; i < 4; i++) drawHouse(ctx, 60 + i * 200);

  const t = state.cutsceneTimer;

  if (phase >= 1) {
    // dragon and wizard arrive
    const dx = phase === 1 ? 900 - Math.min(560, (t - 190) * 3) : 340;
    ctx.save();
    ctx.translate(dx, 150 + Math.sin(t * 0.06) * 10);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, 0, 130, 80);
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(130, 16);
    ctx.lineTo(166, 6);
    ctx.lineTo(130, 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.moveTo(20, 6);
    ctx.lineTo(90, -40);
    ctx.lineTo(58, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(108, 14, 12, 12);
    ctx.restore();

    // wizard on the ground
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.moveTo(250, GROUND_Y - 90);
    ctx.lineTo(290, GROUND_Y);
    ctx.lineTo(210, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fcd7b6";
    ctx.beginPath();
    ctx.arc(250, GROUND_Y - 96, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.moveTo(228, GROUND_Y - 104);
    ctx.lineTo(250, GROUND_Y - 160);
    ctx.lineTo(272, GROUND_Y - 104);
    ctx.closePath();
    ctx.fill();
  }

  if (phase >= 2 && phase <= 3) {
    // minions carrying the princess away
    const px = 420 + (phase === 3 ? (t - 570) * 1.6 : 0);
    const py = GROUND_Y - 120 - (phase === 3 ? (t - 570) * 0.5 : 0);
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(px, py, 28, 40);
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(px + 4, py - 16, 20, 16);
    ctx.fillStyle = "#be123c";
    for (const off of [-40, 40]) {
      ctx.beginPath();
      ctx.ellipse(px + 14 + off, py - 30, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (phase >= 4) {
    // the mayor pleads with the knight
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(300, GROUND_Y - 46, 24, 46);
    ctx.fillStyle = "#fcd7b6";
    ctx.beginPath();
    ctx.arc(312, GROUND_Y - 56, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(420, GROUND_Y - 48, 32, 48);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(424, GROUND_Y - 46, 24, 12);
  }

  const line = INTRO_LINES[Math.min(phase, INTRO_LINES.length - 1)]!;
  ctx.fillStyle = "rgba(2,6,23,0.85)";
  ctx.fillRect(0, CANVAS_HEIGHT - 120, CANVAS_WIDTH, 120);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(line, 40, CANVAS_HEIGHT - 70);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText("Press any key (or tap) to skip", 40, CANVAS_HEIGHT - 34);
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

  if (state.mode === "intro") {
    drawIntro(ctx, state);
    return;
  }

  if (state.mode === "minigame" && state.minigame) {
    drawMinigame(ctx, state.minigame);
    return;
  }

  drawBackground(ctx, state);
  drawGroundStrip(ctx, state);

  if (state.scene === "village") {
    drawMapBoard(ctx, state);
    drawPortal(ctx, state);
  }

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

  if (state.boss) drawBoss(ctx, state.boss, state.cameraX);

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
      : "A/D: walk • Shift: sprint • Space: jump • R: sword/bow • F: attack • E: interact, TNT pail",
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

  if (state.boss && state.boss.state === "resting") {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px sans-serif";
    const t =
      state.player.tnt > 0
        ? `${state.boss.name.toUpperCase()} IS DOWN — Press E to throw TNT!`
        : `${state.boss.name.toUpperCase()} IS DOWN — Get TNT from a pail!`;
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
    const t = "Boss Defeated!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    const next = LEVELS[state.levelIndex + 1];
    const t2 = next ? `${next.short} unlocked — back to the village` : "Back to the village";
    ctx.fillText(t2, CANVAS_WIDTH / 2 - ctx.measureText(t2).width / 2, CANVAS_HEIGHT / 2 + 20);
  }

  if (state.mode === "map") drawMapScreen(ctx, state);
  if (state.mode === "dialog") drawDialog(ctx, state);
  if (state.mode === "shop") drawShop(ctx, state);
}
