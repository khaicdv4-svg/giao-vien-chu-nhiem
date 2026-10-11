const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
exports.BASE = BASE;
exports.open = async function (opts = {}) {
  const browser = await chromium.launch({ args: opts.args || [] });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, permissions: opts.permissions || [], serviceWorkers: opts.blockSW ? 'block' : 'allow' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push('console.error: ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  page.on('response', r => { if (r.status() >= 400 && !/vendor\/mediapipe/.test(r.url())) logs.push('HTTP ' + r.status() + ' ' + r.url()); });
  page.on('dialog', d => { logs.push('DIALOG ' + d.type() + ': ' + d.message().slice(0, 200)); (opts.acceptDialogs === false ? d.dismiss() : d.accept()).catch(() => {}); });
  if (opts.beforeLoad) await opts.beforeLoad(page, ctx);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.audioDB && Array.isArray(window.questionBankSets) && window.questionBankSets.length > 0, null, { timeout: 10000 });
  if (opts.demo !== false) await page.waitForFunction(() => window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 10000 });
  return { browser, ctx, page, logs };
};
exports.importFile = async function (page, file) {
  await page.evaluate(() => openView('questions'));
  await page.waitForSelector('#questions [data-kho-add]');
  await page.click('#questions [data-kho-add]');
  await page.waitForSelector('#qbStage7Modal');
  await page.click('#qbStage7Modal [data-source="file"]');
  await page.setInputFiles('#q7File', file);
  await page.click('#q7ReadFile');
  await page.waitForFunction(() => { const s = document.querySelector('#q7Summary'); const st = document.querySelector('#q7Status'); return (s && /Nhận \d+/.test(s.textContent)) || (st && st.className === 'bad'); }, null, { timeout: 8000 });
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#q7Preview tr[data-q7-row]')).map(r => ({ text: r.querySelector('[data-field="text"]').value, kind: r.querySelector('[data-field="kind"]').value, key: r.querySelector('[data-field="key"]').value, grade: r.querySelector('[data-meta="grade"]').value, subject: r.querySelector('[data-meta="subject"]').value, status: r.querySelector('td:nth-child(5)').textContent.trim(), picked: r.querySelector('[data-pick]').checked }));
    return { summary: document.querySelector('#q7Summary').textContent, status: document.querySelector('#q7Status').textContent, gradeSel: document.querySelector('#q7Grade').value, year: document.querySelector('#q7Year').value, rows };
  });
};
exports.saveSet = async function (page, file) { const r = await exports.importFile(page, file); await page.click('#q7Save'); await page.waitForFunction(() => !document.getElementById('qbStage7Modal')); await page.waitForTimeout(300); const id = await page.evaluate(() => questionBankSets.filter(s => /^q7-set/.test(s.id)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0].id); return { id, r }; };
exports.play = async function (page, setId, g) { await page.evaluate(() => openView('questions')); await page.waitForTimeout(150); await page.click('#questions [data-kho-play="' + setId + '"]'); await page.waitForSelector('#khoModal'); const b = await page.$('#khoModal [data-kho-start="' + g + '"]'); if (await b.isDisabled()) return { locked: true, text: (await b.innerText()).replace(/\n+/g, ' | ') }; await b.click(); await page.waitForTimeout(1300); return { locked: false }; };
