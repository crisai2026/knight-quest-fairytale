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
  FoodKind,
  FoodDrop,
  FlagDrop,
} from "./types";
import {
  LEVELS,
  GROUND_Y,
  FINAL_LEVEL_INDEX,
  VILLAGE_NPCS,
  SHOP_ITEMS,
  type EnemySpawn,
  type LevelDef,
} from "./levels";
import { BOSSES, createBoss } from "./bosses";
import {
  VILLAGE_W,
  VILLAGE_H,
  VILLAGE_SPAWN,
  BOARD_POS,
  PORTAL_POS,
  villageSolids,
  drawVillageGround,
  drawVillageProps,
  drawKnightTopDown,
  drawVillagerTopDown,
  drawBoardTopDown,
  drawPortalTopDown,
  type Rect,
} from "./village";
import { createMinigame, drawMinigame, updateMinigame } from "./minigames";
import { sfx, playMusic, type MusicTrack } from "./audio";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export { GROUND_Y };
export const GRAVITY = 0.6;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7.5;
export const JUMP_FORCE = -12;
/** Mushroom launch — much stronger than a jump. */
export const BOUNCE_FORCE = -19;
/** Sideways push per frame while a wind gust blows. */
export const WIND_PUSH = 2.4;
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
  sceneProgress: Record<number, number>;
  coins: number;
  maxHealth: number;
  hasBow: boolean;
  arrows: number;
  bestScores: Record<string, number>;
};

