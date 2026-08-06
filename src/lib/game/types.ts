export type GameMode = "playing" | "cutscene" | "gameover" | "won";

export type GameState = {
  mode: GameMode;
  cameraX: number;
  player: Player;
  enemies: Enemy[];
  chests: Chest[];
  platforms: Platform[];
  particles: Particle[];
  dragon: Dragon | null;
  tnt: TNT | null;
  message: string;
  messageTimer: number;
  cutsceneTimer: number;
  cutscenePhase: number;
  keys: Record<string, boolean>;
  started: boolean;
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
};

export type Enemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  patrolStart: number;
  patrolEnd: number;
  flash: number;
};

export type ChestItem = "bandage" | "firstaid" | "food";

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

export type DragonState = "flying" | "breathing" | "landing" | "resting" | "taking_off";

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
