# openclaude

`openclaude` is the open Claude-style harness used to embed Claude
models in self-hosted setups. It speaks MCP through the same config
shape as Claude Code.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Add to `~/.openclaude/config.json` (or your harness's MCP config
   file — paths vary by distribution):

   ```json
   {
     "mcpServers": {
       "nanotracker": {
         "command": "node",
         "args": ["/abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs"]
       }
     }
   }
   ```

4. Restart openclaude. The six tools become available.

## Smoke test

```
> nanotracker_health
> nanotracker_read op=getProjectSummary
```

## Notes

- The skill bundles in [`../.claude/skills/`](../.claude/skills/)
  apply unchanged — openclaude reads the same `.claude/skills/`
  layout Claude Code uses.
- See [`AGENTS.md`](../AGENTS.md) for cross-agent rules.
