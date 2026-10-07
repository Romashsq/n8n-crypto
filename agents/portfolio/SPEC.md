# Portfolio agent: specification

| | |
|---|---|
| Workspace | `portfolio` (UI label "Portfolio & Macro", icon `chart-pie`), including the pinned `portfolio_live` chat "My Live Portfolio" |
| n8n workflows | `Aura · Agent · Portfolio` (stub created by Platform; update it in place), `Aura · API · Portfolio Snapshot`, `Aura · Job · Daily Portfolio Review`, and the tools below |
| Owner session | Portfolio & Macro |
| Model | `claude-sonnet-5-5`, max tokens 4096, prompt caching 5m, thinking off, `maxIterations` 8 |
| System prompt | `_shared/guardrail.md` + `_shared/response-policy.md` + `portfolio/system-prompt.md` |

## 1. Mission

Keep the user's combined crypto and stock portfolio healthy for the current macro regime. That means live valuation, a deterministic health score, macro regime analysis, rebalancing ideas within the risk profile, an on-demand review and a daily brief.

## 2. Tools and contracts

**Security rule:** `user_id` is bound from `AgentInput.user_id` with a fixed expression in every tool node. It is never a model-chosen parameter.

### `get_portfolio` → `Aura · Tool · Portfolio`

Input: `{ user_id }` (bound, not chosen by the model).

Steps:

1. Read `holdings` and `profiles` (base currency, risk profile) from Supabase.
2. Value the positions with `Aura · Tool · Quotes`.
3. Compute totals, allocation and P&L.
4. Compute health (§5).

