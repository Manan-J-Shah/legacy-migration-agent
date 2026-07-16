# Team workstreams — Moment → date-fns migration demo

**Who this is for:** all four teammates (with or without Cursor).  
**Cursor-only canvas:** `~/.cursor/projects/.../canvases/team-workstreams.canvas.tsx` (optional).  
**Shareable copies in this repo:**

| Format | Path | How to open |
|--------|------|-------------|
| Markdown (checklists) | [`docs/TEAM_WORKSTREAMS.md`](./TEAM_WORKSTREAMS.md) | GitHub / any editor |
| HTML (visual overview) | [`docs/team-workstreams.html`](./team-workstreams.html) | Double-click, or open in Chrome/Edge/Firefox |

**Thesis:** no tests → characterize → plan → migrate incrementally → flag ambiguity with judgment → evidence dashboard. Not find-and-replace.

**Phase:** PR1 done-ish on `pr1-pipeline-hardening` → finish PR2 + film.

---

## Shared milestones (critical path)

| # | Milestone | What “done” looks like | Owner | Gate |
|---|-----------|------------------------|-------|------|
| 1 | GitHub push | Local work on remote; teammates can pull | A + all | Next |
| 2 | PR1 merge | `pr1-pipeline-hardening` → `master` | A | Review |
| 3 | Pre-seed Codex | §7.0 TIMEZONE `.patch` apply + migrate merge | B | After PR1 on master |
| 4 | Triage artifacts | `triage-results.json` with OK / BUG / NEEDS_REVIEW | B | After migrate evidence |
| 5 | Dashboard | `pipeline/report/dashboard.html` four panels | C | Needs triage + migrate JSON |
| 6 | Demo script | `DEMO_SCRIPT.md` six beats + beat 0 prep | D | Parallel once paths known |
| 7 | Rehearsal | Full dry-run with force-fail + flagged panel | All (D leads) | After 3–6 |
| 8 | Film | Recorded end-to-end thesis demo | D + cast | After rehearsal green |

---

## Person A — Pipeline / migrate owner

**Role:** PR1 finisher + base-branch hygiene  
**Mission:** Prove incremental, guarded migration: mechanical `SIMPLE_FORMAT`, force-fail rollback, stable artifact schemas.  
**Branch:** `pr1-pipeline-hardening` → merge to `master`; then stay on `master` for schema freeze  
**Depends on:** None to start. Unblocks B, C, D.  
**Out of scope:** Do not rewrite triage → `triage-results.json`. Do not move dashboard to `report/`. Do not author `DEMO_SCRIPT.md`. Do not invent Codex patches.

### Definition of Done

- [ ] PR1 branch green: migrate modules + unit tests
- [ ] Schemas frozen: `migration-log.json` + `migrate.json` shapes documented
- [ ] `master` updated after PR1 merge; no force-push
- [ ] FORCE_FAIL path verified: `MIGRATE_FORCE_FAIL=<id> npm run migrate`

### Start → end checklist

- [x] **VERIFY:** awkward sites — `lib/dates.js` `normalizeBusinessDate`, `services/vendorExports.js`, `scheduler.js` `shiftSharedWindow`
- [x] **VERIFY:** `npm run discovery` + planner; §3.4 buckets LOCALE_DEPENDENT / TIMEZONE / MUTATION_CHAIN
- [x] **VERIFY:** `pipeline/migrate/{gitOps,log,coverage,simpleFormat,handoff,clusterLoop,index}.js` + tests
- [x] **VERIFY:** handoffs `*.md` for TIMEZONE, LOCALE_DEPENDENT, MUTATION_CHAIN, WRAPPED_ERROR_HANDLING (no `.patch` yet)
- [ ] **VERIFY:** `migrate.json` + `migration-log.json`; re-run on clean tree if needed
- [ ] Stabilise SIMPLE_FORMAT: `npx jest pipeline/migrate/__tests__/simpleFormat.test.js --ci`
- [ ] Filmable force-fail: `MIGRATE_FORCE_FAIL=SIMPLE_FORMAT npm run migrate` → rollback printed, base clean
- [ ] Self-check: no characterize tests for awkward sites; coverage indirect vs skipped_unguarded
- [ ] Merge `pr1-pipeline-hardening` → `master` when team agrees; announce schema freeze
- [ ] Protect contracts: no drive-by renames of migrate/log fields after merge
- [ ] Coordinate GitHub hygiene note with D

