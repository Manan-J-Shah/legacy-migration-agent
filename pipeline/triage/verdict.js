'use strict';

/**
 * Pure verdict logic for the triage stage.
 *
 * Verdicts are derived from the migrate cluster's `status` / `coverage` /
 * `tests` fields only — never from hard-coded site or cluster names — so the
 * same rules apply to any future cluster the pipeline produces.
 */

const VERDICT = {
  OK: 'OK',
  BUG: 'BUG',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};

function verdictFor(cluster) {
  const status = cluster.status;
  const coverage = cluster.coverage;

  if (status === 'failed') {
    return VERDICT.BUG;
  }
  if (status === 'migrated' && coverage === 'direct') {
    return VERDICT.OK;
  }
  if (coverage === 'indirect') {
    return VERDICT.NEEDS_REVIEW;
  }
  // skipped_unguarded, pending_external, or any unrecognized state.
  return VERDICT.NEEDS_REVIEW;
}

function rationaleFor(cluster) {
  const status = cluster.status;
  const coverage = cluster.coverage;
  const tests = cluster.tests;

  if (status === 'failed') {
    return (
      'Migration failed the characterization test gate (tests: ' +
      (tests || 'failed') +
      '); observable behavior changed — treat as a bug and fix the transform ' +
      'before merging.'
    );
  }
  if (status === 'migrated' && coverage === 'direct') {
    return (
      'Migrated and merged with direct characterization coverage (tests: ' +
      (tests || 'direct') +
      '); passing tests confirm behavior is preserved.'
    );
  }
  if (coverage === 'indirect') {
    return (
      'Migrated with only indirect coverage (tests: ' +
      (tests || 'indirect_coverage') +
      ') via caller tests; no direct test exercises the changed site — manual ' +
      'review advised before trusting the result.'
    );
  }
  if (status === 'skipped_unguarded') {
    return (
      'Skipped as unguarded: no characterization coverage protects this site ' +
      '— manual review required before migrating.'
    );
  }
  if (status === 'pending_external') {
    return (
      'Awaiting an external Codex handoff patch (pending_external); the cluster ' +
      'is not yet migrated and needs human follow-up.'
    );
  }
  return (
    'Unrecognized migrate state (status: ' +
    status +
    ', coverage: ' +
    coverage +
    '); manual review required.'
  );
}

function classifyCluster(cluster) {
  return {
    verdict: verdictFor(cluster),
    rationale: rationaleFor(cluster),
  };
}

module.exports = { VERDICT, classifyCluster, verdictFor, rationaleFor };
