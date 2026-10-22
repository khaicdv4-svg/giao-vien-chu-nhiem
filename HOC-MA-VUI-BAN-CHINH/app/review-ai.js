// AI phân tích đề: đọc tệp nguồn (PDF kể cả bản scan, ảnh chụp đề, chữ trích từ Word/TXT) bằng Gemini qua ./api/ai/generate
// (máy chủ nội bộ giữ khóa; bản web dùng khóa của người dùng qua hmvAiFetch), trả về học liệu 8 dạng câu cho trình biên tập.
// Nguyên tắc: chép nguyên văn, không thêm câu; đáp án chỉ lấy từ phần ĐÁP ÁN/HƯỚNG DẪN CHẤM trong tệp.
// Khi đề không có đáp án và giáo viên cho phép, AI chỉ GỢI Ý đáp án và câu đó bị gắn nhãn "cần kiểm tra".
(function(root,factory){var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HmvReviewAi=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
var TYPES=['ABCD','SINGLE','MULTI','TRUEFALSE','FILL','SHORT','OPEN','MATCHING'];
var MAX_INLINE=9*1024*1024; // máy chủ nội bộ nhận tối đa 14 MB sau khi mã hóa base64
var TYPE_LABEL={ABCD:'bốn lựa chọn',SINGLE:'chọn một',MULTI:'nhiều đáp án',TRUEFALSE:'Đúng/Sai',FILL:'điền khuyết',SHORT:'trả lời ngắn',OPEN:'tự luận',MATCHING:'nối cặp'};

var SYSTEM=[
'Bạn là trợ lý của giáo viên tiểu học Việt Nam. Nhiệm vụ: đọc một đề kiểm tra hoặc phiếu ôn tập và chuyển thành dữ liệu JSON đúng lược đồ.',
'QUY TẮC BẮT BUỘC:',
'1. Chép NGUYÊN VĂN nội dung câu hỏi, phương án, bài đọc. Không sửa chính tả, không viết lại, không thêm hay bớt câu. Giữ dấu tiếng Việt và ký hiệu toán (×, :, −, phân số viết a/b, °).',
'2. Bỏ qua: khung họ tên/lớp/điểm/nhận xét/giám thị, dòng "PHẦN BÀI LÀM CỦA HỌC SINH", chữ "Hết", trang quảng cáo, mã QR, chân trang.',
'3. Mỗi câu lấy điểm từ ký hiệu "…/0,5 đ" hoặc "(1 điểm)" ngay cạnh câu (0,5 → 0.5). Không thấy thì để 1.',
'4. Loại câu: ABCD (đúng 4 phương án, chọn 1); SINGLE (2–3 hoặc 5+ phương án, chọn 1); MULTI (chọn nhiều); TRUEFALSE (Đúng/Sai, đưa từng nhận định vào statements); FILL (điền vào chỗ chấm có đáp án ngắn xác định; trong text thay mỗi chỗ trống bằng [[1]], [[2]]… theo thứ tự, đáp án trong blanks cùng thứ tự); SHORT (trả lời một từ/số ngắn); MATCHING (nối cột A với cột B, đưa vào pairs đúng cặp nếu có đáp án, nếu chưa biết cặp đúng thì giữ thứ tự gốc của hai cột); OPEN (tự luận, giải toán, viết đoạn văn, vẽ, đo).',
'5. "Đặt tính rồi tính" có a), b), c)… thì tách MỖI phép tính thành một câu OPEN riêng, number dạng "8a", "8b", layout "grid-calculation", text dạng "Đặt tính rồi tính: 243 625 + 132 284", điểm chia đều. Bài toán có lời văn: layout "plain". Viết đoạn văn/bài văn: layout "grid-text".',
'6. Câu hỏi có nhiều ý a), b) mà không phải đặt tính thì giữ thành MỘT câu, chép đủ các ý trong text.',
'7. Bài đọc/đoạn văn dùng chung cho nhiều câu: đưa vào passages (id "doan-1", "doan-2"…), câu liên quan ghi passageIds. Không chép bài đọc vào text câu hỏi.',
'8. ĐÁP ÁN: chỉ lấy từ phần "ĐÁP ÁN", "HƯỚNG DẪN CHẤM" hoặc đáp án được đánh dấu trong tệp → answerSource "key". correct là chỉ số phương án tính từ 0 (A=0, B=1…). Hướng dẫn chấm, biểu điểm của câu tự luận đưa vào guide; đáp án/kết quả đưa vào answerText.',
'9. Nếu tệp KHÔNG có đáp án cho câu đó: {{GOI_Y}}',
'10. Câu cần hình vẽ, bảng, sơ đồ mà dữ liệu chữ không thể hiện được: needsFigure = true và mô tả ngắn hình trong figureNote.',
'11. section: tên phần như "PHẦN I: TRẮC NGHIỆM (3 điểm)" nếu đề có chia phần; sectionNote: lời dặn của phần (ví dụ "Khoanh vào chữ đặt trước ý đúng"). Câu cùng phần ghi cùng section.',
'12. subject chỉ ghi tên môn (Toán, Tiếng Việt, Khoa học, Lịch sử và Địa lí, Công nghệ, Tin học, Tiếng Anh, Đạo đức…). topic ghi kỳ kiểm tra hoặc chủ đề (ví dụ "Kiểm tra giữa học kì I"). grade là số lớp.',
'13. Điều gì không chắc chắn thì ghi vào warnings bằng tiếng Việt ngắn gọn, ví dụ "Câu 5: ảnh mờ, phương án C đọc không rõ".'
].join('\n');
var NO_SUGGEST='để correct rỗng, statements answer "?", blanks answer "", answerText "", answerSource "none". KHÔNG tự giải.';
var SUGGEST='tự giải cẩn thận theo kiến thức đúng lớp đó (chương trình GDPT 2018, sách Kết nối tri thức) và điền đáp án, answerSource "ai". Câu trắc nghiệm: điền correct; Đúng/Sai: answer từng nhận định; điền khuyết: blanks; nối cặp: pairs đúng cặp; trả lời ngắn: answerText; tự luận/giải toán: answerText ghi bài giải mẫu ngắn gọn có đáp số, guide ghi hướng dẫn chấm chia theo điểm của câu (bội số 0,5 nếu được). Câu viết đoạn văn/bài văn: guide ghi tiêu chí chấm và biểu điểm. Không chắc chắn thì vẫn để trống và answerSource "none". Giáo viên sẽ duyệt lại mọi đáp án do AI viết.';

var S={STRING:{type:'STRING'},NUMBER:{type:'NUMBER'},INTEGER:{type:'INTEGER'},BOOLEAN:{type:'BOOLEAN'}};
var SCHEMA={type:'OBJECT',properties:{
 title:S.STRING,subject:S.STRING,grade:S.INTEGER,topic:S.STRING,
 passages:{type:'ARRAY',items:{type:'OBJECT',properties:{id:S.STRING,title:S.STRING,text:S.STRING},required:['id','text']}},
 questions:{type:'ARRAY',items:{type:'OBJECT',properties:{
  number:S.STRING,type:{type:'STRING',enum:TYPES},text:S.STRING,points:S.NUMBER,
  options:{type:'ARRAY',items:S.STRING},correct:{type:'ARRAY',items:S.INTEGER},
  statements:{type:'ARRAY',items:{type:'OBJECT',properties:{text:S.STRING,answer:{type:'STRING',enum:['Đúng','Sai','?']}},required:['text','answer']}},
  blanks:{type:'ARRAY',items:{type:'OBJECT',properties:{answer:S.STRING},required:['answer']}},
  pairs:{type:'ARRAY',items:{type:'OBJECT',properties:{left:S.STRING,right:S.STRING},required:['left','right']}},
  answerText:S.STRING,guide:S.STRING,passageIds:{type:'ARRAY',items:S.STRING},
  answerSource:{type:'STRING',enum:['key','ai','none']},layout:{type:'STRING',enum:['plain','grid-calculation','grid-text']},
  section:S.STRING,sectionNote:S.STRING,needsFigure:S.BOOLEAN,figureNote:S.STRING
 },required:['number','type','text','points','answerSource']}},
 warnings:{type:'ARRAY',items:S.STRING}
},required:['questions']};

function str(v){return typeof v==='string'?v.normalize('NFC').replace(/ /g,' ').trim():v==null?'':String(v).trim();}
function slug(s){return str(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';}
function base64(bytes){var out='',chunk=0x8000;for(var i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));return typeof btoa==='function'?btoa(out):Buffer.from(out,'binary').toString('base64');}

// Phần gửi cho AI: PDF/ảnh gửi nguyên tệp (AI đọc được cả bản scan); Word/TXT gửi phần chữ đã trích.
async function buildParts(file,sourceDoc){
 var ext=String(file&&file.name||'').split('.').pop().toLowerCase(),parts=[];
 var pages=(sourceDoc&&sourceDoc.source&&sourceDoc.source.pages)||[];
 var text=pages.map(function(p){return p.text||'';}).join('\n\n').trim();
 var mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':ext==='webp'?'image/webp':/^jpe?g$/.test(ext)?'image/jpeg':'';
 if(mime&&file.size<=MAX_INLINE){parts.push({inlineData:{mimeType:mime,data:base64(new Uint8Array(await file.arrayBuffer()))}});parts.push({text:'Tệp đính kèm là đề "'+file.name+'". Hãy phân tích toàn bộ các trang.'});}
 else if(text){parts.push({text:'Nội dung chữ trích từ tệp "'+file.name+'"'+(ext==='docx'?' (hình vẽ trong Word không trích được; câu nào nhắc tới hình thì đánh dấu needsFigure)':'')+':\n\n'+text.slice(0,58000)});}
 else if(mime)throw Error('Tệp quá lớn để gửi cho AI (tối đa 9 MB). Thầy cô tách bớt trang hoặc giảm độ phân giải ảnh.');
 else throw Error('Tệp không có chữ để AI đọc.');
 return parts;
}

function aiFetch(){return root&&typeof root.hmvAiFetch==='function'?root.hmvAiFetch:function(u,i){return fetch(u,i);};}
async function callAI(parts,opts){
 opts=opts||{};
 var body={system:SYSTEM.replace('{{GOI_Y}}',opts.suggestAnswers===false?NO_SUGGEST:SUGGEST),contents:[{role:'user',parts:parts}],json:true,schema:SCHEMA,tier:'quality',temperature:0.1,maxOutputTokens:16384,timeoutMs:120000};
 var res=await (opts.fetcher||aiFetch())('./api/ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:opts.signal});
 var out=null;try{out=await res.json();}catch(_){}
 if(!res.ok||!out||!out.ok){var e=Error((out&&out.message)||(res.status===404?'Chưa có máy chủ AI. Thầy cô mở ứng dụng bằng MO-HOC-MA-VUI.cmd hoặc kết nối khóa Gemini trong Trợ lý AI.':'AI chưa trả lời được. Thầy cô thử lại sau ít phút.'));e.code=out&&out.code||'AI_FAILED';throw e;}
 var data;try{data=JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g,''));}catch(_){var e2=Error(out.truncated?'Đề quá dài, AI trả lời bị cắt giữa chừng. Thầy cô tách đề thành hai phần rồi nhập từng phần.':'AI trả về dữ liệu không đọc được. Thầy cô thử lại.');e2.code='AI_BAD_JSON';throw e2;}
 return {data:data,model:out.model||'',truncated:!!out.truncated};
}

// Chuyển kết quả AI → câu hỏi đúng hợp đồng review-domain. Trả về cả danh sách cảnh báo theo từng câu.
function toDocument(data,opts){
 opts=opts||{};
 var D=opts.domain||(root&&root.HmvReviewDomain)||(typeof require==='function'&&require('./review-domain.js'));
 data=data&&typeof data==='object'?data:{};
 var blocks=[],idMap={},used={};
 (Array.isArray(data.passages)?data.passages:[]).forEach(function(p,i){var t=str(p&&p.text);if(!t)return;var id='doan-'+(i+1);idMap[str(p.id)||id]=id;blocks.push({id:id,type:'passage',title:str(p.title)||'Bài đọc '+(blocks.length+1),text:t});});
 var questions=[],notes=[];
 (Array.isArray(data.questions)?data.questions:[]).forEach(function(r,i){
  if(!r||typeof r!=='object')return;
  var type=TYPES.indexOf(r.type)>=0?r.type:'OPEN',text=str(r.text),num=str(r.number)||String(i+1);
  if(!text)return;
  var id='cau-'+slug(num);while(used[id])id+='-'+(i+1);used[id]=1;
  var pts=Number(r.points);pts=Number.isFinite(pts)&&pts>0?Math.round(pts*100)/100:1;
  var src=['key','ai','none'].indexOf(r.answerSource)>=0?r.answerSource:'none';
  var m={aiNumber:num};
  if(str(r.section))m.section=str(r.section);if(str(r.sectionNote))m.sectionNote=str(r.sectionNote);
  if(r.needsFigure){m.needsFigure=true;if(str(r.figureNote))m.figureNote=str(r.figureNote);}
  var q={id:id,type:type,text:text,points:pts,options:[],correctAnswers:[],pairs:[],answerText:str(r.answerText),explanation:str(r.guide),blockIds:(Array.isArray(r.passageIds)?r.passageIds:[]).map(function(x){return idMap[str(x)];}).filter(Boolean),metadata:m};
  var opts2=(Array.isArray(r.options)?r.options:[]).map(function(o){return str(o).replace(/^[A-H][.)]\s+/,'');}).filter(Boolean);
  var corr=(Array.isArray(r.correct)?r.correct:[]).map(Number).filter(function(n){return Number.isInteger(n)&&n>=0&&n<opts2.length;});
  corr=corr.filter(function(n,j){return corr.indexOf(n)===j;});
  if(['ABCD','SINGLE','MULTI'].indexOf(type)>=0){
   if(opts2.length<2){q.type='OPEN';m.answerLayout='plain';}
   else{q.options=opts2;q.type=type==='MULTI'?'MULTI':opts2.length===4?'ABCD':'SINGLE';q.correctAnswers=q.type==='MULTI'?corr:corr.slice(0,1);if(q.type!=='MULTI'&&corr.length>1)m.aiNote='AI thấy nhiều hơn một đáp án';}
  }else if(type==='TRUEFALSE'){
   var st=(Array.isArray(r.statements)?r.statements:[]).filter(function(s){return s&&str(s.text);});
   if(st.length)q.statements=st.map(function(s){return {text:str(s.text),answer:s.answer==='Đúng'?true:s.answer==='Sai'?false:null};});
   else{q.options=['Đúng','Sai'];if(corr.length)q.correctAnswers=[corr[0]];}
  }else if(type==='FILL'){
   var n=0,answers=(Array.isArray(r.blanks)?r.blanks:[]).map(function(b){return str(b&&b.answer);});
   var t2=text.replace(/\[\[[^\]]*\]\]/g,function(){n++;return '[['+n+']]';});
   if(!n){q.type='OPEN';m.answerLayout='plain';}
   else{q.text=t2;q.blanks=[];for(var k=1;k<=n;k++)q.blanks.push({id:String(k),answerText:answers[k-1]||'',acceptedAnswers:[]});}
  }else if(type==='MATCHING'){
   q.pairs=(Array.isArray(r.pairs)?r.pairs:[]).map(function(p){return {left:str(p&&p.left),right:str(p&&p.right)};}).filter(function(p){return p.left&&p.right;}).slice(0,8);
   m.matchingScoring='per-pair';
   if(q.pairs.length<2){q.type='OPEN';m.answerLayout='plain';}
  }else if(type==='SHORT'){
   m.shortScoring=src==='key'&&q.answerText&&q.answerText.length<=40?'exact':'manual';m.acceptedAnswers=[];
  }
  if(q.type==='OPEN')m.answerLayout=['plain','grid-calculation','grid-text'].indexOf(r.layout)>=0?r.layout:(m.answerLayout||'plain');
  var errors=D.validateQuestion(q);
  var hasKey=errors.every(function(e){return !/khóa|đáp án|Nhận định|chỗ trống|cặp/i.test(e);})&&!(q.type==='MATCHING'&&src==='none');
  m.aiAnswer=q.type==='OPEN'?(q.answerText||q.explanation?(src==='ai'?'suggested':'key'):'none'):!hasKey?'missing':src==='ai'?'suggested':'key';
  questions.push(q);
  var pos=questions.length,label='Câu '+pos+(num&&num!==String(pos)?' (số '+num+' trong đề)':'');
  if(m.aiAnswer==='suggested')notes.push({id:id,kind:'suggested',text:label+': đáp án do AI viết, chờ thầy cô duyệt'});
  if(m.aiAnswer==='missing')notes.push({id:id,kind:'missing',text:label+': chưa có đáp án'});
  if(m.needsFigure)notes.push({id:id,kind:'figure',text:label+': cần hình vẽ'+(m.figureNote?' ('+m.figureNote+')':'')});
  errors.filter(function(e){return !/khóa|đáp án|Nhận định|chỗ trống/i.test(e);}).forEach(function(e){notes.push({id:id,kind:'invalid',text:label+': '+e});});
 });
 var grade=Number(data.grade);
 var meta={};if(Number.isInteger(grade)&&grade>=1&&grade<=5)meta.grade=grade;if(str(data.subject))meta.subject=str(data.subject);if(str(data.topic))meta.topic=str(data.topic);
 return {title:str(data.title),metadata:meta,blocks:blocks,questions:questions,notes:notes,warnings:(Array.isArray(data.warnings)?data.warnings:[]).map(str).filter(Boolean).slice(0,30)};
}

