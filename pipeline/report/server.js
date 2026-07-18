const http = require('http');
const fs = require('fs');
const path = require('path');

// Serves the report dashboard and the sibling pipeline/data artifacts it
// fetches. Static only — no business logic lives here.
const ROOT = path.join(__dirname, '..', '..');
const PORT = Number(process.env.PORT || 4173);
const ENTRY = '/pipeline/report/dashboard.html';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const requested =
    pathname === '/' || pathname === '/pipeline/report/' ? ENTRY : pathname;
  const file = path.resolve(ROOT, '.' + requested);
  return file.startsWith(ROOT + path.sep) ? file : null;
}

const server = http.createServer((req, res) => {
  const file = resolveRequest(req.url);
  if (!file) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (error, body) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard: http://127.0.0.1:${PORT}${ENTRY}`);
});
