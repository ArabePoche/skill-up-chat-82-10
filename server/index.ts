// Serveur Express de production : sert le build statique de Vite et injecte
// dynamiquement les balises Open Graph pour les pages partageables (vidéos…).

import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { transformHtmlForShare } from './og-tags';

const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

// esbuild compile ce fichier en CJS, donc __dirname existe.
// Le serveur compilé est dans dist/, le build Vite aussi (dist/) — on sert
// dist/ comme racine statique.
const distDir = __dirname;
const indexHtmlPath = path.join(distDir, 'index.html');

const app = express();
app.disable('x-powered-by');
app.use(compression());

// Trust proxy pour récupérer x-forwarded-proto/host derrière Replit
app.set('trust proxy', true);

// Middleware HTML : intercepte les routes partageables AVANT le static handler
app.get(/^\/(video|videos)\/[^/]+/, async (req, res, next) => {
  try {
    if (!fs.existsSync(indexHtmlPath)) return next();

    const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers['host'] || 'localhost';
    const fullUrl = `${proto}://${host}${req.originalUrl}`;

    const html = await transformHtmlForShare(baseHtml, req.path, fullUrl);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(html);
  } catch (err) {
    console.error('[og-tags-prod] middleware error', err);
    next();
  }
});

// Assets statiques du build Vite (immutables)
app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// SPA fallback : toutes les autres routes renvoient index.html
app.get('*', (_req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    return res.status(500).send('Build introuvable. Lance d\'abord `npm run build`.');
  }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-cache');
  res.send(fs.readFileSync(indexHtmlPath, 'utf-8'));
});

app.listen(PORT, HOST, () => {
  console.log(`[server] REZO server listening on http://${HOST}:${PORT}`);
});
