/* BAN-CHINH 2.9 · Trò chơi "Giơ tay giành quyền": camera thay cho chuông bấm.
 *
 * Hình camera chia thành 2–4 ô dọc, mỗi ô là chỗ đứng của một đội (mỗi đội cử một bạn đứng trước camera).
 * Giáo viên bấm "Giơ tay!" → đếm 3-2-1 → "GIƠ TAY!": đội nào có bàn tay giơ thẳng lên trong ô của mình trước thì giành quyền trả lời.
 * Giơ tay trước hiệu lệnh thì mất lượt ở câu đó. Đội trả lời sai: các đội còn lại được giơ tay giành quyền tiếp.
 * Bộ nhận diện bàn tay (MediaPipe Hand Landmarker) chạy ngay trên máy; chỉ dùng tọa độ các khớp tay, không lưu, không gửi hình ảnh.
 *
 * Không có camera vẫn chơi được: giáo viên bấm vào ô của đội (hoặc phím 1–4) để trao quyền.
 * Dùng mọi câu trong Kho câu hỏi: câu có đáp án thì giáo viên bấm phương án đội nói, máy tự chấm; câu mở thì bấm ✓ Đúng / ✗ Sai.
 */
(function () {
  'use strict';
  var doc = document, win = window, TYPE = 'raise-hand', SKEY = 'hmv_raise_hand_settings_v1';
  var DEF = { teams: 2, names: ['Đội Đỏ', 'Đội Xanh', 'Đội Vàng', 'Đội Tím'], count: '10', answerTime: 15, openTime: 20, transfer: true, early: true, autoGo: true, control: 'camera', hold: 300, sound: true };
  var TEAM = ['#ef4444', '#2563eb', '#eab308', '#9333ea'];
  var cfg = Object.assign({}, DEF, read(SKEY, {})); cfg.names = (cfg.names || []).concat(DEF.names).slice(0, 4);
  var S = null, timer = 0, lastT = 0, stream = null, cam = 'off', camNote = '', actx = null;

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function saveCfg() { try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function games() { return doc.getElementById('games'); }
  function game() { return win.classroomGame || {}; }
  function onStage() { var g = games(); return !!(g && g.classList.contains('active') && game().type === TYPE && !doc.hidden); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function teamName(i) { return String(cfg.names[i] || DEF.names[i]); }
  function nTeams() { return S ? S.n : Math.max(2, Math.min(4, Number(cfg.teams) || 2)); }
  function stageEl() { return doc.getElementById('rhStage'); }

  /* ---------- Câu hỏi ---------- */
  function usable(q) { return !!(q && String(q.text || q.question || '').trim()); }
  function keyed(q) { var a = q && q.answers || [], c = q ? Number(q.correct) : NaN; return a.length >= 2 && a.length <= 6 && Number.isInteger(c) && c >= 0 && c < a.length && q.correct !== null && q.correct !== '' && a.every(function (x) { return String(x || '').trim(); }); }
  function source() {
    var picked = typeof win.hmvC6QuestionsForGame === 'function' ? win.hmvC6QuestionsForGame(TYPE) : null;
    if (picked && picked.filter(usable).length) return { list: picked.filter(usable), name: (typeof win.hmvC6SelectionName === 'function' && win.hmvC6SelectionName(TYPE)) || 'Bộ câu hỏi đã chọn' };
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = sets.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), demo = sets.filter(function (s) { return /^mau-\d/.test(String(s.id)); });
    var order = mine.concat(demo);
    for (var i = 0; i < order.length; i++) { var l = (order[i].questions || []).filter(usable); if (l.length >= 4) return { list: l, name: order[i].name || order[i].setTitle || 'Bộ câu hỏi' }; }
    return { list: (win.questionData || []).filter(usable), name: 'Câu hỏi hiện tại' };
  }
  function Q() { return S && S.questions[S.q]; }

  /* ---------- Âm thanh ---------- */
  function ds(ok) { if (!cfg.sound) return; var fb = function () { tone(ok ? 'right' : 'wrong'); }; if (win.hmvDungSai) win.hmvDungSai.play(ok, 0.8, fb); else fb(); }
  function tone(kind) {
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return;
      if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime, seq = kind === 'tick' ? [880] : kind === 'go' ? [988, 1318] : kind === 'claim' ? [740, 980, 1240] : kind === 'early' ? [196] : kind === 'right' ? [659, 880, 1175] : kind === 'wrong' ? [220, 165] : kind === 'end' ? [523, 659, 784, 1046] : [440];
      seq.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = now + .03 + i * .1; o.type = kind === 'wrong' || kind === 'early' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(kind === 'tick' ? .14 : .3, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'go' ? .3 : .18)); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .32); });
    } catch (e) {}
  }

  /* ---------- Camera ---------- */
  function setStatus(text) { var e = doc.getElementById('rhStatus'); if (e && e.textContent !== text) e.textContent = text; }
  function camLabel() { var b = doc.getElementById('rhCamBtn'); if (b) { b.textContent = '📷 Camera: ' + (cam === 'off' ? 'Tắt' : cam === 'ready' ? 'Bật' : 'Đang mở…'); b.setAttribute('aria-pressed', cam === 'off' ? 'false' : 'true'); } var st = stageEl(); if (st) st.classList.toggle('has-cam', cam !== 'off'); }
  function attach() { var v = doc.getElementById('rhVideo'); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function stopCamera(note) {
    if (win.hmvHandCamera) win.hmvHandCamera.stop();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    var v = doc.getElementById('rhVideo'); if (v) v.srcObject = null;
    cam = 'off'; if (note !== undefined) camNote = note; clearMarks(); camLabel(); hint();
  }
  function startCamera() {
    if (!S || cam !== 'off') return;
    if (!win.isSecureContext || location.protocol === 'file:') { camNote = 'Camera cần chạy bằng địa chỉ localhost hoặc https. Bấm vào ô của đội để trao quyền.'; hint(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote = 'Trình duyệt không hỗ trợ camera. Bấm vào ô của đội để trao quyền.'; hint(); return; }
    cam = 'opening'; camNote = ''; camLabel(); setStatus('Đang mở camera…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (s) {
      if (!S || game().type !== TYPE || cam !== 'opening') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; cam = 'loading'; attach(); camLabel(); setStatus('Đang tải AI nhận diện bàn tay…');
      if (!win.hmvHandCamera) { stopCamera('Thiếu tệp ban-tay-camera.js nên chưa dùng được camera. Bấm vào ô của đội để trao quyền.'); return; }
      win.hmvHandCamera.start(s, function (frame) { if (stream === s) feed(frame); }, { numHands: 6, full: true }).then(function (info) {
        if (stream !== s) return;
        if (info && info.mode !== 'hand') { stopCamera('Máy chưa có bộ nhận diện bàn tay. Bấm vào ô của đội để trao quyền.'); return; }
        cam = 'ready'; camLabel(); hint();
      }).catch(function (e) { if (stream !== s) return; stopCamera('Chưa dùng được camera: ' + ((e && e.userMessage) || 'không tải được bộ nhận diện.') + ' Bấm vào ô của đội để trao quyền.'); toast('Chưa có bộ nhận diện bàn tay · giáo viên bấm vào ô của đội'); });
    }).catch(function (e) {
      cam = 'off'; camNote = (e && e.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera.' : e && e.name === 'NotFoundError' ? 'Không tìm thấy camera.' : 'Không mở được camera.') + ' Bấm vào ô của đội để trao quyền.'; camLabel(); hint();
    });
  }
  function toggleCamera() { if (!S || S.phase === 'end') return; if (cam === 'off') { cfg.control = 'camera'; saveCfg(); startCamera(); } else { cfg.control = 'touch'; saveCfg(); stopCamera('Camera đã tắt. Bấm vào ô của đội để trao quyền.'); } }
  function hint() {
    if (!S || S.phase === 'end') return;
    if (S.paused) { setStatus('Đang tạm dừng'); return; }
    var camOn = cam === 'ready';
    if (S.phase === 'ready') setStatus(camOn || cfg.control === 'camera' ? 'Mỗi đội một bạn đứng trong ô màu · nghe xong câu hỏi thì bấm ▶ Giơ tay!' : 'Nghe xong câu hỏi thì bấm ▶ Giơ tay! (hoặc phím cách)');
    else if (S.phase === 'count') setStatus('Chưa giơ tay! Chờ hiệu lệnh…');
    else if (S.phase === 'open' || S.phase === 'reopen') setStatus(camOn ? 'Giơ thẳng tay lên trong ô của đội mình!' : 'Bấm vào ô của đội giơ tay trước (hoặc phím số của đội)');
    else if (S.phase === 'answer') setStatus(teamName(S.claimed) + ' trả lời · ' + (keyed(Q()) ? 'bấm phương án đội nói (phím A–D)' : 'bấm ✓ Đúng hoặc ✗ Sai'));
    if (camNote && cam === 'off' && (S.phase === 'ready' || S.phase === 'open')) setStatus(camNote);
  }

  /* ---------- Nhận diện bàn tay giơ lên ---------- */
  function clearMarks() { var box = doc.getElementById('rhMarks'); if (box) box.innerHTML = ''; if (S) S.since = [0, 0, 0, 0]; }
  function raisedOf(lm, vw, vh) {
    var size = Math.hypot((lm[9].x - lm[0].x) * vw, (lm[9].y - lm[0].y) * vh); if (size < 4) return false;
    var up = function (tip, pip) { return lm[tip].y < lm[pip].y; };
    var top = Math.min(lm[8].y, lm[12].y);
    return (lm[0].y - top) * vh > size * 0.9 && up(8, 6) && up(12, 10);   /* bàn tay dựng đứng, ngón trỏ và ngón giữa chỉ lên trời */
  }
  function feed(frame) {
    var stage = stageEl(), box = doc.getElementById('rhMarks'), video = doc.getElementById('rhVideo');
    if (!S || !stage || !box) return;
    var now = performance.now();
    if (S.phase === 'end' || S.paused || !onStage()) { if (box.children.length) clearMarks(); return; }
    var W = stage.clientWidth, H = stage.clientHeight, vw = video && video.videoWidth || 16, vh = video && video.videoHeight || 9, scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale, ox = (W - dw) / 2, oy = (H - dh) / 2, n = S.n;
    var hands = (frame.hands || []).filter(function (lm) { return lm && lm.length >= 21; }).map(function (lm) {
      var cx = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5, cy = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5, mx = 1 - cx;
      return { z: Math.max(0, Math.min(n - 1, Math.floor(mx * n))), up: raisedOf(lm, vw, vh), x: ox + mx * dw, y: oy + cy * dh, top: Math.min(lm[8].y, lm[12].y) };
    });
    var upZone = [false, false, false, false], topY = [1, 1, 1, 1];
    hands.forEach(function (h) { if (h.up) { upZone[h.z] = true; topY[h.z] = Math.min(topY[h.z], h.top); } });
    for (var z = 0; z < 4; z++) S.since[z] = upZone[z] ? (S.since[z] || now) : 0;
    while (box.children.length < hands.length) { var d = doc.createElement('i'); d.className = 'rh-mark'; d.textContent = '✋'; box.appendChild(d); }
    while (box.children.length > hands.length) box.removeChild(box.lastChild);
    hands.forEach(function (h, i) { var el = box.children[i]; el.style.transform = 'translate(' + Math.round(h.x - 30) + 'px,' + Math.round(h.y - 30) + 'px)'; el.style.setProperty('--team', TEAM[h.z]); el.classList.toggle('up', h.up); });
    var ready = function (z) { return S.since[z] && now - S.since[z] >= cfg.hold; };
    if (S.phase === 'count' && cfg.early) { for (z = 0; z < n; z++) if (!S.locked[z] && ready(z)) early(z); return; }
    if (S.phase !== 'open') return;
    var best = -1;
    for (z = 0; z < n; z++) { if (S.locked[z] || !ready(z)) continue; if (best < 0 || S.since[z] < S.since[best] || (S.since[z] === S.since[best] && topY[z] < topY[best])) best = z; }
    if (best >= 0) claim(best, 'camera');
  }

  /* ---------- Luật chơi ---------- */
  function begin() {
    var form = doc.getElementById('rhSetup'); if (form) collect();
    var src = source(); if (!src.list.length) { toast('Chưa có câu hỏi. Vào Kho câu hỏi, chọn một bộ rồi bấm Chơi ngay.'); return; }
    var list = shuffle(src.list.slice()), n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10), t = nTeams();
    stopCamera('');
    S = { questions: list.slice(0, n), sourceName: src.name, n: t, q: 0, phase: 'ready', paused: false, score: [0, 0, 0, 0], right: [0, 0, 0, 0], claims: [0, 0, 0, 0], early: [0, 0, 0, 0], locked: [false, false, false, false], since: [0, 0, 0, 0], claimed: -1, chosen: null, countLeft: 0, openLeft: 0, ansLeft: 0, reLeft: 0, outcome: null, nextLeft: null, note: '', history: [] };
    game().type = TYPE; game().started = true;
    clearInterval(timer); lastT = Date.now(); timer = setInterval(tick, 100); if (win.hmvTran) win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return !!(S && S.paused); } });
    tone('start'); render(true);
    if (cfg.control === 'camera') startCamera(); else { camNote = ''; hint(); }
    setTimeout(function () { var e = doc.querySelector('.rh-game'); if (e && e.scrollIntoView && !doc.fullscreenElement && !doc.body.classList.contains('hmv-game-full')) e.scrollIntoView({ block: 'start' }); }, 60);
  }
  function go() {
    if (!S || S.phase !== 'ready' || S.paused) return;
    if (S.locked.slice(0, S.n).every(Boolean)) return;
    S.phase = 'count'; S.countLeft = 3; S.note = ''; S.since = [0, 0, 0, 0]; tone('tick'); paint(); hint();
  }
  function early(z) {
    if (!S || S.locked[z]) return;
    S.locked[z] = true; S.early[z]++; S.note = '⛔ ' + teamName(z) + ' giơ tay trước hiệu lệnh – mất lượt câu này'; tone('early'); toast(S.note);
    if (S.locked.slice(0, S.n).every(Boolean)) { S.phase = 'open'; reveal('none'); return; }
    paint();
  }
  function open() { S.phase = 'open'; S.openLeft = Number(cfg.openTime) || 20; S.since = [0, 0, 0, 0]; tone('go'); paint(); hint(); flash('GIƠ TAY!'); }
  function claim(z, how) {
    if (!S || S.phase !== 'open' || S.paused || z < 0 || z >= S.n || S.locked[z]) return;
    S.phase = 'answer'; S.claimed = z; S.claims[z]++; S.chosen = null; S.ansLeft = Number(cfg.answerTime) || 0; S.claimHow = how; S.note = '';
    tone('claim'); paint(); hint(); flash('🙋 ' + teamName(z));
  }
  function answer(i) {
    var q = Q(); if (!S || S.phase !== 'answer' || S.paused || !q) return;
    if (keyed(q)) { if (i < 0 || i >= q.answers.length) return; S.chosen = i; judge(i === Number(q.correct), 'answer'); }
  }
  function judge(ok, why) {
    var q = Q(), z = S.claimed; if (!S || S.phase !== 'answer' || z < 0) return;
    if (typeof win.hmvRec === 'function' && keyed(q)) win.hmvRec(TYPE, q, S.chosen, ok);   /* ghi cho Phân tích sau trò chơi (không ghi tên đội) */
    if (ok) { S.score[z] += 10; S.right[z]++; ds(true); S.phase = 'done'; S.outcome = { ok: true, team: z }; S.history.push({ q: S.q, team: z, ok: true }); S.nextLeft = rv(4); paint(); burst(); return; }
    ds(false); S.locked[z] = true; S.history.push({ q: S.q, team: z, ok: false });
    S.note = '❌ ' + teamName(z) + (why === 'timeout' ? ' hết giờ trả lời' : ' trả lời chưa đúng');
    var left = []; for (var t = 0; t < S.n; t++) if (!S.locked[t]) left.push(t);
    if (cfg.transfer && left.length) { S.phase = 'reopen'; S.reLeft = 1.6; S.claimed = -1; S.chosen = null; paint(); setStatus(S.note + ' · Các đội còn lại chuẩn bị giơ tay!'); return; }
    reveal('wrong');
  }
  function reveal(why) {
    if (!S) return; S.phase = 'done'; S.outcome = { ok: false, why: why, team: S.claimed }; S.nextLeft = rv(5); paint();
    if (why === 'none' && typeof win.hmvRec === 'function' && keyed(Q())) win.hmvRec(TYPE, Q(), null, false);
  }
  /* 2.15: thời gian hiện đáp án trước khi chuyển câu lấy theo Luật trận đấu (để trống = mặc định của trò). */
  function rv(d) { var v = win.hmvTran ? win.hmvTran.reveal(TYPE, null) : null; return v === null || v === undefined ? d : v; }
  function next() {
    if (!S || S.phase !== 'done') return;
    if (S.q + 1 >= S.questions.length) { finish(); return; }
    S.q++; S.phase = 'ready'; S.claimed = -1; S.chosen = null; S.outcome = null; S.nextLeft = null; S.note = ''; S.locked = [false, false, false, false]; S.since = [0, 0, 0, 0];
    paint(); hint();
  }
  function finish() {
    if (!S) return; S.phase = 'end'; S.nextLeft = null; clearInterval(timer); timer = 0; stopCamera('');
    var top = Math.max.apply(null, S.score.slice(0, S.n)), winners = S.score.slice(0, S.n).filter(function (x) { return x === top; }).length;
    if (top > 0 && winners === 1 && cfg.sound && win.hmvMung) win.hmvMung.play(0.8, function () { tone('end'); }, function () { return !!(S && S.phase === 'end' && game().type === TYPE); }); else tone('end');
    render(true); burst();
  }
  function pause() { if (!S || S.phase === 'end') return; S.paused = !S.paused; lastT = Date.now(); clearMarks(); paint(); hint(); }
  function back() { clearInterval(timer); timer = 0; stopCamera(''); S = null; game().type = null; game().started = false; if (typeof win.renderGames === 'function') win.renderGames(); }
  function tick() {
    var now = Date.now(), dt = Math.max(0, Math.min(1, (now - lastT) / 1000)); lastT = now;
    if (!S) { clearInterval(timer); timer = 0; return; }
    if (game().type !== TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; return; }
    if (S.phase === 'end' || S.paused || !onStage() || win.hmvHold) return;   /* đang đọc to câu hỏi thì đồng hồ tạm chờ */
    if (S.phase === 'count') { var before = Math.ceil(S.countLeft); S.countLeft -= dt; var after = Math.ceil(S.countLeft); if (S.countLeft <= 0) open(); else if (after !== before) { tone('tick'); paintBig(); } }
    else if (S.phase === 'reopen') { S.reLeft -= dt; if (S.reLeft <= 0) open(); }
    else if (S.phase === 'open') { S.openLeft -= dt; paintTimer(Math.ceil(S.openLeft)); if (S.openLeft <= 0) reveal('none'); }
    else if (S.phase === 'answer' && cfg.answerTime > 0) { S.ansLeft -= dt; paintTimer(Math.ceil(S.ansLeft)); if (S.ansLeft <= 0) judge(false, 'timeout'); }
    else if (S.phase === 'done' && S.nextLeft !== null) { S.nextLeft -= dt; var a = doc.getElementById('rhAuto'); if (a) a.textContent = Math.max(1, Math.ceil(S.nextLeft)); if (S.nextLeft <= 0) next(); }
  }

  /* ---------- Giao diện ---------- */
  function flash(text) { var st = stageEl(); if (!st) return; var f = doc.createElement('div'); f.className = 'rh-flash'; f.textContent = text; st.appendChild(f); setTimeout(function () { f.remove(); }, 1300); }
  function paintTimer(n) { var e = doc.getElementById('rhTimer'); if (!e) return; e.hidden = !(n > 0); e.textContent = n; e.classList.toggle('hurry', n <= 5); }
  function paintBig() { var b = doc.getElementById('rhBig'); if (!b || !S) return; b.hidden = S.phase !== 'count'; if (S.phase === 'count') b.textContent = Math.max(1, Math.ceil(S.countLeft)); }
  function fontQ(t) { var n = String(t).length; return n > 110 ? .66 : n > 70 ? .76 : n > 36 ? .88 : 1; }
  function hudHtml() {
    return Array.from({ length: S.n }, function (_, i) { return '<span class="bb-chip rh-chip' + (S.claimed === i ? ' turn' : '') + (S.locked[i] ? ' locked' : '') + '" style="--team:' + TEAM[i] + '"><b>' + esc(teamName(i)) + '</b><strong>' + S.score[i] + '</strong></span>'; }).join('') + '<span class="bb-timer rh-timer" id="rhTimer" hidden></span>';
  }
  function zonesHtml() { return Array.from({ length: S.n }, function (_, i) { return '<button type="button" class="rh-zone" data-rh-zone="' + i + '" style="--team:' + TEAM[i] + '"><span class="rh-zone-name"><kbd>' + (i + 1) + '</kbd>' + esc(teamName(i)) + '</span><span class="rh-zone-state"></span></button>'; }).join(''); }
  function answersHtml(q) {
    if (!keyed(q)) return '<div class="rh-answers open"><span class="rh-open-note">Câu trả lời nói – thầy cô chấm</span></div>';
    return '<div class="rh-answers n' + q.answers.length + '">' + q.answers.map(function (a, i) { return '<button type="button" class="rh-ans" data-rh-ans="' + i + '"><b>' + String.fromCharCode(65 + i) + '</b><span class="rh-ans-text">' + esc(a) + '</span></button>'; }).join('') + '</div>';
  }
  function bannerHtml(q) {
    var o = S.outcome; if (!o) return '';
    var last = S.q + 1 >= S.questions.length, key = keyed(q) ? ' Đáp án đúng: <b>' + String.fromCharCode(65 + Number(q.correct)) + '. ' + esc(q.answers[Number(q.correct)]) + '</b>' : '';
    var msg = o.ok ? '✅ ' + esc(teamName(o.team)) + ' trả lời đúng! +10 điểm' : o.why === 'none' ? '⏰ Không đội nào giành được quyền.' + key : '❌ Chưa đội nào trả lời đúng.' + key;
    return '<div class="bb-banner ' + (o.ok ? 'good' : 'bad') + ' rh-banner"><div>' + msg + '</div>' + (q.explanation ? '<small>' + esc(q.explanation) + '</small>' : '') + '<small>' + (S.paused ? 'Đang tạm dừng' : (last ? 'Xem kết quả sau ' : 'Câu tiếp theo sau ') + '<b id="rhAuto">' + Math.max(1, Math.ceil(S.nextLeft || 1)) + '</b> giây') + ' · <button type="button" class="bb-link" data-rh="next">' + (last ? 'Xem kết quả ngay' : 'Chuyển ngay') + '</button></small></div>';
  }
  function controlsHtml(q) {
    if (S.phase === 'ready') return '<button type="button" class="btn color rh-go" data-rh="go">▶ Giơ tay!</button>';
    if (S.phase === 'answer') return '<div class="rh-claimed" style="--team:' + TEAM[S.claimed] + '"><b>🙋 ' + esc(teamName(S.claimed)) + ' giành quyền!</b>' + (keyed(q) ? '<small>Bấm phương án đội trả lời</small>' : '<span><button type="button" class="btn rh-ok" data-rh="ok">✓ Đúng</button><button type="button" class="btn rh-bad" data-rh="bad">✗ Sai</button></span>') + '</div>';
    if (S.note) return '<div class="rh-note">' + esc(S.note) + '</div>';
    return '';
  }
  function paint() {
    var stage = stageEl(), q = Q(); if (!S || !stage || !q) return;
    var sub = doc.getElementById('rhSub'); if (sub) sub.textContent = 'Câu ' + (S.q + 1) + '/' + S.questions.length + ' · ' + S.n + ' đội · ' + S.sourceName;
    doc.getElementById('rhHud').innerHTML = hudHtml();
    var qel = doc.getElementById('rhQuestion'); if (qel.dataset.q !== String(S.q)) { qel.dataset.q = String(S.q); qel.textContent = q.text || q.question || ''; qel.style.setProperty('--f', fontQ(q.text || q.question || '')); doc.getElementById('rhAnswers').innerHTML = answersHtml(q); }
    var zones = doc.getElementById('rhZones'); if (zones.dataset.n !== String(S.n)) { zones.dataset.n = String(S.n); zones.innerHTML = zonesHtml(); zones.style.setProperty('--n', S.n); }
    Array.prototype.forEach.call(zones.querySelectorAll('.rh-zone'), function (zb, i) {
      zb.classList.toggle('locked', !!S.locked[i]); zb.classList.toggle('claimed', S.claimed === i && (S.phase === 'answer' || (S.phase === 'done' && S.outcome && S.outcome.ok)));
      zb.classList.toggle('waiting', S.phase === 'open' && !S.locked[i]);
      var s = zb.querySelector('.rh-zone-state'), text = S.locked[i] ? '🔒 Mất lượt' : S.claimed === i && S.phase === 'answer' ? '🙋 Đang trả lời' : S.phase === 'open' ? 'Giơ tay!' : '';
      if (s.textContent !== text) s.textContent = text; zb.disabled = S.phase !== 'open' || !!S.locked[i] || S.paused;
    });
    Array.prototype.forEach.call(doc.querySelectorAll('#rhAnswers .rh-ans'), function (b, i) {
      var done = S.phase === 'done', correct = keyed(q) && i === Number(q.correct);
      b.disabled = S.phase !== 'answer' || S.paused;
      b.classList.toggle('live', S.phase === 'answer'); b.classList.toggle('right', done && correct); b.classList.toggle('wrong', S.chosen === i && !correct && (done || S.phase === 'reopen')); b.classList.toggle('fade', done && !correct);
    });
    doc.getElementById('rhControls').innerHTML = controlsHtml(q);
    doc.getElementById('rhBanner').innerHTML = S.phase === 'done' ? bannerHtml(q) : '';
    paintBig(); paintTimer(S.phase === 'open' ? Math.ceil(S.openLeft) : S.phase === 'answer' && cfg.answerTime > 0 ? Math.ceil(S.ansLeft) : 0);
    stage.classList.toggle('paused', !!S.paused); stage.classList.toggle('done', S.phase === 'done'); stage.dataset.phase = S.phase;
    var pb = doc.getElementById('rhPauseBtn'); if (pb) pb.textContent = S.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
    var st = doc.getElementById('rhStatus'); if (st) st.hidden = S.phase === 'done';
    camLabel();
  }
  function burst() { var st = stageEl() || doc.querySelector('.rh-end'); if (!st) return; var c = doc.createElement('div'); c.className = 'bb-confetti'; c.innerHTML = Array.from({ length: 24 }, function (_, i) { return '<i style="--i:' + i + '"></i>'; }).join(''); st.appendChild(c); setTimeout(function () { c.remove(); }, 2200); }
  function opt(v, cur, label) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + label + '</option>'; }
  function setupHtml() {
    var src = source(), ok = src.list.length > 0, t = nTeams();
    return '<div class="bb-setup-screen rh-setup-screen"><div class="page-title"><div><h2>🙋 GIƠ TAY GIÀNH QUYỀN</h2><p>Camera nhìn thấy đội nào giơ tay trước thì đội đó được trả lời – như bấm chuông nhưng bằng tay thật.</p></div><div class="toolbar"><button class="btn soft" data-rh="back">← Thư viện</button></div></div>'
      + '<div class="bb-setup" id="rhSetup"><section class="bb-how rh-how"><ol><li><b>Mỗi đội cử một bạn đứng trước camera</b><small>Đứng đúng ô màu của đội mình trên màn hình, cách camera khoảng 1,5–2,5 mét, tay để xuống.</small></li><li><b>Nghe câu hỏi, chờ hiệu lệnh</b><small>Thầy cô bấm “Giơ tay!”, màn hình đếm 3-2-1. Giơ tay sớm là mất lượt câu đó.</small></li><li><b>“GIƠ TAY!” – giơ thẳng tay lên</b><small>Đội giơ tay trước được trả lời. Trả lời sai thì các đội còn lại được giành quyền.</small></li></ol><p class="bb-privacy">Camera chỉ dùng để tìm vị trí bàn tay ngay trên máy này. Ứng dụng không nhận diện danh tính, không lưu và không gửi hình ảnh. Không có camera vẫn chơi được: thầy cô bấm vào ô của đội giơ tay trước.</p></section>'
      + '<section class="bb-form"><p class="bb-source">' + (ok ? 'Bộ câu hỏi: <b>' + esc(src.name) + '</b> · <b>' + src.list.length + '</b> câu (mọi loại câu; câu nói thì thầy cô chấm).' : '<span class="bb-warn">Chưa có câu hỏi. Vào Kho câu hỏi, chọn một bộ rồi bấm “Chơi ngay → Giơ tay giành quyền”.</span>') + ' <button class="bb-link" type="button" data-rh="kho">Chọn bộ khác trong Kho</button></p>'
      + '<div class="bb-grid"><label>Số đội<select id="rhTeams">' + opt(2, t, '2 đội') + opt(3, t, '3 đội') + opt(4, t, '4 đội') + '</select></label><label>Số câu<select id="rhCount">' + opt('5', cfg.count, '5 câu') + opt('10', cfg.count, '10 câu') + opt('all', cfg.count, 'Tất cả') + '</select></label>'
      + [0, 1, 2, 3].map(function (i) { return '<label class="rh-team-name" data-i="' + i + '"' + (i < t ? '' : ' hidden') + '>Tên đội ' + (i + 1) + '<input id="rhName' + i + '" class="input" maxlength="20" value="' + esc(teamName(i)) + '"></label>'; }).join('')
      + '<label>Thời gian trả lời<select id="rhAnswerTime">' + [0, 5, 10, 15, 20, 30, 45, 60, 90].map(function (n) { return opt(n, cfg.answerTime, n ? n + ' giây' : 'Không giới hạn'); }).join('') + '</select></label><label>Thời gian chờ giơ tay<select id="rhOpenTime">' + [10, 15, 20, 30, 45, 60, 90].map(function (n) { return opt(n, cfg.openTime, n + ' giây'); }).join('') + '</select></label>'
      + '<label>Trả lời sai<select id="rhTransfer">' + opt(1, cfg.transfer ? 1 : 0, 'Đội khác được giành quyền') + opt(0, cfg.transfer ? 1 : 0, 'Công bố đáp án') + '</select></label><label>Giơ tay trước hiệu lệnh<select id="rhEarly">' + opt(1, cfg.early ? 1 : 0, 'Mất lượt câu đó') + opt(0, cfg.early ? 1 : 0, 'Không phạt') + '</select></label>'
      + '<label>Sau khi máy đọc xong câu hỏi<select id="rhAutoGo">' + opt(1, cfg.autoGo ? 1 : 0, 'Tự đếm 3-2-1') + opt(0, cfg.autoGo ? 1 : 0, 'Chờ thầy cô bấm') + '</select></label><label>Điều khiển<select id="rhControl">' + opt('camera', cfg.control, '📷 Camera – giơ tay thật') + opt('touch', cfg.control, '🖱 Thầy cô bấm ô của đội') + '</select></label>'
      + '<label>Giữ tay bao lâu thì tính<select id="rhHold">' + opt(200, cfg.hold, '0,2 giây (nhanh)') + opt(300, cfg.hold, '0,3 giây') + opt(500, cfg.hold, '0,5 giây (chắc chắn)') + '</select></label><label>Tiếng hiệu ứng<select id="rhSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label></div>'
      + '<button class="btn color bb-start" data-rh="start"' + (ok ? '' : ' disabled') + '>▶ Bắt đầu chơi</button></section></div></div>';
  }
  function playHtml() {
    return '<div class="rh-game"><div class="page-title"><div><h2>🙋 GIƠ TAY GIÀNH QUYỀN</h2><p id="rhSub"></p></div><div class="toolbar"><button class="btn soft" id="rhPauseBtn" data-rh="pause">Ⅱ Tạm dừng</button><button class="btn soft" id="rhCamBtn" data-rh="camera">📷 Camera: Tắt</button><button class="btn soft" data-rh="back">Thoát</button></div></div>'
      + '<div class="bb-stage rh-stage" id="rhStage"><video id="rhVideo" class="bb-video" autoplay muted playsinline></video><div class="bb-shade" aria-hidden="true"></div><div class="rh-zones" id="rhZones"></div>'
      + '<div class="bb-hud rh-hud" id="rhHud"></div><div class="rh-qbox"><div class="rh-question" id="rhQuestion"></div><div id="rhAnswers"></div></div>'
      + '<div class="rh-marks" id="rhMarks" aria-hidden="true"></div><div class="rh-big" id="rhBig" hidden></div><div class="rh-controls" id="rhControls"></div><div id="rhBanner"></div><div class="bb-status rh-status" id="rhStatus" role="status"></div><div class="bb-pause-veil">ĐANG TẠM DỪNG</div></div></div>';
  }
  function endHtml() {
    var order = Array.from({ length: S.n }, function (_, i) { return i; }).sort(function (a, b) { return S.score[b] - S.score[a]; }), top = S.score[order[0]], tie = order.filter(function (i) { return S.score[i] === top; }).length > 1;
    var head = top === 0 ? '💪 Cùng cố gắng ở lượt sau nhé!' : tie ? '🤝 Các đội dẫn đầu bằng điểm nhau!' : '🏆 ' + esc(teamName(order[0])) + ' chiến thắng!';
    var rows = order.map(function (i, k) { return '<tr><td>' + (k + 1) + '</td><td><b style="color:' + TEAM[i] + '">' + esc(teamName(i)) + '</b></td><td><b>' + S.score[i] + '</b></td><td>' + S.right[i] + '</td><td>' + S.claims[i] + '</td><td>' + S.early[i] + '</td></tr>'; }).join('');
    return '<div class="rh-game"><div class="page-title"><div><h2>🙋 GIƠ TAY GIÀNH QUYỀN</h2><p>Kết quả · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn soft" data-rh="back">← Thư viện</button></div></div><div class="bb-end rh-end"><h2>' + head + '</h2><table class="rh-table"><thead><tr><th>Hạng</th><th>Đội</th><th>Điểm</th><th>Trả lời đúng</th><th>Giành quyền</th><th>Giơ sớm</th></tr></thead><tbody>' + rows + '</tbody></table><div class="bb-end-actions"><button class="btn color" data-rh="start">↻ Chơi lại</button><button class="btn soft" data-rh="back">← Về thư viện</button></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return;
    if (!S) { g.innerHTML = setupHtml(); return; }
    if (S.phase === 'end') { if (force || !g.querySelector('.rh-end')) g.innerHTML = endHtml(); return; }
    if (force || !stageEl()) { g.innerHTML = playHtml(); attach(); }
    paint(); hint();
  }
  function collect() {
    var v = function (id) { var e = doc.getElementById(id); return e ? e.value : null; };
    if (v('rhTeams') === null) return;
    cfg.teams = Math.max(2, Math.min(4, Number(v('rhTeams')) || 2)); cfg.count = v('rhCount') || '10'; cfg.answerTime = Number(v('rhAnswerTime')) || 0; cfg.openTime = Number(v('rhOpenTime')) || 20;
    cfg.transfer = v('rhTransfer') === '1'; cfg.early = v('rhEarly') === '1'; cfg.autoGo = v('rhAutoGo') === '1'; cfg.control = v('rhControl') === 'touch' ? 'touch' : 'camera'; cfg.hold = Number(v('rhHold')) || 300; cfg.sound = v('rhSound') === '1';
    cfg.names = [0, 1, 2, 3].map(function (i) { return String(v('rhName' + i) || '').trim() || DEF.names[i]; });
    saveCfg();
  }

  /* ---------- Sự kiện ---------- */
  doc.addEventListener('click', function (e) {
    if (game().type !== TYPE) return;
    var g = games(); if (!g || !g.contains(e.target)) return;
    var z = e.target.closest('[data-rh-zone]'); if (z) { claim(Number(z.dataset.rhZone), 'click'); return; }
    var a = e.target.closest('[data-rh-ans]'); if (a) { answer(Number(a.dataset.rhAns)); return; }
    var b = e.target.closest('[data-rh]'); if (!b || b.disabled) return;
    var act = b.dataset.rh;
    if (act === 'start') begin(); else if (act === 'back') back(); else if (act === 'pause') pause(); else if (act === 'camera') toggleCamera(); else if (act === 'next') next(); else if (act === 'go') go();
    else if (act === 'ok') judge(true, 'mark'); else if (act === 'bad') judge(false, 'mark');
    else if (act === 'kho') { back(); if (typeof win.openView === 'function') win.openView('questions'); }
  });
  doc.addEventListener('change', function (e) { if (game().type !== TYPE || S || !e.target || e.target.id !== 'rhTeams') return; var t = Number(e.target.value) || 2; doc.querySelectorAll('.rh-team-name').forEach(function (l) { l.hidden = Number(l.dataset.i) >= t; }); });
  doc.addEventListener('keydown', function (e) {
    if (game().type !== TYPE || !S || S.phase === 'end' || !onStage()) return;
    var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.altKey || e.metaKey || doc.querySelector('#khoModal,#c6QuestionModal,#qbStage7Modal,dialog[open]')) return;
    var k = String(e.key || '').toLowerCase(); if (e.repeat) return;
    if (k === ' ') { e.preventDefault(); if (S.phase === 'ready') go(); else pause(); }
    else if (k === 'enter' && S.phase === 'done') { e.preventDefault(); next(); }
    else if (S.phase === 'open' && /^[1-4]$/.test(k)) { e.preventDefault(); claim(Number(k) - 1, 'key'); }
    else if (S.phase === 'answer' && /^[1-6]$/.test(k)) { e.preventDefault(); answer(Number(k) - 1); }
    else if (S.phase === 'answer' && /^[a-f]$/.test(k) && keyed(Q())) { e.preventDefault(); answer(k.charCodeAt(0) - 97); }
    else if (S.phase === 'answer' && !keyed(Q()) && (k === 'y' || k === 'n')) { e.preventDefault(); judge(k === 'y', 'mark'); }
  });
  doc.addEventListener('visibilitychange', function () { lastT = Date.now(); });
  /* Máy đọc xong câu hỏi (nút loa hoặc tự đọc) → tự đếm 3-2-1 nếu thầy cô chọn như vậy. */
  doc.addEventListener('hmv-doc-to-xong', function (e) { if (e && e.detail && e.detail.game === TYPE && e.detail.done && S && S.phase === 'ready' && cfg.autoGo && onStage()) go(); });

  /* ---------- Gắn vào ứng dụng ---------- */
  var baseSetup = win.gameSetup, baseRender = win.renderGames, baseStart = win.gameStart, baseOpen = win.openView;
  win.gameSetup = function (t) { if (t === TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; win.classroomGame = { type: TYPE, started: false }; render(true); return; } return baseSetup.apply(this, arguments); };
  win.renderGames = function () { if (game().type === TYPE) { render(false); return; } var out = baseRender.apply(this, arguments); decorateCard(); return out; };
  win.gameStart = function () { if (game().type === TYPE) { begin(); return; } return baseStart.apply(this, arguments); };
  if (typeof baseOpen === 'function') win.openView = function (id) { if (id !== 'games' && game().type === TYPE) back(); var out = baseOpen.apply(this, arguments); if (id === 'games') setTimeout(decorateCard, 0); return out; };
  function decorateCard() {
    var g = games(); if (!g) return;
    Array.prototype.forEach.call(g.querySelectorAll('.game-library-card'), function (card) {
      var h = card.querySelector('h3'); if (!h || h.textContent.trim() !== 'Giơ tay giành quyền' || card.dataset.rh) return;
      card.dataset.rh = '1'; card.classList.add('bb-card');
      var tags = card.querySelectorAll('.game-tags span'); if (tags[0]) tags[0].textContent = '👥 2–4 đội'; if (tags[1]) tags[1].textContent = '📷 Camera AI · giơ tay thay chuông';
      var badge = doc.createElement('span'); badge.className = 'bb-new'; badge.textContent = 'Mới'; card.appendChild(badge);
      var help = Array.prototype.find.call(card.querySelectorAll('button'), function (b) { return /Hướng dẫn/.test(b.textContent); }); if (help) help.onclick = function (ev) { ev.stopPropagation(); toast('Mỗi đội một bạn đứng trong ô màu của đội. Sau hiệu lệnh “GIƠ TAY!”, đội giơ tay trước được trả lời. Không có camera thì bấm vào ô của đội.'); };
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', decorateCard); else setTimeout(decorateCard, 0);

  win.raiseHandBack = back;
  win.hmvRaiseHand = {
    musicState: function () { return !S || S.phase === 'end' ? 'stop' : S.paused ? 'hold' : 'play'; },
    state: function () { return { settings: JSON.parse(JSON.stringify(cfg)), match: S ? { q: S.q, total: S.questions.length, n: S.n, phase: S.phase, paused: S.paused, score: S.score.slice(0, S.n), right: S.right.slice(0, S.n), claims: S.claims.slice(0, S.n), early: S.early.slice(0, S.n), locked: S.locked.slice(0, S.n), claimed: S.claimed, chosen: S.chosen, outcome: S.outcome, note: S.note, question: Q() ? { text: Q().text, answers: (Q().answers || []).slice(), correct: Q().correct, keyed: keyed(Q()) } : null, source: S.sourceName } : null, camera: cam, cameraNote: camNote, streaming: !!stream }; },
    feed: feed, go: go
  };
})();
