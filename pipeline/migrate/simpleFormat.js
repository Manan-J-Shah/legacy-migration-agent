const TOKEN_MAP = [
  ['YYYY', 'yyyy'],
  ['YY', 'yy'],
  ['DD', 'dd'],
  ['D', 'd'],
  ['HH', 'HH'],
  ['mm', 'mm'],
  ['ss', 'ss'],
  ['MM', 'MM'],
];

const RISKY = /Do|Mo|Qo|wo|dd|dddd|A|a|Z|ZZ|X|x|S{1,}/;

function mapTokens(momentFmt) {
  if (RISKY.test(momentFmt) && /Do/.test(momentFmt)) {
    return null;
  }
  let out = momentFmt;
  for (const [from, to] of TOKEN_MAP) {
    out = out.split(from).join('\0' + to + '\0');
  }
  return out.replace(/\0/g, '');
}

function ensureDateFnsFormatImport(code) {
  if (/require\(['"]date-fns['"]\)/.test(code)) {
    if (/\bformat\b/.test(code.split('\n').find((l) => /date-fns/.test(l)) || '')) {
      return code;
    }
    return code.replace(
      /require\(['"]date-fns['"]\)/,
      "require('date-fns')"
    );
  }
  if (/var\s+format\s*=\s*require\(['"]date-fns['"]\)\.format/.test(code)) {
    return code;
  }
  const insert = "var format = require('date-fns').format;\n";
  const momentReq = code.match(/^[^\n]*require\(['"]moment['"]\)[^\n]*\n/m);
  if (momentReq) {
    const idx = momentReq.index + momentReq[0].length;
    return code.slice(0, idx) + insert + code.slice(idx);
  }
  return insert + code;
}

/**
 * Mechanical rewrite of moment(x).format('SAFE') → format(x, 'date-fns').
 * Leaves risky Moment tokens untouched.
 */
function transformSource(code) {
  const re = /moment\(([^)]+)\)\.format\((['"])([^'"]+)\2\)/g;
  let changes = 0;
  const next = code.replace(re, (full, arg, quote, fmt) => {
    const mapped = mapTokens(fmt);
    if (!mapped) return full;
    changes += 1;
    return 'format(' + arg + ', ' + quote + mapped + quote + ')';
  });
  if (changes === 0) return { code, changes: 0 };
  return { code: ensureDateFnsFormatImport(next), changes };
}

function transformFile(absPath, fsImpl) {
  const fs = fsImpl || require('fs');
  const before = fs.readFileSync(absPath, 'utf8');
  const { code, changes } = transformSource(before);
  if (changes > 0) fs.writeFileSync(absPath, code, 'utf8');
  return { before, after: code, changes };
}

module.exports = { transformSource, transformFile, mapTokens };
