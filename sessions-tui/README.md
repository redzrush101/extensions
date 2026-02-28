# sessions-tui

Adds a `/sessions` command to open pi's built-in TUI session picker and switch sessions in the current running agent.

## Usage

- Type `/sessions` inside interactive pi.
- The picker starts with sessions for the current directory.
- Select a session to switch immediately via `ctx.switchSession`.
- Cancel or selecting the current session is handled as a no-op with user feedback.

## Load the extension

Use one of these approaches:

- One-off CLI:

```bash
pi -e /path/to/extensions/sessions-tui/index.ts
```

- Or add it to your extension paths in pi config/manifest and reload with `/reload`.

## Notes

- In non-UI contexts, the command exits safely and prints an informative warning.
