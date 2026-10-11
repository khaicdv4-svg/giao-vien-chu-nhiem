/* Lệnh 09: dữ liệu minh họa chỉ dùng trong gói trình diễn ở cổng 8770. */
(function(){
  'use strict';
  if(location.origin!=='http://127.0.0.1:8772')return;
  var mark='hmv_exhibition_09_seeded',year='2026–2027',user='local-device';
  function question(grade,index,text,answers,correct,subject){return{id:'demo09-'+grade+'-'+index,grade:'Lớp '+grade,subject:subject||'Toán',topic:'Ngày hội chuyển đổi số',level:'Mức 1',kind:'ABCD',text:text,question:text,answers:answers,options:answers.slice(),correct:correct,correctAnswer:answers[correct],source:'demo-09'}}
  function math(grade,i){
    var answer,text,fmt=function(n){return n.toFixed(1).replace('.',',')};
    if(grade===1){var a=i+2,b=1+i%4;answer=a+b;text=a+' + '+b+' = ?'}
    else if(grade===2){var a2=30+i*3,b2=5+i%5;answer=a2-b2;text=a2+' − '+b2+' = ?'}
    else if(grade===3){var a3=2+i%8,b3=2+Math.floor(i/8);answer=a3*b3;text=a3+' × '+b3+' = ?'}
    else if(grade===4){var a4=125+i*37,b4=48+i*4;answer=a4+b4;text=a4+' + '+b4+' = ?'}
    else {var a5=(i+3)/10;answer=Number((a5+0.5).toFixed(1));text=fmt(a5)+' + 0,5 = ?'}
    var values=grade===5?[answer,Number((answer+0.1).toFixed(1)),Number((answer-0.1).toFixed(1)),Number((answer+0.2).toFixed(1))]:[answer,answer+1,answer-1,answer+2];
    var correct=i%4,options=values.map(function(_,at){return grade===5?fmt(values[(at-correct+4)%4]):String(values[(at-correct+4)%4])});
    return question(grade,i,text,options,correct,'Toán');
  }
  var language={
    1:[['Chữ nào là nguyên âm?',['A','B','C','D'],0],['Từ nào chỉ màu sắc?',['đỏ','bàn','đi','cao'],0]],
    2:[['Từ nào chỉ hoạt động?',['chạy','đẹp','bàn','xanh'],0],['Cuối câu hỏi đặt dấu gì?',['?','.','! ',','],0]],
    3:[['Từ trái nghĩa với “cao” là gì?',['thấp','xa','dài','rộng'],0],['Từ nào chỉ sự vật?',['cây bàng','nhanh','chạy','vui'],0]],
    4:[['Từ nào là động từ?',['đọc','quyển sách','xanh','cao'],0],['Từ gần nghĩa với “chăm chỉ” là gì?',['siêng năng','lười biếng','ồn ào','vội vàng'],0]],
    5:[['Từ gần nghĩa với “dũng cảm” là gì?',['can đảm','lo lắng','chậm chạp','yên tĩnh'],0],['Trong câu “Em đọc sách”, từ nào là động từ?',['đọc','Em','sách','Trong'],0]]
  };
  function questions(grade){var out=[];for(var i=0;i<10;i++)out.push(math(grade,i));language[grade].forEach(function(x,i){out.push(question(grade,10+i,x[0],x[1],x[2],'Tiếng Việt'))});out.push(question(grade,12,'2 + 2 = 4 có đúng không?',['Đúng','Sai'],0,'Toán'));out.push(question(grade,13,'Một tuần có 8 ngày đúng không?',['Đúng','Sai'],1,'Tự nhiên và Xã hội'));return out}
  function workspace(grade){return{userId:user,schoolYearId:year,gradeId:String(grade),classId:grade+'.1',students:Array.from({length:8},function(_,i){return{id:'demo09-'+grade+'-'+i,name:'Bạn mẫu '+String(i+1).padStart(2,'0'),team:i%4+1,score:0,status:'Có mặt'}}),scores:[1,2,3,4].map(function(n){return{team:n,points:0}}),questions:questions(grade),updatedAt:new Date().toISOString()}}
  function seed(){if(localStorage.getItem(mark))return;for(var i=0;i<localStorage.length;i++)if((localStorage.key(i)||'').startsWith('tk_workspace_'))return;for(var grade=1;grade<=5;grade++){var row=workspace(grade);localStorage.setItem('tk_workspace_'+encodeURIComponent(user)+'_'+encodeURIComponent(year)+'_'+encodeURIComponent(row.classId),JSON.stringify(row))}localStorage.setItem('tk_active_workspace',JSON.stringify({userId:user,schoolYearId:year,gradeId:'1',classId:'1.1'}));localStorage.setItem(mark,'1');location.reload()}
  function seedSets(){if(!localStorage.getItem(mark)||!window.audioDB||!Array.isArray(window.questionBankSets)||typeof window.questionBankSaveAll!=='function')return false;var changed=false;for(var grade=1;grade<=5;grade++){var id='demo09-grade-'+grade;if(window.questionBankSets.some(function(x){return x.id===id}))continue;var now=new Date().toISOString();window.questionBankSets.push({id:id,name:'Ngày hội · Lớp '+grade,setTitle:'Ngày hội · Lớp '+grade,grade:'Lớp '+grade,subject:'Toán và Tiếng Việt',topic:'Trải nghiệm ngắn',purpose:'Trình diễn',description:'Câu hỏi mẫu; không có dữ liệu học sinh thật.',createdAt:now,updatedAt:now,questions:questions(grade),games:['Các trò chơi']});changed=true}if(changed)window.questionBankSaveAll();return true}
  window.addEventListener('load',function(){seed();var tries=0,timer=setInterval(function(){if(seedSets()||++tries>=50)clearInterval(timer)},200)},{once:true});
})();

