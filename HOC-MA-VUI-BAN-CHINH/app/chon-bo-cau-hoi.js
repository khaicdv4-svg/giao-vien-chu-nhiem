/* BAN-CHINH 2.18 (20/10/2026): chọn bộ câu hỏi HAI CHIỀU.
   - Chiều cũ: Kho câu hỏi → Chơi ngay → chọn trò (giữ nguyên).
   - Chiều mới: Trò chơi → Cài đặt (hoặc màn hình chính của trò) → “Chọn bộ câu hỏi” ngay tại chỗ,
     không bị đẩy sang trang Kho. Bộ đã chọn được lưu cho trò đó (dùng chung cơ chế của Kho → Chơi ngay).
   - Bảng “Nguồn câu hỏi” của Kéo co, Hộp quà, Ai nhanh hơn, Đường đua, Chinh phục: hiển thị đúng bộ đang dùng;
     đổi nguồn ở bảng này thì lựa chọn mới được áp dụng (trước đây bị bộ chọn từ Kho lấn át). */
(function(win,doc){
 'use strict';
 var NAMES={tug:'Kéo co kiến thức',race:'Đường đua kiến thức',millionaire:'Chinh phục tri thức','head-tilt':'Quiz Nghiêng Đầu',balloon:'Bóng bay tri thức',poll:'Bình chọn ngón tay','magic-hand':'Bàn tay phép thuật','raise-hand':'Giơ tay giành quyền',gift:'Hộp quà bí mật',buzzer:'Ai nhanh hơn',tiles:'Lật mảnh ghép',lens:'Kính lúp'};
 var bypass=false;
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function toast(m){if(typeof win.showToast==='function')win.showToast(m);}
 function sets(){return Array.isArray(win.questionBankSets)?win.questionBankSets:[];}
 function ready(){return typeof win.hmvC6SelectBankSet==='function'&&typeof win.hmvC6UsableCount==='function';}
 function currentType(){return win.classroomGame&&win.classroomGame.type||'';}
 function selection(type){try{return typeof win.hmvC6Selection==='function'?win.hmvC6Selection(type):null;}catch(e){return null;}}

 /* ---------- Hộp chọn bộ câu hỏi ---------- */
 function styles(){
  if(doc.getElementById('hmvPickStyle'))return;
  var s=doc.createElement('style');s.id='hmvPickStyle';
  s.textContent='.hmv-pick-overlay{position:fixed;inset:0;z-index:170000;display:grid;place-items:center;padding:14px;background:#172554b8}'+
  '.hmv-pick{width:min(640px,100%);max-height:92dvh;display:flex;flex-direction:column;background:#fff;color:#17324d;border-radius:22px;box-shadow:0 24px 60px #0f172a66;overflow:hidden}'+
  '.hmv-pick header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:18px 20px 10px}.hmv-pick h2{margin:0;font-size:21px}.hmv-pick header p{margin:4px 0 0;color:#475569;font-size:14px}'+
  '.hmv-pick-search{margin:0 20px 10px;padding:10px 12px;border:1px solid #c4b5fd;border-radius:12px;font:inherit}'+
  '.hmv-pick-list{overflow:auto;padding:0 20px 8px;display:grid;gap:8px}'+
  '.hmv-pick-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#f8f7ff;border:2px solid #e4defc;border-radius:14px;padding:11px 13px;cursor:pointer;font:inherit;color:inherit}'+
  '.hmv-pick-item:hover:not(:disabled){border-color:#7c3aed;background:#f5f3ff}.hmv-pick-item:disabled{opacity:.55;cursor:not-allowed}.hmv-pick-item.on{border-color:#16a34a;background:#f0fdf4}'+
  '.hmv-pick-item b{display:block;font-size:15px}.hmv-pick-item small{display:block;color:#475569;font-size:13px;margin-top:2px}.hmv-pick-item .go{margin-left:auto;font-weight:800;color:#6d28d9;white-space:nowrap}.hmv-pick-item.on .go{color:#15803d}'+
  '.hmv-pick footer{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;padding:12px 20px 18px;border-top:1px solid #ede9fe}.hmv-pick footer .btn{min-height:42px}'+
  '.hmv-pick-status{margin:0 20px 6px;color:#b91c1c;font-size:14px}.hmv-pick-status:empty{display:none}'+
  '.hmv-src-note{margin:8px 0 0;padding:8px 12px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:14px}'+
  '.hmv-src-pick{margin-left:auto}.question-source-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'+
  '.hmv-entry-set{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px dashed #cbd5e1;font-size:15px;color:#334155}.hmv-entry-set button{min-height:38px}';
  doc.head.appendChild(s);
 }
 function close(){var o=doc.getElementById('hmvPickOverlay');if(o)o.remove();}
 /* opts.after(result): gọi sau khi chọn xong (mặc định: dựng lại màn hình cài đặt của trò). */
 function open(type,opts){
  opts=opts||{};type=type||currentType();
  if(!type){toast('Hãy mở một trò chơi trước.');return;}
  if(!ready()){toast('Chưa nạp xong Kho câu hỏi. Hãy thử lại sau giây lát.');return;}
  styles();close();
  var sel=selection(type),cur=sel&&sel.setId;
  var o=doc.createElement('div');o.id='hmvPickOverlay';o.className='hmv-pick-overlay';
  o.innerHTML='<section class="hmv-pick" role="dialog" aria-modal="true" aria-labelledby="hmvPickTitle"><header><div><h2 id="hmvPickTitle">📚 Chọn bộ câu hỏi</h2><p></p></div><button type="button" class="btn soft" data-pick-close>Đóng</button></header><input class="hmv-pick-search" type="search" placeholder="Tìm theo tên bộ, môn, bài…" aria-label="Tìm bộ câu hỏi"><p class="hmv-pick-status" role="status"></p><div class="hmv-pick-list"></div><footer><button type="button" class="btn soft" data-pick-kho>✏️ Soạn / thêm bộ trong Kho</button>'+(sel?'<button type="button" class="btn soft" data-pick-clear>Bỏ bộ đang chọn</button>':'')+'</footer></section>';
  o.querySelector('header p').textContent='Cho trò '+(NAMES[type]||type)+'. Chỉ đếm những câu phù hợp với trò này.';
  var list=o.querySelector('.hmv-pick-list'),search=o.querySelector('.hmv-pick-search'),status=o.querySelector('.hmv-pick-status');
  function render(){
   var q=search.value.toLocaleLowerCase('vi').trim();
   var rows=sets().filter(function(s){return !q||[s.name,s.setTitle,s.subject,s.topic,s.grade].join(' ').toLocaleLowerCase('vi').indexOf(q)>=0;});
   if(!rows.length){list.innerHTML='<p>Chưa có bộ câu hỏi phù hợp. Bấm “Soạn / thêm bộ trong Kho” để tạo bộ mới.</p>';return;}
   list.innerHTML='';
   rows.forEach(function(s){
    var c=win.hmvC6UsableCount(type,s.id),on=cur&&String(cur)===String(s.id);
    var b=doc.createElement('button');b.type='button';b.className='hmv-pick-item'+(on?' on':'');b.disabled=!c.count;b.dataset.setId=s.id;
    b.innerHTML='<span><b></b><small></small></span><span class="go"></span>';
    b.querySelector('b').textContent=s.name||s.setTitle||'Bộ câu hỏi';
    b.querySelector('small').textContent=c.count?(c.count+'/'+c.total+' câu dùng được cho trò này'):'Không có câu phù hợp với trò này';
    b.querySelector('.go').textContent=on?'✓ Đang dùng':(c.count?'Chọn →':'');
    b.onclick=function(){pick(s.id);};list.appendChild(b);
   });
  }
  function pick(id){
   var r=win.hmvC6SelectBankSet(type,id);
   if(!r.ok){status.textContent=r.reason;return;}
   close();toast('Đã chọn “'+r.name+'” · '+r.count+' câu cho '+(NAMES[type]||'trò chơi')+'.');
   (opts.after||rerender)(type,r);
  }
  search.oninput=render;
  o.querySelector('[data-pick-close]').onclick=close;
  o.querySelector('[data-pick-kho]').onclick=function(){close();var tilt=doc.getElementById('tiltSetupModal');if(tilt)tilt.remove();if(typeof win.gameBack==='function')win.gameBack();if(typeof win.openView==='function')win.openView('questions');};
  var clr=o.querySelector('[data-pick-clear]');if(clr)clr.onclick=function(){win.hmvC6ClearSelection(type);close();toast('Đã bỏ bộ đang chọn. Trò dùng nguồn câu hỏi trong Cài đặt của trò.');(opts.after||rerender)(type,null);};
  o.addEventListener('click',function(e){if(e.target===o)close();});
  o.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();close();}});
  doc.body.appendChild(o);render();search.focus();
 }
 /* Dựng lại màn hình cài đặt của trò để hiện bộ vừa chọn; không bắt đầu ván. */
 function rerender(type){
  var tilt=doc.getElementById('tiltSetupModal');
  if(type==='head-tilt'||tilt){if(tilt)tilt.remove();win.gameSetup('head-tilt');return;}
  if(currentType()!==type)return;
  win.gameSetup(type);
  if(type==='magic-hand'){var k=doc.querySelector('#games [data-mh="kho"]');if(k&&selection(type)){bypass=true;try{k.click();}finally{bypass=false;}}}
 }

 /* ---------- Nút “Chọn bộ khác trong Kho” trong cài đặt: chọn tại chỗ, không rời trò ---------- */
 function isKhoButton(b){
  if(!b)return false;
  if(/tiltChooseQuestions/.test(b.getAttribute('onclick')||''))return true;
  for(var i=0;i<b.attributes.length;i++){var a=b.attributes[i];if(a.name.indexOf('data-')===0&&a.value==='kho')return true;}
  return false;
 }
 doc.addEventListener('click',function(e){
  if(bypass)return;
  var b=e.target.closest&&e.target.closest('button');if(!isKhoButton(b))return;
  if(!b.closest('#games,#tiltSetupModal'))return;
  e.preventDefault();e.stopImmediatePropagation();
  open(b.closest('#tiltSetupModal')?'head-tilt':currentType());
 },true);
 function relabel(){
  doc.querySelectorAll('#games button,#tiltSetupModal button').forEach(function(b){
   if(!isKhoButton(b)||b.dataset.hmvPickLabel)return;b.dataset.hmvPickLabel='1';
   b.textContent=b.matches('[data-mh="kho"]')?'📚 Chọn bộ Đúng/Sai trong Kho':'📚 Chọn bộ câu hỏi khác';
  });
 }

 /* ---------- Bảng “Nguồn câu hỏi” (Kéo co, Hộp quà, Ai nhanh hơn, Đường đua, Chinh phục) ---------- */
 function wrapSourceChanged(){
  if(typeof win.questionSourceChanged!=='function'||win.questionSourceChanged.__hmvPick)return;
  var base=win.questionSourceChanged;
  // Thầy cô đổi nguồn ngay trong bảng này thì lựa chọn đó được áp dụng (bỏ bộ đã gắn từ Kho cho trò này).
  var wrapped=function(t){
   var get=function(k){var e=doc.getElementById(t+k);return e?e.value:'';},mode=get('Source'),setId=get('Set');
   if(typeof win.hmvC6ClearSelection==='function')win.hmvC6ClearSelection(t);
   var out=base.apply(this,arguments);
   // Các trò Kéo co, Hộp quà, Ai nhanh hơn, Đường đua đọc bộ đã gắn; nên gắn đúng bộ (đã lọc khối/môn/bài) vừa chọn ở bảng này.
   if(mode==='set'&&setId&&ready()){
    var list=[];try{list=typeof win.questionSourceList==='function'?win.questionSourceList(t)||[]:[];}catch(e){list=[];}
    var ids=list.map(function(q){return q&&q.id;}).filter(Boolean);
    var r=ids.length?win.hmvC6SelectBankSet(t,setId,ids):{ok:false,reason:'Không có câu nào khớp bộ lọc đã chọn.'};
    if(!r.ok)toast(r.reason+' Trò sẽ dùng Kho hiện tại.');
   }
   // Hộp quà, Ai nhanh hơn, Đường đua: bảng Nguồn câu hỏi từng biến mất sau khi đổi nguồn; dựng lại màn hình cài đặt.
   if(!doc.querySelector('#games .question-source-panel')&&currentType()===t&&typeof win.gameSetup==='function'){try{win.gameSetup(t);}catch(e){}}
   setTimeout(tick,0);return out;
  };
  wrapped.__hmvPick=true;win.questionSourceChanged=wrapped;
  if(typeof win.questionSourceQuickAdd==='function'&&!win.questionSourceQuickAdd.__hmvPick){var qa=win.questionSourceQuickAdd,w2=function(t){if(typeof win.hmvC6ClearSelection==='function')win.hmvC6ClearSelection(t);return qa.apply(this,arguments);};w2.__hmvPick=true;win.questionSourceQuickAdd=w2;}
 }
 function syncPanel(){
  var panel=doc.querySelector('#games .question-source-panel');if(!panel)return;
  var src=panel.querySelector('select[id$="Source"]');if(!src)return;var t=src.id.replace(/Source$/,'');
  var head=panel.querySelector('.question-source-head');
  if(head&&!head.querySelector('.hmv-src-pick')){var b=doc.createElement('button');b.type='button';b.className='btn soft hmv-src-pick';b.textContent='📚 Chọn bộ từ Kho';b.onclick=function(){open(t);};head.appendChild(b);}
  var sel=selection(t),note=panel.querySelector('.hmv-src-note');
  if(!sel){if(note)note.remove();return;}
  if(sel.setId){var setSel=panel.querySelector('#'+CSS.escape(t)+'Set');if(setSel&&Array.from(setSel.options).some(function(o){return o.value===String(sel.setId);})){src.value='set';setSel.value=String(sel.setId);}}
  var text='✓ Đang dùng: '+sel.name+' · '+sel.count+' câu phù hợp với trò này.';
  if(!note){note=doc.createElement('p');note.className='hmv-src-note';var sum=panel.querySelector('.question-source-summary');if(sum)sum.after(note);else panel.appendChild(note);}
  if(note.textContent!==text)note.textContent=text;
  var sum2=panel.querySelector('.question-source-summary');if(sum2&&!sum2.hidden)sum2.hidden=true;
 }

 /* ---------- Màn hình chính của trò: hiện bộ đang dùng + đổi bộ tại chỗ ---------- */
 function syncLanding(){
  var entry=doc.getElementById('hmvQrLanding');if(!entry)return;var t=entry.dataset.gameType;
  if(!t||!NAMES[t]){var old=entry.querySelector('.hmv-entry-set');if(old)old.remove();return;}
  var box=entry.querySelector('.hmv-entry-set');
  if(!box){styles();box=doc.createElement('div');box.className='hmv-entry-set';box.innerHTML='<span></span><button type="button" class="btn soft">📚 Đổi bộ câu hỏi</button>';var actions=entry.querySelector('.hmv-entry-actions');if(actions)actions.before(box);else entry.appendChild(box);
   box.querySelector('button').onclick=function(){open(t,{after:function(){syncLanding();}});};}
  var sel=selection(t),text=sel?('📚 Bộ câu hỏi: '+sel.name+' · '+sel.count+' câu'):'📚 Bộ câu hỏi: theo Cài đặt của trò';
  var span=box.querySelector('span');if(span.textContent!==text)span.textContent=text;
 }

 /* ---------- Bàn tay phép thuật: khi đã gắn bộ từ Kho, vẫn đổi được bộ hoặc quay về bộ phân loại có sẵn ---------- */
 function syncMagicHand(){
  if(currentType()!=='magic-hand')return;var setup=doc.getElementById('mhSetup');if(!setup)return;
  var host=Array.from(setup.querySelectorAll('p,div,span')).find(function(el){var f=el.firstChild;return f&&f.nodeType===3&&/^Đang dùng câu Đúng\/Sai của bộ/.test(f.textContent);});
  if(!host||host.querySelector('[data-hmv-mh-pick]'))return;
  var b=doc.createElement('button');b.type='button';b.className='bb-link';b.dataset.hmvMhPick='1';b.textContent='📚 Đổi bộ câu hỏi';b.onclick=function(e){e.preventDefault();e.stopPropagation();open('magic-hand');};
  host.appendChild(doc.createTextNode(' '));host.appendChild(b);
 }
 doc.addEventListener('change',function(e){
  // Chọn lại một bộ phân loại có sẵn thì bỏ bộ Đúng/Sai đã gắn từ Kho, để lựa chọn của thầy cô được áp dụng.
  if(e.target&&e.target.id==='mhSet'&&e.target.value!=='kho'&&typeof win.hmvC6ClearSelection==='function')win.hmvC6ClearSelection('magic-hand');
 },true);
 function tick(){wrapSourceChanged();relabel();syncPanel();syncMagicHand();syncLanding();}
 function init(){
  styles();tick();
  var t=0;new MutationObserver(function(){if(t)return;t=setTimeout(function(){t=0;tick();},60);}).observe(doc.body,{childList:true,subtree:true});
 }
 win.hmvChonBo={open:open};
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