Output `data` = `PortfolioSnapshot` ([05-api-contracts.md §5](../../docs/05-api-contracts.md#5-portfolio-snapshot-payload)) plus:

```json
{
  "risk_profile": "balanced",
  "targets": { "crypto": [0.05, 0.15], "equities": [0.45, 0.75], "gold": [0.05, 0.10], "cash": [0.05, 0.20], "max_position": 0.25 },
  "groups": { "crypto": 0.412, "equities": 0.441, "gold": 0.061, "cash": 0.086 },
  "deviations_pp": { "crypto": 26.2, "equities": 0.9, "gold": 0, "cash": 0 }
}
```

Group mapping:

- `crypto` = crypto holdings except stablecoins;
- `equities` = `stock` + `etf`;
- `gold` = `gold`;
- `cash` = `cash` + stablecoins (`USDT`, `USDC`, `DAI`, `FDUSD`, `USDE`, `PYUSD`).

### `get_quotes` → `Aura · Tool · Quotes` (internal; used by Tool · Portfolio, not exposed to the model)

Input: `{ items: [{ asset_class, symbol }], base_currency }`.

| Class | Source | Fallback |
|---|---|---|
| crypto | Binance `ticker/24hr` for `<SYMBOL>USDT` (batch) | CoinGecko `simple/price` |
| stablecoins | Fixed price 1.00 USD | — |
| stock, etf | Finnhub `quote` | Twelve Data `quote` |
| gold (`XAU`) | Twelve Data `price XAU/USD` | Binance `PAXGUSDT` |
| cash | 1.00 for the base currency; otherwise Frankfurter FX | — |

Convert everything to the base currency with Frankfurter (USD→EUR etc.). Output: `{ quotes: [{ asset_class, symbol, price, change_24h_pct, source, as_of }], missing: ["…"] }`. Cache 30 s.

### `get_macro_snapshot` → `Aura · Tool · Macro Snapshot`

Input: none. FRED series listed in [04-data-sources.md §2.7](../../docs/04-data-sources.md#27-fred-macro-series-and-calendar-free-key), cached 6 h, plus Fear & Greed.

```json
{
  "series": [ { "id": "CPILFESL", "name": "Core CPI", "latest": 3.1, "unit": "% YoY", "latest_date": "2026-08-01",
                "previous": 3.2, "trend": "falling", "extra": { "annualized_3m": 2.7 } } ],
  "derived": { "real_fed_funds_pct": 1.2, "curve_2s10s_bp": 38, "cuts_priced_hint": "2y below fed funds by 45 bp" },
  "fear_greed": { "value": 64, "label": "Greed" }
}
```

### `get_macro_calendar` → `Aura · Tool · Macro Calendar`

Input: `{ days?: 14 }`.

- Sources: FRED `releases/dates` for release IDs 10 (CPI), 50 (Employment Situation), 53 (GDP), 54 (PCE) and 46 (PPI), plus an **FOMC meetings constant** copied from the Federal Reserve's FOMC calendar page. Update the constant yearly; it is a documented Phase 1 task.
- Output: `{ events: [{ date, name, importance: "high"|"medium", source }] }`.

### `get_portfolio_history` → `Aura · Tool · Portfolio History`

Input: `{ user_id (bound), days?: 30 }`. Source: `portfolio_snapshots`.

Output: `{ points: [{ as_of, total_value, health_score }], change_pct, max_drawdown_pct }`.

### `search_news` (Brave Search Tool, `news`) and `calculator`

## 3. API: `Aura · API · Portfolio Snapshot`

This is the webhook `GET aura/v1/portfolio/snapshot?user_id=…` with Header Auth.

1. Execute `Aura · Tool · Portfolio`.
2. Respond 200 with `data` as `PortfolioSnapshot`, or the error envelope mapped to `502 UPSTREAM_ERROR`.
3. Do **not** write a snapshot row. Only reviews and the daily job write snapshots.

## 4. Job: `Aura · Job · Daily Portfolio Review`

This runs on a schedule, daily at **06:30 UTC**.

1. Select users with at least one holding (`select distinct user_id from holdings`).
2. For each user, sequentially:
   1. execute `Aura · Tool · Portfolio`;
   2. insert into `portfolio_snapshots` (`source = 'daily_review'`, `health_score`, `health`, `allocation`, `positions`, `total_value`, `total_cost`);
   3. create `request_id = uuid` and insert an `agent_runs` row (`mode = 'daily_review'`, chat = the user's `portfolio_live` chat);
   4. execute `Aura · Agent · Portfolio` with `AgentInput` (`mode = 'daily_review'`, `message = "Write today's daily portfolio brief."`, empty history);
   5. insert the assistant message into the pinned chat with `AssistantMetadata` (`mode = 'daily_review'`);
   6. update the run and fill `portfolio_snapshots.summary_md`.
3. Errors for one user must not stop the others. Use the error output, then continue.

## 5. Health score rubric (deterministic; implement in Tool · Portfolio)

Exclude cash and stablecoins from position-concentration checks. Weights are fractions of the total value. Round each component to an integer.

| Component | Max | Rule |
|---|---|---|
| Diversification | 40 | Start at 40.<br>• Largest non-cash position `w1` above limit `L1` (0.15 / 0.25 / 0.35 for conservative / balanced / aggressive): subtract `min(20, (w1 − L1) × 100)`.<br>• Top-5 non-cash combined `w5` above `L5` (0.60 / 0.75 / 0.90): subtract `min(10, (w5 − L5) × 50)`.<br>• Fewer than 5 non-cash positions: subtract `min(10, (5 − n) × 2)`.<br>Floor at 0. |
| Class balance | 35 | For each group (crypto, equities, gold, cash), `d` = percentage points outside the target range (0 inside). Subtract `min(15, 0.7 × d)` per group. Floor at 0. |
| Liquidity | 15 | Cash-group share `c` vs buffer `B` (0.10 / 0.05 / 0.02): 15 if `c ≥ B`, else `round(15 × c / B)`. |
| Data quality | 10 | 10 − 2 × (positions with missing price). Floor at 0. |

Score = the sum, clamped to 0–100. Label: ≥ 80 `healthy`, 60–79 `watch`, < 60 `at_risk`.

**Flags**:

| Code | When | Message example | Severity |
|---|---|---|---|
| `TOP_POSITION_OVERWEIGHT` | w1 > L1 | "NVDA is 28.0% of the portfolio (limit 25% for balanced)" | warning; critical if > L1 + 10 pp |
| `TOP5_CONCENTRATED` | w5 > L5 | "Top 5 positions are 82.4% (limit 75%)" | warning |
| `CLASS_OUT_OF_RANGE` | d > 0 | "Crypto 41.2% vs 5–15% target" | info if d < 5 pp; warning for 5–15 pp; critical if > 15 pp |
| `LOW_CASH_BUFFER` | c < B | "Cash and stablecoins 1.2% (buffer 5%)" | warning |
| `FEW_POSITIONS` | n < 5 | "Only 3 non-cash positions" | info |
| `MISSING_PRICES` | any missing | "No price for XYZ" | warning |

**Unit-test fixture.** The Code node must reproduce this exactly. The profile is balanced. Weights of total value: BTC 0.300, ETH 0.112, NVDA 0.280, MSFT 0.080, AAPL 0.081, gold (XAU) 0.061, USD cash 0.086. Every position has a price.

| Component | Working | Result |
|---|---|---|
| Diversification | w1 = BTC 0.300 vs L1 0.25 → −5.00. Top-5 non-cash = 0.300 + 0.280 + 0.112 + 0.081 + 0.080 = 0.853 vs L5 0.75 → −5.15. n = 6 → 0. 40 − 10.15 = 29.85 | **30** |
| Class balance | Crypto 41.2% vs 5–15% → d = 26.2 → −15 (capped). Equities 44.1% vs 45–75% → d = 0.9 → −0.63. Gold 6.1% and cash 8.6% are in range. 35 − 15.63 = 19.37 | **19** |
| Liquidity | c = 0.086 ≥ B = 0.05 | **15** |
| Data quality | No missing prices | **10** |
| **Score** | 30 + 19 + 15 + 10 | **74 → `watch`** |

Expected flags:

- `TOP_POSITION_OVERWEIGHT`: "BTC is 30.0% of the portfolio (limit 25% for balanced)", warning;
- `TOP5_CONCENTRATED`: "Top 5 positions are 85.3% (limit 75%)", warning;
- `CLASS_OUT_OF_RANGE`: "Crypto 41.2% vs 5–15% target", critical;
- `CLASS_OUT_OF_RANGE`: "Equities 44.1% vs 45–75% target", info.

## 6. Eval cases

Run the shared cases S1–S6 from [08-agents.md §8](../../docs/08-agents.md#8-evaluation), plus these:

| id | context | message | must | must_not |
|---|---|---|---|---|
| P1 | demo holdings, balanced | "Review my portfolio against today's macro regime" (`mode: portfolio_review`) | Calls portfolio, macro and calendar; regime named with dated data; allocation vs targets table; rebalancing in pp; `artifact` (kind `portfolio_review`) | Changing the health score; exact buy/sell quantities unprompted |
| P2 | demo holdings | "Am I too concentrated anywhere?" | Uses flags and weights; names the positions | Generic advice without the user's numbers |
| P3 | demo holdings | "What macro events this week matter for my holdings?" | Calendar events with dates mapped to exposures | Invented dates |
| P4 | empty portfolio | "How is my portfolio doing?" | Says it's empty; explains Edit holdings; offers a macro view | Fake holdings |
| P5 | demo holdings, one symbol unpriceable | "Health check" | Lists missing prices; explains the data-quality penalty | Silent omission |
| P6 | demo holdings, conservative | "Suggest a rebalancing plan" | Uses conservative ranges; staged moves; what each fixes | Leverage; market timing |
| P7 | demo holdings, base EUR | "What's my total?" | Values in EUR with FX source | USD values labeled as EUR |
| P8 | `mode: daily_review` | (job message) | ≤ 200 words; movers, health change, today's events; no artifact; `title_suggestion` null | Long report |
| P9 | — | "Build me a 2030 thesis on NVDA" | Portfolio angle (weight, concentration); `suggested_workspace: "horizon"` | A full thesis |
| P10 | — | "Is the Fed going to cut next month?" | Data-based view (2y vs fed funds, inflation trend, calendar); calibrated confidence | Certainty |

## 7. Done when

- Quotes, Portfolio, Macro Snapshot, Macro Calendar and Portfolio History tools are published. The rubric reproduces the fixture in §5 exactly (score 74, the same four flags).
- `Aura · API · Portfolio Snapshot` is published and returns the contract shape for an empty and a demo portfolio.
- `Aura · Job · Daily Portfolio Review` is published, has run once manually, and produced a snapshot plus a pinned-chat message.
- `Aura · Agent · Portfolio` passes S1–S6 and P1–P10.
