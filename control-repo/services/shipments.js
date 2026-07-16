var { format, parseISO, isValid } = require('date-fns');
var { formatInTimeZone, fromZonedTime } = require('date-fns-tz');
var config = require('../config');
var dates = require('../lib/dates');

/**
 * Converts a UTC event time into each warehouse's wall clock.
 * Cutover times for carriers are always local to the origin DC.
 */
function toWarehouseLocal(utcTime, warehouseCode) {
  var tz = config.warehouses[warehouseCode];
  if (!tz) {
    throw new Error('Unknown warehouse code: ' + warehouseCode);
  }

  var utcDate = typeof utcTime === 'string' ? parseISO(utcTime) : dates.toDate(utcTime);

  // INTENTIONAL BUG
  // Moment did moment.tz(utcTime, 'UTC').tz(tz), converting into warehouse
  // local time. This skips that offset conversion and formats the UTC instant
  // as if it were already local.
  var local = utcDate;

  return {
    warehouse: warehouseCode,
    timezone: tz,
    utc: formatInTimeZone(utcDate, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    localIso: format(local, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    localDisplay: format(local, 'yyyy-MM-dd HH:mm:ss') + ' UTC',
    short: dates.formatShort(local),
  };
}

function cutoffForCarrier(warehouseCode, day) {
  // Ground cutoff is 3pm local; we store the UTC instant for the sorter feed.
  var tz = config.warehouses[warehouseCode];
  var localDay =
    day || formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  var cutoffLocal = fromZonedTime(localDay + ' 15:00:00', tz);

  if (!isValid(cutoffLocal)) {
    throw new Error('Invalid cutoff for ' + warehouseCode);
  }

  return {
    warehouse: warehouseCode,
    cutoffLocal: formatInTimeZone(cutoffLocal, tz, 'yyyy-MM-dd HH:mm zzz'),
    cutoffUtc: formatInTimeZone(cutoffLocal, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  };
}

module.exports = {
  toWarehouseLocal: toWarehouseLocal,
  cutoffForCarrier: cutoffForCarrier,
};
