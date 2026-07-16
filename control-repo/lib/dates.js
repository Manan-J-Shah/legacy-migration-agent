var { format, parseISO, isValid } = require('date-fns');
var { enUS, de, fr } = require('date-fns/locale');
var config = require('../config');

var LOCALES = { en: enUS, de: de, fr: fr };

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    var parsed = value.indexOf('T') >= 0 || /Z$/.test(value) ? parseISO(value) : new Date(value);
    return parsed;
  }
  return new Date(value);
}

/**
 * Shared display helpers. Prefer these over raw Date formatting in job output so
 * Ops sees consistent stamps in the nightly email digests.
 */
function formatShort(date) {
  return format(toDate(date), 'yyyy-MM-dd');
}

function formatLong(date) {
  return format(toDate(date), "MMMM do yyyy, h:mm:ss aaaa");
}

function formatForLocale(date, locale) {
  var loc = LOCALES[locale || config.defaultLocale] || enUS;
  return format(toDate(date), 'PPPP', { locale: loc });
}

function formatInvoiceStamp(date) {
  // Accounting wants this exact pattern on PDF footers
  return format(toDate(date), 'MM/dd/yyyy HH:mm');
}

module.exports = {
  formatShort: formatShort,
  formatLong: formatLong,
  formatForLocale: formatForLocale,
  formatInvoiceStamp: formatInvoiceStamp,
  toDate: toDate,
  isValidDate: function (value) {
    return isValid(toDate(value));
  },
};
