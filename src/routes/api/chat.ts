import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

const SYSTEM =
  `You are P2P AI, a highly capable assistant inside a games & sites portal. Answer concisely and use markdown.

When the user asks you to make a website, an effect, an animation, a game, a demo, an interactive toy, a visualizer, or anything visual, ALWAYS respond with a single complete, self-contained HTML document wrapped in a \`\`\`html code block so it can be previewed and downloaded.

Rules for HTML output:
- Include <!DOCTYPE html>, <html>, <head> with <meta charset="utf-8"> and <meta name="viewport" content="width=device-width,initial-scale=1">, and <body>.
- Everything MUST be inline: <style> in <head>, <script> at end of <body>. No external build steps. External CDN links (unpkg, jsdelivr, cdnjs, fonts.googleapis.com) are allowed and encouraged for libraries like three.js, p5.js, gsap, tone.js, matter.js, tailwind CDN, etc.
- Make it genuinely interactive and impressive: mouse/touch reactivity, particles, canvas/webgl, CSS animations, generative art, sound (only on user gesture), physics — whichever fits the request.
- Ship polished, modern, responsive design with dark backgrounds by default unless the user specifies otherwise. No lorem ipsum placeholders.
- The document must run standalone in an <iframe srcdoc>. Do not rely on parent-page globals.
- Prefer one big HTML doc over splitting files.

For non-visual questions, just answer in normal markdown.`;

// Flatten a UIMessage[] to plain {role, content} for OpenAI-style APIs.
function toPlainMessages(messages: UIMessage[]) {
  return messages
    .map((m) => {
      const text = m.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("");
      return { role: m.role as "user" | "assistant" | "system", content: text };
    })
    .filter((m) => m.content.trim().length > 0);
}

// Stream from a Pollinations-style OpenAI endpoint and emit UI message stream parts.
async function streamFromPollinations(
  model: string,
  messages: UIMessage[],
): Promise<Response | null> {
  const controller = new AbortController();
  let upstream: Response;
  try {
    upstream = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Referer: "https://p2p.lovable.app",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM }, ...toPlainMessages(messages)],
        stream: true,
        max_tokens: 8192,
      }),
    });
  } catch (e) {
    console.error(`[pollinations:${model}] fetch failed`, e);
    return null;
  }
  if (!upstream.ok || !upstream.body) {
    console.error(`[pollinations:${model}] bad status`, upstream.status);
    return null;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const id = crypto.randomUUID();

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "text-start", id });
      let buffer = "";
      let gotAny = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
              if (delta) {
                writer.write({ type: "text-delta", id, delta });
                gotAny = true;
              }
            } catch {
              // ignore non-JSON keepalives
            }
          }
        }
      } catch (e) {
        console.error(`[pollinations:${model}] stream read error`, e);
      }
      if (!gotAny) {
        writer.write({
          type: "text-delta",
          id,
          delta: "The free fallback model returned no content. Try again in a moment.",
        });
      }
      writer.write({ type: "text-end", id });
    },
    onError: (e) => {
      console.error(`[pollinations:${model}] ui-stream error`, e);
      return "Fallback error";
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const modelMessages = await convertToModelMessages(messages);
        const key = process.env.LOVABLE_API_KEY;

        if (key) {
          let lovableOk = false;
          try {
            const probe = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Lovable-API-Key": key,
                "X-Lovable-AIG-SDK": "vercel-ai-sdk",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 1,
                stream: false,
              }),
            });
            lovableOk = probe.status !== 402 && probe.status !== 429 && probe.status < 500;
            if (!lovableOk) {
              console.warn("[lovable-ai] preflight status", probe.status, "— using fallback");
            }
          } catch (err) {
            console.error("[lovable-ai] preflight failed:", err);
            lovableOk = false;
          }

          if (lovableOk) {
            try {
              const gateway = createLovableAiGatewayProvider(key);
              const result = streamText({
                model: gateway("google/gemini-3-flash-preview"),
                system: SYSTEM,
                messages: modelMessages,
                onError: (e) => console.error("[lovable-ai]", e),
              });
              return result.toUIMessageStreamResponse();
            } catch (err) {
              console.error("[lovable-ai] stream init failed, falling back:", err);
            }
          }
        }

        // Free keyless fallback via Pollinations. We stream raw SSE ourselves and
        // emit UI message parts so the response format is bulletproof, even when
        // the upstream misbehaves.
        const FREE_MODELS = ["openai-large", "openai", "mistral"];
        for (const m of FREE_MODELS) {
          const res = await streamFromPollinations(m, messages);
          if (res) return res;
        }

        // Absolute last resort — never return a 500; give the UI a readable message.
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            const id = crypto.randomUUID();
            writer.write({ type: "text-start", id });
            writer.write({
              type: "text-delta",
              id,
              delta:
                "The AI is temporarily unavailable (both the primary and free fallback failed). Please try again in a moment.",
            });
            writer.write({ type: "text-end", id });
          },
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});