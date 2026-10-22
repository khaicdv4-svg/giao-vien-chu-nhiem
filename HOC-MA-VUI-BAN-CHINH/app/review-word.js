// Xuất Word (.docx) đề in theo mẫu của Trường TH Trần Văn Ơn + trang hướng dẫn chấm.
// Đen trắng, Times New Roman 13; khung tiêu đề (trường, họ tên, lớp, ngày | tên kỳ kiểm tra, môn, thời gian, GV coi, số thứ tự),
// bảng Điểm/Nhận xét/GV chấm, cột điểm "…/0,5 đ" bên trái ngăn bằng đường dọc, dòng chấm kéo hết bề ngang.
// Hai kiểu: "compact" (gọn, giãn dòng 1,2) và "roomy" (thoáng, giãn dòng 1,5, nhiều dòng viết hơn).
// Chạy được trong trình duyệt và Node; dùng zipStore của review-html.js.
(function(root,factory){var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HmvReviewWord=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
function zip(){return (root&&root.HmvReviewHtml||require('./review-html.js')).zipStore;}
var PAGE={w:11906,h:16838,top:567,bottom:567,left:1134,right:964};
var TEXT_W=PAGE.w-PAGE.left-PAGE.right,SCORE_W=1150,BODY_W=TEXT_W-SCORE_W,TAB_END=BODY_W-230;
var SCHOOL='TRƯỜNG TH TRẦN VĂN ƠN',SCHOOL_FULL='TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN';
var LETTERS='ABCDEFGH';

function x(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');}
function num(n){var v=Math.round(Number(n)*100)/100;return String(v).replace('.',',');}
function str(v){return typeof v==='string'?v.trim():v==null?'':String(v);}

// ---------- Khối XML cơ bản ----------
function run(text,o){o=o||{};var rp=(o.b?'<w:b/>':'')+(o.i?'<w:i/>':'')+(o.u?'<w:u w:val="single"/>':'')+(o.sz?'<w:sz w:val="'+o.sz+'"/><w:szCs w:val="'+o.sz+'"/>':'');
 return String(text).split('\t').map(function(part,i){return (i?'<w:r>'+(rp?'<w:rPr>'+rp+'</w:rPr>':'')+'<w:tab/></w:r>':'')+(part?'<w:r>'+(rp?'<w:rPr>'+rp+'</w:rPr>':'')+'<w:t xml:space="preserve">'+x(part)+'</w:t></w:r>':'');}).join('');}
function para(runs,o){o=o||{};var pp='';
 if(o.keep)pp+='<w:keepNext/>';
 if(o.pageBreak)pp+='<w:pageBreakBefore/>';
 if(o.border)pp+='<w:pBdr><w:bottom w:val="'+o.border+'" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>';
 if(o.tabs)pp+='<w:tabs>'+o.tabs.map(function(t){return '<w:tab w:val="'+(t.val||'left')+'"'+(t.leader?' w:leader="'+t.leader+'"':'')+' w:pos="'+t.pos+'"/>';}).join('')+'</w:tabs>';
 pp+='<w:spacing w:before="'+(o.before||0)+'" w:after="'+(o.after==null?0:o.after)+'"'+(o.line?' w:line="'+o.line+'" w:lineRule="auto"':'')+'/>';
 if(o.indent)pp+='<w:ind w:left="'+o.indent+'"/>';
 if(o.align)pp+='<w:jc w:val="'+o.align+'"/>';
 return '<w:p><w:pPr>'+pp+'</w:pPr>'+(typeof runs==='string'?runs:runs.join(''))+'</w:p>';}
function cell(content,o){o=o||{};var tc='<w:tcW w:w="'+o.w+'" w:type="dxa"/>';
 if(o.span)tc+='<w:gridSpan w:val="'+o.span+'"/>';
 if(o.vmerge)tc+='<w:vMerge'+(o.vmerge==='restart'?' w:val="restart"':'')+'/>';
 if(o.borders)tc+='<w:tcBorders>'+o.borders+'</w:tcBorders>';
 if(o.valign)tc+='<w:vAlign w:val="'+o.valign+'"/>';
 content=content||para('');if(/<\/w:tbl>$/.test(content))content+=para('',{line:120});// ô bảng Word phải kết thúc bằng đoạn văn
 return '<w:tc><w:tcPr>'+tc+'</w:tcPr>'+content+'</w:tc>';}
function table(rows,widths,o){o=o||{};var b=o.borders==null?'single':o.borders;
 var bd=b==='none'?'<w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(function(s){return '<w:'+s+' w:val="nil"/>';}).join('')+'</w:tblBorders>'
  :b==='rule'?'<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tblBorders>'
  :'<w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(function(s){return '<w:'+s+' w:val="single" w:sz="6" w:space="0" w:color="000000"/>';}).join('')+'</w:tblBorders>';
 return '<w:tbl><w:tblPr><w:tblW w:w="'+widths.reduce(function(a,c){return a+c;},0)+'" w:type="dxa"/>'+(o.center?'<w:jc w:val="center"/>':'')+bd+'<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>'+widths.map(function(w){return '<w:gridCol w:w="'+w+'"/>';}).join('')+'</w:tblGrid>'+rows.join('')+'</w:tbl>';}
function row(cells,o){o=o||{};return '<w:tr><w:trPr><w:cantSplit/>'+(o.h?'<w:trHeight w:val="'+o.h+'"/>':'')+'</w:trPr>'+cells.join('')+'</w:tr>';}

// ---------- Thông tin kỳ kiểm tra ----------
function examName(doc){
 var t=str(doc.metadata&&doc.metadata.topic)+' '+str(doc.title);
 if(/gi[ữu]a\s*(h[ọo]c\s*k[ìi]|hk)\s*i(?!i)/i.test(t))return 'GIỮA HKI';
 if(/cu[ốo]i\s*(h[ọo]c\s*k[ìi]|hk)\s*i(?!i)/i.test(t))return 'CUỐI HKI';
 if(/gi[ữu]a\s*(h[ọo]c\s*k[ìi]|hk)\s*ii/i.test(t))return 'GIỮA HKII';
 if(/cu[ốo]i\s*(h[ọo]c\s*k[ìi]|hk)\s*ii|cu[ốo]i\s*n[ăa]m/i.test(t))return 'CUỐI NĂM';
 return '';
}
function schoolYear(doc,now){var y=str(doc.metadata&&doc.metadata.schoolYear);if(/^\d{4}\s*[-–]\s*\d{4}$/.test(y))return y.replace(/\s*[-–]\s*/,' - ');now=now||new Date();var a=now.getMonth()>=7?now.getFullYear():now.getFullYear()-1;return a+' - '+(a+1);}

// ---------- Chuẩn bị câu: gộp các phép "Đặt tính" a), b)… thành một câu ----------
function groupKey(q){var m=q.metadata||{},n=str(m.aiNumber)||'';var r=n.match(/^(\d+)\s*([a-h])$/i)||String(q.id||'').match(/^cau-(\d+)-?([a-h])$/i)||str(q.text).match(/^Câu\s*(\d+)\s*([a-h])[.)]/i);return r?r[1]:null;}
function items(doc){
 var qs=doc.questions||[],out=[];
 qs.forEach(function(q){
  var g=q.type==='OPEN'&&(q.metadata||{}).answerLayout==='grid-calculation'?groupKey(q):null,last=out[out.length-1];
  if(g&&last&&last.group===g){last.subs.push(q);last.points+=Number(q.points)||0;return;}
  out.push({group:g,q:q,subs:g?[q]:null,points:Number(q.points)||0});
 });
 return out;
}
function subExpr(q){return str(q.text).replace(/^Câu\s*\d+\s*[a-h][.)]\s*/i,'').replace(/^Đặt tính rồi tính\s*:?\s*/i,'');}
function stemText(q){return str(q.text).replace(/^Câu\s*\d+[a-h]?\s*[.:)]\s*/i,'');}
function isChoice(q){return ['ABCD','SINGLE','MULTI'].indexOf(q.type)>=0||(q.type==='TRUEFALSE'&&!Array.isArray(q.statements));}
function sectionsFor(list,doc){
 var any=list.some(function(it){return str((it.q.metadata||{}).section);});
 if(any)return list.map(function(it){var m=it.q.metadata||{};return {title:str(m.section),note:str(m.sectionNote)};});
 if(!/ki[ểe]m tra/i.test(str(doc.metadata&&doc.metadata.purpose)+' '+str(doc.metadata&&doc.metadata.topic)))return list.map(function(){return {title:'',note:''};});
 var choice=list.filter(function(it){return isChoice(it.q);}),rest=list.filter(function(it){return !isChoice(it.q);});
 var firstRest=list.findIndex(function(it){return !isChoice(it.q);});
 if(!choice.length||!rest.length||list.slice(firstRest).some(function(it){return isChoice(it.q);}))return list.map(function(){return {title:'',note:''};}); // chỉ chia phần khi trắc nghiệm đứng trước tự luận
 var sum=function(a){return num(a.reduce(function(s,it){return s+it.points;},0));};
 var t1='PHẦN I: TRẮC NGHIỆM ('+sum(choice)+' điểm)',t2='PHẦN II: TỰ LUẬN ('+sum(rest)+' điểm)';
 return list.map(function(it){return isChoice(it.q)?{title:t1,note:'Khoanh vào chữ đặt trước ý đúng.'}:{title:t2,note:''};});
}

