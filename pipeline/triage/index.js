const fs = require('fs');
const path = require('path');

/**
 * Stage: triage
 *
 * Expected input — /pipeline/data/migrate.json:
 * {
 *   "stage": "migrate",
 *   "timestamp": "ISO-8601 string",
 *   "basedOn": "planner",
 *   "applied": [
 *     {
 *       "stepId": "step-1",
 *       "path": "index.js",
 *       "status": "success" | "skipped" | "failed",
 *       "changes": 0,
 *       "error": null
 *     }
 *   ],
 *   "summary": {
 *     "success": 0,
 *     "skipped": 0,
 *     "failed": 0
 *   }
 * }
 *
 * Expected output — /pipeline/data/triage.json:
 * {
 *   "stage": "triage",
 *   "timestamp": "ISO-8601 string",
 *   "basedOn": "migrate",
 *   "issues": [
 *     {
 *       "id": "issue-1",
 *       "severity": "low" | "medium" | "high" | "blocker",
 *       "category": "transform-failure" | "test-failure" | "manual-review",
 *       "path": "index.js",
 *       "stepId": "step-1",
 *       "message": "human-readable description",
 *       "suggestedAction": "retry" | "manual-fix" | "skip"
 *     }
 *   ],
 *   "summary": {
 *     "open": 0,
 *     "blockers": 0
 *   }
 * }
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT = path.join(DATA_DIR, 'migrate.json');
const OUTPUT = path.join(DATA_DIR, 'triage.json');

// TODO: read migrate.json; classify failures and review items; write triage.json
function run() {
  throw new Error('TODO: implement triage stage');
}

if (require.main === module) {
  run();
}

module.exports = { run, INPUT, OUTPUT };
