var moment = require('moment');
require('moment/locale/de');
require('moment/locale/fr');
var config = require('../config');
var dates = require('../lib/dates');

// Requiring locale packs flips the global default to the last one loaded —
// put it back or every other job starts printing French.
moment.locale(config.defaultLocale);

/**
 * Weekly ops digest. EU warehouses get German copy; FR override exists for
 * the Lyon pilot (flag still honored even though pilot ended).
 */
function buildWarehouseDigest(warehouseCode, generatedAt, options) {
  options = options || {};
  var locale = options.locale || config.reportLocale;
  var when = moment(generatedAt || undefined);

  // Switch locale for the whole block, then restore — other jobs share process.
  var previous = moment.locale();
  moment.locale(locale);

  var digest = {
    warehouse: warehouseCode,
    locale: locale,
    headline: when.format('dddd, D MMMM YYYY'),
    generatedLabel: dates.formatForLocale(when, locale),
    periodLabel: dates.normalizeBusinessDate(when, {
      locale: locale,
      format: 'LL',
    }),
    relative: when.fromNow(),
    calendarHint: when.calendar(),
  };

  moment.locale(previous);
  return digest;
}

function formatCustomerFacingEta(eta, customerLocale) {
  // Customer emails: long localized form, not the internal YYYY-MM-DD stamps.
  return moment(eta).locale(customerLocale || 'en').format('LLLL');
}

module.exports = {
  buildWarehouseDigest: buildWarehouseDigest,
  formatCustomerFacingEta: formatCustomerFacingEta,
};
