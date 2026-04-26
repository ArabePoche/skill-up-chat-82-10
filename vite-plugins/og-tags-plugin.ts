import type { Plugin, Connect } from 'vite';
import { transformHtmlForShare, matchShareableRoute } from '../server/og-tags';

/**
 * Plugin Vite (mode dev) : intercepte les requêtes vers les pages partageables
 * (ex: /video/:id) et injecte les balises Open Graph dynamiques dans
 * index.html avant qu'il ne soit servi au crawler / au navigateur.
 */
export function ogTagsDevPlugin(): Plugin {
  return {
    name: 'rezo-og-tags-dev',
    apply: 'serve',
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        try {
          // Ne traiter que les navigations HTML (pas les modules JS, assets, HMR…)
          const accept = String(req.headers['accept'] || '');
          if (!accept.includes('text/html')) return next();
          if (req.method && req.method !== 'GET') return next();

          const url = req.url || '/';
          const pathname = url.split('?')[0].split('#')[0];
          const route = matchShareableRoute(pathname);
          if (!route) return next();

          const host = String(req.headers['host'] || 'localhost');
          const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
          const fullUrl = `${proto}://${host}${url}`;

          // Lire l'index.html de Vite, le faire passer dans la chaîne de
          // transformations Vite (HMR, plugins…), puis injecter nos OG tags.
          const fs = await import('node:fs/promises');
          const path = await import('node:path');
          const indexPath = path.resolve(server.config.root, 'index.html');
          let html = await fs.readFile(indexPath, 'utf-8');
          html = await server.transformIndexHtml(url, html);
          html = await transformHtmlForShare(html, pathname, fullUrl);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(html);
        } catch (err) {
          console.error('[og-tags-dev] middleware error', err);
          next();
        }
      };

      // Brancher AVANT les middlewares internes de Vite (SPA fallback / indexHtml)
      // pour pouvoir intercepter et réécrire l'index.html.
      server.middlewares.use(middleware);
    },
  };
}
