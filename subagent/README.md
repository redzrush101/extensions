# subagent

Run specialized subagents in isolated `pi` subprocesses.

## What it does

- Delegates work to named agents (`explorer`, `planner`, `implementer`, `reviewer`)
- Supports `single`, `parallel`, and `chain` execution
- Passes handoff context in chains via `{previous}`
- Injects discovered agent names/descriptions into the parent system prompt

## Current workflow

This repo is configured for one orchestrator prompt:

- `/orch <goal>` → `explorer → planner → implementer → reviewer → implementer`

## Files

- `index.ts` — subagent tool + orchestration runtime
- `agents.ts` — agent discovery (`~/.pi/agent/agents` and optional `.pi/agents`)
- `agents/*.md` — agent definitions
- `prompts/orch.md` — 5-step orchestrator template

## Agent format

```md
---
name: explorer
description: Codebase exploration specialist
tools: read, grep, find, ls, bash
model: optional-model-id
---

System prompt body...
```

Required frontmatter: `name`, `description`.

## Security

Default scope is user agents only. Project agents are loaded only with `agentScope: "project"` or `"both"`.

If project agents are used interactively, confirmation is requested by default.

## Notes

- Chain handoff uses the **previous step's final text output** (not full history).
- Parallel mode max: 8 tasks (4 concurrent).
