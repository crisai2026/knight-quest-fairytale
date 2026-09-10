import type { Biome, BossKind, Chest, ChestItem, EnemyKind, Npc, Platform, SceneSky } from "./types";

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
  /** Periodic wind gusts push the knight sideways. */
  wind?: boolean;
  /** Bouncy mushrooms that launch the knight. */
  bounces?: { x: number; y: number }[];
  /** One-line twist hint shown on the scene start card. */
  hint?: string;
  /** Time of day / weather look. */
  sky?: SceneSky;
  /** Wet ground: the knight slides. */
  slippery?: boolean;
  /** Thick mist limits visibility. */
  fog?: boolean;
  /** Acorns rain down from the treetops. */
  falling?: boolean;
  /** Seconds to reach the flag before taking a hit. */
  timeLimit?: number;
  /** Pitch black: only a lantern circle around the knight is lit. */
  darkness?: boolean;
  /** The sea rises and falls across the scene. */
  tide?: boolean;
  /** Underwater current drags the knight sideways. */
  current?: boolean;
  /** Ledges collapse a moment after the knight stands on them. */
  crumbling?: boolean;
  /** Vine pads that fling the knight forward and up. */
  swings?: { x: number; y: number }[];
  /** Fire jets burst out of the floor on a rhythm. */
  firejets?: boolean;
  /** Scorching heat drains hunger on its own. */
  heat?: boolean;
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

/** A moving platform: oscillates around (x, y) on the given axis. */
function mplat(x: number, y: number, width: number, axis: "x" | "y", range: number, speed: number): Platform {
  return { x, y, width, height: 20, axis, range, speed };
}

function furry(x: number, span = 110): EnemySpawn {
  return { kind: "furry", x, patrolStart: x - span, patrolEnd: x + span };
}

function winged(x: number, y = 260, span = 150): EnemySpawn {
  return { kind: "winged", x, y, patrolStart: x - span, patrolEnd: x + span };
}

const MUSHROOM_Y = GROUND_Y - 26;

/**
 * Sunny Forest — 10 hand-built scenes, each with its own little twist.
 * Scene 10 is the Furry King arena.
 */
