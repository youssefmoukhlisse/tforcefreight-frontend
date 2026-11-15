import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../', import.meta.url));
const publicFiles = new Set(['index.html', 'app.js', 'app.css', 'shell.css', 'information.js', 'information.css', 'operations.js', 'operations.css']);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};
const port = Number(process.env.TFORCE_PREVIEW_PORT ?? 4173);

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
    const isAsset = /^assets\/[\w.-]+$/.test(path);
    const file = publicFiles.has(path) || isAsset ? path : extname(path) ? null : 'index.html';
    if (!file) throw new Error('Not found');
    const bytes = await readFile(resolve(directory, file));
    response.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/`));
