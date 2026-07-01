import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { addCustomSite, downloadHtml } from "@/lib/p2d";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function extractText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

function extractHtmlBlock(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

export function AIChat({ onBack }: { onBack: () => void }) {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [saveFor, setSaveFor] = useState<{ id: string; html: string } | null>(null);
  const [saveName, setSaveName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const rendered = useMemo(
    () =>
      messages.map((m) => {
        const text = extractText(m);
        const html = m.role === "assistant" ? extractHtmlBlock(text) : null;
        return { id: m.id, role: m.role, text, html };
      }),
    [messages],
  );

  return (
    <div className="flex flex-col w-full max-w-3xl h-[80vh] gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          P2P AI
        </h2>
        <button
          onClick={onBack}
          className="text-orange-300/70 text-sm hover:text-orange-200 underline-offset-4 hover:underline"
        >
          ← Back
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-orange-500/30 bg-black/40 p-4 space-y-4"
      >
        {rendered.length === 0 && (
          <p className="text-orange-300/60 text-sm">
            Ask me anything. Try: "Make a website for a coffee shop" or "Explain quantum tunneling".
          </p>
        )}
        {rendered.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                m.role === "user"
                  ? "inline-block max-w-[85%] rounded-lg bg-orange-500/20 border border-orange-500/40 px-3 py-2 text-orange-100"
                  : "inline-block max-w-[95%] text-orange-100 whitespace-pre-wrap"
              }
            >
              {m.text || (isLoading ? "…" : "")}
              {m.html && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setPreview(m.html)}
                    className="px-3 py-1 text-sm rounded border border-orange-400 text-orange-200 hover:bg-orange-500/20"
                  >
                    Preview ↗
                  </button>
                  <button
                    onClick={() => downloadHtml(m.html!, "p2p-site.html")}
                    className="px-3 py-1 text-sm rounded border border-orange-400 text-orange-200 hover:bg-orange-500/20"
                  >
                    Download .html
                  </button>
                  <button
                    onClick={() => { setSaveFor({ id: m.id, html: m.html! }); setSaveName(""); }}
                    className="px-3 py-1 text-sm rounded border border-orange-400 text-orange-200 hover:bg-orange-500/20"
                  >
                    ＋ Add to Sites
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && rendered[rendered.length - 1]?.role === "user" && (
          <p className="text-orange-300/60 text-sm">Thinking…</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (!t || isLoading) return;
          void sendMessage({ text: t });
          setInput("");
        }}
        className="flex gap-2"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100 placeholder:text-orange-300/40 focus:outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-black animate-fade-in">
          <button
            onClick={() => setPreview(null)}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-orange-500/90 text-black font-bold text-xl flex items-center justify-center hover:bg-orange-400"
          >
            ✕
          </button>
          <iframe srcDoc={preview} title="AI website preview" className="h-full w-full border-0 bg-white" />
        </div>
      )}

      {saveFor && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={() => setSaveFor(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const n = saveName.trim();
              if (!n) return;
              addCustomSite(n, saveFor.html);
              setSaveFor(null);
            }}
            className="bg-black border border-orange-500/40 rounded-lg p-6 w-full max-w-sm flex flex-col gap-3"
          >
            <h3 className="text-orange-300 text-lg">Save site as…</h3>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Site name"
              className="rounded bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSaveFor(null)} className="px-3 py-1 text-orange-300/70">Cancel</button>
              <button type="submit" className="px-4 py-1 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}