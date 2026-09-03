import type { Biome, BossKind, Chest, ChestItem, EnemyKind, Npc, Platform } from "./types";

export const GROUND_Y = 520;

export type EnemySpawn = {
  kind: EnemyKind;
  x: number;
  patrolStart: number;
  patrolEnd: number;
  y?: number;
};

/** One scene of a chapter. The last scene holds the boss. */
export type SceneDef = {
  name: string;
  width: number;
  platforms: Platform[];
  enemies: EnemySpawn[];
  chests: Chest[];
  /** Only the final scene of a chapter has the boss. */
  boss?: boolean;
};

export type LevelDef = {
  name: string;
  short: string;
  biome: Biome;
  width: number;
  swim?: boolean;
  boss: BossKind;
  platforms: Platform[];
  enemies: EnemySpawn[];
  chests: Chest[];
  /** When present, the level is a chapter split into these scenes. */
  scenes?: SceneDef[];
};

function plat(x: number, y: number, width = 150): Platform {
  return { x, y, width, height: 20 };
}

function chest(x: number, item: ChestItem, y = GROUND_Y - 24): Chest {
  const label =
    item === "bandage" ? "Bandage" : item === "firstaid" ? "First Aid" : item === "food" ? "Food" : "Arrows";
  return { x, y, width: 32, height: 24, opened: false, item, label };
}

const FOREST_PLATFORMS: Platform[] = [
  plat(280, 430, 160),
  plat(560, 360, 140),
  plat(820, 430, 180),
  plat(1120, 340, 120),
  plat(1380, 400, 160),
  plat(1660, 320, 140),
  plat(1940, 420, 170),
];

/** Distance from the right edge where the boss arena starts. */
export const BOSS_ARENA_MARGIN = 900;

/** Sunny Forest is a 10-scene chapter; scene 10 is the Furry King arena. */
const FOREST_SCENE_NAMES = [
  "Forest Path",
  "Mossy Clearing",
  "Fallen Logs",
  "Bramble Hollow",
  "Sunlit Glade",
  "Old Oak Ridge",
  "Mushroom Grove",
  "Thorn Thicket",
  "Wolf Den Trail",
  "The Furry King's Grove",
];

function forestScene(i: number): SceneDef {
  const name = `Scene ${i + 1} — ${FOREST_SCENE_NAMES[i]}`;
  if (i === 9) {
    return {
      name,
      width: 2200,
      platforms: [plat(320, 430, 170), plat(700, 350, 150)],
      enemies: [{ kind: "furry", x: 620, patrolStart: 500, patrolEnd: 880 }],
      chests: [chest(300, "firstaid"), chest(820, "food")],
      boss: true,
    };
  }
  const width = 1800 + i * 130;
  const step = 360 - i * 12;
  const count = 3 + Math.floor(i / 3);
  const platforms: Platform[] = [];
  const enemies: EnemySpawn[] = [];
  const chests: Chest[] = [];
  for (let k = 0; k < count + 1; k++) {
    const x = 300 + k * step;
    if (x + 160 > width - 220) break;
    platforms.push(plat(x, k % 2 === 0 ? 430 : 350, 160 - i * 4));
  }
  for (let k = 0; k < count; k++) {
    const x = 420 + k * (step + 60);
    if (x > width - 260) break;
    enemies.push({ kind: "furry", x, patrolStart: x - 90, patrolEnd: x + 190 });
  }
  chests.push(chest(360, i % 2 === 0 ? "food" : "bandage"));
  if (width > 2000) chests.push(chest(Math.round(width * 0.6), i % 3 === 0 ? "firstaid" : "food"));
  return { name, width, platforms, enemies, chests };
}

const FOREST_SCENES: SceneDef[] = Array.from({ length: 10 }, (_, i) => forestScene(i));


