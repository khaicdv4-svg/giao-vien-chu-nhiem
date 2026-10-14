// Kiểm thử bản 2.14: giao diện điện thoại (≤ 760 px). Điện thoại GIẢ LẬP (iPhone 390×844, Android 412×915); máy tính 1366×768 phải không đổi.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const IPHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', serviceWorkers: 'block' };
const logs = [];
const box = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vis: c.display !== 'none' && c.visibility !== 'hidden' && r.height > 0 }; }, sel);
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const open = async (opt) => { const ctx = await browser.newContext(opt); const page = await ctx.newPage(); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|vendor\/mediapipe/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 160)); }); page.on('dialog', d => d.dismiss().catch(() => {})); await page.goto(BASE); await page.waitForFunction(() => window.hmvMobile && typeof openView === 'function'); await page.waitForTimeout(900); return { ctx, page }; };
  const kho = async (page, set, g) => { await page.evaluate(() => openView('questions')); await page.waitForTimeout(250); await page.click('#questions [data-kho-play="' + set + '"]'); await page.waitForSelector('#khoModal'); await page.click('#khoModal [data-kho-start="' + g + '"]'); await page.waitForTimeout(1300); };
  let { ctx, page } = await open(IPHONE);
  // A. Trang chủ
  const bar = await box(page, '#hmvMBar'), side = await box(page, '.sidebar'), cover = await box(page, 'section.school-cover-title'), tabs = await box(page, '#hmvMTabs'), top = await box(page, '.main > .topbar');
  const cls = await page.textContent('#hmvMClass');
  ok('1 iPhone – Trang chủ: khối menu 9 nút to ở đầu trang đã ẩn; thanh trên mảnh (logo, "Học mà vui", lớp đang chọn); ẢNH BÌA nằm ngay dưới, trên cùng nội dung', side && !side.vis && bar.vis && bar.h <= 64 && cover.vis && cover.top >= bar.bottom - 2 && cover.top <= bar.bottom + 16 && /Lớp/.test(cls) && !top.vis, { bar, side, cover, cls, top });
  ok('2 Menu ở đáy màn hình: Trang chủ · Trò chơi · Học liệu · Trợ lý AI · Thêm; luôn nằm ở đáy (cố định)', tabs.vis && tabs.bottom === 844 && (await page.evaluate(() => [...document.querySelectorAll('#hmvMTabs button')].map(b => b.textContent.trim()).join('|'))) === '🏠Trang chủ|🎮Trò chơi|📚Học liệu|✨Trợ lý AI|☰Thêm', tabs);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('3 Không tràn ngang; ba ô lớn "Bắt đầu tiết học" xếp gọn thành 1 hàng 3 ô', over <= 0 && (await page.evaluate(() => { const t = [...document.querySelectorAll('#thHome .th-tile.big')].map(e => Math.round(e.getBoundingClientRect().top)); return t.length === 3 && t[0] === t[1] && t[1] === t[2]; })), over);
  // B. Chuyển chức năng
  await page.evaluate(() => scrollTo(0, 900)); await page.click('#hmvMTabs [data-hmv-m="games"]'); await page.waitForTimeout(500);
  const g = await page.evaluate(() => ({ active: [...document.querySelectorAll('.main > .view.active')].map(v => v.id), cover: getComputedStyle(document.querySelector('section.school-cover-title')).display, y: scrollY, tab: document.querySelector('#hmvMTabs .active').textContent.trim() }));
  ok('4 Bấm "Trò chơi": chỉ hiện Thư viện trò chơi (không còn ảnh bìa và nội dung Trang chủ), tự cuộn lên đầu, nút Trò chơi sáng', g.active.join() === 'games' && g.cover === 'none' && g.y === 0 && g.tab === '🎮Trò chơi', g);
  await page.click('#hmvMTabs [data-hmv-more]'); await page.waitForTimeout(200);
  const sheet = await page.evaluate(() => [...document.querySelectorAll('#hmvMSheet [data-hmv-m]')].map(b => b.dataset.hmvM));
  await page.click('#hmvMSheet [data-hmv-m="scores"]'); await page.waitForTimeout(400);
  const sc = await page.evaluate(() => ({ active: document.querySelector('.main > .view.active').id, sheet: document.getElementById('hmvMSheet').hidden, more: document.querySelector('#hmvMTabs [data-hmv-more]').classList.contains('active') }));
  ok('5 Nút "Thêm": mở bảng các chức năng còn lại (Lớp học, Vòng quay, Nốt nhạc vui, Thi đua, Cài đặt); chọn Thi đua → mở Thi đua, bảng tự đóng, nút Thêm sáng', ['students', 'picker', 'note-music', 'scores', 'settings'].every(v => sheet.includes(v)) && sc.active === 'scores' && sc.sheet && sc.more, [sheet, sc]);
  await page.click('#hmvMClassBtn'); await page.waitForTimeout(200); const tb = await box(page, '.main > .topbar'); const sel = await page.evaluate(() => [...document.querySelectorAll('.main > .topbar select')].filter(s => s.offsetParent).length);
  await page.click('#hmvMClassBtn'); await page.waitForTimeout(150); const tb2 = await box(page, '.main > .topbar');
  ok('6 Nút "Lớp ▾" mở ô chọn Năm học / Khối / Lớp ngay dưới thanh trên; bấm "Đóng" thì gọn lại', tb.vis && sel >= 3 && tb.top < 120 && !tb2.vis, [tb, sel, tb2]);
  // C. Chơi toàn màn hình
  await kho(page, 'mau-1-abcd', 'tug');
  const pl = await page.evaluate(() => ({ st: hmvMobile.state(), bar: getComputedStyle(document.getElementById('hmvMBar')).display, tabs: getComputedStyle(document.getElementById('hmvMTabs')).display, exit: getComputedStyle(document.getElementById('hmvMExit')).display, wind: (document.querySelector('#games .wind-module-card') || { offsetParent: null }).offsetParent === null, gameTop: Math.round(document.querySelector('#games').getBoundingClientRect().top) }));
  await page.screenshot({ path: path.join(__dirname, 'dt-keo-co.png') });
  ok('7 Vào một trò (Kéo co): thanh trên và menu đáy ẩn → trò chơi chiếm toàn màn hình (bắt đầu sát mép trên); có nút ✕ nhỏ để thoát', pl.st.play && pl.bar === 'none' && pl.tabs === 'none' && pl.exit !== 'none' && pl.wind && pl.gameTop <= 10, pl);
  await page.click('#hmvMExit'); await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ st: hmvMobile.state(), lib: !!document.querySelector('#games .game-library'), tabs: getComputedStyle(document.getElementById('hmvMTabs')).display }));
  ok('8 Bấm ✕ → về Thư viện trò chơi, thanh trên và menu đáy hiện lại', !back.st.play && back.lib && back.tabs !== 'none', back);
  for (const gm of ['buzzer', 'millionaire', 'gift', 'race']) { await kho(page, 'mau-1-abcd', gm); const s = await page.evaluate(() => hmvMobile.state().play); await page.click('#hmvMExit'); await page.waitForTimeout(400); const b2 = await page.evaluate(() => !hmvMobile.state().play && !!document.querySelector('#games .game-library')); res.push({ name: 'play-' + gm, pass: s && b2, detail: '' }); }
  ok('9 Ai nhanh hơn, Chinh phục tri thức, Hộp quà, Đường đua: đều vào toàn màn hình và thoát được bằng ✕', res.slice(-4).every(r => r.pass), res.slice(-4)); res.splice(-5, 4);
  await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.waitForTimeout(500);
  const bb = await page.evaluate(() => hmvMobile.state().play); await page.click('#hmvMExit'); await page.waitForTimeout(400);
  ok('10 Màn hình cài đặt trò (Bóng bay) cũng toàn màn hình; ✕ đưa về Thư viện', bb && !(await page.evaluate(() => hmvMobile.state().play)), bb);
  await ctx.close();
  // D. Android
  ({ ctx, page } = await open({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', serviceWorkers: 'block' }));
  ok('11 Điện thoại Android 412 px: cùng giao diện điện thoại, không tràn ngang', (await page.evaluate(() => hmvMobile.state().on && document.documentElement.scrollWidth <= innerWidth)), null); await ctx.close();
  // E. Máy tính không đổi
  ({ ctx, page } = await open({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }));
  const d = await page.evaluate(() => ({ on: hmvMobile.state().on, cls: document.documentElement.classList.contains('hmv-m'), side: getComputedStyle(document.querySelector('.sidebar')).display, bar: getComputedStyle(document.getElementById('hmvMBar') || document.body).display, top: getComputedStyle(document.querySelector('.main > .topbar')).display }));
  ok('12 Máy tính 1366×768: giữ nguyên giao diện cũ (thanh bên trái, ô chọn lớp ở trên), không có thanh/menu điện thoại', !d.on && !d.cls && d.side !== 'none' && d.top !== 'none' && !(await page.$('#hmvMTabs')), d);
  await page.setViewportSize({ width: 600, height: 900 }); await page.waitForTimeout(300); const sw = await page.evaluate(() => hmvMobile.state().on);
  await page.setViewportSize({ width: 1366, height: 768 }); await page.waitForTimeout(300); const sw2 = await page.evaluate(() => hmvMobile.state().on && document.documentElement.classList.contains('hmv-m'));
  ok('13 Thu nhỏ cửa sổ dưới 760 px → chuyển sang giao diện điện thoại; mở rộng lại → về giao diện máy tính', sw && !sw2, [sw, sw2]);
  ok('14 Không có lỗi JavaScript', logs.length === 0, logs);
  await browser.close();
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'dien-thoai-results.json'), JSON.stringify({ version: '2.14', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
