# Owner's UI spec for the MVP web interface (2026-10-07)

This is the owner's latest description of the interface. Where it differs from `docs/03-design-system.md`, **this file wins for `apps/mvp-web/index.html`**.

## 1. Branding and top controls (top-left)

- **Logo**: a single flat, geometric lightning bolt in deep ruby `#9B111E` (RGB 155, 17, 30). No glow, neon gradients or blur. Next to it, minimal white text: **Aura Invest AI**.
- **"+ New Chat"**: a full-width sidebar button, `rounded-lg`, with a dark-grey matte background, a white plus icon and white text. Clicking it always resets the UI to the **Main** chat (the hub).
- **Artifacts**: a button with a folder icon. It opens a **right-side drawer** that lists agent-generated research (reports and tables). For the MVP, list assistant replies the user saved, or show an empty state.
- **Settings**: a button with a mixer-sliders (or wrench) icon. It opens integration settings.

## 2. Categories as projects (sidebar center)

There are three collapsible groups, and chat history is strictly isolated per group. Each group header has a chevron on the left and a **+** on the right:

- **Trading Space**: `+` opens a chat with the **Scanner agent** (the n8n Trading agent). Below it, the last 3–5 chats, such as "BTC signals" and "NASDAQ order book".
- **Horizon 2030**: `+` opens a chat with the **Auditor agent** (the long-term agent). History holds long-term analyses, such as "TSLA growth thesis" and "AI sector analysis".
- **Macro & Portfolio**: `+` opens a chat with the **Macro Strategist** (the Portfolio agent).
  - **Pinned "Portfolio chat"** is the top row of this group and always stays first. It has a pushpin icon and a mini-chart icon. Its background is slightly lighter charcoal with a **thin ruby stripe on the left**. This is the investor's control panel.

The Main hub is reached with "+ New Chat".

## 3. Account profile panel (sidebar bottom)

- It is pinned to the bottom of the sidebar (`mt-auto`), with a thin, barely visible grey divider above it.
- **Avatar**: round, showing initials or a custom avatar, with a thin ruby outline.
- **Account text**, on two lines: the name in bold white (for example `Roman`), and below it a muted grey username or plan (`@romashsq` or `Premium Plan`).
- **Gear button** on the right opens a dropdown with:
  - the remaining Claude API token or balance (MVP: "Usage: shown in n8n");
  - connector status (Binance, Yahoo Finance, SEC, FRED…), each with a status dot;
  - sign out (MVP: "Clear local data").

## 4. Main chat area (right side)

- **Agent indicators**: three minimal icon dots in a row, centered above the input, like the Claude app:
  - Trading: a lightning bolt over two candlesticks;
  - Investing: a shield with a rising bar chart and a `$`;
  - Macro: scales with a globe and a gold bar.

  The active workspace's icon is ruby. The other two are semi-transparent grey.
- **Input**: a long bar with a matte ruby outline.
  - Inside, on the left: an **Assets** menu with strict SVG icons for Crypto, Stocks, Indices and Gold.
  - Inside, on the right: a **round ruby send button with an arrow**.

## 5. Colours (Tailwind equivalents)

| Role | Value |
|---|---|
| App background (matte charcoal) | `#121214` (or `#18181c`) |
| Inputs and panels (dark grey) | `#1e1e24` |
| Ruby accent | `#9B111E` (text and fills) |
| Text | Primary white; secondary (history, username) gray-400 `#9CA3AF` |
