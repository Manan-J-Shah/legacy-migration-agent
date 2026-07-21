'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildReport, run } = require('../index');

function sources() {
  return {
    manifest: [{}, {}, {}],
    plan: [{ type: 'SIMPLE_FORMAT' }, { type: 'TIMEZONE' }, { type: 'LOCALE_DEPENDENT' }],
    migrate: {
      clusters: [
        { clusterId: 'SIMPLE_FORMAT', status: 'migrated' },
        { clusterId: 'TIMEZONE', status: 'failed' },
        { clusterId: 'LOCALE_DEPENDENT', status: 'pending_external' },
      ],
    },
    migrationLog: { entries: [{ id: 1 }, { id: 2 }] },
    triage: {
      results: [
        { clusterId: 'SIMPLE_FORMAT', verdict: 'OK' },
        { clusterId: 'TIMEZONE', verdict: 'BUG' },
        { clusterId: 'LOCALE_DEPENDENT', verdict: 'NEEDS_REVIEW' },
      ],
    },
  };
}

describe('report readiness stage', () => {
  test('summarizes canonical artifacts without creating a report artifact', () => {
    const report = buildReport(sources());

    expect(report.status).toBe('blocked');
    expect(report.dashboard).toBe('pipeline/report/dashboard.html');
    expect(report.summary).toMatchObject({
      usages: 3,
      plannedClusters: 3,
      migrationLogEntries: 2,
      migrated: 1,
      failed: 1,
      pending_external: 1,
      ok: 1,
      bug: 1,
      needsReview: 1,
    });
    expect(report.nextActions).toEqual([
      'Resolve 1 BUG verdict(s) before merging.',
      'Review 1 NEEDS_REVIEW verdict(s) with the evidence dashboard.',
      'Apply or replace 1 pending external handoff patch(es).',
    ]);
  });

  test('loads the five canonical artifact files and rejects a missing source', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-report-'));
    const input = sources();
    const files = {
      'manifest.json': input.manifest,
      'plan.json': input.plan,
      'migrate.json': input.migrate,
      'migration-log.json': input.migrationLog,
      'triage-results.json': input.triage,
    };

    try {
      Object.entries(files).forEach(([name, data]) => {
        fs.writeFileSync(path.join(directory, name), JSON.stringify(data), 'utf8');
      });
      expect(run({ dataDir: directory }).summary.migrated).toBe(1);

      fs.unlinkSync(path.join(directory, 'triage-results.json'));
      expect(() => run({ dataDir: directory })).toThrow(
        'triage-results.json not found in pipeline/data'
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
