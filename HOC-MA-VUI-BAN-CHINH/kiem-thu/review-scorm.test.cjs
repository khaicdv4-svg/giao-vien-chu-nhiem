'use strict';
// Gói SCORM 1.2: zip hợp lệ (đọc lại được, CRC đúng), manifest đúng chuẩn tối thiểu, HTML bên trong giữ nguyên.
const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const html=require('../review-html.cjs'),fixture=require('./fixtures/review-combined4.json');
function unzip(buf){const files={};let p=0;while(buf.readUInt32LE(p)===0x04034b50){const flags=buf.readUInt16LE(p+6),method=buf.readUInt16LE(p+8),crc=buf.readUInt32LE(p+14),size=buf.readUInt32LE(p+18),n=buf.readUInt16LE(p+26),x=buf.readUInt16LE(p+28);const name=buf.slice(p+30,p+30+n).toString('utf8'),data=buf.slice(p+30+n+x,p+30+n+x+size);assert.equal(method,0);assert.equal(flags&0x0800,0x0800);assert.equal(zlib.crc32?zlib.crc32(data):html.crc32(data),crc);files[name]=data;p+=30+n+x+size;}assert.equal(buf.readUInt32LE(buf.length-22),0x06054b50);return files;}
test('crc32 khớp giá trị chuẩn',()=>{assert.equal(html.crc32(Buffer.from('123456789')),0xCBF43926);});
test('gói có imsmanifest.xml ở gốc và index.html giống hệt bản HTML xuất ra',()=>{
  const files=unzip(Buffer.from(html.renderScormPackage(fixture)));
  assert.deepEqual(Object.keys(files),['imsmanifest.xml','index.html']);
  assert.equal(files['index.html'].toString('utf8'),html.renderHtml(fixture));
  const m=files['imsmanifest.xml'].toString('utf8');
  assert.match(m,/<schemaversion>1\.2<\/schemaversion>/);assert.match(m,/adlcp:scormtype="sco" href="index.html"/);
  assert.match(m,/<title>Toán lớp 4 – đề tổng hợp kiểm thử<\/title>/);assert.match(m,/identifier="HMV-combined-math4"/);
});
test('tên đề có ký tự đặc biệt được thoát trong manifest; mã định danh hợp lệ',()=>{
  const d=structuredClone(fixture);d.title='Ôn tập <Toán> & "Tiếng Việt"';d.id='1 đề/mới';
  const m=html.scormManifest(html.createPractice(d).title,'1 đề/mới');
  assert.match(m,/Ôn tập &lt;Toán&gt; &amp; &quot;Tiếng Việt&quot;/);assert.match(m,/identifier="HMV-X-----m-i"|identifier="HMV-X[^"]*"/);assert.doesNotMatch(m,/identifier="HMV-1/);
  assert.equal(html.scormFilename('Ôn tập Toán – Đề 1'),'scorm-on-tap-toan-de-1.zip');assert.equal(html.scormFilename(''),'scorm-hoc-lieu.zip');
});
test('đề lỗi thì không tạo gói',()=>{const d=structuredClone(fixture);d.questions[0].points=0;assert.throws(()=>html.renderScormPackage(d),/Điểm/);});
test('đề nhập từ tệp: bỏ "trang văn bản gốc" khi xuất, không đổi đề gốc; ngữ liệu thật vẫn báo chưa hỗ trợ',()=>{
  const d=structuredClone(fixture);d.blocks=[{id:'page-1',type:'source-text',text:'TRANG GỐC BÍ MẬT'}];d.questions.forEach(q=>q.blockIds=['page-1']);
  const before=JSON.stringify(d),out=html.renderHtml(d);
  assert.doesNotMatch(out,/TRANG GỐC BÍ MẬT/);assert.equal(JSON.stringify(d),before);
  const real=structuredClone(fixture);real.blocks=[{id:'b1',type:'text',text:'Bài đọc'}];real.questions[0].blockIds=['b1'];
  assert.throws(()=>html.createPractice(real),/ngữ liệu liên kết/);
});
