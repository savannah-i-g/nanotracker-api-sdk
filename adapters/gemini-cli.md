# Gemini CLI

[Gemini CLI](https://github.com/google-gemini/gemini-cli) speaks MCP
via `~/.gemini/config.json`.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Edit `~/.gemini/config.json`:

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

   Or paste from [`mcp-config-snippet.json`](mcp-config-snippet.json).

4. Start a session:

   ```sh
   gemini
   ```

   The six tools register on connect.

## Smoke test

```
gemini> use nanotracker_health
gemini> read project summary via nanotracker_read
```

## Notes

- See [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md) at
  the repo root — both are written for any agent.
