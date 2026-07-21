# Moment.js → date-fns migration pipeline

A pipeline that migrates legacy Moment.js code to date-fns **with evidence**:
discover and classify usages, characterize current behavior, plan clusters,
migrate incrementally with rollback, triage with judgment
(`OK | BUG | NEEDS_REVIEW`), and surface everything on an evidence dashboard.

- Demo walkthrough: [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)
- Team workstreams: [`docs/TEAM_WORKSTREAMS.md`](./docs/TEAM_WORKSTREAMS.md)

## Prerequisites

- Node.js 18+ and npm
- git
- Windows/PowerShell examples below; on macOS/Linux use `TZ=UTC` and
  `MIGRATE_FORCE_FAIL=...` inline instead of `$env:` assignments.

## Setup for teammates (clone / pull / branch / run)

Clone (first time):

```powershell
git clone https://github.com/Manan-J-Shah/legacy-migration-agent.git
cd legacy-migration-agent
npm install
```

Pull the latest and pick your branch (see branch list in
`docs/TEAM_WORKSTREAMS.md`):

```powershell
git fetch origin
git switch master        # or: pr1-pipeline-hardening
git pull
```

Start your own work branch off the agreed base:

```powershell
git switch -c feature/<your-workstream> pr1-pipeline-hardening
```

## Key commands

```powershell
npm run discovery                                   # classify Moment usages -> manifest.json
npm run planner                                     # cluster the plan -> plan.json
npm test                                            # characterize baseline (must be green)
npm run migrate                                     # incremental migrate -> migrate.json + migration-log.json
$env:MIGRATE_FORCE_FAIL='SIMPLE_FORMAT'; npm run migrate   # force-fail demo (prints rollback, base stays clean)
Remove-Item Env:\MIGRATE_FORCE_FAIL                 # clear the force-fail flag afterwards
npm run triage                                      # verdicts -> triage-results.json
npm run report                                      # validate artifacts and print dashboard readiness
npm run dashboard                                   # serve the evidence dashboard
```

Dashboard URL: `http://127.0.0.1:4173/pipeline/report/dashboard.html`

## Canonical artifacts (read-only unless you own them)

| Artifact | Written by |
|----------|-----------|
| `pipeline/data/manifest.json` | discovery |
| `pipeline/data/plan.json` | planner |
| `pipeline/data/migrate.json` | migrate |
| `pipeline/data/migration-log.json` | migrate (append-only) |
| `pipeline/data/triage-results.json` | triage |
| `pipeline/report/dashboard.*` | dashboard |

Never introduce a second source of truth (e.g. do not write the retired
`triage.json` or a generated `report.json`). `npm run report` only validates
the canonical artifacts consumed by the dashboard. Do not re-characterize the
awkward sites.

## Branches

`pr1-pipeline-hardening` → merges to `master`. PR2 work stacks from there:
`feature/pr2-triage-judgment`, `feature/pr2-report-dashboard`,
`feature/pr2-demo-script`. Never force-push `master`.
