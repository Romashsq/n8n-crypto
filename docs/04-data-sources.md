# 04. Market data sources

The rule is **free and public first**, with every provider behind a tool interface so it can be swapped. Nothing here needs a paid plan for the MVP (Phase A, personal use).

> **Verify before you depend on it.** Endpoints and limits below were checked in October 2026, but providers change terms. On first implementation, call each endpoint once from n8n (not from your sandbox, which may be network-restricted) and note the result in `docs/STATUS.md`. If something has changed, update this file in a `docs:` commit.

## 1. Which agent uses what

| Data | Main | Trading | Horizon | Portfolio | Web UI |
|---|:-:|:-:|:-:|:-:|:-:|
| Crypto candles, 24h tickers (Binance spot) | ✓ | ✓ | ✓ | ✓ (quotes) | ✓ (ticker, charts) |
| Order book, trades, whale prints (Binance spot) | | ✓ | | | |
| Funding, open interest, long/short (Binance futures, Bybit fallback) | | ✓ | | | |
| Stock, ETF, index-proxy and gold candles (Twelve Data, Stooq fallback) | | ✓ | ✓ | | ✓ (charts) |
| Real-time US quotes, company metrics, insiders, company news (Finnhub) | ✓ | ✓ | ✓ | ✓ | ✓ (ticker) |
| SEC filings and XBRL financials (SEC EDGAR) | | | ✓ | | |
| Macro series and release calendar (FRED) | ✓ | | | ✓ | ✓ (US 10Y) |
| Crypto market caps, dominance, supply (CoinGecko) | ✓ | ✓ | ✓ | (fallback quotes) | |
| DeFi TVL, fees, stablecoin supply (DefiLlama) | | ✓ | ✓ | | |
| Crypto Fear & Greed (alternative.me) | ✓ | ✓ | | ✓ | ✓ (ticker) |
| FX rates (Frankfurter, ECB) | | | | ✓ | |
| News search (Brave via n8n) and RSS | ✓ | ✓ | ✓ | ✓ | |
| User holdings (Supabase) | | | | ✓ | ✓ |

## 2. Provider catalog

### 2.1 Binance spot: public market data (no key)

- **Base URL**: `https://data-api.binance.vision`. This is Binance's market-data-only host and is preferred. Fallback: `https://api.binance.com`.
- **Geo note**: Binance can answer HTTP **451/403** to some datacenter or US IPs. n8n Cloud runs in Frankfurt, which is normally fine. Vercel functions should run in `fra1` (`export const preferredRegion = 'fra1'`) and use the `data-api` host.
- **Limits**: request-weight based, about 6,000 weight per minute per IP. Our usage is far below that. Cache anyway.

| Purpose | Endpoint | Notes |
|---|---|---|
| Candles | `GET /api/v3/klines?symbol=BTCUSDT&interval=1h&limit=300` | Row = `[openTime ms, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVol, takerBuyQuoteVol, ignore]`. Values are strings. Intervals: `1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M` |
| 24h stats | `GET /api/v3/ticker/24hr?symbol=BTCUSDT` (or `symbols=["BTCUSDT","ETHUSDT"]`) | lastPrice, priceChangePercent, quoteVolume |
| Last price (batch) | `GET /api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT"]` | URL-encode the JSON array |
| Order book | `GET /api/v3/depth?symbol=BTCUSDT&limit=1000` | Limits: 5, 10, 20, 50, 100, 500, 1000, 5000 |
| Aggregated trades | `GET /api/v3/aggTrades?symbol=BTCUSDT&limit=1000` | `m: true` means the buyer is maker, so the **seller** was the aggressor. Use `startTime`/`endTime` (≤ 1h window) to page |
| Symbol list | `GET /api/v3/exchangeInfo?permissions=SPOT` | Cache 24h, for autocomplete and validation |

**Taker flow from klines.** Field 9 (`takerBuyBaseVol`) gives aggressive buy volume per candle. Sell volume is `volume − takerBuyBaseVol`. This is the cheapest way to compute buy/sell delta and an approximate CVD over any window.

