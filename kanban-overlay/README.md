# kanban-overlay

A lightweight Kanban board extension for Pi.

It gives the model a tool to maintain a live task board, and shows live Kanban progress in the model's working area while the agent is running.

## Features

- `update_tasks` tool (for the agent)
- `/kanban` command (for you) to open a full board view
- Persistent board reconstruction from session history (branch-aware)
- Live working-status updates (`setWorkingMessage`) while the agent is running
- No persistent on-screen widget when idle

## Tool: `update_tasks`

Parameters:

- `mode`: `replace` | `append` | `clear` | `list`
  - default: `replace`
- `todo?: string[]`
- `in_progress?: string[]`
- `done?: string[]`

### Typical usage

Set all three columns:

```json
{
  "mode": "replace",
  "todo": ["Add API route", "Write tests"],
  "in_progress": ["Refactor auth middleware"],
  "done": ["Reproduce bug"]
}
```

Append new items:

```json
{
  "mode": "append",
  "todo": ["Update README"]
}
```

Clear board:

```json
{ "mode": "clear" }
```

List current board:

```json
{ "mode": "list" }
```

## Command

- `/kanban` → opens a full board panel (press Enter/Escape to close)

## Load

```bash
pi -e /path/to/extensions/kanban-overlay/index.ts
```

Or place under your discovered extension paths and run `/reload`.
