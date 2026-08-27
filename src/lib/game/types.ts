export type GameMode =
  | "intro"
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
  levelIndex: number;
  levelName: string;
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
  npcs: Npc[];
  dialogLines: string[];
  dialogIndex: number;
  dialogSpeaker: string;
  shopMessage: string;
  /** How many levels are playable (1 = only level 1). */
  unlockedLevels: number;
  /** Level chosen at the world map, shown by the village portal. */
  selectedLevel: number;
  mapCursor: number;
  minigame: MinigameState | null;
  bestScores: Record<string, number>;
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
};

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
