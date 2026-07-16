# Demo Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Moment → date-fns migration pipeline demo-ready via awkward call sites, migrate guardrails (coverage resolution, handoff loop, force-fail), and a consolidated report dashboard with DEMO_SCRIPT.md — shipped as two stacked PRs.

**Architecture:** Discovery classifies three new organic awkward sites into existing buckets (LOCALE_DEPENDENT / TIMEZONE / MUTATION_CHAIN). Planner refreshes clusters. Migrate orchestrates per-cluster git branches: SIMPLE_FORMAT gets an in-repo codemod; other clusters write Codex handoff `.md` prompts and optionally `git apply` `.patch` files on a later run. Coverage resolution distinguishes direct / indirect / unguarded. Artifacts (`migration-log.json`, `migrate.json`, later `triage-results.json`) feed a single dashboard under `pipeline/report/`.

**Tech Stack:** Node.js (CommonJS), `@babel/parser` AST walk, Jest (characterize + unit tests), vanilla HTML/JS dashboard, git CLI for migrate branches.

## Global Constraints

- Base branch: `PIPELINE_BASE_BRANCH` env, default `master` — do not rename master → main.
- No dual dashboards — single entry at `pipeline/report/dashboard.html` after PR2.
- Do **not** rerun characterize / add fixtures for the three new awkward sites.
- Canonical artifacts: `pipeline/data/triage-results.json`, `pipeline/data/migration-log.json` (no dual-write aliases to old names).
- Handoff only — do not implement Codex inside migrate; `.md` / `.patch` files only.
- Max ~250 lines per new/modified module; split migrate into focused files.
- UI ≠ business logic ≠ data access — keep git ops, coverage, transform, and log append as separate modules.
- Repo under study: `target-repo` (primary). Do not regenerate control-repo baselines.
- Work ships as **PR1 then PR2 stacked on master**; do not open PRs until the user requests.
- Author commits with env vars only (do not update git config): `GIT_AUTHOR_NAME/EMAIL` and `GIT_COMMITTER_NAME/EMAIL` = `control-repo` / `control@local`.

---

## File map

### PR1 — Pipeline hardening (Steps 2+3)

| File | Responsibility |
|------|----------------|
| `target-repo/lib/dates.js` | Add `normalizeBusinessDate` (LOCALE_DEPENDENT) |
| `target-repo/services/invoices.js` | Call `normalizeBusinessDate` from invoice path |
| `target-repo/services/reporting.js` | Call `normalizeBusinessDate` from reporting path |
| `target-repo/services/vendorExports.js` | New unguarded TIMEZONE site |
| `target-repo/services/scheduler.js` | Mutation-aliasing MUTATION_CHAIN site |
| `pipeline/discovery/classify.js` | Ensure rules tag the three sites correctly |
| `pipeline/discovery/collectUsages.js` | Fix AST context if locale/mutation not detected |
| `pipeline/data/manifest.json` | Refresh via `npm run discovery` |
| `pipeline/data/plan.json` | Refresh via `npm run planner` |
| `pipeline/migrate/gitOps.js` | Branch create/checkout, commit, merge, rollback print |
| `pipeline/migrate/log.js` | Append + summarize `migration-log.json` |
| `pipeline/migrate/coverage.js` | §4.3a direct / indirect / skipped_unguarded |
| `pipeline/migrate/simpleFormat.js` | Mechanical SIMPLE_FORMAT codemod |
| `pipeline/migrate/handoff.js` | Write `.md`; apply `.patch` when present |
| `pipeline/migrate/index.js` | Per-cluster orchestrator + `MIGRATE_FORCE_FAIL` |
| `pipeline/data/handoffs/` | External Codex prompts + patches |
| `pipeline/data/migration-log.json` | Append-only migrate audit log |
| `pipeline/data/migrate.json` | Per-cluster status + diffs + coverage flags |
| `pipeline/migrate/__tests__/*.test.js` | Unit tests for log, coverage, git helpers, handoff |

### PR2 — Demo surface (Steps 4+5), stacked on PR1

