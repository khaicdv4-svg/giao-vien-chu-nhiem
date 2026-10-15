// Kiểm thử bản 2.8 (cập nhật 2.10): ứng dụng đặt trên web kiểu Vercel (chỉ có tệp tĩnh, KHÔNG có máy chủ AI nội bộ, tên miền không phải localhost),
// và việc nâng cấp từ bản cũ đang chạy ở cùng địa chỉ (nhánh main ngày 2/9) lên bản mới mà không mất dữ liệu đã lưu trong trình duyệt.
// Đây là máy chủ GIẢ LẬP trên máy thử, không phải Vercel thật.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const S = path.join(__dirname, '..'), NEW = path.join(S, process.env.HMV_DIR || 'main31', 'app'), OLD = process.env.HMV_OLD_DIR || '/home/claude/khaicdv4-svg/giao-vien-chu-nhiem';
const PORT = 8790, HOST = 'hocmavui.localhost', BASE = 'http://' + HOST + ':' + PORT + '/';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 1200) : '')); };
const get = p => new Promise((resolve, reject) => http.get('http://127.0.0.1:' + PORT + p, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); }).on('error', reject));
const setRoot = d => get('/__root?dir=' + encodeURIComponent(d));
const logs = [];
const watch = page => { page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.accept().catch(() => {})); };
const play = async (page, setId, g) => { await page.evaluate(() => openView('questions')); await page.waitForTimeout(150); await page.click('#questions [data-kho-play="' + setId + '"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="' + g + '"]'); await page.waitForTimeout(1100); };

