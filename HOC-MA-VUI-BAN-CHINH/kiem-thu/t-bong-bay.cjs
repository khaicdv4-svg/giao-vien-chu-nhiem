const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 210) : '')); };
const st = p => p.evaluate(() => window.hmvBalloon.state());
const mu = p => p.evaluate(() => window.hmvMusic.state());
const setS = (p, patch) => p.evaluate(patch => { const c = JSON.parse(localStorage.getItem('hmv_balloon_settings_v1') || '{}'); localStorage.setItem('hmv_balloon_settings_v1', JSON.stringify(Object.assign({}, c, patch))); }, patch);
const ready = p => p.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho && window.hmvBalloon);
const fresh = async (p, patch) => { await p.evaluate(() => { try { if (classroomGame.type === 'balloon') balloonBack(); } catch (e) {} }); await setS(p, patch); await p.reload(); await ready(p); };
const CAM = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=document-user-activation-required'];
const fake = fs.readFileSync(__dirname + '/fake-hand.mjs', 'utf8');
const withModel = async (page, ctx) => { await ctx.route('**/vendor/mediapipe/**', route => { const u = route.request().url(); if (route.request().method() === 'HEAD') return route.fulfill({ status: 200, body: '' }); if (u.endsWith('vision_bundle.mjs')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fake }); return route.fulfill({ status: 200, body: 'x' }); }); };
const noModel = async (page, ctx) => { await ctx.route('**/vendor/mediapipe/**', route => route.fulfill({ status: 404, body: '' })); await ctx.route('https://cdn.jsdelivr.net/**', route => route.abort()); await ctx.route('https://storage.googleapis.com/**', route => route.abort()); };
/* đặt "bàn tay" vào tâm quả bóng i (hoặc vị trí tự do trên sân khấu, theo tỉ lệ 0..1) */
const handAt = (p, target) => p.evaluate(target => { const stage = document.getElementById('bbStage'), v = document.getElementById('bbVideo'); const W = stage.clientWidth, H = stage.clientHeight, vw = v.videoWidth || 4, vh = v.videoHeight || 3, sc = Math.max(W / vw, H / vh), dw = vw * sc, dh = vh * sc, ox = (W - dw) / 2, oy = (H - dh) / 2; if (target === null) { window.__hand = []; return null; } let px, py; if (typeof target === 'number') { const b = stage.querySelectorAll('.bb-balloon')[target].getBoundingClientRect(), s = stage.getBoundingClientRect(); px = b.left - s.left + b.width / 2; py = b.top - s.top + b.height * .45; } else { px = target.x * W; py = target.y * H; } window.__hand = [{ x: 1 - (px - ox) / dw, y: (py - oy) / dh }]; return { px: Math.round(px), py: Math.round(py) }; }, target);
(async () => {
  const vp = { width: 1366, height: 768 };
  // ===== A. thư viện, thiết lập, chơi bằng chuột/phím =====
  { const { browser, page, logs } = await lib.open({ viewport: vp, args: ['--autoplay-policy=document-user-activation-required'] });
    await ready(page);
    await page.click('button:has-text("Hoạt động")'); await page.waitForTimeout(600);
    const libr = await page.evaluate(() => ({ titles: Array.from(document.querySelectorAll('#games .game-library-card h3')).map(h => h.textContent.trim()), lab: !!document.querySelector('#games .phase1-experiments'), tags: Array.from(document.querySelectorAll('#games .bb-card .game-tags span')).map(s => s.textContent), badge: (document.querySelector('#games .bb-card .bb-new') || {}).textContent }));
    ok('Thư viện: có "Bóng bay tri thức" (gắn nhãn Mới), KHÔNG còn "Lật mảnh ghép" và khu "Thử nghiệm"', libr.titles.includes('Bóng bay tri thức') && !libr.titles.includes('Lật mảnh ghép') && !libr.lab && libr.badge === 'Mới', libr);
    await page.screenshot({ path: __dirname + '/bb-0-library.png', fullPage: true });
    await page.evaluate(() => openView('questions')); await page.waitForTimeout(200); await page.click('#questions [data-kho-play="mau-1-abcd"]'); await page.waitForSelector('#khoModal');
    const kho = await page.evaluate(() => Array.from(document.querySelectorAll('#khoModal [data-kho-start]')).map(b => b.innerText.replace(/\n+/g, ' ').trim()));
    ok('Kho → Chơi ngay: danh sách trò có "Bóng bay tri thức", không còn "Lật mảnh ghép"', kho.some(t => /Bóng bay tri thức/.test(t)) && !kho.some(t => /Lật mảnh ghép/.test(t)), kho);
    await page.evaluate(() => document.getElementById('khoModal').remove());
    await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.waitForSelector('#bbSetup');
    await page.screenshot({ path: __dirname + '/bb-1-setup.png' });
    const src = await page.innerText('.bb-source');
    ok('Màn thiết lập: tự chọn sẵn một bộ câu hỏi dùng được, có nút Bắt đầu', /Bộ câu hỏi: .+ câu dùng được/.test(src) && await page.isEnabled('.bb-start'), src.replace(/\s+/g, ' '));
    ok('Tên đội chỉ hiện khi chọn "Hai đội luân phiên"', !(await page.isVisible('#bbName0')) && (await page.selectOption('#bbMode', 'teams'), await page.isVisible('#bbName0')) && (await page.selectOption('#bbMode', 'solo'), !(await page.isVisible('#bbName0'))));
    await page.selectOption('#bbControl', 'touch'); await page.selectOption('#bbCount', '5'); await page.selectOption('#bbTime', '20');
    await page.click('.bb-start'); await page.waitForSelector('#bbStage .bb-balloon'); await page.waitForTimeout(400);
    let s = await st(page);
    ok('Bắt đầu: hiện câu hỏi và mỗi đáp án là một quả bóng', s.match.phase === 'ask' && s.match.total === 5 && (await page.$$('#bbStage .bb-balloon')).length === s.match.question.answers.length && (await page.innerText('#bbQuestion')).trim() === s.match.question.text.trim(), { q: s.match.question.text, n: s.match.question.answers.length });
    const fit = await page.evaluate(() => { const r = document.getElementById('bbStage').getBoundingClientRect(); const bs = Array.from(document.querySelectorAll('.bb-balloon')).map(b => b.getBoundingClientRect()); const q = document.getElementById('bbQuestion').getBoundingClientRect(); return { stageBottom: Math.round(r.bottom), vh: innerHeight, inside: bs.every(b => b.left >= r.left - 2 && b.right <= r.right + 2 && b.bottom <= r.bottom + 2), overlapQ: bs.some(b => b.top < q.bottom - 6), overlapEach: bs.some((a, i) => bs.some((b, j) => j > i && a.right > b.left + 4 && a.left < b.right - 4)) }; });
    ok('1366×768: sân khấu nằm trọn màn hình; bóng không đè lên câu hỏi, không đè nhau', fit.stageBottom <= fit.vh && fit.inside && !fit.overlapQ && !fit.overlapEach, fit);
    ok('Không dùng camera: hướng dẫn "bấm chuột hoặc chạm"; camera không bật', /Bấm chuột hoặc chạm/.test(await page.innerText('#bbStatus')) && s.camera === 'off' && !s.streaming, await page.innerText('#bbStatus'));
    let m = await mu(page);
    ok('Nhạc nền phát khi đang chơi (bản "Giai điệu trống vui nhộn")', m.playing && m.track === 'vui-nhon' && m.loop && m.loop[0] === 1 && m.loop[1] === 13, m);
    ok('Có nút Nhạc nền, Toàn màn hình, Câu hỏi trên màn chơi', await page.isVisible('#games .hmv-music-btn') && await page.isVisible('#games .hmv-full-btn') && await page.isVisible('#games .c6-question-gear'));
    await page.screenshot({ path: __dirname + '/bb-2-play.png' });
    // đúng
    await page.click(`#bbStage .bb-balloon >> nth=${s.match.question.correct}`, { force: true }); await page.waitForTimeout(250); let s2 = await st(page);
    ok('Chạm/bấm quả bóng ĐÚNG → tự chấm, +10 điểm, bóng đúng nổi bật, báo "Chính xác"', s2.match.phase === 'done' && s2.match.score[0] === 10 && s2.match.outcome.ok && /Chính xác/.test(await page.innerText('.bb-banner')) && await page.evaluate(i => document.querySelectorAll('.bb-balloon')[i].classList.contains('right'), s.match.question.correct), (await page.innerText('.bb-banner')).replace(/\n+/g, ' | '));
    await page.screenshot({ path: __dirname + '/bb-3-right.png' });
    await page.waitForFunction(() => window.hmvBalloon.state().match.q === 1, null, { timeout: 5000 }); s = await st(page);
    ok('Tự chuyển sang câu 2 sau ~2,4 giây', s.match.phase === 'ask' && s.match.q === 1 && s.match.picked === null);
    // sai
    const wrong = (s.match.question.correct + 1) % s.match.question.answers.length;
    await page.click(`#bbStage .bb-balloon >> nth=${wrong}`, { force: true }); await page.waitForTimeout(250); s2 = await st(page);
    ok('Chạm quả bóng SAI → không cộng điểm, bóng sai xám đi, bóng đúng sáng lên, báo đáp án đúng', s2.match.score[0] === 10 && !s2.match.outcome.ok && /Đáp án đúng/.test(await page.innerText('.bb-banner')) && await page.evaluate(([w, k]) => { const b = document.querySelectorAll('.bb-balloon'); return b[w].classList.contains('wrong') && b[k].classList.contains('right'); }, [wrong, s.match.question.correct]), (await page.innerText('.bb-banner')).replace(/\n+/g, ' | '));
    await page.screenshot({ path: __dirname + '/bb-4-wrong.png' });
    await page.click('.bb-banner [data-bb="next"]'); await page.waitForTimeout(200); s = await st(page);
    ok('"Chuyển ngay" sang câu tiếp mà không cần chờ', s.match.q === 2 && s.match.phase === 'ask');
    // phím
    await page.keyboard.press(String(s.match.question.correct + 1)); await page.waitForTimeout(200); s2 = await st(page);
    ok('Phím số 1–4 chọn bóng', s2.match.phase === 'done' && s2.match.outcome.ok && s2.match.score[0] === 20);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200); s = await st(page);
    ok('Phím Enter sang câu tiếp', s.match.q === 3 && s.match.phase === 'ask');
    await page.keyboard.press('abcd'[s.match.question.correct]); await page.waitForTimeout(200); s2 = await st(page); ok('Phím A–D chọn bóng', s2.match.outcome && s2.match.outcome.ok && s2.match.score[0] === 30);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    // tạm dừng
    await page.click('#bbPauseBtn'); await page.waitForTimeout(300); s = await st(page); const left = s.match.left; m = await mu(page); await page.waitForTimeout(900); s2 = await st(page);
    ok('Tạm dừng: đồng hồ đứng yên, nhạc ngưng, bóng không bấm được', s.match.paused && Math.abs(s2.match.left - left) < 0.01 && !m.playing && await page.isDisabled('#bbStage .bb-balloon >> nth=0') && await page.isVisible('.bb-pause-veil'), { left, after: s2.match.left, music: m.playing });
    await page.keyboard.press(' '); await page.waitForTimeout(500); s = await st(page); m = await mu(page);
    ok('Tiếp tục (Space): chạy lại, nhạc phát lại', !s.match.paused && s.match.left < left && m.playing);
    // câu cuối → kết quả
    await page.click(`#bbStage .bb-balloon >> nth=${s.match.question.correct}`, { force: true }); await page.waitForTimeout(200);
    ok('Câu cuối: đếm ngược ghi "Xem kết quả sau…"', /Xem kết quả sau/.test(await page.innerText('.bb-banner')), (await page.innerText('.bb-banner')).replace(/\n+/g, ' | '));
    await page.waitForSelector('.bb-end', { timeout: 6000 }); await page.waitForTimeout(200); /* nhạc nền tắt trong vòng 60 ms sau khi màn kết quả hiện; chờ một nhịp rồi mới đo để không đo quá sớm */ s = await st(page); m = await mu(page);
    const end = (await page.innerText('.bb-end')).replace(/\n+/g, ' | ');
    ok('Hết 5 câu → màn kết quả: Đúng 4/5, 40 điểm, 3 sao; nhạc tắt', s.match.phase === 'end' && /Đúng 4\/5/.test(end) && /40/.test(end) && await page.evaluate(() => document.querySelector('.bb-stars').childNodes[0].textContent === '★★★') && !m.playing, end);
    await page.screenshot({ path: __dirname + '/bb-5-end.png' });
    await page.click('.bb-end [data-bb="start"]'); await page.waitForSelector('#bbStage .bb-balloon'); s = await st(page);
    ok('Chơi lại: ván mới, điểm về 0', s.match.q === 0 && s.match.score[0] === 0 && s.match.phase === 'ask');
    // hết giờ
    await fresh(page, { time: 15, control: 'touch', count: '5' }); await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.waitForSelector('#bbSetup');
    await page.evaluate(() => { const t = document.getElementById('bbTime'); const o = document.createElement('option'); o.value = '2'; o.textContent = '2 giây (kiểm thử)'; t.appendChild(o); t.value = '2'; });
    await page.click('.bb-start'); await page.waitForSelector('#bbStage .bb-balloon');
    await page.waitForFunction(() => window.hmvBalloon.state().match.phase === 'done', null, { timeout: 5000 }); s = await st(page);
    ok('Hết giờ → tự tính sai, báo "Hết giờ" kèm đáp án đúng', s.match.outcome.why === 'timeout' && !s.match.outcome.ok && /Hết giờ/.test(await page.innerText('.bb-banner')) && /Đáp án đúng/.test(await page.innerText('.bb-banner')), (await page.innerText('.bb-banner')).replace(/\n+/g, ' | '));
    await page.waitForFunction(() => window.hmvBalloon.state().match.q === 1, null, { timeout: 6000 }); ok('Hết giờ xong cũng tự chuyển câu', true);
    await page.evaluate(() => balloonBack()); await page.waitForTimeout(200);
    ok('Thoát → về thư viện trò chơi', await page.evaluate(() => classroomGame.type === null && /Thư viện trò chơi/.test(document.getElementById('games').innerText)));
    // từ Kho: Đúng/Sai và câu hỏi mở
    await fresh(page, { time: 0, control: 'touch', count: 'all', mode: 'teams', names: ['Sao Mai', 'Mặt Trời'] });
    let r = await lib.play(page, 'mau-2-dung-sai', 'balloon'); await page.waitForSelector('#bbStage .bb-balloon'); s = await st(page);
    ok('Kho → Chơi ngay → Bóng bay với bộ Đúng/Sai: vào thẳng trận, 2 quả bóng, đủ 20 câu', !r.locked && s.match.total === 20 && (await page.$$('#bbStage .bb-balloon')).length === 2 && /Mẫu 2/.test(s.match.source), { total: s.match.total, src: s.match.source });
    ok('Hai đội: hiện tên và điểm hai đội, đội đến lượt được tô viền; không có đồng hồ khi chọn Không giới hạn', await page.evaluate(() => { const c = document.querySelectorAll('.bb-chip'); return c.length === 2 && /Sao Mai/.test(c[0].textContent) && c[0].classList.contains('turn') && !c[1].classList.contains('turn') && !document.getElementById('bbTimer'); }) && /Lượt của Sao Mai/.test(await page.innerText('#bbSub')), await page.innerText('#bbSub'));
    await page.click(`#bbStage .bb-balloon >> nth=${s.match.question.correct}`, { force: true }); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(200); s = await st(page);
    ok('Hai đội: đội 1 đúng +10, sang câu sau đổi lượt cho đội 2', s.match.score[0] === 10 && s.match.turn === 1 && /Lượt của Mặt Trời/.test(await page.innerText('#bbSub')));
    for (let i = 0; i < 70; i++) { s = await st(page); if (s.match.phase === "end") break; if (s.match.phase === 'done') { await page.keyboard.press('Enter'); await page.waitForTimeout(40); continue; } const pickI = s.match.turn === 0 ? s.match.question.correct : 1 - s.match.question.correct; await page.keyboard.press(String(pickI + 1)); await page.waitForTimeout(40); }
    await page.waitForSelector('.bb-end', { timeout: 6000 }); const end2 = (await page.innerText('.bb-end')).replace(/\n+/g, ' | ');
    ok('Hai đội chơi hết 20 câu → công bố đội thắng và điểm từng đội', /Sao Mai chiến thắng/.test(end2) && /Sao Mai: 100 điểm/.test(end2) && /Mặt Trời: 0 điểm/.test(end2), end2);
    await page.evaluate(() => balloonBack());
    await page.evaluate(() => openView('questions')); await page.waitForTimeout(150); await page.click('#questions [data-kho-play="mau-7-cau-hoi-mo"]'); await page.waitForSelector('#khoModal');
    const locked = await page.evaluate(() => { const b = document.querySelector('#khoModal [data-kho-start="balloon"]'); return b ? { disabled: b.disabled, text: b.innerText.replace(/\n+/g, ' ') } : null; });
    ok('Bộ câu hỏi mở: Kho báo không hợp với Bóng bay (nút bị khóa, có lý do)', locked && locked.disabled, locked);
    await page.evaluate(() => document.getElementById('khoModal').remove());
    const errs = logs.filter(l => !/^DIALOG/.test(l)); ok('Phần A: không có lỗi JavaScript', errs.length === 0, errs.slice(0, 4));
    await browser.close(); }
  // ===== B. camera + nhận diện bàn tay (giả lập điểm đầu ngón tay) =====
  { const { browser, page, logs } = await lib.open({ viewport: vp, args: CAM, permissions: ['camera'], blockSW: true, beforeLoad: withModel });
    await ready(page); await setS(page, { time: 0, control: 'camera', count: '5', mode: 'solo', dwell: 800 }); await page.reload(); await ready(page);
    await page.evaluate(() => { window.__hand = []; openView('games'); gameSetup('balloon'); }); await page.waitForSelector('#bbSetup'); await page.click('.bb-start');
    await page.waitForFunction(() => window.hmvBalloon.state().camera === 'ready', null, { timeout: 8000 }); let s = await st(page);
    const hl = await page.evaluate(() => window.__hl ? { opts: window.__hl.options, wasm: window.__hl.fileset.wasmPath } : null);
    ok('Bắt đầu với điều khiển Camera → camera tự bật, nạp bộ nhận diện BÀN TAY trong ./vendor/mediapipe (VIDEO, tối đa 2 bàn tay)', s.camera === 'ready' && s.cameraMode === 'hand' && s.streaming && !!hl && hl.opts.runningMode === 'VIDEO' && hl.opts.numHands === 2 && /hand_landmarker\.task$/.test(hl.opts.baseOptions.modelAssetPath), hl);
    await page.waitForFunction(() => document.getElementById('bbVideo').videoWidth > 0, null, { timeout: 5000 }).catch(() => {});
    ok('Hình camera hiện làm nền (lật như gương)', await page.evaluate(() => { const v = document.getElementById('bbVideo'), cs = getComputedStyle(v); return cs.display !== 'none' && v.videoWidth > 0 && /matrix\(-1/.test(cs.transform) && document.getElementById('bbStage').classList.contains('has-cam'); }));
    await page.waitForTimeout(2200);
    ok('Chưa thấy bàn tay → nhắc "Giơ tay lên trước camera"', /Giơ tay lên trước camera/.test(await page.innerText('#bbStatus')), await page.innerText('#bbStatus'));
    // tay ở chỗ trống
    const free = await handAt(page, { x: .5, y: .86 }); await page.waitForTimeout(500);
    const ptr = await page.evaluate(() => { const p = document.querySelector('.bb-pointer'), s = document.getElementById('bbStage').getBoundingClientRect(); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.left - s.left + r.width / 2), y: Math.round(r.top - s.top + r.height / 2) }; });
    ok('Thấy bàn tay → chấm sáng hiện đúng vị trí đầu ngón tay (đã lật gương)', !!ptr && Math.abs(ptr.x - free.px) <= 6 && Math.abs(ptr.y - free.py) <= 6 && /Giơ tay chạm vào quả bóng/.test(await page.innerText('#bbStatus')), { want: free, got: ptr });
    await page.waitForTimeout(1500); s = await st(page);
    ok('Tay để ở chỗ trống 2 giây → không chọn gì', s.match.phase === 'ask' && s.match.score[0] === 0);
    // lướt qua nhanh
    const k = s.match.question.correct, w = (k + 1) % s.match.question.answers.length;
    await handAt(page, w); await page.waitForTimeout(350); const mid = await st(page); await handAt(page, { x: .5, y: .86 }); await page.waitForTimeout(700); s = await st(page);
    ok('Tay lướt qua một quả bóng 0,35 giây rồi rời đi → không chọn (vòng tròn chờ lùi về 0)', mid.match.dwell[w] > 100 && s.match.phase === 'ask' && s.match.dwell[w] === 0, { during: Math.round(mid.match.dwell[w]), after: s.match.dwell[w] });
    // giữ trên bóng đúng
    await handAt(page, k); await page.waitForTimeout(450); const ring = await page.evaluate(i => Number(document.querySelectorAll('.bb-balloon')[i].style.getPropertyValue('--p')), k); await page.screenshot({ path: __dirname + '/bb-6-camera-dwell.png' });
    await page.waitForFunction(() => window.hmvBalloon.state().match.phase === 'done', null, { timeout: 3000 }); s = await st(page);
    ok('Giữ tay trên quả bóng ĐÚNG ~0,8 giây → vòng tròn chờ đầy dần rồi bóng nổ, tự chấm đúng +10', ring > 0.2 && ring < 1 && s.match.outcome.ok && s.match.outcome.why === 'camera' && s.match.score[0] === 10, { ringAt450ms: ring, outcome: s.match.outcome });
    // sang câu 2, tay vẫn đang ở đúng chỗ đó
    await page.waitForFunction(() => window.hmvBalloon.state().match.q === 1, null, { timeout: 5000 }); await page.waitForTimeout(100);
    await handAt(page, k < 2 ? k : 1); await page.waitForTimeout(2000); s = await st(page);
    ok('Câu mới hiện ra khi tay còn nằm trên một quả bóng → KHÔNG tự chọn (phải đưa tay ra ngoài trước)', s.match.q === 1 && s.match.phase === 'ask' && !s.match.armed, { armed: s.match.armed, phase: s.match.phase });
    await handAt(page, { x: .5, y: .86 }); await page.waitForTimeout(900); s = await st(page); const k2 = s.match.question.correct, w2 = (k2 + 1) % s.match.question.answers.length;
    await handAt(page, w2); await page.waitForFunction(() => window.hmvBalloon.state().match.phase === 'done', null, { timeout: 3000 }); s = await st(page);
    ok('Đưa tay ra rồi chạm lại, giữ trên bóng SAI → tự chấm sai, điểm giữ nguyên', s.match.armed !== undefined && !s.match.outcome.ok && s.match.score[0] === 10 && s.match.picked === w2);
    // hai bàn tay
    await page.waitForFunction(() => window.hmvBalloon.state().match.q === 2, null, { timeout: 6000 }); await page.evaluate(() => { window.__hand = []; }); await page.waitForTimeout(900);
    s = await st(page); const k3 = s.match.question.correct; const a = await handAt(page, { x: .5, y: .88 }); const first = await page.evaluate(() => window.__hand[0]); await handAt(page, k3); await page.evaluate(f => { window.__hand = [f, window.__hand[0]]; }, first);
    await page.waitForTimeout(350); const two = await page.evaluate(() => document.querySelectorAll('.bb-pointer').length);
    await page.waitForFunction(() => window.hmvBalloon.state().match.phase === 'done', null, { timeout: 3000 }); s = await st(page);
    ok('Hai bàn tay cùng lúc → hai chấm sáng; bàn tay nào chạm bóng cũng được tính', two === 2 && s.match.outcome.ok && s.match.score[0] === 20, { pointers: two });
    // tắt camera giữa ván
    await page.keyboard.press('Enter'); await page.waitForTimeout(200); await page.evaluate(() => { window.__stream = document.getElementById('bbVideo').srcObject; });
    await page.click('#bbCamBtn'); await page.waitForTimeout(400); s = await st(page);
    const tr = await page.evaluate(() => ({ tracks: window.__stream.getTracks().map(t => t.readyState), running: window.hmvHandCamera.isRunning(), closed: window.__hl.closed }));
    ok('Bấm "Camera" để tắt → camera tắt hẳn, bộ nhận diện được giải phóng, vẫn chơi tiếp bằng chuột', s.camera === 'off' && tr.tracks.every(x => x === 'ended') && !tr.running && tr.closed >= 1 && /Tắt/.test(await page.innerText('#bbCamBtn')) && s.match.phase === 'ask', tr);
    await page.click(`#bbStage .bb-balloon >> nth=${s.match.question.correct}`, { force: true }); await page.waitForTimeout(200); s = await st(page); ok('…và bấm chuột vẫn chọn được', s.match.outcome.ok);
    await page.click('#bbCamBtn'); await page.waitForFunction(() => window.hmvBalloon.state().camera === 'ready', null, { timeout: 8000 }); ok('Bấm lần nữa → camera bật lại', true);
    // rời màn hình khi camera đang bật
    await page.evaluate(() => { window.__stream = document.getElementById('bbVideo').srcObject; openView('home'); }); await page.waitForTimeout(400);
    const lv = await page.evaluate(() => ({ tracks: window.__stream.getTracks().map(t => t.readyState), running: window.hmvHandCamera.isRunning(), type: classroomGame.type, match: window.hmvBalloon.state().match }));
    ok('Chuyển sang màn hình khác khi đang chơi → camera tắt, trò chơi đóng', lv.tracks.every(x => x === 'ended') && !lv.running && lv.type === null && lv.match === null, lv);
    // mở trò khác khi đang chơi (không bấm Thoát)
    await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.click('.bb-start'); await page.waitForFunction(() => window.hmvBalloon.state().camera === 'ready', null, { timeout: 8000 });
    await page.evaluate(() => { window.__stream = document.getElementById('bbVideo').srcObject; gameSetup('tug'); }); await page.waitForTimeout(700);
    const sw = await page.evaluate(() => ({ tracks: window.__stream.getTracks().map(t => t.readyState), running: window.hmvHandCamera.isRunning(), type: classroomGame.type }));
    ok('Mở thẳng trò khác khi Bóng bay đang bật camera → camera cũng tắt', sw.tracks.every(x => x === 'ended') && !sw.running && sw.type === 'tug', sw);
    const errs = logs.filter(l => /PAGEERROR|console.error/.test(l)); ok('Phần B: không có lỗi JavaScript', errs.length === 0, errs.slice(0, 4));
    await browser.close(); }
  // ===== C. không có bộ nhận diện (không có tệp trong máy, không có mạng) =====
  { const { browser, page, logs } = await lib.open({ viewport: vp, args: CAM, permissions: ['camera'], blockSW: true, beforeLoad: noModel });
    await ready(page); await setS(page, { time: 0, control: 'camera', count: '5', mode: 'solo' }); await page.reload(); await ready(page);
    await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.click('.bb-start'); await page.waitForTimeout(3000); let s = await st(page);
    ok('Không tải được bộ nhận diện → camera tự tắt, báo rõ lý do và cách chơi thay thế', s.camera === 'off' && !s.streaming && /Chưa dùng được camera/.test(s.cameraNote) && /chuột hoặc chạm/.test(await page.innerText('#bbStatus')), s.cameraNote);
    await page.click(`#bbStage .bb-balloon >> nth=${s.match.question.correct}`, { force: true }); await page.waitForTimeout(200); s = await st(page);
    ok('…vẫn chơi được bằng chuột/chạm', s.match.outcome.ok && s.match.score[0] === 10);
    const errs = logs.filter(l => /PAGEERROR/.test(l)); ok('Phần C: không có lỗi JavaScript chưa bắt', errs.length === 0, errs.slice(0, 3));
    await browser.close(); }
  // ===== D. không có camera =====
  { const { browser, page, logs } = await lib.open({ viewport: vp });
    await ready(page); await setS(page, { time: 0, control: 'camera', count: '5', mode: 'solo' }); await page.reload(); await ready(page);
    await page.evaluate(() => { openView('games'); gameSetup('balloon'); }); await page.click('.bb-start'); await page.waitForTimeout(1500); const s = await st(page);
    ok('Máy không có camera → báo "Không tìm thấy camera", chơi bằng chuột/chạm', s.camera === 'off' && /camera/i.test(s.cameraNote) && s.match.phase === 'ask', s.cameraNote);
    await browser.close(); }
  fs.writeFileSync(__dirname + '/bong-bay-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
