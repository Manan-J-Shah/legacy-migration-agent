// Orchestrator — wires data access (data.js) to business logic (model.js) to
// UI rendering (panels.js). Holds only the selected-cluster interaction state.

import { loadSources } from './data.js';
import {
  summaryMetrics,
  clusterRows,
  clusterDiff,
  clusterLog,
  flaggedVerdicts,
} from './model.js';
import { renderSummary, renderClusters, renderDiff, renderFlagged } from './panels.js';

const els = {
  summary: document.querySelector('#summary'),
  clusters: document.querySelector('#clusters'),
  diff: document.querySelector('#diff'),
  flagged: document.querySelector('#flagged'),
  health: document.querySelector('#pipeline-health'),
};

const state = { sources: null, clusters: null, selectedId: null };

function selectCluster(clusterId) {
  state.selectedId = clusterId;
  renderClusters(els.clusters, state.clusters, clusterId, selectCluster);
  renderDiff(
    els.diff,
    clusterId,
    clusterDiff(state.sources, clusterId),
    clusterLog(state.sources, clusterId)
  );
}

function initialSelection(clusters) {
  if (!clusters.rows || !clusters.rows.length) return null;
  const withDiff = clusters.rows.find((row) => row.fileDiffs > 0);
  return (withDiff || clusters.rows[0]).clusterId;
}

function setHealth(sources) {
  const failed = Object.values(sources).filter((source) => !source.ok);
  if (!failed.length) {
    els.health.lastElementChild.textContent = 'All artifacts loaded';
    return;
  }
  els.health.classList.add('error');
  els.health.lastElementChild.textContent = `Missing: ${failed.map((s) => s.file).join(', ')}`;
}

async function main() {
  const sources = await loadSources();
  state.sources = sources;
  state.clusters = clusterRows(sources);

  renderSummary(els.summary, summaryMetrics(sources));
  renderFlagged(els.flagged, flaggedVerdicts(sources));
  setHealth(sources);

  state.selectedId = initialSelection(state.clusters);
  selectCluster(state.selectedId);
}

main();
