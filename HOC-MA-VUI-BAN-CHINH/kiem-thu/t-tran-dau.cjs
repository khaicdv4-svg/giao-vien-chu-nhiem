// Kiểm thử bản 2.15: Luật trận đấu chung (số câu / thời gian trận / thời gian trả lời / thời gian hiện đáp án) + bộ câu hỏi demo tự liên kết từ Kho.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c }); console.log((c ? 'PASS ' : 'FAIL ') + n + (!c && d !== undefined ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const logs = [];
(async () => {
  const browser = await chromium.launch();
  const open = async (init) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
    page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); });
    page.on('dialog', d => d.accept().catch(() => {}));
    if (init) await page.addInitScript(init);
    await page.goto(BASE); await page.waitForFunction(() => window.hmvTran && typeof openView === 'function' && Array.isArray(window.questionBankSets) && window.questionBankSets.length >= 7, null, { timeout: 15000 }); await page.waitForTimeout(600);
    return { ctx, page };
  };
  const setup = (page, g) => page.evaluate(t => { openView('games'); if (classroomGame.type) { classroomGame.type = null; classroomGame.started = false; } renderGames(); gameSetup(t); }, g).then(() => page.waitForTimeout(500));
  const rules = (page, g, o) => page.evaluate(([t, o]) => { Object.keys(o).forEach(k => hmvTran.set(t, k, o[k])); }, [g, o]);
  let { ctx, page } = await open();

  // A. Thẻ Luật trận đấu có mặt ở mọi trò có câu hỏi
  const cards = {};
  for (const g of ['tug', 'buzzer', 'race', 'gift', 'tiles', 'millionaire', 'balloon', 'poll', 'magic-hand', 'raise-hand', 'paper-mode']) {
    await setup(page, g);
    cards[g] = await page.evaluate(() => { const c = document.querySelector('.hmv-td'); return c ? { game: c.dataset.tdGame, end: [...c.querySelectorAll('[data-td="end"] option')].map(o => o.value).join(','), labels: [...c.querySelectorAll('.hmv-td-grid > label')].filter(l => !l.hidden).map(l => l.firstChild.textContent.trim()), vis: c.offsetParent !== null } : null; });
  }
  ok('1 Thẻ "⏱ Luật trận đấu" hiện trong thiết lập của 11 trò có câu hỏi, có chọn kết thúc theo số câu / thời gian trận', Object.values(cards).every(c => c && c.vis && /count/.test(c.end) && /time/.test(c.end)), cards);
  ok('2 Ô sẵn có của trò được chuyển vào thẻ (Kéo co: Thời gian trả lời + Chờ trước khi chuyển câu; Bóng bay: Số câu + Thời gian mỗi câu), không bị nhân đôi', cards.tug.labels.includes('Thời gian trả lời') && cards.tug.labels.includes('Chờ trước khi chuyển câu') && cards.balloon.labels.includes('Số câu') && cards.balloon.labels.includes('Thời gian mỗi câu') && cards.millionaire.labels.includes('Thời gian trả lời mỗi câu') && cards.race.labels.includes('Hiện đáp án rồi chuyển câu sau'), cards);
  await setup(page, 'tug');
  const dup = await page.evaluate(() => ({ time: document.querySelectorAll('#tugTime').length, delay: document.querySelectorAll('#tugDelay').length, inCard: !!document.querySelector('.hmv-td #tugTime') }));
  ok('3 Ô #tugTime/#tugDelay chỉ có một, nằm trong thẻ', dup.time === 1 && dup.delay === 1 && dup.inCard, dup);
  await page.evaluate(() => openView('dashboard'));
  await page.evaluate(() => { const c = { ctx: null }; }); await page.evaluate(() => { openView('games'); classroomGame.type = null; renderGames(); });
  await page.evaluate(() => { const s = document.querySelector('[data-hmv-m]'); }); await page.waitForTimeout(100);
  ok('4 Thư viện trò chơi không còn thẻ Luật trận đấu', await page.evaluate(() => !document.querySelector('#games .hmv-td')));

  // B. Bộ câu hỏi demo trên máy mới
  await setup(page, 'tug');
  const demo = await page.evaluate(() => ({ info: hmvTran.info('tug'), n: hmvTugState && (document.querySelector('.tug-start-card') || {}).textContent, tag: !!document.querySelector('.hmv-td .hmv-td-tag'), legacy: (document.querySelector('.question-source-summary') || {}).textContent }));
  ok('5 Máy mới (Kho hiện tại chỉ 2 câu mẫu cũ): Kéo co tự dùng bộ "Mẫu 1 · A–B–C–D" 20 câu trong Kho, ghi rõ "Bộ demo · chơi ngay"; ô Nguồn câu hỏi cũ cũng ghi "Trận sẽ dùng: Mẫu 1…"', demo.info.auto && /Mẫu 1/.test(demo.info.name) && demo.info.n === 20 && /20 câu hỏi hợp lệ/.test(demo.n) && demo.tag && /Trận sẽ dùng: Mẫu 1/.test(demo.legacy), demo);
  const each = {};
  for (const g of ['buzzer', 'race', 'gift', 'tiles', 'millionaire', 'paper-mode']) { each[g] = await page.evaluate(t => { const i = hmvTran.info(t); return i.auto ? i.name.slice(0, 5) + ':' + i.n : 'no'; }, g); }
  each.mil = await page.evaluate(() => millionaireQuestionsList().length);
  ok('6 Ai nhanh hơn, Đường đua, Hộp quà, Lật mảnh ghép, Chinh phục tri thức, Chế độ giấy cũng có bộ demo 20 câu (Chinh phục lấy đủ 10 câu)', Object.keys(each).filter(k => k !== 'mil').every(k => each[k] === 'Mẫu 1:20') && each.mil === 10, each);
  await rules(page, 'tug', { src: 'own' }); await setup(page, 'tug');
  const own = await page.evaluate(() => hmvC6QuestionsForGame('tug'));
  await rules(page, 'tug', { src: 'auto' });
  ok('7 Chọn "Chỉ dùng câu hỏi của tôi" → không dùng bộ demo', own === null, own);

  // C. Kéo co: kết thúc theo số câu
  await rules(page, 'tug', { end: 'count', count: 5 }); await setup(page, 'tug');
  const note = await page.textContent('.hmv-td [data-td-note]');
  await page.evaluate(() => { document.getElementById('tugDelay').value = '2'; tugStart(); });
  await page.waitForTimeout(300);
  let st = await page.evaluate(() => hmvTugState().match);
  ok('8 Kéo co, "Khi chơi đủ số câu: 5" → trận có đúng 5 câu (Câu 1/5)', st.order.length === 5 && /Câu 1\/5/.test(await page.textContent('#games .page-title p')), { n: st.order.length, note });
  for (let i = 0; i < 6; i++) { const m = await page.evaluate(() => hmvTugState().match); if (m.phase !== 'playing') break; await page.evaluate(() => { const q = hmvTugState().match; tugJudge(true); }); await page.waitForTimeout(80); await page.evaluate(() => tugNext()); await page.waitForTimeout(80); }
  st = await page.evaluate(() => hmvTugState().match);
  const win1 = await page.evaluate(() => (document.querySelector('.tug-winner') || {}).textContent || '');
  ok('9 Chơi xong câu thứ 5 → trận kết thúc, màn hình ghi "Đã chơi đủ 5 câu"', st.phase !== 'playing' && st.q >= 5 - 1 && /Đã chơi đủ 5 câu/.test(win1), { phase: st.phase, q: st.q, win1 });
  // D. Kéo co: kết thúc theo thời gian trận
  await page.evaluate(() => tugBack()); await rules(page, 'tug', { end: 'time', minutes: 2 }); await setup(page, 'tug');
  await page.evaluate(() => tugStart()); await page.waitForTimeout(700);
  const clk = await page.evaluate(() => ({ s: hmvTran.state(), txt: (document.getElementById('hmvTdClock') || {}).textContent, vis: !document.getElementById('hmvTdClock').hidden }));
  ok('10 Chọn "Khi hết thời gian trận: 2 phút" → đồng hồ trận hiện ở đầu màn hình chơi, đếm từ 2:00', clk.s && clk.s.total === 120 && clk.vis && /Trận còn 1:5\d|Trận còn 2:00/.test(clk.txt), clk);
  await page.evaluate(() => tugTogglePause()); const a1 = await page.evaluate(() => hmvTran.state().left); await page.waitForTimeout(1200); const a2 = await page.evaluate(() => hmvTran.state().left); await page.evaluate(() => tugTogglePause());
  ok('11 Tạm dừng trận thì đồng hồ trận cũng dừng', Math.abs(a1 - a2) < 0.05, [a1, a2]);
  await page.evaluate(() => { tugJudge(true); }); await page.evaluate(() => hmvTran._skip(200)); await page.waitForTimeout(600);
  st = await page.evaluate(() => hmvTugState().match); const w2 = await page.evaluate(() => (document.querySelector('.tug-winner') || {}).textContent || '');
  ok('12 Hết thời gian trận → trận dừng ngay, đội đang dẫn thắng, ghi "Hết thời gian trận"; đồng hồ trận ẩn', st.phase === 'won' && /Hết thời gian trận/.test(w2) && await page.evaluate(() => document.getElementById('hmvTdClock').hidden && !hmvTran.state()), { phase: st.phase, w2 });
  await page.evaluate(() => tugBack()); await rules(page, 'tug', { end: 'rule' });
  await page.evaluate(() => { tugStart && 0; }); await setup(page, 'tug'); await page.evaluate(() => tugStart()); await page.waitForTimeout(300);
  ok('13 "Theo luật của trò chơi" → như bản cũ (tối đa 20 câu của bộ, không có đồng hồ trận)', await page.evaluate(() => hmvTugState().match.order.length === 20 && !hmvTran.state()));
  await page.evaluate(() => tugBack());

  // E. Ai nhanh hơn
  await rules(page, 'buzzer', { end: 'count', count: 3 }); await setup(page, 'buzzer'); await page.evaluate(() => buzzStart()); await page.waitForTimeout(300);
  ok('14 Ai nhanh hơn: chơi đủ 3 câu → bộ câu của trận chỉ có 3 câu', await page.evaluate(() => hmvBuzzState().match.order.length === 3));
  await page.evaluate(() => buzzBack && buzzBack());

  // F. Đường đua: hiện đáp án + nút + tự chuyển câu
  await rules(page, 'race', { reveal: 2, end: 'count', count: 3 }); await setup(page, 'race'); await page.evaluate(() => raceStart()); await page.waitForTimeout(300);
  await page.evaluate(() => { raceAnswer(0); raceJudge(false); }); await page.waitForTimeout(250);
  const rd = await page.evaluate(() => ({ t: (document.querySelector('.race-done') || {}).textContent || '', btn: !!document.getElementById('raceNextBtn'), m: JSON.parse(localStorage.getItem('tk_race_match')) }));
  ok('15 Đường đua: chấm xong hiện "Chưa đúng", ĐÁP ÁN ĐÚNG, nút "Câu tiếp theo →" và "Tự chuyển câu sau 2 giây" (bản cũ dừng ở "Chọn đội và sẵn sàng!" không có nút)', /Chưa đúng/.test(rd.t) && /Đáp án đúng:/.test(rd.t) && rd.btn && /Tự chuyển câu sau/.test(rd.t) && rd.m.order.length === 3, rd);
  await page.waitForTimeout(2300);
  ok('16 Sau 2 giây tự sang câu 2', await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('tk_race_match')); return m.q === 1 && m.questionOpen; }));
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('tk_race_match')); if (m && m.phase === 'playing') { if (m.questionOpen) raceJudge(true); else raceNext(); } }); await page.waitForTimeout(120); await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('tk_race_match')); if (m && m.phase === 'playing' && !m.questionOpen) raceNext(); }); await page.waitForTimeout(120); }
  const rEnd = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_race_match')));
  ok('17 Đường đua đủ 3 câu → kết thúc "Đã chơi đủ 3 câu · đội đi xa nhất thắng"', rEnd.phase === 'ended' && /Đã chơi đủ 3 câu/.test(rEnd.reason), rEnd && { phase: rEnd.phase, reason: rEnd.reason });
  await page.evaluate(() => raceBack());

  // G. Hộp quà: hiện đáp án đúng khi chọn sai + đủ số câu
  await rules(page, 'gift', { end: 'count', count: 2, reveal: 2 }); await setup(page, 'gift'); await page.evaluate(() => giftStart()); await page.waitForTimeout(300);
  await page.evaluate(() => giftBox(0)); await page.waitForTimeout(150);
  const gq = await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('tk_gift_match')); return m; });
  const wrongIdx = await page.evaluate(() => { const b = [...document.querySelectorAll('.gift-answer')]; return b.length; });
  await page.evaluate(() => { const qtext = document.querySelector('.gift-question h2').textContent; const q = window.hmvC6QuestionsForGame('gift').find(x => x.text === qtext); window.__gc = q.correct; giftAnswer((q.correct + 1) % 4); });
  await page.waitForTimeout(400);
  const gp = await page.evaluate(() => ({ wrong: [...document.querySelectorAll('.gift-answer.wrong')].length, right: [...document.querySelectorAll('.gift-answer.right')].length, m: JSON.parse(localStorage.getItem('tk_gift_match')).answered }));
  await page.waitForTimeout(1000); const gp2 = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_gift_match')).answered);
  ok('18 Hộp quà: chọn sai → tô đỏ đáp án đã chọn (không lộ đáp án đúng vì hộp còn giữ cho lượt sau) và chờ đủ 2 giây theo Luật trận đấu rồi mới chấm (mặc định cũ 0,9 giây)', gp.wrong === 1 && gp.right === 0 && !gp.m && !gp2, [gp, gp2]);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { giftBox(1); }); await page.waitForTimeout(150); await page.evaluate(() => { const qtext = document.querySelector('.gift-question h2').textContent; const q = window.hmvC6QuestionsForGame('gift').find(x => x.text === qtext); giftAnswer((q.correct + 1) % 4); }); await page.waitForTimeout(2400);
  const gEnd = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_gift_match')));
  ok('19 Hộp quà: đủ 2 câu → trận kết thúc "Đã chơi đủ 2 câu"', gEnd.phase === 'ended' && /Đã chơi đủ 2 câu/.test(gEnd.reason), { phase: gEnd.phase, reason: gEnd.reason, w: gq && gq.phase, wrongIdx });
  await page.evaluate(() => giftBack());

  // H. Lật mảnh ghép: tô đáp án trước khi chấm
  await rules(page, 'tiles', { reveal: 2 }); await setup(page, 'tiles'); await page.evaluate(() => flipStart()); await page.waitForTimeout(300);
  await page.evaluate(() => flipPiece(0)); await page.waitForTimeout(150);
  const fq = await page.evaluate(() => { const b = document.querySelectorAll('.flip-answer'); return b.length; });
  await page.evaluate(() => flipSelectAnswer(0)); await page.waitForTimeout(250);
  const fp = await page.evaluate(() => ({ marked: document.querySelectorAll('.flip-answer.right,.flip-answer.wrong').length, disabled: [...document.querySelectorAll('.flip-answer')].every(b => b.disabled), m: JSON.parse(localStorage.getItem('tk_tiles_match')) }));
  await page.waitForTimeout(2100);
  const fj = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_tiles_match')));
  ok('20 Lật mảnh ghép: chọn đáp án → tô xanh/đỏ đáp án đã chọn trong 2 giây rồi mới chấm', fq === 4 && fp.marked >= 1 && fp.disabled && !fp.m.answered && fj.correct.concat(fj.wrong).reduce((a, b) => a + b, 0) === 1 && !fj.pend, { fq, fp: { marked: fp.marked, d: fp.disabled }, c: fj.correct, w: fj.wrong });
  await page.evaluate(() => flipBack());

  // I. Chinh phục tri thức: thời gian trả lời
  await rules(page, 'millionaire', { answer: 10 }); await setup(page, 'millionaire'); await page.evaluate(() => gameStart()); await page.waitForTimeout(2200);
  const mt = await page.textContent('#millionaireTimer');
  await page.waitForTimeout(9500);
  const ms = await page.evaluate(() => ({ r: millionaireState.result, t: millionaireState.timedOut }));
  ok('21 Chinh phục tri thức: "Thời gian trả lời mỗi câu: 10 giây" → đồng hồ ghi "còn … giây", hết giờ thì tính chưa trả lời được và kết thúc lượt', /còn [0-9]+ giây/.test(mt) && ms.t && (ms.r === 'wrong' || ms.r === 'lose'), { mt, ms });
  await page.evaluate(() => gameBack());

  // J. Trò camera: thời gian hiện đáp án
  await rules(page, 'balloon', { reveal: 6 }); await setup(page, 'balloon');
  await page.evaluate(() => { document.getElementById('bbControl').value = 'mouse'; }); await page.click('#bbSetup button.btn.color, #games [data-bb-start]').catch(() => {});
  await page.waitForTimeout(300); if (!(await page.evaluate(() => hmvBalloon.state().match))) await page.evaluate(() => gameStart());
  await page.waitForTimeout(400); await page.evaluate(() => { const b = document.querySelector('#bbStage [data-bb-pick], #bbStage .bb-balloon'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const bb = await page.evaluate(() => hmvBalloon.state().match);
  ok('22 Bóng bay: "Hiện đáp án rồi chuyển câu sau 6 giây" → sau khi chọn chờ ~6 giây (mặc định cũ 2,4–3,6 giây)', bb && bb.phase === 'done' && bb.nextLeft > 5, bb && { phase: bb.phase, next: bb.nextLeft });
  await page.evaluate(() => { const b = [...document.querySelectorAll('#games button')].find(x => /Thư viện/.test(x.textContent)); if (b) b.click(); });

  // J2. Bóng bay: hết thời gian trận
  await rules(page, 'balloon', { end: 'time', minutes: 3, reveal: '' }); await setup(page, 'balloon');
  await page.evaluate(() => { document.getElementById('bbControl').value = 'mouse'; }); await page.evaluate(() => gameStart()); await page.waitForTimeout(500);
  const bt = await page.evaluate(() => ({ s: hmvTran.state(), m: hmvBalloon.state().match && hmvBalloon.state().match.phase }));
  await page.evaluate(() => hmvTran._skip(400)); await page.waitForTimeout(600);
  const be = await page.evaluate(() => hmvBalloon.state().match && hmvBalloon.state().match.phase);
  ok('22b Bóng bay "Khi hết thời gian trận: 3 phút" → đồng hồ trận 3:00; hết giờ → trận kết thúc, hiện màn hình kết quả', bt.s && bt.s.total === 180 && bt.m === 'ask' && be === 'end', { bt, be });
  await page.evaluate(() => { const b = [...document.querySelectorAll('#games button')].find(x => /Thư viện/.test(x.textContent)); if (b) b.click(); });
  // J3. Chế độ giấy: số câu
  await rules(page, 'paper-mode', { end: 'count', count: 8 }); await setup(page, 'paper-mode');
  ok('22c Chế độ giấy "chơi đủ 8 câu" → lượt chấm có 8 câu (bộ demo 20 câu)', await page.evaluate(() => /\(1\/8\)/.test(document.querySelector('#games .paper-stage h3:not(:first-child), #games .card h3') ? [...document.querySelectorAll('#games .card h3')].map(h => h.textContent).join(' ') : '')));
  await page.evaluate(() => gameBack());
  // J4. Quiz Nghiêng Đầu: thẻ trong hộp thiết lập
  await setup(page, 'head-tilt'); await page.waitForTimeout(300);
  const ht = await page.evaluate(() => { const c = document.querySelector('#tiltSetupModal .hmv-td'); return c && { lim: !!c.querySelector('#tiltLimit'), ans: !!c.querySelector('[data-td="answer"]') }; });
  ok('22d Quiz Nghiêng Đầu: thẻ Luật trận đấu nằm trong hộp thiết lập, có "Số câu mỗi lượt" và "Thời gian trả lời mỗi câu"', ht && ht.lim && ht.ans, ht);
  await page.evaluate(() => { const m = document.getElementById('tiltSetupModal'); if (m) m.remove(); classroomGame.type = null; classroomGame.started = false; });
  // K. Máy của thầy (Kho hiện tại đã có nhiều câu) → không đổi
  await ctx.close();
  ({ ctx, page } = await open(() => { try { if (!localStorage.getItem('tk_questions')) localStorage.setItem('tk_questions', JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ id: 'my-' + i, subject: 'Toán', level: 'Mức 1', text: 'Câu của thầy số ' + (i + 1), answers: ['1', '2', '3', '4'], correct: i % 4 })))); } catch (e) {} }));
  await setup(page, 'tug');
  const mine = await page.evaluate(() => ({ auto: hmvTran.info('tug').auto, start: (document.querySelector('.tug-start-card') || {}).textContent }));
  ok('23 Máy đã có 12 câu của thầy trong Kho hiện tại → Kéo co vẫn dùng câu của thầy (không tự đổi sang bộ demo)', !mine.auto && /12 câu hỏi hợp lệ/.test(mine.start), mine);
  await rules(page, 'tug', { src: 'demo' }); await setup(page, 'tug');
  ok('24 Chọn "Luôn dùng bộ demo" → dùng Mẫu 1 dù đã có câu riêng', await page.evaluate(() => hmvTran.info('tug').auto && /20 câu hỏi hợp lệ/.test(document.querySelector('.tug-start-card').textContent)));
  // L. Điện thoại
  await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); page = await ctx.newPage(); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.goto(BASE); await page.waitForFunction(() => window.hmvTran && window.hmvMobile); await page.waitForTimeout(800);
  await setup(page, 'tug'); await page.evaluate(() => document.querySelector('.hmv-td').scrollIntoView());
  const ph = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, w: Math.round(document.querySelector('.hmv-td').getBoundingClientRect().width) }));
  await page.screenshot({ path: path.join(__dirname, 'td-dien-thoai.png') });
  ok('25 Điện thoại 390 px: thẻ Luật trận đấu gọn trong màn hình, không tràn ngang', ph.over <= 0 && ph.w <= 390, ph);
  await ctx.close();
  ok('26 Không có lỗi JavaScript', logs.length === 0, logs);
  await browser.close();
  const pass = res.filter(r => r.pass).length; console.log('\nKẾT QUẢ: ' + pass + '/' + res.length); process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
