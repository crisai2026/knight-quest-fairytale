import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "@/components/GameCanvas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Knight & Princess — 2D Platformer" },
      { name: "description", content: "Help the knight save the princess from the dragon in this browser platformer prototype." },
      { property: "og:title", content: "Knight & Princess — 2D Platformer" },
      { property: "og:description", content: "Help the knight save the princess from the dragon in this browser platformer prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <GameCanvas />;
}
