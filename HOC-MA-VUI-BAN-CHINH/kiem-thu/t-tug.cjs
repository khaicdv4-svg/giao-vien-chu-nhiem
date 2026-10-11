const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 220) : '')); };
const st = p => p.evaluate(() => window.hmvTugState());
const setS = (p, patch) => p.evaluate(patch => { const cur = JSON.parse(localStorage.getItem('tk_tug_settings') || '{}'); localStorage.setItem('tk_tug_settings', JSON.stringify(Object.assign({ v: 2 }, cur, patch))); }, patch);
(async () => {
  const { browser, page, logs } = await lib.open({ args: ['--autoplay-policy=document-user-activation-required'] });
  // 0. mặc định mới
  let s = await st(page);
  ok('Mặc định: tự chấm, nhạc nền, tiếng hiệu ứng đều bật', s.settings.auto === true && s.settings.music === true && s.settings.sound === true && s.settings.autoDelay === 3, s.settings);
  // 1. Chơi ngay từ Kho
  let r = await lib.play(page, 'mau-1-abcd', 'tug');
  s = await st(page);
  ok('Kho → Chơi ngay → Kéo co: vào thẳng trận', !r.locked && s.match && s.match.phase === 'playing' && await page.isVisible('.tug-game .tug-answers button'), { phase: s.match && s.match.phase, order: s.match && s.match.order.length });
  ok('Nhạc nền đang phát khi vào trận', s.musicOn, s.musicSrc.slice(0, 60));
  const mus = await page.evaluate(() => new Promise(res => setTimeout(() => { const a = window.hmvTugState(); res(a.musicOn); }, 600)));
  ok('Nhạc nền vẫn phát sau 0,6 giây', mus);
  await page.screenshot({ path: __dirname + '/tug-1-play.png' });
  // 2. chọn đáp án đúng → tự chấm
  const info = () => page.evaluate(() => { const s = window.hmvTugState().m; return null; });
  const cur = async () => { const z = await st(page); const q = await page.evaluate(() => { const m = window.hmvTugState().match; const list = window.hmvC6QuestionsForGame('tug'); return list[m.order[m.q]]; }); return { m: z.match, q }; };
  let c = await cur(); const q0 = c.m.q, team0 = c.m.current;
  await page.click(`.tug-answers button >> nth=${c.q.correct}`);
  let a = await cur();
  ok('Chọn đáp án đúng → tự chấm đúng ngay (không cần bấm xác nhận)', a.m.answered && a.m.outcome.ok && a.m.score[team0] === 1 && a.m.pos === (team0 === 0 ? -1 : 1), { answered: a.m.answered, outcome: a.m.outcome, pos: a.m.pos });
  ok('Đáp án đúng được tô xanh, có thông báo Chính xác', await page.evaluate(i => document.querySelectorAll('.tug-answers button')[i].classList.contains('correct'), c.q.correct) && /Chính xác/.test(await page.innerText('.tug-feedback')), await page.innerText('.tug-feedback'));
  ok('Không còn nút Xác nhận đúng/sai khi tự chấm', !(await page.$('.tug-controls button:has-text("✓ Đúng")')));
  ok('Hiện đếm ngược tự chuyển câu', await page.isVisible('#tugAuto'), await page.innerText('.tug-auto'));
  await page.screenshot({ path: __dirname + '/tug-2-correct.png' });
  await page.waitForFunction(q => window.hmvTugState().match.q === q + 1, q0, { timeout: 6000 });
  a = await cur();
  ok('Sau ~3 giây tự chuyển sang câu tiếp theo, đổi lượt đội', a.m.q === q0 + 1 && !a.m.answered && a.m.current === 1 - team0 && a.m.selected === null, { q: a.m.q, current: a.m.current });
  ok('Đồng hồ câu mới được đặt lại đủ thời gian', a.m.qLeft > 28 && a.m.qLeft <= 30, a.m.qLeft);
  // 3. chọn sai → tự chấm sai, hiện đáp án đúng, tự chuyển
  c = await cur(); const wrong = (c.q.correct + 1) % c.q.answers.length; const posB = c.m.pos;
  await page.click(`.tug-answers button >> nth=${wrong}`);
  a = await cur();
  const fb = await page.innerText('.tug-feedback');
  ok('Chọn đáp án sai → tự chấm sai, dây không dịch chuyển', a.m.answered && a.m.outcome.ok === false && a.m.pos === posB, a.m.outcome);
  ok('Báo Chưa đúng kèm đáp án đúng; tô đỏ câu chọn, tô xanh đáp án đúng', /Chưa đúng/.test(fb) && /Đáp án đúng/.test(fb) && await page.evaluate(([w, k]) => { const b = document.querySelectorAll('.tug-answers button'); return b[w].classList.contains('wrong') && b[k].classList.contains('correct'); }, [wrong, c.q.correct]), fb);
  await page.screenshot({ path: __dirname + '/tug-3-wrong.png' });
  // bấm "Câu tiếp theo" để chuyển ngay, không cần chờ
  const qB = a.m.q; await page.click('#tugNextBtn'); a = await cur();
  ok('Nút "Câu tiếp theo" chuyển ngay không cần chờ', a.m.q === qB + 1 && !a.m.answered);
  // 4. phím tắt: phím số chọn đáp án
  c = await cur(); await page.keyboard.press(String(c.q.correct + 1)); a = await cur();
  ok('Phím số 1–4 chọn đáp án và tự chấm', a.m.answered && a.m.outcome.ok);
  await page.keyboard.press('Enter'); a = await cur();
  ok('Phím Enter sang câu tiếp theo', !a.m.answered && a.m.q === c.m.q + 1);
  // 5. tạm dừng: đồng hồ và nhạc dừng
  await page.keyboard.press(' '); await page.waitForTimeout(400); const p1 = await st(page); await page.waitForTimeout(1200); const p2 = await st(page);
  ok('Tạm dừng: đồng hồ đứng yên, nhạc tạm dừng', p1.match.paused && Math.abs(p1.match.qLeft - p2.match.qLeft) < 0.01 && !p2.musicOn, { q1: p1.match.qLeft, q2: p2.match.qLeft, music: p2.musicOn });
  await page.keyboard.press(' '); await page.waitForTimeout(500); const p3 = await st(page);
  ok('Tiếp tục: đồng hồ chạy lại, nhạc phát lại', !p3.match.paused && p3.match.qLeft < p2.match.qLeft && p3.musicOn, { q: p3.match.qLeft, music: p3.musicOn });
  // 6. nút bật/tắt nhạc
  await page.click('#tugMusicToggle'); await page.waitForTimeout(300); let m1 = await st(page);
  ok('Nút "Nhạc nền" tắt nhạc', !m1.musicOn && m1.settings.music === false && /Tắt/.test(await page.innerText('#tugMusicToggle')));
  await page.click('#tugMusicToggle'); await page.waitForTimeout(300); m1 = await st(page);
  ok('Nút "Nhạc nền" bật lại nhạc', m1.musicOn && m1.settings.music === true);
  // 7. rời màn hình trò chơi → nhạc và đồng hồ dừng; quay lại chạy tiếp
  await page.evaluate(() => openView('home')); await page.waitForTimeout(500); const h1 = await st(page); await page.waitForTimeout(1000); const h2 = await st(page);
  ok('Rời màn hình Hoạt động: nhạc dừng, đồng hồ không trôi', !h2.musicOn && Math.abs(h1.match.qLeft - h2.match.qLeft) < 0.01, { m: h2.musicOn, q1: h1.match.qLeft, q2: h2.match.qLeft });
  await page.evaluate(() => openView('games')); await page.waitForTimeout(500); const h3 = await st(page);
  ok('Quay lại Hoạt động: nhạc phát lại', h3.musicOn);
  // 8. thắng trận: trả lời đúng liên tục cho tới khi một đội thắng
  for (let i = 0; i < 20; i++) { c = await cur(); if (c.m.phase !== 'playing') break; if (c.m.answered) { await page.click('#tugNextBtn'); continue; } const lead = c.m.pos <= 0 ? 0 : 1; /* đội 0 trả lời đúng, đội 1 trả lời sai */ const pick = c.m.current === 0 ? c.q.correct : (c.q.correct + 1) % c.q.answers.length; await page.click(`.tug-answers button >> nth=${pick}`); }
  a = await cur(); await page.waitForTimeout(300); const w = await st(page);
  ok('Một đội kéo đủ số bước → thắng trận, hiện bảng chiến thắng', a.m.phase === 'won' && await page.isVisible('.tug-winner') && /CHIẾN THẮNG/.test(await page.innerText('.tug-winner')), (await page.innerText('.tug-winner')).replace(/\n+/g, ' | '));
  ok('Thắng trận: nhạc nền dừng', !w.musicOn);
  await page.screenshot({ path: __dirname + '/tug-4-win.png' });
  // 9. Chơi lại
  await page.click('.tug-winner button:has-text("Chơi lại")'); await page.waitForTimeout(300); a = await cur();
  ok('Chơi lại: trận mới, điểm về 0, nhạc phát', a.m.phase === 'playing' && a.m.pos === 0 && a.m.q === 0 && (await st(page)).musicOn);
  // 10. hết giờ → tự chấm sai và tự chuyển
  await page.evaluate(() => tugBack());
  await setS(page, { time: 10, autoDelay: 2 }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  await lib.play(page, 'mau-2-dung-sai', 'tug'); c = await cur();
  ok('Bộ Đúng/Sai chơi được Kéo co (2 phương án)', c.m.phase === 'playing' && c.q.answers.length === 2 && (await page.$$('.tug-answers button')).length === 2, c.q.answers);
  ok('Thời gian mỗi câu theo thiết lập (10 giây)', c.m.qLeft > 8.5 && c.m.qLeft <= 10, c.m.qLeft);
  await page.waitForFunction(() => { const m = window.hmvTugState().match; return m.answered; }, null, { timeout: 13000 }); a = await cur();
  ok('Hết giờ → tự chấm sai, báo Hết giờ', a.m.outcome.ok === false && a.m.outcome.reason === 'timeout' && /Hết giờ/.test(await page.innerText('.tug-feedback')), await page.innerText('.tug-feedback'));
  await page.waitForFunction(() => window.hmvTugState().match.q === 1, null, { timeout: 5000 });
  ok('Hết giờ xong tự chuyển câu sau 2 giây (theo thiết lập)', true);
  c = await cur(); await page.click(`.tug-answers button >> nth=${c.q.correct}`); a = await cur();
  ok('Đúng/Sai: chọn đúng → tự chấm đúng', a.m.outcome.ok);
  // 11. câu hỏi mở: giáo viên chấm, vẫn tự chuyển câu
  await page.evaluate(() => tugBack()); await setS(page, { time: 30, autoDelay: 2 }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  r = await lib.play(page, 'mau-7-cau-hoi-mo', 'tug'); c = await cur();
  ok('Bộ câu hỏi mở: hiện nút ✓ Đúng / ✗ Sai cho giáo viên', !r.locked && await page.isVisible('.tug-controls button:has-text("✓ Đúng")') && await page.isVisible('.tug-controls button:has-text("✗ Sai")'), await page.innerText('.tug-feedback'));
  await page.click('.tug-controls button:has-text("Hiện đáp án")'); const sug = await page.innerText('.tug-feedback');
  ok('Câu hỏi mở: "Hiện đáp án" cho xem đáp án gợi ý', /Đáp án gợi ý/.test(sug), sug.slice(0, 120));
  await page.click('.tug-controls button:has-text("✓ Đúng")'); a = await cur();
  ok('Giáo viên bấm Đúng → ghi điểm', a.m.answered && a.m.outcome.ok && a.m.score[0] === 1);
  await page.waitForFunction(() => window.hmvTugState().match.q === 1, null, { timeout: 5000 });
  ok('Câu hỏi mở: sau khi chấm cũng tự chuyển câu', true);
  // 12. hoàn tác
  c = await cur(); await page.click('.tug-controls button:has-text("✗ Sai")'); await page.click('.tug-controls button:has-text("Hoàn tác")'); a = await cur();
  ok('Hoàn tác lượt vừa chấm', !a.m.answered && a.m.q === c.m.q && a.m.autoLeft === null);
  // 13. chế độ giáo viên chấm tay
  await page.evaluate(() => tugBack()); await setS(page, { auto: false }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  await lib.play(page, 'mau-1-abcd', 'tug'); c = await cur(); await page.click(`.tug-answers button >> nth=${c.q.correct}`); a = await cur();
  ok('Chế độ "Giáo viên chấm tay": chọn đáp án chưa chấm ngay', !a.m.answered && a.m.selected === c.q.correct && await page.isVisible('.tug-controls button:has-text("✓ Đúng")'));
  await page.click('.tug-controls button:has-text("✓ Đúng")'); await page.waitForTimeout(2800); a = await cur();
  ok('Chấm tay: không tự chuyển câu', a.m.answered && a.m.q === c.m.q && a.m.autoLeft === null);
  // 14. "Đội bạn được trả lời" khi sai
  await page.evaluate(() => tugBack()); await setS(page, { auto: true, wrong: 'transfer', autoDelay: 2 }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  await lib.play(page, 'mau-1-abcd', 'tug'); c = await cur(); const wr = (c.q.correct + 1) % 4;
  await page.click(`.tug-answers button >> nth=${wr}`); a = await cur();
  ok('Sai + "Đội bạn được trả lời": cùng câu đó chuyển cho đội kia, khóa phương án đã chọn', !a.m.answered && a.m.q === c.m.q && a.m.current === 1 - c.m.current && await page.evaluate(i => document.querySelectorAll('.tug-answers button')[i].disabled, wr), await page.innerText('.tug-feedback'));
  await page.click(`.tug-answers button >> nth=${c.q.correct}`); a = await cur();
  ok('Đội bạn trả lời đúng → đội bạn được kéo', a.m.answered && a.m.outcome.ok && a.m.pos === 1 && a.m.score[1] === 1, { pos: a.m.pos, score: a.m.score });
  // 15. thiết lập: màn hình có đủ lựa chọn mới và lưu khi bắt đầu
  await page.evaluate(() => tugBack()); await page.evaluate(() => gameSetup('tug')); await page.waitForSelector('#tugAutoMode');
  ok('Màn hình thiết lập có Chấm điểm, Chờ chuyển câu, Nhạc nền, Âm lượng nhạc', await page.isVisible('#tugAutoMode') && await page.isVisible('#tugDelay') && await page.isVisible('#tugMusic') && await page.isVisible('#tugMusicVolume'));
  await page.selectOption('#tugDelay', '5'); await page.selectOption('#tugMusic', '0'); await page.click('button:has-text("Bắt đầu trận")'); await page.waitForTimeout(400); s = await st(page);
  ok('Bấm Bắt đầu trận tự lưu thiết lập đang chọn (không cần bấm Lưu)', s.settings.autoDelay === 5 && s.settings.music === false && s.match.phase === 'playing' && !s.musicOn, { d: s.settings.autoDelay, m: s.settings.music });
  await page.screenshot({ path: __dirname + '/tug-5-setup-play.png' });
  // 16. hết câu hỏi → phân thắng thua theo vị trí dây
  await page.evaluate(() => tugBack()); await setS(page, { wrong: 'stay', music: true, autoDelay: 2, winMoves: 20 }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  await lib.play(page, 'mau-2-dung-sai', 'tug');
  for (let i = 0; i < 60; i++) { c = await cur(); if (c.m.phase !== 'playing') break; if (c.m.answered) { await page.click('#tugNextBtn'); continue; } const pick = c.m.current === 1 ? c.q.correct : 1 - c.q.correct; await page.click(`.tug-answers button >> nth=${pick}`); }
  a = await cur();
  ok('Hết 20 câu: đội dẫn trước thắng, không bị treo màn hình', a.m.phase === 'won' && a.m.byPoints === true && /CHIẾN THẮNG/.test(await page.innerText('.tug-winner')), (await page.innerText('.tug-winner')).replace(/\n+/g, ' | '));
  // 17. tải lại giữa trận → hỏi tiếp tục
  await page.evaluate(() => tugBack()); await setS(page, { winMoves: 3 }); await page.reload(); await page.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
  await lib.play(page, 'mau-1-abcd', 'tug'); c = await cur(); await page.click(`.tug-answers button >> nth=${c.q.correct}`); await page.waitForTimeout(300);
  await page.reload(); await page.waitForTimeout(1500); // confirm tự accept
  s = await st(page);
  ok('Tải lại trang giữa trận: tiếp tục được trận đang lưu', s.match && s.match.phase === 'playing' && s.match.score[0] === 1 && await page.isVisible('.tug-game'), { phase: s.match && s.match.phase });
  await page.waitForFunction(() => window.hmvTugState().match.q === 1, null, { timeout: 6000 }).then(() => ok('Sau khi tải lại vẫn tự chuyển câu', true), () => ok('Sau khi tải lại vẫn tự chuyển câu', false));
  const errs = logs.filter(l => !/^DIALOG/.test(l));
  ok('Không có lỗi JavaScript / tải tệp trong suốt quá trình', errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(__dirname + '/tug-results.json', JSON.stringify({ at: new Date().toISOString(), build: await page.evaluate(() => document.title), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
