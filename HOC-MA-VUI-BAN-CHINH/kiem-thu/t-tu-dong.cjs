// Kiểm thử bản 2.6: (1) Hộp quà bí mật tự chấm khi chọn đáp án; (2) Bình chọn ngón tay tự bắt đầu đếm sau khi máy đọc xong câu hỏi.
// Giọng đọc là GIẢ (qa13/fake-speech.js), camera là camera giả của Chromium, bộ nhận diện bàn tay là GIẢ (qa11/fake-hands.mjs).
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/'; const fake = fs.readFileSync(path.join(__dirname, '..', 'qa11', 'fake-hands.mjs'), 'utf8');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const logs = [];
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'], serviceWorkers: 'block' });
  await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); });
  const page = await ctx.newPage(); if (opts.voice !== false) await page.addInitScript({ path: path.join(__dirname, '..', 'qa13', 'fake-speech.js') });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && window.hmvPoll && window.hmvDocTo && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 15000 }); await page.waitForTimeout(500);
  return { ctx, page };
}
const play = async (page, setId, g) => { await page.evaluate(() => openView('questions')); await page.waitForTimeout(150); await page.click('#questions [data-kho-play="' + setId + '"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="' + g + '"]'); await page.waitForTimeout(1100); };
const gift = page => page.evaluate(() => { const g = JSON.parse(localStorage.getItem('tk_gift_match') || 'null'); return g ? { q: g.questionOpen, r: g.rewardOpen, a: g.answered, sel: g.selected, scores: g.scores, correct: g.correct, wrong: g.wrong, cur: g.current, box: g.selectedBox, opened: g.boxes.filter(b => b.opened).length } : null; });
const evs = page => page.evaluate(() => (JSON.parse(localStorage.getItem('hmv_ket_qua_v1') || '{"e":[]}').e || []).filter(e => e.g === 'gift'));
const keyOf = page => page.evaluate(() => { const txt = document.querySelector('.gift-question h2').childNodes[0].textContent.trim(); let c = -1; questionBankSets.forEach(s => s.questions.forEach(q => { if ((q.text || q.question) === txt && Number.isInteger(Number(q.correct))) c = Number(q.correct); })); return c; });
const backToBoxes = async page => { for (let i = 0; i < 5; i++) { const s = await gift(page); if (!s || (!s.q && !s.r)) return; if (s.r) await page.evaluate(() => { try { giftApply(); } catch (e) {} }); else await page.evaluate(() => { giftJudge(true); }); await page.waitForTimeout(250); } };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  let { ctx, page } = await open(browser);

  // ================= Hộp quà bí mật: tự chấm =================
  await play(page, 'mau-1-abcd', 'gift'); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question .toolbar');
  let ui = await page.evaluate(() => ({ note: (document.querySelector('.gift-auto-note') || {}).textContent, btns: Array.from(document.querySelectorAll('.gift-question .toolbar .btn')).map(b => b.textContent.trim()), n: document.querySelectorAll('.gift-answer').length }));
  ok('1 Hộp quà, câu có đáp án đúng: mặc định "Tự chấm" – không còn nút Xác nhận đúng/sai, có ghi chú "Tự chấm", vẫn còn nút Chuyển quyền', /Tự chấm/.test(ui.note || '') && ui.btns.length === 1 && /Chuyển quyền/.test(ui.btns[0]) && ui.n === 4, ui);
  let c = await keyOf(page), s0 = await gift(page), e0 = (await evs(page)).length;
  await page.click('.gift-answer >> nth=' + c); await page.waitForTimeout(250);
  let mid = await page.evaluate(i => { const b = document.querySelectorAll('.gift-answer'); return { cls: b[i].className, dis: Array.from(b).every(x => x.disabled), bg: getComputedStyle(b[i]).backgroundColor }; }, c), sm = await gift(page);
  await page.click('.gift-answer >> nth=' + ((c + 1) % 4), { force: true }).catch(() => {}); await page.evaluate(i => giftAnswer(i), (c + 1) % 4);
  await page.waitForSelector('.gift-reward', { timeout: 4000 }); let s1 = await gift(page), e1 = await evs(page), toast = await page.textContent('#toast');
  ok('2 Bấm đúng phương án đúng: phương án hiện XANH ngay (chưa chấm vội, các phương án khóa lại), gần 1 giây sau tự chấm ĐÚNG → cộng điểm, mở phần quà; bấm thêm trong lúc chờ không có tác dụng', /right/.test(mid.cls) && mid.dis && mid.bg === 'rgb(220, 252, 231)' && sm.q === true && sm.a === false && s1.r === true && s1.scores[s1.cur] === s0.scores[s0.cur] + 10 && s1.correct[s1.cur] === 1 && s1.wrong[s1.cur] === 0 && /Chính xác/.test(toast), [mid, sm, s1, toast]);
  ok('3 Lượt tự chấm được ghi cho "Phân tích sau trò chơi": đúng một lượt, đúng phương án đã chọn, kết quả đúng', e1.length === e0 + 1 && e1[e1.length - 1].x === c && e1[e1.length - 1].o === 1, e1.slice(-2));
  await backToBoxes(page); await page.evaluate(() => giftBox(1)); await page.waitForSelector('.gift-question .toolbar'); c = await keyOf(page); s0 = await gift(page); const wrongI = (c + 2) % 4;
  await page.keyboard.press('abcd'[wrongI]); await page.waitForTimeout(250); mid = await page.evaluate(i => ({ cls: document.querySelectorAll('.gift-answer')[i].className, right: document.querySelectorAll('.gift-answer.right').length }), wrongI);
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem('tk_gift_match')).questionOpen, null, { timeout: 4000 }); await page.waitForTimeout(150); s1 = await gift(page); e1 = await evs(page); toast = await page.textContent('#toast');
  ok('4 Chọn SAI (bằng phím A–D): phương án hiện ĐỎ, không lộ đáp án đúng; gần 1 giây sau tự chấm SAI → không cộng điểm, hộp chưa mở, báo "Chưa đúng"', /wrong/.test(mid.cls) && mid.right === 0 && s1.q === false && s1.r === false && s1.wrong.reduce((a, b) => a + b, 0) === 1 && s1.opened === s0.opened && JSON.stringify(s1.scores) === JSON.stringify(s0.scores) && /Chưa đúng/.test(toast) && e1[e1.length - 1].x === wrongI && e1[e1.length - 1].o === 0, [mid, s1, toast, e1.slice(-1)]);
  // chuyển quyền trong lúc chờ chấm → không chấm nhầm cho người khác
  await backToBoxes(page); await page.evaluate(() => giftBox(2)); await page.waitForSelector('.gift-question .toolbar'); c = await keyOf(page); s0 = await gift(page);
  await page.click('.gift-answer >> nth=' + c); await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.waitForTimeout(1300); s1 = await gift(page);
  ok('5 Đóng câu hỏi (Esc) trong lúc đang chờ chấm: không chấm, điểm giữ nguyên, không kẹt', s1.q === false && s1.r === false && JSON.stringify(s1.scores) === JSON.stringify(s0.scores) && JSON.stringify(s1.correct) === JSON.stringify(s0.correct), [s0, s1]);
  await page.evaluate(() => giftBox(2)); await page.waitForSelector('.gift-question .toolbar'); const fresh = await page.evaluate(() => ({ dis: Array.from(document.querySelectorAll('.gift-answer')).some(b => b.disabled), marked: document.querySelectorAll('.gift-answer.right, .gift-answer.wrong').length }));
  ok('6 Mở lại hộp đó: các phương án bấm được bình thường, không còn màu của lượt trước', !fresh.dis && fresh.marked === 0, fresh);
  // tắt tự chấm
  await page.evaluate(() => { giftBack(); openView('games'); gameSetup('gift'); }); await page.waitForSelector('#giftAuto'); const chk = await page.isChecked('#giftAuto'); await page.uncheck('#giftAuto'); await page.evaluate(() => giftSaveSettings()); await page.waitForTimeout(200);
  await play(page, 'mau-1-abcd', 'gift'); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question .toolbar'); c = await keyOf(page);
  ui = await page.evaluate(() => ({ note: !!document.querySelector('.gift-auto-note'), btns: Array.from(document.querySelectorAll('.gift-question .toolbar .btn')).map(b => b.textContent.trim()) })); await page.click('.gift-answer >> nth=' + c); await page.waitForTimeout(1300); s1 = await gift(page);
  const sel = await page.evaluate(() => document.querySelectorAll('.gift-answer.selected').length); await page.click('.gift-question .toolbar .btn >> nth=0'); await page.waitForSelector('.gift-reward');
  ok('7 Thiết lập có ô "Tự chấm khi chọn đáp án" (mặc định bật). Tắt đi thì như trước: chọn đáp án chỉ tô đậm, giáo viên bấm "Xác nhận đúng/sai" mới chấm', chk === true && !ui.note && ui.btns.length === 3 && /Xác nhận đúng/.test(ui.btns[0]) && s1.q === true && s1.a === false && sel === 1, [chk, ui, s1, sel]);
  await page.evaluate(() => { giftBack(); openView('games'); gameSetup('gift'); }); await page.waitForSelector('#giftAuto'); await page.check('#giftAuto'); await page.evaluate(() => giftSaveSettings()); await page.waitForTimeout(200);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_gift_settings')).auto);
  // Đúng/Sai
  await play(page, 'mau-2-dung-sai', 'gift'); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question .toolbar'); c = await keyOf(page); const tf = await page.evaluate(() => Array.from(document.querySelectorAll('.gift-answer')).map(b => b.textContent.trim())); await page.click('.gift-answer >> nth=' + c); await page.waitForSelector('.gift-reward', { timeout: 4000 });
  ok('8 Bật lại được ghi nhớ; bộ câu Đúng/Sai cũng tự chấm', kept === true && tf.length === 2 && /Đúng/.test(tf[0]) && c >= 0, [kept, tf, c]);
  // câu không có đáp án đúng (trả lời ngắn / câu mở) → vẫn do giáo viên chấm
  await page.evaluate(() => giftBack()); const openSet = await page.evaluate(() => { const s = questionBankSets.find(x => /^mau-/.test(x.id) && x.questions.every(q => !(q.answers && q.answers.length > 1))); return s ? s.id : null; });
  let manual = null; if (openSet) { await page.evaluate(() => openView('questions')); await page.waitForTimeout(300); const pb = await page.$('#questions [data-kho-play="' + openSet + '"]'); let b = null; if (pb) { await pb.click(); await page.waitForSelector('#khoModal'); b = await page.$('#khoModal [data-kho-start="gift"]'); } if (b && !(await b.isDisabled())) { await b.click(); await page.waitForTimeout(1100); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question .toolbar'); manual = await page.evaluate(() => ({ note: !!document.querySelector('.gift-auto-note'), btns: Array.from(document.querySelectorAll('.gift-question .toolbar .btn')).map(x => x.textContent.trim()), input: !!document.querySelector('.gift-question input') })); await page.evaluate(() => giftBack()); } else { manual = { locked: true }; if (pb) await page.click('#khoModal [data-kho-close]', { timeout: 2000 }).catch(() => {}); await page.evaluate(() => { const m = document.getElementById('khoModal'); if (m) m.remove(); }); } }
  ok('9 Câu không có đáp án đúng để so (trả lời ngắn / câu mở): vẫn do giáo viên bấm Xác nhận – hoặc trò chơi không nhận bộ đó', manual && (manual.locked || (!manual.note && manual.btns.length === 3)), [openSet, manual]);

  // ================= Bình chọn ngón tay: đọc xong tự đếm =================
  const setup = async (sel = {}) => { await page.evaluate(() => { openView('games'); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); for (const [k, v] of Object.entries(sel)) await page.selectOption('#' + k, String(v)); };
  const st = () => page.evaluate(() => hmvPoll.state());
  await setup({ bcSource: 'bank', bcControl: 'camera', bcTime: 4 }); const opts = await page.evaluate(() => ({ has: !!document.getElementById('bcAutoCount'), val: document.getElementById('bcAutoCount').value, label: document.getElementById('bcAutoCount').closest('label').textContent.slice(0, 40) }));
  await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); await page.waitForSelector('#bcQuestion .hmv-dt-btn');
  await page.evaluate(() => { window.__speechMs = 2500; window.__hands = [{ x: .3, y: .3, n: 2 }, { x: .6, y: .3, n: 2 }, { x: .8, y: .3, n: 1 }]; });
  await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(900); const a1 = await st(); const hold1 = await page.evaluate(() => !!window.hmvHold);
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'count', null, { timeout: 6000 }).catch(() => {}); const a2 = await st(); const a2d = await page.evaluate(() => ({ speak: hmvDocTo.state().state, hold: !!window.hmvHold, timer: (document.getElementById('bcTimer') || {}).textContent }));
  ok('10 Thiết lập Bình chọn có mục "Sau khi máy đọc xong câu hỏi" (mặc định: Tự bắt đầu đếm)', opts.has && opts.val === '1' && /Sau khi máy đọc xong/.test(opts.label), opts);
  ok('11 Bấm nút loa: trong lúc máy đọc chưa đếm; ĐỌC XONG thì tự bắt đầu đếm ngược đủ số giây đã đặt (4 giây), không cần bấm "Bắt đầu đếm"', a1.match.phase === 'ready' && hold1 && a2.match.phase === 'count' && a2d.speak === 'idle' && !a2d.hold && Number(a2d.timer) >= 3 && Number(a2d.timer) <= 4, [a1.match.phase, hold1, a2.match.phase, a2d]);
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 12000 }); const a3 = await page.evaluate(() => Array.from(document.querySelectorAll('[data-bc-num]')).map(e => parseInt(e.childNodes[0].textContent, 10)).join());
  ok('12 Hết giờ đếm: tự chốt kết quả với số phiếu camera đếm được (A:1, B:2)', a3 === '1,2,0,0', a3);
  await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForFunction(() => hmvDocTo.state().state === 'idle', null, { timeout: 6000 }); await page.waitForTimeout(900); const b1 = await st();
  ok('13 Đọc lại câu hỏi khi đã có kết quả: không tự đếm lại (kết quả giữ nguyên)', b1.match.phase === 'result', b1.match.phase);
  await page.click('#bcControls [data-bc="next"]'); await page.waitForFunction(() => hmvPoll.state().match.phase === 'ready'); await page.waitForSelector('#bcQuestion .hmv-dt-btn');
  await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(500); await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForTimeout(1500); const c1 = await st();
  ok('14 Thầy cô bấm DỪNG giữa chừng (máy chưa đọc xong): không tự đếm', c1.match.phase === 'ready', c1.match.phase);
  // tự đọc + tự đếm: toàn bộ một câu không cần bấm gì
  await page.evaluate(() => { hmvDocTo.set({ auto: true }); window.__speechMs = 1500; }); await page.click('#bcControls [data-bc="next"]'); const q2 = (await st()).match.q;
  await page.waitForFunction(() => hmvDocTo.state().state === 'speaking', null, { timeout: 6000 }).catch(() => {}); const d0 = await page.evaluate(() => window.__spoken.length);
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'count', null, { timeout: 8000 }).catch(() => {}); const d1 = await st(); await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 12000 }).catch(() => {}); const d2 = await st();
  ok('15 Bật "Tự đọc khi sang câu mới": sang câu → máy tự đọc → đọc xong tự đếm → hết giờ tự chốt kết quả, thầy cô không phải bấm gì', d1.match.phase === 'count' && d2.match.phase === 'result' && d2.match.q === q2, [d1.match.phase, d2.match.phase, q2, d2.match.q]);
  await page.evaluate(() => { hmvDocTo.set({ auto: false }); window.__speechMs = 800; pollBack(); });
  await setup({ bcSource: 'bank', bcControl: 'camera', bcAutoCount: 0 }); await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); await page.waitForSelector('#bcQuestion .hmv-dt-btn');
  await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForFunction(() => hmvDocTo.state().state === 'idle', null, { timeout: 6000 }); await page.waitForTimeout(1200); const e2 = await st();
  ok('16 Chọn "Chờ thầy cô bấm": đọc xong không tự đếm (như bản trước); lựa chọn được ghi nhớ', e2.match.phase === 'ready' && (await page.evaluate(() => JSON.parse(localStorage.getItem('hmv_poll_settings_v1')).autoCount === false)), e2.match.phase);
  await page.evaluate(() => pollBack()); await setup({ bcSource: 'bank', bcControl: 'manual', bcAutoCount: 1 }); await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().camera === 'off'); await page.waitForSelector('#bcQuestion .hmv-dt-btn');
  await page.evaluate(() => { document.getElementById('toast').textContent = ''; }); await page.click('#bcQuestion .hmv-dt-btn'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForFunction(() => hmvDocTo.state().state === 'idle', null, { timeout: 6000 }); await page.waitForTimeout(1000); const f1 = await st(); const ft = await page.textContent('#toast');
  ok('17 Không dùng camera (thầy cô nhập phiếu bằng phím): đọc xong không có đếm ngược và không hiện thông báo thừa', f1.match.phase === 'ready' && !/Camera/.test(ft), [f1.match.phase, ft]);
  await page.evaluate(() => { pollBack(); });
  ok('18 Không có lỗi JavaScript trong suốt quá trình', logs.length === 0, logs);
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'tu-dong-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.8-20261011', note: 'Giọng đọc, camera và bộ nhận diện bàn tay đều là giả lập.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
