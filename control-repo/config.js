// Loaded by every job. Ops used to tweak these in place on the box.
// Do not move to env vars without checking cron wrappers under /opt/acme/bin.

module.exports = {
  companyName: 'Acme Fulfillment',
  defaultLocale: 'en',
  reportLocale: 'de',
  // Warehouse clocks — matching how Ops labels the sites in the wiki
  warehouses: {
    ORD: 'America/Chicago',
    EWR: 'America/New_York',
    LAX: 'America/Los_Angeles',
  },
  // SLA windows copied from the 2019 runbook (still current per finance)
  sla: {
    pickBufferHours: 4,
    shipLeadDays: 2,
    returnWindowDays: 30,
  },
  invoice: {
    // Legacy ERP sometimes emits US slash dates, sometimes ISO
    acceptedFormats: ['MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'],
  },
};
