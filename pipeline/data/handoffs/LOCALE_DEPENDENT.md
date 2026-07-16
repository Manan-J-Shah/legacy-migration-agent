# Codex handoff: migrate cluster LOCALE_DEPENDENT

Target library: date-fns
Cluster type: LOCALE_DEPENDENT

## Usages
- target-repo/lib/dates.js:19 (formatForLocale)
- target-repo/lib/dates.js:44 (normalizeBusinessDate)
- target-repo/services/reporting.js:2 (<module>)
- target-repo/services/reporting.js:3 (<module>)
- target-repo/services/reporting.js:9 (<module>)
- target-repo/services/reporting.js:22 (buildWarehouseDigest)
- target-repo/services/reporting.js:37 (buildWarehouseDigest)
- target-repo/services/reporting.js:43 (formatCustomerFacingEta)

## Instructions
Migrate the listed Moment.js call sites to date-fns.
Emit a unified diff and save it as `LOCALE_DEPENDENT.patch`.
Do not change unrelated files.
