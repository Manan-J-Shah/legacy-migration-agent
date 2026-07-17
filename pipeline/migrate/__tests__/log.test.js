const fs = require('fs');
const os = require('os');
const path = require('path');
const { emptyLog, appendEntry, summarize } = require('../log');

test('appendEntry writes entry and updates summary counts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'miglog-'));
  const file = path.join(dir, 'migration-log.json');
  fs.writeFileSync(file, JSON.stringify(emptyLog('master')));
  appendEntry(file, {
    timestamp: '2026-07-16T00:00:00.000Z',
    clusterId: 'SIMPLE_FORMAT',
    branch: 'migrate/SIMPLE_FORMAT',
    action: 'merge',
    status: 'ok',
    detail: 'merged',
  });
  const log = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(log.entries).toHaveLength(1);
  expect(log.summary.migrated).toBe(1);
});

test('summarize counts rollback and pending handoff', () => {
  const log = emptyLog('master');
  log.entries = [
    {
      action: 'rollback_printed',
      status: 'failed',
      detail: 'tests failed',
    },
    {
      action: 'handoff_written',
      status: 'skipped',
      detail: 'pending_external',
    },
  ];
  expect(summarize(log)).toEqual({
    migrated: 0,
    failed: 1,
    pendingExternal: 1,
  });
});
