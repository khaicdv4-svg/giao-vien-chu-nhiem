const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(require('fs').readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = require('fs').readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

// Check if script tags exist
const scripts = html.match(/<script[^>]*>.*?<\/script>/gs);
console.log('Script tags found:', scripts ? scripts.length : 0);

// Check for runtime call
if (html.includes('runtime()')) {
  console.log('✓ runtime() call found');
} else {
  console.log('❌ runtime() call NOT found');
}

// Check for HmvReviewDomain in HTML
if (html.includes('HmvReviewDomain')) {
  console.log('✓ HmvReviewDomain referenced');
} else {
  console.log('❌ HmvReviewDomain NOT found');
}

// Check for form event listener
if (html.includes("form.addEventListener('submit'")) {
  console.log('✓ Form submit listener found in source');
} else {
  console.log('⚠️  Form submit listener not directly in HTML');
}

const scriptStart = html.lastIndexOf('<script>');
const htmlEnd = html.lastIndexOf('</html>');
if (scriptStart > 0) {
  const lastScript = html.substring(scriptStart, Math.min(scriptStart + 300, htmlEnd));
  console.log('\nLast script tag preview:', lastScript);
}
