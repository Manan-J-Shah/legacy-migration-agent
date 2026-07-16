const fs = require('fs');
const path = require('path');

function usageKey(file, fn) {
  return fn + '@' + file.replace(/\\/g, '/');
}

/**
 * Scan target-repo for callers of dates.<fn>( or module.<fn>( patterns via
 * require of a relative dates module — data-driven, not a business-case table.
 */
function buildCallerIndex(repoRoot) {
  const callers = {};
  const servicesDir = path.join(repoRoot, 'target-repo', 'services');
  if (!fs.existsSync(servicesDir)) return callers;

  for (const name of fs.readdirSync(servicesDir)) {
    if (!name.endsWith('.js')) continue;
    const file = path.join(servicesDir, name);
    const rel = path.join('target-repo', 'services', name).replace(/\\/g, '/');
    const code = fs.readFileSync(file, 'utf8');
    if (!/require\(['"]\.\.\/lib\/dates['"]\)/.test(code)) continue;

    const callRe = /\bdates\.(\w+)\s*\(/g;
    let match;
    while ((match = callRe.exec(code)) !== null) {
      const callee = match[1];
      const before = code.slice(0, match.index);
      const fnMatch = before.match(/function\s+(\w+)\s*\(/g);
      const callerFn = fnMatch
        ? fnMatch[fnMatch.length - 1].replace(/^function\s+/, '').replace(/\s*\($/, '')
        : '<module>';
      const key = usageKey('target-repo/lib/dates.js', callee);
      if (!callers[key]) callers[key] = [];
      const callerKey = usageKey(rel, callerFn);
      if (!callers[key].includes(callerKey)) callers[key].push(callerKey);
    }
  }
  return callers;
}

function buildTestIndex(testsDir) {
  const index = {};
  if (!fs.existsSync(testsDir)) return index;
  for (const name of fs.readdirSync(testsDir)) {
    if (!name.endsWith('.test.js')) continue;
    // e.g. dates.formatLong.test.js → formatLong @ dates.js heuristic
    const parts = name.replace(/\.test\.js$/, '').split('.');
    if (parts.length < 2) continue;
    const modulePart = parts[0];
    const fn = parts.slice(1).join('.');
    let file;
    if (modulePart === 'dates') file = 'target-repo/lib/dates.js';
    else file = 'target-repo/services/' + modulePart + '.js';
    const key = usageKey(file, fn);
    const rel = path.join('pipeline', 'characterize', 'tests', name).replace(/\\/g, '/');
    if (!index[key]) index[key] = [];
    index[key].push(rel);
  }
  return index;
}

function resolveCoverage(usages, testIndex, callerIndex) {
  const tests = testIndex || {};
  const callers = callerIndex || {};
  const testFiles = new Set();
  let level = 'none';

  for (const u of usages || []) {
    const key = usageKey(u.file, u.surroundingFunction);
    const direct = tests[key] || [];
    if (direct.length) {
      level = 'direct';
      direct.forEach((t) => testFiles.add(t));
    }
  }

  if (level === 'direct') {
    return {
      level: 'direct',
      tests: 'direct',
      testFiles: [...testFiles],
    };
  }

  for (const u of usages || []) {
    const key = usageKey(u.file, u.surroundingFunction);
    const ups = callers[key] || [];
    for (const callerKey of ups) {
      const indirect = tests[callerKey] || [];
      if (indirect.length) {
        level = 'indirect';
        indirect.forEach((t) => testFiles.add(t));
      }
    }
  }

  if (level === 'indirect') {
    return {
      level: 'indirect',
      tests: 'indirect_coverage',
      testFiles: [...testFiles],
    };
  }

  return {
    level: 'none',
    tests: 'skipped_unguarded',
    testFiles: [],
  };
}

module.exports = {
  resolveCoverage,
  buildCallerIndex,
  buildTestIndex,
  usageKey,
};