| File | Responsibility |
|------|----------------|
| `pipeline/triage/index.js` | Emit `triage-results.json` (verdicts + rationales) |
| `pipeline/data/triage-results.json` | Canonical triage output |
| `pipeline/report/dashboard.html` | Single SPA shell |
| `pipeline/report/dashboard.js` | Fetch + render four panels |
| `pipeline/report/styles.css` | Dashboard styles (moved/extended) |
| `pipeline/report/server.js` | Static server serving report + data |
| `pipeline/dashboard/*` | Retire / redirect after move |
| `DEMO_SCRIPT.md` | Six beats + §7.0 pre-demo prep |
| `package.json` | Point `dashboard` script at report server |

---

## PR1 / Pipeline hardening

### Task 1: Awkward site — `normalizeBusinessDate` (LOCALE_DEPENDENT)

**Files:**
- Modify: `target-repo/lib/dates.js`
- Modify: `target-repo/services/invoices.js`
- Modify: `target-repo/services/reporting.js`
- Test: discovery classify after Task 3 (no new characterize tests)

**Interfaces:**
- Produces: `normalizeBusinessDate(value, options)` exported from `lib/dates.js`; callers in invoices + reporting

- [ ] **Step 1: Add `normalizeBusinessDate` to `lib/dates.js`**

```js
function normalizeBusinessDate(value, options) {
  options = options || {};
  var loc = options.locale || config.defaultLocale;
  var m = moment(value);
  if (!m.isValid()) {
    return null;
  }
  if (options.startOfDay) {
    m.startOf('day');
  } else if (options.endOfDay) {
    m.endOf('day');
  }
  // Locale-sensitive formatting — discovery must classify LOCALE_DEPENDENT
  return m.locale(loc).format(options.format || 'LL');
}
```

Export it alongside existing helpers. Do **not** add characterize fixtures/tests.

- [ ] **Step 2: Wire invoice + reporting callers**

In `invoices.js` (e.g. inside `parseInvoiceDate` or a nearby helper path that existing characterize already exercises via `parseInvoiceDate` / `agingBucket`):

```js
businessDate: dates.normalizeBusinessDate(parsed.toISOString(), {
  locale: config.defaultLocale,
  startOfDay: true,
}),
```

In `reporting.js` (inside `buildWarehouseDigest`, which already has characterize coverage):

```js
periodLabel: dates.normalizeBusinessDate(when, {
  locale: locale,
  format: 'LL',
}),
```

This gives **indirect** coverage only (§4.3a) — no direct test named for `normalizeBusinessDate`.

- [ ] **Step 3: Commit**

```bash
git add target-repo/lib/dates.js target-repo/services/invoices.js target-repo/services/reporting.js
git commit -m "Add ambiguous normalizeBusinessDate shared by invoice and reporting."
```

---

### Task 2: Awkward sites — TIMEZONE vendor export + MUTATION_CHAIN aliasing

**Files:**
- Create: `target-repo/services/vendorExports.js`
- Modify: `target-repo/services/scheduler.js`
- Test: discovery after Task 3

**Interfaces:**
- Produces: `formatVendorFiscalPeriod(raw, timezone)` in vendorExports (no callers in sample jobs)
- Produces: aliasing helper or inline mutation-alias path in scheduler

- [ ] **Step 1: Create `vendorExports.js` (unguarded TIMEZONE)**

```js
var moment = require('moment');

/**
 * Quarterly vendor CSV helper — rarely touched; not wired into nightly jobs.
 * Fiscal periods are stored as UTC wall times from the vendor portal.
 */
function formatVendorFiscalPeriod(raw, timezone) {
  var tz = timezone || 'UTC';
  // Force TIMEZONE classification via utc + offset-style conversion
  var start = moment.utc(raw);
  if (!start.isValid()) {
    return null;
  }
  return {
    timezone: tz,
    periodStartUtc: start.toISOString(),
    periodLabel: start.utc().format('YYYY-[Q]Q'),
    vendorStamp: start.utc().format('YYYY-MM-DD HH:mm:ss[Z]'),
  };
}

module.exports = {
  formatVendorFiscalPeriod: formatVendorFiscalPeriod,
};
```

