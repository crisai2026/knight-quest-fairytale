export type GameMode =
  | "menu"
  | "intro"
  | "levelstart"
  | "playing"
  | "map"
  | "minigame"
  | "levelcomplete"
  | "cutscene"
  | "dialog"
  | "shop"
  | "gameover"
  | "won";

export type Weapon = "sword" | "bow";

export type Biome =
  | "sunny"
  | "night"
  | "beach"
  | "ocean"
  | "sky"
  | "jungle"
  | "snow"
  | "desert"
  | "mountain"
  | "village"
  | "dark"
  | "fire"
  | "castle";

export type BossKind =
  | "furryking"
  | "owl"
  | "crab"
  | "shark"
  | "cloud"
  | "gorilla"
  | "bear"
  | "scorpion"
  | "wizard"
  | "dragon";

export type Scene = "village" | "level";

export type MinigameKind = "feed" | "loaves" | "flowers" | "targets";

export type MinigameObject = {
  x: number;
  y: number;
  vy: number;
  color: string;
  tag: string;
  alive: boolean;
  wobble: number;
};

export type MinigameState = {
  kind: MinigameKind;
  title: string;
  hint: string;
  timer: number;
  score: number;
  best: number;
  objects: MinigameObject[];
  spawnTimer: number;
  prompt: string;
  playerX: number;
  finished: boolean;
  payout: number;
};

export type GameState = {
  mode: GameMode;
  scene: Scene;
  cameraX: number;
  cameraY: number;
  /** The village hub plays as a top-down map instead of a platformer. */
  topDown: boolean;
  levelIndex: number;
  levelName: string;
  /** Scene within the current chapter (0-based). */
  sceneIndex: number;
  /** How many scenes this chapter has (1 for classic single-scene levels). */
  sceneCount: number;
  /** Does this scene hold the chapter boss? */
  hasBoss: boolean;
  /** Where the boss arena starts in this scene. */
  bossArenaX: number;
  worldWidth: number;
  exitX: number;
  swim: boolean;
  levelBanner: number;
  levelCompleteTimer: number;
  player: Player;
  enemies: Enemy[];
  chests: Chest[];
  platforms: Platform[];
  particles: Particle[];
  arrows: Arrow[];
  pails: Pail[];
  boss: Boss | null;
  bossIntroDone: boolean;
  bossDefeated: boolean;
  tntList: TNT[];
  keyDrop: KeyDrop | null;
  flagDrop: FlagDrop | null;
  /** Frames into the Mario-style flag celebration (0 = not celebrating). */
  celebrateTimer: number;
  /** Celebration is for a chapter-ending boss flag. */
  celebrateBig: boolean;
  /** What happens once the celebration finishes. */
  celebrateNext: "scene" | "chapter" | null;
  cage: Cage | null;
  message: string;
  messageTimer: number;
  cutsceneTimer: number;
  cutscenePhase: number;
  keys: Record<string, boolean>;
  started: boolean;
  biome: Biome;
  biomeLabelTimer: number;
  owlTimer: number;
  coins: CoinDrop[];
  foods: FoodDrop[];
  /** Level waiting on the "click to start" card. */
  pendingLevel: number;
  npcs: Npc[];
  dialogLines: string[];
  dialogIndex: number;
  dialogSpeaker: string;
  shopMessage: string;
  /** How many levels are playable (1 = only level 1). */
  unlockedLevels: number;
  /** Level chosen at the world map, shown by the village portal. */
  selectedLevel: number;
  /** Scene of the selected chapter the portal will start. */
  selectedScene: number;
  /** Scenes cleared per chapter index (used to unlock scenes). */
  sceneProgress: Record<number, number>;
  /** World map screen: chapter grid or the scene grid of one chapter. */
  mapView: "chapters" | "scenes";
  /** Chapter whose scenes the map is showing. */
  mapChapter: number;
  /** Cursor inside the scene grid. */
  mapSceneCursor: number;
  mapCursor: number;

  /** Highlighted entry on the game menu. */
  menuCursor: number;
  /** Mode to go back to when the menu is closed (null = title screen). */
  menuPrevMode: GameMode | null;
  /** Menu is asking to confirm wiping the save. */
  menuConfirm: boolean;

  minigame: MinigameState | null;
  bestScores: Record<string, number>;

  /** This scene has periodic wind gusts that push the knight. */
  wind: boolean;
  windTimer: number;
  windBlowing: boolean;
  windDir: 1 | -1;
  /** Bouncy mushrooms in this scene. */
  bounces: Bounce[];
  /** One-line hint shown on the scene start card. */
  sceneHint: string;
  /** Time of day / weather look of this scene. */
  sky: SceneSky;
  /** Wet ground: the knight slides instead of stopping instantly. */
  slippery: boolean;
  /** Mist limits how far the knight can see. */
  fog: boolean;
  /** Acorns/branches drop from the trees above. */
  fallers: Faller[];
  fallerTimer: number;
  /** Countdown race: frames left before the knight takes a hit (0 = no limit). */
  timeLimit: number;
  timeLeft: number;

  /** Pitch black scene: only a lantern circle around the knight is lit. */
  darkness: boolean;
  /** Rising tide: the sea level moves up and down across the scene. */
  tide: boolean;
  tideY: number;
  tideT: number;
  /** Underwater current that drags the knight sideways. */
  current: boolean;
  currentTimer: number;
  currentDir: 1 | -1;
  /** Clouds/ledges collapse a moment after the knight stands on them. */
  crumbling: boolean;
  /** Vine pads that fling the knight forward and up. */
  swings: Bounce[];
  swingBoost: number;
  swingDir: 1 | -1;
  /** Fire jets bursting out of the floor on a rhythm. */
  jets: FireJet[];
  jetTimer: number;
  /** Scorching heat: hunger drains on its own. */
  heat: boolean;
};

