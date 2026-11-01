import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{cwd:'frontend',stdio:'inherit',env:{...process.env,VITE_API_URL:'/api',VITE_APP_BUILD_LABEL:'ChatGPT Sites · personal'}});if(r.status)process.exit(r.status);
const a=spawnSync(process.execPath,['scripts/copy-excalidraw-assets.mjs','--dist'],{cwd:'frontend',stdio:'inherit'});if(a.status)process.exit(a.status);
mkdirSync('public',{recursive:true});rmSync('public/assets',{recursive:true,force:true});cpSync('frontend/dist', 'public', {recursive:true});
writeFileSync('server/spa-html.ts','export default '+JSON.stringify(readFileSync('frontend/dist/index.html','utf8'))+';\n');
