import type { Boss, BossKind } from "./types";

export type BossDef = {
  kind: BossKind;
  name: string;
  hp: number;
  /** Flying bosses hover then land to rest; ground bosses charge then flop down. */
  flying: boolean;
  width: number;
  height: number;
  /** Frames between attacks while active. */
  attackEvery: number;
  /** How long the active phase lasts before the boss tires. */
  activeFrames: number;
  /** How long it stays vulnerable. */
  restFrames: number;
  speed: number;
  color: string;
  accent: string;
  projectileColor: string;
  projectileShape: "ball" | "bolt" | "rock" | "feather";
  taunt: string[];
};

export const BOSSES: Record<BossKind, BossDef> = {
  furryking: {
    kind: "furryking",
    name: "The Horned King",
    hp: 40,
    flying: false,
    width: 96,
    height: 88,
    attackEvery: 110,
    activeFrames: 260,
    restFrames: 330,
    speed: 1.6,
    color: "#92400e",
    accent: "#f5f5f4",
    projectileColor: "#a16207",
    projectileShape: "rock",
    taunt: ["You poke my little cousins with that stick?", "I am the BIG one. Run away, tin can!"],
  },
  owl: {
    kind: "owl",
    name: "The Giant Owl",
    hp: 55,
    flying: true,
    width: 100,
    height: 76,
    attackEvery: 90,
    activeFrames: 270,
    restFrames: 320,
    speed: 2.4,
    color: "#78350f",
    accent: "#fde68a",
    projectileColor: "#e7e5e4",
    projectileShape: "feather",
    taunt: ["Hoooo... hoo dares walk my forest?", "I hunt in the dark. You will not even see me coming."],
  },
  crab: {
    kind: "crab",
    name: "The Giant Crab",
    hp: 70,
    flying: false,
    width: 120,
    height: 74,
    attackEvery: 95,
    activeFrames: 250,
    restFrames: 320,
    speed: 2.2,
    color: "#dc2626",
    accent: "#fecaca",
    projectileColor: "#fde68a",
    projectileShape: "ball",
    taunt: ["SNIP SNIP! This beach is mine!", "I will make a sandwich. A sand-knight-wich."],
  },
  shark: {
    kind: "shark",
    name: "The Giant Shark",
    hp: 170,
    flying: true,
    width: 140,
    height: 62,
    attackEvery: 55,
    activeFrames: 340,
    restFrames: 200,
    speed: 4,
    color: "#475569",
    accent: "#e2e8f0",
    projectileColor: "#bae6fd",
    projectileShape: "ball",
    taunt: ["You swim slowly, little armoured snack.", "The sea keeps everything it eats."],
  },
  cloud: {
    kind: "cloud",
    name: "The Thunder Cloud",
    hp: 100,
    flying: true,
    width: 130,
    height: 70,
    attackEvery: 70,
    activeFrames: 280,
    restFrames: 300,
    speed: 2.6,
    color: "#475569",
    accent: "#facc15",
    projectileColor: "#fde047",
    projectileShape: "bolt",
    taunt: ["RUMBLE... you climbed too high, knight.", "Lightning never misses twice."],
  },
  gorilla: {
    kind: "gorilla",
    name: "The Jungle Gorilla",
    hp: 120,
    flying: false,
    width: 104,
    height: 96,
    attackEvery: 85,
    activeFrames: 260,
    restFrames: 290,
    speed: 2.4,
    color: "#292524",
    accent: "#78716c",
    projectileColor: "#57534e",
    projectileShape: "rock",
    taunt: ["OOH OOH! My jungle. My rocks. Your head.", "I throw rocks farther than you can run."],
  },
  bear: {
    kind: "bear",
    name: "The Polar Bear",
    hp: 140,
    flying: false,
    width: 118,
    height: 86,
    attackEvery: 80,
    activeFrames: 270,
    restFrames: 280,
    speed: 2.8,
    color: "#f8fafc",
    accent: "#cbd5e1",
    projectileColor: "#e0f2fe",
    projectileShape: "ball",
    taunt: ["The snow hides my footsteps. Not yours.", "GRRRR! Warm knight, cold snow."],
  },
  scorpion: {
    kind: "scorpion",
    name: "The Sand Scorpion",
    hp: 160,
    flying: false,
    width: 132,
    height: 70,
    attackEvery: 70,
    activeFrames: 260,
    restFrames: 270,
    speed: 3,
    color: "#b45309",
    accent: "#fbbf24",
    projectileColor: "#84cc16",
    projectileShape: "bolt",
    taunt: ["My sting turns knights into statues.", "The desert already has enough bones. One more will do."],
  },
  wizard: {
    kind: "wizard",
    name: "Zarvok the Wizard",
    hp: 200,
    flying: true,
    width: 70,
    height: 100,
    attackEvery: 60,
    activeFrames: 280,
    restFrames: 260,
    speed: 2.4,
    color: "#4c1d95",
    accent: "#a78bfa",
    projectileColor: "#c084fc",
    projectileShape: "bolt",
    taunt: [
      "Ah, the little knight from the village.",
      "I am the dragon's right hand. He does not even know your name.",
      "You will not reach his castle. Not past me.",
    ],
  },
  dragon: {
    kind: "dragon",
    name: "The Dragon",
    hp: 260,
    flying: true,
    width: 130,
    height: 80,
    attackEvery: 60,
    activeFrames: 300,
    restFrames: 300,
    speed: 2.2,
    color: "#16a34a",
    accent: "#dc2626",
    projectileColor: "#f97316",
    projectileShape: "ball",
    taunt: [
      "So. A little knight with a little sword.",
      "My wizard failed. Fine. I never liked sharing the princess.",
      "Enough talk. BURN!",
    ],
  },
};

export function createBoss(kind: BossKind, arenaX: number, groundY: number): Boss {
  const def = BOSSES[kind];
  const restY = groundY - def.height;
  const hoverY = def.flying ? 150 : restY;
  return {
    kind,
    name: def.name,
    x: arenaX + 260,
    y: hoverY,
    width: def.width,
    height: def.height,
    health: def.hp,
    maxHealth: def.hp,
    state: "active",
    timer: 0,
    projectiles: [],
    restCount: 0,
    flash: 0,
    dir: -1,
    flying: def.flying,
    restY,
    hoverY,
  };
}
