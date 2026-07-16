var {
  format,
  formatDistanceToNow,
  formatRelative,
  isValid,
} = require('date-fns');
var { enUS, de, fr } = require('date-fns/locale');
var config = require('../config');
var dates = require('../lib/dates');

var LOCALES = { en: enUS, de: de, fr: fr };

/**
 * Weekly ops digest. EU warehouses get German copy; FR override exists for
 * the Lyon pilot (flag still honored even though pilot ended).
 */
function buildWarehouseDigest(warehouseCode, generatedAt, options) {
  options = options || {};
  var localeKey = options.locale || config.reportLocale;
  var loc = LOCALES[localeKey] || enUS;
  var when = generatedAt ? dates.toDate(generatedAt) : new Date();

  if (!isValid(when)) {
    throw new Error('Invalid generatedAt: ' + generatedAt);
  }

  return {
    warehouse: warehouseCode,
    locale: localeKey,
    headline: format(when, 'EEEE, d MMMM yyyy', { locale: loc }),
    generatedLabel: dates.formatForLocale(when, localeKey),
    relative: formatDistanceToNow(when, { addSuffix: true, locale: loc }),
    calendarHint: formatRelative(when, new Date(), { locale: loc }),
  };
}

function formatCustomerFacingEta(eta, customerLocale) {
  // Customer emails: long localized form, not the internal yyyy-MM-dd stamps.
  var loc = LOCALES[customerLocale || 'en'] || enUS;
  return format(dates.toDate(eta), 'PPPP', { locale: loc });
}

module.exports = {
  buildWarehouseDigest: buildWarehouseDigest,
  formatCustomerFacingEta: formatCustomerFacingEta,
};
