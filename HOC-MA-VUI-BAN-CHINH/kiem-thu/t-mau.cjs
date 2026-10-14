// Kiểm thử bản 2.12: bộ chỉnh màu giao diện + đổi tên thẻ menu "Hoạt động" → "Trò chơi".
// Đo màu thật mà trình duyệt vẽ (getComputedStyle) trên các phần khung ứng dụng; ảnh chụp lưu trong thư mục này để xem bằng mắt.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined && !c ? ' :: ' + JSON.stringify(d).slice(0, 900) : '')); };
const logs = [];
const look = page => page.evaluate(() => { const g = (s, k) => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return k === 'bg' ? (c.backgroundImage !== 'none' ? c.backgroundImage : c.backgroundColor) : c[k]; };
  return { body: g('body', 'bg'), side: g('.sidebar', 'bg'), active: g('.nav button.active', 'bg'), nav: g('.nav button:not(.active)', 'bg'), navInk: g('.nav button:not(.active)', 'color'), hero: g('#dashboard .hero', 'bg'), meta: document.querySelector('meta[name="theme-color"]').content, attr: document.documentElement.getAttribute('data-hmv-theme') }; });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) logs.push('console.error ' + m.text().slice(0, 200)); });
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForFunction(() => window.hmvTheme && typeof openView === 'function'); await page.waitForTimeout(600);
  // A. Tên thẻ menu
  const nav = await page.evaluate(() => { const b = document.querySelector('.nav button[data-view="games"]'); return { text: b.textContent.trim(), aria: b.getAttribute('aria-label'), all: [...document.querySelectorAll('.nav button')].map(x => x.textContent.trim()) }; });
  await page.click('.nav button[data-view="games"]'); await page.waitForTimeout(300); const games = await page.evaluate(() => document.getElementById('games').classList.contains('active'));
  ok('1 Thẻ menu bên trái nay ghi "🎮 Trò chơi" (không còn "Hoạt động"); bấm vào vẫn mở Thư viện trò chơi', nav.text === '🎮Trò chơi' && nav.aria === 'Trò chơi' && !nav.all.some(t => /Hoạt động/.test(t)) && games, nav);
  // B. Mặc định không đổi gì
  await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(200); const def = await look(page);
  ok('2 Mặc định (Tím): giao diện gốc giữ nguyên, không chèn lớp màu nào', !def.attr && !(await page.$('#hmvThemeStyle')) && /93, 112, 223/.test(def.body) && def.meta === '#6c4cf1', def);
  await page.screenshot({ path: path.join(__dirname, 'mau-0-tim.png') });
  // C. Thẻ trong Cài đặt
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvThemeCard'); const card = await page.evaluate(() => ({ text: document.getElementById('hmvThemeCard').innerText, n: document.querySelectorAll('#hmvThemeCard [data-hmv-pick]').length, custom: !!document.getElementById('hmvThemeCustom'), on: document.querySelector('#hmvThemeCard .on').textContent }));
  ok('3 Cài đặt & dữ liệu có thẻ "🎨 Màu giao diện": 8 bảng màu có sẵn + ô "Màu riêng…" chọn màu bất kỳ; đang chọn Tím (mặc định)', /Màu giao diện/.test(card.text) && card.n === 8 && card.custom && /Tím \(mặc định\)/.test(card.on), card);
  await page.screenshot({ path: path.join(__dirname, 'mau-the-cai-dat.png') });
  // D. Chọn Xanh dương
  await page.click('#hmvThemeCard [data-hmv-pick="xanh-duong"]'); await page.waitForTimeout(200); await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(200);
  const blue = await look(page);
  const hue = s => { const m = String(s).match(/rgb\((\d+), (\d+), (\d+)\)/); if (!m) return -1; let [r, g, b] = m.slice(1).map(x => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round((h * 60 + 360) % 360); };
  const near = (h, t, tol) => Math.min(Math.abs(h - t), 360 - Math.abs(h - t)) <= (tol || 25);
  ok('4 Chọn "Xanh dương": nền, thanh bên, thẻ menu đang chọn, khung chào Trang chủ và màu thanh tiêu đề trình duyệt đều chuyển sang xanh dương', blue.attr === 'xanh-duong' && near(hue(blue.active), 221) && near(hue(blue.hero), 221, 40) && near(hue(blue.body), 221, 30) && near(hue(blue.side), 221, 30) && /hsl|rgb/.test(blue.meta), [blue, hue(blue.active), hue(blue.body)]);
  await page.screenshot({ path: path.join(__dirname, 'mau-1-xanh-duong.png') });
  // E. Giữ sau khi tải lại
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.hmvTheme); await page.waitForTimeout(400); const kept = await look(page);
  ok('5 Tải lại trang: vẫn giữ màu đã chọn (lưu trên máy này)', kept.attr === 'xanh-duong' && near(hue(kept.active), 221), kept.attr);
  // F. Màu riêng
  await page.evaluate(() => openView('settings')); await page.waitForSelector('#hmvThemeCustom');
  await page.evaluate(() => { const i = document.getElementById('hmvThemeCustom'); i.value = '#0f9d58'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(300);
  await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(200); const own = await look(page); const st = await page.evaluate(() => hmvTheme.current());
  ok('6 "Màu riêng…": chọn màu #0f9d58 → cả bộ màu chuyển theo màu đó (xanh lá)', st.id === 'rieng' && st.color === '#0f9d58' && near(hue(own.active), 151, 25), [st, hue(own.active)]);
  await page.screenshot({ path: path.join(__dirname, 'mau-2-rieng.png') });
  // G. Mọi bảng màu vẽ được, chữ menu đủ tương phản
  const lum = s => { const m = String(s).match(/rgba?\((\d+), (\d+), (\d+)/); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
  const rows = [];
  for (const id of ['xanh-ngoc', 'xanh-la', 'cam', 'hong', 'do', 'xam-xanh', 'xanh-duong']) {
    await page.evaluate(i => hmvTheme.set(i), id); await page.waitForTimeout(120);
    const r = await page.evaluate(() => { const a = document.querySelector('.nav button.active'), n = document.querySelector('.nav button:not(.active)'); const ca = getComputedStyle(a), cn = getComputedStyle(n); const firstStop = s => (s.match(/rgba?\([^)]*\)/g) || [])[0]; return { aBg: firstStop(ca.backgroundImage), aInk: ca.color, nBg: firstStop(cn.backgroundImage), nInk: cn.color }; });
    const cr = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    rows.push({ id, active: +cr(r.aBg, r.aInk).toFixed(2), menu: +cr(r.nBg, r.nInk).toFixed(2) });
  }
  ok('7 Tất cả bảng màu: chữ trên thẻ menu đủ tương phản để đọc (≥ 4,5 : 1 theo chuẩn WCAG AA)', rows.every(r => r.active >= 4.5 && r.menu >= 4.5), rows);
  // H. Về mặc định
  await page.evaluate(() => openView('settings')); await page.click('#hmvThemeCard [data-hmv-pick="tim"]'); await page.waitForTimeout(200); await page.evaluate(() => openView('dashboard')); await page.waitForTimeout(150); const back = await look(page);
  ok('8 Chọn lại "Tím (mặc định)": trả về đúng giao diện gốc (gỡ hẳn lớp màu)', !back.attr && !(await page.$('#hmvThemeStyle')) && back.body === def.body && back.active === def.active && back.meta === '#6c4cf1', back);
  // I. Trò chơi giữ màu riêng; điện thoại không tràn
  await page.evaluate(() => hmvTheme.set('cam')); await page.evaluate(() => openView('games')); await page.waitForTimeout(300); const cards = await page.evaluate(() => document.querySelectorAll('#games .game-library-card').length);
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => openView('settings')); await page.waitForTimeout(300); const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.evaluate(() => document.getElementById('hmvThemeCard').scrollIntoView()); await page.screenshot({ path: path.join(__dirname, 'mau-dien-thoai.png') });
  ok('9 Thư viện trò chơi vẫn đủ 10 thẻ; thẻ màu vừa màn hình điện thoại (không tràn ngang)', cards === 10 && over <= 0, [cards, over]);
  await page.evaluate(() => hmvTheme.set('tim'));
  ok('10 Không có lỗi JavaScript', logs.length === 0, logs);
  await browser.close();
  const pass = res.filter(r => r.pass).length; console.log('\n' + pass + '/' + res.length + ' PASS');
  fs.writeFileSync(path.join(__dirname, 'mau-results.json'), JSON.stringify({ version: '2.12', at: new Date().toISOString(), pass, total: res.length, results: res }, null, 2));
  process.exit(pass === res.length ? 0 : 1);
})();
