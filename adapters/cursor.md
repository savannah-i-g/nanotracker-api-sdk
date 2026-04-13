# Cursor

[Cursor](https://cursor.com) speaks MCP via its global MCP settings.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Open Cursor → `Settings` → `MCP` → `Add new server`. Use:

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

   Or paste the full snippet from
   [`mcp-config-snippet.json`](mcp-config-snippet.json).
4. Toggle the `nanotracker` entry on. The six tools should appear in
   the agent panel within a few seconds.

## Smoke test

In Composer or chat:

```
@nanotracker_health
@nanotracker_read op=getProjectSummary
```

## Notes

- Cursor doesn't currently load `.claude/skills/` — see
  [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md) at the
  repo root for the rules; they're written for any agent.
