import { createFileRoute } from "@tanstack/react-router";
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

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <InteractiveParticles />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.25)_0%,rgba(0,0,0,0)_70%)] blur-2xl" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <img
          src={p2pLogo.url}
          alt="P2P logo"
          className="w-[28rem] max-w-[80vw] animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(251,146,60,0.7)] [filter:drop-shadow(0_0_60px_rgba(251,146,60,0.5))_drop-shadow(0_0_120px_rgba(234,88,12,0.4))]"
        />
      </main>
    </div>
  );
}
