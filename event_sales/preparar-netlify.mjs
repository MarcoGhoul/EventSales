import { writeFileSync } from 'node:fs';

if (!process.env.RENDER_ORIGIN) throw new Error('Configura RENDER_ORIGIN en Netlify y vuelve a desplegar.');
const url = new URL(process.env.RENDER_ORIGIN);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
  throw new Error('RENDER_ORIGIN debe ser el origen HTTPS público de la API de Render, sin /api.');
}
writeFileSync('src/environments/environment.ts',
  'export const environment = { apiUrl: ' + JSON.stringify(url.origin + '/api') + ' };\n');
// Las imágenes guardadas en los eventos tienen rutas relativas al origen de la web.
writeFileSync('public/_redirects', [
  '/api/* ' + url.origin + '/api/:splat 302',
  '/* /index.html 200',
  '',
].join('\n'));
