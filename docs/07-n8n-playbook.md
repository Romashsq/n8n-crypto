# 07. n8n playbook

This document says how every session builds, names, tests, publishes and versions n8n workflows. Several AI sessions work on the same n8n instance at once, so these rules are strict.

## 1. Where things live

| Item | Value |
|---|---|
| Instance | n8n Cloud (EU, Frankfurt) connected through the n8n MCP server |
| Project | Personal project `Roman <rbondarenko965@gmail.com>` (`projectId: RA51JancyDRm2cCw`) |
| Folder | **`Aura Invest AI`**, created once by Platform & Main with `create_folder`. Every Aura workflow goes in it |
| Tags | `aura` on every workflow, plus exactly one kind tag: `aura-api`, `aura-agent`, `aura-tool`, `aura-job`, `aura-system` |
| Registry | [`n8n/registry.md`](../n8n/registry.md): the name, owner, ID and status of every workflow |
| Source | [`n8n/workflows/`](../n8n/workflows/README.md): one Workflow SDK file per workflow |

## 2. Naming

```
Aura · <Kind> · <Name>
```

The separator is a space, a middle dot (U+00B7) and a space. Kind is one of `API`, `Agent`, `Tool`, `Job`, `System`.

Source file: `n8n/workflows/<kind>-<name-kebab>.workflow.ts`. For example, `Aura · Tool · Crypto Chart` lives in `tool-crypto-chart.workflow.ts`.

Webhook paths: `aura/v1/<resource>/<action>`, for example `aura/v1/chat/message`.

Tool names inside agents use `snake_case` verbs, such as `get_order_book` and `search_news`. They are listed in each agent's `SPEC.md`.

## 3. Find-or-create (no duplicates, ever)

Before creating any workflow:

1. Call `search_workflows` with `query: "<exact name>"`.
2. **If it exists, update it** (`update_workflow`). The workflow ID stays the same, so everything that calls it keeps working. If a different session owns it according to `n8n/registry.md`, stop and leave a note in `docs/STATUS.md` instead.
3. **If it doesn't exist, create it**, move it into the `Aura Invest AI` folder, tag it, and add or update its row in `n8n/registry.md` in the same commit.

Platform & Main creates **stub** agent workflows early, so that the gateway can be wired to stable IDs. Each agent session then *updates* its stub in place and never creates a second copy.

## 4. Build procedure (through the n8n MCP tools)

1. `get_workflow_sdk_reference`. **Required** before writing SDK code; never guess syntax.
2. `get_workflow_best_practices` for each relevant technique (for example `chatbot`, `scheduling`, `data_persistence`, `monitoring`).
3. `search_nodes` and `get_node_types` for every node you use. Copy exact parameter names. For tool nodes use `search_nodes` with the node's Tool variant.
4. `list_credentials` to find credential IDs by name (§6). Never put secrets in code.
5. Write or modify the source file in `n8n/workflows/`. If it embeds prompts, run `node n8n/scripts/embed-prompts.mjs` (§9).
6. `validate_workflow` and fix every issue.
7. `create_workflow_from_code` (new) or `update_workflow` (existing), passing the **same code** that is committed.
8. Test with `prepare_workflow_pin_data` and `test_workflow` (pinned inputs), then one real `execute_workflow` (§10).
9. `publish_workflow` for anything that must run in production (§11).
10. Commit the source and the `n8n/registry.md` row. Update your section of `docs/STATUS.md`.

## 5. Workflow catalog

