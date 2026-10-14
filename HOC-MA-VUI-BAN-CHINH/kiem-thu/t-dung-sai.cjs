// Kiểm thử bản 2.7: tiếng ĐÚNG / SAI (assets/audio/tra-loi-dung.mp3, tra-loi-sai.mp3) khi một câu trả lời được chấm, ở mọi trò chơi.
// Trình duyệt thử KHÔNG có loa: bài này kiểm việc đúng tệp ĐƯỢC PHÁT vào đúng lúc, đúng âm lượng – không nghe được tiếng thật.
// Camera là camera giả của Chromium, bộ nhận diện bàn tay là GIẢ (qa11/fake-hands.mjs), giọng đọc ở phần J là GIẢ (qa13/fake-speech.js).
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/'; const APP = path.join(__dirname, '..', process.env.HMV_DIR || 'main30', 'app');
const fake = fs.readFileSync(path.join(__dirname, '..', 'qa11', 'fake-hands.mjs'), 'utf8');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const get = p => new Promise((resolve, reject) => http.get('http://127.0.0.1:8780' + p, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(c) })); }).on('error', reject));
const INIT = () => { const R = window.Audio; window.__audios = []; window.Audio = function (src) { const a = src === undefined ? new R() : new R(src); window.__audios.push(a); return a; }; window.Audio.prototype = R.prototype; };
const logs = [];
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'], serviceWorkers: 'block' });
  await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); });
  if (opts.route) await opts.route(ctx);
  const page = await ctx.newPage(); if (opts.voice) await page.addInitScript({ path: path.join(__dirname, '..', 'qa13', 'fake-speech.js') }); else await page.addInitScript(INIT);
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && window.hmvPoll && window.hmvDungSai && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 15000 }); await page.waitForTimeout(500);
  return { ctx, page };
}
const play = async (page, setId, g) => { await page.evaluate(() => openView('questions')); await page.waitForTimeout(150); await page.click('#questions [data-kho-play="' + setId + '"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="' + g + '"]'); await page.waitForTimeout(1100); };
const ds = page => page.evaluate(() => { const s = hmvDungSai.state(); s.mung = hmvMung.state().playing; s.srcs = window.__audios.filter(a => !a.paused && !a.ended).map(a => a.src.replace(/^.*\//, '')); return s; });
const sounding = (page, k, t) => page.waitForFunction(k2 => { const s = hmvDungSai.state(); return s.playing === k2 && s.audio[k2].time > 0.03; }, k, { timeout: t || 4000 }).then(() => true, () => false);
const silent = (page, t) => page.waitForFunction(() => !hmvDungSai.state().playing, null, { timeout: t || 4000 }).then(() => true, () => false);
const lvl = v => Math.min(1, 0.5 + v * 0.5); const near = (a, b) => Math.abs(a - b) < 0.011;
const tiltStart = async page => { await play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); for (const b of await page.$$('#tiltSetupModal button')) { if (/Bắt đầu/.test(await b.textContent())) { await b.click(); break; } } await page.waitForSelector('.tilt-question-text'); };
const bellOpen = async page => { await page.evaluate(() => { const m = hmvBuzzState().match; if (m.buzzer === 'LOCKED' && m.phase !== 'REOPENING') buzzOpen(); }); await page.waitForFunction(() => hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 8000 }); };

(async () => {
  // ================= A. Tệp =================
  const fr = await get('/assets/audio/tra-loi-dung.mp3'), fw = await get('/assets/audio/tra-loi-sai.mp3'), js = await get('/dung-sai.js');
  ok('1 Máy chủ trả về hai tệp tiếng ĐÚNG / SAI đúng dạng âm thanh, đúng nguyên tệp trong gói; có tệp mã dung-sai.js', fr.status === 200 && fw.status === 200 && /audio\/mpeg/.test(fr.type) && /audio\/mpeg/.test(fw.type) && fr.body.equals(fs.readFileSync(path.join(APP, 'assets', 'audio', 'tra-loi-dung.mp3'))) && fw.body.equals(fs.readFileSync(path.join(APP, 'assets', 'audio', 'tra-loi-sai.mp3'))) && !fr.body.equals(fw.body) && js.status === 200 && /hmvDungSai/.test(js.body.toString()), [fr.status, fw.status, fr.type, fr.body.length, fw.body.length]);

  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  let { ctx, page } = await open(browser);
  await page.waitForFunction(() => hmvDungSai.state().audio.right.ready >= 1 && hmvDungSai.state().audio.wrong.ready >= 1, null, { timeout: 8000 }).catch(() => {});
  let s = await ds(page);
  ok('2 Mở ứng dụng: hai tệp được nạp sẵn (mỗi tệp dài khoảng 2,4 giây), chưa phát gì', s.right === 0 && s.wrong === 0 && !s.playing && s.audio.right.error === 0 && s.audio.wrong.error === 0 && s.audio.right.duration > 2.2 && s.audio.right.duration < 2.6 && s.audio.wrong.duration > 2.2 && s.audio.wrong.duration < 2.6, s.audio);

  // ================= B. Ai nhanh hơn =================
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await bellOpen(page);
  const bvol = await page.evaluate(() => hmvBuzzState().settings.volume);
  await page.evaluate(() => { buzzClaim(0); }); await page.waitForTimeout(100); await page.evaluate(() => buzzJudge(false)); let on = await sounding(page, 'wrong'); s = await ds(page);
  ok('3 Ai nhanh hơn: đội trả lời SAI → phát tiếng SAI (đúng tệp), âm lượng theo thanh "Tiếng" của trò', on && s.wrong === 1 && s.right === 0 && s.srcs.join() === 'tra-loi-sai.mp3' && near(s.audio.wrong.volume, lvl(bvol)) && !s.last.fallback && s.last.ok === false, s);
  await page.waitForFunction(() => hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 8000 }).catch(() => {}); await page.evaluate(() => { buzzClaim(1); }); await page.waitForTimeout(100); await page.evaluate(() => buzzJudge(true)); on = await sounding(page, 'right'); s = await ds(page);
  ok('4 Đội kia trả lời ĐÚNG ngay sau đó → tiếng SAI tắt, tiếng ĐÚNG phát (không chồng tiếng)', on && s.right === 1 && s.wrong === 1 && s.srcs.join() === 'tra-loi-dung.mp3' && !s.audio.wrong.playing, s);
  await page.evaluate(() => { buzzNext(); }); await page.waitForTimeout(300); await bellOpen(page); await page.evaluate(() => { hmvDungSai.stop(); buzzToggleSound(); }); await page.evaluate(() => { buzzClaim(0); }); await page.waitForTimeout(100); await page.evaluate(() => buzzJudge(true)); await page.waitForTimeout(500); let s2 = await ds(page);
  ok('5 Ai nhanh hơn đang "Tiếng: Tắt": chấm câu không phát tiếng nào', s2.right === 1 && s2.wrong === 1 && !s2.playing && (await page.evaluate(() => hmvBuzzState().settings.sound === false)), s2);
  await page.evaluate(() => { buzzToggleSound(); buzzBack(); });

  // ================= C. Đường đua =================
  await play(page, 'mau-1-abcd', 'race'); await page.waitForSelector('.race-question'); let n = await ds(page);
  await page.evaluate(() => raceJudge(true)); on = await sounding(page, 'right'); s = await ds(page);
  const raceOn = on && s.right === n.right + 1 && near(s.audio.right.volume, 0.8);
  await page.evaluate(() => { try { raceNext(); } catch (e) {} }); await page.waitForSelector('.race-question'); await page.evaluate(() => raceJudge(false)); on = await sounding(page, 'wrong'); s2 = await ds(page);
  ok('6 Đường đua: xác nhận ĐÚNG → tiếng ĐÚNG; xác nhận SAI → tiếng SAI; phát cả khi ô "Tiếng hiệu ứng" của trò còn tắt theo mặc định (âm lượng vừa)', raceOn && on && s2.wrong === n.wrong + 1 && s2.srcs.join() === 'tra-loi-sai.mp3' && near(s2.audio.wrong.volume, 0.8), [s, s2]);
  await page.evaluate(() => raceBack());

  // ================= D. Hộp quà (tự chấm) =================
  const keyOf = () => page.evaluate(() => { const txt = document.querySelector('.gift-question h2').childNodes[0].textContent.trim(); let c = -1; questionBankSets.forEach(st => st.questions.forEach(q => { if ((q.text || q.question) === txt && Number.isInteger(Number(q.correct))) c = Number(q.correct); })); return c; });
  await play(page, 'mau-1-abcd', 'gift'); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question .toolbar'); n = await ds(page); let c = await keyOf();
  await page.click('.gift-answer >> nth=' + c); await page.waitForTimeout(300); const early = await ds(page); on = await sounding(page, 'right'); s = await ds(page);
  ok('7 Hộp quà: chọn đúng phương án đúng → sau gần 1 giây máy tự chấm và phát tiếng ĐÚNG (chưa phát lúc vừa bấm)', early.right === n.right && on && s.right === n.right + 1 && s.wrong === n.wrong && (await page.$('.gift-reward')) !== null, [early.right, s]);
  await page.evaluate(() => { try { giftApply(); } catch (e) {} }); await page.waitForTimeout(300); await page.evaluate(() => giftBox(1)); await page.waitForSelector('.gift-question .toolbar'); c = await keyOf();
  await page.click('.gift-answer >> nth=' + ((c + 1) % 4)); on = await sounding(page, 'wrong'); s2 = await ds(page);
  ok('8 Hộp quà: chọn phương án sai → tiếng SAI', on && s2.wrong === n.wrong + 1 && s2.right === n.right + 1 && s2.srcs.indexOf('tra-loi-sai.mp3') >= 0 && s2.srcs.indexOf('tra-loi-dung.mp3') < 0, s2);
  await page.evaluate(() => giftBack());

  // ================= E. Ai là triệu phú =================
  await play(page, 'mau-1-abcd', 'millionaire'); await page.waitForFunction(() => document.querySelector('#games .millionaire') && millionaireState.choices && millionaireState.choices.length === 4 && !millionaireState.result, null, { timeout: 8000 }); n = await ds(page);
  await page.evaluate(() => millionaireChoose(millionaireState.choices.findIndex(x => x.correct))); await page.waitForTimeout(900); const wait1 = await ds(page); on = await sounding(page, 'right', 5000); s = await ds(page);
  const milOk = wait1.right === n.right && on && s.right === n.right + 1;
  await page.waitForFunction(() => !millionaireState.locked && millionaireState.choices.length === 4 && !millionaireState.result, null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => millionaireChoose(millionaireState.choices.findIndex(x => !x.correct))); on = await sounding(page, 'wrong', 5000); await page.waitForFunction(() => millionaireState.result === 'lose', null, { timeout: 8000 }).catch(() => {}); s2 = await ds(page);
  ok('9 Ai là triệu phú: tiếng vang đúng lúc CÔNG BỐ đáp án (không phải lúc vừa chọn) – đúng thì tiếng ĐÚNG, sai thì tiếng SAI; thua cuộc không có tiếng mừng', milOk && on && s2.wrong === n.wrong + 1 && !s2.mung, [wait1.right, n.right, s, s2]);
  await page.evaluate(() => gameBack()); await silent(page);

  // ================= F. Quiz Nghiêng Đầu =================
  await tiltStart(page); n = await ds(page);
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(k => hmvDungSai.state().right + hmvDungSai.state().wrong > k, n.right + n.wrong, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(150); s = await ds(page);
  const t1 = await page.evaluate(() => ({ text: document.getElementById('games').innerText }));
  const saidRight = /chính xác!|Chính xác/.test(t1.text) && !/chưa chính xác|Chưa chính xác/.test(t1.text);
  ok('10 Quiz Nghiêng Đầu: ghi nhận đáp án → phát đúng một tiếng, khớp với kết quả chấm của trò', s.right + s.wrong === n.right + n.wrong + 1 && !!s.playing && (s.last.ok ? s.playing === 'right' : s.playing === 'wrong'), [s.last, s.playing, saidRight]);
  await page.evaluate(() => tiltBack()); await silent(page);

  // ================= G. Bóng bay (chạm) =================
  await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.waitForSelector('#bbCount'); await page.selectOption('#bbControl', 'touch'); await page.selectOption('#bbCount', '5'); await page.selectOption('#bbSound', '1');
  await play(page, 'mau-1-abcd', 'balloon'); await page.waitForSelector('#bbStage .bb-balloon'); await page.waitForFunction(() => hmvBalloon.state().match.phase === 'ask'); n = await ds(page);
  let m = await page.evaluate(() => hmvBalloon.state().match); await page.click('#bbStage .bb-balloon >> nth=' + m.question.correct, { force: true }); on = await sounding(page, 'right'); s = await ds(page);
  const bbRight = on && s.right === n.right + 1 && near(s.audio.right.volume, 0.9);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvBalloon.state().match.phase === 'ask', null, { timeout: 6000 }); m = await page.evaluate(() => hmvBalloon.state().match);
  await page.click('#bbStage .bb-balloon >> nth=' + ((m.question.correct + 1) % m.question.answers.length), { force: true }); on = await sounding(page, 'wrong'); s2 = await ds(page);
  ok('11 Bóng bay: chạm bóng ĐÚNG → tiếng ĐÚNG; chạm bóng SAI → tiếng SAI', bbRight && on && s2.wrong === n.wrong + 1 && s2.srcs.join() === 'tra-loi-sai.mp3', [s, s2]);
  await page.evaluate(() => { balloonBack(); gameSetup('balloon'); }); await page.waitForSelector('#bbSound'); await page.selectOption('#bbSound', '0'); await page.selectOption('#bbCount', '5'); await page.click('[data-bb="start"]'); await page.waitForSelector('#bbStage .bb-balloon'); await page.waitForFunction(() => hmvBalloon.state().match.phase === 'ask'); await page.evaluate(() => hmvDungSai.stop()); n = await ds(page);
  m = await page.evaluate(() => hmvBalloon.state().match); await page.click('#bbStage .bb-balloon >> nth=' + m.question.correct, { force: true }); await page.waitForTimeout(500); s = await ds(page);
  ok('12 Bóng bay đặt "Âm thanh: Tắt": không phát tiếng đúng/sai', s.right === n.right && s.wrong === n.wrong && !s.playing, s);
  await page.evaluate(() => { balloonBack(); gameSetup('balloon'); }); await page.waitForSelector('#bbSound'); await page.selectOption('#bbSound', '1'); await page.evaluate(() => balloonBack());

  // ================= H. Kéo co =================
  await play(page, 'mau-1-abcd', 'tug'); await page.waitForFunction(() => window.hmvTugState && hmvTugState().match && hmvTugState().match.phase === 'playing', null, { timeout: 8000 }); n = await ds(page);
  const tq = () => page.evaluate(() => { const m2 = hmvTugState().match, list = hmvC6QuestionsForGame('tug'); return { m: m2, q: list[m2.order[m2.q]], vol: hmvTugState().settings ? hmvTugState().settings.volume : null }; });
  let t = await tq(); await page.click('.tug-answers button >> nth=' + t.q.correct); on = await sounding(page, 'right'); s = await ds(page);
  const tugVol = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tk_tug_settings') || localStorage.getItem('tugSettings') || 'null'); } catch (e) { return null; } });
  const tugRight = on && s.right === n.right + 1 && s.srcs.indexOf('tra-loi-dung.mp3') >= 0;
  await page.click('#tugNextBtn').catch(() => {}); await page.waitForFunction(() => !hmvTugState().match.answered, null, { timeout: 5000 }).catch(() => {}); t = await tq();
  await page.click('.tug-answers button >> nth=' + ((t.q.correct + 1) % t.q.answers.length)); on = await sounding(page, 'wrong'); s2 = await ds(page);
  ok('13 Kéo co: chọn đáp án ĐÚNG → tiếng ĐÚNG; chọn SAI → tiếng SAI', tugRight && on && s2.wrong === n.wrong + 1 && s2.srcs.indexOf('tra-loi-sai.mp3') >= 0 && s2.srcs.indexOf('tra-loi-dung.mp3') < 0, [s, s2, tugVol && tugVol.volume]);
  for (let i = 0; i < 60; i++) { t = await tq(); if (t.m.phase !== 'playing') break; if (t.m.answered) { await page.click('#tugNextBtn').catch(() => {}); await page.waitForTimeout(50); continue; } const pick = t.m.current === 0 ? t.q.correct : (t.q.correct + 1) % t.q.answers.length; await page.click('.tug-answers button >> nth=' + pick).catch(() => {}); await page.waitForTimeout(50); }
  await page.waitForFunction(() => hmvTugState().match && hmvTugState().match.phase === 'won', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400); s = await ds(page);
  ok('14 Kéo co: câu quyết định thắng cuộc → tiếng mừng win.mp3 của trò vang lên, tiếng đúng/sai nhường chỗ (không chồng)', (await page.evaluate(() => hmvTugState().match.phase)) === 'won' && s.srcs.indexOf('win.mp3') >= 0 && !s.playing && s.srcs.indexOf('tra-loi-dung.mp3') < 0, s);
  await page.evaluate(() => tugBack());

  // ================= I. Bình chọn ngón tay =================
  const setup = async (sel = {}) => { await page.evaluate(() => { openView('games'); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); for (const [k, v] of Object.entries(sel)) await page.selectOption('#' + k, String(v)); };
  const hands = list => page.evaluate(l => { window.__hands = l; }, list);
  const countAndWait = async () => { await page.click('#bcControls [data-bc="count"]'); await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 20000 }); };
  await setup({ bcSource: 'bank', bcControl: 'camera', bcTime: 4 }).catch(async () => { await setup({ bcSource: 'bank', bcTime: 4 }); });
  await page.evaluate(() => { openView('questions'); }); await play(page, 'mau-1-abcd', 'poll'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.mode === 'bank' && hmvPoll.state().camera === 'ready', null, { timeout: 20000 });
  let pq = await page.evaluate(() => hmvPoll.state().match.question); n = await ds(page);
  await hands([{ x: .2, y: .3, n: pq.correct + 1 }, { x: .5, y: .3, n: pq.correct + 1 }, { x: .8, y: .3, n: ((pq.correct + 1) % 4) + 1 }]); await page.waitForTimeout(500); await countAndWait(); on = await sounding(page, 'right'); s = await ds(page);
  const pollRight = on && s.right === n.right + 1 && s.wrong === n.wrong;
  await page.click('#bcControls [data-bc="next"]'); await page.waitForFunction(() => hmvPoll.state().match.phase === 'ready'); pq = await page.evaluate(() => hmvPoll.state().match.question);
  await hands([{ x: .2, y: .3, n: ((pq.correct + 1) % 4) + 1 }, { x: .5, y: .3, n: ((pq.correct + 1) % 4) + 1 }, { x: .8, y: .3, n: pq.correct + 1 }]); await page.waitForTimeout(500); await countAndWait(); on = await sounding(page, 'wrong'); s2 = await ds(page);
  ok('15 Bình chọn ngón tay (câu có đáp án): hết giờ đếm, đáp án đúng được nhiều phiếu nhất → tiếng ĐÚNG; phương án sai nhiều phiếu hơn → tiếng SAI', pollRight && on && s2.wrong === n.wrong + 1 && s2.right === n.right + 1, [s, s2]);
  await page.click('#bcControls [data-bc="next"]'); await page.waitForFunction(() => hmvPoll.state().match.phase === 'ready'); await hands([]); await page.waitForTimeout(400); n = await ds(page); await silent(page);
  await page.keyboard.press('Digit1'); await page.keyboard.press('Digit1'); await page.waitForTimeout(400); s = await ds(page);
  ok('16 Bình chọn: thầy cô nhập phiếu bằng phím số (không đếm bằng camera) → không phát tiếng đúng/sai sau mỗi lần bấm', s.right === n.right && s.wrong === n.wrong && (await page.evaluate(() => hmvPoll.state().match.tally.join())) === '2,0,0,0', s);
  await page.evaluate(() => pollBack()); await setup({ bcSource: 'quick', bcTime: 4 }); await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); n = await ds(page);
  await hands([{ x: .2, y: .3, n: 1 }, { x: .5, y: .3, n: 2 }]); await page.waitForTimeout(500); await countAndWait(); await page.waitForTimeout(400); s = await ds(page);
  ok('17 Bình chọn kiểu "Hỏi nhanh" (khảo sát ý kiến, không có đáp án đúng): giữ tiếng báo cũ, không phát tiếng đúng/sai', s.right === n.right && s.wrong === n.wrong && !s.playing, s);
  await hands([]); await page.evaluate(() => pollBack());

  // ================= J. Phối hợp với tiếng mừng và giọng đọc =================
  await page.evaluate(() => openView('games'));
  await page.evaluate(() => { hmvDungSai.play(true, 0.6); }); await sounding(page, 'right'); await page.evaluate(() => { hmvDungSai.play(false, 0.6); }); on = await sounding(page, 'wrong'); s = await ds(page);
  ok('18 Hai câu chấm liên tiếp rất nhanh: chỉ tiếng sau cùng còn phát', on && !s.audio.right.playing && s.audio.wrong.playing, s.audio);
  await page.evaluate(() => { hmvMung.play(0.6, null, null); }); await page.waitForFunction(() => hmvMung.state().playing, null, { timeout: 4000 }).catch(() => {}); s = await ds(page); const before = s.wrong;
  await page.evaluate(() => { hmvDungSai.play(false, 0.6); }); await page.waitForTimeout(300); s2 = await ds(page);
  ok('19 Tiếng mừng chiến thắng vang lên → tiếng đúng/sai đang phát tắt ngay; đang có tiếng mừng thì không chen tiếng đúng/sai vào', !s.playing && s.mung && !s2.playing && s2.mung && s2.wrong === before + 1 && /tiếng mừng/.test(s2.last.skipped), [s.playing, s2.last]);
  await page.evaluate(() => hmvMung.stop());
  ok('20 Suốt các trò trên không có lỗi JavaScript', logs.length === 0, logs); logs.length = 0; await ctx.close();

  ({ ctx, page } = await open(browser, { voice: true })); await page.evaluate(() => { openView('games'); window.__speechMs = 1500; });
  await page.evaluate(() => { hmvDungSai.play(true, 0.6); }); await sounding(page, 'right'); await page.evaluate(() => { hmvDocTo.speak('Câu tiếp theo: năm cộng ba bằng mấy?'); }); const cut = await silent(page, 1500); const spoke = await page.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 5000 }).then(() => true, () => false);
  ok('21 Máy cất giọng đọc câu kế tiếp khi tiếng đúng/sai còn ngân → tiếng tự tắt, giọng đọc vẫn đọc hết câu', cut && spoke);
  await page.evaluate(() => { hmvDocTo.speak('Tám nhân bảy bằng bao nhiêu? A, năm mươi tư. B, năm mươi sáu.'); }); await page.waitForFunction(() => window.hmvDuck < 1, null, { timeout: 3000 }).catch(() => {}); await page.evaluate(() => { hmvDungSai.play(false, 0.6); }); await page.waitForTimeout(700); s = await ds(page);
  ok('22 Học sinh trả lời khi máy còn đang đọc câu hỏi → tiếng đúng/sai vẫn phát trọn (không bị giọng đọc cắt)', s.playing === 'wrong' && s.audio.wrong.time > 0.4 && (await page.evaluate(() => window.hmvDuck < 1)), [s.playing, s.audio.wrong.time]);
  await page.evaluate(() => { hmvDocTo.stop(); hmvDungSai.stop(); }); await ctx.close();

  // ================= K. Thiếu tệp → tiếng cũ của trò =================
  ({ ctx, page } = await open(browser, { route: async c2 => { await c2.route('**/tra-loi-*.mp3*', r => r.abort()); } }));
  await page.evaluate(() => { window.__osc = 0; const C = window.AudioContext || window.webkitAudioContext, o = C.prototype.createOscillator; C.prototype.createOscillator = function () { window.__osc++; return o.apply(this, arguments); }; });
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await bellOpen(page); await page.evaluate(() => { buzzClaim(0); }); await page.waitForTimeout(100); const osc0 = await page.evaluate(() => window.__osc);
  await page.evaluate(() => buzzJudge(true)); await page.waitForFunction(() => hmvDungSai.state().last && hmvDungSai.state().last.fallback, null, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(300);
  const fb = await page.evaluate(() => ({ last: hmvDungSai.state().last, playing: hmvDungSai.state().playing, osc: window.__osc, score: hmvBuzzState().match.scores.slice(), phase: hmvBuzzState().match.phase }));
  ok('23 Thiếu tệp tiếng đúng/sai (giả lập): trò vẫn chấm điểm bình thường và kêu tiếng "bíp" cũ thay thế', fb.last && fb.last.fallback === true && !fb.playing && fb.osc >= osc0 + 4 && fb.score[0] > 0 && fb.phase === 'QUESTION_FINISHED', [fb, osc0]);
  ok('24 Trường hợp thiếu tệp không gây lỗi JavaScript', logs.length === 0, logs); await ctx.close(); await browser.close();

  // ================= L. Ngoại tuyến =================
  { const b = await chromium.launch(); const c3 = await b.newContext({ viewport: { width: 1366, height: 768 } }); const pg = await c3.newPage(); pg.on('dialog', d => d.accept().catch(() => {}));
    await pg.goto(BASE, { waitUntil: 'load' }); await pg.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(1500);
    const sw = await pg.evaluate(async () => { const names = await caches.keys(); const c4 = await caches.open(names[0]); const keys = (await c4.keys()).map(r => new URL(r.url).pathname); return { names, right: keys.includes('/assets/audio/tra-loi-dung.mp3'), wrong: keys.includes('/assets/audio/tra-loi-sai.mp3'), js: keys.includes('/dung-sai.js') }; });
    await c3.setOffline(true); await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.hmvDungSai && window.questionBankSets && questionBankSets.length > 0, null, { timeout: 15000 });
    const offl = await pg.evaluate(async () => { openView('games'); hmvDungSai.play(true, 0.6); await new Promise(r => setTimeout(r, 700)); const a = hmvDungSai.state(); hmvDungSai.play(false, 0.6); await new Promise(r => setTimeout(r, 700)); const w = hmvDungSai.state(); hmvDungSai.stop(); return { a: a.playing, af: a.last.fallback, w: w.playing, wf: w.last.fallback, marker: document.title }; });
    ok('25 Bộ nhớ ngoại tuyến (hmv-ban-chinh-2.11) có hai tệp tiếng và mã; ngắt mạng rồi tải lại vẫn phát được cả hai', sw.names.join() === 'hmv-ban-chinh-2.11' && sw.right && sw.wrong && sw.js && offl.a === 'right' && offl.w === 'wrong' && !offl.af && !offl.wf && /2\.11/.test(offl.marker), [sw, offl]);
    await b.close(); }

  // ================= M. Mã nguồn =================
  const src = fs.readFileSync(path.join(APP, 'index.html'), 'utf8'), wheel = fs.readFileSync(path.join(APP, 'vong-quay.js'), 'utf8');
  const calls = (src.match(/hmvDungSai\.play\(/g) || []).length;
  ok('26 Mã nguồn: sáu trò trong index.html (Kéo co, Ai nhanh hơn, Đường đua, Hộp quà, Nghiêng Đầu, Triệu phú) + Bóng bay + Bình chọn đều có lời gọi; Vòng quay (không có câu trả lời) không gọi', calls === 6 && /hmvDungSai\.play\(/.test(fs.readFileSync(path.join(APP, 'bong-bay.js'), 'utf8')) && /hmvDungSai\.play\(/.test(fs.readFileSync(path.join(APP, 'binh-chon.js'), 'utf8')) && !/hmvDungSai/.test(wheel), calls);

  fs.writeFileSync(path.join(__dirname, 'dung-sai-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.11-20261014', note: 'Trình duyệt thử không có loa: kiểm việc đúng tệp được phát đúng lúc, không nghe tiếng thật. Camera, bàn tay và giọng đọc là giả lập.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