Do **not** require it from `index.js` or add tests.

- [ ] **Step 2: Add mutation aliasing in `scheduler.js`**

Add a function that shares one Moment instance across two aliases, mutates via one name, reads via the other (so dropping the return of an immutable transform breaks later reads):

```js
function shiftSharedWindow(anchor, hours) {
  var shared = moment(anchor);
  var alias = shared; // intentional alias — naïve immutable rewrite breaks this
  alias.add(hours, 'hours');
  return {
    shiftedIso: shared.toISOString(),
    display: dates.formatLong(shared),
  };
}
```

Export `shiftSharedWindow`. Do **not** add characterize tests for it.

- [ ] **Step 3: Commit**

```bash
git add target-repo/services/vendorExports.js target-repo/services/scheduler.js
git commit -m "Add unguarded TIMEZONE vendor export and mutation-alias scheduler path."
```

---

### Task 3: Discovery classifier fixes + refresh (must match §3.4)

**Files:**
- Modify: `pipeline/discovery/classify.js` and/or `pipeline/discovery/collectUsages.js` (only if needed)
- Modify: `pipeline/data/manifest.json`, `pipeline/data/plan.json` (via commands)
- Test: `pipeline/discovery/__tests__/classifyAwkwardSites.test.js` (create)

**Interfaces:**
- Consumes: awkward sites from Tasks 1–2
- Produces: manifest entries with classifications per §3.4 table

**§3.4 required mapping (gate for "Step 2 done"):**

| Site | File | Bucket |
|------|------|--------|
| `normalizeBusinessDate` | `lib/dates.js` | `LOCALE_DEPENDENT` |
| `formatVendorFiscalPeriod` | `services/vendorExports.js` | `TIMEZONE` |
| `shiftSharedWindow` (aliasing) | `services/scheduler.js` | `MUTATION_CHAIN` |

If discovery cannot tag `normalizeBusinessDate` as `LOCALE_DEPENDENT`, fix discovery before marking this task done — do not paper over in the dashboard.

- [ ] **Step 1: Write failing discovery assertion test**

Create `pipeline/discovery/__tests__/classifyAwkwardSites.test.js`:

```js
const path = require('path');
const fs = require('fs');
const { collectUsages } = require('../collectUsages');

function usagesFor(relFile) {
  const abs = path.join(__dirname, '..', '..', '..', relFile);
  const code = fs.readFileSync(abs, 'utf8');
  return collectUsages(code, relFile.replace(/\\/g, '/'));
}

test('normalizeBusinessDate usages are LOCALE_DEPENDENT', () => {
  const usages = usagesFor('target-repo/lib/dates.js');
  const hits = usages.filter((u) => u.surroundingFunction === 'normalizeBusinessDate');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((u) => u.classification === 'LOCALE_DEPENDENT')).toBe(true);
});

test('vendorExports usages are TIMEZONE', () => {
  const usages = usagesFor('target-repo/services/vendorExports.js');
  expect(usages.length).toBeGreaterThan(0);
  expect(usages.every((u) => u.classification === 'TIMEZONE')).toBe(true);
});

test('shiftSharedWindow mutation alias is MUTATION_CHAIN', () => {
  const usages = usagesFor('target-repo/services/scheduler.js');
  const hits = usages.filter((u) => u.surroundingFunction === 'shiftSharedWindow');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.some((u) => u.classification === 'MUTATION_CHAIN')).toBe(true);
});
```

- [ ] **Step 2: Run test — expect fail if classifiers miss**

```bash
npx jest pipeline/discovery/__tests__/classifyAwkwardSites.test.js --ci
```

Expected: FAIL on any misclassified function.

- [ ] **Step 3: Fix discovery until tests pass**

Likely fixes (apply only what fails):

- Ensure `.locale(...)` in a chain sets `chainMethods` / `LOCALE_DEPENDENT` (already in `CALL_RULES`).
- Ensure `moment.utc(...)` sets `staticMethod === 'utc'` → TIMEZONE.
- Ensure `.add` on aliased moment values still marks `MUTATION_CHAIN` / `isMutationCall`.

