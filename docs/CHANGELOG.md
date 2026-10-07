# Contract changelog

This file records changes to the frozen contracts: API ([05](05-api-contracts.md)), database ([06](06-database.md) and migrations), agent I/O ([08](08-agents.md)) and workflow names ([registry](../n8n/registry.md)). Append only, newest first.

Entry format:

```
## YYYY-MM-DD: <short title>
- Change:
- Impact: (who must act, and how)
- PR:
```

## 2026-10-07: v1 contracts

- **Change:** Initial contracts:
  - API v1 (`/aura/v1/chat/message`, `/aura/v1/portfolio/snapshot`, Next.js routes);
  - schema `20261007000000_init.sql`;
  - `AgentInput` / `AgentOutput` and the tool envelope;
  - workflow catalog and naming.
- **Impact:** Baseline for all sessions.
- **PR:** Phase 0 docs PR (branch `claude/magical-ride-09t5ce`).
