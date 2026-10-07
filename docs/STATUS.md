# Status

Each session edits **only its own section**. Update it at the end of every work block. Newest notes go first inside each field.

Legend: ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked

---

## ARCH: Architecture and docs (Phase 0)

- **Status:** ✅ done (2026-10-07)
- **Done:**
  - all docs `00`–`10`;
  - agent specs and system prompts;
  - shared guardrail, response policy and scope classifier;
  - meta prompts;
  - Supabase migration and demo seed, both validated on local Postgres 16 with Supabase role and `auth` stubs. RLS was exercised: users cannot write assistant messages, edit messages, touch other users' rows or the pinned chat, or read `market_cache`. Idempotent run start works, as do the unique assistant reply per request and the `monthly_usage` view;
  - `n8n/scripts/embed-prompts.mjs`;
  - workflow registry skeleton.
- **Notes for all sessions:**
  - The n8n "Message an Agent" node is retired, so first-class n8n Agents can't be called from our web UI. Agents are workflow-based (ADR-001).
  - n8n Cloud counts only top-level executions; sub-workflows are free.
  - The CoinGecko public API now requires a free Demo key.
  - Binance may block datacenter IPs; use `data-api.binance.vision` first.

---

## PLAT: Platform & Main

- **Status:** ⬜
- **Done:**
- **In progress:**
- **Next:** P1-a (Supabase and credentials with the owner), P1-b (gateway echo path)
- **Needs owner:**
- **Requests to other sessions:**
- **Evidence (tests / evals / execution IDs):**

---

## WEB: Web App

- **Status:** ⬜
- **Done:**
- **In progress:**
- **Next:** W1 (deployed chat loop)
- **Production URL:**
- **Needs owner:**
- **Requests to other sessions:**
- **Evidence:**

---

## TRD: Trading

- **Status:** ⬜
- **Done:**
- **In progress:**
- **Next:** T1 (six tools live)
- **Needs owner:**
- **Requests to other sessions:**
- **Eval results (S1–S6, T1–T12):**

---

## HZN: Horizon 2030

- **Status:** ⬜
- **Done:**
- **In progress:**
- **Next:** H1 (six tools live; SEC fallbacks verified)
- **Needs owner:**
- **Requests to other sessions:**
- **Eval results (S1–S6, H1–H12):**

---

## PFL: Portfolio & Macro

- **Status:** ⬜
- **Done:**
- **In progress:**
- **Next:** F1 (tools live; health fixture = 74)
- **Needs owner:**
- **Requests to other sessions:**
- **Eval results (S1–S6, P1–P10):**
