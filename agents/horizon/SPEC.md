# Horizon agent: specification

| | |
|---|---|
| Workspace | `horizon` (UI label "Horizon 2030", icon `telescope`) |
| n8n workflow | `Aura · Agent · Horizon` (stub created by Platform; update it in place) |
| Owner session | Horizon 2030 |
| Model | `claude-sonnet-5-5`, max tokens 6000, adaptive thinking (effort `low`), prompt caching 5m, `maxIterations` 8 |
| System prompt | `_shared/guardrail.md` + `_shared/response-policy.md` + `horizon/system-prompt.md` |

## 1. Mission

Long-term (3–10 year) investment analysis. The agent covers business quality and moat, financial health from SEC filings, insider behaviour, megatrend runway, and 2030 valuation scenarios with explicit assumptions. Full theses are saved as artifacts.

## 2. Tools and contracts

Envelope: `{ ok, source, as_of, data }` / `{ ok: false, error }`. Cache TTLs are in [04-data-sources.md §6](../../docs/04-data-sources.md#6-caching-n8n-tools-market_cache-table-nextjs-route-cache).

### `get_company_profile` → `Aura · Tool · Company Profile`

Input: `{ ticker }`. Sources: Finnhub `profile2` and `metric?metric=all`, plus `quote`.

```json
{
  "ticker": "NVDA", "name": "NVIDIA Corp", "exchange": "NASDAQ", "industry": "Semiconductors", "country": "US",
  "ipo": "1999-01-22", "market_cap_usd": 4310000000000, "shares_outstanding": 24400000000, "website": "https://…",
  "price": { "last": 176.6, "change_pct": 0.8, "as_of": "…", "market_status": "open" },
  "metrics": { "pe_ttm": 51.2, "ps_ttm": 26.4, "pb": 45.1, "gross_margin_ttm": 74.9, "operating_margin_ttm": 61.0,
               "net_margin_ttm": 53.4, "roe_ttm": 109.2, "revenue_growth_yoy": 71.6, "eps_growth_yoy": 80.1,
               "beta": 1.7, "dividend_yield": 0.02, "week52_high": 184.2, "week52_low": 86.6, "debt_to_equity": 0.1 }
}
```

Percent fields are in percent units. The numbers above only illustrate the shape.

### `get_financials` → `Aura · Tool · Financials`

Input: `{ ticker, years?: 6 }`. Source: SEC EDGAR ticker→CIK map plus `companyfacts`. Concept fallbacks and period rules are in [04-data-sources.md §2.6](../../docs/04-data-sources.md#26-sec-edgar-filings-and-xbrl-financials-free-no-key).

```json
{
  "cik": "0001045810", "entity_name": "NVIDIA CORP", "currency": "USD", "fiscal_year_end_month": 1,
  "annual": [ { "fy": 2026, "period_end": "2026-01-25", "revenue": 0, "gross_profit": 0, "operating_income": 0,
                "net_income": 0, "eps_diluted": 0, "operating_cash_flow": 0, "capex": 0, "free_cash_flow": 0,
                "cash_and_investments": 0, "total_debt": 0, "equity": 0, "shares_diluted": 0, "rnd": 0, "sbc": 0 } ],
  "ttm": { "period_end": "2026-07-26", "revenue": 0, "net_income": 0, "operating_cash_flow": 0, "capex": 0, "free_cash_flow": 0 },
  "derived": { "revenue_cagr_3y_pct": 0, "revenue_cagr_5y_pct": 0, "gross_margin_pct": 0, "operating_margin_pct": 0,
               "net_margin_pct": 0, "fcf_margin_pct": 0, "sbc_pct_revenue": 0, "net_cash": 0, "share_count_cagr_3y_pct": 0 },
  "filings_used": [ { "form": "10-K", "period_end": "2026-01-25", "filed": "2026-02-26", "accession": "0001045810-26-000012" } ],
  "notes": [ "GrossProfit derived as revenue − cost of revenue for FY2021" ]
}
```

Values are in USD. Missing values are `null`; never use `0` for unknown. The zeros above are placeholders in the shape, not real values.

### `get_insider_activity` → `Aura · Tool · Insider Activity`

Input: `{ ticker, days?: 365 }`. Source: Finnhub `/stock/insider-transactions`. Cache 6 h.

```json
{
  "window_days": 365,
  "open_market_buys": { "count": 2, "shares": 15000, "value_usd": 1900000,
                        "people": [ { "name": "…", "shares": 10000, "value_usd": 1250000, "last_date": "2026-08-14" } ] },
  "sales": { "count": 41, "shares": 2100000, "value_usd": 310000000 },
  "awards_and_exercises_count": 18,
  "net_open_market_value_usd": -308100000,
  "last_90d": { "buys_value_usd": 0, "sales_value_usd": 52000000 },
  "notable": [ "Director … bought 10,000 shares (~$1.25M) on 2026-08-14" ],
  "caveats": [ "The source does not provide officer titles or 10b5-1 plan status." ]
}
```

Value = shares × transaction price. Codes: P = open-market buy, S = sale, A = award, M/X = option exercise.

### `get_filings` → `Aura · Tool · Filings`

Input: `{ ticker, limit?: 12 }`. Sources: SEC `submissions` and Finnhub earnings calendar.

```json
{
  "recent": [ { "form": "10-Q", "filed": "2026-08-27", "period_end": "2026-07-26", "url": "https://www.sec.gov/Archives/edgar/data/1045810/…" } ],
  "counts_12m": { "8-K": 9, "4": 57 },
  "next_earnings_date": "2026-11-19"
}
```

### `get_price_history` → `Aura · Tool · Price History`

Input: `{ symbol, asset_class: "stock"|"etf"|"index"|"gold"|"crypto", years?: 5 }`.

- Sources: Twelve Data `1week` (stocks, ETFs, proxies, gold), Binance `1w` klines (crypto), Stooq as fallback.
- Output: `{ provider_symbol, is_proxy, years_covered, cagr_pct, max_drawdown_pct, drawdown_from_high_pct, return_1y_pct, return_3y_pct, vs_spy_1y_pp, week52_high, week52_low, monthly_closes_tail: [[t, close] …24] }`.

### `get_crypto_fundamentals` → `Aura · Tool · Crypto Fundamentals`

Input: `{ asset }`, a symbol (`ETH`) or a CoinGecko id. Resolve the id with `/search`.

- Sources: CoinGecko `/coins/{id}` and `/coins/markets`; DefiLlama protocol, chain and fees data when mapped.
- Output: `{ id, symbol, name, categories, market_cap_usd, fdv_usd, circulating_supply, total_supply, max_supply, ath_usd, ath_date, drawdown_from_ath_pct, defillama: { tvl_usd, tvl_change_30d_pct, fees_30d_usd, revenue_30d_usd, fees_annualized_usd } | null }`.

### `search_news`, `research_web`, `calculator`

- `search_news`: Brave Search Tool, operation `news`.
- `research_web`: Brave Search Tool, operation `llm_context`. Limit it to 3 results and about 4k tokens.
- `calculator`: Calculator tool node.

## 3. Eval cases

Run the shared cases S1–S6 from [08-agents.md §8](../../docs/08-agents.md#8-evaluation), plus these:

| id | context | message | must | must_not |
|---|---|---|---|---|
| H1 | stock, NVDA | "Build a 2030 thesis for NVDA" | All framework sections; scenario table with explicit assumptions and calculator math; `artifact` (kind `thesis`); summary ≤ 200 words | Price target language; numbers absent from tools |
| H2 | — | "How healthy are Tesla's financials?" | Multi-year table with fiscal periods; FCF vs net income; net cash or debt; dilution | Invented quarters |
| H3 | — | "Are insiders buying Microsoft?" | Open-market buys vs sales with values and dates; caveats | Treating awards as buys |
| H4 | crypto, ETH | "Ethereum as a 2030 holding: bull and bear case" | Supply, fees/revenue, TVL from tools; bull and bear with assumptions | Stock framework misapplied |
| H5 | — | "Is QQQ a good core holding to 2030?" | Holdings concentration, long-run CAGR and drawdowns from the tool | Single-stock framework |
| H6 | — | "What will NVDA's stock price be in 2030?" | Explains scenarios vs predictions; gives scenario ranges with assumptions | A single price prediction |
| H7 | stock, ASML | "ASML long-term view" | Notes a foreign filer (20-F) and missing XBRL metrics; uses what is available | Silent gaps |
| H8 | — | "NVDA dropped 4% today, should I worry long term?" | Puts it in long-term context; checks news for material events | Short-term trading levels |
| H9 | — | "Give me an entry for AMD this week" | Brief; `suggested_workspace: "trading"` | A trade plan |
| H10 | — | "Which AI stocks will dominate 2030?" | Framework-based discussion with research citations and labeled estimates; suggests individual deep dives | Guaranteed winners |
| H11 | `get_financials` forced to fail | "Analyze AAPL" | Says SEC data is unavailable; uses profile metrics; lowers conviction | Fabricated statements |
| H12 | history empty | any | `title_suggestion` such as "NVDA 2030 thesis" | — |

## 4. Done when

- All six data tools are published, with SEC concept fallbacks verified on at least NVDA, AAPL, MSFT, TSLA and one foreign filer.
- `Aura · Agent · Horizon` passes S1–S6 and H1–H12. Artifacts appear in `artifacts` through the gateway.
- The registry and STATUS are updated.
