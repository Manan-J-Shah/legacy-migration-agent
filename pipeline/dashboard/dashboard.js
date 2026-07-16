const DATA_ROOT = '../data/';
const FILES = ['manifest.json', 'characterize.json', 'plan.json', 'migrations.json'];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

async function loadData() {
  const values = await Promise.all(
    FILES.map(async (file) => {
      const response = await fetch(DATA_ROOT + file);
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.json();
    })
  );
  return {
    manifest: values[0],
    characterize: values[1],
    plan: values[2],
    migrations: values[3],
  };
}

function addMetric(root, value, label) {
  const card = el('article', 'metric');
  card.append(el('strong', '', String(value)), el('span', '', label));
  root.append(card);
}

function renderMetrics(data) {
  const root = document.querySelector('#metrics');
  const baseline = data.characterize.baseline.lock;
  addMetric(root, data.manifest.length, 'Moment usages discovered');
  addMetric(root, baseline.numPassed + '/' + baseline.numTests, 'Locked tests passing');
  addMetric(root, data.migrations.migrations.length, 'Call sites migrated');
  addMetric(root, data.migrations.flaggedCase ? 1 : 0, 'Case requiring attention');
}

function clusterCases(cluster, functions) {
  return functions
    .filter((fn) => fn.classifications.includes(cluster.type))
    .reduce((sum, fn) => sum + fn.caseCount, 0);
}

function renderClusters(data) {
  const root = document.querySelector('#clusters');
  const locked = data.characterize.baseline.ciLocked;
  for (const cluster of data.plan) {
    const cases = clusterCases(cluster, data.characterize.functions);
    const card = el('article', 'cluster');
    const top = el('div', 'cluster-top');
    top.append(
      el('span', 'cluster-name', cluster.type),
      el('span', `risk ${cluster.risk}`, cluster.risk)
    );

    const coverage = el('div', 'coverage-row');
    const before = el('span');
    before.append('Before ', el('b', '', `${cases}/${cases}`));
    const after = el('span');
    after.append('After ', el('b', '', locked ? `${cases}/${cases}` : '—'));
    coverage.append(before, after);

    const track = el('div', 'track');
    const fill = el('span');
    fill.style.width = locked ? '100%' : '0%';
    track.append(fill);
    card.append(top, coverage, track);
    root.append(card);
  }
}

function renderFilters(data) {
  const root = document.querySelector('#filters');
  const values = ['ALL', ...new Set(data.migrations.migrations.map((m) => m.cluster))];
  for (const value of values) {
    const button = el('button', value === 'ALL' ? 'active' : '', value);
    button.type = 'button';
    button.addEventListener('click', () => {
      root.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      renderDiffs(data, value);
    });
    root.append(button);
  }
}

function codePane(label, code, kind) {
  const pane = el('div', `code ${kind}`);
  pane.append(el('span', 'code-label', label), el('pre', '', code));
  return pane;
}

function renderDiffs(data, filter = 'ALL') {
  const root = document.querySelector('#diffs');
  root.replaceChildren();
  const items = data.migrations.migrations.filter(
    (item) => filter === 'ALL' || item.cluster === filter
  );
  if (!items.length) {
    root.append(document.querySelector('#empty-template').content.cloneNode(true));
    return;
  }

  for (const item of items) {
    const card = el('article', 'diff-card');
    const meta = el('div', 'diff-meta');
    const name = el('div');
    name.append(
      el('h3', '', `${item.function}()`),
      el('div', 'file', `${item.file}:${item.line} · ${item.cluster}`)
    );
    meta.append(name, el('span', `status ${item.status}`, item.status));
    const grid = el('div', 'diff-grid');
    grid.append(
      codePane('Before · moment', `− ${item.before}`, 'removed'),
      codePane('After · date-fns', `+ ${item.after}`, 'added')
    );
    card.append(meta, grid);
    root.append(card);
  }
}

function renderFlag(flag) {
  const root = document.querySelector('#flagged');
  if (!flag) {
    root.hidden = true;
    return;
  }

  const layout = el('div', 'flag-layout');
  const mark = el('div');
  mark.append(
    el('p', 'eyebrow', flag.applied ? 'Flagged migration' : 'Pre-migration guardrail'),
    el('div', 'flag-mark', flag.status)
  );
  const detail = el('div');
  detail.append(
    el('p', 'eyebrow', 'Requires explicit correction'),
    el('h2', '', `${flag.function}() token semantics`)
  );
  const file = el('p', 'file', `${flag.file}:${flag.line} · ${flag.cluster}`);
  const outputs = el('div', 'output-compare');
  outputs.append(
    el('div', 'output', `Expected · ${flag.oldOutput}`),
    el('div', 'output', `Naive migration · ${flag.newOutput}`)
  );
  const rationale = el('p', 'rationale', flag.rationale);
  const docs = el('a', '', 'Read the date-fns Unicode token guidance ↗');
  docs.href = flag.docs;
  docs.target = '_blank';
  docs.rel = 'noreferrer';
  detail.append(file, outputs, rationale, docs);
  layout.append(mark, detail);
  root.append(layout);
}

function render(data) {
  renderMetrics(data);
  renderClusters(data);
  renderFilters(data);
  renderDiffs(data);
  renderFlag(data.migrations.flaggedCase);
  document.querySelector('#pipeline-health').lastElementChild.textContent =
    data.characterize.baseline.ciLocked ? 'Baseline locked · CI passing' : 'Baseline unlocked';
  document.querySelector('#generated-at').textContent =
    `Characterized ${new Date(data.characterize.timestamp).toLocaleString()}`;
}

loadData()
  .then(render)
  .catch((error) => {
    const health = document.querySelector('#pipeline-health');
    health.classList.add('error');
    health.lastElementChild.textContent = `Could not load pipeline data: ${error.message}`;
  });
