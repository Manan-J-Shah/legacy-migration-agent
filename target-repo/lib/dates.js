var moment = require('moment');
var format = require('date-fns').format;
var config = require('../config');

/**
 * Shared display helpers. Prefer these over raw moment() in job output so
 * Ops sees consistent stamps in the nightly email digests.
 */
function formatShort(date) {
  return format(date, 'yyyy-MM-dd');
}

function formatLong(date) {
  return moment(date).format('MMMM Do YYYY, h:mm:ss a');
}

function formatForLocale(date, locale) {
  var loc = locale || config.defaultLocale;
  return moment(date).locale(loc).format('LLLL');
}

function formatInvoiceStamp(date) {
  // Accounting wants this exact pattern on PDF footers
  return format(date, 'MM/dd/yyyy HH:mm');
}

/**
 * Shared business-date normalizer used by invoice and reporting paths.
 * Locale-sensitive LL formatting — callers pass different option shapes.
 */
function normalizeBusinessDate(value, options) {
  options = options || {};
  var loc = options.locale || config.defaultLocale;
  var m = moment(value);
  if (!m.isValid()) {
    return null;
  }
  if (options.startOfDay) {
    m.startOf('day');
  } else if (options.endOfDay) {
    m.endOf('day');
  }
  // Locale-sensitive formatting — discovery must classify LOCALE_DEPENDENT
  return m.locale(loc).format(options.format || 'LL');
}

module.exports = {
  formatShort: formatShort,
  formatLong: formatLong,
  formatForLocale: formatForLocale,
  formatInvoiceStamp: formatInvoiceStamp,
  normalizeBusinessDate: normalizeBusinessDate,
};
