/* nanoTracker Local API — schema mirror
 * Hand-mirrored from the page-side schema. Refer to PROTOCOL.md for the
 * authoritative narrative reference; this file is the structured form
 * useful for tooling (validators, code generators, completion).
 *
 * Re-mirror when the live API surface changes; see CHANGELOG.md.
 */

export const LOCAL_API_VERSION = "1.0";

export const LOCAL_API_LIMITS = {
  maxCommandsPerBatch:   10000,
  maxPatternsCreated:    64,
  maxPayloadBytes:       1048576,
  maxBatchesPerSecond:   20,
};

const PATTERN_ID = { name: "patternId", type: "number", description: "TrackerPattern.id (not an order-list index)" };
const ROW        = { name: "row",       type: "number", description: "row index within pattern (0-based)" };
const CHANNEL    = { name: "channel",   type: "number", description: "channel index (0..project.channels-1)" };

export const LOCAL_API_SCHEMA = {
  version: LOCAL_API_VERSION,
  limits: LOCAL_API_LIMITS,
  commands: [
    { op: "setCell",     summary: "Merge a partial cell onto the cell at (pattern, row, channel). Undefined fields preserve existing values.", fields: [PATTERN_ID, ROW, CHANNEL, { name: "cell", type: "Partial<TrackerCell>", description: "note (1-96 | 97 noteoff), instrument (1-31), volume (0-64 | 0xFF), effect, effectParam, boundIndex" }] },
    { op: "clearCell",   summary: "Reset the cell at (pattern, row, channel) to an empty cell.", fields: [PATTERN_ID, ROW, CHANNEL] },
    { op: "setRange",    summary: "Merge a 2D cell grid onto a rectangle of the pattern. cells[rowOffset][channelIdx] applies to row rowStart+rowOffset, channel channels[channelIdx].", fields: [PATTERN_ID, { name: "rowStart", type: "number" }, { name: "channels", type: "number[]" }, { name: "cells", type: "Partial<TrackerCell>[][]" }] },
    { op: "insertRow",   summary: "Insert `count` empty rows at `at`. Pattern grows.", fields: [PATTERN_ID, { name: "at", type: "number" }, { name: "count", type: "number", optional: true }] },
    { op: "deleteRow",   summary: "Delete `count` rows starting at `at`. Pattern shrinks; at least 1 row must remain.", fields: [PATTERN_ID, { name: "at", type: "number" }, { name: "count", type: "number", optional: true }] },
    { op: "resizePattern", summary: "Set the pattern's row count. Growth pads empty rows, shrink trims rows and clamps sequence notes.", fields: [PATTERN_ID, { name: "rows", type: "number", description: "1..256" }] },
    { op: "createPattern", summary: "Append a new pattern. Returned id appears in BatchResult.createdPatternIds.", fields: [{ name: "name", type: "string", optional: true }, { name: "rows", type: "number", optional: true }] },
    { op: "deletePattern", summary: "Delete the pattern and any orderList references. At least 1 pattern must remain.", fields: [PATTERN_ID] },
    { op: "renamePattern", summary: "Rename the pattern.", fields: [PATTERN_ID, { name: "name", type: "string" }] },
    { op: "setOrderList",  summary: "Replace the whole order list (every id must exist in project.patterns).", fields: [{ name: "orderList", type: "number[]" }] },
    { op: "insertOrderAt", summary: "Insert a pattern id into the order list at `index`.", fields: [{ name: "index", type: "number" }, PATTERN_ID] },
    { op: "removeOrderAt", summary: "Remove the order-list entry at `index`. At least 1 entry must remain.", fields: [{ name: "index", type: "number" }] },
    { op: "setBpm",        summary: "Set song BPM (32..999).", fields: [{ name: "value", type: "number" }] },
    { op: "setSpeed",      summary: "Set ticks-per-row (1..31).", fields: [{ name: "value", type: "number" }] },
    { op: "setChannels",   summary: "Change channel count. Existing patterns trim/pad cells; may cause data loss when shrinking.", fields: [{ name: "count", type: "number", description: "1..32" }] },
    { op: "renameSample",  summary: "Rename an already-loaded sample.", fields: [{ name: "sampleId", type: "number" }, { name: "name", type: "string" }] },
    { op: "setSampleMeta", summary: "Patch sample metadata.", fields: [{ name: "sampleId", type: "number" }, { name: "patch", type: "SampleMetaPatch" }] },
    { op: "setSampleStretchRatio", summary: "Set sample.stretchRatio directly (0.01..100).", fields: [{ name: "sampleId", type: "number" }, { name: "ratio", type: "number" }] },
    { op: "conformSampleToRows", summary: "Compute and set stretchRatio so the sample's natural duration matches `rows` rows at the project's current bpm/speed.", fields: [{ name: "sampleId", type: "number" }, { name: "rows", type: "number" }, { name: "patternId", type: "number", optional: true }] },
    { op: "setInstrumentSlot", summary: "Set an instrument-table slot (1-based) to a given entry.", fields: [{ name: "slot", type: "number" }, { name: "entry", type: "InstrumentTableEntry" }] },
    { op: "clearInstrumentSlot", summary: "Reset an instrument-table slot to the default sample entry.", fields: [{ name: "slot", type: "number" }] },
    { op: "addSeqNote",    summary: "Insert a note into a sequence layer.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }, { name: "note", type: "SequenceNote" }] },
    { op: "removeSeqNote", summary: "Remove the note at `noteIndex` from a layer.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }, { name: "noteIndex", type: "number" }] },
    { op: "updateSeqNote", summary: "Replace the note at `noteIndex`. Re-sorts if startTick changed.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }, { name: "noteIndex", type: "number" }, { name: "note", type: "SequenceNote" }] },
    { op: "addSeqLayer",   summary: "Add an empty layer to (pattern, channel). Max 4 layers per channel.", fields: [PATTERN_ID, CHANNEL] },
    { op: "removeSeqLayer", summary: "Remove a layer. At least 1 layer must remain.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }] },
    { op: "setSeqLayerInstrument", summary: "Assign an instrument-table slot (1-based) to a sequence layer. 0 = silent.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }, { name: "instrument", type: "number" }] },
    { op: "setSeqLayerEnabled", summary: "Mute/unmute a sequence layer.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }, { name: "enabled", type: "boolean" }] },
  ],
  queries: [
    { op: "getProjectSummary", summary: "Scalar project overview.", fields: [] },
    { op: "getPatternList",    summary: "Lightweight overview of every pattern.", fields: [] },
    { op: "getPattern",        summary: "Full pattern object including all cells.", fields: [PATTERN_ID] },
    { op: "getRange",          summary: "Slice of cells from a pattern.", fields: [PATTERN_ID, { name: "rowStart", type: "number" }, { name: "rowEnd", type: "number" }, { name: "channels", type: "number[]", optional: true }] },
    { op: "getOrderList",      summary: "Return the project order list.", fields: [] },
    { op: "getSamples",        summary: "All sample metadata.", fields: [] },
    { op: "getInstrumentTable", summary: "Return the instrument table.", fields: [] },
    { op: "getSeqLayer",       summary: "Return a sequence layer's notes.", fields: [PATTERN_ID, CHANNEL, { name: "layerIndex", type: "number" }] },
    { op: "getSeqLayerList",   summary: "List every sequence layer in a pattern.", fields: [PATTERN_ID] },
    { op: "getSchema",         summary: "Return this schema document.", fields: [] },
  ],
  notes: [
    "Every batch mutation is wrapped in one undo entry labelled by opts.undoDescription.",
    "patternId is the persistent TrackerPattern.id, not an order-list index.",
    "Sample binary data upload is out of scope; use the assets namespace to load files from the project samples directory instead.",
    "setChannels reshapes every pattern; shrinking can drop cell data silently. Consider dryRun first.",
    "Commands within a single batch are validated against the PRE-BATCH state.",
  ],
};