(async () => {
  const srv = cp.spawn('node', [path.join(__dirname, 'static.cjs'), OLD, String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1', '--unsafely-treat-insecure-origin-as-secure=http://' + HOST + ':' + PORT, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    // ================= A. Nâng cấp từ bản cũ ở cùng địa chỉ =================
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); let page = await ctx.newPage(); watch(page);
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => typeof students !== 'undefined' && typeof saveAll === 'function', null, { timeout: 15000 }); await page.waitForTimeout(1500);
    const oldInfo = await page.evaluate(async () => {
      students = [{ name: 'Học sinh Thử Một', team: 1, score: 3, status: 'Có mặt' }, { name: 'Học sinh Thử Hai', team: 2, score: 5, status: 'Vắng' }, { name: 'Học sinh Thử Ba', team: 3, score: 0, status: 'Có mặt' }];
      scoreData = [{ team: 1, points: 41 }, { team: 2, points: 37 }, { team: 3, points: 29 }, { team: 4, points: 18 }];
      questionData = [{ subject: 'Toán', level: 'Mức 1', text: 'CÂU CŨ 1: 7 x 8 = ?', answers: ['54', '56', '58', '64'], correct: 1 }, { subject: 'Tiếng Việt', level: 'Mức 2', text: 'CÂU CŨ 2: Từ nào là động từ?', answers: ['chạy', 'bàn', 'đẹp', 'xanh'], correct: 0 }];
      saveAll();
      try { compAdjust(1, 5, 'long'); compAdjust(3, 2, 'long'); compAdjust(2, -1, 'long'); } catch (e) { window.__compErr = String(e); }
      const keys = Object.keys(localStorage).sort(); const sw = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
      return { title: document.title, keys, snapshot: JSON.stringify(Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]))), sw: !!sw, caches: await caches.keys() };
    });
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
    const oldCaches = await page.evaluate(() => caches.keys());
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => typeof students !== 'undefined' && typeof saveAll === 'function'); await page.waitForTimeout(1500);
    const oldAfter = await page.evaluate(() => ({ scores: scoreData.map(x => x.points), comp: Object.fromEntries(Object.keys(localStorage).filter(k => /^tk_competition_/.test(k)).map(k => [k, localStorage.getItem(k)])), tx: (() => { try { return JSON.parse(localStorage.getItem(Object.keys(localStorage).filter(k => /^tk_competition_/.test(k) && !/legacy/.test(k))[0])).transactions.length; } catch (e) { return -1; } })(), err: window.__compErr || '', snapshot: JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))) }));
    ok('A1 Bản cũ (nhánh main 2/9) chạy ở địa chỉ thử; đã lưu 3 học sinh, điểm 4 tổ, 2 câu hỏi; bản cũ đã cài bộ nhớ ngoại tuyến của nó', /GIÁO VIÊN CHỦ NHIỆM/.test(oldInfo.title) && oldInfo.keys.indexOf('tk_students') >= 0 && oldInfo.keys.indexOf('tk_questions') >= 0 && oldCaches.join().indexOf('gvc-app') >= 0, [oldInfo.title, oldInfo.keys, oldCaches]);
    const before = JSON.parse(oldAfter.snapshot);
    // Đẩy bản mới lên cùng địa chỉ (giả lập Vercel triển khai xong)
    await setRoot(NEW); logs.length = 0;
    await page.goto(BASE, { waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(3500); const firstTitle = await page.title().catch(() => ''); await page.goto(BASE, { waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(1000);
    await page.waitForFunction(() => window.hmvDungSai && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const up = await page.evaluate(async () => ({ title: document.title, students: (typeof students !== 'undefined' ? students : []).map(s => s.name + '|' + s.team + '|' + s.status), scores: (typeof scoreData !== 'undefined' ? scoreData : []).map(s => s.points), questions: (typeof questionData !== 'undefined' ? questionData : []).map(q => q.text), store: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), caches: await caches.keys(), sets: questionBankSets.length }));
    ok('A2 Sau khi bản mới lên cùng địa chỉ: mở lại trang lần đầu đã thấy HỌC MÀ VUI 2.8 (không kẹt bản cũ trong bộ nhớ đệm)', /HỌC MÀ VUI \| HMV-BAN-CHINH-2\.15/.test(firstTitle) && /HỌC MÀ VUI \| HMV-BAN-CHINH-2\.15/.test(up.title) && up.caches.indexOf('hmv-ban-chinh-2.16') >= 0, [firstTitle, up.title, up.caches]);
    ok('A3 Học sinh đã lưu ở bản cũ còn nguyên (tên, tổ, trạng thái)', up.students.join(';') === 'Học sinh Thử Một|1|Có mặt;Học sinh Thử Hai|2|Vắng;Học sinh Thử Ba|3|Có mặt', up.students);
    const compSame = Object.keys(oldAfter.comp).every(k => up.store[k] === oldAfter.comp[k]);
    ok('A4 Điểm thi đua (đã cộng trừ ở bản cũ: tổ 1 +5, tổ 3 +2, tổ 2 −1) còn nguyên: bảng điểm giống hệt, sổ ghi thi đua không đổi một ký tự', !oldAfter.err && oldAfter.scores.join() === '133,114,108,98' && up.scores.join() === oldAfter.scores.join() && compSame, [oldAfter.scores, up.scores, oldAfter.tx, oldAfter.err, compSame]);
    ok('A5 Câu hỏi đã nhập ở bản cũ còn nguyên và vẫn nằm trong dữ liệu lớp', up.questions.length === 2 && /CÂU CŨ 1/.test(up.questions[0]) && /CÂU CŨ 2/.test(up.questions[1]), up.questions);
    const lost = Object.keys(before).filter(k => !(k in up.store)); const same = ['tk_students', 'tk_scores', 'tk_questions'].filter(k => JSON.stringify(JSON.parse(up.store[k] || 'null')) !== JSON.stringify(JSON.parse(before[k] || 'null')));
    const names = JSON.parse(up.store.tk_students || '[]').map(x => x.name).join(), qs = JSON.parse(up.store.tk_questions || '[]').map(x => x.text || x.question).join();
    ok('A6 Không khóa dữ liệu nào của bản cũ bị xóa; học sinh, điểm, câu hỏi trong bộ nhớ trình duyệt vẫn đủ', lost.length === 0 && /Thử Một.*Thử Hai.*Thử Ba/.test(names) && /CÂU CŨ 1.*CÂU CŨ 2/.test(qs) && JSON.parse(up.store.tk_scores).map(x => x.points).join() === oldAfter.scores.join(), [lost, same, names, qs.slice(0, 80), Object.keys(up.store)]);
    await page.evaluate(() => openView('students')); await page.waitForTimeout(400); const seen = await page.evaluate(() => document.getElementById('students').innerText);
    ok('A7 Màn hình Học sinh của bản mới hiện đúng 3 học sinh cũ', /Học sinh Thử Một/.test(seen) && /Học sinh Thử Hai/.test(seen) && /Học sinh Thử Ba/.test(seen), seen.slice(0, 300));
    ok('A8 Quá trình nâng cấp không có lỗi JavaScript', logs.length === 0, logs); logs.length = 0;
    await ctx.close();

    // ================= B. Người mới mở trang web lần đầu =================
    const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'] }); page = await ctx2.newPage(); watch(page);
    const bad = []; page.on('response', r => { const u = new URL(r.url()); if (r.status() >= 400 && u.host === HOST + ':' + PORT && !/^\/api\/|^\/vendor\/mediapipe\//.test(u.pathname)) bad.push(r.status() + ' ' + u.pathname); });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvDungSai && window.hmvTroLyAI && Array.isArray(window.questionBankSets) && window.questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7, null, { timeout: 20000 }); await page.waitForTimeout(1500);
    const first = await page.evaluate(() => ({ title: document.title, sets: questionBankSets.length, host: location.hostname, secure: window.isSecureContext }));
    ok('B1 Trang web (tên miền không phải localhost, chỉ có tệp tĩnh): mở được, đúng nhãn 2.8, có 7 bộ câu hỏi mẫu, không thiếu tệp nào của ứng dụng', /HMV-BAN-CHINH-2\.15-20261015/.test(first.title) && first.sets >= 7 && first.host === HOST && bad.length === 0, [first, bad]);
    await page.evaluate(() => openView('troLyAI')); await page.waitForSelector('#taStatus'); await page.waitForFunction(() => !/Đang kiểm tra/.test(document.getElementById('taStatus').textContent), null, { timeout: 8000 }).catch(() => {});
    const chip = await page.textContent('#taStatus'); await page.click('[data-ta-tab="setup"]'); await page.waitForTimeout(500);
    const setup = await page.evaluate(() => ({ text: document.getElementById('taBody').innerText, key: !!document.getElementById('taKey'), save: !!document.getElementById('taKeySave'), dt: !!document.getElementById('dtSettings'), paste: !!document.querySelector('[data-ta-paste]') }));
    /* 2.10: thầy yêu cầu mỗi người dùng bản web tự dán khóa Gemini RIÊNG (lưu trong trình duyệt của họ) – xem qa21/t-khoa-web.cjs. */
    ok('B2 Trợ lý AI trên web (2.10): mời người dùng dán khóa Gemini của chính mình – không bảo khởi động lại máy chủ, không nhắc tệp CAI-DAT-AI', /Dán khóa Gemini của thầy cô/.test(chip) && /chỉ được lưu trong trình duyệt trên máy này/.test(setup.text) && !/KHOI-DONG-LAI|khởi động lại máy chủ|CAI-DAT-AI/i.test(chip + setup.text), [chip, setup.text.slice(0, 300)]);
    ok('B3 Trang web có ô dán khóa riêng (2.10); vẫn còn cách soạn câu hỏi bằng dán ChatGPT và phần cài đặt Đọc to', setup.key && setup.save && setup.paste && setup.dt, setup);
    const st = await page.evaluate(() => ({ ready: hmvTroLyAI.ready(), dt: hmvDocTo.state() }));
    ok('B4 Không có khóa trên web nên phần AI ở trạng thái tắt; Đọc to không chọn giọng Gemini', st.ready === false && st.dt.engine !== 'ai', [st.ready, st.dt && st.dt.engine]);
    // Trò chơi + tiếng đúng/sai trên web
    await play(page, 'mau-1-abcd', 'buzzer'); await page.waitForSelector('.buzz-question h2'); await page.evaluate(() => { const m = hmvBuzzState().match; if (m.buzzer === 'LOCKED') buzzOpen(); }); await page.waitForFunction(() => hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 8000 });
    await page.evaluate(() => { buzzClaim(0); }); await page.waitForTimeout(100); await page.evaluate(() => buzzJudge(true)); const snd = await page.waitForFunction(() => hmvDungSai.state().playing === 'right' && hmvDungSai.state().audio.right.time > 0.03, null, { timeout: 5000 }).then(() => true, () => false);
    ok('B5 Trò chơi chạy trên web: Ai nhanh hơn chấm đúng → cộng điểm và phát tiếng ĐÚNG', snd && (await page.evaluate(() => hmvBuzzState().match.scores[0] > 0)));
    await page.evaluate(() => { buzzBack(); openView('games'); gameSetup('poll'); }); await page.waitForSelector('#bcSetup'); await page.click('#bcSetup [data-bc="start"]');
    const cam = await page.waitForFunction(() => hmvPoll.state().streaming === true || hmvPoll.state().camera === 'ready' || hmvPoll.state().camera === 'loading' || hmvPoll.state().camera === 'error', null, { timeout: 15000 }).then(() => page.evaluate(() => ({ cam: hmvPoll.state().camera, streaming: hmvPoll.state().streaming })), () => null);
    ok('B6 Trang web xin được camera (cần địa chỉ https hoặc tương đương; Vercel luôn là https)', first.secure && cam && cam.streaming === true, [first.secure, cam]);
    await page.evaluate(() => pollBack());
    // Ngoại tuyến
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(1500);
    const sw = await page.evaluate(async () => { const names = await caches.keys(); const c = await caches.open('hmv-ban-chinh-2.16'); return { names, n: (await c.keys()).length }; });
    await ctx2.setOffline(true); await page.reload({ waitUntil: 'load' }); const off = await page.waitForFunction(() => window.hmvDungSai && window.questionBankSets && questionBankSets.length >= 7, null, { timeout: 15000 }).then(() => page.evaluate(() => document.title), () => '');
    ok('B7 Đã mở trang một lần thì lần sau mất mạng vẫn mở được (bộ nhớ ngoại tuyến hmv-ban-chinh-2.16)', sw.names.indexOf('hmv-ban-chinh-2.16') >= 0 && sw.n >= 40 && /2\.15/.test(off), [sw, off]);
    await ctx2.setOffline(false);
    ok('B8 Không có lỗi JavaScript khi chạy trên web', logs.length === 0, logs);
    await ctx2.close();
  } finally { await browser.close(); srv.kill(); }
  fs.writeFileSync(path.join(__dirname, 'web-results.json'), JSON.stringify({ at: new Date().toISOString(), build: 'HMV-BAN-CHINH-2.15-20261015', note: 'Máy chủ tệp tĩnh giả lập trên máy thử (không phải Vercel thật); camera giả của Chromium.', total: res.length, passed: res.filter(x => x.pass).length, results: res }, null, 1));
  console.log('TOTAL ' + res.filter(x => x.pass).length + '/' + res.length); process.exit(res.every(x => x.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
