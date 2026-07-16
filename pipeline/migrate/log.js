const fs = require('fs');

function emptyLog(baseBranch) {
  return {
    baseBranch: baseBranch || 'master',
    entries: [],
    summary: { migrated: 0, failed: 0, pendingExternal: 0 },
  };
}

function summarize(log) {
  const summary = { migrated: 0, failed: 0, pendingExternal: 0 };
  for (const entry of log.entries || []) {
    applySummaryIncrement(summary, entry);
  }
  return summary;
}

function applySummaryIncrement(summary, entry) {
  if (entry.action === 'merge' && entry.status === 'ok') {
    summary.migrated += 1;
  } else if (entry.action === 'rollback_printed') {
    summary.failed += 1;
  } else if (
    entry.action === 'handoff_written' &&
    (entry.status === 'skipped' || entry.status === 'ok')
  ) {
    if (entry.detail && String(entry.detail).includes('pending')) {
      summary.pendingExternal += 1;
    } else if (entry.status === 'skipped') {
      summary.pendingExternal += 1;
    }
  }
}

function appendEntry(logPath, entry) {
  let log;
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } else {
    log = emptyLog(entry.baseBranch || 'master');
  }
  if (!Array.isArray(log.entries)) log.entries = [];
  if (!log.summary) log.summary = { migrated: 0, failed: 0, pendingExternal: 0 };

  const id = log.entries.length;
  const recorded = Object.assign({ id }, entry);
  log.entries.push(recorded);
  applySummaryIncrement(log.summary, recorded);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n', 'utf8');
  return recorded;
}

module.exports = { emptyLog, appendEntry, summarize };
