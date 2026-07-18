# DEMO_SCRIPT — Moment.js → date-fns migration pipeline

**Thesis on camera:** no tests → characterize → plan → migrate incrementally →
flag ambiguity with judgment → evidence dashboard. Not find-and-replace.

**Environment:** Windows / PowerShell, from the repo root. Every beat uses the
real `package.json` scripts (`discovery`, `test`, `migrate`, `triage`,
`dashboard`). Canonical artifacts only: `pipeline/data/manifest.json`,
`pipeline/data/plan.json`, `pipeline/data/migrate.json`,
`pipeline/data/migration-log.json`, `pipeline/data/triage-results.json`.

Dashboard URL (served by beat 5): `http://127.0.0.1:4173/pipeline/report/dashboard.html`

> Setup instructions for teammates (clone / pull / branch / run) are in
> [`README.md`](./README.md).

---

## Beat 0 — Pre-demo prep (NOT filmed): §7.0 TIMEZONE handoff loop

Goal: enter the recording with **one real Codex-driven merge** sitting beside a
**flagged BUG / NEEDS_REVIEW** case, so beats 4–6 show genuine judgment rather
than an all-green run.

Cluster: `TIMEZONE` (`target-repo/services/vendorExports.js`, plus the other
usages listed in `pipeline/data/handoffs/TIMEZONE.md`).

1. Confirm the Codex patch produced from the handoff prompt is present:

```powershell
Test-Path pipeline/data/handoffs/TIMEZONE.patch
```

2. Start from a clean tree, then run the handoff/apply loop through migrate so
   the `TIMEZONE.patch` is applied on its migrate branch and merged:

```powershell
git status --porcelain   # must be empty before migrate runs
npm run migrate
```

3. Verify the evidence the recording depends on:

```powershell
node -e "const m=require('./pipeline/data/migrate.json'); console.log(m.clusters.map(c=>c.clusterId+':'+c.status+'/'+c.coverage).join('\n'))"
```

Expected after prep: `TIMEZONE` shows a real applied/merged status in
`migrate.json` + `migration-log.json`, while at least one cluster remains
`failed` or `pending_external` so triage emits a BUG / NEEDS_REVIEW verdict.
Do **not** film this beat — it only stages the repo state.

<!-- SCREENSHOT: beat-0-timezone-migrate-log (migration-log.json showing the Codex-driven TIMEZONE merge) -->

---

## Beat 1 — The starting point: target-repo, 0% migrated

Narrative: this is a legacy service repo on Moment.js with **no migration done**.
Show the untouched call sites and state the problem: a naive find-and-replace
would silently break locale, timezone, and mutation-dependent code.

```powershell
Get-Content target-repo/services/vendorExports.js
Get-Content target-repo/lib/dates.js
```

Talking point: Moment is legacy/maintenance-mode; date-fns is the target. We
migrate with evidence, not blind edits.

<!-- SCREENSHOT: beat-1-target-repo-moment (a Moment call site in target-repo before migration) -->

---

## Beat 2 — Discovery: classify every usage

Run discovery and open the manifest to show each usage bucketed
(`SIMPLE_FORMAT`, `LOCALE_DEPENDENT`, `TIMEZONE`, `MUTATION_CHAIN`,
`WRAPPED_ERROR_HANDLING`).

```powershell
npm run discovery
Get-Content pipeline/data/manifest.json
```

Talking point: awkward sites are detected, not guessed —
`normalizeBusinessDate` → LOCALE_DEPENDENT, `formatVendorFiscalPeriod` →
TIMEZONE, `shiftSharedWindow` → MUTATION_CHAIN.

<!-- SCREENSHOT: beat-2-manifest-classifications (manifest.json with the classified buckets) -->

---

## Beat 3 — Characterize baseline is green

Show that the existing characterization suite passes **before** we touch
anything — this is the safety net that lets us migrate incrementally.

```powershell
npm test
```

Talking point: green baseline = behavior is pinned. Note explicitly that we do
**not** re-characterize the awkward sites — they are intentionally unguarded /
indirectly covered, which is exactly what triage will flag later.

<!-- SCREENSHOT: beat-3-characterize-green (npm test passing summary) -->

---

## Beat 4 — Migrate + triage (with a live failure)

First the honest happy path: run migrate, then triage to produce verdicts.

```powershell
npm run migrate
npm run triage
Get-Content pipeline/data/triage-results.json
```

Then the **failure-on-camera** — force a cluster to fail so the rollback and
guardrails are visible live:

```powershell
$env:MIGRATE_FORCE_FAIL='SIMPLE_FORMAT'; npm run migrate
Remove-Item Env:\MIGRATE_FORCE_FAIL
```

Talking point: the pipeline prints the rollback command and leaves the base
tree clean on failure — incremental and reversible, never a bulk rewrite.
Triage writes only `triage-results.json` with `OK | BUG | NEEDS_REVIEW`.

<!-- SCREENSHOT: beat-4-force-fail-rollback (migrate printing rollback on the forced SIMPLE_FORMAT failure) -->
<!-- SCREENSHOT: beat-4-triage-verdicts (triage-results.json verdicts) -->

---

## Beat 5 — Evidence dashboard: summary + one clean migration

Serve the consolidated dashboard and walk the summary bar, then open one clean
(OK) migration to show its before/after diff.

```powershell
npm run dashboard
```

Open `http://127.0.0.1:4173/pipeline/report/dashboard.html`. Walk the summary
panel (counts of migrated / failed / pending / skipped), then click a cleanly
migrated cluster and read its before/after diff sourced from `migrate.json`.

Talking point: every number is backed by a real JSON artifact — no placeholder
rows. If a file is missing the panel shows an explicit load error.

<!-- SCREENSHOT: beat-5-dashboard-summary (dashboard summary bar + cluster table) -->
<!-- SCREENSHOT: beat-5-clean-migration-diff (before/after diff of a clean OK migration) -->

---

## Beat 6 — The judgment climax: flagged BUG / NEEDS_REVIEW

Click the flagged cluster (BUG or NEEDS_REVIEW) in the dashboard and read the
rationale aloud — this is the point of the whole pipeline.

Talking point: the tool doesn't pretend an ambiguous or failing migration is
safe. It flags it, cites the coverage/status evidence (e.g. indirect coverage,
forced/real failure, unguarded site), and hands a reviewer a rationale instead
of a silent bad diff. That's judgment, not find-and-replace.

<!-- SCREENSHOT: beat-6-flagged-rationale (dashboard panel showing the BUG/NEEDS_REVIEW rationale) -->

---

## Post-demo reset (not filmed)

Return the worktree to a clean state after rehearsal/filming:

```powershell
Remove-Item Env:\MIGRATE_FORCE_FAIL -ErrorAction SilentlyContinue
git status
```

Leave `master` untouched; never force-push. Re-run Beat 0 before each take.
