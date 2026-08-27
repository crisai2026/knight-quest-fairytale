import type { MinigameKind, MinigameState, MinigameObject } from "./types";
import { sfx } from "./audio";

export const MINIGAME_WIDTH = 800;
export const MINIGAME_HEIGHT = 600;
const FLOOR_Y = 470;
const DURATION = 1500; // 25 seconds at 60fps

const FLOWER_COLORS: { name: string; color: string }[] = [
  { name: "Red", color: "#ef4444" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Yellow", color: "#facc15" },
];

const TITLES: Record<MinigameKind, { title: string; hint: string }> = {
  feed: { title: "Feed the Animals", hint: "A/D to move • E to feed a hungry animal" },
  loaves: { title: "Catch the Loaves", hint: "A/D to move • catch the bread before it lands" },
  flowers: { title: "Pick the Flowers", hint: "A/D to move • E to pick the colour Tilda asks for" },
  targets: { title: "Target Practice", hint: "A/D to move • F to strike the target" },
};

function obj(x: number, y: number, color: string, tag: string, vy = 0): MinigameObject {
  return { x, y, color, tag, vy, alive: true, wobble: Math.random() * Math.PI * 2 };
}

function randomFlower() {
  return FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]!;
}

export function createMinigame(kind: MinigameKind, best: number): MinigameState {
  const meta = TITLES[kind];
  const state: MinigameState = {
    kind,
    title: meta.title,
    hint: meta.hint,
    timer: DURATION,
    score: 0,
    best,
    objects: [],
    spawnTimer: 0,
    prompt: "",
    playerX: MINIGAME_WIDTH / 2,
    finished: false,
    payout: 0,
  };

  if (kind === "feed") {
    for (let i = 0; i < 3; i++) {
      state.objects.push(obj(120 + i * 240, FLOOR_Y, "#fda4af", i === 0 ? "pig" : i === 1 ? "chicken" : "cow"));
    }
  } else if (kind === "flowers") {
    for (let i = 0; i < 6; i++) {
      const f = randomFlower();
      state.objects.push(obj(80 + i * 120, FLOOR_Y, f.color, f.name));
    }
    state.prompt = randomFlower().name;
  } else if (kind === "targets") {
    for (let i = 0; i < 3; i++) {
      state.objects.push(obj(150 + i * 240, FLOOR_Y, "#f59e0b", "target"));
      state.objects[i]!.alive = i === 0;
    }
  }

  return state;
}

/** Returns coins earned when the mini-game ends, or null while it is still running. */
export function updateMinigame(m: MinigameState, keys: Record<string, boolean>): number | null {
  if (m.finished) return null;

  if (keys["a"] || keys["arrowleft"]) m.playerX -= 6;
  if (keys["d"] || keys["arrowright"]) m.playerX += 6;
  m.playerX = Math.max(30, Math.min(MINIGAME_WIDTH - 30, m.playerX));

  m.timer--;

  if (m.kind === "loaves") {
    m.spawnTimer--;
    if (m.spawnTimer <= 0) {
      m.spawnTimer = 40 + Math.floor(Math.random() * 30);
      m.objects.push(obj(60 + Math.random() * (MINIGAME_WIDTH - 120), -20, "#d97706", "loaf", 2.6 + Math.random() * 1.6));
    }
    for (const o of m.objects) {
      if (!o.alive) continue;
      o.y += o.vy;
      if (Math.abs(o.x - m.playerX) < 40 && o.y > FLOOR_Y - 60 && o.y < FLOOR_Y + 10) {
        o.alive = false;
        m.score++;
        sfx.coin();
      } else if (o.y > FLOOR_Y + 20) {
        o.alive = false;
      }
    }
    m.objects = m.objects.filter((o) => o.alive);
  } else if (m.kind === "feed") {
    for (const o of m.objects) {
      o.wobble += 0.08;
      if (o.alive && keys["e"] && Math.abs(o.x - m.playerX) < 55) {
        keys["e"] = false;
        o.alive = false;
        m.score++;
        sfx.chest();
        o.x = 80 + Math.random() * (MINIGAME_WIDTH - 160);
        o.alive = true;
      }
    }
  } else if (m.kind === "flowers") {
    for (const o of m.objects) {
      o.wobble += 0.05;
      if (keys["e"] && Math.abs(o.x - m.playerX) < 45) {
        keys["e"] = false;
        if (o.tag === m.prompt) {
          m.score++;
          sfx.coin();
        } else {
          m.score = Math.max(0, m.score - 1);
          sfx.deny();
        }
        const f = randomFlower();
        o.tag = f.name;
        o.color = f.color;
        m.prompt = randomFlower().name;
      }
    }
  } else {
    // targets
    for (const o of m.objects) {
      o.wobble += 0.1;
      if (o.alive && keys["f"] && Math.abs(o.x - m.playerX) < 55) {
        keys["f"] = false;
        o.alive = false;
        m.score++;
        sfx.furryHit();
        m.spawnTimer = 20;
      }
    }
    if (!m.objects.some((o) => o.alive)) {
      m.spawnTimer--;
      if (m.spawnTimer <= 0) {
        const pick = m.objects[Math.floor(Math.random() * m.objects.length)]!;
        pick.x = 80 + Math.random() * (MINIGAME_WIDTH - 160);
        pick.alive = true;
      }
    }
  }

  if (m.timer <= 0) {
    m.finished = true;
    const bonus = m.score > m.best ? 10 : 0;
    m.payout = m.score * 2 + bonus;
    m.best = Math.max(m.best, m.score);
    return m.payout;
  }
  return null;
}

