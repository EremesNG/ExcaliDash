import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from '../frontend/node_modules/esbuild/lib/main.js';
import { API_ERROR_CODES } from '../server/error-codes.ts';

// Frozen AC-2 contract: code, unchanged HTTP status, exact English error text.
const errorContract=[
 ['INVALID_NAME',400,'Invalid name'],
 ['REQUEST_TOO_LARGE',413,'Request too large'],
 ['INVALID_JSON',400,'Invalid JSON'],
 ['INTERNAL_ERROR',500,'Internal server error'],
 ['AUTH_REQUIRED',401,'Sign in with ChatGPT'],
 ['CSRF_ORIGIN_REJECTED',403,'CSRF origin rejected'],
 ['DRAWING_NOT_FOUND',404,'Drawing not found'],
 ['INVALID_COLLECTION',400,'Invalid collection'],
 ['COLLECTION_NOT_FOUND',404,'Collection not found'],
 ['SCENE_UNAVAILABLE',500,'Scene file unavailable'],
 ['INVALID_FILES',400,'Invalid files'],
 ['INVALID_FILE_ID',400,'Invalid file ID'],
 ['INVALID_FILE',400,'Invalid file'],
 ['INVALID_IMAGE',400,'Invalid image'],
 ['IMAGE_TOO_LARGE',413,'Image too large'],
 ['UNTRUSTED_IMAGE_REFERENCE',400,'Untrusted image reference'],
 ['IMAGE_MISSING',400,'Image is missing'],
 ['INVALID_ELEMENTS',400,'Invalid elements'],
 ['INVALID_APP_STATE',400,'Invalid appState'],
 ['VERSION_CONFLICT',409,'VERSION_CONFLICT'],
 ['AUTH_MANAGED_BY_SITES',409,'Authentication is managed by ChatGPT Sites'],
 ['METHOD_NOT_ALLOWED',405,'Method not allowed'],
 ['INVALID_LIBRARY',400,'Invalid library'],
 ['SITE_PRIVATE',409,'This personal Site is private; use Sites access settings to change its audience'],
 ['FILE_NOT_FOUND',404,'File not found'],
 ['BACKUP_IMAGE_MISSING',500,'Backup image missing'],
 ['ARCHIVE_REQUIRED',400,'Archive required'],
 ['ARCHIVE_UPLOAD_TOO_LARGE',413,'Archive too large (20 MB maximum)'],
 ['INVALID_ARCHIVE',400,'Invalid archive'],
 ['ARCHIVE_TOO_MANY_ENTRIES',413,'Archive has too many entries'],
 ['UNSAFE_ARCHIVE_PATH',400,'Unsafe archive path'],
 ['ARCHIVE_EXPANDED_TOO_LARGE',413,'Archive expands beyond 40 MB'],
 ['MANIFEST_MISSING',400,'Missing manifest'],
 ['INVALID_MANIFEST',400,'Invalid manifest'],
 ['ARCHIVE_CONTENT_TOO_LARGE',413,'Archive too large'],
 ['DUPLICATE_MANIFEST_IDS',400,'Duplicate manifest IDs'],
 ['UNSAFE_DRAWING_PATH',400,'Unsafe drawing path'],
 ['DRAWING_MISSING_FROM_ARCHIVE',400,'Missing drawing'],
 ['DRAWING_TOO_LARGE',413,'Drawing too large'],
 ['INVALID_DRAWING_JSON',400,'Invalid drawing JSON'],
 ['INVALID_DRAWING',400,'Invalid drawing'],
 ['INVALID_SESSION',400,'Invalid session'],
 ['INVALID_EVENT',400,'Invalid event'],
 ['EVENT_TOO_LARGE',413,'Event too large'],
 ['INVALID_IMAGE_TYPE',400,'Invalid image type'],
 ['SNAPSHOT_NOT_FOUND',404,'Snapshot not found'],
 ['IMAGE_UNAVAILABLE',500,'Image unavailable'],
 ['FEATURE_UNAVAILABLE',409,'This feature is unavailable on this private personal Site'],
 ['ENDPOINT_NOT_FOUND',404,'Endpoint not found'],
];
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wr('miniflare');
mkdirSync('.sites-runtime/tests',{recursive:true});
await build({stdin:{contents:`import {api} from './server/api.ts'; export default {fetch:api}`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2022',define:{'import.meta.env.DEV':'false'},outfile:'.sites-runtime/tests/api.js'});
const options={modules:true,scriptPath:'.sites-runtime/tests/api.js',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'test-db'},r2Buckets:['BUCKET']};
const mf=new Miniflare(options);
const results=[];
try{
 const sql=readFileSync('drizzle/0000_thick_baron_zemo.sql','utf8');
 const initializeDatabase=async(instance)=>{
  const db=await instance.getD1Database('DB');
  for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 };
 await initializeDatabase(mf);
 const requestFor=(instance)=>async(path,method='GET',data,identity='alice',extra={})=>{const headers={...(identity?{'oai-authenticated-user-id':identity,'oai-authenticated-user-email':identity+'@example.test'}:{}),...extra};let body;if(data!==undefined){if(data instanceof FormData){const encoded=new Response(data);body=new Uint8Array(await encoded.arrayBuffer());headers['Content-Type']=encoded.headers.get('Content-Type');}else if(data instanceof Uint8Array)body=data;else{body=JSON.stringify(data);headers['Content-Type']='application/json';}}const r=await instance.dispatchFetch('http://site.test/api'+path,{method,headers,body});return {r,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer()};};
 const request=requestFor(mf);
 const ok=(label)=>{results.push(label);console.log('PASS',label)};
 const apiError=({r,data},code)=>{
  const expected=errorContract.find(([expectedCode])=>expectedCode===code);
  assert.ok(expected,'Error code must be in the frozen contract: '+code);
  const [,status,error]=expected;
  assert.equal(r.status,status);
  assert.deepEqual(data,{error,code});
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 };
 assert.equal(errorContract.length,49);
 assert.equal(new Set(errorContract.map(([code])=>code)).size,49);
 assert.deepEqual(API_ERROR_CODES,Object.fromEntries(errorContract.map(([code,,error])=>[error,code])));
 ok('error catalogue matches all 49 frozen codes and exact messages');
 const editorScenario=async(outboundService,check)=>{
  const instance=new Miniflare({...options,outboundService});
  try{
   await initializeDatabase(instance);
   await check(requestFor(instance));
  }finally{await instance.dispose()}
 };
 const pinned={package:'@excalidraw/excalidraw',version:'0.18.0-4ce8305',commit:'4ce8305ca78e4ea05ad78c306292932bfe6b256f',shortCommit:'4ce8305',releasedAt:'2026-10-27T16:39:50Z'};
 const sourceUrl='https://excalidraw.com/version.json';
 await editorScenario(()=>Response.json({version:'2026-10-27T16:39:50Z-4ce8305'}),async(request)=>{
  const before=Date.now();
  const {r,data}=await request('/system/editor');
  assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.deepEqual(data,{pinned,upstream:{version:'2026-10-27T16:39:50Z-4ce8305',shortCommit:'4ce8305',releasedAt:'2026-10-27T16:39:50Z'},status:'match',checkedAt:data.checkedAt,sourceUrl});
  assert.equal(new Date(data.checkedAt).toISOString(),data.checkedAt);
  assert.ok(Date.parse(data.checkedAt)>=before&&Date.parse(data.checkedAt)<=Date.now());
 });ok('editor status reports the pinned build and a matching production build');
 for(const [version,status,shortCommit,releasedAt] of [
  ['2026-11-01T00:00:00Z-4CE8305CA78E4EA05AD78C306292932BFE6B256F','match','4ce8305','2026-11-01T00:00:00Z'],
  ['2026-11-01T00:00:00Z-a1b2c3d','newer','a1b2c3d','2026-11-01T00:00:00Z'],
  ['2026-10-27T16:39:51+00:00-a1b2c3d','newer','a1b2c3d','2026-10-27T16:39:51+00:00'],
  ['2026-10-26T00:00:00Z-a1b2c3d','different','a1b2c3d','2026-10-26T00:00:00Z'],
  ['2026-10-27T16:39:50Z-a1b2c3d','different','a1b2c3d','2026-10-27T16:39:50Z'],
 ]){
  await editorScenario(()=>Response.json({version}),async(request)=>{
   const {r,data}=await request('/system/editor');
   assert.equal(r.status,200);
   assert.equal(data.status,status,version);
   assert.deepEqual(data.upstream,{version,shortCommit,releasedAt});
   assert.deepEqual(data.pinned,pinned);
  });
 }ok('editor comparison handles newer, older, equal-time and case-insensitive hash prefixes');
 const unavailable=({r,data})=>{
  assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.deepEqual(data,{pinned,upstream:null,status:'unavailable',checkedAt:data.checkedAt,sourceUrl});
  assert.equal(new Date(data.checkedAt).toISOString(),data.checkedAt);
 };
 for(const outbound of [
  ()=>Response.json({version:'2026-10-27T16:39:50Z-4ce8305'},{status:503}),
  ()=>{throw new Error('Simulated upstream network failure')},
  ()=>new Response('not JSON'),
  ()=>Response.json({}),
  ()=>Response.json({version:'not-a-date-4ce8305'}),
  ()=>Response.json({version:'2026-13-27T16:39:50Z-4ce8305'}),
  ()=>Response.json({version:'2026-10-27T16:39:50Z-4ce830'}),
  ()=>Response.json({version:'2026-10-27T16:39:50Z-'+'a'.repeat(41)}),
  ()=>Response.json({version:'2026-10-27T16:39:50Z-nothex7'}),
  ()=>Response.json({version:123}),
 ])await editorScenario(outbound,async(request)=>unavailable(await request('/system/editor')));
 ok('editor upstream HTTP, network and parse failures degrade to unavailable');
 let delayed;
 try{
  await editorScenario(async()=>{delayed=delay(5000);await delayed;return Response.json({version:'2026-10-27T16:39:50Z-4ce8305'})},async(request)=>{
   const started=performance.now();
   unavailable(await request('/system/editor'));
   assert.ok(performance.now()-started<4500,'editor timeout must respond before the delayed upstream');
  });
 }finally{await delayed}
 ok('editor upstream timeout returns unavailable within a bounded time');
 for(const succeeds of [true,false]){
  let calls=0;
  await editorScenario(async(outbound)=>{
   calls++;
   assert.equal(outbound.url,sourceUrl);
   assert.equal(outbound.method,'GET');
   assert.equal(outbound.headers.get('accept'),'application/json');
   for(const name of ['cookie','authorization','oai-authenticated-user-id','oai-authenticated-user-email','oai-authenticated-user-full-name'])assert.equal(outbound.headers.has(name),false,name);
   assert.equal(await outbound.text(),'');
   return Response.json({version:'2026-10-27T16:39:50Z-4ce8305'},{status:succeeds?200:503});
  },async(request)=>{
   const first=await request('/system/editor','GET',undefined,'alice',{cookie:'session=private',authorization:'Bearer private'});
   const second=await request('/system/editor','GET',undefined,'bob');
   assert.equal(first.r.status,200);
   assert.equal(first.data.status,succeeds?'match':'unavailable');
   assert.equal(calls,1,'cached editor checks must not contact upstream again');
   assert.deepEqual(second.data,first.data);
  });
 }ok('editor checks cache success and failure across users without sending private request data');
 let authorizedCalls=0;
 await editorScenario(()=>{authorizedCalls++;return Response.json({version:'2026-10-27T16:39:50Z-4ce8305'})},async(request)=>{
  apiError(await request('/system/editor','GET',undefined,null),'AUTH_REQUIRED');
  apiError(await request('/system/editor','POST',{},'alice',{origin:'http://evil.test'}),'CSRF_ORIGIN_REJECTED');
  for(const method of ['POST','PUT','DELETE','OPTIONS'])apiError(await request('/system/editor',method),'METHOD_NOT_ALLOWED');
  assert.equal(authorizedCalls,0,'rejected editor requests must not contact upstream');
  assert.equal((await request('/system/editor')).data.status,'match');
  apiError(await request('/system/editor','GET',undefined,null),'AUTH_REQUIRED');
  assert.equal(authorizedCalls,1);
 });ok('editor endpoint requires Sites identity even when cached, accepts GET only and preserves origin checks');
 const upstream=JSON.parse(readFileSync('upstream.json','utf8'));assert.equal(upstream.version,readFileSync('VERSION','utf8').trim());const release=await request('/system/update');assert.deepEqual(release.data,{currentVersion:upstream.version,upstreamCommit:upstream.commit,adapterVersion:upstream.adapterVersion,updateMode:'manual-reviewed',channel:'stable',outboundEnabled:false,latestVersion:null,latestUrl:null,publishedAt:null,isUpdateAvailable:false});ok('system update response remains unchanged and matches the pinned upstream release');
 assert.deepEqual((await request('/auth/status','GET',undefined,null)).data,{authEnabled:true,enabled:true,registrationEnabled:false,authMode:'oidc_enforced',oidcEnabled:true,oidcEnforced:true,oidcProvider:'ChatGPT',bootstrapRequired:false,authOnboardingRequired:false});ok('public auth status contract remains unchanged');
 apiError(await request('/auth/me','GET',undefined,null),'AUTH_REQUIRED');assert.equal((await request('/auth/me')).data.user.id,'alice');ok('production rejects anonymous identity with a stable code; ChatGPT identity accepted');
 apiError(await request('/collections','POST',{name:'bad'},'alice',{origin:'http://evil.test'}),'CSRF_ORIGIN_REJECTED');ok('cross-origin mutations rejected');
 apiError(await request('/not-an-endpoint'),'ENDPOINT_NOT_FOUND');ok('unknown endpoints preserve their 404 error with a stable code');
 apiError(await request('/drawings/%'),'INTERNAL_ERROR');ok('unexpected exceptions remain generic 500 errors with INTERNAL_ERROR');
 const c=(await request('/collections','POST',{name:'Colección'})).data;assert.ok(c.id);assert.equal((await request('/collections')).data.length,1);assert.equal((await request('/collections','GET',undefined,'bob')).data.length,0);ok('collections persist and are isolated by owner');
 const d=(await request('/drawings','POST',{name:'Canvas',collectionId:c.id})).data;assert.ok(d.id);apiError(await request('/drawings/'+d.id,'GET',undefined,'bob'),'DRAWING_NOT_FOUND');ok('drawing ownership enforced');
 apiError(await request('/collections/'+c.id+'/shares','POST',{}),'SITE_PRIVATE');
 apiError(await request('/drawings/'+d.id+'/share','POST',{}),'FEATURE_UNAVAILABLE');
 ok('private sharing and unsupported features retain their 409 errors with distinct codes');
 const e={id:'shape',type:'rectangle',version:1,versionNonce:1,x:10,y:20,width:100,height:100};
 let saved=(await request('/drawings/'+d.id,'PUT',{version:d.version,elements:[e],appState:{viewBackgroundColor:'#fff'}})).data;assert.equal(saved.elements.length,1);assert.equal(saved.version,2);
 apiError(await request('/drawings/'+d.id,'PUT',{version:1,elements:[]}),'VERSION_CONFLICT');assert.equal((await request('/drawings/'+d.id)).data.elements.length,1);ok('R2 scene persistence and optimistic conflict protection');
 const pair=await Promise.all([request('/drawings/'+d.id,'PUT',{version:2,elements:[{...e,x:20}]}),request('/drawings/'+d.id,'PUT',{version:2,elements:[{...e,x:30}]})]);assert.deepEqual(pair.map(x=>x.r.status).sort(),[200,409]);apiError(pair.find(x=>x.r.status===409),'VERSION_CONFLICT');ok('simultaneous D1 writes have exactly one winner');
 let h=(await request('/drawings/'+d.id+'/history')).data;assert.equal(h.totalCount,2);let s=(await request('/drawings/'+d.id+'/history/'+h.snapshots[1].id)).data;assert.equal(s.elements.length,0);assert.equal((await request('/drawings/'+d.id+'/history/'+h.snapshots[1].id+'/restore','POST',{})).r.status,200);assert.equal((await request('/drawings/'+d.id)).data.elements.length,0);assert.equal((await request('/drawings/'+d.id+'/history')).data.totalCount,3);ok('history read and restore preserve a reversible snapshot');
 const image=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64'));
 const up=await request('/drawings/'+d.id+'/files/image1','PUT',image,'alice',{'Content-Type':'image/png'});assert.equal(up.r.status,200);const f={id:'image1',mimeType:'image/png',dataURL:up.data.url,created:1};saved=(await request('/drawings/'+d.id,'PUT',{files:{image1:f}})).data;assert.equal(Object.keys(saved.files).length,1);assert.equal((await request('/files/'+d.id+'/image1')).data.byteLength,image.length);assert.equal((await request('/files/'+d.id+'/image1','GET',undefined,'bob')).r.status,404);ok('R2 image upload, private download, and file reference persistence');
 assert.equal((await request('/drawings/'+d.id,'PUT',{files:{evil:{dataURL:'https://evil.test/image.png'}}})).r.status,400);assert.equal((await request('/drawings/'+d.id)).data.files.image1.dataURL,up.data.url);ok('external file references rejected without losing existing images');
 const dup=(await request('/drawings/'+d.id+'/duplicate','POST',{})).data;assert.ok(dup.id&&dup.id!==d.id);assert.ok(dup.files.image1.dataURL.includes(dup.id));ok('duplicate preserves image bytes with independent file references');
 await request('/library','PUT',{items:[{id:'lib'}]});assert.equal((await request('/library')).data.items[0].id,'lib');await request('/auth/preferences','PUT',{theme:'dark',language:'en'});assert.equal((await request('/auth/preferences')).data.preferences.theme,'dark');ok('library and preferences persist in D1');
 await request('/drawings/'+d.id,'PUT',{collectionId:'trash'});assert.equal((await request('/drawings?collectionId=trash')).data.totalCount,1);await request('/drawings/'+d.id,'PUT',{collectionId:null});assert.equal((await request('/drawings?collectionId=null')).data.totalCount,1);ok('trash and restore; unorganized collection filtering');
 await request('/drawings/'+d.id+'/events?sessionId=session-a','POST',{event:'element-update',payload:{elements:[e],username:'spoof'}});const ev=(await request('/drawings/'+d.id+'/events?sessionId=session-b&since=0')).data;assert.equal(ev.events.find(e=>e.event==='element-update').payload.elements[0].id,'shape');assert.notEqual(ev.events.find(e=>e.event==='element-update').payload.username,'spoof');assert.equal((await request('/drawings/'+d.id+'/events?sessionId=session-c','GET',undefined,'bob')).r.status,404);ok('cross-session collaboration event delivery and ownership');
 const backup=await request('/export/excalidash');assert.equal(backup.r.status,200);const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(backup.data);const manifest=JSON.parse(await zip.file('excalidash.manifest.json').async('string'));assert.equal(manifest.drawings.length,2);const scene=JSON.parse(await zip.file(manifest.drawings[0].filePath).async('string'));assert.ok(scene.files.image1.dataURL.startsWith('data:image/png;base64,'));ok('original .excalidash ZIP manifest and embedded image export');
 const form=(bytes=backup.data)=>{const f=new FormData();f.set('archive',new File([bytes],'backup.excalidash'));return f;};
 apiError(await request('/import/excalidash/verify','POST',form(new Uint8Array(20*1024*1024+1))),'ARCHIVE_UPLOAD_TOO_LARGE');
 const tooManyCollections=new JSZip();tooManyCollections.file('excalidash.manifest.json',JSON.stringify({format:'excalidash',formatVersion:1,collections:Array.from({length:501},(_,i)=>({id:'collection-'+i})),drawings:[]}));
 apiError(await request('/import/excalidash/verify','POST',form(await tooManyCollections.generateAsync({type:'uint8array'}))),'ARCHIVE_CONTENT_TOO_LARGE');
 ok('archive upload and content limits preserve distinct 413 messages and codes');
 assert.equal((await request('/import/excalidash/verify','POST',form(),'bob')).data.valid,true);assert.equal((await request('/import/excalidash','POST',form(),'bob')).r.status,200);assert.equal((await request('/drawings','GET',undefined,'bob')).data.totalCount,2);assert.equal((await request('/drawings')).data.totalCount,2);ok('backup verify/import round trip preserves owners and originals');
 await request('/collections/'+c.id,'DELETE');assert.equal((await request('/drawings/'+dup.id)).data.collectionId,null);await request('/drawings/'+dup.id,'DELETE');assert.equal((await request('/drawings/'+dup.id)).r.status,404);assert.equal((await request('/files/'+dup.id+'/image1')).r.status,404);ok('collection removal unorganizes drawings; permanent deletion cleans file access');
 writeFileSync('tests/adapter-results.json',JSON.stringify({passed:results.length,results},null,2));
 console.log(`${results.length} integration checks passed`);
}finally{await mf.dispose()}
