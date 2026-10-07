# 03. Design system and UI spec

This document is the visual source of truth for `apps/web`. The layout follows the Claude desktop app: a left sidebar with a logo, primary actions, project-like groups and a profile panel, plus a conversation pane. It is restyled in a flat **charcoal and matte ruby** look.

## 1. Principles

1. **Flat and matte.** No glow, no neon, no blur, no gradients on surfaces, no coloured shadows. Depth comes from 1px borders and three surface steps.
2. **One accent.** Matte ruby is used only for the primary action, active and pinned states, and focus. It is never used for decoration.
3. **Data first.** Numbers use tabular monospace figures. Up and down colours are semantic and separate from the ruby accent.
4. **Claude-like structure.** Sidebar plus conversation, minimal chrome. Content-dense, but calm.
5. **Consistent agents.** Each agent has one icon and one name everywhere. Agents are not colour-coded; the active one is shown in ruby.

## 2. Color tokens

Dark theme only for the MVP. A light theme is Phase B. Greys carry a slight cool-violet bias that pairs with the ruby.

```css
:root {
  color-scheme: dark;

  /* Surfaces */
  --bg-app:        #0F0F12;  /* app background, conversation pane */
  --bg-sidebar:    #131317;  /* sidebar, ticker strip */
  --bg-surface:    #18181D;  /* cards, composer, table headers */
  --bg-raised:     #1F1F25;  /* hover, user bubbles, menus */
  --bg-active:     #26262E;  /* selected list item */
  --border:        #2A2A32;
  --border-strong: #3A3A44;

  /* Text */
  --text-primary:   #EDEDF0;
  --text-secondary: #A5A5B0;
  --text-muted:     #80808C;  /* metadata only; 4.9:1 on --bg-app */
  --text-on-accent: #FFFFFF;

  /* Matte ruby accent */
  --ruby-500:    #B8243F;  /* hover */
  --ruby-600:    #9F1D35;  /* primary fill (white text 7.8:1) */
  --ruby-700:    #861830;  /* pressed */
  --ruby-text:   #E8687F;  /* ruby text/icons on dark surfaces (6.1:1) */
  --ruby-tint:   rgba(159, 29, 53, 0.14);  /* pinned / selected backgrounds */
  --ruby-border: rgba(184, 36, 63, 0.45);  /* focus-within, pinned border */
  --focus-ring:  #C7375A;

  /* Market semantics (never the accent) */
  --up:      #3DBE8B;
  --down:    #EF5A52;
  --flat:    #8B8B96;
  --warning: #D9A441;
  --info:    #6F9DF2;

  /* Asset-class categorical palette (allocation bar, legends) */
  --cat-crypto: #E0A458;
  --cat-stock:  #6F9DF2;
  --cat-etf:    #4FB6C6;
  --cat-gold:   #C9B458;
  --cat-cash:   #8B8B96;
}
```

Rules:

- Ruby (`--ruby-600`) is a **fill** colour. For ruby text or icons on dark surfaces use `--ruby-text`.
- `--down` (coral red) is for negative numbers only and must never be used for buttons. Ruby is for UI only and must never be used for negative numbers.
- Body text uses at least `--text-secondary`. `--text-muted` is for timestamps, captions and placeholders.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| UI and body | **Geist** (`next/font/google`), fallback `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | |
| Numbers and code | **Geist Mono**, fallback `ui-monospace, "SF Mono", Menlo, monospace` | Always `font-variant-numeric: tabular-nums` |

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-label` | 11 / 16, uppercase, +0.06em tracking | 500 | Section labels ("WORKSPACES") |
| `text-meta` | 12 / 16 | 400 | Timestamps, captions, disclaimer |
| `text-ui` | 13 / 18 | 400/500 | Sidebar items, table cells, chips |
| `text-body` | 14 / 20 | 400 | Controls, user bubbles |
| `text-message` | 15 / 24 | 400 | Assistant message body (max 72ch) |
| `text-h3` | 16 / 22 | 600 | Headings inside messages |
| `text-title` | 18 / 24 | 600 | Page and panel titles |
| `text-display` | 28 / 34, mono | 600 | Portfolio total value |

## 4. Spacing, radius, elevation, motion

