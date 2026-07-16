const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function handoffPaths(clusterId, handoffsDir) {
  return {
    md: path.join(handoffsDir, clusterId + '.md'),
    patch: path.join(handoffsDir, clusterId + '.patch'),
  };
}

function buildPrompt(clusterId, cluster) {
  const usages = (cluster && cluster.usages) || [];
  const lines = usages.map(
    (u) => `- ${u.file}:${u.line} (${u.surroundingFunction})`
  );
  return [
    '# Codex handoff: migrate cluster ' + clusterId,
    '',
    'Target library: date-fns',
    'Cluster type: ' + ((cluster && cluster.type) || clusterId),
    '',
    '## Usages',
    lines.length ? lines.join('\n') : '- (none listed)',
    '',
    '## Instructions',
    'Migrate the listed Moment.js call sites to date-fns.',
    'Emit a unified diff and save it as `' + clusterId + '.patch`.',
    'Do not change unrelated files.',
    '',
  ].join('\n');
}

function ensureHandoffPrompt(clusterId, cluster, handoffsDir) {
  fs.mkdirSync(handoffsDir, { recursive: true });
  const { md } = handoffPaths(clusterId, handoffsDir);
  if (fs.existsSync(md)) return 'exists';
  fs.writeFileSync(md, buildPrompt(clusterId, cluster), 'utf8');
  return 'written';
}

function applyHandoffPatch(clusterId, handoffsDir, cwd) {
  const { patch } = handoffPaths(clusterId, handoffsDir);
  if (!fs.existsSync(patch)) return 'missing';
  const proc = spawnSync('git', ['apply', patch], {
    cwd,
    encoding: 'utf8',
  });
  if (proc.status !== 0) {
    throw new Error(
      'git apply failed for ' + clusterId + ': ' + (proc.stderr || proc.stdout)
    );
  }
  return 'applied';
}

module.exports = {
  handoffPaths,
  ensureHandoffPrompt,
  applyHandoffPatch,
  buildPrompt,
};