/** A fire jet in the castle floor. */
export type FireJet = { x: number; phase: number };

export type SceneSky =
  | "clear"
  | "dawn"
  | "mist"
  | "rain"
  | "grey"
  | "golden"
  | "dusk"
  | "storm"
  | "sunset"
  | "night"
  | "sand"
  | "ice"
  | "ember"
  | "deep";

/** Something falling from the treetops that hurts on impact. */
export type Faller = {
  x: number;
  y: number;
  vy: number;
};

export type FoodKind = "bread" | "apple" | "cheese" | "chicken" | "berries";

export type FoodDrop = {
  kind: FoodKind;
  x: number;
  y: number;
  vy: number;
  bob: number;
};

export type CoinDrop = {
  x: number;
  y: number;
  vy: number;
  value: number;
  spin: number;
};

export type NpcKind = "mayor" | "shop" | "villager";

export type Npc = {
  id: string;
  kind: NpcKind;
  name: string;
  x: number;
  /** Top-down village position (feet). */
  y: number;
  color: string;
  lines: string[];
  /** Mini-game this villager runs. */
  minigame?: MinigameKind;
  done: boolean;
};

export type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  facing: "left" | "right";
  /** Facing for the top-down village. */
  facing4: "up" | "down" | "left" | "right";
  /** Walk animation clock used by the top-down village. */
  walkT: number;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  onGround: boolean;
  attacking: boolean;
  attackTimer: number;
  attackCooldown: number;
  invulnerable: number;
  weapon: Weapon;
  hasBow: boolean;
  arrowsLeft: number;
  tnt: number;
  hasKey: boolean;
  coins: number;
  items: string[];
  reachedVillage: boolean;
};

export type EnemyKind = "furry" | "tentacle" | "winged" | "fish" | "insect";

export type Enemy = {
  kind: EnemyKind;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  patrolStart: number;
  patrolEnd: number;
  flash: number;
  wobble: number;
};

export type ChestItem = "bandage" | "firstaid" | "food" | "arrows";

export type Chest = {
  x: number;
  y: number;
  width: number;
  height: number;
  opened: boolean;
  item: ChestItem;
  label: string;
};

export type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Moving platform: oscillates around its spawn point on this axis. */
  axis?: "x" | "y";
  range?: number;
  speed?: number;
  /** Runtime oscillation state (set when the level loads). */
  baseX?: number;
  baseY?: number;
  moveT?: number;
};

/** A bouncy mushroom: landing on it launches the knight high up. */
export type Bounce = { x: number; y: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type Arrow = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

export type Pail = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type KeyDrop = {
  x: number;
  y: number;
  vy: number;
  collected: boolean;
};

/** Victory flag dropped by a defeated boss; grabbing it ends the level. */
export type FlagDrop = {
  x: number;
  y: number;
  vy: number;
  planted: boolean;
  collected: boolean;
  color: string;
  wave: number;
  /** Bigger chapter-ending flag dropped by the boss. */
  big: boolean;
  /** Scene-exit flag: takes you to the next scene instead of ending the chapter. */
  isSceneExit: boolean;
};

export type Cage = {
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
};

export type BossPhase = "active" | "landing" | "resting" | "taking_off";

export type Boss = {
  kind: BossKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  state: BossPhase;
  timer: number;
  projectiles: Projectile[];
  restCount: number;
  flash: number;
  dir: number;
  flying: boolean;
  restY: number;
  hoverY: number;
};

export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  color: string;
  shape: "ball" | "bolt" | "rock" | "feather";
};

export type TNT = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
  exploded: boolean;
};