- **Spacing**: 4px grid (4, 8, 12, 16, 20, 24, 32, 40). Lay out sibling groups with flex or grid and `gap`.
- **Radius**: 6px for controls and list items; 10px for cards, menus and user bubbles; 12px for the composer; 999px for pills and avatars.
- **Borders**: 1px `--border` everywhere; `--border-strong` for inputs on hover.
- **Elevation**: only floating layers (menus, popovers, dialogs, sheets) get `0 8px 24px rgba(0,0,0,0.40)`. Nothing else has a shadow.
- **Motion**:
  - hover and press: 120–160 ms ease-out;
  - sidebar collapse: 180 ms;
  - thinking dots: 1.2 s opacity pulse;
  - `prefers-reduced-motion` disables pulses and transitions.

## 5. Layout

### 5.1 Desktop wireframe (≥ 1280px)

```
┌───────────────────────────┬────────────────────────────────────────────────────────────────┐
│ [logo] Aura          [<<] │ BTC 62,310.20 ▲1.24%  ETH 2,481.10 ▼0.40%  SPY 571.20 ▲0.31%  …│ ticker strip 32px
│ [pen] New chat     ⌘⇧O    ├────────────────────────────────────────────────────────────────┤
│ [search] Search    ⌘K     │ Trading / BTC/USDT intraday levels   (candle) Trading agent [⋯]│ chat header 48px
│ [files] Artifacts         ├────────────────────────────────────────────────────────────────┤
│                           │                                                                │
│ WORKSPACES                │            conversation column, max-width 768px                │
│ v (compass) Main      [+] │                                                                │
│     What moved markets…   │                              ┌──────────────────────────────┐  │
│ v (candle) Trading    [+] │                              │ Where are the key levels…    │  │
│   > BTC/USDT intraday…    │                              └──────────────────────────────┘  │
│     NVDA momentum check   │  (candle) Trading agent · 14:05                                │
│ > (telescope) Horizon [+] │  **Bottom line:** …                                            │
│ v (pie) Portfolio & M [+] │  | Level | Price | Why it matters |                            │
│   [pin] My Live Portfolio │  [ candle chart card ]                                         │
│     Fed path & my alloc…  │  Sources: Binance 14:04 UTC · Binance Futures 14:04 UTC        │
│                           │                                                                │
│                           │        (compass) (candle) (telescope) (pie)   ← agent row      │
│                           │  ┌──────────────────────────────────────────────────────────┐  │
│                           │  │ Ask the Trading agent…                                    │  │
│                           │  │ [btc Crypto v] [BTCUSDT] [1h v]                      (^)  │  │
│ ───────────────────────── │  └──────────────────────────────────────────────────────────┘  │
│ (AB) Alex Brown  Pro  [⚙] │  Aura shares market analysis for information only. It is not  │
└───────────────────────────┴──── investment advice. ────────────────────────────────────────┘
```

### 5.2 Sidebar (272px; collapsed rail 56px)

1. **Header**: the logo mark plus the "Aura" wordmark (600 weight), and a collapse button (`panel-left-close`). Collapsed state is remembered in `localStorage`.
2. **Primary actions** (32px rows):
   - **New chat** opens a new chat in **Main**;
   - **Search** opens a ⌘K command palette over all chats;
   - **Artifacts** goes to `/artifacts`.
3. **WORKSPACES** label.
4. **Four workspace groups**, in this fixed order: Main, Trading, Horizon 2030, Portfolio & Macro.
   - Group row: chevron, workspace icon, name, and a **`+` button that is always visible** (muted; on hover it uses `--text-primary` on `--bg-raised`). The `+` creates a chat in that workspace and opens it.
   - Chat rows: 32px, `text-ui`, single-line ellipsis, a leading 14px context icon (see §7). Active row: `--bg-active` with 500 weight; no side rails. On hover a `⋯` menu appears with Rename, Archive and Delete (inline confirm, no browser dialogs).
   - Show 8 chats per group, then "Show all (N)".
   - **Pinned "My Live Portfolio"** is always the first row of Portfolio & Macro:
     - `pin` icon in `--ruby-text`;
     - `--ruby-tint` background with a 1px `--ruby-border`;
     - it cannot be renamed, archived or deleted.
5. **Profile panel** at the bottom, with a top border:
   - 28px initials avatar, display name, and a plan pill ("Pro" on `--ruby-tint` in `--ruby-text`);
   - a gear button. It opens a menu upward with Profile & preferences, Risk profile, Data sources, Keyboard shortcuts and Sign out.

