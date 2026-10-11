const { open, importFile } = require('./lib.cjs'); const fs = require('fs'); const path = require('path');
(async () => {
  const out = [];
  for (const [f, label, check] of [
    ['../harness/qa-files/sample.txt', 'TXT', r => r.rows.length === 1 && r.rows[0].key === 'B'],
    ['../harness/qa-files/sample.csv', 'CSV', r => r.rows.length === 1 && r.rows[0].key === 'B'],
    ['../harness/qa-files/sample.json', 'JSON', r => r.rows.length === 1 && r.rows[0].key === 'B'],
    ['../harness/qa-files/sample.xlsx', 'XLSX', r => r.rows.length === 1 && r.rows[0].key === 'B' && r.rows[0].subject === 'Toán'],
    ['../harness/qa-files/sample.docx', 'DOCX', r => r.rows.length === 1 && r.rows[0].key === 'B'],
    ['files/multi20.txt', '20 câu nhiều đáp án (TXT)', r => r.rows.length === 20 && r.rows.every(x => x.kind === 'MULTI' && x.key === 'A,C')],
    ['files/ds20-cham.docx', 'Word: đáp án “Đúng.”', r => r.rows.length === 20 && r.rows.every(x => x.kind === 'TRUEFALSE')],
    ['files/ds20-tieu-de-het.docx', 'Word: có “--- HẾT ---”', r => r.rows.length === 20 && r.rows[19].text === 'Các số lẻ có chữ số tận cùng là 0, 2, 4, 6, 8.'],
    ['files/ds20-cung-doan.docx', 'Word: câu và đáp án chung đoạn', r => r.rows.length === 20 && r.rows.every(x => x.kind === 'TRUEFALSE')],
    ['files/ds20-khong-tieu-de.docx', 'Word: không tiêu đề', r => r.rows.length === 20 && r.rows.every(x => x.kind === 'TRUEFALSE')]
  ]) {
    const { browser, page, logs } = await open(); let r, ok = false, saved = null;
    try { r = await importFile(page, path.resolve(__dirname, f)); ok = check(r); await page.click('#q7Save'); await page.waitForTimeout(700); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.length > 0); saved = await page.evaluate(() => { const s = questionBankSets.find(x => /^q7-set/.test(x.id)); return s ? s.questions.length + ' câu · ' + JSON.stringify(s.questions.reduce((a, q) => (a[hmvKho.kindOf(q)] = (a[hmvKho.kindOf(q)] || 0) + 1, a), {})) : 'KHÔNG LƯU'; }); } catch (e) { r = { summary: 'ERR ' + e.message.slice(0, 150) }; }
    const pass = ok && saved && saved !== 'KHÔNG LƯU' && !logs.some(l => /PAGEERROR/.test(l));
    out.push({ file: path.basename(f), label, status: pass ? 'PASS' : 'FAIL', summary: r.summary, savedAfterReload: saved });
    console.log((pass ? 'PASS ' : 'FAIL ') + label + ' — ' + r.summary.slice(0, 110) + ' — sau tải lại: ' + saved); await browser.close(); }
  { const { browser, page } = await open(); fs.writeFileSync('files/gia.pdf', '%PDF-1.4\n%fake\n'); await page.evaluate(() => openView('questions')); await page.click('#questions [data-kho-add]'); await page.click('#qbStage7Modal [data-source="file"]'); await page.setInputFiles('#q7File', 'files/gia.pdf'); await page.click('#q7ReadFile'); await page.waitForTimeout(600); const msg = await page.evaluate(() => document.querySelector('#q7FileStatus').textContent); out.push({ file: 'gia.pdf', label: 'PDF', status: /PDF chưa có bộ đọc/.test(msg) ? 'BLOCKED (từ chối rõ ràng)' : 'FAIL', summary: msg }); console.log('PDF → ' + msg.slice(0, 80)); await browser.close(); }
  fs.writeFileSync('formats-results.json', JSON.stringify(out, null, 1));
  console.log('ĐỊNH DẠNG: ' + out.filter(x => x.status === 'PASS').length + ' PASS / ' + out.filter(x => x.status === 'FAIL').length + ' FAIL / 1 BLOCKED');
})();
