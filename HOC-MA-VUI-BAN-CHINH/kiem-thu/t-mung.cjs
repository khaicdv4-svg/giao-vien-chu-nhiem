// Kiểm thử bản 2.3: tiếng mừng chiến thắng (assets/audio/mung-chien-thang.mp3) lúc kết thúc các trò chưa có tiếng mừng riêng.
// Trình duyệt thử không có loa: bài này kiểm việc tệp ĐƯỢC PHÁT (đối tượng âm thanh đang chạy, đúng tệp, đúng âm lượng), không nghe được tiếng thật.
const { open, play } = require('../qa8/lib.cjs'); const fs = require('fs'), path = require('path'), crypto = require('crypto'), http = require('http');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const get = p => new Promise((resolve, reject) => http.get('http://127.0.0.1:8780' + p, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(c) })); }).on('error', reject));
const INIT = () => { const R = window.Audio; window.__audios = []; window.Audio = function (src) { const a = src === undefined ? new R() : new R(src); window.__audios.push(a); return a; }; window.Audio.prototype = R.prototype; };
const mk = (extra) => open({ viewport: { width: 1366, height: 768 }, blockSW: true, beforeLoad: async (p) => { await p.addInitScript(INIT); if (extra) await extra(p); } });
const st = page => page.evaluate(() => hmvMung.state());
const playing = (page, t) => page.waitForFunction(() => hmvMung.state().playing && hmvMung.state().time > 0.05, null, { timeout: t || 5000 }).then(() => true, () => false);
const stopped = (page, t) => page.waitForFunction(() => !hmvMung.state().playing, null, { timeout: t || 3000 }).then(() => true, () => false);
const tiltStart = async page => { await play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); for (const b of await page.$$('#tiltSetupModal button')) { if (/Bắt đầu/.test(await b.textContent())) { await b.click(); break; } } await page.waitForSelector('.tilt-question-text'); };

