// Kiểm thử bản 2.5: bố cục vừa màn hình – Hộp quà bí mật (toàn màn hình), Bình chọn ngón tay (không che phương án), Đường đua, Ai nhanh hơn.
// Đo vị trí thật của câu hỏi, phương án và nút bấm trong trình duyệt ở nhiều cỡ màn hình (kể cả màn hình thấp 1280×600 – máy tính đặt phóng to 150%).
const { open, play } = require('../qa8/lib.cjs'); const fs = require('fs'), path = require('path');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 1100) : '')); };
const VPS = [[1280, 600], [1366, 650], [1536, 730], [1774, 934], [1920, 950]];
const LONG = 'Một cửa hàng buổi sáng bán được 125 kg gạo, buổi chiều bán được nhiều hơn buổi sáng 37 kg gạo. Hỏi cả hai buổi cửa hàng bán được bao nhiêu ki-lô-gam gạo?';
const mk = () => open({ viewport: { width: 1366, height: 650 }, blockSW: true, beforeLoad: async p => { await p.addInitScript({ path: path.join(__dirname, '..', 'qa13', 'fake-speech.js') }); } });
const full = async (page, on) => { const is = await page.evaluate(() => document.body.classList.contains('hmv-game-full')); if (is !== on) { await page.click('#games .hmv-full-btn, #games button[onclick*="Fullscreen"]'); await page.waitForTimeout(500); } };
// Mọi phần tử theo bộ chọn nằm trọn trong màn hình? Trả về danh sách vi phạm.
const within = (page, sels) => page.evaluate(sels => { const bad = []; sels.forEach(s => document.querySelectorAll(s).forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) bad.push(s + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom) + '/' + innerHeight); })); return bad; }, sels);
const each = async (page, fn) => { const out = []; for (const [w, h] of VPS) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(120); out.push([w + 'x' + h, await fn(w, h)]); } return out; };

