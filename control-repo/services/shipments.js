var moment = require('moment-timezone');
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

  var local = moment.tz(utcTime, 'UTC').tz(tz);
  return {
    warehouse: warehouseCode,
    timezone: tz,
    utc: moment.utc(utcTime).format(),
    localIso: local.format(),
    localDisplay: local.format('YYYY-MM-DD HH:mm:ss z'),
    short: dates.formatShort(local),
  };
}

function cutoffForCarrier(warehouseCode, day) {
  // Ground cutoff is 3pm local; we store the UTC instant for the sorter feed.
  var tz = config.warehouses[warehouseCode];
  var localDay = day || moment.tz(tz).format('YYYY-MM-DD');
  var cutoffLocal = moment.tz(localDay + ' 15:00', 'YYYY-MM-DD HH:mm', tz);

  return {
    warehouse: warehouseCode,
    cutoffLocal: cutoffLocal.format('YYYY-MM-DD HH:mm z'),
    cutoffUtc: cutoffLocal.clone().utc().format(),
  };
}

module.exports = {
  toWarehouseLocal: toWarehouseLocal,
  cutoffForCarrier: cutoffForCarrier,
};
