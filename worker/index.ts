import { api } from '../server/api';
import html from '../server/spa-html';
// Keep the supported Sites/Vinext build integration while serving the retained
// SPA directly. The SPA owns navigation; RSC request context is unnecessary.
export default {
 fetch(request: Request, env: Cloudflare.Env) {
  if(new URL(request.url).pathname.startsWith('/api/')) return api(request,env);
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
};
