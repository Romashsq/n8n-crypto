# apps/web: Aura web app (Next.js on Vercel)

**Owner: Web App session.** This README is the build plan. The app doesn't exist yet.

Read first:

- [docs/03-design-system.md](../../docs/03-design-system.md) (visual spec);
- [docs/05-api-contracts.md](../../docs/05-api-contracts.md) (every request and response);
- [docs/06-database.md](../../docs/06-database.md) (tables and RLS);
- [docs/04-data-sources.md §3 and §5](../../docs/04-data-sources.md) (symbol mapping and provider calls for the market routes).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable), App Router, TypeScript strict |
| Styling | Tailwind CSS v4, tokens from the design system mapped in `@theme`; shadcn/ui primitives restyled flat |
| Icons | `lucide-react`; the custom logo SVG lives in `src/components/brand/logo.tsx` |
| Data | `@supabase/supabase-js` + `@supabase/ssr` (browser client and server client with cookies) |
| Charts | `lightweight-charts` |
| Markdown | `react-markdown` + `remark-gfm` |
| Validation | `zod` for API route inputs and outputs |
| Tests | Vitest for formatters, contracts and the health label; Playwright smoke test for login → send → reply (optional) |

## Planned structure

```
apps/web/
  src/
    app/
      (auth)/login/page.tsx
      (app)/layout.tsx                 sidebar + ticker + main pane
      (app)/page.tsx                   redirects to the most recent chat or a new Main chat
      (app)/c/[chatId]/page.tsx        chat view (Live Portfolio panel when kind = portfolio_live)
      (app)/artifacts/page.tsx
      (app)/artifacts/[id]/page.tsx
      (app)/settings/page.tsx
      api/chat/send/route.ts
      api/market/overview/route.ts     preferredRegion 'fra1'
      api/market/candles/route.ts      preferredRegion 'fra1'
      api/portfolio/snapshot/route.ts
    components/
      brand/  sidebar/  chat/  composer/  market/  portfolio/  artifacts/  ui/ (shadcn)
    lib/
      contracts.ts                     types from docs/05 §1 (copied verbatim)
      supabase/{client,server}.ts
      format.ts                        price, percent, compact numbers, time (docs/03 §9)
      symbols.ts                       canonical symbols, proxies, timeframe maps (docs/04 §3)
      providers/{binance,twelvedata,finnhub,fred,feargreed}.ts   server-only
    styles/globals.css                 tokens + @theme
```

## Behaviour notes

- **Sending:**
  1. Disable the composer while the request is in flight.
  2. On 202, show the ThinkingIndicator keyed by `request_id`.
  3. The reply arrives through the Realtime `INSERT` on `messages` for this chat.
  4. **Fallback polling:** if no event arrives within 10 s, poll the messages for that `request_id` every 3 s until 150 s have passed. After that, show the error state with Retry, which sends `retry_request_id`.
- **New chat:** `+` on a workspace inserts a chat (title `New chat`) and navigates to it. The title updates when the first reply arrives, from the `chats` Realtime update or a refetch.
- **The pinned chat** (`kind = 'portfolio_live'`) shows the Live Portfolio panel:
  - data from `GET /api/portfolio/snapshot`;
  - **Run review** sends `mode: 'portfolio_review'`;
  - **Edit holdings** writes the `holdings` table directly (RLS).
- **Charts:** when `metadata.chart` is set, render CandleChartCard from `GET /api/market/candles`, with timeframe tabs. Label proxies (`is_proxy`).
- **Market routes** call providers server-side with `fetch` caching (`next: { revalidate }`) per the TTLs in docs/04 §5. Use `data-api.binance.vision` for Binance.
- **Dev-only mock:** when `NODE_ENV=development` and `N8N_WEBHOOK_BASE_URL` is unset, `/api/chat/send` inserts a fake assistant reply after 2 s, so the UI can be built before the gateway exists. Never enable this in production.

## Deploy

1. Vercel project root directory: `apps/web`. Framework preset: Next.js.
2. Env vars from [`.env.example`](../../.env.example). Ask the owner to add them; never commit them.
3. After the first production deploy, put the URL in `docs/STATUS.md` and ask the owner to add it to the Supabase Auth URL configuration.
