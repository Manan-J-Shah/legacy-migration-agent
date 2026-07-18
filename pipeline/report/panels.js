// UI layer — pure DOM rendering from view models produced by model.js.
// No fetch, no business rules. Panels receive already-shaped data plus, where
// needed, a callback for interaction (panel 2 row click drives panel 3).

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function errorBanner(file, message) {
  const banner = el('div', 'load-error');
  banner.append(
    el('span', 'load-error-file', file),
    el('span', 'load-error-msg', `could not load — ${message}`)
  );
  return banner;
}

// Panel 1 — summary bar.
export function renderSummary(root, metrics) {
  root.replaceChildren();
  metrics.forEach((m) => {
    const card = el('article', `metric metric-${m.tone}`);
    if (m.ok && m.value !== null) {
      card.append(el('strong', '', m.value), el('span', '', m.label));
    } else {
      card.classList.add('metric-error');
      card.append(el('strong', '', '—'), el('span', '', m.label));
      card.append(el('span', 'metric-note', `${m.file}: ${m.error || 'unavailable'}`));
    }
    root.append(card);
  });
}

// Panel 2 — cluster table. onSelect(clusterId) wires the diff panel.
export function renderClusters(root, model, selectedId, onSelect) {
  root.replaceChildren();
  if (model.error) {
    root.append(errorBanner('plan.json', model.error));
    return;
  }
  if (model.migrateError) {
    root.append(errorBanner('migrate.json', model.migrateError));
  }
  const table = el('table', 'cluster-table');
  const head = el('tr');
  ['Cluster', 'Risk', 'Usages', 'Files', 'Status', 'Coverage', 'Tests'].forEach((label) =>
    head.append(el('th', '', label))
  );
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const body = el('tbody');
  model.rows.forEach((row) => {
    const tr = el('tr', 'cluster-row');
    if (row.clusterId === selectedId) tr.classList.add('selected');
    tr.append(
      el('td', 'cluster-id', row.clusterId),
      cell(el('span', `risk risk-${row.risk}`, row.risk)),
      el('td', '', row.usageCount),
      el('td', '', row.fileCount),
      cell(statusPill(row.status)),
      el('td', '', row.coverage || '—'),
      el('td', '', row.tests || '—')
    );
    tr.addEventListener('click', () => onSelect(row.clusterId));
    body.append(tr);
  });
  table.append(body);
  root.append(table);
}

function cell(child) {
  const td = el('td');
  td.append(child);
  return td;
}

function statusPill(status) {
  if (!status) return el('span', 'status status-none', '—');
  const tone = status === 'migrated' ? 'ok' : status === 'failed' ? 'bug' : 'pending';
  return el('span', `status status-${tone}`, status);
}

// Panel 3 — before/after diff + audit log for the selected cluster.
export function renderDiff(root, clusterId, diff, log) {
  root.replaceChildren();
  root.append(el('p', 'diff-title', clusterId ? `Cluster: ${clusterId}` : 'Select a cluster'));
  if (diff.error) {
    root.append(errorBanner('migrate.json', diff.error));
  } else if (!diff.files.length) {
    root.append(el('div', 'empty', `No file diffs for ${clusterId} (status: ${diff.status || 'n/a'}).`));
  } else {
    diff.files.forEach((file) => root.append(diffCard(file)));
  }
  root.append(renderLog(log));
}

function diffCard(file) {
  const card = el('article', 'diff-card');
  const meta = el('div', 'diff-meta');
  meta.append(el('span', 'file', file.path), el('span', 'changes', `${file.changes || 0} change(s)`));
  const grid = el('div', 'diff-grid');
  grid.append(
    codePane('Before · moment', file.before, 'removed'),
    codePane('After · date-fns', file.after, 'added')
  );
  card.append(meta, grid);
  return card;
}

function codePane(label, code, kind) {
  const pane = el('div', `code ${kind}`);
  pane.append(el('span', 'code-label', label), el('pre', '', code || '(none)'));
  return pane;
}

function renderLog(log) {
  const wrap = el('div', 'log-wrap');
  wrap.append(el('span', 'code-label', 'Migration log'));
  if (log.error) {
    wrap.append(errorBanner('migration-log.json', log.error));
    return wrap;
  }
  if (!log.entries.length) {
    wrap.append(el('div', 'empty', 'No log entries for this cluster.'));
    return wrap;
  }
  log.entries.forEach((entry) => {
    const line = el('div', `log-line log-${entry.status}`);
    line.append(
      el('span', 'log-action', entry.action),
      el('span', 'log-detail', entry.detail || '')
    );
    wrap.append(line);
  });
  return wrap;
}

// Panel 4 — flagged BUG / NEEDS_REVIEW verdicts with rationale.
export function renderFlagged(root, model) {
  root.replaceChildren();
  root.append(el('p', 'eyebrow', 'Requires judgment'));
  root.append(el('h2', '', 'Flagged verdicts'));
  if (model.error) {
    root.append(errorBanner('triage-results.json', model.error));
    return;
  }
  if (!model.items.length) {
    root.append(el('div', 'empty', 'No BUG or NEEDS_REVIEW verdicts in triage-results.json.'));
    return;
  }
  model.items.forEach((item) => {
    const tone = item.verdict === 'BUG' ? 'bug' : 'review';
    const card = el('article', `flag-card flag-${tone}`);
    const head = el('div', 'flag-head');
    head.append(el('span', `flag-verdict flag-${tone}`, item.verdict), el('span', 'cluster-id', item.clusterId));
    const where = [item.file, item.fn && `${item.fn}()`, item.line].filter(Boolean).join(' · ');
    card.append(head);
    if (where) card.append(el('p', 'file', where));
    card.append(el('p', 'rationale', item.rationale || '(no rationale provided)'));
    root.append(card);
  });
}
