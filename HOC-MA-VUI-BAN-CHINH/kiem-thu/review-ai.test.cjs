'use strict';
// AI phân tích đề – kiểm thử chuyển đổi và lời gọi (AI giả lập, không gọi Gemini thật).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../app/review-ai.js');
const domain=require('../app/review-domain.js');

const SAMPLE={title:'Đề kiểm tra giữa học kì I',subject:'Toán',grade:4,topic:'Kiểm tra giữa học kì I',
 passages:[{id:'p1',title:'Cây bàng',text:'Cây bàng trước sân trường…'}],
 questions:[
  {number:'1',type:'ABCD',text:'Số liền sau của 999 999 là:',points:0.5,options:['1 000 000','999 998','999 990','1 000 001'],correct:[0],answerSource:'key',section:'PHẦN I: TRẮC NGHIỆM (3 điểm)',sectionNote:'Khoanh vào chữ đặt trước ý đúng'},
  {number:'2',type:'ABCD',text:'Góc 120° là góc gì?',points:0.5,options:['Góc nhọn','Góc tù','Góc vuông','Góc bẹt'],correct:[],answerSource:'none'},
  {number:'3',type:'ABCD',text:'5 × 6 = ?',points:0.5,options:['30','11','56','35'],correct:[0],answerSource:'ai'},
  {number:'4',type:'TRUEFALSE',text:'Đúng ghi Đ, sai ghi S',points:1,statements:[{text:'1 tấn = 1 000 kg',answer:'Đúng'},{text:'1 giờ = 100 phút',answer:'?'}],answerSource:'key'},
  {number:'5',type:'FILL',text:'2 giờ = [[a]] phút; 3 m = [[b]] cm',points:1,blanks:[{answer:'120'},{answer:'300'}],answerSource:'key'},
  {number:'6',type:'MATCHING',text:'Nối',points:1,pairs:[{left:'2 × 3',right:'6'},{left:'4 × 5',right:'20'}],answerSource:'none'},
  {number:'7',type:'SHORT',text:'Số chẵn lớn nhất có một chữ số?',points:0.5,answerText:'8',answerSource:'key'},
  {number:'8a',type:'OPEN',text:'Đặt tính rồi tính: 243 625 + 132 284',points:0.5,layout:'grid-calculation',answerText:'375 909',guide:'Đặt tính đúng và tính đúng: 0,5 điểm',answerSource:'key'},
  {number:'8b',type:'OPEN',text:'Đặt tính rồi tính: 4 685 : 5',points:0.5,layout:'grid-calculation',answerSource:'none'},
  {number:'9',type:'OPEN',text:'Đọc bài và trả lời: cây bàng ở đâu?',points:1,passageIds:['p1'],answerSource:'none',needsFigure:true,figureNote:'tranh cây bàng'},
  {number:'10',type:'SINGLE',text:'Chỉ có một phương án',points:1,options:['A'],correct:[0],answerSource:'key'},
  {number:'11',type:'ABCD',text:'',points:1,options:['a','b'],answerSource:'key'}
 ],warnings:['Câu 2: ảnh hơi mờ']};

