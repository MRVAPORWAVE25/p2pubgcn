import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wasm: "application/wasm",
};

function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export const Route = createFileRoute("/api/public/sight-site/$postId/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(url, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const postId = params.postId;
        const splat = (params as { _splat?: string })._splat ?? "";
        if (!postId) return new Response("Not found", { status: 404 });

        const { data: post } = await supabase
          .from("sight_posts")
          .select("user_id, homepage_path")
          .eq("id", postId)
          .maybeSingle();
        if (!post) return new Response("Post not found", { status: 404 });

        const path = splat || post.homepage_path;
        const objectPath = `${post.user_id}/${postId}/${path}`;
        const { data: file, error } = await supabase.storage
          .from("sight-posts")
          .download(objectPath);
        if (error || !file) return new Response("File not found", { status: 404 });

        return new Response(file, {
          status: 200,
          headers: {
            "Content-Type": contentTypeFor(path),
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});