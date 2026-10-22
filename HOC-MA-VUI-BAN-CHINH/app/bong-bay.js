/* BAN-CHINH 1.5 · Trò chơi "Bóng bay tri thức" (thay cho Lật mảnh ghép).
 *
 * Ý tưởng: thực tế tăng cường (AR). Hình ảnh lớp qua camera hiện như một tấm gương; các đáp án là những quả bóng bay
 * lơ lửng ngay trên hình. Học sinh giơ tay CHẠM VÀO QUẢ BÓNG TRONG KHÔNG KHÍ và giữ khoảng 1 giây; bộ nhận diện bàn tay
 * (MediaPipe Hand Landmarker, chạy ngay trên máy) tìm đầu ngón tay trỏ để làm con trỏ. Ứng dụng tự chấm và tự chuyển câu.
 *
 * Luôn chơi được không cần camera: bấm chuột, chạm màn hình tương tác, hoặc phím 1–4 / A–D.
 * Dùng câu A–B–C–D và Đúng/Sai trong Kho câu hỏi. Không lưu, không gửi hình ảnh.
 */
(function () {
  'use strict';
  var doc = document, win = window, TYPE = 'balloon', SKEY = 'hmv_balloon_settings_v1';
  var DEF = { mode: 'solo', count: '10', time: 20, control: 'camera', dwell: 800, sound: true, names: ['Đội Xanh', 'Đội Cam'] };
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'], TEAM = ['#2563eb', '#f97316'];
  var cfg = Object.assign({}, DEF, read(SKEY, {}));
  var S = null, timer = 0, lastT = 0, stream = null, cam = 'off', camMode = '', camNote = '', actx = null, noHandSince = 0;

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function saveCfg() { try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function games() { return doc.getElementById('games'); }
  function game() { return win.classroomGame || {}; }
  function onStage() { var g = games(); return !!(g && g.classList.contains('active') && game().type === TYPE && !doc.hidden); }

  /* ---------- Câu hỏi ---------- */
  function keyed(q) { if (!q) return false; var a = q.answers || [], c = q.correct, k = q.kind || q.type || ''; if (/MULTI|MATCH|FILL|SHORT|OPEN|ORAL/.test(k)) return false; if (c === null || c === undefined || c === '') return false; c = Number(c); return a.length >= 2 && a.length <= 4 && Number.isInteger(c) && c >= 0 && c < a.length && a.every(function (x) { return String(x || '').trim(); }) && String(q.text || q.question || '').trim(); }
  function source() {
    var picked = typeof win.hmvC6QuestionsForGame === 'function' ? win.hmvC6QuestionsForGame(TYPE) : null;
    if (picked && picked.filter(keyed).length) return { list: picked.filter(keyed), name: (typeof win.hmvC6SelectionName === 'function' && win.hmvC6SelectionName(TYPE)) || 'Bộ câu hỏi đã chọn' };
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = sets.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), demo = sets.filter(function (s) { return /^mau-\d/.test(String(s.id)); });
    var order = mine.concat(demo), best = null;
    for (var i = 0; i < order.length; i++) { var l = (order[i].questions || []).filter(keyed); if (l.length >= 4) { best = { list: l, name: order[i].name || order[i].setTitle || 'Bộ câu hỏi' }; break; } }
    if (best) return best;
    var qd = (win.questionData || []).filter(keyed); return { list: qd, name: 'Câu hỏi hiện tại' };
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function teamName(i) { return String(cfg.names[i] || DEF.names[i]); }
  function Q() { return S && S.questions[S.q]; }

  /* ---------- Âm thanh hiệu ứng (Web Audio, offline) ---------- */
  /* 2.7: tiếng ĐÚNG/SAI (tệp mp3) lúc chấm; không phát được thì dùng tiếng bíp cũ. */
  function ds(ok) { if (!cfg.sound) return; var fb = function () { tone(ok ? 'right' : 'wrong'); }; if (win.hmvDungSai) win.hmvDungSai.play(ok, 0.8, fb); else fb(); }
  function tone(kind) {
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return;
      if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime;
      if (kind === 'pop') { var o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(90, now + .12); g.gain.setValueAtTime(.3, now); g.gain.exponentialRampToValueAtTime(.001, now + .14); o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + .15); return; }
      var seq = kind === 'right' ? [659, 880, 1175] : kind === 'wrong' ? [220, 165] : kind === 'end' ? [523, 659, 784, 1046] : [440];
      seq.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = now + .06 + i * .12; o.type = kind === 'wrong' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(kind === 'wrong' ? .2 : .32, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .22); });
    } catch (e) {}
  }

  /* ---------- Camera ---------- */
  function setStatus(text) { var e = doc.getElementById('bbStatus'); if (e && e.textContent !== text) e.textContent = text; }
  function camLabel() { var b = doc.getElementById('bbCamBtn'); if (b) { b.textContent = '📷 Camera: ' + (cam === 'off' ? 'Tắt' : cam === 'ready' ? 'Bật' : 'Đang mở…'); b.setAttribute('aria-pressed', cam === 'off' ? 'false' : 'true'); } var st = doc.getElementById('bbStage'); if (st) st.classList.toggle('has-cam', cam !== 'off'); }
  function attach() { var v = doc.getElementById('bbVideo'); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function stopCamera(note) {
    if (win.hmvHandCamera) win.hmvHandCamera.stop();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    var v = doc.getElementById('bbVideo'); if (v) v.srcObject = null;
    cam = 'off'; camMode = ''; if (note !== undefined) camNote = note; clearPointers(); camLabel(); hint();
  }
  function startCamera() {
    if (!S || cam !== 'off') return;
    if (!win.isSecureContext || location.protocol === 'file:') { camNote = 'Camera cần chạy bằng địa chỉ localhost. Bấm chuột hoặc chạm vào bóng để chơi.'; hint(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote = 'Trình duyệt không hỗ trợ camera. Bấm chuột hoặc chạm vào bóng để chơi.'; hint(); return; }
    cam = 'opening'; camNote = ''; camLabel(); setStatus('Đang mở camera…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }).then(function (s) {
      if (!S || game().type !== TYPE || cam !== 'opening') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; cam = 'loading'; attach(); camLabel(); setStatus('Đang tải AI nhận diện bàn tay…');
      if (!win.hmvHandCamera) { stopCamera('Thiếu tệp ban-tay-camera.js nên chưa dùng được camera. Bấm chuột hoặc chạm vào bóng.'); return; }
      win.hmvHandCamera.start(s, function (frame) { if (stream === s) feed(frame.points || []); }).then(function (info) {
        if (stream !== s) return; cam = 'ready'; camMode = info && info.mode || 'hand'; noHandSince = performance.now(); camLabel(); hint();
      }).catch(function (e) { if (stream !== s) return; stopCamera('Chưa dùng được camera: ' + ((e && e.userMessage) || 'không tải được bộ nhận diện.') + ' Bấm chuột hoặc chạm vào bóng để chơi.'); toast('Chưa có bộ nhận diện bàn tay · chơi bằng chuột hoặc chạm'); });
    }).catch(function (e) {
      cam = 'off'; camNote = (e && e.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera.' : e && e.name === 'NotFoundError' ? 'Không tìm thấy camera.' : 'Không mở được camera.') + ' Bấm chuột hoặc chạm vào bóng để chơi.'; camLabel(); hint();
    });
  }
  function toggleCamera() { if (!S || S.phase === 'end') return; if (cam === 'off') { cfg.control = 'camera'; saveCfg(); startCamera(); } else { cfg.control = 'touch'; saveCfg(); stopCamera('Camera đã tắt. Bấm chuột hoặc chạm vào bóng để chơi.'); } }
  function hint() {
    if (!S || S.phase !== 'ask') return;
    if (S.paused) { setStatus('Đang tạm dừng'); return; }
    if (cam === 'ready') setStatus(camMode === 'face' ? 'Đưa mũi chạm vào quả bóng và giữ yên một chút!' : 'Giơ tay chạm vào quả bóng và giữ yên một chút!');
    else if (cam === 'off') setStatus(camNote || 'Bấm chuột hoặc chạm vào quả bóng có đáp án đúng');
  }

  /* ---------- Con trỏ bàn tay và chạm bóng ---------- */
  function clearPointers() { var box = doc.getElementById('bbPointers'); if (box) box.innerHTML = ''; doc.querySelectorAll('#bbStage .bb-balloon').forEach(function (b) { b.style.setProperty('--p', '0'); b.classList.remove('hover'); }); if (S) S.dwell = [0, 0, 0, 0]; }
  function feed(points) {
    var stage = doc.getElementById('bbStage'), box = doc.getElementById('bbPointers'), video = doc.getElementById('bbVideo');
    if (!S || !stage || !box) return;
    var now = performance.now(), dt = Math.min(200, now - (S.lastFeed || now)); S.lastFeed = now;
    if (S.phase !== 'ask' || S.paused || !onStage()) { if (box.children.length) clearPointers(); return; }
    var W = stage.clientWidth, H = stage.clientHeight, vw = video && video.videoWidth || 4, vh = video && video.videoHeight || 3, scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale, ox = (W - dw) / 2, oy = (H - dh) / 2;
    var px = points.slice(0, 2).map(function (p, i) { var x = ox + (1 - p.x) * dw, y = oy + p.y * dh, old = S.smooth && S.smooth[i]; if (old) { x = old.x + (x - old.x) * .55; y = old.y + (y - old.y) * .55; } return { x: x, y: y }; });
    S.smooth = px;
    while (box.children.length < px.length) { var d = doc.createElement('i'); d.className = 'bb-pointer'; box.appendChild(d); }
    while (box.children.length > px.length) box.removeChild(box.lastChild);
    px.forEach(function (p, i) { box.children[i].style.transform = 'translate(' + (p.x - 22) + 'px,' + (p.y - 22) + 'px)'; });
    if (px.length) noHandSince = now; else if (now - noHandSince > 1800) setStatus(camMode === 'face' ? 'Đứng vào giữa khung hình để camera thấy khuôn mặt' : 'Giơ tay lên trước camera để điều khiển');
    if (px.length && now - noHandSince < 50) hint();
    var sr = stage.getBoundingClientRect(), anyInside = false, balloons = stage.querySelectorAll('.bb-balloon');
    var inside = Array.prototype.map.call(balloons, function (b) {
      if (b.disabled) return false;
      var r = b.getBoundingClientRect(), cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height * .45, rx = r.width * .52, ry = r.height * .5;
      var hit = px.some(function (p) { var dx = (p.x - cx) / rx, dy = (p.y - cy) / ry; return dx * dx + dy * dy <= 1; });
      if (hit) anyInside = true; return hit;
    });
    /* Chống chọn nhầm: câu mới hiện ra mà tay đang nằm sẵn trên một quả bóng thì phải đưa tay ra ngoài trước. */
    if (!S.armed) { if (!anyInside && now - S.askAt > 700) S.armed = true; else return; }
    for (var i = 0; i < balloons.length; i++) {
      S.dwell[i] = inside[i] ? (S.dwell[i] || 0) + dt : Math.max(0, (S.dwell[i] || 0) - dt * 2);
      balloons[i].style.setProperty('--p', Math.min(1, S.dwell[i] / cfg.dwell).toFixed(3));
      balloons[i].classList.toggle('hover', !!inside[i]);
      if (S.dwell[i] >= cfg.dwell) { pick(i, 'camera'); return; }
    }
  }

  /* ---------- Luật chơi ---------- */
  function begin() {
    var form = doc.getElementById('bbSetup'); if (form) collect();
    var src = source(); if (!src.list.length) { toast('Chưa có câu hỏi A–B–C–D hoặc Đúng/Sai. Vào Kho câu hỏi, chọn một bộ rồi bấm Chơi ngay.'); return; }
    var list = shuffle(src.list.slice()), n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10);
    stopCamera('');
    S = { questions: list.slice(0, n), sourceName: src.name, q: 0, phase: 'ask', paused: false, score: [0, 0], right: [0, 0], turn: 0, picked: null, outcome: null, left: Number(cfg.time) || 0, nextLeft: null, dwell: [0, 0, 0, 0], armed: false, askAt: performance.now(), startedAt: Date.now(), history: [] };
    game().type = TYPE; game().started = true;
    clearInterval(timer); lastT = Date.now(); timer = setInterval(tick, 200); if (win.hmvTran) win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return !!(S && S.paused); } });
    tone('start'); render(true);
    if (cfg.control === 'camera') startCamera(); else { camNote = ''; hint(); }
    setTimeout(function () { var e = doc.querySelector('.bb-game'); if (e && e.scrollIntoView && !doc.fullscreenElement && !doc.body.classList.contains('hmv-game-full')) e.scrollIntoView({ block: 'start' }); }, 60);
  }
  function pick(i, how) {
    var q = Q(); if (!S || S.phase !== 'ask' || S.paused || !q || i < 0 || i >= q.answers.length) return;
    var ok = i === Number(q.correct), t = cfg.mode === 'teams' ? S.turn : 0;
    S.phase = 'done'; S.picked = i; S.outcome = { ok: ok, why: how || 'click', team: t };
    if (typeof win.hmvRec === 'function') win.hmvRec(TYPE, Q(), i, ok);   /* 2.1: ghi cho Phân tích sau trò chơi */
    if (ok) { S.score[t] += 10; S.right[t]++; }
    S.history.push({ q: S.q, ok: ok, team: t });
    S.nextLeft = rv(ok ? 2.4 : 3.6);
    tone('pop'); ds(ok);
    paint(); if (ok) burst();
  }
  function timeout() { if (!S || S.phase !== 'ask') return; if (typeof win.hmvRec === 'function') win.hmvRec(TYPE, Q(), null, false); S.phase = 'done'; S.picked = null; S.outcome = { ok: false, why: 'timeout', team: cfg.mode === 'teams' ? S.turn : 0 }; S.history.push({ q: S.q, ok: false, team: S.outcome.team }); S.nextLeft = rv(3.6); ds(false); paint(); }
  /* 2.15: thời gian hiện đáp án trước khi chuyển câu lấy theo Luật trận đấu (để trống = mặc định của trò). */
  function rv(d) { var v = win.hmvTran ? win.hmvTran.reveal(TYPE, null) : null; return v === null || v === undefined ? d : v; }
  function next() {
    if (!S || S.phase !== 'done') return;
    if (S.q + 1 >= S.questions.length) { finish(); return; }
    S.q++; S.phase = 'ask'; S.picked = null; S.outcome = null; S.nextLeft = null; S.left = Number(cfg.time) || 0; S.dwell = [0, 0, 0, 0]; S.armed = false; S.askAt = performance.now(); S.smooth = null;
    if (cfg.mode === 'teams') S.turn = S.q % 2;
    paint(); hint();
  }
  function finish() { if (!S) return; S.phase = 'end'; S.nextLeft = null; clearInterval(timer); timer = 0; stopCamera('');
    /* 2.3: tiếng mừng lúc kết thúc (tệp mp3); không phát được thì dùng tiếng cũ. */
    if (cfg.sound && win.hmvMung) win.hmvMung.play(0.8, function () { tone('end'); }, function () { return !!(S && S.phase === 'end' && game().type === TYPE); }); else tone('end');
    render(true); burst(); }
  function pause() { if (!S || S.phase === 'end') return; S.paused = !S.paused; lastT = Date.now(); clearPointers(); paint(); hint(); }
  function back() { clearInterval(timer); timer = 0; stopCamera(''); S = null; game().type = null; game().started = false; if (typeof win.renderGames === 'function') win.renderGames(); }
  function tick() {
    var now = Date.now(), dt = Math.max(0, Math.min(1, (now - lastT) / 1000)); lastT = now;
    if (!S) { clearInterval(timer); timer = 0; return; }
    /* Giáo viên mở trò khác hoặc rời đi mà không bấm Thoát: tắt camera ngay. */
    if (game().type !== TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; return; }
    if (S.phase === 'end' || S.paused || !onStage() || win.hmvHold) return;   /* 2.4: đang đọc to câu hỏi thì đồng hồ tạm chờ */
    if (S.phase === 'ask' && cfg.time > 0) { S.left = Math.max(0, S.left - dt); var e = doc.getElementById('bbTimer'); if (e) { var n = Math.ceil(S.left); e.textContent = n; e.classList.toggle('hurry', n <= 5); } if (S.left <= 0) timeout(); }
    else if (S.phase === 'done' && S.nextLeft !== null) { S.nextLeft -= dt; var a = doc.getElementById('bbAuto'); if (a) a.textContent = Math.max(1, Math.ceil(S.nextLeft)); if (S.nextLeft <= 0) next(); }
  }

  /* ---------- Giao diện ---------- */
  function fontFor(text) { var n = String(text).length; return n <= 4 ? 1.9 : n <= 9 ? 1.45 : n <= 18 ? 1.08 : n <= 32 ? .9 : .76; }
  function balloonsHtml(q) {
    var n = q.answers.length, xs = n === 2 ? [30, 70] : n === 3 ? [20, 50, 80] : [14, 38, 62, 86], ys = n === 2 ? [52, 52] : n === 3 ? [54, 48, 54] : [54, 46, 54, 46];
    return q.answers.map(function (a, i) { return '<button type="button" class="bb-balloon" data-bb-pick="' + i + '" style="left:' + xs[i] + '%;top:' + ys[i] + '%;--c:' + COLORS[i] + ';--d:' + (i * -0.7) + 's;--f:' + fontFor(a) + '"><span class="bb-body"><b>' + String.fromCharCode(65 + i) + '</b><span class="bb-text">' + esc(a) + '</span></span><i class="bb-string"></i></button>'; }).join('');
  }
  function hudHtml() {
    if (cfg.mode === 'teams') return [0, 1].map(function (i) { return '<span class="bb-chip' + (S.phase !== 'end' && S.turn === i ? ' turn' : '') + '" style="--team:' + TEAM[i] + '"><b>' + esc(teamName(i)) + '</b><strong>' + S.score[i] + '</strong></span>'; }).join('');
    return '<span class="bb-chip turn" style="--team:#7c3aed"><b>Điểm</b><strong>' + S.score[0] + '</strong></span>';
  }
  function bannerHtml(q) {
    var o = S.outcome; if (!o) return '';
    var who = cfg.mode === 'teams' ? esc(teamName(o.team)) + ' ' : '', last = S.q + 1 >= S.questions.length;
    var msg = o.ok ? '✅ ' + (who ? who + 'trả lời đúng!' : 'Chính xác!') + ' +10 điểm' : (o.why === 'timeout' ? '⏰ Hết giờ.' : '❌ ' + (who ? who + 'chưa đúng.' : 'Chưa đúng.')) + ' Đáp án đúng: <b>' + String.fromCharCode(65 + Number(q.correct)) + '. ' + esc(q.answers[Number(q.correct)]) + '</b>';
    return '<div class="bb-banner ' + (o.ok ? 'good' : 'bad') + '"><div>' + msg + '</div>' + (q.explanation ? '<small>' + esc(q.explanation) + '</small>' : '') + '<small>' + (S.paused ? 'Đang tạm dừng' : (last ? 'Xem kết quả sau ' : 'Câu tiếp theo sau ') + '<b id="bbAuto">' + Math.max(1, Math.ceil(S.nextLeft || 1)) + '</b> giây') + ' · <button type="button" class="bb-link" data-bb="next">' + (last ? 'Xem kết quả ngay' : 'Chuyển ngay') + '</button></small></div>';
  }
  /* Vẽ lại phần thay đổi theo câu hỏi; giữ nguyên khung và video để hình camera không bị nháy. */
  function paint() {
    var stage = doc.getElementById('bbStage'), q = Q(); if (!S || !stage || !q) return;
    var sub = doc.getElementById('bbSub'); if (sub) sub.textContent = 'Câu ' + (S.q + 1) + '/' + S.questions.length + (cfg.mode === 'teams' ? ' · Lượt của ' + teamName(S.turn) : '') + ' · ' + S.sourceName;
    doc.getElementById('bbHud').innerHTML = hudHtml() + (cfg.time > 0 ? '<span class="bb-timer" id="bbTimer">' + Math.ceil(S.left) + '</span>' : '');
    var qel = doc.getElementById('bbQuestion'); qel.textContent = q.text || q.question || ''; qel.dataset.f0 = '1';   /* cỡ chữ do fit() tự thu cho vừa khung */
    var box = doc.getElementById('bbBalloons');
    if (box.dataset.q !== String(S.q)) { box.dataset.q = String(S.q); box.innerHTML = balloonsHtml(q); clearPointers(); }
    Array.prototype.forEach.call(box.querySelectorAll('.bb-balloon'), function (b, i) {
      var done = S.phase === 'done';
      b.disabled = done || S.paused;
      b.classList.toggle('right', done && i === Number(q.correct));
      b.classList.toggle('wrong', done && S.picked === i && i !== Number(q.correct));
      b.classList.toggle('fade', done && i !== Number(q.correct) && S.picked !== i);
      b.classList.toggle('popped', done && S.picked === i);
      if (done) { b.style.setProperty('--p', '0'); b.classList.remove('hover'); }
    });
    doc.getElementById('bbBanner').innerHTML = S.phase === 'done' ? bannerHtml(q) : '';
    stage.classList.toggle('paused', !!S.paused); stage.classList.toggle('done', S.phase === 'done');
    var pb = doc.getElementById('bbPauseBtn'); if (pb) pb.textContent = S.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
    var st = doc.getElementById('bbStatus'); if (st) st.hidden = S.phase !== 'ask';
    fit(); if (win.requestAnimationFrame) win.requestAnimationFrame(fit);
    camLabel();
  }
  /* Câu hỏi dài không được che bóng: thu chữ cho vừa tối đa 1/3 khung, rồi dồn các quả bóng vào vùng còn trống bên dưới câu hỏi. */
  function fit() {
    var stage = doc.getElementById('bbStage'), qel = doc.getElementById('bbQuestion'), box = doc.getElementById('bbBalloons'); if (!stage || !qel || !box) return;
    var H = stage.clientHeight; if (!H) return;
    var f = Number(qel.dataset.f0) || 1; qel.style.setProperty('--f', String(f));
    for (var i = 0; i < 10 && qel.offsetHeight > H * .32 && f > .42; i++) { f *= .9; qel.style.setProperty('--f', f.toFixed(3)); }
    var top = qel.offsetTop + qel.offsetHeight + 10, bottom = 58, h = Math.max(150, H - top - bottom);
    box.style.setProperty('--bbt', top + 'px'); box.style.setProperty('--bbb', bottom + 'px'); box.style.setProperty('--bbh', h + 'px');
  }
  win.addEventListener('resize', function () { fit(); });
  doc.addEventListener('fullscreenchange', function () { setTimeout(fit, 120); });
  function burst() { var st = doc.getElementById('bbStage') || doc.querySelector('.bb-end'); if (!st) return; var c = doc.createElement('div'); c.className = 'bb-confetti'; c.innerHTML = Array.from({ length: 26 }, function (_, i) { return '<i style="--i:' + i + '"></i>'; }).join(''); st.appendChild(c); setTimeout(function () { c.remove(); }, 2200); }
  function stars(p) { var n = p >= .8 ? 3 : p >= .5 ? 2 : 1; return '★'.repeat(n) + '<span>' + '★'.repeat(3 - n) + '</span>'; }
  function timeOpts(cur) { return [0, 5, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120, 180].map(function (n) { return opt(n, cur, n ? n + ' giây' : 'Không giới hạn'); }).join(''); }
  function opt(v, cur, label) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + label + '</option>'; }
  function setupHtml() {
    var src = source(), ok = src.list.length > 0;
    return '<div class="bb-setup-screen"><div class="page-title"><div><h2>🎈 BÓNG BAY TRI THỨC</h2><p>Giơ tay chạm vào quả bóng có đáp án đúng. Camera AI nhận diện bàn tay, không cần chạm vào máy.</p></div><div class="toolbar"><button class="btn soft" data-bb="back">← Thư viện</button></div></div>'
      + '<div class="bb-setup" id="bbSetup"><section class="bb-how"><ol><li><span class="bb-step s1"></span><b>Đứng trước camera</b><small>Cả lớp thấy mình trên màn hình như soi gương.</small></li><li><span class="bb-step s2"></span><b>Giơ tay chạm bóng</b><small>Chấm sáng đi theo ngón tay trỏ. Chạm vào quả bóng có đáp án đúng.</small></li><li><span class="bb-step s3"></span><b>Giữ yên một giây</b><small>Bóng nổ, ứng dụng tự chấm và tự sang câu tiếp theo.</small></li></ol><p class="bb-privacy">Camera chỉ dùng để tìm vị trí bàn tay ngay trên máy này. Ứng dụng không nhận diện danh tính, không lưu và không gửi hình ảnh. Không có camera vẫn chơi được bằng chuột, chạm màn hình hoặc phím 1–4.</p></section>'
      + '<section class="bb-form"><p class="bb-source">' + (ok ? 'Bộ câu hỏi: <b>' + esc(src.name) + '</b> · <b>' + src.list.length + '</b> câu dùng được (A–B–C–D, Đúng/Sai).' : '<span class="bb-warn">Chưa có câu hỏi A–B–C–D hoặc Đúng/Sai. Vào Kho câu hỏi, chọn một bộ rồi bấm “Chơi ngay → Bóng bay tri thức”.</span>') + ' <button class="bb-link" type="button" data-bb="kho">Chọn bộ khác trong Kho</button></p>'
      + '<div class="bb-grid"><label>Cách chơi<select id="bbMode">' + opt('solo', cfg.mode, 'Cả lớp chung điểm') + opt('teams', cfg.mode, 'Hai đội luân phiên') + '</select></label><label>Số câu<select id="bbCount">' + opt('5', cfg.count, '5 câu') + opt('10', cfg.count, '10 câu') + opt('all', cfg.count, 'Tất cả') + '</select></label><label>Thời gian mỗi câu<select id="bbTime">' + timeOpts(cfg.time) + '</select></label><label>Điều khiển<select id="bbControl">' + opt('camera', cfg.control, '📷 Camera – chạm bằng tay') + opt('touch', cfg.control, '🖱 Chuột hoặc chạm màn hình') + '</select></label><label>Giữ tay bao lâu thì chọn<select id="bbDwell">' + opt(600, cfg.dwell, '0,6 giây (nhanh)') + opt(800, cfg.dwell, '0,8 giây') + opt(1100, cfg.dwell, '1,1 giây (chắc chắn)') + '</select></label><label>Tiếng hiệu ứng<select id="bbSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label><label class="bb-team-name">Tên đội 1<input id="bbName0" class="input" maxlength="20" value="' + esc(teamName(0)) + '"></label><label class="bb-team-name">Tên đội 2<input id="bbName1" class="input" maxlength="20" value="' + esc(teamName(1)) + '"></label></div>'
      + '<button class="btn color bb-start" data-bb="start"' + (ok ? '' : ' disabled') + '>▶ Bắt đầu chơi</button></section></div></div>';
  }
  function playHtml() {
    return '<div class="bb-game"><div class="page-title"><div><h2>🎈 BÓNG BAY TRI THỨC</h2><p id="bbSub"></p></div><div class="toolbar"><button class="btn soft" id="bbPauseBtn" data-bb="pause">Ⅱ Tạm dừng</button><button class="btn soft" id="bbCamBtn" data-bb="camera">📷 Camera: Tắt</button><button class="btn soft" data-bb="back">Thoát</button></div></div>'
      + '<div class="bb-stage" id="bbStage"><video id="bbVideo" class="bb-video" autoplay muted playsinline></video><div class="bb-sky" aria-hidden="true"><i></i><i></i><i></i></div><div class="bb-shade" aria-hidden="true"></div>'
      + '<div class="bb-hud" id="bbHud"></div><div class="bb-question" id="bbQuestion"></div><div class="bb-balloons" id="bbBalloons"></div><div class="bb-pointers" id="bbPointers" aria-hidden="true"></div><div id="bbBanner"></div><div class="bb-status" id="bbStatus" role="status"></div><div class="bb-pause-veil">ĐANG TẠM DỪNG</div></div></div>';
  }
  function endHtml() {
    var total = S.questions.length, teams = cfg.mode === 'teams', right = S.right[0] + (teams ? S.right[1] : 0), head, lines;
    if (teams) { var w = S.score[0] === S.score[1] ? -1 : S.score[0] > S.score[1] ? 0 : 1; head = w < 0 ? '🤝 Hai đội hòa nhau!' : '🏆 ' + esc(teamName(w)) + ' chiến thắng!'; lines = [0, 1].map(function (i) { return '<p><b style="color:' + TEAM[i] + '">' + esc(teamName(i)) + '</b>: ' + S.score[i] + ' điểm · đúng ' + S.right[i] + ' câu</p>'; }).join(''); }
    else { head = right === total ? '🏆 Tuyệt vời, đúng hết!' : right >= total * .5 ? '🎉 Làm tốt lắm!' : '💪 Cố gắng thêm nhé!'; lines = '<p>Đúng <b>' + right + '/' + total + '</b> câu · <b>' + S.score[0] + '</b> điểm</p>'; }
    return '<div class="bb-game"><div class="page-title"><div><h2>🎈 BÓNG BAY TRI THỨC</h2><p>Kết quả · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn soft" data-bb="back">← Thư viện</button></div></div><div class="bb-end"><div class="bb-stars">' + stars(total ? right / total : 0) + '</div><h2>' + head + '</h2>' + lines + '<div class="bb-end-actions"><button class="btn color" data-bb="start">↻ Chơi lại</button><button class="btn soft" data-bb="back">← Về thư viện</button></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return;
    if (!S) { g.innerHTML = setupHtml(); syncTeamFields(); return; }
    if (S.phase === 'end') { if (force || !g.querySelector('.bb-end')) g.innerHTML = endHtml(); return; }
    if (force || !doc.getElementById('bbStage')) { g.innerHTML = playHtml(); attach(); }
    paint(); hint();
  }
  function syncTeamFields() { var m = doc.getElementById('bbMode'); doc.querySelectorAll('.bb-team-name').forEach(function (l) { l.hidden = !m || m.value !== 'teams'; }); }
  function collect() {
    var v = function (id) { var e = doc.getElementById(id); return e ? e.value : null; };
    if (v('bbMode') === null) return;
    cfg.mode = v('bbMode') === 'teams' ? 'teams' : 'solo'; cfg.count = v('bbCount') || '10'; cfg.time = Number(v('bbTime')) || 0; cfg.control = v('bbControl') === 'touch' ? 'touch' : 'camera'; cfg.dwell = Number(v('bbDwell')) || 800; cfg.sound = v('bbSound') === '1';
    cfg.names = [String(v('bbName0') || '').trim() || DEF.names[0], String(v('bbName1') || '').trim() || DEF.names[1]];
    saveCfg();
  }

  /* ---------- Sự kiện ---------- */
  doc.addEventListener('click', function (e) {
    if (game().type !== TYPE) return;
    var g = games(); if (!g || !g.contains(e.target)) return;
    var p = e.target.closest('[data-bb-pick]'); if (p) { pick(Number(p.dataset.bbPick), 'click'); return; }
    var b = e.target.closest('[data-bb]'); if (!b || b.disabled) return;
    var a = b.dataset.bb;
    if (a === 'start') begin(); else if (a === 'back') back(); else if (a === 'pause') pause(); else if (a === 'camera') toggleCamera(); else if (a === 'next') next();
    else if (a === 'kho') { back(); if (typeof win.openView === 'function') win.openView('questions'); }
  });
  doc.addEventListener('change', function (e) { if (e.target && e.target.id === 'bbMode') syncTeamFields(); });
  doc.addEventListener('keydown', function (e) {
    if (game().type !== TYPE || !S || S.phase === 'end' || !onStage()) return;
    var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.altKey || e.metaKey || doc.querySelector('#khoModal,#c6QuestionModal,#qbStage7Modal,dialog[open]')) return;
    var k = String(e.key || '').toLowerCase();
    if (/^[1-4]$/.test(k)) { e.preventDefault(); if (!e.repeat) pick(Number(k) - 1, 'key'); }
    else if (/^[a-d]$/.test(k)) { e.preventDefault(); if (!e.repeat) pick(k.charCodeAt(0) - 97, 'key'); }
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) pause(); }
    else if (k === 'enter' && S.phase === 'done') { e.preventDefault(); next(); }
  });
  doc.addEventListener('visibilitychange', function () { lastT = Date.now(); });

  /* ---------- Gắn vào ứng dụng ---------- */
  var baseSetup = win.gameSetup, baseRender = win.renderGames, baseStart = win.gameStart, baseOpen = win.openView;
  win.gameSetup = function (t) { if (t === TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; win.classroomGame = { type: TYPE, started: false }; render(true); return; } return baseSetup.apply(this, arguments); };
  win.renderGames = function () { if (game().type === TYPE) { render(false); return; } var out = baseRender.apply(this, arguments); decorateCard(); return out; };
  win.gameStart = function () { if (game().type === TYPE) { begin(); return; } return baseStart.apply(this, arguments); };
  /* Rời mục Trò chơi khi đang chơi: tắt camera và đóng trò chơi. */
  if (typeof baseOpen === 'function') win.openView = function (id) { if (id !== 'games' && game().type === TYPE) back(); var out = baseOpen.apply(this, arguments); if (id === 'games') setTimeout(decorateCard, 0); return out; };
  function decorateCard() {
    var g = games(); if (!g) return;
    Array.prototype.forEach.call(g.querySelectorAll('.game-library-card'), function (card) {
      var h = card.querySelector('h3'); if (!h || h.textContent.trim() !== 'Bóng bay tri thức' || card.dataset.bb) return;
      card.dataset.bb = '1'; card.classList.add('bb-card');
      var tags = card.querySelectorAll('.game-tags span'); if (tags[0]) tags[0].textContent = '👥 Cả lớp hoặc 2 đội'; if (tags[1]) tags[1].textContent = '📷 Camera AI · chạm bằng tay';
      var badge = doc.createElement('span'); badge.className = 'bb-new'; badge.textContent = 'Mới'; card.appendChild(badge);
      var help = Array.prototype.find.call(card.querySelectorAll('button'), function (b) { return /Hướng dẫn/.test(b.textContent); }); if (help) help.onclick = function (ev) { ev.stopPropagation(); toast('Giơ tay chạm vào quả bóng có đáp án đúng và giữ 1 giây. Không có camera thì bấm chuột hoặc chạm màn hình.'); };
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', decorateCard); else setTimeout(decorateCard, 0);

  win.balloonBack = back;
  win.hmvBalloon = {
    musicState: function () { return !S || S.phase === 'end' ? 'stop' : S.paused ? 'hold' : 'play'; },
    state: function () { return { settings: JSON.parse(JSON.stringify(cfg)), match: S ? { q: S.q, total: S.questions.length, phase: S.phase, paused: S.paused, score: S.score.slice(), right: S.right.slice(), turn: S.turn, picked: S.picked, outcome: S.outcome, left: S.left, nextLeft: S.nextLeft, armed: S.armed, dwell: S.dwell.slice(), question: Q() ? { text: Q().text, answers: Q().answers.slice(), correct: Number(Q().correct) } : null, source: S.sourceName } : null, camera: cam, cameraMode: camMode, cameraNote: camNote, streaming: !!stream }; },
    feed: feed
  };
})();
