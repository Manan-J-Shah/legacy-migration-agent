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
  return moment(date).format('MM/DD/YYYY HH:mm');
}

module.exports = {
  formatShort: formatShort,
  formatLong: formatLong,
  formatForLocale: formatForLocale,
  formatInvoiceStamp: formatInvoiceStamp,
};