(async () => {
  let { browser, page, logs } = await mk(); page.on('dialog', d => d.accept().catch(() => {}));

  // ================= Hộp quà bí mật =================
  await play(page, 'mau-1-abcd', 'gift'); await page.waitForTimeout(500); await full(page, true);
  let r = await each(page, () => within(page, ['.gift-box-tile', '.gift-score', '.gift-actions .btn']));
  await page.waitForTimeout(900); const hintBtn = await page.evaluate(() => ({ text: document.querySelector('.gift-question h2').textContent, n: document.querySelectorAll('.hmv-dt-btn, .hmv-dt-gear').length, ready: hmvDocTo.state().ready }));
  ok('0 Hộp quà lúc đang chọn hộp: lời nhắc "Chọn một hộp quà" không bị coi là câu hỏi (không có nút loa); mở câu hỏi thật thì nút loa mới hiện', hintBtn.ready && /Chọn một hộp quà/.test(hintBtn.text) && hintBtn.n === 0, hintBtn);
  ok('1 Hộp quà (toàn màn hình), lúc chọn hộp: 8 hộp, thẻ người chơi và các nút đều nằm trong màn hình ở mọi cỡ', r.every(x => x[1].length === 0), r);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.waitForTimeout(300); const big = await page.evaluate(() => Math.round(document.querySelector('.gift-box-tile').getBoundingClientRect().height));
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question h2'); await page.waitForTimeout(300);
  await page.waitForSelector('.gift-question h2 .hmv-dt-btn');
  r = await each(page, () => within(page, ['.gift-question h2', '.gift-answer', '.gift-question .toolbar .btn', '.gift-box-tile', '.gift-score']));
  ok('2 Hộp quà (toàn màn hình), lúc mở câu hỏi: câu hỏi, 4 phương án, nút Xác nhận đúng/sai, dải hộp quà và thẻ người chơi đều nằm trong màn hình ở mọi cỡ (trước đây câu hỏi bị đẩy khuất xuống dưới)', r.every(x => x[1].length === 0), r);
  const strip = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.gift-box-tile')), rs = t.map(e => e.getBoundingClientRect()), sel = document.querySelector('.gift-box-tile.selected'), q = document.querySelector('.gift-question').getBoundingClientRect(), g = document.querySelector('.gift-box-grid').getBoundingClientRect(); return { n: t.length, h: Math.round(rs[0].height), rows: new Set(rs.map(x => Math.round(x.top))).size, text: t.map(e => e.textContent.replace(/\s+/g, '')).join(' '), selOutline: sel ? getComputedStyle(sel).outlineStyle : '', qBelow: q.top >= g.bottom, order: Array.from(document.querySelector('.gift-game').children).map(c => [c.className.split(' ')[0], Math.round(c.getBoundingClientRect().top)]).sort((a, b) => a[1] - b[1]).map(x => x[0]) }; });
  ok('3 Khi câu hỏi mở: hộp quà thu nhỏ thành một dải (vẫn đủ 8 hộp, đủ số, hộp đang mở được viền nổi), câu hỏi nằm ngay dưới dải hộp, các nút phụ nằm sau câu hỏi', strip.n === 8 && big >= 100 && strip.h < big / 2 && strip.h >= 40 && strip.rows === 1 && /1/.test(strip.text) && /8/.test(strip.text) && strip.selOutline === 'solid' && strip.qBelow && strip.order.indexOf('gift-question') < strip.order.indexOf('gift-actions'), [strip, big]);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(() => { const h = document.querySelector('.gift-question h2'); h.childNodes[0].textContent = arguments[0]; document.querySelectorAll('.gift-answer').forEach((a, i) => a.textContent = 'ABCD'[i] + '. ' + ['287 ki-lô-gam gạo', '162 ki-lô-gam gạo', '250 ki-lô-gam gạo', '88 ki-lô-gam gạo'][i]); }, LONG).catch(async () => { await page.evaluate(L => { const h = document.querySelector('.gift-question h2'); h.childNodes[0].textContent = L; }, LONG); });
  await page.evaluate(L => { const h = document.querySelector('.gift-question h2'); h.childNodes[0].textContent = L; }, LONG);
  r = await each(page, () => within(page, ['.gift-question h2', '.gift-answer', '.gift-question .toolbar .btn']));
  ok('4 Hộp quà (toàn màn hình) với câu hỏi dài 3 dòng: câu hỏi, phương án và nút xác nhận vẫn nằm trong màn hình ở mọi cỡ', r.every(x => x[1].length === 0), r);
  await page.setViewportSize({ width: 1366, height: 650 }); const picked = await page.evaluate(() => { giftAnswer(1); return document.querySelector('.gift-answer.selected') ? document.querySelector('.gift-answer.selected').textContent.slice(0, 2) : ''; }); await page.evaluate(() => giftJudge(true)); await page.waitForSelector('.gift-reward');
  r = await each(page, () => within(page, ['.gift-reward h2', '.gift-reward .btn', '.gift-box-tile']));
  ok('5 Bố cục gọn không làm hỏng thao tác: chọn phương án, xác nhận đúng vẫn chạy; màn "phần quà" (Áp dụng kết quả) nằm trong màn hình ở mọi cỡ', picked === 'B.' && r.every(x => x[1].length === 0), [picked, r]);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(() => giftApply()); await page.waitForTimeout(300);
  for (let i = 0; i < 4 && (await page.$('.gift-question .toolbar, .gift-reward')); i++) { await page.evaluate(() => { if (document.querySelector('.gift-question .toolbar')) { giftAnswer(0); giftJudge(true); } }); await page.waitForTimeout(150); await page.evaluate(() => { try { giftApply(); } catch (e) {} }); await page.waitForTimeout(200); }
  const back = await page.evaluate(() => ({ q: !!document.querySelector('.gift-question .toolbar, .gift-reward'), hint: (document.querySelector('.gift-question h2') || {}).textContent, h: Math.round(document.querySelector('.gift-box-tile:not(.opened)').getBoundingClientRect().height), opened: document.querySelectorAll('.gift-box-tile.opened').length, disp: getComputedStyle(document.querySelector('.gift-game')).display }));
  ok('6 Áp dụng xong, trở lại lúc chọn hộp: hộp quà lớn như cũ để học sinh dễ chọn, hộp vừa mở được đánh dấu', !back.q && /Chọn một hộp quà/.test(back.hint) && back.h >= 100 && back.opened === 1, back);
  for (let i = 1; i < 8; i++) { await page.evaluate(i2 => giftBox(i2), i); await page.waitForTimeout(100); await page.evaluate(() => { giftAnswer(0); giftJudge(true); }); await page.waitForTimeout(120); await page.evaluate(() => { try { giftApply(); } catch (e) {} }); await page.waitForTimeout(120); }
  await page.waitForSelector('.gift-result');
  r = await each(page, () => within(page, ['.gift-result h2', '.gift-result .btn']));
  ok('7 Hộp quà (toàn màn hình), màn kết quả: tiêu đề kết quả và nút Chơi lại / Về thư viện nằm trong màn hình ở mọi cỡ', r.every(x => x[1].length === 0), r);
  await page.setViewportSize({ width: 1366, height: 650 }); await full(page, false); await page.evaluate(() => giftReplay()); await page.waitForTimeout(500); await page.evaluate(() => giftBox(0)); await page.waitForSelector('.gift-question h2'); await page.waitForTimeout(300);
  r = await each(page, () => within(page, ['.gift-question h2', '.gift-answer']));
  ok('8 Hộp quà ở chế độ thường (không toàn màn hình): mở câu hỏi là thấy ngay câu hỏi và 4 phương án, không phải cuộn (trước đây phải cuộn xuống)', r.every(x => x[1].length === 0), r);
  await page.setViewportSize({ width: 860, height: 900 }); await page.waitForTimeout(300); const nar = await page.evaluate(() => { const g = document.querySelector('.gift-game').getBoundingClientRect(); const inside = sel => Array.from(document.querySelectorAll(sel)).every(a => { const r = a.getBoundingClientRect(); return r.left >= g.left - 1 && r.right <= g.right + 1; }); return { n: document.querySelectorAll('.gift-box-tile').length, ans: inside('.gift-answer'), tiles: inside('.gift-box-tile'), score: inside('.gift-score'), stacked: document.querySelector('.gift-box-grid').getBoundingClientRect().top >= document.querySelector('.gift-score-row').getBoundingClientRect().bottom - 1 }; });
  ok('9 Hộp quà trên màn hình hẹp (860 px): thẻ người chơi và dải hộp xếp chồng, không phần nào tràn khỏi khung trò chơi', nar.ans && nar.tiles && nar.score && nar.stacked && nar.n === 8, nar);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(() => giftBack());

  // ================= Bình chọn ngón tay =================
  await play(page, 'mau-1-abcd', 'poll'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.mode === 'bank', null, { timeout: 12000 }); await page.waitForFunction(() => hmvPoll.state().camera === 'off', null, { timeout: 20000 }); await page.waitForTimeout(400);
  const poll = () => page.evaluate(() => { const pn = document.querySelector('.bc-panel'), pr = pn.getBoundingClientRect(), bars = document.getElementById('bcBars'); const rows = Array.from(document.querySelectorAll('.bc-row')).map(e => e.getBoundingClientRect()); const c = document.getElementById('bcControls').getBoundingClientRect(); const labels = Array.from(document.querySelectorAll('.bc-label')).every(l => l.scrollWidth <= l.clientWidth + 1); return { n: rows.length, rowH: Math.round(rows[0].height), noHiddenScroll: bars.scrollHeight <= bars.clientHeight + 1 && pn.scrollHeight <= pn.clientHeight + 1, inPanel: rows.every(x => x.bottom <= pr.bottom + 1 && x.top >= pr.top - 1) && c.bottom <= pr.bottom + 1, noOverlap: rows[rows.length - 1].bottom <= c.top + 1 && rows.every((x, i) => !i || x.top >= rows[i - 1].bottom - 1), onScreen: rows.every(x => x.bottom <= innerHeight + 1) && c.bottom <= innerHeight + 1, labels, overflowY: getComputedStyle(bars).overflowY }; });
  r = await each(page, poll);
  ok('10 Bình chọn (chế độ thường), câu hỏi ngắn: đủ 4 phương án A–D và nút "Bắt đầu đếm" đều hiện trong màn hình ở mọi cỡ, không còn vùng cuộn ẩn che phương án (trước đây ở màn hình thấp phương án D bị che)', r.every(x => x[1].n === 4 && x[1].noHiddenScroll && x[1].inPanel && x[1].noOverlap && x[1].onScreen && x[1].overflowY === 'visible'), r);
  const hs = r.map(x => x[1].rowH); ok('11 Các hàng phương án tự co theo màn hình: thấp thì gọn (≥ 34 px, vẫn chạm được), cao thì rộng rãi (≤ 84 px)', Math.min.apply(null, hs) >= 34 && Math.max.apply(null, hs) <= 85 && hs[0] < hs[hs.length - 1], hs);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(L => { const q = document.getElementById('bcQuestion'); q.childNodes[0].textContent = L; q.style.setProperty('--f', .74); document.querySelectorAll('.bc-label').forEach((l, i) => l.textContent = ['287 ki-lô-gam gạo', '162 ki-lô-gam gạo', '250 ki-lô-gam gạo, vì cộng cả hai buổi rồi trừ đi phần chênh lệch', '88 ki-lô-gam gạo'][i]); }, LONG);
  r = await each(page, poll);
  ok('12 Bình chọn với câu hỏi dài và một phương án dài hai dòng: ở mọi cỡ màn hình không phương án nào bị che hay đè lên nút; từ 1366×650 trở lên tất cả nằm trọn trong màn hình (màn hình 1280×600 thì trang cuộn thêm một chút)', r.every(x => x[1].n === 4 && x[1].noHiddenScroll && x[1].inPanel && x[1].noOverlap) && r.slice(1).every(x => x[1].onScreen), r);
  await page.setViewportSize({ width: 1280, height: 600 }); await page.waitForTimeout(300); await page.evaluate(() => { pollBack(); }); await play(page, 'mau-1-abcd', 'poll'); await page.waitForFunction(() => hmvPoll.state().match && hmvPoll.state().match.mode === 'bank' && hmvPoll.state().camera === 'off', null, { timeout: 20000 });
  await page.click('#bcControls [data-bc="count"]'); await page.waitForTimeout(500); for (const k of ['Digit1', 'Digit2', 'Digit2', 'Digit3']) await page.keyboard.press(k); await page.waitForTimeout(250);
  const cnt = await poll(); const cph = await page.evaluate(() => hmvPoll.state().match.phase);
  await page.waitForFunction(() => hmvPoll.state().match.phase === 'result', null, { timeout: 15000 }); await page.waitForTimeout(400);
  r = await each(page, poll); const nums = await page.evaluate(() => Array.from(document.querySelectorAll('[data-bc-num]')).map(e => parseInt(e.childNodes[0].textContent, 10)).join());
  ok('13 Bình chọn lúc đang đếm và lúc hiện kết quả (có dòng tổng kết, 3 nút): 4 phương án, số phiếu và các nút đều hiện trong màn hình ở mọi cỡ; số phiếu đúng', cnt.n === 4 && cnt.inPanel && cnt.noOverlap && nums === '1,2,1,0' && r.every(x => x[1].n === 4 && x[1].noHiddenScroll && x[1].inPanel && x[1].noOverlap && x[1].onScreen), [cph, cnt, nums, r]);
  await page.setViewportSize({ width: 1366, height: 650 }); await full(page, true);
  r = await each(page, poll);
  ok('14 Bình chọn ở chế độ toàn màn hình: vẫn đủ 4 phương án và nút trong màn hình ở mọi cỡ', r.every(x => x[1].n === 4 && x[1].noHiddenScroll && x[1].inPanel && x[1].noOverlap && x[1].onScreen), r);
  await page.setViewportSize({ width: 1366, height: 650 }); await full(page, false);
  await page.evaluate(() => { pollBack(); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); await page.selectOption('#bcSource', 'quick'); await page.selectOption('#bcControl', 'manual'); await page.click('#bcSetup [data-bc="start"]'); await page.waitForSelector('#bcQuestion.quick'); await page.waitForTimeout(300);
  r = await each(page, poll);
  ok('15 Bình chọn "Hỏi nhanh" (không dùng bộ câu hỏi): các lựa chọn và nút cũng nằm trọn trong màn hình ở mọi cỡ', r.every(x => x[1].n >= 2 && x[1].noHiddenScroll && x[1].inPanel && x[1].noOverlap && x[1].onScreen), r);
  await page.setViewportSize({ width: 800, height: 900 }); await page.waitForTimeout(400); const mob = await page.evaluate(() => ({ h: document.getElementById('bcStage').style.height, scroll: document.documentElement.scrollWidth <= innerWidth + 1, rows: document.querySelectorAll('.bc-row').length }));
  ok('16 Bình chọn trên màn hình hẹp (800 px, xếp dọc): không tràn ngang, không bị ép chiều cao', mob.h === '' && mob.scroll && mob.rows >= 2, mob);
  await page.setViewportSize({ width: 1366, height: 650 }); await page.evaluate(() => pollBack());

  // ================= Đường đua, Ai nhanh hơn =================
  await play(page, 'mau-1-abcd', 'race'); await page.waitForSelector('.race-question h2'); await full(page, true);
  r = await each(page, () => within(page, ['.race-lane', '.race-question h2', '.race-answer', '.race-question .toolbar .btn']));
  const lane = await page.evaluate(() => { const l = document.querySelector('.race-lane').getBoundingClientRect(), car = document.querySelector('.race-road strong').getBoundingClientRect(), road = document.querySelector('.race-road').getBoundingClientRect(); return { h: Math.round(l.height), carIn: car.top >= road.top - 2 && car.bottom <= road.bottom + 6, n: document.querySelectorAll('.race-lane').length, text: document.querySelector('.race-lane').innerText.replace(/\s+/g, ' ') }; });
  ok('17 Đường đua (toàn màn hình): các làn đua gọn thành một hàng mỗi đội (vẫn đủ tên đội, đường đua, xe, điểm), câu hỏi + 4 phương án + nút xác nhận nằm trong màn hình ở mọi cỡ (trước đây ở màn hình thấp bị khuất)', r.every(x => x[1].length === 0) && lane.h <= 62 && lane.carIn && /Tổ 1/.test(lane.text) && /chặng/.test(lane.text), [r, lane]);
  await page.setViewportSize({ width: 1366, height: 650 }); const p0 = await page.evaluate(() => Array.from(document.querySelectorAll('.race-road i')).map(i => i.style.width).join()); await page.evaluate(() => { raceJudge(true); }); await page.waitForTimeout(900); const p1 = await page.evaluate(() => Array.from(document.querySelectorAll('.race-road i')).map(i => i.style.width).join());
  ok('18 Đường đua: trả lời đúng thì xe của đội đang đến lượt vẫn tiến trên làn gọn', p0 === '0%,0%' && p1 !== p0, [p0, p1]);
  await full(page, false); await page.evaluate(() => raceBack());
  await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await full(page, true);
  r = await each(page, () => within(page, ['.buzz-team', '.buzz-status', '.buzz-question h2', '.buzz-answer']));
  ok('19 Ai nhanh hơn (toàn màn hình): thẻ đội, dải "Bấm chuông", câu hỏi và 4 phương án nằm trong màn hình ở mọi cỡ, kể cả màn hình thấp 1280×600', r.every(x => x[1].length === 0), r);
  await page.setViewportSize({ width: 1366, height: 768 }); await page.waitForTimeout(300); const big2 = await page.evaluate(() => [Math.round(document.querySelector('.buzz-answer').getBoundingClientRect().height), parseFloat(getComputedStyle(document.querySelector('.buzz-answer')).fontSize)]);
  ok('20 Trên màn hình đủ cao (1366×768 trở lên) cỡ chữ và nút của Ai nhanh hơn giữ nguyên như trước', big2[0] >= 64 && big2[1] >= 20, big2);
  await full(page, false); await page.evaluate(() => buzzBack());
  ok('21 Không có lỗi JavaScript trong suốt quá trình', logs.filter(l => /PAGEERROR|console.error/.test(l)).length === 0, logs);
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'bo-cuc-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.10-20261012', sizes: VPS.map(v => v.join('x')), total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
