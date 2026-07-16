# Codex handoff: migrate cluster WRAPPED_ERROR_HANDLING

Target library: date-fns
Cluster type: WRAPPED_ERROR_HANDLING

## Usages
- target-repo/services/invoices.js:19 (parseInvoiceDate)
- target-repo/services/invoices.js:33 (parseInvoiceDate)

## Instructions
Migrate the listed Moment.js call sites to date-fns.
Emit a unified diff and save it as `WRAPPED_ERROR_HANDLING.patch`.
Do not change unrelated files.
