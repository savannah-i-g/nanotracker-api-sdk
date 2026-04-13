# Continue

[Continue](https://continue.dev) is an open-source AI code assistant
for VS Code and JetBrains; it speaks MCP via its `mcpServers` config.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Open Continue's `config.yaml` (gear icon → Configure). Add to
   `mcpServers`:

   ```yaml
   mcpServers:
     - name: nanotracker
       command: node
       args:
         - /abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs
   ```

   Or, if you use the JSON config form, paste from
   [`mcp-config-snippet.json`](mcp-config-snippet.json).

4. Reload Continue. The six `nanotracker_*` tools become available
   to whichever model you have configured.

## Smoke test

```
@nanotracker_health
```

## Notes

- Continue supports both Claude and OpenAI models — same MCP server,
  same tools, regardless of provider.
