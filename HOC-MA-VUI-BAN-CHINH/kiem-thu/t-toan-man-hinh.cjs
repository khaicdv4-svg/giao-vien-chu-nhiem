const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 200) : '')); };
const state = page => page.evaluate(() => { const btns = Array.from(document.querySelectorAll('#games .hmv-full-btn, #games button[onclick$="Fullscreen()"]')).filter(b => b.offsetWidth); const b = btns[0] ? btns[0].getBoundingClientRect() : null; return { n: btns.length, label: btns[0] ? btns[0].textContent : '', inView: !!b && b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, fs: !!document.fullscreenElement, fsEl: document.fullscreenElement ? document.fullscreenElement.tagName : '', cls: document.body.classList.contains('hmv-game-full'), sidebar: !!document.querySelector('.sidebar').offsetWidth, topbar: !!document.querySelector('.main > .topbar').offsetHeight, gamesW: document.getElementById('games').offsetWidth, vw: innerWidth, type: window.classroomGame && classroomGame.type }; });
const clickFull = async page => { await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#games .hmv-full-btn, #games button[onclick$="Fullscreen()"]'); await page.waitForTimeout(600); };
(async () => {
  const vp = { width: 1366, height: 768 };
  const { browser, page, logs } = await lib.open({ viewport: vp });
  const names = { tug: 'Kéo co kiến thức', gift: 'Hộp quà bí mật', buzzer: 'Ai nhanh hơn', millionaire: 'Chinh phục tri thức', balloon: 'Bóng bay tri thức', 'head-tilt': 'Quiz Nghiêng Đầu', race: 'Đường đua kiến thức', lens: 'Ống kính may mắn' };
  // A. màn hình thiết lập của từng trò
  for (const t of Object.keys(names)) {
    await page.evaluate(t => { openView('games'); gameSetup(t); const m = document.getElementById('tiltSetupModal'); if (m) m.style.display = 'none'; }, t); await page.waitForTimeout(500);
    let s = await state(page);
    ok(`${names[t]} · thiết lập: có đúng 1 nút "Toàn màn hình"`, s.n === 1 && /Toàn màn hình/.test(s.label), { n: s.n, label: s.label });
    await clickFull(page); s = await state(page);
    ok(`${names[t]} · thiết lập: bấm → toàn màn hình, ẩn thanh bên và thanh chọn lớp, trò chơi rộng hết màn`, s.fs && s.cls && !s.sidebar && !s.topbar && s.gamesW > s.vw - 70 && /Thoát/.test(s.label) && s.inView, s);
    await clickFull(page); s = await state(page);
    ok(`${names[t]} · thiết lập: bấm lần nữa → trở lại bình thường`, !s.fs && !s.cls && s.sidebar && s.topbar && /Toàn màn hình/.test(s.label), { fs: s.fs, cls: s.cls, label: s.label });
    await page.evaluate(() => { const m = document.getElementById('tiltSetupModal'); if (m) m.remove(); if (typeof tiltBack === 'function' && classroomGame.type === 'head-tilt') tiltBack(); });
  }
  // B. đang chơi, vào từ Kho → Chơi ngay
  for (const t of ['tug', 'gift', 'buzzer', 'millionaire', 'balloon', 'race']) {
    const r = await lib.play(page, t === 'millionaire' ? 'mau-1-abcd' : 'mau-1-abcd', t); await page.waitForTimeout(500);
    let s = await state(page);
    ok(`${names[t]} · đang chơi: có đúng 1 nút "Toàn màn hình"`, !r.locked && s.type === t && s.n === 1, { locked: r.locked, type: s.type, n: s.n, label: s.label });
    if (s.n) { await clickFull(page); s = await state(page);
      ok(`${names[t]} · đang chơi: toàn màn hình hoạt động`, s.fs && s.fsEl === 'HTML' && s.cls && !s.sidebar && s.gamesW > s.vw - 70 && /Thoát/.test(s.label), s);
      await page.screenshot({ path: `${__dirname}/full-play-${t}.png` });
      if (t === 'tug') {
        // chơi tiếp trong toàn màn hình: nút vẫn còn sau khi trò vẽ lại; thông báo vẫn hiện
        const q = await page.evaluate(() => { const m = hmvTugState().match; return hmvC6QuestionsForGame('tug')[m.order[m.q]].correct; });
        await page.click(`.tug-answers button >> nth=${q}`); await page.waitForTimeout(400); s = await state(page);
        ok('Kéo co · toàn màn hình: trả lời xong (màn hình vẽ lại) vẫn ở toàn màn hình, nút vẫn là "Thoát"', s.fs && s.cls && s.n === 1 && /Thoát/.test(s.label), s);
        const fit = await page.evaluate(() => { const r = document.querySelector('.tug-controls').getBoundingClientRect(); return Math.round(r.bottom) <= innerHeight; });
        ok('Kéo co · toàn màn hình 1366×768: câu hỏi, 4 đáp án và hàng nút nằm trọn một màn hình', fit);
        await page.evaluate(() => showToast('Thử thông báo')); await page.waitForTimeout(200);
        ok('Toàn màn hình: thông báo (toast) vẫn hiện được', await page.evaluate(() => { const t = document.getElementById('toast'); const b = t.getBoundingClientRect(); return b.width > 0 && getComputedStyle(t).opacity !== '0' && b.top < innerHeight; }));
      }
      // thoát kiểu phím Esc của trình duyệt (trình duyệt tự thoát fullscreen)
      await page.evaluate(() => document.exitFullscreen()); await page.waitForTimeout(500); s = await state(page);
      ok(`${names[t]} · nhấn Esc (trình duyệt thoát fullscreen) → bố cục trở lại bình thường`, !s.fs && !s.cls && s.sidebar && /Toàn màn hình/.test(s.label), { fs: s.fs, cls: s.cls, label: s.label });
    }
  }
  // C. Quiz Nghiêng Đầu: hộp thiết lập vẫn hiện khi đang toàn màn hình
  await lib.play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal');
  await page.evaluate(() => Array.from(document.querySelectorAll('#tiltSetupModal button')).find(b => /Bắt đầu/.test(b.textContent)).click()); await page.waitForTimeout(600);
  let s = await state(page); ok('Quiz Nghiêng Đầu · đang chơi: có đúng 1 nút "Toàn màn hình"', s.n === 1, s);
  await clickFull(page); s = await state(page); ok('Quiz Nghiêng Đầu · đang chơi: toàn màn hình hoạt động', s.fs && s.cls && !s.sidebar, s);
  await page.screenshot({ path: `${__dirname}/full-play-head-tilt.png` });
  await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(b => /Thiết lập/.test(b.textContent)).click()); await page.waitForTimeout(400);
  ok('Quiz · toàn màn hình: hộp Thiết lập vẫn mở và nhìn thấy được', await page.evaluate(() => { const m = document.getElementById('tiltSetupModal'); if (!m) return false; const b = m.getBoundingClientRect(); return b.width > 300 && b.height > 200 && document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#tiltSetupModal') === m; }));
  await page.evaluate(() => { const m = document.getElementById('tiltSetupModal'); if (m) m.remove(); });
  // D. rời trò chơi khi đang toàn màn hình
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(b => b.textContent.trim() === 'Thoát').click()); await page.waitForTimeout(600);
  s = await state(page); ok('Thoát trò chơi về thư viện khi đang toàn màn hình → tự trở lại bình thường (thanh bên hiện lại)', !s.cls && !s.fs && s.sidebar, s);
  await lib.play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(400); await clickFull(page);
  await page.evaluate(() => openView('home')); await page.waitForTimeout(500); s = await state(page);
  ok('Chuyển sang màn hình khác khi đang toàn màn hình → tự trở lại bình thường', !s.cls && !s.fs && s.sidebar);
  // E. Vòng quay không bị ảnh hưởng
  await page.evaluate(() => openView('picker')); await page.waitForTimeout(900); await page.click('#picker .picker-fullscreen'); await page.waitForTimeout(700);
  ok('Vòng quay: toàn màn hình riêng vẫn hoạt động, không dính chế độ của trò chơi', await page.evaluate(() => document.fullscreenElement && document.fullscreenElement.id === 'picker' && !document.body.classList.contains('hmv-game-full')));
  await page.evaluate(() => document.exitFullscreen()); await page.waitForTimeout(300);
  const errs = logs.filter(l => !/^DIALOG/.test(l)); ok('Không có lỗi JavaScript', errs.length === 0, errs.slice(0, 4));
  fs.writeFileSync(__dirname + '/toan-man-hinh-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