- [ ] **Step 4: Re-run discovery tests — expect PASS**

```bash
npx jest pipeline/discovery/__tests__/classifyAwkwardSites.test.js --ci
```

- [ ] **Step 5: Refresh manifest + plan (do NOT run characterize)**

```bash
npm run discovery
npm run planner
```

Verify `pipeline/data/manifest.json` contains the three sites with the §3.4 buckets, and `plan.json` has them under those clusters.

- [ ] **Step 6: Commit**

```bash
git add pipeline/discovery pipeline/data/manifest.json pipeline/data/plan.json
git commit -m "Fix discovery classifiers for awkward sites and refresh plan."
```

---

### Task 4: Migration log + git ops helpers

**Files:**
- Create: `pipeline/migrate/log.js`
- Create: `pipeline/migrate/gitOps.js`
- Create: `pipeline/migrate/__tests__/log.test.js`
- Create: `pipeline/migrate/__tests__/gitOps.test.js`

**Interfaces:**
- Produces: `appendEntry(logPath, entry)`, `emptyLog(baseBranch)`, `summarize(log)`
- Produces: `baseBranch()`, `branchName(clusterId)`, `ensureCleanTree()`, `createBranch(clusterId)`, `commitMigration(clusterId)`, `mergeToBase(clusterId)`, `printRollback(clusterId)`

- [ ] **Step 1: Write failing log tests**

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { emptyLog, appendEntry, summarize } = require('../log');

test('appendEntry writes entry and updates summary counts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'miglog-'));
  const file = path.join(dir, 'migration-log.json');
  fs.writeFileSync(file, JSON.stringify(emptyLog('master')));
  appendEntry(file, {
    timestamp: '2026-07-16T00:00:00.000Z',
    clusterId: 'SIMPLE_FORMAT',
    branch: 'migrate/SIMPLE_FORMAT',
    action: 'merge',
    status: 'ok',
    detail: 'merged',
  });
  const log = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(log.entries).toHaveLength(1);
  expect(log.summary.migrated).toBe(1);
});
```

- [ ] **Step 2: Implement `log.js` to match the spec shape**

`emptyLog(baseBranch)` → `{ baseBranch, entries: [], summary: { migrated: 0, failed: 0, pendingExternal: 0 } }`.

`appendEntry` increments summary based on `action`/`status` (`merge`+`ok` → migrated; `rollback_printed` → failed; `handoff_written` with pending → pendingExternal).

- [ ] **Step 3: Write gitOps unit tests (mock spawn or test pure helpers)**

```js
const { branchName, baseBranch } = require('../gitOps');

test('branchName prefixes migrate/', () => {
  expect(branchName('SIMPLE_FORMAT')).toBe('migrate/SIMPLE_FORMAT');
});

test('baseBranch defaults to master', () => {
  const prev = process.env.PIPELINE_BASE_BRANCH;
  delete process.env.PIPELINE_BASE_BRANCH;
  expect(baseBranch()).toBe('master');
  process.env.PIPELINE_BASE_BRANCH = prev;
});
```

- [ ] **Step 4: Implement `gitOps.js`**

Use `child_process.spawnSync('git', ...)` with `cwd` = workspace root. `printRollback` logs:

`git checkout <base> && git branch -D migrate/<cluster-id>`

`ensureCleanTree` aborts if `git status --porcelain` is non-empty.

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest pipeline/migrate/__tests__/log.test.js pipeline/migrate/__tests__/gitOps.test.js --ci
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/migrate/log.js pipeline/migrate/gitOps.js pipeline/migrate/__tests__
git commit -m "Add migrate log append and git branch helpers."
```

---

### Task 5: Coverage resolution (§4.3a)

**Files:**
- Create: `pipeline/migrate/coverage.js`
- Create: `pipeline/migrate/__tests__/coverage.test.js`

**Interfaces:**
- Consumes: plan cluster `usages[]`, list of characterize test basenames under `pipeline/characterize/tests/`
- Produces: `resolveCoverage(usages, testIndex) → { level: 'direct'|'indirect'|'none', tests: '…', testFiles: string[] }`

