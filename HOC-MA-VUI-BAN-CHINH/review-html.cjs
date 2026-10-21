'use strict';
const fs=require('node:fs');
const path=require('node:path');
const shared=require('./app/review-html.js');
function renderHtml(raw){return shared.renderHtml(raw,fs.readFileSync(path.join(__dirname,'app/review-domain.js'),'utf8'));}
function renderScormPackage(raw){return shared.renderScormPackage(raw,fs.readFileSync(path.join(__dirname,'app/review-domain.js'),'utf8'));}
module.exports={...shared,renderHtml,renderScormPackage};
if(require.main===module){
  const args=process.argv.slice(2),scorm=args[0]==='--scorm',[input,output]=scorm?args.slice(1):args;
  if(!input||!output) throw Error('Cách dùng: node review-html.cjs [--scorm] đề.json bài.html|gói.zip');
  const raw=JSON.parse(fs.readFileSync(input,'utf8'));
  if(scorm)fs.writeFileSync(output,renderScormPackage(raw),{flag:'wx'});
  else fs.writeFileSync(output,renderHtml(raw),{encoding:'utf8',flag:'wx'});
  console.log((scorm?'Đã xuất gói SCORM: ':'Đã xuất HTML luyện tập: ')+path.resolve(output));
}
