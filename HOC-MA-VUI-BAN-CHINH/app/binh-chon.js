/* BAN-CHINH 2.0 · "Bình chọn ngón tay": học sinh giơ 1–4 ngón tay để chọn A–B–C–D, camera AI đếm và vẽ biểu đồ.
 *
 * - Dùng MediaPipe Hand Landmarker (chạy ngay trên máy) để lấy 21 điểm của mỗi bàn tay rồi đếm số ngón đang duỗi
 *   (ngón trỏ, giữa, áp út, út; KHÔNG tính ngón cái để tránh đếm nhầm).
 * - Chỉ tính bàn tay đang giơ thẳng lên (ngón hướng lên trên); tay để trên bàn, tay cầm đồ không được tính.
 * - Mỗi bàn tay là một phiếu. Kết quả chốt theo số ngón xuất hiện nhiều nhất của từng bàn tay trong 2,5 giây cuối.
 * - Đếm được nhiều nhóm nối tiếp ("Đếm thêm nhóm khác") để gom phiếu cả lớp; giáo viên sửa tay được bằng nút +/−.
 * - Không có camera vẫn dùng được: bấm phím 1–4 hoặc nút + để nhập phiếu.
 * - Hai cách hỏi: "Hỏi nhanh" (giáo viên đọc câu hỏi) hoặc dùng bộ câu A–B–C–D, Đúng/Sai trong Kho.
 * Không nhận diện danh tính, không lưu, không gửi hình ảnh.
 */
