const fs = require('fs');
const path = require('path');
const log = require('./log');
const gitOps = require('./gitOps');
const coverage = require('./coverage');
const simpleFormat = require('./simpleFormat');
const handoff = require('./handoff');
const { processCluster, nowIso } = require('./clusterLoop');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const PLAN_PATH = path.join(DATA_DIR, 'plan.json');
const LOG_PATH = path.join(DATA_DIR, 'migration-log.json');
const OUT_PATH = path.join(DATA_DIR, 'migrate.json');
const HANDOFFS_DIR = path.join(DATA_DIR, 'handoffs');
const TESTS_DIR = path.join(__dirname, '..', 'characterize', 'tests');

function loadPlan() {
  if (!fs.existsSync(PLAN_PATH)) {
    throw new Error('plan.json not found — run the planner stage first');
  }
  return JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
}

function emptyOutput(base) {
  return {
    stage: 'migrate',
    timestamp: nowIso(),
    baseBranch: base,
    clusters: [],
    summary: {
      migrated: 0,
      failed: 0,
      pendingExternal: 0,
      skippedUnguarded: 0,
    },
  };
}

function tally(summary, status) {
  if (status === 'migrated') summary.migrated += 1;
  else if (status === 'failed') summary.failed += 1;
  else if (status === 'pending_external') summary.pendingExternal += 1;
  else if (status === 'skipped_unguarded') summary.skippedUnguarded += 1;
}

function createDeps(overrides) {
  const runJestMod = require('../characterize/runJest');
  return Object.assign(
    {
      root: ROOT,
      handoffsDir: HANDOFFS_DIR,
      log,
      gitOps,
      coverage,
      simpleFormat,
      handoff,
      runJest: runJestMod.runJest,
    },
    overrides || {}
  );
}

function run(options) {
  const deps = createDeps(options && options.deps);
  const plan = (options && options.plan) || loadPlan();
  deps.gitOps.ensureCleanTree(deps.root);

  const base = deps.gitOps.baseBranch();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    LOG_PATH,
    JSON.stringify(log.emptyLog(base), null, 2) + '\n'
  );

  const testIndex = coverage.buildTestIndex(TESTS_DIR);
  const callerIndex = coverage.buildCallerIndex(deps.root);
  const forceFail = process.env.MIGRATE_FORCE_FAIL || null;
  const out = emptyOutput(base);
  const ctx = {
    deps,
    logPath: LOG_PATH,
    testIndex,
    callerIndex,
    forceFail,
  };

  for (const cluster of plan) {
    const result = processCluster(cluster, ctx);
    out.clusters.push(result);
    tally(out.summary, result.status);
  }

  out.timestamp = nowIso();
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  return out;
}

if (require.main === module) {
  const out = run();
  console.log(
    'migrate complete:',
    JSON.stringify(out.summary),
    '→',
    path.relative(ROOT, OUT_PATH)
  );
}

module.exports = {
  run,
  processCluster,
  createDeps,
  INPUT: PLAN_PATH,
  OUTPUT: OUT_PATH,
  LOG_PATH,
};
