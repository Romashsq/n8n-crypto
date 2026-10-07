# 10. Operations: setup, deploy, monitoring, runbook

## 1. Accounts and plans

| Service | MVP plan | Why | Approx. cost |
|---|---|---|---|
| n8n Cloud | **Starter** (paid, so workflows run 24/7 after any trial ends); Pro when chat volume exceeds ~2,000 messages a month | Agents and automation runtime | €24/month (Pro €60) |
| Supabase | Free, with the daily job keeping it active. **Pro in Phase B** (no auto-pause, backups) | DB, Auth, Realtime | $0 → $25/month |
| Vercel | Hobby (personal, non-commercial). Pro before any commercial use | Web hosting | $0 → $20/seat |
| Anthropic | n8n AI gateway credits; own API key (`Aura Anthropic` credential) when volume grows | LLM | ~$0.04–0.07 per agent reply |
| Twelve Data, Finnhub, FRED, CoinGecko Demo | Free keys | Market data | $0 |
| GitHub | `romashsq/n8n-crypto` | Source of truth | $0 |

## 2. Setup checklist (in order)

| # | Step | Who | Details |
|---|---|---|---|
| 1 | Create the Supabase project and apply the migration | Owner + PLAT | [supabase/README.md](../supabase/README.md) steps 1–2 |
| 2 | Auth settings, friend user, optional demo seed | Owner + PLAT | supabase/README steps 3–5 |
| 3 | Get free API keys | Owner | Twelve Data (twelvedata.com → sign up → API key), Finnhub (finnhub.io → free API key), FRED (fredaccount.stlouisfed.org → API Keys), CoinGecko (coingecko.com → Developer Dashboard → Demo API key) |
| 4 | Generate the webhook key | Owner | `openssl rand -hex 32` (or any 64-character random string) |
| 5 | Create the n8n credentials, with the exact names in [07-n8n-playbook.md §6](07-n8n-playbook.md#6-credentials) | Owner | n8n → Credentials → Add credential |
| 6 | Create the Vercel project | Owner + WEB | Import `romashsq/n8n-crypto`; root directory `apps/web`; framework Next.js |
| 7 | Set the Vercel env vars | Owner | Everything in [`.env.example`](../.env.example), for Production and Preview |
| 8 | Add the Vercel URL to the Supabase Auth Site URL and redirect URLs | Owner | supabase/README step 3 |
| 9 | Smoke test | PLAT + WEB | Sign in as the friend → Main → "Hi" → reply arrives. Then "Give me a pasta recipe" → refusal |

## 3. Environment variables (Vercel, `apps/web`)

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Supabase publishable (or legacy anon) key |
| `N8N_WEBHOOK_BASE_URL` | server | `https://<instance>.app.n8n.cloud/webhook` |
| `N8N_WEBHOOK_KEY` | server | Same value as the n8n credential `Aura Webhook Key` |
| `FINNHUB_API_KEY`, `TWELVE_DATA_API_KEY`, `COINGECKO_DEMO_API_KEY`, `FRED_API_KEY` | server | Provider keys (the same keys as in n8n are fine) |
| `SEC_USER_AGENT` | server | `AuraInvestAI/1.0 (contact: <owner email>)` |

## 4. Deploy and release

| Layer | How | Rollback |
|---|---|---|
| Web | Merge to `main` deploys to Vercel production; every PR gets a preview URL | Vercel → Deployments → Instant Rollback |
| n8n | `update_workflow`, test, then `publish_workflow`; the source is committed in the same work block. For risky changes, build a `… [draft]` copy first | `get_workflow_versions_diff` → `restore_workflow_version`, then publish |
| Database | New migration file → apply (SQL editor or `supabase db push`) → commit | Forward-fix with a new migration. Never edit applied ones |
| Prompts | Edit `agents/**.md` → `node n8n/scripts/embed-prompts.mjs` → update and publish the agent workflow | Revert the commit, re-embed, publish |

## 5. Monitoring

Run in the Supabase SQL editor (as owner).

```sql
-- Runs in the last 24 h by workspace and status
select workspace, status, count(*) from public.agent_runs
where started_at > now() - interval '24 hours' group by 1, 2 order by 1, 2;

-- Latency P50 / P95 per workspace, last 7 days (completed runs)
select workspace,
       percentile_cont(0.5) within group (order by latency_ms) as p50_ms,
       percentile_cont(0.95) within group (order by latency_ms) as p95_ms
from public.agent_runs
where status = 'completed' and started_at > now() - interval '7 days' group by 1;

-- Stuck runs (should be empty)
select request_id, workspace, started_at from public.agent_runs
where status = 'running' and started_at < now() - interval '3 minutes';

-- Top failure reasons, last 7 days
select error_code, left(error_message, 120) as msg, count(*) from public.agent_runs
where status = 'failed' and started_at > now() - interval '7 days' group by 1, 2 order by 3 desc limit 10;

-- LLM cost this month per user
select p.display_name, u.replies, u.cost_usd from public.monthly_usage u
join public.profiles p on p.id = u.user_id where u.month = date_trunc('month', now());

-- Did today's daily review run?
select count(*) from public.portfolio_snapshots
where source = 'daily_review' and as_of > date_trunc('day', now());
```

In n8n, filter Executions by "failed" and check `Aura · System · Error Handler` notifications.

Targets:

- failure rate under 2%;
- P95 under 60 s;
- zero stuck runs;
- the daily review present every day.

## 6. Runbook

| Symptom | Likely cause | Fix |
|---|---|---|
| UI shows "Not delivered" | Gateway unpublished, n8n down, or key mismatch | Check that `Aura · API · Chat Message` is published; compare `N8N_WEBHOOK_KEY` with the credential; check status.n8n.io |
| Spinner, then a timeout error after 150 s | Gateway failing after its 202 response | n8n Executions for the gateway; `agent_runs.error_message` |
| Every reply is `AGENT_FAILED` | Anthropic gateway credits exhausted or an invalid model ID | Check credits in n8n; create the `Aura Anthropic` credential with an own key and switch the model nodes |
| Binance returns 451 or 403 | Geo or datacenter block | Tools must fall back to `data-api.binance.vision`, then Bybit. On Vercel, confirm `preferredRegion = 'fra1'` |
| Twelve Data 429 or "out of API credits" | 800 daily credits used | Raise cache TTLs; Stooq daily fallback; consider the paid plan |
| SEC 403 | Missing User-Agent or more than 10 requests a second | Set the `User-Agent` header; add a wait between batch calls |
| FRED errors | Invalid key or a FRED maintenance window | Check the key; serve from `market_cache` |
| Whole app fails to load data | Supabase project paused (free tier) | Restore it in the Supabase dashboard; make sure the daily job runs; upgrade to Pro |
| Replies only appear after a refresh | Realtime not delivering | Check the `supabase_realtime` publication and RLS; the web app's fallback polling (every 3 s while a reply is pending) should cover it |
| Wrong or invented numbers in replies | A prompt or tool regression | Re-run the agent's eval cases; check the tool output in the execution log; fix the tool or prompt; re-embed |

## 7. Weekly checklist

- [ ] All `aura`-tagged workflows are published. No repeating failed executions.
- [ ] Failure rate under 2%; P95 under 60 s; no stuck runs.
- [ ] LLM cost this month is within budget.
- [ ] Every data provider responds. Look for repeated `UPSTREAM_ERROR` in runs.
- [ ] The daily review ran every day.
- [ ] Once a year: update the FOMC meeting constant in `Aura · Tool · Macro Calendar`.

## 8. Security checklist

- No secrets in the repo. Before every PR, run `git grep -nE "sb_secret_|service_role|eyJhbGciOi|sk-ant-|apikey=" -- . ':!docs' ':!*.md'`. It should return nothing.
- Rotating the webhook key: create the new value, update the n8n credential **and** the Vercel env var, then redeploy Vercel. The old key stops working immediately.
- Supabase sign-ups stay disabled. Users are invited by the owner.
- The browser only ever has the publishable key. The secret key exists only in n8n.
- No exchange trading keys anywhere in the system.
