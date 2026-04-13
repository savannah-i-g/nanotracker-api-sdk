Run a read-only nanoTracker Local API query.

Usage: `/api-read <op> [argsJSON]`

Common ops: `getProjectSummary`, `getPatternList`, `getPattern`,
`getRange`, `getOrderList`, `getSamples`, `getInstrumentTable`,
`getSeqLayer`, `getSeqLayerList`, `getSchema`.

Run via:

```bash
node tools/cli.mjs read $ARGUMENTS
```

Examples:

- `/api-read getProjectSummary`
- `/api-read getPattern '{"patternId":0}'`
- `/api-read getRange '{"patternId":0,"rowStart":0,"rowEnd":16}'`

See [`../skills/api-inspect-state/SKILL.md`](../skills/api-inspect-state/SKILL.md)
for which query to pick when.
