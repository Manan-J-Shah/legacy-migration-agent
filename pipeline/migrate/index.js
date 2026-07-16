const fs = require('fs');
const path = require('path');

/**
 * Stage: migrate
 *
 * Expected input — /pipeline/data/planner.json:
 * {
 *   "stage": "planner",
 *   "timestamp": "ISO-8601 string",
 *   "basedOn": "characterize",
 *   "targetLibrary": "date-fns" | "dayjs" | "luxon",
 *   "steps": [
 *     {
 *       "id": "step-1",
 *       "description": "Replace moment() parse with target API",
 *       "files": ["index.js"],
 *       "transforms": [
 *         {
 *           "from": "moment(date).format(...)",
 *           "to": "format(date, ...)",
 *           "priority": 1
 *         }
 *       ]
 *     }
 *   ],
 *   "estimatedEffort": "low" | "medium" | "high"
 * }
 *
 * Expected output — /pipeline/data/migrate.json:
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
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT = path.join(DATA_DIR, 'planner.json');
const OUTPUT = path.join(DATA_DIR, 'migrate.json');

// TODO: read planner.json; apply transforms to target-repo; write migrate.json
function run() {
  throw new Error('TODO: implement migrate stage');
}

if (require.main === module) {
  run();
}

module.exports = { run, INPUT, OUTPUT };
