(function(root,factory){var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HmvReviewImport=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
var ocr=null;
function parser(){return root&&root.hmvC7QuestionBank||typeof require==='function'&&require('./question-bank-stage7.js');}
function domain(){return root&&root.HmvReviewDomain||typeof require==='function'&&require('./review-domain.js');}
function lines(items){var text='',y=null;items.forEach(function(item){if(typeof item.str!=='string')return;var current=item.transform&&item.transform[5];if(y!==null&&current!==undefined&&Math.abs(current-y)>2&&!text.endsWith('\n'))text+='\n';text+=item.str;if(item.hasEOL)text+='\n';else text+=' ';y=current;});return text.trim();}
// Mẫu đề của trường (Word/PDF có chữ): "…/0,5 đ" trước "Câu N.", phần "ĐÁP ÁN" ở cuối.
// Tách từng câu, lấy điểm, đáp án trắc nghiệm, hướng dẫn chấm; "Đặt tính rồi tính" a) b) c) d) thành vở ô li.
function schoolTemplate(raw){
 var text=String(raw||'').replace(/\r\n?/g,'\n');
 var head=text.match(/^[ \t]*ĐÁP ÁN\b.*$/m);if(!head)return null;
 var test=text.slice(0,head.index),key=text.slice(head.index);
 function split(t){var re=/^[ \t]*Câu[ \t]*(\d{1,2})[ \t]*[.:]?/gm,found=[],m;while((m=re.exec(t)))found.push({n:Number(m[1]),i:m.index});return found.map(function(f,j){return {n:f.n,text:t.slice(f.i,j+1<found.length?found[j+1].i:t.length)};});}
 var chunks=split(test);if(chunks.length<2)return null;
 var keys={};split(key).forEach(function(k){if(!keys[k.n])keys[k.n]=k.text.trim();});
 var pointRe=/[.…·]+[ \t]*\/[ \t]*(\d+(?:[.,]\d+)?)[ \t]*đ/g;
 function lastPoints(t){var m,v=null;pointRe.lastIndex=0;while((m=pointRe.exec(t)))v=Number(m[1].replace(',','.'));return v;}
 function clean(t){return t.split('\n').filter(function(l){var s=l.trim();return s&&!/^[.…·_\-\s]+$/.test(s)&&!/^[.…·]+\s*\/\s*\d+(?:[.,]\d+)?\s*đ\s*$/.test(s)&&!/^(PHẦN|Phần)\s+[IVX]+\b/.test(s);}).map(function(l){return l.replace(/[.…·]{4,}/g,'……').replace(/\s+$/,'');}).join('\n').trim();}
 var unit=function(s){return s.replace(/(\d)[ \u00a0](?=\d{3}(?!\d))/g,'$1');};
 var meta={grade:4},sub=test.match(/MÔN[ \t]+([A-ZÀ-Ỹ ]+?)(?:[ \t]*[-–]|\n|$)/);
 if(sub){var name=sub[1].trim().toLowerCase(),known={'toán':'Toán','tiếng việt':'Tiếng Việt','khoa học':'Khoa học','lịch sử và địa lí':'Lịch sử và Địa lí','lịch sử và địa lý':'Lịch sử và Địa lí','công nghệ':'Công nghệ','tin học':'Tin học','tiếng anh':'Tiếng Anh','đạo đức':'Đạo đức'};meta.subject=known[name]||name.charAt(0).toUpperCase()+name.slice(1);}
 meta.topic=/GIỮA\s*(HK|HỌC KÌ)\s*I(?!I)/i.test(test)?'Kiểm tra giữa học kì I':/CUỐI\s*(HK|HỌC KÌ)\s*I(?!I)/i.test(test)?'Kiểm tra cuối học kì I':/GIỮA\s*(HK|HỌC KÌ)\s*II/i.test(test)?'Kiểm tra giữa học kì II':/CUỐI\s*(HK|HỌC KÌ)\s*II|CUỐI\s*NĂM/i.test(test)?'Kiểm tra cuối năm':'Ôn tập';
 var questions=[];
 chunks.forEach(function(c,j){
  var pts=lastPoints(j?chunks[j-1].text:test.slice(0,test.indexOf(c.text)))||1,body=clean(c.text),k=keys[c.n]||'';
  var lines=body.split('\n'),optStart=lines.findIndex(function(l){return /^\s*A[.)]\s+\S/.test(l);});
  if(optStart>0){
   var stem=lines.slice(0,optStart).join(' ').replace(/\s+/g,' ').trim(),opts=[],re=/(?:^|\s)([A-D])[.)]\s+/g,src=lines.slice(optStart).join(' '),m,marks=[];
   while((m=re.exec(src)))marks.push({l:m[1],i:m.index,e:re.lastIndex});
   marks.forEach(function(x,i){opts.push(src.slice(x.e,i+1<marks.length?marks[i+1].i:src.length).trim());});
   var letter=(k.replace(/^Câu\s*\d+\s*[.:]?/,'').match(/\b([A-D])[.)]/)||[])[1],keyIdx=letter?letter.charCodeAt(0)-65:-1;
   if(opts.length>=2&&marks.every(function(x,i){return x.l===String.fromCharCode(65+i);})){questions.push({id:'cau-'+c.n,type:opts.length===4?'ABCD':'SINGLE',text:stem,options:opts,correctAnswers:keyIdx>=0&&keyIdx<opts.length?[keyIdx]:[],points:pts,explanation:keyIdx>=0?'Đáp án: '+letter+'. '+opts[keyIdx]:''});return;}
  }
  var subs=[];if(/Đặt tính rồi tính/i.test(body))lines.forEach(function(l){var m=l.match(/^\s*([a-h])\)\s*(.*\d.*)$/);if(m)subs.push({l:m[1],expr:m[2].trim()});});
  if(subs.length){
   var keyParts={};var kre=/^\s*([a-h])\)/gm,km,kf=[];while((km=kre.exec(k)))kf.push({l:km[1],i:km.index});kf.forEach(function(x,i){keyParts[x.l]=k.slice(x.i,i+1<kf.length?kf[i+1].i:k.length).trim();});
   subs.forEach(function(s){questions.push({id:'cau-'+c.n+s.l,type:'OPEN',text:'Câu '+c.n+s.l+'. Đặt tính rồi tính: '+unit(s.expr),points:Math.round(pts/subs.length*100)/100,metadata:{answerLayout:'grid-calculation'},explanation:(keyParts[s.l]||k).slice(0,2000)});});
   return;
  }
  questions.push({id:'cau-'+c.n,type:'OPEN',text:body,points:pts,metadata:{answerLayout:'plain'},explanation:k.slice(0,2000)});
 });
 return {questions:questions,meta:meta};
}
function setOCRAdapter(adapter){if(adapter!==null&&typeof adapter!=='function')throw Error('OCR adapter phải là hàm');ocr=adapter;}
async function readFile(file){if(!file||!file.name)throw Error('Chưa chọn tệp');if(file.size>20*1024*1024)throw Error('Tệp quá lớn (giới hạn 20 MB)');var ext=file.name.split('.').pop().toLowerCase();if(['pdf','docx','png','jpg','jpeg','webp','txt','json'].indexOf(ext)<0)throw Error('Định dạng không hỗ trợ: .'+ext);var pages=[],questions=[],blocks=[],raw='',meta={grade:4,subject:'',topic:''},title=file.name.replace(/\.[^.]+$/,'');
if(['png','jpg','jpeg','webp'].indexOf(ext)>=0){pages=[{page:1,text:'',requiresOCR:true}];blocks=[{id:'source-image',type:'image',sourcePage:1,text:''}];}
else if(ext==='pdf'){var pdfjs=await import('./vendor/review-pdf/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./vendor/review-pdf/pdf.worker.mjs';var task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}),pdf;try{pdf=await task.promise;if(pdf.numPages>50)throw Error('PDF tối đa 50 trang');for(var n=1;n<=pdf.numPages;n++){var p=await pdf.getPage(n),text=lines((await p.getTextContent()).items);pages.push({page:n,text:text,requiresOCR:!text.trim()});}}finally{if(pdf)await pdf.destroy();else if(task.destroy)await task.destroy();}}
else if(ext==='json'){try{var data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!data||Array.isArray(data)||data.schemaVersion!==1||!Array.isArray(data.questions)||!Array.isArray(data.blocks||[]))throw Error('schema');if(data.questions.some(function(q){return !q||typeof q!=='object'||Array.isArray(q)||['ABCD','SINGLE','TRUEFALSE','MULTI','FILL','SHORT','MATCHING','OPEN'].indexOf(q.type||q.kind)<0||!Array.isArray(q.options||q.answers||[])||(q.options||q.answers||[]).some(function(o){return typeof o!=='string';})||!Array.isArray(q.correctAnswers||[])||!Array.isArray(q.pairs||[])||!Array.isArray(q.blockIds||[]);}))throw Error('schema');questions=data.questions;blocks=data.blocks||[];meta=Object.assign(meta,data.metadata||{});title=data.title||title;}catch(e){throw Error('JSON không hợp lệ hoặc chưa đúng schemaVersion 1 với questions[]');}}
else {raw=ext==='txt'?await file.text():(await parser().readFile(file)).raw;pages=[{page:1,text:raw,requiresOCR:!raw.trim()}];}
var tpl=ext!=='json'&&pages.length&&pages.every(function(p){return p.text.trim();})?schoolTemplate(pages.map(function(p){return p.text;}).join('\n')):null;
if(tpl){questions=tpl.questions.map(function(q){q.source={name:file.name};q.blockIds=[];return q;});meta=Object.assign(meta,tpl.meta);pages.forEach(function(p){blocks.push({id:'page-'+p.page,type:'source-text',text:p.text,sourcePage:p.page});});}
else if(ext!=='json'){pages.forEach(function(p){if(!p.text.trim())return;blocks.push({id:'page-'+p.page,type:'source-text',text:p.text,sourcePage:p.page});var looksLikeQuestions=/(?:^|\n)\s*(?:(?:Câu|Question)\s*\d+|\d+\s*[.)]|[A-D][.)]|Dạng\s*:)/i.test(p.text);var parsed=looksLikeQuestions?parser().parseText(p.text,meta):[];parsed.forEach(function(q){q.source={name:file.name,page:p.page};q.blockIds=['page-'+p.page];q.id='import-page-'+p.page+'-q-'+(questions.length+1);questions.push(q);});});}
var d=domain().normalizeDocument({title:title,metadata:meta,questions:questions,blocks:blocks});d.source={name:file.name,mime:file.type||'',blob:file,pages:pages};d.importStatus=pages.some(function(p){return p.requiresOCR;})?'needs-ocr':'ready-for-review';d.ocrAvailable=!!ocr;return d;}
return {readFile:readFile,setOCRAdapter:setOCRAdapter,lines:lines,schoolTemplate:schoolTemplate};
});