### 2.2 Binance USDⓈ-M futures: positioning (no key)

- **Base URL**: `https://fapi.binance.com`. There is no market-data mirror host. If it is blocked, use Bybit (2.3).

| Purpose | Endpoint |
|---|---|
| Mark price, funding rate, next funding | `GET /fapi/v1/premiumIndex?symbol=BTCUSDT` |
| Funding history | `GET /fapi/v1/fundingRate?symbol=BTCUSDT&limit=30` |
| Open interest now | `GET /fapi/v1/openInterest?symbol=BTCUSDT` |
| Open interest history | `GET /futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=48` (periods `5m…1d`, last 30 days only) |
| Global long/short account ratio | `GET /futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=48` |
| Top-trader long/short (positions) | `GET /futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=1h&limit=48` |
| Taker buy/sell volume ratio | `GET /futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1h&limit=48` |

### 2.3 Bybit v5: fallback for derivatives and spot (no key)

- **Base URL**: `https://api.bybit.com`.

| Purpose | Endpoint |
|---|---|
| Funding, OI, mark price | `GET /v5/market/tickers?category=linear&symbol=BTCUSDT` |
| OI history | `GET /v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=48` |
| Long/short account ratio | `GET /v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=48` |
| Candles | `GET /v5/market/kline?category=spot&symbol=BTCUSDT&interval=60&limit=300` (intervals `1 3 5 15 30 60 120 240 360 720 D W M`) |
| Order book | `GET /v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=200` |
| Recent trades | `GET /v5/market/recent-trade?category=spot&symbol=BTCUSDT&limit=1000` (`side` is the taker side) |

### 2.4 Twelve Data: stocks, ETFs, index proxies, gold, FX (free key)

- **Base URL**: `https://api.twelvedata.com`. Auth: `apikey` query parameter.
- **Free plan**: 800 API credits per day and a small per-minute cap (about 8). `time_series` costs 1 credit per symbol. Personal use only.
- **Endpoints**:
  - `GET /time_series?symbol=NVDA&interval=1h&outputsize=300&timezone=UTC`, with intervals `1min 5min 15min 30min 45min 1h 2h 4h 1day 1week 1month`;
  - `GET /quote?symbol=NVDA`;
  - `GET /price?symbol=XAU/USD`.
- **Gold**: symbol `XAU/USD`.
- **Index symbols** such as `SPX` may need a paid plan. On the free plan use **ETF proxies**, labelled as such (see §3).

### 2.5 Finnhub: quotes, company data, insiders, news (free key)

- **Base URL**: `https://finnhub.io/api/v1`. Auth: header `X-Finnhub-Token`.
- **Free plan**: 60 calls per minute; personal / non-commercial.

| Purpose | Endpoint |
|---|---|
| Real-time US quote | `GET /quote?symbol=NVDA` (fields `c` price, `d` change, `dp` change %, `h`, `l`, `o`, `pc`, `t`) |
| Market status | `GET /stock/market-status?exchange=US` |
| Company profile | `GET /stock/profile2?symbol=NVDA` |
| Basic financials | `GET /stock/metric?symbol=NVDA&metric=all` (P/E, P/S, margins, growth, 52-week range, beta…) |
| Insider transactions (Form 4) | `GET /stock/insider-transactions?symbol=NVDA` (`transactionCode` P = open-market buy, S = sale, A = award, M = option exercise) |
| Company news | `GET /company-news?symbol=NVDA&from=2026-10-01&to=2026-10-07` |
| General market news | `GET /news?category=general` |
| Analyst recommendation trend | `GET /stock/recommendation?symbol=NVDA` |
| Earnings calendar | `GET /calendar/earnings?from=…&to=…&symbol=NVDA` |

Stock candles on Finnhub may be premium. Use Twelve Data for candles.

### 2.6 SEC EDGAR: filings and XBRL financials (free, no key)

