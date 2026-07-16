/**
 * acme-fulfillment-jobs
 *
 * Entry point for the cron-driven nightly jobs. Historically each job lived
 * in its own script under jobs/; consolidated here so PM2 only watches one
 * process. Pass a job name as argv[2], defaulting to "all".
 */

var config = require('./config');
var scheduler = require('./services/scheduler');
var reporting = require('./services/reporting');
var shipments = require('./services/shipments');
var invoices = require('./services/invoices');
var DateParseError = require('./lib/errors').DateParseError;

var SAMPLE_ORDER_CREATED = '2026-07-14T18:30:00Z';
var SAMPLE_FAILURE = '2026-07-16T09:12:00Z';
var SAMPLE_SHIP_EVENT = '2026-07-16T20:05:00Z';

function runScheduleJob() {
  console.log('[' + config.companyName + '] schedule job');
  console.log(scheduler.buildFulfillmentWindow(SAMPLE_ORDER_CREATED));
  console.log(scheduler.bumpRetryWindow(SAMPLE_FAILURE, 2));
}

function runReportJob() {
  console.log('[' + config.companyName + '] report job');
  console.log(reporting.buildWarehouseDigest('ORD', SAMPLE_SHIP_EVENT));
  console.log(reporting.buildWarehouseDigest('EWR', SAMPLE_SHIP_EVENT, { locale: 'fr' }));
  console.log('ETA:', reporting.formatCustomerFacingEta(SAMPLE_ORDER_CREATED, 'de'));
}

function runShipJob() {
  console.log('[' + config.companyName + '] ship job');
  console.log(shipments.toWarehouseLocal(SAMPLE_SHIP_EVENT, 'LAX'));
  console.log(shipments.toWarehouseLocal(SAMPLE_SHIP_EVENT, 'EWR'));
  console.log(shipments.cutoffForCarrier('ORD'));
}

function runInvoiceJob() {
  console.log('[' + config.companyName + '] invoice job');
  var rows = ['07/01/2026', '2026-06-15', '15.05.2026', 'not-a-date', ''];

  rows.forEach(function (raw) {
    try {
      console.log(invoices.agingBucket(raw, '2026-07-16'));
    } catch (err) {
      if (err instanceof DateParseError || err.name === 'DateParseError') {
        console.error('QUARANTINE row raw=' + JSON.stringify(err.rawValue) + ' :: ' + err.message);
        return;
      }
      throw err;
    }
  });
}

function main(job) {
  switch (job) {
    case 'schedule':
      runScheduleJob();
      break;
    case 'report':
      runReportJob();
      break;
    case 'ship':
      runShipJob();
      break;
    case 'invoice':
      runInvoiceJob();
      break;
    case 'all':
    default:
      runScheduleJob();
      runReportJob();
      runShipJob();
      runInvoiceJob();
      break;
  }
}

main(process.argv[2] || 'all');
