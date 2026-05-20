# Chat Search

Generate a searchable HTML chat history page from Claude Code session `.jsonl` files.

- Zero dependencies
- Keyword search with highlighting
- Date-based filtering
- Paginated rendering (30 messages per page)
- Dark mode support
- Works on mobile browsers

## Usage

```bash
node generate.js <sessions-dir> [output-file]

# Example
node generate.js ~/.claude/projects/-my-project chat.html
```

Then open `chat.html` in any browser.

## How it works

Reads all `*.jsonl` session files from the given directory, extracts `user` and `assistant` messages, and embeds them into a self-contained HTML page with client-side search.

## License

MIT
