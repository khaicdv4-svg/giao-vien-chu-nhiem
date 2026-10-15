// Kiểm thử bản 2.10 – phần 1: khóa Gemini RIÊNG của từng người dùng trên bản web.
// Web giả lập: máy chủ tệp tĩnh (không có /api), tên miền hocmavui.localhost. Google Gemini GIẢ: mọi yêu cầu tới
// https://generativelanguage.googleapis.com bị chặn lại trong trình duyệt thử và chuyển sang máy Gemini giả (cổng 8799) – không gọi Google thật.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const S = path.join(__dirname, '..'), APP = path.join(S, process.env.HMV_DIR || 'main31', 'app');
const PORT = 8791, HOST = 'hocmavui.localhost', BASE = 'http://' + HOST + ':' + PORT + '/', LOCAL = 'http://127.0.0.1:8780/';
const KEY_A = 'AIzaSyTEST-nguoi-dung-A-0000000000AAAA', KEY_B = 'AQ.TEST-nguoi-dung-B-111111111111BBBB', KEY_BAD = 'BADKEY-khong-hop-le-22222222222222';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 1200) : '')); };
const mock = (p, body) => new Promise((resolve, reject) => { const r = http.request({ host: '127.0.0.1', port: 8799, path: p, method: 'POST', headers: { 'Content-Type': 'application/json' } }, x => { const c = []; x.on('data', d => c.push(d)); x.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString() || '{}'))); }); r.on('error', reject); r.end(JSON.stringify(body || {})); });
const logs = [], google = [], sameOrigin = [];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-goog-api-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('https://generativelanguage.googleapis.com/**', async route => {
    const r = route.request(); if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    google.push({ url: r.url(), key: r.headers()['x-goog-api-key'] || '', body: r.postData() || '', origin: r.headers()['origin'] || '', referer: r.headers()['referer'] || '', cookie: r.headers()['cookie'] || '' });
    const u = new URL(r.url()); const resp = await route.fetch({ url: 'http://127.0.0.1:8799' + u.pathname + u.search, headers: { 'content-type': 'application/json', 'x-goog-api-key': r.headers()['x-goog-api-key'] || '' } });
    return route.fulfill({ status: resp.status(), headers: Object.assign({ 'Content-Type': 'application/json' }, CORS), body: await resp.body() });
  });
  await ctx.route('http://' + HOST + ':' + PORT + '/**', route => { const r = route.request(); sameOrigin.push({ url: r.url(), method: r.method(), body: r.postData() || '', headers: JSON.stringify(r.headers()) }); return route.continue(); });
  const page = await ctx.newPage();
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); }); page.on('dialog', d => d.accept().catch(() => {}));
  return { ctx, page };
}
const boot = async (page, url) => { await page.goto(url || BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvTroLyAI && window.hmvDocTo && typeof openView === 'function', null, { timeout: 15000 }); await page.waitForTimeout(400); };
const setup = async page => { await page.evaluate(() => hmvTroLyAI.open('setup')); await page.waitForSelector('#taKeySave'); await page.waitForTimeout(200); };
const chip = page => page.evaluate(() => document.getElementById('taStatus').textContent.trim());
const stored = page => page.evaluate(() => ({ l: localStorage.getItem('hmv_gemini_web_v1'), s: sessionStorage.getItem('hmv_gemini_web_v1') }));
const testConn = async page => { await page.click('#taKeyTest'); await page.waitForFunction(() => /✅|❌/.test((document.getElementById('taTest') || {}).textContent || ''), null, { timeout: 20000 }); return page.evaluate(() => document.getElementById('taTest').textContent.trim()); };

