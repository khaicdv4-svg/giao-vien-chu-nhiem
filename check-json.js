const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(require('fs').readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
console.log('Attempt JSON:', JSON.stringify(p, null, 2).slice(0, 300));
