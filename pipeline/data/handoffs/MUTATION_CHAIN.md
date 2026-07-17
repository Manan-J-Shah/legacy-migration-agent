# Codex handoff: migrate cluster MUTATION_CHAIN

Target library: date-fns
Cluster type: MUTATION_CHAIN

## Usages
- target-repo/services/scheduler.js:17 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:18 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:18 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:19 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:19 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:27 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:29 (buildFulfillmentWindow)
- target-repo/services/scheduler.js:43 (bumpRetryWindow)
- target-repo/services/scheduler.js:61 (shiftSharedWindow)

## Instructions
Migrate the listed Moment.js call sites to date-fns.
Emit a unified diff and save it as `MUTATION_CHAIN.patch`.
Do not change unrelated files.
