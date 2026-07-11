import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import catDurr from "@/assets/cat-durr.png.asset.json";

export type Post = {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  title: string;
  description: string | null;
  homepage_path: string;
  created_at: string;
};

export function PostsTab({
  onNewPost,
  canPost,
  refreshKey,
}: {
  onNewPost: () => void;
  canPost: boolean;
  refreshKey: number;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Post | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("sight_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setPosts((data as Post[]) ?? []);
        setLoading(false);
      });
  }, [refreshKey]);

  return (
    <div className="rounded-lg border border-orange-500/30 bg-black/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl text-orange-300 font-bold">Posts</h3>
        {canPost && (
          <button
            onClick={onNewPost}
            className="px-3 py-1 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200 text-sm"
          >
            + New post
          </button>
        )}
      </div>

      {loading && <p className="text-orange-300/60 text-sm">Loading…</p>}
      {!loading && posts.length === 0 && (
        <p className="text-orange-300/60 text-sm">No posts yet. Be the first to publish a site.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="text-left rounded-lg border border-orange-500/30 bg-black/60 p-3 hover:border-orange-400/60 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <img
                src={p.author_avatar || catDurr.url}
                alt=""
                className="h-7 w-7 rounded-full object-cover border border-orange-500/40"
              />
              <span className="text-orange-300/80 text-xs">{p.author_name}</span>
              <span className="text-orange-300/40 text-xs ml-auto">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-orange-100 font-medium">{p.title}</div>
            {p.description && (
              <div className="text-orange-300/70 text-sm line-clamp-2 mt-1">{p.description}</div>
            )}
          </button>
        ))}
      </div>

      {open && <PostViewer post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostViewer({ post, onClose }: { post: Post; onClose: () => void }) {
  const src = `/api/public/sight-site/${post.id}/`;
  return (
    <div className="fixed inset-0 z-50 bg-black animate-fade-in">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 bg-black/80 border-b border-orange-500/30 px-3 py-2">
        <img src={post.author_avatar || catDurr.url} alt="" className="h-6 w-6 rounded-full" />
        <div className="text-orange-100 text-sm truncate">
          <b>{post.title}</b> <span className="text-orange-300/60">by {post.author_name}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto h-8 w-8 rounded-full bg-orange-500/90 text-black font-bold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <iframe
        src={src}
        title={post.title}
        sandbox="allow-scripts allow-forms allow-popups allow-pointer-lock"
        className="absolute inset-0 top-12 h-[calc(100%-3rem)] w-full border-0 bg-white"
      />
    </div>
  );
}