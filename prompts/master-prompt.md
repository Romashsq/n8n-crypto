# Master prompt: Aura Invest AI

Paste everything below the line into any LLM to give it full project context.

---

# Project: Aura Invest AI

## Essence

Aura Invest AI is a multi-agent financial intelligence web app for a private investor. It works like an institutional-style research desk in one chat app: four specialised Claude agents read live market data, SEC filings, macro indicators and the user's own portfolio, then explain what matters, with sources and timestamps for every number. It gives analysis, not orders, and never executes trades.

## Users

- **Now:** one private investor (the owner's friend) holding crypto and US stocks, who trades short-term sometimes and invests long-term.
- **Later:** a small B2C SaaS for tech-savvy self-directed investors and crypto swing traders.

## The four workspaces (each is a chat area with its own agent)

1. **Main**: the home chat. Covers cross-asset market overview, financial education, comparisons, and which workspace to use.
2. **Trading**: minutes to about two weeks. Covers candles and indicators, order-book walls, taker flow and whale prints, funding, open interest and long/short ratios, key levels, and conditional scenarios with invalidation, for crypto, US stocks, indices (ETF proxies) and gold.
3. **Horizon 2030**: 3–10 years. Covers SEC 10-K/10-Q financials, insider buying (Form 4), moats, megatrends, and bear/base/bull 2030 valuation scenarios with explicit assumptions. Full theses are saved as Artifacts.
4. **Portfolio & Macro**: the user's own crypto, stocks, ETFs, gold and cash. Covers live valuation, a deterministic 0–100 health score, the macro regime from FRED data, rebalancing ideas by risk profile, the pinned "My Live Portfolio" chat, and an automatic daily brief.

Every agent shares a scope guardrail: anything outside markets, investing, macro or the user's portfolio gets one fixed refusal sentence.

## Architecture

- **UI:** Next.js on Vercel. Claude-like layout:
  - sidebar with logo, New chat, Search and Artifacts;
  - four workspace groups, each with a "+" and chat lists, plus the pinned portfolio chat;
  - profile panel at the bottom.

  Flat charcoal and matte ruby design with no glow, English only.
- **Data, auth, realtime:** Supabase (Postgres with RLS, email auth, invite-only, Realtime delivery of agent replies).
- **Agents and automation:** n8n Cloud.
  - A webhook gateway workflow receives each message.
  - A Claude Haiku classifier checks scope.
  - The gateway routes by workspace to an agent workflow: an AI Agent node with Claude Sonnet 5.5, tool sub-workflows and a structured output.
  - The reply is written to Supabase. A scheduled job writes a daily portfolio brief.
- **Async flow:** the browser posts to a Next.js route. The route stores the user message and calls the n8n webhook, which answers 202 at once. The agent works for 10–60 s, then writes the reply, which reaches the browser over Supabase Realtime.
- **Market data (free tiers):**
  - crypto: Binance spot and futures (Bybit fallback), CoinGecko, DefiLlama, alternative.me Fear & Greed;
  - stocks, indices and gold: Twelve Data, Finnhub, Stooq;
  - fundamentals: SEC EDGAR;
  - macro: FRED;
  - FX: Frankfurter;
  - news: Brave Search via n8n and RSS.

## Principles

1. Never invent numbers. Every figure comes from a tool, with source and time.
2. Each agent stays in its lane. Other questions get a short answer and a pointer to the right workspace.
3. Conditional, risk-aware language. No leverage recommendations, no guarantees.
4. Always on: published workflows, retries, provider fallbacks, idempotent writes, monitoring.
5. The repo is the source of truth. Prompts, workflow code, schema and contracts are versioned in Git; n8n is the runtime.

## Constraints

- English everywhere in the product.
- Free data tiers are fine for personal use, but need commercial licences before any paid launch.
- Positioned as information and analysis, not regulated investment advice.

## Current phase

Architecture and contracts are complete. Implementation runs in parallel sessions: Platform & Main, Web App, Trading, Horizon 2030, and Portfolio & Macro. All documentation lives in the repository `romashsq/n8n-crypto`, under `docs/`, `agents/`, `prompts/`, `supabase/` and `n8n/`.