// ---------- Nội dung từng câu ----------
function dots(n,lineH){var out=[];for(var i=0;i<n;i++)out.push(para(run('\t'),{tabs:[{val:'right',leader:'dot',pos:TAB_END}],line:lineH}));return out.join('');}
function optionRows(opts,lineH){
 var lab=opts.map(function(o,i){return LETTERS[i]+'. '+o;}),max=Math.max.apply(null,lab.map(function(s){return s.length;}));
 var per=max<=17&&opts.length<=4?opts.length:max<=42?2:1,step=Math.floor(TAB_END/per),out=[];
 for(var i=0;i<lab.length;i+=per){var tabs=[];for(var k=1;k<per;k++)tabs.push({pos:step*k});out.push(para(run(lab.slice(i,i+per).join('\t')),{tabs:tabs,line:lineH}));}
 return out.join('');
}
function shuffleRight(pairs){
 var right=pairs.map(function(p){return p.right;}),sorted=right.slice().sort(function(a,b){return a.localeCompare(b,'vi',{numeric:true});});
 if(sorted.every(function(v,i){return v===right[i];}))sorted=sorted.slice(1).concat(sorted.slice(0,1));
 return sorted;
}
function questionBody(it,n,L){
 var q=it.q,m=q.metadata||{},lh=L.line,out=[];
 var lines=stemText(q).split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
 if(it.subs){
  out.push(para([run('Câu '+n+'. ',{b:true}),run('Đặt tính rồi tính:',{b:true})],{line:lh,keep:true}));
  var cells=it.subs.map(function(s,i){return para(run('abcdefghijklmnop'.charAt(i)+') '+subExpr(s)),{line:lh})+halfDots(L.calc,lh);});
  var rows=[];for(var i=0;i<cells.length;i+=2)rows.push(row([cell(cells[i],{w:Math.floor((BODY_W-200)/2)}),cell(cells[i+1]||para(''),{w:Math.floor((BODY_W-200)/2)})]));
  out.push(table(rows,[Math.floor((BODY_W-200)/2),Math.floor((BODY_W-200)/2)],{borders:'none'}));
  return out.join('');
 }
 var first=lines.shift()||'';
 if(q.type==='FILL')first=first.replace(/\[\[\d+\]\]/g,'…………');
 out.push(para([run('Câu '+n+'. ',{b:true}),run(first,{b:true})],{line:lh,keep:true}));
 var hasSolve=false;lines.forEach(function(l){if(/^Bài giải$/i.test(l)){hasSolve=true;return;}out.push(para(run(q.type==='FILL'?l.replace(/\[\[\d+\]\]/g,'…………'):l),{line:lh}));});
 if(m.needsFigure)out.push(para(run('[Hình vẽ'+(m.figureNote?': '+m.figureNote:'')+' – thầy cô chèn hình từ đề gốc]',{i:true}),{line:lh,align:'center'}));
 if(['ABCD','SINGLE','MULTI'].indexOf(q.type)>=0)out.push(optionRows(q.options||[],lh));
 else if(q.type==='TRUEFALSE'&&Array.isArray(q.statements)){
  var w1=BODY_W-200-700;
  out.push(table(q.statements.map(function(s,i){return row([cell(para(run(String.fromCharCode(97+i)+') '+s.text),{line:lh}),{w:w1,borders:'<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/>'}),cell(para(''),{w:700})],{h:420});}),[w1,700],{borders:'single'}));
 }else if(q.type==='TRUEFALSE')out.push(para(run('A. Đúng\tB. Sai'),{tabs:[{pos:3000}],line:lh}));
 else if(q.type==='MATCHING'){
  var pairs=q.pairs||[],right=shuffleRight(pairs),w=Math.floor((BODY_W-200)/2)-300;
  out.push(table(pairs.map(function(p,i){return row([cell(para(run(p.left),{line:lh,align:'center'}),{w:w}),cell(para(''),{w:600,borders:'<w:top w:val="nil"/><w:bottom w:val="nil"/>'}),cell(para(run(right[i]),{line:lh,align:'center'}),{w:w})]);}),[w,600,w],{borders:'single',center:true}));
 }else if(q.type==='SHORT')out.push(para(run('Trả lời: \t'),{tabs:[{val:'right',leader:'dot',pos:TAB_END}],line:lh}));
 else if(q.type==='OPEN'){
  var layout=m.answerLayout||'plain',word=/\bHỏi\b|bao nhiêu|Tính .*(chu vi|diện tích|trung bình)/i.test(q.text)&&!/viết|kể|tả/i.test(q.text);
  var count=layout==='grid-text'?L.essay:Math.max(L.minOpen,Math.round((Number(q.points)||1)*L.perPoint));
  if((word||hasSolve)&&layout==='plain'){out.push(para(run('Bài giải'),{align:'center',line:lh}));count=Math.max(count,L.word);}
  out.push(dots(count,lh));
 }
 return out.join('');
}
function halfDots(n,lh){var out=[];for(var i=0;i<n;i++)out.push(para(run('\t'),{tabs:[{val:'right',leader:'dot',pos:Math.floor((BODY_W-200)/2)-260}],line:lh}));return out.join('');}