test('chuyển kết quả AI thành học liệu đúng hợp đồng domain',()=>{
 const c=ai.toDocument(SAMPLE);
 assert.equal(c.questions.length,11,'bỏ câu rỗng');
 assert.deepEqual(c.questions.map(q=>q.type),['ABCD','ABCD','ABCD','TRUEFALSE','FILL','MATCHING','SHORT','OPEN','OPEN','OPEN','OPEN']);
 const [q1,q2,q3,q4,q5,q6,q7,q8a,q8b,q9,q10]=c.questions;
 assert.deepEqual(q1.correctAnswers,[0]);assert.equal(q1.points,0.5);assert.equal(q1.metadata.aiAnswer,'key');assert.equal(q1.metadata.section,'PHẦN I: TRẮC NGHIỆM (3 điểm)');
 assert.equal(q2.metadata.aiAnswer,'missing');assert.deepEqual(q2.correctAnswers,[]);
 assert.equal(q3.metadata.aiAnswer,'suggested');
 assert.deepEqual(q4.statements,[{text:'1 tấn = 1 000 kg',answer:true},{text:'1 giờ = 100 phút',answer:null}]);assert.equal(q4.metadata.aiAnswer,'missing');
 assert.equal(q5.text,'2 giờ = [[1]] phút; 3 m = [[2]] cm');assert.deepEqual(q5.blanks.map(b=>[b.id,b.answerText]),[['1','120'],['2','300']]);assert.deepEqual(domain.validateFillBlanks(q5),[]);
 assert.equal(q6.metadata.aiAnswer,'missing','nối cặp không có đáp án thì không coi thứ tự gốc là đáp án');
 assert.equal(q7.metadata.shortScoring,'exact');
 assert.equal(q8a.id,'cau-8a');assert.equal(q8a.metadata.answerLayout,'grid-calculation');assert.equal(q8a.metadata.aiAnswer,'key');assert.equal(q8a.explanation,'Đặt tính đúng và tính đúng: 0,5 điểm');
 assert.equal(q8b.metadata.aiAnswer,'none');
 assert.deepEqual(q9.blockIds,['doan-1']);assert.equal(q9.metadata.needsFigure,true);
 assert.equal(q10.type,'OPEN','câu chọn chỉ có 1 phương án chuyển thành tự luận');
 assert.equal(c.blocks[0].id,'doan-1');assert.equal(c.metadata.subject,'Toán');
 const kinds=c.notes.map(n=>n.kind+':'+n.id);
 assert.ok(kinds.includes('missing:cau-2')&&kinds.includes('suggested:cau-3')&&kinds.includes('figure:cau-9')&&kinds.includes('missing:cau-6'));
 const doc=domain.normalizeDocument({title:c.title,metadata:c.metadata,blocks:c.blocks,questions:c.questions});
 const errs=domain.validateDocument(doc).filter(e=>!/khóa|đáp án|Nhận định|chỗ trống/i.test(e));
 assert.deepEqual(errs,[],'ngoài thiếu đáp án thì học liệu hợp lệ');
});

test('dữ liệu AI rác không làm hỏng',()=>{
 const c=ai.toDocument({questions:[null,5,{type:'XYZ',text:'Viết đoạn văn',points:-3,answerSource:'zz'},{number:'1',type:'ABCD',text:'Trùng số',options:['a','b','c','d'],correct:[9,1,1],answerSource:'key'},{number:'1',type:'ABCD',text:'Trùng số 2',options:['a','b','c','d'],correct:[2],answerSource:'key'}],grade:9});
 assert.equal(c.questions.length,3);assert.equal(c.questions[0].type,'OPEN');assert.equal(c.questions[0].points,1);
 assert.deepEqual(c.questions[1].correctAnswers,[1]);
 assert.notEqual(c.questions[1].id,c.questions[2].id,'mã câu không trùng');
 assert.equal(c.metadata.grade,undefined);
});

test('mặc định AI tự viết đáp án còn thiếu; tắt thì cấm tự giải',async()=>{
 const seen=[];
 const fetcher=async(url,init)=>{seen.push({url,body:JSON.parse(init.body)});return {ok:true,status:200,json:async()=>({ok:true,text:JSON.stringify(SAMPLE),model:'gemini-test'})};};
 await ai.callAI([{text:'x'}],{fetcher,suggestAnswers:false});
 await ai.callAI([{text:'x'}],{fetcher});
 assert.equal(seen[0].url,'./api/ai/generate');assert.equal(seen[0].body.json,true);assert.ok(seen[0].body.schema.properties.questions);
 assert.match(seen[0].body.system,/KHÔNG tự giải/);assert.doesNotMatch(seen[1].body.system,/KHÔNG tự giải/);assert.match(seen[1].body.system,/answerSource "ai"/);assert.match(seen[1].body.system,/hướng dẫn chấm/);assert.match(seen[1].body.system,/BẮT BUỘC có đáp án cho MỌI câu/);
 assert.equal(seen[0].body.temperature,0.1);
});

test('báo lỗi rõ khi chưa có khóa / AI trả lời cắt ngang',async()=>{
 await assert.rejects(ai.callAI([{text:'x'}],{fetcher:async()=>({ok:false,status:503,json:async()=>({ok:false,code:'NO_KEY',message:'Chưa có khóa Gemini.'})})}),/Chưa có khóa Gemini/);
 await assert.rejects(ai.callAI([{text:'x'}],{fetcher:async()=>({ok:true,status:200,json:async()=>({ok:true,text:'{"questions":[{"num',truncated:true})})}),/tách đề/);
});

