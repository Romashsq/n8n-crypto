# n8n

n8n Cloud is the runtime for every Aura agent, tool, API webhook and scheduled job. This folder holds what we need to rebuild and review it from Git.

| Path | Content |
|---|---|
| [`registry.md`](registry.md) | Every Aura workflow: name, kind, owner, n8n ID, published state |
| [`workflows/`](workflows/README.md) | Workflow SDK source, one file per workflow |
| [`scripts/embed-prompts.mjs`](scripts/embed-prompts.mjs) | Embeds `agents/**.md` prompts into workflow sources |

How we build, name, test and publish workflows: [docs/07-n8n-playbook.md](../docs/07-n8n-playbook.md).