// ---------- Trang đề ----------
function header(doc,o){
 var g=Number(doc.metadata&&doc.metadata.grade)||4,sub=str(doc.metadata&&doc.metadata.subject).toUpperCase()||'……',exam=examName(doc);
 var title=(exam?'KTĐK '+exam+' - ':'')+'NĂM HỌC '+schoolYear(doc,o.now);
 var lw=4700,rw=[1700,1700,TEXT_W-4700-3400];
 var left=[para(''),para(run(SCHOOL,{b:true,sz:24}),{after:80}),para(run('HỌ TÊN HS :\t',{b:true,sz:24}),{tabs:[{val:'right',leader:'dot',pos:lw-220}],after:80}),para(run('LỚP :\t',{b:true,sz:24}),{tabs:[{val:'right',leader:'dot',pos:lw-220}],after:80}),para(run('NGÀY KIỂM TRA :\t',{b:true,sz:24}),{tabs:[{val:'right',leader:'dot',pos:lw-220}],after:60})].join('');
 var right=[para(run(title,{b:true,sz:24}),{align:'center'}),para(run('MÔN '+sub+' - Lớp '+g,{b:true,sz:24}),{align:'center'}),para(run('Thời gian : '+(o.minutes?o.minutes+' phút':'…… phút'),{b:true,sz:24}),{align:'center',after:40})].join('');
 var small=function(t){return para(run(t,{b:true,u:true,sz:20}),{align:'center'});};
 var t1=table([row([cell(left,{w:lw,vmerge:'restart',valign:'center'}),cell(right,{w:rw[0]+rw[1]+rw[2],span:3})]),row([cell('',{w:lw,vmerge:'continue'}),cell(small('GV coi KT1'),{w:rw[0]}),cell(small('GV coi KT2'),{w:rw[1]}),cell(small('Số thứ tự'),{w:rw[2]})],{h:850})],[lw].concat(rw));
 var cut=para('',{border:'dashed',after:120});
 var sw=[1500,TEXT_W-1500-4000,2000,2000];
 var t2=table([row([cell(para(run('Điểm',{b:true,u:true,sz:24}),{align:'center'}),{w:sw[0]}),cell(para(run('Nhận xét',{b:true,u:true,sz:24}),{align:'center'})+halfDotsW(2,sw[1]-300),{w:sw[1]}),cell(para(run('GV chấm KT1',{b:true,u:true,sz:24}),{align:'center'}),{w:sw[2]}),cell(para(run('GV chấm KT2',{b:true,u:true,sz:24}),{align:'center'}),{w:sw[3]})],{h:1250})],sw);
 return t1+cut+t2+para(run('PHẦN BÀI LÀM CỦA HỌC SINH',{b:true}),{align:'center',before:60,after:120});
}
function halfDotsW(n,pos){var out=[];for(var i=0;i<n;i++)out.push(para(run('\t',{sz:22}),{tabs:[{val:'right',leader:'dot',pos:pos}]}));return out.join('');}