function loadProgress(): Progress {
  const fallback: Progress = {
    unlockedLevels: 1,
    sceneProgress: {},
    coins: 0,
    maxHealth: 5,
    hasBow: true,
    arrows: 20,
    bestScores: {},
  };
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
      sceneProgress: state.sceneProgress,
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
    facing4: "down",
    walkT: 0,
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

function arenaXForWidth(width: number) {
  return width - 700;
}

function levelPails(arenaX: number): Pail[] {
  const ax = arenaX;
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
    cameraY: 0,
    topDown: false,
    levelIndex: 0,
    levelName: "",
    sceneIndex: 0,
    sceneCount: 1,
    hasBoss: true,
    bossArenaX: 0,
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
    flagDrop: null,
    celebrateTimer: 0,
    celebrateBig: false,
    celebrateNext: null,
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
    foods: [],
    pendingLevel: 0,
    npcs: [],
    dialogLines: [],
    dialogIndex: 0,
    dialogSpeaker: "",
    shopMessage: "",
    unlockedLevels: progress.unlockedLevels,
    selectedLevel: Math.min(progress.unlockedLevels - 1, LEVELS.length - 1),
    selectedScene: 0,
    sceneProgress: { ...progress.sceneProgress },
    mapView: "chapters",
    mapChapter: 0,
    mapSceneCursor: 0,
    mapCursor: Math.min(progress.unlockedLevels - 1, LEVELS.length - 1),
    minigame: null,
    bestScores: progress.bestScores,
    wind: false,
    windTimer: 0,
    windBlowing: false,
    windDir: -1,
    bounces: [],
    sceneHint: "",
    sky: "clear",
    slippery: false,
    fog: false,
    fallers: [],
    fallerTimer: 0,
    timeLimit: 0,
    timeLeft: 0,
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

export function loadLevel(
  levelIndex: number,
  carry: Player,
  progress: Progress,
  sceneIndex = 0
): GameState {
  const level = LEVELS[levelIndex]!;
  const scenes = level.scenes;
  const scene = scenes?.[Math.min(sceneIndex, scenes.length - 1)];
  const width = scene ? scene.width : level.width;
  const hasBoss = scene ? scene.boss === true : true;

  const player = { ...carry, items: [...carry.items] };
  refreshPlayer(player);

  const state = baseState(player, progress);
  state.scene = "level";
  state.levelIndex = levelIndex;
  state.sceneIndex = scene ? sceneIndex : 0;
  state.sceneCount = scenes ? scenes.length : 1;
  state.hasBoss = hasBoss;
  state.levelName = scene ? `${level.short}: ${scene.name}` : level.name;
  state.worldWidth = width;
  state.bossArenaX = arenaXForWidth(width);
  state.swim = level.swim === true;
  state.biome = level.biome;
  state.wind = scene?.wind === true;
  state.windTimer = 0;
  state.windBlowing = false;
  state.bounces = (scene?.bounces ?? []).map((b) => ({ ...b }));
  state.sceneHint = scene?.hint ?? "";
  state.enemies = (scene ? scene.enemies : level.enemies).map(makeEnemy);
  state.chests = (scene ? scene.chests : level.chests).map((c: Chest) => ({ ...c }));
  state.platforms = [
    { x: 0, y: GROUND_Y, width, height: 80 },
    ...(scene ? scene.platforms : level.platforms).map((p: Platform) => {
      const cp = { ...p };
      if (cp.axis) {
        cp.baseX = cp.x;
        cp.baseY = cp.y;
        cp.moveT = 0;
      }
      return cp;
    }),
  ];
  state.pails = hasBoss ? levelPails(state.bossArenaX) : [];
  state.cage =
    hasBoss && levelIndex === FINAL_LEVEL_INDEX
      ? { x: width - 200, y: GROUND_Y - 96, width: 80, height: 96, open: false }
      : null;

  if (!hasBoss) {
    // Scene-exit flag waiting at the end of the stretch.
    state.flagDrop = {
      x: width - 160,
      y: GROUND_Y,
      vy: 0,
      planted: true,
      collected: false,
      color: FLAG_COLORS[state.biome] ?? "#facc15",
      wave: 0,
      big: false,
      isSceneExit: true,
    };
  }
  return state;
}

export function loadVillage(carry: Player, progress: Progress): GameState {
  const player = { ...carry, items: [...carry.items] };
  refreshPlayer(player);
  player.health = player.maxHealth;
  player.hunger = player.maxHunger;
  player.x = VILLAGE_SPAWN.x - PLAYER_WIDTH / 2;
  player.y = VILLAGE_SPAWN.y - PLAYER_HEIGHT;
  player.vx = 0;
  player.vy = 0;
  player.facing4 = "up";

  const state = baseState(player, progress);
  state.scene = "village";
  state.topDown = true;
  state.levelName = "The Village";
  state.worldWidth = VILLAGE_W;
  state.biome = "village";
  state.platforms = [];
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
    sceneProgress: state.sceneProgress,
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

export function startLevel(state: GameState, levelIndex: number, sceneIndex = 0) {
  saveProgress(state);
  replaceState(state, loadLevel(levelIndex, state.player, progressFrom(state), sceneIndex));
}

export function restartLevel(state: GameState) {
  const fresh = { ...state.player };
  fresh.health = fresh.maxHealth;
  fresh.hunger = fresh.maxHunger;
  const progress = progressFrom(state);
  const sceneIndex = state.sceneIndex;
  if (state.scene === "village") replaceState(state, loadVillage(fresh, progress));
  else replaceState(state, loadLevel(state.levelIndex, fresh, progress, sceneIndex));
}

/** Remember that a scene was beaten so the next one shows up unlocked on the map. */
function markSceneCleared(state: GameState, levelIndex: number, sceneIndex: number) {
  const cleared = state.sceneProgress[levelIndex] ?? 0;
  if (sceneIndex + 1 > cleared) state.sceneProgress = { ...state.sceneProgress, [levelIndex]: sceneIndex + 1 };
}

/** How many scenes a chapter has (1 for classic single-scene chapters). */
export function sceneCountOf(levelIndex: number) {
  return LEVELS[levelIndex]?.scenes?.length ?? 1;
}

/** Scenes the player may pick on the map for this chapter. */
function unlockedScenes(state: GameState, levelIndex: number) {
  const total = sceneCountOf(levelIndex);
  // Chapters already beaten (older saves included) have every scene open.
  if (state.unlockedLevels > levelIndex + 1) return total;
  return Math.min(total, (state.sceneProgress[levelIndex] ?? 0) + 1);
}

/** Move on to the next scene of the current chapter, keeping the knight's stats. */
function advanceScene(state: GameState) {
  const next = state.sceneIndex + 1;
  markSceneCleared(state, state.levelIndex, state.sceneIndex);
  const carry = { ...state.player };
  const progress = progressFrom(state);
  const levelIndex = state.levelIndex;
  saveProgress(state);
  replaceState(state, loadLevel(levelIndex, carry, progress, next));
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

/** Oscillate moving platforms and carry the knight standing on them. */
function updateMovingPlatforms(state: GameState) {
  if (state.topDown || state.mode !== "playing") return;
  const p = state.player;
  for (const platform of state.platforms) {
    if (!platform.axis || !platform.range || !platform.speed) continue;
    platform.moveT = (platform.moveT ?? 0) + 1;
    const bx = platform.baseX ?? platform.x;
    const by = platform.baseY ?? platform.y;
    const offset = Math.sin(platform.moveT * platform.speed) * platform.range;
    const nx = platform.axis === "x" ? bx + offset : bx;
    const ny = platform.axis === "y" ? by + offset : by;
    const dx = nx - platform.x;
    const dy = ny - platform.y;
    // Carry the knight if he was standing on the platform's previous spot.
    const oldTop = platform.y;
    if (
      p.onGround &&
      Math.abs(p.y + p.height - oldTop) < 6 &&
      p.x + p.width > platform.x &&
      p.x < platform.x + platform.width
    ) {
      p.x += dx;
      p.y += dy;
    }
    platform.x = nx;
    platform.y = ny;
  }
}

function updatePlayer(state: GameState) {
  const p = state.player;
  const keys = state.keys;
  const swim = state.swim;

  if (state.topDown) {
    updateVillage(state);
    return;
  }

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

  // Wind gusts: ~4s calm, then a ~2s gust that pushes the knight back.
  if (state.wind && !swim) {
    state.windTimer++;
    const cycle = state.windTimer % 360;
    const blowing = cycle >= 240;
    if (blowing && !state.windBlowing) {
      state.windBlowing = true;
      sfx.gust();
      showMessage(state, "A gust of wind!", 90);
    }
    if (!blowing) state.windBlowing = false;
    if (state.windBlowing) {
      p.x += WIND_PUSH * state.windDir;
      if (Math.random() < 0.35) {
        state.particles.push({
          x: state.cameraX + CANVAS_WIDTH + 10,
          y: 90 + Math.random() * 380,
          vx: state.windDir * (5 + Math.random() * 3),
          vy: 0.6 - Math.random() * 1.2,
          life: 90,
          maxLife: 90,
          color: Math.random() < 0.5 ? "#4ade80" : "#a3e635",
          size: 3,
        });
      }
    }
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

  // Bouncy mushrooms: landing on one launches the knight high up.
  for (const b of state.bounces) {
    const cap = { x: b.x, y: b.y, width: 56, height: 26 };
    if (p.vy >= 0 && rectsOverlap(p, cap) && p.y + p.height - p.vy <= b.y + 10) {
      p.y = b.y - p.height;
      p.vy = BOUNCE_FORCE;
      p.onGround = false;
      sfx.bounce();
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: b.x + 28,
          y: b.y + 6,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3,
          life: 30,
          maxLife: 30,
          color: "#fca5a5",
          size: 3,
        });
      }
    }
  }

  if (p.y > CANVAS_HEIGHT + 100) p.health = 0;
  if (p.invulnerable > 0) p.invulnerable--;
  if (state.biomeLabelTimer > 0) state.biomeLabelTimer--;

  // Boss trigger near the end of the level
  const level = LEVELS[state.levelIndex]!;
  const arenaX = state.bossArenaX;
  if (state.hasBoss && !state.bossDefeated && state.boss === null && p.x >= arenaX - 240) {
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

/** Feet position of the knight in the top-down village. */
function feet(p: Player) {
  return { x: p.x + p.width / 2, y: p.y + p.height };
}

function nearestNpc(state: GameState): Npc | null {
  const p = state.player;
  const f = feet(p);
  let best: Npc | null = null;
  let bestDist = 78;
  for (const npc of state.npcs) {
    const d = Math.hypot(f.x - npc.x, f.y - npc.y);
    if (d < bestDist) {
      best = npc;
      bestDist = d;
    }
  }
  return best;
}

const VILLAGE_SOLIDS: Rect[] = villageSolids();

function overlaps(x: number, y: number, w: number, h: number, r: Rect) {
  return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y;
}

/** 8-way movement with per-axis collision against the town's solid rects. */
function moveTopDown(state: GameState) {
  const p = state.player;
  const keys = state.keys;
  const sprinting = keys["shift"] && p.hunger > 0;
  const speed = sprinting ? SPRINT_SPEED * 0.8 : WALK_SPEED;

  let dx = 0;
  let dy = 0;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  if (dx !== 0 || dy !== 0) {
    p.walkT += 0.25;
    if (Math.abs(dx) >= Math.abs(dy)) p.facing4 = dx < 0 ? "left" : "right";
    else p.facing4 = dy < 0 ? "up" : "down";
    if (dx < 0) p.facing = "left";
    else if (dx > 0) p.facing = "right";
    if (sprinting) {
      p.hunger = Math.max(0, p.hunger - 0.008);
      if (p.hunger <= 0) showMessage(state, "Too hungry to sprint!");
    }
  }

  // Collision box: the knight's feet only, so he can walk in front of walls.
  const bw = p.width - 6;
  const bh = 18;
  const bx = () => p.x + 3;
  const by = () => p.y + p.height - bh;

  p.x += dx * speed;
  for (const r of VILLAGE_SOLIDS) {
    if (!overlaps(bx(), by(), bw, bh, r)) continue;
    p.x = dx > 0 ? r.x - bw - 3 : r.x + r.w - 3;
  }

  p.y += dy * speed;
  for (const r of VILLAGE_SOLIDS) {
    if (!overlaps(bx(), by(), bw, bh, r)) continue;
    p.y = dy > 0 ? r.y - p.height : r.y + r.h - p.height + bh;
  }

  p.x = clamp(p.x, 0, VILLAGE_W - p.width);
  p.y = clamp(p.y, 0, VILLAGE_H - p.height);
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;

  // Camera follows in both axes.
  state.cameraX += (p.x + p.width / 2 - CANVAS_WIDTH / 2 - state.cameraX) * 0.12;
  state.cameraY += (p.y + p.height / 2 - CANVAS_HEIGHT / 2 - state.cameraY) * 0.12;
  state.cameraX = clamp(state.cameraX, 0, VILLAGE_W - CANVAS_WIDTH);
  state.cameraY = clamp(state.cameraY, 0, VILLAGE_H - CANVAS_HEIGHT);
}

function updateVillage(state: GameState) {
  const p = state.player;
  moveTopDown(state);
  if (state.mode !== "playing") return;
  const f = feet(p);

  // World map board
  if (Math.hypot(f.x - BOARD_POS.x, f.y - BOARD_POS.y) < 90) {
    if (state.keys["e"]) {
      state.keys["e"] = false;
      state.mode = "map";
      state.mapView = "chapters";
      state.mapCursor = state.selectedLevel;
      sfx.talk();
      return;
    }
    showMessage(state, "Press E to read the world map", 20);
  }

  // Portal
  if (Math.hypot(f.x - PORTAL_POS.x, f.y - PORTAL_POS.y) < 100) {
    if (state.keys["e"]) {
      state.keys["e"] = false;
      state.pendingLevel = state.selectedLevel;
      state.mode = "levelstart";
      sfx.buy();
      return;
    }
    showMessage(state, `Press E to enter the ${sceneLabel(state.selectedLevel, state.selectedScene)} portal`, 20);
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

const FOOD_INFO: Record<FoodKind, { label: string; hunger: number }> = {
  berries: { label: "some berries", hunger: 1 },
  apple: { label: "an apple", hunger: 1.5 },
  cheese: { label: "a wedge of cheese", hunger: 2 },
  bread: { label: "a loaf of bread", hunger: 2.5 },
  chicken: { label: "a roast chicken leg", hunger: 3.5 },
};

const FOOD_KINDS: FoodKind[] = ["berries", "apple", "cheese", "bread", "chicken"];

function spawnFoods(state: GameState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    state.foods.push({
      kind: FOOD_KINDS[Math.floor(Math.random() * FOOD_KINDS.length)]!,
      x: x + (Math.random() - 0.5) * 40,
      y: y - Math.random() * 20,
      vy: -4 - Math.random() * 2,
      bob: Math.random() * Math.PI * 2,
    });
  }
}

function updateFoods(state: GameState) {
  const p = state.player;
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const f = state.foods[i]!;
    f.vy += GRAVITY * 0.4;
    f.y = Math.min(GROUND_Y - 12, f.y + f.vy);
    if (f.y >= GROUND_Y - 12) f.vy = 0;
    f.bob += 0.12;
    const dx = p.x + p.width / 2 - f.x;
    const dy = p.y + p.height / 2 - f.y;
    if (Math.hypot(dx, dy) < 46) {
      const info = FOOD_INFO[f.kind];
      p.hunger = Math.min(p.maxHunger, p.hunger + info.hunger);
      sfx.eat();
      spawnParticle(state, f.x, f.y, "#fca5a5", 5, 2);
      showMessage(state, `Ate ${info.label}! +${info.hunger} hunger`);
      state.foods.splice(i, 1);
    }
  }
}

function drawFood(ctx: CanvasRenderingContext2D, f: FoodDrop, cameraX: number) {
  const x = f.x - cameraX;
  if (x < -30 || x > CANVAS_WIDTH + 30) return;
  const y = f.y + Math.sin(f.bob) * 2;
  ctx.save();
  ctx.translate(x, y);
  if (f.kind === "bread") {
    ctx.fillStyle = "#c2833a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7c4a12";
    ctx.lineWidth = 2;
    for (const off of [-5, 0, 5]) {
      ctx.beginPath();
      ctx.moveTo(off - 2, -5);
      ctx.lineTo(off + 2, -1);
      ctx.stroke();
    }
  } else if (f.kind === "apple") {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(0, 1, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(-1, -12, 2, 6);
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.ellipse(6, -9, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.kind === "cheese") {
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(-11, 7);
    ctx.lineTo(11, 7);
    ctx.lineTo(-11, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(-4, 2, 2.4, 0, Math.PI * 2);
    ctx.arc(2, 5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.kind === "chicken") {
    ctx.fillStyle = "#a16207";
    ctx.beginPath();
    ctx.ellipse(2, 0, 10, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f5f5f4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-5, 3);
    ctx.lineTo(-12, 8);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#7e22ce";
    for (const [bx, by] of [[-5, 2], [4, 3], [0, -4]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, -12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFoods(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const f of state.foods) drawFood(ctx, f, state.cameraX);
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
      if (chest.item !== "food" && Math.random() < 0.6) {
        spawnFoods(state, chest.x + chest.width / 2, chest.y, 1);
      }
      spawnParticle(state, chest.x + chest.width / 2, chest.y + chest.height / 2, "#eab308", 8, 3);
      if (chest.item === "bandage") {
        p.health = Math.min(p.maxHealth, p.health + 2.5);
        showMessage(state, "Bandage! +2.5 health");
      } else if (chest.item === "firstaid") {
        p.health = p.maxHealth;
        showMessage(state, "First aid kit! Full health");
      } else if (chest.item === "food") {
        spawnFoods(state, chest.x + chest.width / 2, chest.y, 2 + Math.floor(Math.random() * 2));
        showMessage(state, "Food spills out! Grab it to eat");
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
    case "shark": {
      // single aimed water bolt
      push({
        vx: (dx / dist) * 3,
        vy: (dy / dist) * 3,
        radius: 9,
        life: 170,
      });
      break;
    }
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
  const arenaX = state.bossArenaX;

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

  playMusic(null);
  state.flagDrop = {
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    vy: -4,
    planted: false,
    collected: false,
    color: FLAG_COLORS[state.biome] ?? "#facc15",
    wave: 0,
    big: true,
    isSceneExit: false,
  };
  showMessage(state, `${b.name} defeated! Grab the big victory flag!`, 200);
}

const FLAG_COLORS: Partial<Record<Biome, string>> = {
  sunny: "#22c55e",
  night: "#6366f1",
  beach: "#fbbf24",
  ocean: "#0ea5e9",
  sky: "#e0f2fe",
  jungle: "#15803d",
  snow: "#f8fafc",
  desert: "#f59e0b",
  mountain: "#93c5fd",
  dark: "#7c3aed",
  fire: "#ef4444",
  castle: "#b91c1c",
};

const FLAG_POLE_HEIGHT = 78;

/** Boss victory flag: falls, plants itself, then the knight walks into it to finish the level. */
function updateFlagDrop(state: GameState) {
  const f = state.flagDrop;
  if (!f || f.collected) return;
  const p = state.player;

  f.wave += 0.12;
  if (!f.planted) {
    f.vy += GRAVITY * 0.4;
    f.y += f.vy;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.planted = true;
      spawnParticle(state, f.x, f.y - FLAG_POLE_HEIGHT, f.color, 14, 3);
    }
  }

  const poleH = f.big ? FLAG_POLE_HEIGHT * 1.5 : FLAG_POLE_HEIGHT;
  // Scene-exit flags only need you to reach them horizontally (you may be swimming high up).
  const near = f.isSceneExit
    ? Math.abs(p.x + p.width / 2 - f.x) < 60
    : Math.abs(p.x + p.width / 2 - f.x) < 52 && p.y + p.height > f.y - poleH - 26 && p.y < f.y + 10;
  if (f.planted && near) {
    f.collected = true;
    sfx.flagRaise();
    spawnParticle(state, f.x, f.y - FLAG_POLE_HEIGHT, f.color, 26, 5);
    spawnParticle(state, f.x, f.y - 30, "#ffffff", 16, 4);
    startCelebration(state, f);
  }
}

const CELEBRATE_FRAMES = 190;
const CONFETTI_COLORS = ["#facc15", "#f472b6", "#4ade80", "#38bdf8", "#f97316", "#ffffff"];

/** Mario-style flag celebration: fanfare, victory hops and confetti. */
function startCelebration(state: GameState, f: FlagDrop) {
  state.celebrateTimer = 1;
  state.celebrateBig = f.big;
  state.celebrateNext = f.isSceneExit ? "scene" : "chapter";
  state.player.x = f.x - state.player.width / 2;
  state.player.vx = 0;
  state.player.facing = "right";
  state.keys = {};
  playMusic(null);
  sfx.victoryFanfare(f.big);
}

function updateCelebration(state: GameState) {
  const p = state.player;
  const f = state.flagDrop;
  state.celebrateTimer++;
  const t = state.celebrateTimer;

  // Cloth slides down the pole over the first half-second, then the knight hops.
  if (t > 40) {
    if (p.onGround && (t - 40) % 42 === 0) p.vy = -9;
    p.vy += GRAVITY;
    p.y += p.vy;
    if (p.y + p.height >= GROUND_Y) {
      p.y = GROUND_Y - p.height;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
    }
  }

  if (t % 4 === 0 && f) {
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!;
    spawnParticle(state, f.x + (Math.random() - 0.5) * 140, f.y - 150 - Math.random() * 60, color, 3, 3);
  }

  updateParticles(state);
  updateCamera(state);

  if (t < CELEBRATE_FRAMES) return;

  const next = state.celebrateNext;
  state.celebrateTimer = 0;
  state.celebrateNext = null;
  if (next === "scene") {
    advanceScene(state);
    return;
  }
  markSceneCleared(state, state.levelIndex, state.sceneIndex);
  state.unlockedLevels = Math.max(state.unlockedLevels, state.levelIndex + 2);
  state.selectedLevel = Math.min(state.unlockedLevels - 1, LEVELS.length - 1);
  state.selectedScene = 0;
  saveProgress(state);
  state.mode = "levelcomplete";
  state.levelCompleteTimer = 0;
}

function drawFlagDrop(ctx: CanvasRenderingContext2D, state: GameState) {
  const f = state.flagDrop;
  if (!f || (f.collected && state.celebrateTimer <= 0)) return;
  const x = f.x - state.cameraX;
  if (x < -80 || x > CANVAS_WIDTH + 80) return;
  const scale = f.big ? 1.5 : 1;
  const poleH = FLAG_POLE_HEIGHT * scale;
  const topY = f.y - poleH;
  const cloth = 52 * scale;

  ctx.save();
  ctx.globalAlpha = (f.big ? 0.34 : 0.25) + Math.sin(f.wave) * 0.1;
  ctx.fillStyle = f.big ? "#facc15" : f.color;
  ctx.beginPath();
  ctx.arc(x, topY + 20 * scale, 46 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#a8a29e";
  ctx.fillRect(x - 3 * scale, topY, 6 * scale, poleH);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(x, topY - 3 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Once taken, the cloth slides down the pole like a Mario flagpole.
  const slide = f.collected ? Math.min(1, state.celebrateTimer / 40) * (poleH - 40 * scale) : 0;
  const clothY = topY + slide;
  ctx.fillStyle = f.big ? "#fbbf24" : f.color;
  ctx.beginPath();
  ctx.moveTo(x + 3, clothY + 4);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    ctx.lineTo(x + 3 + t * cloth, clothY + 4 + Math.sin(f.wave + t * 3) * 4 * scale);
  }
  for (let i = 8; i >= 0; i--) {
    const t = i / 8;
    ctx.lineTo(x + 3 + t * cloth, clothY + 34 * scale + Math.sin(f.wave + t * 3) * 4 * scale);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
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
  if (state.topDown) return;
  const target = state.player.x - CANVAS_WIDTH / 3;
  state.cameraX += (target - state.cameraX) * 0.1;
  state.cameraX = clamp(state.cameraX, 0, Math.max(0, state.worldWidth - CANVAS_WIDTH));
}

/* ---------------- Cutscenes ---------------- */

/** How many opening pages tell the village's own story before the dragon arrives. */
const VILLAGE_PAGES = 3;

const INTRO_LINES = [
  "Long ago, in a green valley, the little village of Willowbrook was built around an old stone well.",
  "Its people were bakers, farmers and tailors, and their kind Mayor Bumbleworth kept the peace.",
  "The princess loved the village, and a young knight guarded its gate — nothing bad ever happened here.",
  "A quiet morning in the village...",
  "A shadow falls: the Dragon lands, and beside him stands Zarvok the Wizard.",
  "Dragon: \"Minions! Take the princess to my castle!\"",
  "The monsters march the princess away, straight into a dark portal.",
  "Zarvok seals the portal with his magic, and the valley falls silent.",
  "Mayor Bumbleworth: \"Brave knight — only you can bring her home!\"",
];

function updateIntro(state: GameState) {
  state.cutsceneTimer++;
  const phase = Math.floor(state.cutsceneTimer / 190);
  if (phase !== state.cutscenePhase) {
    sfx.pageTurn();
    if (phase === VILLAGE_PAGES + 4) sfx.portalSeal();
  }
  state.cutscenePhase = phase;
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
  if (state.mode === "intro") return "storybook";
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
  playMusic(state.celebrateTimer > 0 ? null : musicForState(state));

  if (state.mode === "won" || state.mode === "gameover") return;

  if (state.mode === "intro") {
    updateIntro(state);
    return;
  }

  if (state.mode === "map" || state.mode === "levelstart") return;

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

  if (state.celebrateTimer > 0) {
    updateCelebration(state);
    return;
  }

  updateMovingPlatforms(state);
  updatePlayer(state);
  if (state.mode !== "playing") return;
  updateEnemies(state);
  updateArrows(state);
  updateChests(state);
  updateCoins(state);
  updateFoods(state);
  updateBoss(state);
  updateTNT(state);
  updateKeyAndCage(state);
  updateFlagDrop(state);
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
  if (state.mode === "levelstart") {
    if (key === "escape") {
      state.mode = "playing";
      state.keys["e"] = false;
    } else {
      confirmLevelStart(state);
    }
    return;
  }
  if (state.mode === "map") {
    if (state.mapView === "scenes") {
      const total = sceneCountOf(state.mapChapter);
      if (key === "a" || key === "arrowleft") state.mapSceneCursor = Math.max(0, state.mapSceneCursor - 1);
      else if (key === "d" || key === "arrowright") state.mapSceneCursor = Math.min(total - 1, state.mapSceneCursor + 1);
      else if (key === "w" || key === "arrowup") state.mapSceneCursor = Math.max(0, state.mapSceneCursor - 5);
      else if (key === "s" || key === "arrowdown") state.mapSceneCursor = Math.min(total - 1, state.mapSceneCursor + 5);
      else if (key === "e" || key === "enter" || key === " ") pickScene(state, state.mapSceneCursor);
      else if (key === "escape") {
        state.mapView = "chapters";
        state.keys["e"] = false;
      }
      return;
    }
    if (key === "a" || key === "arrowleft") state.mapCursor = Math.max(0, state.mapCursor - 1);
    else if (key === "d" || key === "arrowright") state.mapCursor = Math.min(LEVELS.length - 1, state.mapCursor + 1);
    else if (key === "w" || key === "arrowup") state.mapCursor = Math.max(0, state.mapCursor - 5);
    else if (key === "s" || key === "arrowdown") state.mapCursor = Math.min(LEVELS.length - 1, state.mapCursor + 5);
    else if (key === "e" || key === "enter" || key === " ") {
      if (state.mapCursor < state.unlockedLevels) {
        state.keys["e"] = false;
        openChapterScenes(state, state.mapCursor);
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

/** Begin the level waiting on the "click to start" card. */
export function confirmLevelStart(state: GameState) {
  if (state.mode !== "levelstart") return false;
  const level = state.pendingLevel;
  state.mode = "playing";
  startLevel(state, level, state.selectedScene);
  return true;
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

/** A big red bouncy mushroom. */
function drawMushroom(ctx: CanvasRenderingContext2D, b: { x: number; y: number }, cameraX: number, now: number) {
  const sx = b.x - cameraX;
  if (sx < -70 || sx > CANVAS_WIDTH + 70) return;
  const squish = 1 + Math.sin(now / 300 + b.x) * 0.04;
  // Stem
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(sx + 18, b.y + 12, 20, 14);
  // Cap
  ctx.save();
  ctx.translate(sx + 28, b.y + 14);
  ctx.scale(1, squish);
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(0, 0, 28, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fecaca";
  for (const [dx, dy, r] of [[-14, -8, 4], [0, -16, 5], [14, -8, 4]] as const) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

const CORAL_COLORS = ["#f472b6", "#fb923c", "#a78bfa", "#f87171"];

/** Coral clusters and swaying seaweed along the ocean floor, at two parallax depths. */
function drawSeabed(ctx: CanvasRenderingContext2D, state: GameState, now: number) {
  for (const layer of [0.45, 0.8]) {
    const far = layer < 0.6;
    const spacing = far ? 220 : 170;
    const alpha = far ? 0.4 : 0.85;
    const scale = far ? 0.7 : 1;
    const startIndex = Math.floor((state.cameraX * layer) / spacing) - 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = startIndex; i < startIndex + Math.ceil(CANVAS_WIDTH / spacing) + 3; i++) {
      const worldX = i * spacing + ((i * 97) % 60);
      const sx = worldX - state.cameraX * layer;
      if (sx < -80 || sx > CANVAS_WIDTH + 80) continue;
      const baseY = GROUND_Y + (far ? -10 : 4);
      if (i % 2 === 0) {
        drawCoral(ctx, sx, baseY, scale, CORAL_COLORS[Math.abs(i) % CORAL_COLORS.length]!);
      } else {
        drawSeaweed(ctx, sx, baseY, scale, now / 600 + i);
      }
    }
    ctx.restore();
  }
}

function drawCoral(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 7 * scale;
  const h = 46 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.moveTo(x, y - h * 0.55);
  ctx.lineTo(x - 18 * scale, y - h * 0.95);
  ctx.moveTo(x, y - h * 0.4);
  ctx.lineTo(x + 20 * scale, y - h * 0.85);
  ctx.stroke();
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 18 * scale, y - h * 0.95);
  ctx.lineTo(x - 24 * scale, y - h * 1.25);
  ctx.moveTo(x + 20 * scale, y - h * 0.85);
  ctx.lineTo(x + 26 * scale, y - h * 1.2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y - 2 * scale, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSeaweed(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, phase: number) {
  ctx.strokeStyle = "#15803d";
  ctx.lineCap = "round";
  for (const off of [-10 * scale, 4 * scale, 16 * scale]) {
    const h = (70 + ((off * 7) % 30)) * scale;
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(x + off, y);
    for (let t = 0; t <= 1.001; t += 0.2) {
      ctx.lineTo(x + off + Math.sin(phase + t * 3) * 12 * t * scale, y - h * t);
    }
    ctx.stroke();
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
    drawSeabed(ctx, state, now);
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

const PORTAL_COLORS: Record<Biome, string> = {
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

/** Whole top-down village: ground, then depth-sorted props, NPCs and the knight. */
function drawVillageTopDown(ctx: CanvasRenderingContext2D, state: GameState) {
  const { cameraX: camX, cameraY: camY } = state;
  drawVillageGround(ctx, camX, camY);

  const p = state.player;
  const f = feet(p);
  const talk = state.mode === "playing" ? nearestNpc(state) : null;
  const level = LEVELS[state.selectedLevel]!;
  const label = sceneLabel(state.selectedLevel, state.selectedScene);
  const nearBoard = Math.hypot(f.x - BOARD_POS.x, f.y - BOARD_POS.y) < 90;
  const nearPortal = Math.hypot(f.x - PORTAL_POS.x, f.y - PORTAL_POS.y) < 100;

  const extras = [
    {
      y: BOARD_POS.y,
      draw: (c: CanvasRenderingContext2D) => drawBoardTopDown(c, state.unlockedLevels, nearBoard),
    },
    {
      y: PORTAL_POS.y,
      draw: (c: CanvasRenderingContext2D) =>
        drawPortalTopDown(
          c,
          PORTAL_COLORS[level.biome],
          label,
          (cc, x, y, size) => drawBossFace(cc, level.boss, x, y, size),
          nearPortal
        ),
    },
    ...state.npcs.map((npc) => ({
      y: npc.y,
      draw: (c: CanvasRenderingContext2D) =>
        drawVillagerTopDown(
          c,
          npc.x,
          npc.y,
          npc.color,
          npc.name,
          npc === talk,
          npc.kind === "mayor" ? ("mayor" as const) : npc.kind === "shop" ? ("shop" as const) : undefined
        ),
    })),
    {
      y: f.y,
      draw: (c: CanvasRenderingContext2D) => drawKnightTopDown(c, f.x, f.y, p.facing4, p.walkT),
    },
  ];

  drawVillageProps(ctx, camX, camY, extras);
}

/** Throwaway enemy record so the intro can reuse the real monster art. */
function introMinion(kind: Enemy["kind"], x: number, y: number, wobble = 0): Enemy {
  return {
    kind,
    x,
    y,
    baseY: y,
    width: kind === "winged" ? 42 : 44,
    height: kind === "winged" ? 30 : 40,
    vx: 1,
    vy: 0,
    health: 1,
    patrolStart: x,
    patrolEnd: x,
    flash: 0,
    wobble,
  };
}

function drawLevelStart(ctx: CanvasRenderingContext2D, state: GameState) {
  const level = LEVELS[state.pendingLevel]!;
  ctx.fillStyle = "rgba(2,6,23,0.88)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(
    LEVELS[state.pendingLevel]!.scenes
      ? `CHAPTER ${state.pendingLevel + 1} — SCENE ${state.selectedScene + 1}`
      : `LEVEL ${state.pendingLevel + 1}`,
    CANVAS_WIDTH / 2,
    130
  );

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(level.name, CANVAS_WIDTH / 2, 180);

  drawBossFace(ctx, level.boss, CANVAS_WIDTH / 2, 300, 70);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`Boss: ${BOSSES[level.boss].name}`, CANVAS_WIDTH / 2, 410);

  const sceneHint = level.scenes?.[state.selectedScene]?.hint;
  if (sceneHint) {
    ctx.fillStyle = "#fde68a";
    ctx.font = "italic 18px sans-serif";
    ctx.fillText(sceneHint, CANVAS_WIDTH / 2, 442);
  }

  const pulse = 0.6 + Math.abs(Math.sin(Date.now() / 400)) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("CLICK OR TAP TO START", CANVAS_WIDTH / 2, 480);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "15px sans-serif";
  ctx.fillText("(or press any key • Esc to stay in the village)", CANVAS_WIDTH / 2, 516);
  ctx.textAlign = "left";
}

const MAP_TILE_W = 124;
const MAP_TILE_H = 128;

function mapTileCenter(i: number) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  return { cx: 120 + col * 145, cy: 268 + row * 158 };
}

const SCENE_TILE_W = 130;
const SCENE_TILE_H = 96;
const SCENE_BACK = { x: 30, y: 540, w: 140, h: 34 };

function sceneTileCenter(i: number) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  return { cx: 130 + col * 148, cy: 300 + row * 130 };
}

/** Canvas click on the world map: chapter grid, then the chapter's scene grid. */
export function handleMapClick(state: GameState, x: number, y: number): boolean {
  if (state.mode !== "map") return false;

  if (state.mapView === "scenes") {
    if (
      x >= SCENE_BACK.x &&
      x <= SCENE_BACK.x + SCENE_BACK.w &&
      y >= SCENE_BACK.y &&
      y <= SCENE_BACK.y + SCENE_BACK.h
    ) {
      state.mapView = "chapters";
      sfx.talk();
      return true;
    }
    const total = sceneCountOf(state.mapChapter);
    for (let i = 0; i < total; i++) {
      const { cx, cy } = sceneTileCenter(i);
      if (Math.abs(x - cx) <= SCENE_TILE_W / 2 && Math.abs(y - cy) <= SCENE_TILE_H / 2) {
        state.mapSceneCursor = i;
        pickScene(state, i);
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < LEVELS.length; i++) {
    const { cx, cy } = mapTileCenter(i);
    if (Math.abs(x - cx) <= MAP_TILE_W / 2 && Math.abs(y - cy) <= MAP_TILE_H / 2) {
      state.mapCursor = i;
      if (i < state.unlockedLevels) {
        openChapterScenes(state, i);
      } else {
        sfx.hurt();
        showMessage(state, "That chapter is still locked.", 120);
      }
      return true;
    }
  }
  return false;
}

/** Show the scene grid of a chapter (or set the portal if it has a single scene). */
function openChapterScenes(state: GameState, levelIndex: number) {
  state.mapChapter = levelIndex;
  state.mapSceneCursor = Math.max(0, unlockedScenes(state, levelIndex) - 1);
  state.mapView = "scenes";
  sfx.talk();
}

function pickScene(state: GameState, sceneIndex: number) {
  const levelIndex = state.mapChapter;
  if (sceneIndex >= unlockedScenes(state, levelIndex)) {
    sfx.hurt();
    showMessage(state, "That scene is still locked.", 120);
    return;
  }
  state.selectedLevel = levelIndex;
  state.selectedScene = sceneIndex;
  state.mapCursor = levelIndex;
  state.mode = "playing";
  state.keys["e"] = false;
  sfx.buy();
  const label = sceneLabel(levelIndex, sceneIndex);
  showMessage(state, `Portal set to ${label}. Walk right into it!`, 200);
}

/** "Sunny Forest — Scene 3" (or just the chapter for single-scene chapters). */
export function sceneLabel(levelIndex: number, sceneIndex: number) {
  const level = LEVELS[levelIndex]!;
  if (!level.scenes) return level.short;
  return `${level.short} — Scene ${sceneIndex + 1}`;
}

function drawMapScenes(ctx: CanvasRenderingContext2D, state: GameState) {
  const level = LEVELS[state.mapChapter]!;
  const total = sceneCountOf(state.mapChapter);
  const open = unlockedScenes(state, state.mapChapter);

  ctx.fillStyle = "rgba(2,6,23,0.94)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = "left";

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(level.name, 30, 44);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";
  ctx.fillText(`Boss: ${BOSSES[level.boss].name} • ${open}/${total} scenes unlocked`, 30, 64);
  ctx.fillText("Click a scene, or arrows + E • Esc to go back", 30, 82);

  // Chapter banner with the boss portrait.
  const bandY = 96;
  const bandH = 104;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(30, bandY, CANVAS_WIDTH - 60, bandH);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, bandY, CANVAS_WIDTH - 60, bandH);
  drawBossFace(ctx, level.boss, 100, bandY + bandH / 2, 38);
  const cursorScene = level.scenes?.[state.mapSceneCursor];
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(cursorScene ? cursorScene.name : "Scene 1", 170, bandY + 44);
  ctx.fillStyle = state.mapSceneCursor < open ? "#86efac" : "#64748b";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(
    state.mapSceneCursor >= open
      ? "Locked — clear the scene before it"
      : state.mapSceneCursor === total - 1
        ? "Boss fight — bring the TNT!"
        : "Reach the flag at the end to move on",
    170,
    bandY + 74
  );

  for (let i = 0; i < total; i++) {
    const { cx, cy } = sceneTileCenter(i);
    const unlocked = i < open;
    const selected = i === state.mapSceneCursor;
    const isBoss = i === total - 1;

    ctx.fillStyle = unlocked ? (isBoss ? "#3b1220" : "#1e293b") : "#0f172a";
    ctx.fillRect(cx - SCENE_TILE_W / 2, cy - SCENE_TILE_H / 2, SCENE_TILE_W, SCENE_TILE_H);
    ctx.strokeStyle = selected ? "#facc15" : unlocked ? "#475569" : "#1e293b";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(cx - SCENE_TILE_W / 2, cy - SCENE_TILE_H / 2, SCENE_TILE_W, SCENE_TILE_H);

    if (!unlocked) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 14, cy - 22, 28, 22);
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 11, Math.PI, 0);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
    } else if (isBoss) {
      drawBossFace(ctx, level.boss, cx, cy - 16, 22);
    } else {
      // little flag icon for a normal scene
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 2);
      ctx.lineTo(cx - 12, cy - 34);
      ctx.stroke();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 34);
      ctx.lineTo(cx + 16, cy - 27);
      ctx.lineTo(cx - 12, cy - 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = unlocked ? "#f8fafc" : "#475569";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`Scene ${i + 1}`, cx, cy + 22);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = unlocked ? (isBoss ? "#fca5a5" : "#94a3b8") : "#334155";
    ctx.fillText(isBoss ? "Boss Fight" : unlocked ? "Ready" : "Locked", cx, cy + 40);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(SCENE_BACK.x, SCENE_BACK.y, SCENE_BACK.w, SCENE_BACK.h);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.strokeRect(SCENE_BACK.x, SCENE_BACK.y, SCENE_BACK.w, SCENE_BACK.h);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("← All chapters", SCENE_BACK.x + 16, SCENE_BACK.y + 23);
}

function drawMapScreen(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.mapView === "scenes") {
    drawMapScenes(ctx, state);
    return;
  }
  ctx.fillStyle = "rgba(2,6,23,0.92)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("World Map", 30, 40);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "12px sans-serif";
  ctx.fillText("Click a chapter, or arrows + E • Esc to close", 30, 60);

  // Top band: portrait of the boss guarding the chapter you are pointing at.
  const sel = LEVELS[state.mapCursor]!;
  const selUnlocked = state.mapCursor < state.unlockedLevels;
  const bandY = 76;
  const bandH = 118;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(30, bandY, CANVAS_WIDTH - 60, bandH);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, bandY, CANVAS_WIDTH - 60, bandH);

  const faceX = 110;
  const faceY = bandY + bandH / 2;
  if (selUnlocked) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(faceX, faceY, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawBossFace(ctx, sel.boss, faceX, faceY, 44);
  } else {
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(faceX, faceY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#475569";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("?", faceX - 12, faceY + 14);
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`${state.mapCursor + 1}. ${sel.name}`, 180, bandY + 44);
  ctx.fillStyle = selUnlocked ? "#fca5a5" : "#475569";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(selUnlocked ? `Boss: ${BOSSES[sel.boss].name}` : "Locked — clear the chapter before it", 180, bandY + 72);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText(selUnlocked ? "Press E or click to see this chapter's scenes" : "", 180, bandY + 96);

  LEVELS.forEach((level, i) => {
    const { cx, cy } = mapTileCenter(i);
    const unlocked = i < state.unlockedLevels;
    const selected = i === state.mapCursor;

    ctx.fillStyle = unlocked ? "#1e293b" : "#0f172a";
    ctx.fillRect(cx - MAP_TILE_W / 2, cy - MAP_TILE_H / 2, MAP_TILE_W, MAP_TILE_H);
    ctx.strokeStyle = selected ? "#facc15" : unlocked ? "#475569" : "#1e293b";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(cx - MAP_TILE_W / 2, cy - MAP_TILE_H / 2, MAP_TILE_W, MAP_TILE_H);

    if (unlocked) {
      drawBossFace(ctx, level.boss, cx, cy - 18, 26);
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 18, cy - 22, 36, 28);
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 14, Math.PI, 0);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
    }

    ctx.fillStyle = unlocked ? "#f8fafc" : "#475569";
    ctx.font = "bold 13px sans-serif";
    const t1 = `${i + 1}. ${level.short}`;
    ctx.fillText(t1, cx - ctx.measureText(t1).width / 2, cy + 32);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = unlocked ? "#94a3b8" : "#334155";
    const t2 = unlocked ? BOSSES[level.boss].name : "Locked";
    ctx.fillText(t2, cx - ctx.measureText(t2).width / 2, cy + 50);
  });
}

function drawIntroScene(ctx: CanvasRenderingContext2D, state: GameState) {
  // The first pages tell the village's story; the dragon scene starts after them.
  const phase = Math.max(0, state.cutscenePhase - VILLAGE_PAGES);
  const t = state.cutsceneTimer - VILLAGE_PAGES * 190;

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, phase === 0 ? "#7dd3fc" : "#450a0a");
  grad.addColorStop(1, phase === 0 ? "#bbf7d0" : "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#57534e";
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  for (let i = 0; i < 4; i++) drawHouse(ctx, 60 + i * 200);

  if (state.cutscenePhase < VILLAGE_PAGES) {
    // Peaceful village: the old stone well and its people going about their day.
    ctx.fillStyle = "#78716c";
    ctx.fillRect(600, GROUND_Y - 40, 70, 40);
    ctx.fillStyle = "#44403c";
    ctx.fillRect(596, GROUND_Y - 46, 78, 8);
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(592, GROUND_Y - 92, 86, 12);
    ctx.fillStyle = "#57534e";
    ctx.fillRect(604, GROUND_Y - 88, 6, 44);
    ctx.fillRect(660, GROUND_Y - 88, 6, 44);
    const folk: [number, string][] = [
      [200, "#f59e0b"],
      [330, "#38bdf8"],
      [470, "#a3e635"],
      [760, "#f472b6"],
    ];
    folk.forEach(([x, color], i) => {
      const bob = Math.sin(state.cutsceneTimer * 0.05 + i) * 3;
      ctx.fillStyle = color;
      ctx.fillRect(x, GROUND_Y - 44 + bob, 22, 44);
      ctx.fillStyle = "#fcd7b6";
      ctx.beginPath();
      ctx.arc(x + 11, GROUND_Y - 54 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  }


  // The portal the monsters march the princess into.
  const portalX = 700;
  if (phase >= 2) {
    const sealed = phase >= 4;
    ctx.save();
    ctx.globalAlpha = 0.85;
    const pg = ctx.createRadialGradient(portalX, GROUND_Y - 70, 6, portalX, GROUND_Y - 70, 62);
    pg.addColorStop(0, sealed ? "#1e1b4b" : "#a855f7");
    pg.addColorStop(1, sealed ? "#4c1d95" : "#312e81");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(portalX, GROUND_Y - 70, 44, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = sealed ? "#f472b6" : "#c4b5fd";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(portalX, GROUND_Y - 70, 44, 70, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (sealed) {
      // Zarvok's seal: glowing runes and crossing chains of magic.
      ctx.strokeStyle = "#f0abfc";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.02 + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(portalX - Math.cos(a) * 46, GROUND_Y - 70 - Math.sin(a) * 72);
        ctx.lineTo(portalX + Math.cos(a) * 46, GROUND_Y - 70 + Math.sin(a) * 72);
        ctx.stroke();
      }
    }
  }

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

    // wizard on the ground (steps towards the portal to seal it)
    const wx = phase >= 4 ? 560 : 250;
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.moveTo(wx, GROUND_Y - 90);
    ctx.lineTo(wx + 40, GROUND_Y);
    ctx.lineTo(wx - 40, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fcd7b6";
    ctx.beginPath();
    ctx.arc(wx, GROUND_Y - 96, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.moveTo(wx - 22, GROUND_Y - 104);
    ctx.lineTo(wx, GROUND_Y - 160);
    ctx.lineTo(wx + 22, GROUND_Y - 104);
    ctx.closePath();
    ctx.fill();
    if (phase >= 4) {
      // staff beam into the portal
      ctx.strokeStyle = "#e879f9";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(wx + 24, GROUND_Y - 110);
      ctx.lineTo(portalX - 20, GROUND_Y - 80);
      ctx.stroke();
    }
  }

  if (phase >= 2 && phase <= 3) {
    // the level monsters walk the princess along the ground to the portal
    const walk = phase === 3 ? Math.min(220, (t - 570) * 1.4) : 0;
    const px = 420 + walk;
    const py = GROUND_Y - 60;
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(px, py, 28, 40);
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(px + 4, py - 16, 20, 16);
    drawEnemy(ctx, introMinion("furry", px - 58, py + 6), 0);
    drawEnemy(ctx, introMinion("tentacle", px + 34, py + 6), 0);
  }

  if (phase >= 5) {
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
}

/** The intro is told as a storybook: the tale on the left page, the scene on the right. */
function drawIntro(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = state.cutsceneTimer;

  // Table the book rests on.
  const table = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  table.addColorStop(0, "#3b2415");
  table.addColorStop(1, "#1c1008");
  ctx.fillStyle = table;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const open = Math.min(1, t / 45);
  const bookX = 26;
  const bookY = 30;
  const bookW = CANVAS_WIDTH - 52;
  const bookH = CANVAS_HEIGHT - 60;

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 0);
  ctx.scale(open, 1);
  ctx.translate(-CANVAS_WIDTH / 2, 0);

  // Leather cover and pages.
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(bookX - 10, bookY - 10, bookW + 20, bookH + 20);
  ctx.fillStyle = "#f5e8c8";
  ctx.fillRect(bookX, bookY, bookW, bookH);
  ctx.fillStyle = "#e6d3a8";
  ctx.fillRect(CANVAS_WIDTH / 2 - 8, bookY, 16, bookH);
  ctx.strokeStyle = "#c2a878";
  ctx.lineWidth = 2;
  ctx.strokeRect(bookX, bookY, bookW, bookH);

  // Right page: the illustration.
  const pad = 18;
  const px = CANVAS_WIDTH / 2 + 14;
  const py = bookY + pad;
  const pw = bookX + bookW - pad - px;
  const ph = bookH - pad * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.fillStyle = "#1e1b4b";
  ctx.fillRect(px, py, pw, ph);
  const s = Math.min(pw / CANVAS_WIDTH, ph / CANVAS_HEIGHT);
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.scale(s, s);
  ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
  drawIntroScene(ctx, state);
  ctx.restore();
  ctx.strokeStyle = "#8b6f47";
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);

  // Left page: the tale so far.
  ctx.fillStyle = "#6b3f18";
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText("The Tale of the Knight", bookX + 24, bookY + 52);
  ctx.strokeStyle = "#c2a878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bookX + 24, bookY + 64);
  ctx.lineTo(CANVAS_WIDTH / 2 - 24, bookY + 64);
  ctx.stroke();

  ctx.fillStyle = "#3f2d16";
  ctx.font = "16px Georgia, serif";
  let lineY = bookY + 100;
  for (let i = 0; i <= state.cutscenePhase && i < INTRO_LINES.length; i++) {
    const faded = i < state.cutscenePhase;
    
    ctx.fillStyle = faded ? "#8a7350" : "#3f2d16";
    for (const row of wrapText(ctx, INTRO_LINES[i]!, CANVAS_WIDTH / 2 - bookX - 48)) {
      ctx.fillText(row, bookX + 24, lineY);
      lineY += 24;
    }
    lineY += 8;
  }

  ctx.restore();

  ctx.fillStyle = "#e7c98f";
  ctx.font = "13px sans-serif";
  ctx.fillText("Press any key (or tap) to skip the story", 30, CANVAS_HEIGHT - 8);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      rows.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) rows.push(current);
  return rows;
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

  if (state.topDown) {
    drawVillageTopDown(ctx, state);
  } else {
    drawBackground(ctx, state);
    drawGroundStrip(ctx, state);

    for (const platform of state.platforms) {
      if (platform.y === GROUND_Y && !platform.axis) continue;
      if (platform.x - state.cameraX > CANVAS_WIDTH || platform.x + platform.width - state.cameraX < 0) continue;
      drawPlatform(ctx, platform, state.cameraX, state.biome);
    }

    const now = Date.now();
    for (const b of state.bounces) drawMushroom(ctx, b, state.cameraX, now);

    for (const chest of state.chests) drawChest(ctx, chest, state.cameraX);
    for (const pail of state.pails) drawPail(ctx, pail, state.cameraX);
    for (const e of state.enemies) drawEnemy(ctx, e, state.cameraX);

    drawCage(ctx, state);
    drawKeyDrop(ctx, state);
    drawFlagDrop(ctx, state);
    drawCoins(ctx, state);
    drawFoods(ctx, state);

    if (state.boss) drawBoss(ctx, state.boss, state.cameraX);

    drawPlayer(ctx, state.player, state.cameraX);

    for (const t of state.tntList) drawTNT(ctx, t, state.cameraX);
    for (const a of state.arrows) drawArrow(ctx, a, state.cameraX);

    drawParticles(ctx, state);
  }



  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    state.topDown
      ? "Arrows/WASD: walk any direction • Shift: run • E: talk, shop, map board, portal"
      : state.swim
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

  if (state.flagDrop && !state.flagDrop.collected) {
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 16px sans-serif";
    const t = state.flagDrop.isSceneExit
      ? "Reach the flag at the end to enter the next scene!"
      : "Grab the big victory flag to finish the chapter!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, 80);
  }

  if (state.celebrateTimer > 0) {
    ctx.fillStyle = state.celebrateBig ? "#facc15" : "#4ade80";
    ctx.font = "bold 30px sans-serif";
    const t = state.celebrateBig ? "Chapter Clear!" : "Scene Clear!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, 120);
  }

  if (state.mode === "levelcomplete") {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 32px sans-serif";
    const t = "Chapter Complete — big flag taken!";
    ctx.fillText(t, CANVAS_WIDTH / 2 - ctx.measureText(t).width / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    const next = LEVELS[state.levelIndex + 1];
    const t2 = next ? `${next.short} unlocked — back to the village` : "Back to the village";
    ctx.fillText(t2, CANVAS_WIDTH / 2 - ctx.measureText(t2).width / 2, CANVAS_HEIGHT / 2 + 20);
  }

  if (state.mode === "levelstart") drawLevelStart(ctx, state);
  if (state.mode === "map") drawMapScreen(ctx, state);
  if (state.mode === "dialog") drawDialog(ctx, state);
  if (state.mode === "shop") drawShop(ctx, state);
}
