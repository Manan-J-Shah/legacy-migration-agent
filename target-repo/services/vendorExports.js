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
