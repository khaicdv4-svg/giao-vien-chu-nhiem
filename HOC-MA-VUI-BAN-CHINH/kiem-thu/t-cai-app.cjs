// Kiểm thử bản 2.11: cài HỌC MÀ VUI như một ứng dụng (manifest, biểu tượng, nút "Cài ứng dụng", hướng dẫn theo thiết bị).
// Trình duyệt thử là Chromium không giao diện: KHÔNG bấm được hộp thoại cài thật của trình duyệt. Bài này hỏi thẳng Chromium
// (giao thức gỡ lỗi CDP: Page.getInstallabilityErrors / getAppManifest) xem trang có đủ điều kiện cài không, và giả lập sự kiện beforeinstallprompt.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/'; const APP = path.join(__dirname, '..', process.env.HMV_DIR || 'main31', 'app');
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const get = p => new Promise((resolve, reject) => http.get(new URL(p, BASE), r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(c) })); }).on('error', reject));
const pngSize = b => b.length > 24 && b.readUInt32BE(0) === 0x89504e47 ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
const logs = [];
const FAKE = () => { window.__fakePrompt = (outcome) => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompted = 0; e.prompt = () => { e.prompted++; window.__prompted = (window.__prompted || 0) + 1; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: outcome || 'accepted', platform: 'web' }); window.dispatchEvent(e); return e.defaultPrevented; }; };
(async () => {
  // A. Tệp
  const m = await get('manifest.webmanifest'); let man = null; try { man = JSON.parse(m.body.toString('utf8')); } catch (e) {}
  const icons = {}; for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-48.png']) { const r = await get('assets/icons/' + f); icons[f] = { st: r.status, size: pngSize(r.body), local: r.body.equals(fs.readFileSync(path.join(APP, 'assets', 'icons', f))) }; }
  ok('1 manifest.webmanifest hợp lệ: tên "HỌC MÀ VUI…", tên ngắn "Học mà vui", start_url/scope "./", hiển thị standalone, màu chủ đạo, đủ biểu tượng 192 và 512 (có bản maskable)', m.status === 200 && /manifest\+json/.test(m.type) && man && /^HỌC MÀ VUI/.test(man.name) && man.short_name === 'Học mà vui' && man.start_url === './' && man.scope === './' && man.display === 'standalone' && man.theme_color && man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512' && i.purpose === 'any') && man.icons.some(i => i.purpose === 'maskable'), [m.status, m.type, man && man.name]);
  ok('2 Năm tệp biểu tượng (từ logo ThayKhaiEdu của thầy) đúng kích thước 192, 512, 512, 180, 48 và đúng tệp trong gói', icons['icon-192.png'].size + '' === '192,192' && icons['icon-512.png'].size + '' === '512,512' && icons['icon-maskable-512.png'].size + '' === '512,512' && icons['apple-touch-icon.png'].size + '' === '180,180' && icons['favicon-48.png'].size + '' === '48,48' && Object.values(icons).every(i => i.st === 200 && i.local), icons);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (opts = {}) => { const ctx = await browser.newContext(Object.assign({ viewport: { width: 1366, height: 768 } }, opts)); const page = await ctx.newPage(); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', x => { if (x.type() === 'error' && !/Failed to load resource|net::ERR/.test(x.text())) logs.push('console.error ' + x.text().slice(0, 200)); }); page.on('dialog', d => d.dismiss().catch(() => {})); await page.addInitScript(FAKE); await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvInstall && typeof openView === 'function', null, { timeout: 15000 }); await page.waitForTimeout(600); return { ctx, page }; };
  let { ctx, page } = await open();
  const head = await page.evaluate(() => ({ man: !!document.querySelector('link[rel="manifest"][href="./manifest.webmanifest"]'), apple: !!document.querySelector('link[rel="apple-touch-icon"]'), icon: !!document.querySelector('link[rel="icon"]'), order: [...document.head.querySelectorAll('script[src]')].map(s => s.getAttribute('src')).indexOf('./cai-ung-dung.js') }));
  ok('3 Trang khai báo manifest, biểu tượng thẻ, biểu tượng iPhone; tệp cai-ung-dung.js nạp ngay trong <head> (không lỡ sự kiện cài)', head.man && head.apple && head.icon && head.order === 0, head);
  // B. Chromium xác nhận đủ điều kiện cài
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  const cdp = await ctx.newCDPSession(page); const inst = await cdp.send('Page.getInstallabilityErrors').catch(e => ({ err: e.message })); const am = await cdp.send('Page.getAppManifest').catch(e => ({ err: e.message }));
  ok('4 Chromium xác nhận trang ĐỦ ĐIỀU KIỆN cài thành ứng dụng (không có lỗi installability) và đọc được manifest không lỗi', inst.installabilityErrors && inst.installabilityErrors.length === 0 && am.errors && am.errors.length === 0 && /manifest\.webmanifest$/.test(am.url), [inst, am.errors]);
  const sw = await page.evaluate(async () => { const c = await caches.open((await caches.keys()).find(k => /hmv-ban-chinh-2\.15/.test(k)) || 'x'); const keys = (await c.keys()).map(r => new URL(r.url).pathname); return { names: await caches.keys(), has: ['/manifest.webmanifest', '/cai-ung-dung.js', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png'].every(p => keys.includes(p)) }; });
  ok('5 Bộ nhớ ngoại tuyến hmv-ban-chinh-2.16 có manifest, biểu tượng và mã cài đặt (ứng dụng đã cài mở được khi mất mạng)', sw.names.includes('hmv-ban-chinh-2.16') && sw.has, sw);
  // C. Chưa có lệnh cài (trình duyệt chưa báo) → không hiện nút trên thanh trên; Cài đặt có hướng dẫn
  let top = await page.$('#hmvInstallTop:not([hidden])');
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvInstallCard'); let card = await page.evaluate(() => document.getElementById('hmvInstallCard').innerText);
  ok('6 Trước khi trình duyệt cho phép cài: thanh trên chưa có nút; mục Cài đặt & dữ liệu có thẻ "Cài HỌC MÀ VUI như một ứng dụng" kèm hướng dẫn biểu tượng trên thanh địa chỉ (như ảnh của thầy) và ⋮ → Cài đặt trang dưới dạng ứng dụng', !top && /Cài HỌC MÀ VUI như một ứng dụng/.test(card) && /thanh địa chỉ/.test(card) && /Cài đặt trang dưới dạng ứng dụng/.test(card), card.slice(0, 400));
  ok('7 Bản trên máy (127.0.0.1): thẻ nhắc ứng dụng cài từ đây cần máy chủ nội bộ chạy; người khác nên cài từ địa chỉ web', /máy chủ nội bộ đang chạy/.test(card) && /giao-vien-chu-nhiem\.vercel\.app/.test(card));
  // D. Trình duyệt báo có thể cài → nút xuất hiện; bấm → hộp thoại cài của trình duyệt
  const prevented = await page.evaluate(() => window.__fakePrompt('accepted')); await page.waitForTimeout(200);
  top = await page.$('#hmvInstallTop:not([hidden])'); card = await page.evaluate(() => document.getElementById('hmvInstallCard').innerText);
  ok('8 Trình duyệt báo có thể cài: nút "📲 Cài ứng dụng" hiện trên thanh trên cùng và trong thẻ ở Cài đặt (trang giữ lệnh cài để thầy cô tự bấm)', prevented && top && /📲 Cài ứng dụng/.test(await top.textContent()) && (await page.$('#hmvInstallCard [data-hmv-install]')) !== null, [prevented, !!top, card.slice(0, 200)]);
  await page.click('#hmvInstallTop'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ p: window.__prompted, st: hmvInstall.state(), top: !!document.querySelector('#hmvInstallTop:not([hidden])'), card: document.getElementById('hmvInstallCard').innerText }));
  ok('9 Bấm "Cài ứng dụng" → mở hộp thoại cài của trình duyệt đúng một lần; thầy cô đồng ý → thẻ báo "Đã cài xong", nút trên thanh trên ẩn đi', after.p === 1 && after.st === 'installed' && !after.top && /Đã cài xong/.test(after.card), after);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await page.waitForTimeout(200);
  await page.evaluate(() => window.__fakePrompt('dismissed')); await page.waitForTimeout(150); await ctx.close();
  ({ ctx, page } = await open()); await page.evaluate(() => window.__fakePrompt('dismissed')); await page.waitForTimeout(150); await page.click('#hmvInstallTop'); await page.waitForTimeout(300);
  const dis = await page.evaluate(() => ({ p: window.__prompted, st: hmvInstall.state(), top: !!document.querySelector('#hmvInstallTop:not([hidden])') }));
  ok('10 Thầy cô bấm "Hủy" ở hộp thoại cài: ứng dụng không báo lỗi, nút cài ẩn (trình duyệt sẽ cho cài lại sau)', dis.p === 1 && dis.st !== 'installed' && !dis.top, dis);
  await ctx.close();
  // E. Đang chạy như ứng dụng đã cài – Chromium thử không giả lập được display-mode, nên giả lập cách iPhone báo (navigator.standalone = true)
  { const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', isMobile: true, hasTouch: true }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
    await p2.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true }); } catch (e) {} });
    await p2.goto(BASE, { waitUntil: 'load' }); await p2.waitForFunction(() => window.hmvInstall && typeof openView === 'function'); await p2.evaluate(() => openView('settings')); await p2.waitForTimeout(300);
    const run = await p2.evaluate(() => ({ st: hmvInstall.state(), card: (document.getElementById('hmvInstallCard') || {}).innerText || '', cls: document.documentElement.classList.contains('hmv-standalone'), top: !!document.querySelector('#hmvInstallTop:not([hidden])') }));
    ok('11 Mở từ biểu tượng đã cài (giả lập iPhone báo đang chạy như ứng dụng): thẻ báo "đang dùng ở dạng ứng dụng đã cài", không còn hướng dẫn cài, không có nút cài', run.st === 'running' && /đang dùng HỌC MÀ VUI ở dạng ứng dụng/.test(run.card) && !/Thêm vào MH chính/.test(run.card) && run.cls && !run.top, run);
    await ctx2.close(); }
  // F. Hướng dẫn theo thiết bị
  ({ ctx, page } = await open({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvInstallCard'); const ios = await page.evaluate(() => document.getElementById('hmvInstallCard').innerText); const iosW = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.screenshot({ path: path.join(__dirname, 'cai-app-iphone.png') });
  ok('12 iPhone/iPad: hướng dẫn Safari → nút Chia sẻ → "Thêm vào MH chính"; thẻ vừa màn hình điện thoại (không tràn ngang)', /Safari/.test(ios) && /Thêm vào MH chính/.test(ios) && iosW <= 0, [ios.slice(0, 300), iosW]); await ctx.close();
  ({ ctx, page } = await open({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }));
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvInstallCard'); const and = await page.evaluate(() => document.getElementById('hmvInstallCard').innerText);
  ok('13 Điện thoại Android: hướng dẫn Chrome → ⋮ → "Cài đặt ứng dụng / Thêm vào màn hình chính"', /⋮/.test(and) && /Thêm vào màn hình chính/.test(and), and.slice(0, 300)); await ctx.close();
  ({ ctx, page } = await open({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0' }));
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvInstallCard'); const ff = await page.evaluate(() => document.getElementById('hmvInstallCard').innerText);
  ok('14 Firefox (không hỗ trợ cài): báo rõ và gợi ý mở bằng Chrome hoặc Edge', /chưa hỗ trợ/.test(ff) && /Chrome/.test(ff) && /Edge/.test(ff), ff.slice(0, 300)); await ctx.close();
  // G. Ảnh màn hình & bố cục máy tính
  ({ ctx, page } = await open()); await page.evaluate(() => window.__fakePrompt('accepted')); await page.waitForTimeout(150); await page.screenshot({ path: path.join(__dirname, 'cai-app-thanh-tren.png') });
  await page.evaluate(() => openView('settings')); await page.waitForTimeout(200); await page.screenshot({ path: path.join(__dirname, 'cai-app-cai-dat.png') });
  const lay = await page.evaluate(() => { const b = document.getElementById('hmvInstallTop').getBoundingClientRect(), bar = document.querySelector('.topbar').getBoundingClientRect(); return { inBar: b.top >= bar.top - 1 && b.bottom <= bar.bottom + 1 && b.right <= innerWidth, over: document.documentElement.scrollWidth - innerWidth }; });
  ok('15 Nút trên thanh trên nằm gọn trong thanh, không làm trang tràn ngang (1366×768)', lay.inBar && lay.over <= 0, lay);
  // H. Không ảnh hưởng phần khác
  await page.evaluate(() => openView('games')); await page.waitForTimeout(300); const cards = await page.evaluate(() => document.querySelectorAll('#games .game-library-card').length);
  ok('16 Thư viện trò chơi vẫn đủ 10 thẻ; không có lỗi JavaScript', cards === 10 && logs.length === 0, [cards, logs]);
  await browser.close();
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'cai-app-results.json'), JSON.stringify({ version: '2.11', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
