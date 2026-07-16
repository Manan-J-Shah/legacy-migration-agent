/**
 * Data-driven classification for moment.js usages.
 * Rules are evaluated in order; first match wins.
 */

const CATEGORIES = [
  'WRAPPED_ERROR_HANDLING',
  'TIMEZONE',
  'LOCALE_DEPENDENT',
  'MUTATION_CHAIN',
  'SIMPLE_FORMAT',
];

const REQUIRE_RULES = [
  {
    category: 'TIMEZONE',
    test: (mod) => mod === 'moment-timezone' || mod.startsWith('moment-timezone/'),
  },
  {
    category: 'LOCALE_DEPENDENT',
    test: (mod) => mod.startsWith('moment/locale'),
  },
  {
    // Bare moment require — recorded so the binding can be traced; treated as format baseline.
    category: 'SIMPLE_FORMAT',
    test: (mod) => mod === 'moment',
  },
];

const CALL_RULES = [
  {
    category: 'WRAPPED_ERROR_HANDLING',
    test: (ctx) => ctx.inTry === true,
  },
  {
    category: 'TIMEZONE',
    test: (ctx) =>
      ctx.staticMethod === 'tz' ||
      ctx.staticMethod === 'utc' ||
      ctx.chainMethods.includes('tz') ||
      ctx.chainMethods.includes('utc') ||
      ctx.fromTimezoneModule === true,
  },
  {
    category: 'LOCALE_DEPENDENT',
    test: (ctx) =>
      ctx.staticMethod === 'locale' ||
      ctx.chainMethods.includes('locale') ||
      ctx.isLocaleRequire === true,
  },
  {
    category: 'MUTATION_CHAIN',
    test: (ctx) =>
      ctx.chainMethods.includes('add') ||
      ctx.chainMethods.includes('subtract') ||
      ctx.isMutationCall === true,
  },
  {
    category: 'SIMPLE_FORMAT',
    test: (ctx) =>
      ctx.chainMethods.includes('format') ||
      ctx.staticMethod == null ||
      ctx.chainMethods.length === 0 ||
      true,
  },
];

function classifyRequire(moduleId) {
  for (const rule of REQUIRE_RULES) {
    if (rule.test(moduleId)) return rule.category;
  }
  return null;
}

function classifyCall(ctx) {
  for (const rule of CALL_RULES) {
    if (rule.test(ctx)) return rule.category;
  }
  return 'SIMPLE_FORMAT';
}

module.exports = {
  CATEGORIES,
  classifyRequire,
  classifyCall,
};
