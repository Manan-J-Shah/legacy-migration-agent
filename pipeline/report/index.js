const fs = require('fs');
const path = require('path');

/**
 * Stage: report
 *
 * Expected input — /pipeline/data/triage.json:
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
 *
 * Expected output — /pipeline/data/report.json:
 * {
 *   "stage": "report",
 *   "timestamp": "ISO-8601 string",
 *   "basedOn": "triage",
 *   "title": "Moment.js migration report",
 *   "status": "complete" | "partial" | "blocked",
 *   "highlights": [
 *     "string summary bullet"
 *   ],
 *   "metrics": {
 *     "filesTouched": 0,
 *     "transformsApplied": 0,
 *     "openIssues": 0,
 *     "blockers": 0
 *   },
 *   "nextActions": [
 *     "string action item"
 *   ]
 * }
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT = path.join(DATA_DIR, 'triage.json');
const OUTPUT = path.join(DATA_DIR, 'report.json');

// TODO: read triage.json; assemble final migration report; write report.json
function run() {
  throw new Error('TODO: implement report stage');
}

if (require.main === module) {
  run();
}

module.exports = { run, INPUT, OUTPUT };
