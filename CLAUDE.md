# CLAUDE.md: Aura Invest AI

Every Claude Code session in this repository loads this file automatically. Read it in full before you do anything else.

## What this project is

Aura Invest AI is a multi-agent financial intelligence web app for a private investor. The first user is one friend of the owner. Later it may become a small B2C SaaS.

The app has four chat workspaces. Each one is served by its own AI agent:

| Workspace (DB value) | UI label | Agent | Its job |
|---|---|---|---|
| `main` | Main | Main agent | Home chat: education, cross-asset market overview, guidance on which workspace to use |
| `trading` | Trading | Trading agent | Short-term setups (minutes to ~2 weeks): candles, indicators, order book, trade flow, derivatives positioning |
| `horizon` | Horizon 2030 | Horizon agent | Long-term investing (3–10 years): fundamentals from SEC filings, insider activity, moats, megatrends, 2030 scenarios |
| `portfolio` | Portfolio & Macro | Portfolio agent | The user's own crypto + stock portfolio, macro regime, risk and rebalancing ideas. Owns the pinned "My Live Portfolio" chat |

The stack:

- **UI**: Next.js on Vercel, using the design in `docs/03-design-system.md`.
- **Database and auth**: Supabase (Auth, Postgres, Realtime) is the system of record.
- **Agents and automation**: n8n Cloud. Webhooks, AI Agent workflows, tool sub-workflows and scheduled jobs.
- **Models**: Claude, called from n8n (Sonnet 5.5 for agents, Haiku 4.5 for the guardrail).
- **Market data**: free or public APIs. Binance, Bybit, Twelve Data, Finnhub, SEC EDGAR, FRED, CoinGecko, DefiLlama, alternative.me, RSS, and Brave Search through n8n.

## Golden rules

1. **English only** for everything we ship: UI copy, agent prompts and replies, code, comments, docs, commit messages. The owner may chat with you in Russian. Reply to the owner in their language, but write all artifacts in English.
2. **The repo is the source of truth and n8n is the runtime.** Prompts live in `agents/`, n8n workflow source in `n8n/workflows/`, the schema in `supabase/migrations/`. If you change something in n8n, commit the matching source in the same work block.
3. **Contracts are frozen** unless you follow the contract-change process in `docs/09-workstreams.md#contract-changes`. That covers:
   - `docs/05-api-contracts.md`
   - `docs/06-database.md` and the migrations
   - the agent I/O contract in `docs/08-agents.md`
   - the names in `n8n/registry.md`
4. **Respect ownership.** Each session owns specific files and n8n workflows (see `docs/09-workstreams.md`). Do not edit what you don't own. Leave a note in `docs/STATUS.md` instead.
5. **n8n: find-or-create by exact workflow name.** Never create duplicates. Read the SDK reference before writing workflow code. Follow `docs/07-n8n-playbook.md`.
6. **Never commit secrets.** Credentials live in n8n Credentials, Vercel env vars and Supabase. `.env.example` lists variable names only.
7. **Agents never invent market numbers.** Every figure comes from a tool result or from the user, with a source and a timestamp. See `agents/_shared/response-policy.md`.
8. **It must run 24/7.** That means published workflows, retries, provider fallbacks and idempotent writes. See `docs/10-operations.md`.

## Reading order

1. `docs/README.md` is the index and gives a reading list per role.
2. `docs/00-overview.md` covers what we build and why.
3. `docs/02-architecture.md` covers how the pieces fit.
4. `docs/09-workstreams.md` lists the sessions. Find yours, then read the documents listed for it.

## Repository map

```
CLAUDE.md                  you are here (auto-loaded)
README.md                  human-facing project intro
docs/                      all project documentation (numbered, read in order)
  STATUS.md                live status per session (each session edits only its own section)
  CHANGELOG.md             log of contract changes
agents/                    agent specs and system prompts (source of truth for n8n agents)
  _shared/                 guardrail + response policy used by every agent
  main/ trading/ horizon/ portfolio/
prompts/                   reusable meta-prompts (master, business model, build system, UI design)
supabase/                  migrations (schema, RLS, triggers) and demo seed
n8n/                       workflow registry, n8n workflow SDK source files
apps/web/                  Next.js app (owned by the Web App session)
```

## Working conventions

- **Branches**: work on the branch your session was given. Open a PR to `main` per milestone and keep PRs small.
- **Commits**: use conventional style. Examples: `feat(trading): add order book tool`, `docs: ...`, `contract: ...`, `fix(web): ...`.
- **Status**: at the end of every work block, update your own section of `docs/STATUS.md`. Record n8n workflow IDs in `n8n/registry.md`, editing your own rows only.
- **Blocked on the owner**: some steps only the owner can do, such as creating an account, an API key or an n8n credential. List these under "Needs owner" in your STATUS section and tell the owner in chat with exact click-by-click steps.
- **Tests**: no change is done until it has been exercised:
  - n8n workflows: `test_workflow` with pinned data, then one real run.
  - Web: typecheck, lint, and the relevant page clicked through.
  - Agents: the eval cases in `agents/<agent>/SPEC.md`.
