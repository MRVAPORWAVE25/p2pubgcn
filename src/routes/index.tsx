import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import p2pLogo from "@/assets/p2p-logo.png.asset.json";
import { InteractiveParticles } from "@/components/InteractiveParticles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "P2P — Game Website" },
      { name: "description", content: "P2P game website with curated games and proxy links." },
      { property: "og:title", content: "P2P — Game Website" },
      { property: "og:description", content: "P2P game website with curated games and proxy links." },
    ],
  }),
  component: Index,
});

type Item = { name: string; url: string };
const GAMES: Item[] = [
  { name: "Death Run 3D", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/delfordraw@main/dr3d.svg" },
  { name: "Bitlife", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/delfordraw@main/bitl.svg" },
  { name: "Block Blast", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/delfordraw@main/blbst.svg" },
  { name: "Cookie Clicker", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/beegstuf@main/cookieclicker/cookie.svg" },
  { name: "JENNY", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/JennyGameFiles@main/JENNY.svg" },
  { name: "Endacopia", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/beegstuf@main/Endacopia/Endacopia.svg" },
  { name: "Burrito Bison", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/beegstuf@main/BurritoBison-main/burbis.svg" },
  { name: "Geometry Dash", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/web-dashers.github.io@main/dash.svg" },
];
const SITES: Item[] = [
  { name: "Duck Math", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/DuckMath@main/duck.svg" },
];

type View = "logo" | "where" | "games" | "sites";

function Index() {
  const [view, setView] = useState<View>("logo");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <InteractiveParticles />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.25)_0%,rgba(0,0,0,0)_70%)] blur-2xl" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        {view === "logo" && (
          <img
            src={p2pLogo.url}
            alt="P2P logo"
            draggable={false}
            onClick={() => setView("where")}
            className="w-[28rem] max-w-[80vw] cursor-pointer select-none animate-[pulse_4s_ease-in-out_infinite] hover:animate-[pulse_0.6s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(251,146,60,0.7)] [filter:drop-shadow(0_0_60px_rgba(251,146,60,0.5))_drop-shadow(0_0_120px_rgba(234,88,12,0.4))] [-webkit-user-drag:none]"
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          />
        )}

        {view === "where" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
              Where to?
            </h1>
            <div className="flex gap-4">
              <MenuButton onClick={() => setView("games")}>Games</MenuButton>
              <MenuButton onClick={() => setView("sites")}>Sites</MenuButton>
            </div>
          </div>
        )}

        {view === "games" && (
          <ItemGrid title="Games" items={GAMES} onPick={setIframeUrl} onBack={() => setView("where")} />
        )}
        {view === "sites" && (
          <ItemGrid title="Sites" items={SITES} onPick={setIframeUrl} onBack={() => setView("where")} />
        )}
      </main>

      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black animate-fade-in">
          <button
            onClick={() => setIframeUrl(null)}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-orange-500/90 text-black font-bold text-xl flex items-center justify-center hover:bg-orange-400 transition-colors"
          >
            ✕
          </button>
          <iframe src={iframeUrl} title="content" className="h-full w-full border-0" />
        </div>
      )}
    </div>
  );
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-8 py-3 rounded-lg border border-orange-500/50 bg-orange-500/10 text-orange-300 text-lg font-medium hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-200 transition-all hover-scale [text-shadow:0_0_15px_rgba(251,146,60,0.5)]"
    >
      {children}
    </button>
  );
}

function ItemGrid({
  title,
  items,
  onPick,
  onBack,
}: {
  title: string;
  items: Item[];
  onPick: (url: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <h2 className="text-4xl md:text-5xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
        {title}
      </h2>
      <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
        {items.map((it) => (
          <MenuButton key={it.name} onClick={() => onPick(it.url)}>
            {it.name}
          </MenuButton>
        ))}
      </div>
      <button
        onClick={onBack}
        className="text-orange-300/70 text-sm hover:text-orange-200 underline-offset-4 hover:underline"
      >
        ← Back
      </button>
    </div>
  );
}
