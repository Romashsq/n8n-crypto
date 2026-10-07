# apps/site: Aura Invest AI live MVP web app

This is a single static page (`index.html`) deployed on Vercel. Each workspace talks directly to its own n8n agent through that agent's public chat webhook:

| Workspace | Agent | n8n workflow |
|---|---|---|
| Main | Main agent | `Aura · MVP · Main Agent` |
| Trading Space | Scanner agent | `Aura · MVP · Trading Agent` |
| Horizon 2030 | Auditor agent | `Aura · MVP · Horizon Agent` |
| Macro & Portfolio | Macro Strategist | `Aura · MVP · Portfolio Agent` |

- **Webhook URLs** live in the `CONFIG` object at the top of the script. A `null` URL marks that workspace "setting up".
- **Chats** are stored in the browser (`localStorage`). Each chat has its own `sessionId`, which the agent uses as conversation memory. The pinned "Portfolio chat" keeps one stable session, so the agent remembers saved holdings.
- **Markdown** is rendered by a small built-in renderer that escapes all HTML first, so there are no external script dependencies.
- **Supabase auth and server-side history** replace `localStorage` in the full build (see `docs/02-architecture.md`).
