var moment = require('moment');
var config = require('../config');
var dates = require('../lib/dates');
var DateParseError = require('../lib/errors').DateParseError;

/**
 * ERP invoice date field is notoriously dirty. Parse carefully — finance
 * rejects the whole batch if one row throws uncaught.
 */
function parseInvoiceDate(rawValue) {
  try {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      throw new DateParseError('Invoice date is empty', rawValue);
    }

    var parsed = moment(rawValue, config.invoice.acceptedFormats, true);
    if (!parsed.isValid()) {
      // Last-ditch: let moment guess (some vendors send RFC2822)
      parsed = moment(new Date(rawValue));
    }

    if (!parsed.isValid()) {
      throw new DateParseError(
        'Unrecognized invoice date format',
        rawValue
      );
    }

    return {
      raw: rawValue,
      iso: parsed.toISOString(),
      stamp: dates.formatInvoiceStamp(parsed),
      fiscalMonth: parsed.format('YYYY-MM'),
      businessDate: dates.normalizeBusinessDate(parsed.toISOString(), {
        locale: config.defaultLocale,
        startOfDay: true,
      }),
    };
  } catch (err) {
    if (err.name === 'DateParseError') {
      // Preserve structured error for the batch runner to quarantine the row
      err.message = 'Invoice date parse failed: ' + err.message;
      throw err;
    }
    throw new DateParseError(
      'Unexpected error while parsing invoice date',
      rawValue,
      err
    );
  }
}

function agingBucket(invoiceDateRaw, asOf) {
  var parsed = parseInvoiceDate(invoiceDateRaw);
  var ageDays = moment(asOf || undefined).diff(moment(parsed.iso), 'days');

  var bucket;
  if (ageDays <= 30) bucket = 'current';
  else if (ageDays <= 60) bucket = '30-60';
  else if (ageDays <= 90) bucket = '60-90';
  else bucket = '90+';

  return {
    invoice: parsed,
    ageDays: ageDays,
    bucket: bucket,
  };
}

module.exports = {
  parseInvoiceDate: parseInvoiceDate,
  agingBucket: agingBucket,
};
