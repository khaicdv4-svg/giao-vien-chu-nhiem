/* Stable public links; QR images are generated locally, never by a remote QR service.
   BAN-CHINH 2.16 (20/10/2026): mọi thẻ trò chơi đều có QR; bấm thẻ mở màn hình chính
   của trò (Bắt đầu chơi, Cài đặt, Hướng dẫn, QR). Tám mã đã phát hành giữ nguyên. */
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
  {id:'luyen-tap',title:'Kho câu hỏi – Luyện tập',view:'questions',color:'#0e7490',icon:'?',hint:'Học thử – Làm thử – Xem kết quả ngay!',art:'book'},
  /* 2.16: sáu mã mới cho các thẻ trò chơi còn thiếu QR. */
  {id:'binh-chon',title:'Bình chọn ngón tay',game:'poll',color:'#0f766e',icon:'✋',hint:'Giơ ngón tay – Cả lớp cùng bình chọn!',art:'hand'},
  {id:'ban-tay-phep-thuat',title:'Bàn tay phép thuật',game:'magic-hand',color:'#a21caf',icon:'✨',hint:'Nhặt thẻ bằng tay – Thả vào đúng nhóm!',art:'cards'},
  {id:'gio-tay',title:'Giơ tay giành quyền',game:'raise-hand',color:'#b45309',icon:'🙋',hint:'Giơ tay thật nhanh – Giành quyền trả lời!',art:'hand'},
  {id:'hop-qua',title:'Hộp quà bí mật',game:'gift',color:'#c2410c',icon:'🎁',hint:'Mở hộp quà – Nhận thử thách bất ngờ!',art:'gift'},
  {id:'ai-nhanh-hon',title:'Ai nhanh hơn',game:'buzzer',color:'#4338ca',icon:'🔔',hint:'Bấm chuông thật nhanh – Giành quyền trả lời!',art:'bell'},
  {id:'not-nhac',title:'Nốt nhạc vui',module:'note-music',color:'#7c3aed',icon:'🎵',hint:'Khởi động – Vận động – Thư giãn cùng nhạc!',art:'music'}
 ];
 function key(x){return x.game||x.module||'';}
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

 /* ---------- Thông tin hiển thị của từng trò ---------- */
 var descriptions={tug:'Hai đội trả lời đúng để kéo cờ về phía mình.',race:'Trả lời câu hỏi, tăng tốc và cùng về đích.',millionaire:'Vượt qua từng câu hỏi để chinh phục tri thức.','head-tilt':'Chọn Đúng hoặc Sai bằng cách chạm; bật camera khi muốn thử nghiêng đầu.',balloon:'Chạm vào quả bóng có đáp án đúng để ghi điểm.',poll:'Giơ 1–4 ngón tay để chọn A–B–C–D. Camera AI đếm phiếu và vẽ biểu đồ ngay.','magic-hand':'Chụm ngón tay “nhặt” tấm thẻ rồi thả vào đúng nhóm.','raise-hand':'Đội nào giơ tay trước trong ô màu của mình thì được trả lời.',gift:'Chọn hộp quà, nhận điểm và thử thách bất ngờ.',buzzer:'Bấm chuông giành quyền trả lời câu hỏi.','note-music':'Clip khởi động, vận động nhẹ và thư giãn cho cả lớp.'};
 var voiceInstructions={tug:'Hãy trả lời đúng để cùng kéo cờ chiến thắng.',race:'Chọn đáp án đúng để tăng tốc về đích.',millionaire:'Nghe câu hỏi và chọn đáp án để chinh phục thử thách.','head-tilt':'Chạm Đúng hoặc Sai; nghiêng đầu là tùy chọn.',balloon:'Chạm vào quả bóng có đáp án đúng để ghi điểm.',poll:'Giơ ngón tay để chọn đáp án, máy sẽ đếm phiếu giúp lớp mình.','magic-hand':'Nhặt tấm thẻ bằng tay và thả vào đúng nhóm.','raise-hand':'Đội nào giơ tay nhanh nhất sẽ được quyền trả lời.',gift:'Chọn một hộp quà và trả lời câu hỏi bên trong.',buzzer:'Bấm chuông thật nhanh để giành quyền trả lời.','note-music':'Cùng khởi động và vận động theo nhạc nhé.'};
 var helps={tug:'Chia lớp thành các đội. Mỗi câu hỏi, đội trả lời đúng được kéo cờ về phía mình. Đội kéo cờ về đích trước sẽ thắng.',race:'Mỗi câu trả lời đúng giúp đội tăng tốc. Đội về đích trước sẽ thắng; máy tự chấm và có nhạc nền.',millionaire:'Trả lời lần lượt các câu từ dễ đến khó. Khi gặp câu khó, có thể dùng quyền trợ giúp.','head-tilt':'Nghiêng đầu sang trái để chọn SAI, sang phải để chọn ĐÚNG. Không bật camera thì dùng phím ←/→ hoặc chạm.',balloon:'Đứng trước camera, giơ tay chạm vào quả bóng có đáp án đúng. Trên điện thoại có thể chạm trực tiếp vào bóng.',poll:'Mỗi học sinh giơ 1, 2, 3 hoặc 4 ngón tay ứng với A, B, C, D. Camera AI đếm phiếu từng nhóm và cộng dồn cả lớp.','magic-hand':'Chụm ngón cái và ngón trỏ để nhặt tấm thẻ, di chuyển tay rồi mở ngón để thả thẻ vào đúng nhóm.','raise-hand':'Mỗi đội đứng trong một ô màu. Khi câu hỏi hiện ra, đội giơ tay trước trong ô của mình được quyền trả lời.',gift:'Học sinh chọn một hộp quà, trả lời câu hỏi bên trong để nhận điểm hoặc một thử thách bất ngờ.',buzzer:'Các đội bấm chuông để giành quyền trả lời. Trả lời đúng được cộng điểm cho đội.','note-music':'Chọn một clip khởi động, vận động nhẹ hoặc thư giãn rồi cho cả lớp cùng làm theo.'};
 var cardInfo={};
 var LAST_KEY='hmv-game-last-opened';
 function readLast(){try{return JSON.parse(win.localStorage.getItem(LAST_KEY)||'{}')||{};}catch(e){return {};}}
 function remember(k){if(!k)return;try{var m=readLast();m[k]=Date.now();win.localStorage.setItem(LAST_KEY,JSON.stringify(m));}catch(e){}}
 function lastText(k){var t=readLast()[k];if(!t)return'';var d=new Date(t),now=new Date();var day=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();};var diff=Math.round((day(now)-day(d))/864e5);if(diff<=0)return'hôm nay';if(diff===1)return'hôm qua';return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);}

 function typeOfCard(card){
  if(card.id==='windModuleCard')return'note-music';
  if(card.dataset.gameType)return card.dataset.gameType;
  var b=card.querySelector('[onclick*="gameSetup"]');var m=b&&/gameSetup\s*\(\s*['"]([^'"]+)['"]/.exec(b.getAttribute('onclick')||'');if(m)return m[1];
  var h=card.querySelector('h3'),t=h?h.textContent.trim():'';var x=items.find(function(x){return key(x)&&x.title===t;});if(x)return key(x);
  if(t==='Ai là triệu phú')return'millionaire';return'';
 }
 function itemFor(type,title){
  var x=items.find(function(x){return key(x)===type;});if(x)return x;
  // Trò mới chưa có mã QR riêng vẫn mở được màn hình chính.
  return {id:'',title:title||'Trò chơi',game:type,color:'#6848ef',icon:'🎮'};
 }
 function readCard(card){
  var icon=card.querySelector('.game-library-icon'),h=card.querySelector('h3'),p=card.querySelector('p');
  return {icon:icon?icon.textContent.trim():'',title:h?h.textContent.trim():'',desc:p?p.textContent.trim():'',tags:Array.from(card.querySelectorAll('.game-tags span')).map(function(s){return s.textContent.trim();}).filter(Boolean)};
 }

 /* ---------- Thẻ ngoài thư viện: chỉ còn thông tin + QR, bấm thẻ để vào trò ---------- */
 function enhanceCard(card){
  if(card.dataset.hmvCard==='1')return;
  var type=typeOfCard(card);if(!type)return;
  if(card.tagName==='A'||card.tagName==='BUTTON'){
   // Không lồng nút QR trong liên kết/nút: thay bằng thẻ article cùng id, class.
   var art=doc.createElement('article');art.id=card.id;art.className=card.className;Array.from(card.childNodes).forEach(function(n){art.appendChild(n);});card.replaceWith(art);card=art;
  }
  card.dataset.gameType=type;
  var info=readCard(card),x=itemFor(type,info.title);cardInfo[type]=info;
  card.querySelectorAll('.game-card-actions,.hmv-qr-inline').forEach(function(n){n.remove();});
  card.classList.add('hmv-game-card');card.style.setProperty('--card-color',x.color);
  var foot=doc.createElement('div');foot.className='hmv-card-foot';
  var enter=doc.createElement('button');enter.type='button';enter.className='hmv-card-enter';enter.innerHTML='Vào trò chơi <span aria-hidden="true">→</span>';enter.setAttribute('aria-label','Mở '+info.title);
  enter.onclick=function(e){e.preventDefault();gameLanding(x,{fromLibrary:true});};
  if(x.id){
   var q=doc.createElement('button');q.type='button';q.className='hmv-card-qr';q.dataset.qr=x.id;q.setAttribute('aria-label','Phóng lớn mã QR '+x.title);
   q.innerHTML='<img width="56" height="56" alt=""><span><b>Quét QR</b><small>Mở trên điện thoại</small></span>';q.querySelector('img').src=image(x);
   q.onclick=function(e){e.preventDefault();e.stopPropagation();show(x);};foot.appendChild(q);
  }
  foot.appendChild(enter);card.appendChild(foot);
  var last=lastText(type);if(last){var l=doc.createElement('p');l.className='hmv-card-last';l.textContent='🕘 Mở gần nhất: '+last;card.appendChild(l);}
  card.dataset.hmvCard='1';
 }

 function decorate(){
  var games=doc.getElementById('games');if(games&&!doc.getElementById('hmvQrLanding'))games.classList.remove('hmv-qr-entry');
  if(!doc.getElementById('hmvQrGalleryLink')){var dash=doc.getElementById('dashboard');if(dash){var box=doc.createElement('section');box.className='card hmv-qr-home';box.innerHTML='<h2>Trải nghiệm HỌC MÀ VUI</h2><p>Quét mã để khám phá trên điện thoại của bạn.</p><a id="hmvQrGalleryLink" class="btn color" href="./qr.html">Xem '+items.length+' mã QR · Tải ảnh · In</a>';dash.appendChild(box);attach(box,items[0]);}}
  var picker=doc.getElementById('picker');if(picker)attach(picker.querySelector('.picker-side')||picker,items[1]);
  var bank=doc.getElementById('questions');if(bank)attach(bank.querySelector('.page-title')||bank,items[7]);
  [['.th-wheel',items[1]],['.th-bank',items[7]]].forEach(function(pair){var tile=doc.querySelector(pair[0]);if(!tile||tile.parentElement.classList.contains('hmv-qr-tile'))return;var wrapper=doc.createElement('div');wrapper.className='hmv-qr-tile';tile.before(wrapper);wrapper.appendChild(tile);attach(wrapper,pair[1]);});
  var library=doc.querySelector('#games .game-library');
  if(library&&!Array.from(library.querySelectorAll('h3')).some(function(h){return h.textContent.trim()===items[3].title;})){
   var race=doc.createElement('article');race.className='game-library-card';race.dataset.gameType='race';race.innerHTML='<div class="game-library-icon" aria-hidden="true">🏁</div><h3>Đường đua kiến thức</h3><p>Trả lời câu hỏi, tăng tốc về đích. Tự chấm và có nhạc nền.</p><div class="game-tags"><span>👥 2–4 đội</span><span>✓ Dùng được ngoại tuyến</span></div>';library.appendChild(race);
  }
  doc.querySelectorAll('#games .game-library-card').forEach(enhanceCard);
 }
 function clearLanding(){
  var root=doc.getElementById('games');if(root)root.classList.remove('hmv-qr-entry');
  var entry=doc.getElementById('hmvQrLanding');if(entry)entry.remove();
 }
 function findCardInfo(type){
  if(cardInfo[type])return cardInfo[type];
  var card=Array.from(doc.querySelectorAll('#games .game-library-card')).find(function(c){return typeOfCard(c)===type;});
  return card?readCard(card):null;
 }

 /* ---------- Màn hình chính của trò chơi ---------- */
 function gameLanding(x,opts){
  opts=opts||{};var type=key(x),fromLibrary=!!opts.fromLibrary;
  var info=findCardInfo(type)||{};
  win.openView('games');win.gameBack();
  var root=doc.getElementById('games');
  var fallbackIcons={tug:'🏆',race:'🏎️',millionaire:'⛰️','head-tilt':'😊',balloon:'🎈'};
  var entry=doc.createElement('section');entry.id='hmvQrLanding';entry.className='hmv-qr-landing'+(fromLibrary?' from-library':'');entry.style.setProperty('--entry-color',x.color);entry.dataset.gameType=type;
  entry.innerHTML='<div class="hmv-entry-top"><button type="button" class="hmv-entry-back" data-entry-back>← Thư viện trò chơi</button><div class="hmv-entry-brand">HỌC MÀ VUI <span>ThayKhaiEdu</span></div></div><article class="hmv-entry-card"><div class="hmv-entry-icon" aria-hidden="true"></div><h2 tabindex="-1"></h2><p class="hmv-entry-desc"></p><div class="hmv-entry-tags"></div><div class="hmv-entry-actions"><button type="button" class="btn color" data-entry-play>▶ Bắt đầu chơi</button><button type="button" class="btn soft" data-entry-settings>⚙ Cài đặt</button></div><p class="hmv-entry-note"></p><button type="button" class="btn soft" data-entry-voice>🔊 Nghe lời chào và hướng dẫn</button><details class="hmv-entry-help"><summary>Hướng dẫn chơi</summary><p data-entry-help-game></p><p>Nhấn <b>Bắt đầu chơi</b> để chơi ngay với thiết lập hiện có. Vào <b>Cài đặt</b> để chọn bộ câu hỏi, số câu, đội chơi hoặc cách chơi rồi bắt đầu từ đó. Camera là tùy chọn với các trò có Camera AI.</p></details><p class="hmv-entry-last"></p><button type="button" class="hmv-entry-share">Chia sẻ mã QR</button><p class="hmv-entry-status" role="status"></p></article><a class="hmv-entry-more" href="./qr.html">Khám phá '+items.length+' nội dung →</a>';
  entry.querySelector('h2').textContent=x.title;
  entry.querySelector('.hmv-entry-icon').textContent=info.icon||fallbackIcons[type]||x.icon||'🎮';
  entry.querySelector('.hmv-entry-desc').textContent=info.desc||descriptions[type]||'';
  var tags=(info.tags&&info.tags.length)?info.tags:(x.module?['🎵 Clip có sẵn','👥 Cả lớp']:['✨ Có câu hỏi mẫu','👆 Chạm để chơi']);
  var tagBox=entry.querySelector('.hmv-entry-tags');tags.forEach(function(t){var s=doc.createElement('span');s.textContent=t;tagBox.appendChild(s);});
  entry.querySelector('[data-entry-help-game]').textContent=helps[type]||info.desc||'';
  entry.querySelector('.hmv-entry-note').textContent=x.module?'Cài đặt: chọn và quản lý clip trong Kho clip.':'Cài đặt: chọn bộ câu hỏi và cách chơi trước khi bắt đầu.';
  if(x.module)entry.querySelector('[data-entry-play]').textContent='▶ Mở '+x.title;
  var last=lastText(type);if(last)entry.querySelector('.hmv-entry-last').textContent='🕘 Mở gần nhất: '+last;
  var spokenWelcome='Chào mừng bạn đến với Học Mà Vui! '+(voiceInstructions[type]||'');
  var voiceButton=entry.querySelector('[data-entry-voice]'), entryStatus=entry.querySelector('.hmv-entry-status');
  function speakWelcome(){if(!win.hmvDocTo||typeof win.hmvDocTo.speak!=='function'){entryStatus.textContent='Thiết bị chưa sẵn sàng đọc. Bạn vẫn có thể xem hướng dẫn bên dưới.';return;}voiceButton.disabled=true;voiceButton.textContent='🔊 Đang đọc…';win.hmvDocTo.speak(spokenWelcome).then(function(){voiceButton.disabled=false;voiceButton.textContent='🔊 Nghe lại lời chào và hướng dẫn';},function(){voiceButton.disabled=false;voiceButton.textContent='🔊 Nghe lời chào và hướng dẫn';entryStatus.textContent='Nếu chưa nghe được, hãy chạm nút nghe lại hoặc bật giọng đọc tiếng Việt trong Cài đặt.';});}
  voiceButton.onclick=speakWelcome;
  var share=entry.querySelector('.hmv-entry-share');
  if(x.id){var qr=doc.createElement('img');qr.src=image(x);qr.alt='Mã QR '+x.title;qr.width=64;qr.height=64;share.prepend(qr);share.onclick=function(){show(x);};}else share.remove();
  function launch(play){
   clearLanding();remember(type);
   try{
    if(x.module==='note-music'){if(play)win.openWindModule();else win.openWindSettings();return;}
    if(!play){win.gameSetup(type);return;}
    if(!fromLibrary&&type==='head-tilt'){
     win.gameSetup(type);
     if(typeof win.tiltCameraOff==='function')win.tiltCameraOff();
     // The existing begin button validates the source and keeps camera opt-in.
     var start=doc.querySelector('#tiltSetupModal .tilt-begin-button');
     if(start)start.click();
     return;
    }
    if(!fromLibrary&&type==='balloon'){
     win.gameSetup(type);var control=doc.getElementById('bbControl');if(control)control.value='touch';win.gameStart();return;
    }
    // Giữ đúng hành vi nút “Chơi ngay” cũ trên thẻ.
    if(typeof win.hmvStage5PlayNow==='function')win.hmvStage5PlayNow(type);else win.gameSetup(type);
   }catch(e){gameLanding(x,opts);var again=doc.getElementById('hmvQrLanding');if(again)again.querySelector('[role="status"]').textContent='Chưa thể bắt đầu. Mở Cài đặt để kiểm tra câu hỏi.';}
  }
  entry.querySelector('[data-entry-play]').onclick=function(){launch(true);};entry.querySelector('[data-entry-settings]').onclick=function(){launch(false);};
  entry.querySelector('[data-entry-back]').onclick=function(){
   clearLanding();
   if(/^#trai-nghiem\//.test(win.location.hash)){try{win.history.replaceState(null,'',win.location.pathname+win.location.search);}catch(e){}}
   win.gameBack();
  };
  root.prepend(entry);root.classList.add('hmv-qr-entry');entry.querySelector('h2').focus({preventScroll:true});win.scrollTo(0,0);
  if(fromLibrary)return;
  var audioCfg=win.hmvDocTo&&win.hmvDocTo.state?win.hmvDocTo.state().cfg:null;
  if(!audioCfg||audioCfg.autoWelcome!==false)win.setTimeout(speakWelcome,500);
 }
 function route(){
  clearLanding();
  var old=doc.getElementById('hmvQrExperience');if(old)old.remove();
  var m=/^#trai-nghiem\/([a-z-]+)$/.exec(win.location.hash);if(!m)return;
  var x=items.find(function(x){return x.id===m[1];});if(!x)return;
  if(x.game||x.module){gameLanding(x);return;}else win.openView(x.view);
  var old=doc.getElementById('hmvQrExperience');if(old)old.remove();
  var box=doc.createElement('aside');box.id='hmvQrExperience';box.className='hmv-qr-welcome';box.innerHTML='<b id="hmvQrExperienceTitle"></b><span></span><a href="./qr.html">Khám phá '+items.length+' nội dung</a><button aria-label="Đóng hướng dẫn">✕</button>';
  box.querySelector('b').textContent=x.title;box.querySelector('span').textContent=x.hint;
  box.querySelector('button').onclick=function(){box.remove();};doc.body.appendChild(box);
 }
 win.hmvQr={items:items,link:link,show:show,openGame:function(type){var x=items.find(function(x){return key(x)===type;});if(x)gameLanding(x,{fromLibrary:true});}};
 function init(){decorate();route();var scheduled=false;new MutationObserver(function(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;decorate();});}).observe(doc.querySelector('.main')||doc.body,{childList:true,subtree:true});}
 win.addEventListener('hashchange',route);
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
