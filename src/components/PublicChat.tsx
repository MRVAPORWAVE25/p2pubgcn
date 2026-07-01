import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import catDurr from "@/assets/cat-durr.png.asset.json";
import { GiphyPicker } from "./GiphyPicker";
import { QuoteCard, type QuotePayload } from "./QuoteCard";

type Msg = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  channel: string;
  avatar_url: string | null;
  reply_to: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  quote_payload: unknown;
};

const CHANNELS = ["general", "gaming", "commands"] as const;
type Channel = (typeof CHANNELS)[number];

const MIAQ_NICK = "Make it a Quote#6660";

export function PublicChat({ onBack }: { onBack: () => void }) {
  const [nickname, setNickname] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("p2p_nick") ?? "" : "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("p2p_avatar") ?? "" : "",
  );
  const [draftNick, setDraftNick] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");
  const [channel, setChannel] = useState<Channel>("general");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [showGiphy, setShowGiphy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveAvatar = avatarUrl || catDurr.url;
  const msgById = useMemo(() => {
    const m = new Map<string, Msg>();
    messages.forEach((x) => m.set(x.id, x));
    return m;
  }, [messages]);

  useEffect(() => {
    if (!nickname) return;
    let active = true;
    setMessages([]);
    supabase
      .from("chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(300)
      .then(({ data }) => {
        if (active && data) setMessages(data as Msg[]);
      });

    const ch = supabase
      .channel(`chat-${channel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel=eq.${channel}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [nickname, channel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const insertRow = async (row: Partial<Msg> & { content: string }) => {
    await supabase.from("chat_messages").insert({
      nickname,
      avatar_url: effectiveAvatar,
      channel,
      reply_to: replyTo?.id ?? null,
      ...row,
    });
  };

  const runMiaq = async (raw: string) => {
    // Format: !quote @nick text...    OR reply to a message with just "!quote"
    let text = "";
    let author = "";
    let handle = "";
    let avatar = catDurr.url;
    const stripped = raw.replace(/^!quote\s*/i, "").trim();
    if (replyTo) {
      text = stripped || replyTo.content || "";
      author = replyTo.nickname;
      handle = "@" + replyTo.nickname.toLowerCase().replace(/\s+/g, "");
      avatar = replyTo.avatar_url || catDurr.url;
    } else {
      const m = stripped.match(/^@(\S+)\s+([\s\S]+)$/);
      if (!m) {
        await insertRow({
          nickname: MIAQ_NICK,
          avatar_url: catDurr.url,
          content: 'Usage: `!quote @nick their words` — or reply to a message with `!quote`.',
        });
        return;
      }
      author = m[1];
      handle = "@" + m[1].toLowerCase();
      text = m[2];
    }
    const payload: QuotePayload = { text, author, handle, avatar_url: avatar };
    await insertRow({
      nickname: MIAQ_NICK,
      avatar_url: catDurr.url,
      content: "",
      attachment_type: "quote",
      quote_payload: payload as unknown as Msg["quote_payload"],
    });
  };

  const send = async (overrides?: Partial<Msg> & { content?: string }) => {
    const content = (overrides?.content ?? input).trim().slice(0, 1000);
    if (!content && !overrides?.attachment_url) return;
    setSending(true);
    try {
      if (channel === "commands" && content.toLowerCase().startsWith("!quote")) {
        await runMiaq(content);
      } else {
        await insertRow({ content, ...overrides });
      }
      setInput("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  if (!nickname) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          Join chat
        </h2>
        <img src={draftAvatar || catDurr.url} alt="" className="h-20 w-20 rounded-full object-cover border border-orange-500/40" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = draftNick.trim().slice(0, 32);
            if (!v) return;
            localStorage.setItem("p2p_nick", v);
            localStorage.setItem("p2p_avatar", draftAvatar.trim());
            setNickname(v);
            setAvatarUrl(draftAvatar.trim());
          }}
          className="flex flex-col gap-2 w-72"
        >
          <input
            autoFocus
            value={draftNick}
            onChange={(e) => setDraftNick(e.target.value)}
            maxLength={32}
            placeholder="Nickname"
            className="rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
          />
          <input
            value={draftAvatar}
            onChange={(e) => setDraftAvatar(e.target.value)}
            placeholder="Avatar URL (optional — default cat-durr)"
            className="rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
          />
          <button type="submit" className="px-5 py-2 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200">
            Join
          </button>
        </form>
        <button onClick={onBack} className="text-orange-300/70 text-sm hover:text-orange-200 underline">← Back</button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl h-[80vh] gap-3 animate-fade-in">
      {/* channel list */}
      <div className="w-40 shrink-0 flex flex-col gap-1 rounded-lg border border-orange-500/30 bg-black/40 p-2">
        <div className="text-xs text-orange-300/60 px-2 pb-1">Channels</div>
        {CHANNELS.map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={
              "text-left px-2 py-1 rounded " +
              (c === channel ? "bg-orange-500/20 text-orange-100" : "text-orange-300/70 hover:text-orange-200")
            }
          >
            #{c}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1 pt-2 border-t border-orange-500/20">
          <div className="flex items-center gap-2 px-1">
            <img src={effectiveAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
            <span className="text-orange-300/70 text-xs truncate">{nickname}</span>
          </div>
          <button
            onClick={() => { localStorage.removeItem("p2p_nick"); setNickname(""); }}
            className="text-orange-300/50 text-xs hover:text-orange-200 text-left px-1"
          >
            change identity
          </button>
          <button onClick={onBack} className="text-orange-300/70 text-xs hover:text-orange-200 text-left px-1">← Back</button>
        </div>
      </div>

      {/* main */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-orange-400 [text-shadow:0_0_20px_rgba(251,146,60,0.5)]">
            #{channel}
          </h2>
          {channel === "commands" && (
            <span className="text-orange-300/60 text-xs">Try <code>!quote @nick words</code> or reply with <code>!quote</code></span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border border-orange-500/30 bg-black/40 p-3 space-y-3">
          {messages.length === 0 && <p className="text-orange-300/60 text-sm">No messages yet.</p>}
          {messages.map((m) => {
            const parent = m.reply_to ? msgById.get(m.reply_to) : null;
            return (
              <div key={m.id} className="group flex gap-2 text-orange-100">
                <img src={m.avatar_url || catDurr.url} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  {parent && (
                    <div className="text-xs text-orange-300/50 mb-0.5 truncate">
                      ↩ replying to <b>{parent.nickname}</b>: {parent.content?.slice(0, 80)}
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className={"font-bold " + (m.nickname === MIAQ_NICK ? "text-white/90" : "text-orange-400")}>
                      {m.nickname}
                    </span>
                    <span className="text-orange-300/40 text-xs">{new Date(m.created_at).toLocaleTimeString()}</span>
                    <button
                      onClick={() => setReplyTo(m)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-orange-300/60 text-xs hover:text-orange-200"
                    >
                      Reply
                    </button>
                  </div>
                  {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                  {(m.attachment_type === "gif" || m.attachment_type === "image") && m.attachment_url && (
                    <img src={m.attachment_url} alt="" className="mt-1 rounded max-h-80" />
                  )}
                  {m.attachment_type === "quote" && m.quote_payload && (
                    <div className="mt-2">
                      <QuoteCard payload={m.quote_payload as QuotePayload} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-orange-300/70 rounded bg-black/40 border border-orange-500/20 px-2 py-1">
            <span>Replying to <b>{replyTo.nickname}</b>: {replyTo.content.slice(0, 60)}</span>
            <button onClick={() => setReplyTo(null)} className="ml-auto text-orange-300/70">✕</button>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="flex gap-2"
        >
          <button
            type="button"
            onClick={() => setShowGiphy(true)}
            className="px-3 rounded-lg border border-orange-500/60 bg-orange-500/10 text-orange-200"
            title="Send a GIF"
          >
            GIF
          </button>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder={`Message #${channel} as ${nickname}`}
            className="flex-1 rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !replyTo)}
            className="px-5 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {showGiphy && (
        <GiphyPicker
          onClose={() => setShowGiphy(false)}
          onPick={async (url) => {
            setShowGiphy(false);
            await send({ content: "", attachment_url: url, attachment_type: "gif" });
          }}
        />
      )}
    </div>
  );
}