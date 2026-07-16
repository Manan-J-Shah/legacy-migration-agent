var {
  addHours,
  addDays,
  addMinutes,
  subHours,
  subDays,
  subMinutes,
  differenceInHours,
  getDay,
  endOfDay,
  isValid,
} = require('date-fns');
var config = require('../config');
var dates = require('../lib/dates');

/**
 * Builds pick / ship / return windows for an order.
 * date-fns returns new Date instances — callers must reassign.
 */
function buildFulfillmentWindow(orderCreatedAt) {
  var created = dates.toDate(orderCreatedAt);
  if (!isValid(created)) {
    throw new Error('Invalid orderCreatedAt: ' + orderCreatedAt);
  }

  var pickStart = addHours(created, config.sla.pickBufferHours);
  var shipBy = subHours(addDays(pickStart, config.sla.shipLeadDays), 2);
  var returnBy = endOfDay(
    subDays(addDays(shipBy, config.sla.returnWindowDays), 1)
  );

  // Ops still adjusts weekend overflow by hand in the WMS
  if (getDay(shipBy) === 0) {
    // INTENTIONAL BUG
    // Moment mutated shipBy in place via .add(1, 'day'). date-fns addDays is
    // immutable and returns a new Date — discarding it leaves shipBy unchanged.
    addDays(shipBy, 1);
  } else if (getDay(shipBy) === 6) {
    shipBy = addDays(shipBy, 2);
  }

  return {
    createdAt: dates.formatLong(created),
    pickStart: dates.formatLong(pickStart),
    shipBy: dates.formatLong(shipBy),
    returnBy: dates.formatShort(returnBy),
    hoursUntilPick: differenceInHours(pickStart, new Date()),
  };
}

function bumpRetryWindow(failedAt, attempt) {
  var next = dates.toDate(failedAt);
  next = addHours(next, attempt);
  next = addMinutes(next, 15);
  if (attempt > 3) {
    next = subMinutes(next, 30);
  }

  return {
    retryAt: dates.formatLong(next),
    retryAtIso: next.toISOString(),
  };
}

module.exports = {
  buildFulfillmentWindow: buildFulfillmentWindow,
  bumpRetryWindow: bumpRetryWindow,
};
