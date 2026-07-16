const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ensureHandoffPrompt,
  applyHandoffPatch,
  handoffPaths,
} = require('../handoff');

test('writes md when missing and leaves pending when no patch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  const dir = path.join(root, 'handoffs');
  fs.mkdirSync(dir);
  const status = ensureHandoffPrompt(
    'TIMEZONE',
    { type: 'TIMEZONE', usages: [] },
    dir
  );
  expect(status).toBe('written');
  expect(fs.existsSync(path.join(dir, 'TIMEZONE.md'))).toBe(true);
  expect(applyHandoffPatch('TIMEZONE', dir, root)).toBe('missing');
  expect(handoffPaths('TIMEZONE', dir).md).toContain('TIMEZONE.md');
});

test('ensureHandoffPrompt is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  const dir = path.join(root, 'handoffs');
  fs.mkdirSync(dir);
  expect(ensureHandoffPrompt('LOCALE_DEPENDENT', { usages: [] }, dir)).toBe(
    'written'
  );
  expect(ensureHandoffPrompt('LOCALE_DEPENDENT', { usages: [] }, dir)).toBe(
    'exists'
  );
});
