import { createFileRoute } from "@tanstack/react-router";
import p2pLogo from "@/assets/p2p-logo.png.asset.json";

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
  const games = ["Deathrun 3d", "Bitlife", "blockblast", "Cookie clicker"];
  const proxies = [
    "https://duck.seontology.com/",
    "https://duck.bestmath.top/",
    "https://duck.cadou.ro/",
    "https://resources.dns.ggdns.top/",
    "https://goosemath.top/",
    "https://duckify.top/",
    "https://duck.stuntsimulator.com/",
    "https://duck.bestclass.top/",
    "https://study.mapsguesser.com/",
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 px-6 py-4">
        <h1 className="text-sm font-medium tracking-wide text-muted-foreground">
          Game Websight — click logo for more ————————————
        </h1>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-base leading-relaxed text-foreground/90">
          Hello this is a fully coded game website made by P2P. I will put settings and such here
          along with info — sorry not alot of games, we are currently in V2. Small updates won't
          change the number because I am lazy. Also submit the proxys to the feedback area please.
          Code is private — ask me if you want it, but it contains alot so I'll do my best to hide
          it. :) Sorry not alot of games right now. I'll make it up with duckmath links for life.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>————————————</span>
          {proxies.map((p) => (
            <a
              key={p}
              href={p}
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {p}
            </a>
          ))}
          <span>————————————</span>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center px-6 py-20">
        <img
          src={p2pLogo.url}
          alt="P2P logo"
          className="w-80 max-w-full drop-shadow-[0_20px_60px_rgba(234,88,12,0.45)]"
        />
        <p className="mt-10 text-5xl font-black tracking-tight text-foreground/90 sm:text-7xl">
          PRIVATE PRERELEASE
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="flex flex-wrap items-center gap-3">
          {games.map((g, i) => (
            <div key={g} className="flex items-center gap-3">
              <button className="rounded-md bg-primary px-5 py-2 text-base font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90">
                {g}
              </button>
              {i < games.length - 1 && <span className="text-muted-foreground">———</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