Resolution order:

1. **Direct** — test exists for exact `surroundingFunction` / file (e.g. `dates.formatLong.test.js` for `formatLong`).
2. **Indirect** — one-level caller graph: a known caller of that function has a characterize test (e.g. `normalizeBusinessDate` called from `parseInvoiceDate` / `buildWarehouseDigest`). Mark `tests: 'indirect_coverage'`.
3. **None** — `skipped_unguarded` (vendorExports).

Caller graph for indirect matches: build from target-repo requires of `dates.normalizeBusinessDate` (static map is OK if derived by scanning `require('../lib/dates')` call sites for `.normalizeBusinessDate(` — data-driven scan, not a hardcoded string rule table of business cases).

- [ ] **Step 1: Write failing coverage tests**

```js
const { resolveCoverage, buildCallerIndex } = require('../coverage');

test('direct match for formatLong', () => {
  const r = resolveCoverage(
    [{ file: 'target-repo/lib/dates.js', surroundingFunction: 'formatLong' }],
    { 'formatLong@target-repo/lib/dates.js': ['pipeline/characterize/tests/dates.formatLong.test.js'] }
  );
  expect(r.level).toBe('direct');
});

test('indirect match for normalizeBusinessDate via invoice caller', () => {
  const callers = {
    'normalizeBusinessDate@target-repo/lib/dates.js': [
      'parseInvoiceDate@target-repo/services/invoices.js',
    ],
  };
  const tests = {
    'parseInvoiceDate@target-repo/services/invoices.js': [
      'pipeline/characterize/tests/invoices.parseInvoiceDate.test.js',
    ],
  };
  const r = resolveCoverage(
    [{ file: 'target-repo/lib/dates.js', surroundingFunction: 'normalizeBusinessDate' }],
    tests,
    callers
  );
  expect(r.level).toBe('indirect');
  expect(r.tests).toBe('indirect_coverage');
});

test('no match is skipped_unguarded', () => {
  const r = resolveCoverage(
    [{ file: 'target-repo/services/vendorExports.js', surroundingFunction: 'formatVendorFiscalPeriod' }],
    {},
    {}
  );
  expect(r.level).toBe('none');
  expect(r.tests).toBe('skipped_unguarded');
});
```

- [ ] **Step 2: Implement `coverage.js` until tests pass**

- [ ] **Step 3: Commit**

```bash
git add pipeline/migrate/coverage.js pipeline/migrate/__tests__/coverage.test.js
git commit -m "Add coverage resolution for direct, indirect, and unguarded sites."
```

---

### Task 6: SIMPLE_FORMAT codemod

**Files:**
- Create: `pipeline/migrate/simpleFormat.js`
- Create: `pipeline/migrate/__tests__/simpleFormat.test.js`

**Interfaces:**
- Produces: `transformSource(code) → { code, changes }` — rewrite `moment(x).format('…')` plain patterns to `date-fns` `format` where the Moment token set is a known safe map; leave risky tokens alone or record for triage later
- Consumes: file contents for SIMPLE_FORMAT cluster usages only

- [ ] **Step 1: Write failing transform test**

```js
const { transformSource } = require('../simpleFormat');

test('rewrites plain moment().format YYYY-MM-DD', () => {
  const input = "return moment(date).format('YYYY-MM-DD');";
  const { code, changes } = transformSource(input);
  expect(changes).toBeGreaterThan(0);
  expect(code).toContain("format(");
  expect(code).toContain('yyyy-MM-dd');
});
```

- [ ] **Step 2: Implement minimal AST or regex-safe rewrite for SIMPLE_FORMAT patterns**

Prefer `@babel/parser` + generator, or a focused string rewrite limited to `.format('TOKEN')` with an explicit token map (`YYYY→yyyy`, `DD→dd`, `MM→MM`, etc.). Ensure `require('date-fns')` / `{ format }` import is added when changes > 0 and missing.

- [ ] **Step 3: Run test — PASS; commit**

