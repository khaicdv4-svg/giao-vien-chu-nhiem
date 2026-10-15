// Kiểm thử bản 2.13: trang cài qua mã QR (cai-dat.html), áp phích A4, mã QR trong Cài đặt.
// Thiết bị được GIẢ LẬP bằng chuỗi nhận dạng trình duyệt (iPhone Safari, iPad, Zalo, Facebook, Chrome iPhone, Android, Samsung, máy tính).
// Không có iPhone / Android thật: không kiểm được hộp "Thêm vào MH chính" thật của Safari hay việc Zalo cho mở Safari.
// Mã QR được giải bằng bộ giải mã độc lập giai-ma-qr.py (đọc định dạng, bỏ mặt nạ, kiểm Reed-Solomon).
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const S = path.join(__dirname, '..'), APP = path.join(S, process.env.HMV_DIR || 'main31', 'app');
const PORT = 8793, HOST = 'hocmavui.localhost', WEB = 'http://' + HOST + ':' + PORT + '/', LOCAL = 'http://127.0.0.1:8780/';
const URL_PAGE = 'https://giao-vien-chu-nhiem.vercel.app/cai-dat.html';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  zaloIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36'
};
const logs = [];
(async () => {
  const srv = cp.spawn('node', [path.join(__dirname, 'static.cjs'), APP, String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1', '--unsafely-treat-insecure-origin-as-secure=http://' + HOST + ':' + PORT] });
  const open = async (ua, opt = {}) => {
    const mobile = ua && ua !== 'desktop' && !/Macintosh/.test(UA[ua] || '');
    const ctx = await browser.newContext(Object.assign({ viewport: mobile ? { width: 390, height: 844 } : ua === 'ipad' ? { width: 820, height: 1180 } : { width: 1366, height: 860 }, userAgent: UA[ua], isMobile: mobile, hasTouch: mobile || ua === 'ipad', serviceWorkers: 'block' }, opt.ctx || {}));
    if (opt.grant) await ctx.grantPermissions(opt.grant, { origin: WEB.slice(0, -1) });
    const page = await ctx.newPage(); page.on('pageerror', e => logs.push(ua + ' PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) logs.push(ua + ' console.error ' + m.text().slice(0, 160)); });
    if (opt.init) await page.addInitScript(opt.init);
    await page.goto(WEB + 'cai-dat.html', { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvCaiDat); await page.waitForTimeout(300);
    const st = await page.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; }; const p = document.getElementById('pointer'); const pr = p.getBoundingClientRect(); return { view: hmvCaiDat.view(), text: document.querySelector('main').innerText, pointer: !p.hidden, ptop: p.classList.contains('top'), pr: { top: Math.round(pr.top), bottom: Math.round(pr.bottom) }, ih: innerHeight, open: (document.getElementById('openExt') || {}).getAttribute && document.getElementById('openExt').getAttribute('href'), qr: vis('vQr'), over: document.documentElement.scrollWidth - innerWidth }; });
    return { ctx, page, st };
  };
  let o;
  // A. iPhone Safari
  o = await open('iphone'); await o.page.screenshot({ path: path.join(__dirname, 'cai-dat-iphone.png') });
  ok('1 iPhone (Safari): hiện "Cài trên iPhone – 3 bước": Chia sẻ → Thêm vào MH chính → Thêm; có mũi tên nhấp nháy ở ĐÁY màn hình chỉ vào nút Chia sẻ', o.st.view === 'vIos' && /Cài trên iPhone – 3 bước/.test(o.st.text) && /Chia sẻ/.test(o.st.text) && /Thêm vào MH chính/.test(o.st.text) && o.st.pointer && !o.st.ptop && o.st.pr.bottom > o.st.ih - 60 && o.st.over <= 0, o.st);
  await o.ctx.close();
  o = await open('ipad');
  ok('2 iPad: mũi tên chuyển lên GÓC TRÊN bên phải (nút Chia sẻ của Safari trên iPad nằm ở đó)', o.st.view === 'vIos' && /Cài trên iPad/.test(o.st.text) && o.st.pointer && o.st.ptop && o.st.pr.top < 80 && /góc trên bên phải/.test(o.st.text), o.st); await o.ctx.close();
  // B. Trong Zalo / Facebook
  o = await open('zaloIos'); await o.page.screenshot({ path: path.join(__dirname, 'cai-dat-zalo.png') });
  ok('3 Mở mã QR trong Zalo (iPhone): cảnh báo "đang mở trong Zalo – không cài được", hướng dẫn ••• → Mở bằng trình duyệt, nút "Mở bằng Safari" (x-safari-https://…) và nút Sao chép link; không có mũi tên', o.st.view === 'vInApp' && /Zalo/.test(o.st.text) && /không cài được/.test(o.st.text) && /Mở bằng Safari/.test(o.st.text) && o.st.open === 'x-safari-' + URL_PAGE && !o.st.pointer, o.st);
  await o.ctx.close();
  o = await open('fbAndroid', { grant: ['clipboard-read', 'clipboard-write'] });
  await o.page.click('#copyLink'); await o.page.waitForTimeout(200); const clip = await o.page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e.message)); const cbtn = await o.page.textContent('#copyLink');
  ok('4 Mở trong Facebook (Android): nhận ra Facebook; nút "Mở bằng Chrome" dùng lệnh intent mở thẳng Chrome; "Sao chép link" chép đúng link trang cài', o.st.view === 'vInApp' && /Facebook/.test(o.st.text) && /Mở bằng Chrome/.test(o.st.text) && o.st.open === 'intent://giao-vien-chu-nhiem.vercel.app/cai-dat.html#Intent;scheme=https;package=com.android.chrome;end' && clip === URL_PAGE && /Đã sao chép/.test(cbtn), [o.st.view, o.st.open, clip, cbtn]); await o.ctx.close();
  // C. Chrome trên iPhone
  o = await open('chromeIos');
  ok('5 Chrome trên iPhone: hướng dẫn nút Chia sẻ ở cuối ô địa chỉ → Thêm vào MH chính; gợi ý dùng Safari nếu không thấy', o.st.view === 'vIosOther' && /Cài trên iPhone – từ Chrome/.test(o.st.text) && /cuối ô địa chỉ/.test(o.st.text) && /Safari/.test(o.st.text), o.st.text.slice(0, 300)); await o.ctx.close();
  // D. Android
  const FAKE = () => { window.__fake = outcome => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted = (window.__prompted || 0) + 1; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome }); dispatchEvent(e); }; };
  o = await open('android', { init: FAKE }); const before = o.st.view;
  await o.page.evaluate(() => __fake('accepted')); await o.page.waitForTimeout(150); const ready = await o.page.evaluate(() => hmvCaiDat.view());
  await o.page.screenshot({ path: path.join(__dirname, 'cai-dat-android.png') });
  await o.page.click('#installBtn'); await o.page.waitForTimeout(300); const after = await o.page.evaluate(() => ({ v: hmvCaiDat.view(), p: window.__prompted, t: document.getElementById('vDone').innerText }));
  ok('6 Android Chrome: khi trình duyệt chưa sẵn sàng → hướng dẫn ⋮ → Cài đặt ứng dụng; khi sẵn sàng → nút lớn "📲 Cài HỌC MÀ VUI"; bấm → hộp cài của Chrome mở đúng một lần; đồng ý → "đã được cài" + nút Mở', before === 'vAndroid' && /⋮/.test(o.st.text) && ready === 'vPrompt' && after.p === 1 && after.v === 'vDone' && /đã được cài/.test(after.t), [before, ready, after]); await o.ctx.close();
  o = await open('samsung');
  ok('7 Samsung Internet: hướng dẫn riêng ≡ → Thêm trang vào → Màn hình chính', o.st.view === 'vAndroid' && /Thêm trang vào/.test(o.st.text), o.st.text.slice(0, 200)); await o.ctx.close();
  // E. Máy tính
  o = await open('desktop'); await o.page.screenshot({ path: path.join(__dirname, 'cai-dat-may-tinh.png'), fullPage: true });
  ok('8 Máy tính: hướng dẫn Chrome/Edge + khối mã QR "Cài trên điện thoại khác" + nút tải áp phích A4 + "Dùng ngay trên trình duyệt"', o.st.view === 'vDesktop' && o.st.qr && /Cài trên điện thoại khác/.test(o.st.text) && /Tải áp phích/.test(o.st.text) && /Dùng ngay trên trình duyệt/.test(o.st.text), o.st.view);
  // QR trên trang: chụp ảnh mã → đọc ma trận → giải mã
  const qsrc = await o.page.evaluate(() => document.querySelector('#vQr img').src); const qp = await o.ctx.newPage(); await qp.setViewportSize({ width: 820, height: 820 }); await qp.goto(qsrc); await qp.waitForTimeout(300);
  const img = qp; await img.screenshot({ path: path.join(__dirname, 'qr-tren-trang.png') }); await qp.close();
  const dec = cp.execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open('${path.join(__dirname, 'qr-tren-trang.png')}').convert('L'); W,H=im.size; m=W/41
