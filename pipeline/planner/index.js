const fs = require('fs');
const path = require('path');
const CLUSTER_ORDER = require('./clusterOrder');

/**
 * Stage: planner
 *
 * Reads the discovery manifest and groups call sites into ordered migration
 * clusters. SIMPLE_FORMAT is first; WRAPPED_ERROR_HANDLING and TIMEZONE are last.
 * Each cluster carries a risk level derived from its type.
 *
 * Expected input — /pipeline/data/manifest.json:
 * [
 *   {
 *     "file": "target-repo/lib/dates.js",
 *     "line": 9,
 *     "surroundingFunction": "formatShort",
 *     "classification": "SIMPLE_FORMAT"
 *   }
 * ]
 *
 * Expected output — /pipeline/data/plan.json (ordered array):
 * [
 *   {
 *     "type": "SIMPLE_FORMAT" | "MUTATION_CHAIN" | "LOCALE_DEPENDENT" | "TIMEZONE" | "WRAPPED_ERROR_HANDLING",
 *     "risk": "low" | "medium" | "high",
 *     "order": 1,
 *     "usages": [
 *       { "file", "line", "surroundingFunction", "classification" }
 *     ],
 *     "summary": { "usageCount": 0, "fileCount": 0 }
 *   }
 * ]
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT = path.join(DATA_DIR, 'manifest.json');
const OUTPUT = path.join(DATA_DIR, 'plan.json');

function readManifest() {
  if (!fs.existsSync(INPUT)) {
    throw new Error('manifest.json not found — run the discovery stage first');
  }
  return JSON.parse(fs.readFileSync(INPUT, 'utf8'));
}

function groupByClassification(manifest) {
  const buckets = new Map();
  for (const usage of manifest) {
    const key = usage.classification;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(usage);
  }
  return buckets;
}

function buildClusters(manifest) {
  const buckets = groupByClassification(manifest);
  const known = new Set(CLUSTER_ORDER.map((c) => c.type));
  const unknown = [...buckets.keys()].filter((k) => !known.has(k));
  if (unknown.length) {
    throw new Error('Unknown classification(s) in manifest: ' + unknown.join(', '));
  }

  const clusters = [];
  let order = 1;
  for (const { type, risk } of CLUSTER_ORDER) {
    const usages = buckets.get(type) || [];
    if (usages.length === 0) continue;

    const files = new Set(usages.map((u) => u.file));
    clusters.push({
      type,
      risk,
      order: order++,
      usages: usages.slice().sort((a, b) => {
        const byFile = a.file.localeCompare(b.file);
        return byFile !== 0 ? byFile : a.line - b.line;
      }),
      summary: {
        usageCount: usages.length,
        fileCount: files.size,
      },
    });
  }
  return clusters;
}

function run() {
  const manifest = readManifest();
  const plan = buildClusters(manifest);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return plan;
}

if (require.main === module) {
  const plan = run();
  console.log(`Wrote ${plan.length} clusters to ${path.relative(path.join(__dirname, '..', '..'), OUTPUT)}`);
  for (const c of plan) {
    console.log(
      `  ${c.order}. ${c.type} (risk=${c.risk}) — ${c.summary.usageCount} usages in ${c.summary.fileCount} file(s)`
    );
  }
}

module.exports = { run, INPUT, OUTPUT, buildClusters };