---

## Person B — Codex / judgment owner

**Role:** Handoffs + ambiguous clusters + triage content  
**Mission:** Prove judgment: Codex handoff, one real TIMEZONE merge (§7.0), ≥1 BUG/NEEDS_REVIEW with rationale.  
**Branch:** `feature/pr2-triage-judgment` (after PR1 merge)  
**Depends on:** A for stable handoff/apply loop. Unblocks C and D.  
**Out of scope:** Dashboard HTML. SIMPLE_FORMAT codemod. DEMO_SCRIPT beats (give D your real commands).

### Definition of Done

- [ ] `pipeline/data/handoffs/TIMEZONE.patch` applied via migrate
- [ ] ≥1 Codex-driven cluster merge in `migration-log`
- [ ] `pipeline/data/triage-results.json` with OK | BUG | NEEDS_REVIEW + rationales
- [ ] No dual-write to `pipeline/data/triage.json`

### Start → end checklist

- [x] **VERIFY:** read `pipeline/data/handoffs/TIMEZONE.md` (and LOCALE/MUTATION/WRAPPED)
- [ ] §7.0: run Codex against TIMEZONE.md; save unified diff as `TIMEZONE.patch`
- [ ] After PR1: `npm run migrate` — patch applied, coverage rules respected, log updated
- [ ] Intentional judgment case → evidence for BUG
- [ ] Implement `pipeline/triage/index.js` → **only** `triage-results.json`
- [ ] Verdict mapping: migrated+direct→OK; indirect→NEEDS_REVIEW; failed→BUG; skipped/pending→NEEDS_REVIEW
- [ ] Tests: `pipeline/triage/__tests__/triage.test.js`; `npm run triage`
- [ ] Hand C JSON paths + flagged clusterId; hand D exact Codex/migrate commands

---

## Person C — Evidence UI owner

**Role:** PR2 dashboard consolidation  
**Mission:** Evidence dashboard as proof surface: real JSON only; four panels; no placeholder rows.  
**Branch:** `feature/pr2-report-dashboard`  
**Depends on:** A for migrate/log shapes; B for `triage-results.json`. Unblocks D beats 5–6.  
**Out of scope:** Fake panel data. Codex. Migrate orchestrator. DEMO_SCRIPT content.

### Definition of Done

- [ ] `pipeline/report/dashboard.html` (+ `dashboard.js`, `styles.css`, `server.js`)
- [ ] `package.json` dashboard script → report server
- [ ] Four panels wired to real files; retire `pipeline/dashboard/` entry
- [ ] `npm run dashboard` → `http://127.0.0.1:4173/pipeline/report/dashboard.html`

### Start → end checklist

- [x] **VERIFY:** study `pipeline/dashboard/` v1 — reuse, do not dual-maintain
- [x] **VERIFY:** `pipeline/report/index.js` is stage stub only
- [ ] Move/adapt UI to `pipeline/report/dashboard.html` + js + css; server under `report/`
- [ ] Wire: `manifest.json`, `plan.json`, `migration-log.json`, `triage-results.json`, `migrate.json` for diffs
- [ ] Panel 1 — summary bar
- [ ] Panel 2 — cluster table
- [ ] Panel 3 — row click → before/after
- [ ] Panel 4 — BUG/NEEDS_REVIEW rationale
- [ ] Missing JSON → explicit error, never placeholders
- [ ] Update `package.json` `"dashboard"`; retire/redirect old dashboard
- [ ] Verify with B’s triage file; give D URL + screenshot slots

---

## Person D — Demo / narrative owner

**Role:** DEMO_SCRIPT + rehearsal + film  
**Mission:** Tell the thesis on camera. Script + rehearsal make the story true.  
**Branch:** `feature/pr2-demo-script` (docs-only OK)  
**Depends on:** A force-fail commands; B §7.0 + rationale; C dashboard URL.  
**Out of scope:** Implement migrate/triage/dashboard. Change JSON schemas. Push/PRs unless team asks.

### Definition of Done

