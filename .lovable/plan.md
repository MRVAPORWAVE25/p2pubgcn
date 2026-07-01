## Goals (single build, no follow-up questions)

1. AI must keep working regardless of my Lovable AI credits.
2. Add image/GIF support in the chatroom via Giphy.
3. Let users download an AI-generated site as a standalone `.html` file, OR add it to their personal Sites list (via a "+" button on the AI prompt) under a custom name; clicking it launches that HTML.
4. Replace the placeholder `p2p.svg` with a real **single-file SVG** of the whole P2P site (compiled, self-contained, no iframe). Keep all jsdelivr/game iframes as iframes.
5. Add **Zodiac** button on Sites page → iframes `https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/zd-pages@main/svg.svg`.
6. Chat: add `#gaming` and `#commands` channels. `#commands` runs a 1:1 **Make It a Quote** bot (`!quote @user message` → renders the exact card layout from the reference image). Allow replies to any message (user or bot). Allow per-user profile picture (default `cat-durr.png`).
7. Add **Options** button on the Where-to screen. Options menu allows:
   - change username
   - change profile picture (upload or URL; default cat-durr)
   - download all data as `.p2d` (settings + full chat history snapshot the user has seen + custom sites)
   - import `.p2d` to restore everything
   - optional **Sign in with Google** — when signed in, data is synced to the account instead of needing `.p2d` files. Purely optional.

---

## Technical plan

### 1. Keyless AI fallback
- `src/routes/api/chat.ts`: try Lovable AI Gateway as today. On `402` (credits) / `429` / network failure, fall back to a free public model endpoint that needs no key. Use **Pollinations** (`https://text.pollinations.ai/openai`, OpenAI-compatible, free, no key) via `@ai-sdk/openai-compatible` with `baseURL: "https://text.pollinations.ai"` and model `"openai"`. Stream through `streamText` + `toUIMessageStreamResponse` exactly like today. Result: AI works even at $0.00 credits.
- Same system prompt; still emits ```html blocks for site generation.

### 2. AI site → download or save
- `AIChat.tsx`: when an assistant message contains an ```html block, show three buttons next to the existing "Preview website ↗":
  - **Download .html** — `new Blob([html], {type:"text/html"})` → object URL → `<a download="site.html">` click.
  - **Add to Sites ＋** — opens a tiny inline prompt for a name; saves `{name, html}` into `localStorage["p2p_custom_sites"]` (array). Toast on success.
- `src/routes/index.tsx` Sites grid: merge built-in SITES with `localStorage["p2p_custom_sites"]`. Custom items use the existing `html` branch of the iframe modal (`srcDoc={item.html}`), so clicking launches the HTML.

### 3. Real single-file SVG of P2P
- Build script `scripts/build-p2p-svg.mjs` that runs after Vite build: reads `dist/`, inlines `index.html` + all referenced JS/CSS/font/image assets as data URIs into one HTML string, then wraps it inside an SVG `foreignObject`:
  ```
  <svg xmlns=... viewBox="0 0 1920 1080">
    <foreignObject width="100%" height="100%">
      <html xmlns="http://www.w3.org/1999/xhtml">...inlined app...</html>
    </foreignObject>
  </svg>
  ```
- Output to `p2p.svg` at repo root, replacing the current iframe-wrapper version. Document the command in `package.json` as `build:svg`. The existing jsdelivr game/site SVGs are untouched.

### 4. Zodiac on Sites page
- Add `{ name: "Zodiac", url: "https://cdn.jsdelivr.net/gh/MRVAPORWAVE25/zd-pages@main/svg.svg" }` to `SITES` array in `src/routes/index.tsx`.

### 5. Chat: channels, replies, avatars, Giphy, MIAQ bot
- Migration: extend `chat_messages` table with columns
  ```
  channel text not null default 'general'
  avatar_url text
  reply_to uuid references chat_messages(id) on delete set null
  attachment_url text          -- giphy / image
  attachment_type text          -- 'image' | 'gif' | 'quote'
  quote_payload jsonb          -- {text, author, handle, avatar_url} for MIAQ
  ```
  Add index on `(channel, created_at)`. Keep RLS open as today; ensure GRANTs still cover new columns (no extra GRANT needed — column-level inherited).
