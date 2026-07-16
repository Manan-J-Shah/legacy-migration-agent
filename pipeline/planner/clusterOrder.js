/**
 * Migration cluster order and risk — single source of truth for the planner.
 * Order: safest/most mechanical first; WRAPPED_ERROR_HANDLING and TIMEZONE last.
 */
module.exports = [
  { type: 'SIMPLE_FORMAT', risk: 'low' },
  { type: 'MUTATION_CHAIN', risk: 'medium' },
  { type: 'LOCALE_DEPENDENT', risk: 'medium' },
  { type: 'TIMEZONE', risk: 'high' },
  { type: 'WRAPPED_ERROR_HANDLING', risk: 'high' },
];
