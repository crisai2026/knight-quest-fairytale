export type GameMode = "playing" | "cutscene" | "gameover" | "won";

export type Weapon = "sword" | "bow";

export type Biome = "sunny" | "scary" | "lava" | "castle";

export type GameState = {
  mode: GameMode;
  cameraX: number;
  player: Player;
  enemies: Enemy[];
  chests: Chest[];
  platforms: Platform[];
  particles: Particle[];
  arrows: Arrow[];
  pails: Pail[];
  dragon: Dragon | null;
  tntList: TNT[];
  keyDrop: KeyDrop | null;
  cage: Cage;
  message: string;
  messageTimer: number;
  cutsceneTimer: number;
  cutscenePhase: number;
  keys: Record<string, boolean>;
  started: boolean;
  biome: Biome;
  biomeLabelTimer: number;
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
  arrowsLeft: number;
  tnt: number;
  hasKey: boolean;
};

export type EnemyKind = "furry" | "tentacle" | "winged";

export type Enemy = {
  kind: EnemyKind;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  vx: number;
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

export type DragonState = "flying" | "landing" | "resting" | "taking_off";

export type Dragon = {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  state: DragonState;
  timer: number;
  fireballs: Fireball[];
  restCount: number;
  flash: number;
  dir: number;
};

export type Fireball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
};

export type TNT = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
  exploded: boolean;
};
