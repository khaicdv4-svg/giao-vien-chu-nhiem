(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HmvReviewStorage=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const STORES=['documents','attempts','outbox','meta'];
const locks=new WeakMap();
function record(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!value.id.trim())throw new Error('Record requires a nonempty string id');return value;}
function storeName(name){if(!STORES.includes(name))throw new Error('Unsupported store: '+name);return name;}
function structure(name,value){
 record(value);const object=x=>x&&typeof x==='object'&&!Array.isArray(x)&&!(x instanceof Blob);
 if(name==='documents'&&(value.schemaVersion!==1||!Array.isArray(value.questions)||!Array.isArray(value.blocks)||!object(value.metadata)||!['draft','reviewed','published'].includes(value.status)))throw Error('Invalid document structure');
 if(name==='attempts'&&(!Array.isArray(value.questions)||typeof value.documentId!=='string'||!value.documentId||!object(value.answers)||!['in-progress','pending-manual','graded'].includes(value.status)))throw Error('Invalid attempt structure');
 if(name==='documents'||name==='attempts'){
  if(value.questions.some(q=>!object(q)||typeof q.id!=='string'||!q.id||typeof q.type!=='string'||!Array.isArray(q.options)||!Array.isArray(q.correctAnswers)||!Array.isArray(q.pairs)||!Array.isArray(q.blockIds)))throw Error('Invalid question structure');
  if(value.blocks&&(!Array.isArray(value.blocks)||value.blocks.some(b=>!object(b)||typeof b.id!=='string'||!b.id)))throw Error('Invalid block structure');
 }
 if(name==='outbox'&&(typeof value.userId!=='string'||!value.userId.trim()||typeof value.type!=='string'||!value.type.trim()||!object(value.payload)))throw Error('Invalid outbox structure');
 return value;
}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB request failed'));});}
function completed(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));tx.onerror=()=>{};});}
async function encode(value){
 if(value instanceof Blob){const bytes=new Uint8Array(await value.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return {$hmvBlob:1,type:value.type,data:btoa(binary)};}
 if(Array.isArray(value))return Promise.all(value.map(encode));
 if(value&&typeof value==='object'){const result={};for(const key of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe backup key');result[key]=await encode(value[key]);}return result;}
 if(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return value;
 throw new Error('Unsupported backup value');
}
function decode(value){
 if(value&&typeof value==='object'&&Object.hasOwn(value,'$hmvBlob')){
  if(value.$hmvBlob!==1||typeof value.type!=='string'||typeof value.data!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)||Object.keys(value).length!==3)throw new Error('Invalid backup Blob');
  return new Blob([Uint8Array.from(atob(value.data),x=>x.charCodeAt(0))],{type:value.type});
 }
 if(Array.isArray(value))return value.map(decode);
 if(value&&typeof value==='object'){const result={};for(const key of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe backup key');result[key]=decode(value[key]);}return result;}
 if(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return value;
 throw new Error('Invalid backup value');
}
function validateBackup(input){
 const data=typeof input==='string'?JSON.parse(input):input;
 if(!data||data.schema!=='hmv-review-backup'||data.version!==1||!data.stores||Object.keys(data.stores).length!==STORES.length)throw new Error('Unsupported or invalid backup schema/version');
 const result={};for(const name of STORES){if(!Array.isArray(data.stores[name]))throw new Error('Invalid backup store');const ids=new Set();result[name]=data.stores[name].map(item=>{const val=structure(name,decode(item));if(ids.has(val.id))throw new Error('Duplicate backup id');ids.add(val.id);return val;});}return result;
}
async function open(options={}){
 const factory=options.indexedDB||globalThis.indexedDB;if(!factory)throw new Error('IndexedDB unavailable; local persistence cannot start');
 const req=factory.open('hmv-review-v1',1);
 req.onupgradeneeded=()=>{for(const name of STORES)if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};
 const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Database open failed'));req.onblocked=()=>reject(new Error('Database blocked by another tab'));});
 db.onversionchange=()=>db.close();
 async function transaction(names,mode,body){const tx=db.transaction(names,mode);const done=completed(tx);try{const result=await body(tx);await done;return result;}catch(error){try{tx.abort();}catch(_){}await done.catch(()=>{});throw error;}}
 return {
  list(name){storeName(name);return transaction([name],'readonly',tx=>request(tx.objectStore(name).getAll()));},
  get(name,id){storeName(name);return transaction([name],'readonly',tx=>request(tx.objectStore(name).get(id)));},
  put(name,value){storeName(name);record(value);return transaction([name],'readwrite',tx=>request(tx.objectStore(name).put(value)));},
  remove(name,id){storeName(name);return transaction([name],'readwrite',tx=>request(tx.objectStore(name).delete(id)));},
  acknowledge(operation){return transaction(['outbox'],'readwrite',async tx=>{const s=tx.objectStore('outbox');const latest=await request(s.get(operation.id));if(JSON.stringify(latest)!==JSON.stringify(operation))return false;s.delete(operation.id);return true;});},
  atomicAttempt(attempt,operation){record(attempt);if(operation)record(operation);return transaction(['attempts','outbox'],'readwrite',tx=>{tx.objectStore('attempts').put(attempt);if(operation)tx.objectStore('outbox').put(operation);});},
  async exportBackup(){const stores=await transaction(STORES,'readonly',tx=>Promise.all(STORES.map(name=>request(tx.objectStore(name).getAll()))));const result={schema:'hmv-review-backup',version:1,stores:{}};for(let i=0;i<STORES.length;i++)result.stores[STORES[i]]=await encode(stores[i]);return result;},
  async importBackup(input){const data=validateBackup(input);return transaction(STORES,'readwrite',tx=>{for(const name of STORES){const s=tx.objectStore(name);s.clear();for(const item of data[name])s.put(item);}});},
  close(){db.close();}
 };
}
async function runSync(repo,session,transport){
 const result={status:'local-only',sent:0,pending:0,conflicts:[],errors:[]};
 if(!session||session.mode!=='authenticated'||session.verified!==true||typeof session.userId!=='string'||!session.userId.trim())return result;
 if(typeof transport!=='function'){result.status='unavailable';return result;}
 const userId=session.userId;
 const currentSession=()=>session.mode==='authenticated'&&session.verified===true&&session.userId===userId;
 result.status='synced';
 const ops=(await repo.list('outbox')).filter(op=>op.userId===userId);
 for(const op of ops){
  if(!currentSession()){result.errors.push({id:op.id,error:'Session changed; sync stopped'});break;}
  if(typeof op.id!=='string'||!op.id){result.errors.push({id:op.id,error:'Invalid operation id'});continue;}
  try{const ack=await transport(op,{userId});
   if(!currentSession()){result.errors.push({id:op.id,error:'Session changed; acknowledgement retained for retry'});break;}
   if(ack&&ack.operationId===op.id&&ack.status==='ack'){
    if(typeof repo.acknowledge==='function'){
     if(await repo.acknowledge(op))result.sent++;else result.errors.push({id:op.id,error:'Operation changed; queue retained'});
     continue;
    }
    const latest=typeof repo.get==='function'?await repo.get('outbox',op.id):op;
    if(JSON.stringify(latest)!==JSON.stringify(op)){result.errors.push({id:op.id,error:'Operation changed; queue retained'});continue;}
    await repo.remove('outbox',op.id);result.sent++;
   }
   else if(ack&&ack.operationId===op.id&&ack.status==='conflict')result.conflicts.push(op.id);
   else result.errors.push({id:op.id,error:'Missing or mismatched acknowledgement'});
  }catch(error){result.errors.push({id:op.id,error:String(error.message||error)});}
 }
 result.pending=(await repo.list('outbox')).filter(op=>op.userId===userId).length;
 if(result.conflicts.length)result.status='conflict';else if(result.errors.length)result.status='pending';return result;
}
function sync(repo,session,transport){const previous=locks.get(repo)||Promise.resolve();const next=previous.catch(()=>{}).then(()=>runSync(repo,session,transport));locks.set(repo,next);return next;}
return {open,sync,validateBackup};
});
