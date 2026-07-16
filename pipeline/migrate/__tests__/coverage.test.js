const { resolveCoverage, buildCallerIndex } = require('../coverage');

test('direct match for formatLong', () => {
  const r = resolveCoverage(
    [{ file: 'target-repo/lib/dates.js', surroundingFunction: 'formatLong' }],
    {
      'formatLong@target-repo/lib/dates.js': [
        'pipeline/characterize/tests/dates.formatLong.test.js',
      ],
    }
  );
  expect(r.level).toBe('direct');
});

test('indirect match for normalizeBusinessDate via invoice caller', () => {
  const callers = {
    'normalizeBusinessDate@target-repo/lib/dates.js': [
      'parseInvoiceDate@target-repo/services/invoices.js',
    ],
  };
  const tests = {
    'parseInvoiceDate@target-repo/services/invoices.js': [
      'pipeline/characterize/tests/invoices.parseInvoiceDate.test.js',
    ],
  };
  const r = resolveCoverage(
    [
      {
        file: 'target-repo/lib/dates.js',
        surroundingFunction: 'normalizeBusinessDate',
      },
    ],
    tests,
    callers
  );
  expect(r.level).toBe('indirect');
  expect(r.tests).toBe('indirect_coverage');
});

test('no match is skipped_unguarded', () => {
  const r = resolveCoverage(
    [
      {
        file: 'target-repo/services/vendorExports.js',
        surroundingFunction: 'formatVendorFiscalPeriod',
      },
    ],
    {},
    {}
  );
  expect(r.level).toBe('none');
  expect(r.tests).toBe('skipped_unguarded');
});

test('buildCallerIndex finds normalizeBusinessDate callers', () => {
  const path = require('path');
  const root = path.join(__dirname, '..', '..', '..');
  const callers = buildCallerIndex(root);
  const key = 'normalizeBusinessDate@target-repo/lib/dates.js';
  expect(callers[key]).toEqual(
    expect.arrayContaining([
      'parseInvoiceDate@target-repo/services/invoices.js',
      'buildWarehouseDigest@target-repo/services/reporting.js',
    ])
  );
});
