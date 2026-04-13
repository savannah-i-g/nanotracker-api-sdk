#!/usr/bin/env node
/* nanoTracker API SDK — MCP server
 * Stdio Model Context Protocol server. Exposes the relay's HTTP
 * endpoints as MCP tools so any MCP-aware agent (Claude Code, Cursor,
 * Cline, Continue, Codex, opencode, openclaude, Aider, Gemini CLI, …)
 * can drive nanoTracker without bespoke glue.
 *
 * Reads:
 *   NANOTRACKER_RELAY  (default http://127.0.0.1:9311)
 *   NANOTRACKER_TOKEN  (default $HOME/.nanotracker/relay-token)
 *
 * Each tool returns the raw JSON the relay returned, so error codes
 * are identical between the CLI and MCP paths.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── Config ──────────────────────────────────────────────────────────────────

const RELAY = process.env.NANOTRACKER_RELAY ?? "http://127.0.0.1:9311";
const TOKEN_PATH = process.env.NANOTRACKER_TOKEN_PATH ??
  path.join(os.homedir(), ".nanotracker", "relay-token");

function loadToken() {
  if (process.env.NANOTRACKER_TOKEN) return process.env.NANOTRACKER_TOKEN.trim();
  try { return fs.readFileSync(TOKEN_PATH, "utf8").trim(); }
  catch { return null; }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function relayCall(pathname, body) {
  const token = loadToken();
  const headers = { "content-type": "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(RELAY + pathname, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { ok: false, errors: [{ index: -1, code: "internal", message: `non-json from relay: ${text.slice(0, 200)}` }] }; }
  return { httpStatus: res.status, body: json };
}

function asResult(out) {
  return {
    content: [{ type: "text", text: JSON.stringify(out.body, null, 2) }],
    isError: !out.body || out.body.ok === false,
  };
}

// ── Tool registry ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "nanotracker_health",
    description:
      "Check whether the relay is up and a nanoTracker tab is connected. " +
      "Always call this first if you're not sure the user has the relay running and the API enabled. " +
      "Returns { pageConnected, transport, activeTabId, tabCount }.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => asResult(await relayCall("/v1/health")),
  },
  {
    name: "nanotracker_read",
    description:
      "Run a read-only query against the live nanoTracker session. " +
      "Cheap, no undo. Common ops: getProjectSummary, getPatternList, getPattern, getRange, " +
      "getOrderList, getSamples, getInstrumentTable, getSeqLayer, getSeqLayerList, getSchema. " +
      "Pass the op + any extra fields the op needs (e.g. patternId for getPattern).",
    inputSchema: {
      type: "object",
      properties: {
        op: { type: "string", description: "Query op name (see getSchema for the full list)." },
        patternId:  { type: "number", description: "TrackerPattern.id (for getPattern, getRange, getSeqLayer, getSeqLayerList)." },
        rowStart:   { type: "number" },
        rowEnd:     { type: "number" },
        channels:   { type: "array", items: { type: "number" } },
        channel:    { type: "number" },
        layerIndex: { type: "number" },
      },
      required: ["op"],
      additionalProperties: false,
    },
    handler: async (args) => asResult(await relayCall("/v1/read", args)),
  },
  {
    name: "nanotracker_execute",
    description:
      "Apply a batch of mutations atomically (validate-all, then apply-or-reject-all). " +
      "Every batch produces ONE undo entry. opts.undoDescription is REQUIRED unless dryRun. " +
      "Use opts.dryRun:true to preview without mutating. " +
      "Run nanotracker_read with op=getSchema for the full command list and field shapes.",
    inputSchema: {
      type: "object",
      properties: {
        commands: {
          type: "array",
          description: "Array of LocalApiCommand objects. Each has an `op` field plus op-specific fields.",
          items: { type: "object" },
        },
        opts: {
          type: "object",
          description: "Required fields: undoDescription (string) unless dryRun is true.",
          properties: {
            undoDescription: { type: "string" },
            dryRun:          { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      required: ["commands"],
      additionalProperties: false,
    },
    handler: async (args) => asResult(await relayCall("/v1/execute", args)),
  },
  {
    name: "nanotracker_assets_list",
    description:
      "List audio files in <project>/samples. Project-only — returns " +
      "{ ok:false, errors:[{code:'noProject'}] } if no project is open. " +
      "Tell the user to open a project via PROJECT > EXPLORER if you see noProject.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => asResult(await relayCall("/v1/assets", { method: "list" })),
  },
  {
    name: "nanotracker_assets_load",
    description:
      "Load <project>/samples/<fileName> into instrument slot N (1..31). " +
      "Decodes the file and registers it; the user can then trigger it from pattern cells. " +
      "Combine with nanotracker_execute setSampleStretchRatio or conformSampleToRows to fit it to a bar.",
    inputSchema: {
      type: "object",
      properties: {
        slot:     { type: "number", minimum: 1, maximum: 31 },
        fileName: { type: "string", description: "File name within <project>/samples/. Use nanotracker_assets_list first." },
      },
      required: ["slot", "fileName"],
      additionalProperties: false,
    },
    handler: async (args) => asResult(await relayCall("/v1/assets", { method: "load", args })),
  },
  {
    name: "nanotracker_assets_unload",
    description: "Clear an instrument slot (frees the audio engine voice and removes the sample).",
    inputSchema: {
      type: "object",
      properties: { slot: { type: "number", minimum: 1, maximum: 31 } },
      required: ["slot"],
      additionalProperties: false,
    },
    handler: async (args) => asResult(await relayCall("/v1/assets", { method: "unload", args })),
  },
];

// ── Wire up MCP server ──────────────────────────────────────────────────────

const server = new Server(
  { name: "nanotracker-api-sdk", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find(t => t.name === req.params.name);
  if (!tool) {
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: false, errors: [{ index: -1, code: "invalidOp", message: `unknown tool ${req.params.name}` }] }) }],
      isError: true,
    };
  }
  try {
    return await tool.handler(req.params.arguments ?? {});
  } catch (e) {
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: false, errors: [{ index: -1, code: "internal", message: e instanceof Error ? e.message : String(e) }] }) }],
      isError: true,
    };
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
