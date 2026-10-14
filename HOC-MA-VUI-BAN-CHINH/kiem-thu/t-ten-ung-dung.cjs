// Kiểm thử tên ứng dụng (bản 1.6 + 1.7): ảnh bìa bỏ dòng "Tổ chuyên môn Khối 4" và hậu tố "– ThayKhaiEdu";
// bản 1.8 thêm nhãn "Ngày hội Chuyển đổi số 2026" ở góc phải ảnh bìa;
// bản 1.7 thêm dòng phụ chữ viết tay dưới tên chính và khôi phục khối logo cột trái (HỌC MÀ VUI / ThayKhaiEdu).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const OUT = process.env.HMV_OUT || __dirname;
const TAG = process.env.HMV_TAG || 'sau';
const EXPECT = process.env.HMV_EXPECT !== '0';
const res = []; const ok = (n, c, d) => { res.push({ name: n, pass: !!c, detail: d === undefined ? '' : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
(async () => {
  const browser = await chromium.launch();
  const logs = [];
  for (const vp of [{ width: 1366, height: 768 }, { width: 1774, height: 934 }, { width: 420, height: 800 }]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') logs.push('console.error ' + m.text().slice(0, 200)); });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.audioDB && document.querySelector('.school-cover-title'), null, { timeout: 10000 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
    const w = vp.width;
    const info = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const cover = document.querySelector('.school-cover-title');
      const h1 = cover.querySelector('.main-title'), sn = cover.querySelector('.school-name');
      const r1 = h1.getBoundingClientRect(), rs = sn.getBoundingClientRect(), rc = cover.getBoundingClientRect();
      // mọi nút văn bản đang hiển thị trên toàn trang
      const hits = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = tw.nextNode())) { const t = n.nodeValue; if (/ThayKhaiEdu|tổ chuyên môn/i.test(t) && n.parentElement && !/SCRIPT|STYLE/.test(n.parentElement.tagName) && !n.parentElement.closest('.brand')) hits.push({ text: t.trim().slice(0, 80), visible: vis(n.parentElement), where: (n.parentElement.closest('section,aside,[id]') || {}).id || n.parentElement.className }); }
      const st = cover.querySelector('.school-sub-text'); let sub = null;
      if (st) { const r = st.getBoundingClientRect(), cc = cover.querySelector('.cover-copy').getBoundingClientRect(), cs = getComputedStyle(st); const cv = document.createElement('canvas').getContext('2d'); cv.font = '40px "HMV Viet Tay"'; const w1 = cv.measureText(st.textContent).width; cv.font = '40px monospace'; const w2 = cv.measureText(st.textContent).width; cv.font = '40px sans-serif'; const w3 = cv.measureText(st.textContent).width;
        sub = { text: st.textContent, font: cs.fontFamily, size: cs.fontSize, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), copyLeft: Math.round(cc.left), copyRight: Math.round(cc.right), coverBottom: Math.round(rc.bottom), lines: Math.round(r.height / (parseFloat(cs.lineHeight) || r.height)), faceLoaded: [...document.fonts].some(f => /HMV Viet Tay/.test(f.family) && f.status === 'loaded'), widthDiffers: Math.abs(w1 - w2) > 2 && Math.abs(w1 - w3) > 2, widths: [Math.round(w1), Math.round(w2), Math.round(w3)] }; }
      const tr = el => { const rg = document.createRange(); rg.selectNodeContents(el); const b = rg.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const bx = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      const evEl = cover.querySelector('.cover-event'); let ev = null;
      if (evEl) { const e = bx(evEl); ev = { text: evEl.innerText.replace(/\s+/g, ' ').trim(), label: evEl.getAttribute('aria-label'), box: e.map(Math.round), visible: vis(evEl), inside: e[0] >= rc.left && e[2] <= rc.right && e[1] >= rc.top && e[3] <= rc.bottom, overTitle: hit(e, tr(h1)), overName: hit(e, tr(sn)), overSub: st ? hit(e, bx(st)) : false, overLogo: hit(e, bx(cover.querySelector('#coverSchoolLogo'))) || hit(e, bx(cover.querySelector('#coverTeamLogo'))), clickThrough: getComputedStyle(evEl).pointerEvents === 'none' }; }
      return { ev, sub, logo: !!document.querySelector('.brand .logo img') && document.querySelector('.brand .logo img').naturalWidth > 0, title: document.title, coverText: cover.innerText.replace(/\s+/g, ' ').trim(), hasLine: !!cover.querySelector('.school-line'), h1: h1.textContent, h1Rect: [Math.round(r1.top), Math.round(r1.bottom), Math.round(r1.width)], snBottom: Math.round(rs.bottom), gap: Math.round(r1.top - rs.bottom), coverH: Math.round(rc.height), h1Overflow: h1.scrollWidth > h1.clientWidth + 1, brand: document.querySelector('.brand strong').innerText.replace(/\s+/g, ' ').trim(), brandSmall: document.querySelector('.brand small').innerText.replace(/\s+/g, ' ').trim(), hits, version: (document.body.innerText.match(/HMV-BAN-CHINH-[\d.]+-\d+/) || [''])[0], docW: document.documentElement.scrollWidth, winW: innerWidth };
    });
    console.log(w, JSON.stringify(info));
    if (EXPECT) {
      ok(w + ': ảnh bìa không còn dòng "Tổ chuyên môn"', !info.hasLine && !/CHUYÊN MÔN/i.test(info.coverText), info.coverText);
      ok(w + ': tên trên ảnh bìa là "HỌC MÀ VUI"', info.h1 === 'HỌC MÀ VUI', info.h1);
      ok(w + ': dưới tên chính có dòng "Nền tảng lớp học số thông minh Tiểu học"', info.sub && info.sub.text === 'Nền tảng lớp học số thông minh Tiểu học' && info.sub.top >= info.h1Rect[1] - 2, info.sub);
      ok(w + ': dòng phụ dùng phông viết tay đã tải xong (không rơi về phông thường)', info.sub && /HMV Viet Tay/.test(info.sub.font) && info.sub.faceLoaded && info.sub.widthDiffers, info.sub);
      ok(w + ': dòng phụ nằm trên một dòng, không tràn khỏi khối chữ ảnh bìa', info.sub && info.sub.lines === 1 && info.sub.left >= info.sub.copyLeft - 1 && info.sub.right <= info.sub.copyRight + 1, info.sub);
      ok(w + ': ảnh bìa có nhãn "Ngày hội Chuyển đổi số 2026"', info.ev && info.ev.visible && /NGÀY HỘI/i.test(info.ev.text) && /CHUYỂN ĐỔI SỐ/i.test(info.ev.text) && /2026/.test(info.ev.text) && info.ev.label === 'Ngày hội Chuyển đổi số 2026', info.ev);
      ok(w + ': nhãn nằm trọn trong ảnh bìa, không che tên trường, tên chính, dòng phụ và hai ô logo', info.ev && info.ev.inside && !info.ev.overTitle && !info.ev.overName && !info.ev.overSub && !info.ev.overLogo && info.ev.clickThrough, info.ev);
      ok(w + ': dòng phụ nằm trọn trong ảnh bìa', info.sub && info.sub.bottom <= info.sub.coverBottom, [info.sub && info.sub.bottom, info.sub && info.sub.coverBottom]);
      ok(w + ': vẫn còn tên trường trên ảnh bìa', /TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN/.test(info.coverText));
      ok(w + ': phông viết tay được máy chủ trả về', await page.evaluate(() => fetch('./assets/fonts/Pacifico-Vietnamese.woff2', { cache: 'no-store' }).then(r => r.ok && r.arrayBuffer()).then(b => b && b.byteLength === 33068)));
      ok(w + ': tiêu đề thẻ trình duyệt không còn ThayKhaiEdu', !/ThayKhaiEdu/.test(info.title) && /^HỌC MÀ VUI \| HMV-BAN-CHINH-2\.12-20261014$/.test(info.title), info.title);
      ok(w + ': cột trái khôi phục "HỌC MÀ VUI / ThayKhaiEdu" và logo', info.brand === 'HỌC MÀ VUI ThayKhaiEdu' && info.logo, [info.brand, info.logo]);
      ok(w + ': ngoài khối logo cột trái, không còn chữ ThayKhaiEdu / chuyên môn đang hiển thị ở trang chủ', info.hits.filter(h => h.visible).length === 0, info.hits.filter(h => h.visible));
      ok(w + ': tên trường và tên ứng dụng không chồng nhau', info.gap >= 0 && info.gap <= 40, info.gap);
      ok(w + ': tên không tràn, trang không cuộn ngang', !info.h1Overflow && info.docW <= info.winW + 1, [info.docW, info.winW]);
    }
    await page.screenshot({ path: path.join(OUT, 'bia-' + TAG + '-' + w + '.png'), clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 420) } });
    if (w === 1366 && EXPECT) {
      // Cài đặt: hai thẻ "Nhận diện"
      await page.evaluate(() => openView('settings')); await page.waitForTimeout(700);
      const st = await page.evaluate(() => { const v = document.querySelector('#settings'); const t = v ? v.innerText : ''; return { has: /ThayKhaiEdu/.test(t), team: /Tổ chuyên môn Khối 4 ·/.test(t), nd: (t.match(/Nhận diện[^\n]*\n+[^\n]*\n*[^\n]*/g) || []).map(x => x.replace(/\n+/g, ' / ')), title: document.title }; });
      ok('Cài đặt: không còn "ThayKhaiEdu" và dòng "Tổ chuyên môn Khối 4 · …"', !st.has && !st.team, st.nd);
      ok('Cài đặt: tiêu đề thẻ vẫn đúng sau khi mở Cài đặt', /^HỌC MÀ VUI \| HMV-BAN-CHINH-2\.12/.test(st.title), st.title);
      await page.screenshot({ path: path.join(OUT, 'cai-dat-' + TAG + '.png') });
      // đi qua các màn hình khác: ảnh bìa vẫn đúng, không chữ cũ hiển thị
      for (const v of ['picker', 'games', 'questions', 'scores', 'students', 'dashboard']) {
        await page.evaluate(x => openView(x), v); await page.waitForTimeout(450);
        const r = await page.evaluate(() => { const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }; const hits = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (/ThayKhaiEdu|TỔ CHUYÊN MÔN KHỐI 4/.test(n.nodeValue) && n.parentElement && !/SCRIPT|STYLE/.test(n.parentElement.tagName) && !n.parentElement.closest('.brand') && vis(n.parentElement)) hits.push(n.nodeValue.trim().slice(0, 60)); } return { hits, title: document.title, brand: document.querySelector('.brand strong').innerText.replace(/\s+/g, ' ').trim() }; });
        ok('Màn hình ' + v + ': ảnh bìa và nội dung không còn chữ cũ, khối logo cột trái đúng', r.hits.length === 0 && r.brand === 'HỌC MÀ VUI ThayKhaiEdu' && !/ThayKhaiEdu/.test(r.title), r);
      }
      // dữ liệu hồ sơ giáo viên không bị đổi
      const prof = await page.evaluate(() => ({ team: (window.teacherProfile || {}).subjectTeam, school: (window.teacherProfile || {}).school }));
      ok('Hồ sơ giáo viên giữ nguyên trường "Tổ chuyên môn" (dữ liệu, không phải tên sản phẩm)', prof.team === 'Tổ chuyên môn Khối 4' || prof.team === undefined, prof);
    }
    await ctx.close();
  }
  if (EXPECT) ok('Không có lỗi JavaScript khi chạy', logs.length === 0, logs.slice(0, 5));
  await browser.close();
  if (EXPECT) { fs.writeFileSync(path.join(OUT, 'ten-ung-dung-results.json'), JSON.stringify({ build: 'HMV-BAN-CHINH-2.12-20261014', total: res.length, passed: res.filter(r => r.pass).length, results: res }, null, 2)); console.log('TOTAL ' + res.filter(r => r.pass).length + '/' + res.length); process.exit(res.every(r => r.pass) ? 0 : 1); }
})().catch(e => { console.error(e); process.exit(2); });