const FOREST_SCENES: SceneDef[] = [
  {
    // 1. Misty dawn: short, calm, but you can barely see ahead.
    name: `Scene 1 — ${FOREST_SCENE_NAMES[0]}`,
    width: 1800,
    sky: "mist",
    fog: true,
    platforms: [plat(320, 430, 180), plat(680, 360, 170), plat(1080, 420, 180), plat(1420, 350, 160)],
    enemies: [furry(700), furry(1250)],
    chests: [chest(380, "food"), chest(1200, "bandage")],
    hint: "Dawn mist — you can barely see. Walk carefully!",
  },
  {
    // 2. Sunny morning: pure platforming while acorns rain from the trees.
    name: `Scene 2 — ${FOREST_SCENE_NAMES[1]}`,
    width: 2200,
    sky: "dawn",
    falling: true,
    platforms: [
      plat(260, 430, 150), plat(480, 350, 140), plat(700, 430, 150), plat(920, 350, 140),
      plat(1140, 430, 150), plat(1360, 350, 140), plat(1580, 430, 150), plat(1800, 350, 140),
    ],
    enemies: [furry(1050)],
    chests: [chest(520, "food", 350 - 24), chest(1640, "food", 430 - 24)],
    hint: "Acorns rain from the treetops — keep moving while you climb!",
  },
  {
    // 3. Rainy gauntlet: wet, slippery ground and a whole pack of monsters.
    name: `Scene 3 — ${FOREST_SCENE_NAMES[2]}`,
    width: 2500,
    sky: "rain",
    slippery: true,
    platforms: [plat(900, 400, 160), plat(1700, 400, 160)],
    enemies: [furry(480), furry(860), furry(1240), furry(1620), furry(2000)],
    chests: [chest(320, "bandage"), chest(1500, "food")],
    hint: "Rain! The mud is slippery and a whole pack blocks the path.",
  },
  {
    // 4. Wind scene: gusts push the knight backwards.
    name: `Scene 4 — ${FOREST_SCENE_NAMES[3]}`,
    width: 2300,
    sky: "grey",
    wind: true,
    platforms: [plat(340, 420, 150), plat(620, 340, 140), plat(980, 420, 150), plat(1340, 340, 140), plat(1700, 420, 150)],
    enemies: [furry(800), furry(1500)],
    chests: [chest(400, "food"), chest(1400, "bandage", 340 - 24)],
    hint: "Gusts of wind push you back — move between gusts!",
  },
  {
    // 5. Moving platforms: ride them to the high ledges.
    name: `Scene 5 — ${FOREST_SCENE_NAMES[4]}`,
    width: 2500,
    sky: "golden",
    platforms: [
      plat(300, 420, 150),
      mplat(620, 400, 130, "y", 70, 0.02),
      plat(900, 300, 150),
      mplat(1250, 400, 130, "x", 90, 0.018),
      plat(1600, 420, 150),
      mplat(1950, 390, 130, "y", 80, 0.022),
    ],
    enemies: [furry(1050)],
    chests: [chest(950, "food", 300 - 24), chest(1650, "bandage", 420 - 24)],
    hint: "Ride the moving platforms!",
  },
  {
    // 6. Hunger challenge: long walk, no food until the very end.
    name: `Scene 6 — ${FOREST_SCENE_NAMES[5]}`,
    width: 2900,
    sky: "dusk",
    timeLimit: 60,
    platforms: [plat(500, 420, 160), plat(1100, 360, 150), plat(1700, 420, 160), plat(2300, 360, 150)],
    enemies: [furry(800), furry(1500), furry(2200)],
    chests: [chest(380, "bandage"), chest(2650, "food")],
    hint: "Night is falling: reach the flag in 60s, and no food on the way!",
  },
  {
    // 7. Bounce mushrooms: launch up to tall ledges (exempt from reachability clamp).
    name: `Scene 7 — ${FOREST_SCENE_NAMES[6]}`,
    width: 2400,
    sky: "sunset",
    platforms: [
      plat(560, 250, 150), plat(900, 430, 150), plat(1180, 220, 150), plat(1560, 430, 150), plat(1840, 250, 150),
    ],
    bounces: [
      { x: 380, y: MUSHROOM_Y }, { x: 1020, y: MUSHROOM_Y }, { x: 1700, y: MUSHROOM_Y },
    ],
    enemies: [furry(700), furry(1400)],
    chests: [chest(600, "food", 250 - 24), chest(1220, "firstaid", 220 - 24), chest(1880, "food", 250 - 24)],
    hint: "Bounce on the big mushrooms to reach the high ledges!",
  },
  {
    // 8. Stormy ridge: more platforming while the storm rages.
    name: `Scene 8 — ${FOREST_SCENE_NAMES[7]}`,
    width: 2400,
    sky: "storm",
    platforms: [plat(420, 420, 160), plat(1020, 360, 150), plat(1620, 420, 160)],
    enemies: [furry(700), furry(1500), furry(1900)],
    chests: [chest(360, "arrows"), chest(1400, "food")],
    hint: "The storm rages — keep your footing on the high ridge!",
  },
  {
    // 9. Mixed review: wind + a moving platform + a mushroom + monsters.
    name: `Scene 9 — ${FOREST_SCENE_NAMES[8]}`,
    width: 2700,
    sky: "rain",
    wind: true,
    slippery: true,
    falling: true,
    platforms: [
      plat(360, 420, 150),
      mplat(760, 390, 130, "y", 70, 0.02),
      plat(1150, 300, 150),
      plat(1500, 420, 150),
      plat(2000, 360, 150),
    ],
    bounces: [{ x: 1040, y: MUSHROOM_Y }],
    enemies: [furry(600), furry(1350), furry(1900), furry(2400)],
    chests: [chest(320, "food"), chest(1200, "bandage", 300 - 24), chest(2200, "food")],
    hint: "A bit of everything — stay sharp!",
  },
  {
    // 10. Boss arena (unchanged).
    name: `Scene 10 — ${FOREST_SCENE_NAMES[9]}`,
    width: 2200,
    sky: "storm",
    platforms: [plat(320, 430, 170), plat(700, 350, 150)],
    enemies: [{ kind: "furry", x: 620, patrolStart: 500, patrolEnd: 880 }],
    chests: [chest(300, "firstaid"), chest(820, "food")],
    boss: true,
    hint: "The Furry King awaits — grab the TNT!",
  },
];

