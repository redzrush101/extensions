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
task_access: read # one of: none | read | write (default: read)
---

System prompt body...
```

Required frontmatter: `name`, `description`.

Task board permissions are controlled per agent via `task_access`:

- `none` - subagent cannot view parent task board snapshot
- `read` - subagent receives parent task board snapshot (default)
- `write` - subagent receives snapshot and is allowed to update tasks

`write` is opt-in and disabled by default.

## Security

Default scope is user agents only. Project agents are loaded only with `agentScope: "project"` or `"both"`.

If project agents are used interactively, confirmation is requested by default.

## Notes

- Chain handoff uses the **previous step's final text output** (not full history).
- Parallel mode max: 8 tasks (4 concurrent).
