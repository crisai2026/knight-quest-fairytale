import type { Biome, Chest, ChestItem, EnemyKind, Platform } from "./types";

export const GROUND_Y = 520;

export type EnemySpawn = {
  kind: EnemyKind;
  x: number;
  patrolStart: number;
  patrolEnd: number;
  y?: number;
};

export type LevelDef = {
  name: string;
  biome: Biome;
  /** Optional biome bands (used by the finale level), sorted by x ascending. */
  bands?: { from: number; biome: Biome }[];
  width: number;
  swim?: boolean;
  finale?: boolean;
  platforms: Platform[];
  enemies: EnemySpawn[];
  chests: Chest[];
};

function plat(x: number, y: number, width = 150): Platform {
  return { x, y, width, height: 20 };
}

function chest(x: number, item: ChestItem, onGround = true, y = GROUND_Y - 24): Chest {
  const label =
    item === "bandage" ? "Bandage" : item === "firstaid" ? "First Aid" : item === "food" ? "Food" : "Arrows";
  return { x, y: onGround ? GROUND_Y - 24 : y, width: 32, height: 24, opened: false, item, label };
}

/** Shared layout used by level 1 and its night version. */
const FOREST_PLATFORMS: Platform[] = [
  plat(280, 430, 160),
  plat(560, 360, 140),
  plat(820, 430, 180),
  plat(1120, 340, 120),
  plat(1380, 400, 160),
  plat(1660, 320, 140),
  plat(1940, 420, 170),
];

export const LEVELS: LevelDef[] = [
  {
    name: "Level 1 — Sunny Forest",
    biome: "sunny",
    width: 2400,
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
    biome: "night",
    width: 2400,
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
    biome: "beach",
    width: 2600,
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
    biome: "ocean",
    width: 2600,
    swim: true,
    platforms: [plat(340, 440, 180), plat(760, 330, 140), plat(1160, 450, 170), plat(1560, 320, 150), plat(2000, 430, 180)],
    enemies: [
      { kind: "fish", x: 500, patrolStart: 380, patrolEnd: 900, y: 320 },
      { kind: "fish", x: 900, patrolStart: 760, patrolEnd: 1300, y: 240 },
      { kind: "fish", x: 1400, patrolStart: 1240, patrolEnd: 1780, y: 360 },
      { kind: "fish", x: 1900, patrolStart: 1760, patrolEnd: 2300, y: 260 },
      { kind: "fish", x: 2200, patrolStart: 2040, patrolEnd: 2520, y: 400 },
    ],
    chests: [chest(420, "food"), chest(1220, "bandage"), chest(2060, "firstaid")],
  },
  {
    name: "Level 5 — Village Under Attack",
    biome: "village",
    width: 2800,
    platforms: [plat(300, 420, 170), plat(640, 340, 150), plat(1000, 420, 180), plat(1400, 330, 150), plat(1800, 420, 170), plat(2200, 350, 150)],
    enemies: [
      { kind: "winged", x: 700, patrolStart: 560, patrolEnd: 1060, y: 300 },
      { kind: "winged", x: 1200, patrolStart: 1040, patrolEnd: 1560, y: 260 },
      { kind: "winged", x: 1800, patrolStart: 1640, patrolEnd: 2160, y: 310 },
      { kind: "winged", x: 2300, patrolStart: 2140, patrolEnd: 2660, y: 270 },
      { kind: "furry", x: 1500, patrolStart: 1440, patrolEnd: 1720 },
    ],
    chests: [chest(260, "arrows"), chest(1080, "arrows"), chest(1500, "food"), chest(2260, "arrows")],
  },
  {
    name: "Level 6 — Burning Desert",
    biome: "desert",
    width: 2800,
    platforms: [plat(340, 430, 160), plat(700, 350, 140), plat(1060, 430, 170), plat(1440, 340, 140), plat(1840, 420, 170), plat(2240, 360, 150)],
    enemies: [
      { kind: "insect", x: 460, patrolStart: 380, patrolEnd: 760 },
      { kind: "insect", x: 980, patrolStart: 880, patrolEnd: 1300 },
      { kind: "insect", x: 1560, patrolStart: 1460, patrolEnd: 1880 },
      { kind: "insect", x: 2100, patrolStart: 2000, patrolEnd: 2420 },
      { kind: "winged", x: 1700, patrolStart: 1540, patrolEnd: 2060, y: 290 },
    ],
    chests: [chest(300, "arrows"), chest(1120, "food"), chest(1900, "firstaid"), chest(2400, "arrows")],
  },
  {
    name: "Level 7 — The Dragon's Castle",
    biome: "snow",
    bands: [
      { from: 0, biome: "snow" },
      { from: 1200, biome: "dark" },
      { from: 2400, biome: "fire" },
      { from: 3400, biome: "castle" },
    ],
    width: 5200,
    finale: true,
    platforms: [plat(320, 420, 170), plat(700, 350, 150), plat(2600, 420, 160), plat(2960, 350, 150), plat(3600, 430, 160)],
    enemies: [],
    chests: [chest(360, "food"), chest(900, "firstaid"), chest(2700, "bandage"), chest(3500, "firstaid")],
  },
];

export const FINALE_LEVEL_INDEX = LEVELS.length - 1;
export const BOW_LEVEL_INDEX = 4; // level 5 (0-based)

export const CASTLE_TRIGGER_X = 3400;
export const DRAGON_ARENA_X = 3900;
export const CAGE_X = 4800;
