# opencode

[opencode](https://opencode.ai) is an open-source AI coding agent for
the terminal; it speaks MCP via `~/.config/opencode/config.json`.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Edit `~/.config/opencode/config.json`:

   ```json
   {
     "mcp": {
       "nanotracker": {
         "type": "local",
         "command": ["node", "/abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs"]
       }
     }
   }
   ```

4. Restart opencode. The six tools register and become callable.

## Smoke test

```
> /tools nanotracker_health
> use nanotracker_read with op getProjectSummary
```

## Notes

- opencode runs whichever model you've configured (Claude, OpenAI,
  Gemini, local Ollama, …) — same MCP server, same tools.
- See [`AGENTS.md`](../AGENTS.md) for cross-agent rules.
