# n8n workflow registry

This table is the single source of truth for which workflows exist, who owns them and their IDs. **Each session edits only its own rows.** Fill in the ID right after `create_workflow_from_code`, and set Published after `publish_workflow`. Names must match exactly, including the middle dots.

Project: `Roman <rbondarenko965@gmail.com>` (`RA51JancyDRm2cCw`) · Folder: `Aura Invest AI` · Tag: `aura`

| Name | Kind tag | Owner | Source file | n8n ID | Published | Notes |
|---|---|---|---|---|---|---|
| Aura · API · Chat Message | aura-api | PLAT | `api-chat-message.workflow.ts` | — | — | Webhook `POST aura/v1/chat/message` |
| Aura · API · Portfolio Snapshot | aura-api | PFL | `api-portfolio-snapshot.workflow.ts` | — | — | Webhook `GET aura/v1/portfolio/snapshot` |
| Aura · System · Guardrail | aura-system | PLAT | `system-guardrail.workflow.ts` | — | — | Haiku scope classifier |
| Aura · System · Error Handler | aura-system | PLAT | `system-error-handler.workflow.ts` | — | — | Error Trigger |
| Aura · Agent · Main | aura-agent | PLAT | `agent-main.workflow.ts` | — | — | |
| Aura · Agent · Trading | aura-agent | TRD | `agent-trading.workflow.ts` | — | — | Stub by PLAT, then updated in place by TRD |
| Aura · Agent · Horizon | aura-agent | HZN | `agent-horizon.workflow.ts` | — | — | Stub by PLAT, then updated in place by HZN |
| Aura · Agent · Portfolio | aura-agent | PFL | `agent-portfolio.workflow.ts` | — | — | Stub by PLAT, then updated in place by PFL |
| Aura · Tool · Market Overview | aura-tool | PLAT | `tool-market-overview.workflow.ts` | — | — | |
| Aura · Tool · Crypto Chart | aura-tool | TRD | `tool-crypto-chart.workflow.ts` | — | — | |
| Aura · Tool · Order Book | aura-tool | TRD | `tool-order-book.workflow.ts` | — | — | |
| Aura · Tool · Trade Flow | aura-tool | TRD | `tool-trade-flow.workflow.ts` | — | — | |
| Aura · Tool · Derivatives | aura-tool | TRD | `tool-derivatives.workflow.ts` | — | — | |
| Aura · Tool · Market Chart | aura-tool | TRD | `tool-market-chart.workflow.ts` | — | — | |
| Aura · Tool · Crypto Sentiment | aura-tool | TRD | `tool-crypto-sentiment.workflow.ts` | — | — | |
| Aura · Tool · Company Profile | aura-tool | HZN | `tool-company-profile.workflow.ts` | — | — | |
| Aura · Tool · Financials | aura-tool | HZN | `tool-financials.workflow.ts` | — | — | |
| Aura · Tool · Insider Activity | aura-tool | HZN | `tool-insider-activity.workflow.ts` | — | — | |
| Aura · Tool · Filings | aura-tool | HZN | `tool-filings.workflow.ts` | — | — | |
| Aura · Tool · Price History | aura-tool | HZN | `tool-price-history.workflow.ts` | — | — | |
| Aura · Tool · Crypto Fundamentals | aura-tool | HZN | `tool-crypto-fundamentals.workflow.ts` | — | — | |
| Aura · Tool · Quotes | aura-tool | PFL | `tool-quotes.workflow.ts` | — | — | Internal (used by Tool · Portfolio) |
| Aura · Tool · Portfolio | aura-tool | PFL | `tool-portfolio.workflow.ts` | — | — | Health score rubric |
| Aura · Tool · Macro Snapshot | aura-tool | PFL | `tool-macro-snapshot.workflow.ts` | — | — | |
| Aura · Tool · Macro Calendar | aura-tool | PFL | `tool-macro-calendar.workflow.ts` | — | — | FOMC constant: update yearly |
| Aura · Tool · Portfolio History | aura-tool | PFL | `tool-portfolio-history.workflow.ts` | — | — | |
| Aura · Job · Daily Portfolio Review | aura-job | PFL | `job-daily-portfolio-review.workflow.ts` | — | — | Schedule 06:30 UTC |
