# GitHub Copilot — nanoTracker API SDK

See [`AGENTS.md`](../AGENTS.md) for the must-know rules and
[`CLAUDE.md`](../CLAUDE.md) for full orientation. The same skill bodies
are mirrored under [`.claude/`](../.claude/), [`.hermes/`](../.hermes/),
and [`.agents/`](../.agents/).

This SDK drives a live [nanoTracker](https://federatedindustrial.com/tracker)
session through a local relay. Read state with `nanotracker_read`, write
with `nanotracker_execute`, manage samples with `nanotracker_assets_*`.
Always pass `opts.undoDescription` on writes.