(async () => {
  await mock('/__mode', { mode: 'normal' });
  const srv = cp.spawn('node', [path.join(__dirname, 'static.cjs'), APP, String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1', '--unsafely-treat-insecure-origin-as-secure=http://' + HOST + ':' + PORT, '--autoplay-policy=no-user-gesture-required'] });
  try {
    // ================= A. Người dùng A trên bản web =================
    let { ctx, page } = await newCtx(browser); await boot(page); await setup(page);
    const ui = await page.evaluate(() => { const b = document.getElementById('taBody'); return { text: b.innerText, key: !!document.getElementById('taKey'), rem: !!document.getElementById('taKeyRemember') && document.getElementById('taKeyRemember').checked, model: !!document.getElementById('taModel'), keyType: (document.getElementById('taKey') || {}).type }; });
    const c0 = await chip(page);
    ok('1 Bản web, chưa có khóa: Kết nối AI hiện ô dán khóa riêng (ô kiểu mật khẩu), ô "Ghi nhớ khóa" (mặc định chọn), ô tên mô hình, lời giải thích khóa chỉ lưu trong trình duyệt và chỉ gửi tới Google; không còn nhắc tệp CAI-DAT-AI hay "chỉ có ở bản cài trên máy"', ui.key && ui.keyType === 'password' && ui.rem && ui.model && /chỉ được lưu trong trình duyệt trên máy này/.test(ui.text) && /chỉ gửi tới Google/.test(ui.text) && !/CAI-DAT-AI/.test(ui.text) && !/chỉ chạy ở bản cài|chỉ có ở bản cài/.test(ui.text) && /Dán khóa Gemini của thầy cô/.test(c0), [ui, c0]);
    await page.fill('#taKey', KEY_A); await page.click('#taKeySave'); await page.waitForFunction(() => /Đã lưu khóa riêng/.test(document.getElementById('taTest').textContent), null, { timeout: 5000 });
    let st = await stored(page), c1 = await chip(page);
    ok('2 Lưu khóa (có ghi nhớ): khóa nằm trong localStorage của trình duyệt này; chip báo "khóa riêng của thầy cô (…AAAA)"; ô dán khóa được xóa trắng', st.l && JSON.parse(st.l).key === KEY_A && !st.s && /khóa riêng của thầy cô \(…AAAA\)/.test(c1) && (await page.inputValue('#taKey')) === '', [st, c1]);
    const t1 = await testConn(page); const g1 = google[google.length - 1];
    ok('3 Kiểm tra kết nối: trình duyệt gọi THẲNG generativelanguage.googleapis.com, khóa nằm trong tiêu đề x-goog-api-key, KHÔNG nằm trong địa chỉ URL, không gửi cookie hay địa chỉ trang (referrer)', /✅ Kết nối tốt/.test(t1) && g1 && g1.key === KEY_A && g1.url.indexOf(KEY_A) < 0 && !/key=/.test(g1.url) && /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent$/.test(g1.url) && !g1.cookie && !g1.referer, [t1, g1 && { url: g1.url, ref: g1.referer, cookie: g1.cookie }]);
    // Tạo câu hỏi nhanh
    await page.evaluate(() => hmvTroLyAI.open('quick')); await page.waitForSelector('#taTopic'); await page.fill('#taTopic', 'Phân số bằng nhau'); await page.selectOption('#taCount', '5'); const n0 = google.length;
    await page.click('#taGenerate'); await page.waitForFunction(() => document.querySelectorAll('.ta-draft').length >= 5, null, { timeout: 20000 }).catch(() => {});
    const drafts = await page.evaluate(() => document.querySelectorAll('.ta-draft').length);
    ok('4 Trợ lý AI → Tạo câu hỏi nhanh chạy trên web bằng khóa riêng: ra câu hỏi nháp để duyệt', drafts >= 5 && google.length > n0 && google.slice(n0).every(g => g.key === KEY_A), [drafts, google.length - n0]);
    // Ẩn tên học sinh
    await page.evaluate(() => { students = [{ fullName: 'Nguyễn Minh Khang', name: 'Nguyễn Minh Khang', team: 1 }, { fullName: 'Trần Thị Bảo Ngọc', name: 'Trần Thị Bảo Ngọc', team: 2 }]; });
    await page.evaluate(() => hmvTroLyAI.open('chat')); await page.waitForSelector('#taChatInput'); const n1 = google.length;
    await page.fill('#taChatInput', 'Viết lời nhận xét cho em Nguyễn Minh Khang và em Trần Thị Bảo Ngọc về môn Toán.'); await page.click('#taChatSend');
    await page.waitForFunction(() => document.querySelectorAll('.ta-msg.model .ta-md').length > 0, null, { timeout: 20000 }).catch(() => {});
    const sent = google.slice(n1).map(g => g.body).join('\n'); const shown = await page.evaluate(() => (document.querySelector('.ta-msg.model .ta-md') || {}).textContent || '');
    ok('5 Trợ lý Sư phạm trên web: họ tên học sinh trong danh sách lớp được thay bằng [HS1], [HS2] TRƯỚC khi gửi tới Google; màn hình thầy cô vẫn thấy tên thật', sent.length > 0 && !/Nguyễn Minh Khang|Trần Thị Bảo Ngọc/.test(sent) && /\[HS1\]/.test(sent) && /\[HS2\]/.test(sent) && /Nguyễn Minh Khang|Trần Thị Bảo Ngọc/.test(shown), [sent.slice(0, 300), shown.slice(0, 200)]);
    // Giọng đọc AI trên web
    const voice = await page.evaluate(async () => { hmvDocTo.set({ engine: 'ai' }); const n = Date.now(); try { const done = await hmvDocTo.speak('Bảy nhân tám bằng năm mươi sáu.'); return { done, ms: Date.now() - n, engine: hmvDocTo.state().engine }; } catch (e) { return { err: e.message }; } });
    const gt = google[google.length - 1];
    ok('6 Giọng đọc AI Gemini chạy trên web bằng khóa riêng (âm thanh PCM được đóng thành WAV ngay trong trình duyệt và phát được)', voice.done === true && voice.engine === 'ai' && gt && /tts/.test(gt.url) && gt.key === KEY_A, [voice, gt && gt.url]);
    await page.evaluate(() => hmvDocTo.set({ engine: 'auto' }));
    const leak = sameOrigin.filter(r => (r.url + r.body + r.headers).indexOf(KEY_A) >= 0 || /\/api\//.test(r.url) || r.method !== 'GET' && r.method !== 'HEAD');
    ok('7 Không một yêu cầu nào về máy chủ của trang web (Vercel giả lập) chứa khóa, gọi /api/… hay gửi dữ liệu (POST)', leak.length === 0 && sameOrigin.length > 10, leak.slice(0, 3));
    // Tên mô hình
    await setup(page); await page.fill('#taModel', 'gemini-tu-chon-9'); await page.dispatchEvent('#taModel', 'change'); await page.waitForTimeout(300);
    await testConn(page); const gm = google[google.length - 1];
    st = await stored(page);
    ok('8 Ô "Tên mô hình": đổi tên mô hình không phải dán lại khóa; lần gọi sau dùng mô hình đó trước tiên', JSON.parse(st.l).model === 'gemini-tu-chon-9' && JSON.parse(st.l).key === KEY_A && /models\/gemini-tu-chon-9:/.test(gm.url), [st.l && JSON.parse(st.l).model, gm.url]);
    await page.fill('#taModel', ''); await page.dispatchEvent('#taModel', 'change'); await page.waitForTimeout(200);
    // Khóa sai
    await page.fill('#taKey', KEY_BAD); await page.click('#taKeySave'); await page.waitForTimeout(300); const tb = await testConn(page);
    ok('9 Khóa sai: báo rõ "Khóa Gemini không hợp lệ…", thông báo không chứa khóa', /❌ Khóa Gemini không hợp lệ/.test(tb) && tb.indexOf(KEY_BAD) < 0, tb);
    await page.fill('#taKey', 'khoa co khoang trang'); await page.click('#taKeySave'); await page.waitForTimeout(300); const tf = await page.evaluate(() => document.getElementById('taTest').textContent);
    st = await stored(page);
    ok('10 Dán chuỗi không phải khóa (có khoảng trắng): từ chối, giữ nguyên khóa đang có', /không đúng định dạng/.test(tf) && JSON.parse(st.l).key === KEY_BAD, [tf, st]);
    // Không ghi nhớ
    await page.fill('#taKey', KEY_A); await page.uncheck('#taKeyRemember'); await page.click('#taKeySave'); await page.waitForTimeout(300); st = await stored(page);
    ok('11 Bỏ chọn "Ghi nhớ khóa": khóa chỉ giữ tạm trong phiên (sessionStorage), localStorage không còn khóa', !st.l && st.s && JSON.parse(st.s).key === KEY_A, st);
    await page.check('#taKeyRemember'); await page.dispatchEvent('#taKeyRemember', 'change'); await page.waitForTimeout(300); st = await stored(page);
    ok('12 Chọn lại "Ghi nhớ khóa" khi đã có khóa: chuyển sang ghi nhớ mà không phải dán lại', st.l && JSON.parse(st.l).key === KEY_A && !st.s, st);
    await page.uncheck('#taKeyRemember'); await page.dispatchEvent('#taKeyRemember', 'change'); await page.waitForTimeout(300);
    const saved = await ctx.storageState(); await ctx.close();
    // Mở lại trình duyệt (phiên mới, cùng hồ sơ): khóa tạm đã mất
    ({ ctx, page } = await (async () => { const c = await browser.newContext({ storageState: saved, serviceWorkers: 'block' }); await c.route('https://generativelanguage.googleapis.com/**', r => r.abort()); const p = await c.newPage(); return { ctx: c, page: p }; })());
    await boot(page); await setup(page); st = await stored(page); const c2 = await chip(page);
    ok('13 Đóng trình duyệt rồi mở lại (khóa không ghi nhớ): khóa đã tự xóa, AI báo cần dán khóa', !st.l && !st.s && /Dán khóa Gemini/.test(c2), [st, c2]);
    await ctx.close();

    // ================= B. Người dùng B: máy / trình duyệt khác =================
    ({ ctx, page } = await newCtx(browser)); await boot(page); await setup(page);
    st = await stored(page); const cB = await chip(page);
    const nB = google.length; await page.evaluate(() => hmvTroLyAI.open('quick')); await page.waitForSelector('#taTopic'); await page.fill('#taTopic', 'Góc nhọn'); await page.click('#taGenerate'); await page.waitForTimeout(800);
    const noteB = await page.evaluate(() => (document.getElementById('taNote') || {}).textContent || '');
    ok('14 Người dùng khác (trình duyệt khác) KHÔNG dùng được khóa của người A: chưa có khóa, bấm Tạo câu hỏi thì được nhắc dán khóa của mình, không có yêu cầu nào tới Google', !st.l && !st.s && /Dán khóa Gemini/.test(cB) && google.length === nB && /Chưa có khóa Gemini/.test(noteB), [st, cB, noteB, google.length - nB]);
    await setup(page); await page.fill('#taKey', KEY_B); await page.click('#taKeySave'); await page.waitForTimeout(300); await testConn(page);
    ok('15 Người dùng B dán khóa của mình → các yêu cầu của B dùng khóa B', google[google.length - 1].key === KEY_B, google[google.length - 1].key.slice(-4));
    await page.click('#taKeyClear'); await page.waitForTimeout(300); st = await stored(page); const cC = await chip(page);
    ok('16 Nút "Xóa khóa": khóa bị xóa khỏi trình duyệt (cả localStorage lẫn sessionStorage)', !st.l && !st.s && /Dán khóa Gemini/.test(cC) && /Đã xóa khóa khỏi trình duyệt này/.test(await page.evaluate(() => document.getElementById('taTest').textContent)), [st, cC]);
    // Giới hạn lượt
    await page.fill('#taKey', KEY_B); await page.click('#taKeySave'); await page.waitForTimeout(200); await mock('/__mode', { mode: '429all' }); const tr = await testConn(page); await mock('/__mode', { mode: 'normal' });
    ok('17 Google báo hết lượt (429): thông báo dễ hiểu "đang giới hạn lượt dùng của khóa này… chờ khoảng một phút"', /❌ Gemini đang giới hạn lượt dùng của khóa này/.test(tr), tr);
    await ctx.close();

    // ================= C. Bản cài trên máy thầy (127.0.0.1:8780) không đổi =================
    ({ ctx, page } = await newCtx(browser)); await page.addInitScript(k => { try { localStorage.setItem('hmv_gemini_web_v1', JSON.stringify({ key: k })); } catch (e) {} }, KEY_A);
    const nL = google.length; await boot(page, LOCAL); await setup(page);
    const loc = await page.evaluate(() => ({ text: document.getElementById('taBody').innerText, rem: !!document.getElementById('taKeyRemember'), active: window.hmvAiWeb.active, st: hmvTroLyAI.status() }));
    if (await page.$('#taKeyTest[disabled]')) { await page.fill('#taKey', 'AIzaSyLOCAL-may-thay-3333333333333333'); await page.click('#taKeySave'); await page.waitForTimeout(400); }
    const tL = await testConn(page);
    ok('18 Bản cài trên máy (127.0.0.1): vẫn dùng máy chủ nội bộ và tệp CAI-DAT-AI\\khoa-gemini.txt; không có ô "Ghi nhớ khóa"; không dùng khóa web lưu trong trình duyệt; không gọi Google trực tiếp từ trình duyệt', !loc.active && !loc.rem && /CAI-DAT-AI/.test(loc.text) && !loc.st.web && /✅ Kết nối tốt/.test(tL) && google.length === nL, [loc.active, loc.rem, loc.st && loc.st.web, tL, google.length - nL]);
    await ctx.close();

    // ================= D. Mã nguồn =================
    const src = fs.readFileSync(path.join(APP, 'ai-tren-web.js'), 'utf8'), idx = fs.readFileSync(path.join(APP, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
    const hosts = (src.match(/https?:\/\/[a-z0-9.\-]+/gi) || []).filter((v, i, a) => a.indexOf(v) === i);
    ok('19 Mã nguồn: ai-tren-web.js chỉ gọi đúng một địa chỉ ngoài (generativelanguage.googleapis.com); nạp trước tro-ly-ai.js; có trong bộ nhớ ngoại tuyến; không có khóa nào viết sẵn trong mã', hosts.join() === 'https://generativelanguage.googleapis.com' && idx.indexOf('./ai-tren-web.js') > 0 && idx.indexOf('./ai-tren-web.js') < idx.indexOf('./tro-ly-ai.js') && /'\.\/ai-tren-web\.js'/.test(sw) && !/AIza[0-9A-Za-z_\-]{20,}/.test(src + idx), hosts);
    ok('20 Không có lỗi JavaScript', logs.length === 0, logs);
  } finally { await browser.close(); srv.kill(); await mock('/__mode', { mode: 'normal' }).catch(() => {}); }
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'khoa-web-results.json'), JSON.stringify({ version: '2.10', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
