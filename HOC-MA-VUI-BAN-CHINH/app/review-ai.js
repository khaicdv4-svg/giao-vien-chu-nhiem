/* Ôn tập và Kiểm tra · Đọc đề bằng AI.
 * Gửi file đề (PDF, ảnh, Word, TXT) qua đường AI sẵn có của app: ./api/ai/generate
 * (bản web: ai-tren-web.js gọi thẳng Gemini bằng khóa riêng của thầy cô; bản cài: máy chủ nội bộ).
 * AI trả về JSON câu hỏi; mô-đun này kiểm tra, làm sạch rồi chuyển thành học liệu để thầy cô duyệt trong trình soạn.
 */
(function(root,factory){var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HmvReviewAI=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
var MAX_FILE=10*1024*1024, TYPES=['ABCD','SINGLE','TRUEFALSE','MULTI','FILL','SHORT','MATCHING','OPEN'];
var SYSTEM=[
'Bạn chuyển một đề kiểm tra/phiếu bài tập tiểu học (tiếng Việt) thành dữ liệu JSON cho phần mềm ôn tập. Chỉ trả về MỘT đối tượng JSON, không giải thích.',
'Cấu trúc: {"title":"…","subject":"Toán|Tiếng Việt|Khoa học|Lịch sử và Địa lí|Công nghệ|Tin học|Tiếng Anh|…","topic":"…","blocks":[…],"questions":[…]}',
'blocks: bài đọc, đoạn văn, bảng số liệu dùng chung cho nhiều câu: {"id":"bai-doc-1","title":"tên bài","text":"nguyên văn","sourceNote":"tác giả, nguồn nếu có"}. Không có thì để [].',
'Mỗi câu hỏi có "type","text","points","explanation", thêm "blockIds":["bai-doc-1"] nếu dựa vào bài đọc, "fromKey":true nếu đáp án lấy từ phần ĐÁP ÁN/HƯỚNG DẪN CHẤM của file, false nếu bạn tự giải, "needsImage":true nếu câu cần hình vẽ/hình ảnh mới làm được.',
'Các loại câu:',
'- ABCD: trắc nghiệm 4 lựa chọn A–D, một đáp án: {"type":"ABCD","text":"…","options":["…","…","…","…"],"correctAnswers":[1]} (chỉ số từ 0; options KHÔNG ghi "A.").',
'- SINGLE: trắc nghiệm một đáp án nhưng không đủ 4 lựa chọn. MULTI: chọn nhiều đáp án, correctAnswers có nhiều chỉ số.',
'- TRUEFALSE: điền Đ/S: {"type":"TRUEFALSE","text":"…","statements":[{"text":"…","answer":true}]}.',
'- FILL: điền vào chỗ chấm, mỗi chỗ trống thay bằng [[1]], [[2]]…: {"type":"FILL","text":"2 giờ = [[1]] phút","blanks":[{"id":"1","answerText":"120","acceptedAnswers":[]}]}.',
'- SHORT: trả lời ngắn một đáp số/từ: {"type":"SHORT","text":"…","answerText":"…","acceptedAnswers":[]}.',
'- MATCHING: nối cột: {"type":"MATCHING","text":"…","pairs":[{"left":"…","right":"…"}]}.',
'- OPEN: tự luận (bài toán có lời văn, viết câu, viết đoạn…): {"type":"OPEN","text":"…","answerLayout":"plain","answerText":"đáp số/ý chính","explanation":"hướng dẫn chấm cho giáo viên"}.',
'- "Đặt tính rồi tính" có nhiều phép a), b)…: tách MỖI phép thành một câu OPEN với "answerLayout":"grid-calculation", text là "Đặt tính rồi tính: 4685 : 5", explanation ghi kết quả; chia đều điểm.',
'Quy tắc:',
'- Giữ nguyên văn nội dung đề, chính tả, cách viết số (45 678). Không thêm câu hỏi ngoài đề. Bỏ phần đầu đề (trường, lớp, họ tên, điểm, nhận xét, chữ kí) và dòng kẻ chấm.',
'- text KHÔNG ghi "Câu 1." ở đầu. Câu có nhiều ý a), b) cùng một dạng: tách thành các câu riêng nếu mỗi ý có đáp án riêng.',
'- points lấy theo ghi chú điểm trong đề (…/0,5đ, (1 điểm)); viết số thập phân dấu chấm (0.5). Không có thì để 1.',
'- Đáp án: ưu tiên phần ĐÁP ÁN của file; nếu không có thì tự giải cẩn thận và đặt "fromKey":false.',
'- explanation ngắn gọn, đúng kiến thức lớp 4, xưng "em" khi giải thích cho học sinh (riêng OPEN là hướng dẫn chấm).',
'- Câu cần hình: vẫn chép lời đề, thêm mô tả ngắn trong ngoặc vuông [Hình: …] và "needsImage":true.'
].join('\n');

function domain(){return root&&root.HmvReviewDomain||typeof require==='function'&&require('./review-domain.js');}
function parser(){return root&&root.hmvC7QuestionBank||typeof require==='function'&&require('./question-bank-stage7.js');}
function str(v,n){return String(v==null?'':v).replace(/\r\n?/g,'\n').trim().slice(0,n||4000);}
function err(m){var e=Error(m);e.hmv=true;return e;}
function b64(buf){var u=new Uint8Array(buf),s='',CH=0x8000;for(var i=0;i<u.length;i+=CH)s+=String.fromCharCode.apply(null,u.subarray(i,i+CH));return typeof btoa==='function'?btoa(s):Buffer.from(u).toString('base64');}

async function fileParts(file){
 if(!file||!file.name)throw err('Chưa chọn tệp');
 var ext=file.name.split('.').pop().toLowerCase(),mime={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[ext];
 if(mime){if(file.size>MAX_FILE)throw err('Tệp quá lớn để gửi cho AI (tối đa 10 MB). Hãy tách đề thành nhiều tệp nhỏ hơn.');return [{inlineData:{mimeType:mime,data:b64(await file.arrayBuffer())}}];}
 if(ext==='docx'||ext==='txt'){var raw=ext==='txt'?await file.text():(await parser().readFile(file)).raw;if(!str(raw))throw err('Tệp không có chữ để đọc.');return [{text:'NỘI DUNG ĐỀ:\n'+String(raw).slice(0,58000)}];}
 throw err('AI đọc được PDF, Word (.docx), ảnh hoặc TXT.');
}

function parseJson(text){var t=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');var a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)throw err('AI không trả về dữ liệu đúng dạng. Hãy thử lại.');try{return JSON.parse(t.slice(a,b+1));}catch(e){throw err('AI trả về dữ liệu bị lỗi. Hãy thử lại.');}}
function idx(list,n){return (Array.isArray(list)?list:[]).map(Number).filter(function(i){return Number.isInteger(i)&&i>=0&&i<n;}).filter(function(v,i,a){return a.indexOf(v)===i;});}
function strings(list,n){return (Array.isArray(list)?list:[]).map(function(s){return str(s,n||500);}).filter(Boolean);}

/* Làm sạch một câu do AI trả về. Trả null nếu không dùng được. */
function cleanQuestion(q,i,blockIds){
 if(!q||typeof q!=='object')return null;
 var type=String(q.type||'').toUpperCase(),text=str(q.text).replace(/^Câu\s*\d+\s*[.:)]\s*/i,'');
 if(TYPES.indexOf(type)<0||!text)return null;
 var pts=Number(String(q.points==null?'':q.points).replace(',','.'));
 var out={id:'ai-'+(i+1),type:type,text:text,points:pts>0&&pts<=10?Math.round(pts*100)/100:1,explanation:str(q.explanation,2000),blockIds:(Array.isArray(q.blockIds)?q.blockIds:[]).map(String).filter(function(id){return blockIds.indexOf(id)>=0;}),metadata:{}};
 if(type==='ABCD'||type==='SINGLE'||type==='MULTI'){
  out.options=strings(q.options).map(function(o){return o.replace(/^[A-H]\s*[.)]\s*/,'');});
  out.correctAnswers=idx(q.correctAnswers,out.options.length);
  if(out.options.length<2||!out.correctAnswers.length)return null;
  if(type!=='MULTI')out.correctAnswers=out.correctAnswers.slice(0,1);
  if(type==='ABCD'&&out.options.length!==4)out.type='SINGLE';
 }else if(type==='TRUEFALSE'){
  out.statements=(Array.isArray(q.statements)?q.statements:[]).map(function(s){return s&&{text:str(s.text,500),answer:s.answer===true||/^(true|đúng|đ)$/i.test(String(s.answer))};}).filter(function(s){return s&&s.text;});
  if(!out.statements.length)return null;
 }else if(type==='FILL'){
  var blanks=(Array.isArray(q.blanks)?q.blanks:[]).map(function(b,j){return b&&{id:str(b.id||j+1,10),answerText:str(b.answerText,200),acceptedAnswers:strings(b.acceptedAnswers,200)};}).filter(function(b){return b&&b.answerText&&text.indexOf('[['+b.id+']]')>=0;});
  if(!blanks.length)return null;out.blanks=blanks;
 }else if(type==='SHORT'){
  out.answerText=str(q.answerText,300);if(!out.answerText)return null;
  out.metadata={shortScoring:'exact',acceptedAnswers:strings(q.acceptedAnswers,300)};
 }else if(type==='MATCHING'){
  out.pairs=(Array.isArray(q.pairs)?q.pairs:[]).map(function(p){return p&&{left:str(p.left,300),right:str(p.right,300)};}).filter(function(p){return p&&p.left&&p.right;});
  if(out.pairs.length<2)return null;out.metadata={matchingScoring:'per-pair'};
 }else{
  var layout=String(q.answerLayout||q.metadata&&q.metadata.answerLayout||'plain');
  out.metadata={answerLayout:['plain','grid-calculation','grid-text'].indexOf(layout)>=0?layout:'plain'};
  if(q.answerText)out.answerText=str(q.answerText,1000);
 }
 return {q:out,fromKey:q.fromKey!==false,needsImage:q.needsImage===true};
}

/* Chuyển kết quả AI thành học liệu (chưa chuẩn hóa) + danh sách cảnh báo cho giáo viên. */
function toDocument(data,fileName){
 if(!data||typeof data!=='object'||!Array.isArray(data.questions))throw err('AI không tìm thấy câu hỏi trong tệp.');
 var blocks=(Array.isArray(data.blocks)?data.blocks:[]).map(function(b,i){return b&&{id:str(b.id,60)||'bai-doc-'+(i+1),type:'text',title:str(b.title,200),text:str(b.text,20000),sourceNote:str(b.sourceNote,300)};}).filter(function(b){return b&&b.text;});
 var ids=blocks.map(function(b){return b.id;}),questions=[],dropped=0,solved=[],images=[];
 data.questions.slice(0,80).forEach(function(raw){var c=cleanQuestion(raw,questions.length,ids);if(!c){dropped++;return;}var n=questions.length+1;c.q.source={name:fileName,ai:true};questions.push(c.q);if(!c.fromKey)solved.push(n);if(c.needsImage)images.push(n);});
 if(!questions.length)throw err('AI chưa đọc được câu hỏi nào dùng được. Thầy cô thử tệp rõ hơn hoặc nhập thủ công.');
 var used={};questions.forEach(function(q){q.blockIds.forEach(function(id){used[id]=1;});});
 var warnings=[];
 if(solved.length)warnings.push('AI tự giải đáp án câu '+solved.join(', ')+' (đề không kèm đáp án) – cần kiểm tra kĩ.');
 if(images.length)warnings.push('Câu '+images.join(', ')+' cần hình vẽ – app chưa hiện được hình, nên sửa lời đề hoặc bỏ câu.');
 if(dropped)warnings.push(dropped+' câu AI trả về thiếu dữ liệu nên đã bỏ qua – đối chiếu lại với đề gốc.');
 return {doc:{title:str(data.title,200)||String(fileName||'Đề').replace(/\.[^.]+$/,''),metadata:{grade:4,subject:str(data.subject,80),topic:str(data.topic,200)},blocks:blocks.filter(function(b){return used[b.id]||!questions.some(function(q){return q.blockIds.length;});}),questions:questions},warnings:warnings};
}

async function readWithAI(file,opts){
 opts=opts||{};
 var parts=await fileParts(file),f=opts.fetch||root&&(root.hmvAiFetch||root.fetch&&root.fetch.bind(root));
 if(!f)throw err('Không gọi được AI trong môi trường này.');
 parts.push({text:'Hãy chuyển toàn bộ đề trong tệp "'+file.name+'" thành JSON theo đúng cấu trúc đã nêu.'});
 var r,j=null;
 try{r=await f('./api/ai/generate',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},cache:'no-store',body:JSON.stringify({contents:[{role:'user',parts:parts}],system:SYSTEM,json:true,temperature:0.1,maxOutputTokens:16384,tier:'quality',timeoutMs:120000})});}
 catch(e){throw err('Không gọi được AI. Kiểm tra Internet rồi thử lại.');}
 try{j=JSON.parse(await r.text());}catch(e){}
 if(!j)throw err(r.status===404||r.status===405?'Bản ứng dụng này chưa có AI. Hãy mở bản web hoặc cập nhật bản cài.':'AI trả lời không hợp lệ. Hãy thử lại.');
 if(!r.ok||j.ok===false)throw err(j.message||'AI gặp lỗi. Hãy thử lại.');
 if(j.truncated)throw err('Đề quá dài nên AI trả lời bị cắt. Hãy tách đề thành 2 tệp (ví dụ phần trắc nghiệm và phần tự luận).');
 var res=toDocument(parseJson(j.text),file.name),d=domain().normalizeDocument(res.doc);
 d.source={name:file.name,mime:file.type||'',blob:file,pages:[],ai:j.model||'gemini'};d.importStatus='ready-for-review';d.aiWarnings=res.warnings;
 return d;
}
return {readWithAI:readWithAI,toDocument:toDocument,cleanQuestion:cleanQuestion,parseJson:parseJson,fileParts:fileParts,SYSTEM:SYSTEM};
});