/* ---------------- Chapters 2-10: 10 scenes each ---------------- */

/** The twist flags a chapter layers on top of the shared scene rhythm. */
type ChapterTwist = Pick<
  SceneDef,
  "wind" | "slippery" | "fog" | "falling" | "darkness" | "tide" | "current" | "crumbling" | "firejets" | "heat"
>;

type ChapterConfig = {
  /** Ten scene place names; the last one is the boss arena. */
  names: string[];
  /** Ten looks — time of day / weather. */
  skies: SceneSky[];
  /** The chapter's signature twist. */
  twist: ChapterTwist;
  twistHint: string;
  /** Chapter-themed monster spawner. */
  enemy: (x: number, i: number) => EnemySpawn;
  /** Vine pads instead of mushrooms (jungle), or none at all (ocean). */
  launch?: "mushroom" | "swing" | "none";
  bossHint: string;
};

const SWING_Y = GROUND_Y - 150;

function launchPads(cfg: ChapterConfig, spots: { x: number; y: number }[]): Partial<SceneDef> {
  const mode = cfg.launch ?? "mushroom";
  if (mode === "none") return {};
  if (mode === "swing") return { swings: spots.map((s) => ({ x: s.x, y: SWING_Y })) };
  return { bounces: spots };
}

/**
 * Builds a 10-scene chapter using the rhythm of Sunny Forest:
 * warm-up, platforming, gauntlet, the chapter twist, moving platforms,
 * timed run, launch pads, twist at full strength, everything mixed, boss.
 */
