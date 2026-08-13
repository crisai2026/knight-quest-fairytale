import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  handleKeyDown,
  handleKeyUp,
  renderGame,
  updateGame,
} from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const p = state.player;
  const pad = 16;
  const heartSize = 18;
  const gap = 4;

  ctx.font = "bold 14px sans-serif";

  for (let i = 0; i < p.maxHealth; i++) {
    const x = pad + i * (heartSize + gap);
    const y = pad;
    ctx.fillStyle = i < Math.floor(p.health) ? "#ef4444" : "#374151";
    ctx.beginPath();
    ctx.moveTo(x + heartSize / 2, y + 4);
    ctx.bezierCurveTo(x, y, x, y + heartSize / 1.5, x + heartSize / 2, y + heartSize);
    ctx.bezierCurveTo(x + heartSize, y + heartSize / 1.5, x + heartSize, y, x + heartSize / 2, y + 4);
    ctx.fill();
  }

  const barX = pad;
  const barY = pad + heartSize + 8;
  const barW = 120;
  const barH = 12;
  ctx.fillStyle = "#374151";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(barX, barY, barW * (p.hunger / p.maxHunger), barH);
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Hunger", barX + barW + 8, barY + 10);

  const infoY = barY + barH + 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    `Weapon: ${p.hasBow ? (p.weapon === "sword" ? "Sword" : "Bow") : "Sword"}${p.hasBow ? ` (R)   Arrows: ${p.arrowsLeft}` : "   Bow: locked"}   TNT: ${p.tnt}${p.hasKey ? "   Key: yes" : ""}`,
    barX,
    infoY
  );

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(state.levelName, barX, infoY + 20);
  ctx.font = "bold 14px sans-serif";


  if (state.dragon) {
    const dx = CANVAS_WIDTH - pad - 160;
    const dy = pad;
    ctx.fillStyle = "#374151";
    ctx.fillRect(dx, dy, 150, 16);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(dx, dy, 150 * (state.dragon.health / state.dragon.maxHealth), 16);
    ctx.strokeStyle = "#9ca3af";
    ctx.strokeRect(dx, dy, 150, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Dragon ${state.dragon.health}/${state.dragon.maxHealth}`, dx, dy + 30);
  }


  if (state.message) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, CANVAS_HEIGHT / 2 - 30, CANVAS_WIDTH, 60);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    const textWidth = ctx.measureText(state.message).width;
    ctx.fillText(state.message, (CANVAS_WIDTH - textWidth) / 2, CANVAS_HEIGHT / 2 + 6);
  }

  if (!state.started) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    const title = "Knight & Princess";
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, (CANVAS_WIDTH - titleWidth) / 2, CANVAS_HEIGHT / 2 - 40);
    ctx.font = "16px sans-serif";
    const sub = "Press any key to start";
    const subWidth = ctx.measureText(sub).width;
    ctx.fillText(sub, (CANVAS_WIDTH - subWidth) / 2, CANVAS_HEIGHT / 2 + 10);
  }

  if (state.mode === "won") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 36px sans-serif";
    const text = "The End";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (CANVAS_WIDTH - textWidth) / 2, CANVAS_HEIGHT / 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    const hint = "Press Enter to play again";
    const hintWidth = ctx.measureText(hint).width;
    ctx.fillText(hint, (CANVAS_WIDTH - hintWidth) / 2, CANVAS_HEIGHT / 2 + 40);
  }

  if (state.mode === "gameover") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 32px sans-serif";
    const text = "Game Over";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (CANVAS_WIDTH - textWidth) / 2, CANVAS_HEIGHT / 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    const hint = `Press Enter to retry ${state.levelName}`;
    ctx.fillText(hint, (CANVAS_WIDTH - ctx.measureText(hint).width) / 2, CANVAS_HEIGHT / 2 + 40);
  }

}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(stateRef.current, e.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUp(stateRef.current, e.key.toLowerCase());
    };
    (window as unknown as { __gs?: unknown }).__gs = stateRef.current;


    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    
    const loop = () => {
      updateGame(stateRef.current);
      renderGame(ctx, stateRef.current);
      drawHUD(ctx, stateRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const resize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 1120);
      setScale(maxWidth / CANVAS_WIDTH);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div
        className="relative overflow-hidden rounded-lg border-4 border-slate-700 shadow-2xl"
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block cursor-pointer"
          onClick={() => {
            stateRef.current.started = true;
          }}
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
            imageRendering: "pixelated",
          }}
        />
      </div>
      <p className="mt-4 max-w-2xl text-center text-sm text-slate-400">
        Seven levels: sunny forest, night forest, beach, deep ocean, village, desert, and the dragon's castle. A/D or
        Arrows to move, Shift to sprint, Space to jump (W/Space to swim up, S to dive), R to switch sword and bow once
        you find it in the village, F to attack, E for chests, TNT pails, the dragon's key and the princess's cage.
      </p>

    </div>
  );
}
