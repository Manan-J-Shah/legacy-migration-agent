const path = require('path');
const fs = require('fs');
const { collectUsages } = require('../collectUsages');

function usagesFor(relFile) {
  const abs = path.join(__dirname, '..', '..', '..', relFile);
  const code = fs.readFileSync(abs, 'utf8');
  return collectUsages(code, relFile.replace(/\\/g, '/'));
}

test('normalizeBusinessDate usages are LOCALE_DEPENDENT', () => {
  const usages = usagesFor('target-repo/lib/dates.js');
  const hits = usages.filter((u) => u.surroundingFunction === 'normalizeBusinessDate');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((u) => u.classification === 'LOCALE_DEPENDENT')).toBe(true);
});

test('vendorExports usages are TIMEZONE', () => {
  const usages = usagesFor('target-repo/services/vendorExports.js');
  const hits = usages.filter((u) => u.surroundingFunction === 'formatVendorFiscalPeriod');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((u) => u.classification === 'TIMEZONE')).toBe(true);
});

test('shiftSharedWindow mutation alias is MUTATION_CHAIN', () => {
  const usages = usagesFor('target-repo/services/scheduler.js');
  const hits = usages.filter((u) => u.surroundingFunction === 'shiftSharedWindow');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.some((u) => u.classification === 'MUTATION_CHAIN')).toBe(true);
});