function buildChapter(cfg: ChapterConfig): SceneDef[] {
  const n = (i: number) => `Scene ${i + 1} — ${cfg.names[i]}`;
  const sky = (i: number) => cfg.skies[i]!;
  const twist = cfg.twist;

  return [
    {
      name: n(0),
      width: 1800,
      sky: sky(0),
      platforms: [plat(320, 430, 180), plat(680, 360, 170), plat(1080, 420, 180), plat(1420, 350, 160)],
      enemies: [cfg.enemy(700, 0), cfg.enemy(1250, 1)],
      chests: [chest(380, "food"), chest(1200, "bandage")],
      hint: "A calm start — find your footing.",
    },
    {
      name: n(1),
      width: 2200,
      sky: sky(1),
      platforms: [
        plat(260, 430, 150), plat(480, 350, 140), plat(700, 430, 150), plat(920, 350, 140),
        plat(1140, 430, 150), plat(1360, 350, 140), plat(1580, 430, 150), plat(1800, 350, 140),
      ],
      enemies: [cfg.enemy(1050, 0)],
      chests: [chest(520, "food", 350 - 24), chest(1640, "food", 430 - 24)],
      hint: "Climb the steps — pure jumping practice.",
    },
    {
      name: n(2),
      width: 2500,
      sky: sky(2),
      platforms: [plat(900, 400, 160), plat(1700, 400, 160)],
      enemies: [cfg.enemy(480, 0), cfg.enemy(860, 1), cfg.enemy(1240, 2), cfg.enemy(1620, 3), cfg.enemy(2000, 4)],
      chests: [chest(320, "bandage"), chest(1500, "food")],
      hint: "A whole pack blocks the path — fight your way through!",
    },
    {
      name: n(3),
      width: 2300,
      sky: sky(3),
      ...twist,
      platforms: [plat(340, 420, 150), plat(620, 340, 140), plat(980, 420, 150), plat(1340, 340, 140), plat(1700, 420, 150)],
      enemies: [cfg.enemy(800, 0), cfg.enemy(1500, 1)],
      chests: [chest(400, "food"), chest(1400, "bandage", 340 - 24)],
      hint: cfg.twistHint,
    },
    {
      name: n(4),
      width: 2500,
      sky: sky(4),
      platforms: [
        plat(300, 420, 150),
        mplat(620, 400, 130, "y", 70, 0.02),
        plat(900, 300, 150),
        mplat(1250, 400, 130, "x", 90, 0.018),
        plat(1600, 420, 150),
        mplat(1950, 390, 130, "y", 80, 0.022),
      ],
      enemies: [cfg.enemy(1050, 0)],
      chests: [chest(950, "food", 300 - 24), chest(1650, "bandage", 420 - 24)],
      hint: "Ride the moving platforms!",
    },
    {
      name: n(5),
      width: 2900,
      sky: sky(5),
      timeLimit: 60,
      platforms: [plat(500, 420, 160), plat(1100, 360, 150), plat(1700, 420, 160), plat(2300, 360, 150)],
      enemies: [cfg.enemy(800, 0), cfg.enemy(1500, 1), cfg.enemy(2200, 2)],
      chests: [chest(380, "bandage"), chest(2650, "food")],
      hint: "Race to the flag — 60 seconds, and no food on the way!",
    },
    {
      name: n(6),
      width: 2400,
      sky: sky(6),
      ...(cfg.launch === "none" ? { ...twist } : {}),
      platforms: [
        plat(560, 250, 150), plat(900, 430, 150), plat(1180, 220, 150), plat(1560, 430, 150), plat(1840, 250, 150),
      ],
      ...launchPads(cfg, [
        { x: 380, y: MUSHROOM_Y }, { x: 1020, y: MUSHROOM_Y }, { x: 1700, y: MUSHROOM_Y },
      ]),
      enemies: [cfg.enemy(700, 0), cfg.enemy(1400, 1)],
      chests: [chest(600, "food", 250 - 24), chest(1220, "firstaid", 220 - 24), chest(1880, "food", 250 - 24)],
      hint:
        cfg.launch === "swing"
          ? "Grab the vine pads to fly across the gaps!"
          : cfg.launch === "none"
          ? "High ledges and deep water — take the long way up."
          : "Bounce on the pads to reach the high ledges!",
    },
    {
      name: n(7),
      width: 2400,
      sky: sky(7),
      ...twist,
      platforms: [plat(420, 420, 160), plat(1020, 360, 150), plat(1620, 420, 160)],
      enemies: [cfg.enemy(700, 0), cfg.enemy(1500, 1), cfg.enemy(1900, 2)],
      chests: [chest(360, "arrows"), chest(1400, "food")],
      hint: `${cfg.twistHint} And it is much worse up here!`,
    },
    {
      name: n(8),
      width: 2700,
      sky: sky(8),
      ...twist,
      wind: true,
      platforms: [
        plat(360, 420, 150),
        mplat(760, 390, 130, "y", 70, 0.02),
        plat(1150, 300, 150),
        plat(1500, 420, 150),
        plat(2000, 360, 150),
      ],
      ...launchPads(cfg, [{ x: 1040, y: MUSHROOM_Y }]),
      enemies: [cfg.enemy(600, 0), cfg.enemy(1350, 1), cfg.enemy(1900, 2), cfg.enemy(2400, 3)],
      chests: [chest(320, "food"), chest(1200, "bandage", 300 - 24), chest(2200, "food")],
      hint: "A bit of everything — stay sharp!",
    },
    {
      name: n(9),
      width: 2200,
      sky: sky(9),
      platforms: [plat(320, 430, 170), plat(700, 350, 150)],
      enemies: [cfg.enemy(620, 0)],
      chests: [chest(300, "firstaid"), chest(820, "food")],
      boss: true,
      hint: cfg.bossHint,
    },
  ];
}

