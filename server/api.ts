import JSZip from "jszip";
import upstream from "../upstream.json";
// Sites adapter: original REST contracts, D1 metadata/CAS, immutable R2 scenes.
const MAX_JSON = 16 * 1024 * 1024;
const json = (data: unknown, status = 200) => Response.json(data, {status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class HttpError extends Error { constructor(public status:number,message:string){super(message)} }
const assert = (value:any, status:number, message:string):void => { if(!value) throw new HttpError(status,message); };
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const pinnedEditor = {
 package: upstream.editor.package,
 version: upstream.editor.version,
 commit: upstream.editor.commit,
 shortCommit: upstream.editor.commit.slice(0,7),
 releasedAt: upstream.editor.releasedAt,
};
type EditorProductionBuild = {version:string;shortCommit:string;releasedAt:string};
type EditorStatusResponse = {
 pinned:typeof pinnedEditor;
 upstream:EditorProductionBuild|null;
 status:'match'|'newer'|'different'|'unavailable';
 checkedAt:string;
 sourceUrl:string;
};
// Share only completed public metadata across requests, never request-owned I/O.
let editorCache:{result:EditorStatusResponse;expiresAt:number}|undefined;
async function editorStatus():Promise<EditorStatusResponse>{
 if(editorCache&&editorCache.expiresAt>Date.now())return editorCache.result;
 let production:EditorProductionBuild|null=null;
 try{
  const response=await fetch(upstream.editor.productionVersionUrl,{signal:AbortSignal.timeout(3000),headers:{accept:'application/json'}});
  if(!response.ok)throw new Error('Editor production version unavailable');
  const data:unknown=await response.json();
  const version=data&&typeof data==='object'&&'version'in data?data.version:null;
  if(typeof version!=='string')throw new Error('Missing editor production version');
  const match=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))-([a-f0-9]{7,40})$/i.exec(version);
  if(!match||!Number.isFinite(Date.parse(match[1])))throw new Error('Invalid editor production version');
  production={version,shortCommit:match[2].slice(0,7).toLowerCase(),releasedAt:match[1]};
 }catch{
  // Outbound and parse failures are an informational UI state, not API errors.
 }
 let status:EditorStatusResponse['status']='unavailable';
 if(production){
  if(production.shortCommit===pinnedEditor.shortCommit.toLowerCase())status='match';
  else status=Date.parse(production.releasedAt)>Date.parse(pinnedEditor.releasedAt)?'newer':'different';
 }
 const result:EditorStatusResponse={pinned:pinnedEditor,upstream:production,status,checkedAt:now(),sourceUrl:upstream.editor.productionVersionUrl};
 editorCache={result,expiresAt:Date.now()+(production?15*60_000:60_000)};
 return result;
}
const safeId = (id:string) => /^[a-zA-Z0-9_-]{1,160}$/.test(id);
const nameOf = (v:any) => { assert(typeof v==='string' && v.trim().length>0 && v.length<=500,400,'Invalid name'); return v.trim(); };
async function body(req:Request){ assert(Number(req.headers.get('content-length')||0)<=MAX_JSON,413,'Request too large'); const raw=await req.text(); assert(raw.length<=MAX_JSON,413,'Request too large'); try{return raw?JSON.parse(raw):{}}catch{throw new HttpError(400,'Invalid JSON')} }
export async function api(req:Request,env:any):Promise<Response>{
 try { return await route(req,env); } catch(e:any){if(!(e instanceof HttpError)) console.error('Sites API error',e);return json({error:e instanceof HttpError?e.message:'Internal server error'}, e instanceof HttpError?e.status:500);}
}
async function route(req:Request,env:any):Promise<Response>{
 const url=new URL(req.url), p=url.pathname.replace(/^\/api/,'').split('/').filter(Boolean).map(decodeURIComponent), method=req.method;
 // Hosted identity headers are supplied by Sites, never by a browser parameter.
 const userId=req.headers.get('oai-authenticated-user-id') || (import.meta.env.DEV ? 'sites-preview-qa' : null);
 if(p.join('/')==='auth/status') return json({authEnabled:true,enabled:true,registrationEnabled:false,authMode:'oidc_enforced',oidcEnabled:true,oidcEnforced:true,oidcProvider:'ChatGPT',bootstrapRequired:false,authOnboardingRequired:false});
 if(p[0]==='csrf-token')return json({token:'sites-origin-validation',header:'x-csrf-token'});
 assert(userId,401,'Sign in with ChatGPT');
 if(!['GET','HEAD','OPTIONS'].includes(method)) {
   const origin=req.headers.get('origin'); const site=req.headers.get('sec-fetch-site');
   assert((!origin||origin===url.origin)&&site!=='cross-site',403,'CSRF origin rejected');
 }
 const db=env.DB,bucket=env.BUCKET;
 const run=(sql:string,...args:any[])=>db.prepare(sql).bind(...args).run();
 const first=(sql:string,...args:any[])=>db.prepare(sql).bind(...args).first();
 const all=async(sql:string,...args:any[])=>(await db.prepare(sql).bind(...args).all()).results;
 let user=await first('SELECT * FROM users WHERE id=?',userId);
 if(!user){let full=req.headers.get('oai-authenticated-user-full-name')||req.headers.get('oai-authenticated-user-email')||'ChatGPT';if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')try{full=decodeURIComponent(full)}catch{};await run('INSERT OR IGNORE INTO users(id,email,name) VALUES(?,?,?)',userId,req.headers.get('oai-authenticated-user-email')||'',full);user=await first('SELECT * FROM users WHERE id=?',userId);}
 const publicUser=()=>({id:user.id,email:user.email,name:user.name,role:'USER',mustResetPassword:false});
 const ownDrawing=async(id:string)=>{const d=await first('SELECT * FROM drawings WHERE id=? AND userId=?',id,userId);assert(d,404,'Drawing not found');return d;};
 const checkCollection=async(id:any)=>{assert(id===null||id==='trash'||typeof id==='string',400,'Invalid collection'); if(id&&id!=='trash')assert(await first('SELECT id FROM collections WHERE id=? AND userId=?',id,userId),404,'Collection not found');};
 const readScene=async(d:any)=>{const o=await bucket.get(d.sceneKey);assert(o,500,'Scene file unavailable');return o.json();};
 const publicDrawing=async(d:any,include=true)=>({...d,sceneKey:undefined,accessLevel:'owner',creatorName:user.name,...(include?await readScene(d):{})});
 const fileUrl=(drawingId:string,fileId:string)=>`/api/files/${drawingId}/${fileId}`;
 const intern=async(id:string,input:any)=>{const out:any={}; assert(input&&typeof input==='object'&&!Array.isArray(input),400,'Invalid files');for(const [fid,entry] of Object.entries(input) as any){assert(safeId(fid),400,'Invalid file ID');assert(entry&&typeof entry==='object',400,'Invalid file'); const f={...entry,id:fid};const data=f.dataURL; if(typeof data==='string'&&data.startsWith('data:')){const match=/^data:(image\/(?:png|jpeg|webp|gif|svg\+xml|avif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(data);assert(match,400,'Invalid image'); const bytes=Uint8Array.from(atob(match![2]),c=>c.charCodeAt(0));assert(bytes.length<=10*1024*1024,413,'Image too large');const key=`${userId}/files/${id}/${fid}`;if(!await first('SELECT fileId FROM files WHERE drawingId=? AND fileId=?',id,fid))await bucket.put(key,bytes,{httpMetadata:{contentType:match![1]}});await run('INSERT INTO files(drawingId,fileId,objectKey,mimeType,size) VALUES(?,?,?,?,?) ON CONFLICT(drawingId,fileId) DO NOTHING',id,fid,key,match![1],bytes.length);f.dataURL=fileUrl(id,fid);f.mimeType=match![1];} else if(typeof data==='string'&&data.length){assert(data===fileUrl(id,fid),400,'Untrusted image reference');assert(await first('SELECT fileId FROM files WHERE drawingId=? AND fileId=?',id,fid),400,'Image is missing');}else continue;out[fid]=f;}return out;};
 const validateScene=(b:any)=>{if('elements'in b)assert(Array.isArray(b.elements)&&b.elements.every((e:any)=>e&&typeof e.id==='string'),400,'Invalid elements');if('appState'in b)assert(b.appState&&typeof b.appState==='object'&&!Array.isArray(b.appState),400,'Invalid appState');};
 const create=async(b:any)=>{validateScene(b);const id=uid(),t=now(); await checkCollection(b.collectionId??null); const scene={elements:b.elements||[],appState:b.appState||{},files:await intern(id,b.files||{}),preview:typeof b.preview==='string'?b.preview:null};const key=`${userId}/scenes/${id}/${uid()}.json`;await bucket.put(key,JSON.stringify(scene),{httpMetadata:{contentType:'application/json'}});await run('INSERT INTO drawings(id,userId,name,collectionId,version,sceneKey,createdAt,updatedAt) VALUES(?,?,?,?,1,?,?,?)',id,userId,nameOf(b.name||'Untitled Drawing'),b.collectionId??null,key,t,t);return ownDrawing(id);};
 const save=async(d:any,b:any,replace=false)=>{validateScene(b);if(b.version!==undefined)assert(b.version===d.version,409,'VERSION_CONFLICT');const old=await readScene(d);if(b.collectionId!==undefined)await checkCollection(b.collectionId);const next={...old,...('elements'in b?{elements:b.elements}:{}),...('appState'in b?{appState:b.appState}:{}),...('preview'in b?{preview:b.preview}:{}),files:replace?b.files:{...old.files,...await intern(d.id,b.files||{})}};const key=`${userId}/scenes/${d.id}/${uid()}.json`,t=now();await bucket.put(key,JSON.stringify(next),{httpMetadata:{contentType:'application/json'}});
 // D1 batch is atomic. Snapshot insertion is guarded by the exact scene revision.
 const results=await db.batch([db.prepare('INSERT INTO snapshots(id,drawingId,version,sceneKey,createdAt) SELECT ?,id,version,sceneKey,? FROM drawings WHERE id=? AND userId=? AND version=?').bind(uid(),t,d.id,userId,d.version),db.prepare('UPDATE drawings SET name=?,collectionId=?,version=version+1,sceneKey=?,updatedAt=? WHERE id=? AND userId=? AND version=?').bind(b.name!==undefined?nameOf(b.name):d.name,b.collectionId!==undefined?b.collectionId:d.collectionId,key,t,d.id,userId,d.version)]);
 if(!results[1].meta.changes){await bucket.delete(key);throw new HttpError(409,'VERSION_CONFLICT');}return publicDrawing(await ownDrawing(d.id));};
 if(p[0]==='csrf-token')return json({token:'sites-origin-validation',header:'x-csrf-token'});
 if(p[0]==='auth'){
  if(p[1]==='me')return json({user:publicUser()});
  if(p[1]==='refresh')return json({ok:true});
  if(p[1]==='logout')return json({oidcLogout:true});
  if(p[1]==='preferences'){if(method==='PUT'){const b=await body(req);await run('UPDATE users SET preferences=? WHERE id=?',JSON.stringify({...JSON.parse(user.preferences),...b}),userId);user=await first('SELECT * FROM users WHERE id=?',userId);}return json({preferences:JSON.parse(user.preferences)});}
  if(p[1]==='profile'&&method==='PUT'){const b=await body(req);await run('UPDATE users SET name=? WHERE id=?',nameOf(b.name),userId);user=await first('SELECT * FROM users WHERE id=?',userId);return json({user:publicUser()});}
  throw new HttpError(409,'Authentication is managed by ChatGPT Sites');
 }
 if(p.join('/')==='system/editor'){
  assert(method==='GET',405,'Method not allowed');
  return json(await editorStatus());
 }
 if(p[0]==='system')return json({currentVersion:upstream.version,upstreamCommit:upstream.commit,adapterVersion:upstream.adapterVersion,updateMode:upstream.updateMode,channel:'stable',outboundEnabled:false,latestVersion:null,latestUrl:null,publishedAt:null,isUpdateAvailable:false});
 if(p[0]==='library'){if(method==='PUT'){const b=await body(req);assert(Array.isArray(b.items),400,'Invalid library');await run('UPDATE users SET library=? WHERE id=?',JSON.stringify(b.items),userId);return json({items:b.items});}return json({items:JSON.parse(user.library)});}
 if(p[0]==='collections'){
  if(!p[1]){if(method==='GET')return json((await all('SELECT * FROM collections WHERE userId=? ORDER BY createdAt',userId)).map((c:any)=>({...c,isOwner:true,isShared:false,sharedRole:null})));if(method==='POST'){const b=await body(req),id=uid(),t=now();await run('INSERT INTO collections(id,userId,name,createdAt,updatedAt) VALUES(?,?,?,?,?)',id,userId,nameOf(b.name),t,t);return json(await first('SELECT * FROM collections WHERE id=?',id),201);}}
  assert(await first('SELECT id FROM collections WHERE id=? AND userId=?',p[1],userId),404,'Collection not found');
  if(p[2]==='shares'&&method==='GET')return json({shares:[]});
  if(p[2]==='share-resolve')return json({users:[]});
  assert(!p[2],409,'This personal Site is private; use Sites access settings to change its audience');
  if(method==='PUT'){await run('UPDATE collections SET name=?,updatedAt=? WHERE id=? AND userId=?',nameOf((await body(req)).name),now(),p[1],userId);return json({success:true});}
  if(method==='DELETE'){await db.batch([db.prepare('UPDATE drawings SET collectionId=NULL WHERE collectionId=? AND userId=?').bind(p[1],userId),db.prepare('DELETE FROM collections WHERE id=? AND userId=?').bind(p[1],userId)]);return json({success:true});}
 }
 if(p[0]==='files'){
  if(p[1]==='config')return json({s3Enabled:false,r2Enabled:true});
  await ownDrawing(p[1]);const f=await first('SELECT * FROM files WHERE drawingId=? AND fileId=?',p[1],p[2]);assert(f,404,'File not found');const o=await bucket.get(f.objectKey);assert(o,404,'File not found');return new Response(o.body,{headers:{'Content-Type':f.mimeType,'Content-Disposition':'attachment','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(p[0]==='export'&&p[1]==='excalidash'&&method==='GET'){
  const zip=new JSZip(),ds=await all('SELECT * FROM drawings WHERE userId=?',userId),cs=await all('SELECT * FROM collections WHERE userId=?',userId),manifest:any={format:'excalidash',formatVersion:1,exportedAt:now(),excalidashBackendVersion:'sites',userId,unorganizedFolder:'Unorganized',collections:cs.map((c:any)=>({...c,folder:c.id})),drawings:[]};
  for(const d of ds){const scene=await readScene(d),embedded:any={};for(const [fid,f]of Object.entries(scene.files||{}) as any){const rec=await first('SELECT * FROM files WHERE drawingId=? AND fileId=?',d.id,fid);assert(rec,500,'Backup image missing');const obj=await bucket.get(rec.objectKey);assert(obj,500,'Backup image missing');embedded[fid]={...f,dataURL:await toDataURL(obj,rec.mimeType)};}const path=`${d.collectionId||'Unorganized'}/${d.id}.excalidraw`;manifest.drawings.push({...d,sceneKey:undefined,filePath:path});zip.file(path,JSON.stringify({type:'excalidraw',version:2,source:url.origin,elements:scene.elements,appState:scene.appState,files:embedded}));}
  zip.file('excalidash.manifest.json',JSON.stringify(manifest,null,2));const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});return new Response(bytes.buffer as ArrayBuffer,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="excalidash-backup-${now().slice(0,10)}.excalidash"`,'Cache-Control':'no-store'}});
 }
 if(p[0]==='import'&&p[1]==='excalidash'&&method==='POST'){
  const form=await req.formData(),file=form.get('archive');assert(file&&typeof file!=='string',400,'Archive required');assert((file as File).size<=20*1024*1024,413,'Archive too large (20 MB maximum)');let zip:JSZip;try{zip=await JSZip.loadAsync(await (file as File).arrayBuffer())}catch{throw new HttpError(400,'Invalid archive')}
  const entries=Object.values(zip.files);assert(entries.length<=1000,413,'Archive has too many entries');let expanded=0;for(const e of entries){assert(!e.name.startsWith('/')&&!e.name.split('/').includes('..'),400,'Unsafe archive path');expanded+=(e as any)._data?.uncompressedSize||0;}assert(expanded<=40*1024*1024,413,'Archive expands beyond 40 MB');
  const manifestEntry=zip.file('excalidash.manifest.json');assert(manifestEntry,400,'Missing manifest');let m:any;try{m=JSON.parse(await manifestEntry!.async('string'))}catch{throw new HttpError(400,'Invalid manifest')};assert(m.format==='excalidash'&&m.formatVersion===1&&Array.isArray(m.collections)&&Array.isArray(m.drawings),400,'Invalid manifest');assert(m.drawings.length<=500&&m.collections.length<=500,413,'Archive too large');assert(new Set(m.collections.map((c:any)=>c.id)).size===m.collections.length&&new Set(m.drawings.map((d:any)=>d.id)).size===m.drawings.length,400,'Duplicate manifest IDs');
  const parsed=[];for(const meta of m.drawings){assert(typeof meta.filePath==='string'&&!meta.filePath.split('/').includes('..'),400,'Unsafe drawing path');const e=zip.file(meta.filePath);assert(e,400,'Missing drawing');const raw=await e!.async('string');assert(raw.length<=MAX_JSON,413,'Drawing too large');let scene;try{scene=JSON.parse(raw)}catch{throw new HttpError(400,'Invalid drawing JSON')};validateScene(scene);assert(Array.isArray(scene.elements),400,'Invalid drawing');nameOf(meta.name);parsed.push({meta,scene});}
  if(p[2]==='verify')return json({valid:true,formatVersion:1,exportedAt:m.exportedAt,excalidashBackendVersion:m.excalidashBackendVersion,collections:m.collections.length,drawings:m.drawings.length});
  // Merge by creating new IDs; never overwrite an existing personal drawing.
  const mapping=new Map<string,string>();for(const c of m.collections){if(c.id==='trash'){mapping.set('trash','trash');continue;}const id=uid(),t=now();await run('INSERT INTO collections(id,userId,name,createdAt,updatedAt) VALUES(?,?,?,?,?)',id,userId,nameOf(c.name),t,t);mapping.set(c.id,id);}let imported=0;for(const {meta,scene}of parsed){await create({...scene,name:meta.name,collectionId:meta.collectionId==='trash'?'trash':mapping.get(meta.collectionId)||null});imported++;}return json({success:true,importedDrawings:imported,importedCollections:mapping.size,drawings:imported,collections:mapping.size});
 }
 if(p[0]==='drawings'){
  if(p[1]==='shared')return json({drawings:[],totalCount:0});
  if(!p[1]){
   if(method==='POST')return json(await publicDrawing(await create(await body(req))),201);
   assert(method==='GET',405,'Method not allowed');let rows=await all('SELECT * FROM drawings WHERE userId=?',userId);const c=url.searchParams.get('collectionId'),search=(url.searchParams.get('search')||'').toLowerCase();rows=rows.filter((d:any)=>(c===null?d.collectionId!=='trash':c==='null'?d.collectionId===null:d.collectionId===c)&&d.name.toLowerCase().includes(search));const field=['name','createdAt','updatedAt'].includes(url.searchParams.get('sortField')||'')?url.searchParams.get('sortField')!:'updatedAt',dir=url.searchParams.get('sortDirection')==='asc'?1:-1;rows.sort((a:any,b:any)=>String(a[field]).localeCompare(String(b[field]))*dir);const count=rows.length,offset=Math.max(0,Number(url.searchParams.get('offset'))||0),limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||100));return json({drawings:await Promise.all(rows.slice(offset,offset+limit).map((d:any)=>publicDrawing(d,url.searchParams.get('includeData')==='true'))),totalCount:count,offset,limit});
  }
  const d=await ownDrawing(p[1]);
  if(p[2]==='events'){
    const session=url.searchParams.get('sessionId')||'';assert(safeId(session),400,'Invalid session');
    if(method==='GET'){const since=Math.max(0,Number(url.searchParams.get('since'))||0);const rows=await all('SELECT * FROM events WHERE drawingId=? AND id>? AND createdAt>? ORDER BY id LIMIT 200',d.id,since,Date.now()-60000);return json({events:rows.map((r:any)=>({...r,payload:JSON.parse(r.payload)}))});}
    if(method==='POST'){const b=await body(req);assert(['element-update','cursor-move','user-activity'].includes(b.event),400,'Invalid event');assert(JSON.stringify(b.payload).length<1024*1024,413,'Event too large');await db.batch([db.prepare('DELETE FROM events WHERE drawingId=? AND createdAt<?').bind(d.id,Date.now()-60000),db.prepare('INSERT INTO events(drawingId,sessionId,event,payload,createdAt) VALUES(?,?,?,?,?)').bind(d.id,session,b.event,JSON.stringify({...b.payload,userId:session,drawingId:d.id,username:user.name}),Date.now())]);return json({ok:true});}
  }
  if(p[2]==='files'&&p[3]&&method==='PUT'){assert(safeId(p[3]),400,'Invalid file ID');const mime=req.headers.get('content-type')?.split(';')[0]||'';assert(/^image\/(png|jpeg|webp|gif|svg\+xml|avif)$/.test(mime),400,'Invalid image type');const bytes=await req.arrayBuffer();assert(bytes.byteLength<=10*1024*1024,413,'Image too large');const key=`${userId}/files/${d.id}/${p[3]}`;const existing=await first('SELECT fileId FROM files WHERE drawingId=? AND fileId=?',d.id,p[3]);if(!existing){await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});await run('INSERT OR IGNORE INTO files(drawingId,fileId,objectKey,mimeType,size) VALUES(?,?,?,?,?)',d.id,p[3],key,mime,bytes.byteLength);}return json({url:fileUrl(d.id,p[3])});}
  if(p[2]==='preview')return json({preview:(await readScene(d)).preview||null});
  if(p[2]==='history'){
    if(!p[3]){const rows=await all('SELECT id,version,createdAt FROM snapshots WHERE drawingId=? ORDER BY version DESC',d.id);const offset=Number(url.searchParams.get('offset'))||0,limit=Math.min(100,Number(url.searchParams.get('limit'))||50);return json({snapshots:rows.slice(offset,offset+limit),totalCount:rows.length});}
    const s=await first('SELECT * FROM snapshots WHERE id=? AND drawingId=?',p[3],d.id);assert(s,404,'Snapshot not found');const scene=await readScene(s);if(p[4]==='restore'&&method==='POST'){const restored=await save(d,{...scene},true);await run('INSERT INTO events(drawingId,sessionId,event,payload,createdAt) VALUES(?,?,?,?,?)',d.id,'server','drawing-server-update',JSON.stringify({drawingId:d.id}),Date.now());return json(restored);}return json({...s,sceneKey:undefined,...scene});
  }
  if(p[2]==='duplicate'&&method==='POST'){const scene=await readScene(d);const embedded:any={};for(const [fid,f]of Object.entries(scene.files) as any){const record=await first('SELECT * FROM files WHERE drawingId=? AND fileId=?',d.id,fid);assert(record,500,'Image unavailable');const obj=await bucket.get(record.objectKey);assert(obj,500,'Image unavailable');embedded[fid]={...f,dataURL:await toDataURL(obj,record.mimeType)};}return json(await publicDrawing(await create({...scene,files:embedded,name:d.name+' (copy)',collectionId:d.collectionId})));}
  if(p[2]==='permissions'&&method==='GET')return json({permissions:[],linkShares:[]});
  if(p[2]==='share-resolve')return json({users:[]});
  assert(!p[2],409,'This feature is unavailable on this private personal Site');
  if(method==='GET')return json(await publicDrawing(d));
  if(method==='PUT')return json(await save(d,await body(req)));
  if(method==='DELETE'){const fileRows=await all('SELECT objectKey FROM files WHERE drawingId=?',d.id),history=await all('SELECT sceneKey FROM snapshots WHERE drawingId=?',d.id);await db.batch(['files','snapshots','events'].map(t=>db.prepare(`DELETE FROM ${t} WHERE drawingId=?`).bind(d.id)).concat([db.prepare('DELETE FROM drawings WHERE id=? AND userId=?').bind(d.id,userId)]));await Promise.all([d.sceneKey,...fileRows.map((f:any)=>f.objectKey),...history.map((s:any)=>s.sceneKey)].map(k=>bucket.delete(k)));return json({success:true});}
 }
 throw new HttpError(404,'Endpoint not found');
}
async function toDataURL(o:any,mime:string){const bytes=new Uint8Array(await o.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return `data:${mime};base64,${btoa(binary)}`;}