M=[[1 if im.getpixel((int((c+4+.5)*m),int((r+4+.5)*m)))<128 else 0 for c in range(33)] for r in range(33)]
open('${path.join(__dirname, 'qr-tren-trang.txt')}','w').write('\\n'.join(''.join(map(str,r)) for r in M))`]) && cp.execFileSync('python3', [path.join(__dirname, 'giai-ma-qr.py'), path.join(__dirname, 'qr-tren-trang.txt')]).toString();
  ok('9 Mã QR hiện trên trang (ảnh chụp màn hình) giải ra đúng "' + URL_PAGE + '", mã sửa lỗi hợp lệ', /rs_ok True/.test(dec) && dec.trim().endsWith('text ' + URL_PAGE), dec);
  await o.ctx.close();
  // F. Đang mở từ biểu tượng đã cài
  o = await open('iphone', { init: () => { Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true }); } });
  ok('10 Đã cài (mở từ biểu tượng): báo "đã được cài" + nút Mở HỌC MÀ VUI; không còn mũi tên', o.st.view === 'vDone' && !o.st.pointer, o.st.view); await o.ctx.close();
  // G. Áp phích
  const poster = await new Promise(r => http.get('http://127.0.0.1:' + PORT + '/assets/ap-phich-cai-dat.png', x => { const c = []; x.on('data', d => c.push(d)); x.on('end', () => r({ st: x.statusCode, b: Buffer.concat(c) })); }));
  const pw = poster.b.readUInt32BE(16), ph = poster.b.readUInt32BE(20);
  const pdec = cp.execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open('${path.join(APP, 'assets', 'ap-phich-cai-dat.png')}').convert('L'); qx=(2480-1230)//2; qy=1180; m=1230/41
M=[[1 if im.getpixel((int(qx+(c+4+.5)*m),int(qy+(r+4+.5)*m)))<128 else 0 for c in range(33)] for r in range(33)]
open('${path.join(__dirname, 'qr-ap-phich.txt')}','w').write('\\n'.join(''.join(map(str,r)) for r in M))`]) && cp.execFileSync('python3', [path.join(__dirname, 'giai-ma-qr.py'), path.join(__dirname, 'qr-ap-phich.txt')]).toString();
  ok('11 Áp phích A4 (2480×3508 điểm ảnh = A4 ở 300 dpi) tải được; mã QR trên áp phích giải ra đúng link', poster.st === 200 && pw === 2480 && ph === 3508 && pdec.trim().endsWith('text ' + URL_PAGE), [poster.st, pw, ph, pdec]);
  // H. Chromium: trang cài có đủ điều kiện cài ứng dụng
  { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(LOCAL + 'cai-dat.html'); await p.waitForTimeout(800); const cdp = await ctx.newCDPSession(p); const e = await cdp.send('Page.getInstallabilityErrors'); const m = await cdp.send('Page.getAppManifest');
    ok('12 Chromium xác nhận: mở ngay trang cai-dat.html cũng đủ điều kiện cài (Android hiện nút cài ngay trên trang này)', e.installabilityErrors.length === 0 && /manifest\.webmanifest$/.test(m.url), e); await ctx.close(); }
  // I. Thẻ trong Cài đặt của ứng dụng
  { const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: LOCAL.slice(0, -1) }); const p = await ctx.newPage(); p.on('pageerror', e => logs.push('app PAGEERROR ' + e.message));
    await p.goto(LOCAL); await p.waitForFunction(() => window.hmvInstall && typeof openView === 'function'); await p.evaluate(() => openView('settings')); await p.waitForSelector('#hmvInstallCard .hmv-inst-qr');
    const c = await p.evaluate(() => { const q = document.querySelector('#hmvInstallCard .hmv-inst-qr'); return { t: q.innerText, img: q.querySelector('img').naturalWidth > 0, href: [...q.querySelectorAll('a')].map(a => a.getAttribute('href')) }; });
    await p.click('[data-hmv-copy-install]'); await p.waitForTimeout(200); const clip2 = await p.evaluate(() => navigator.clipboard.readText());
    await p.evaluate(() => document.querySelector('#hmvInstallCard .hmv-inst-qr').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(__dirname, 'cai-dat-trong-ung-dung.png') });
    ok('13 Cài đặt & dữ liệu → thẻ Cài ứng dụng có mã QR, nút "Mở trang cài", "Tải áp phích A4", "Sao chép link" (chép đúng link)', c.img && /Cài trên điện thoại/.test(c.t) && c.href.includes('cai-dat.html') && c.href.includes('assets/ap-phich-cai-dat.png') && clip2 === URL_PAGE, [c, clip2]);
    await ctx.close(); }
  ok('14 Không có lỗi JavaScript trên mọi thiết bị giả lập', logs.length === 0, logs);
  await browser.close(); srv.kill();
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'cai-dat-results.json'), JSON.stringify({ version: '2.13', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
