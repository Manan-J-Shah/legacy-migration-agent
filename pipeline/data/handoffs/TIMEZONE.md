# Codex handoff: migrate cluster TIMEZONE

Target library: date-fns
Cluster type: TIMEZONE

## Usages
- target-repo/services/shipments.js:1 (<module>)
- target-repo/services/shipments.js:15 (toWarehouseLocal)
- target-repo/services/shipments.js:19 (toWarehouseLocal)
- target-repo/services/shipments.js:29 (cutoffForCarrier)
- target-repo/services/vendorExports.js:17 (formatVendorFiscalPeriod)
- target-repo/services/vendorExports.js:18 (formatVendorFiscalPeriod)

## Instructions
Migrate the listed Moment.js call sites to date-fns.
Emit a unified diff and save it as `TIMEZONE.patch`.
Do not change unrelated files.
