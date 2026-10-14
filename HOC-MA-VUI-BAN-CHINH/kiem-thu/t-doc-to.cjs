// Kiểm thử bản 2.2 + 2.4: Đọc to câu hỏi (2.4: không lời dẫn, chờ đọc xong mới tính giờ, bảng chọn nhanh trong trò chơi). Giọng đọc của trình duyệt là GIẢ (fake-speech.js), giọng AI qua Gemini GIẢ (mock-gemini.cjs).
const { open, play } = require('../qa8/lib.cjs'); const http = require('http'), fs = require('fs'), path = require('path');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
function rq(method, p, body, port) { return new Promise((resolve, reject) => { const data = body == null ? null : Buffer.from(JSON.stringify(body)); const r = http.request({ method, hostname: '127.0.0.1', port: port || 8780, path: p, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} }, x => { const c = []; x.on('data', d => c.push(d)); x.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(c).toString('utf8')); } catch (e) {} resolve({ status: x.statusCode, json: j }); }); }); r.on('error', reject); if (data) r.write(data); r.end(); }); }
const last = () => rq('GET', '/__last', null, 8799).then(r => r.json);
const mk = (mode, vp) => open({ viewport: vp || { width: 1366, height: 768 }, blockSW: true, beforeLoad: async p => { await p.addInitScript(m => { window.__fakeVoiceMode = m; }, mode); await p.addInitScript({ path: path.join(__dirname, 'fake-speech.js') }); } });
const st = page => page.evaluate(() => hmvDocTo.state());
const spoken = page => page.evaluate(() => window.__spoken.map(s => s.text).join(' '));
const clearSpoken = page => page.evaluate(() => { window.__spoken.length = 0; });
const idle = (page, t) => page.waitForFunction(() => hmvDocTo.state().state === 'idle', null, { timeout: t || 8000 });
const btn = sel => sel + ' .hmv-dt-btn';
const tiltStart = async page => { await play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); for (const b of await page.$$('#tiltSetupModal button')) { if (/Bắt đầu/.test(await b.textContent())) { await b.click(); break; } } await page.waitForSelector('.tilt-question-text'); };
const readOnce = async (page, sel) => { await clearSpoken(page); const want = await page.evaluate(() => hmvDocTo._test.build()); await page.click(btn(sel)); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle', null, { timeout: 8000 }); return { want, got: await spoken(page), cur: await page.evaluate(() => hmvDocTo._test.current()) }; };

(async () => {
  await rq('POST', '/__mode', { mode: 'normal' }, 8799); await rq('POST', '/api/ai/key', { key: '' });

  // ================= A. Máy chưa có giọng tiếng Việt, chưa có khóa =================
  let { browser, page, logs } = await mk('none'); page.on('dialog', d => d.accept().catch(() => {}));
  await play(page, 'mau-1-abcd', 'tug'); await page.waitForSelector('.tug-question h2'); await page.waitForTimeout(900);
  let s = await st(page);
  ok('1 Máy không có giọng tiếng Việt và chưa có khóa: không hiện nút loa trong trò chơi (không có nút bấm không kêu)', !s.ready && s.voices.length === 0 && (await page.$$('.hmv-dt-btn')).length === 0, s);
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#troLyAI .dt-card');
  let card = await page.evaluate(() => ({ text: document.querySelector('#troLyAI .dt-card').innerText, tryOff: document.getElementById('dtTry').disabled, voiceOff: document.getElementById('dtVoice').disabled, aiOff: document.getElementById('dtAiVoice').disabled }));
  ok('2 Trợ lý AI → Kết nối AI có phần "Đọc to câu hỏi": báo rõ máy chưa có giọng và nêu hai cách bật (Gemini, giọng tiếng Việt của Windows); nút Nghe thử bị khóa', /chưa có giọng đọc tiếng Việt/.test(card.text) && /Giọng AI Gemini/.test(card.text) && /Giọng nói \(Speech\)/.test(card.text) && /Thêm giọng nói/.test(card.text) && card.tryOff && card.voiceOff && card.aiOff, card);
  await page.evaluate(() => window.__setVoices('vi')); await page.waitForFunction(() => /Microsoft An/.test(document.querySelector('#troLyAI .dt-card').innerText));
  card = await page.evaluate(() => ({ text: document.querySelector('#troLyAI .dt-card').innerText, tryOff: document.getElementById('dtTry').disabled }));
  ok('3 Cài thêm giọng tiếng Việt khi ứng dụng đang mở: phần cài đặt tự nhận giọng mới, mở nút Nghe thử', /Đang dùng giọng tiếng Việt của máy: Microsoft An/.test(card.text) && /không cần mạng/.test(card.text) && !card.tryOff, card);
  await page.click('#dtTry'); await page.waitForFunction(() => window.__spoken.length >= 1 && hmvDocTo.state().state === 'idle', null, { timeout: 8000 });
  const tryText = await spoken(page), tryNote = await page.textContent('#dtTryNote');
  ok('4 Nghe thử: đọc thẳng câu mẫu (không lời chào, không lời dẫn) bằng giọng của máy, phép tính được đọc thành lời; hiện thời gian', /^27 cộng 15 bằng bao nhiêu\?/.test(tryText) && /A, 32\. B, 42\./.test(tryText) && /Giọng của máy · \d/.test(tryNote), [tryText, tryNote]);
  await page.evaluate(() => openView('games')); await page.waitForSelector(btn('.tug-question h2'), { timeout: 4000 }).catch(() => {});
  ok('5 Quay lại trò chơi đang mở: nút loa đã hiện sau câu hỏi', (await page.$$(btn('.tug-question h2'))).length === 1);
  ok('6 Phần A không có lỗi JavaScript', logs.filter(l => /PAGEERROR|console.error/.test(l)).length === 0, logs); await browser.close();

  // ================= B. Máy có giọng tiếng Việt =================
  ({ browser, page, logs } = await mk('vi')); page.on('dialog', d => d.accept().catch(() => {}));
  await play(page, 'mau-1-abcd', 'tug'); await page.waitForSelector(btn('.tug-question h2'));
  let info = await page.evaluate(() => { const h = document.querySelector('.tug-question h2'), b = h.querySelector('.hmv-dt-btn'), m = hmvTugState().match, r = b.getBoundingClientRect(), box = document.querySelector('.tug-question').getBoundingClientRect(); return { h2: h.textContent, cur: hmvDocTo._test.current(), n: document.querySelectorAll('.hmv-dt-btn').length, label: b.getAttribute('aria-label'), title: b.title, btnText: b.textContent, type: b.type, w: r.width, hgt: r.height, inside: r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom, qIndex: m.q === undefined ? m.index : m.q }; });
  ok('7 Kéo co: đúng một nút loa nằm ngay sau câu hỏi, trong khung câu hỏi; chữ câu hỏi không bị đổi; nút có nhãn cho trình đọc màn hình và đủ lớn để chạm', info.n === 1 && info.h2 === info.cur.text && info.btnText === '' && info.label === 'Đọc to câu hỏi' && info.type === 'button' && info.w >= 36 && info.hgt >= 36 && info.inside && info.cur.answers.length === 4, info);
  const before = await page.evaluate(() => JSON.stringify(hmvTugState().match));
  await clearSpoken(page); const want = await page.evaluate(() => hmvDocTo._test.build()); await page.click(btn('.tug-question h2'));
  await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const mid = await page.evaluate(() => { const b = document.querySelector('.hmv-dt-btn'); return { cls: b.className, pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'), duck: window.hmvDuck }; });
  await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle', null, { timeout: 8000 });
  const sp = await page.evaluate(() => window.__spoken.slice()), after = await page.evaluate(() => ({ cls: document.querySelector('.hmv-dt-btn').className, duck: window.hmvDuck, match: JSON.stringify(hmvTugState().match) }));
  ok('8 Bấm nút loa: đọc đúng câu hỏi rồi lần lượt A, B, C, D bằng giọng tiếng Việt của máy, tốc độ vừa', sp.map(x => x.text).join(' ') === want && /A, .*B, .*C, .*D, /.test(want) && sp.every(x => /Microsoft An/.test(x.voice) && x.rate === 0.95 && x.lang === 'vi-VN'), [want, sp]);
  ok('9 Trong lúc đọc: nút đổi sang trạng thái "Dừng đọc"; nhạc nền được yêu cầu nhỏ lại; đọc xong mọi thứ trở về như cũ', /speaking/.test(mid.cls) && mid.pressed === 'true' && mid.label === 'Dừng đọc' && mid.duck === 0.25 && !/speaking|loading/.test(after.cls) && after.duck === 1, [mid, after]);
  const strip = t => { const o = JSON.parse(t); ['left', 'timeLeft', 'elapsed', 'time', 'seconds', 'lastTick', 'startedAt', 'questionLeft', 'turnLeft'].forEach(k => delete o[k]); return JSON.stringify(o); };
  const m0 = JSON.parse(before), m1 = JSON.parse(after.match);
  ok('10 Bấm nút loa không chọn đáp án, không đổi lượt, không đổi điểm của trận đang chơi', m1.selected === m0.selected && m1.answered === m0.answered && JSON.stringify(m1.scores) === JSON.stringify(m0.scores) && m1.turn === m0.turn && m1.phase === m0.phase, [before.slice(0, 300), after.match.slice(0, 300)]);
  await page.evaluate(() => { window.__speechMs = 6000; }); await clearSpoken(page); await page.click(btn('.tug-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking');
  const c0 = await page.evaluate(() => window.__cancels || 0); await page.click(btn('.tug-question h2')); await page.waitForTimeout(300);
  let s2 = await page.evaluate(() => ({ state: hmvDocTo.state().state, cancels: window.__cancels || 0, spoken: window.__spoken.length, duck: window.hmvDuck }));
  ok('11 Bấm lần nữa khi đang đọc: dừng ngay', s2.state === 'idle' && s2.cancels > c0 && s2.spoken === 0 && s2.duck === 1, s2);
  // nhạc nền Kéo co nhỏ lại
  await page.click(btn('.tug-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(900);
  const vol = await page.evaluate(() => { const a = window.__audios.filter(x => /background\.mp3|blob:/.test(x.src) && x.loop)[0]; return { v: a ? a.volume : null, base: hmvTugState().settings.musicVolume, on: hmvTugState().settings.music }; });
  // sang câu khác khi đang đọc
  const q1 = await page.evaluate(() => hmvDocTo._test.current().text); await page.evaluate(() => tugSelect(0)); await page.waitForFunction(t => { const c = hmvDocTo._test.current(); return c && c.text !== t; }, q1, { timeout: 15000 }); await page.waitForTimeout(250);
  s2 = await page.evaluate(() => ({ state: hmvDocTo.state().state, n: document.querySelectorAll('.tug-question h2 .hmv-dt-btn').length, cls: document.querySelector('.hmv-dt-btn').className, duck: window.hmvDuck })); await page.waitForTimeout(900);
  const vol2 = await page.evaluate(() => { const a = window.__audios.filter(x => /background\.mp3|blob:/.test(x.src) && x.loop)[0]; return a ? a.volume : null; });
  ok('12 Kéo co: nhạc nền nhỏ còn một phần tư khi đang đọc, đọc xong trở lại mức cũ', vol.on && vol.v !== null && Math.abs(vol.v - vol.base * 0.25) < 0.01 && Math.abs(vol2 - vol.base) < 0.01, [vol, vol2]);
  ok('13 Sang câu mới khi đang đọc: thôi đọc câu cũ, nút loa có ở câu mới', s2.state === 'idle' && s2.n === 1 && !/speaking/.test(s2.cls) && s2.duck === 1, s2);
  await page.evaluate(() => { window.__speechMs = 300; });

  // từng trò
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector(btn('.buzz-question h2')); let r = await readOnce(page, '.buzz-question h2');
  ok('14 Ai nhanh hơn: có nút loa, đọc câu hỏi và 4 phương án', r.got === r.want && r.cur.game === 'buzzer' && r.cur.answers.length === 4 && /A, /.test(r.got), r);
  await page.evaluate(() => { window.__speechMs = 4000; }); await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(900);
  const bz1 = await page.evaluate(() => ({ g: window.__gains.map(x => x.gain.value), el: window.__audios.filter(x => x.loop).map(x => x.volume), base: hmvBuzzState().settings ? hmvBuzzState().settings.musicVolume : null, music: hmvBuzzState().settings ? hmvBuzzState().settings.music : null })); await page.click(btn('.buzz-question h2')); await page.waitForTimeout(900);
  const bz2 = await page.evaluate(() => ({ g: window.__gains.map(x => x.gain.value), el: window.__audios.filter(x => x.loop).map(x => x.volume) })); await page.evaluate(() => { window.__speechMs = 300; });
  const bzPairs = bz1.g.map((v, i) => [v, bz2.g[i]]).concat(bz1.el.map((v, i) => [v, bz2.el[i]])).filter(p2 => p2[1] > 0.05 && Math.abs(p2[0] - p2[1] * 0.25) < 0.005);
  ok('14b Ai nhanh hơn: nhạc nền riêng của trò cũng nhỏ còn một phần tư khi đang đọc, dừng đọc thì trở lại', bzPairs.length >= 1, [bz1, bz2]);
  const hBuzz = await page.evaluate(() => { const h = document.querySelector('.buzz-question h2'), b = h.querySelector('.hmv-dt-btn'); const a = h.getBoundingClientRect().height; b.style.setProperty('display', 'none', 'important'); const c = h.getBoundingClientRect().height; b.style.removeProperty('display'); return [a, c, document.documentElement.scrollWidth <= window.innerWidth + 1]; });
  ok('15 Nút loa không làm khung câu hỏi cao thêm, không gây tràn ngang (1366×768)', Math.abs(hBuzz[0] - hBuzz[1]) <= 2 && hBuzz[2], hBuzz);
  await play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(400); await page.evaluate(() => giftBox(0)); await page.waitForSelector(btn('.gift-question h2')); r = await readOnce(page, '.gift-question h2');
  const names = await page.evaluate(() => (typeof students !== 'undefined' ? students : []).map(x => x.name).filter(n => n.split(' ').length >= 2));
  ok('16 Hộp quà: đọc câu hỏi và phương án; không đọc tên học sinh đang đến lượt', r.got === r.want && r.cur.game === 'gift' && r.cur.answers.length === 4 && names.length > 5 && names.every(n => !r.got.includes(n)), r);
  await play(page, 'mau-1-abcd', 'race'); await page.waitForSelector(btn('.race-question h2')); r = await readOnce(page, '.race-question h2');
  ok('17 Đường đua: có nút loa, đọc câu hỏi và phương án', r.got === r.want && r.cur.game === 'race' && r.cur.answers.length === 4, r);
  await play(page, 'mau-1-abcd', 'millionaire'); await page.waitForSelector(btn('.millionaire-question-text')); r = await readOnce(page, '.millionaire-question-text');
  const shown = await page.evaluate(() => Array.from(document.querySelectorAll('.millionaire-answer')).map(b => b.textContent.trim()));
  ok('18 Chinh phục tri thức: đọc phương án theo đúng thứ tự đang hiện trên màn hình (đã xáo trộn)', r.got === r.want && r.cur.answers.length === 4 && r.cur.answers.every((a, i) => shown[i] === a.letter + '. ' + a.text), [r, shown]);
  await page.evaluate(() => millionaireUseFifty()); await page.waitForTimeout(400); await page.waitForSelector(btn('.millionaire-question-text')); r = await readOnce(page, '.millionaire-question-text');
  const hid = await page.evaluate(() => millionaireState.hidden.slice());
  ok('19 Sau trợ giúp 50:50: chỉ đọc hai phương án còn lại', hid.length === 2 && r.cur.answers.length === 2 && r.cur.answers.every(a => hid.indexOf(a.letter.charCodeAt(0) - 65) < 0) && r.got === r.want, [r, hid]);
  await clearSpoken(page); await page.evaluate(() => { window.__speechMs = 4000; }); await page.click(btn('.millionaire-question-text')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(800);
  const g1 = await page.evaluate(() => hmvMusic.state()); await page.click(btn('.millionaire-question-text')); await page.waitForTimeout(800); const g2 = await page.evaluate(() => hmvMusic.state()); await page.evaluate(() => { window.__speechMs = 300; });
  ok('20 Nhạc nền chung của các trò (Chinh phục tri thức): nhỏ còn một phần tư khi đang đọc, dừng đọc thì trở lại', g1.gain !== null && g2.gain !== null && Math.abs(g1.gain - g2.gain * 0.25) < 0.005 && g2.gain > 0.1, [g1, g2]);
  await tiltStart(page); await page.waitForSelector(btn('.tilt-question-text')); r = await readOnce(page, '.tilt-question-text');
  ok('21 Quiz Nghiêng Đầu: đọc thẳng mệnh đề đang hiện, không thêm lời dẫn, không đọc A/B', !/Đúng hay sai/.test(r.got) && r.got === (await page.evaluate(() => hmvDocTo._test.say(hmvDocTo._test.current().text))) && r.got === r.want && !/A, /.test(r.got) && r.cur.game === 'head-tilt', r);
  await play(page, 'mau-1-abcd', 'balloon'); await page.waitForSelector(btn('#bbQuestion')); const ph0 = await page.evaluate(() => hmvBalloon.state().match.phase); r = await readOnce(page, '#bbQuestion'); const ph1 = await page.evaluate(() => ({ phase: hmvBalloon.state().match.phase, q: hmvBalloon.state().match.question.text, dom: document.getElementById('bbQuestion').textContent }));
  ok('22 Bóng bay: đọc câu hỏi và chữ trên 4 quả bóng; bấm loa không làm vỡ bóng, không đổi câu', r.got === r.want && r.cur.answers.length === 4 && r.cur.answers.map(a => a.letter).join('') === 'ABCD' && ph0 === 'ask' && ph1.phase === 'ask' && ph1.dom === ph1.q, [r, ph0, ph1]);
  await play(page, 'mau-1-abcd', 'poll'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.mode === 'bank', null, { timeout: 12000 }); await page.waitForSelector(btn('#bcQuestion')); r = await readOnce(page, '#bcQuestion');
  const pv = await page.evaluate(() => hmvPoll.state().match.votes || hmvPoll.state().match.counts || null);
  ok('23 Bình chọn ngón tay (dùng bộ câu hỏi): đọc câu hỏi và 4 phương án; không thêm phiếu', r.got === r.want && r.cur.game === 'poll' && r.cur.answers.length === 4 && Array.from(await page.$$eval('#bcStage [data-bc-num]', e => e.map(x => x.textContent))).every(x => x === '0'), [r, pv]);
  await page.evaluate(() => { pollBack(); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); await page.selectOption('#bcSource', 'quick'); await page.selectOption('#bcControl', 'manual'); await page.click('#bcSetup [data-bc="start"]'); await page.waitForSelector('#bcQuestion.quick'); await page.waitForTimeout(900);
  ok('24 Bình chọn "Hỏi nhanh" (thầy cô tự đọc câu hỏi): không hiện nút loa', (await page.$$('.hmv-dt-btn')).length === 0);
  await page.evaluate(() => { pollBack(); openView('games'); gameSetup('paper-mode'); }); await page.waitForTimeout(400); await page.evaluate(() => { paperStartRound(); const m = document.getElementById('paperSetupModal'); if (m) { const c = Array.from(m.querySelectorAll('button')).find(b => /Đóng|×|✕/.test(b.textContent)); if (c) c.click(); else m.remove(); } }); await page.waitForSelector(btn('.paper-question')); r = await readOnce(page, '.paper-question');
  ok('25 Chế độ giấy: có nút loa, đọc câu hỏi và 4 phương án', r.got === r.want && r.cur.game === 'paper' && r.cur.answers.length === 4, r);
  ok('26 Mỗi lúc chỉ có một nút loa trên màn hình', (await page.$$('.hmv-dt-btn')).length === 1);

  // cài đặt
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#dtAnswers'); await page.uncheck('#dtAnswers'); await page.selectOption('#dtRate', '0.8');
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector(btn('.buzz-question h2')); await clearSpoken(page); await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle');
  const only = await page.evaluate(() => ({ sp: window.__spoken.slice(), q: hmvDocTo._test.say(hmvDocTo._test.current().text), ls: JSON.parse(localStorage.getItem('hmv_doc_to_v1')) }));
  ok('27 Tắt "Đọc cả các phương án" và chọn tốc độ Chậm: chỉ đọc câu hỏi, tốc độ 0,8; lựa chọn được ghi nhớ', only.sp.length === 1 && only.sp[0].text === only.q && only.sp[0].rate === 0.8 && only.ls.answers === false && only.ls.rate === 0.8, only);
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.hmvDocTo && window.hmvTroLyAI && window.questionBankSets && questionBankSets.length > 0); await page.waitForTimeout(1200); await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#dtAnswers');
  const kept = await page.evaluate(() => ({ a: document.getElementById('dtAnswers').checked, r: document.getElementById('dtRate').value, cfg: hmvDocTo.state().cfg }));
  ok('28 Tải lại trang: cài đặt đọc to vẫn còn', kept.a === false && kept.r === '0.8' && kept.cfg.answers === false && kept.cfg.rate === 0.8, kept);
  await page.check('#dtAnswers'); await page.selectOption('#dtRate', '0.95'); await page.check('#dtAuto'); await clearSpoken(page);
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector(btn('.buzz-question h2')); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle', null, { timeout: 8000 }).catch(() => {});
  const auto1 = await spoken(page), wantA = await page.evaluate(() => hmvDocTo._test.build()); await clearSpoken(page);
  const qa = await page.evaluate(() => hmvDocTo._test.current().text); await page.evaluate(() => buzzNext()); await page.waitForFunction(t => { const c = hmvDocTo._test.current(); return c && c.text !== t; }, qa, { timeout: 8000 }); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle', null, { timeout: 8000 }).catch(() => {});
  const auto2 = await spoken(page), wantB = await page.evaluate(() => hmvDocTo._test.build());
  ok('29 Bật "Tự đọc mỗi khi sang câu mới": vào trò chơi tự đọc câu đầu, sang câu sau tự đọc tiếp, mỗi câu đúng một lần', auto1 === wantA && auto2 === wantB && wantA !== wantB, [auto1, wantA, auto2, wantB]);
  await page.evaluate(() => { window.__speechMs = 6000; }); await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.evaluate(() => openView('home')); await page.waitForTimeout(400);
  s2 = await page.evaluate(() => ({ state: hmvDocTo.state().state, duck: window.hmvDuck, n: document.querySelectorAll('.hmv-dt-btn').length })); await page.evaluate(() => { window.__speechMs = 300; });
  ok('30 Rời trò chơi khi đang đọc: dừng đọc, trả lại âm lượng nhạc', s2.state === 'idle' && s2.duck === 1, s2);
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#dtAuto'); await page.uncheck('#dtAuto');
  // lỗi của giọng máy, không có AI dự phòng
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector(btn('.buzz-question h2')); await page.evaluate(() => { window.__speechFail = 'synthesis-failed'; }); await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => /không đọc được/.test(document.getElementById('toast').textContent), null, { timeout: 5000 }).catch(() => {});
  s2 = await page.evaluate(() => ({ state: hmvDocTo.state().state, toast: document.getElementById('toast').textContent, duck: window.hmvDuck, cls: document.querySelector('.hmv-dt-btn').className })); await page.evaluate(() => { window.__speechFail = ''; });
  ok('31 Giọng của máy báo lỗi (không có giọng AI dự phòng): báo rõ, nút không kẹt ở trạng thái đang đọc', s2.state === 'idle' && /không đọc được bằng giọng này/.test(s2.toast) && s2.duck === 1 && !/speaking|loading/.test(s2.cls), s2);
  // bố cục ở các cỡ màn hình
  const fit = [];
  await page.mouse.move(2, 2);
  for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }, { width: 420, height: 800 }]) { await page.setViewportSize(vp); await page.waitForTimeout(250); fit.push(await page.evaluate(() => { const b = document.querySelector('.hmv-dt-btn'), r = b.getBoundingClientRect(), box = document.querySelector('.buzz-question').getBoundingClientRect(); return { w: innerWidth, bw: Math.round(r.width), inside: r.left >= box.left - 1 && r.right <= box.right + 1, noScroll: document.documentElement.scrollWidth <= innerWidth + 1 }; })); }
  await page.setViewportSize({ width: 1366, height: 768 });
  ok('32 Nút loa nằm gọn trong khung câu hỏi, đủ lớn (≥ 36 px) và không gây tràn ngang ở 1920, 1366, 1024, 420', fit.every(f => f.inside && f.noScroll && f.bw >= 36 && f.bw <= 54), fit);
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#troLyAI .dt-card'); const over = [];
  for (const w of [1366, 800, 420]) { await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(200); over.push(await page.evaluate(() => { const c = document.querySelector('#troLyAI .dt-card').getBoundingClientRect(); return document.documentElement.scrollWidth <= innerWidth + 1 && c.right <= innerWidth + 1 && Array.from(document.querySelectorAll('#troLyAI .dt-card select')).every(e => e.getBoundingClientRect().right <= c.right + 1); })); }
  await page.setViewportSize({ width: 1366, height: 768 }); await page.evaluate(() => document.querySelector('#troLyAI .dt-card').scrollIntoView()); await page.waitForTimeout(200); await page.screenshot({ path: path.join(__dirname, 'doc-to-cai-dat.png') });
  ok('33 Phần cài đặt Đọc to không tràn ngang ở 1366, 800, 420', over.every(Boolean), over);
  ok('34 Phần B không có lỗi JavaScript', logs.filter(l => /PAGEERROR|console.error/.test(l)).length === 0, logs); await browser.close();

  // hai giọng tiếng Việt
  ({ browser, page, logs } = await mk('two')); page.on('dialog', d => d.accept().catch(() => {}));
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#dtVoice');
  const two = await page.evaluate(() => ({ opts: Array.from(document.getElementById('dtVoice').options).map(o => o.textContent), val: document.getElementById('dtVoice').value, text: document.querySelector('#troLyAI .dt-card').innerText }));
  await page.selectOption('#dtVoice', { label: 'Microsoft An - Vietnamese (Vietnam)' }); await page.click('#dtTry'); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle');
  const twoSp = await page.evaluate(() => window.__spoken[0].voice);
  ok('35 Máy có nhiều giọng tiếng Việt: liệt kê đủ (không lẫn giọng tiếng Anh), ưu tiên giọng tự nhiên, ghi rõ giọng trực tuyến cần Internet; chọn giọng nào đọc bằng giọng đó', two.opts.length === 2 && /HoaiMy/.test(two.opts[0]) && /giọng trực tuyến, cần Internet/.test(two.text) && /Microsoft An/.test(twoSp), [two, twoSp]); await browser.close();

  // ================= C. Không có giọng của máy, dùng giọng AI (Gemini GIẢ) =================
  await rq('POST', '/api/ai/key', { key: 'TESTKEY_abcdefghijklmnop9876' }); await rq('POST', '/__mode', { mode: 'normal' }, 8799);
  ({ browser, page, logs } = await mk('none')); page.on('dialog', d => d.accept().catch(() => {}));
  await page.waitForFunction(() => hmvTroLyAI.ready(), null, { timeout: 8000 });
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#troLyAI .dt-card'); await page.waitForFunction(() => /giọng AI Gemini/.test(document.querySelector('#troLyAI .dt-card .ta-note').innerText));
  card = await page.evaluate(() => ({ text: document.querySelector('#troLyAI .dt-card .ta-note').innerText, aiOff: document.getElementById('dtAiVoice').disabled, tryOff: document.getElementById('dtTry').disabled, choice: hmvDocTo.state().choice }));
  ok('36 Không có giọng của máy nhưng đã có khóa Gemini: tự dùng giọng AI, nói rõ cần Internet và lần đầu phải chờ', card.choice === 'ai' && /Đang dùng giọng AI Gemini \(cần Internet\)/.test(card.text) && /chờ vài giây/.test(card.text) && !card.aiOff && !card.tryOff, card);
  await play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(400); await page.evaluate(() => giftBox(0)); await page.waitForSelector(btn('.gift-question h2'));
  await rq('POST', '/__mode', { mode: 'normal' }, 8799); const wantAi = await page.evaluate(() => hmvDocTo._test.build());
  const states = []; await page.exposeFunction('__note', x => states.push(x)); await page.evaluate(() => { let prev = ''; setInterval(() => { const x = hmvDocTo.state().state + (document.querySelector('.hmv-dt-btn.loading') ? '+spin' : ''); if (x !== prev) { prev = x; window.__note(x); } }, 15); });
  await page.click(btn('.gift-question h2')); await page.waitForFunction(() => hmvDocTo.state().state !== 'idle'); await idle(page, 15000); await page.waitForTimeout(100);
  let l = await last(); const gen = l.last.body.generationConfig || {}, sentText = (l.last.body.contents || []).map(c => c.parts.map(p => p.text).join(' ')).join(' ');
  const names2 = await page.evaluate(() => (typeof students !== 'undefined' ? students : []).map(x => x.name).filter(n => n.split(' ').length >= 2));
  ok('37 Giọng AI: gửi ĐÚNG NGUYÊN câu đang hiện (không kèm lời dặn/lời dẫn nào) để lấy âm thanh (giọng Kore), khóa không nằm trong địa chỉ', l.calls.length === 1 && /tts/.test(l.last.model) && JSON.stringify(gen.responseModalities) === '["AUDIO"]' && gen.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === 'Kore' && sentText.trim() === wantAi && !/Đọc rõ ràng|chậm rãi|học sinh tiểu học/.test(sentText) && l.calls.every(c => !c.hasKeyInUrl), [l.calls, gen, sentText, wantAi]);
  ok('38 Nội dung gửi đi chỉ có câu hỏi và phương án, không có tên học sinh', names2.length > 5 && names2.every(n => !sentText.includes(n)), sentText);
  ok('39 Nút loa: quay vòng khi đang chuẩn bị giọng → đang đọc → trở lại bình thường', states.join('>').includes('loading+spin') && states.includes('speaking') && states[states.length - 1] === 'idle', states);
  await page.click(btn('.gift-question h2')); await page.waitForFunction(() => hmvDocTo.state().state !== 'idle').catch(() => {}); await idle(page, 15000); l = await last();
  ok('40 Đọc lại cùng câu: phát từ bộ nhớ trên máy, không gọi AI lần nữa', l.calls.length === 1 && (await page.evaluate(() => hmvDocTo._test.cacheCount())) === 1, l.calls);
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.hmvDocTo && window.hmvTroLyAI && hmvTroLyAI.ready() && window.questionBankSets && questionBankSets.length > 0, null, { timeout: 10000 });
  const again = await page.evaluate(t => hmvDocTo.speak(t).then(d => d, e => 'ERR ' + e.message), wantAi); l = await last();
  ok('41 Tải lại trang rồi đọc lại câu đó: vẫn phát ngay từ bộ nhớ (không tốn lượt AI)', again === true && l.calls.length === 1, [again, l.calls]);
  await page.evaluate(() => hmvDocTo.set({ aiVoice: 'Puck' })); const puck = await page.evaluate(t => hmvDocTo.speak(t).then(d => d, e => 'ERR ' + e.message), wantAi); l = await last();
  ok('42 Đổi sang giọng AI khác (Puck): gọi AI với giọng mới', puck === true && l.calls.length === 2 && l.last.body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === 'Puck', [puck, l.calls]);
  await rq('POST', '/__mode', { mode: '429all' }, 8799);
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector(btn('.buzz-question h2')); await page.waitForTimeout(2600); await page.evaluate(() => { hmvDocTo.set({ aiVoice: 'Charon' }); document.getElementById('toast').textContent = ''; }); /* giọng chưa có trong bộ nhớ → buộc phải gọi AI */ await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'idle' && document.getElementById('toast').textContent.length > 10, null, { timeout: 30000 }).catch(() => {});
  s2 = await page.evaluate(() => ({ state: hmvDocTo.state().state, toast: document.getElementById('toast').textContent, cls: document.querySelector('.hmv-dt-btn').className, duck: window.hmvDuck }));
  ok('43 Hết lượt AI (lỗi 429): báo rõ bằng tiếng Việt, nút loa trở lại bình thường, trò chơi vẫn chơi tiếp được', s2.state === 'idle' && /lượt|giới hạn|chờ/i.test(s2.toast) && !/speaking|loading/.test(s2.cls) && s2.duck === 1 && (await page.evaluate(() => { buzzAnswer; return !!hmvBuzzState().match; })), s2);
  await rq('POST', '/__mode', { mode: 'normal' }, 8799);
  ok('44 Phần C không có lỗi JavaScript', logs.filter(l2 => /PAGEERROR/.test(l2)).length === 0, logs); await browser.close();

  // ================= D. Giọng của máy hỏng, có giọng AI dự phòng; máy chủ cũ =================
  ({ browser, page, logs } = await mk('vi')); page.on('dialog', d => d.accept().catch(() => {}));
  await page.waitForFunction(() => hmvTroLyAI.ready(), null, { timeout: 8000 }); await rq('POST', '/__mode', { mode: 'normal' }, 8799);
  const pick = await page.evaluate(() => hmvDocTo.state().choice);
  await page.evaluate(() => { window.__speechFail = 'synthesis-failed'; }); const fb = await page.evaluate(() => hmvDocTo.speak('Câu thử dự phòng số một.').then(d => [d, hmvDocTo.state().engine], e => ['ERR ' + e.message])); l = await last();
  ok('45 Có cả hai nguồn: mặc định dùng giọng của máy (phát ngay, không tốn lượt AI); nếu giọng của máy hỏng thì tự chuyển sang giọng AI', pick === 'browser' && fb[0] === true && fb[1] === 'ai' && l.calls.length === 1 && /Câu thử dự phòng số một/.test(JSON.stringify(l.last.body)), [pick, fb, l.calls]);
  await page.evaluate(() => { window.__speechFail = ''; hmvDocTo.set({ engine: 'ai' }); }); await rq('POST', '/__mode', { mode: 'normal' }, 8799); const forced = await page.evaluate(() => hmvDocTo.speak('Câu thử chọn giọng AI.').then(d => [d, hmvDocTo.state().engine, window.__spoken.length], e => ['ERR ' + e.message])); l = await last();
  ok('46 Chọn "Giọng AI Gemini" trong cài đặt: dùng giọng AI dù máy có giọng tiếng Việt', forced[0] === true && forced[1] === 'ai' && forced[2] === 0 && l.calls.length === 1, [forced, l.calls]);
  await browser.close(); await rq('POST', '/api/ai/key', { key: '' });
  ({ browser, page, logs } = await mk('none')); page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:8782/', { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvDocTo && window.questionBankSets && questionBankSets.filter(x => /^mau-/.test(x.id)).length === 7, null, { timeout: 10000 });
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.waitForTimeout(900);
  const old = await page.evaluate(() => ({ n: document.querySelectorAll('.hmv-dt-btn').length, ready: hmvDocTo.state().ready })); const oldErr = await page.evaluate(() => hmvDocTo.speak('Thử').then(() => 'OK', e => e.message));
  ok('47 Máy chủ bản cũ (chưa có phần AI) và máy không có giọng: không hiện nút loa, trò chơi chạy bình thường; gọi đọc thì báo rõ lý do', old.n === 0 && !old.ready && /chưa có giọng đọc tiếng Việt/.test(oldErr) && logs.filter(x => /PAGEERROR/.test(x)).length === 0, [old, oldErr, logs]);
  await browser.close();

  // ================= E. Chuyển chữ thành lời =================
  ({ browser, page, logs } = await mk('vi'));
  const cases = [['27 + 15 = ?', '27 cộng 15 bằng bao nhiêu?'], ['? + 5 = 12', 'mấy cộng 5 bằng 12'], ['12 : ? = 4', '12 chia mấy bằng 4'], ['9 − 5 = ?', '9 trừ 5 bằng bao nhiêu?'], ['15-7=?', '15 trừ 7 bằng bao nhiêu?'], ['7 x 8 = ?', '7 nhân 8 bằng bao nhiêu?'], ['(12 + 8) × 5 = ?', '(12 cộng 8) nhân 5 bằng bao nhiêu?'], ['Câu 2: 48 : 6 = ?', 'Câu 2: 48 chia 6 bằng bao nhiêu?'], ['5 m = ... cm', '5 mét bằng bao nhiêu xăng-ti-mét'], ['Diện tích hình vuông cạnh 5cm là bao nhiêu cm2?', 'Diện tích hình vuông cạnh 5 xăng-ti-mét là bao nhiêu xăng-ti-mét vuông?'], ['1/2 + 1/4 = ?', '1 phần 2 cộng 1 phần 4 bằng bao nhiêu?'], ['Ngày 20/11 là ngày gì?', 'Ngày 20 tháng 11 là ngày gì?'], ['Ngày 2/9/1945', 'Ngày 2 tháng 9 năm 1945'], ['Vận tốc 40 km/giờ', 'Vận tốc 40 ki-lô-mét trên giờ'], ['25% của 80 là:', '25 phần trăm của 80 là:'], ['1 000 000 đồng', '1000000 đồng'], ['3 < 5 và 7 > 2', '3 bé hơn 5 và 7 lớn hơn 2'], ['Năm học 2026-2027 có mấy học kì?', 'Năm học 2026-2027 có mấy học kì?'], ['Lúc 7:30 sáng', 'Lúc 7:30 sáng'], ['Từ nào viết đúng chính tả?', 'Từ nào viết đúng chính tả?'], ['3 l nước nặng 3 kg', '3 lít nước nặng 3 ki-lô-gam'], ['Con gì kêu meo meo?', 'Con gì kêu meo meo?']];
  const out = await page.evaluate(c => c.map(x => hmvDocTo._test.say(x[0])), cases); const bad = cases.map((c, i) => [c[0], c[1], out[i]]).filter(x => x[1] !== x[2]);
  ok('48 Chuyển kí hiệu thành lời: phép tính, chỗ trống, phân số, ngày tháng, đơn vị đo, phần trăm, so sánh; câu chữ thường giữ nguyên (' + cases.length + ' mẫu)', bad.length === 0, bad);
  const ch = await page.evaluate(() => { const t = 'Đây là một câu khá dài để kiểm tra việc tách đoạn khi đọc. '.repeat(12); const c = hmvDocTo._test.chunks(t); return { n: c.length, max: Math.max.apply(null, c.map(x => x.length)), same: c.join(' ') === t.trim() }; });
  ok('49 Câu dài được tách thành các đoạn ngắn (≤ 190 kí tự) theo dấu câu, không mất chữ', ch.n > 1 && ch.max <= 190 && ch.same, ch);
  await browser.close();


  // ================= F. Bản 2.4: bảng chọn nhanh, tốc độ, chờ đọc xong mới tính giờ =================
  {
  ({ browser, page, logs } = await mk('vi')); page.on('dialog', d => d.accept().catch(() => {}));
  const sec = async sel => Number(((await page.textContent(sel)) || '').replace(/[^\d]/g, ''));
  await play(page, 'mau-1-abcd', 'tug'); await page.waitForSelector(btn('.tug-question h2')); await page.waitForSelector('.tug-question h2 .hmv-dt-gear');
  let g = await page.evaluate(() => { const h = document.querySelector('.tug-question h2'), gb = h.querySelector('.hmv-dt-gear'), r = gb.getBoundingClientRect(); return { n: document.querySelectorAll('.hmv-dt-gear').length, text: gb.textContent, label: gb.getAttribute('aria-label'), w: r.width, h2: h.textContent, cur: hmvDocTo._test.current().text, def: hmvDocTo.state().cfg }; });
  ok('50 Cạnh nút loa có nút bánh răng "Cài đặt đọc to"; chữ câu hỏi không đổi; mặc định bật "Chờ đọc xong mới tính giờ"', g.n === 1 && g.text === '' && g.label === 'Cài đặt đọc to' && g.w >= 30 && g.h2 === g.cur && g.def.wait === true, g);
  const tm0 = await page.evaluate(() => JSON.stringify([hmvTugState().match.selected, hmvTugState().match.answered, hmvTugState().match.q]));
  await page.click('.tug-question h2 .hmv-dt-gear'); await page.waitForSelector('#hmvDtPop');
  let pop = await page.evaluate(() => { const p = document.getElementById('hmvDtPop'), r = p.getBoundingClientRect(); return { rates: Array.from(p.querySelectorAll('[data-dt-rate]')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), opts: Array.from(p.querySelectorAll('[data-dt-opt]')).map(i => i.dataset.dtOpt + ':' + i.checked), labels: Array.from(p.querySelectorAll('.hmv-dt-pop-check')).map(l => l.textContent.trim()), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, font: getComputedStyle(p.querySelector('[data-dt-rate]')).fontSize }; });
  ok('51 Bấm bánh răng: bảng chọn nhanh hiện ngay trong trò chơi, có tốc độ Chậm/Vừa/Nhanh và ba lựa chọn; nằm gọn trong màn hình', pop.rates.join() === 'Chậm,Vừa*,Nhanh' && pop.opts.join() === 'wait:true,auto:false,answers:true' && /Chờ đọc xong mới tính giờ/.test(pop.labels[0]) && pop.inside && parseFloat(pop.font) >= 15, pop);
  await page.click('#hmvDtPop [data-dt-rate="0.8"]'); await page.waitForFunction(() => hmvDocTo.state().cfg.rate === 0.8);
  pop = await page.evaluate(() => ({ on: Array.from(document.querySelectorAll('#hmvDtPop [data-dt-rate]')).filter(b => b.classList.contains('on')).map(b => b.textContent).join(), open: !!document.getElementById('hmvDtPop'), ls: JSON.parse(localStorage.getItem('hmv_doc_to_v1')).rate, tug: JSON.stringify([hmvTugState().match.selected, hmvTugState().match.answered, hmvTugState().match.q]) }));
  await page.click('.tug-question .tug-question-head', { position: { x: 5, y: 5 } }).catch(() => {}); await page.waitForTimeout(150); const closed = !(await page.$('#hmvDtPop'));
  await clearSpoken(page); await page.click(btn('.tug-question h2')); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle'); const slow = await page.evaluate(() => window.__spoken[0].rate);
  ok('52 Chọn "Chậm" trong bảng: được ghi nhớ, lần đọc sau đọc chậm (0,8); bảng không làm trò chơi nhận nhầm cú bấm; bấm ra ngoài thì bảng đóng', pop.on === 'Chậm' && pop.open && pop.ls === 0.8 && pop.tug === tm0 && closed && slow === 0.8, [pop, tm0, closed, slow]);
  await page.click('.tug-question h2 .hmv-dt-gear'); await page.waitForSelector('#hmvDtPop'); await page.click('#hmvDtPop [data-dt-rate="1.1"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await clearSpoken(page); await page.click(btn('.tug-question h2')); await page.waitForFunction(() => window.__spoken.length > 0 && hmvDocTo.state().state === 'idle'); const fast = await page.evaluate(() => window.__spoken[0].rate);
  ok('53 Chọn "Nhanh": đọc nhanh (1,1); phím Esc đóng bảng', fast === 1.1 && !(await page.$('#hmvDtPop')), fast);
  await page.evaluate(() => hmvDocTo.set({ rate: 0.95 }));
  // Kéo co: đồng hồ chờ
  await page.evaluate(() => { window.__speechMs = 3500; }); const q0 = await page.evaluate(() => hmvTugState().match.qLeft); await page.click(btn('.tug-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(300);
  const h1 = await page.evaluate(() => ({ q: hmvTugState().match.qLeft, el: hmvTugState().match.elapsed, hold: !!window.hmvHold, cls: document.body.classList.contains('hmv-dang-doc') })); await page.waitForTimeout(2000); const h2 = await page.evaluate(() => ({ q: hmvTugState().match.qLeft, el: hmvTugState().match.elapsed }));
  await idle(page, 9000); await page.waitForTimeout(200); const h3 = await page.evaluate(() => ({ q: hmvTugState().match.qLeft, hold: !!window.hmvHold, cls: document.body.classList.contains('hmv-dang-doc') })); await page.waitForTimeout(1500); const h4 = await page.evaluate(() => hmvTugState().match.qLeft);
  ok('54 Kéo co: trong lúc máy đọc, đồng hồ câu hỏi đứng yên (và mờ nhấp nháy); đọc xong đồng hồ chạy tiếp từ đúng chỗ cũ', h1.hold && h1.cls && Math.abs(h1.q - h2.q) < 0.05 && Math.abs(h1.el - h2.el) < 0.05 && !h3.hold && !h3.cls && Math.abs(h3.q - h1.q) < 0.6 && h4 < h3.q - 1, [q0, h1, h2, h3, h4]);
  await page.click('.tug-question h2 .hmv-dt-gear'); await page.waitForSelector('#hmvDtPop'); await page.uncheck('#hmvDtPop [data-dt-opt="wait"]'); await page.keyboard.press('Escape');
  await page.click(btn('.tug-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const n1 = await page.evaluate(() => ({ q: hmvTugState().match.qLeft, hold: !!window.hmvHold })); await page.waitForTimeout(2000); const n2 = await page.evaluate(() => hmvTugState().match.qLeft); await page.evaluate(() => hmvDocTo.stop());
  ok('55 Tắt "Chờ đọc xong mới tính giờ" trong bảng: đồng hồ chạy bình thường trong lúc đọc (như bản trước)', !n1.hold && n2 < n1.q - 1.5 && (await page.evaluate(() => hmvDocTo.state().cfg.wait === false)), [n1, n2]);
  await page.evaluate(() => hmvDocTo.set({ wait: true }));
  await page.click(btn('.tug-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking' && window.hmvHold); await page.click(btn('.tug-question h2')); await page.waitForTimeout(200); const st1 = await page.evaluate(() => !!window.hmvHold);
  await page.click(btn('.tug-question h2')); await page.waitForFunction(() => window.hmvHold); await page.evaluate(() => openView('home')); await page.waitForTimeout(300); const st2 = await page.evaluate(() => !!window.hmvHold);
  await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#dtWait'); const cardWait = await page.evaluate(() => document.getElementById('dtWait').checked); await page.click('#dtTry'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const st3 = await page.evaluate(() => !!window.hmvHold); await page.click('#dtTry'); await page.waitForTimeout(200);
  ok('56 Đồng hồ không bao giờ bị giữ quên: bấm dừng đọc, rời trò chơi đều nhả ngay; "Nghe thử" ở phần cài đặt không giữ đồng hồ; phần cài đặt có ô tương ứng', !st1 && !st2 && !st3 && cardWait === true, [st1, st2, st3, cardWait]);
  // Hộp quà, Đường đua, Bóng bay, Chinh phục tri thức, Quiz Nghiêng Đầu
  await page.evaluate(() => { openView('games'); tugBack(); });
  await play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(400); await page.evaluate(() => giftBox(0)); await page.waitForSelector(btn('.gift-question h2')); await page.waitForTimeout(1300); const gf0 = await sec('#giftTimer'); await page.click(btn('.gift-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(2600); const gf1 = await sec('#giftTimer'); await idle(page, 9000); await page.waitForTimeout(2300); const gf2 = await sec('#giftTimer');
  ok('57 Hộp quà: thời gian trả lời đứng yên trong lúc đọc, đọc xong chạy tiếp', gf0 - gf1 <= 1 && gf1 - gf2 >= 2 && gf0 - gf2 <= 5, [gf0, gf1, gf2]);
  await page.evaluate(() => giftBack()); await play(page, 'mau-1-abcd', 'race'); await page.waitForSelector(btn('.race-question h2')); await page.waitForTimeout(1300); const rc0 = await page.evaluate(() => Number((document.querySelector('.race-question .pill').textContent.match(/(\d+) giây/) || [])[1])), rt0 = await sec('#raceTimer'); await page.click(btn('.race-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(2600); const rt1 = await sec('#raceTimer'); await idle(page, 9000); await page.waitForTimeout(2300); const rt2 = await sec('#raceTimer');
  ok('58 Đường đua: thời gian trả lời đứng yên trong lúc đọc, đọc xong chạy tiếp', rt0 - rt1 <= 1 && rt1 - rt2 >= 2 && rt0 - rt2 <= 5, [rc0, rt0, rt1, rt2]);
  await page.evaluate(() => raceBack()); await play(page, 'mau-1-abcd', 'balloon'); await page.waitForSelector(btn('#bbQuestion')); await page.waitForTimeout(600); await page.click(btn('#bbQuestion')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); await page.waitForTimeout(200); const b0 = await page.evaluate(() => hmvBalloon.state().match.left); await page.waitForTimeout(2200); const b1 = await page.evaluate(() => hmvBalloon.state().match.left); await idle(page, 9000); await page.waitForTimeout(1600); const b2 = await page.evaluate(() => hmvBalloon.state().match.left);
  ok('59 Bóng bay: đồng hồ đứng yên trong lúc đọc, đọc xong chạy tiếp', Math.abs(b0 - b1) < 0.05 && b2 < b1 - 1, [b0, b1, b2]);
  await page.evaluate(() => balloonBack()); await play(page, 'mau-1-abcd', 'millionaire'); await page.waitForSelector(btn('.millionaire-question-text')); await page.waitForTimeout(1200); await page.click(btn('.millionaire-question-text')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const m0 = await page.evaluate(() => millionaireState.seconds); await page.waitForTimeout(2500); const m1 = await page.evaluate(() => millionaireState.seconds); await idle(page, 9000); await page.waitForTimeout(2300); const m2 = await page.evaluate(() => millionaireState.seconds);
  ok('60 Chinh phục tri thức: đồng hồ thời gian chơi không chạy trong lúc đọc, đọc xong chạy tiếp', m1 - m0 <= 1 && m2 - m1 >= 1, [m0, m1, m2]);
  await page.evaluate(() => gameBack()); await tiltStart(page); await page.waitForSelector(btn('.tilt-question-text')); await page.waitForTimeout(1200); await page.click(btn('.tilt-question-text')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const t0 = await sec('#tiltTimer'); await page.waitForTimeout(2500); const t1 = await sec('#tiltTimer'); await idle(page, 9000); await page.waitForTimeout(2300); const t2 = await sec('#tiltTimer');
  ok('61 Quiz Nghiêng Đầu: đồng hồ không chạy trong lúc đọc, đọc xong chạy tiếp', t1 - t0 <= 1 && t2 - t1 >= 1, [t0, t1, t2]);
  // Ai nhanh hơn: tự đọc + chờ đọc xong mới mở chuông
  await page.evaluate(() => { tiltBack(); hmvDocTo.set({ auto: true, wait: true }); window.__speechMs = 4000; });
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking', null, { timeout: 6000 }); await page.waitForTimeout(2200);
  const z1 = await page.evaluate(() => ({ buzzer: hmvBuzzState().match.buzzer, phase: hmvBuzzState().match.phase, hold: !!window.hmvHold })); await idle(page, 9000); await page.waitForFunction(() => hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 6000 }).catch(() => {});
  const z2 = await page.evaluate(() => ({ buzzer: hmvBuzzState().match.buzzer, left: hmvBuzzState().match.openLeft, wait: hmvBuzzState().settings.openWait }));
  ok('62 Ai nhanh hơn (tự đọc + chờ đọc xong): chuông CHƯA mở trong lúc máy đọc câu hỏi; đọc xong chuông mới mở và thời gian giành quyền tính từ đầu', z1.hold && z1.buzzer === 'LOCKED' && z1.phase === 'QUESTION_VISIBLE' && z2.buzzer === 'OPEN' && z2.left > z2.wait - 3, [z1, z2]);
  await page.click(btn('.buzz-question h2')); await page.waitForFunction(() => hmvDocTo.state().state === 'speaking'); const o0 = await page.evaluate(() => hmvBuzzState().match.openLeft); await page.waitForTimeout(2000); const o1 = await page.evaluate(() => hmvBuzzState().match.openLeft); await page.evaluate(() => hmvDocTo.stop()); await page.waitForTimeout(1500); const o2 = await page.evaluate(() => hmvBuzzState().match.openLeft);
  ok('63 Ai nhanh hơn: chuông đang mở mà bấm đọc lại thì thời gian chờ giành quyền đứng yên trong lúc đọc, dừng đọc thì chạy tiếp', Math.abs(o0 - o1) < 0.05 && o2 < o1 - 0.8, [o0, o1, o2]);
  await page.evaluate(() => { hmvDocTo.set({ auto: false }); window.__speechMs = 300; buzzBack(); });
  ok('64 Phần F không có lỗi JavaScript', logs.filter(l => /PAGEERROR|console.error/.test(l)).length === 0, logs); await browser.close();
  // máy chủ: không còn lời dẫn mặc định
  await rq('POST', '/api/ai/key', { key: 'TESTKEY_abcdefghijklmnop9876' }); await rq('POST', '/__mode', { mode: 'normal' }, 8799);
  let sv = await rq('POST', '/api/ai/tts', { text: 'Ba cộng bốn bằng bao nhiêu?', voice: 'Kore' }); let lv = await last(); const plain = lv.last.body.contents[0].parts[0].text;
  sv = await rq('POST', '/api/ai/tts', { text: 'Ba cộng bốn bằng bao nhiêu?', voice: 'Kore', style: 'Đọc thật vui' }); lv = await last(); const styled = lv.last.body.contents[0].parts[0].text;
  ok('65 Máy chủ nội bộ: mặc định gửi cho giọng AI đúng nguyên câu cần đọc (trước đây kèm lời dặn ở đầu nên giọng AI đọc cả lời dặn); chỉ khi được yêu cầu rõ mới kèm phong cách đọc', sv.status === 200 && plain === 'Ba cộng bốn bằng bao nhiêu?' && styled === 'Đọc thật vui: Ba cộng bốn bằng bao nhiêu?', [plain, styled]);
  await rq('POST', '/api/ai/key', { key: '' });
  }

  fs.writeFileSync(path.join(__dirname, 'doc-to-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.12-20261014', note: 'Giọng đọc của trình duyệt và Gemini đều là GIẢ trong bài kiểm này.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
