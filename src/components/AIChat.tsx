import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { addCustomSite, downloadHtml } from "@/lib/p2d";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const STORE_KEY = "p2p_ai_conversations";
const ACTIVE_KEY = "p2p_ai_active";

type Convo = { id: string; title: string; createdAt: number; messages: UIMessage[] };

function extractText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}
function extractHtmlBlock(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}
function loadConvos(): Convo[] {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"); } catch { return []; }
}
function saveConvos(list: Convo[]) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
function newConvo(): Convo {
  return { id: crypto.randomUUID(), title: "New chat", createdAt: Date.now(), messages: [] };
}

export function AIChat({ onBack }: { onBack: () => void }) {
  const [convos, setConvos] = useState<Convo[]>(() => {
    const l = loadConvos();
    return l.length ? l : [newConvo()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    const list = loadConvos();
    if (stored && list.some((c) => c.id === stored)) return stored;
    return list[0]?.id ?? "";
  });
  useEffect(() => {
    if (!convos.find((c) => c.id === activeId)) setActiveId(convos[0]?.id ?? "");
  }, [convos, activeId]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  const active = convos.find((c) => c.id === activeId) ?? convos[0];

  return (
    <div className="flex w-full max-w-6xl h-[80vh] gap-3 animate-fade-in">
      <div className="w-52 shrink-0 flex flex-col gap-1 rounded-lg border border-orange-500/30 bg-black/40 p-2 overflow-y-auto">
        <button
          onClick={() => {
            const c = newConvo();
            const next = [c, ...convos];
            setConvos(next); saveConvos(next); setActiveId(c.id);
          }}
          className="px-2 py-1 rounded border border-orange-500/60 bg-orange-500/20 text-orange-200 text-sm"
        >+ New chat</button>
        <div className="text-xs text-orange-300/60 px-2 pt-2 pb-1">Conversations</div>
        {convos.map((c) => (
          <div key={c.id} className={"group flex items-center gap-1 px-2 py-1 rounded " +
            (c.id === activeId ? "bg-orange-500/20 text-orange-100" : "text-orange-300/70 hover:text-orange-200")}>
            <button onClick={() => setActiveId(c.id)} className="flex-1 text-left text-sm truncate">{c.title}</button>
            <button
              onClick={() => {
                if (!confirm("Delete this conversation?")) return;
                const next = convos.filter((x) => x.id !== c.id);
                setConvos(next.length ? next : [newConvo()]);
                saveConvos(next);
              }}
              className="opacity-0 group-hover:opacity-100 text-orange-300/60 text-xs">✕</button>
          </div>
        ))}
        <button onClick={onBack} className="mt-auto text-orange-300/70 text-xs hover:text-orange-200 text-left px-2 pt-2">← Back</button>
      </div>
      {active && (
        <ChatPane
          key={active.id}
          convo={active}
          onChange={(msgs) => {
            const title = active.title === "New chat" && msgs[0]
              ? extractText(msgs[0]).slice(0, 40) || "New chat"
              : active.title;
            const next = convos.map((c) => c.id === active.id ? { ...c, messages: msgs, title } : c);
            setConvos(next); saveConvos(next);
          }}
        />
      )}
    </div>
  );
}

function ChatPane({ convo, onChange }: { convo: Convo; onChange: (m: UIMessage[]) => void }) {
  const { messages, sendMessage, status, setMessages } = useChat({
    id: convo.id,
    transport,
    messages: convo.messages,
  });
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; kind: "image" | "text"; url?: string; text?: string }>>([]);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saveFor, setSaveFor] = useState<{ id: string; html: string } | null>(null);
  const [saveName, setSaveName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => { setMessages(convo.messages); /* eslint-disable-next-line */ }, [convo.id]);
  useEffect(() => { onChange(messages); /* eslint-disable-next-line */ }, [messages]);

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

  const handleFile = async (f: File) => {
    if (f.size > 4_000_000) { alert("Max 4MB"); return; }
    if (f.type.startsWith("image/")) {
      const url = await new Promise<string>((res) => {
        const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.readAsDataURL(f);
      });
      setAttachments((a) => [...a, { name: f.name, kind: "image", url }]);
    } else {
      const text = await f.text();
      setAttachments((a) => [...a, { name: f.name, kind: "text", text: text.slice(0, 20000) }]);
    }
  };
  const addUrl = () => {
    const u = urlInput.trim(); if (!u) return;
    const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(u);
    setAttachments((a) => [...a, { name: u, kind: isImg ? "image" : "text", url: u, text: isImg ? undefined : `(URL reference: ${u})` }]);
    setUrlInput(""); setShowUrl(false);
  };

  const submit = () => {
    const t = input.trim();
    if ((!t && attachments.length === 0) || isLoading) return;
    const parts: string[] = [];
    for (const a of attachments) {
      if (a.kind === "image" && a.url) parts.push(`[User attached image "${a.name}": ${a.url.startsWith("data:") ? "(inline data URL)" : a.url}]`);
      else if (a.kind === "text") parts.push(`Attached file "${a.name}":\n\`\`\`\n${a.text ?? a.url ?? ""}\n\`\`\``);
    }
    const finalText = [t, ...parts].filter(Boolean).join("\n\n");
    void sendMessage({ text: finalText });
    setInput(""); setAttachments([]);
  };

  return (
    <div className="flex flex-col flex-1 h-[80vh] gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          {convo.title}
        </h2>
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

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <span key={i} className="px-2 py-1 text-xs rounded border border-orange-500/40 text-orange-200 bg-black/60">
              {a.kind === "image" ? "🖼" : "📄"} {a.name.slice(0, 40)}
              <button onClick={() => setAttachments((x) => x.filter((_, j) => j !== i))} className="ml-2 text-orange-300/70">✕</button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2"
      >
        <label className="px-3 flex items-center rounded-lg border border-orange-500/60 bg-orange-500/10 text-orange-200 cursor-pointer" title="Attach file">
          📎
          <input type="file" className="hidden" accept="image/*,.txt,.md,.json,.csv,.html,.css,.js,.ts,.tsx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={() => setShowUrl((v) => !v)}
          className="px-3 rounded-lg border border-orange-500/60 bg-orange-500/10 text-orange-200" title="Attach by URL">🔗</button>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100 placeholder:text-orange-300/40 focus:outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && attachments.length === 0)}
          className="px-5 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {showUrl && (
        <div className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..."
            className="flex-1 rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100" />
          <button type="button" onClick={addUrl}
            className="px-4 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200">Add</button>
        </div>
      )}

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