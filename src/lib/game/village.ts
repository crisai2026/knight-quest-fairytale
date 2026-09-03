/**
 * Top-down village hub: layout, collision and drawing.
 * The village is no longer a platformer screen — the knight walks in 8 directions
 * around a small town seen from above.
 */

export const VILLAGE_W = 1600;
export const VILLAGE_H = 1200;

export type Rect = { x: number; y: number; w: number; h: number };

export type PropKind =
  | "house"
  | "shophouse"
  | "bakery"
  | "tailor"
  | "barn"
  | "well"
  | "tree"
  | "bush"
  | "fence-h"
  | "fence-v"
  | "stall"
  | "dummy"
  | "crate"
  | "rock";

export type VillageProp = Rect & { kind: PropKind; solid: boolean };

const WALL = 40;

/** Grass paths (drawn, never solid). */
export const VILLAGE_PATHS: Rect[] = [
  { x: 120, y: 560, w: 1360, h: 90 }, // main east-west road
  { x: 720, y: 120, w: 90, h: 980 }, // main north-south road
  { x: 300, y: 860, w: 480, h: 70 },
  { x: 800, y: 860, w: 460, h: 70 },
];

export const VILLAGE_POND: Rect = { x: 170, y: 900, w: 250, h: 170 };

export const VILLAGE_PROPS: VillageProp[] = [
  // Town wall
  { kind: "fence-h", x: 0, y: 0, w: VILLAGE_W, h: WALL, solid: true },
  { kind: "fence-h", x: 0, y: VILLAGE_H - WALL, w: VILLAGE_W, h: WALL, solid: true },
  { kind: "fence-v", x: 0, y: 0, w: WALL, h: VILLAGE_H, solid: true },
  { kind: "fence-v", x: VILLAGE_W - WALL, y: 0, w: WALL, h: VILLAGE_H, solid: true },

  // North side: mayor + shop
  { kind: "house", x: 520, y: 150, w: 180, h: 150, solid: true },
  { kind: "shophouse", x: 860, y: 150, w: 200, h: 150, solid: true },
  { kind: "stall", x: 880, y: 330, w: 120, h: 60, solid: true },

  // North-east: bakery
  { kind: "bakery", x: 1230, y: 210, w: 190, h: 150, solid: true },

  // West: Bram's farm
  { kind: "barn", x: 130, y: 170, w: 200, h: 160, solid: true },
  { kind: "fence-h", x: 120, y: 380, w: 320, h: 16, solid: true },
  { kind: "fence-h", x: 120, y: 500, w: 320, h: 16, solid: true },
  { kind: "fence-v", x: 120, y: 380, w: 16, h: 136, solid: true },
  { kind: "fence-v", x: 424, y: 380, w: 16, h: 60, solid: true },

  // Town square
  { kind: "well", x: 740, y: 690, w: 90, h: 90, solid: true },
  { kind: "crate", x: 620, y: 690, w: 46, h: 46, solid: true },
  { kind: "crate", x: 620, y: 740, w: 46, h: 46, solid: true },

  // South: tailor
  { kind: "tailor", x: 560, y: 940, w: 180, h: 140, solid: true },

  // South-east: Fenwick's training yard
  { kind: "dummy", x: 1130, y: 940, w: 34, h: 46, solid: true },
  { kind: "dummy", x: 1240, y: 990, w: 34, h: 46, solid: true },
  { kind: "dummy", x: 1350, y: 930, w: 34, h: 46, solid: true },
  { kind: "fence-h", x: 1090, y: 880, w: 340, h: 16, solid: true },

  // Trees and rocks
  { kind: "tree", x: 430, y: 660, w: 56, h: 70, solid: true },
  { kind: "tree", x: 480, y: 760, w: 56, h: 70, solid: true },
  { kind: "tree", x: 980, y: 660, w: 56, h: 70, solid: true },
  { kind: "tree", x: 1080, y: 720, w: 56, h: 70, solid: true },
  { kind: "tree", x: 1460, y: 380, w: 56, h: 70, solid: true },
  { kind: "tree", x: 240, y: 690, w: 56, h: 70, solid: true },
  { kind: "tree", x: 900, y: 1060, w: 56, h: 70, solid: true },
  { kind: "bush", x: 640, y: 470, w: 40, h: 32, solid: false },
  { kind: "bush", x: 1160, y: 470, w: 40, h: 32, solid: false },
  { kind: "bush", x: 340, y: 1000, w: 40, h: 32, solid: false },
  { kind: "rock", x: 1010, y: 430, w: 44, h: 34, solid: true },
];

/** World-map board and the level portal, as top-down points (feet position). */
export const BOARD_POS = { x: 470, y: 610 };
export const PORTAL_POS = { x: 1370, y: 620 };

export const VILLAGE_SPAWN = { x: 760, y: 980 };

export function villageSolids(): Rect[] {
  const rects: Rect[] = VILLAGE_PROPS.filter((p) => p.solid).map(({ x, y, w, h }) => ({ x, y, w, h }));
  rects.push({ ...VILLAGE_POND });
  rects.push({ x: BOARD_POS.x - 60, y: BOARD_POS.y - 30, w: 120, h: 34 });
  rects.push({ x: PORTAL_POS.x - 58, y: PORTAL_POS.y - 26, w: 116, h: 30 });
  return rects;
}

