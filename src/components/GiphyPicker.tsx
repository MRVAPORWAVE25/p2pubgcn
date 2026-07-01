import { useEffect, useState } from "react";

const GIPHY_KEY = "dc6zaTOxFJmzC"; // Giphy public beta key

type Gif = { id: string; images: { fixed_height: { url: string } } };

export function GiphyPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url = q.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&limit=24&q=${encodeURIComponent(q)}`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24`;
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setGifs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [q]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-black border border-orange-500/40 rounded-lg p-4 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Giphy…"
            className="flex-1 rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
          />
          <button onClick={onClose} className="px-3 text-orange-200">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto">
          {loading && <p className="text-orange-300/60 col-span-3">Loading…</p>}
          {gifs.map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g.images.fixed_height.url)}
              className="hover:ring-2 hover:ring-orange-400 rounded overflow-hidden"
            >
              <img src={g.images.fixed_height.url} alt="" className="w-full h-32 object-cover" />
            </button>
          ))}
        </div>
        <p className="text-xs text-orange-300/40 mt-2">Powered by GIPHY</p>
      </div>
    </div>
  );
}