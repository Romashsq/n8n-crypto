# Meta prompts

These are reusable prompts for working on the project with any LLM or coding agent. They are not deployed to n8n; the agent prompts in [`agents/`](../agents/README.md) are.

| File | Use it when |
|---|---|
| [`master-prompt.md`](master-prompt.md) | You need any LLM or agent to understand the whole project quickly: brainstorming, reviews, pitching, onboarding a new tool |
| [`business-model-prompt.md`](business-model-prompt.md) | Stress-testing pricing, unit economics, go-to-market and risks with an LLM acting as a SaaS strategist |
| [`build-system-prompt.md`](build-system-prompt.md) | System prompt for a coding assistant outside Claude Code that should build parts of Aura according to our architecture and contracts |
| [`ui-design-prompt.md`](ui-design-prompt.md) | Generating UI mockups (image models) or UI code (v0, Claude) that match the design system |
