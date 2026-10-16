/* Eight stable public links; QR images are generated locally, never by a remote QR service. */
(function(win,doc){
 'use strict';
 var BASE='https://giao-vien-chu-nhiem.vercel.app/';
 var items=[
  {id:'gioi-thieu',title:'HỌC MÀ VUI – ThayKhaiEdu',view:'dashboard',color:'#6848ef',icon:'✦',hint:'Khám phá lớp học thông minh trong 1 phút!',art:'badge'},
  {id:'vong-quay',title:'Vòng quay kết nối',view:'picker',color:'#c02673',icon:'◉',hint:'Quay một vòng – Nhận thử thách vui!',art:'wheel'},
  {id:'keo-co',title:'Kéo co kiến thức',game:'tug',color:'#166534',icon:'↔',hint:'Trả lời thật nhanh – Cùng kéo chiến thắng!',art:'rope'},
  {id:'duong-dua',title:'Đường đua kiến thức',game:'race',color:'#1d4ed8',icon:'⚑',hint:'Chọn đáp án đúng – Tăng tốc về đích!',art:'race'},
  {id:'chinh-phuc',title:'Chinh phục tri thức',game:'millionaire',color:'#9a3412',icon:'★',hint:'Thử sức từng câu – Chinh phục từng chặng!',art:'mountain'},
  {id:'nghieng-dau',title:'Quiz Nghiêng Đầu',game:'head-tilt',color:'#7e22ce',icon:'☺',hint:'Nghiêng trái chọn SAI – Nghiêng phải chọn ĐÚNG!',art:'phone'},
  {id:'bong-bay',title:'Bóng bay tri thức',game:'balloon',color:'#be123c',icon:'●',hint:'Chạm vào bóng – Khám phá kiến thức!',art:'balloon'},
  {id:'luyen-tap',title:'Kho câu hỏi – Luyện tập',view:'questions',color:'#0e7490',icon:'?',hint:'Học thử – Làm thử – Xem kết quả ngay!',art:'book'}
 ];
 function link(x){return BASE+'#trai-nghiem/'+x.id;}
 function image(x,poster){return './assets/qr/'+x.id+(poster?'-poster':'')+'.svg';}
 function close(){var d=doc.getElementById('hmvQrDialog');if(d){d.remove();if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}}
 var lastFocus;
 function show(x){
  close();lastFocus=doc.activeElement;
  var d=doc.createElement('div');d.id='hmvQrDialog';d.className='hmv-qr-overlay';
  d.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="hmvQrTitle" class="hmv-qr-dialog"><button class="hmv-qr-close" aria-label="Đóng">✕</button><h2 id="hmvQrTitle"></h2><img class="hmv-qr-poster" alt=""><p>Quét để mở trên điện thoại · Lần đầu cần Internet</p><a class="btn color" target="_blank" rel="noopener">Mở trải nghiệm</a> <button class="btn soft" data-copy>Sao chép liên kết</button> <a class="btn soft" data-download>Tải ảnh QR</a><p data-status role="status"></p></section>';
  d.querySelector('h2').textContent=x.title;var img=d.querySelector('img');img.src=image(x,true);img.alt='Mã QR '+x.title;
  d.querySelector('a').href=link(x);var a=d.querySelector('[data-download]');a.href=image(x,true);a.download=x.id+'-ThayKhaiEdu.svg';
  d.querySelector('[data-copy]').onclick=async function(){var status=d.querySelector('[data-status]');try{await navigator.clipboard.writeText(link(x));status.textContent='Đã sao chép liên kết';}catch(e){status.textContent=link(x);}};
  d.querySelector('.hmv-qr-close').onclick=close;d.onclick=function(e){if(e.target===d)close();};
  d.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){var a=Array.from(d.querySelectorAll('button,a[href]'));var first=a[0],last=a[a.length-1];if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}}});
  doc.body.appendChild(d);d.querySelector('button').focus();
 }
 function attach(host,x){
  if(!host||host.querySelector('[data-qr="'+x.id+'"]'))return;
  var b=doc.createElement('button');b.type='button';b.className='hmv-qr-inline';b.dataset.qr=x.id;b.style.setProperty('--qr-color',x.color);b.setAttribute('aria-label','Phóng lớn mã QR '+x.title);
  b.innerHTML='<img width="112" height="112" alt=""><span><b>Quét để trải nghiệm</b><small>Mở trên điện thoại ↗</small></span>';
  b.querySelector('img').src=image(x);b.querySelector('img').alt='QR '+x.title;
  b.onclick=function(e){e.preventDefault();e.stopPropagation();show(x);};host.appendChild(b);
 }
 function decorate(){
  var games=doc.getElementById('games');if(games&&!doc.getElementById('hmvQrLanding'))games.classList.remove('hmv-qr-entry');
  if(!doc.getElementById('hmvQrGalleryLink')){var dash=doc.getElementById('dashboard');if(dash){var box=doc.createElement('section');box.className='card hmv-qr-home';box.innerHTML='<h2>Trải nghiệm HỌC MÀ VUI</h2><p>Quét mã để khám phá trên điện thoại của bạn.</p><a id="hmvQrGalleryLink" class="btn color" href="./qr.html">Xem 8 mã QR · Tải ảnh · In</a>';dash.appendChild(box);attach(box,items[0]);}}
  var picker=doc.getElementById('picker');if(picker)attach(picker.querySelector('.picker-side')||picker,items[1]);
  var bank=doc.getElementById('questions');if(bank)attach(bank.querySelector('.page-title')||bank,items[7]);
  [['.th-wheel',items[1]],['.th-bank',items[7]]].forEach(function(pair){var tile=doc.querySelector(pair[0]);if(!tile||tile.parentElement.classList.contains('hmv-qr-tile'))return;var wrapper=doc.createElement('div');wrapper.className='hmv-qr-tile';tile.before(wrapper);wrapper.appendChild(tile);attach(wrapper,pair[1]);});
  var library=doc.querySelector('#games .game-library');
  if(library&&!Array.from(library.querySelectorAll('h3')).some(function(h){return h.textContent.trim()===items[3].title;})){
   var race=doc.createElement('article');race.className='game-library-card';race.innerHTML='<div class="game-library-icon" aria-hidden="true">🏁</div><h3>Đường đua kiến thức</h3><p>Trả lời câu hỏi, tăng tốc về đích. Tự chấm và có nhạc nền.</p><div class="game-card-actions"><button type="button" class="btn color">Chơi ngay →</button></div>';race.querySelector('button').onclick=function(){win.gameSetup('race');};library.appendChild(race);
  }
  doc.querySelectorAll('#games .game-library-card').forEach(function(card){
   var h=card.querySelector('h3');if(!h)return;var x=items.find(function(x){return x.game&&h.textContent.trim()===x.title;});if(!x)return;
   // Existing cards use containers; never insert a button into a button/link.
   if(card.tagName==='BUTTON'||card.tagName==='A')return;attach(card,x);
  });
 }
 function clearLanding(){
  var root=doc.getElementById('games');if(root)root.classList.remove('hmv-qr-entry');
  var entry=doc.getElementById('hmvQrLanding');if(entry)entry.remove();
 }
 function gameLanding(x){
  win.openView('games');win.gameBack();
  var root=doc.getElementById('games');
  var descriptions={tug:'Hai đội trả lời đúng để kéo cờ về phía mình.',race:'Trả lời câu hỏi, tăng tốc và cùng về đích.',millionaire:'Vượt qua từng câu hỏi để chinh phục tri thức.','head-tilt':'Chọn Đúng hoặc Sai bằng cách chạm; bật camera khi muốn thử nghiêng đầu.',balloon:'Chạm vào quả bóng có đáp án đúng để ghi điểm.'};
  var icons={tug:'🏆',race:'🏎️',millionaire:'⛰️','head-tilt':'😊',balloon:'🎈'};
  var entry=doc.createElement('section');entry.id='hmvQrLanding';entry.className='hmv-qr-landing';entry.style.setProperty('--entry-color',x.color);
  entry.innerHTML='<div class="hmv-entry-brand">HỌC MÀ VUI <span>ThayKhaiEdu</span></div><article class="hmv-entry-card"><div class="hmv-entry-icon" aria-hidden="true"></div><h2 tabindex="-1"></h2><p class="hmv-entry-desc"></p><div class="hmv-entry-tags"><span>✨ Có câu hỏi mẫu</span><span>👆 Chạm để chơi</span></div><div class="hmv-entry-actions"><button type="button" class="btn color" data-entry-play>▶ Chơi ngay</button><button type="button" class="btn soft" data-entry-settings>⚙ Cài đặt</button></div><details class="hmv-entry-help"><summary>Hướng dẫn chơi</summary><p>Nhấn <b>Chơi ngay</b> để dùng câu hỏi và thiết lập có sẵn. Vào <b>Cài đặt</b> nếu muốn đổi bộ câu hỏi, số câu hoặc cách chơi. Camera là tùy chọn; không cần bật để trải nghiệm.</p></details><button type="button" class="hmv-entry-share">Chia sẻ mã QR</button><p class="hmv-entry-status" role="status"></p></article><a class="hmv-entry-more" href="./qr.html">Khám phá 8 nội dung →</a>';
  entry.querySelector('h2').textContent=x.title;entry.querySelector('.hmv-entry-icon').textContent=icons[x.game];entry.querySelector('.hmv-entry-desc').textContent=descriptions[x.game];
  var qr=doc.createElement('img');qr.src=image(x);qr.alt='Mã QR '+x.title;qr.width=64;qr.height=64;entry.querySelector('.hmv-entry-share').prepend(qr);
  function launch(play){
   clearLanding();
   try{
    if(!play){win.gameSetup(x.game);return;}
    if(x.game==='head-tilt'){
     win.gameSetup(x.game);
     if(typeof win.tiltCameraOff==='function')win.tiltCameraOff();
     // The existing begin button validates the source and keeps camera opt-in.
     var start=doc.querySelector('#tiltSetupModal .tilt-begin-button');
     if(start)start.click();
     return;
    }
    if(x.game==='balloon'){
     win.gameSetup(x.game);var control=doc.getElementById('bbControl');if(control)control.value='touch';win.gameStart();return;
    }
    win.hmvStage5PlayNow(x.game);
   }catch(e){gameLanding(x);entry=doc.getElementById('hmvQrLanding');entry.querySelector('[role="status"]').textContent='Chưa thể bắt đầu. Mở Cài đặt để kiểm tra câu hỏi.';}
  }
  entry.querySelector('[data-entry-play]').onclick=function(){launch(true);};entry.querySelector('[data-entry-settings]').onclick=function(){launch(false);};entry.querySelector('.hmv-entry-share').onclick=function(){show(x);};
  root.prepend(entry);root.classList.add('hmv-qr-entry');entry.querySelector('h2').focus({preventScroll:true});win.scrollTo(0,0);
 }
 function route(){
  clearLanding();
  var old=doc.getElementById('hmvQrExperience');if(old)old.remove();
  var m=/^#trai-nghiem\/([a-z-]+)$/.exec(win.location.hash);if(!m)return;
  var x=items.find(function(x){return x.id===m[1];});if(!x)return;
  if(x.game){gameLanding(x);return;}else win.openView(x.view);
  var old=doc.getElementById('hmvQrExperience');if(old)old.remove();
  var box=doc.createElement('aside');box.id='hmvQrExperience';box.className='hmv-qr-welcome';box.innerHTML='<b id="hmvQrExperienceTitle"></b><span></span><a href="./qr.html">Khám phá 8 nội dung</a><button aria-label="Đóng hướng dẫn">✕</button>';
  box.querySelector('b').textContent=x.title;box.querySelector('span').textContent=x.game?'Chọn Bắt đầu để chơi. Có thể dùng câu hỏi mẫu; camera là tùy chọn.':x.hint;
  box.querySelector('button').onclick=function(){box.remove();};doc.body.appendChild(box);
 }
 win.hmvQr={items:items,link:link,show:show};
 function init(){decorate();route();var scheduled=false;new MutationObserver(function(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;decorate();});}).observe(doc.querySelector('.main')||doc.body,{childList:true,subtree:true});}
 win.addEventListener('hashchange',route);
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
