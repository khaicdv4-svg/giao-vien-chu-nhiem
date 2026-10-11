const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 200) : '')); };
const box = (page, s) => page.evaluate(s => { const e = document.querySelector(s); if (!e || !(e.offsetWidth || e.offsetHeight)) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; }, s);
const inView = (b, vp) => !!b && b.l >= 0 && b.t >= 0 && b.r <= vp.width && b.b <= vp.height;
const inside = (a, b) => !!a && !!b && a.l >= b.l - 1 && a.r <= b.r + 1 && a.t >= b.t - 1 && a.b <= b.b + 1;
(async () => {
  for (const vp of [{ width: 1366, height: 768 }, { width: 1657, height: 1000 }, { width: 1920, height: 1080 }]) {
    const T = `[${vp.width}×${vp.height}] `;
    const { browser, page, logs } = await lib.open({ viewport: vp });
    await page.click('button:has-text("Vòng quay kết nối")'); await page.waitForTimeout(1300);
    for (const fsMode of [false, true]) {
      const M = T + (fsMode ? 'Toàn màn hình: ' : 'Thường: ');
      if (fsMode) { await page.click('#picker .picker-fullscreen'); await page.waitForTimeout(900); }
      const side = await box(page, '#picker .picker-side'), wheel = await box(page, '#picker .picker-wheel-wrap'), stage = await box(page, '#picker .picker-stage');
      const ctl = {}; for (const [k, s] of Object.entries({ 'thẻ Gọi tên vui': '#phase1ModeBar [data-phase-mode="students"]', 'thẻ Nhiệm vụ bất ngờ': '#phase1ModeBar [data-phase-mode="tasks"]', 'nút Kho nhiệm vụ': '#phase1ModeBar [data-open-task-settings]', 'nút QUAY NGAY': '#spinButton', 'số học sinh': '#pickerRemaining', 'nút Âm thanh': '#audioGearButton', 'nút Toàn màn hình': '#picker .picker-fullscreen', 'Kết quả gần đây': '#pickHistory', 'nút Bắt đầu lượt mới': '#picker .picker-control-row .btn' })) ctl[k] = await box(page, s);
      const bad = Object.entries(ctl).filter(([k, b]) => !inside(b, side)).map(([k]) => k);
      ok(M + 'mọi thẻ và nút điều khiển nằm trong cột phải', bad.length === 0, bad.length ? 'ngoài cột: ' + bad.join(', ') : '9/9');
      const cut = Object.entries(ctl).filter(([k, b]) => !inView(b, vp)).map(([k]) => k);
      ok(M + 'không nút nào bị che/khuất khỏi màn hình', cut.length === 0, cut.length ? 'bị khuất: ' + cut.join(', ') : 'tất cả hiện đủ');
      ok(M + 'vòng quay tròn, nằm trọn trong màn hình và trong khung trái', inView(wheel, vp) && inside(wheel, stage) && Math.abs(wheel.w - wheel.h) <= 1 && wheel.r <= side.l, wheel);
      ok(M + 'vòng quay và cột phải không chồng lên nhau; không còn hàng tiêu đề/thẻ phía trên', stage.r <= side.l && !(await box(page, '#picker > .page-title')) && !(await box(page, '#picker .picker-top')), { stage: stage.r, side: side.l });
      ok(M + 'trang không phải cuộn dọc', await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), await page.evaluate(() => document.documentElement.scrollHeight));
      const sharp = await page.evaluate(() => { const c = document.getElementById('pickerCanvas'); return Math.abs(c.width - Math.round(c.clientWidth * devicePixelRatio)) <= 2; });
      ok(M + 'vòng quay vẽ lại đúng kích thước mới (không nhòe)', sharp);
    }
    // vẫn đang toàn màn hình: quay thật
    const before = await page.evaluate(() => document.querySelectorAll('#pickHistory .notice, #pickHistory > div:not(.empty)').length);
    await page.click('#spinButton'); await page.waitForTimeout(600);
    ok(T + 'Toàn màn hình: bấm QUAY NGAY (ở cột phải) → vòng quay chạy, nút tạm khóa', await page.evaluate(() => window.pickerSpinning === true || document.getElementById('spinButton').disabled));
    await page.waitForFunction(() => !document.getElementById('spinButton').disabled && !/Đang quay/.test(document.getElementById('pickResult').textContent), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${__dirname}/flow-${vp.width}-full-winner.png` });
    const hist = await page.evaluate(() => document.getElementById('pickHistory').innerText.replace(/\s+/g, ' ').slice(0, 120));
    ok(T + 'Toàn màn hình: quay xong có kết quả ở "Kết quả gần đây" (cột phải)', !/Chưa có lượt gọi/.test(hist) && hist.length > 3, hist);
    const win = await page.evaluate(() => { const els = Array.from(document.querySelectorAll('#picker *')).filter(e => /winner|result-card|pick-win/i.test(e.className && e.className.toString()) && (e.offsetWidth || e.offsetHeight)); return els.map(e => { const b = e.getBoundingClientRect(); return { c: e.className.toString().slice(0, 50), l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), text: e.innerText.replace(/\s+/g, ' ').slice(0, 60) }; }).slice(0, 4); });
    console.log('   winner elements:', JSON.stringify(win));
    ok(T + 'Toàn màn hình: thẻ người được chọn hiện trọn trong màn hình', win.length > 0 && win.every(w => w.l >= 0 && w.t >= 0 && w.r <= vp.width && w.b <= vp.height), win[0]);
    // đóng thẻ thắng (nếu có nút) rồi sang Nhiệm vụ bất ngờ
    await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(500);
    const stillFs = await page.evaluate(() => !!document.fullscreenElement);
    if (!stillFs) { await page.click('#picker .picker-fullscreen'); await page.waitForTimeout(700); }
    await page.evaluate(() => { if (typeof pickerDismissWinner === 'function') pickerDismissWinner(); }); await page.waitForTimeout(300);
    await page.click('#phase1ModeBar [data-phase-mode="tasks"]'); await page.waitForTimeout(700);
    const tasks = await page.evaluate(() => ({ active: document.querySelector('#phase1ModeBar .active').dataset.phaseMode, panel: (document.getElementById('phase1ModePanel').innerText || '').replace(/\s+/g, ' ').slice(0, 80), panelIn: !!document.getElementById('phase1ModePanel').closest('.picker-side'), count: document.getElementById('pickerRemaining').textContent }));
    ok(T + 'Chuyển thẻ "Nhiệm vụ bất ngờ" ngay trong cột phải; bảng kho nhiệm vụ cũng nằm ở cột phải', tasks.active === 'tasks' && tasks.panelIn && /nhiệm vụ/i.test(tasks.count + tasks.panel), tasks);
    await page.screenshot({ path: `${__dirname}/flow-${vp.width}-full-tasks.png` });
    const sp = await box(page, '#spinButton'); ok(T + 'Chế độ Nhiệm vụ: nút QUAY NGAY vẫn hiện trọn', inView(sp, vp), sp);
    await page.click('#phase1ModeBar [data-phase-mode="students"]'); await page.waitForTimeout(500);
    // âm thanh mở được khi toàn màn hình
    await page.click('#audioGearButton'); await page.waitForTimeout(600);
    const dlg = await box(page, '#audioSettingsDialog'); ok(T + 'Toàn màn hình: bấm "Âm thanh" mở hộp cài đặt, nằm trọn màn hình', inView(dlg, vp), dlg);
    await page.screenshot({ path: `${__dirname}/flow-${vp.width}-full-audio.png` });
    await page.evaluate(() => closeAudioSettings()); await page.waitForTimeout(300);
    await page.click('#picker .picker-fullscreen'); await page.waitForTimeout(800);
    const out = await page.evaluate(() => ({ fs: !!document.fullscreenElement, label: document.querySelector('#picker .picker-fullscreen').textContent, sideVisible: !!document.querySelector('#picker .picker-side').offsetWidth }));
    ok(T + 'Bấm nút lần nữa → thoát toàn màn hình, nhãn nút đổi lại, cột phải vẫn hiện', !out.fs && /Toàn màn hình/.test(out.label) && out.sideVisible, out);
    await page.screenshot({ path: `${__dirname}/flow-${vp.width}-normal-after.png` });
    // rời màn hình rồi quay lại
    await page.evaluate(() => openView('home')); await page.waitForTimeout(300); await page.evaluate(() => openView('picker')); await page.waitForTimeout(900);
    const again = await box(page, '#spinButton'), side2 = await box(page, '#picker .picker-side');
    ok(T + 'Rời sang Trang chủ rồi quay lại: bố cục giữ nguyên', inside(again, side2) && inView(again, vp));
    const errs = logs.filter(l => !/^DIALOG/.test(l)); ok(T + 'Không có lỗi JavaScript', errs.length === 0, errs.slice(0, 4));
    await browser.close();
  }
  fs.writeFileSync(__dirname + '/vong-quay-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