### 5.3 Conversation pane

- **Ticker strip** (32px, `--bg-sidebar`, bottom border):
  - items: BTC, ETH, SOL, S&P 500 (SPY), Nasdaq 100 (QQQ), Gold, US 10Y, Fear & Greed;
  - each item shows a label, a mono price and the change with ▲ or ▼ in `--up` or `--down`;
  - it scrolls horizontally on narrow screens and refreshes every 60 s;
  - items older than 5 minutes are dimmed and get an "as of" tooltip.
- **Chat header** (48px):
  - breadcrumb `Workspace / Chat title`, where the title is editable inline;
  - agent badge (icon + "Trading agent");
  - symbol chip when the chat has a symbol;
  - a `⋯` menu with Rename, Archive and Delete.
- **Messages** (column max-width 768px, centered):
  - **User**: right-aligned bubble, max 80% width, `--bg-raised`, radius 10px, padding 10px 14px.
  - **Assistant**: no bubble. A 24px agent avatar (icon in a circle with `--bg-surface` and a border), then a meta line ("Trading agent · 14:05"), then the markdown body in `text-message`. Markdown styling:
    - `h3` in `text-h3`;
    - tables full width with 1px borders, a header row on `--bg-surface`, and numbers in mono, right-aligned;
    - links in `--ruby-text`, underlined on hover.
  - **Attachments under an assistant message**, in this order:
    1. **CandleChartCard** when `metadata.chart` is present;
    2. **ArtifactCard** when `metadata.artifact_id` is present;
    3. **SuggestedWorkspaceChip** ("Continue in Horizon 2030 →") when `metadata.suggested_workspace` is present;
    4. **SourcesRow** ("Sources: Binance · 14:04 UTC · Finnhub · 14:03 UTC").
  - **Thinking indicator** while a run is pending: the agent avatar, "Trading agent is analyzing live data", and three pulsing dots in muted text. After 45 s it changes to "Still working, pulling more data". At 150 s it turns into the error state.
  - **Error message**: `--bg-surface` card with a 1px `--down` border at 40% alpha, a `triangle-alert` icon and the text "The Trading agent couldn't finish this answer." with a **Retry** button.
- **Empty state** (new chat): a centered 40px agent icon, the workspace name, a one-line description, and four suggested prompt chips in a 2×2 grid (§6).
- **Agent row** above the composer: four 32px circular buttons, one per agent, each with a tooltip. The active agent is `--ruby-600` with a white icon. The others are `--bg-surface` with a border and a muted icon. Clicking another agent opens a new chat in that workspace and carries over the draft text.
- **Composer** (radius 12px, `--bg-surface`, 1px `--border`; when focused the border becomes `--ruby-border`):
  - auto-growing textarea, 1–8 lines. Placeholder: "Ask the Trading agent…", using the workspace's agent name.
  - Toolbar, left side:
    - **Asset dropdown**: Crypto (`bitcoin`), Stocks (`chart-line`), Indices (`layers`), Gold (`coins`);
    - **Symbol input**: mono, uppercase, autocomplete from a static list. Placeholders: `BTCUSDT`, `NVDA`, `SPX`, `XAUUSD`;
    - **Timeframe select**, shown in Trading only: 5m, 15m, 1h, 4h, 1d, 1w (default 1h).
  - Toolbar, right side: a **Send** button, a 32px `--ruby-600` circle with a white `arrow-up` icon. Disabled: `--bg-raised` with a muted icon. Sending: spinner.
  - Enter sends; Shift+Enter adds a new line.
  - The asset class, symbol and timeframe are saved on the chat (`chats.asset_class`, `symbol`, `timeframe`) and sent as `context`.
- **Disclaimer** under the composer (`text-meta`, muted, centered): "Aura shares market analysis for information only. It is not investment advice."

### 5.4 My Live Portfolio (pinned chat)

A collapsible panel above the thread:

1. **Title row**:
   - "My Live Portfolio" and "as of 14:05";
   - **Refresh** (ghost button), **Edit holdings** (secondary button), **Run review** (primary ruby button).
2. **Totals row**:
   - total value in `text-display` mono;
   - day change in absolute terms and %;
   - total P&L in absolute terms and %;
   - **health pill**: 80–100 is "Healthy" (`--up`), 60–79 is "Watch" (`--warning`), below 60 is "At risk" (`--down`).