function summary(questions){
 var by={};questions.forEach(function(q){by[q.type]=(by[q.type]||0)+1;});
 var total=questions.reduce(function(s,q){return s+(Number(q.points)||0);},0);
 return {count:questions.length,points:Math.round(total*100)/100,byType:Object.keys(by).map(function(t){return by[t]+' '+(TYPE_LABEL[t]||t);}).join(', ')};
}

// Phân tích tệp: sourceDoc là kết quả HmvReviewImport.readFile (giữ nguồn để đối chiếu). Trả về {doc, report}.
async function analyze(file,sourceDoc,opts){
 opts=opts||{};
 var parts=await buildParts(file,sourceDoc),r=await callAI(parts,opts),conv=toDocument(r.data,opts);
 if(!conv.questions.length)throw Error('AI không tìm thấy câu hỏi nào trong tệp. Thầy cô kiểm tra lại tệp hoặc nhập tay.');
 var base=sourceDoc||{},meta=Object.assign({},base.metadata||{},conv.metadata);
 if(!meta.topic)meta.topic='Ôn tập';
 var doc=Object.assign({},base,{title:conv.title||base.title,metadata:meta,blocks:conv.blocks,questions:conv.questions,importStatus:'ready-for-review'});
 var report=Object.assign(summary(conv.questions),{model:r.model,at:new Date().toISOString(),suggestAnswers:opts.suggestAnswers!==false,truncated:r.truncated,notes:conv.notes,warnings:conv.warnings});
 if(r.truncated)report.warnings.unshift('Đề dài, AI có thể chưa đọc hết. Thầy cô so lại số câu với đề gốc.');
 return {doc:doc,report:report};
}

