# UI design prompts

Both prompts follow [docs/03-design-system.md](../docs/03-design-system.md). If they ever disagree with that document, the document wins.

## A. Mockup image (image models)

```text
A high-fidelity desktop UI screenshot of a financial AI chat app called "Aura", laid out like the Claude desktop app. Flat, matte, dark interface: charcoal background #0F0F12, slightly lighter sidebar #131317, thin 1px grey borders #2A2A32, crisp off-white text. A single matte ruby-red accent #9F1D35 is used sparingly. No glow, no neon, no blur, no gradients, no shadows except one dropdown.

Left sidebar (272px):
- top: one small ruby rounded-square logo with a white lightning bolt, next to the word "Aura";
- rows "New chat", "Search", "Artifacts" with thin line icons;
- a small uppercase label "WORKSPACES";
- four collapsible groups, each with a line icon, a name and a small "+" button on the right: "Main" (compass icon), "Trading" (candlestick icon), "Horizon 2030" (telescope icon), "Portfolio & Macro" (pie chart icon);
- under each group, 2–3 chat titles such as "BTC/USDT intraday levels", "NVDA momentum check", "NVDA 2030 thesis", "Fed path and my allocation";
- the first item under Portfolio & Macro is a pinned "My Live Portfolio" row with a pin icon, a faint ruby-tinted background and a thin ruby border;
- bottom: a profile panel with a round initials avatar "AB", the name "Alex Brown", a small "Pro" pill and a gear icon.

Main area:
- a thin ticker strip at the top: "BTC 62,310.20 ▲1.24%  ETH 2,481.10 ▼0.40%  S&P 500 (SPY) 571.20 ▲0.31%  Gold 2,655.40 ▲0.12%  US 10Y 4.12%", with green and coral-red changes;
- a chat header "Trading / BTC/USDT intraday levels" with a small "Trading agent" badge;
- a right-aligned user bubble "Where are the key levels today?";
- an assistant answer in clean typography: a bold "Bottom line:" line, a compact table "Key levels" with price columns in monospace, and a dark candlestick chart card with green and coral candles and a faint volume histogram;
- a sources line in small grey text.

Above the input: four small circular agent icons, with the candlestick one filled ruby (active) and the others outlined grey.

The input bar is wide, with rounded corners and a thin border. Inside it on the left: a dropdown "Crypto" with a bitcoin icon, a monospace field "BTCUSDT", and a "1h" timeframe dropdown. On the right: a solid ruby circular send button with a white up-arrow.

Under the input, tiny grey text: "Aura shares market analysis for information only. It is not investment advice."

Style: Inter-like geometric sans, tabular numbers, generous spacing, production-ready, realistic, sharp, 16:10.
```

## B. UI code (v0, Claude, Cursor)

```text
Build the Aura Invest AI app shell in Next.js (App Router, TypeScript) with Tailwind CSS v4, shadcn/ui restyled flat, and lucide-react.
Follow these tokens exactly:
- bg-app #0F0F12, bg-sidebar #131317, bg-surface #18181D, bg-raised #1F1F25, bg-active #26262E
- border #2A2A32, border-strong #3A3A44
- text-primary #EDEDF0, text-secondary #A5A5B0, text-muted #80808C
- ruby-600 #9F1D35 (fill), ruby-500 #B8243F (hover), ruby-700 #861830 (pressed), ruby-text #E8687F, ruby-tint rgba(159,29,53,0.14), ruby-border rgba(184,36,63,0.45)
- up #3DBE8B, down #EF5A52
- fonts: Geist and Geist Mono (tabular-nums)
- radius: 6px controls, 10px cards, 12px composer
- no shadows except menus; no glow, blur or gradients

Components:
1. Sidebar (272px, collapsible to a 56px rail):
   - logo tile (ruby square with a white bolt) and "Aura";
   - New chat (square-pen), Search (search, ⌘K), Artifacts (files);
   - a "WORKSPACES" label and four groups (Main: compass, Trading: chart-candlestick, Horizon 2030: telescope, Portfolio & Macro: chart-pie), each with an always-visible "+" button and a chat list;
   - a pinned "My Live Portfolio" first in Portfolio & Macro (pin icon, ruby-tint background, ruby-border);
   - a profile panel at the bottom (initials avatar, name, "Pro" pill, settings gear opening a menu upward).
2. Ticker strip: BTC, ETH, SOL, S&P 500 (SPY), Nasdaq 100 (QQQ), Gold, US 10Y, Fear & Greed, with mono prices and up/down colours.
3. Chat header: breadcrumb "Workspace / Title", agent badge, more menu.
4. Message list:
   - user bubbles: right-aligned, bg-raised, radius 10;
   - assistant messages: no bubble, agent avatar, markdown with tables;
   - CandleChartCard placeholder, SourcesRow, SuggestedWorkspaceChip;
   - ThinkingIndicator (three pulsing dots, reduced-motion aware).
5. Agent row: four 32px circles, the active one ruby-filled.
6. Composer: auto-growing textarea, Asset dropdown (Crypto: bitcoin, Stocks: chart-line, Indices: layers, Gold: coins), mono Symbol input, Timeframe select (Trading only), ruby circular Send with arrow-up.
7. Disclaimer under the composer: "Aura shares market analysis for information only. It is not investment advice."

Use realistic sample data clearly marked as examples. Make it accessible: aria-labels on icon buttons, visible focus ring 2px #C7375A, keyboard navigation. Make it responsive: the sidebar becomes a drawer below 768px.
```