3. **Allocation bar**: one 10px stacked bar by asset class in the `--cat-*` colours, with a legend of class names and %.
4. **Positions table**:
   - columns: Asset (icon + symbol + name), Class, Quantity, Price, Value, Weight, P&L %, 24h %;
   - sorted by value;
   - numbers are mono and right-aligned;
   - a missing price shows "—" with the tooltip "No price from provider".
5. **Flags**: chips from `health.flags`, such as "Crypto 41% vs 5–15% target".
6. **Edit holdings** opens a right-hand sheet, 420px wide:
   - the list of holdings with inline edit;
   - an **Add holding** form: asset class, symbol, quantity, average cost (optional), venue (optional), notes;
   - delete with an inline confirm.

At phone width the positions table becomes a card list.

### 5.5 Other pages

- **Artifacts** (`/artifacts`):
  - list rows show a workspace icon, title, kind pill, date, and a link to the source chat;
  - a reader view (max 760px) renders the markdown;
  - actions: Copy markdown, Open chat, Delete (inline confirm).
- **Settings** (`/settings`):
  - **Profile**: display name.
  - **Preferences**: base currency (USD/EUR), timezone, and risk profile as radio cards (Conservative, Balanced, Aggressive) with a one-line description each.
  - **Data sources**: provider list and attribution.
  - **Account**: email, Sign out.
- **Login** (`/login`): a centered card with the logo, "Sign in to Aura", and an email field with a magic link (or password). Note: "Aura is invite-only."

### 5.6 Responsive behaviour

| Width | Behaviour |
|---|---|
| ≥ 1280 | Sidebar 272px |
| 1024–1279 | Sidebar 248px |
| 768–1023 | Sidebar collapsed to the 56px rail by default |
| < 768 | Sidebar becomes an off-canvas drawer (menu button in the chat header); ticker strip scrolls; composer is sticky with safe-area padding; tables become card lists |

The page body never scrolls horizontally. Only tables and charts scroll inside their own containers.

## 6. Workspace content

| Workspace | Agent name | Icon (lucide) | One-liner (empty state) | Suggested prompts |
|---|---|---|---|---|
| Main | Main agent | `compass` | "Your home base: market overview, concepts, and where to dig deeper." | "What moved markets in the last 24 hours?" · "How do Fed rate decisions affect crypto?" · "Compare Bitcoin and gold as hedges" · "Which workspace should I use for a long-term idea?" |
| Trading | Trading agent | `chart-candlestick` | "Short-term setups from live candles, order books and positioning." | "Key levels for BTC/USDT on the 1h chart" · "Is NVDA's volume today unusual?" · "Funding and open interest check for ETH" · "Gold: breakout or fake-out this week?" |
| Horizon 2030 | Horizon agent | `telescope` | "Long-term theses from filings, insiders and megatrends." | "Build a 2030 thesis for NVDA" · "How healthy are Tesla's financials?" · "Are insiders buying any big tech names?" · "Ethereum as a 2030 holding: bull and bear case" |
| Portfolio & Macro | Portfolio agent | `chart-pie` | "Your crypto and stock portfolio against the macro regime." | "Review my portfolio against today's macro regime" · "Am I too concentrated anywhere?" · "Which macro events this week matter for my holdings?" · "Suggest a rebalancing plan for my risk profile" |

## 7. Iconography

All icons are `lucide-react` at stroke 1.75. Sizes: 14px in lists, 16px in buttons, 20px in the header.

| Purpose | Icon |
|---|---|
| New chat / Search / Artifacts / Settings | `square-pen` / `search` / `files` / `settings` |
| Collapse / expand sidebar | `panel-left-close` / `panel-left-open` |
| Add chat / group chevrons / more | `plus` / `chevron-down`, `chevron-right` / `ellipsis` |
| Pinned / send / retry / error | `pin` / `arrow-up` / `rotate-ccw` / `triangle-alert` |
| Copy / rename / archive / delete | `copy` / `pencil` / `archive` / `trash-2` |
| Asset classes | Crypto `bitcoin`, Stocks `chart-line`, Indices `layers`, Gold `coins`, ETF `package`, Cash `banknote` |
| Chat context icon in sidebar | Default `message-square`. Trading chat with a symbol: `chart-candlestick`. Chat with a thesis artifact: `file-text`. Portfolio review: `shield-check`. Macro topic: `landmark` |

