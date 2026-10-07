# 01. Business model

> Status: working hypothesis. The MVP is a private tool for one user. This document defines the path to a paid product, so that today's architecture and cost decisions don't block it. To stress-test it with an LLM, use [`prompts/business-model-prompt.md`](../prompts/business-model-prompt.md).

## 1. Positioning

**"An AI research desk for private investors."** Aura is grounded, multi-agent analysis across short-term trading, long-term investing and portfolio/macro, in one chat app.

| What Aura is not | Why it matters |
|---|---|
| A signal group or a "buy now" bot | Keeps us on the information side of regulation and builds trust |
| A robo-advisor or broker | No custody, no execution, no licensing burden in Phase A/B |
| A generic chatbot | Every answer is grounded in live data, filings and the user's own holdings |

## 2. Phases

| Phase | Users | Goal | Constraints |
|---|---|---|---|
| A, now | 1 (the owner's friend) | Prove that the four agents are useful daily | Free data tiers (personal use only), minimal fixed cost |
| B, closed beta | 10–50 invited | Validate retention and willingness to pay | Usage metering, onboarding, alerts |
| C, paid SaaS | 100+ | Sustainable revenue | Commercial data licences, legal review, billing, support |

## 3. Ideal customer profile (Phase C)

**Primary**: self-directed investors aged 25–45 with a $20k–$500k portfolio across crypto and US equities.

- Tech-savvy and time-poor.
- Already pays for at least one tool, such as TradingView, Seeking Alpha, Koyfin or a crypto data service.
- Jobs to be done:
  - "Tell me what changed and whether I should care."
  - "Give me the levels before I trade."
  - "Help me hold the right things for 5+ years."
  - "Keep my allocation sane."

**Secondary**: active crypto swing traders who want flow and positioning summaries, and small investment clubs.

## 4. Value proposition and differentiation

1. **Four horizons, four specialists.** A trade idea, a 2030 thesis and a portfolio rebalance need different data and different reasoning. Separate workspaces keep the noise down.
2. **Primary data with receipts.** The agents use exchange APIs, SEC XBRL filings and FRED macro series, and cite source and time for every figure.
3. **Portfolio-aware.** Macro and risk analysis is applied to the user's actual holdings.
4. **Always on.** Daily reviews now, alerts later. The product comes to the user.

| Alternative | Gap Aura fills |
|---|---|
| Generic ChatGPT/Claude | No live data, no portfolio context, invents numbers |
| TradingView | Charts, not reasoning; no fundamentals or macro in plain language |
| Seeking Alpha / Koyfin / fiscal-data AI tools | Strong on equities, weak on crypto flow and on cross-asset portfolio view |
| Crypto signal groups | Opaque, unaccountable, no risk framing |

## 5. Pricing hypothesis

A billable unit is **one agent reply**. Refusals and errors are not billed.

| Tier | Price | Agent replies / month | Includes |
|---|---|---|---|
| Trial | Free for 7 days | 40 | All workspaces, daily review |
| Pro | $29 / month or $290 / year | 300 | All four agents, artifacts, daily review, 1 portfolio |
| Elite | $79 / month | 1,000 | Pro plus Opus-powered deep-dive reports, alerts (when shipped), priority support |

Overage packs: +100 replies for $9. Limits are enforced from `agent_runs` (see [06-database.md](06-database.md)).

## 6. Unit economics (estimates; re-check prices before Phase C)

Model prices come from the n8n model catalog (October 2026), in USD per million tokens:

| Model | Input | Output | Used for |
|---|---|---|---|
| `claude-sonnet-5-5` | $2 | $10 | All four agents (default) |
| `claude-haiku-4-5` | $1 | $5 | Guardrail classifier, chat titles |
| `claude-opus-5-5` | $4 | $20 | Elite deep-dive theses (optional) |

Typical cost per reply:

| Reply type | Tokens (cumulative over the agent loop) | Cost without caching | With prompt caching |
|---|---|---|---|
| Main / Trading / Portfolio reply with 2–4 tool calls | ~25k in, ~1.5k out | ≈ $0.065 | ≈ $0.04 |
| Horizon thesis with artifact | ~60k in, ~6k out | ≈ $0.18 (Sonnet), ≈ $0.36 (Opus) | 30–40% less |
| Guardrail check | ~1k in, ~50 out | ≈ $0.0013 | — |

**Pro tier margin.** An average user sends about 150 replies a month, so LLM cost is about $6–8. Infra and data share is about $1–2. That gives roughly 70% gross margin. The worst case is a user at the 300 cap: about $15 of LLM cost and roughly 45% margin.

**Cost levers**:

- prompt caching (the system prompt is kept static on purpose);
- compact tool outputs (≤ 6k tokens each);
- a history window of the last 20 messages;
- `maxIterations` capped at 8;
- caching market data in `market_cache`;
- routing simple questions to Haiku (later).

**Fixed monthly costs (Phase C, verify current prices)**:

| Item | Plan | Approx. cost | Note |
|---|---|---|---|
| n8n Cloud | Pro | €60 | 10,000 production executions. Only the parent execution counts; sub-workflows don't. One chat message is one execution. |
| Supabase | Pro | $25 | No auto-pause, backups |
| Vercel | Pro | $20 per seat | Hobby is for non-commercial use only |
| Market data | Commercial tiers (Finnhub or Twelve Data, CoinGecko) | $100–$400 | Free tiers are personal / non-commercial or need attribution |
| Anthropic | Own API key | Usage-based | n8n gateway credits are fine for Phase A |

Break-even at about $450/month fixed cost and about $20 contribution per Pro user is roughly 22–25 paying users.

## 7. Retention loops

1. **Daily brief** in the pinned portfolio chat, every morning. This is the habit anchor.
2. **Health score trend.** The user sees whether their portfolio got healthier.
3. **Saved theses** under Artifacts become a personal research library to revisit.
4. **Alerts** (Phase B): levels, funding extremes, insider buys, macro releases.
5. **"Since your last visit"** summary in Main (Phase B).

## 8. Go-to-market (Phase C)

- **Build in public on X.** Post weekly agent-generated market briefs, reviewed by a human.
- **Open-source the data tools as n8n templates** (candles with indicators, SEC fundamentals, FRED macro snapshot). Templates draw an audience to the paid app.
- **Community seeding** in crypto and investing communities, following each community's promotion rules.
- **Referrals**: one free month per paying referral.

**Funnel targets**:

- activation, meaning a first useful agent reply within 5 minutes of sign-up: ≥ 70%;
- D30 retention: ≥ 35%;
- trial to paid: 8–12%;
- monthly churn: < 6%.

## 9. Risks and mitigations

| Risk | Detail | Mitigation |
|---|---|---|
| **Investment-advice regulation** | Personalised recommendations can be regulated advice (US Investment Advisers Act and state rules, EU MiFID II, UK FCA) | Information and education positioning; user-initiated queries; scenario language and no orders; persistent disclaimer; Terms of Service; legal review before charging |
| **Data licensing** | Free tiers of Finnhub and Twelve Data are personal / non-commercial. CoinGecko Demo requires attribution. Some FRED series (for example ICE BofA spreads, CBOE VIX, S&P indices) carry third-party copyright | Buy commercial plans before Phase C; keep a source register (see [04-data-sources.md](04-data-sources.md)); show attribution in the UI |
| **Hallucinated numbers** | Wrong numbers destroy trust | Tool-only numbers, sources and timestamps, eval cases, refusal to guess |
| **Provider outages or geo-blocks** | Binance can return HTTP 451/403 to some datacenter IPs | Fallback hosts (data-api.binance.vision, Bybit), caching, graceful degradation |
| **LLM cost spikes** | Long agent loops | `maxIterations`, token caps, per-user monthly cap from `agent_runs` |
| **Privacy** | Holdings are personal financial data | Minimal data, RLS, EU region for Supabase (Frankfurt), deletion on request, no selling of data |

## 10. Milestones

| Milestone | Content | Target |
|---|---|---|
| M0 | Architecture, contracts, docs | Done |
| M1 | MVP for one user (all five journeys from [00-overview.md](00-overview.md)) | 2–3 weeks |
| M2 | Closed beta: onboarding, usage metering, alerts, Telegram delivery | +4 weeks |
| M3 | Paid launch: Stripe billing, commercial data licences, legal pages, landing page | +4–6 weeks |