- **User-Agent required**: `AuraInvestAI/1.0 (contact: <owner email>)`. The limit is **10 requests per second**.
- **Endpoints**:
  - ticker to CIK: `GET https://www.sec.gov/files/company_tickers.json`. Cache 24h. CIKs are zero-padded to 10 digits in URLs.
  - filings list: `GET https://data.sec.gov/submissions/CIK0001045810.json`. Contains `filings.recent.form`, `filingDate`, `accessionNumber` and `primaryDocument`.
  - all XBRL facts: `GET https://data.sec.gov/api/xbrl/companyfacts/CIK0001045810.json`.
  - one concept: `GET https://data.sec.gov/api/xbrl/companyconcept/CIK0001045810/us-gaap/Revenues.json`.
- **Concept fallbacks** (us-gaap unless noted):

| Metric | Try in order |
|---|---|
| Revenue | `Revenues`, `RevenueFromContractWithCustomerExcludingAssessedTax`, `SalesRevenueNet`, `RevenueFromContractWithCustomerIncludingAssessedTax` |
| Gross profit | `GrossProfit`, else revenue − `CostOfRevenue` / `CostOfGoodsAndServicesSold` |
| Operating income | `OperatingIncomeLoss` |
| Net income | `NetIncomeLoss` |
| Diluted EPS | `EarningsPerShareDiluted` |
| Operating cash flow | `NetCashProvidedByUsedInOperatingActivities` |
| CapEx | `PaymentsToAcquirePropertyPlantAndEquipment` (+ `PaymentsToAcquireProductiveAssets` if present) |
| Cash | `CashAndCashEquivalentsAtCarryingValue` (+ `MarketableSecuritiesCurrent`, `ShortTermInvestments`) |
| Debt | `LongTermDebtNoncurrent` + `LongTermDebtCurrent` (or `LongTermDebt`) + `ShortTermBorrowings` |
| Equity | `StockholdersEquity` |
| Shares outstanding | `dei:EntityCommonStockSharesOutstanding`; diluted weighted: `WeightedAverageNumberOfDilutedSharesOutstanding` |
| R&D / SBC | `ResearchAndDevelopmentExpense` / `ShareBasedCompensation` |

- **Period rules**:
  - annual: `form = "10-K"` and `fp = "FY"`; keep the most recently `filed` value per `fy` and `end`;
  - quarterly: `form = "10-Q"`;
  - TTM for flow items is the sum of the last 4 quarters, where Q4 = FY − Q1 − Q2 − Q3;
  - foreign filers (20-F, IFRS tags) have partial support. Say so in the output.

### 2.7 FRED: macro series and calendar (free key)

- **Base URL**: `https://api.stlouisfed.org/fred`. Auth: `api_key` query parameter, plus `file_type=json`.
- **Endpoints**:
  - observations: `GET /series/observations?series_id=CPIAUCSL&observation_start=2024-01-01`;
  - release calendar: `GET /releases/dates?realtime_start=<today>&realtime_end=<today+14d>&include_release_dates_with_no_data=true`;
  - one release: `GET /release/dates?release_id=10`.

| Series ID | Meaning | Frequency | Derived |
|---|---|---|---|
| `DFF` | Effective fed funds rate | daily | level |
| `DFEDTARU` / `DFEDTARL` | FOMC target range upper / lower | daily | range |
| `DGS2`, `DGS10` | 2Y and 10Y Treasury yields | daily | level, 1m change |
| `T10Y2Y` | 10Y − 2Y spread | daily | curve inversion |
| `DFII10` | 10Y real yield (TIPS) | daily | level |
| `T10YIE` | 10Y breakeven inflation | daily | level |
| `CPIAUCSL`, `CPILFESL` | CPI, core CPI (index) | monthly | YoY %, 3-month annualized |
| `PCEPILFE` | Core PCE price index | monthly | YoY % |
| `UNRATE` | Unemployment rate | monthly | level, 3-month change |
| `PAYEMS` | Nonfarm payrolls (thousands) | monthly | MoM change |
| `ICSA` | Initial jobless claims | weekly | 4-week average |
| `A191RL1Q225SBEA` | Real GDP growth, % SAAR | quarterly | level |
| `WALCL` | Fed balance sheet total assets | weekly | 13-week change |
| `M2SL` | M2 money stock | monthly | YoY % |
| `DTWEXBGS` | Broad US dollar index | daily | 1m change |
| `NFCI` | Chicago Fed financial conditions | weekly | level |
| `VIXCLS` | CBOE VIX close (third-party copyright) | daily | level |
| `BAMLH0A0HYM2` | ICE BofA US high-yield OAS (third-party copyright) | daily | level, 1m change |