- [ ] `DEMO_SCRIPT.md` with beat 0 + six filmed beats
- [ ] Real npm commands + `<!-- SCREENSHOT: … -->` slots
- [ ] Teammate README: clone/pull/branch/run
- [ ] Rehearsal green; failure-on-camera verified

### Start → end checklist

- [x] **VERIFY:** read design §7 + plans Task 12
- [ ] Draft beat 0 (not filmed): TIMEZONE prep → B’s §7.0
- [ ] Beat 1: target-repo, 0% migrated narrative
- [ ] Beat 2: `npm run discovery` → `manifest.json`
- [ ] Beat 3: characterize baseline green (`npm test`); do **not** re-characterize awkward sites
- [ ] Beat 4: `npm run migrate` + `npm run triage` (+ force-fail from A)
- [ ] Beat 5: report dashboard; summary + clean migration
- [ ] Beat 6: flagged BUG/NEEDS_REVIEW; read rationale aloud
- [ ] Screenshot slots; no full voiceover
- [ ] README for teammates
- [ ] Lead rehearsal; schedule film

---

## Artifact contracts

| Artifact | May write | Read only | Rule |
|----------|-----------|-----------|------|
| `pipeline/data/manifest.json` | A (discovery) | B, C, D | Refresh via `npm run discovery` |
| `pipeline/data/plan.json` | A (planner) | B, C, D | Refresh via `npm run planner` |
| characterize + snapshots | Frozen | All | Do **not** re-characterize awkward sites |
| `pipeline/data/migrate.json` | A (migrate) | B, C | Schema freeze after PR1 merge |
| `pipeline/data/migration-log.json` | A (migrate) | C, D | Append-only |
| `pipeline/data/handoffs/<id>.md` | A (migrate) | B may edit prompts | Codex prompts |
| `pipeline/data/handoffs/<id>.patch` | B (Codex) | A migrate applies | §7.0 TIMEZONE.patch required |
| `pipeline/data/triage-results.json` | B (triage) | C, D | Canonical; never `triage.json` |
| `pipeline/report/dashboard.*` | C | D (screenshots) | Single SPA after PR2 |
| `DEMO_SCRIPT.md` | D | All follow | Six beats + §7.0 prep |
| `package.json` scripts | A (migrate), C (dashboard) | All run | discovery \| characterize \| planner \| migrate \| triage \| dashboard |

---

## Collision rules

- Branches: `pr1-pipeline-hardening`, `feature/pr2-triage-judgment`, `feature/pr2-report-dashboard`, `feature/pr2-demo-script`. Stack PR2 on `master` after PR1 merge.
- Never force-push `master`. Never dual-write `triage.json` alongside `triage-results.json`.
- After PR1 merge: freeze `migrate.json` / `migration-log.json` field names.
- `PIPELINE_BASE_BRANCH` default `master` — do not rename master → main.
- Do not re-run characterize for the three awkward sites. `control-repo` / `mutated-migration` stays a side experiment.

---

## Critical path — what blocks film if late

| If late… | Demo beat that dies | Mitigation |
|----------|---------------------|------------|
| PR1 not merged / migrate unstable | Beat 4 migrate + force-fail | A finishes force-fail dry-run before film date |
| No TIMEZONE.patch (§7.0) | Beat 4–5 “real Codex merge” | B pre-seeds patch day before rehearsal |
| No triage-results / no flagged rationale | Beat 6 judgment climax | B ships ≥1 BUG or NEEDS_REVIEW with text |
| Dashboard still only under `pipeline/dashboard` | Beats 5–6 evidence walk | C consolidates to `report/` + wires triage |
| DEMO_SCRIPT missing real commands | Entire recording | D drafts from A/B/C verified commands |
| No rehearsal of failure path | Rollback-on-camera | A+D run `MIGRATE_FORCE_FAIL` once live |

---

## Key commands (everyone)

```bash
npm run discovery
npm run planner
npm test
npm run migrate
# Windows PowerShell force-fail:
$env:MIGRATE_FORCE_FAIL='SIMPLE_FORMAT'; npm run migrate
npm run triage
npm run dashboard
```

**Specs:** `docs/superpowers/specs/2026-07-16-demo-hardening-design.md`  
**Plan:** `docs/superpowers/plans/2026-07-16-demo-hardening.md`  
**Current branch:** `pr1-pipeline-hardening`