function drawHelper(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x - 14, FLOOR_Y - 46, 28, 46);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x - 10, FLOOR_Y - 60, 20, 16);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 6, FLOOR_Y - 54, 4, 4);
  ctx.fillRect(x + 2, FLOOR_Y - 54, 4, 4);
}

export function drawMinigame(ctx: CanvasRenderingContext2D, m: MinigameState) {
  const grad = ctx.createLinearGradient(0, 0, 0, MINIGAME_HEIGHT);
  grad.addColorStop(0, "#bfdbfe");
  grad.addColorStop(1, "#dcfce7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MINIGAME_WIDTH, MINIGAME_HEIGHT);

  ctx.fillStyle = "#4d7c0f";
  ctx.fillRect(0, FLOOR_Y, MINIGAME_WIDTH, MINIGAME_HEIGHT - FLOOR_Y);
  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, FLOOR_Y, MINIGAME_WIDTH, 6);

  for (const o of m.objects) {
    if (!o.alive) continue;
    if (m.kind === "loaves") {
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (m.kind === "feed") {
      const bob = Math.sin(o.wobble) * 3;
      ctx.fillStyle = o.tag === "pig" ? "#fda4af" : o.tag === "chicken" ? "#fef3c7" : "#e7e5e4";
      ctx.fillRect(o.x - 26, FLOOR_Y - 34 + bob, 52, 34);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(o.x + 12, FLOOR_Y - 28 + bob, 4, 4);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(o.x - 26, FLOOR_Y - 4, 52, 4);
      ctx.fillStyle = "#0f172a";
      ctx.font = "11px sans-serif";
      ctx.fillText(o.tag, o.x - 16, FLOOR_Y - 44 + bob);
    } else if (m.kind === "flowers") {
      ctx.strokeStyle = "#15803d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x, FLOOR_Y);
      ctx.lineTo(o.x, FLOOR_Y - 40);
      ctx.stroke();
      ctx.fillStyle = o.color;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.sin(o.wobble) * 0.2;
        ctx.beginPath();
        ctx.arc(o.x + Math.cos(a) * 10, FLOOR_Y - 46 + Math.sin(a) * 10, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(o.x, FLOOR_Y - 46, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bob = Math.sin(o.wobble) * 4;
      ctx.fillStyle = "#78350f";
      ctx.fillRect(o.x - 4, FLOOR_Y - 60 + bob, 8, 60);
      const rings = ["#f8fafc", "#ef4444", "#f8fafc"];
      rings.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(o.x, FLOOR_Y - 78 + bob, 24 - i * 8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  drawHelper(ctx, m.playerX);

  ctx.fillStyle = "rgba(15,23,42,0.75)";
  ctx.fillRect(0, 0, MINIGAME_WIDTH, 74);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(m.title, 20, 30);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "14px sans-serif";
  ctx.fillText(m.hint, 20, 52);
  ctx.fillText(`Score: ${m.score}   Best: ${m.best}`, MINIGAME_WIDTH - 240, 30);
  ctx.fillText(`Time: ${Math.ceil(m.timer / 60)}s`, MINIGAME_WIDTH - 240, 52);

  if (m.kind === "flowers") {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 22px sans-serif";
    const t = `Pick a ${m.prompt} flower!`;
    ctx.fillText(t, MINIGAME_WIDTH / 2 - ctx.measureText(t).width / 2, 120);
  }

  if (m.finished) {
    ctx.fillStyle = "rgba(2,6,23,0.85)";
    ctx.fillRect(0, 0, MINIGAME_WIDTH, MINIGAME_HEIGHT);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 30px sans-serif";
    const t = `Time! Score ${m.score}`;
    ctx.fillText(t, MINIGAME_WIDTH / 2 - ctx.measureText(t).width / 2, MINIGAME_HEIGHT / 2 - 20);
    ctx.fillStyle = "#facc15";
    ctx.font = "20px sans-serif";
    const c = `You earned ${m.payout} coins`;
    ctx.fillText(c, MINIGAME_WIDTH / 2 - ctx.measureText(c).width / 2, MINIGAME_HEIGHT / 2 + 16);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "15px sans-serif";
    const h = "Press E to go back to the village";
    ctx.fillText(h, MINIGAME_WIDTH / 2 - ctx.measureText(h).width / 2, MINIGAME_HEIGHT / 2 + 56);
  }
}