function testBody(doc,L){
 var list=items(doc),secs=sectionsFor(list,doc),rows=[],shown={},lastSec=null,blocks=doc.blocks||[];
 var left=function(t){return cell(t?para(run(t),{line:L.line}):para(''),{w:SCORE_W});};
 list.forEach(function(it,i){
  var s=secs[i];
  if(s.title&&s.title!==lastSec){rows.push(row([left(''),cell(para(run(s.title,{b:true}),{line:L.line,keep:true})+(s.note?para(run(s.note,{b:true}),{line:L.line,keep:true}):''),{w:BODY_W})]));lastSec=s.title;}
  (it.q.blockIds||[]).forEach(function(id){if(shown[id])return;var b=blocks.filter(function(b){return b.id===id;})[0];if(!b)return;shown[id]=1;
   var text=str(b.text||b.content).split(/\n+/).filter(Boolean).map(function(l){return para(run(l),{line:L.line,align:'both'});}).join('');
   rows.push(row([left(''),cell(para(run(str(b.title)||'Bài đọc',{b:true}),{align:'center',line:L.line})+text+para(''),{w:BODY_W})]));});
  rows.push(row([left('…/'+num(it.points)+' đ'),cell(questionBody(it,i+1,L),{w:BODY_W})]));
 });
 return table(rows,[SCORE_W,BODY_W],{borders:'rule'})+para(run('Hết'),{align:'center',before:120});
}

