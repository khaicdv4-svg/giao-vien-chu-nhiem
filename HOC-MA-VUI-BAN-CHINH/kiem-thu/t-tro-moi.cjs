// Kiểm thử bản 2.9: hai trò chơi mới dùng camera – "Bàn tay phép thuật" và "Giơ tay giành quyền".
// Camera là camera giả của Chromium; bộ nhận diện bàn tay là GIẢ (qa19/fake-hands2.mjs) – bàn tay được đặt bằng window.__hands.
// Giọng đọc ở phần đọc to là GIẢ (qa13/fake-speech.js). Không kiểm được với bàn tay và webcam thật.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const fake = fs.readFileSync(path.join(__dirname, 'fake-hands2.mjs'), 'utf8');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const logs = [];
const AIM = () => {
  window.__aim = (id, sx, sy, opt, dwell) => { const st = document.getElementById(id), v = st.querySelector('video'); const W = st.clientWidth, H = st.clientHeight, vw = v.videoWidth || 16, vh = v.videoHeight || 9, sc = Math.max(W / vw, H / vh), dw = vw * sc, dh = vh * sc, ox = (W - dw) / 2, oy = (H - dh) / 2; const px = 1 - (sx - ox) / dw, py = (sy - oy) / dh; const h = Object.assign({ x: px + 0.036 * 0.5625 - (dwell ? 0 : 0.001), y: py + 0.08 - (dwell ? 0 : 0.001), n: 4 }, opt || {}); window.__hands = [h]; return h; };
  window.__zone = (n, z, opt) => { const mx = (z + 0.5) / n; return Object.assign({ x: 1 - mx, y: 0.45, n: 4 }, opt || {}); };   /* bàn tay đứng giữa ô z (đã tính soi gương) */
};
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 }, permissions: ['camera'], serviceWorkers: 'block' });
  await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); });
  const page = await ctx.newPage(); if (opts.voice) await page.addInitScript({ path: path.join(__dirname, '..', 'qa13', 'fake-speech.js') }); await page.addInitScript(AIM);
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && window.hmvMagicHand && window.hmvRaiseHand && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 15000 }); await page.waitForTimeout(400);
  return { ctx, page };
}
const W = ms => new Promise(r => setTimeout(r, ms));
const mh = page => page.evaluate(() => hmvMagicHand.state());
const rh = page => page.evaluate(() => hmvRaiseHand.state());
const dsCount = page => page.evaluate(() => { const s = hmvDungSai.state(); return { r: s.right, w: s.wrong }; });

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  let { ctx, page } = await open(browser);

  // ================= Thư viện, trang chủ =================
  await page.evaluate(() => openView('games')); await page.waitForTimeout(400);
  const lib = await page.evaluate(() => Array.from(document.querySelectorAll('#games .game-library-card')).map(c => ({ t: c.querySelector('h3').textContent.trim(), isNew: !!c.querySelector('.bb-new'), tags: Array.from(c.querySelectorAll('.game-tags span')).map(s => s.textContent).join('|') })));
  const m0 = lib.find(c => c.t === 'Bàn tay phép thuật'), r0 = lib.find(c => c.t === 'Giơ tay giành quyền');
  ok('1 Thư viện có 10 thẻ (kể cả Nốt nhạc vui), thêm "Bàn tay phép thuật" và "Giơ tay giành quyền" (nhãn Mới, ghi rõ dùng camera AI)', lib.length === 10 && m0 && r0 && m0.isNew && r0.isNew && /Camera AI/.test(m0.tags) && /Camera AI/.test(r0.tags), lib);
  await page.click('#games .game-library-card:has(h3:text-is("Bàn tay phép thuật")) .game-card-actions button:has-text("Chơi ngay")').catch(() => {}); await page.waitForTimeout(400); const fromLib = await page.evaluate(() => classroomGame.type);
  if (fromLib !== 'magic-hand') await page.evaluate(() => gameSetup('magic-hand'));
  const libPlay = await page.evaluate(() => { const m = hmvMagicHand.state().match; return m ? m.phase : null; });
  ok('2 Thẻ "Bàn tay phép thuật" trong thư viện: bấm "Chơi ngay" vào chơi ngay với bộ mẫu', fromLib === 'magic-hand' && libPlay === 'ask', [fromLib, libPlay]);
  await page.evaluate(() => { magicHandBack(); gameSetup('magic-hand'); });

  // ================= BÀN TAY PHÉP THUẬT =================
  await page.waitForSelector('#mhSetup');
  const su = await page.evaluate(() => ({ sets: Array.from(document.querySelectorAll('#mhSet option')).map(o => o.value), custom: document.querySelector('.mh-custom').hidden, steps: document.querySelectorAll('#mhSetup .bb-how li').length, privacy: /không lưu và không gửi hình ảnh/.test(document.querySelector('#mhSetup .bb-privacy').textContent), start: !document.querySelector('[data-mh="start"]').disabled, full: !!document.querySelector('#games .hmv-full-btn') }));
  ok('3 Màn thiết lập: 4 bộ mẫu (từ loại, góc, phân số, dẫn nhiệt) + bộ tự gõ + câu Đúng/Sai trong Kho; 3 bước; cam kết không lưu hình; có nút Toàn màn hình', su.sets.join() === 'tu-loai,goc,phan-so,dan-nhiet,custom,kho' && su.custom && su.steps === 3 && su.privacy && su.start && su.full, su);
  await page.selectOption('#mhSet', 'custom'); await page.waitForTimeout(200);
  await page.fill('#mhCustom', 'Chỉ một dòng'); await page.dispatchEvent('#mhCustom', 'change'); await page.waitForTimeout(200);
  const bad = await page.evaluate(() => ({ dis: document.querySelector('[data-mh="start"]').disabled, warn: (document.querySelector('#mhSetup .bb-warn') || {}).textContent }));
  await page.fill('#mhCustom', 'Số chẵn: 2, 4, 6\nSố lẻ: 1, 3, 5, 7'); await page.dispatchEvent('#mhCustom', 'change'); await page.waitForTimeout(200);
  const good = await page.evaluate(() => ({ dis: document.querySelector('[data-mh="start"]').disabled, src: document.querySelector('#mhSetup .bb-source').textContent }));
  ok('4 Bộ tự gõ: sai mẫu thì báo và khóa nút Bắt đầu; đúng mẫu "Nhóm: mục, mục" thì nhận 2 nhóm, 7 thẻ', bad.dis && /chưa đúng mẫu/.test(bad.warn || '') && !good.dis && /2 nhóm · 7 thẻ/.test(good.src), [bad, good]);
  await page.selectOption('#mhSet', 'tu-loai'); await page.waitForTimeout(150); await page.selectOption('#mhCount', '5'); await page.selectOption('#mhGrab', 'pinch'); await page.selectOption('#mhControl', 'camera'); await page.waitForTimeout(150);
  await page.click('[data-mh="start"]'); await page.waitForFunction(() => hmvMagicHand.state().camera === 'ready', null, { timeout: 15000 });
  let s = await mh(page); const ui = await page.evaluate(() => ({ bins: Array.from(document.querySelectorAll('.mh-bin b')).map(b => b.textContent), card: document.querySelector('#mhCard .mh-card-text').textContent, prompt: document.getElementById('mhPrompt').textContent, status: document.getElementById('mhStatus').textContent, numHands: __hl.options.numHands, mode: __hl.options.runningMode }));
  ok('5 Bắt đầu: mở camera, bộ nhận diện chế độ video, tối đa 2 bàn tay; 3 ô Danh từ – Động từ – Tính từ; thẻ hiện ở giữa; lời nhắc "chụm ngón"', s.match.phase === 'ask' && ui.bins.join() === 'Danh từ,Động từ,Tính từ' && ui.card === s.match.item.text && ui.prompt === ui.card && /Chụm ngón/.test(ui.status) && ui.numHands === 2 && ui.mode === 'VIDEO', [s.match, ui]);
  // Tay mở để trên thẻ: chưa nhặt. Chụm lại: nhặt.
  let c0 = s.match.card; await page.evaluate(c => __aim('mhStage', c.x, c.y), c0); await W(800); s = await mh(page);
  const openOn = s.match.held; await page.evaluate(c => __aim('mhStage', c.x, c.y, { pinch: true }), c0); await W(400); s = await mh(page);
  const ptr = await page.evaluate(() => ({ n: document.querySelectorAll('#mhPointers .mh-pointer').length, closed: !!document.querySelector('#mhPointers .mh-pointer.closed'), cls: document.getElementById('mhCard').className }));
  ok('6 Bàn tay MỞ đặt trên thẻ: chưa nhặt; CHỤM ngón cái – ngón trỏ: nhặt được thẻ (chấm tròn đổi màu, thẻ nổi lên)', openOn === '' && s.match.held === 'hand' && ptr.n === 1 && ptr.closed && /held/.test(ptr.cls), [openOn, s.match.held, ptr]);
  // Đưa thẻ tới đúng ô rồi mở tay
  let it = s.match.item, d0 = await dsCount(page), target = await page.evaluate(g => hmvMagicHand.binCenter(g), it.g);
  for (let k = 1; k <= 5; k++) { await page.evaluate(([a, b, k]) => __aim('mhStage', a.x + (b.x - a.x) * k / 5, a.y + (b.y - a.y) * k / 5, { pinch: true }), [c0, target, k]); await W(120); }
  await W(200); s = await mh(page); const follow = Math.hypot(s.match.card.x - target.x, s.match.card.y - target.y), hover = await page.evaluate(g => document.querySelectorAll('.mh-bin')[g].classList.contains('hover'), it.g);
  await page.evaluate(b => __aim('mhStage', b.x, b.y), target); await W(400); s = await mh(page); let d1 = await dsCount(page);
  ok('7 Giữ chụm và di tay: thẻ đi theo tay tới ô nhóm (ô sáng lên); mở tay trên ĐÚNG nhóm → +10 điểm, thẻ vào ô, tiếng ĐÚNG', follow < 60 && hover && s.match.phase === 'done' && s.match.score[0] === 10 && s.match.outcome.ok && s.match.placed[it.g].includes(it.text) && d1.r === d0.r + 1, [follow, hover, s.match, d0, d1]);
  await page.evaluate(() => { __hands = []; }); await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvMagicHand.state().match.phase === 'ask'); await W(700);
  // Sai nhóm hai lần → lộ đáp án
  s = await mh(page); it = s.match.item; c0 = s.match.card; const wrongG = (it.g + 1) % 3; target = await page.evaluate(g => hmvMagicHand.binCenter(g), wrongG); d0 = await dsCount(page);
  const dragTo = async (from, to) => { await page.evaluate(c => __aim('mhStage', c.x, c.y), from); await W(250); await page.evaluate(c => __aim('mhStage', c.x, c.y, { pinch: true }), from); await W(250); for (let k = 1; k <= 4; k++) { await page.evaluate(([a, b, k]) => __aim('mhStage', a.x + (b.x - a.x) * k / 4, a.y + (b.y - a.y) * k / 4, { pinch: true }), [from, to, k]); await W(110); } await page.evaluate(b => __aim('mhStage', b.x, b.y), to); await W(450); };
  await dragTo(c0, target); s = await mh(page); d1 = await dsCount(page); const back1 = s.match.card; const home1 = await page.evaluate(() => hmvMagicHand.homePos());
  const wrong1 = s.match.phase === 'ask' && s.match.tries === 1 && s.match.score[0] === 10 && d1.w === d0.w + 1 && Math.hypot(back1.x - home1.x, back1.y - home1.y) < 30 && /Thử lại/.test(await page.textContent('#mhStatus'));
  await page.evaluate(() => { __hands = []; }); await W(300); await dragTo(home1, target); s = await mh(page);
  const reveal = await page.evaluate(g => ({ right: document.querySelectorAll('.mh-bin')[g].classList.contains('right'), banner: document.getElementById('mhBanner').textContent }), it.g);
  ok('8 Thả SAI nhóm: tiếng SAI, thẻ quay về chỗ cũ, nhắc "thử lại"; sai lần hai: lộ nhóm đúng (ô đúng sáng xanh), không cộng điểm', wrong1 && s.match.phase === 'done' && !s.match.outcome.ok && s.match.score[0] === 10 && s.match.placed[it.g].includes(it.text) && reveal.right && new RegExp('thuộc nhóm ' + ['Danh từ', 'Động từ', 'Tính từ'][it.g]).test(reveal.banner), [wrong1, s.match, reveal]);
  // Thẻ mới mà tay đang chụm sẵn trên chỗ thẻ: không nhặt nhầm
  await page.evaluate(c => __aim('mhStage', c.x, c.y, { pinch: true }), home1); await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvMagicHand.state().match.phase === 'ask'); await W(900); s = await mh(page);
  const noAuto = s.match.held === ''; await page.evaluate(c => __aim('mhStage', c.x, c.y), home1); await W(300); await page.evaluate(c => __aim('mhStage', c.x, c.y, { pinch: true }), home1); await W(300); s = await mh(page);
  ok('9 Thẻ mới hiện ra khi tay đang chụm sẵn: KHÔNG tự nhặt; mở tay rồi chụm lại mới nhặt', noAuto && s.match.held === 'hand', [noAuto, s.match.held]);
  // Mất dấu bàn tay khi đang cầm → thẻ về chỗ cũ
  await page.evaluate(() => { __hands = []; }); await W(1100); s = await mh(page);
  ok('10 Đang cầm thẻ mà camera mất dấu bàn tay: thẻ tự quay về chỗ cũ', s.match.held === '' && Math.hypot(s.match.card.x - home1.x, s.match.card.y - home1.y) < 30, s.match);
  // Chuột kéo thả
  it = s.match.item; target = await page.evaluate(g => hmvMagicHand.binCenter(g), it.g);
  const box = await page.$eval('#mhStage', e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top }; });
  await page.mouse.move(box.x + home1.x, box.y + home1.y); await page.mouse.down(); for (let k = 1; k <= 6; k++) { await page.mouse.move(box.x + home1.x + (target.x - home1.x) * k / 6, box.y + home1.y + (target.y - home1.y) * k / 6); await W(40); } await page.mouse.up(); await W(300); s = await mh(page);
  ok('11 Kéo thả bằng chuột (hoặc chạm màn hình) vào đúng nhóm: chấm đúng, +10 điểm', s.match.phase === 'done' && s.match.outcome.ok && s.match.score[0] === 20, s.match);
  // Phím số
  await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvMagicHand.state().match.phase === 'ask'); s = await mh(page); it = s.match.item;
  await page.keyboard.press(String(it.g + 1)); await W(250); s = await mh(page);
  ok('12 Phím số của nhóm (1–3): thả thẻ vào nhóm đó, máy chấm', s.match.phase === 'done' && s.match.outcome.ok && s.match.score[0] === 30, s.match);
  // Ghi cho Phân tích
  const ev = await page.evaluate(() => (JSON.parse(localStorage.getItem('hmv_ket_qua_v1') || '{"e":[]}').e || []).filter(e => e.g === 'magic-hand'));
  ok('13 Mỗi thẻ được ghi một lượt (lần thả đầu tiên) cho "Phân tích sau trò chơi"', ev.length === 4 && ev.filter(e => e.o === 1).length === 3, ev);
  // Đọc to: máy đọc chữ trên thẻ
  const cur = await page.evaluate(() => { const c = hmvDocTo._test.current(); return c ? { id: c.game, text: c.text } : null; });
  ok('14 Đọc to câu hỏi: trò này đọc chữ trên thẻ hiện tại', cur && cur.id === 'magic-hand' && cur.text === (await mh(page)).match.item.text, cur);
  // Kết thúc
  await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvMagicHand.state().match.phase === 'ask'); s = await mh(page); await page.keyboard.press(String(s.match.item.g + 1)); await W(200); await page.keyboard.press('Enter');
  await page.waitForSelector('.mh-end', { timeout: 5000 }); const end = await page.evaluate(() => ({ text: document.querySelector('.mh-end').innerText, bins: document.querySelectorAll('.mh-end-bins > div').length, mung: hmvMung.state().plays, cam: hmvMagicHand.state().streaming }));
  ok('15 Hết 5 thẻ: màn kết quả (số thẻ xếp đúng ngay lần đầu, điểm, danh sách thẻ trong từng nhóm), có tiếng mừng, camera tắt', /Xếp đúng ngay lần đầu/.test(end.text) && /40/.test(end.text) && end.bins === 3 && end.mung >= 1 && !end.cam, end);
  // Cách "giữ ngón trỏ" + hai đội
  await page.evaluate(() => { magicHandBack(); gameSetup('magic-hand'); }); await page.waitForSelector('#mhSetup'); await page.selectOption('#mhSet', 'goc'); await W(150); await page.selectOption('#mhGrab', 'dwell'); await page.selectOption('#mhMode', 'teams'); await page.selectOption('#mhCount', '5'); await W(150);
  await page.click('[data-mh="start"]'); await page.waitForFunction(() => hmvMagicHand.state().camera === 'ready', null, { timeout: 15000 }); await W(800);
  s = await mh(page); c0 = s.match.card; it = s.match.item; await page.evaluate(c => __aim('mhStage', c.x, c.y, {}, true), c0); await W(1300); const heldD = (await mh(page)).match.held;
  target = await page.evaluate(g => hmvMagicHand.binCenter(g), it.g); await page.evaluate(b => __aim('mhStage', b.x, b.y, {}, true), target); await W(1500); s = await mh(page);
  const grid = await page.evaluate(() => Array.from(document.querySelectorAll('.mh-bin b')).map(b => b.textContent).join());
  ok('16 Cách "giữ ngón trỏ yên": giữ trên thẻ ~1 giây là nhặt, giữ trên ô nhóm ~1 giây là thả; bộ Góc có 4 ô; chơi 2 đội: đội 1 được điểm, sang lượt đội 2', heldD === 'hand' && s.match.phase === 'done' && s.match.outcome.ok && s.match.score[0] === 10 && s.match.score[1] === 0 && grid === 'Góc nhọn,Góc vuông,Góc tù,Góc bẹt', [heldD, s.match, grid]);
  await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvMagicHand.state().match.phase === 'ask'); s = await mh(page);
  ok('17 Hai đội luân phiên: thẻ thứ hai là lượt của đội 2', s.match.turn === 1 && /Lượt của Đội Cam/.test(await page.textContent('#mhSub')), s.match.turn);
  await page.click('[data-mh="pause"]'); await page.evaluate(c => __aim('mhStage', c.x, c.y, {}, true), s.match.card); await W(1400); const ps = await mh(page);
  await page.click('[data-mh="pause"]');
  ok('18 Tạm dừng: không nhặt được thẻ, đồng hồ dừng', ps.match.paused && ps.match.held === '', ps.match);
  await page.evaluate(() => { __hands = []; openView('dashboard'); }); await W(300); const left = await page.evaluate(() => ({ type: classroomGame.type, cam: hmvMagicHand.state().streaming }));
  ok('19 Rời mục Trò chơi khi đang chơi: tắt camera, đóng trò', !left.type && !left.cam, left);

  // ---- Từ Kho câu hỏi: câu Đúng/Sai → hai ô Đúng / Sai ----
  await page.evaluate(() => openView('questions')); await W(200); await page.click('#questions [data-kho-play="mau-2-dung-sai"]'); await page.waitForSelector('#khoModal');
  const kb = await page.evaluate(() => { const b = document.querySelector('#khoModal [data-kho-start="magic-hand"]'), r = document.querySelector('#khoModal [data-kho-start="raise-hand"]'); return { mh: b && b.textContent.replace(/\s+/g, ' '), mhOn: b && !b.disabled, rh: r && r.textContent.replace(/\s+/g, ' '), rhOn: r && !r.disabled }; });
  await page.click('#khoModal [data-kho-start="magic-hand"]'); await page.waitForFunction(() => hmvMagicHand.state().match && hmvMagicHand.state().match.phase === 'ask', null, { timeout: 8000 }); s = await mh(page);
  ok('20 Kho câu hỏi → "Chơi ngay": có hai trò mới; bộ Đúng/Sai chơi Bàn tay phép thuật với hai ô Đúng – Sai, thẻ là các câu nhận định', kb.mhOn && kb.rhOn && /Bàn tay phép thuật/.test(kb.mh) && /Giơ tay giành quyền/.test(kb.rh) && s.match.groups.join() === 'Đúng,Sai' && s.match.total >= 5 && /Đúng hay Sai/.test(s.match.name), [kb, s.match]);
  await page.evaluate(() => magicHandBack()); await page.evaluate(() => openView('questions')); await W(200); await page.click('#questions [data-kho-play="mau-1-abcd"]'); await page.waitForSelector('#khoModal');
  const kb2 = await page.evaluate(() => { const b = document.querySelector('#khoModal [data-kho-start="magic-hand"]'); return { on: !b.disabled, text: b.textContent.replace(/\s+/g, ' ') }; });
  ok('21 Bộ A–B–C–D: nút "Bàn tay phép thuật" bị khóa (0 câu dùng được) vì trò này chỉ nhận câu Đúng/Sai', !kb2.on && /0\/\d+/.test(kb2.text), kb2);

  // ================= GIƠ TAY GIÀNH QUYỀN =================
  await page.click('#khoModal [data-kho-start="raise-hand"]'); await page.waitForFunction(() => hmvRaiseHand.state().match && hmvRaiseHand.state().camera === 'ready', null, { timeout: 15000 });
  let r = await rh(page); const rui = await page.evaluate(() => ({ zones: Array.from(document.querySelectorAll('.rh-zone-name')).map(z => z.textContent), ans: document.querySelectorAll('#rhAnswers .rh-ans').length, go: !!document.querySelector('[data-rh="go"]'), numHands: __hl.options.numHands, q: document.getElementById('rhQuestion').textContent }));
  ok('22 Giơ tay giành quyền (từ Kho, bộ A–D): 2 ô đội, câu hỏi và 4 phương án, nút "▶ Giơ tay!"; nhận tối đa 6 bàn tay', r.match.phase === 'ready' && r.match.n === 2 && rui.zones.length === 2 && /Đội Đỏ/.test(rui.zones[0]) && rui.ans === 4 && rui.go && rui.numHands === 6 && rui.q === r.match.question.text, [r.match, rui]);
  // Giơ tay khi chưa bấm: không tính. Bấm Giơ tay! → đếm 3-2-1; đội 2 giơ sớm → mất lượt
  await page.evaluate(() => { __hands = [__zone(2, 0)]; }); await W(600); r = await rh(page); const idle = r.match.phase === 'ready' && !r.match.locked[0];
  await page.evaluate(() => { __hands = []; }); await page.click('[data-rh="go"]'); await W(400); const big = await page.evaluate(() => ({ hid: document.getElementById('rhBig').hidden, t: document.getElementById('rhBig').textContent }));
  await page.evaluate(() => { __hands = [__zone(2, 1)]; }); await W(700); r = await rh(page);
  ok('23 Giơ tay lúc chưa có hiệu lệnh: không tính; bấm "Giơ tay!" → đếm 3-2-1; Đội Xanh giơ sớm trong lúc đếm → mất lượt câu này', idle && !big.hid && /^[123]$/.test(big.t) && r.match.locked[1] && !r.match.locked[0] && r.match.early[1] === 1 && /giơ tay trước hiệu lệnh/.test(r.match.note), [idle, big, r.match]);
  await page.evaluate(() => { __hands = []; }); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 5000 });
  await page.evaluate(() => { __hands = [__zone(2, 1)]; }); await W(600); r = await rh(page); const lockedTry = r.match.phase === 'open';
  await page.evaluate(() => { __hands = [__zone(2, 1), __zone(2, 0, { n: 0 })]; }); await W(500); r = await rh(page); const fist = r.match.phase === 'open';
  await page.evaluate(() => { __hands = [__zone(2, 1), __zone(2, 0)]; }); await W(600); r = await rh(page);
  const claimUI = await page.evaluate(() => ({ claimed: (document.querySelector('.rh-claimed') || {}).textContent, live: document.querySelectorAll('#rhAnswers .rh-ans.live').length, z: document.querySelectorAll('.rh-zone')[0].classList.contains('claimed') }));
  ok('24 "GIƠ TAY!": đội đã mất lượt giơ tay không tính; nắm tay không tính; Đội Đỏ giơ thẳng tay → giành quyền (ô đỏ sáng, phương án bấm được)', lockedTry && fist && r.match.phase === 'answer' && r.match.claimed === 0 && /Đội Đỏ giành quyền/.test(claimUI.claimed) && claimUI.live === 4 && claimUI.z, [lockedTry, fist, r.match, claimUI]);
  let rd0 = await dsCount(page); await page.click('#rhAnswers .rh-ans >> nth=' + r.match.question.correct); await W(300); r = await rh(page); let rd1 = await dsCount(page);
  ok('25 Thầy cô bấm phương án đội nói: đúng → +10 điểm, tiếng ĐÚNG, hiện đáp án', r.match.phase === 'done' && r.match.score[0] === 10 && r.match.outcome.ok && rd1.r === rd0.r + 1, [r.match, rd0, rd1]);
  // Câu 2: Đỏ sai → Xanh giành quyền
  await page.evaluate(() => { __hands = []; }); await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'ready'); r = await rh(page);
  ok('26 Sang câu mới: mọi đội được giơ tay lại (hết mất lượt)', r.match.locked.every(x => !x) && r.match.q === 1, r.match);
  await page.keyboard.press(' '); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 5000 });
  await page.evaluate(() => { __hands = [__zone(2, 0)]; }); await W(150); await page.evaluate(() => { __hands = [__zone(2, 0), __zone(2, 1)]; }); await W(600); r = await rh(page);
  const firstWins = r.match.claimed === 0;
  rd0 = await dsCount(page); await page.keyboard.press(String.fromCharCode(97 + (r.match.question.correct + 1) % 4)); await W(300); r = await rh(page); rd1 = await dsCount(page);
  const re = r.match.phase === 'reopen' && r.match.locked[0] && rd1.w === rd0.w + 1;
  await page.evaluate(() => { __hands = [__zone(2, 1)]; }); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'answer', null, { timeout: 5000 }); r = await rh(page);
  ok('27 Hai đội cùng giơ: đội giơ trước giành quyền; trả lời sai (phím A–D) → tiếng SAI, đội đó mất lượt, các đội còn lại giơ tay giành quyền tiếp', firstWins && re && r.match.claimed === 1, [firstWins, re, r.match]);
  await page.keyboard.press(String(r.match.question.correct + 1)); await W(300); r = await rh(page);
  ok('28 Đội Xanh trả lời đúng (phím số): +10 điểm cho Đội Xanh', r.match.phase === 'done' && r.match.score[1] === 10 && r.match.score[0] === 10, r.match);
  await page.evaluate(() => { __hands = []; raiseHandBack(); }); ok('29 Không có lỗi JavaScript trong phần trên', logs.length === 0, logs); logs.length = 0; await ctx.close();

  // ---- Giơ tay: 4 đội, không camera, câu nói, hết giờ, tự đếm sau khi đọc ----
  ({ ctx, page } = await open(browser, { voice: true }));
  await page.evaluate(() => { openView('games'); gameSetup('raise-hand'); }); await page.waitForSelector('#rhSetup');
  await page.selectOption('#rhTeams', '4'); await W(150); const names = await page.evaluate(() => Array.from(document.querySelectorAll('.rh-team-name')).filter(l => !l.hidden).length);
  await page.selectOption('#rhControl', 'camera'); await page.selectOption('#rhAnswerTime', '10'); await page.selectOption('#rhOpenTime', '15'); await page.selectOption('#rhAutoGo', '1'); await page.selectOption('#rhCount', '5');
  await page.evaluate(() => hmvDocTo.set({ auto: true, wait: true, engine: 'browser' })); await page.evaluate(() => { window.__speechMs = 900; });
  await page.click('[data-rh="start"]'); await page.waitForFunction(() => hmvRaiseHand.state().camera === 'ready', null, { timeout: 15000 });
  r = await rh(page); const zones4 = await page.evaluate(() => document.querySelectorAll('.rh-zone').length);
  const autoCount = await page.waitForFunction(() => ['count', 'open'].indexOf(hmvRaiseHand.state().match.phase) >= 0, null, { timeout: 8000 }).then(() => true, () => false); const spoken = await page.evaluate(() => window.__spoken.length);
  ok('30 4 đội (hiện đủ 4 ô tên đội); bật "Tự đọc khi sang câu mới" + "Tự đếm sau khi đọc": máy đọc câu hỏi xong thì tự đếm 3-2-1', names === 4 && zones4 === 4 && r.match.n === 4 && autoCount && spoken >= 1, [names, zones4, autoCount, spoken]);
  await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 6000 });
  await page.evaluate(() => { __hands = [{ x: 0.1, y: 0.45, n: 4 }]; }); await W(600); r = await rh(page);
  ok('31 Hình camera được lật như soi gương: bàn tay ở mép trái ảnh camera (mép phải màn hình) thuộc ô đội 4', r.match.claimed === 3, r.match);
  await page.evaluate(() => { __hands = []; }); await page.waitForFunction(() => hmvRaiseHand.state().match.phase !== 'answer', null, { timeout: 14000 }); r = await rh(page);
  ok('32 Hết 10 giây trả lời mà chưa chấm: tính là sai, đội đó mất lượt, các đội còn lại được giành quyền', r.match.locked[3] && (r.match.phase === 'reopen' || r.match.phase === 'open') && /hết giờ trả lời/.test(r.match.note), r.match);
  await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'done', null, { timeout: 20000 }); r = await rh(page);
  ok('33 Không đội nào giơ tay trong 15 giây: công bố đáp án, không ai được điểm', r.match.outcome && r.match.outcome.why === 'none' && r.match.score.every(x => x === 0) && /Không đội nào giành được quyền/.test(await page.textContent('#rhBanner')), r.match);
  // Không camera: bấm ô đội; câu nói (không có đáp án)
  await page.click('[data-rh="camera"]'); await W(200); await page.evaluate(() => { const st = hmvRaiseHand.state(); }); await page.keyboard.press('Enter'); await page.waitForFunction(() => hmvRaiseHand.state().match.phase !== 'done', null, { timeout: 4000 });
  await page.evaluate(() => hmvDocTo.set({ auto: false })); await page.waitForFunction(() => ['ready', 'count', 'open'].indexOf(hmvRaiseHand.state().match.phase) >= 0); r = await rh(page); if (r.match.phase === 'ready') await page.keyboard.press(' ');
  await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 6000 }); await page.click('.rh-zone >> nth=2'); await W(200); r = await rh(page);
  ok('34 Tắt camera: thầy cô bấm vào ô của đội giơ tay trước → đội đó giành quyền', r.match.phase === 'answer' && r.match.claimed === 2 && !(await rh(page)).streaming, r.match);
  await page.evaluate(() => raiseHandBack());
  // Câu nói (không khóa đáp án): dùng bộ tạm trong Kho
  await page.evaluate(() => { const q = [{ text: 'Em hãy kể tên ba con vật sống dưới nước.', answers: [], correct: null, kind: 'ORAL' }, { text: 'Nêu một việc em làm để tiết kiệm nước.', answers: [], correct: null, kind: 'ORAL' }, { text: 'Kể tên hai loại quả có vị chua.', answers: [], correct: null, kind: 'ORAL' }, { text: 'Nói một câu có từ "chăm chỉ".', answers: [], correct: null, kind: 'ORAL' }]; window.hmvC6QuestionsForGame = (t => function (g) { return g === 'raise-hand' ? q : t(g); })(window.hmvC6QuestionsForGame || function () { return null; }); });
  await page.evaluate(() => { gameSetup('raise-hand'); }); await page.waitForSelector('#rhSetup'); await page.selectOption('#rhControl', 'touch'); await page.selectOption('#rhTeams', '2'); await page.click('[data-rh="start"]'); await W(300);
  await page.keyboard.press(' '); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 6000 }); await page.keyboard.press('2'); await W(200);
  const oral = await page.evaluate(() => ({ note: (document.querySelector('.rh-open-note') || {}).textContent, ok: !!document.querySelector('[data-rh="ok"]'), bad: !!document.querySelector('[data-rh="bad"]') }));
  await page.keyboard.press('y'); await W(200); r = await rh(page);
  ok('35 Câu hỏi nói (không có phương án): hiện ✓ Đúng / ✗ Sai cho thầy cô chấm; phím Y = đúng → Đội Xanh +10', oral.ok && oral.bad && /thầy cô chấm/.test(oral.note || '') && r.match.phase === 'done' && r.match.score[1] === 10, [oral, r.match]);
  // Kết thúc
  for (let i = 0; i < 6; i++) { r = await rh(page); if (!r.match || r.match.phase === 'end') break; if (r.match.phase === 'done') { await page.keyboard.press('Enter'); await W(150); continue; } if (r.match.phase === 'ready') { await page.keyboard.press(' '); await page.waitForFunction(() => hmvRaiseHand.state().match.phase === 'open', null, { timeout: 6000 }); } await page.keyboard.press('2'); await W(100); await page.keyboard.press('y'); await W(150); }
  await page.waitForSelector('.rh-end', { timeout: 6000 }); const rend = await page.evaluate(() => ({ text: document.querySelector('.rh-end').innerText, rows: document.querySelectorAll('.rh-table tbody tr').length, mung: hmvMung.state().plays }));
  ok('36 Hết câu: bảng xếp hạng (điểm, số lần trả lời đúng, giành quyền, giơ sớm), đội thắng có tiếng mừng', rend.rows === 2 && /Đội Xanh chiến thắng/.test(rend.text) && rend.mung >= 1, rend);
  ok('37 Không có lỗi JavaScript trong phần này', logs.length === 0, logs); await ctx.close();

  // ---- Bố cục ở màn hình 1280×800 và 1366×768 (đo, không nhìn bằng mắt) ----
  for (const vp of [{ width: 1280, height: 800 }, { width: 1366, height: 768 }]) {
    ({ ctx, page } = await open(browser, { viewport: vp }));
    await page.evaluate(() => { openView('games'); gameSetup('magic-hand'); }); await page.waitForSelector('#mhSetup'); await page.selectOption('#mhControl', 'touch'); await page.click('[data-mh="start"]'); await W(500);
    const lay = await page.evaluate(() => { const st = document.getElementById('mhStage').getBoundingClientRect(), card = document.getElementById('mhCard').getBoundingClientRect(), bins = document.getElementById('mhBins').getBoundingClientRect(), ask = document.querySelector('.mh-ask').getBoundingClientRect(), status = document.getElementById('mhStatus').getBoundingClientRect(); return { stBottom: st.bottom, vh: innerHeight, cardInside: card.top >= st.top && card.bottom <= bins.top, binsInside: bins.bottom <= st.bottom, askAbove: ask.bottom <= card.top + 4, statusBelow: status.top >= bins.bottom - 2 }; });
    await page.screenshot({ path: path.join(__dirname, 'mh-' + vp.width + '.png') });
    await page.evaluate(() => { magicHandBack(); gameSetup('raise-hand'); }); await page.waitForSelector('#rhSetup'); await page.selectOption('#rhControl', 'touch'); await page.selectOption('#rhTeams', '3'); await page.click('[data-rh="start"]'); await W(500);
    const lay2 = await page.evaluate(() => { const st = document.getElementById('rhStage').getBoundingClientRect(), qb = document.querySelector('.rh-qbox').getBoundingClientRect(), go = document.querySelector('[data-rh="go"]').getBoundingClientRect(), name = document.querySelector('.rh-zone-name').getBoundingClientRect(); return { qInside: qb.bottom <= go.top, goAboveNames: go.bottom <= name.top, namesInside: name.bottom <= st.bottom, stFits: st.bottom <= innerHeight + 1 }; });
    await page.screenshot({ path: path.join(__dirname, 'rh-' + vp.width + '.png') });
    ok('38 Bố cục ' + vp.width + '×' + vp.height + ': Bàn tay phép thuật – lời nhắc, thẻ, các ô nhóm, dòng trạng thái không đè nhau; Giơ tay – câu hỏi, nút Giơ tay, tên đội nằm gọn', lay.cardInside && lay.binsInside && lay.askAbove && lay.statusBelow && lay.stBottom <= lay.vh + 1 && lay2.qInside && lay2.goAboveNames && lay2.namesInside && lay2.stFits, [lay, lay2]);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'tro-moi-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.10-20261012', note: 'Camera giả của Chromium, bộ nhận diện bàn tay giả (vị trí bàn tay đặt bằng mã), giọng đọc giả. Chưa thử với bàn tay và webcam thật.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
