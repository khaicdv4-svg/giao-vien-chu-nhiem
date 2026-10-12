// Kiểm thử bản 2.10 – phần 2: tiếng ĐÚNG/SAI không còn bị giọng "Tự đọc câu hỏi" cắt ngang.
// Trước 2.10 (đo trên bản 2.9, Tự đọc BẬT): Đường đua nghe được ~0,8 giây, Nghiêng Đầu ~0,1 giây, Bóng bay (sai) ~0,7 giây trên 2,4 giây.
// Giọng đọc là GIẢ (qa13/fake-speech.js, mỗi câu "đọc" 2,5 giây); trình duyệt thử không có loa – đo thời gian tệp mp3 thực sự chạy.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const S = path.join(__dirname, '..'); const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const fake = fs.readFileSync(path.join(S, 'qa11', 'fake-hands.mjs'), 'utf8');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const HOOK = () => {
  window.__ds = []; window.__holdLog = [];
  const P = HTMLMediaElement.prototype, op = P.play;
  P.play = function () {
    if (/tra-loi-(dung|sai)/.test(this.src)) {
      const rec = { k: /dung/.test(this.src) ? 'right' : 'wrong', t0: Date.now(), end: 0, why: '', pos: 0 }; window.__ds.push(rec);
      const fin = why => { if (!rec.end) { rec.end = Date.now(); rec.why = why; rec.pos = this.currentTime; } this.removeEventListener('pause', p); this.removeEventListener('ended', e); };
      const p = () => fin('pause'), e = () => fin('ended');
      this.addEventListener('pause', p); this.addEventListener('ended', e);
    }
    return op.apply(this, arguments);
  };
  setInterval(() => { if (window.hmvDungSai && hmvDungSai.state().playing) window.__holdLog.push(!!window.hmvHold); }, 100);
};
const logs = [];
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const open = async auto => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'], serviceWorkers: 'block' });
    await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); });
    const page = await ctx.newPage(); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('dialog', d => d.accept().catch(() => {}));
    await page.addInitScript({ path: path.join(S, 'qa13', 'fake-speech.js') }); await page.addInitScript(HOOK);
    await page.addInitScript(a => { try { localStorage.setItem('hmv_doc_to_v1', JSON.stringify({ engine: 'browser', auto: a, wait: true, answers: true })); } catch (e) {} window.__speechMs = 2500; }, auto);
    await page.goto(BASE); await page.waitForFunction(() => window.hmvDungSai && window.hmvDocTo && Array.isArray(window.questionBankSets) && questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 15000 });
    return { ctx, page };
  };
  const kho = async (page, set, g) => { await page.evaluate(() => { try { gameBack() } catch (e) {} openView('questions') }); await page.waitForTimeout(250); await page.click('#questions [data-kho-play="' + set + '"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="' + g + '"]'); await page.waitForTimeout(1500); };
  const lastDs = page => page.evaluate(() => window.__ds[window.__ds.length - 1]);
  const spokenAfter = (page, t) => page.evaluate(t0 => window.__spoken.filter(x => x.at >= t0).map(x => ({ at: x.at, text: x.text.slice(0, 40) })), t);
  const startsAfter = (page, t) => page.evaluate(t0 => (window.__starts || []).filter(x => x >= t0), t);
  let { ctx, page } = await open(true);
  await page.evaluate(() => { const o = speechSynthesis.speak.bind(speechSynthesis); window.__starts = []; speechSynthesis.speak = u => { window.__starts.push(Date.now()); return o(u); }; });

  // Đường đua: thầy cô bấm "Xác nhận đúng" rồi "Câu tiếp theo" ngay
  await kho(page, 'mau-1-abcd', 'race'); await page.waitForSelector('.race-question'); await page.waitForTimeout(3200);
  await page.click('button[onclick="raceJudge(true)"]'); await page.evaluate(() => raceNext()); await page.waitForTimeout(5200);
  let d = await lastDs(page), st = await startsAfter(page, d.t0), hold = await page.evaluate(() => window.__holdLog.slice());
  ok('1 Đường đua (Tự đọc BẬT): bấm Xác nhận đúng rồi sang câu mới ngay → tiếng ĐÚNG phát trọn (~2,4 giây), máy chỉ đọc câu mới SAU khi tiếng dứt', d.k === 'right' && d.pos > 2.3 && d.end - d.t0 > 2300 && st.length > 0 && st[0] >= d.end - 50, { d, st0: st[0] && st[0] - d.t0 });
  ok('2 Trong lúc chờ tiếng ĐÚNG/SAI dứt, đồng hồ trò chơi được giữ (hmvHold bật) để học sinh không bị mất giờ', hold.slice(-8).every(Boolean) && hold.length > 5, hold.slice(-12));
  await page.click('button[onclick="raceJudge(false)"]'); await page.evaluate(() => raceNext()); await page.waitForTimeout(5200);
  d = await lastDs(page); st = await startsAfter(page, d.t0);
  ok('3 Đường đua: Xác nhận sai → tiếng SAI phát trọn, rồi mới đọc câu mới', d.k === 'wrong' && d.pos > 2.3 && st.length > 0 && st[0] >= d.end - 50, { d, st0: st[0] && st[0] - d.t0 });
  await page.evaluate(() => raceBack());

  // Nghiêng Đầu
  const tiltStart = async () => { await kho(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); for (const b of await page.$$('#tiltSetupModal button')) { if (/Bắt đầu/.test(await b.textContent())) { await b.click(); break; } } await page.waitForSelector('.tilt-question-text'); };
  await tiltStart(); await page.waitForTimeout(3300); const nT = await page.evaluate(() => window.__ds.length); await page.keyboard.press('ArrowLeft'); await page.waitForFunction(n => window.__ds.length > n, nT, { timeout: 6000 }); await page.waitForTimeout(150); await page.evaluate(() => tiltNext()); await page.waitForTimeout(5000);
  d = await lastDs(page); st = await startsAfter(page, d.t0);
  ok('4 Quiz Nghiêng Đầu (Tự đọc BẬT): tiếng đúng/sai phát trọn ~2,4 giây (bản 2.9 chỉ còn ~0,1 giây), máy đọc câu sau khi tiếng dứt', d.pos > 2.3 && st.length > 0 && st[0] >= d.end - 50, { d, st0: st[0] && st[0] - d.t0 });
  await page.evaluate(() => tiltBack());

  // Bóng bay
  await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.waitForSelector('#bbCount'); await page.selectOption('#bbControl', 'touch'); await page.evaluate(() => balloonBack());
  await kho(page, 'mau-1-abcd', 'balloon'); await page.waitForSelector('#bbStage .bb-balloon'); await page.waitForFunction(() => hmvBalloon.state().match.phase === 'ask');
  await page.waitForTimeout(3300); let m = await page.evaluate(() => hmvBalloon.state().match);
  await page.click('#bbStage .bb-balloon >> nth=' + ((m.question.correct + 1) % m.question.answers.length), { force: true }); await page.waitForTimeout(5200);
  d = await lastDs(page);
  ok('5 Bóng bay (Tự đọc BẬT): chạm bóng SAI → tiếng SAI phát trọn (bản 2.9 bị cắt còn ~0,7 giây)', d.k === 'wrong' && d.pos > 2.3, d);
  await page.evaluate(() => balloonBack());

  // Kéo co, Ai nhanh hơn, Hộp quà, Triệu phú, Bình chọn, 2 trò mới: tiếng phát trọn khi Tự đọc BẬT
  const full = async (name, fn) => { const n0 = await page.evaluate(() => window.__ds.length); await fn(); await page.waitForTimeout(4800); const list = await page.evaluate(n => window.__ds.slice(n), n0); return { name, list, good: list.length >= 1 && list.every(x => x.pos > 2.3) }; };
  const out = [];
  out.push(await full('Kéo co', async () => { await kho(page, 'mau-1-abcd', 'tug'); await page.waitForTimeout(3200); const q = await page.evaluate(() => { const m = hmvTugState().match; return hmvC6QuestionsForGame('tug')[m.order[m.q]]; }); await page.click('.tug-answers button >> nth=' + q.correct); }));
  await page.evaluate(() => tugBack());
  out.push(await full('Ai nhanh hơn', async () => { await kho(page, 'mau-1-abcd', 'buzzer'); await page.waitForFunction(() => hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 9000 }); await page.click('button[onclick="buzzClaim(0)"]'); await page.waitForTimeout(200); await page.click('button[onclick="buzzAnswer(1)"]'); }));
  await page.evaluate(() => buzzBack());
  out.push(await full('Hộp quà', async () => { await kho(page, 'mau-1-abcd', 'gift'); await page.click('button[onclick="giftBox(0)"]'); await page.waitForSelector('.gift-answer'); await page.click('.gift-answer >> nth=2'); }));
  await page.evaluate(() => giftBack());
  out.push(await full('Chinh phục tri thức', async () => { await kho(page, 'mau-1-abcd', 'millionaire'); await page.waitForFunction(() => millionaireState.choices && millionaireState.choices.length === 4); await page.waitForTimeout(3000); await page.evaluate(() => millionaireChoose(millionaireState.choices.findIndex(x => x.correct))); }));
  await page.evaluate(() => gameBack());
  out.push(await full('Bàn tay phép thuật', async () => { await kho(page, 'mau-2-dung-sai', 'magic-hand'); await page.waitForTimeout(3000); const s = await page.evaluate(() => hmvMagicHand.state()); await page.keyboard.press('Digit' + (s.match.item.g + 1)); }));
  await page.evaluate(() => { try { magicHandBack() } catch (e) {} });
  ok('6 Kéo co, Ai nhanh hơn, Hộp quà, Chinh phục tri thức, Bàn tay phép thuật (Tự đọc BẬT): mỗi lần chấm tiếng đúng/sai phát trọn', out.every(o => o.good), out.map(o => ({ n: o.name, l: o.list.map(x => x.k + ':' + (x.pos || 0).toFixed(2)) })));
  await ctx.close();

  // Bấm nút loa bằng tay khi tiếng còn ngân: vẫn cắt tiếng để đọc ngay (hành vi cũ, thầy cô chủ động)
  ({ ctx, page } = await open(false)); await page.evaluate(() => openView('games'));
  await page.evaluate(() => { hmvDungSai.play(true, 0.6); }); await page.waitForFunction(() => hmvDungSai.state().playing === 'right'); await page.evaluate(() => { hmvDocTo.speak('Câu tiếp theo.'); }); const cut = await page.waitForFunction(() => !hmvDungSai.state().playing, null, { timeout: 1500 }).then(() => true, () => false);
  ok('7 Thầy cô tự bấm đọc khi tiếng còn ngân: giọng đọc vẫn đọc ngay (tiếng đúng/sai nhường), như bản trước', cut);
  // Tự đọc TẮT: không đổi
  const n0 = await page.evaluate(() => window.__ds.length); await kho(page, 'mau-1-abcd', 'race'); await page.waitForSelector('.race-question'); await page.click('button[onclick="raceJudge(true)"]'); await page.evaluate(() => raceNext()); await page.waitForTimeout(3000);
  d = await lastDs(page); const sp = await page.evaluate(() => window.__spoken.length);
  ok('8 Tự đọc TẮT: tiếng phát trọn, máy không tự đọc', d.pos > 2.3 && sp === 0, [d, sp]);
  ok('9 Không có lỗi JavaScript', logs.length === 0, logs);
  await browser.close();
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'dung-sai-doc-results.json'), JSON.stringify({ version: '2.10', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
