// Kiểm thử bản 2.0: "Bình chọn ngón tay". Camera giả của Chromium + bộ nhận diện bàn tay GIẢ (fake-hands.mjs).
// Việc đếm ngón trên ảnh thật được kiểm riêng bằng mô hình MediaPipe thật (xem DOC-TRUOC.md).
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/'; const fake = fs.readFileSync(path.join(__dirname, 'fake-hands.mjs'), 'utf8');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 700) : '')); };
const logs = [];
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, permissions: opts.deny ? [] : ['camera'], serviceWorkers: 'block' });
  if (opts.model === false) { await ctx.route('**/vendor/mediapipe/**', r => r.fulfill({ status: 404, body: '' })); await ctx.route('https://cdn.jsdelivr.net/**', r => r.abort()); await ctx.route('https://storage.googleapis.com/**', r => r.abort()); }
  else await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); });
  const page = await ctx.newPage(); if (process.env.HMV_FAKE_VOICE) await page.addInitScript({ path: path.join(__dirname, '..', 'qa13', 'fake-speech.js') }); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && window.hmvPoll && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 15000 }); await page.waitForTimeout(500);
  return { ctx, page };
}
const st = page => page.evaluate(() => hmvPoll.state());
const hands = (page, list) => page.evaluate(l => { window.__hands = l; }, list);
const setup = async (page, sel = {}) => { await page.evaluate(() => { openView('games'); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); for (const [k, v] of Object.entries(sel)) await page.selectOption('#' + k, String(v)); };
const startCam = async (page) => { await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); };
const countAndWait = async (page) => { await page.click('#bcControls [data-bc="count"]'); await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 20000 }); await page.waitForTimeout(150); };
const G = [{ x: .15, y: .3, n: 1 }, { x: .3, y: .25, n: 2 }, { x: .45, y: .3, n: 2 }, { x: .6, y: .25, n: 3 }, { x: .75, y: .3, n: 4 }];

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  let { ctx, page } = await open(browser);
  // ---------- Lối vào ----------
  await page.evaluate(() => openView('games')); await page.waitForTimeout(400);
  const card = await page.evaluate(() => { const c = Array.from(document.querySelectorAll('#games .game-library-card')).find(x => x.querySelector('h3') && x.querySelector('h3').textContent.trim() === 'Bình chọn ngón tay'); return c ? { tags: Array.from(c.querySelectorAll('.game-tags span')).map(s => s.textContent), badge: !!c.querySelector('.bb-new'), n: document.querySelectorAll('#games .game-library-card').length } : null; });
  ok('1 Thư viện có thẻ "Bình chọn ngón tay" (nhãn Mới, ghi rõ dùng camera AI); thư viện có 10 thẻ (2.9: thêm Bàn tay phép thuật, Giơ tay giành quyền)', card && card.badge && /Camera AI/.test(card.tags.join()) && card.n === 10, card);
  await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(200); await page.click('#thHome .th-try .th-row >> nth=0'); await page.waitForSelector('#bcSetup');
  ok('2 Trang chủ, mục "Chơi bằng camera": dòng Bình chọn ngón tay mở màn thiết lập', /Bình chọn ngón tay/.test(await page.textContent('#thHome .th-try .th-row >> nth=0')) && await page.evaluate(() => classroomGame.type === 'poll'));
  const su = await page.evaluate(() => ({ legend: Array.from(document.querySelectorAll('#bcSetup .bc-legend span')).map(s => s.innerText.replace(/\s+/g, ' ').trim()), svgs: document.querySelectorAll('#bcSetup .bc-legend svg').length, steps: document.querySelectorAll('#bcSetup .bc-how li').length, privacy: /không lưu và không gửi hình ảnh/.test(document.querySelector('#bcSetup .bc-privacy').textContent), source: document.getElementById('bcSource').value, bankHidden: Array.from(document.querySelectorAll('#bcSetup .bc-only-bank')).every(e => e.hidden), quickShown: Array.from(document.querySelectorAll('#bcSetup .bc-only-quick')).every(e => !e.hidden), full: !!document.querySelector('#games .hmv-full-btn') }));
  ok('3 Màn thiết lập: bảng quy ước 1 ngón = A … 4 ngón = D (hình vẽ riêng), 3 bước, cam kết không lưu hình; có nút Toàn màn hình', su.legend.join('|') === 'A 1 ngón|B 2 ngón|C 3 ngón|D 4 ngón' && su.svgs === 4 && su.steps === 3 && su.privacy && su.full, su);
  await page.selectOption('#bcSource', 'bank'); const tog = await page.evaluate(() => [Array.from(document.querySelectorAll('#bcSetup .bc-only-bank')).every(e => !e.hidden), Array.from(document.querySelectorAll('#bcSetup .bc-only-quick')).every(e => e.hidden), /câu dùng được/.test(document.querySelector('#bcSetup .bc-source').textContent)]); await page.selectOption('#bcSource', 'quick');
  ok('4 Đổi "Cách hỏi": Hỏi nhanh hiện Số lựa chọn; Dùng bộ trong Kho hiện Số câu và tên bộ', su.source === 'quick' && su.bankHidden && su.quickShown && tog.every(Boolean), tog);

  // ---------- Hỏi nhanh, camera ----------
  await page.selectOption('#bcTime', '4'); await startCam(page);
  let s = await st(page); const hl = await page.evaluate(() => ({ mode: __hl.options.runningMode, n: __hl.options.numHands, conf: __hl.options.minHandDetectionConfidence }));
  ok('5 Bắt đầu: mở camera, nạp bộ nhận diện ở chế độ ảnh tĩnh, tối đa 12 bàn tay mỗi lượt dò, hạ ngưỡng để thấy tay nhỏ', s.camera === 'ready' && s.streaming && hl.mode === 'IMAGE' && hl.n === 12 && hl.conf === 0.4 && s.match.phase === 'ready' && s.match.mode === 'quick' && s.match.options === 4, [s.camera, hl]);
  await hands(page, G.concat([{ x: .88, y: .3, n: 0 }, { x: .9, y: .7, n: 4, down: true }, { x: .1, y: .75, n: 0, thumb: true }])); await page.waitForTimeout(700);
  s = await st(page); const crops = await page.evaluate(() => Array.from(new Set(__hl.crops)));
  ok('6 Mỗi lượt dò: cả khung hình + 6 ô phóng to chồng mép (3 cột × 2 hàng)', crops.length === 7 && crops.includes('0,0,1,1') && crops.includes('0,0,0.5,0.6') && crops.includes('0.5,0.4,0.5,0.6') && crops.includes('0.25,0,0.5,0.6'), crops);
  ok('7 Đếm ngón: 1→A, 2→B, 2→B, 3→C, 4→D; nắm tay, tay chúc xuống, chỉ giơ ngón cái đều KHÔNG tính', s.live.counts.join() === '1,2,1,1' && s.tracks === 8 && s.live.marks.filter(m => m.vote < 0).length === 3, s.live);
  ok('8 Cùng một bàn tay bị thấy ở nhiều ô vẫn chỉ là một phiếu (8 bàn tay → 8 vết, không nhân đôi)', s.tracks === 8 && s.live.counts.reduce((a, b) => a + b, 0) === 5, [s.tracks, s.live.counts]);
  const marks = await page.evaluate(() => Array.from(document.querySelectorAll('#bcMarks .bc-mark')).map(m => ({ t: m.textContent, left: parseFloat(m.style.left), idle: m.classList.contains('idle') })));
  ok('9 Trên hình camera (soi gương): mỗi bàn tay có nhãn A/B/C/D; nắm tay ✊, tay chúc xuống ↓; vị trí lật theo gương', marks.length === 8 && marks.filter(m => m.t === 'B').length === 2 && marks.some(m => m.t === '✊') && marks.some(m => m.t === '↓') && Math.abs(marks.find(m => m.t === 'A').left - 85) < 3 && /Đang thấy 8 bàn tay · 5 phiếu/.test(await page.textContent('#bcSeen')), marks);
  await page.click('#bcControls [data-bc="count"]'); await page.waitForTimeout(600);
  s = await st(page); const during = await page.evaluate(() => ({ timer: document.getElementById('bcTimer') && document.getElementById('bcTimer').textContent, plusOff: Array.from(document.querySelectorAll('#bcBars [data-bc-plus]')).every(b => b.disabled), nums: Array.from(document.querySelectorAll('#bcBars [data-bc-num]')).map(n => n.textContent) }));
  ok('10 "Bắt đầu đếm": đếm ngược 4 giây, biểu đồ chạy theo số phiếu đang thấy, khóa nút +/− trong lúc đếm', s.match.phase === 'count' && /^[34]$/.test(during.timer) && during.plusOff && during.nums.join() === '1,2,1,1', during);
  await page.keyboard.press('2'); await page.waitForTimeout(100); ok('11 Đang đếm thì phím số không cộng phiếu', (await st(page)).match.tally.join() === '0,0,0,0');
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 15000 }); await page.waitForTimeout(150);
  s = await st(page); const r1 = await page.evaluate(() => ({ nums: Array.from(document.querySelectorAll('#bcBars [data-bc-num]')).map(n => n.textContent.replace(/\s+/g, ' ')), sum: document.getElementById('bcSummary').textContent, ctl: Array.from(document.querySelectorAll('#bcControls button')).map(b => b.textContent.trim()), widths: Array.from(document.querySelectorAll('#bcBars .bc-track i')).map(i => i.style.width) }));
  ok('12 Hết giờ tự chốt: A 1 · B 2 · C 1 · D 1 kèm phần trăm; cột dài theo tỉ lệ; nêu lựa chọn nhiều nhất', s.match.tally.join() === '1,2,1,1' && r1.nums.join('|') === '120%|240%|120%|120%' && r1.widths.join() === '50%,100%,50%,50%' && /Tổng 5 phiếu/.test(r1.sum) && /Nhiều nhất: B \(2 phiếu\)/.test(r1.sum), r1);
  ok('13 Sau khi chốt có ba nút: Đếm thêm nhóm khác, Đếm lại, Câu hỏi mới', r1.ctl.length === 3 && /Đếm thêm nhóm khác/.test(r1.ctl[0]) && /Đếm lại/.test(r1.ctl[1]) && /Câu hỏi mới/.test(r1.ctl[2]), r1.ctl);
  // cộng dồn nhóm thứ hai; tay lắc lư; tay hạ sớm
  await hands(page, [{ x: .2, y: .3, n: 3 }, { x: .5, y: .3, n: 3 }, { x: .8, y: .3, n: 1 }]);
  await page.click('#bcControls [data-bc="count"]'); await page.waitForTimeout(400);
  const wob = setInterval(() => {}, 1e9); let flip = 0; const timer = setInterval(() => { flip++; page.evaluate(f => { const h = window.__hands; if (h && h[0]) h[0].n = f % 4 === 3 ? 2 : 3; }, flip).catch(() => {}); }, 150);
  await page.waitForTimeout(1200); await page.evaluate(() => { window.__hands = window.__hands.slice(0, 2); });   // bàn tay thứ ba hạ xuống khi còn khoảng 2,4 giây
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 15000 }); clearInterval(timer); clearInterval(wob); await page.waitForTimeout(150);
  s = await st(page);
  ok('14 "Đếm thêm nhóm khác": cộng dồn vào kết quả cũ; tay lắc lư lấy số ngón xuất hiện nhiều nhất; tay hạ sớm không tính', s.match.tally.join() === '1,2,3,1' && s.match.rounds === 2 && /qua 2 lượt đếm/.test(await page.textContent('#bcSummary')), s.match);
  // sửa tay
  await page.click('#bcBars [data-bc-plus="3"]'); await page.click('#bcBars [data-bc-plus="3"]'); await page.click('#bcBars [data-bc-minus="2"]'); await page.keyboard.press('1'); await page.keyboard.press('a'); await page.keyboard.press('Shift+Digit2'); await page.waitForTimeout(100);
  s = await st(page); ok('15 Sửa tay: nút + và −, phím 1–4 hoặc A–D cộng phiếu, Shift + số trừ phiếu', s.match.tally.join() === '3,1,2,3', s.match.tally);
  for (let i = 0; i < 5; i++) await page.click('#bcBars [data-bc-minus="1"]'); ok('16 Số phiếu không xuống dưới 0', (await st(page)).match.tally[1] === 0);
  await page.click('#bcControls [data-bc="recount"]'); await page.waitForTimeout(100); s = await st(page); ok('17 "Đếm lại": xóa phiếu của câu này, quay về chờ đếm', s.match.tally.join() === '0,0,0,0' && s.match.phase === 'ready' && s.match.rounds === 0);
  await hands(page, G); await page.waitForTimeout(400); await countAndWait(page); await page.click('#bcControls [data-bc="next"]'); await page.waitForTimeout(150);
  s = await st(page); ok('18 "Câu hỏi mới": ghi lại kết quả câu trước, sang câu 2, phiếu về 0', s.match.results.length === 1 && s.match.results[0].counts.join() === '1,2,1,1' && s.match.results[0].correct === null && s.match.tally.join() === '0,0,0,0' && /câu 2/.test(await page.textContent('#bcSub')), s.match.results);
  // phím cách
  await page.keyboard.press('Space'); await page.waitForTimeout(300); const sp1 = (await st(page)).match.phase; await page.keyboard.press('Space'); await page.waitForTimeout(200); const sp2 = (await st(page)).match;
  ok('19 Phím cách: bắt đầu đếm, bấm lần nữa chốt ngay', sp1 === 'count' && sp2.phase === 'result' && sp2.tally.join() === '1,2,1,1', [sp1, sp2.phase, sp2.tally]);
  await page.click('#games [data-bc="finish"]'); await page.waitForSelector('#games .bc-end'); const end1 = await page.evaluate(() => ({ rows: document.querySelectorAll('#games .bc-table tbody tr').length, head: document.querySelector('#games .bc-headline').textContent, cells: Array.from(document.querySelectorAll('#games .bc-table tbody tr:first-child td')).map(t => t.textContent), cam: hmvPoll.state().camera, closed: __hl.closed }));
  ok('20 "Kết thúc": bảng tổng kết 2 lần bình chọn với số phiếu từng lựa chọn; camera tắt, bộ nhận diện được giải phóng', end1.rows === 2 && /Đã ghi 2 lần bình chọn/.test(end1.head) && end1.cells.slice(2, 7).join() === '1,2,1,1,5' && end1.cam === 'off' && end1.closed >= 1, end1);
  // 2 lựa chọn
  await page.click('#games [data-bc="back"]'); await setup(page, { bcOptions: 2, bcTime: 4 }); await startCam(page); await hands(page, G); await page.waitForTimeout(500); s = await st(page);
  ok('21 Chỉ có 2 lựa chọn: tay giơ 3 hoặc 4 ngón không được tính; biểu đồ chỉ có A và B', s.live.counts.join() === '1,2,0,0' && (await page.evaluate(() => document.querySelectorAll('#bcBars .bc-row').length)) === 2, s.live.counts);
  await hands(page, [{ x: .3, y: .3, n: 2, thumb: true }, { x: .6, y: .3, n: 1, thumb: true }]); await page.waitForTimeout(3000); s = await st(page);
  ok('22 Ngón cái duỗi ra không làm sai phiếu (2 ngón + ngón cái vẫn là B; 1 ngón + ngón cái vẫn là A)', s.live.counts.join() === '1,1,0,0', s.live.counts);
  await page.evaluate(() => { window.__noWorld = true; }); await page.waitForTimeout(600); s = await st(page); ok('23 Thiếu tọa độ không gian: vẫn đếm được bằng tọa độ ảnh', s.live.counts.join() === '1,1,0,0', s.live.counts); await page.evaluate(() => { window.__noWorld = false; });
  // máy chậm
  await page.evaluate(() => { window.__slow = 260; }); await page.waitForFunction(() => hmvPoll.state().scanSlow === true, null, { timeout: 30000 }); await page.evaluate(() => { window.__slow = 0; __hl.crops = []; }); await page.waitForTimeout(500);
  const slow = await page.evaluate(() => ({ crops: Array.from(new Set(__hl.crops)), seen: document.getElementById('bcSeen').textContent, live: hmvPoll.state().live.counts.join() }));
  ok('24 Máy chậm (mỗi lượt dò quá 1,1 giây): tự chuyển sang chỉ dò cả khung, có báo trên màn hình, vẫn đếm', slow.crops.join() === '0,0,1,1' && /máy chậm/.test(slow.seen) && slow.live === '1,1,0,0', slow);
  // rời màn hình → tắt camera
  const tracksBefore = await page.evaluate(() => document.getElementById('bcVideo').srcObject.getTracks().map(t => t.readyState).join()); await page.evaluate(() => { window.__s = document.getElementById('bcVideo').srcObject; openView('dashboard'); }); await page.waitForTimeout(300);
  ok('25 Rời mục Hoạt động khi đang bình chọn: camera tắt hẳn', tracksBefore === 'live' && await page.evaluate(() => window.__s.getTracks().every(t => t.readyState === 'ended') && hmvPoll.state().camera === 'off' && !classroomGame.type));
  await ctx.close();

  // ---------- Bộ câu hỏi trong Kho ----------
  ({ ctx, page } = await open(browser));
  await page.evaluate(() => openView('questions')); await page.waitForSelector('#questions [data-kho-play="mau-1-abcd"]'); await page.click('#questions [data-kho-play="mau-1-abcd"]'); await page.waitForSelector('#khoModal');
  const kb = await page.evaluate(() => { const b = document.querySelector('#khoModal [data-kho-start="poll"]'); return b ? { text: b.innerText.replace(/\n+/g, ' '), disabled: b.disabled } : null; });
  ok('26 Kho → Chơi ngay: có "Bình chọn ngón tay", dùng được 20/20 câu A–B–C–D', kb && !kb.disabled && /Bình chọn ngón tay 20\/20/.test(kb.text), kb);
  await page.click('#khoModal [data-kho-start="poll"]'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); await page.waitForTimeout(300);
  s = await st(page); const q1 = s.match.question; const shown = await page.evaluate(() => ({ q: document.getElementById('bcQuestion').textContent, labels: Array.from(document.querySelectorAll('#bcBars .bc-label')).map(l => l.textContent.trim()), sub: document.getElementById('bcSub').textContent }));
  ok('27 Vào thẳng bình chọn với bộ đã chọn: hiện câu hỏi và bốn phương án, đúng thứ tự của bộ', s.match.mode === 'bank' && s.match.total === 10 && shown.q === q1.text && shown.labels.join('|') === q1.answers.join('|') && /Câu 1\/10 · Mẫu 1/.test(shown.sub) && q1.text === '3 + 4 = ?', shown);
  const votes = [0, 0, 0, 0]; const mk = (correct) => { const list = []; const xs = [.15, .3, .45, .6, .75]; for (let i = 0; i < 5; i++) { const opt = i < 3 ? correct : (correct + 1) % 4; list.push({ x: xs[i], y: .3, n: opt + 1 }); } return list; };
  await hands(page, mk(q1.correct)); await page.waitForTimeout(400); await page.evaluate(() => { document.getElementById('bcTime'); }); await countAndWait(page);
  const rr = await page.evaluate(() => ({ right: Array.from(document.querySelectorAll('#bcBars .bc-row')).map(r => r.classList.contains('right')), dim: Array.from(document.querySelectorAll('#bcBars .bc-row')).map(r => r.classList.contains('dim')), sum: document.getElementById('bcSummary').textContent, mark: (document.querySelector('#bcBars .bc-row.right .bc-label em') || {}).textContent, next: document.querySelector('#bcControls [data-bc="next"]').textContent }));
  ok('28 Chốt câu có đáp án: tô xanh phương án đúng, làm mờ phương án sai, báo "3/5 bạn chọn đúng (60%)"', rr.right.indexOf(true) === q1.correct && rr.right.filter(Boolean).length === 1 && rr.dim.filter(Boolean).length === 3 && /3\/5 bạn chọn đúng \(60%\)/.test(rr.sum) && /Đáp án đúng/.test(rr.mark) && /Câu tiếp theo/.test(rr.next), rr);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150); s = await st(page); const q2 = s.match.question;
  ok('29 Phím Enter sang câu tiếp theo; kết quả câu 1 được ghi kèm đáp án đúng', s.match.q === 1 && s.match.phase === 'ready' && s.match.results.length === 1 && s.match.results[0].right === 3 && s.match.results[0].total === 5 && s.match.results[0].correct === q1.correct, s.match.results);
  await hands(page, [{ x: .2, y: .3, n: ((q2.correct + 1) % 4) + 1 }, { x: .5, y: .3, n: ((q2.correct + 1) % 4) + 1 }, { x: .8, y: .3, n: ((q2.correct + 2) % 4) + 1 }, { x: .65, y: .3, n: q2.correct + 1 }]); await page.waitForTimeout(400); await countAndWait(page);
  await page.click('#bcControls [data-bc="next"]'); await page.waitForTimeout(100); await page.click('#bcControls [data-bc="next"]'); await page.waitForTimeout(100); s = await st(page);
  ok('30 "Bỏ qua câu này" khi chưa có phiếu: sang câu sau, không ghi kết quả rỗng', s.match.q === 3 && s.match.results.length === 2, [s.match.q, s.match.results.length]);
  await page.click('#games [data-bc="finish"]'); await page.waitForSelector('#games .bc-end'); const end2 = await page.evaluate(() => ({ head: document.querySelector('#games .bc-headline').textContent, rows: Array.from(document.querySelectorAll('#games .bc-table tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent.replace(/\s+/g, ' ')).join(' | ')), okCells: document.querySelectorAll('#games .bc-table td.ok').length }));
  ok('31 Tổng kết bộ câu hỏi: tỉ lệ đúng chung (4/9 lượt, 44%), nêu câu cần ôn nhất (câu 2: 25%), tô ô đáp án đúng', /chọn đúng 4\/9 lượt \(44%\)/.test(end2.head) && /Câu cần ôn lại nhất: câu 2/.test(end2.head) && end2.rows.length === 2 && /60%$/.test(end2.rows[0]) && /25%$/.test(end2.rows[1]) && end2.okCells === 2, end2);
  await page.click('#games .bc-end [data-bc="start"]'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.phase === 'ready'); ok('32 "Bình chọn tiếp" từ màn tổng kết: bắt đầu lượt mới với cùng bộ', (await st(page)).match.total === 10 && (await st(page)).match.results.length === 0);
  // Đúng/Sai
  await page.evaluate(() => openView('questions')); await page.click('#questions [data-kho-play="mau-2-dung-sai"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="poll"]'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().camera === 'ready' && hmvPoll.state().match.options === 2, null, { timeout: 15000 });
  s = await st(page); await hands(page, [{ x: .2, y: .3, n: 1 }, { x: .5, y: .3, n: 1 }, { x: .8, y: .3, n: 2 }, { x: .65, y: .3, n: 4 }]); await page.waitForTimeout(500); const tf = await page.evaluate(() => ({ labels: Array.from(document.querySelectorAll('#bcBars .bc-label')).map(l => l.textContent.trim()), keys: Array.from(document.querySelectorAll('#bcBars .bc-key b')).map(b => b.textContent), live: hmvPoll.state().live.counts.join() }));
  ok('33 Câu Đúng/Sai: 1 ngón = Đúng, 2 ngón = Sai; tay 4 ngón không tính', tf.labels.join() === 'Đúng,Sai' && tf.keys.join('') === '' && tf.live === '2,1,0,0' && s.match.question.answers.join() === 'Đúng,Sai', tf);
  // vừa khít màn hình
  for (const vp of [{ width: 1366, height: 768 }, { width: 1774, height: 934 }]) { await page.setViewportSize(vp); await page.waitForTimeout(400); await hands(page, G.slice(0, 2)); await countAndWait(page); const f = await page.evaluate(() => { const c = document.getElementById('bcControls').getBoundingClientRect(), s = document.getElementById('bcStage').getBoundingClientRect(), p = document.querySelector('.bc-panel'); return { ctlBottom: Math.round(c.bottom), stageBottom: Math.round(s.bottom), h: innerHeight, scrollX: document.documentElement.scrollWidth - innerWidth, panelScroll: p.scrollHeight - p.clientHeight, barsScroll: document.getElementById('bcBars').scrollHeight - document.getElementById('bcBars').clientHeight }; }); ok('34 Màn ' + vp.width + '×' + vp.height + ': khung bình chọn vừa một màn hình, nút điều khiển luôn thấy, không cuộn ngang', f.stageBottom <= f.h && f.ctlBottom <= f.h && f.scrollX <= 1 && f.panelScroll <= 1, f); await page.click('#bcControls [data-bc="recount"]'); }
  await page.setViewportSize({ width: 1366, height: 768 }); await hands(page, G); await page.waitForTimeout(500); await page.screenshot({ path: path.join(__dirname, 'binh-chon-dang-dem.png') }); await countAndWait(page); await page.screenshot({ path: path.join(__dirname, 'binh-chon-ket-qua.png') });
  await page.click('#games .hmv-full-btn'); await page.waitForTimeout(400); const fs1 = await page.evaluate(() => ({ cls: document.body.classList.contains('hmv-game-full'), side: getComputedStyle(document.querySelector('.sidebar')).display, bottom: Math.round(document.getElementById('bcStage').getBoundingClientRect().bottom), h: innerHeight })); await page.click('#games .hmv-full-btn');
  ok('35 Toàn màn hình: ẩn thanh bên, khung bình chọn mở rộng và vẫn vừa màn hình', fs1.cls && fs1.side === 'none' && fs1.bottom <= fs1.h, fs1);
  await ctx.close();

  // ---------- Không camera / không có bộ nhận diện ----------
  ({ ctx, page } = await open(browser, { model: false }));
  await setup(page, { bcOptions: 3 }); await page.click('#bcSetup [data-bc="start"]'); await page.waitForFunction(() => /nhập phiếu bằng phím 1–4/.test(hmvPoll.state().cameraNote), null, { timeout: 20000 }); s = await st(page);
  ok('36 Không tải được bộ nhận diện bàn tay: báo rõ, tắt camera, chuyển sang nhập phiếu bằng phím', s.camera === 'off' && !s.streaming && /nhập phiếu bằng phím 1–4/.test(await page.textContent('#bcStatus')) && await page.isVisible('#bcStage .bc-nocam'), s.cameraNote);
  await page.click('#bcControls [data-bc="count"]'); await page.waitForTimeout(200); const noCount = (await st(page)).match.phase; for (const k of ['1', '1', '2', '3', '3', '3', '4']) await page.keyboard.press(k); await page.waitForTimeout(100); s = await st(page);
  ok('37 Không camera: "Bắt đầu đếm" không chạy; phím 1–3 cộng phiếu, phím 4 bị bỏ qua vì chỉ có 3 lựa chọn', noCount === 'ready' && s.match.tally.join() === '2,1,3,0' && s.match.phase === 'result' && /Tổng 6 phiếu/.test(await page.textContent('#bcSummary')), [noCount, s.match.tally]);
  await ctx.close();
  ({ ctx, page } = await open(browser)); await setup(page, { bcControl: 'manual' }); await page.click('#bcSetup [data-bc="start"]'); await page.waitForTimeout(500); s = await st(page);
  ok('38 Chọn "Thầy cô nhập phiếu": không mở camera', s.camera === 'off' && !s.streaming && /Camera đang tắt/.test(await page.textContent('#bcStatus')));
  await page.click('#bcCamBtn'); await page.waitForFunction(() => hmvPoll.state().camera === 'ready', null, { timeout: 15000 }); ok('39 Nút Camera bật lại được camera giữa chừng', (await st(page)).streaming);
  await page.evaluate(() => { gameSetup('balloon'); }); await page.waitForTimeout(300); ok('40 Chuyển sang trò khác: camera của Bình chọn tắt', (await st(page)).camera === 'off' && !(await st(page)).streaming);
  await page.click('#games [data-bb="start"]'); await page.waitForFunction(() => hmvBalloon.state().camera === 'ready', null, { timeout: 15000 }); const bal = await page.evaluate(() => ({ mode: __hl.options.runningMode, n: __hl.options.numHands }));
  ok('41 Bóng bay tri thức vẫn dùng bộ nhận diện ở chế độ video, 2 bàn tay như trước', bal.mode === 'VIDEO' && bal.n === 2, bal);
  await ctx.close();
  ok('42 Không có lỗi JavaScript trong suốt quá trình', logs.length === 0, logs.slice(0, 6));
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'binh-chon-results.json'), JSON.stringify({ build: 'HMV-BAN-CHINH-2.15-20261015', note: 'Bộ nhận diện bàn tay giả lập', total: res.length, passed: res.filter(r => r.pass).length, results: res }, null, 2));
  console.log('TOTAL ' + res.filter(r => r.pass).length + '/' + res.length); process.exit(res.every(r => r.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
