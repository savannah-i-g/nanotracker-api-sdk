# Cline

[Cline](https://github.com/cline/cline) (formerly Claude Dev) is a
VS Code extension that speaks MCP.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Open VS Code → Cline panel → `MCP Servers` → `Edit MCP Settings`.
   Add:

   ```json
   {
     "mcpServers": {
       "nanotracker": {
         "command": "node",
         "args": ["/abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs"],
         "disabled": false,
         "autoApprove": ["nanotracker_health", "nanotracker_read"]
       }
     }
   }
   ```

   `autoApprove` is optional — listing the read-only tools there
   skips the per-call confirmation. Keep `nanotracker_execute` and
   `nanotracker_assets_*` requiring approval.

4. Cline picks up the change immediately (no restart).

## Smoke test

Ask Cline:

```
Use nanotracker_health, then read the project summary.
```

## Notes

- See [`AGENTS.md`](../AGENTS.md) for the cross-agent rules — Cline
  doesn't yet auto-load `.claude/skills/`, but the same content
  applies.