(function () {
  'use strict';
  var doc = document, win = window, TYPE = 'poll', SKEY = 'hmv_poll_settings_v1';
  var DEF = { source: 'quick', options: 4, count: '10', time: 6, detail: 'full', control: 'camera', sound: true, autoCount: true };
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'], LETTERS = 'ABCD';
  var WINDOW_MS = 2500, FRESH_MS = 1500, LOST_MS = 2200, MATCH = 0.13;
  var cfg = Object.assign({}, DEF, read(SKEY, {}));
  var S = null, timer = 0, lastT = 0, stream = null, cam = 'off', camNote = '', actx = null, tracks = [], trackId = 0, lastFrame = 0, lastBeep = -1, scanMs = 0, scanSlow = false;

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function saveCfg() { try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function games() { return doc.getElementById('games'); }
  function game() { return win.classroomGame || {}; }
  function onStage() { var g = games(); return !!(g && g.classList.contains('active') && game().type === TYPE && !doc.hidden); }
  function now() { return win.performance && performance.now ? performance.now() : Date.now(); }

  /* ---------- Câu hỏi ---------- */
  function keyed(q) { if (!q) return false; var a = q.answers || [], c = q.correct, k = q.kind || q.type || ''; if (/MULTI|MATCH|FILL|SHORT|OPEN|ORAL/.test(k)) return false; if (c === null || c === undefined || c === '') return false; c = Number(c); return a.length >= 2 && a.length <= 4 && Number.isInteger(c) && c >= 0 && c < a.length && a.every(function (x) { return String(x || '').trim(); }) && String(q.text || q.question || '').trim(); }
  function source() {
    var picked = typeof win.hmvC6QuestionsForGame === 'function' ? win.hmvC6QuestionsForGame(TYPE) : null;
    if (picked && picked.filter(keyed).length) return { list: picked.filter(keyed), name: (typeof win.hmvC6SelectionName === 'function' && win.hmvC6SelectionName(TYPE)) || 'Bộ câu hỏi đã chọn', chosen: true };
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = sets.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), demo = sets.filter(function (s) { return /^mau-\d/.test(String(s.id)); }), order = mine.concat(demo);
    for (var i = 0; i < order.length; i++) { var l = (order[i].questions || []).filter(keyed); if (l.length >= 3) return { list: l, name: order[i].name || order[i].setTitle || 'Bộ câu hỏi', chosen: false }; }
    return { list: (win.questionData || []).filter(keyed), name: 'Câu hỏi hiện tại', chosen: false };
  }
  function Q() { return S && S.questions ? S.questions[S.q] : null; }
  function optionCount() { var q = Q(); return q ? q.answers.length : cfg.options; }

  /* ---------- Âm thanh ---------- */
  function tone(kind) {
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return;
      if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var t0 = actx.currentTime, seq = kind === 'done' ? [523, 784, 1046] : kind === 'go' ? [660, 880] : [880];
      seq.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = t0 + .02 + i * .11; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(kind === 'tick' ? .16 : .3, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .18); });
    } catch (e) {}
  }

  /* ---------- Đếm ngón tay ---------- */
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; }
  function len(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
  function cosAngle(a, b) { var d = len(a) * len(b); return d ? (a.x * b.x + a.y * b.y + a.z * b.z) / d : -1; }
  /* lm: 21 điểm. Ngón duỗi khi đốt giữa và đốt đầu gần thẳng hàng với đốt gốc và đầu ngón xa cổ tay hơn khớp giữa. */
  function fingersOf(lm) {
    if (!lm || lm.length < 21) return -1;
    var wrist = lm[0], n = 0;
    [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]].forEach(function (f) {
      var mcp = lm[f[0]], pip = lm[f[1]], dip = lm[f[2]], tip = lm[f[3]];
      var straight = cosAngle(sub(pip, mcp), sub(tip, pip)) > 0.55 && cosAngle(sub(pip, mcp), sub(dip, pip)) > 0.4;
      var far = len(sub(tip, wrist)) > len(sub(pip, wrist)) * 1.08;
      if (straight && far) n++;
    });
    return n;
  }
  function palmOf(lm) { var ids = [0, 5, 9, 13, 17], x = 0, y = 0; ids.forEach(function (i) { x += lm[i].x; y += lm[i].y; }); return { x: x / 5, y: y / 5 }; }
  function modeOf(samples, since) {
    var c = [0, 0, 0, 0, 0], total = 0, down = 0;
    samples.forEach(function (s) { if (s.t < since) return; if (s.n >= 0 && s.n <= 4) { c[s.n]++; total++; } else down++; });
    var best = 0; for (var i = 1; i < 5; i++) if (c[i] > c[best]) best = i;
    return { n: best, seen: total, down: down, share: total + down ? c[best] / (total + down) : 0 };
  }
  /* Nhận một khung hình: hands = mảng 21 điểm ảnh, world = mảng 21 điểm không gian (nếu có). */
  function feed(frame) {
    if (!S) return;
    var t = now(), hands = frame && frame.hands || [], world = frame && frame.world || [], used = {}, aspect = frame && frame.aspect || 16 / 9;
    lastFrame = t; if (frame && frame.ms) scanMs = frame.ms; if (frame && frame.slow) scanSlow = true;
    hands.forEach(function (lm, i) {
      if (!lm || lm.length < 21) return;
      /* Bàn tay đang giơ: hướng cổ tay → gốc ngón giữa lệch không quá 60° so với phương thẳng đứng. */
      var ux = (lm[9].x - lm[0].x) * aspect, uy = lm[9].y - lm[0].y, ul = Math.hypot(ux, uy), raised = ul > 0 && -uy / ul > 0.5;
      var n = raised ? fingersOf(world[i] && world[i].length >= 21 ? world[i] : lm) : -1, p = palmOf(lm), best = null, bd = MATCH;
      tracks.forEach(function (tr) { if (used[tr.id]) return; var d = Math.hypot(tr.x - p.x, tr.y - p.y); if (d < bd) { bd = d; best = tr; } });
      if (!best) { best = { id: ++trackId, x: p.x, y: p.y, samples: [], born: t }; tracks.push(best); }
      used[best.id] = 1; best.x = p.x; best.y = p.y; best.last = t; best.samples.push({ t: t, n: n });
      if (best.samples.length > 80) best.samples.splice(0, best.samples.length - 80);
    });
    tracks = tracks.filter(function (tr) { return t - tr.last < LOST_MS; });
    paintLive();
  }
  function votesNow() {
    var t = now(), k = optionCount(), out = [0, 0, 0, 0], marks = [];
    tracks.forEach(function (tr) {
      var m = modeOf(tr.samples, t - WINDOW_MS), ok = m.seen >= 2 && m.share >= 0.5 && t - tr.last < FRESH_MS;
      var vote = ok && m.n >= 1 && m.n <= k ? m.n - 1 : -1;
      if (vote >= 0) out[vote]++;
      marks.push({ id: tr.id, x: tr.x, y: tr.y, n: ok ? m.n : -1, vote: vote, down: m.down > m.seen });
    });
    return { counts: out, marks: marks };
  }

  /* ---------- Camera ---------- */
  function setStatus(text) { var e = doc.getElementById('bcStatus'); if (e && e.textContent !== text) e.textContent = text; }
  function camLabel() { var b = doc.getElementById('bcCamBtn'); if (b) { b.textContent = '📷 Camera: ' + (cam === 'off' ? 'Tắt' : cam === 'ready' ? 'Bật' : 'Đang mở…'); b.setAttribute('aria-pressed', cam === 'off' ? 'false' : 'true'); } var st = doc.getElementById('bcStage'); if (st) st.classList.toggle('has-cam', cam !== 'off'); }
  function attach() { var v = doc.getElementById('bcVideo'); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function stopCamera(note) {
    if (win.hmvHandCamera) win.hmvHandCamera.stop();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    var v = doc.getElementById('bcVideo'); if (v) v.srcObject = null;
    cam = 'off'; tracks = []; scanMs = 0; scanSlow = false; if (note !== undefined) camNote = note; camLabel(); hint(); paintLive();
  }
  function startCamera() {
    if (!S || cam !== 'off') return;
    if (!win.isSecureContext || location.protocol === 'file:') { camNote = 'Camera cần chạy bằng địa chỉ localhost. Thầy cô nhập phiếu bằng phím 1–4.'; hint(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote = 'Trình duyệt không hỗ trợ camera. Thầy cô nhập phiếu bằng phím 1–4.'; hint(); return; }
    cam = 'opening'; camNote = ''; camLabel(); setStatus('Đang mở camera…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (s) {
      if (!S || game().type !== TYPE || cam !== 'opening') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; cam = 'loading'; attach(); camLabel(); setStatus('Đang tải AI nhận diện bàn tay…');
      if (!win.hmvHandCamera) { stopCamera('Thiếu tệp ban-tay-camera.js nên chưa dùng được camera. Thầy cô nhập phiếu bằng phím 1–4.'); return; }
      win.hmvHandCamera.start(s, function (frame) { if (stream === s) feed(frame); }, { numHands: 12, full: true, scan: true, tiles: cfg.detail !== 'fast' }).then(function (info) {
        if (stream !== s) return;
        if (!info || info.mode !== 'hand') { stopCamera('Chưa có bộ nhận diện bàn tay nên chưa đếm được bằng camera. Thầy cô nhập phiếu bằng phím 1–4.'); return; }
        cam = 'ready'; camLabel(); hint();
      }).catch(function (e) { if (stream !== s) return; stopCamera('Chưa dùng được camera: ' + ((e && e.userMessage) || 'không tải được bộ nhận diện.') + ' Thầy cô nhập phiếu bằng phím 1–4.'); toast('Chưa có bộ nhận diện bàn tay · nhập phiếu bằng phím 1–4'); });
    }).catch(function (e) {
      var why = e && e.name === 'NotAllowedError' ? 'trình duyệt chưa được cấp quyền camera.' : e && e.name === 'NotFoundError' ? 'không tìm thấy camera.' : e && e.name === 'NotReadableError' ? 'camera đang được chương trình khác dùng.' : 'không mở được camera.';
      cam = 'off'; camNote = 'Chưa dùng được camera: ' + why + ' Thầy cô nhập phiếu bằng phím 1–4.'; camLabel(); hint();
    });
  }
  function toggleCamera() { if (cam === 'off') { cfg.control = 'camera'; saveCfg(); startCamera(); } else { cfg.control = 'manual'; saveCfg(); stopCamera(''); } }
  function hint() {
    if (!S) return;
    var k = optionCount(), say = 'Giơ ' + (k === 2 ? '1 hoặc 2' : '1 đến ' + k) + ' ngón tay (không dùng ngón cái), lòng bàn tay hướng về camera.';
    if (S.phase === 'result') return setStatus('Kiểm lại số phiếu; sửa bằng nút + hoặc − nếu camera đếm sót.');
    if (cam === 'ready') setStatus(S.phase === 'count' ? say : 'Camera đã sẵn sàng. ' + say + ' Bấm “Bắt đầu đếm” khi cả nhóm đã giơ tay.');
    else if (cam === 'opening' || cam === 'loading') setStatus(cam === 'opening' ? 'Đang mở camera…' : 'Đang tải AI nhận diện bàn tay…');
    else setStatus(camNote || 'Camera đang tắt. Thầy cô đếm tay giơ rồi bấm phím 1–4 (hoặc nút +) để nhập phiếu.');
  }

  /* ---------- Diễn biến ---------- */
  function begin() {
    collect();
    var src = cfg.source === 'bank' ? source() : null, list = null;
    if (cfg.source === 'bank') {
      if (!src.list.length) { toast('Chưa có câu A–B–C–D hoặc Đúng/Sai. Hãy chọn “Hỏi nhanh” hoặc chọn một bộ trong Kho.'); return; }
      list = src.list.slice(); var n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10);
      if (!src.chosen) for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; }
      list = list.slice(0, n).map(function (q) { return { id: q.id, text: String(q.text || q.question || ''), answers: q.answers.map(String), correct: Number(q.correct), explanation: q.explanation || '', grade: q.grade || '', subject: q.subject || '', topic: q.topic || '' }; });
    }
    S = { mode: cfg.source, questions: list, q: 0, phase: 'ready', left: 0, tally: [0, 0, 0, 0], rounds: 0, results: [], sourceName: src ? src.name : 'Hỏi nhanh', quickNo: 1, startedAt: Date.now() };
    game().started = true; tracks = []; lastT = Date.now(); lastBeep = -1;
    clearInterval(timer); timer = setInterval(tick, 100); if (win.hmvTran) win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return false; } });
    render(true);
    if (cfg.control === 'camera') startCamera(); else hint();
  }
  function startCount() {
    if (!S || S.phase === 'count' || S.phase === 'end') return;
    if (cam !== 'ready') { toast(cam === 'off' ? 'Camera đang tắt: bấm phím 1–4 để nhập phiếu, hoặc bật camera.' : 'Camera chưa sẵn sàng, chờ một chút.'); return; }
    S.phase = 'count'; S.left = cfg.time; tracks = []; lastBeep = -1; tone('go'); paint(); hint();
  }
  /* 2.6: máy đọc xong câu hỏi (nút loa hoặc tự đọc) → tự bắt đầu đếm ngược, không cần bấm "Bắt đầu đếm".
   * Chỉ khi đang chờ đếm, camera đã sẵn sàng (camera còn đang mở thì chờ tối đa 6 giây) và lựa chọn này đang bật. */
  var autoWait = 0;
  function autoCountSoon(tries) {
    clearTimeout(autoWait); autoWait = 0;
    if (!S || cfg.autoCount === false || S.phase !== 'ready' || game().type !== TYPE || !onStage() || !S.questions) return;
    if (cam === 'ready') { startCount(); return; }
    if (cam === 'off' || tries <= 0) return;
    var q = S.q; autoWait = setTimeout(function () { if (S && S.q === q) autoCountSoon(tries - 1); }, 500);
  }
  doc.addEventListener('hmv-doc-to-xong', function (e) { if (e && e.detail && e.detail.game === 'poll' && e.detail.done) autoCountSoon(12); });
  /* 2.7: câu có đáp án → tiếng ĐÚNG khi đáp án đúng được nhiều phiếu nhất, tiếng SAI khi không; khảo sát nhanh hoặc chưa có phiếu → tiếng báo cũ. */
  function resultSound() {
    if (!cfg.sound) return;
    var q = Q(), sum = S.tally.reduce(function (a, b) { return a + b; }, 0);
    if (!q || !sum || !win.hmvDungSai) { tone('done'); return; }
    var top = Math.max.apply(null, S.tally.slice(0, q.answers.length));
    win.hmvDungSai.play(S.tally[q.correct] === top, 0.8, function () { tone('done'); });
  }
  function finishCount() {
    if (!S || S.phase !== 'count') return;
    var v = votesNow(); for (var i = 0; i < 4; i++) S.tally[i] += v.counts[i];
    S.rounds++; S.last = v.counts.slice(); S.phase = 'result'; resultSound(); paint(); hint(); autoNext();
  }
  function addVote(i, d) {
    if (!S || S.phase === 'end' || S.phase === 'count' || i < 0 || i >= optionCount()) return;
    S.tally[i] = Math.max(0, S.tally[i] + d); if (S.phase === 'ready') S.phase = 'result'; paint(); hint();
  }
  function recount() { if (!S || S.phase === 'end') return; S.tally = [0, 0, 0, 0]; S.rounds = 0; S.phase = 'ready'; tracks = []; paint(); hint(); }
  function total() { return S.tally.reduce(function (a, b) { return a + b; }, 0); }
  function keep() {
    var q = Q(), k = optionCount(), counts = S.tally.slice(0, k), sum = total();
    var rec = { no: S.results.length + 1, text: q ? q.text : 'Câu hỏi ' + S.quickNo, answers: q ? q.answers.slice() : LETTERS.slice(0, k).split(''), correct: q ? q.correct : null, counts: counts, total: sum, right: q ? counts[q.correct] : null };
    S.results.push(rec);
    if (win.hmvKetQua && typeof win.hmvKetQua.record === 'function') { try { win.hmvKetQua.record({ game: TYPE, source: S.sourceName, id: q && q.id, text: rec.text, answers: rec.answers, correct: rec.correct, counts: counts, total: sum, right: rec.right, grade: q && q.grade, subject: q && q.subject, topic: q && q.topic }); } catch (e) {} }
  }
  /* 2.15: hỏi theo bộ câu hỏi + Luật trận đấu chọn "chuyển câu sau … giây" → tự sang câu sau khi hiện kết quả. */
  var autoNx = 0;
  function autoNext() { clearTimeout(autoNx); var r = win.hmvTran ? win.hmvTran.reveal(TYPE, 5) : 5; if (!(r > 0) || !S || !S.questions) return; var q = S.q; autoNx = setTimeout(function () { if (S && S.phase === 'result' && S.q === q && game().type === TYPE) next(); }, r * 1000); }
  function next() {
    clearTimeout(autoNx);
    if (!S || S.phase === 'end' || S.phase === 'count') return;
    if (total() > 0 || S.phase === 'result') keep();
    S.tally = [0, 0, 0, 0]; S.rounds = 0; tracks = []; S.phase = 'ready';
    if (S.questions) { if (S.q + 1 >= S.questions.length) return finish(); S.q++; } else S.quickNo++;
    paint(); hint();
  }
  function finish() {
    if (!S || S.phase === 'end') return;
    if (S.phase === 'count') finishCount();
    if (S.phase === 'result' || total() > 0) { keep(); S.tally = [0, 0, 0, 0]; }
    S.phase = 'end'; clearInterval(timer); timer = 0; stopCamera(''); tone('done'); render(true);
  }
  function back() { clearInterval(timer); timer = 0; stopCamera(''); S = null; game().type = null; game().started = false; if (typeof win.renderGames === 'function') win.renderGames(); }
  function tick() {
    var t = Date.now(), dt = Math.max(0, Math.min(1, (t - lastT) / 1000)); lastT = t;
    if (!S) { clearInterval(timer); timer = 0; return; }
    if (game().type !== TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; return; }
    fit();
    if (S.phase !== 'count' || !onStage() || win.hmvHold) return;   /* 2.4: đang đọc to câu hỏi thì đồng hồ tạm chờ */
    S.left = Math.max(0, S.left - dt);
    var e = doc.getElementById('bcTimer'), n = Math.ceil(S.left); if (e) e.textContent = n;
    if (n <= 3 && n >= 1 && n !== lastBeep) { lastBeep = n; tone('tick'); }
    if (cam !== 'ready') { S.phase = 'ready'; paint(); hint(); return; }
    paintLive();
    if (S.left <= 0) finishCount();
  }

  /* ---------- Giao diện ---------- */
  function handSvg(n, color) {
    var xs = [9, 16, 23, 30], h = [16, 20, 18, 13], bars = '';
    for (var i = 0; i < 4; i++) bars += i < n ? '<rect x="' + xs[i] + '" y="' + (25 - h[i]) + '" width="5.4" height="' + (h[i] + 6) + '" rx="2.7" fill="' + color + '"/>' : '<rect x="' + xs[i] + '" y="22" width="5.4" height="9" rx="2.7" fill="' + color + '" opacity=".45"/>';
    return '<svg viewBox="0 0 44 48" class="bc-hand" aria-hidden="true">' + bars + '<path d="M7 27h30v9a11 11 0 0 1-11 11h-8A11 11 0 0 1 7 36z" fill="' + color + '"/><path d="M7 33l-4-5a2.800 2.800 0 0 1 4.300-3.600L10 27.500z" fill="' + color + '" opacity=".8"/></svg>';
  }
  function fontFor(text) { var n = String(text).length; return n <= 6 ? 1.25 : n <= 16 ? 1.05 : n <= 30 ? .9 : .78; }
  function barsHtml() {
    var q = Q(), k = optionCount(), sum = total(), live = S.phase === 'count' ? votesNow().counts : null, shown = live ? live.map(function (v, i) { return v + S.tally[i]; }) : S.tally, max = Math.max(1, Math.max.apply(null, shown.slice(0, k))), done = S.phase === 'result';
    var rows = '';
    for (var i = 0; i < k; i++) {
      var label = q ? q.answers[i] : '', right = done && q && q.correct === i, pct = done && sum ? Math.round(S.tally[i] * 100 / sum) : null;
      rows += '<div class="bc-row' + (right ? ' right' : '') + (done && q && q.correct !== i ? ' dim' : '') + '" style="--c:' + COLORS[i] + '" data-bc-row="' + i + '"><span class="bc-key">' + handSvg(i + 1, '#fff') + '<b>' + (q && k === 2 && /^(đúng|sai)$/i.test(label) ? '' : LETTERS[i]) + '</b></span><span class="bc-label" style="--f:' + fontFor(label) + '">' + esc(label || 'Lựa chọn ' + LETTERS[i]) + (right ? ' <em>✔ Đáp án đúng</em>' : '') + '</span><span class="bc-track"><i style="width:' + Math.round(shown[i] * 100 / max) + '%"></i></span><strong class="bc-num" data-bc-num="' + i + '">' + shown[i] + (pct !== null ? '<small>' + pct + '%</small>' : '') + '</strong><span class="bc-adj"><button type="button" data-bc-minus="' + i + '" aria-label="Bớt một phiếu ' + LETTERS[i] + '"' + (S.phase === 'count' ? ' disabled' : '') + '>−</button><button type="button" data-bc-plus="' + i + '" aria-label="Thêm một phiếu ' + LETTERS[i] + '"' + (S.phase === 'count' ? ' disabled' : '') + '>+</button></span></div>';
    }
    return rows;
  }
  function summaryText() {
    var q = Q(), sum = total();
    if (S.phase !== 'result') return '';
    if (!sum) return 'Chưa có phiếu nào. Bấm “Đếm lại”, hoặc nhập phiếu bằng nút +.';
    if (q) return '<b>' + S.tally[q.correct] + '/' + sum + '</b> bạn chọn đúng (' + Math.round(S.tally[q.correct] * 100 / sum) + '%).' + (q.explanation ? ' ' + esc(q.explanation) : '');
    var k = optionCount(), top = 0; for (var i = 1; i < k; i++) if (S.tally[i] > S.tally[top]) top = i;
    return 'Tổng <b>' + sum + '</b> phiếu' + (S.rounds > 1 ? ' qua ' + S.rounds + ' lượt đếm' : '') + '. Nhiều nhất: <b>' + LETTERS[top] + '</b> (' + S.tally[top] + ' phiếu).';
  }
  function controlsHtml() {
    var last = S.questions && S.q + 1 >= S.questions.length;
    if (S.phase === 'count') return '<span class="bc-counting">Đang đếm… giữ yên tay <b id="bcTimer">' + Math.ceil(S.left) + '</b> giây</span><button type="button" class="btn soft" data-bc="stop">Chốt ngay</button>';
    if (S.phase === 'result') return '<button type="button" class="btn soft" data-bc="count">＋ Đếm thêm nhóm khác</button><button type="button" class="btn soft" data-bc="recount">↺ Đếm lại</button><button type="button" class="btn color bc-main" data-bc="next">' + (S.questions ? (last ? 'Xem tổng kết ▶' : 'Câu tiếp theo ▶') : 'Câu hỏi mới ▶') + '</button>';
    return '<button type="button" class="btn color bc-main" data-bc="count">▶ Bắt đầu đếm (' + cfg.time + ' giây)</button>' + (S.questions ? '<button type="button" class="btn soft" data-bc="next">Bỏ qua câu này</button>' : '');
  }
  /* Cho khung bình chọn cao vừa khít phần còn lại của màn hình (thanh tiêu đề có thể xuống hai dòng). */
  /* 2.5: khung cao bằng phần màn hình còn lại; các hàng phương án tự co cho vừa. Nếu co hết cỡ mà vẫn thiếu chỗ (câu hỏi rất dài, màn hình rất thấp)
   * thì khung cao thêm đúng phần thiếu (trang cuộn) – không bao giờ để một phương án bị che trong vùng cuộn ẩn. */
  function fit() {
    var st = doc.getElementById('bcStage'); if (!st) return;
    if (win.innerWidth <= 1000) { if (st.style.height) st.style.height = ''; st.__hmvFit = ''; return; }
    var top = st.getBoundingClientRect().top + (win.scrollY || 0), h = Math.max(260, Math.round(win.innerHeight - top - 14)), pn = st.querySelector('.bc-panel');
    var sig = h + '|' + win.innerWidth + '|' + (S ? S.phase + '|' + S.q + '|' + S.quickNo : '') + '|' + (pn ? pn.textContent.length + '|' + pn.querySelectorAll('button').length : 0);   /* số nút đổi khi nút loa được gắn vào câu hỏi */
    if (st.__hmvFit === sig) return; st.__hmvFit = sig;
    st.style.height = h + 'px';
    if (pn) { var bars = pn.querySelector('.bc-bars'), extra = Math.max(pn.scrollHeight - pn.clientHeight, bars ? bars.scrollHeight - bars.clientHeight : 0); if (extra > 1) st.style.height = (h + extra) + 'px'; }
  }
  function paintLive() {
    if (!S) return; var stage = doc.getElementById('bcStage'); if (!stage) return;
    var v = votesNow(), box = doc.getElementById('bcMarks');
    if (box) box.innerHTML = cam === 'ready' ? v.marks.map(function (m) { return '<span class="bc-mark' + (m.vote >= 0 ? '' : ' idle') + '" style="left:' + ((1 - m.x) * 100).toFixed(1) + '%;top:' + (m.y * 100).toFixed(1) + '%;--c:' + (m.vote >= 0 ? COLORS[m.vote] : '#64748b') + '">' + (m.vote >= 0 ? LETTERS[m.vote] : m.n === 0 ? '✊' : m.down ? '↓' : '…') + '</span>'; }).join('') : '';
    var seen = doc.getElementById('bcSeen'); if (seen) seen.textContent = cam === 'ready' ? 'Đang thấy ' + v.marks.length + ' bàn tay · ' + v.counts.reduce(function (a, b) { return a + b; }, 0) + ' phiếu' + (scanSlow ? ' · máy chậm nên chỉ dò nhanh' : '') : '';
    if (S.phase === 'count') { var k = optionCount(), shown = v.counts.map(function (c, i) { return c + S.tally[i]; }), max = Math.max(1, Math.max.apply(null, shown.slice(0, k))); for (var i = 0; i < k; i++) { var num = stage.querySelector('[data-bc-num="' + i + '"]'), bar = stage.querySelector('[data-bc-row="' + i + '"] .bc-track i'); if (num) num.textContent = shown[i]; if (bar) bar.style.width = Math.round(shown[i] * 100 / max) + '%'; } }
  }
  function paint() {
    var stage = doc.getElementById('bcStage'); if (!S || !stage) return; var q = Q();
    var subt = doc.getElementById('bcSub'); if (subt) subt.textContent = (S.questions ? 'Câu ' + (S.q + 1) + '/' + S.questions.length + ' · ' + S.sourceName : 'Hỏi nhanh · câu ' + S.quickNo) + '';
    var qel = doc.getElementById('bcQuestion'); qel.textContent = q ? q.text : 'Thầy cô đọc câu hỏi — cả nhóm giơ ngón tay để chọn'; qel.style.setProperty('--f', q && q.text.length > 80 ? .74 : q && q.text.length > 40 ? .88 : 1); qel.classList.toggle('quick', !q);
    doc.getElementById('bcBars').innerHTML = barsHtml();
    doc.getElementById('bcSummary').innerHTML = summaryText();
    doc.getElementById('bcControls').innerHTML = controlsHtml();
    stage.dataset.phase = S.phase; camLabel(); paintLive(); fit();
  }
  function opt(v, cur, label) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + label + '</option>'; }
  function setupHtml() {
    var src = source(), ok = src.list.length > 0;
    return '<div class="bc-setup-screen"><div class="page-title"><div><h2>🖐️ BÌNH CHỌN NGÓN TAY</h2><p>Giơ 1, 2, 3 hoặc 4 ngón tay để chọn A, B, C, D. Camera AI đếm phiếu và vẽ biểu đồ ngay.</p></div><div class="toolbar"><button class="btn soft" data-bc="back">← Thư viện</button></div></div>'
      + '<div class="bc-setup" id="bcSetup"><section class="bc-how"><div class="bc-legend">' + [0, 1, 2, 3].map(function (i) { return '<span style="--c:' + COLORS[i] + '">' + handSvg(i + 1, COLORS[i]) + '<b>' + LETTERS[i] + '</b><small>' + (i + 1) + ' ngón</small></span>'; }).join('') + '</div><ol><li><b>Một nhóm đứng trước camera</b><small>Khoảng 6–10 bạn, cách camera 1–2,5 mét. Cả lớp thì đếm lần lượt từng tổ rồi cộng dồn.</small></li><li><b>Giơ ngón tay để chọn</b><small>Dùng ngón trỏ, giữa, áp út, út — không dùng ngón cái. Lòng bàn tay hướng về camera, tay giơ cao, tách xa nhau.</small></li><li><b>Giữ yên vài giây</b><small>Hết giờ, ứng dụng chốt số phiếu. Thầy cô sửa được bằng nút + và − nếu camera đếm sót.</small></li></ol><p class="bc-privacy">Camera chỉ dùng để tìm bàn tay ngay trên máy này. Ứng dụng không nhận diện danh tính, không lưu và không gửi hình ảnh. Không có camera vẫn dùng được: bấm phím 1–4 để nhập phiếu.</p></section>'
      + '<section class="bc-form"><div class="bc-grid"><label>Cách hỏi<select id="bcSource">' + opt('quick', cfg.source, 'Hỏi nhanh – thầy cô đọc câu hỏi') + opt('bank', cfg.source, 'Dùng bộ câu hỏi trong Kho') + '</select></label><label class="bc-only-quick">Số lựa chọn<select id="bcOptions">' + opt(2, cfg.options, '2 (A, B)') + opt(3, cfg.options, '3 (A, B, C)') + opt(4, cfg.options, '4 (A, B, C, D)') + '</select></label><label class="bc-only-bank">Số câu<select id="bcCount">' + opt('5', cfg.count, '5 câu') + opt('10', cfg.count, '10 câu') + opt('all', cfg.count, 'Tất cả') + '</select></label><label>Thời gian giơ tay<select id="bcTime">' + opt(4, cfg.time, '4 giây') + opt(6, cfg.time, '6 giây') + opt(8, cfg.time, '8 giây') + opt(12, cfg.time, '12 giây') + '</select></label><label>Cách dò bàn tay<select id="bcDetail">' + opt('full', cfg.detail, 'Kỹ – nhóm đông hoặc đứng xa') + opt('fast', cfg.detail, 'Nhanh – nhóm nhỏ đứng gần') + '</select></label><label>Cách đếm<select id="bcControl">' + opt('camera', cfg.control, '📷 Camera AI đếm') + opt('manual', cfg.control, '⌨ Thầy cô nhập phiếu (phím 1–4)') + '</select></label><label>Tiếng hiệu ứng<select id="bcSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label><label class="bc-only-bank">Sau khi máy đọc xong câu hỏi<select id="bcAutoCount">' + opt(1, cfg.autoCount !== false ? 1 : 0, 'Tự bắt đầu đếm') + opt(0, cfg.autoCount !== false ? 1 : 0, 'Chờ thầy cô bấm') + '</select></label></div>'
      + '<p class="bc-source bc-only-bank">' + (ok ? 'Bộ câu hỏi: <b>' + esc(src.name) + '</b> · <b>' + src.list.length + '</b> câu dùng được (A–B–C–D, Đúng/Sai).' : '<span class="bc-warn">Chưa có câu hỏi A–B–C–D hoặc Đúng/Sai trong Kho.</span>') + ' <button class="bc-link" type="button" data-bc="kho">Chọn bộ khác trong Kho</button></p>'
      + '<button class="btn color bc-start" data-bc="start">▶ Bắt đầu</button></section></div></div>';
  }
  function playHtml() {
    return '<div class="bc-game"><div class="page-title"><div><h2>🖐️ BÌNH CHỌN NGÓN TAY</h2><p id="bcSub"></p></div><div class="toolbar"><button class="btn soft" id="bcCamBtn" data-bc="camera">📷 Camera: Tắt</button><button class="btn soft" data-bc="finish">Kết thúc</button><button class="btn soft" data-bc="back">Thoát</button></div></div>'
      + '<div class="bc-stage" id="bcStage"><div class="bc-view"><video id="bcVideo" class="bc-video" autoplay muted playsinline></video><div class="bc-marks" id="bcMarks" aria-hidden="true"></div><div class="bc-seen" id="bcSeen"></div><div class="bc-nocam">Camera đang tắt<br><small>Bấm phím 1–4 hoặc nút + để nhập phiếu</small></div></div>'
      + '<div class="bc-panel"><div class="bc-question" id="bcQuestion"></div><div class="bc-bars" id="bcBars"></div><div class="bc-summary" id="bcSummary" role="status"></div><div class="bc-controls" id="bcControls"></div><div class="bc-status" id="bcStatus" role="status"></div></div></div></div>';
  }
  function endHtml() {
    var rows = S.results.map(function (r) { var k = r.counts.length; return '<tr><td>' + r.no + '</td><td class="bc-qcell">' + esc(r.text) + (r.correct !== null ? '<small>Đáp án: ' + LETTERS[r.correct] + '. ' + esc(r.answers[r.correct]) + '</small>' : '') + '</td>' + [0, 1, 2, 3].map(function (i) { return '<td class="' + (r.correct === i ? 'ok' : '') + '">' + (i < k ? r.counts[i] : '–') + '</td>'; }).join('') + '<td>' + r.total + '</td><td>' + (r.correct !== null && r.total ? Math.round(r.right * 100 / r.total) + '%' : '–') + '</td></tr>'; }).join('');
    var graded = S.results.filter(function (r) { return r.correct !== null && r.total; }), right = graded.reduce(function (a, r) { return a + r.right; }, 0), all = graded.reduce(function (a, r) { return a + r.total; }, 0), hard = graded.slice().sort(function (a, b) { return a.right / a.total - b.right / b.total; })[0];
    return '<div class="bc-game"><div class="page-title"><div><h2>🖐️ BÌNH CHỌN NGÓN TAY</h2><p>Tổng kết · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn soft" data-bc="back">← Thư viện</button></div></div><div class="bc-end">'
      + (S.results.length ? (graded.length ? '<p class="bc-headline">Cả nhóm chọn đúng <b>' + right + '/' + all + '</b> lượt (' + Math.round(right * 100 / all) + '%).' + (hard && hard.right / hard.total < 0.6 ? ' Câu cần ôn lại nhất: <b>câu ' + hard.no + '</b>.' : '') + '</p>' : '<p class="bc-headline">Đã ghi <b>' + S.results.length + '</b> lần bình chọn.</p>') + '<div class="bc-table-wrap"><table class="bc-table"><thead><tr><th>#</th><th>Câu hỏi</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Phiếu</th><th>Đúng</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="bc-headline">Chưa có lần bình chọn nào được ghi.</p>')
      + '<div class="bc-end-actions"><button class="btn color" data-bc="start">↻ Bình chọn tiếp</button>' + (graded.length && win.hmvTroLyAI ? '<button class="btn soft" data-bc="stats">📈 Xem phân tích</button>' : '') + '<button class="btn soft" data-bc="back">← Về thư viện</button></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return;
    if (!S) { g.innerHTML = setupHtml(); syncFields(); return; }
    if (S.phase === 'end') { if (force || !g.querySelector('.bc-end')) g.innerHTML = endHtml(); return; }
    if (force || !doc.getElementById('bcStage')) { g.innerHTML = playHtml(); attach(); }
    paint(); hint();
  }
  function syncFields() { var s = doc.getElementById('bcSource'), bank = s && s.value === 'bank'; doc.querySelectorAll('.bc-only-bank').forEach(function (l) { l.hidden = !bank; }); doc.querySelectorAll('.bc-only-quick').forEach(function (l) { l.hidden = bank; }); }
  function collect() {
    var v = function (id) { var e = doc.getElementById(id); return e ? e.value : null; };
    if (v('bcSource') === null) return;
    cfg.source = v('bcSource') === 'bank' ? 'bank' : 'quick'; cfg.options = Math.max(2, Math.min(4, Number(v('bcOptions')) || 4)); cfg.count = v('bcCount') || '10'; cfg.time = Number(v('bcTime')) || 6; cfg.detail = v('bcDetail') === 'fast' ? 'fast' : 'full'; cfg.control = v('bcControl') === 'manual' ? 'manual' : 'camera'; cfg.sound = v('bcSound') === '1'; if (doc.getElementById('bcAutoCount')) cfg.autoCount = v('bcAutoCount') !== '0';
    saveCfg();
  }

  /* ---------- Sự kiện ---------- */
  doc.addEventListener('click', function (e) {
    if (game().type !== TYPE) return;
    var g = games(); if (!g || !g.contains(e.target)) return;
    var p = e.target.closest('[data-bc-plus],[data-bc-minus]'); if (p && !p.disabled) { if (p.dataset.bcPlus !== undefined) addVote(Number(p.dataset.bcPlus), 1); else addVote(Number(p.dataset.bcMinus), -1); return; }
    var b = e.target.closest('[data-bc]'); if (!b || b.disabled) return;
    var a = b.dataset.bc;
    if (a === 'start') begin(); else if (a === 'back') back(); else if (a === 'camera') toggleCamera(); else if (a === 'count') startCount(); else if (a === 'stop') finishCount(); else if (a === 'recount') recount(); else if (a === 'next') next(); else if (a === 'finish') finish();
    else if (a === 'kho') { back(); if (typeof win.openView === 'function') win.openView('questions'); }
    else if (a === 'stats') { back(); if (win.hmvTroLyAI) win.hmvTroLyAI.open('stats'); }
  });
  doc.addEventListener('change', function (e) { if (e.target && e.target.id === 'bcSource') syncFields(); });
  doc.addEventListener('keydown', function (e) {
    if (game().type !== TYPE || !S || S.phase === 'end' || !onStage()) return;
    var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.altKey || e.metaKey || doc.querySelector('#khoModal,#c6QuestionModal,#qbStage7Modal,dialog[open]')) return;
    var k = String(e.key || '').toLowerCase();
    var digit = /^(?:Digit|Numpad)([1-4])$/.exec(e.code || '');   /* theo vị trí phím: không phụ thuộc bộ gõ tiếng Việt hay phím Shift */
    if (digit) { e.preventDefault(); addVote(Number(digit[1]) - 1, e.shiftKey ? -1 : 1); }
    else if (/^[1-4]$/.test(k)) { e.preventDefault(); addVote(Number(k) - 1, e.shiftKey ? -1 : 1); }
    else if (/^[a-d]$/.test(k)) { e.preventDefault(); addVote(k.charCodeAt(0) - 97, 1); }
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) { if (S.phase === 'count') finishCount(); else startCount(); } }
    else if (k === 'enter' && S.phase === 'result') { e.preventDefault(); if (!e.repeat) next(); }
  });
  doc.addEventListener('visibilitychange', function () { lastT = Date.now(); });

  /* ---------- Gắn vào ứng dụng ---------- */
  var baseSetup = win.gameSetup, baseRender = win.renderGames, baseStart = win.gameStart, baseOpen = win.openView;
  win.gameSetup = function (t) { if (t === TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; win.classroomGame = { type: TYPE, started: false }; render(true); return; } return baseSetup.apply(this, arguments); };
  win.renderGames = function () { if (game().type === TYPE) { render(false); return; } var out = baseRender.apply(this, arguments); decorateCard(); return out; };
  win.gameStart = function () { if (game().type === TYPE) { var s = doc.getElementById('bcSource'); if (s && typeof win.hmvC6QuestionsForGame === 'function' && (win.hmvC6QuestionsForGame(TYPE) || []).length) { s.value = 'bank'; } begin(); return; } return baseStart.apply(this, arguments); };
  if (typeof baseOpen === 'function') win.openView = function (id) { if (id !== 'games' && game().type === TYPE) back(); var out = baseOpen.apply(this, arguments); if (id === 'games') setTimeout(decorateCard, 0); return out; };
  function decorateCard() {
    var g = games(); if (!g) return;
    Array.prototype.forEach.call(g.querySelectorAll('.game-library-card'), function (card) {
      var h = card.querySelector('h3'); if (!h || h.textContent.trim() !== 'Bình chọn ngón tay' || card.dataset.bc) return;
      card.dataset.bc = '1'; card.classList.add('bc-card');
      var tags = card.querySelectorAll('.game-tags span'); if (tags[0]) tags[0].textContent = '👥 Theo nhóm, cộng dồn cả lớp'; if (tags[1]) tags[1].textContent = '📷 Camera AI · đếm ngón tay';
      var badge = doc.createElement('span'); badge.className = 'bb-new'; badge.textContent = 'Mới'; card.appendChild(badge);
      var help = Array.prototype.find.call(card.querySelectorAll('button'), function (b) { return /Hướng dẫn/.test(b.textContent); }); if (help) help.onclick = function (ev) { ev.stopPropagation(); toast('Giơ 1–4 ngón tay (không dùng ngón cái) để chọn A–D. Camera đếm phiếu; không có camera thì bấm phím 1–4.'); };
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', decorateCard); else setTimeout(decorateCard, 0);

  win.pollBack = back;
  win.hmvPoll = {
    state: function () { return { settings: JSON.parse(JSON.stringify(cfg)), match: S ? { mode: S.mode, q: S.q, total: S.questions ? S.questions.length : null, phase: S.phase, left: S.left, tally: S.tally.slice(), rounds: S.rounds, results: JSON.parse(JSON.stringify(S.results)), question: Q() ? { text: Q().text, answers: Q().answers.slice(), correct: Q().correct } : null, source: S.sourceName, options: optionCount() } : null, camera: cam, cameraNote: camNote, streaming: !!stream, tracks: tracks.length, scanMs: scanMs, scanSlow: scanSlow, live: S ? votesNow() : null }; },
    feed: feed, fingersOf: fingersOf
  };
})();
