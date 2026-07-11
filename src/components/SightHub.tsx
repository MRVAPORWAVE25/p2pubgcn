import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Options } from "./Options";
import catDurr from "@/assets/cat-durr.png.asset.json";

type Tab = "posts" | "communities" | "profile" | "settings";
type Mode = "gate" | "in";

const GUEST_KEY = "sighthub_guest";

function GuestBlocked({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-orange-500/30 bg-black/40 p-6 text-center">
      <p className="text-orange-300/80">
        You must be signed in to {what}.
      </p>
      <p className="text-orange-300/50 text-sm mt-2">
        Guests can browse but can't post, chat in communities, use AI, or view profiles.
      </p>
    </div>
  );
}

export function SightHub({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("gate");
  const [tab, setTab] = useState<Tab>("posts");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? undefined });
        setMode("in");
      } else if (typeof window !== "undefined" && sessionStorage.getItem(GUEST_KEY) === "1") {
        setIsGuest(true);
        setMode("in");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) {
        setUser({ id: s.user.id, email: s.user.email ?? undefined });
        setIsGuest(false);
        sessionStorage.removeItem(GUEST_KEY);
        setMode("in");
      } else {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInGoogle = async () => {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  };

  const continueAsGuest = () => {
    sessionStorage.setItem(GUEST_KEY, "1");
    setIsGuest(true);
    setMode("in");
  };

  if (mode === "gate") {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-md">
        <h2 className="text-5xl md:text-6xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          SightHub
        </h2>
        <p className="text-orange-300/70 text-center">
          A social hub for posts, communities, and shared sites.
        </p>
        <div className="w-full flex flex-col gap-3 rounded-lg border border-orange-500/30 bg-black/40 p-6">
          <button
            onClick={signInGoogle}
            className="px-4 py-3 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200 font-medium"
          >
            Continue with Google
          </button>
          <button
            onClick={continueAsGuest}
            className="px-4 py-3 rounded border border-orange-500/30 text-orange-300/80"
          >
            Continue as guest
          </button>
          <p className="text-orange-300/50 text-xs text-center pt-1">
            Guests can browse only. Sign in to post, join communities, use AI, or make sites.
          </p>
        </div>
        <button onClick={onBack} className="text-orange-300/70 text-sm hover:text-orange-200 underline">
          ← Back
        </button>
      </div>
    );
  }

  const canDo = !!user; // logged in users can do everything, guests cannot

  return (
    <div className="w-full max-w-5xl h-[85vh] flex flex-col gap-3 animate-fade-in">
      {/* Top nav */}
      <div className="flex items-center gap-2 md:gap-4 flex-wrap rounded-lg border border-orange-500/30 bg-black/40 px-3 py-2">
        <button
          onClick={onBack}
          className="text-orange-300/70 text-sm hover:text-orange-200"
          title="Back to menu"
        >
          ←
        </button>
        <button
          onClick={() => setTab("posts")}
          className="text-2xl font-bold text-orange-400 [text-shadow:0_0_20px_rgba(251,146,60,0.5)]"
        >
          SightHub
        </button>
        <NavTab active={tab === "posts"} onClick={() => setTab("posts")}>Posts</NavTab>
        <NavTab active={tab === "communities"} onClick={() => setTab("communities")}>Communities</NavTab>
        <div className="ml-auto flex items-center gap-2">
          {canDo && (
            <button
              title="New post"
              onClick={() => alert("New post coming in the next slice.")}
              className="h-8 w-8 rounded-full border border-orange-500/60 bg-orange-500/20 text-orange-200 text-lg leading-none"
            >
              +
            </button>
          )}
          <button
            onClick={() => setTab("profile")}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-orange-500/10"
            title={user?.email ?? "Guest"}
          >
            <img src={catDurr.url} alt="" className="h-7 w-7 rounded-full object-cover border border-orange-500/40" />
            <span className="text-orange-200 text-sm hidden sm:inline">
              {user?.email?.split("@")[0] ?? "Guest"}
            </span>
          </button>
          <button
            onClick={() => setTab("settings")}
            title="Settings"
            className="h-8 w-8 rounded border border-orange-500/40 text-orange-200"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === "posts" && (
          <div className="rounded-lg border border-orange-500/30 bg-black/40 p-6 space-y-3">
            <h3 className="text-2xl text-orange-300 font-bold">Posts</h3>
            <p className="text-orange-300/70">
              Site posts will appear here. Use the + button to publish a site (zip, GitHub repo, or manual files).
            </p>
            {!canDo && <GuestBlocked what="make a post or view profiles" />}
            <p className="text-orange-300/50 text-sm">Feed is empty — post uploads ship in the next slice.</p>
          </div>
        )}

        {tab === "communities" && (
          <div className="rounded-lg border border-orange-500/30 bg-black/40 p-6 space-y-3">
            <h3 className="text-2xl text-orange-300 font-bold">Communities</h3>
            <p className="text-orange-300/70">
              Join communities, chat in channels, and build community apps. Coming in the next slice.
            </p>
            {!canDo && <GuestBlocked what="join or chat in a community" />}
          </div>
        )}

        {tab === "profile" && (
          <div className="rounded-lg border border-orange-500/30 bg-black/40 p-6 space-y-3">
            <h3 className="text-2xl text-orange-300 font-bold">Profile</h3>
            {canDo ? (
              <>
                <div className="flex items-center gap-3">
                  <img src={catDurr.url} alt="" className="h-16 w-16 rounded-full border border-orange-500/40" />
                  <div>
                    <div className="text-orange-100 font-medium">{user?.email}</div>
                    <div className="text-orange-300/60 text-xs">Signed in with Google</div>
                  </div>
                </div>
                <p className="text-orange-300/60 text-sm">
                  Custom profile pages (AI-built or uploaded) ship in a later slice.
                </p>
              </>
            ) : (
              <GuestBlocked what="view your profile" />
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-500/30 bg-black/40 p-6 space-y-3">
              <h3 className="text-2xl text-orange-300 font-bold">Account</h3>
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="text-orange-100 text-sm">Signed in as {user.email}</span>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); setMode("gate"); }}
                    className="px-3 py-1 rounded border border-orange-500/60 text-orange-200"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-orange-300/70 text-sm">You're browsing as a guest.</p>
                  <button
                    onClick={signInGoogle}
                    className="px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-orange-500/20 space-y-2">
                <h4 className="text-orange-300 font-medium">GitHub</h4>
                <p className="text-orange-300/60 text-sm">
                  Per-user GitHub sign-in needs an OAuth app configured for this project.
                  Once set up, this button will link your GitHub account for repo sync.
                </p>
                <button
                  onClick={() => alert("GitHub linking will activate once a GitHub OAuth app is configured for this project.")}
                  className="px-4 py-2 rounded border border-orange-500/40 text-orange-200"
                >
                  Link GitHub (coming soon)
                </button>
              </div>
            </div>

            {/* Reuse Options for profile / backup / etc */}
            <div className="rounded-lg border border-orange-500/30 bg-black/40 p-2">
              <Options onBack={() => setTab("posts")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded text-sm transition-colors " +
        (active
          ? "bg-orange-500/20 text-orange-100 border border-orange-500/40"
          : "text-orange-300/70 hover:text-orange-200")
      }
    >
      {children}
    </button>
  );
}