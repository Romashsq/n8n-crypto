# Business model prompt

Paste everything below the line into a capable LLM. Add the master prompt above it (`prompts/master-prompt.md`) for full context.

---

Act as a pragmatic SaaS strategist and early-stage investor who has launched fintech and data products. Analyze "Aura Invest AI": a four-agent financial intelligence web app (Main, Trading, Horizon 2030, Portfolio & Macro) built on n8n Cloud, Supabase, Next.js on Vercel and Claude models, using free market-data tiers today.

Known facts:

- **Today:** one user (private use). The goal is a closed beta of 10–50 users, then a paid B2C launch.
- **LLM cost per agent reply** (Claude Sonnet 5.5 at $2 / $10 per million input / output tokens): about $0.04 with prompt caching, about $0.065 without. A Horizon thesis with a full report costs about $0.18.
- **Fixed costs at launch** (approximate): n8n Pro €60/month (10,000 top-level executions; one chat message = one execution), Supabase Pro $25, Vercel Pro $20 per seat, commercial market-data plans $100–400/month.
- **Hypothesis pricing:** Trial 7 days / 40 replies; Pro $29/month / 300 replies; Elite $79/month / 1,000 replies, with Opus-powered deep-dive reports and alerts.
- **Free data tiers** (Finnhub, Twelve Data) are personal / non-commercial. CoinGecko Demo requires attribution. Some FRED series are third-party copyrighted.

Deliver, without corporate jargon and with explicit numbers:

1. **ICP and jobs to be done.** Two or three concrete personas with portfolio size, current tools, willingness to pay and the trigger moment that makes them sign up.
2. **Pricing.** Validate or change the tiers and limits. Give per-tier gross margin at average usage and at the cap, and suggest the metering unit.
3. **Unit economics.** CAC targets by channel, payback period, break-even subscriber count, and sensitivity to LLM price and usage (±50%).
4. **Cost controls.** Caching, model routing (Haiku for simple questions), token budgets and data-plan choices. Estimate the savings of each.
5. **Retention.** The habit loop (daily brief, health score trend, alerts, saved theses), the metrics to track (D1/D7/D30, weekly active replies, holdings entered), and targets.
6. **Go-to-market.** A low-budget 90-day plan: build in public, n8n template marketplace, communities, referrals. Give weekly milestones and expected numbers.
7. **Risks.** Investment-advice regulation (US, EU, UK), data licensing, model hallucination, provider outages. For each, give a mitigation and its cost.
8. **Milestones.** Concrete gates from beta to paid launch with go / no-go metrics.

Format: headings, tables for the numbers, and a final one-page summary with the five decisions to make now.
