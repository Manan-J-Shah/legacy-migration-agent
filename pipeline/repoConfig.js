const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_NAME = process.env.TARGET_REPO || 'target-repo';
const TARGET_ROOT = path.join(ROOT, TARGET_NAME);

/** Pipeline artifacts for target-repo stay at data/; others use data/<name>/. */
const DATA_DIR =
  TARGET_NAME === 'target-repo'
    ? path.join(ROOT, 'pipeline', 'data')
    : path.join(ROOT, 'pipeline', 'data', TARGET_NAME);

/** Characterization tests for non-default targets live in a sibling folder. */
const TESTS_DIR =
  TARGET_NAME === 'target-repo'
    ? path.join(ROOT, 'pipeline', 'characterize', 'tests')
    : path.join(ROOT, 'pipeline', 'characterize', TARGET_NAME + '-tests');

module.exports = {
  ROOT,
  TARGET_NAME,
  TARGET_ROOT,
  DATA_DIR,
  TESTS_DIR,
};
