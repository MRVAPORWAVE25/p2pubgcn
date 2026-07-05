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

        // Try Lovable AI first if a key exists. Preflight a tiny request so
        // we can detect credit/rate errors BEFORE we start streaming, and
        // silently fall back without the chat "shutting down".
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
            // 402 = out of credits, 429 = rate limited, 5xx = upstream down.
            // Anything else (including 200) means the gateway is usable.
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