function ground(kind: EnemyKind) {
  return (x: number): EnemySpawn => ({ kind, x, patrolStart: x - 110, patrolEnd: x + 110 });
}

function flyer(kind: EnemyKind, baseY = 270) {
  return (x: number, i: number): EnemySpawn => ({
    kind,
    x,
    y: baseY + (i % 3) * 40,
    patrolStart: x - 160,
    patrolEnd: x + 160,
  });
}

const NIGHT_SCENES = buildChapter({
  names: [
    "Moonlit Trail", "Whispering Pines", "Hollow Grove", "The Black Wood", "Silver Brook",
    "Owl's Hunt", "Toadstool Ring", "Starless Path", "Shadow Ridge", "The Great Owl's Roost",
  ],
  skies: ["night", "night", "rain", "night", "dusk", "night", "dusk", "night", "storm", "storm"],
  twist: { darkness: true },
  twistHint: "Pitch black — only your lantern lights the way!",
  enemy: ground("tentacle"),
  bossHint: "The Great Owl swoops in — grab the TNT!",
});

const BEACH_SCENES = buildChapter({
  names: [
    "Warm Sands", "Driftwood Cove", "Crab Flats", "The Rising Tide", "Palm Bluffs",
    "Sunset Run", "Bubble Reef", "Storm Surf", "Broken Pier", "The Giant Crab's Bay",
  ],
  skies: ["dawn", "golden", "clear", "grey", "golden", "sunset", "clear", "storm", "storm", "sunset"],
  twist: { tide: true },
  twistHint: "The tide is coming in — climb before the water reaches you!",
  enemy: ground("tentacle"),
  bossHint: "The Giant Crab clacks its claws — grab the TNT!",
});

const OCEAN_SCENES = buildChapter({
  names: [
    "Shallow Reef", "Kelp Forest", "Coral Maze", "The Cold Current", "Sunken Mast",
    "Trench Run", "Pillar Ruins", "Riptide Deep", "The Abyss Road", "The Shark's Lair",
  ],
  skies: ["deep", "deep", "deep", "deep", "deep", "deep", "deep", "deep", "deep", "deep"],
  twist: { current: true },
  twistHint: "A strong current drags you sideways — swim with it, not against it!",
  enemy: flyer("fish", 260),
  launch: "none",
  bossHint: "The Giant Shark circles — grab the TNT!",
});

const SKY_SCENES = buildChapter({
  names: [
    "Cloud Steps", "Windy Heights", "Feather Pass", "Crumbling Clouds", "Rainbow Bridge",
    "Sunrise Climb", "Thermal Vents", "The Grey Ceiling", "Thunderhead", "The Thunder Cloud",
  ],
  skies: ["clear", "golden", "dawn", "grey", "golden", "dawn", "mist", "grey", "storm", "storm"],
  twist: { crumbling: true },
  twistHint: "These clouds fall apart — don't stand still!",
  enemy: flyer("winged", 250),
  bossHint: "The Thunder Cloud rumbles — grab the TNT!",
});

const JUNGLE_SCENES = buildChapter({
  names: [
    "Green Wall", "Creeper Steps", "Bug Hollow", "Vine Canopy", "Ruined Temple",
    "Monsoon Run", "Swinging Grove", "Storm Canopy", "Deep Thicket", "The Gorilla's Clearing",
  ],
  skies: ["golden", "mist", "clear", "rain", "golden", "rain", "clear", "storm", "rain", "storm"],
  twist: { wind: true, fog: true },
  twistHint: "Thick steam and gusts in the canopy — swing across carefully!",
  enemy: ground("insect"),
  launch: "swing",
  bossHint: "The Giant Gorilla pounds its chest — grab the TNT!",
});

const SNOW_SCENES = buildChapter({
  names: [
    "First Snow", "Frozen Pines", "Wolf Flats", "Black Ice", "Frost Ridge",
    "Blizzard Run", "Snowdrift Bounce", "White Out", "Glacier Edge", "The Polar Bear's Den",
  ],
  skies: ["ice", "ice", "grey", "ice", "golden", "grey", "ice", "storm", "ice", "storm"],
  twist: { slippery: true, wind: true },
  twistHint: "Black ice! You slide, and the wind pushes you along.",
  enemy: ground("furry"),
  bossHint: "The Polar Bear roars — grab the TNT!",
});

