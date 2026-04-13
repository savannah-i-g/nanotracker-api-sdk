#!/usr/bin/env node
/* nanoTracker Local API relay
 * Bridges external HTTP callers (Claude over `curl`, MCP tools, scripts)
 * to a nanoTracker browser tab via WebSocket. Loopback bind only; bearer
 * token required on every authenticated endpoint.
 *
 * Usage: node tools/local-api-relay.mjs [--port 9311]
 */

import http from "node:http";
import { WebSocketServer } from "ws";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const PORT = parseInt(flag("--port", "9311"), 10);
const BIND = "127.0.0.1";

// ── Logging ─────────────────────────────────────────────────────────────────

function log(level, msg, extra = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra });
  process.stdout.write(line + "\n");
}

// ── Token ───────────────────────────────────────────────────────────────────

const TOKEN_DIR  = path.join(os.homedir(), ".nanotracker");
const TOKEN_PATH = path.join(TOKEN_DIR, "relay-token");

function loadOrCreateToken() {
  fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  if (fs.existsSync(TOKEN_PATH)) {
    const tok = fs.readFileSync(TOKEN_PATH, "utf8").trim();
    if (tok.length >= 32) return tok;
  }
  const tok = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(TOKEN_PATH, tok + "\n", { mode: 0o600 });
  log("info", "generated new relay token", { path: TOKEN_PATH });
  return tok;
}

const TOKEN = loadOrCreateToken();

function authOk(headerOrQueryToken) {
  if (!headerOrQueryToken) return false;
  // constant-time compare
  const a = Buffer.from(headerOrQueryToken);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function bearerFromHeader(req) {
  const h = req.headers["authorization"];
  if (typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// ── Tab registry ────────────────────────────────────────────────────────────

/** @type {Array<{ tabId: string, ws?: import('ws').WebSocket, role: 'active'|'backup', queue: Map<string, (result: unknown) => void>, transport: 'ws'|'long-poll' }>} */
const tabs = [];

function activeTab() {
  return tabs.find(t => t.role === "active") ?? null;
}

function promoteIfNeeded() {
  if (activeTab()) return;
  const next = tabs.find(t => t.role === "backup");
  if (!next) return;
  next.role = "active";
  log("info", "promoted backup to active", { tabId: next.tabId });
  if (next.ws && next.ws.readyState === 1) {
    next.ws.send(JSON.stringify({ type: "role", role: "active" }));
  }
}

function removeTab(tab, reason) {
  const i = tabs.indexOf(tab);
  if (i >= 0) tabs.splice(i, 1);
  for (const cb of tab.queue.values()) {
    cb({ ok: false, errors: [{ index: -1, code: "internal", message: `tab disconnected: ${reason}` }] });
  }
  tab.queue.clear();
  log("info", "tab removed", { tabId: tab.tabId, reason });
  promoteIfNeeded();
}

// ── Long-poll wait queues ───────────────────────────────────────────────────

/** Pending requests waiting for the next /poll call from a long-poll tab. */
const longPollQueues = new Map(); // tabId -> Array<{ frame, deadline }>
/** Suspended /poll responses waiting for a request. */
const longPollWaiters = new Map(); // tabId -> Array<{ res, timer }>

function deliverToLongPoll(tabId, frame) {
  const waiters = longPollWaiters.get(tabId);
  if (waiters && waiters.length > 0) {
    const w = waiters.shift();
    clearTimeout(w.timer);
    w.res.writeHead(200, { "content-type": "application/json" });
    w.res.end(JSON.stringify(frame));
    return true;
  }
  const q = longPollQueues.get(tabId) ?? [];
  q.push({ frame, deadline: Date.now() + 30_000 });
  longPollQueues.set(tabId, q);
  return false;
}

// ── WebSocket /page ─────────────────────────────────────────────────────────

const server = http.createServer(handleHttp);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith("/page")) {
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws, req) => {
  let tab = null;
  let helloTimer = setTimeout(() => {
    if (!tab) {
      try { ws.close(4400, "no hello"); } catch { /* ignore */ }
    }
  }, 5000);

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "hello") {
      clearTimeout(helloTimer);
      if (!authOk(msg.token)) {
        log("warn", "ws auth failed", { remote: req.socket.remoteAddress });
        try { ws.send(JSON.stringify({ type: "error", code: "auth", message: "invalid token" })); } catch { /* ignore */ }
        try { ws.close(4401, "auth"); } catch { /* ignore */ }
        return;
      }
      const tabId = String(msg.tabId || crypto.randomUUID()).slice(0, 64);
      const role = activeTab() ? "backup" : "active";
      tab = { tabId, ws, role, queue: new Map(), transport: "ws" };
      tabs.push(tab);
      log("info", "tab connected (ws)", { tabId, role });
      ws.send(JSON.stringify({ type: "welcome", role }));
      return;
    }
    if (!tab) return;

    if (msg.type === "pong") return;
    if (msg.type === "reply") {
      const cb = tab.queue.get(msg.requestId);
      if (cb) {
        tab.queue.delete(msg.requestId);
        cb(msg.result);
      }
      return;
    }
  });

  ws.on("close", () => {
    if (tab) removeTab(tab, "ws closed");
    else clearTimeout(helloTimer);
  });
  ws.on("error", (e) => log("warn", "ws error", { error: String(e) }));
});

