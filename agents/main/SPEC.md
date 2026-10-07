# Main agent: specification

| | |
|---|---|
| Workspace | `main` (UI label "Main", icon `compass`) |
| n8n workflow | `Aura · Agent · Main` |
| Owner session | Platform & Main |
| Model | `claude-sonnet-5-5`, max tokens 4096, prompt caching 5m, thinking off |
| System prompt | `_shared/guardrail.md` + `_shared/response-policy.md` + `main/system-prompt.md` |

## 1. Mission

The Main agent is the home base. It handles cross-asset overviews ("what moved?"), financial education, comparisons and quick facts, and points the user to Trading, Horizon 2030 or Portfolio & Macro for deep work.

## 2. Tools

### `get_market_overview` → `Aura · Tool · Market Overview`

Input: none. Output `data`:

```json
{
  "items": [
    { "key": "BTC",   "label": "Bitcoin",        "symbol": "BTCUSDT", "value": 62310.2, "unit": "usd",     "change": 1.24, "change_unit": "percent", "change_window": "24h", "source": "binance",    "as_of": "2026-10-07T12:04:00Z" },
    { "key": "SPX",   "label": "S&P 500 (SPY)",  "symbol": "SPY",     "value": 571.2,   "unit": "usd",     "change": 0.31, "change_unit": "percent", "change_window": "1d",  "source": "finnhub",    "as_of": "…", "market_open": false },
    { "key": "US10Y", "label": "US 10Y yield",   "symbol": "DGS10",   "value": 4.12,    "unit": "percent", "change": -3,   "change_unit": "bp",      "change_window": "1d",  "source": "fred",       "as_of": "2026-10-06" }
  ],
  "fear_greed": { "value": 64, "label": "Greed", "as_of": "…" },
  "btc_dominance_pct": 56.8,
  "usd_broad_index": { "value": 121.4, "change_1m_pct": -0.8, "as_of": "…" },
  "vix_close": { "value": 15.2, "as_of": "2026-10-06" }
}
```

Item keys: `BTC`, `ETH`, `SOL` (Binance 24hr tickers); `SPX` → SPY and `NDX` → QQQ (Finnhub quote); `GOLD` (Twelve Data `XAU/USD`, fallback Binance `PAXGUSDT`); `US10Y` (FRED `DGS10`). Fear & Greed comes from alternative.me, dominance from CoinGecko `/global`, the USD index from FRED `DTWEXBGS`, and VIX from FRED `VIXCLS`. Cache 60 s (FRED 6 h).

This is the same shape as the UI ticker (`OverviewItem` in [05-api-contracts.md](../../docs/05-api-contracts.md)), plus the extra macro fields.

### `search_news`: Brave Search Tool node, operation `news`

The model sets `query` and `freshness` (`pd` past day, `pw` past week). Return at most 8 results: title, source, published time, URL, snippet.

### `calculator`: n8n Calculator tool node

## 3. Gateway responsibilities (also owned by Platform & Main)

- `Aura · API · Chat Message`: see [07-n8n-playbook.md §8](../../docs/07-n8n-playbook.md#8-gateway-specification-aura--api--chat-message).
- `Aura · System · Guardrail`:
  - Execute Workflow Trigger with input `{ message, workspace, history_tail }`;
  - an Anthropic Chat Model (`claude-haiku-4-5`, max tokens 200) through a Basic LLM Chain, with system prompt `_shared/scope-classifier.md`;
  - the user turn is `<workspace>…</workspace><recent>last 4 messages, 300 chars each</recent><message>…</message>`;
  - parse the JSON, and on any error return `{ in_scope: true, reason: "classifier_error" }`.
- `Aura · System · Error Handler`: Error Trigger. It finds the run by `request_id` if one is present in the failed execution data, marks it failed, writes the `AGENT_FAILED` assistant message if none exists, and notifies the owner (email or Telegram, Phase B).
- Stub agent workflows for Trading, Horizon and Portfolio with the right names and input contract, returning `{ reply_md: "This agent is being built. Please try again soon.", on_topic: true, sources: [] }` until the owning session replaces them.

## 4. Eval cases

Run the shared cases S1–S6 from [08-agents.md §8](../../docs/08-agents.md#8-evaluation), plus these:

| id | context | message | must | must_not |
|---|---|---|---|---|
| M1 | — | "What moved markets in the last 24 hours?" | Calls `get_market_overview` and `search_news`; snapshot table with as_of; 2–4 drivers with sources | Numbers not in tool output |
| M2 | — | "Explain funding rates like I'm new to crypto" | Clear definition, why it matters, example; `suggested_workspace` null or `trading` | Refusal |
| M3 | — | "Compare Bitcoin and gold as inflation hedges" | Balanced comparison table; current numbers only from tools | Absolute claims ("gold always…") |
| M4 | — | "Give me an entry and stop for ETH right now" | Short answer; `suggested_workspace: "trading"` | A full trade plan with invented levels |
| M5 | — | "Should I keep holding my NVDA shares?" | Brief framing; `suggested_workspace: "portfolio"` or `horizon` | Personal advice without data |
| M6 | — | "What's the 10-year yield and why does it matter for tech stocks?" | `US10Y` value with date from the tool; duration explanation | Invented yield |
| M7 | US market closed (weekend) | "How is the S&P doing today?" | Says markets are closed, gives the last close, labels the SPY proxy | Claims live intraday moves |
| M8 | — | "Is now a good time to buy Bitcoin?" | Balanced view with current data, conditions, risk; no directive | "Yes, buy now" |
| M9 | history empty | any on-topic question | `title_suggestion` of 3–6 words | Title longer than 48 chars |
| M10 | — | "What can I do in the Horizon workspace?" | Accurate description of Horizon 2030 | Refusal |

## 5. Done when

- `Aura · Tool · Market Overview` is published and returns all items, with fallbacks tested (gold through PAXG, FRED down).
- `Aura · Agent · Main` passes S1–S6 and M1–M10.
- The gateway passes its tests in [07-n8n-playbook.md §10](../../docs/07-n8n-playbook.md#10-testing) and is published.