// ---------- Hướng dẫn chấm ----------
function keyText(q){
 var m=q.metadata||{},flag=m.aiAnswer==='suggested'?' (đáp án AI viết – chưa duyệt)':'';
 if(['ABCD','SINGLE','MULTI'].indexOf(q.type)>=0||(q.type==='TRUEFALSE'&&!Array.isArray(q.statements))){
  var opts=q.type==='TRUEFALSE'&&!(q.options||[]).length?['Đúng','Sai']:q.options||[];
  if(!(q.correctAnswers||[]).length)return {text:'(chưa có đáp án)',missing:true};
  return {text:q.correctAnswers.map(function(k){return LETTERS[k]+'. '+(opts[k]||'');}).join('; ')+flag};
 }
 if(q.type==='TRUEFALSE'){if(q.statements.some(function(s){return typeof s.answer!=='boolean';}))return {text:'(chưa đủ đáp án)',missing:true};return {text:q.statements.map(function(s,i){return String.fromCharCode(97+i)+') '+(s.answer?'Đ':'S');}).join('; ')+flag};}
 if(q.type==='FILL'){var b=q.blanks||[];if(!b.length||b.some(function(x){return !str(x.answerText);}))return {text:'(chưa đủ đáp án)',missing:true};return {text:b.map(function(x){return '('+x.id+') '+x.answerText;}).join('; ')+flag};}
 if(q.type==='MATCHING'){if(m.aiAnswer==='missing')return {text:'(chưa có đáp án)',missing:true};return {text:(q.pairs||[]).map(function(p){return p.left+' – '+p.right;}).join('; ')+flag};}
 var t=[str(q.answerText),str(q.explanation)].filter(Boolean).join('\n');
 return t?{text:t+flag}:{text:'(chưa có đáp án)',missing:true};
}
function answerKey(doc,L,o){
 var g=Number(doc.metadata&&doc.metadata.grade)||4,sub=str(doc.metadata&&doc.metadata.subject).toUpperCase()||'……',exam=examName(doc);
 var out=[para(run(SCHOOL_FULL,{b:true}),{align:'center',pageBreak:true}),para(run('TỔ CHUYÊN MÔN '+g,{b:true}),{align:'center',after:200}),
  para(run('ĐÁP ÁN MÔN '+sub+(exam?' – '+exam:'')+' – LỚP '+g,{b:true}),{align:'center'}),para(run('Năm học: '+schoolYear(doc,o.now).replace(' - ',' – '),{b:true}),{align:'center',after:200})];
 var list=items(doc),secs=sectionsFor(list,doc),lastSec=null,choiceRows=[],missing=0;
 function flush(){if(choiceRows.length){out.push(table(choiceRows,[1100,TEXT_W-1100-1500,1500]));choiceRows=[];}}
 list.forEach(function(it,i){
  var s=secs[i],n=i+1,q=it.q;
  if(s.title&&s.title!==lastSec){flush();out.push(para(run(s.title,{b:true}),{before:160,line:L.keyLine}));lastSec=s.title;}
  if(!it.subs&&isChoice(q)){var k=keyText(q);if(k.missing)missing++;choiceRows.push(row([cell(para(run('Câu '+n)),{w:1100}),cell(para(run(k.text,{i:!!k.missing})),{w:TEXT_W-2600}),cell(para(run(num(it.points)+' điểm')),{w:1500})]));return;}
  flush();
  out.push(para(run('Câu '+n+' ('+num(it.points)+' điểm)',{b:true}),{before:120,line:L.keyLine,keep:true}));
  (it.subs||[q]).forEach(function(sq,j){var k=keyText(sq);if(k.missing)missing++;var pre=it.subs&&!/^\s*[a-h]\)/.test(k.text)?'abcdefghijklmnop'.charAt(j)+') '+subExpr(sq)+': ':'';
   k.text.split('\n').forEach(function(l,li){out.push(para(run((li?'':pre)+l,{i:!!k.missing}),{line:L.keyLine}));});});
 });
 flush();
 if(missing)out.push(para(run('Còn '+missing+' mục chưa có đáp án – thầy cô bổ sung trước khi chấm.',{i:true}),{before:200}));
 return out.join('');
}

