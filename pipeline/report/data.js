// Data access layer — the ONLY module that talks to the network.
// Each pipeline artifact is fetched independently so a single missing file
// surfaces as an explicit per-file load error instead of blanking the page.

const DATA_ROOT = '../data/';

// Logical name -> real artifact file. Consumed by the four dashboard panels.
export const FILES = {
  manifest: 'manifest.json',
  plan: 'plan.json',
  migrate: 'migrate.json',
  migrationLog: 'migration-log.json',
  triage: 'triage-results.json',
};

async function loadFile(fileName) {
  try {
    const response = await fetch(DATA_ROOT + fileName, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, data: null };
    }
    return { ok: true, error: null, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error.message || String(error), data: null };
  }
}

// Returns { <name>: { file, ok, error, data } } for every FILES entry.
export async function loadSources() {
  const names = Object.keys(FILES);
  const settled = await Promise.all(names.map((name) => loadFile(FILES[name])));
  const sources = {};
  names.forEach((name, index) => {
    sources[name] = { file: FILES[name], ...settled[index] };
  });
  return sources;
}
