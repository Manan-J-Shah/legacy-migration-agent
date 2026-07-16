/** Depth-first AST walk. Visitor may return false to skip children. */

function walk(node, visitors, parent = null, ancestors = []) {
  if (!node || typeof node.type !== 'string') return;

  const visit = visitors[node.type] || visitors.enter;
  if (visit) {
    const cont = visit(node, parent, ancestors);
    if (cont === false) return;
  }

  const nextAncestors = ancestors.concat(node);
  for (const key of Object.keys(node)) {
    if (
      key === 'type' ||
      key === 'loc' ||
      key === 'start' ||
      key === 'end' ||
      key === '_parent' ||
      key === 'errors' ||
      key === 'comments' ||
      key === 'tokens'
    ) {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === 'string') {
          walk(item, visitors, node, nextAncestors);
        }
      }
    } else if (child && typeof child.type === 'string') {
      walk(child, visitors, node, nextAncestors);
    }
  }
}

function functionName(node) {
  if (!node) return null;
  if (node.type === 'FunctionDeclaration' && node.id) return node.id.name;
  if (
    (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') &&
    node.id
  ) {
    return node.id.name;
  }
  return null;
}

function surroundingFunction(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const n = ancestors[i];
    if (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      const named = functionName(n);
      if (named) return named;
      // assigned: const foo = function () {} / const foo = () => {}
      const parent = ancestors[i - 1];
      const grand = ancestors[i - 2];
      if (parent && parent.type === 'VariableDeclarator' && parent.id && parent.id.name) {
        return parent.id.name;
      }
      if (
        parent &&
        parent.type === 'AssignmentExpression' &&
        parent.left &&
        parent.left.type === 'Identifier'
      ) {
        return parent.left.name;
      }
      if (
        grand &&
        grand.type === 'AssignmentExpression' &&
        grand.left &&
        grand.left.type === 'MemberExpression' &&
        grand.left.property &&
        grand.left.property.type === 'Identifier'
      ) {
        return grand.left.property.name;
      }
      return '<anonymous>';
    }
  }
  return '<module>';
}

function inTryBlock(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const n = ancestors[i];
    if (n.type !== 'TryStatement') continue;
    const child = ancestors[i + 1];
    if (child && n.block === child) return true;
  }
  return false;
}

function isMomentModuleId(value) {
  return (
    typeof value === 'string' &&
    (value === 'moment' ||
      value === 'moment-timezone' ||
      value.startsWith('moment/') ||
      value.startsWith('moment-timezone/'))
  );
}

module.exports = {
  walk,
  surroundingFunction,
  inTryBlock,
  isMomentModuleId,
};
