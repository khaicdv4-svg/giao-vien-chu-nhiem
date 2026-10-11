const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 210) : '')); };
const mu = p => p.evaluate(() => window.hmvMusic.state());
const view = p => p.evaluate(() => document.querySelector('.view.active').id);
(async () => {
  // ===== Trang chủ =====
  for (const vp of [{ width: 1774, height: 934 }, { width: 1366, height: 768 }]) {
    const T = `[${vp.width}×${vp.height}] `;
    const { browser, page, logs } = await lib.open({ viewport: vp, args: ['--autoplay-policy=document-user-activation-required'] });
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => { const d = document.getElementById('dashboard'); const vis = e => !!(e && (e.offsetWidth || e.offsetHeight)); const tiles = Array.from(d.querySelectorAll('.th-tile')); const r = e => e.getBoundingClientRect(); return { old: ['.hero', '.cards', '.grid'].map(s => vis(d.querySelector(':scope>' + s))), big: d.querySelectorAll('.th-tile.big').length, small: d.querySelectorAll('.th-tile.small').length, svgs: d.querySelectorAll('#thHome svg').length, glyphs: /[♟♜♧▤◉✦★]/.test(document.getElementById('thHome').innerText), students: document.getElementById('thStudents').textContent, real: document.getElementById('statStudents').textContent, sets: document.getElementById('thSets').textContent, qs: document.getElementById('thQuestions').textContent, bank: questionBankSets.length, bankQ: questionBankSets.reduce((a, s) => a + s.questions.length, 0), cls: document.getElementById('thClassName').textContent, overflowX: document.documentElement.scrollWidth > innerWidth + 1, textOverIcon: Array.from(d.querySelectorAll('.th-tile.big')).some(t => { const a = r(t.querySelector('.th-art')), c = r(t.querySelector('.th-copy b')); return c.top < a.bottom - 2 && c.left < a.right && c.right > a.left; }), clipped: tiles.some(t => t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) }; });
    ok(T + 'Trang chủ: khối cũ (dải tiêu đề lặp, thẻ số liệu, "Truy cập nhanh") đã ẩn; có 3 ô lớn + 4 ô nhỏ mới', h.old.every(x => !x) && h.big === 3 && h.small === 4, { old: h.old, big: h.big, small: h.small });
    ok(T + 'Biểu tượng là hình vẽ SVG riêng (12 chỗ dùng, 11 hình), không còn ký hiệu cờ vua/ký tự có sẵn', h.svgs === 12 && !h.glyphs, { svgs: h.svgs, glyphs: h.glyphs });
    ok(T + 'Số liệu đúng với dữ liệu thật: học sinh, số bộ và số câu trong Kho, tên lớp', h.students === h.real && Number(h.sets) === h.bank && Number(h.qs) === h.bankQ && /Lớp/.test(h.cls), { students: h.students, sets: h.sets, qs: h.qs, cls: h.cls });
    ok(T + 'Chữ không đè lên hình, không ô nào bị cắt chữ, không tràn ngang', !h.textOverIcon && !h.clipped && !h.overflowX, { textOverIcon: h.textOverIcon, clipped: h.clipped, overflowX: h.overflowX });
    if (vp.width === 1774) { const fit = await page.evaluate(() => Math.round(document.getElementById('thHome').getBoundingClientRect().bottom)); ok(T + 'Màn hình của thầy (1774×934): toàn bộ trang chủ nằm trong một màn hình', fit <= 934 + 2, { bottom: fit }); }
    const goes = [['.th-wheel', 'picker'], ['.th-games', 'games'], ['.th-groups', 'groups'], ['.th-bank', 'questions'], ['.th-trophy', 'scores'], ['.th-ai', 'ai']];
    const got = []; for (const [sel, want] of goes) { await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(120); await page.click('#thHome ' + sel); await page.waitForTimeout(250); got.push(await view(page) === want ? 'ok' : sel + '→' + await view(page)); }
    ok(T + '6 ô mở đúng màn hình: Vòng quay, Trò chơi, Chia nhóm, Kho câu hỏi, Thi đua, AI tạo câu hỏi', got.every(x => x === 'ok'), got);
    await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(120); await page.click('#thHome .th-music'); await page.waitForTimeout(500);
    ok(T + 'Ô "Nốt nhạc vui" mở hoạt động Nốt nhạc vui', await page.isVisible('#windActivityOverlay'));
    await page.evaluate(() => { const c = document.querySelector('#windActivityOverlay [data-wind-close]'); if (c) c.click(); }); await page.waitForTimeout(400);
    await page.evaluate(() => { const o = document.getElementById('windActivityOverlay'); if (o) o.remove(); openView('dashboard'); }); await page.waitForTimeout(200);
    await page.click('#thHome .th-row >> nth=0'); await page.waitForTimeout(400);
    ok(T + '"Chơi" ở Bóng bay tri thức → mở màn thiết lập trò chơi', await view(page) === 'games' && await page.isVisible('#bbSetup'));
    await page.evaluate(() => { balloonBack(); openView('dashboard'); }); await page.waitForTimeout(200); await page.click('#thHome .th-row >> nth=1'); await page.waitForTimeout(500);
    ok(T + '"Chơi" ở Quiz Nghiêng Đầu → mở thiết lập Quiz', await view(page) === 'games' && await page.evaluate(() => classroomGame.type === 'head-tilt' && !!document.getElementById('tiltSetupModal')));
    await page.evaluate(() => { const m = document.getElementById('tiltSetupModal'); if (m) m.remove(); tiltBack(); openView('dashboard'); });
    // đổi lớp → số học sinh cập nhật
    const errs = logs.filter(l => !/^DIALOG/.test(l)); ok(T + 'Trang chủ: không có lỗi JavaScript', errs.length === 0, errs.slice(0, 3));
    await browser.close();
  }
  // ===== Nhạc nền các trò còn thiếu =====
  { const { browser, page, logs } = await lib.open({ viewport: { width: 1366, height: 768 }, args: ['--autoplay-policy=document-user-activation-required'] });
    ok('Chưa vào trò nào: nhạc không phát', !(await mu(page)).playing);
    // Hộp quà bí mật
    await lib.play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(1300); let m = await mu(page);
    ok('Hộp quà bí mật: nhạc nền phát khi vào trận, đúng bản "Bốc thăm trúng thưởng", lặp đoạn 0,015 s → 12,015 s', m.playing && m.track === 'boc-tham' && m.loop && Math.abs(m.loop[0] - 0.015) < 1e-6 && Math.abs(m.loop[1] - 12.015) < 1e-6, m);
    ok('Hộp quà bí mật: có nút "🎵 Nhạc nền: Bật" trên màn chơi', /Nhạc nền: Bật/.test(await page.innerText('#games .hmv-music-btn')));
    const t1 = m.time; await page.waitForTimeout(900); m = await mu(page); ok('Hộp quà bí mật: đồng hồ âm thanh đang chạy', m.time - t1 > 0.6, { dt: +(m.time - t1).toFixed(2) });
    await page.evaluate(() => giftPause()); await page.waitForTimeout(700); m = await mu(page); ok('Hộp quà bí mật: Tạm dừng → nhạc ngưng', !m.playing, m.ctx);
    await page.evaluate(() => giftPause()); await page.waitForTimeout(700); m = await mu(page); ok('Hộp quà bí mật: Tiếp tục → nhạc phát lại', m.playing);
    await page.click('#games .hmv-music-btn'); await page.waitForTimeout(300); m = await mu(page); ok('Nút "Nhạc nền" tắt nhạc và ghi nhớ', !m.playing && /Tắt/.test(await page.innerText('#games .hmv-music-btn')) && await page.evaluate(() => hmvMusic.isOn('gift') === false));
    await page.click('#games .hmv-music-btn'); await page.waitForTimeout(700); m = await mu(page); ok('Nút "Nhạc nền" bật lại nhạc', m.playing && await page.evaluate(() => hmvMusic.isOn('gift')));
    await page.evaluate(() => openView('home')); await page.waitForTimeout(700); m = await mu(page); ok('Rời màn hình trò chơi → nhạc ngưng', !m.playing);
    await page.evaluate(() => openView('games')); await page.waitForTimeout(800); m = await mu(page); ok('Quay lại → nhạc phát tiếp', m.playing);
    await page.evaluate(() => giftEnd()); await page.waitForTimeout(800); m = await mu(page); ok('Hộp quà bí mật: kết thúc trò chơi → nhạc tắt', !m.playing && await page.evaluate(() => !!document.querySelector('.gift-result')), { playing: m.playing });
    await page.evaluate(() => giftBack()); await page.waitForTimeout(400);
    // Chinh phục tri thức
    await lib.play(page, 'mau-1-abcd', 'millionaire'); await page.waitForTimeout(1300); m = await mu(page);
    ok('Chinh phục tri thức: nhạc nền phát khi đang chơi (bản "Bốc thăm trúng thưởng"), có nút Nhạc nền', m.playing && m.track === 'boc-tham' && await page.isVisible('#games .hmv-music-btn'), m);
    await page.evaluate(() => millionaireFinish(false)); await page.waitForTimeout(800); m = await mu(page); ok('Chinh phục tri thức: kết thúc lượt chơi → nhạc tắt', !m.playing);
    await page.evaluate(() => gameBack()); await page.waitForTimeout(500); m = await mu(page); ok('Về thư viện → nhạc tắt hẳn', !m.playing && m.track === '');
    // Quiz Nghiêng Đầu
    await lib.play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); m = await mu(page); ok('Quiz Nghiêng Đầu: đang ở hộp thiết lập thì chưa phát nhạc', !m.playing);
    await page.evaluate(() => Array.from(document.querySelectorAll('#tiltSetupModal button')).find(b => /Bắt đầu/.test(b.textContent)).click()); await page.waitForTimeout(1500); m = await mu(page);
    ok('Quiz Nghiêng Đầu: bắt đầu → nhạc phát bản "Vui vẻ nghịch ngợm", lặp đoạn 1,015 s → 17,015 s (bỏ 1 giây im lặng đầu tệp)', m.playing && m.track === 'nghich-ngom' && m.loop && Math.abs(m.loop[0] - 1.015) < 1e-6 && Math.abs(m.loop[1] - 17.015) < 1e-6, m);
    await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(b => b.textContent.trim() === 'Thoát').click()); await page.waitForTimeout(600); m = await mu(page); ok('Quiz Nghiêng Đầu: Thoát → nhạc tắt', !m.playing);
    // hai trò đã có nhạc riêng không bị phát chồng
    await lib.play(page, 'mau-1-abcd', 'tug'); await page.waitForTimeout(900); m = await mu(page); const tug = await page.evaluate(() => hmvTugState().musicOn);
    ok('Kéo co (đã có nhạc riêng): chỉ nhạc của Kéo co phát, không phát chồng bản khác', tug && !m.playing, { tug, shared: m.playing });
    await page.evaluate(() => tugBack());
    await lib.play(page, 'mau-1-abcd', 'buzzer'); await page.waitForTimeout(1200); m = await mu(page); const bz = await page.evaluate(() => hmvBuzzState().music.playing);
    ok('Ai nhanh hơn (đã có nhạc riêng): không phát chồng', bz && !m.playing, { buzzer: bz, shared: m.playing });
    await page.evaluate(() => buzzBack());
    // chỗ nối khi phát lặp: không còn khoảng lặng
    const loop = await page.evaluate(async () => {
      const out = {};
      for (const id of ['boc-tham', 'nghich-ngom']) { const t = hmvMusic.tracks[id]; const ab = await fetch(t.url).then(r => r.arrayBuffer()); const buf = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(ab);
        const run = async region => { const sr = 44100, off = new OfflineAudioContext(1, sr * 45, sr), src = off.createBufferSource(); src.buffer = buf; src.loop = true; if (region) { src.loopStart = t.loop[0]; src.loopEnd = t.loop[1]; } src.connect(off.destination); src.start(0, region ? t.start : 0); const d = (await off.startRendering()).getChannelData(0); const w = sr / 20; let run = 0, worst = 0; for (let i = 0; i + w <= d.length; i += w) { let e = 0; for (let j = 0; j < w; j++) e += d[i + j] * d[i + j]; const db = 10 * Math.log10(e / w + 1e-12); if (db < -45) { run++; worst = Math.max(worst, run); } else run = 0; } return +(worst * 0.05).toFixed(2); };
        out[id] = { seconds: +buf.duration.toFixed(2), longestSilenceWithLoopRegion: await run(true), longestSilenceWholeFile: await run(false) }; }
      return out; });
    ok('Phát lặp 45 giây theo đoạn đã chọn: hai bản mới không có khoảng lặng nào (phát lặp cả tệp thì hở ≥ 0,6 giây mỗi vòng)', Object.values(loop).every(x => x.longestSilenceWithLoopRegion <= 0.1 && x.longestSilenceWholeFile >= 0.6), loop);
    const errs = logs.filter(l => !/^DIALOG/.test(l)); ok('Nhạc nền: không có lỗi JavaScript / tải tệp', errs.length === 0, errs.slice(0, 4));
    await browser.close(); }
  fs.writeFileSync(__dirname + '/trang-chu-nhac-nen-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
