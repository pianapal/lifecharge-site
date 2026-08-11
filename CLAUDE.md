# CLAUDE.md

**Read `AGENTS.md` in this directory. It is the single source of truth for this repo.**

It is shared with every other AI coding tool (Codex, Cursor, etc.) so the site stays
consistent no matter which one made the edit. Do not duplicate guidance here, and do not
let this file drift from it. If a convention changes, update `AGENTS.md`.

Quick reminders, all detailed in `AGENTS.md`:

1. **Edit `slug/index.html`, not `slug.html`.** Apache serves the subdirectory copy.
2. **No em dashes.** Anywhere. Including comments and JSON-LD.
3. **Edit `shared.src.css`, then rebuild `shared.css`.** Never hand-edit the minified file.
4. **`height: auto` next to every `aspect-ratio`** on images, or they render at raw pixel height.
5. **Deploy = `git push origin main`.** GitHub Actions handles the server. No SSH needed.
6. **Verify with `curl` after deploying.** Do not assume it shipped.
