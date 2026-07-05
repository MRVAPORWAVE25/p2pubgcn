import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const SYSTEM =
  "You are P2P AI, a helpful assistant inside a games & sites portal. Answer concisely and use markdown. If the user asks you to 'make a website', respond with a single complete HTML document wrapped in a ```html code block so it can be previewed and downloaded.";

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

        // Preflight the Lovable AI gateway with a tiny non-streaming request so
        // we can cleanly fall back to Pollinations when this project's credits
        // are exhausted (402) or rate limited (429) — the user's own chat
        // shouldn't hard-fail just because the workspace ran out of credits.
        let useLovable = false;
        if (key) {
          try {
            const probe = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Lovable-API-Key": key,
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 1,
                stream: false,
              }),
            });
            if (probe.ok) {
              useLovable = true;
            } else {
              console.warn("[lovable-ai] preflight not ok", probe.status, "- falling back");
            }
            // Drain body to free the connection.
            try { await probe.text(); } catch { /* ignore */ }
          } catch (err) {
            console.error("[lovable-ai] preflight failed:", err);
          }
        }

        if (useLovable && key) {
          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM,
            messages: modelMessages,
            onError: (e) => console.error("[lovable-ai]", e),
          });
          return result.toUIMessageStreamResponse();
        }

        // Free, keyless fallback via Pollinations (OpenAI-compatible)
        const fallback = createOpenAICompatible({
          name: "pollinations",
          baseURL: "https://text.pollinations.ai/openai",
        });
        const result = streamText({
          model: fallback("openai"),
          system: SYSTEM,
          messages: modelMessages,
          onError: (e) => console.error("[pollinations]", e),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});