export const LEVELS: LevelDef[] = [
  {
    name: "Level 1 — Sunny Forest",
    short: "Sunny Forest",
    biome: "sunny",
    width: 3000,
    boss: "furryking",
    platforms: FOREST_PLATFORMS.map((p) => ({ ...p })),
    enemies: [
      { kind: "furry", x: 420, patrolStart: 360, patrolEnd: 620 },
      { kind: "furry", x: 900, patrolStart: 840, patrolEnd: 1080 },
      { kind: "furry", x: 1420, patrolStart: 1360, patrolEnd: 1620 },
      { kind: "furry", x: 1900, patrolStart: 1840, patrolEnd: 2100 },
    ],
    chests: [chest(340, "bandage"), chest(1000, "food"), chest(1720, "bandage")],
  },
  {
    name: "Level 2 — Night Forest",
    short: "Night Forest",
    biome: "night",
    width: 3000,
    boss: "owl",
    platforms: FOREST_PLATFORMS.map((p) => ({ ...p })),
    enemies: [
      { kind: "tentacle", x: 400, patrolStart: 340, patrolEnd: 620 },
      { kind: "tentacle", x: 880, patrolStart: 820, patrolEnd: 1100 },
      { kind: "tentacle", x: 1400, patrolStart: 1340, patrolEnd: 1640 },
      { kind: "tentacle", x: 1920, patrolStart: 1860, patrolEnd: 2140 },
    ],
    chests: [chest(300, "food"), chest(1120, "firstaid"), chest(1800, "bandage")],
  },
  {
    name: "Level 3 — Sunny Beach",
    short: "Beach",
    biome: "beach",
    width: 3100,
    boss: "crab",
    platforms: [plat(320, 420), plat(640, 350, 130), plat(960, 420, 170), plat(1320, 360), plat(1700, 420), plat(2060, 350, 140)],
    enemies: [
      { kind: "furry", x: 460, patrolStart: 400, patrolEnd: 680 },
      { kind: "tentacle", x: 940, patrolStart: 880, patrolEnd: 1160 },
      { kind: "furry", x: 1500, patrolStart: 1440, patrolEnd: 1720 },
      { kind: "tentacle", x: 2020, patrolStart: 1960, patrolEnd: 2260 },
    ],
    chests: [chest(380, "food"), chest(1200, "bandage"), chest(2100, "firstaid")],
  },
  {
    name: "Level 4 — The Deep Ocean",
    short: "Deep Ocean",
    biome: "ocean",
    width: 3100,
    swim: true,
    boss: "shark",
    platforms: [plat(340, 440, 180), plat(760, 330, 140), plat(1160, 450, 170), plat(1560, 320, 150), plat(2000, 430, 180)],
    enemies: [
      { kind: "fish", x: 500, patrolStart: 380, patrolEnd: 900, y: 320 },
      { kind: "fish", x: 900, patrolStart: 760, patrolEnd: 1300, y: 240 },
      { kind: "fish", x: 1400, patrolStart: 1240, patrolEnd: 1780, y: 360 },
      { kind: "fish", x: 1900, patrolStart: 1760, patrolEnd: 2200, y: 260 },
    ],
    chests: [chest(420, "food"), chest(1220, "bandage"), chest(2060, "firstaid")],
    scenes: [
      {
        name: "Scene 1 — Shallow Reef",
        width: 2400,
        platforms: [plat(340, 440, 180), plat(760, 330, 140), plat(1180, 440, 170), plat(1600, 340, 150)],
        enemies: [
          { kind: "fish", x: 520, patrolStart: 400, patrolEnd: 900, y: 320 },
          { kind: "fish", x: 1000, patrolStart: 860, patrolEnd: 1360, y: 250 },
          { kind: "fish", x: 1700, patrolStart: 1560, patrolEnd: 2000, y: 350 },
        ],
        chests: [chest(420, "food"), chest(1240, "bandage")],
      },
      {
        name: "Scene 2 — Deep Trench",
        width: 2800,
        platforms: [
          plat(300, 420, 140),
          plat(640, 320, 120),
          plat(1000, 430, 140),
          plat(1360, 300, 120),
          plat(1720, 420, 140),
          plat(2100, 330, 130),
        ],
        enemies: [
          { kind: "fish", x: 460, patrolStart: 360, patrolEnd: 820, y: 300 },
          { kind: "fish", x: 900, patrolStart: 780, patrolEnd: 1240, y: 220 },
          { kind: "fish", x: 1420, patrolStart: 1300, patrolEnd: 1780, y: 370 },
          { kind: "fish", x: 1900, patrolStart: 1780, patrolEnd: 2260, y: 260 },
          { kind: "tentacle", x: 2320, patrolStart: 2220, patrolEnd: 2560 },
        ],
        chests: [chest(360, "bandage"), chest(1300, "food"), chest(2160, "firstaid")],
      },
      {
        name: "Scene 3 — The Shark's Lair",
        width: 2200,
        platforms: [plat(320, 420, 170), plat(700, 330, 150)],
        enemies: [{ kind: "fish", x: 620, patrolStart: 480, patrolEnd: 900, y: 300 }],
        chests: [chest(300, "firstaid"), chest(820, "food")],
        boss: true,
      },
    ],
  },
  {
    name: "Level 5 — The High Sky",
    short: "Sky",
    biome: "sky",
    width: 3200,
    boss: "cloud",
    platforms: [
      plat(260, 440, 170),
      plat(560, 380, 150),
      plat(880, 320, 150),
      plat(1200, 400, 160),
      plat(1520, 330, 150),
      plat(1860, 400, 170),
      plat(2180, 340, 150),
    ],
    enemies: [
      { kind: "winged", x: 620, patrolStart: 480, patrolEnd: 1000, y: 290 },
      { kind: "winged", x: 1160, patrolStart: 1000, patrolEnd: 1520, y: 250 },
      { kind: "winged", x: 1740, patrolStart: 1580, patrolEnd: 2100, y: 300 },
      { kind: "winged", x: 2200, patrolStart: 2040, patrolEnd: 2500, y: 260 },
    ],
    chests: [chest(280, "arrows"), chest(1080, "arrows"), chest(1560, "food"), chest(2260, "firstaid")],
  },
  {
    name: "Level 6 — Wild Jungle",
    short: "Jungle",
    biome: "jungle",
    width: 3200,
    boss: "gorilla",
    platforms: [plat(300, 420, 170), plat(660, 340, 150), plat(1020, 420, 180), plat(1420, 330, 150), plat(1820, 420, 170), plat(2200, 350, 150)],
    enemies: [
      { kind: "tentacle", x: 420, patrolStart: 340, patrolEnd: 700 },
      { kind: "insect", x: 980, patrolStart: 880, patrolEnd: 1300 },
      { kind: "winged", x: 1500, patrolStart: 1340, patrolEnd: 1860, y: 280 },
      { kind: "insect", x: 2100, patrolStart: 2000, patrolEnd: 2400 },
    ],
    chests: [chest(320, "arrows"), chest(1140, "food"), chest(1960, "bandage")],
  },
  {
    name: "Level 7 — Frozen Wastes",
    short: "Snow Field",
    biome: "snow",
    width: 3300,
    boss: "bear",
    platforms: [plat(320, 430, 160), plat(700, 350, 140), plat(1080, 430, 170), plat(1460, 340, 140), plat(1860, 420, 170), plat(2260, 360, 150)],
    enemies: [
      { kind: "furry", x: 460, patrolStart: 380, patrolEnd: 760 },
      { kind: "furry", x: 1020, patrolStart: 920, patrolEnd: 1340 },
      { kind: "winged", x: 1600, patrolStart: 1440, patrolEnd: 1960, y: 280 },
      { kind: "tentacle", x: 2180, patrolStart: 2080, patrolEnd: 2460 },
    ],
    chests: [chest(300, "firstaid"), chest(1160, "food"), chest(2020, "arrows")],
  },
  {
    name: "Level 8 — Burning Desert",
    short: "Desert",
    biome: "desert",
    width: 3300,
    boss: "scorpion",
    platforms: [plat(340, 430, 160), plat(700, 350, 140), plat(1060, 430, 170), plat(1440, 340, 140), plat(1840, 420, 170), plat(2240, 360, 150)],
    enemies: [
      { kind: "insect", x: 460, patrolStart: 380, patrolEnd: 760 },
      { kind: "insect", x: 980, patrolStart: 880, patrolEnd: 1300 },
      { kind: "insect", x: 1560, patrolStart: 1460, patrolEnd: 1880 },
      { kind: "winged", x: 2100, patrolStart: 1940, patrolEnd: 2460, y: 290 },
    ],
    chests: [chest(300, "arrows"), chest(1120, "food"), chest(1900, "firstaid"), chest(2400, "arrows")],
  },
  {
    name: "Level 9 — Snow Mountain",
    short: "Snow Mountain",
    biome: "mountain",
    width: 3400,
    boss: "wizard",
    platforms: [plat(300, 430, 150), plat(640, 350, 140), plat(980, 280, 140), plat(1340, 360, 150), plat(1700, 300, 140), plat(2060, 400, 160), plat(2380, 320, 150)],
    enemies: [
      { kind: "furry", x: 420, patrolStart: 340, patrolEnd: 700 },
      { kind: "winged", x: 1000, patrolStart: 840, patrolEnd: 1360, y: 250 },
      { kind: "tentacle", x: 1600, patrolStart: 1500, patrolEnd: 1880 },
      { kind: "winged", x: 2200, patrolStart: 2040, patrolEnd: 2560, y: 230 },
      { kind: "insect", x: 2500, patrolStart: 2400, patrolEnd: 2760 },
    ],
    chests: [chest(280, "firstaid"), chest(1080, "arrows"), chest(1780, "food"), chest(2420, "firstaid")],
  },
  {
    name: "Level 10 — The Dragon's Castle",
    short: "Dragon's Castle",
    biome: "castle",
    width: 4200,
    boss: "dragon",
    platforms: [plat(320, 420, 170), plat(700, 350, 150), plat(1100, 420, 160), plat(1500, 340, 150), plat(1900, 420, 160)],
    enemies: [
      { kind: "winged", x: 700, patrolStart: 540, patrolEnd: 1060, y: 260 },
      { kind: "tentacle", x: 1200, patrolStart: 1100, patrolEnd: 1480 },
      { kind: "winged", x: 1800, patrolStart: 1640, patrolEnd: 2160, y: 240 },
      { kind: "furry", x: 2300, patrolStart: 2200, patrolEnd: 2560 },
    ],
    chests: [chest(300, "firstaid"), chest(1160, "arrows"), chest(1960, "food"), chest(2500, "firstaid")],
  },
];