- **Release IDs** for the calendar. Verify them once through `/releases`:
  - CPI `10`;
  - Employment Situation `50`;
  - GDP `53`;
  - Personal Income and Outlays (PCE) `54`;
  - PPI `46`.
- **FOMC meeting dates** are not in FRED. Keep them as a constant in the macro calendar tool, copied from the Federal Reserve's FOMC calendar page, and update it yearly.

### 2.8 CoinGecko: crypto market data (free Demo key)

- **Base URL**: `https://api.coingecko.com/api/v3`. Auth: header `x-cg-demo-api-key`.
- **Demo plan**: about 30 calls per minute and 10,000 per month. **Attribution required** ("Data provided by CoinGecko").

| Purpose | Endpoint |
|---|---|
| Global: total market cap, BTC dominance | `GET /global` |
| Markets: market cap, FDV, supply, ATH | `GET /coins/markets?vs_currency=usd&ids=bitcoin,ethereum` |
| Simple price (fallback quotes) | `GET /simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true` |
| Coin details: categories, links, description | `GET /coins/{id}` |
| Resolve a symbol to an id | `GET /search?query=sol` |
| Trending | `GET /search/trending` |

### 2.9 DefiLlama: DeFi and stablecoins (free, no key)

| Purpose | Endpoint |
|---|---|
| Protocols list (TVL, category, gecko_id) | `GET https://api.llama.fi/protocols` |
| Protocol TVL history | `GET https://api.llama.fi/protocol/{slug}` |
| Chains TVL | `GET https://api.llama.fi/v2/chains` |
| Fees / revenue overview | `GET https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true` |
| Protocol fees or revenue | `GET https://api.llama.fi/summary/fees/{slug}?dataType=dailyFees` (or `dailyRevenue`) |
| Stablecoin supply, a crypto liquidity proxy | `GET https://stablecoins.llama.fi/stablecoincharts/all` |

### 2.10 Small free sources (no key)

| Provider | Endpoint | Use |
|---|---|---|
| alternative.me Crypto Fear & Greed | `GET https://api.alternative.me/fng/?limit=30&format=json` | Sentiment (daily) |
| Frankfurter (ECB FX) | `GET https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD` (fallback `https://api.frankfurter.app/latest?from=EUR&to=USD`) | Convert cash and holdings to the base currency |
| Stooq daily CSV (unofficial) | `GET https://stooq.com/q/d/l/?s=^spx&i=d` (also `^ndx`, `^dji`, `xauusd`, `nvda.us`) | Daily history fallback |
| Yahoo Finance chart (unofficial) | `GET https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1y` | **Last resort only.** May block datacenter IPs; terms restrict use |

### 2.11 News and research

| Source | How | Use |
|---|---|---|
| **Brave Search via the n8n AI gateway** | Brave Search Tool node (`@brave/n8n-nodes-brave-search.braveSearchTool`): operation `news` for headlines, `llm_context` for research. Gateway-managed credential, so no own key is needed | Primary ad-hoc news search tool for every agent (`search_news`); Horizon's `research_web` |
| Finnhub | `/company-news`, `/news?category=general` | Ticker-specific and general market news |
| RSS (n8n RSS Read node) | See the feed list below | Workspace news digests; fallback when Brave is unavailable |

RSS feeds. Test each one once and drop dead feeds:

