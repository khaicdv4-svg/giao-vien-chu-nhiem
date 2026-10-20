/* BAN-CHINH 2.17 (20/10/2026): Cập nhật phiên bản mới bằng nút bấm, thay cho phím tắt Ctrl+F5.
   - Khi có bản mới (service worker mới đã tải xong): hiện thông báo, bấm "Cập nhật ngay" là cập nhật.
   - Nút "🔄 Cập nhật phiên bản mới" (thanh bên + Cài đặt): kiểm tra bản mới; nếu không có bản mới
     thì làm mới các tệp ứng dụng đã lưu (giống Ctrl+F5) rồi tải lại. Không xóa dữ liệu lớp học. */
(function(win,doc){
 'use strict';
 var regRef=null,dismissed=false,busy=false,CHECK_EVERY=30*60*1000;
 function hasSW(){return 'serviceWorker' in navigator&&win.location.protocol!=='file:';}
 function toast(msg){if(typeof win.showToast==='function')win.showToast(msg);}
 function getReg(){if(regRef)return Promise.resolve(regRef);if(!hasSW())return Promise.resolve(null);return navigator.serviceWorker.getRegistration().then(function(r){if(r)watch(r);return r||null;}).catch(function(){return null;});}
 function timeout(p,ms){return Promise.race([p,new Promise(function(res){setTimeout(res,ms);})]);}

 /* ---------- Giao diện ---------- */
 function styles(){
  if(doc.getElementById('hmvUpdateStyle'))return;
  var s=doc.createElement('style');s.id='hmvUpdateStyle';
  s.textContent='.hmv-update-banner{position:fixed;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);z-index:150000;width:min(560px,calc(100% - 24px));display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;color:#17324d;border:2px solid #7c3aed;border-radius:18px;padding:12px 14px;box-shadow:0 16px 40px #1e1b4b40;font-family:inherit;animation:hmvUpIn .3s ease}'+
   '@keyframes hmvUpIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}'+
   '.hmv-update-banner .hmv-up-icon{font-size:28px;line-height:1}.hmv-update-banner .hmv-up-text{flex:1 1 220px;min-width:0}.hmv-update-banner b{display:block;font-size:16px}.hmv-update-banner small{display:block;color:#475569;font-size:13px;margin-top:2px}'+
   '.hmv-update-banner .hmv-up-actions{display:flex;gap:8px;flex-wrap:wrap}.hmv-update-banner button{min-height:42px;border-radius:12px;padding:8px 14px;font:inherit;font-weight:800;cursor:pointer;border:1px solid #c4b5fd;background:#f5f3ff;color:#4c1d95}.hmv-update-banner [data-up-now]{background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border:0}'+
   '.hmv-update-banner button:focus-visible,.hmv-update-btn:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}'+
   '.hmv-update-btn{position:relative}.hmv-update-btn>span{margin-right:6px}.hmv-update-btn.has-update{padding-right:56px}.hmv-update-card .hmv-update-btn.has-update{padding-right:16px}.hmv-update-card .hmv-update-btn.has-update::after{position:static;transform:none;display:inline-block;margin-left:8px;vertical-align:middle}.hmv-update-banner button{white-space:nowrap}'+
   '.hmv-update-btn.has-update::after{content:"Mới";position:absolute;right:8px;top:50%;transform:translateY(-50%);background:#dc2626;color:#fff;font-size:11px;font-weight:800;border-radius:999px;padding:2px 7px}'+
   '.hmv-update-card .hmv-update-btn{margin-top:6px}.hmv-update-card p{margin:6px 0;color:#475569}'+
   '@media(max-width:480px){.hmv-update-banner .hmv-up-actions{width:100%}.hmv-update-banner .hmv-up-actions button{flex:1}}';
  doc.head.appendChild(s);
 }
 function markButtons(on){doc.querySelectorAll('.hmv-update-btn').forEach(function(b){b.classList.toggle('has-update',!!on);});}
 function hideBanner(){var b=doc.getElementById('hmvUpdateBanner');if(b)b.remove();}
 function showBanner(){
  markButtons(true);
  if(dismissed||doc.getElementById('hmvUpdateBanner')||!doc.body)return;
  styles();
  var b=doc.createElement('section');b.id='hmvUpdateBanner';b.className='hmv-update-banner';b.setAttribute('role','alert');
  b.innerHTML='<span class="hmv-up-icon" aria-hidden="true">🎉</span><span class="hmv-up-text"><b>Đã có phiên bản mới của HỌC MÀ VUI</b><small>Bấm “Cập nhật ngay” để dùng bản mới. Dữ liệu lớp học được giữ nguyên.</small></span><span class="hmv-up-actions"><button type="button" data-up-now>🔄 Cập nhật ngay</button><button type="button" data-up-later>Để sau</button></span>';
  b.querySelector('[data-up-now]').onclick=function(){update(b.querySelector('[data-up-now]'));};
  b.querySelector('[data-up-later]').onclick=function(){dismissed=true;hideBanner();toast('Có thể cập nhật sau bằng nút “Cập nhật phiên bản mới”.');};
  doc.body.appendChild(b);
 }

 /* ---------- Áp dụng bản mới ---------- */
 function reloadPage(){win.location.reload();}
 function activate(reg){
  // Giữ cách làm của bản 2.11: chờ bản mới nhận quyền rồi mới tải lại.
  win.__hmvUpdating=true;var done=false,go=function(){if(done)return;done=true;reloadPage();};
  navigator.serviceWorker.addEventListener('controllerchange',go);setTimeout(go,4000);
  if(reg.waiting)reg.waiting.postMessage('SKIP_WAITING');else go();
 }
 function waitInstalled(reg,ms){
  return new Promise(function(res){
   var w=reg.installing;if(!w){res(reg.waiting||null);return;}
   var t=setTimeout(function(){res(reg.waiting||null);},ms);
   w.addEventListener('statechange',function(){if(w.state==='installed'||w.state==='redundant'){clearTimeout(t);res(reg.waiting||null);}});
  });
 }
 function refreshShell(){
  // Giống Ctrl+F5: tải lại các tệp ứng dụng từ mạng vào bộ nhớ đệm hiện tại (chỉ tệp ứng dụng).
  var ctl=navigator.serviceWorker.controller;if(!ctl)return Promise.resolve(false);
  return timeout(new Promise(function(res){var ch=new MessageChannel();ch.port1.onmessage=function(e){res(!!(e.data&&e.data.ok));};ctl.postMessage({type:'REFRESH_SHELL'},[ch.port2]);}),30000).then(function(v){return !!v;});
 }
 function setBusy(btns,text){btns.forEach(function(b){if(!b.dataset.label)b.dataset.label=b.innerHTML;b.disabled=!!text;b.innerHTML=text||b.dataset.label;});}
 function update(trigger){
  if(busy)return;busy=true;
  var btns=Array.from(doc.querySelectorAll('.hmv-update-btn,[data-up-now]'));setBusy(btns,'⏳ Đang cập nhật…');
  function finish(msg){busy=false;setBusy(btns,'');if(msg)toast(msg);}
  if(!hasSW()){reloadPage();return;}
  if(navigator.onLine===false){finish('Cần kết nối Internet để cập nhật phiên bản mới.');return;}
  getReg().then(function(reg){
   if(!reg){reloadPage();return;}
   if(reg.waiting){activate(reg);return;}
   return timeout(reg.update().catch(function(){}),10000).then(function(){return waitInstalled(reg,20000);}).then(function(waiting){
    if(waiting){activate(reg);return;}
    return refreshShell().then(function(){toast('Đang tải lại phiên bản mới nhất…');setTimeout(reloadPage,600);});
   });
  }).catch(function(){finish('Chưa cập nhật được. Hãy kiểm tra Internet rồi thử lại.');});
 }

 /* ---------- Theo dõi bản mới ---------- */
 var watched=typeof WeakSet==='function'?new WeakSet():null;
 function watch(reg){
  regRef=reg;if(!watched||watched.has(reg))return;watched.add(reg);
  if(reg.waiting&&navigator.serviceWorker.controller)showBanner();
  reg.addEventListener('updatefound',function(){var w=reg.installing;if(w)w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller&&!win.__hmvUpdating&&!busy)showBanner();});});
 }
 function check(){if(navigator.onLine===false)return;getReg().then(function(r){if(r)r.update().catch(function(){});});}

 /* ---------- Gắn nút ---------- */
 function makeButton(extra){var b=doc.createElement('button');b.type='button';b.className='hmv-update-btn'+(extra?' '+extra:'');b.innerHTML='<span aria-hidden="true">🔄</span>Cập nhật phiên bản mới';b.setAttribute('aria-label','Cập nhật phiên bản mới');b.onclick=function(){update(b);};return b;}
 function placeButtons(){
  styles();
  var tools=doc.querySelector('.nav-tools');
  if(tools&&!tools.querySelector('.hmv-update-btn')){var s=tools.querySelector('[data-view="settings"]');var b=makeButton();if(s)tools.insertBefore(b,s);else tools.appendChild(b);}
  var settings=doc.getElementById('settings');
  if(settings&&!settings.querySelector('.hmv-update-card')){
   var card=doc.createElement('div');card.className='card hmv-update-card';
   card.innerHTML='<h3>🔄 Phiên bản ứng dụng</h3><p>Bấm nút dưới đây để lấy phiên bản mới nhất (thay cho phím tắt Ctrl + F5). Dữ liệu lớp học, câu hỏi và điểm được giữ nguyên.</p>';
   card.appendChild(makeButton('btn color'));
   var title=settings.querySelector('.page-title');if(title&&title.nextSibling)settings.insertBefore(card,title.nextSibling);else settings.appendChild(card);
  }
  if(regRef&&regRef.waiting&&navigator.serviceWorker.controller)markButtons(true);
 }
 function init(){
  placeButtons();
  var t=0;new MutationObserver(function(){if(t)return;t=setTimeout(function(){t=0;placeButtons();},120);}).observe(doc.body,{childList:true,subtree:true});
  if(!hasSW())return;
  getReg();
  setInterval(check,CHECK_EVERY);
  doc.addEventListener('visibilitychange',function(){if(doc.visibilityState==='visible')check();});
  win.addEventListener('online',check);
 }
 win.hmvCapNhat={offer:function(reg){watch(reg);if(doc.body)showBanner();else doc.addEventListener('DOMContentLoaded',showBanner);},update:update,check:check};
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
