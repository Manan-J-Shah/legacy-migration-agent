const { branchName, baseBranch } = require('../gitOps');

test('branchName prefixes migrate/', () => {
  expect(branchName('SIMPLE_FORMAT')).toBe('migrate/SIMPLE_FORMAT');
});

test('baseBranch defaults to master', () => {
  const prev = process.env.PIPELINE_BASE_BRANCH;
  delete process.env.PIPELINE_BASE_BRANCH;
  expect(baseBranch()).toBe('master');
  if (prev === undefined) {
    delete process.env.PIPELINE_BASE_BRANCH;
  } else {
    process.env.PIPELINE_BASE_BRANCH = prev;
  }
});

test('baseBranch respects PIPELINE_BASE_BRANCH', () => {
  const prev = process.env.PIPELINE_BASE_BRANCH;
  process.env.PIPELINE_BASE_BRANCH = 'demo-base';
  expect(baseBranch()).toBe('demo-base');
  if (prev === undefined) {
    delete process.env.PIPELINE_BASE_BRANCH;
  } else {
    process.env.PIPELINE_BASE_BRANCH = prev;
  }
});