```bash
npx jest pipeline/migrate/__tests__/simpleFormat.test.js --ci
git add pipeline/migrate/simpleFormat.js pipeline/migrate/__tests__/simpleFormat.test.js
git commit -m "Add SIMPLE_FORMAT mechanical format codemod."
```

---

### Task 7: Handoff `.md` / `.patch` loop (§4.4)

**Files:**
- Create: `pipeline/migrate/handoff.js`
- Create: `pipeline/migrate/__tests__/handoff.test.js`
- Create: `pipeline/data/handoffs/.gitkeep` (directory)

**Interfaces:**
- Produces: `handoffPaths(clusterId) → { md, patch }`
- Produces: `ensureHandoffPrompt(clusterId, cluster) → 'written'|'exists'`
- Produces: `applyHandoffPatch(clusterId, cwd) → 'applied'|'missing'`

Loop behavior:

1. If no `.patch`, write `.md` Codex prompt (if missing); return `pending_external`.
2. If `.patch` exists, `git apply` it on the migrate branch; then test gate.

- [ ] **Step 1: Write failing handoff tests** using temp dirs

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureHandoffPrompt, applyHandoffPatch, handoffPaths } = require('../handoff');

test('writes md when missing and leaves pending when no patch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  const dir = path.join(root, 'handoffs');
  fs.mkdirSync(dir);
  const status = ensureHandoffPrompt('TIMEZONE', { type: 'TIMEZONE', usages: [] }, dir);
  expect(status).toBe('written');
  expect(fs.existsSync(path.join(dir, 'TIMEZONE.md'))).toBe(true);
  expect(applyHandoffPatch('TIMEZONE', dir, root)).toBe('missing');
});
```

- [ ] **Step 2: Implement `handoff.js`**

Prompt content must include cluster type, file:line usages, target library `date-fns`, and instruction to emit a unified diff saved as `<cluster-id>.patch`.

Use `spawnSync('git', ['apply', patchPath], { cwd })` when applying.

- [ ] **Step 3: Run tests — PASS; commit**

```bash
npx jest pipeline/migrate/__tests__/handoff.test.js --ci
git add pipeline/migrate/handoff.js pipeline/migrate/__tests__/handoff.test.js pipeline/data/handoffs
git commit -m "Add Codex handoff prompt writer and patch apply helper."
```

---

### Task 8: Migrate orchestrator + `MIGRATE_FORCE_FAIL` + `migrate.json`

**Files:**
- Modify: `pipeline/migrate/index.js`
- Create: `pipeline/migrate/__tests__/orchestrator.test.js` (unit-test control flow with injected deps where practical)
- Writes: `pipeline/data/migrate.json`, `pipeline/data/migration-log.json`

**Interfaces:**
- Consumes: `plan.json`, coverage, simpleFormat, handoff, gitOps, log, `runJest` from characterize
- Env: `PIPELINE_BASE_BRANCH`, `MIGRATE_FORCE_FAIL=<cluster-id>`
- Produces: `migrate.json` entries with `coverage: 'direct'|'indirect'|'none'`, status, before/after snippets, log entry ids

**Per-cluster loop (implement exactly):**

1. Abort if no `plan.json` or unclean tree.
2. `createBranch(clusterId)` from base.
3. If `SIMPLE_FORMAT` → `simpleFormat` transform on cluster files; else handoff ensure/apply.
4. Resolve coverage (§4.3a). If `none` → log `skipped_unguarded`, do **not** merge; continue.
5. If `MIGRATE_FORCE_FAIL === clusterId` → treat tests as failed (log `force_fail`).
6. Else run intersecting characterize tests with `TZ=UTC`.
7. Pass → commit + merge + log success. Fail → print rollback, leave base clean, log failure.
8. Non-SIMPLE without patch → `pending_external`, no merge, next cluster.

- [ ] **Step 1: Replace stub `index.js` with orchestrator wiring the modules from Tasks 4–7**

Keep `index.js` under 250 lines by delegating.

`migrate.json` shape (canonical for dashboard):

```json
{
  "stage": "migrate",
  "timestamp": "ISO-8601",
  "baseBranch": "master",
  "clusters": [
    {
      "clusterId": "SIMPLE_FORMAT",
      "status": "migrated" | "failed" | "pending_external" | "skipped_unguarded",
      "coverage": "direct" | "indirect" | "none",
      "tests": "direct" | "indirect_coverage" | "skipped_unguarded" | "failed",
      "files": [{ "path": "…", "before": "…", "after": "…" }],
      "logEntryIds": [0, 1]
    }
  ],
  "summary": { "migrated": 0, "failed": 0, "pendingExternal": 0, "skippedUnguarded": 0 }
}
```

- [ ] **Step 2: Unit-test force-fail path and unguarded skip with mocked git/jest**

```js
test('MIGRATE_FORCE_FAIL marks cluster failed without merging', () => {
  // inject fake gitOps + runTests; set env; assert printRollback called and merge not called
});
```

- [ ] **Step 3: Manual/integration checklist (document in commit body if not automatable)**

On a clean tree:

```bash
npm run migrate
```

Expect: SIMPLE_FORMAT may merge; TIMEZONE without patch → pending_external / skipped_unguarded as appropriate; log file present; base branch clean after any failure.

Force-fail dry run:

```bash
MIGRATE_FORCE_FAIL=SIMPLE_FORMAT npm run migrate
```

Expect: rollback command printed; base unchanged.

- [ ] **Step 4: Commit**

```bash
git add pipeline/migrate/index.js pipeline/migrate/__tests__/orchestrator.test.js pipeline/data/migrate.json pipeline/data/migration-log.json
git commit -m "Implement migrate orchestrator with force-fail and migrate.json."
```

---

### Task 9: PR1 self-check gate

- [ ] **Step 1: Confirm §3.4 classifications in refreshed manifest**
- [ ] **Step 2: Confirm normalizeBusinessDate is indirect, vendorExports is skipped_unguarded**
- [ ] **Step 3: Confirm handoff writes `pipeline/data/handoffs/<id>.md` and applies `.patch` when present**
- [ ] **Step 4: Confirm no characterize tests were added for the three awkward sites**
- [ ] **Step 5: Update `issues_log.txt` if any issues were resolved during PR1 work**

Stop here for PR1 review. Do **not** open a GitHub PR unless the user asks.

---

## PR2 / Demo surface (stacked on PR1)

### Task 10: Triage → `triage-results.json`

**Files:**
- Modify: `pipeline/triage/index.js`
- Create: `pipeline/triage/__tests__/triage.test.js`
- Writes: `pipeline/data/triage-results.json`
- Delete / stop writing: `pipeline/data/triage.json` (no dual-write)

**Interfaces:**
- Consumes: `migrate.json` (+ optional handoff notes)
- Produces: per-cluster/site `verdict: 'OK'|'BUG'|'NEEDS_REVIEW'` + `rationale`

Verdict rules (data-driven from migrate coverage/status — not hardcoded site names):

- `status === 'migrated'` && `coverage === 'direct'` → `OK`
- `coverage === 'indirect'` → `NEEDS_REVIEW` (weaker evidence) with rationale citing indirect coverage
- `status === 'failed'` → `BUG` with test summary rationale
- `skipped_unguarded` / `pending_external` → `NEEDS_REVIEW`

Reuse the existing flagged Moment `Do` → date-fns token rationale from `migrations.json` as seed content for a SIMPLE_FORMAT BUG case when migrate metadata indicates a format-token mismatch, or when force-fail / real failure is present.

- [ ] **Step 1: Write failing triage test** for output path + verdict mapping
- [ ] **Step 2: Implement triage writing only `triage-results.json`**
- [ ] **Step 3: Run tests — PASS; commit**

```bash
git commit -m "Emit triage-results.json with OK/BUG/NEEDS_REVIEW verdicts."
```

---

### Task 11: Consolidate dashboard under `pipeline/report/`

**Files:**
- Create/move: `pipeline/report/dashboard.html`, `dashboard.js`, `styles.css`, `server.js`
- Modify: `package.json` (`"dashboard": "node pipeline/report/server.js"`)
- Retire: `pipeline/dashboard/` (delete after move, or leave a one-line redirect HTML that points to `/pipeline/report/dashboard.html`)

**Interfaces:**
- Fetches: `../data/manifest.json`, `plan.json`, `migration-log.json`, `triage-results.json`
- Panels: summary bar; cluster table; click → before/after diff from migrate.json; highlighted BUG/NEEDS_REVIEW with rationale
- No placeholder/fake rows — show explicit load error if a JSON file is missing

- [ ] **Step 1: Move/adapt existing dashboard UI to consume the four canonical files**
- [ ] **Step 2: Point server root routes at `/pipeline/report/dashboard.html`**
- [ ] **Step 3: Manual verify**

```bash
npm run dashboard
```

Open `http://127.0.0.1:4173/pipeline/report/dashboard.html` — confirm all panels populate from real JSON (or show load errors).

