// Serves the built app for the browser tests (`npm run e2e` builds it first). A pre-built app has no
// compile step or live reload to make page loads slow or flaky, unlike `ng serve`.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist', 'dsr2p-fe', 'browser');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  const file = join(root, normalize(new URL(req.url, 'http://localhost').pathname));
  // Unknown paths are app routes (e.g. /restaurants/1): hand them to the single-page app.
  const target = file.startsWith(root) && extname(file) ? file : join(root, 'index.html');
  try {
    res.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream' });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4300);
