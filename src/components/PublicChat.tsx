import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; nickname: string; content: string; created_at: string };

export function PublicChat({ onBack }: { onBack: () => void }) {
  const [nickname, setNickname] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("p2p_nick") ?? "" : "",
  );
  const [draftNick, setDraftNick] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nickname) return;
    let active = true;
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setMessages(data as Msg[]);
      });

    const channel = supabase
      .channel("public-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [nickname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!nickname) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          Pick a nickname
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = draftNick.trim().slice(0, 32);
            if (!v) return;
            localStorage.setItem("p2p_nick", v);
            setNickname(v);
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={draftNick}
            onChange={(e) => setDraftNick(e.target.value)}
            maxLength={32}
            placeholder="Your nickname"
            className="rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100 placeholder:text-orange-300/40 focus:outline-none focus:border-orange-400"
          />
          <button
            type="submit"
            className="px-5 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30"
          >
            Join
          </button>
        </form>
        <button
          onClick={onBack}
          className="text-orange-300/70 text-sm hover:text-orange-200 underline-offset-4 hover:underline"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-3xl h-[80vh] gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-bold text-orange-400 [text-shadow:0_0_30px_rgba(251,146,60,0.6)]">
          # general
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-orange-300/70 text-sm">as {nickname}</span>
          <button
            onClick={() => {
              localStorage.removeItem("p2p_nick");
              setNickname("");
            }}
            className="text-orange-300/60 text-xs hover:text-orange-200 underline-offset-4 hover:underline"
          >
            change
          </button>
          <button
            onClick={onBack}
            className="text-orange-300/70 text-sm hover:text-orange-200 underline-offset-4 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-orange-500/30 bg-black/40 p-4 space-y-2"
      >
        {messages.length === 0 && (
          <p className="text-orange-300/60 text-sm">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-orange-100">
            <span className="font-bold text-orange-400">{m.nickname}</span>
            <span className="text-orange-300/40 text-xs ml-2">
              {new Date(m.created_at).toLocaleTimeString()}
            </span>
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const content = input.trim().slice(0, 1000);
          if (!content || sending) return;
          setSending(true);
          const { error } = await supabase
            .from("chat_messages")
            .insert({ nickname, content });
          setSending(false);
          if (!error) setInput("");
        }}
        className="flex gap-2"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder={`Message #general as ${nickname}`}
          className="flex-1 rounded-lg bg-black/60 border border-orange-500/40 px-3 py-2 text-orange-100 placeholder:text-orange-300/40 focus:outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-5 rounded-lg border border-orange-500/60 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}