| Topic | Feed |
|---|---|
| Crypto | CoinDesk `https://www.coindesk.com/arc/outboundfeeds/rss/` · Cointelegraph `https://cointelegraph.com/rss` · Decrypt `https://decrypt.co/feed` · The Block `https://www.theblock.co/rss.xml` · Bitcoin Magazine `https://bitcoinmagazine.com/feed` |
| Markets | CNBC Top News `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` · CNBC Economy `…&id=20910258` · CNBC Earnings `…&id=15839135` · MarketWatch `https://feeds.content.dowjones.io/public/rss/mw_topstories` · Yahoo Finance `https://finance.yahoo.com/news/rssindex` |
| Per ticker | Yahoo `https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA&region=US&lang=en-US` · Google News `https://news.google.com/rss/search?q=NVDA%20stock&hl=en-US&gl=US&ceid=US:en` |
| Central banks / official | Fed press releases `https://www.federalreserve.gov/feeds/press_all.xml` · Fed monetary policy `https://www.federalreserve.gov/feeds/press_monetary.xml` · ECB `https://www.ecb.europa.eu/rss/press.html` · BLS `https://www.bls.gov/feed/bls_latest.rss` · SEC press `https://www.sec.gov/news/pressreleases.rss` |

Reuters discontinued its public RSS feeds and Bloomberg has no official free feed. Do not plan around either.

## 3. Symbol conventions and mapping

| Asset class | Canonical symbol (in chats, contracts, tools) | Example | Notes |
|---|---|---|---|
| `crypto` (charts / trading) | Binance spot pair | `BTCUSDT`, `ETHUSDT`, `SOLUSDT` | UI displays `BTC/USDT` |
| `crypto` (holdings) | Base asset | `BTC`, `ETH`, `USDC` | Valued through `<BASE>USDT`. Stablecoins (`USDT`, `USDC`, `DAI`, `FDUSD`) = 1.00 USD |
| `stock`, `etf` | US ticker | `NVDA`, `SPY` | |
| `index` | Index code | `SPX`, `NDX`, `DJI`, `RUT`, `VIX` | Mapped to proxies below |
| `gold` | `XAUUSD` (troy ounces in holdings: symbol `XAU`) | `XAUUSD` | |
| `cash` (holdings) | ISO currency | `USD`, `EUR` | FX through Frankfurter |

| Index / macro symbol | Intraday source (free) | Daily fallback | Label in answers and UI |
|---|---|---|---|
| `SPX` (S&P 500) | Twelve Data `SPY` | Stooq `^spx` | "S&P 500 (SPY proxy)" |
| `NDX` (Nasdaq 100) | Twelve Data `QQQ` | Stooq `^ndx` | "Nasdaq 100 (QQQ proxy)" |
| `DJI` (Dow Jones) | Twelve Data `DIA` | Stooq `^dji` | "Dow (DIA proxy)" |
| `RUT` (Russell 2000) | Twelve Data `IWM` | Stooq `iwm.us` | "Russell 2000 (IWM proxy)" |
| `VIX` | FRED `VIXCLS` (daily close only) | — | "VIX (daily close)" |
| `XAUUSD` (gold) | Twelve Data `XAU/USD` | Binance `PAXGUSDT` (24/7 tokenized-gold proxy), Stooq `xauusd` | "Gold (XAU/USD)" |
| `US10Y` | FRED `DGS10` | — | "US 10Y yield" |
| `DXY` | FRED `DTWEXBGS` (broad dollar index, not ICE DXY) | — | "USD broad index" |

**Timeframe mapping**:

| Ours | Binance | Bybit | Twelve Data |
|---|---|---|---|
| `1m` | `1m` | `1` | `1min` |
| `5m` | `5m` | `5` | `5min` |
| `15m` | `15m` | `15` | `15min` |
| `1h` | `1h` | `60` | `1h` |
| `4h` | `4h` | `240` | `4h` |
| `1d` | `1d` | `D` | `1day` |
| `1w` | `1w` | `W` | `1week` |

US equities trade 09:30–16:00 New York time on weekdays. Outside those hours, answers must say "last close" or "pre-market / after-hours" (Finnhub `market-status`). Crypto trades 24/7.

## 4. "Who is buying": signals we compute from free data

