#!/usr/bin/env node
// Embeds prompt files from the repo into n8n Workflow SDK sources.
//
// Marker format inside n8n/workflows/*.ts (the string literal after the marker gets replaced):
//   const SYSTEM_PROMPT = [
//     /* @embed agents/_shared/guardrail.md */ "",
//     /* @embed agents/trading/system-prompt.md */ "",
//   ].join('\n\n');
//
// Usage:
//   node n8n/scripts/embed-prompts.mjs          rewrite stale embeds in place
//   node n8n/scripts/embed-prompts.mjs --check  exit 1 if any embed is stale (no writes)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflowsDir = join(repoRoot, 'n8n', 'workflows');
const checkOnly = process.argv.includes('--check');
const marker = /(\/\*\s*@embed\s+([^\s*]+)\s*\*\/\s*)("(?:[^"\\\n]|\\.)*")/g;

let stale = 0;
let missing = 0;

for (const file of readdirSync(workflowsDir).filter((name) => name.endsWith('.ts'))) {
  const path = join(workflowsDir, file);
  const source = readFileSync(path, 'utf8');
  const updated = source.replace(marker, (whole, prefix, promptPath) => {
    const absolute = join(repoRoot, promptPath);
    if (!existsSync(absolute)) {
      console.error(`${file}: embedded file not found: ${promptPath}`);
      missing += 1;
      return whole;
    }
    return prefix + JSON.stringify(readFileSync(absolute, 'utf8').trimEnd());
  });

  if (updated === source) continue;
  stale += 1;
  if (checkOnly) {
    console.error(`stale: ${relative(repoRoot, path)}`);
  } else {
    writeFileSync(path, updated);
    console.log(`embedded: ${relative(repoRoot, path)}`);
  }
}

if (missing > 0 || (checkOnly && stale > 0)) process.exit(1);
if (!checkOnly && stale === 0) console.log('all embeds up to date');
