
# SightHub — Social Platform Feature

This is a very large feature (essentially a Discord + social-posts + site-hosting platform). Before I start building, I want to confirm scope and sequencing so we ship something that actually works instead of a half-built shell of 20 systems.

## What you asked for (my understanding)

A new **SightHub** button on the home screen. Inside SightHub:

1. **Auth gate** — Google sign-in or "continue as guest". Guests are read-only-lite (blocked from AI, posting, profiles, communities, sites).
2. **Top nav**: SightHub | Posts | Communities | (back button) | profile (+ button for new post) | settings.
3. **Posts tab** — users publish sites (zip upload, GitHub repo sync, or manual files), pick a homepage, optionally AI-assist to get it running. Posts feed shows them.
4. **Communities tab** — Discord-like:
   - Create public/private communities, channels (public/private/age-restricted), roles & permissions, owner can rename/re-image/assign roles.
   - Chat with `@user` pings, `#channel` tags (clickable), HTML-code preview embeds (like Discord image embeds).
   - Community "apps" (Discord-app style) — build with AI or name+desc+icon, add to personal apps or to a server (owner-gated).
   - Age-restricted channel gate (proceed / close → prev channel).
5. **Profiles** — user profile pages built with AI or uploaded files. Status shows randomized "playing [game]" / "taking a gander of [site]" / "messin around on [site]".
6. **Social graph** — follow / friend, notifications on ping, new post from followed accounts.
7. **Settings** (next to profile) — link GitHub, plus everything from Options. Also add GitHub login to Options and to the original auth entry.
8. **Moderation** on posts and messages.

## Reality check — this is ~2–3 months of full-stack work

Concretely, shipping this properly means:
- ~15–20 new DB tables (communities, channels, roles, role_permissions, memberships, messages, posts, sites, apps, app_installs, follows, friendships, notifications, statuses, moderation_reports, github_links, …), each with RLS.
- Realtime for chat, notifications, statuses.
- File storage buckets for site uploads, avatars, community icons, app icons.
- GitHub OAuth + repo import + sync worker.
- HTML sandboxing for user-uploaded sites and inline HTML previews (must be iframed with `sandbox=` or you're shipping a stored-XSS platform to every visitor).
- AI-assisted site fixer, AI app generator, AI profile-page generator.
- A moderation pipeline (auto + manual queue).
- Notification delivery.
- Permission/role engine.

I can't do all of that in one turn — and if I try, you'll get a lot of broken buttons instead of one thing that works.

## What I'd like to confirm before I write code

**A. Pick a slice to build first.** I'd suggest this order (each slice is ~1 build turn and actually works end-to-end):

```text
Slice 1  SightHub shell + Google/guest auth gate + guest restrictions
         + top nav (Posts / Communities placeholders) + back button
         + Settings page with GitHub link + GitHub login in Options
Slice 2  Posts tab: upload a site (manual files OR zip), pick homepage,
         sandboxed iframe preview, feed of posts
Slice 3  Communities v1: create community, text channels, realtime chat,
         @user pings, #channel tags, HTML-embed preview
Slice 4  Roles & permissions, private / age-restricted channels
Slice 5  Profiles + follow/friend + notifications + status
Slice 6  Community apps (AI-generated), app installs
Slice 7  GitHub repo import/sync, AI site fixer, moderation
```

**B. GitHub integration** — Lovable's built-in GitHub connector authenticates *your* workspace, not each end user. Per-user GitHub login (so each user syncs *their* repos) requires you to create a GitHub OAuth App and give me the Client ID/Secret. Are you OK with that, or should GitHub import be "paste a public repo URL" only for v1?

**C. HTML-in-chat previews** — I will render them in a locked-down `<iframe sandbox>` with no `allow-same-origin`. That means the HTML runs but can't touch cookies/localStorage/other users. Confirm that's acceptable (it's the only safe option).

**D. Guest identity** — currently the app already lets anonymous users chat with just a nickname. Should the existing `/` chat stay open to guests, and only *SightHub* enforces the Google-or-guest gate? Or do you want the whole app gated?

## My recommendation

Approve Slice 1 now. I'll build the SightHub button, the Google/guest gate, the guest restriction system (a single `useSightHubAuth` hook everything checks), the top-nav shell with Posts/Communities as empty tabs, the back button, a Settings page that includes GitHub link + everything from Options, and add GitHub login to Options and the sign-in screen. Then we iterate slice-by-slice.

Reply with:
- **"go"** to build Slice 1 as described, plus your answers to B / C / D.
- Or edits to the slice order / scope.
