'use strict';

const fs = require('fs');
const path = require('path');
const { classifyCluster, VERDICT } = require('./verdict');

/**
 * Stage: triage
 *
 * Reads the canonical migrate artifact and emits per-cluster judgment verdicts.
 * Input  — pipeline/data/migrate.json (written by the migrate stage)
 * Output — pipeline/data/triage-results.json (canonical; never triage.json)
 *
 * triage-results.json schema:
 * {
 *   "stage": "triage",
 *   "timestamp": "ISO-8601 string",
 *   "basedOn": "migrate",
 *   "baseBranch": "<branch>",
 *   "results": [
 *     {
 *       "clusterId": "TIMEZONE",
 *       "verdict": "OK" | "BUG" | "NEEDS_REVIEW",
 *       "status": "migrated" | "failed" | "pending_external" | "skipped_unguarded",
 *       "coverage": "direct" | "indirect" | "none",
 *       "tests": "direct" | "indirect_coverage" | "skipped_unguarded" | "failed",
 *       "rationale": "human-readable justification"
 *     }
 *   ],
 *   "summary": { "ok": 0, "bug": 0, "needsReview": 0, "total": 0 }
 * }
 */

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT = path.join(DATA_DIR, 'migrate.json');
const OUTPUT = path.join(DATA_DIR, 'triage-results.json');

function readMigrate(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error('migrate.json not found — run `npm run migrate` first');
  }
  return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function buildResults(migrate) {
  const clusters = (migrate && migrate.clusters) || [];
  return clusters.map((cluster) => {
    const { verdict, rationale } = classifyCluster(cluster);
    return {
      clusterId: cluster.clusterId,
      verdict,
      status: cluster.status,
      coverage: cluster.coverage,
      tests: cluster.tests,
      rationale,
    };
  });
}

function summarize(results) {
  const summary = { ok: 0, bug: 0, needsReview: 0, total: results.length };
  for (const result of results) {
    if (result.verdict === VERDICT.OK) summary.ok += 1;
    else if (result.verdict === VERDICT.BUG) summary.bug += 1;
    else if (result.verdict === VERDICT.NEEDS_REVIEW) summary.needsReview += 1;
  }
  return summary;
}

function buildReport(migrate) {
  const results = buildResults(migrate);
  return {
    stage: 'triage',
    timestamp: new Date().toISOString(),
    basedOn: 'migrate',
    baseBranch: (migrate && migrate.baseBranch) || null,
    results,
    summary: summarize(results),
  };
}

function run(options) {
  const opts = options || {};
  const inputPath = opts.input || INPUT;
  const outputPath = opts.output || OUTPUT;
  const migrate = opts.migrate || readMigrate(inputPath);
  const report = buildReport(migrate);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

if (require.main === module) {
  const report = run();
  console.log(
    'triage complete:',
    JSON.stringify(report.summary),
    '→',
    path.relative(ROOT, OUTPUT)
  );
}

module.exports = { run, buildReport, buildResults, summarize, INPUT, OUTPUT };