| Signal | Source | Definition |
|---|---|---|
| Taker buy/sell delta | Binance klines field 9 | Σ taker-buy volume − Σ taker-sell volume over the window; buy ratio = buy / total |
| Whale prints | Binance aggTrades | Single aggressive trades with notional ≥ max($250k, 0.02% of 24h quote volume) for majors, and ≥ $50k for others. Report side, size and time |
| Order book walls | Binance depth (1000) | Levels within ±2% of mid whose notional is ≥ 3× the median level notional in that band |
| Book imbalance | Binance depth | (bid notional − ask notional) / (bid + ask) within ±1% of mid, from −1 to +1 |
| Positioning | Binance futures (Bybit fallback) | Funding rate (and annualized), OI change over 24h, global and top-trader long/short ratios, taker buy/sell ratio |
| Insider buying (stocks) | Finnhub insider transactions | Open-market purchases (code `P`) in the last 90 days and 12 months, by person, with value |
| Liquidity regime (crypto) | DefiLlama stablecoins | 30-day change in total stablecoin supply |

On-chain whale transfers (Whale Alert), liquidation heatmaps (CoinGlass) and institutional 13F flows are **Phase B/C paid upgrades** (§7).

## 5. Next.js direct calls (UI only)

`apps/web` route handlers call providers directly. See ADR-006 in [02-architecture.md](02-architecture.md).

| Route | Providers | Cache (server) |
|---|---|---|
| `GET /api/market/overview` | Binance `ticker/24hr` (BTC, ETH, SOL); Finnhub `quote` (SPY, QQQ); Twelve Data `price` `XAU/USD` (fallback Binance `PAXGUSDT`); FRED `DGS10`; alternative.me F&G | 60 s (FRED 6 h, F&G 1 h) |
| `GET /api/market/candles` | Binance `data-api` klines for crypto; Twelve Data `time_series` for stock, ETF, index proxies and gold; Stooq daily fallback | 1m–15m: 20 s; 1h–4h: 60 s; 1d–1w: 10 min |

Set `export const preferredRegion = 'fra1'` on these routes.

## 6. Caching (n8n tools: `market_cache` table; Next.js: route cache)

| Data | TTL |
|---|---|
| Klines 1m–15m / 1h–4h / 1d+ | 20 s / 60 s / 10 min |
| Order book, aggTrades | no cache (always live) |
| Futures positioning | 60 s |
| Quotes (Finnhub, Binance tickers) | 30 s |
| CoinGecko global / markets | 5 min |
| Fear & Greed | 1 h |
| FRED series | 6 h |
| FRED release calendar | 12 h |
| SEC companyfacts / submissions | 24 h |
| Finnhub profile / metrics | 12 h |
| Finnhub insider transactions | 6 h |
| SEC ticker→CIK map, Binance exchangeInfo | 24 h |
| News search results | 5 min |

Cache keys are `provider:endpoint:param=value&…`, for example `fred:CPIAUCSL` or `sec:companyfacts:0001045810`.

## 7. Licensing, attribution and paid upgrades

| Provider | Phase A (personal) | Before commercial launch |
|---|---|---|
| Binance / Bybit public market data | OK | Review terms for commercial display |
| Twelve Data free | Personal use | Paid plan required |
| Finnhub free | Non-commercial | Paid plan required |
| CoinGecko Demo | Attribution required | Paid plan (commercial licence) |
| SEC EDGAR | Public domain; fair-access rules | Same |
| FRED | Free with key; **some series are third-party copyrighted** (ICE BofA, CBOE VIX, S&P) | Check each series' notes; drop or license restricted ones |
| DefiLlama, alternative.me, Frankfurter | Free; attribution appreciated | Same |
| Brave Search via n8n gateway | Included in n8n credits | Own Brave key if volume grows |

**UI attribution**: Settings → Data sources lists every provider. SourcesRow names the provider for each figure.

**Candidate paid upgrades** (Phase B/C):

- Whale Alert: on-chain whale transfers.
- CoinGlass: aggregated funding, open interest and liquidations across exchanges.
- Glassnode or CryptoQuant: on-chain metrics.
- Polygon/Massive or Finnhub paid: real-time US equities and indices.
- Financial Modeling Prep: fundamentals and 13F institutional holders.
- An options-flow provider.
- X API: social sentiment.
