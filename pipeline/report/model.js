// Business-logic layer — pure transforms from raw artifact JSON to panel-ready
// view models. No DOM, no fetch. Every function tolerates a missing/failed
// source by returning an `error` string so the UI can render it explicitly.
//
// Documented schemas (plan Tasks 8 & 10):
//   migrate.json      -> { summary:{migrated,failed,pendingExternal,skippedUnguarded},
//                          clusters:[{clusterId,status,coverage,tests,files:[{path,before,after,changes}],logEntryIds}] }
//   plan.json         -> [{ type, risk, order, summary:{usageCount,fileCount} }]
//   migration-log.json-> { entries:[{id,timestamp,clusterId,branch,action,status,detail}] }
//   triage-results.json-> { results:[{clusterId,verdict:'OK'|'BUG'|'NEEDS_REVIEW',status,coverage,tests,rationale}],
//                           summary:{ok,bug,needsReview,total} }  (real Person B schema; a bare
//                           results array is also tolerated)

function migrateClusterIndex(sources) {
  const migrate = sources.migrate;
  const clusters = (migrate.ok && migrate.data && migrate.data.clusters) || [];
  const index = {};
  clusters.forEach((cluster) => {
    index[cluster.clusterId] = cluster;
  });
  return index;
}

// Robust migrate status tally derived from clusters[].status, NOT migrate.json
// summary — the schema-frozen `git reset --hard` between clusters can drop the
// summary counters (and merge-log entries) to 0 even when clusters migrated.
// Status strings are snake_case (pending_external); summary keys are camelCase.
export function migrateStatusCounts(sources) {
  const migrate = sources.migrate;
  const clusters = (migrate.ok && migrate.data && migrate.data.clusters) || [];
  const counts = { migrated: 0, failed: 0, pendingExternal: 0, skippedUnguarded: 0 };
  clusters.forEach((cluster) => {
    const key = String(cluster.status || '').replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (counts[key] != null) counts[key] += 1;
  });
  return counts;
}

// Normalize triage-results.json into a flat list regardless of container shape.
export function triageItems(sources) {
  const triage = sources.triage;
  if (!triage.ok || !triage.data) return [];
  const raw = Array.isArray(triage.data) ? triage.data : triage.data.results || [];
  return raw.map((item) => ({
    clusterId: item.clusterId || item.cluster || item.id || 'unknown',
    file: item.file || null,
    fn: item.function || item.surroundingFunction || null,
    line: item.line == null ? null : item.line,
    verdict: String(item.verdict || '').toUpperCase(),
    rationale: item.rationale || item.message || '',
  }));
}

export function verdictCounts(sources) {
  const summary = sources.triage.ok && sources.triage.data && sources.triage.data.summary;
  if (summary) {
    return {
      OK: summary.ok || 0,
      BUG: summary.bug || 0,
      NEEDS_REVIEW: summary.needsReview || 0,
    };
  }
  const counts = { OK: 0, BUG: 0, NEEDS_REVIEW: 0 };
  triageItems(sources).forEach((item) => {
    if (counts[item.verdict] != null) counts[item.verdict] += 1;
  });
  return counts;
}

// Panel 1 — summary bar. Each metric carries its own source status so an
// unavailable artifact renders as an explicit error card, never a fake zero.
export function summaryMetrics(sources) {
  const migrate = sources.migrate;
  const manifest = sources.manifest;
  const triage = sources.triage;
  const statusCounts = migrateStatusCounts(sources);
  const counts = verdictCounts(sources);
  const usages = manifest.ok && Array.isArray(manifest.data) ? manifest.data.length : null;
  return [
    metric('Moment usages', manifest, usages),
    metric('Migrated', migrate, statusCounts.migrated),
    metric('Failed', migrate, statusCounts.failed, 'bug'),
    metric('Pending external', migrate, statusCounts.pendingExternal),
    metric('Skipped unguarded', migrate, statusCounts.skippedUnguarded),
    metric('OK', triage, counts.OK, 'ok'),
    metric('BUG', triage, counts.BUG, 'bug'),
    metric('Needs review', triage, counts.NEEDS_REVIEW, 'review'),
  ];
}

function metric(label, source, value, tone) {
  return {
    label,
    tone: tone || 'neutral',
    ok: source.ok,
    file: source.file,
    error: source.error,
    value: value == null ? null : value,
  };
}

// Panel 2 — cluster table joining plan.json clusters with migrate.json status.
export function clusterRows(sources) {
  const plan = sources.plan;
  if (!plan.ok || !Array.isArray(plan.data)) {
    return { error: plan.error || 'plan.json unavailable', rows: [] };
  }
  const index = migrateClusterIndex(sources);
  const rows = plan.data.map((cluster) => {
    const migrated = index[cluster.type] || {};
    const summary = cluster.summary || {};
    return {
      clusterId: cluster.type,
      risk: cluster.risk || 'unknown',
      usageCount: summary.usageCount == null ? (cluster.usages || []).length : summary.usageCount,
      fileCount: summary.fileCount == null ? 0 : summary.fileCount,
      status: migrated.status || null,
      coverage: migrated.coverage || null,
      tests: migrated.tests || null,
      fileDiffs: Array.isArray(migrated.files) ? migrated.files.length : 0,
    };
  });
  return { error: null, rows, migrateError: sources.migrate.ok ? null : sources.migrate.error };
}

// Panel 3 — before/after diff for one cluster (from migrate.json files[]).
export function clusterDiff(sources, clusterId) {
  const migrate = sources.migrate;
  if (!migrate.ok) return { error: migrate.error || 'migrate.json unavailable', files: [] };
  const cluster = migrateClusterIndex(sources)[clusterId];
  if (!cluster) return { error: `No migrate entry for ${clusterId}`, files: [] };
  return { error: null, status: cluster.status, files: cluster.files || [] };
}

// Panel 3 companion — audit-log entries for the cluster via logEntryIds.
export function clusterLog(sources, clusterId) {
  const log = sources.migrationLog;
  if (!log.ok || !log.data) {
    return { error: log.error || 'migration-log.json unavailable', entries: [] };
  }
  const cluster = migrateClusterIndex(sources)[clusterId];
  const ids = (cluster && cluster.logEntryIds) || [];
  const byId = new Map((log.data.entries || []).map((entry) => [entry.id, entry]));
  const entries = ids.map((id) => byId.get(id)).filter(Boolean);
  return { error: null, entries };
}

// Panel 4 — flagged verdicts requiring human judgment.
export function flaggedVerdicts(sources) {
  const triage = sources.triage;
  if (!triage.ok) return { error: triage.error || 'triage-results.json unavailable', items: [] };
  const items = triageItems(sources).filter(
    (item) => item.verdict === 'BUG' || item.verdict === 'NEEDS_REVIEW'
  );
  return { error: null, items };
}
