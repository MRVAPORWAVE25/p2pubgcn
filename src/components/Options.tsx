import { useEffect, useState } from "react";
import catDurr from "@/assets/cat-durr.png.asset.json";
import { downloadP2D, importP2DFile } from "@/lib/p2d";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function Options({ onBack }: { onBack: () => void }) {
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setNickname(localStorage.getItem("p2p_nick") ?? "");
    setAvatar(localStorage.getItem("p2p_avatar") ?? "");
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const save = () => {
    localStorage.setItem("p2p_nick", nickname.trim());
    localStorage.setItem("p2p_avatar", avatar.trim());
    setMsg("Saved ✓");
    setTimeout(() => setMsg(""), 1500);
  };

  const signInGoogle = async () => {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  const onImport = async (f: File) => {
    try {
      const d = await importP2DFile(f);
      setNickname(d.nickname ?? "");
      setAvatar(d.avatar ?? "");
      setMsg("Imported ✓ Reload to see updates in other views.");
    } catch (e) {
      setMsg("Import failed: " + (e as Error).message);
    }
  };

  const onAvatarFile = async (f: File) => {
    if (f.size > 2_000_000) { setMsg("Avatar must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-lg">
      <h2 className="text-4xl md:text-5xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
        Options
      </h2>

      <div className="w-full flex flex-col gap-4 rounded-lg border border-orange-500/30 bg-black/40 p-4">
        <div className="flex items-center gap-3">
          <img src={avatar || catDurr.url} alt="" className="h-16 w-16 rounded-full object-cover border border-orange-500/40" />
          <div className="flex-1 flex flex-col gap-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Username"
              className="rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
            />
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="Avatar image URL (blank = cat-durr)"
              className="rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
            />
            <label className="text-orange-300/80 text-xs cursor-pointer hover:text-orange-200">
              or upload from computer
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onAvatarFile(f); }} />
            </label>
          </div>
        </div>
        <button onClick={save} className="self-start px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200">
          Save profile
        </button>
        {msg && <p className="text-orange-300/80 text-sm">{msg}</p>}
      </div>

      <div className="w-full flex flex-col gap-3 rounded-lg border border-orange-500/30 bg-black/40 p-4">
        <h3 className="text-orange-300 font-bold">Backup</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadP2D} className="px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200">
            Download .p2d
          </button>
          <label className="px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200 cursor-pointer">
            Import .p2d
            <input
              type="file"
              accept=".p2d,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); }}
            />
          </label>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 rounded-lg border border-orange-500/30 bg-black/40 p-4">
        <h3 className="text-orange-300 font-bold">Account (optional)</h3>
        {user ? (
          <div className="flex items-center justify-between">
            <span className="text-orange-100 text-sm">Signed in as {user.email}</span>
            <button onClick={signOut} className="px-3 py-1 rounded border border-orange-500/60 text-orange-200">Sign out</button>
          </div>
        ) : (
          <>
            <p className="text-orange-300/70 text-sm">Optional. Sign in to sync settings across devices instead of using .p2d files.</p>
            <button onClick={signInGoogle} className="self-start px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200">
              Sign in with Google
            </button>
          </>
        )}
      </div>

      <button onClick={onBack} className="text-orange-300/70 text-sm hover:text-orange-200 underline-offset-4 hover:underline">
        ← Back
      </button>
    </div>
  );
}