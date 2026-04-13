Check that the relay is up and the nanoTracker tab is connected.

Run via:

```bash
node tools/cli.mjs health
```

Returns:

```jsonc
{
  "pageConnected": true,
  "activeTabId":   "...",
  "tabCount":      1,
  "transport":     "ws"
}
```

If `pageConnected` is `false`, the user needs to:

1. Open the nanoTracker tab at <https://federatedindustrial.com/tracker>.
2. Open **FILE > API…** and toggle **Enable Local API**.
3. Toggle **Connect to local relay** and paste the token from
   `~/.nanotracker/relay-token`.

If `transport` is `long-poll`, that's fine — the page fell back from
WebSocket to HTTP polling. Both transports work; long-poll is just a
hair slower.
