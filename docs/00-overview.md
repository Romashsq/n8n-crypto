# 00. Project overview (master brief)

## 1. One-line pitch

Aura Invest AI gives a private investor an institutional-style research desk in one chat app. Four specialised Claude agents read live market data, filings and macro indicators, then explain what matters and why.

## 2. Who it is for

**MVP user**: one private investor, a friend of the owner. They hold crypto and US stocks, trade short-term sometimes, and invest long-term. They want:

- fast, data-backed answers instead of screening charts, filings and news by hand;
- clear separation between "trade ideas this week" and "what to own until 2030";
- a live view of their own portfolio and how macro conditions affect it.

**Later (SaaS)**: tech-savvy retail investors and active swing traders who want an AI analyst grounded in real data. See [01-business-model.md](01-business-model.md).

## 3. The product in one screen

The layout is like the Claude app:

- **Left sidebar**:
  - the logo;
  - New chat, Search and Artifacts;
  - four workspace groups, each with a `+` button and its list of chats;
  - the pinned "My Live Portfolio" chat inside Portfolio & Macro;
  - the profile panel at the bottom.
- **Right side**: the active chat, with the active agent's icon highlighted.
- **Composer**:
  - an Assets dropdown (Crypto, Stocks, Indices, Gold);
  - a symbol field;
  - a timeframe selector in Trading;
  - a ruby send button.

The full spec is in [03-design-system.md](03-design-system.md).

## 4. The four workspaces and agents

| Workspace | DB value | Agent | Time horizon | Core question it answers | Primary data |
|---|---|---|---|---|---|
| Main | `main` | Main agent | Any | "What is going on and what does it mean?" | Cross-asset overview, news, education |
| Trading | `trading` | Trading agent | Minutes to ~2 weeks | "Where are the levels, who is in control, what is the setup?" | OHLCV candles and indicators, order book, trade flow and whale prints, funding, open interest, long/short ratios, news |
| Horizon 2030 | `horizon` | Horizon agent | 3–10 years | "Is this business or asset worth owning into 2030, and at what assumptions?" | SEC 10-K/10-Q facts, insider transactions (Form 4), company metrics, price history, crypto fundamentals, megatrend research |
| Portfolio & Macro | `portfolio` | Portfolio agent | Ongoing | "Is my portfolio healthy for the current macro regime, and what should I rebalance?" | The user's holdings in Supabase, live quotes, FRED macro series, fear and greed, macro calendar |

All four agents share one **scope guardrail**. Any question outside finance, markets, investing, macro or the user's portfolio gets the fixed refusal text from [`agents/_shared/guardrail.md`](../agents/_shared/guardrail.md).

## 5. Key user journeys (MVP acceptance scenarios)

1. **Morning check.** The user asks in Main: "What moved markets overnight?" The agent returns BTC, ETH, S&P 500 (SPY), Nasdaq 100 (QQQ), gold, the US 10Y yield and Fear & Greed with % changes, plus the three most relevant headlines with sources and timestamps.
2. **Trade setup.** In Trading, the user picks Crypto, `BTCUSDT`, `1h` and asks: "Where are the key levels today?"
   - The agent pulls 1h and 4h candles, order book walls, taker flow, whale prints, funding and open interest.
   - It returns a bias with confidence, a key-levels table, bullish and bearish scenarios with triggers and invalidation, and a candle chart.
3. **Long-term thesis.** In Horizon 2030: "Build a 2030 thesis for NVDA."
   - The agent pulls the profile, 5-year financials from SEC XBRL, insider activity, filings, price history and news.
   - It returns a thesis summary with bear/base/bull 2030 scenarios and explicit assumptions.
   - The full write-up is saved to **Artifacts**.
4. **Portfolio health.** The user opens the pinned **My Live Portfolio**.
   - They see total value, P&L, allocation by asset class and a deterministic health score.
   - "Run review" asks the Portfolio agent for a structured review against the macro regime.
   - Every morning a short daily brief appears in this chat automatically.
5. **Off-topic.** In any workspace: "Write me a pasta recipe." The reply is exactly the refusal text, and no agent tools run.

## 6. Scope

### MVP (this build)

- One invited user (sign-ups disabled) and email login through Supabase Auth.
- Four workspaces, unlimited chats, persistent history, rename, archive and delete.
- Async agent replies delivered over Supabase Realtime.
- Inline candle charts (TradingView Lightweight Charts) on messages that reference a symbol.
- Pinned live portfolio with manual holdings entry (crypto, stocks, ETFs, gold, cash).
- Artifacts: long reports and theses saved and listed in the sidebar.
- Daily portfolio review (scheduled in n8n).
- English-only UI and replies, dark theme, desktop-first and responsive down to phone width.

### Later

- Alerts (price or level crosses, funding extremes, insider buys) delivered in-app and on Telegram, possibly through a first-class n8n Agent with a Telegram integration.
- Read-only portfolio sync: Binance read-only API keys, broker CSV import, IBKR Flex.
- Watchlists, multi-user onboarding, billing (Stripe), PWA, voice.

### Non-goals

- Executing trades or holding funds. Aura never needs exchange trading keys, seed phrases or passwords.
- Tax or legal advice.
- Social or copy-trading features.

## 7. Product principles

1. **Grounded, never invented.** Every number has a source and a timestamp. A missing dataset is stated, not guessed.
2. **Each agent stays in its lane.** Workspaces have different horizons. An agent answers briefly outside its lane and suggests the right workspace.
3. **Analysis, not orders.** Agents use conditional, scenario-based language with invalidation levels and risk framing.
4. **Calm, dense, fast UI.** Flat matte surfaces, one ruby accent, no glow, numbers in tabular figures.
5. **Always on.** Published n8n workflows, retries, fallbacks and monitoring.

## 8. Glossary

| Term | Meaning |
|---|---|
| Workspace | One of `main`, `trading`, `horizon`, `portfolio`. Every chat belongs to exactly one. |
| Agent | The n8n workflow `Aura · Agent · <Name>` that answers messages for one workspace |
| Tool | An n8n sub-workflow or tool node an agent can call, such as `get_order_book` |
| Gateway | The n8n workflow `Aura · API · Chat Message` that receives every user message |
| Run | One agent execution for one user message, tracked in `agent_runs` |
| `request_id` | UUID generated by the web app per message. It makes retries idempotent. |
| Artifact | A saved long-form report (thesis, review) listed under Artifacts |
| Pinned chat | The single `portfolio_live` chat per user, "My Live Portfolio" |
| Health score | 0–100 portfolio score computed deterministically by the Portfolio tool (rubric in `agents/portfolio/SPEC.md`) |
| Whale print | A single aggressive trade whose notional is above the large-trade threshold |
| Wall | A resting order-book level whose notional is far above nearby levels |
| Macro regime | A label such as "Disinflation with easing bias", derived from FRED data |
| Proxy symbol | A tradable stand-in for an index on free data plans: SPY for the S&P 500, QQQ for the Nasdaq 100 |

## 9. Success criteria for the MVP

- All five journeys above work end-to-end on the production URL.
- P50 time to an agent reply is under 25 s and P95 under 60 s.
- Zero invented numbers in the eval cases. Every figure is traceable to a tool output.
- Off-topic refusal precision is 100% on the eval set, and no on-topic question is refused.
- Seven consecutive days with no failed scheduled job and no unhandled gateway error.
