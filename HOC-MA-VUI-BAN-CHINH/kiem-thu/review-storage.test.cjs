const {test}=require('node:test');
const assert=require('node:assert/strict');
const storage=require('../app/review-storage.js');
const auth={mode:'authenticated',userId:'teacher',verified:true};
function repo(ops){return {ops,async list(){return this.ops.slice()},async remove(_,id){this.ops=this.ops.filter(x=>x.id!==id)}}}
test('guest never sends even with local profile',async()=>{
 let calls=0; const r=repo([{id:'a',userId:'teacher'}]);
 const result=await storage.sync(r,{mode:'guest',userId:'teacher'},async()=>{calls++});
 assert.equal(result.status,'local-only');assert.equal(calls,0);assert.equal(r.ops.length,1);
});
test('only verified session sends owner operations with correlated ack',async()=>{
 const r=repo([{id:'a',userId:'teacher'},{id:'b',userId:'other'}]);let calls=[];
 const result=await storage.sync(r,auth,async op=>{calls.push(op.id);return {operationId:op.id,status:'ack'}});
 assert.deepEqual(calls,['a']);assert.equal(result.sent,1);assert.deepEqual(r.ops.map(x=>x.id),['b']);
});
test('unverified auth and absent transport never send',async()=>{
 let calls=0;const r=repo([{id:'a',userId:'teacher'}]);
 assert.equal((await storage.sync(r,{...auth,verified:false},()=>calls++)).status,'local-only');
 assert.equal((await storage.sync(r,auth)).status,'unavailable');assert.equal(calls,0);
});
test('failure, conflict, mismatched ack retain stable operation ids',async()=>{
 for(const transport of [async()=>{throw Error('offline')},async()=>({operationId:'a',status:'conflict'}),async()=>({operationId:'wrong',status:'ack'})]){
  const r=repo([{id:'a',userId:'teacher'}]);const result=await storage.sync(r,auth,transport);assert.equal(r.ops[0].id,'a');assert.equal(result.pending,1);assert.notEqual(result.status,'synced');
 }
});
test('concurrent sync is serialized and sends once',async()=>{
 const r=repo([{id:'a',userId:'teacher'}]);let calls=0;
 const send=async op=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return {operationId:op.id,status:'ack'}};
 await Promise.all([storage.sync(r,auth,send),storage.sync(r,auth,send)]);assert.equal(calls,1);
});
test('backup rejects unsupported version, invalid data and duplicate ids before restore',()=>{
 const valid={schema:'hmv-review-backup',version:1,stores:{documents:[],attempts:[],outbox:[],meta:[]}};
 assert.deepEqual(storage.validateBackup(valid),valid.stores);
 assert.throws(()=>storage.validateBackup({...valid,version:2}),/version/);
 assert.throws(()=>storage.validateBackup({...valid,stores:{...valid.stores,meta:[{id:'a'},{id:'a'}]}}),/Duplicate/);
 assert.throws(()=>storage.validateBackup({...valid,stores:{...valid.stores,documents:[{id:'a',schemaVersion:1,status:'draft',metadata:{},questions:[],blocks:[],file:{$hmvBlob:1,type:'x',data:'???'}}]}}),/Blob/);
});
test('backup restores encoded blobs',async()=>{
 const data={schema:'hmv-review-backup',version:1,stores:{documents:[{id:'a',schemaVersion:1,status:'draft',metadata:{},questions:[],blocks:[],file:{$hmvBlob:1,type:'text/plain',data:'aGk='}}],attempts:[],outbox:[],meta:[]}};
 const restored=storage.validateBackup(data);assert.equal(await restored.documents[0].file.text(),'hi');
});

test('backup rejects malformed academic records while allowing incomplete drafts',()=>{
 const base={schema:'hmv-review-backup',version:1,stores:{documents:[],attempts:[],outbox:[],meta:[]}};
 for(const [store,value] of [['documents',{id:'a'}],['attempts',{id:'a'}],['outbox',{id:'a',userId:'u'}]])assert.throws(()=>storage.validateBackup({...base,stores:{...base.stores,[store]:[value]}}),/structure/);
 const draft={id:'a',schemaVersion:1,status:'draft',metadata:{},questions:[],blocks:[]};
 assert.equal(storage.validateBackup({...base,stores:{...base.stores,documents:[draft]}}).documents[0].id,'a');
});

test('session changes during transport stop sync and retain queue',async()=>{
 const r=repo([{id:'a',userId:'teacher'},{id:'b',userId:'teacher'}]);const session={...auth};let calls=0;
 const result=await storage.sync(r,session,async op=>{calls++;session.userId='other';return {operationId:op.id,status:'ack'}});
 assert.equal(calls,1);assert.equal(r.ops.length,2);assert.equal(result.status,'pending');assert.equal(result.pending,2);
});
test('changed operation with same id is retained after old ack',async()=>{
 const r=repo([{id:'a',userId:'teacher',payload:{version:1}}]);r.get=async()=>r.ops[0];
 const result=await storage.sync(r,auth,async op=>{r.ops=[{...op,payload:{version:2}}];return {operationId:op.id,status:'ack'}});
 assert.equal(result.sent,0);assert.equal(r.ops[0].payload.version,2);assert.equal(result.status,'pending');
});