- [ ] **Step 4: Commit**

```bash
git commit -m "Consolidate demo dashboard under pipeline/report."
```

---

### Task 12: `DEMO_SCRIPT.md` + §7.0 pre-demo prep

**Files:**
- Create: `DEMO_SCRIPT.md` (repo root)

**Content requirements:**

1. **§7.0 Pre-demo prep (not filmed):** Run the §4.4 handoff loop for at least one non-SIMPLE_FORMAT cluster — recommend **TIMEZONE** (`services/vendorExports.js`): write/apply `pipeline/data/handoffs/TIMEZONE.patch` via external Codex, re-run `npm run migrate` so the recording has one real Codex-driven merge beside a flagged BUG/NEEDS_REVIEW case.
2. Six numbered beats with real commands:
   1. Show target-repo, 0% migrated narrative
   2. `npm run discovery` → show `manifest.json`
   3. Characterize baseline green (`npm test` / existing characterize commands)
   4. `npm run migrate` + `npm run triage`
   5. Open `pipeline/report/dashboard.html`; walk summary + one clean migration
   6. Click flagged BUG/NEEDS_REVIEW; read rationale
3. Screenshot slots: `<!-- SCREENSHOT: beat-N-... -->`

- [ ] **Step 1: Write `DEMO_SCRIPT.md`**
- [ ] **Step 2: Commit**

