var formatInTimeZone = require('date-fns-tz').formatInTimeZone;

/**
 * Quarterly vendor CSV helper — rarely touched; not wired into nightly jobs.
 * Fiscal periods are stored as UTC wall times from the vendor portal.
 */
function formatVendorFiscalPeriod(raw, timezone) {
  var tz = timezone || 'UTC';
  // Vendor portal stamps are UTC instants; format them in UTC with date-fns-tz.
  var start = new Date(raw);
  if (isNaN(start.getTime())) {
    return null;
  }
  return {
    timezone: tz,
    periodStartUtc: start.toISOString(),
    periodLabel: formatInTimeZone(start, 'UTC', "yyyy-'Q'Q"),
    vendorStamp: formatInTimeZone(start, 'UTC', "yyyy-MM-dd HH:mm:ss'Z'"),
  };
}

module.exports = {
  formatVendorFiscalPeriod: formatVendorFiscalPeriod,
};
