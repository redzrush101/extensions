# Side-by-Side Diff Extension

A beautiful, high-performance split-diff renderer for Pi's `edit` tool.

## Features
- **Side-by-side view**: Compare old and new code easily.
- **Syntax highlighting**: Full support for all languages.
- **Word-level diffs**: Highlights specific word changes for better readability.
- **Change stats**: Real-time breakdown of added, removed, and changed lines.
- **File headers**: Clear display of the file path.
- **Highly configurable**: Adjustable row limits and display options.

## Quick Start
1. Copy this folder to your Pi extensions directory: `cp -r extensions/diff ~/.pi/agent/extensions/`
2. Enable it in Pi: `pi -e ~/.pi/agent/extensions/diff`

## Configuration
Edit `index.ts` to customize `CONFIG`:
- `maxRows`: Max lines to display (default: 200)
- `showWordDiff`: Toggle word-level highlighting (default: true)
- `showFilePath`: Toggle file path header (default: true)

## Credits
Originally based on [nielpattin/dotfiles](https://github.com/nielpattin/dotfiles).
Enhanced by Pi Coding Agent and redzrush101.

## License
GPLv3. See [LICENSE](../../LICENSE) for more details.

