const { processCluster, createDeps } = require('../index');

function mockGitOps() {
  const calls = [];
  return {
    calls,
    branchName: (id) => 'migrate/' + id,
    createBranch: (id) => {
      calls.push(['createBranch', id]);
      return 'migrate/' + id;
    },
    commitMigration: (id) => calls.push(['commitMigration', id]),
    mergeToBase: (id) => calls.push(['mergeToBase', id]),
    printRollback: (id) => {
      calls.push(['printRollback', id]);
      return 'git checkout master && git branch -D migrate/' + id;
    },
    checkoutBase: () => calls.push(['checkoutBase']),
  };
}

test('MIGRATE_FORCE_FAIL marks cluster failed without merging', () => {
  const gitOps = mockGitOps();
  const entries = [];
  const deps = createDeps({
    gitOps,
    log: {
      appendEntry: (_p, entry) => {
        const id = entries.length;
        entries.push(Object.assign({ id }, entry));
        return entries[id];
      },
    },
    simpleFormat: {
      transformFile: () => ({ before: 'a', after: 'b', changes: 1 }),
    },
    coverage: {
      resolveCoverage: () => ({
        level: 'direct',
        tests: 'direct',
        testFiles: ['pipeline/characterize/tests/dates.formatLong.test.js'],
      }),
    },
    handoff: {
      applyHandoffPatch: () => 'missing',
      ensureHandoffPrompt: () => 'written',
    },
    runJest: () => ({ status: 0 }),
    root: __dirname,
    handoffsDir: __dirname,
  });

  const result = processCluster(
    {
      type: 'SIMPLE_FORMAT',
      usages: [
        {
          file: 'target-repo/lib/dates.js',
          surroundingFunction: 'formatLong',
        },
      ],
    },
    {
      deps,
      logPath: 'unused.json',
      testIndex: {},
      callerIndex: {},
      forceFail: 'SIMPLE_FORMAT',
    }
  );

  expect(result.status).toBe('failed');
  expect(gitOps.calls.map((c) => c[0])).toContain('printRollback');
  expect(gitOps.calls.map((c) => c[0])).not.toContain('mergeToBase');
  expect(entries.some((e) => e.action === 'force_fail')).toBe(true);
});

test('unguarded coverage skips merge', () => {
  const gitOps = mockGitOps();
  const deps = createDeps({
    gitOps,
    log: {
      appendEntry: (_p, entry) => Object.assign({ id: 0 }, entry),
    },
    simpleFormat: { transformFile: () => ({ before: '', after: '', changes: 0 }) },
    coverage: {
      resolveCoverage: () => ({
        level: 'none',
        tests: 'skipped_unguarded',
        testFiles: [],
      }),
    },
    handoff: {
      applyHandoffPatch: () => 'applied',
      ensureHandoffPrompt: () => 'exists',
    },
    runJest: () => ({ status: 0 }),
    root: __dirname,
    handoffsDir: __dirname,
  });

  const result = processCluster(
    {
      type: 'TIMEZONE',
      usages: [
        {
          file: 'target-repo/services/vendorExports.js',
          surroundingFunction: 'formatVendorFiscalPeriod',
        },
      ],
    },
    {
      deps,
      logPath: 'unused.json',
      testIndex: {},
      callerIndex: {},
      forceFail: null,
    }
  );

  expect(result.status).toBe('skipped_unguarded');
  expect(gitOps.calls.map((c) => c[0])).not.toContain('mergeToBase');
});