const DESERT_SCENES = buildChapter({
  names: [
    "Dune Road", "Sun Steps", "Scarab Flats", "The Sandstorm", "Oasis Rocks",
    "Noon Race", "Cactus Springs", "Blinding Sands", "Bone Valley", "The Scorpion's Pit",
  ],
  skies: ["sand", "clear", "golden", "sand", "golden", "clear", "sunset", "sand", "dusk", "sand"],
  twist: { fog: true, wind: true, heat: true },
  twistHint: "A sandstorm! You can hardly see, and the heat eats your hunger.",
  enemy: ground("insect"),
  bossHint: "The Giant Scorpion clicks its tail — grab the TNT!",
});

const MOUNTAIN_SCENES = buildChapter({
  names: [
    "Base Camp", "Stone Stairs", "Yeti Tracks", "Rockfall Pass", "Icy Ledges",
    "Summit Race", "Snow Cushions", "The Avalanche", "Wizard's Approach", "The Wizard's Peak",
  ],
  skies: ["ice", "grey", "ice", "storm", "ice", "golden", "ice", "storm", "dusk", "storm"],
  twist: { falling: true, slippery: true },
  twistHint: "Rocks tumble down the slope and the ice is slick — keep moving!",
  enemy: ground("furry"),
  bossHint: "The Wizard raises his staff — grab the TNT!",
});

const CASTLE_SCENES = buildChapter({
  names: [
    "Castle Gate", "Broken Stairs", "Guard Hall", "The Fire Floor", "Throne Corridor",
    "Collapsing Wing", "Chapel Ruins", "Furnace Hall", "Dragon's Landing", "The Dragon's Lair",
  ],
  skies: ["ember", "ember", "storm", "ember", "ember", "storm", "ember", "ember", "storm", "ember"],
  twist: { firejets: true },
  twistHint: "Fire bursts from the floor — watch the sparks and time your run!",
  enemy: flyer("winged", 260),
  bossHint: "The Dragon lands — grab the TNT and save the princess!",
});

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
    scenes: FOREST_SCENES,

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
    scenes: NIGHT_SCENES,
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
    scenes: BEACH_SCENES,
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
    scenes: OCEAN_SCENES,
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
    scenes: SKY_SCENES,
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
    scenes: JUNGLE_SCENES,
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
    scenes: SNOW_SCENES,
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
    scenes: DESERT_SCENES,
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
  for (const scene of level.scenes ?? []) {
    // Scenes with bounce mushrooms intentionally have taller ledges.
    if (!scene.bounces?.length) scene.platforms = makeReachable(scene.platforms);
  }
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
    x: 610,
    y: 330,
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
    x: 1000,
    y: 430,
    color: "#0d9488",
    lines: ["Coins in, goodies out! Press E to browse."],
    done: true,
  },
  {
    id: "bram",
    kind: "villager",
    name: "Farmer Bram",
    x: 300,
    y: 470,
    color: "#65a30d",
    lines: ["My animals are starving! Help me feed them and I'll pay you."],
    minigame: "feed",
    done: false,
  },
  {
    id: "nan",
    kind: "villager",
    name: "Nan Crumb",
    x: 1325,
    y: 385,
    color: "#f97316",
    lines: ["I keep dropping loaves out of my window. Catch them for coins!"],
    minigame: "loaves",
    done: false,
  },
  {
    id: "tilda",
    kind: "villager",
    name: "Tilda the Tailor",
    x: 650,
    y: 1105,
    color: "#db2777",
    lines: ["I need flowers for my hats — pick the colours I call out!"],
    minigame: "flowers",
    done: false,
  },
  {
    id: "fenwick",
    kind: "villager",
    name: "Old Man Fenwick",
    x: 1250,
    y: 1080,
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
