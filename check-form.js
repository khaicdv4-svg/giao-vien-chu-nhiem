const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(require('fs').readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = require('fs').readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);
const match = html.match(/<form[^>]*>/);
console.log('Form tag:', match?.[0] || 'No form tag found');
const formEnd = html.indexOf('</form>');
const formStart = html.indexOf('<form');
if (formStart !== -1 && formEnd !== -1) {
  const form = html.substring(formStart, Math.min(formEnd + 50, formStart + 200));
  console.log('Form start:', form);
}