(async () => {
  // ---------- Tệp ----------
  const f = await get('/assets/audio/mung-chien-thang.mp3'); const local = fs.readFileSync(path.join(__dirname, '..', 'main28', 'app', 'assets', 'audio', 'mung-chien-thang.mp3'));
  ok('1 Tệp tiếng mừng được máy chủ trả về đúng dạng âm thanh và đúng nguyên tệp thầy gửi (131 074 byte)', f.status === 200 && /audio\/mpeg/.test(f.type) && f.body.length === 131074 && crypto.createHash('sha256').update(f.body).digest('hex') === '3029aafb117205e93b3a59b57a167b79ab0e58a062e6dd97170893fb7e97eb0b' && f.body.equals(local), [f.status, f.type, f.body.length]);

  let { browser, page, logs } = await mk(); page.on('dialog', d => d.accept().catch(() => {}));
  let s = await st(page);
  ok('2 Mở ứng dụng: tệp được nạp sẵn, chưa phát gì', s.plays === 0 && !s.playing && s.error === 0 && (await page.evaluate(() => /mung-chien-thang\.mp3$/.test(hmvMung.src))), s);

  // ---------- Ai nhanh hơn ----------
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.evaluate(() => buzzEnd()); let on = await playing(page); s = await st(page);
  const bz = await page.evaluate(() => ({ phase: hmvBuzzState().match.phase, vol: hmvBuzzState().settings.volume, src: window.__audios.filter(a => /mung-chien-thang/.test(a.src)).length, text: document.getElementById('games').innerText.slice(0, 600) }));
  ok('3 Ai nhanh hơn: kết thúc trò → phát tiếng mừng (đúng tệp), âm lượng theo thanh "Tiếng" của trò', on && s.plays === 1 && bz.phase === 'GAME_FINISHED' && bz.src === 1 && Math.abs(s.volume - Math.min(1, 0.5 + bz.vol * 0.5)) < 0.01 && !s.last.fallback, [s, bz.phase, bz.vol]);
  await page.evaluate(() => buzzReplay()); let off = await stopped(page);
  ok('4 Bấm "Chơi lại" khi tiếng mừng đang phát: tiếng tự tắt, ván mới bắt đầu', off && (await page.evaluate(() => hmvBuzzState().match.phase !== 'GAME_FINISHED')));
  await page.evaluate(() => buzzEnd()); on = await playing(page); await page.evaluate(() => buzzBack()); off = await stopped(page);
  ok('5 Bấm "Về thư viện" khi tiếng mừng đang phát: tiếng tự tắt', on && off);
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.evaluate(() => buzzToggleSound()); const p0 = (await st(page)).plays; await page.evaluate(() => buzzEnd()); await page.waitForTimeout(700); s = await st(page);
  ok('6 Ai nhanh hơn đang "Tiếng: Tắt": không phát tiếng mừng', s.plays === p0 && !s.playing && (await page.evaluate(() => hmvBuzzState().settings.sound === false)), s);
  await page.evaluate(() => { buzzToggleSound(); buzzBack(); });

  // ---------- Đường đua ----------
  await play(page, 'mau-1-abcd', 'race'); await page.waitForSelector('.race-question'); let n0 = (await st(page)).plays, steps = 0;
  for (; steps < 25; steps++) { const done = await page.evaluate(() => { if (/KẾT QUẢ|về đích|Đã hết câu hỏi/.test(document.getElementById('games').innerText) && hmvMung.state().plays > 0 && hmvMung.state().playing) return true; try { raceJudge(true); } catch (e) {} try { raceNext(); } catch (e) {} return false; }); if (done || (await st(page)).plays > n0) break; await page.waitForTimeout(120); }
  on = await playing(page); s = await st(page); const rtext = await page.evaluate(() => document.getElementById('games').innerText.replace(/\s+/g, ' ').slice(0, 2500));
  ok('7 Đường đua: một đội về đích (chơi thật đến hết) → phát tiếng mừng; phát cả khi ô "Tiếng hiệu ứng" của trò đang tắt theo mặc định', on && s.plays === n0 + 1 && /về đích|đi xa nhất/.test(rtext) && Math.abs(s.volume - 0.8) < 0.01, [s, steps, rtext.slice(0, 300)]);
  await page.evaluate(() => raceReplay()); off = await stopped(page); await page.waitForTimeout(300);
  n0 = (await st(page)).plays; await page.evaluate(() => raceEnd()); await page.waitForTimeout(700); s = await st(page);
  ok('8 Đường đua: bấm Chơi lại thì tiếng tắt; giáo viên bấm "Kết thúc" giữa chừng (chưa có đội thắng) thì không phát tiếng mừng – giống Kéo co', off && s.plays === n0 && !s.playing, s);
  await page.evaluate(() => raceBack());

  // ---------- Hộp quà ----------
  await play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(500); n0 = (await st(page)).plays;
  for (let i = 0; i < 8; i++) { await page.evaluate(i2 => giftBox(i2), i); await page.waitForTimeout(120); await page.evaluate(() => { giftAnswer(0); giftJudge(true); }); await page.waitForTimeout(150); if (i < 7) ok.mid = (await st(page)).plays; await page.evaluate(() => { try { giftApply(); } catch (e) {} }); await page.waitForTimeout(150); }
  on = await playing(page); s = await st(page);
  ok('10 Hộp quà: mở hết hộp → phát tiếng mừng đúng một lần ở màn kết quả (không phát giữa chừng)', on && s.plays === n0 + 1 && ok.mid === n0 && (await page.$('.gift-result')) !== null, [s, ok.mid, n0]);
  await page.evaluate(() => giftReplay()); off = await stopped(page); await page.waitForTimeout(400); n0 = (await st(page)).plays; await page.evaluate(() => giftEnd()); await page.waitForTimeout(700); s = await st(page);
  ok('11 Hộp quà: Chơi lại thì tiếng tắt; giáo viên bấm "Kết thúc" giữa chừng thì không phát tiếng mừng', off && s.plays === n0 && !s.playing, s);
  await page.evaluate(() => giftBack());

  // ---------- Chinh phục tri thức ----------
  await play(page, 'mau-1-abcd', 'millionaire'); await page.waitForFunction(() => document.querySelector('#games .millionaire') && millionaireState.choices && millionaireState.choices.length === 4, null, { timeout: 8000 }); n0 = (await st(page)).plays;
  await page.evaluate(() => millionaireChoose(millionaireState.choices.findIndex(c => !c.correct))); await page.waitForFunction(() => millionaireState.result === 'lose', null, { timeout: 8000 }); await page.waitForTimeout(500); s = await st(page);
  ok('12 Chinh phục tri thức: trả lời sai, thua cuộc → KHÔNG phát tiếng mừng', s.plays === n0 && !s.playing, s);
  await play(page, 'mau-1-abcd', 'millionaire'); await page.waitForFunction(() => document.querySelector('#games .millionaire') && millionaireState.choices && millionaireState.choices.length === 4 && !millionaireState.result, null, { timeout: 8000 });
  for (let i = 0; i < 12; i++) { const r = await page.evaluate(() => millionaireState.result); if (r === 'win') break; await page.waitForFunction(() => !millionaireState.locked && millionaireState.choices.length === 4 && millionaireState.result !== 'correct', null, { timeout: 8000 }).catch(() => {}); if ((await page.evaluate(() => millionaireState.result)) === 'win') break; if (i < 10) ok.midM = (await st(page)).plays; await page.evaluate(() => millionaireChoose(millionaireState.choices.findIndex(c => c.correct))); await page.waitForTimeout(2700); }
  on = await playing(page); s = await st(page);
  ok('13 Chinh phục tri thức: trả lời đúng cả 10 câu → phát tiếng mừng ở màn "Xuất sắc!" (không phát sau từng câu đúng)', on && s.plays === n0 + 1 && ok.midM === n0 && (await page.evaluate(() => millionaireState.result === 'win' && /Xuất sắc/.test(document.querySelector('.millionaire-result').innerText))), [s, ok.midM, n0]);
  await page.evaluate(() => gameBack()); off = await stopped(page);
  ok('14 Rời Chinh phục tri thức khi tiếng mừng đang phát: tiếng tự tắt', off);
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.evaluate(() => buzzEnd()); on = await playing(page); await page.evaluate(() => openView('home')); off = await stopped(page);
  ok('9 Chuyển sang màn hình khác khi tiếng mừng đang phát: tiếng tự tắt', on && off); await page.evaluate(() => { openView('games'); buzzBack(); });

  // ---------- Quiz Nghiêng Đầu ----------
  await tiltStart(page); n0 = (await st(page)).plays;
  for (let i = 0; i < 19; i++) await page.evaluate(() => tiltSkip()); await page.waitForTimeout(200); const midT = (await st(page)).plays;
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1200); await page.keyboard.press('Enter'); await page.waitForSelector('.tilt-finish', { timeout: 5000 }); on = await playing(page); s = await st(page);
  ok('15 Quiz Nghiêng Đầu: trả lời xong câu cuối → màn "Hoàn thành" có tiếng mừng (không phát giữa chừng)', on && s.plays === n0 + 1 && midT === n0, [s, midT, n0]);
  await page.evaluate(() => tiltBack()); await stopped(page); await tiltStart(page); n0 = (await st(page)).plays; for (let i = 0; i < 20; i++) await page.evaluate(() => tiltSkip()); await page.waitForSelector('.tilt-finish', { timeout: 5000 }); on = await playing(page);
  ok('16 Quiz Nghiêng Đầu: bỏ qua đến hết câu cũng tới màn "Hoàn thành" có tiếng mừng', on && (await st(page)).plays === n0 + 1);
  await page.evaluate(() => tiltBack()); await stopped(page);

  // ---------- Bóng bay ----------
  await page.evaluate(() => gameSetup('balloon')); await page.waitForSelector('#bbCount'); await page.selectOption('#bbControl', 'touch'); await page.selectOption('#bbCount', '5'); await page.selectOption('#bbSound', '1');
  await play(page, 'mau-1-abcd', 'balloon'); await page.waitForSelector('#bbStage .bb-balloon'); n0 = (await st(page)).plays;
  for (let i = 0; i < 12; i++) { if (await page.$('.bb-end')) break; const m = await page.evaluate(() => hmvBalloon.state().match); if (m && m.phase === 'ask') { await page.click('#bbStage .bb-balloon >> nth=' + m.question.correct, { force: true }).catch(() => {}); await page.waitForTimeout(150); } await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  await page.waitForSelector('.bb-end', { timeout: 8000 }); on = await playing(page); s = await st(page);
  ok('17 Bóng bay: hết câu hỏi → màn kết quả có tiếng mừng', on && s.plays === n0 + 1 && Math.abs(s.volume - 0.9) < 0.01, s);
  await page.click('.bb-end [data-bb="start"]'); off = await stopped(page);
  ok('18 Bóng bay: bấm "Chơi lại" khi tiếng mừng đang phát: tiếng tự tắt', off);
  await page.evaluate(() => { balloonBack(); gameSetup('balloon'); }); await page.waitForSelector('#bbSound'); await page.selectOption('#bbSound', '0'); await page.selectOption('#bbCount', '5'); await page.click('#bbSetup [data-bb="start"], [data-bb="start"]'); await page.waitForSelector('#bbStage .bb-balloon'); n0 = (await st(page)).plays;
  for (let i = 0; i < 12; i++) { if (await page.$('.bb-end')) break; const m = await page.evaluate(() => hmvBalloon.state().match); if (m && m.phase === 'ask') { await page.click('#bbStage .bb-balloon >> nth=' + m.question.correct, { force: true }).catch(() => {}); await page.waitForTimeout(150); } await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  await page.waitForSelector('.bb-end', { timeout: 8000 }); await page.waitForTimeout(600); s = await st(page);
  ok('19 Bóng bay đặt "Âm thanh: Tắt": không phát tiếng mừng', s.plays === n0 && !s.playing && (await page.evaluate(() => hmvBalloon.state().settings.sound === false)), s);
  await page.evaluate(() => { balloonBack(); gameSetup('balloon'); }); await page.waitForSelector('#bbSound'); await page.selectOption('#bbSound', '1'); await page.evaluate(() => balloonBack && balloonBack());

  // ---------- Trò đã có tiếng mừng riêng / không có người thắng: giữ nguyên ----------
  await play(page, 'mau-1-abcd', 'tug'); await page.waitForFunction(() => window.hmvTugState && hmvTugState().match && hmvTugState().match.phase === 'playing', null, { timeout: 8000 }); n0 = (await st(page)).plays;
  for (let i = 0; i < 40; i++) { const c = await page.evaluate(() => { const m = hmvTugState().match; const list = hmvC6QuestionsForGame('tug'); return { m, q: list[m.order[m.q]] }; }); if (c.m.phase !== 'playing') break; if (c.m.answered) { await page.click('#tugNextBtn').catch(() => {}); await page.waitForTimeout(60); continue; } const pick = c.m.current === 0 ? c.q.correct : (c.q.correct + 1) % c.q.answers.length; await page.click('.tug-answers button >> nth=' + pick).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForFunction(() => hmvTugState().match && hmvTugState().match.phase === 'won', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500);
  const tug = await page.evaluate(() => ({ phase: hmvTugState().match && hmvTugState().match.phase, win: window.__audios.filter(a => /assets\/audio\/win\.mp3/.test(a.src)).length, mung: hmvMung.state().plays, playing: hmvMung.state().playing }));
  ok('20 Kéo co (đã có tiếng mừng riêng win.mp3): vẫn dùng tiếng của mình, không phát thêm tiếng mới', tug.phase === 'won' && tug.win >= 1 && tug.mung === n0 && !tug.playing, tug);
  await page.evaluate(() => tugBack());
  await play(page, 'mau-1-abcd', 'poll'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.mode === 'bank', null, { timeout: 12000 }); await page.waitForFunction(() => hmvPoll.state().camera === 'off', null, { timeout: 20000 }); n0 = (await st(page)).plays;
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); await page.click('#games [data-bc="finish"], #games [data-bc="end"]').catch(() => {}); await page.waitForTimeout(600);
  ok('21 Bình chọn ngón tay (không có đội thắng): không phát tiếng mừng', (await st(page)).plays === n0);
  const src = fs.readFileSync(path.join(__dirname, '..', 'main28', 'app', 'index.html'), 'utf8'), wheel = fs.readFileSync(path.join(__dirname, '..', 'main28', 'app', 'vong-quay.js'), 'utf8');
  ok('22 Mã nguồn: Vòng quay và Kéo co không gọi tiếng mừng mới; sáu trò còn lại mỗi trò có lời gọi', !/hmvMung/.test(wheel) && (src.match(/hmvMung\.play\(/g) || []).length === 5 && /hmvMung\.play\(/.test(fs.readFileSync(path.join(__dirname, '..', 'main28', 'app', 'bong-bay.js'), 'utf8')) && !/function winSound\(\)\{[^}]*hmvMung/.test(src), (src.match(/hmvMung\.play\(/g) || []).length);
  ok('23 Không có lỗi JavaScript trong suốt quá trình', logs.filter(l => /PAGEERROR|console.error/.test(l)).length === 0, logs); await browser.close();

  // ---------- Không phát được tệp → dùng tiếng cũ của trò ----------
  ({ browser, page, logs } = await mk(async p => { await p.route('**/mung-chien-thang.mp3*', r => r.abort()); })); page.on('dialog', d => d.accept().catch(() => {}));
  await page.evaluate(() => { window.__osc = 0; const C = window.AudioContext || window.webkitAudioContext, o = C.prototype.createOscillator; C.prototype.createOscillator = function () { window.__osc++; return o.apply(this, arguments); }; });
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); const osc0 = await page.evaluate(() => window.__osc); await page.evaluate(() => buzzEnd()); await page.waitForFunction(() => hmvMung.state().last && hmvMung.state().last.fallback, null, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(300);
  const fb = await page.evaluate(() => ({ last: hmvMung.state().last, playing: hmvMung.state().playing, osc: window.__osc, phase: hmvBuzzState().match.phase, shown: /KẾT QUẢ|Kết quả|thắng|hòa/i.test(document.getElementById('games').innerText) }));
  ok('24 Thiếu tệp tiếng mừng (giả lập): trò vẫn kết thúc bình thường và kêu tiếng "tin tin" cũ thay thế', fb.last && fb.last.fallback === true && !fb.playing && fb.osc >= osc0 + 4 && fb.phase === 'GAME_FINISHED', [fb, osc0]);
  await browser.close();

  // ---------- Ngoại tuyến ----------
  { const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); const pg = await ctx.newPage(); pg.on('dialog', d => d.accept().catch(() => {}));
    await pg.goto('http://127.0.0.1:8780/', { waitUntil: 'load' }); await pg.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(1500);
    const sw = await pg.evaluate(async () => { const names = await caches.keys(); const c = await caches.open(names[0]); const keys = (await c.keys()).map(r => new URL(r.url).pathname); return { names, mp3: keys.includes('/assets/audio/mung-chien-thang.mp3'), js: keys.includes('/mung-chien-thang.js') }; });
    await ctx.setOffline(true); await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.hmvMung && window.questionBankSets && questionBankSets.length > 0, null, { timeout: 15000 });
    const offl = await pg.evaluate(async () => { openView('games'); hmvMung.play(0.6, null, null); await new Promise(r => setTimeout(r, 900)); const s2 = hmvMung.state(); hmvMung.stop(); return { s: s2, marker: document.title }; });
    ok('25 Bộ nhớ ngoại tuyến (hmv-ban-chinh-2.8) có tệp tiếng mừng và mã; ngắt mạng rồi tải lại vẫn phát được', sw.names.join() === 'hmv-ban-chinh-2.8' && sw.mp3 && sw.js && offl.s.playing && !offl.s.last.fallback && /2\.8/.test(offl.marker), [sw, offl]);
    await b.close(); }

  fs.writeFileSync(path.join(__dirname, 'mung-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.8-20261011', note: 'Trình duyệt thử không có loa: kiểm việc tệp được phát, không nghe tiếng thật.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