var LAYOUT={
 compact:{line:276,keyLine:276,calc:4,perPoint:2,minOpen:2,word:5,essay:10},
 roomy:{line:360,keyLine:300,calc:5,perPoint:3,minOpen:3,word:8,essay:16}
};
function documentXml(doc,o){
 var L=LAYOUT[o.layout]||LAYOUT.compact,body=header(doc,o)+testBody(doc,L)+(o.answerKey===false?'':answerKey(doc,L,o));
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+
  '<w:sectPr><w:pgSz w:w="'+PAGE.w+'" w:h="'+PAGE.h+'"/><w:pgMar w:top="'+PAGE.top+'" w:right="'+PAGE.right+'" w:bottom="'+PAGE.bottom+'" w:left="'+PAGE.left+'" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>';
}
var STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:color w:val="000000"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
function renderDocx(doc,o){
 o=o||{};
 if(!doc||!Array.isArray(doc.questions)||!doc.questions.length)throw Error('Học liệu chưa có câu hỏi để xuất Word.');
 var files=[
  {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
  {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
  {name:'docProps/core.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+x(doc.title)+'</dc:title><dc:creator>HỌC MÀ VUI</dc:creator></cp:coreProperties>'},
  {name:'word/_rels/document.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
  {name:'word/styles.xml',data:STYLES},
  {name:'word/document.xml',data:documentXml(doc,o)}
 ];
 return zip()(files,o.now||new Date());
}
function filename(title,layout){var base=String(title||'de-kiem-tra').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,60)||'de-kiem-tra';return base+(layout==='roomy'?'-thoang':'')+'.docx';}

return {renderDocx:renderDocx,documentXml:documentXml,filename:filename,items:items,keyText:keyText,examName:examName,LAYOUT:LAYOUT};
});