// Các câu có đáp án do AI viết mà giáo viên chưa duyệt (trả về số thứ tự câu, tính từ 1).
function pending(doc){return ((doc&&doc.questions)||[]).map(function(q,i){return (q.metadata||{}).aiAnswer==='suggested'?i+1:0;}).filter(Boolean);}
function pendingError(doc){var p=pending(doc);return p.length?'Còn '+p.length+' câu có đáp án do AI viết chưa được duyệt (Câu '+p.join(', ')+'). Thầy cô kiểm tra rồi bấm "✓ Duyệt đáp án" ở từng câu hoặc "Duyệt tất cả" trong bảng Kết quả AI phân tích.':'';}

// Gắn nhãn lên từng câu trong trình biên tập, nút duyệt đáp án và bảng tóm tắt.
function decorate(rootEl,doc){
 if(!rootEl||!doc)return;
 var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var qs=doc.questions||[];
 function approve(q){q.metadata=Object.assign({},q.metadata,{aiAnswer:'checked'});}
 function paint(){
  rootEl.querySelectorAll('.rv-ai-flag,.rv-ai-ok').forEach(function(n){n.remove();});
  rootEl.querySelectorAll('[data-question]').forEach(function(el){
   var q=qs[Number(el.dataset.question)],m=q&&q.metadata||{},tags=[];if(!q)return;
   var D=root&&root.HmvReviewDomain,stillMissing=m.aiAnswer==='missing'&&(!D||D.validateQuestion(q).some(function(e){return /khóa|đáp án|Nhận định|chỗ trống/i.test(e);})||q.type==='MATCHING');
   if(m.aiAnswer==='suggested')tags.push('Đáp án do AI viết – chờ duyệt');
   if(stillMissing)tags.push('Chưa có đáp án');
   if(m.needsFigure)tags.push('Cần hình vẽ'+(m.figureNote?': '+m.figureNote:''));
   if(m.aiNote)tags.push(m.aiNote);
   var legend=el.querySelector('legend');if(!legend||!tags.length)return;
   legend.insertAdjacentHTML('beforeend',tags.map(function(t){return ' <span class="rv-ai-flag">'+esc(t)+'</span>';}).join('')+(m.aiAnswer==='suggested'||stillMissing?' <button type="button" class="rv-ai-ok">✓ Duyệt đáp án</button>':''));
   var ok=legend.querySelector('.rv-ai-ok');
   if(ok)ok.onclick=function(){approve(q);paint();};
  });
  var p=pending(doc),all=rootEl.querySelector('#rv-ai-approve-all'),cnt=rootEl.querySelector('#rv-ai-pending');
  if(cnt)cnt.textContent=p.length?'Còn '+p.length+' câu có đáp án AI viết chờ duyệt (Câu '+p.join(', ')+'). Chưa duyệt thì chưa xuất được HTML/SCORM cho học sinh.':'Đã duyệt hết đáp án do AI viết.';
  if(all)all.hidden=!p.length;
 }
 var rp=doc.aiReport,box=rootEl.querySelector('#rv-ai-report');if(box)box.remove();
 var host=rootEl.querySelector('#rv-edit-questions');
 if(rp&&host){
  var notes=(rp.notes||[]).filter(function(n){return n.kind!=='invalid'&&n.kind!=='suggested';}),bad=(rp.notes||[]).filter(function(n){return n.kind==='invalid';});
  host.insertAdjacentHTML('beforebegin','<div id="rv-ai-report" class="rv-panel rv-ai-report"><h2>🤖 Kết quả AI phân tích</h2><p>AI tách được <b>'+rp.count+' câu</b>, tổng <b>'+String(rp.points).replace('.',',')+' điểm</b> ('+esc(rp.byType)+'). Đáp án có trong đề thì AI lấy nguyên; câu nào thiếu đáp án thì AI tự viết đáp án và hướng dẫn chấm để thầy cô duyệt.</p>'+
   '<p id="rv-ai-pending" class="rv-ai-pending"></p><button type="button" id="rv-ai-approve-all">✓ Duyệt tất cả đáp án AI viết</button>'+
   (notes.length||bad.length||(rp.warnings||[]).length?'<p><b>Thầy cô xem thêm:</b></p><ul>'+notes.concat(bad).map(function(n){return '<li>'+esc(n.text)+'</li>';}).join('')+(rp.warnings||[]).map(function(w){return '<li>'+esc(w)+'</li>';}).join('')+'</ul>':'')+
   '<p class="rv-ai-small">AI có thể đọc sai hoặc giải sai. Đối chiếu với đề gốc ở mục Tài liệu nguồn trước khi duyệt.</p></div>');
  rootEl.querySelector('#rv-ai-approve-all').onclick=function(){qs.forEach(function(q){if((q.metadata||{}).aiAnswer==='suggested')approve(q);});paint();};
 }
 paint();
}

return {analyze:analyze,pending:pending,pendingError:pendingError,buildParts:buildParts,callAI:callAI,toDocument:toDocument,summary:summary,decorate:decorate,SCHEMA:SCHEMA,SYSTEM:SYSTEM,MAX_INLINE:MAX_INLINE};
});
