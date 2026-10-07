# Agents

This folder is the source of truth for the four Aura agents. The n8n workflows `Aura · Agent · *` are built from it. The framework that applies to all agents is in [docs/08-agents.md](../docs/08-agents.md).

| Folder | Agent | Workspace | Owner session |
|---|---|---|---|
| [`main/`](main/SPEC.md) | Main | `main` (Main) | Platform & Main |
| [`trading/`](trading/SPEC.md) | Trading | `trading` (Trading) | Trading |
| [`horizon/`](horizon/SPEC.md) | Horizon | `horizon` (Horizon 2030) | Horizon 2030 |
| [`portfolio/`](portfolio/SPEC.md) | Portfolio | `portfolio` (Portfolio & Macro) | Portfolio & Macro |

## Files

| File | Content | Deployed? |
|---|---|---|
| `_shared/guardrail.md` | Scope rules and the exact refusal text | Yes: first part of every system prompt |
| `_shared/response-policy.md` | Data honesty, risk language, tool use, format, output fields | Yes: second part of every system prompt |
| `_shared/scope-classifier.md` | System prompt of the Haiku classifier in `Aura · System · Guardrail` | Yes: classifier only |
| `<agent>/system-prompt.md` | Role, workspace knowledge, tools, method, templates | Yes: third part of that agent's system prompt |
| `<agent>/SPEC.md` | Mission, tool contracts, data sources, eval cases, definition of done | No: human and AI documentation |

## Rules

- Files marked "Deployed" contain **prompt text only**, with no notes to humans. They are embedded verbatim into workflow source by `node n8n/scripts/embed-prompts.mjs`.
- The system prompt is static. Everything per-request (time, user profile, selection, history, message) goes into the user turn built by the "Build prompt" Code node ([docs/08-agents.md §3](../docs/08-agents.md#3-user-turn-assembly-build-prompt-code-node)). This keeps Anthropic prompt caching effective.
- Tool names in `system-prompt.md` must match the tool node names in the workflow exactly.
- After editing a deployed file: re-embed, update the agent workflow, re-run the eval cases, then publish.
