import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  handleKeyDown,
  confirmLevelStart,
  handleKeyUp,
  renderGame,
  updateGame,
} from "@/lib/game/engine";
import { isMusicEnabled, setMusicEnabled, unlockAudio } from "@/lib/game/audio";
import type { GameState } from "@/lib/game/types";

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  if (
    state.mode === "intro" ||
    state.mode === "minigame" ||
    state.mode === "map" ||
    state.mode === "levelstart"
  )
    return;
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

  ctx.fillStyle = "#facc15";
  ctx.fillText(`Coins: ${p.coins}`, barX, infoY + 20);
  if (p.items.length > 0) {
    ctx.fillStyle = "#a5b4fc";
    ctx.fillText(`Carrying: ${p.items.join(", ")}`, barX + 90, infoY + 20);
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(state.levelName, barX, infoY + 40);
  ctx.font = "bold 14px sans-serif";



  const boss = state.boss;
  if (boss) {
    const dx = CANVAS_WIDTH - pad - 200;
    const dy = pad;
    ctx.fillStyle = "#374151";
    ctx.fillRect(dx, dy, 190, 16);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(dx, dy, 190 * Math.max(0, boss.health / boss.maxHealth), 16);
    ctx.strokeStyle = "#9ca3af";
    ctx.strokeRect(dx, dy, 190, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${boss.name} ${Math.max(0, boss.health)}/${boss.maxHealth}`, dx, dy + 30);
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
    if (state.player.reachedVillage) {
      ctx.fillStyle = "#4ade80";
      const hint2 = "Press V to respawn in the village";
      ctx.fillText(hint2, (CANVAS_WIDTH - ctx.measureText(hint2).width) / 2, CANVAS_HEIGHT / 2 + 68);
    }
  }

}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const [musicOn, setMusicOn] = useState(true);
  const [isTouch, setIsTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    setMusicOn(isMusicEnabled());
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      unlockAudio();
      handleKeyDown(stateRef.current, e.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUp(stateRef.current, e.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    (window as unknown as { __gs?: GameState }).__gs = stateRef.current;

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
      const touch = window.matchMedia("(pointer: coarse)").matches;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (touch) {
        // Fullscreen "cover" scaling: fill the phone screen, crop slightly if needed.
        const cover = Math.max(vw / CANVAS_WIDTH, vh / CANVAS_HEIGHT);
        const contain = Math.min(vw / CANVAS_WIDTH, vh / CANVAS_HEIGHT);
        // Blend towards cover but never crop more than ~18% of a dimension.
        setScale(Math.min(cover, contain * 1.18));
      } else {
        const maxWidth = Math.min(vw - 16, 1120);
        const maxHeight = vh - 16;
        setScale(Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT));
      }
      setPortrait(vh > vw);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, []);

  useEffect(() => {
    if (!isTouch) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isTouch]);

  const press = (key: string) => {
    unlockAudio();
    stateRef.current.started = true;
    handleKeyDown(stateRef.current, key);
  };
  const release = (key: string) => {
    handleKeyUp(stateRef.current, key);
  };

  const TouchButton = ({ keyName, label, className = "" }: { keyName: string; label: string; className?: string }) => (
    <button
      type="button"
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(keyName);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        release(keyName);
      }}
      onPointerCancel={() => release(keyName)}
      onPointerLeave={() => release(keyName)}
      className={`select-none rounded-full border border-slate-300/40 bg-slate-900/55 text-lg font-black text-slate-50 backdrop-blur-sm active:bg-slate-100/30 ${className}`}
      style={{ touchAction: "none" }}
    >
      {label}
    </button>
  );

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block cursor-pointer"
      onClick={() => {
        unlockAudio();
        stateRef.current.started = true;
        confirmLevelStart(stateRef.current);
      }}
      style={{
        width: CANVAS_WIDTH * scale,
        height: CANVAS_HEIGHT * scale,
        imageRendering: "pixelated",
        touchAction: "none",
      }}
    />
  );

  const musicButton = (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        const next = !musicOn;
        setMusicOn(next);
        setMusicEnabled(next);
      }}
      className={
        isTouch
          ? "absolute right-2 top-2 z-20 h-9 w-9 rounded-full border border-slate-400/50 bg-slate-900/50 text-base text-slate-100"
          : "absolute right-3 top-3 rounded-md border border-slate-500/60 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:text-sm"
      }
      aria-label={musicOn ? "Turn music off" : "Turn music on"}
    >
      {isTouch ? (musicOn ? "♪" : "✕") : musicOn ? "Music: On" : "Music: Off"}
    </button>
  );

  if (isTouch) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-hidden overscroll-none bg-slate-950"
        style={{ touchAction: "none" }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{canvasEl}</div>

        {musicButton}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-3 pb-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="pointer-events-auto flex items-end gap-2 opacity-60">
            <TouchButton keyName="a" label="←" className="h-14 w-14" />
            <TouchButton keyName="d" label="→" className="h-14 w-14" />
            <TouchButton keyName="shift" label="Run" className="h-11 w-11 text-[11px]" />
          </div>
          <div className="pointer-events-auto flex items-end gap-2 opacity-60">
            <TouchButton keyName="r" label="R" className="h-11 w-11 text-sm" />
            <TouchButton keyName="s" label="↓" className="h-11 w-11 text-sm" />
            <TouchButton keyName="e" label="E" className="h-14 w-14" />
            <TouchButton keyName="f" label="F" className="h-14 w-14" />
            <TouchButton keyName=" " label="Jump" className="h-16 w-16 text-[11px]" />
          </div>
        </div>

        {portrait && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 px-6 text-center">
            <p className="text-base font-bold text-slate-100">Rotate your phone to play</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-2 sm:p-4">
      <div
        className="relative overflow-hidden rounded-lg border-4 border-slate-700 shadow-2xl"
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          touchAction: "none",
        }}
      >
        {canvasEl}
        {musicButton}
      </div>

      <p className="mt-4 hidden max-w-2xl text-center text-sm text-slate-400 sm:block">
        Ten levels, ten bosses — forest, night, beach, ocean, sky, jungle, snow, desert, snow mountain and the dragon's
        castle. The village is your hub: read the world map board, help villagers in mini-games, buy from the shop, then
        step into the portal. A/D or Arrows to move, Shift to sprint, Space to jump (W/Space to swim up, S to dive), R to
        switch sword and bow, F to attack, E for chests, TNT pails, villagers and the princess's cage.
      </p>
    </div>
  );
}

