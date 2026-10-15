const { open, play, BASE } = require('./lib.cjs');
const fs = require('fs');
const R = []; const rec = (id, name, ok, detail) => { R.push({ id, name, status: ok ? 'PASS' : 'FAIL', detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 230) : '')); };
const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const fake = fs.readFileSync(__dirname + '/fake-mediapipe.mjs', 'utf8');
const withModel = async (page, ctx) => { await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); }); };
const noModel = async (page, ctx) => { await ctx.route('**/vendor/mediapipe/**', route => route.fulfill({ status: 404, body: '' })); await ctx.route('https://cdn.jsdelivr.net/**', route => route.abort()); await ctx.route('https://storage.googleapis.com/**', route => route.abort()); };
const st = (page) => page.evaluate(() => { const g = document.getElementById('games').innerText.replace(/\s+/g, ' '); const m = g.match(/Câu (\d+)\/(\d+)/), s = g.match(/Điểm (\d+)/); return { q: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null, score: s ? Number(s[1]) : null, status: document.getElementById('tiltStatusText')?.innerText || '', left: document.querySelector('.tilt-option.left')?.innerText || '', right: document.querySelector('.tilt-option.right')?.innerText || '', result: document.querySelector('.tilt-result')?.innerText || '', text: document.querySelector('.tilt-question-text')?.innerText || '', finished: /Hoàn thành Quiz/.test(g), note: document.getElementById('tiltCameraNote')?.innerText || '', camOn: !!document.querySelector('#tiltCamera:not([hidden])'), body: g.slice(0, 200) }; });
const face = (page, faces, roll) => page.evaluate(([f, r]) => { window.__face = { faces: f, roll: r }; }, [faces, roll]);
const startQuiz = async (page, limit) => { await play(page, 'mau-2-dung-sai', 'head-tilt'); await page.waitForSelector('#tiltSetupModal'); if (limit) await page.selectOption('#tiltSetupModal #tiltLimit', String(limit)); const setup = await page.evaluate(() => document.querySelector('#tiltSetupModal').innerText.replace(/\s+/g, ' ')); const bs = await page.$$('#tiltSetupModal button'); for (const b of bs) { if (/Bắt đầu/.test(await b.textContent())) { await b.click(); break; } } await page.waitForTimeout(500); return setup; };
const KEY = [true, false, false, true, true, false, true, true, true, false, true, true, true, false, true, false, true, false, true, false];
(async () => {
  // ===== Q-A: phím, trái = SAI, phải = ĐÚNG, chấm điểm, kết thúc, chơi lại =====
  { const { browser, page, logs } = await open();
    const setup = await startQuiz(page, 5);
    rec('QA1', 'Chơi ngay → Quiz mở thẳng hộp thiết lập, báo đúng bộ Đúng/Sai 20 câu', /Bộ đang dùng: Mẫu 2 · Đúng\/Sai · Toán lớp 1–5 · 20 câu/.test(setup), setup.slice(100, 230));
    let s = await st(page);
    rec('QA2', 'Thẻ TRÁI là SAI, thẻ PHẢI là ĐÚNG; chọn 5 câu mỗi lượt', /SAI/.test(s.left) && /ĐÚNG/.test(s.right) && s.total === 5 && s.q === 1, { left: s.left, right: s.right, q: s.q, total: s.total });
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); s = await st(page);
    rec('QA3', 'Câu 1 đúng là ĐÚNG: phím → (phải) → chính xác, +10 điểm', s.score === 10 && /Chính xác/.test(s.result), s.result + ' · Điểm ' + s.score);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(900); const s2 = await st(page);
    rec('QA4', 'Đã ghi nhận rồi thì bấm thêm không đổi điểm (chống chọn lặp)', s2.score === 10 && s2.q === 1, 'Điểm ' + s2.score + ' · câu ' + s2.q);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400); s = await st(page);
    rec('QA5', 'Phím Enter sang đúng một câu', s.q === 2 && s.result === '', 'câu ' + s.q + ' · ' + s.text);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); s = await st(page);
    rec('QA6', 'Câu 2 đúng là SAI: chọn ĐÚNG → chưa chính xác, không cộng điểm, hiện đáp án đúng', s.score === 10 && /Chưa chính xác/.test(s.result) && /Đáp án đúng: Sai/.test(s.result), s.result);
    await page.click('#games .paper-mode-toolbar .btn.color'); await page.waitForTimeout(300);
    await page.click('.tilt-option.left'); await page.waitForTimeout(900); s = await st(page);
    rec('QA7', 'Câu 3 đúng là SAI: chạm thẻ trái (SAI) → chính xác', s.q === 3 && s.score === 20 && /Chính xác/.test(s.result), 'câu ' + s.q + ' · Điểm ' + s.score);
    await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); s = await st(page);
    rec('QA8', 'Câu cuối: ghi nhận xong vẫn hiện kết quả câu, nút đổi thành “Xem kết quả”', s.q === 5 && s.score === 40 && /Xem kết quả/.test(s.body + await page.evaluate(() => document.getElementById('games').innerText)), 'Điểm ' + s.score);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400); s = await st(page); const fin = await page.evaluate(() => document.getElementById('games').innerText.replace(/\s+/g, ' '));
    rec('QA9', 'Màn kết thúc: Đúng 4/5, Điểm 40', s.finished && /Đúng: 4\/5/.test(fin) && /Điểm: 40/.test(fin), fin.slice(0, 160));
    await page.click('#games .tilt-finish .btn.color'); await page.waitForTimeout(400); s = await st(page);
    rec('QA10', 'Chơi lại đặt lại điểm và về câu 1', s.q === 1 && s.score === 0, 'câu ' + s.q + ' · Điểm ' + s.score);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#games button')).find(x => x.textContent.trim() === 'Thoát'); b.click(); }); await page.waitForTimeout(400);
    rec('QA11', 'Thoát về thư viện trò chơi', await page.evaluate(() => classroomGame.type === null && /Thư viện trò chơi/.test(document.getElementById('games').innerText)));
    rec('QA12', 'Không lỗi JavaScript', !logs.some(l => /PAGEERROR|console.error/.test(l)), logs.join(' || ')); await browser.close(); }
  // ===== Q-B: camera với bộ nhận diện (giả lập điểm mốc) =====
  { const { browser, page, logs } = await open({ args: CAM, permissions: ['camera'], blockSW: true, beforeLoad: withModel });
    await startQuiz(page, 10);
    await face(page, 0, 0);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#games button')).find(x => /Bật camera/.test(x.textContent)); window.__autoCam = !b; if (b) b.click(); });
    await page.waitForFunction(() => window.__mp && window.__mp.calls > 3, null, { timeout: 8000 }).catch(() => {});
    let s = await st(page); const mp = await page.evaluate(() => window.__mp ? { opts: window.__mp.options, wasm: window.__mp.fileset.wasmPath, calls: window.__mp.calls } : null);
    rec('QB0', 'Bấm Bắt đầu → camera TỰ BẬT, không cần bấm nút Bật camera', await page.evaluate(() => window.__autoCam === true));
    rec('QB1', 'Camera bật → nạp bộ nhận diện trong ./vendor/mediapipe (chế độ VIDEO, tối đa 2 khuôn mặt)', !!mp && mp.opts.runningMode === 'VIDEO' && mp.opts.numFaces === 2 && /vendor\/mediapipe\/wasm$/.test(mp.wasm) && /vendor\/mediapipe\/face_landmarker\.task$/.test(mp.opts.baseOptions.modelAssetPath) && s.camOn, mp);
    rec('QB2', 'Chưa thấy khuôn mặt → “Đang tìm khuôn mặt”, không chọn đáp án', /Đang tìm khuôn mặt/.test(s.status) && s.result === '', s.status);
    await face(page, 0, 30); await page.waitForTimeout(1500); s = await st(page);
    rec('QB3', 'Không có khuôn mặt thì không ghi nhận dù “góc” lớn', s.result === '' && s.q === 1, s.status);
    await face(page, 1, 4); await page.waitForTimeout(1600); s = await st(page);
    rec('QB4', 'Thấy một khuôn mặt, giữ thẳng → tự hiệu chỉnh xong, báo “Đã nhận diện”', /Đã nhận diện – nghiêng đầu/.test(s.status), s.status);
    await page.waitForTimeout(2500); s = await st(page);
    rec('QB5', 'Giữ đầu thẳng thêm 2,5 giây → không chọn đáp án', s.result === '' && s.q === 1 && s.score === 0, s.status);
    await face(page, 1, 4 + 25); await page.waitForTimeout(300); const mid = await st(page); await face(page, 1, 4); await page.waitForTimeout(1200); s = await st(page);
    rec('QB6', 'Nghiêng phải chớp nhoáng 0,3 giây rồi thẳng lại → hủy, không ghi nhận', /Nghiêng phải/.test(mid.status) && s.result === '' && s.score === 0, mid.status + ' → ' + s.status);
    await face(page, 2, 4 + 25); await page.waitForTimeout(1500); s = await st(page);
    rec('QB7', 'Hai khuôn mặt trong khung → cảnh báo, không ghi nhận', /nhiều khuôn mặt/.test(s.status) && s.result === '', s.status);
    await face(page, 1, 4); await page.waitForTimeout(700);
    await face(page, 1, 4 + 25); await page.waitForTimeout(500); const hold = await st(page); await page.waitForTimeout(900); s = await st(page);
    rec('QB8', 'Câu 1 (đúng là ĐÚNG): nghiêng PHẢI và giữ → “Nghiêng phải”, ghi nhận ĐÚNG, +10', /Nghiêng phải/.test(hold.status) && s.score === 10 && /Chính xác/.test(s.result) && /Đã ghi nhận đáp án/.test(s.status), hold.status + ' → ' + s.status);
    await page.waitForTimeout(3200); s = await st(page);
    rec('QB9', 'Vẫn giữ nghiêng 3 giây sau khi ghi nhận → không sang câu, không cộng thêm (chống lặp)', s.q === 1 && s.score === 10 && /đưa đầu về giữa/.test(s.status), 'câu ' + s.q + ' · Điểm ' + s.score + ' · ' + s.status);
    await face(page, 1, 4); await page.waitForTimeout(1500); s = await st(page);
    rec('QB10', 'Đưa đầu về giữa → tự sang câu 2', s.q === 2 && s.result === '', 'câu ' + s.q + ' · ' + s.status);
    await face(page, 1, 4 - 25); await page.waitForTimeout(1500); s = await st(page);
    rec('QB11', 'Câu 2 (đúng là SAI): nghiêng TRÁI và giữ → ghi nhận SAI, +10', s.q === 2 && s.score === 20 && /Chính xác/.test(s.result), 'Điểm ' + s.score + ' · ' + s.result);
    await page.waitForTimeout(2600); s = await st(page);
    rec('QB12', 'Chưa về giữa thì chưa sang câu 3', s.q === 2, 'câu ' + s.q + ' · ' + s.status);
    await face(page, 1, 4); await page.waitForTimeout(1300); s = await st(page); const q3 = s.q;
    await face(page, 1, 4 + 25); await page.waitForTimeout(1500); s = await st(page);
    rec('QB13', 'Câu 3 (đúng là SAI): nghiêng PHẢI → chưa chính xác, điểm giữ nguyên', q3 === 3 && s.q === 3 && s.score === 20 && /Chưa chính xác/.test(s.result), 'Điểm ' + s.score + ' · ' + s.result);
    await face(page, 1, 4); await page.waitForTimeout(3000); s = await st(page);
    // câu 4: sang câu mới mà đầu đang nghiêng sẵn
    rec('QB14', 'Sang câu 4 sau khi về giữa', s.q === 4, 'câu ' + s.q);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#games button')).find(x => /Hiệu chỉnh/.test(x.textContent)); b.click(); }); await face(page, 1, 10); await page.waitForTimeout(1500); s = await st(page);
    await face(page, 1, 10 + 12); await page.waitForTimeout(1500); const small = await st(page);
    rec('QB15', 'Hiệu chỉnh lại ở tư thế lệch 10°; nghiêng thêm 12° (dưới ngưỡng 15°) → không ghi nhận', /Đã nhận diện/.test(s.status) && small.result === '' && small.q === 4, s.status + ' → ' + small.status);
    await face(page, 1, 10 + 20); await page.waitForTimeout(1500); s = await st(page);
    rec('QB16', 'Nghiêng thêm 20° so với tư thế đã hiệu chỉnh → ghi nhận', s.result !== '' && s.q === 4, s.result);
    const tracks = await page.evaluate(() => { window.__stream = document.getElementById('tiltCamera').srcObject; return window.__stream.getTracks().map(t => t.readyState); });
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#games button')).find(x => x.textContent.trim() === 'Thoát'); b.click(); }); await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ tracks: window.__stream.getTracks().map(t => t.readyState), running: window.hmvTiltCamera.isRunning(), closed: window.__mp.closed, type: classroomGame.type }));
    rec('QB17', 'Thoát → camera tắt hẳn, vòng nhận diện dừng, bộ nhận diện được giải phóng', tracks.every(x => x === 'live') && after.tracks.every(x => x === 'ended') && after.running === false && after.closed >= 1 && after.type === null, after);
    const calls = await page.evaluate(() => window.__mp.calls); await page.waitForTimeout(800); const calls2 = await page.evaluate(() => window.__mp.calls);
    rec('QB18', 'Sau khi thoát không còn khung hình nào được xử lý', calls2 === calls, calls + ' → ' + calls2);
    rec('QB19', 'Không lỗi JavaScript', !logs.some(l => /PAGEERROR|console.error/.test(l)), logs.join(' || ')); await browser.close(); }
  // ===== Q-C: rời sang màn hình khác khi camera đang bật; mở lại tự bật camera đã chọn =====
  { const { browser, page, logs } = await open({ args: CAM, permissions: ['camera'], blockSW: true, beforeLoad: withModel });
    await startQuiz(page, 5); await face(page, 1, 0);
    await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(x => /Bật camera/.test(x.textContent))?.click()); await page.waitForFunction(() => window.__mp && window.__mp.calls > 3, null, { timeout: 8000 });
    await page.evaluate(() => { window.__stream = document.getElementById('tiltCamera').srcObject; openView('questions'); }); await page.waitForTimeout(500);
    const a = await page.evaluate(() => ({ tracks: window.__stream.getTracks().map(t => t.readyState), running: window.hmvTiltCamera.isRunning(), type: classroomGame.type }));
    rec('QC1', 'Chuyển sang Kho khi đang chơi → camera tắt, trò chơi đóng', a.tracks.every(x => x === 'ended') && !a.running && a.type === null, a);
    await startQuiz(page, 5); await page.waitForFunction(() => window.hmvTiltCamera.isRunning(), null, { timeout: 8000 }).catch(() => {}); const s = await st(page);
    rec('QC2', 'Lần chơi sau tự bật lại camera vì lần trước đã chọn dùng camera', s.camOn && await page.evaluate(() => window.hmvTiltCamera.isRunning()), s.note);
    await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(x => /Tắt camera/.test(x.textContent)).click()); await page.waitForTimeout(400); const off = await st(page);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); const k = await st(page);
    rec('QC3', 'Tắt camera giữa ván → vẫn chơi tiếp được bằng phím', !off.camOn && k.score === 10, 'Điểm ' + k.score);
    rec('QC4', 'Không lỗi JavaScript', !logs.some(l => /PAGEERROR|console.error/.test(l)), logs.join(' || ')); await browser.close(); }
  // ===== Q-D: chưa có bộ nhận diện (không có tệp trong máy, không có mạng) =====
  { const { browser, page, logs } = await open({ args: CAM, permissions: ['camera'], blockSW: true, beforeLoad: noModel });
    await startQuiz(page, 5);
    await page.evaluate(() => Array.from(document.querySelectorAll('#games button')).find(x => /Bật camera/.test(x.textContent))?.click()); await page.waitForTimeout(2500); let s = await st(page);
    rec('QD1', 'Không có bộ nhận diện → báo rõ lý do, tự tắt camera, hướng dẫn dùng phím/chạm', !s.camOn && /Chưa dùng được camera/.test(s.note) && /phím/.test(s.note), s.note);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); s = await st(page);
    rec('QD2', 'Vẫn chơi được bằng phím khi không có bộ nhận diện', s.score === 10, 'Điểm ' + s.score);
    rec('QD3', 'Không có lỗi JavaScript chưa bắt', !logs.some(l => /PAGEERROR/.test(l)), logs.filter(l => /PAGEERROR/.test(l)).join(' || ')); await browser.close(); }
  // ===== Q-E: mở Quiz từ thư viện, câu hai phương án không phải Đúng/Sai =====
  { const { browser, page, logs } = await open();
    await page.evaluate(() => { openView('games'); gameSetup('head-tilt'); }); await page.waitForSelector('#tiltSetupModal');
    const setup = await page.evaluate(() => document.querySelector('#tiltSetupModal').innerText.replace(/\s+/g, ' '));
    rec('QE1', 'Mở Quiz từ thư viện khi chưa gắn bộ nào → tự lấy bộ Đúng/Sai có trong Kho, không dùng câu mẫu cứng', /Bộ đang dùng: Mẫu 2 · Đúng\/Sai/.test(setup), setup.slice(100, 200));
    await page.evaluate(() => tiltCloseSetup()); await page.waitForTimeout(300);
    rec('QE2', 'Đóng hộp thiết lập khi chưa chơi → trả về thư viện, không để trò chơi treo', await page.evaluate(() => classroomGame.type === null));
    const sides = await page.evaluate(() => [tiltSides({ answers: ['Đúng', 'Sai'], correct: 0 }), tiltSides({ answers: ['Sai', 'Đúng'], correct: 1 }), tiltSides({ answers: ['Đông', 'Tây'], correct: 0 }), tiltSides({ answers: ['ĐÚNG', 'SAI'], correct: 1 })]);
    rec('QE3', 'Quy tắc đặt thẻ: Đúng/Sai luôn SAI trái – ĐÚNG phải; cặp khác giữ thứ tự soạn', JSON.stringify(sides) === '[[1,0],[0,1],[0,1],[1,0]]', sides);
    rec('QE4', 'Không lỗi JavaScript', !logs.some(l => /PAGEERROR|console.error/.test(l)), logs.join(' || ')); await browser.close(); }
  fs.writeFileSync('quiz-results.json', JSON.stringify(R, null, 1));
  console.log('\nQUIZ: ' + R.filter(x => x.status === 'PASS').length + ' PASS / ' + R.filter(x => x.status === 'FAIL').length + ' FAIL');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
