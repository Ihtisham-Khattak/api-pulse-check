// A tiny API you can run locally to try PulseCheck end to end. No dependencies.
//
//   node examples/sample-api.mjs            (listens on http://localhost:4010)
//   PORT=5001 node examples/sample-api.mjs  (another port)
//
// Endpoints
//   GET  /                       open, a short description of the API
//   GET  /health                 open, returns {"ok":true}
//   POST /api/login              body {"username":"demo","password":"secret"} -> {"token":"demo-token"}
//   POST /api/orders             needs "Authorization: Bearer demo-token"
//                                body {"item":"book","qty":2} -> 201 {"id":1,"item":"book","qty":2}
//   GET  /api/orders/:id         needs the same token -> 200
//
// It answers in about 15 to 45 ms, and gets slower the more requests arrive at the
// same time, so load, stress and spike tests have something interesting to show.
import http from 'node:http';

const PORT = Number(process.env.PORT) || 4010;
const TOKEN = 'demo-token';
let nextId = 0;
let inFlight = 0;

const server = http.createServer((req, res) => {
  inFlight += 1;
  res.on('close', () => { inFlight -= 1; });
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    const delay = 15 + Math.random() * 30 + Math.max(0, inFlight - 1) * 14;
    const send = (status, body) => {
      setTimeout(() => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      }, delay);
    };

    if (req.url === '/') {
      return send(200, { name: 'PulseCheck sample API', endpoints: ['POST /api/login', 'POST /api/orders', 'GET /api/orders/:id'], token: TOKEN });
    }
    if (req.url === '/health') return send(200, { ok: true });

    if (req.url === '/api/login' && req.method === 'POST') {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'invalid json' }); }
      return body.username === 'demo' && body.password === 'secret'
        ? send(200, { token: TOKEN })
        : send(401, { error: 'bad credentials' });
    }

    if (req.url.startsWith('/api/orders')) {
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { error: 'unauthorized' });
      if (req.method === 'POST') {
        let body;
        try { body = JSON.parse(raw); } catch { return send(400, { error: 'invalid json' }); }
        if (typeof body.item !== 'string' || typeof body.qty !== 'number') {
          return send(400, { error: 'item (string) and qty (number) are required' });
        }
        return send(201, { id: ++nextId, item: body.item, qty: body.qty });
      }
      return send(200, { id: Number(req.url.split('/').pop()) || 1, item: 'book', qty: 2 });
    }

    send(404, { error: 'not found' });
  });
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Try: PORT=${PORT + 1} node examples/sample-api.mjs` : err);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => console.log(`Sample API running on http://localhost:${PORT}  (token: ${TOKEN})`));