/**
 * The knight's jump clears about 120px, so no platform may sit more than
 * MAX_RISE above the ground or above a nearby lower platform. Level layouts are
 * passed through this pass so every platform is reachable by a normal jump.
 */
const MAX_RISE = 80;
const REACH_GAP = 220;

function makeReachable(list: Platform[]): Platform[] {
  const sorted = list.map((p) => ({ ...p })).sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    let support = GROUND_Y;
    for (let j = 0; j < i; j++) {
      const q = sorted[j]!;
      const gap = p.x - (q.x + q.width);
      if (gap < REACH_GAP && q.y < support) support = q.y;
    }
    const highest = support - MAX_RISE;
    if (p.y < highest) p.y = highest;
  }
  return sorted;
}

for (const level of LEVELS) {
  level.platforms = makeReachable(level.platforms);
  for (const scene of level.scenes ?? []) scene.platforms = makeReachable(scene.platforms);
}

export const FINAL_LEVEL_INDEX = LEVELS.length - 1;

/* ---------------- Village hub ---------------- */

export const VILLAGE_WIDTH = 2800;
export const VILLAGE_PLATFORMS: Platform[] = makeReachable([plat(520, 400, 140), plat(1500, 380, 140)]);
export const MAP_BOARD_X = 380;
export const PORTAL_X = 2500;

