'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require.resolve('../app/sw.js'),'utf8');
function harness(response=new Response('static')){
  const events={},writes=[],waits=[];
  const cache={match:async()=>undefined,put:async(request)=>{writes.push(request.url);}};
  const context=vm.createContext({URL,console,
    self:{location:new URL('http://localhost/app/sw.js'),addEventListener:(name,fn)=>{events[name]=fn;}},
    caches:{open:async()=>cache},fetch:async()=>response});
  vm.runInContext(script,context);
  async function request(url,headers){
    let promise;events.fetch({request:new Request(url,{headers}),respondWith:value=>{promise=value;},waitUntil:p=>waits.push(p)});
    if(promise)await promise;await Promise.all(waits);
    return {intercepted:!!promise,writes};
  }
  return {request};
}
test('API, auth, private data, cross-origin and queries bypass application cache',async()=>{
  for(const url of ['http://localhost/api/session','http://localhost/auth/v1/user','http://localhost/app/private-assessment.json','https://cdn.example/test.js','http://localhost/app/review-domain.js?token=synthetic']){
    assert.equal((await harness().request(url)).intercepted,false,url);
  }
});
test('even declared assets with authorization or apikey bypass cache',async()=>{
  for(const headers of [{Authorization:'test-cache-probe'},{apikey:'test-cache-probe'}]){
    assert.equal((await harness().request('http://localhost/app/review-domain.js',headers)).intercepted,false);
  }
});
test('declared exporter still caches a public success response',async()=>{
  const result=await harness().request('http://localhost/app/review-html.js');
  assert.equal(result.intercepted,true);assert.deepEqual(result.writes,['http://localhost/app/review-html.js']);
});
test('no-store, private and failed responses never enter runtime cache',async()=>{
  for(const response of [new Response('private',{headers:{'Cache-Control':'no-store'}}),new Response('private',{headers:{'Cache-Control':'private'}}),new Response('missing',{status:404})]){
    const result=await harness(response).request('http://localhost/app/review-html.js');assert.deepEqual(result.writes,[]);
  }
});
