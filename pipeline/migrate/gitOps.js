const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function baseBranch() {
  return process.env.PIPELINE_BASE_BRANCH || 'master';
}

function branchName(clusterId) {
  return 'migrate/' + clusterId;
}

function git(args, opts) {
  const cwd = (opts && opts.cwd) || ROOT;
  const proc = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: Object.assign({}, process.env, {
      GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'control-repo',
      GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'control@local',
      GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'control-repo',
      GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'control@local',
    }),
  });
  return {
    status: proc.status,
    stdout: (proc.stdout || '').trim(),
    stderr: (proc.stderr || '').trim(),
  };
}

function ensureCleanTree(cwd) {
  const status = git(['status', '--porcelain'], { cwd });
  if (status.status !== 0) {
    throw new Error('git status failed: ' + status.stderr);
  }
  if (status.stdout) {
    throw new Error('Working tree is not clean; aborting migrate');
  }
}

function checkoutBase(cwd) {
  const base = baseBranch();
  // Discard in-progress migrate-branch edits so base stays untouched.
  git(['reset', '--hard'], { cwd });
  git(['clean', '-fd', '--', 'target-repo'], { cwd });
  const result = git(['checkout', base], { cwd });
  if (result.status !== 0) {
    throw new Error('Failed to checkout ' + base + ': ' + result.stderr);
  }
}

function createBranch(clusterId, cwd) {
  checkoutBase(cwd);
  const name = branchName(clusterId);
  git(['branch', '-D', name], { cwd });
  const created = git(['checkout', '-b', name], { cwd });
  if (created.status !== 0) {
    throw new Error('Failed to create ' + name + ': ' + created.stderr);
  }
  return name;
}

function commitMigration(clusterId, cwd) {
  const add = git(['add', '-A'], { cwd });
  if (add.status !== 0) {
    throw new Error('git add failed: ' + add.stderr);
  }
  const msg = 'migrated: ' + clusterId;
  const committed = git(['commit', '-m', msg], { cwd });
  if (committed.status !== 0) {
    throw new Error('git commit failed: ' + committed.stderr + committed.stdout);
  }
}

function mergeToBase(clusterId, cwd) {
  const base = baseBranch();
  const name = branchName(clusterId);
  checkoutBase(cwd);
  const merged = git(['merge', '--no-ff', '-m', 'Merge ' + name, name], { cwd });
  if (merged.status !== 0) {
    throw new Error('git merge failed: ' + merged.stderr);
  }
}

function printRollback(clusterId) {
  const cmd =
    'git checkout ' + baseBranch() + ' && git branch -D ' + branchName(clusterId);
  console.log(cmd);
  return cmd;
}

function checkoutBranch(name, cwd) {
  const result = git(['checkout', name], { cwd });
  if (result.status !== 0) {
    throw new Error('Failed to checkout ' + name + ': ' + result.stderr);
  }
}

module.exports = {
  ROOT,
  baseBranch,
  branchName,
  git,
  ensureCleanTree,
  createBranch,
  commitMigration,
  mergeToBase,
  printRollback,
  checkoutBase,
  checkoutBranch,
};