export const VILLAGE_NPCS: Npc[] = [
  {
    id: "mayor",
    kind: "mayor",
    name: "Mayor Bumbleworth",
    x: 200,
    color: "#7c3aed",
    lines: [
      "Welcome back, brave knight!",
      "Read the map board to pick where to go, then step into the portal.",
      "The villagers all need a hand — help them and they will pay you in coins.",
    ],
    done: true,
  },
  {
    id: "shop",
    kind: "shop",
    name: "Shopkeeper Pim",
    x: 760,
    color: "#0d9488",
    lines: ["Coins in, goodies out! Press E to browse."],
    done: true,
  },
  {
    id: "bram",
    kind: "villager",
    name: "Farmer Bram",
    x: 1150,
    color: "#65a30d",
    lines: ["My animals are starving! Help me feed them and I'll pay you."],
    minigame: "feed",
    done: false,
  },
  {
    id: "nan",
    kind: "villager",
    name: "Nan Crumb",
    x: 1560,
    color: "#f97316",
    lines: ["I keep dropping loaves out of my window. Catch them for coins!"],
    minigame: "loaves",
    done: false,
  },
  {
    id: "tilda",
    kind: "villager",
    name: "Tilda the Tailor",
    x: 1960,
    color: "#db2777",
    lines: ["I need flowers for my hats — pick the colours I call out!"],
    minigame: "flowers",
    done: false,
  },
  {
    id: "fenwick",
    kind: "villager",
    name: "Old Man Fenwick",
    x: 2280,
    color: "#0284c7",
    lines: ["In my day we fought dragons with a spoon. Show me you can hit a target."],
    minigame: "targets",
    done: false,
  },
];

export type ShopEntry = { key: string; label: string; cost: number };

export const SHOP_ITEMS: ShopEntry[] = [
  { key: "1", label: "First Aid Kit — full health", cost: 15 },
  { key: "2", label: "15 Arrows", cost: 10 },
  { key: "3", label: "Hearty Meal — full hunger", cost: 8 },
  { key: "4", label: "Extra Heart — max health +1", cost: 50 },
];