```bash
git add DEMO_SCRIPT.md
git commit -m "Add DEMO_SCRIPT with pre-demo TIMEZONE handoff prep."
```

---

### Task 13: PR2 self-check gate

- [ ] Single dashboard entry only (`pipeline/report/…`)
- [ ] `triage-results.json` exists; no dual-write to `triage.json`
- [ ] DEMO_SCRIPT includes §7.0 TIMEZONE handoff prep
- [ ] Update `issues_log.txt` for any PR2 issues resolved
- [ ] Do **not** open PRs until the user requests

---

## Spec coverage checklist (self-review)

| Spec requirement | Task(s) |
|------------------|---------|
| Awkward sites 3.1–3.3 | 1–2 |
| Classification mapping §3.4 + discovery must-classify | 3 |
| No characterize for awkward sites | 1–2, 9 |
| Per-cluster migrate loop | 8 |
| Coverage resolution §4.3a | 5, 8 |
| Handoff `.md`/`.patch` §4.4 | 7–8 |
| `MIGRATE_FORCE_FAIL` | 8 |
| `migration-log.json` / `migrate.json` | 4, 8 |
| `PIPELINE_BASE_BRANCH` default master | 4, Global Constraints |
| `triage-results.json` | 10 |
| Dashboard under `pipeline/report/` | 11 |
| DEMO_SCRIPT + §7.0 TIMEZONE prep | 12 |
| PR1 then PR2 stacked; no premature PR open | 9, 13 |

## Execution notes

- Implement PR1 tasks (1–9) fully before starting PR2 (10–13).
- Prefer subagent-driven-development: one task per subagent, review between tasks.
- When the user later asks for PRs: PR1 = pipeline hardening (Steps 2+3); PR2 = demo surface (Steps 4+5) stacked on PR1. Do not create branches/PRs in this planning phase.
