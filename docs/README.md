# Documentation index

All documents are in English. Numbered documents build on each other, so read them in order the first time.

| # | Document | What it answers | Main readers |
|---|---|---|---|
| 00 | [Overview](00-overview.md) | What we build, for whom, the scope, the user journeys, the glossary | Everyone |
| 01 | [Business model](01-business-model.md) | Who pays, pricing, unit economics, risks | Owner, Platform |
| 02 | [Architecture](02-architecture.md) | Components, data flows, decisions (ADRs), security, reliability | Everyone |
| 03 | [Design system](03-design-system.md) | Visual language, tokens, layout, components, copy rules | Web App |
| 04 | [Data sources](04-data-sources.md) | Every market/news API: endpoints, keys, limits, fallbacks, caching | Agent sessions, Web App |
| 05 | [API contracts](05-api-contracts.md) | Exact JSON between browser, Next.js, n8n and Supabase | Everyone who builds an interface |
| 06 | [Database](06-database.md) | Tables, enums, RLS, triggers, realtime, who writes what | Platform, Web App, agent sessions |
| 07 | [n8n playbook](07-n8n-playbook.md) | How we build, name, test, publish and version n8n workflows | Every session that touches n8n |
| 08 | [Agents](08-agents.md) | Shared agent framework: guardrail, I/O contract, models, prompt assembly, evals | Agent sessions, Platform |
| 09 | [Workstreams](09-workstreams.md) | Who builds what in parallel, ownership, phases, kickoff prompts | Everyone, before starting work |
| 10 | [Operations](10-operations.md) | Accounts, credentials, env vars, deploy, monitoring, runbook, costs | Owner, Platform |
| — | [STATUS](STATUS.md) | Live progress per session | Everyone |
| — | [CHANGELOG](CHANGELOG.md) | Contract changes log | Everyone |

Agent-specific material lives outside `docs/`:

| Path | Content |
|---|---|
| [`agents/README.md`](../agents/README.md) | Index of agents and how prompts are deployed |
| [`agents/_shared/guardrail.md`](../agents/_shared/guardrail.md) | The scope guardrail every agent includes verbatim |
| [`agents/_shared/response-policy.md`](../agents/_shared/response-policy.md) | Data honesty, formatting, risk language |
| `agents/<agent>/SPEC.md` | Mission, tools (I/O), data sources, method, output, eval cases |
| `agents/<agent>/system-prompt.md` | The exact system prompt deployed to n8n |
| [`prompts/`](../prompts/README.md) | Master prompt, business model prompt, build system prompt, UI design prompt |
| [`supabase/`](../supabase/README.md) | Migrations and demo seed |
| [`n8n/registry.md`](../n8n/registry.md) | Every n8n workflow: name, owner, ID, status |

## Reading list per session

| Session | Read in this order |
|---|---|
| Platform & Main | 00, 02, 05, 06, 07, 08, 10, `agents/_shared/*`, `agents/main/*`, `supabase/*`, `n8n/registry.md` |
| Web App | 00, 02, 03, 05, 06, 04 (§3 "Symbol conventions and mapping" and §5 "Next.js direct calls"), `apps/web/README.md` |
| Trading | 00, 02, 04, 05, 07, 08, `agents/_shared/*`, `agents/trading/*`, `n8n/registry.md` |
| Horizon 2030 | 00, 02, 04, 05, 07, 08, `agents/_shared/*`, `agents/horizon/*`, `n8n/registry.md` |
| Portfolio & Macro | 00, 02, 04, 05, 06, 07, 08, `agents/_shared/*`, `agents/portfolio/*`, `n8n/registry.md` |
