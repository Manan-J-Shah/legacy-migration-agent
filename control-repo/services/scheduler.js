var moment = require('moment');
var config = require('../config');
var dates = require('../lib/dates');

/**
 * Builds pick / ship / return windows for an order.
 * NOTE: moment objects are mutated in place — do not reuse the same instance
 * across steps (we hit that bug in prod Q3 2021).
 */
function buildFulfillmentWindow(orderCreatedAt) {
  var created = moment(orderCreatedAt);
  if (!created.isValid()) {
    throw new Error('Invalid orderCreatedAt: ' + orderCreatedAt);
  }

  // Pick must start after the buffer; ship by SLA lead; returns counted from ship.
  var pickStart = created.clone().add(config.sla.pickBufferHours, 'hours');
  var shipBy = pickStart.clone().add(config.sla.shipLeadDays, 'days').subtract(2, 'hours');
  var returnBy = shipBy
    .clone()
    .add(config.sla.returnWindowDays, 'days')
    .subtract(1, 'day')
    .endOf('day');

  // Ops still adjusts weekend overflow by hand in the WMS
  if (shipBy.day() === 0) {
    shipBy.add(1, 'day');
  } else if (shipBy.day() === 6) {
    shipBy.add(2, 'days');
  }

  return {
    createdAt: dates.formatLong(created),
    pickStart: dates.formatLong(pickStart),
    shipBy: dates.formatLong(shipBy),
    returnBy: dates.formatShort(returnBy),
    hoursUntilPick: pickStart.diff(moment(), 'hours'),
  };
}

function bumpRetryWindow(failedAt, attempt) {
  // Exponential-ish backoff using chained mutation (legacy pager duty runbook)
  var next = moment(failedAt)
    .add(attempt, 'hours')
    .add(15, 'minutes')
    .subtract(attempt > 3 ? 30 : 0, 'minutes');

  return {
    retryAt: dates.formatLong(next),
    retryAtIso: next.toISOString(),
  };
}

module.exports = {
  buildFulfillmentWindow: buildFulfillmentWindow,
  bumpRetryWindow: bumpRetryWindow,
};
