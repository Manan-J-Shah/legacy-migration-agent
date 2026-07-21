'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Report readiness stage
 *
 * The dashboard is the report surface for this project. This stage validates
 * the five canonical artifacts it consumes and emits a compact summary. It
 * deliberately does not create report.json or revive triage.json: those would
 * be a second source of truth.
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const DASHBOARD = path.join('pipeline', 'report', 'dashboard.html');

const ARTIFACTS = {
  manifest: {
    file: 'manifest.json',
    validate: (value) => Array.isArray(value),
    expected: 'an array of discovered usages',
  },
  plan: {
    file: 'plan.json',
    validate: (value) => Array.isArray(value),
    expected: 'an array of migration clusters',
  },
  migrate: {
    file: 'migrate.json',
    validate: (value) => value && Array.isArray(value.clusters),
    expected: 'an object with a clusters array',
  },
  migrationLog: {
    file: 'migration-log.json',
    validate: (value) => value && Array.isArray(value.entries),
    expected: 'an object with an entries array',
  },
  triage: {
    file: 'triage-results.json',
    validate: (value) => value && Array.isArray(value.results),
    expected: 'an object with a results array',
  },
};

function readJson(filePath) {
  const label = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found in pipeline/data; run its producing stage first`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function readArtifacts(dataDir) {
  const directory = dataDir || DATA_DIR;
  const sources = {};
  for (const [name, definition] of Object.entries(ARTIFACTS)) {
    const value = readJson(path.join(directory, definition.file));
    if (!definition.validate(value)) {
      throw new Error(`${definition.file} must contain ${definition.expected}`);
    }
    sources[name] = value;
  }
  return sources;
}

function countClusters(clusters) {
  return clusters.reduce(
    (counts, cluster) => {
      if (Object.prototype.hasOwnProperty.call(counts, cluster.status)) {
        counts[cluster.status] += 1;
      }
      return counts;
    },
    { migrated: 0, failed: 0, pending_external: 0, skipped_unguarded: 0 }
  );
}

function countVerdicts(results) {
  return results.reduce(
    (counts, result) => {
      if (result.verdict === 'OK') counts.ok += 1;
      else if (result.verdict === 'BUG') counts.bug += 1;
      else if (result.verdict === 'NEEDS_REVIEW') counts.needsReview += 1;
      return counts;
    },
    { ok: 0, bug: 0, needsReview: 0 }
  );
}

function statusFor(verdicts) {
  if (verdicts.bug) return 'blocked';
  if (verdicts.needsReview) return 'partial';
  return 'complete';
}

function nextActions(counts, verdicts) {
  const actions = [];
  if (verdicts.bug) actions.push(`Resolve ${verdicts.bug} BUG verdict(s) before merging.`);
  if (verdicts.needsReview) {
    actions.push(`Review ${verdicts.needsReview} NEEDS_REVIEW verdict(s) with the evidence dashboard.`);
  }
  if (counts.pending_external) {
    actions.push(`Apply or replace ${counts.pending_external} pending external handoff patch(es).`);
  }
  if (!actions.length) actions.push('No unresolved report actions.');
  return actions;
}

function buildReport(sources) {
  const clusters = countClusters(sources.migrate.clusters);
  const verdicts = countVerdicts(sources.triage.results);
  const status = statusFor(verdicts);

  return {
    stage: 'report',
    basedOn: 'canonical pipeline artifacts',
    dashboard: DASHBOARD.split(path.sep).join('/'),
    status,
    summary: {
      usages: sources.manifest.length,
      plannedClusters: sources.plan.length,
      migrationLogEntries: sources.migrationLog.entries.length,
      ...clusters,
      ...verdicts,
    },
    highlights: [
      `${clusters.migrated}/${sources.plan.length} cluster(s) migrated.`,
      `${verdicts.ok} OK, ${verdicts.bug} BUG, ${verdicts.needsReview} NEEDS_REVIEW verdict(s).`,
    ],
    nextActions: nextActions(clusters, verdicts),
  };
}

function run(options) {
  const opts = options || {};
  return buildReport(readArtifacts(opts.dataDir));
}

if (require.main === module) {
  const report = run();
  console.log(
    `report ready: ${report.status}; ${report.summary.migrated}/${report.summary.plannedClusters} ` +
      `clusters migrated; dashboard: ${report.dashboard}`
  );
}

module.exports = {
  ARTIFACTS,
  DATA_DIR,
  DASHBOARD,
  readArtifacts,
  countClusters,
  countVerdicts,
  buildReport,
  run,
};
