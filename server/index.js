import http from 'node:http';
import { lookup } from './lookup.js';
import { MicroburbsError } from './microburbs.js';

const port = 8787;
const key = process.env.MICROBURBS_API_KEY || '';

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '';
  if (/^chrome-extension:\/\/[a-z]{32}$/.test(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  if (request.url === '/health' && request.method === 'GET') { response.end(JSON.stringify({ ok: true, configured: Boolean(key) })); return; }
  if (request.url !== '/api/lookup' || request.method !== 'POST') { response.writeHead(404); response.end(JSON.stringify({ error: 'Not found' })); return; }
  if (origin && !/^chrome-extension:\/\/[a-z]{32}$/.test(origin)) { response.writeHead(403); response.end(JSON.stringify({ error: 'Extension origin required' })); return; }
  let body = '';
  try {
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 1024) throw new MicroburbsError('input', 'Address request is too long.');
    }
    const { address } = JSON.parse(body);
    response.end(JSON.stringify(await lookup(address, key)));
  } catch (error) {
    const kind = error instanceof MicroburbsError ? error.kind : 'input';
    response.writeHead(kind === 'input' ? 400 : kind === 'config' ? 503 : 502);
    response.end(JSON.stringify({ error: kind, message: error instanceof MicroburbsError ? error.message : 'Invalid request.' }));
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Next Door Next Year API listening at http://127.0.0.1:${port}`));
