import { useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

type FileEntry = { path: string; blob: Blob; contentType: string };

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html", css: "text/css", js: "application/javascript",
    json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
    txt: "text/plain", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    mp3: "audio/mpeg", mp4: "video/mp4", wasm: "application/wasm",
  };
  return map[ext] ?? "application/octet-stream";
}

async function extractZip(zipFile: File): Promise<FileEntry[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const out: FileEntry[] = [];
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  // If everything is under one common top folder (e.g. "site-main/"), strip it
  const first = entries[0]?.name.split("/")[0];
  const commonRoot =
    first && entries.every((e) => e.name.startsWith(first + "/")) ? first + "/" : "";
  for (const entry of entries) {
    const rel = entry.name.slice(commonRoot.length);
    if (!rel) continue;
    const blob = await entry.async("blob");
    out.push({ path: rel, blob, contentType: guessType(rel) });
  }
  return out;
}

function filesFromInput(list: FileList): FileEntry[] {
  const out: FileEntry[] = [];
  for (const f of Array.from(list)) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    // strip common root folder from directory upload
    out.push({ path: rel, blob: f, contentType: guessType(rel) });
  }
  if (out.length > 1) {
    const first = out[0].path.split("/")[0];
    if (first && out.every((e) => e.path.startsWith(first + "/"))) {
      for (const e of out) e.path = e.path.slice(first.length + 1);
    }
  }
  return out;
}

export function NewPostModal({
  userId,
  authorName,
  authorAvatar,
  onClose,
  onPosted,
}: {
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [homepage, setHomepage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const setFilesAndDefault = (entries: FileEntry[]) => {
    setFiles(entries);
    const htmls = entries.filter((e) => e.path.toLowerCase().endsWith(".html") || e.path.toLowerCase().endsWith(".htm"));
    const preferred =
      htmls.find((e) => /^index\.html?$/i.test(e.path)) ??
      htmls.find((e) => /(^|\/)index\.html?$/i.test(e.path)) ??
      htmls[0];
    setHomepage(preferred?.path ?? "");
  };

  const onZip = async (f: File) => {
    setBusy(true); setErr("");
    try {
      const entries = await extractZip(f);
      setFilesAndDefault(entries);
    } catch (e) {
      setErr("Failed to read zip: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || files.length === 0 || !homepage) {
      setErr("Title, files, and a homepage are required.");
      return;
    }
    setBusy(true); setErr("");
    try {
      // Reserve a post id client-side so we can namespace uploads
      const postId = crypto.randomUUID();
      const totalBytes = files.reduce((s, f) => s + f.blob.size, 0);
      if (totalBytes > 25 * 1024 * 1024) {
        throw new Error("Total upload size must be under 25MB.");
      }

      for (const entry of files) {
        const path = `${userId}/${postId}/${entry.path}`;
        const { error } = await supabase.storage
          .from("sight-posts")
          .upload(path, entry.blob, { contentType: entry.contentType, upsert: false });
        if (error) throw error;
      }

      const { error: insErr } = await supabase.from("sight_posts").insert({
        id: postId,
        user_id: userId,
        author_name: authorName,
        author_avatar: authorAvatar,
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 500) || null,
        homepage_path: homepage,
      });
      if (insErr) throw insErr;

      onPosted();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-orange-500/40 bg-black p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl text-orange-300 font-bold">New site post</h3>
          <button onClick={onClose} className="text-orange-300/70 hover:text-orange-200">✕</button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Title"
          className="w-full rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="px-3 py-2 rounded border border-orange-500/60 bg-orange-500/10 text-orange-200 text-center text-sm cursor-pointer">
            Upload files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && setFilesAndDefault(filesFromInput(e.target.files))}
            />
          </label>
          <label className="px-3 py-2 rounded border border-orange-500/60 bg-orange-500/10 text-orange-200 text-center text-sm cursor-pointer">
            Upload folder
            <input
              type="file"
              className="hidden"
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => e.target.files && setFilesAndDefault(filesFromInput(e.target.files))}
            />
          </label>
          <label className="px-3 py-2 rounded border border-orange-500/60 bg-orange-500/10 text-orange-200 text-center text-sm cursor-pointer col-span-2">
            Upload .zip
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onZip(f); }}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <div className="text-orange-300/80 text-sm">{files.length} file(s) — pick homepage:</div>
            <select
              value={homepage}
              onChange={(e) => setHomepage(e.target.value)}
              className="w-full rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100 text-sm"
            >
              {files
                .filter((f) => /\.html?$/i.test(f.path))
                .map((f) => (
                  <option key={f.path} value={f.path}>{f.path}</option>
                ))}
              {files.filter((f) => /\.html?$/i.test(f.path)).length === 0 && (
                <option value="">(no HTML files found)</option>
              )}
            </select>
            <details className="text-orange-300/60 text-xs">
              <summary className="cursor-pointer">Show file list</summary>
              <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                {files.map((f) => (
                  <li key={f.path} className="truncate">{f.path} <span className="text-orange-300/40">({(f.blob.size/1024).toFixed(1)}kb)</span></li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 rounded border border-orange-500/30 text-orange-300">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !title.trim() || files.length === 0 || !homepage}
            className="px-4 py-2 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}