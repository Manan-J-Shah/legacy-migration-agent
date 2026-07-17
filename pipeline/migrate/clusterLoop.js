const fs = require('fs');
const path = require('path');

function nowIso() {
  return new Date().toISOString();
}

function clusterIdOf(cluster) {
  return cluster.type || cluster.id || cluster.clusterId;
}

function snippet(text, max) {
  const s = String(text || '');
  return s.length <= max ? s : s.slice(0, max) + '\n/* … */';
}

function runClusterTests(testFiles, deps) {
  if (!testFiles.length) {
    return { ok: false, detail: 'no intersecting tests' };
  }
  const result = deps.runJest({
    ci: true,
    tests: testFiles,
  });
  const ok = result.status === 0;
  return {
    ok,
    detail: ok
      ? 'tests passed'
      : 'tests failed (status=' + result.status + ')',
  };
}

function applySimpleFormat(cluster, deps) {
  const files = [];
  const seen = new Set();
  for (const u of cluster.usages || []) {
    if (seen.has(u.file)) continue;
    seen.add(u.file);
    const abs = path.join(deps.root, u.file);
    if (!fs.existsSync(abs)) continue;
    const result = deps.simpleFormat.transformFile(abs);
    files.push({
      path: u.file,
      before: snippet(result.before, 400),
      after: snippet(result.after, 400),
      changes: result.changes,
    });
  }
  return files;
}

function processCluster(cluster, ctx) {
  const { deps, logPath, testIndex, callerIndex, forceFail } = ctx;
  const clusterId = clusterIdOf(cluster);
  const branch = deps.gitOps.branchName(clusterId);
  const logIds = [];

  const push = (entry) => {
    const recorded = deps.log.appendEntry(
      logPath,
      Object.assign(
        { timestamp: nowIso(), clusterId, branch },
        entry
      )
    );
    logIds.push(recorded.id);
  };

  deps.gitOps.createBranch(clusterId, deps.root);
  push({ action: 'branch_created', status: 'ok', detail: branch });

  let files = [];

  if (clusterId === 'SIMPLE_FORMAT') {
    files = applySimpleFormat(cluster, deps);
    push({
      action: 'transform_applied',
      status: 'ok',
      detail: 'SIMPLE_FORMAT codemod on ' + files.length + ' file(s)',
    });
  } else {
    const patchResult = deps.handoff.applyHandoffPatch(
      clusterId,
      deps.handoffsDir,
      deps.root
    );
    if (patchResult === 'missing') {
      const written = deps.handoff.ensureHandoffPrompt(
        clusterId,
        cluster,
        deps.handoffsDir
      );
      push({
        action: 'handoff_written',
        status: 'skipped',
        detail: 'pending_external (' + written + ')',
      });
      deps.gitOps.checkoutBase(deps.root);
      return {
        clusterId,
        status: 'pending_external',
        coverage: 'none',
        tests: 'skipped_unguarded',
        files,
        logEntryIds: logIds,
      };
    }
    push({
      action: 'transform_applied',
      status: 'ok',
      detail: 'applied handoff patch',
    });
  }

  const cov = deps.coverage.resolveCoverage(
    cluster.usages,
    testIndex,
    callerIndex
  );

  if (cov.level === 'none') {
    push({
      action: 'tests_run',
      status: 'skipped',
      detail: 'skipped_unguarded',
    });
    deps.gitOps.checkoutBase(deps.root);
    return {
      clusterId,
      status: 'skipped_unguarded',
      coverage: 'none',
      tests: 'skipped_unguarded',
      files,
      logEntryIds: logIds,
    };
  }

  let testOk;
  if (forceFail === clusterId) {
    push({
      action: 'force_fail',
      status: 'failed',
      detail: 'MIGRATE_FORCE_FAIL=' + clusterId,
    });
    testOk = false;
  } else {
    const ran = runClusterTests(cov.testFiles, deps);
    testOk = ran.ok;
    push({
      action: 'tests_run',
      status: testOk ? 'ok' : 'failed',
      detail: ran.detail,
    });
  }

  if (testOk) {
    deps.gitOps.commitMigration(clusterId, deps.root);
    push({ action: 'commit', status: 'ok', detail: 'migrated: ' + clusterId });
    deps.gitOps.mergeToBase(clusterId, deps.root);
    push({ action: 'merge', status: 'ok', detail: 'merged into base' });
    return {
      clusterId,
      status: 'migrated',
      coverage: cov.level,
      tests: cov.tests,
      files,
      logEntryIds: logIds,
    };
  }

  const cmd = deps.gitOps.printRollback(clusterId);
  push({ action: 'rollback_printed', status: 'failed', detail: cmd });
  deps.gitOps.checkoutBase(deps.root);
  return {
    clusterId,
    status: 'failed',
    coverage: cov.level,
    tests: 'failed',
    files,
    logEntryIds: logIds,
  };
}

module.exports = { processCluster, clusterIdOf, nowIso };