test('PDF gửi nguyên tệp; Word gửi chữ; ảnh quá lớn báo lỗi',async()=>{
 const pdf={name:'de.pdf',size:10,arrayBuffer:async()=>new Uint8Array([37,80,68,70]).buffer};
 const p=await ai.buildParts(pdf,{source:{pages:[{text:''}]}});
 assert.equal(p[0].inlineData.mimeType,'application/pdf');assert.equal(p[0].inlineData.data,'JVBERg==');
 const w=await ai.buildParts({name:'de.docx',size:10},{source:{pages:[{text:'Câu 1. 2 + 2 = ?'}]}});
 assert.match(w[0].text,/Câu 1\. 2 \+ 2/);assert.match(w[0].text,/hình vẽ trong Word/);
 await assert.rejects(ai.buildParts({name:'anh.jpg',size:ai.MAX_INLINE+1},{source:{pages:[{text:''}]}}),/quá lớn/);
});

test('analyze ghép với tài liệu nguồn và lập báo cáo',async()=>{
 const fetcher=async()=>({ok:true,status:200,json:async()=>({ok:true,text:'```json\n'+JSON.stringify(SAMPLE)+'\n```',model:'gemini-test'})});
 const src={title:'de',metadata:{grade:4},source:{name:'de.docx',pages:[{text:'Câu 1…'}]},questions:[],blocks:[]};
 const {doc,report}=await ai.analyze({name:'de.docx',size:5},src,{fetcher});
 assert.equal(doc.source.name,'de.docx','giữ tài liệu nguồn để đối chiếu');
 assert.equal(doc.questions.length,11);assert.equal(report.count,11);assert.equal(report.points,8);
 assert.match(report.byType,/3 bốn lựa chọn/);assert.equal(report.model,'gemini-test');assert.deepEqual(report.warnings,['Câu 2: ảnh hơi mờ']);
 await assert.rejects(ai.analyze({name:'de.docx',size:5},src,{fetcher:async()=>({ok:true,status:200,json:async()=>({ok:true,text:'{"questions":[]}'})})}),/không tìm thấy câu hỏi/);
});

test('lượt 2: chỉ gửi các câu còn thiếu đáp án, AI giải xong thì điền vào đúng dạng',async()=>{
 const c=ai.toDocument(SAMPLE);const seen=[];
 const fetcher=async(u,init)=>{const b=JSON.parse(init.body);seen.push(b);return {ok:true,status:200,json:async()=>({ok:true,text:JSON.stringify({answers:[{id:'cau-2',correct:[1]},{id:'cau-4',statements:['Đúng','Sai']},{id:'cau-6',pairs:[{left:'2 × 3',right:'6'},{left:'4 × 5',right:'20'}]},{id:'cau-8b',answerText:'937',guide:'Đặt tính đúng, tính đúng: 0,5 điểm'},{id:'cau-9',answerText:'Trước sân trường'}]})})};};
 const n=await ai.fillMissing(c,{fetcher});
 assert.equal(seen.length,1);assert.ok(seen[0].schema.properties.answers);assert.match(seen[0].system,/Bắt buộc trả lời mọi câu/);
 const sent=JSON.parse(seen[0].contents[0].parts[0].text.replace(/^[\s\S]*?Giải các câu sau:\n/,''));
 assert.deepEqual(sent.map(q=>q.id),['cau-2','cau-4','cau-6','cau-8b','cau-9','cau-10']);assert.equal(sent.find(q=>q.id==='cau-9').passage,'Cây bàng trước sân trường…');
 assert.equal(n,5);
 const q=id=>c.questions.find(x=>x.id===id);
 assert.deepEqual(q('cau-2').correctAnswers,[1]);assert.deepEqual(q('cau-4').statements.map(s=>s.answer),[true,false]);assert.equal(q('cau-8b').answerText,'937');
 for(const id of ['cau-2','cau-4','cau-6','cau-8b','cau-9'])assert.equal(q(id).metadata.aiAnswer,'suggested');
 assert.equal(q('cau-10').metadata.aiAnswer,'none','AI không trả lời câu nào thì giữ nguyên để thầy cô nhập');
 assert.deepEqual(ai.aiSolved({questions:c.questions}),[2,3,4,6,9,10]);
});
