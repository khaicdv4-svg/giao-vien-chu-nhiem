// Kiểm thử bản 2.15: Kéo co – cảnh hai đội kéo co thay cho dây + lá cờ.
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const path = require('path');
const BASE = process.env.HMV_URL || 'http://127.0.0.1:8780/';
const res = []; const ok = (n, c, d) => { res.push({ pass: !!c }); console.log((c ? 'PASS ' : 'FAIL ') + n + (!c && d !== undefined ? ' :: ' + JSON.stringify(d).slice(0, 700) : '')); };
const logs = [];
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => logs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE); await p.waitForFunction(() => window.hmvTugScene && window.hmvTran && typeof openView === 'function'); await p.waitForTimeout(700);
  await p.evaluate(() => { localStorage.setItem('tk_tug_settings', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('tk_tug_settings') || '{}'), { names: ['Đội Mặt Trời', 'Đội Mặt Trăng', 'Tổ 3', 'Tổ 4'] }))); });
  await p.evaluate(() => { openView('games'); gameSetup('tug'); }); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('tugName0').value = 'Đội Mặt Trời'; document.getElementById('tugName1').value = 'Đội Mặt Trăng'; tugStart(); }); await p.waitForTimeout(900);
  const s0 = await p.evaluate(() => { const svg = document.querySelector('.tug-track-large svg.tk-scene'); if (!svg) return null; const r = svg.getBoundingClientRect(); return { kids: svg.querySelectorAll('.tk-kid').length, l: svg.querySelectorAll('.tk-team.l .tk-kid').length, tags: [...svg.querySelectorAll('.tk-tag text')].map(t => t.textContent), old: !!document.querySelector('.tug-center'), cls: svg.getAttribute('class'), h: Math.round(r.height), w: Math.round(r.width), shirt: svg.querySelector('.tk-team.l .tk-shirt').getAttribute('stroke'), color0: hmvTugState().settings.colors[0], move: svg.querySelector('.tk-move').style.transform, anim: getComputedStyle(svg.querySelector('.tk-team.l .tk-body')).animationName, label: svg.getAttribute('aria-label') }; });
  await p.screenshot({ path: path.join(__dirname, 'keo-co-0.png') });
  ok('1 Lá cờ ⚑ được thay bằng cảnh 6 bạn nhỏ (3 mỗi đội) đang kéo một sợi dây; áo theo màu đội, bảng tên đội dưới chân', s0 && s0.kids === 6 && s0.l === 3 && !s0.old && s0.tags.join('|') === 'Đội Mặt Trời|Đội Mặt Trăng' && s0.shirt === s0.color0, s0);
  ok('2 Đang thi đấu: các bạn gồng người kéo (chuyển động liên tục); dây ở giữa; cảnh cao vừa phải (≤ 1/5 chiều cao màn hình 1366×768)', /live/.test(s0.cls) && s0.anim === 'tkStrain' && /translateX\(0px\)/.test(s0.move) && s0.h <= 220 && s0.h >= 120 && /dây đang ở giữa/.test(s0.label), s0);
  await p.evaluate(() => tugJudge(true)); await p.waitForTimeout(120);
  const s1 = await p.evaluate(() => { const svg = document.querySelector('svg.tk-scene'), mv = svg.querySelector('.tk-move'); return { cls: svg.getAttribute('class'), from: mv.style.getPropertyValue('--tk-from'), to: mv.style.getPropertyValue('--tk-to'), anim: getComputedStyle(svg.querySelector('.tk-team.l .tk-body')).animationName, pos: hmvTugState().match.pos }; });
  await p.waitForTimeout(250); await p.screenshot({ path: path.join(__dirname, 'keo-co-1.png') });
  await p.waitForTimeout(900);
  const rx = () => { const c = document.querySelector('.tk-ribbon circle'), sv = document.querySelector('svg.tk-scene'), pt = sv.createSVGPoint(); pt.x = 500; pt.y = 119; return Math.round(pt.matrixTransform(c.getScreenCTM()).matrixTransform(sv.getScreenCTM().inverse()).x); };
  const x1 = await p.evaluate('(' + rx.toString() + ')()');
  ok('3 Đội trái trả lời đúng → cả dây + hai đội trượt sang trái 1 bước (trượt mượt từ vị trí cũ), đội trái giật mạnh một nhịp', s1.pos === -1 && s1.from === '0px' && s1.to === '-42px' && /pull-l/.test(s1.cls) && /tkHeave/.test(s1.anim) && x1 > 450 && x1 < 465, { s1, x1 });
  for (let i = 0; i < 8; i++) { await p.evaluate(() => { const m = hmvTugState().match; if (m.phase !== 'playing') return; if (!m.answered) tugJudge(m.current === 0); }); await p.waitForTimeout(40); await p.evaluate(() => { const m = hmvTugState().match; if (m.phase === 'playing') tugNext(); }); await p.waitForTimeout(40); }
  await p.waitForTimeout(1200);
  const s2 = await p.evaluate(() => { const svg = document.querySelector('svg.tk-scene'), vis = e => e && getComputedStyle(e).display !== 'none'; return { phase: hmvTugState().match.phase, cls: svg.getAttribute('class'), cupL: vis(svg.querySelector('.tk-team.l .tk-cup')), cupR: vis(svg.querySelector('.tk-team.r .tk-cup')), upL: vis(svg.querySelector('.tk-team.l .tk-up')), upR: vis(svg.querySelector('.tk-team.r .tk-up')), animL: getComputedStyle(svg.querySelector('.tk-team.l .tk-body')).animationName, animR: getComputedStyle(svg.querySelector('.tk-team.r .tk-body')).animationName, x: (function () { const c = svg.querySelector('.tk-ribbon circle'), pt = svg.createSVGPoint(); pt.x = 500; pt.y = 119; return Math.round(pt.matrixTransform(c.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse()).x); })() }; });
  await p.screenshot({ path: path.join(__dirname, 'keo-co-thang.png') });
  ok('4 Đội trái thắng: dải đỏ chạm vạch đội trái; đội thắng nhảy lên, giơ tay, có cúp 🏆; đội thua chúi về phía trước', s2.phase === 'won' && /won-l/.test(s2.cls) && s2.cupL && !s2.cupR && s2.upL && !s2.upR && s2.animL === 'tkJump' && s2.animR === 'tkStumble' && s2.x > 360 && s2.x < 390, s2);
  await p.evaluate(() => tugBack());
  const svgFile = await p.evaluate(() => hmvTugScene({ key: 'x', pos: 0, winMoves: 3, colors: ['#123456', 'bad'], names: ['<b>A</b>', 'B'], phase: 'playing' }));
  ok('5 Tên đội được thoát ký tự HTML; màu không hợp lệ dùng màu mặc định', !/<b>A<\/b>/.test(svgFile) && /&lt;b&gt;A/.test(svgFile) && /#f97316/.test(svgFile));
  const rm = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block', reducedMotion: 'reduce' }); const p2 = await rm.newPage(); await p2.goto(BASE); await p2.waitForFunction(() => window.hmvTugScene && typeof openView === 'function'); await p2.waitForTimeout(600);
  await p2.evaluate(() => { openView('games'); gameSetup('tug'); }); await p2.waitForTimeout(300); await p2.evaluate(() => tugStart()); await p2.waitForTimeout(400);
  ok('6 Máy bật "giảm chuyển động" → cảnh đứng yên (không rung, không nhảy)', await p2.evaluate(() => getComputedStyle(document.querySelector('.tk-team.l .tk-body')).animationName === 'none'));
  await rm.close(); await ctx.close();
  ok('7 Không có lỗi JavaScript', logs.length === 0, logs);
  await browser.close(); const n = res.filter(r => r.pass).length; console.log('\nKẾT QUẢ: ' + n + '/' + res.length); process.exit(n === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