**Logo mark**: a single ruby tile with a white lightning bolt. Use it everywhere: favicon, sidebar, login.

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aura">
  <rect width="24" height="24" rx="6" fill="#9F1D35"/>
  <path d="M13.2 4.5 7.5 13.1h4.1l-.9 6.4 5.8-8.7h-4.1l.8-6.3Z" fill="#FFFFFF"/>
</svg>
```

## 8. Component inventory

| Component | States / variants | Notes |
|---|---|---|
| `Button` | primary (ruby), secondary (`--bg-raised` + border), ghost, icon; hover, pressed, disabled, loading | Labels are verbs: "Run review", "Save holding" |
| `Sidebar`, `WorkspaceGroup`, `ChatListItem`, `PinnedChatItem` | default, hover, active, collapsed rail | `+` always visible on groups |
| `ProfilePanel`, `ProfileMenu` | — | Menu opens upward |
| `TickerStrip`, `TickerItem` | live, stale | Data from `/api/market/overview` |
| `ChatHeader`, `AgentBadge`, `SymbolChip` | — | Inline title rename |
| `MessageList`, `UserMessage`, `AssistantMessage`, `ErrorMessage`, `ThinkingIndicator` | pending, complete, error | `aria-live="polite"` on the list |
| `CandleChartCard` | loading, ready, error | `lightweight-charts`; candles `--up` / `--down`; volume histogram at 30% alpha; 280px tall; timeframe tabs |
| `SourcesRow`, `SuggestedWorkspaceChip`, `ArtifactCard` | — | |
| `EmptyState`, `PromptChip` | — | 2×2 grid |
| `AgentRow` | active, inactive, hover | Tooltips with agent names |
| `Composer`, `AssetDropdown`, `SymbolInput`, `TimeframeSelect`, `SendButton` | idle, focused, sending, disabled | |
| `LivePortfolioPanel`, `TotalsRow`, `AllocationBar`, `PositionsTable`, `HealthPill`, `FlagChips` | loading (skeleton), ready, stale, error | |
| `HoldingsSheet`, `HoldingForm` | add, edit, delete-confirm | Validation inline |
| `CommandPalette` | — | ⌘K search over chats |
| `Toast` | success, error | Bottom-right, 4 s |

Build on shadcn/ui primitives (Button, DropdownMenu, Dialog, Sheet, Tooltip, Command, Input, Textarea, Select, Table, Sonner), restyled flat with the tokens above. Map the tokens into Tailwind v4 with `@theme` so that classes like `bg-app`, `bg-surface`, `text-secondary`, `border-border` and `bg-ruby-600` exist.

## 9. Copy and number formatting

- Use sentence case everywhere. Write button labels as verbs, and make toasts confirm the result ("Chat deleted").
- Error messages say what happened and how to fix it: "Couldn't reach the Trading agent. Check your connection and retry."
- **Prices**:
  - ≥ 1: thousands separators and 2 decimals (`62,310.20`);
  - < 1: up to 6 significant digits (`0.0001234`).
- **Percentages**: always signed, with 2 decimals and a true minus sign (`+1.24%`, `−0.40%`).
- **Large values**: `1.23K`, `4.56M`, `7.89B`, `1.20T`.
- **Time**:
  - sidebar: relative (`2h`);
  - messages: absolute in the user's timezone (`Oct 7, 14:05`);
  - data freshness: in UTC (`as of 14:04 UTC`).
- **Currency**: `$` for the base currency USD; ISO code suffix for others (`1,250.00 EUR`).

## 10. Accessibility

- WCAG 2.2 AA contrast. The tokens above meet it, with `--text-muted` reserved for metadata.
- Visible focus: 2px `--focus-ring` outline with a 2px offset on every interactive element.
- Every icon-only button has an `aria-label` and a tooltip.
- Keyboard:
  - ⌘K opens search, ⌘⇧O starts a new chat, Esc closes layers;
  - arrow keys move through lists and menus;
  - Enter sends, Shift+Enter adds a new line.
- New assistant messages are announced through `aria-live="polite"`. Charts are supplementary, because the message text always states the key levels.
- `prefers-reduced-motion` turns off pulses and transitions.
