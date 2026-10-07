# Workflow sources

Each n8n workflow has one source file here, written with the **n8n Workflow SDK**. It is the same code passed to `create_workflow_from_code` or `update_workflow` through the n8n MCP server. File names are listed in [`../registry.md`](../registry.md).

## Rules

1. **Call `get_workflow_sdk_reference` first.** Do not guess SDK syntax or node parameters. Use `get_node_types` for every node.
2. **One workflow per file**, named `<kind>-<name-kebab>.workflow.ts`.
3. **No secrets.** Reference credentials by the IDs returned by `list_credentials`.
4. **Prompts are embedded, never pasted.** Use `/* @embed <repo path> */ ""` markers and run `node n8n/scripts/embed-prompts.mjs` before deploying. `--check` must pass before a PR.
5. **Workflow IDs of called sub-workflows** come from `../registry.md`. When you change a reference, update both.
6. **Commit in the same work block** as the n8n change, so Git always matches what runs.

## Skeleton of an agent workflow (illustrative; confirm every node and parameter against the SDK reference)

```ts
// Aura · Agent · Trading. Built per docs/08-agents.md and agents/trading/SPEC.md
const SYSTEM_PROMPT = [
  /* @embed agents/_shared/guardrail.md */ "",
  /* @embed agents/_shared/response-policy.md */ "",
  /* @embed agents/trading/system-prompt.md */ "",
].join('\n\n');

// 1. Execute Workflow Trigger with the AgentInput fields (docs/05-api-contracts.md §6)
// 2. Code "Build prompt": session block + history + message (docs/08-agents.md §3)
// 3. AI Agent: promptType 'define', text = built prompt, options.systemMessage = SYSTEM_PROMPT,
//    maxIterations 8, returnIntermediateSteps true, hasOutputParser true
//    ├─ Anthropic Chat Model: claude-sonnet-5-5, maxTokensToSample 4096, promptCaching '5m'
//    ├─ Tools: Call n8n Workflow Tool nodes → Aura · Tool · * (IDs from the registry),
//    │         Brave Search Tool (news), Calculator
//    └─ Structured Output Parser: JSON Schema from docs/08-agents.md §5
// 4. Code "Normalize output" → AgentOutput
```