- `PublicChat.tsx`:
  - Channel sidebar (`#general`, `#gaming`, `#commands`). Filter messages by selected channel; subscribe with `filter: channel=eq.<name>`.
  - Header shows current channel; switching channel re-fetches.
  - Message row: clicking ↩ sets a "replying to" banner above the composer. On send, persists `reply_to`. Rendered replies show a small quoted preview of the parent (nickname + first 80 chars).
  - Composer: add 🖼 button → opens a Giphy search popover. Uses Giphy public beta key (`dc6zaTOxFJmzC`) against `api.giphy.com/v1/gifs/search`. Picking a gif sends a message with `attachment_url` + `attachment_type='gif'` and empty content.
  - Render `attachment_type==='gif'|'image'` as an `<img>` (max-h 320px, rounded).
  - Avatar: each message shows `avatar_url` (fallback to `cat-durr.png`). Nickname prompt screen also shows an avatar with a "change" button (file upload → Supabase Storage bucket `chat-avatars`, public; or paste URL).
  - In `#commands`, intercept messages starting with `!quote`:
    - `!quote @nick text…` (or replying to a message with `!quote`) → client inserts a bot message with `nickname='Make it a Quote#6660'`, `attachment_type='quote'`, `quote_payload={text, author: targetNick, handle:'@'+targetNick.toLowerCase(), avatar_url: targetAvatar}`.
    - Renderer for `quote` payload reproduces the reference card 1:1: black 1200×630 background, left half = avatar with subtle white glow/rounded-square mask + speech-bubble cutout (SVG), right half = large white quote text, italic `- Author` line, gray `@handle` below, "Make it a Quote#6660" small-caps bottom-right. Implemented as a React component `QuoteCard` rendered inline in chat and also exposed as a downloadable PNG via html-to-image on click.
  - Help text in `#commands`: `Type !quote @nick "their words" or reply to a message with !quote`.

### 6. Storage bucket for avatars/quote backgrounds
- Create public bucket `chat-avatars` via `supabase--storage_create_bucket`. RLS migration: anyone can read; authenticated OR anon can insert (since chat is no-login). Bucket policies allow public SELECT + open INSERT (chat is intentionally open).
- Default avatar: upload `cat-durr.png` (from `/mnt/user-uploads/cat-durr.png`) into the bucket as `defaults/cat-durr.png` so chat references a stable URL.

### 7. Options screen + .p2d export/import
- New view `"options"` in `src/routes/index.tsx`. Where-to gets an **Options** button next to Games/Sites/AI/Chat.
- `src/components/Options.tsx`:
  - Inputs for **username** (writes `localStorage.p2p_nick`) and **avatar URL / upload** (writes `localStorage.p2p_avatar`).
  - **Download .p2d** button — gathers `{version:1, nickname, avatar, customSites, chatHistorySnapshot: lastNMessages, account: null}` → `JSON.stringify` → `Blob` → download as `p2p-backup.p2d` (mime `application/json`).
  - **Import .p2d** — `<input type="file" accept=".p2d">` → parses JSON, validates `version`, writes each section back into localStorage. Shows toast.
  - Account section: shows "Sign in with Google" (Supabase OAuth). When signed in:
    - Replace .p2d UI with "Synced to your account ✓"
    - On settings/avatar/nickname/customSites change, upsert into a new `user_profiles` table (`user_id pk, nickname, avatar_url, custom_sites jsonb, updated_at`).
    - On sign-in, hydrate localStorage from the row.
    - Sign-out button restores file-based mode.

### 8. Auth wiring (optional Google)
- Use `supabase--configure_social_auth` with `providers: ["google"]`. **Do not** disable email; users may still skip entirely (chat & everything else works without auth).
- Migration for `public.user_profiles` with proper RLS (`auth.uid() = user_id`) and GRANTs.

### 9. Default font already DaysOne — keep.

---

## File map

Create:
- `src/components/Options.tsx`
- `src/components/QuoteCard.tsx`
- `src/components/GiphyPicker.tsx`
- `src/lib/p2d.ts` (export/import helpers)
- `src/lib/ai-fallback.server.ts` (Pollinations provider)
- `scripts/build-p2p-svg.mjs`
- `src/assets/cat-durr.png.asset.json` (lovable-assets pointer from uploaded image)
- Migration: extend `chat_messages`, create `user_profiles`, create avatars bucket.

Edit:
- `src/routes/index.tsx` — add Zodiac, Options view, custom sites merge, Options button.
- `src/routes/api/chat.ts` — try/catch fallback to Pollinations.
- `src/components/AIChat.tsx` — Download/Add-to-Sites buttons.
- `src/components/PublicChat.tsx` — channels, replies, avatar, Giphy, MIAQ.
- `package.json` — add `build:svg` script, deps: `html-to-image`.

Replace:
- `p2p.svg` (output of build script).

---

## Acceptance checks before finishing

- AI chat replies even when Lovable key returns 402.
- `Download .html` produces a working standalone file; `Add to Sites +` then clicking the new tile launches it.
- Sites page shows **Zodiac**; clicking loads the SVG in iframe modal.
- Chat: switch between `#general`, `#gaming`, `#commands`; messages stay per-channel. Reply shows quoted parent. Send a GIF via 🖼. In `#commands`, `!quote @ada hello` renders a card matching the reference layout.
- Options: change nickname/avatar persist; export `.p2d` then re-import on a fresh browser restores everything. Google sign-in optional and toggles to synced mode.
- `p2p.svg` opens directly in a browser and renders the full app without an iframe.