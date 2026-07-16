var { parse, isValid, differenceInDays, format } = require('date-fns');
var config = require('../config');
var dates = require('../lib/dates');
var DateParseError = require('../lib/errors').DateParseError;

var PARSE_FORMATS = ['MM/dd/yyyy', 'yyyy-MM-dd', 'dd.MM.yyyy'];

/**
 * ERP invoice date field is notoriously dirty. Parse carefully — finance
 * rejects the whole batch if one row throws uncaught.
 */
function parseInvoiceDate(rawValue) {
  try {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      throw new DateParseError('Invoice date is empty', rawValue);
    }

    var parsed = null;
    for (var i = 0; i < PARSE_FORMATS.length; i++) {
      var attempt = parse(String(rawValue), PARSE_FORMATS[i], new Date());
      if (isValid(attempt)) {
        parsed = attempt;
        break;
      }
    }

    if (!parsed || !isValid(parsed)) {
      // Last-ditch: let Date guess (some vendors send RFC2822)
      parsed = new Date(rawValue);
    }

    if (!isValid(parsed)) {
      throw new DateParseError(
        'Unrecognized invoice date format',
        rawValue
      );
    }

    return {
      raw: rawValue,
      iso: parsed.toISOString(),
      stamp: dates.formatInvoiceStamp(parsed),
      fiscalMonth: format(parsed, 'yyyy-MM'),
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
  var ageDays = differenceInDays(
    dates.toDate(asOf || new Date()),
    dates.toDate(parsed.iso)
  );

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
