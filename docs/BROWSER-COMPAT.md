# Browser compatibility

The page tries WebSocket to `ws://localhost:9311/page` first. If that
fails it transparently falls back to HTTP long-poll. Both transports
speak the same JSON shape; external callers see no difference.

## Why this is fragile in some browsers

The page is served from `https://federatedindustrial.com/tracker`,
but the relay listens on plain `http`/`ws` at `127.0.0.1`. Most
browsers permit this because `localhost` is treated as a "potentially
trustworthy origin" — the W3C spec carves it out from mixed-content
restrictions. A few stricter modes block it; that's where the
fallback matters.

## Compatibility matrix

| Browser            | `ws://localhost` from HTTPS | `fetch http://localhost` from HTTPS | Notes                                 |
|--------------------|-----------------------------|--------------------------------------|----------------------------------------|
| Chrome 120+        | ✅                           | ✅                                    | Default Private Network Access permits both. |
| Edge 120+          | ✅                           | ✅                                    | Same engine as Chrome.                 |
| Firefox 84+        | ✅                           | ✅                                    | "Insecure" upgrades disabled by default. |
| Firefox (strict mixed-content) | ❌            | ✅                                    | Long-poll path takes over automatically. |
| Safari 15+         | ✅                           | ✅                                    |                                        |
| Safari 14 or older | ⚠️                           | ⚠️                                    | Untested; long-poll is more likely to work. |
| Brave              | ✅                           | ✅                                    | Default. Strict shield modes may block — disable shields for the tracker tab. |
| Mobile Chrome / Safari | ✅ (recent)              | ✅ (recent)                           | Practical use case is rare.            |

A `localhost` exception in Chrome was permanent as of M94+; PNA
relaxations for localhost ship in stable. Firefox 84+ relaxed the
rule for loopback; the only real breakage is when the user has hard
strict-mixed-content turned on.

## Detecting which transport is in use

The status pill in **FILE > API…** displays one of:

- `ACTIVE · ws`         — primary path, WS open
- `ACTIVE · long-poll`  — fallback, fetch loop running
- `BACKUP · …`          — another tab is active
- `CONNECTING · …`      — first connect, retrying
- `ERROR · …`           — surfaced last error in the banner below

The relay's `/v1/health` also returns `transport: "ws" | "long-poll" | null`.

## Performance

The WS path adds nothing measurable per request (~1 ms loopback RTT).
The long-poll path adds one extra RTT per request (one to deliver the
command, one for the page to post the reply). For batched edits this
is invisible; for chatty subscribe-style polling it's noticeable but
fine.

## Troubleshooting

If you see `transport: long-poll` and didn't expect to:

- A browser extension may be intercepting localhost requests. Disable
  ad blockers / privacy extensions for the tracker tab.
- You may have launched Chrome with `--block-mixed-content` or
  similar. Drop the flag.
- Some corporate proxies intercept `localhost` — uncommon, but check
  if you're behind one.

If both fail (`ERROR · none`):

- Confirm the relay is running: `node tools/cli.mjs health`.
- Confirm the URL in the API window matches the relay's port.
- Check the relay's stdout for connection attempts; the JSON log
  includes the remote address.

## Beyond v1

If real-world Firefox use shows long-poll isn't enough, a future
version will ship an opt-in `wss://` mode using a self-signed cert
the user trusts once. Not in v1 because long-poll covers every case
we've observed.