// Heartbeat
setInterval(() => {
  for (const t of tabs) {
    if (t.transport === "ws" && t.ws && t.ws.readyState === 1) {
      try { t.ws.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
    }
  }
  // Reap stale long-poll queues
  for (const [tabId, q] of longPollQueues) {
    const fresh = q.filter(x => x.deadline > Date.now());
    if (fresh.length === 0) longPollQueues.delete(tabId);
    else longPollQueues.set(tabId, fresh);
  }
}, 15_000);

// ── HTTP ────────────────────────────────────────────────────────────────────

async function handleHttp(req, res) {
  // Loopback only — defence in depth (we already bind 127.0.0.1).
  const remote = req.socket.remoteAddress;
  if (remote && remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
    res.writeHead(403); return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/v1/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      pageConnected: !!activeTab(),
      activeTabId: activeTab()?.tabId ?? null,
      tabCount: tabs.length,
      transport: activeTab()?.transport ?? null,
    }));
  }

  // Long-poll endpoints — token in query (page can't easily set headers on a streaming fetch).
  if (req.method === "GET" && url.pathname === "/poll") {
    const tok = url.searchParams.get("token");
    const tabId = url.searchParams.get("tabId") || "";
    if (!authOk(tok)) { res.writeHead(401); return res.end(); }

    // Register / refresh tab as long-poll
    let tab = tabs.find(t => t.tabId === tabId);
    if (!tab) {
      const role = activeTab() ? "backup" : "active";
      tab = { tabId, role, queue: new Map(), transport: "long-poll" };
      tabs.push(tab);
      log("info", "tab connected (long-poll)", { tabId, role });
    } else {
      tab.transport = "long-poll";
    }

    // If something is queued, deliver immediately
    const q = longPollQueues.get(tabId);
    if (q && q.length > 0) {
      const next = q.shift();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(next.frame));
    }
    // Otherwise wait
    const waiters = longPollWaiters.get(tabId) ?? [];
    const timer = setTimeout(() => {
      const idx = (longPollWaiters.get(tabId) || []).indexOf(entry);
      if (idx >= 0) (longPollWaiters.get(tabId) || []).splice(idx, 1);
      res.writeHead(204);
      res.end();
    }, 25_000);
    const entry = { res, timer };
    waiters.push(entry);
    longPollWaiters.set(tabId, waiters);
    req.on("close", () => {
      clearTimeout(timer);
      const arr = longPollWaiters.get(tabId);
      if (arr) {
        const i = arr.indexOf(entry);
        if (i >= 0) arr.splice(i, 1);
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/reply") {
    const tok = bearerFromHeader(req);
    if (!authOk(tok)) { res.writeHead(401); return res.end(); }
    const body = await readJson(req);
    if (!body || !body.requestId) { res.writeHead(400); return res.end(); }
    // Find tab that has this requestId pending
    for (const t of tabs) {
      const cb = t.queue.get(body.requestId);
      if (cb) {
        t.queue.delete(body.requestId);
        cb(body.result);
        res.writeHead(204); return res.end();
      }
    }
    res.writeHead(404); return res.end();
  }

  // External-caller endpoints
  if (req.method === "POST" && (url.pathname === "/v1/execute" || url.pathname === "/v1/read" || url.pathname === "/v1/assets")) {
    const tok = bearerFromHeader(req);
    if (!authOk(tok)) { res.writeHead(401); return res.end(); }
    const body = await readJson(req);
    if (!body) { res.writeHead(400); return res.end(); }
    const tab = activeTab();
    if (!tab) {
      res.writeHead(503, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, errors: [{ index: -1, code: "internal", message: "no nanoTracker tab connected" }] }));
    }
    const requestId = crypto.randomUUID();
    const kind = url.pathname === "/v1/execute" ? "execute" : url.pathname === "/v1/read" ? "read" : "assets";
    const frame = { type: "request", requestId, kind, payload: body };
    const replyPromise = new Promise((resolve) => {
      tab.queue.set(requestId, resolve);
    });
    if (tab.transport === "ws" && tab.ws && tab.ws.readyState === 1) {
      try { tab.ws.send(JSON.stringify(frame)); }
      catch (e) { tab.queue.delete(requestId); res.writeHead(502); return res.end(JSON.stringify({ ok: false, errors: [{ index: -1, code: "internal", message: String(e) }] })); }
    } else {
      const delivered = deliverToLongPoll(tab.tabId, frame);
      if (!delivered) { /* queued for next /poll */ }
    }
    const timeout = new Promise(resolve => setTimeout(() => resolve({ ok: false, errors: [{ index: -1, code: "internal", message: "request timeout" }] }), 10_000));
    const result = await Promise.race([replyPromise, timeout]);
    if (!tab.queue.has(requestId)) {
      // delivered
    } else {
      tab.queue.delete(requestId);
    }
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  res.writeHead(404); res.end();
}

function readJson(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", c => { buf += c; if (buf.length > 1_048_576) { req.destroy(); resolve(null); } });
    req.on("end", () => { try { resolve(JSON.parse(buf || "{}")); } catch { resolve(null); } });
    req.on("error", () => resolve(null));
  });
}

// ── Start ───────────────────────────────────────────────────────────────────

server.listen(PORT, BIND, () => {
  log("info", "relay listening", { url: `http://${BIND}:${PORT}`, tokenPath: TOKEN_PATH });
  process.stderr.write(`\nnanoTracker Local API relay listening on ${BIND}:${PORT}\n`);
  process.stderr.write(`token at: ${TOKEN_PATH}\n`);
  process.stderr.write(`copy this into the API window:\n  ${TOKEN}\n\n`);
});

function shutdown(sig) {
  log("info", "shutdown", { signal: sig });
  for (const t of tabs) {
    if (t.ws) try { t.ws.close(1001, "server shutdown"); } catch { /* ignore */ }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