| Workflow | Kind | Trigger | Called by | Owner |
|---|---|---|---|---|
| `Aura · API · Chat Message` | API | Webhook `POST aura/v1/chat/message` | Next.js `/api/chat/send` | Platform & Main |
| `Aura · API · Portfolio Snapshot` | API | Webhook `GET aura/v1/portfolio/snapshot` | Next.js `/api/portfolio/snapshot` | Portfolio |
| `Aura · System · Guardrail` | System | Execute Workflow Trigger | Gateway | Platform & Main |
| `Aura · System · Error Handler` | System | Error Trigger | Every published workflow (settings → Error workflow) | Platform & Main |
| `Aura · Agent · Main` | Agent | Execute Workflow Trigger (`AgentInput`) | Gateway | Platform & Main |
| `Aura · Agent · Trading` | Agent | Execute Workflow Trigger | Gateway | Trading |
| `Aura · Agent · Horizon` | Agent | Execute Workflow Trigger | Gateway | Horizon |
| `Aura · Agent · Portfolio` | Agent | Execute Workflow Trigger | Gateway, Daily job | Portfolio |
| `Aura · Tool · Market Overview` | Tool | Execute Workflow Trigger | Main agent | Platform & Main |
| `Aura · Tool · Crypto Chart` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Order Book` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Trade Flow` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Derivatives` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Market Chart` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Crypto Sentiment` | Tool | ″ | Trading agent | Trading |
| `Aura · Tool · Company Profile` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Financials` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Insider Activity` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Filings` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Price History` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Crypto Fundamentals` | Tool | ″ | Horizon agent | Horizon |
| `Aura · Tool · Portfolio` | Tool | ″ | Portfolio agent, Snapshot API, Daily job | Portfolio |
| `Aura · Tool · Quotes` | Tool | ″ | Tool · Portfolio | Portfolio |
| `Aura · Tool · Macro Snapshot` | Tool | ″ | Portfolio agent | Portfolio |
| `Aura · Tool · Macro Calendar` | Tool | ″ | Portfolio agent | Portfolio |
| `Aura · Tool · Portfolio History` | Tool | ″ | Portfolio agent | Portfolio |
| `Aura · Job · Daily Portfolio Review` | Job | Schedule (06:30 UTC daily) | — | Portfolio |

Agents may also use plain tool nodes directly, with no sub-workflow needed:

- **Brave Search Tool** (`news`, `llm_context`; gateway-managed credential);
- **Calculator**;
- **RSS Read** wrapped in a sub-workflow if needed.

## 6. Credentials

The **owner creates every credential in the n8n UI.** The MCP tools cannot create credentials. Sessions find them with `list_credentials` and reference them by ID. If a credential is missing, add it under "Needs owner" in `docs/STATUS.md`.

| Credential name | Type | Contents | Used by |
|---|---|---|---|
| `Aura Webhook Key` | Header Auth | Name `X-Aura-Key`, value = a long random string (same as Vercel `N8N_WEBHOOK_KEY`) | API webhooks |
| `Aura Supabase` | Supabase API | Host + secret / service-role key | Row operations |
| `Aura Postgres` | Postgres | Supabase session pooler connection | Gateway queries, cache |
| `Aura Twelve Data` | Query Auth | Name `apikey`, value = key | Stock, ETF and gold candles |
| `Aura Finnhub` | Header Auth | Name `X-Finnhub-Token`, value = key | Quotes, metrics, insiders, news |
| `Aura FRED` | Query Auth | Name `api_key`, value = key | Macro series |
| `Aura CoinGecko` | Header Auth | Name `x-cg-demo-api-key`, value = key | Crypto market data |
| Anthropic | n8n AI gateway (managed, no credential needed) **or** `Aura Anthropic` (Anthropic API) | — / own API key | Anthropic Chat Model nodes |
| Brave Search | n8n AI gateway (managed) | — | Brave Search Tool |

Providers without keys (Binance, Bybit, SEC, DefiLlama, alternative.me, Frankfurter) need no credential.

**SEC** requires the header `User-Agent: AuraInvestAI/1.0 (contact: <owner email>)`. Store the email in the workflow as a constant, not in the repo.

## 7. Standard node settings

| Node | Settings |
|---|---|
| HTTP Request | Timeout 15,000 ms; **Retry on fail**: 3 tries, 2,000 ms apart; response format JSON; header `User-Agent: AuraInvestAI/1.0`; on error **continue (using error output)** inside tools, so the tool can return an `ok: false` envelope |
| Code | JavaScript. Keep pure and deterministic. Compute indicators here, not in prompts. No secrets in code |
| Execute Workflow (sub-workflows) | Source: database, by **ID** (from the registry); wait for completion; on error: continue (error output) |
| AI Agent | `promptType: define`; `hasOutputParser: true`; `options.maxIterations: 8`; `options.returnIntermediateSteps: true`; system message from the embedded prompt constant |
| Anthropic Chat Model | Model `claude-sonnet-5-5` (agents) or `claude-haiku-4-5` (classifier); `maxTokensToSample: 4096` (classifier 200); `promptCaching: '5m'`; thinking `disabled` (Horizon may use `adaptive` with effort `low`) |
| Webhook | `responseMode: responseNode`; authentication Header Auth (`Aura Webhook Key`) |
| Workflow settings | Error workflow = `Aura · System · Error Handler`; timezone `UTC`; save failed production executions. Agents: execution timeout 140 s |

