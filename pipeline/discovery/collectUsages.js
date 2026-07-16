const parser = require('@babel/parser');
const { classifyRequire, classifyCall } = require('./classify');
const {
  walk,
  surroundingFunction,
  inTryBlock,
  isMomentModuleId,
} = require('./astUtil');

const MUTATION_METHODS = new Set(['add', 'subtract']);
const TRACKED_METHODS = new Set([
  'add',
  'subtract',
  'locale',
  'tz',
  'utc',
  'format',
]);

function parseSource(code, filePath) {
  return parser.parse(code, {
    sourceType: 'unambiguous',
    sourceFilename: filePath,
    allowReturnOutsideFunction: true,
    plugins: ['objectRestSpread', 'dynamicImport'],
  });
}

function memberName(node) {
  if (!node || node.type !== 'MemberExpression' || node.computed) return null;
  return node.property.type === 'Identifier' ? node.property.name : null;
}

function attachParents(ast) {
  walk(ast, {
    enter(node, parent) {
      node._parent = parent;
    },
  });
}

function collectOutwardChain(callNode, parent) {
  const methods = [];
  let current = callNode;
  let edge = parent;
  const seen = new Set();

  while (edge && !seen.has(edge)) {
    seen.add(edge);
    if (edge.type === 'MemberExpression' && edge.object === current) {
      const name = memberName(edge);
      if (name) methods.push(name);
      current = edge;
      edge = edge._parent || null;
      continue;
    }
    if (edge.type === 'CallExpression' && edge.callee === current) {
      current = edge;
      edge = edge._parent || null;
      continue;
    }
    break;
  }
  return methods;
}

function rootIdentifier(node) {
  let cur = node;
  while (cur) {
    if (cur.type === 'Identifier') return cur.name;
    if (cur.type === 'CallExpression') {
      cur = cur.callee;
      continue;
    }
    if (cur.type === 'MemberExpression') {
      cur = cur.object;
      continue;
    }
    return null;
  }
  return null;
}

function isMomentCallee(callee, momentNames) {
  if (callee.type === 'Identifier' && momentNames.has(callee.name)) {
    return { staticMethod: null, binding: callee.name };
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    momentNames.has(callee.object.name) &&
    callee.property.type === 'Identifier'
  ) {
    return {
      staticMethod: callee.property.name,
      binding: callee.object.name,
    };
  }
  return null;
}

function initYieldsMoment(init, momentNames, momentValues) {
  if (!init) return false;

  if (init.type === 'CallExpression') {
    if (isMomentCallee(init.callee, momentNames)) return true;

    if (init.callee.type === 'MemberExpression') {
      const method = memberName(init.callee);
      const root = rootIdentifier(init.callee.object);
      const fromMoment =
        (root && momentNames.has(root)) || (root && momentValues.has(root));
      if (
        fromMoment &&
        (method === 'clone' ||
          method === 'tz' ||
          method === 'utc' ||
          MUTATION_METHODS.has(method) ||
          method === 'startOf' ||
          method === 'endOf')
      ) {
        return true;
      }
      return initYieldsMoment(init.callee.object, momentNames, momentValues);
    }
  }

  if (init.type === 'MemberExpression') {
    return initYieldsMoment(init.object, momentNames, momentValues);
  }

  return false;
}

function toManifestEntry(u) {
  return {
    file: u.file,
    line: u.line,
    surroundingFunction: u.surroundingFunction,
    classification: u.classification,
  };
}

function collectUsages(code, relativeFile) {
  const ast = parseSource(code, relativeFile);
  attachParents(ast);

  const usages = [];
  const momentNames = new Set();
  const timezoneBindings = new Set();
  const momentValues = new Set();

  walk(ast, {
    enter(node, parent, ancestors) {
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments[0] &&
        node.arguments[0].type === 'StringLiteral' &&
        isMomentModuleId(node.arguments[0].value)
      ) {
        const moduleId = node.arguments[0].value;
        const category = classifyRequire(moduleId);
        if (category) {
          usages.push({
            file: relativeFile,
            line: node.loc.start.line,
            surroundingFunction: surroundingFunction(ancestors),
            classification: category,
          });
        }

        if (
          parent &&
          parent.type === 'VariableDeclarator' &&
          parent.id &&
          parent.id.type === 'Identifier'
        ) {
          momentNames.add(parent.id.name);
          if (
            moduleId === 'moment-timezone' ||
            moduleId.startsWith('moment-timezone/')
          ) {
            timezoneBindings.add(parent.id.name);
          }
        }
      }
    },
  });

  walk(ast, {
    enter(node, parent, ancestors) {
      if (
        node.type === 'VariableDeclarator' &&
        node.id &&
        node.id.type === 'Identifier' &&
        node.init
      ) {
        if (initYieldsMoment(node.init, momentNames, momentValues)) {
          momentValues.add(node.id.name);
        } else if (
          node.init.type === 'Identifier' &&
          momentValues.has(node.init.name)
        ) {
          // Alias: var alias = sharedMoment
          momentValues.add(node.id.name);
        }
      }

      if (node.type !== 'CallExpression') return;

      const momentHit = isMomentCallee(node.callee, momentNames);
      if (momentHit) {
        // Binding-only constructions are tracked via momentValues; classify
        // later method calls on the binding instead of emitting SIMPLE_FORMAT.
        const isBindingOnly =
          parent &&
          parent.type === 'VariableDeclarator' &&
          parent.init === node;
        if (isBindingOnly) {
          return;
        }
        const chainMethods = collectOutwardChain(node, parent);
        usages.push({
          file: relativeFile,
          line: node.loc.start.line,
          surroundingFunction: surroundingFunction(ancestors),
          classification: classifyCall({
            inTry: inTryBlock(ancestors),
            staticMethod: momentHit.staticMethod,
            chainMethods,
            fromTimezoneModule: timezoneBindings.has(momentHit.binding),
            isLocaleRequire: false,
            isMutationCall: false,
          }),
        });
        return;
      }

      if (
        node.callee.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.property.type === 'Identifier'
      ) {
        const method = node.callee.property.name;
        const rootId = rootIdentifier(node.callee.object);
        if (!rootId || !momentValues.has(rootId)) return;
        if (!TRACKED_METHODS.has(method)) return;

        // Prefer the innermost call on an identifier (m.locale().format → locale
        // owns the outward chain). Still allow clone().add via rootIdentifier.
        const objectIsDirectId = node.callee.object.type === 'Identifier';
        if (!objectIsDirectId && !MUTATION_METHODS.has(method)) return;

        const chainMethods = objectIsDirectId
          ? [method, ...collectOutwardChain(node, parent)]
          : [method];
        usages.push({
          file: relativeFile,
          line: node.loc.start.line,
          surroundingFunction: surroundingFunction(ancestors),
          classification: classifyCall({
            inTry: inTryBlock(ancestors),
            staticMethod: null,
            chainMethods,
            fromTimezoneModule: false,
            isLocaleRequire: false,
            isMutationCall: MUTATION_METHODS.has(method),
          }),
        });
      }
    },
  });

  return usages.map(toManifestEntry);
}

module.exports = { collectUsages };