/* ---------------- Drawing ---------------- */

function shade(ctx: CanvasRenderingContext2D, r: Rect, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

export function drawVillageGround(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
  ctx.save();
  ctx.translate(-camX, -camY);

  ctx.fillStyle = "#4d7c2f";
  ctx.fillRect(0, 0, VILLAGE_W, VILLAGE_H);

  // grass texture
  ctx.fillStyle = "#5f9138";
  for (let y = 0; y < VILLAGE_H; y += 48) {
    for (let x = (y / 48) % 2 === 0 ? 0 : 24; x < VILLAGE_W; x += 48) {
      ctx.fillRect(x, y, 24, 24);
    }
  }

  // dirt roads
  for (const p of VILLAGE_PATHS) {
    shade(ctx, p, "#b98b52");
    ctx.fillStyle = "rgba(120,83,44,0.35)";
    for (let i = 0; i < p.w; i += 26) ctx.fillRect(p.x + i + 6, p.y + ((i / 26) % 3) * 18 + 6, 12, 8);
  }

  // pond
  const pond = VILLAGE_POND;
  ctx.fillStyle = "#1d4ed8";
  ctx.beginPath();
  ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2 - 8, pond.w / 2 - 16, pond.h / 2 - 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a3a3a3";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawHouse(ctx: CanvasRenderingContext2D, p: VillageProp, wall: string, roof: string, sign?: string) {
  const { x, y, w, h } = p;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x + 8, y + h - 8, w, 14);
  ctx.fillStyle = wall;
  ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + h * 0.45);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.lineTo(x + w + 10, y + h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3f2a16";
  ctx.fillRect(x + w / 2 - 18, y + h - 46, 36, 46);
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(x + 16, y + h * 0.55, 30, 26);
  ctx.fillRect(x + w - 46, y + h * 0.55, 30, 26);
  if (sign) {
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(x + w / 2 - 40, y + h * 0.42 - 22, 80, 20);
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(sign, x + w / 2 - ctx.measureText(sign).width / 2, y + h * 0.42 - 8);
  }
}

function drawProp(ctx: CanvasRenderingContext2D, p: VillageProp) {
  const { x, y, w, h } = p;
  switch (p.kind) {
    case "house":
      drawHouse(ctx, p, "#e7d6b8", "#b45309", "TOWN HALL");
      break;
    case "shophouse":
      drawHouse(ctx, p, "#d1fae5", "#0d9488", "SHOP");
      break;
    case "bakery":
      drawHouse(ctx, p, "#fde68a", "#c2410c", "BAKERY");
      break;
    case "tailor":
      drawHouse(ctx, p, "#fbcfe8", "#be185d", "TAILOR");
      break;
    case "barn":
      drawHouse(ctx, p, "#fca5a5", "#7f1d1d", "FARM");
      break;
    case "well": {
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.7, w / 2, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.7, w / 2 - 12, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x + 6, y - 26, 8, 60);
      ctx.fillRect(x + w - 14, y - 26, 8, 60);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(x - 4, y - 36, w + 8, 16);
      break;
    }
    case "tree":
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + 6, y + h - 4, w / 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x + w / 2 - 7, y + h - 26, 14, 26);
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h - 44, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(x + w / 2 - 10, y + h - 54, 20, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bush":
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rock":
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + 6, y + h / 2 + 4, w / 3, h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "crate":
      ctx.fillStyle = "#a16207";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#713f12";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      break;
    case "stall":
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x, y + h - 16, w, 16);
      ctx.fillStyle = "#ef4444";
      for (let i = 0; i < w; i += 24) {
        ctx.fillStyle = (i / 24) % 2 === 0 ? "#ef4444" : "#f8fafc";
        ctx.fillRect(x + i, y, Math.min(24, w - i), 22);
      }
      break;
    case "dummy":
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x + w / 2 - 4, y + 16, 8, h - 16);
      ctx.fillStyle = "#d6b483";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a16207";
      ctx.fillRect(x - 6, y + 22, w + 12, 10);
      break;
    case "fence-h":
    case "fence-v": {
      const tall = p.kind === "fence-v";
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a97142";
      if (tall) for (let i = 0; i < h; i += 30) ctx.fillRect(x, y + i, w, 12);
      else for (let i = 0; i < w; i += 30) ctx.fillRect(x + i, y, 12, h);
      break;
    }
  }
}

/** Depth-sorted props; `extras` are the knight/NPCs so they hide behind buildings. */
export function drawVillageProps(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  extras: { y: number; draw: (ctx: CanvasRenderingContext2D) => void }[]
) {
  ctx.save();
  ctx.translate(-camX, -camY);
  const items: { y: number; draw: (c: CanvasRenderingContext2D) => void }[] = [
    ...VILLAGE_PROPS.filter((p) => !isOuterWall(p)).map((p) => ({
      y: p.y + p.h,
      draw: (c: CanvasRenderingContext2D) => drawProp(c, p),
    })),
    ...extras,
  ];
  // outer wall drawn first, underneath everything
  for (const p of VILLAGE_PROPS) {
    if ((p.kind === "fence-h" && p.w >= VILLAGE_W) || (p.kind === "fence-v" && p.h >= VILLAGE_H)) drawProp(ctx, p);
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw(ctx);
  ctx.restore();
}
