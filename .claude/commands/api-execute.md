Run a batch of nanoTracker Local API commands.

Usage: `/api-execute <commandsJSON> [optsJSON]`

If `optsJSON` is omitted, a default `{ "undoDescription": "claude batch" }`
is used. Always pick a more specific description when you can.

Run via:

```bash
node tools/cli.mjs execute '$ARGUMENTS'
```

The CLI splits the arguments into commands and opts (the second JSON
blob). It reads `~/.nanotracker/relay-token` automatically.

Common pitfalls:

- Forgetting `opts.undoDescription` → `missingUndoDescription` error.
- Using order-list index instead of `patternId` → `notFound`. Resolve
  via `getPatternList` first.
- Mutating an empty pattern with thousands of `setCell` ops when one
  `setRange` would do.

See [`../skills/api-author-pattern/SKILL.md`](../skills/api-author-pattern/SKILL.md)
for the full command list and conventions.
