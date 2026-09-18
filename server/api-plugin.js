// ============================================================================
//  api-plugin.js — Vite Dev Server REST API Plugin
//
//  Tüm iş mantığı server/api-core.js içinde; bu dosya sadece Vite'ın
//  connect middleware'ine bağlar. Böylece dev sunucusu ile Vercel'deki
//  üretim API'si birebir aynı davranır.
//
//  Kullanım:
//    curl http://localhost:5173/api/v1
//    curl "http://localhost:5173/api/v1/analyze/THYAO?market=bist&interval=1d"
// ============================================================================

import { handleApiRequest } from './api-core.js';

export default function borsaApiPlugin() {
  return {
    name: 'borsa-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/v1')) return next();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const host = req.headers.host || 'localhost:5173';
        const baseUrl = `http://${host}`;

        try {
          const { status, body } = await handleApiRequest(url.pathname, url.searchParams, baseUrl);
          res.statusCode = status;
          res.end(JSON.stringify(body, null, 2));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }, null, 2));
        }
      });

      console.log('\n  📡 Borsa API endpoints:');
      console.log('  ➜  GET /api/v1                       — API dizini (tüm uçlar)');
      console.log('  ➜  GET /api/v1/openapi.json          — OpenAPI 3.1 şeması');
      console.log('  ➜  GET /api/v1/markets               — Desteklenen piyasalar');
      console.log('  ➜  GET /api/v1/indicators            — İndikatör listesi');
      console.log('  ➜  GET /api/v1/search?q=...          — Sembol arama');
      console.log('  ➜  GET /api/v1/quote/:symbol         — Anlık fiyat');
      console.log('  ➜  GET /api/v1/candles/:symbol       — Mum verileri');
      console.log('  ➜  GET /api/v1/analyze/:symbol       — Tam teknik analiz');
      console.log('  ➜  Query: ?market=bist|us|crypto|commodity|bond|forex&interval=1d\n');
    },
  };
}
