'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { classifyCluster, VERDICT } = require('../verdict');
const { run, buildReport } = require('../index');

describe('verdict mapping (data-driven from status/coverage)', () => {
  test('migrated + direct coverage -> OK', () => {
    const { verdict } = classifyCluster({
      clusterId: 'TIMEZONE',
      status: 'migrated',
      coverage: 'direct',
      tests: 'direct',
    });
    expect(verdict).toBe(VERDICT.OK);
  });

  test('indirect coverage -> NEEDS_REVIEW citing indirect coverage', () => {
    const { verdict, rationale } = classifyCluster({
      clusterId: 'LOCALE_DEPENDENT',
      status: 'migrated',
      coverage: 'indirect',
      tests: 'indirect_coverage',
    });
    expect(verdict).toBe(VERDICT.NEEDS_REVIEW);
    expect(rationale).toMatch(/indirect/i);
  });

  test('failed -> BUG with rationale from the test gate', () => {
    const { verdict, rationale } = classifyCluster({
      clusterId: 'SIMPLE_FORMAT',
      status: 'failed',
      coverage: 'direct',
      tests: 'failed',
    });
    expect(verdict).toBe(VERDICT.BUG);
    expect(rationale).toMatch(/test/i);
  });

  test('skipped_unguarded -> NEEDS_REVIEW', () => {
    const { verdict } = classifyCluster({
      clusterId: 'VENDOR',
      status: 'skipped_unguarded',
      coverage: 'none',
      tests: 'skipped_unguarded',
    });
    expect(verdict).toBe(VERDICT.NEEDS_REVIEW);
  });

  test('pending_external -> NEEDS_REVIEW', () => {
    const { verdict } = classifyCluster({
      clusterId: 'MUTATION_CHAIN',
      status: 'pending_external',
      coverage: 'none',
      tests: 'skipped_unguarded',
    });
    expect(verdict).toBe(VERDICT.NEEDS_REVIEW);
  });
});

describe('triage report + output path', () => {
  const migrate = {
    stage: 'migrate',
    baseBranch: 'feature/pr2-triage-judgment',
    clusters: [
      { clusterId: 'SIMPLE_FORMAT', status: 'migrated', coverage: 'direct', tests: 'direct' },
      { clusterId: 'TIMEZONE', status: 'migrated', coverage: 'direct', tests: 'direct' },
      { clusterId: 'LOCALE_DEPENDENT', status: 'pending_external', coverage: 'none', tests: 'skipped_unguarded' },
      { clusterId: 'FAILING', status: 'failed', coverage: 'direct', tests: 'failed' },
    ],
  };

  test('buildReport summarizes verdict counts', () => {
    const report = buildReport(migrate);
    expect(report.stage).toBe('triage');
    expect(report.basedOn).toBe('migrate');
    expect(report.summary).toEqual({ ok: 2, bug: 1, needsReview: 1, total: 4 });
    const bugOrReview = report.results.filter(
      (r) => r.verdict === VERDICT.BUG || r.verdict === VERDICT.NEEDS_REVIEW
    );
    expect(bugOrReview.length).toBeGreaterThan(0);
    expect(bugOrReview.every((r) => r.rationale && r.rationale.length > 0)).toBe(true);
  });

  test('run writes triage-results.json only (never triage.json)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-'));
    const output = path.join(dir, 'triage-results.json');
    const legacy = path.join(dir, 'triage.json');

    const report = run({ migrate, output });

    expect(fs.existsSync(output)).toBe(true);
    expect(fs.existsSync(legacy)).toBe(false);
    const written = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(written.summary).toEqual(report.summary);
    expect(written.results).toHaveLength(4);
  });
});
