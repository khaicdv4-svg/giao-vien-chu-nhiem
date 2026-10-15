/* BAN-CHINH 2.9 · Trò chơi "Bàn tay phép thuật": phân loại bằng tay không trước camera.
 *
 * Mỗi lượt một tấm thẻ (một từ, một số đo góc, một phân số, một câu Đúng/Sai…) hiện trên hình camera của lớp.
 * Học sinh CHỤM ngón cái và ngón trỏ để "nhặt" thẻ, đưa tay tới đúng ô nhóm rồi MỞ TAY để thả.
 * Bộ nhận diện bàn tay (MediaPipe Hand Landmarker) chạy ngay trên máy; ứng dụng chỉ lấy tọa độ các khớp tay,
 * không lưu, không gửi hình ảnh. Ai chụm ngón khó thì đổi sang cách "giữ ngón trỏ yên trên thẻ".
 *
 * Luôn chơi được không cần camera: kéo thẻ bằng chuột / chạm màn hình, hoặc phím 1–4 để thả vào nhóm 1–4.
 * Bộ phân loại: 4 bộ mẫu theo sách Kết nối tri thức lớp 4, bộ giáo viên tự gõ, hoặc câu Đúng/Sai trong Kho câu hỏi.
 */
(function () {
  'use strict';
  var doc = document, win = window, TYPE = 'magic-hand', SKEY = 'hmv_magic_hand_settings_v1';
  var SETS = {
    'tu-loai': { name: 'Danh từ – Động từ – Tính từ (Tiếng Việt 4)', groups: ['Danh từ', 'Động từ', 'Tính từ'], items: [['học sinh', 'quyển vở', 'dòng sông', 'bầu trời', 'cô giáo', 'cái bàn', 'mùa xuân', 'con mèo'], ['chạy', 'viết', 'đọc', 'nhảy', 'hát', 'bơi', 'suy nghĩ', 'trồng cây'], ['xanh biếc', 'cao', 'chăm chỉ', 'đẹp', 'nhanh nhẹn', 'thông minh', 'ngọt', 'rộng']] },
    'goc': { name: 'Góc nhọn – vuông – tù – bẹt (Toán 4)', groups: ['Góc nhọn', 'Góc vuông', 'Góc tù', 'Góc bẹt'], items: [['Góc 30°', 'Góc 45°', 'Góc 60°', 'Góc 75°'], ['Góc 90°', 'Góc ở đỉnh hình vuông', 'Góc ở đỉnh hình chữ nhật'], ['Góc 100°', 'Góc 120°', 'Góc 135°', 'Góc 150°'], ['Góc 180°', 'Góc tạo bởi hai tia đối nhau']] },
    'phan-so': { name: 'Phân số bé hơn, bằng, lớn hơn 1 (Toán 4)', groups: ['Bé hơn 1', 'Bằng 1', 'Lớn hơn 1'], items: [['1/2', '3/4', '5/8', '2/7'], ['4/4', '9/9', '12/12', '6/6'], ['5/3', '7/4', '9/5', '11/6']] },
    'dan-nhiet': { name: 'Vật dẫn nhiệt tốt – kém (Khoa học 4)', groups: ['Dẫn nhiệt tốt', 'Dẫn nhiệt kém'], items: [['thìa nhôm', 'nồi đồng', 'xoong inox', 'dây thép', 'chảo gang', 'đinh sắt'], ['thìa gỗ', 'tay cầm bằng nhựa', 'áo len', 'bông', 'hộp xốp', 'găng tay vải']] }
  };
  var DEF = { set: 'tu-loai', custom: 'Con vật: con mèo, con gà, con cá\nĐồ vật: cái bàn, quyển sách, cây bút', mode: 'solo', count: '10', time: 0, grab: 'pinch', control: 'camera', dwell: 900, sound: true, names: ['Đội Xanh', 'Đội Cam'] };
  var BIN = ['#2563eb', '#16a34a', '#ea580c', '#9333ea'], TEAM = ['#2563eb', '#f97316'];
  var cfg = Object.assign({}, DEF, read(SKEY, {}));
  var S = null, timer = 0, lastT = 0, stream = null, cam = 'off', camMode = '', camNote = '', actx = null, noHandSince = 0;

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function saveCfg() { try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function games() { return doc.getElementById('games'); }
  function game() { return win.classroomGame || {}; }
  function onStage() { var g = games(); return !!(g && g.classList.contains('active') && game().type === TYPE && !doc.hidden); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function teamName(i) { return String(cfg.names[i] || DEF.names[i]); }
  function stageEl() { return doc.getElementById('mhStage'); }

  /* ---------- Bộ phân loại ---------- */
  function parseCustom(text) {
    var groups = [], items = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var m = /^\s*([^:：]{1,40})[:：](.*)$/.exec(line); if (!m || groups.length >= 4) return;
      var list = m[2].split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean); if (!list.length) return;
      groups.push(m[1].trim()); items.push(list.slice(0, 20));
    });
    return groups.length >= 2 ? { name: 'Bộ của thầy cô', groups: groups, items: items } : null;
  }
  function tfOf(q) {
    if (!q) return -1; var a = q.answers || [], c = Number(q.correct); if (a.length !== 2 || !Number.isInteger(c) || c < 0 || c > 1 || !String(q.text || q.question || '').trim()) return -1;
    var t = String(a[c] || '').trim().toLowerCase(); return /^đúng/.test(t) ? 0 : /^sai/.test(t) ? 1 : -1;
  }
  function khoTF() {
    var picked = typeof win.hmvC6QuestionsForGame === 'function' ? win.hmvC6QuestionsForGame(TYPE) : null;
    if (picked && picked.filter(function (q) { return tfOf(q) >= 0; }).length) return { list: picked.filter(function (q) { return tfOf(q) >= 0; }), name: (typeof win.hmvC6SelectionName === 'function' && win.hmvC6SelectionName(TYPE)) || 'Bộ câu hỏi đã chọn', picked: true };
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = sets.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), demo = sets.filter(function (s) { return /^mau-\d/.test(String(s.id)); });
    var order = mine.concat(demo);
    for (var i = 0; i < order.length; i++) { var l = (order[i].questions || []).filter(function (q) { return tfOf(q) >= 0; }); if (l.length >= 4) return { list: l, name: order[i].name || order[i].setTitle || 'Bộ câu hỏi' }; }
    return { list: [], name: '' };
  }
  /* Bộ đang dùng → {name, groups, items:[{text, g, q?}]} */
  function current() {
    var k = khoTF();
    if (k.picked || cfg.set === 'kho') return { name: 'Đúng hay Sai · ' + (k.name || 'Kho câu hỏi'), groups: ['Đúng', 'Sai'], items: k.list.map(function (q) { return { text: String(q.text || q.question).trim(), g: tfOf(q) }; }), kho: true };
    var s = cfg.set === 'custom' ? parseCustom(cfg.custom) : SETS[cfg.set] || SETS['tu-loai'];
    if (!s) return { name: 'Bộ của thầy cô', groups: [], items: [] };
    var items = []; s.items.forEach(function (list, g) { list.forEach(function (t) { items.push({ text: t, g: g }); }); });
    return { name: s.name, groups: s.groups.slice(), items: items };
  }
  function item() { return S && S.items[S.q]; }

  /* ---------- Âm thanh ---------- */
  function ds(ok) { if (!cfg.sound) return; var fb = function () { tone(ok ? 'right' : 'wrong'); }; if (win.hmvDungSai) win.hmvDungSai.play(ok, 0.8, fb); else fb(); }
  function tone(kind) {
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return;
      if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime, seq = kind === 'grab' ? [660] : kind === 'right' ? [659, 880, 1175] : kind === 'wrong' ? [220, 165] : kind === 'end' ? [523, 659, 784, 1046] : [440];
      seq.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = now + .03 + i * .11; o.type = kind === 'wrong' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(kind === 'grab' ? .12 : .28, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'grab' ? .09 : .2)); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .22); });
    } catch (e) {}
  }

  /* ---------- Camera ---------- */
  function setStatus(text) { var e = doc.getElementById('mhStatus'); if (e && e.textContent !== text) e.textContent = text; }
  function camLabel() { var b = doc.getElementById('mhCamBtn'); if (b) { b.textContent = '📷 Camera: ' + (cam === 'off' ? 'Tắt' : cam === 'ready' ? 'Bật' : 'Đang mở…'); b.setAttribute('aria-pressed', cam === 'off' ? 'false' : 'true'); } var st = stageEl(); if (st) st.classList.toggle('has-cam', cam !== 'off'); }
  function attach() { var v = doc.getElementById('mhVideo'); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function stopCamera(note) {
    if (win.hmvHandCamera) win.hmvHandCamera.stop();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    var v = doc.getElementById('mhVideo'); if (v) v.srcObject = null;
    cam = 'off'; camMode = ''; if (note !== undefined) camNote = note; clearPointers(); if (S && S.held === 'hand') home(); camLabel(); hint();
  }
  function startCamera() {
    if (!S || cam !== 'off') return;
    if (!win.isSecureContext || location.protocol === 'file:') { camNote = 'Camera cần chạy bằng địa chỉ localhost hoặc https. Kéo thẻ bằng chuột hoặc chạm màn hình.'; hint(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote = 'Trình duyệt không hỗ trợ camera. Kéo thẻ bằng chuột hoặc chạm màn hình.'; hint(); return; }
    cam = 'opening'; camNote = ''; camLabel(); setStatus('Đang mở camera…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }).then(function (s) {
      if (!S || game().type !== TYPE || cam !== 'opening') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; cam = 'loading'; attach(); camLabel(); setStatus('Đang tải AI nhận diện bàn tay…');
      if (!win.hmvHandCamera) { stopCamera('Thiếu tệp ban-tay-camera.js nên chưa dùng được camera. Kéo thẻ bằng chuột hoặc chạm màn hình.'); return; }
      win.hmvHandCamera.start(s, function (frame) { if (stream === s) feed(frame); }, { numHands: 2, full: true }).then(function (info) {
        if (stream !== s) return;
        if (info && info.mode !== 'hand') { stopCamera('Máy chỉ nạp được bộ nhận diện khuôn mặt, chưa có bộ nhận diện bàn tay. Kéo thẻ bằng chuột hoặc chạm màn hình.'); return; }
        cam = 'ready'; camMode = 'hand'; noHandSince = performance.now(); camLabel(); hint();
      }).catch(function (e) { if (stream !== s) return; stopCamera('Chưa dùng được camera: ' + ((e && e.userMessage) || 'không tải được bộ nhận diện.') + ' Kéo thẻ bằng chuột hoặc chạm màn hình.'); toast('Chưa có bộ nhận diện bàn tay · chơi bằng chuột hoặc chạm'); });
    }).catch(function (e) {
      cam = 'off'; camNote = (e && e.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera.' : e && e.name === 'NotFoundError' ? 'Không tìm thấy camera.' : 'Không mở được camera.') + ' Kéo thẻ bằng chuột hoặc chạm màn hình.'; camLabel(); hint();
    });
  }
  function toggleCamera() { if (!S || S.phase === 'end') return; if (cam === 'off') { cfg.control = 'camera'; saveCfg(); startCamera(); } else { cfg.control = 'touch'; saveCfg(); stopCamera('Camera đã tắt. Kéo thẻ bằng chuột hoặc chạm màn hình.'); } }
  function hint() {
    if (!S || S.phase !== 'ask') return;
    if (S.paused) { setStatus('Đang tạm dừng'); return; }
    if (S.held === 'hand') { setStatus(cfg.grab === 'pinch' ? 'Đưa thẻ tới đúng nhóm rồi MỞ TAY để thả' : 'Đưa thẻ tới đúng nhóm và giữ yên để thả'); return; }
    if (cam === 'ready') setStatus(cfg.grab === 'pinch' ? '🤏 Chụm ngón cái và ngón trỏ vào thẻ để nhặt thẻ' : '☝ Giữ ngón trỏ yên trên thẻ để nhặt thẻ');
    else if (cam === 'off') setStatus(camNote || 'Kéo thẻ vào đúng nhóm hoặc bấm phím số của nhóm');
  }

  /* ---------- Vị trí thẻ ---------- */
  function homePos() { var st = stageEl(); if (!st) return { x: 0, y: 0 }; return { x: st.clientWidth / 2, y: Math.max(150, st.clientHeight * 0.34) }; }
  function placeCard(x, y, anim) {
    var c = doc.getElementById('mhCard'); if (!c || !S) return;
    S.card = { x: x, y: y }; c.classList.toggle('glide', !!anim);
    c.style.transform = 'translate(' + Math.round(x - c.offsetWidth / 2) + 'px,' + Math.round(y - c.offsetHeight / 2) + 'px)';
  }
  function home() { if (!S) return; S.held = ''; S.binDw = [0, 0, 0, 0]; var h = homePos(), c = doc.getElementById('mhCard'); if (c) c.classList.remove('held'); placeCard(h.x, h.y, true); paintBins(); hint(); }
  function binRects() {
    var st = stageEl(); if (!st) return []; var sr = st.getBoundingClientRect();
    return Array.prototype.map.call(st.querySelectorAll('.mh-bin'), function (b) { var r = b.getBoundingClientRect(); return { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top }; });
  }
  function binAt(x, y) { var rs = binRects(); for (var i = 0; i < rs.length; i++) { var r = rs[i]; if (x >= r.l - 6 && x <= r.r + 6 && y >= r.t - 18 && y <= r.b + 6) return i; } return -1; }
  function binCenter(i) { var r = binRects()[i]; return r ? { x: (r.l + r.r) / 2, y: (r.t + r.b) / 2 } : homePos(); }
  function cardHit(x, y, pad) { var c = doc.getElementById('mhCard'); if (!c || !S || !S.card) return false; var w = c.offsetWidth / 2 + pad, h = c.offsetHeight / 2 + pad; return Math.abs(x - S.card.x) <= w && Math.abs(y - S.card.y) <= h; }

  /* ---------- Bàn tay: chụm để nhặt, mở để thả ---------- */
  function clearPointers() { var box = doc.getElementById('mhPointers'); if (box) box.innerHTML = ''; if (S) { S.smooth = null; S.pinch = [false, false]; S.dw = 0; } }
  function dist(a, b, vw, vh) { return Math.hypot((a.x - b.x) * vw, (a.y - b.y) * vh); }
  function feed(frame) {
    var stage = stageEl(), box = doc.getElementById('mhPointers'), video = doc.getElementById('mhVideo');
    if (!S || !stage || !box) return;
    var now = performance.now(), dt = Math.min(200, now - (S.lastFeed || now)); S.lastFeed = now;
    if (S.phase !== 'ask' || S.paused || !onStage()) { if (box.children.length) clearPointers(); if (S.held === 'hand') home(); return; }
    var W = stage.clientWidth, H = stage.clientHeight, vw = video && video.videoWidth || 16, vh = video && video.videoHeight || 9, scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale, ox = (W - dw) / 2, oy = (H - dh) / 2;
    var list = (frame.hands || []).slice(0, 2).filter(function (lm) { return lm && lm.length >= 21; });
    var hands = list.map(function (lm, i) {
      var size = Math.max(1e-6, dist(lm[0], lm[9], vw, vh)), ratio = dist(lm[4], lm[8], vw, vh) / size;
      var tip = cfg.grab === 'pinch' ? { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 } : lm[8];
      var x = ox + (1 - tip.x) * dw, y = oy + tip.y * dh, old = S.smooth && S.smooth[i];
      if (old) { x = old.x + (x - old.x) * .6; y = old.y + (y - old.y) * .6; }
      var was = !!(S.pinch && S.pinch[i]), closed = was ? ratio < 0.5 : ratio < 0.32;   /* có độ trễ để tay hơi run không làm rơi thẻ */
      return { x: x, y: y, closed: closed, edge: closed && !was };
    });
    S.smooth = hands.map(function (h) { return { x: h.x, y: h.y }; }); S.pinch = hands.map(function (h) { return h.closed; });
    while (box.children.length < hands.length) { var d = doc.createElement('i'); d.className = 'mh-pointer'; box.appendChild(d); }
    while (box.children.length > hands.length) box.removeChild(box.lastChild);
    hands.forEach(function (h, i) { var el = box.children[i]; el.style.transform = 'translate(' + (h.x - 24) + 'px,' + (h.y - 24) + 'px)'; el.classList.toggle('closed', cfg.grab === 'pinch' && h.closed); });
    if (hands.length) { if (S.noHandMsg) { S.noHandMsg = false; hint(); } noHandSince = now; } else if (now - noHandSince > 1800 && !S.noHandMsg) { S.noHandMsg = true; setStatus('Giơ tay lên trước camera để điều khiển'); }

    if (S.held === 'hand') {
      /* Bàn tay đang cầm thẻ: chọn bàn tay gần chỗ cầm nhất (hai bàn tay có thể đổi thứ tự giữa các khung hình). */
      var best = -1, bd = 1e9; hands.forEach(function (h, i) { var dd = Math.hypot(h.x - S.grip.x, h.y - S.grip.y); if (dd < bd) { bd = dd; best = i; } });
      if (hands.length === 1) bd = 0;   /* chỉ một bàn tay trong khung: luôn là tay đang cầm, kể cả khi tay đưa nhanh */
      if (best < 0 || bd > 240) { if (now - S.lostAt > 700) { home(); setStatus('Mất dấu bàn tay, thẻ quay về chỗ cũ'); } return; }
      S.lostAt = now; var h = hands[best]; S.grip = { x: h.x, y: h.y };
      placeCard(h.x + S.off.x, h.y + S.off.y, false);
      var k = binAt(S.card.x, S.card.y); paintBins(k);
      if (cfg.grab === 'pinch') { if (!h.closed) drop(k, 'camera'); return; }
      for (var j = 0; j < 4; j++) S.binDw[j] = j === k ? S.binDw[j] + dt : 0;
      paintBins(k); if (k >= 0 && S.binDw[k] >= cfg.dwell) drop(k, 'camera');
      return;
    }
    if (S.held) return;   /* đang kéo bằng chuột */
    /* Thẻ mới xuất hiện mà tay đang nằm sẵn trên thẻ: phải đưa tay ra ngoài (hoặc mở tay) trước, tránh nhặt nhầm. */
    if (!S.armed) { if (now - S.askAt > 600 && !hands.some(function (h) { return cardHit(h.x, h.y, 10) && (cfg.grab !== 'pinch' || h.closed); })) S.armed = true; else return; }
    var c = doc.getElementById('mhCard');
    if (cfg.grab === 'pinch') {
      for (var i = 0; i < hands.length; i++) if (hands[i].edge && cardHit(hands[i].x, hands[i].y, 40)) { grab(hands[i]); return; }
      return;
    }
    var on = hands.filter(function (h) { return cardHit(h.x, h.y, 10); })[0];
    S.dw = on ? S.dw + dt : Math.max(0, S.dw - dt * 2); if (c) c.style.setProperty('--p', Math.min(1, S.dw / cfg.dwell).toFixed(3));
    if (on && S.dw >= cfg.dwell) grab(on);
  }
  function grab(h) {
    var c = doc.getElementById('mhCard'); if (!c || !S) return;
    S.held = 'hand'; S.grip = { x: h.x, y: h.y }; S.lostAt = performance.now(); S.dw = 0; c.style.setProperty('--p', '0');
    S.off = cfg.grab === 'pinch' ? { x: S.card.x - h.x, y: S.card.y - h.y } : { x: 0, y: 0 };
    c.classList.add('held'); tone('grab'); hint();
  }

  /* ---------- Luật chơi ---------- */
  function begin() {
    var form = doc.getElementById('mhSetup'); if (form) collect();
    var set = current();
    if (set.groups.length < 2 || set.items.length < 2) { toast(set.kho ? 'Chưa có câu Đúng/Sai trong Kho câu hỏi. Chọn bộ phân loại khác.' : 'Bộ phân loại cần ít nhất 2 nhóm, mỗi dòng dạng “Tên nhóm: mục 1, mục 2”.'); render(true); return; }
    var list = shuffle(set.items.slice()), n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10);
    stopCamera('');
    S = { name: set.name, groups: set.groups, items: list.slice(0, n), q: 0, phase: 'ask', paused: false, score: [0, 0], right: [0, 0], turn: 0, tries: 0, held: '', card: null, grip: null, off: { x: 0, y: 0 }, binDw: [0, 0, 0, 0], dw: 0, armed: false, askAt: performance.now(), placed: set.groups.map(function () { return []; }), outcome: null, left: Number(cfg.time) || 0, nextLeft: null, history: [], wrongBin: -1 };
    game().type = TYPE; game().started = true;
    clearInterval(timer); lastT = Date.now(); timer = setInterval(tick, 200); if (win.hmvTran) win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return !!(S && S.paused); } });
    tone('start'); render(true);
    if (cfg.control === 'camera') startCamera(); else { camNote = ''; hint(); }
    setTimeout(function () { var e = doc.querySelector('.mh-game'); if (e && e.scrollIntoView && !doc.fullscreenElement && !doc.body.classList.contains('hmv-game-full')) e.scrollIntoView({ block: 'start' }); }, 60);
  }
  /* Thả thẻ vào nhóm k (k = −1: thả ra ngoài, thẻ quay về). */
  function drop(k, how) {
    if (!S || S.phase !== 'ask' || S.paused) return;
    var c = doc.getElementById('mhCard'); if (c) c.classList.remove('held');
    S.held = ''; S.binDw = [0, 0, 0, 0]; S.droppedAt = Date.now();
    if (k < 0 || k >= S.groups.length) { home(); return; }
    judge(k, how);
  }
  function judge(k, how) {
    var it = item(); if (!S || S.phase !== 'ask' || !it) return;
    var ok = k === it.g, t = cfg.mode === 'teams' ? S.turn : 0;
    if (S.tries === 0 && typeof win.hmvRec === 'function') win.hmvRec(TYPE, { text: it.text, answers: S.groups.slice(), correct: it.g }, k, ok);   /* ghi lượt thả đầu tiên cho Phân tích sau trò chơi */
    if (ok) {
      var pts = S.tries === 0 ? 10 : 5; S.score[t] += pts; if (S.tries === 0) S.right[t]++;
      S.placed[k].push(it.text); S.phase = 'done'; S.outcome = { ok: true, pts: pts, team: t, how: how }; S.history.push({ q: S.q, ok: S.tries === 0, team: t }); S.nextLeft = rv(2.2);
      ds(true); var p = binCenter(k); placeCard(p.x, p.y, true); paint(); burst();
      return;
    }
    S.tries++; S.wrongBin = k; ds(false);
    if (S.tries >= 2) {
      S.placed[it.g].push(it.text); S.phase = 'done'; S.outcome = { ok: false, team: t, how: how }; S.history.push({ q: S.q, ok: false, team: t }); S.nextLeft = rv(3.4);
      var p2 = binCenter(it.g); placeCard(p2.x, p2.y, true); paint();
      return;
    }
    home(); paint(); setStatus('❌ Chưa đúng nhóm. Thử lại một lần nữa!');
    setTimeout(function () { if (S && S.wrongBin === k) { S.wrongBin = -1; paintBins(); } }, 900);
  }
  function timeout() {
    var it = item(); if (!S || S.phase !== 'ask' || !it) return;
    if (S.tries === 0 && typeof win.hmvRec === 'function') win.hmvRec(TYPE, { text: it.text, answers: S.groups.slice(), correct: it.g }, null, false);
    S.held = ''; S.placed[it.g].push(it.text); S.phase = 'done'; S.outcome = { ok: false, why: 'timeout', team: cfg.mode === 'teams' ? S.turn : 0 }; S.history.push({ q: S.q, ok: false, team: S.outcome.team }); S.nextLeft = rv(3.4);
    ds(false); var p = binCenter(it.g); placeCard(p.x, p.y, true); paint();
  }
  /* 2.15: thời gian hiện đáp án trước khi chuyển câu lấy theo Luật trận đấu (để trống = mặc định của trò). */
  function rv(d) { var v = win.hmvTran ? win.hmvTran.reveal(TYPE, null) : null; return v === null || v === undefined ? d : v; }
  function next() {
    if (!S || S.phase !== 'done') return;
    if (S.q + 1 >= S.items.length) { finish(); return; }
    S.q++; S.phase = 'ask'; S.tries = 0; S.outcome = null; S.nextLeft = null; S.left = Number(cfg.time) || 0; S.armed = false; S.askAt = performance.now(); S.dw = 0; S.wrongBin = -1; S.held = '';
    if (cfg.mode === 'teams') S.turn = S.q % 2;
    var c = doc.getElementById('mhCard'); if (c) { c.classList.remove('glide', 'held'); c.classList.add('fresh'); setTimeout(function () { c.classList.remove('fresh'); }, 400); }
    paint(); var h = homePos(); placeCard(h.x, h.y, false); hint();
  }
  function finish() {
    if (!S) return; S.phase = 'end'; S.nextLeft = null; clearInterval(timer); timer = 0; stopCamera('');
    if (cfg.sound && win.hmvMung) win.hmvMung.play(0.8, function () { tone('end'); }, function () { return !!(S && S.phase === 'end' && game().type === TYPE); }); else tone('end');
    render(true); burst();
  }
  function pause() { if (!S || S.phase === 'end') return; S.paused = !S.paused; lastT = Date.now(); if (S.held === 'hand') home(); clearPointers(); paint(); hint(); }
  function back() { clearInterval(timer); timer = 0; stopCamera(''); S = null; game().type = null; game().started = false; if (typeof win.renderGames === 'function') win.renderGames(); }
  function tick() {
    var now = Date.now(), dt = Math.max(0, Math.min(1, (now - lastT) / 1000)); lastT = now;
    if (!S) { clearInterval(timer); timer = 0; return; }
    if (game().type !== TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; return; }
    if (S.phase === 'end' || S.paused || !onStage() || win.hmvHold) return;
    if (S.phase === 'ask' && cfg.time > 0 && !S.held) { S.left = Math.max(0, S.left - dt); var e = doc.getElementById('mhTimer'); if (e) { var n = Math.ceil(S.left); e.textContent = n; e.classList.toggle('hurry', n <= 5); } if (S.left <= 0) timeout(); }
    else if (S.phase === 'done' && S.nextLeft !== null) { S.nextLeft -= dt; var a = doc.getElementById('mhAuto'); if (a) a.textContent = Math.max(1, Math.ceil(S.nextLeft)); if (S.nextLeft <= 0) next(); }
  }

  /* ---------- Giao diện ---------- */
  function fontFor(text) { var n = String(text).length; return n <= 6 ? 1.6 : n <= 12 ? 1.3 : n <= 24 ? 1.05 : n <= 48 ? .86 : .72; }
  function hudHtml() {
    var chips = cfg.mode === 'teams' ? [0, 1].map(function (i) { return '<span class="bb-chip' + (S.phase !== 'end' && S.turn === i ? ' turn' : '') + '" style="--team:' + TEAM[i] + '"><b>' + esc(teamName(i)) + '</b><strong>' + S.score[i] + '</strong></span>'; }).join('') : '<span class="bb-chip turn" style="--team:#7c3aed"><b>Điểm</b><strong>' + S.score[0] + '</strong></span>';
    return chips + '<span class="bb-chip mh-count" style="--team:#0f766e"><b>Thẻ</b><strong>' + (S.q + 1) + '/' + S.items.length + '</strong></span>' + (cfg.time > 0 ? '<span class="bb-timer" id="mhTimer">' + Math.ceil(S.left) + '</span>' : '');
  }
  function binsHtml() {
    return S.groups.map(function (g, i) { return '<div class="mh-bin" data-mh-bin="' + i + '" style="--c:' + BIN[i] + '"><div class="mh-bin-head"><kbd>' + (i + 1) + '</kbd><b>' + esc(g) + '</b><span class="mh-bin-n"></span></div><div class="mh-bin-list"></div><i class="mh-bin-ring"></i></div>'; }).join('');
  }
  function paintBins(hover) {
    var st = stageEl(); if (!S || !st) return;
    Array.prototype.forEach.call(st.querySelectorAll('.mh-bin'), function (b, i) {
      var list = S.placed[i] || [], n = b.querySelector('.mh-bin-n'), l = b.querySelector('.mh-bin-list'), it = item();
      if (n) n.textContent = list.length ? '· ' + list.length : '';
      var html = list.slice(-3).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join(''); if (l && l.innerHTML !== html) l.innerHTML = html;
      b.classList.toggle('hover', hover === i && S.phase === 'ask');
      b.classList.toggle('wrong', S.wrongBin === i && S.phase === 'ask');
      b.classList.toggle('right', S.phase === 'done' && it && it.g === i);
      b.style.setProperty('--p', hover === i && cfg.grab !== 'pinch' && S.held === 'hand' ? Math.min(1, S.binDw[i] / cfg.dwell).toFixed(3) : '0');
    });
  }
  function bannerHtml() {
    var o = S.outcome, it = item(); if (!o || !it) return '';
    var who = cfg.mode === 'teams' ? esc(teamName(o.team)) + ' ' : '', last = S.q + 1 >= S.items.length;
    var msg = o.ok ? '✅ ' + (who ? who + 'xếp đúng!' : 'Đúng rồi!') + ' +' + o.pts + ' điểm' : (o.why === 'timeout' ? '⏰ Hết giờ.' : '❌ ' + (who ? who + 'chưa đúng.' : 'Chưa đúng.')) + ' “' + esc(it.text) + '” thuộc nhóm <b>' + esc(S.groups[it.g]) + '</b>';
    return '<div class="bb-banner ' + (o.ok ? 'good' : 'bad') + ' mh-banner"><div>' + msg + '</div><small>' + (S.paused ? 'Đang tạm dừng' : (last ? 'Xem kết quả sau ' : 'Thẻ tiếp theo sau ') + '<b id="mhAuto">' + Math.max(1, Math.ceil(S.nextLeft || 1)) + '</b> giây') + ' · <button type="button" class="bb-link" data-mh="next">' + (last ? 'Xem kết quả ngay' : 'Chuyển ngay') + '</button></small></div>';
  }
  function paint() {
    var stage = stageEl(), it = item(); if (!S || !stage || !it) return;
    var sub = doc.getElementById('mhSub'); if (sub) sub.textContent = 'Thẻ ' + (S.q + 1) + '/' + S.items.length + (cfg.mode === 'teams' ? ' · Lượt của ' + teamName(S.turn) : '') + ' · ' + S.name;
    doc.getElementById('mhHud').innerHTML = hudHtml();
    var pr = doc.getElementById('mhPrompt'); if (pr && pr.dataset.q !== String(S.q)) { pr.dataset.q = String(S.q); pr.textContent = it.text; }
    var c = doc.getElementById('mhCard');
    if (c && c.dataset.q !== String(S.q)) { c.dataset.q = String(S.q); c.querySelector('.mh-card-text').textContent = it.text; c.style.setProperty('--f', fontFor(it.text)); c.classList.toggle('long', it.text.length > 24); }
    if (c) { c.classList.toggle('right', S.phase === 'done' && !!S.outcome && S.outcome.ok); c.classList.toggle('reveal', S.phase === 'done' && !!S.outcome && !S.outcome.ok); }
    var bins = doc.getElementById('mhBins'); if (bins && bins.dataset.n !== String(S.groups.length)) { bins.dataset.n = String(S.groups.length); bins.innerHTML = binsHtml(); bins.style.setProperty('--n', S.groups.length); }
    paintBins();
    doc.getElementById('mhBanner').innerHTML = S.phase === 'done' ? bannerHtml() : '';
    stage.classList.toggle('paused', !!S.paused); stage.classList.toggle('done', S.phase === 'done');
    var pb = doc.getElementById('mhPauseBtn'); if (pb) pb.textContent = S.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
    var st = doc.getElementById('mhStatus'); if (st) st.hidden = S.phase !== 'ask';
    camLabel();
  }
  function burst() { var st = stageEl() || doc.querySelector('.mh-end'); if (!st) return; var c = doc.createElement('div'); c.className = 'bb-confetti'; c.innerHTML = Array.from({ length: 24 }, function (_, i) { return '<i style="--i:' + i + '"></i>'; }).join(''); st.appendChild(c); setTimeout(function () { c.remove(); }, 2200); }
  function stars(p) { var n = p >= .8 ? 3 : p >= .5 ? 2 : 1; return '★'.repeat(n) + '<span>' + '★'.repeat(3 - n) + '</span>'; }
  function opt(v, cur, label) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + label + '</option>'; }
  function infoOf() {
    var k = khoTF(), set = current(), ok = set.groups.length >= 2 && set.items.length >= 2;
    var info = k.picked ? 'Đang dùng câu Đúng/Sai của bộ <b>' + esc(k.name) + '</b> (' + k.list.length + ' câu) – thẻ được xếp vào hai ô <b>Đúng</b> và <b>Sai</b>.' : ok ? 'Bộ: <b>' + esc(set.name) + '</b> · ' + set.groups.length + ' nhóm · ' + set.items.length + ' thẻ.' : '<span class="bb-warn">' + (cfg.set === 'kho' ? 'Kho câu hỏi chưa có câu Đúng/Sai.' : 'Bộ tự gõ chưa đúng mẫu: mỗi dòng “Tên nhóm: mục 1, mục 2, …”, ít nhất 2 nhóm.') + '</span>';
    return { ok: ok, html: info + (k.picked ? '' : ' <button class="bb-link" type="button" data-mh="kho">Dùng câu Đúng/Sai trong Kho</button>') };
  }
  function setupHtml() {
    var inf = infoOf(), ok = inf.ok;
    return '<div class="bb-setup-screen mh-setup-screen"><div class="page-title"><div><h2>🪄 BÀN TAY PHÉP THUẬT</h2><p>Chụm ngón tay “nhặt” tấm thẻ trên màn hình, đưa tới đúng nhóm rồi mở tay để thả. Camera AI nhận diện bàn tay, không cần chạm vào máy.</p></div><div class="toolbar"><button class="btn soft" data-mh="back">← Thư viện</button></div></div>'
      + '<div class="bb-setup" id="mhSetup"><section class="bb-how mh-how"><ol><li><b>Đứng trước camera, giơ một tay lên</b><small>Chấm tròn vàng đi theo đầu ngón tay. Đứng cách camera khoảng 1–2 mét.</small></li><li><b>Chụm ngón cái và ngón trỏ vào tấm thẻ</b><small>Chấm tròn chuyển màu xanh là đã cầm được thẻ. Giữ chụm và đưa thẻ đi.</small></li><li><b>Mở tay trên đúng ô nhóm</b><small>Đúng: thẻ vào ô, cộng điểm. Sai: thẻ quay về, được thử thêm một lần.</small></li></ol><p class="bb-privacy">Camera chỉ dùng để tìm vị trí các khớp bàn tay ngay trên máy này. Ứng dụng không nhận diện danh tính, không lưu và không gửi hình ảnh. Không có camera vẫn chơi được: kéo thẻ bằng chuột, chạm màn hình, hoặc bấm phím số của nhóm.</p></section>'
      + '<section class="bb-form"><p class="bb-source" id="mhSource">' + inf.html + '</p>'
      + '<div class="bb-grid"><label class="mh-wide">Bộ phân loại<select id="mhSet">' + Object.keys(SETS).map(function (key) { return opt(key, cfg.set, SETS[key].name); }).join('') + opt('custom', cfg.set, '✏️ Bộ thầy cô tự gõ') + opt('kho', cfg.set, '✅ Câu Đúng/Sai trong Kho câu hỏi') + '</select></label>'
      + '<label class="mh-wide mh-custom"' + (cfg.set === 'custom' ? '' : ' hidden') + '>Bộ tự gõ (2–4 dòng, mỗi dòng: Tên nhóm: mục 1, mục 2, …)<textarea id="mhCustom" class="input" rows="4">' + esc(cfg.custom) + '</textarea></label>'
      + '<label>Cách chơi<select id="mhMode">' + opt('solo', cfg.mode, 'Cả lớp chung điểm') + opt('teams', cfg.mode, 'Hai đội luân phiên') + '</select></label><label>Số thẻ<select id="mhCount">' + opt('5', cfg.count, '5 thẻ') + opt('10', cfg.count, '10 thẻ') + opt('all', cfg.count, 'Tất cả') + '</select></label>'
      + '<label>Cách cầm thẻ<select id="mhGrab">' + opt('pinch', cfg.grab, '🤏 Chụm ngón để cầm, mở tay để thả') + opt('dwell', cfg.grab, '☝ Giữ ngón trỏ yên trên thẻ / trên ô') + '</select></label><label>Điều khiển<select id="mhControl">' + opt('camera', cfg.control, '📷 Camera – bằng tay') + opt('touch', cfg.control, '🖱 Chuột hoặc chạm màn hình') + '</select></label>'
      + '<label>Thời gian mỗi thẻ<select id="mhTime">' + opt(0, cfg.time, 'Không giới hạn') + opt(20, cfg.time, '20 giây') + opt(30, cfg.time, '30 giây') + opt(45, cfg.time, '45 giây') + '</select></label><label>Tiếng hiệu ứng<select id="mhSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label>'
      + '<label class="mh-team-name">Tên đội 1<input id="mhName0" class="input" maxlength="20" value="' + esc(teamName(0)) + '"></label><label class="mh-team-name">Tên đội 2<input id="mhName1" class="input" maxlength="20" value="' + esc(teamName(1)) + '"></label></div>'
      + '<button class="btn color bb-start" data-mh="start"' + (ok ? '' : ' disabled') + '>▶ Bắt đầu chơi</button></section></div></div>';
  }
  function playHtml() {
    return '<div class="mh-game"><div class="page-title"><div><h2>🪄 BÀN TAY PHÉP THUẬT</h2><p id="mhSub"></p></div><div class="toolbar"><button class="btn soft" id="mhPauseBtn" data-mh="pause">Ⅱ Tạm dừng</button><button class="btn soft" id="mhCamBtn" data-mh="camera">📷 Camera: Tắt</button><button class="btn soft" data-mh="back">Thoát</button></div></div>'
      + '<div class="bb-stage mh-stage" id="mhStage"><video id="mhVideo" class="bb-video" autoplay muted playsinline></video><div class="bb-shade" aria-hidden="true"></div>'
      + '<div class="bb-hud" id="mhHud"></div><div class="mh-ask"><span>Thẻ này thuộc nhóm nào?</span><b id="mhPrompt"></b></div>'
      + '<div class="mh-bins" id="mhBins"></div><div class="mh-card" id="mhCard"><span class="mh-card-text"></span><i class="mh-card-ring"></i></div>'
      + '<div class="mh-pointers" id="mhPointers" aria-hidden="true"></div><div id="mhBanner"></div><div class="bb-status mh-status" id="mhStatus" role="status"></div><div class="bb-pause-veil">ĐANG TẠM DỪNG</div></div></div>';
  }
  function endHtml() {
    var total = S.items.length, teams = cfg.mode === 'teams', right = S.right[0] + (teams ? S.right[1] : 0), head, lines;
    if (teams) { var w = S.score[0] === S.score[1] ? -1 : S.score[0] > S.score[1] ? 0 : 1; head = w < 0 ? '🤝 Hai đội hòa nhau!' : '🏆 ' + esc(teamName(w)) + ' chiến thắng!'; lines = [0, 1].map(function (i) { return '<p><b style="color:' + TEAM[i] + '">' + esc(teamName(i)) + '</b>: ' + S.score[i] + ' điểm · xếp đúng ngay lần đầu ' + S.right[i] + ' thẻ</p>'; }).join(''); }
    else { head = right === total ? '🏆 Tuyệt vời, xếp đúng hết!' : right >= total * .5 ? '🎉 Làm tốt lắm!' : '💪 Cố gắng thêm nhé!'; lines = '<p>Xếp đúng ngay lần đầu <b>' + right + '/' + total + '</b> thẻ · <b>' + S.score[0] + '</b> điểm</p>'; }
    var table = '<div class="mh-end-bins">' + S.groups.map(function (g, i) { return '<div style="--c:' + BIN[i] + '"><b>' + esc(g) + '</b><p>' + (S.placed[i].map(esc).join(' · ') || '—') + '</p></div>'; }).join('') + '</div>';
    return '<div class="mh-game"><div class="page-title"><div><h2>🪄 BÀN TAY PHÉP THUẬT</h2><p>Kết quả · ' + esc(S.name) + '</p></div><div class="toolbar"><button class="btn soft" data-mh="back">← Thư viện</button></div></div><div class="bb-end mh-end"><div class="bb-stars">' + stars(total ? right / total : 0) + '</div><h2>' + head + '</h2>' + lines + table + '<div class="bb-end-actions"><button class="btn color" data-mh="start">↻ Chơi lại</button><button class="btn soft" data-mh="back">← Về thư viện</button></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return;
    if (!S) { g.innerHTML = setupHtml(); syncFields(); return; }
    if (S.phase === 'end') { if (force || !g.querySelector('.mh-end')) g.innerHTML = endHtml(); return; }
    if (force || !stageEl()) { g.innerHTML = playHtml(); attach(); }
    paint(); hint();
    if (!S.card || force) { var h = homePos(); placeCard(h.x, h.y, false); }
  }
  function refreshSetup() { var inf = infoOf(), p = doc.getElementById('mhSource'), b = doc.querySelector('[data-mh="start"]'); if (p) p.innerHTML = inf.html; if (b) b.disabled = !inf.ok; syncFields(); }
  function syncFields() {
    var m = doc.getElementById('mhMode'), s = doc.getElementById('mhSet');
    doc.querySelectorAll('.mh-team-name').forEach(function (l) { l.hidden = !m || m.value !== 'teams'; });
    doc.querySelectorAll('.mh-custom').forEach(function (l) { l.hidden = !s || s.value !== 'custom'; });
  }
  function collect() {
    var v = function (id) { var e = doc.getElementById(id); return e ? e.value : null; };
    if (v('mhMode') === null) return;
    cfg.set = v('mhSet') || 'tu-loai'; if (v('mhCustom') !== null) cfg.custom = String(v('mhCustom')).slice(0, 2000);
    cfg.mode = v('mhMode') === 'teams' ? 'teams' : 'solo'; cfg.count = v('mhCount') || '10'; cfg.time = Number(v('mhTime')) || 0; cfg.grab = v('mhGrab') === 'dwell' ? 'dwell' : 'pinch'; cfg.control = v('mhControl') === 'touch' ? 'touch' : 'camera'; cfg.sound = v('mhSound') === '1';
    cfg.names = [String(v('mhName0') || '').trim() || DEF.names[0], String(v('mhName1') || '').trim() || DEF.names[1]];
    saveCfg();
  }

  /* ---------- Chuột / chạm ---------- */
  function local(e) { var st = stageEl(), r = st.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  doc.addEventListener('pointerdown', function (e) {
    if (game().type !== TYPE || !S || S.phase !== 'ask' || S.paused || S.held === 'hand') return;
    var c = e.target.closest && e.target.closest('#mhCard'); if (!c) return;
    e.preventDefault(); var p = local(e); S.held = 'mouse'; S.off = { x: S.card.x - p.x, y: S.card.y - p.y }; c.classList.add('held'); try { c.setPointerCapture(e.pointerId); } catch (x) {}
  });
  doc.addEventListener('pointermove', function (e) { if (!S || S.held !== 'mouse') return; var p = local(e); placeCard(p.x + S.off.x, p.y + S.off.y, false); paintBins(binAt(S.card.x, S.card.y)); });
  doc.addEventListener('pointerup', function () { if (!S || S.held !== 'mouse') return; drop(binAt(S.card.x, S.card.y), 'click'); });
  doc.addEventListener('pointercancel', function () { if (S && S.held === 'mouse') home(); });

  /* ---------- Sự kiện ---------- */
  doc.addEventListener('click', function (e) {
    if (game().type !== TYPE) return;
    var g = games(); if (!g || !g.contains(e.target)) return;
    var bin = e.target.closest('[data-mh-bin]'); if (bin && S && S.phase === 'ask' && !S.held && !S.paused && Date.now() - (S.droppedAt || 0) > 400) { judge(Number(bin.dataset.mhBin), 'click'); return; }
    var b = e.target.closest('[data-mh]'); if (!b || b.disabled) return;
    var a = b.dataset.mh;
    if (a === 'start') begin(); else if (a === 'back') back(); else if (a === 'pause') pause(); else if (a === 'camera') toggleCamera(); else if (a === 'next') next();
    else if (a === 'kho') { var s = doc.getElementById('mhSet'); if (s) { s.value = 'kho'; collect(); refreshSetup(); } }
  });
  doc.addEventListener('change', function (e) { if (game().type !== TYPE || S) return; if (e.target && /^mh/.test(e.target.id || '')) { collect(); refreshSetup(); } });
  doc.addEventListener('keydown', function (e) {
    if (game().type !== TYPE || !S || S.phase === 'end' || !onStage()) return;
    var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.altKey || e.metaKey || doc.querySelector('#khoModal,#c6QuestionModal,#qbStage7Modal,dialog[open]')) return;
    var k = String(e.key || '');
    if (/^[1-4]$/.test(k)) { e.preventDefault(); if (!e.repeat && S.phase === 'ask' && !S.paused && Number(k) <= S.groups.length) { S.held = ''; judge(Number(k) - 1, 'key'); } }
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) pause(); }
    else if (k === 'Enter' && S.phase === 'done') { e.preventDefault(); next(); }
  });
  doc.addEventListener('visibilitychange', function () { lastT = Date.now(); });
  win.addEventListener('resize', function () { if (S && S.phase === 'ask' && !S.held) { var h = homePos(); placeCard(h.x, h.y, false); } });

  /* ---------- Gắn vào ứng dụng ---------- */
  var baseSetup = win.gameSetup, baseRender = win.renderGames, baseStart = win.gameStart, baseOpen = win.openView;
  win.gameSetup = function (t) { if (t === TYPE) { clearInterval(timer); timer = 0; stopCamera(''); S = null; win.classroomGame = { type: TYPE, started: false }; render(true); return; } return baseSetup.apply(this, arguments); };
  win.renderGames = function () { if (game().type === TYPE) { render(false); return; } var out = baseRender.apply(this, arguments); decorateCard(); return out; };
  win.gameStart = function () { if (game().type === TYPE) { begin(); return; } return baseStart.apply(this, arguments); };
  if (typeof baseOpen === 'function') win.openView = function (id) { if (id !== 'games' && game().type === TYPE) back(); var out = baseOpen.apply(this, arguments); if (id === 'games') setTimeout(decorateCard, 0); return out; };
  function decorateCard() {
    var g = games(); if (!g) return;
    Array.prototype.forEach.call(g.querySelectorAll('.game-library-card'), function (card) {
      var h = card.querySelector('h3'); if (!h || h.textContent.trim() !== 'Bàn tay phép thuật' || card.dataset.mh) return;
      card.dataset.mh = '1'; card.classList.add('bb-card');
      var tags = card.querySelectorAll('.game-tags span'); if (tags[0]) tags[0].textContent = '👥 Cả lớp hoặc 2 đội'; if (tags[1]) tags[1].textContent = '📷 Camera AI · cầm thẻ bằng tay';
      var badge = doc.createElement('span'); badge.className = 'bb-new'; badge.textContent = 'Mới'; card.appendChild(badge);
      var help = Array.prototype.find.call(card.querySelectorAll('button'), function (b) { return /Hướng dẫn/.test(b.textContent); }); if (help) help.onclick = function (ev) { ev.stopPropagation(); toast('Chụm ngón cái và ngón trỏ để nhặt thẻ, đưa tới đúng nhóm rồi mở tay để thả. Không có camera thì kéo thẻ bằng chuột.'); };
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', decorateCard); else setTimeout(decorateCard, 0);

  win.magicHandBack = back;
  win.hmvMagicHand = {
    musicState: function () { return !S || S.phase === 'end' ? 'stop' : S.paused ? 'hold' : 'play'; },
    state: function () { return { settings: JSON.parse(JSON.stringify(cfg)), match: S ? { q: S.q, total: S.items.length, phase: S.phase, paused: S.paused, score: S.score.slice(), right: S.right.slice(), turn: S.turn, tries: S.tries, held: S.held, armed: S.armed, card: S.card ? { x: Math.round(S.card.x), y: Math.round(S.card.y) } : null, item: item() ? { text: item().text, g: item().g } : null, groups: S.groups.slice(), placed: S.placed.map(function (l) { return l.slice(); }), outcome: S.outcome, name: S.name } : null, camera: cam, cameraNote: camNote, streaming: !!stream }; },
    binCenter: binCenter, homePos: homePos, feed: feed, sets: SETS, parseCustom: parseCustom
  };
})();
