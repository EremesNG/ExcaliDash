import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Inspect files that would be included by git add, including new authored files.
const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const bad = new Set();
const generated = /^(?:public\/|server\/spa-html\.ts$|(?:frontend\/)?node_modules\/|(?:frontend\/)?dist\/|\.wrangler\/|\.sites-runtime\/|outputs\/)/;
const privateMaterial = /(?:appgprj_[a-f0-9]{20,}|art_v2_[a-z0-9_]+|github_pat_[a-z0-9_]{20,}|gh[pousr]_[a-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
for (const path of paths) {
  if (generated.test(path) || /(?:^|\/)\.env(?!\.example$)|(?:^|\/)\.dev\.vars|\.(?:sqlite|sqlite3|db|pem)$/.test(path)) bad.add(path);
  let bytes;
  try { bytes=readFileSync(path); } catch (e) { if(e.code==='ENOENT')continue; throw e; }
  if(bytes.includes(0))continue;
  if(privateMaterial.test(bytes.toString('utf8')))bad.add(path);
}
const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
if(Object.hasOwn(manifest,'project_id'))bad.add('.openai/hosting.json (deployment identity)');
if(manifest.d1!=='DB'||manifest.r2!=='BUCKET')bad.add('.openai/hosting.json (unexpected bindings)');
if(bad.size){console.error('Review files before publishing public source:\n'+[...bad].join('\n'));process.exit(1);}
console.log(`Public source check passed (${paths.length} files; no deployment identity or generated runtime files).`);