## 8. Gateway specification (`Aura · API · Chat Message`)

```
Webhook POST aura/v1/chat/message (Header Auth)
 → Code "Validate"                       required fields, enums, UUIDs → else Respond 400
 → Postgres "Start run"                  insert agent_runs … on conflict (request_id) do nothing returning id
 → IF started?
      no  → Respond 200 {accepted:true, duplicate:true}   (stop)
      yes → Respond 202 {accepted:true, duplicate:false}  (execution continues after responding)
 → Postgres "Load message + chat"        verify message_id/chat_id/user_id (06-database.md §7) → else mark run failed (stop)
 → Postgres "Load history" + "Load profile"
 → Code "Budget check"                   monthly_usage.replies vs profiles.monthly_reply_cap → BUDGET_EXCEEDED path
 → Execute Workflow "Aura · System · Guardrail"   {message} → {in_scope, reason}; on error: treat as in_scope
 → IF in_scope?
      no  → Postgres insert assistant refusal (metadata.on_topic=false) → run status refused (stop)
 → Code "Build AgentInput"
 → Switch on workspace → Execute Workflow "Aura · Agent · <Main|Trading|Horizon|Portfolio>" (error output enabled)
 → Code "Finalize"                       latency, cost from price table, metadata (AssistantMetadata)
 → IF artifact? → insert artifacts (message_id null)
 → Postgres insert assistant message → (if artifact) update artifacts.message_id
 → IF chat.title = 'New chat' and title_suggestion → update chats.title
 → Postgres update agent_runs (completed, model, tokens, cost, latency, finished_at)
Error branch (agent failed or timed out):
 → insert assistant error message (AGENT_FAILED | AGENT_TIMEOUT text) → run failed (error_code, error_message)
```

Price table, in USD per million tokens, kept in the "Finalize" Code node:

```js
const PRICES = { 'claude-sonnet-5-5': [2, 10], 'claude-haiku-4-5': [1, 5], 'claude-opus-5-5': [4, 20] };
```

## 9. Prompts: repo to workflow

System prompts live in `agents/`. They are embedded into workflow source at build time:

```ts
const SYSTEM_PROMPT = [
  /* @embed agents/_shared/guardrail.md */ "",
  /* @embed agents/_shared/response-policy.md */ "",
  /* @embed agents/trading/system-prompt.md */ "",
].join('\n\n');
```

`node n8n/scripts/embed-prompts.mjs` replaces each marked string literal with the current file content. `--check` exits non-zero if any embed is stale. Run it before every create or update. Never edit embedded strings by hand. Change the `.md` file and re-embed.

## 10. Testing

| Level | How | Pass criteria |
|---|---|---|
| Tool | `prepare_workflow_pin_data` plus `test_workflow` with sample inputs; then `execute_workflow` live | Returns the `ok: true` envelope with `source` and `as_of`. Output ≤ 6k tokens. A provider failure returns `ok: false`, not a crash |
| Agent | `execute_workflow` with `AgentInput` fixtures (the eval cases in `agents/<id>/SPEC.md`) | Every eval case passes its criteria; output parses as `AgentOutput` |
| Gateway | `test_workflow` with pinned webhook bodies; then a real POST from Next.js (or curl with the key) | One assistant message per request; correct run status; duplicate request returns `duplicate: true` |
| Job | Manual execution; then check the next scheduled run in executions | Snapshot row plus pinned-chat message created |

`/webhook-test/...` URLs work only while the editor is listening. Production calls always use `/webhook/...` and require the workflow to be **published**.

## 11. Publishing ("always working")

- Publish (`publish_workflow`) every API, Job and System workflow, and every Agent and Tool workflow that production calls.
- After any update to a published workflow, publish again so production uses the new version.
- Set the error workflow on every published workflow.
- Weekly check: `search_workflows` with tag `aura` shows everything published; `search_workflow_executions` shows no repeating errors.

## 12. Execution quota (n8n Cloud)

Only top-level production executions count: Starter has 2,500 a month and Pro has 10,000. **Sub-workflow runs do not count.**

| Source of executions | Count per event |
|---|---|
| One user chat message | 1 (gateway). Agents and tools are sub-workflows |
| Portfolio snapshot open or refresh | 1 |
| Daily review job | 1 per day |

This is why UI market data (ticker, candles) does not go through n8n (ADR-006). Parallel executions: Starter 5, Pro 20.
