/* BAN-CHINH 2.44 · Trò chơi "Chế độ giấy" (viết lại).
 *
 * Mỗi học sinh có một thẻ giấy in mã vuông (mã ArUco). Bốn cạnh thẻ ghi A, B, C, D.
 * Học sinh xoay thẻ cho chữ mình chọn nằm ở cạnh trên rồi giơ lên. Camera quét cả lớp cùng lúc,
 * biết thẻ của bạn nào và bạn đó chọn chữ gì. Học sinh không cần thiết bị.
 *
 * Luồng: Thư viện → màn hình CÀI ĐẶT (thẻ, câu hỏi, camera, luật) → bấm "▶ Bắt đầu" mới chơi.
 * Mỗi câu: học sinh giơ thẻ, máy ghi nhận → giáo viên "Chốt & hiện đáp án" → "Câu tiếp".
 * Cuối lượt: bảng kết quả từng học sinh, xuất tệp Excel (CSV).
 *
 * Không có camera vẫn chơi được: bấm vào ô tên học sinh rồi chọn A/B/C/D.
 * Camera chỉ đọc mã trên thẻ ngay trên máy này; không nhận diện khuôn mặt, không lưu, không gửi hình ảnh.
 * Thư viện đọc mã: aruco-che-do-giay.js (tải khi mở trò lần đầu, dùng được ngoại tuyến).
 */
(function () {
  'use strict';
  var doc = document, win = window, TYPE = 'paper-mode';
  var SKEY = 'hmv_cdg_settings_v1', CKEY = 'hmv_cdg_cards_v1', LKEY = 'hmv_cdg_last_v1';
  var DEF = { count: '10', time: 0, order: 'set', absent: true, sound: true, cam: '', res: '720', perPage: 2, names: true };
  var LET = 'ABCD';
  var cfg = Object.assign({}, DEF, read(SKEY, {}));
  var S = null, timer = 0, lastT = 0, stream = null, scanTimer = 0, detector = null, scanCanvas = null, camMsg = '', camDevices = [], pending = {}, autoNx = 0, actx = null, libPromise = null, testHits = {};

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function games() { return doc.getElementById('games'); }
  function game() { return win.classroomGame || {}; }
  function here() { var g = games(); return !!(g && game().type === TYPE); }
  function opt(v, cur, label) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  /* ---------- Lớp và thẻ ---------- */
  function ws() { try { if (typeof win.getCurrentClassContext === 'function') return win.getCurrentClassContext() || {}; } catch (e) {} return win.activeWorkspace || {}; }
  function ctx() { var w = ws(); return String(w.schoolYearId || '') + '|' + String(w.classId || ''); }
  function className() { var w = ws(); try { if (typeof win.formatClassName === 'function' && w.classId) return win.formatClassName(w); } catch (e) {} return w.classId ? 'Lớp ' + w.classId : 'Lớp'; }
  function studentList() {
    var l = Array.isArray(win.students) ? win.students : (typeof students !== 'undefined' && Array.isArray(students) ? students : []);
    return l.filter(function (s) { return s && String(s.name || '').trim(); });
  }
  /* Số thẻ gắn cố định với từng học sinh của lớp (theo tên); bạn mới nhận số kế tiếp, không xáo trộn thẻ đã in. */
  function roster() {
    var all = read(CKEY, {}), key = ctx(), m = all[key] || { byName: {}, next: 1 }, changed = false;
    var list = studentList().map(function (s) {
      var name = String(s.name).trim();
      if (!m.byName[name]) { m.byName[name] = m.next++; changed = true; }
      return { no: m.byName[name], name: name, absent: /vắng/i.test(String(s.status || '')) };
    });
    if (changed) { all[key] = m; write(CKEY, all); }
    return list.sort(function (a, b) { return a.no - b.no; });
  }
  function byNo(no) { var r = S ? S.roster : roster(); for (var i = 0; i < r.length; i++) if (r[i].no === no) return r[i]; return null; }

  /* ---------- Câu hỏi ---------- */
  function norm(q) {
    if (!q) return null;
    var text = String(q.text || q.question || '').trim(), ans = (Array.isArray(q.answers) ? q.answers : []).map(function (a) { return String(a == null ? '' : a).trim(); }), c = Number(q.correct);
    if (!text || ans.length < 2 || ans.length > 4 || ans.some(function (a) { return !a; }) || q.correct === null || q.correct === '' || !(Number.isInteger(c) && c >= 0 && c < ans.length)) return null;
    return { id: q.id, text: text, answers: ans, correct: c, grade: q.grade, subject: q.subject, topic: q.topic, image: q.image || q.img || '' };
  }
  function source() {
    var conv = function (l) { return (l || []).map(norm).filter(Boolean); };
    var picked = typeof win.hmvC6QuestionsForGame === 'function' ? win.hmvC6QuestionsForGame(TYPE) : null;
    if (picked && conv(picked).length) return { list: conv(picked), name: (typeof win.hmvC6SelectionName === 'function' && win.hmvC6SelectionName(TYPE)) || 'Bộ câu hỏi đã chọn' };
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = sets.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), demo = sets.filter(function (s) { return /^mau-\d/.test(String(s.id)); });
    var order = mine.concat(demo);
    for (var i = 0; i < order.length; i++) { var l = conv(order[i].questions); if (l.length >= 3) return { list: l, name: order[i].name || order[i].setTitle || 'Bộ câu hỏi' }; }
    return { list: conv(win.questionData), name: 'Câu hỏi hiện tại' };
  }
  function Q() { return S && S.questions[S.q]; }
  function ansMap() { return S ? (S.answers[S.q] || (S.answers[S.q] = {})) : {}; }

  /* ---------- Âm thanh ---------- */
  function tone(kind) {
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return;
      if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime, seq = kind === 'scan' ? [1046] : kind === 'reveal' ? [659, 880, 1175] : kind === 'end' ? [523, 659, 784, 1046] : kind === 'start' ? [523, 784] : [440];
      seq.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(), t = now + .02 + i * .1; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'scan' ? .05 : .12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + (kind === 'scan' ? .08 : .2)); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .25); });
    } catch (e) {}
  }

  /* ---------- Thư viện đọc mã ---------- */
  function loadLib() {
    if (win.HMV_AR) return Promise.resolve(win.HMV_AR);
    if (libPromise) return libPromise;
    libPromise = new Promise(function (ok, bad) {
      var s = doc.createElement('script'); s.src = './aruco-che-do-giay.js'; s.async = true;
      s.onload = function () { win.HMV_AR ? ok(win.HMV_AR) : bad(new Error('no lib')); };
      s.onerror = function () { libPromise = null; bad(new Error('load')); };
      doc.head.appendChild(s);
    });
    return libPromise;
  }
  function dict() { var AR = win.HMV_AR; if (!AR) return null; if (!dict._d) dict._d = new AR.Dictionary('ARUCO_MIP_16h3'); return dict._d; }
  function markerSvg(no) {
    var d = dict(); if (!d || no < 1 || no > d.codeList.length) return '';
    var code = d.codeList[no - 1], n = 4, s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6" shape-rendering="crispEdges" class="cdg-mk"><rect width="6" height="6" fill="#000"/>';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (code[y * n + x] === '1') s += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="1" height="1" fill="#fff"/>';
    return s + '</svg>';
  }

  /* ---------- Camera ---------- */
  function camOk() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && (win.isSecureContext || location.hostname === 'localhost'); }
  function listCams() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
    return navigator.mediaDevices.enumerateDevices().then(function (l) { camDevices = l.filter(function (d) { return d.kind === 'videoinput'; }); return camDevices; }).catch(function () { return []; });
  }
  function startCam() {
    if (!camOk()) { camMsg = 'Trình duyệt này không mở được camera (cần trang https). Vẫn chơi được: bấm vào ô tên học sinh để ghi đáp án.'; paintCam(); return Promise.resolve(false); }
    stopCam();
    var h = cfg.res === '1080' ? 1080 : 720, w = cfg.res === '1080' ? 1920 : 1280;
    var c = { width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 15 } };
    if (cfg.cam) c.deviceId = { exact: cfg.cam }; else c.facingMode = { ideal: 'environment' };
    camMsg = 'Đang mở camera…'; paintCam();
    return Promise.all([loadLib(), navigator.mediaDevices.getUserMedia({ video: c, audio: false }).catch(function (e) {
      if (cfg.cam && e && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) { cfg.cam = ''; write(SKEY, cfg); delete c.deviceId; c.facingMode = { ideal: 'environment' }; return navigator.mediaDevices.getUserMedia({ video: c, audio: false }); }
      throw e;
    })]).then(function (r) {
      stream = r[1];
      var AR = r[0]; detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_16h3', maxHammingDistance: 1 });
      attachVideo(); camMsg = ''; listCams().then(function () { var sel = doc.getElementById('cdgCam'); if (sel) sel.innerHTML = camOptions(); });
      clearInterval(scanTimer); scanTimer = setInterval(scan, 140); paintCam(); return true;
    }).catch(function (e) {
      stream = null;
      camMsg = e && e.name === 'NotAllowedError' ? 'Chưa được phép dùng camera. Bấm biểu tượng 🔒 cạnh địa chỉ trang → cho phép Camera, rồi bấm Mở camera lại.' : e && e.name === 'NotFoundError' ? 'Không tìm thấy camera. Cắm webcam hoặc nối điện thoại làm camera (xem hướng dẫn 📱).' : e && e.name === 'NotReadableError' ? 'Camera đang được ứng dụng khác dùng (Zoom, Meet…). Tắt ứng dụng đó rồi thử lại.' : e && e.message === 'load' ? 'Chưa tải được bộ đọc mã. Kiểm tra mạng rồi thử lại.' : 'Không mở được camera. Vẫn chơi được bằng cách bấm vào ô tên học sinh.';
      paintCam(); return false;
    });
  }
  function stopCam() { clearInterval(scanTimer); scanTimer = 0; if (stream) { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); } stream = null; pending = {}; var v = doc.getElementById('cdgVideo'); if (v) v.srcObject = null; var o = doc.getElementById('cdgOverlay'); if (o) o.getContext('2d').clearRect(0, 0, o.width, o.height); }
  function attachVideo() { var v = doc.getElementById('cdgVideo'); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function camOptions() {
    var l = camDevices.map(function (d, i) { return opt(d.deviceId, cfg.cam, d.label || ('Camera ' + (i + 1))); }).join('');
    return opt('', cfg.cam, 'Tự chọn (camera sau / mặc định)') + l;
  }
  function paintCam() {
    var m = doc.getElementById('cdgCamMsg'); if (m) { m.textContent = camMsg || (stream ? (S && S.phase === 'answer' ? 'Camera đang quét. Học sinh giơ thẻ hướng về camera, giữ yên 1 giây.' : S ? 'Camera đang mở.' : 'Giơ thử một thẻ trước camera để kiểm tra.') : 'Camera đang tắt.'); m.classList.toggle('warn', !!camMsg && !/Đang mở/.test(camMsg)); }
    var b = doc.getElementById('cdgCamBtn'); if (b) b.textContent = stream ? '📷 Tắt camera' : '📷 Mở camera';
    var w = doc.getElementById('cdgCamBox'); if (w) w.classList.toggle('on', !!stream);
  }
  function letterOf(m) { var a = m.corners[0], b = m.corners[1], ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; return LET[((Math.round(-ang / 90) % 4) + 4) % 4]; }
  function scan() {
    var v = doc.getElementById('cdgVideo');
    if (!stream || !detector || !v || v.readyState < 2 || !v.videoWidth) return;
    if (!here()) { stopCam(); return; }
    var w = v.videoWidth, h = v.videoHeight;
    scanCanvas = scanCanvas || doc.createElement('canvas');
    if (scanCanvas.width !== w) { scanCanvas.width = w; scanCanvas.height = h; }
    var cx = scanCanvas.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, h);
    var found = []; try { found = detector.detect(cx.getImageData(0, 0, w, h)); } catch (e) { return; }
    var now = Date.now(), seen = [];
    found.forEach(function (m) {
      var no = m.id + 1, st = byNo(no); if (!st) return;
      var L = letterOf(m); seen.push({ no: no, L: L, m: m });
      if (!S) { testHits[no] = { L: L, t: now }; return; }
      if (S.phase !== 'answer' || S.paused) return;
      var p = pending[no];
      if (p && p.L === L && now - p.t < 1500) { p.n++; p.t = now; } else pending[no] = p = { L: L, n: 1, t: now };
      if (p.n >= 2) { var map = ansMap(), had = map[no]; if (had !== L) { map[no] = L; if (!had) tone('scan'); paintPlay(); } }
    });
    drawOverlay(seen, w, h);
    if (!S) paintTest();
  }
  function drawOverlay(seen, w, h) {
    var o = doc.getElementById('cdgOverlay'); if (!o) return;
    if (o.width !== w) { o.width = w; o.height = h; }
    var c = o.getContext('2d'); c.clearRect(0, 0, w, h);
    var showLetter = !S || S.phase === 'reveal', q = Q();
    seen.forEach(function (s) {
      var k = s.m.corners, ok = S && S.phase === 'reveal' && q ? LET.indexOf(s.L) === q.correct : null;
      c.lineWidth = Math.max(3, w / 300); c.strokeStyle = ok === null ? '#a855f7' : ok ? '#16a34a' : '#dc2626';
      c.beginPath(); c.moveTo(k[0].x, k[0].y); for (var i = 1; i < 4; i++) c.lineTo(k[i].x, k[i].y); c.closePath(); c.stroke();
      var x = Math.min(k[0].x, k[1].x, k[2].x, k[3].x), y = Math.min(k[0].y, k[1].y, k[2].y, k[3].y), label = showLetter ? s.no + ' · ' + s.L : '✓ ' + s.no;
      c.font = '700 ' + Math.max(16, Math.round(w / 45)) + 'px system-ui,sans-serif'; var tw = c.measureText(label).width + 12, th = Math.max(22, Math.round(w / 34));
      c.fillStyle = c.strokeStyle; c.fillRect(x, y - th - 4, tw, th); c.fillStyle = '#fff'; c.fillText(label, x + 6, y - 10);
    });
  }
  function paintTest() {
    var el = doc.getElementById('cdgTest'); if (!el) return;
    var now = Date.now(), list = Object.keys(testHits).map(Number).filter(function (no) { return now - testHits[no].t < 2500; });
    el.innerHTML = list.length ? '✅ Đang thấy: ' + list.map(function (no) { var s = byNo(no); return '<b>Thẻ ' + no + '</b> ' + esc(s ? s.name : '') + ' – chữ <b>' + testHits[no].L + '</b>'; }).join(' · ') : 'Chưa thấy thẻ nào. Giơ thẻ thẳng về phía camera, không che mã, đủ sáng.';
  }

  /* ---------- In thẻ ---------- */
  function cardHtml(st) {
    return '<div class="card"><div class="no">' + st.no + '</div><div class="cls">' + esc(className()) + '</div>'
      + '<div class="ltr ltr-a">A</div><div class="ltr ltr-b">B</div><div class="ltr ltr-c">C</div><div class="ltr ltr-d">D</div>'
      + '<div class="mk">' + markerSvg(st.no) + '</div><div class="nm">' + esc(st.name) + '</div></div>';
  }
  function printCards(list) {
    loadLib().then(function () {
      var per = Number(cfg.perPage) || 2, size = per === 1 ? 180 : per === 2 ? 128 : 92;
      var css = '@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000}'
        + '.page{display:grid;grid-template-columns:repeat(' + (per === 4 ? 2 : 1) + ',' + size + 'mm);justify-content:center;align-content:start;gap:' + (per === 1 ? 0 : 8) + 'mm;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}'
        + '.card{position:relative;width:' + size + 'mm;height:' + size + 'mm;border:0.4mm dashed #9ca3af;background:#fff}'
        + '.mk{position:absolute;left:21%;top:21%;width:58%;height:58%}.mk svg{width:100%;height:100%;display:block}'
        + '.ltr{position:absolute;font-weight:700;font-size:' + (size * 0.09).toFixed(1) + 'mm;line-height:1;width:' + (size * 0.12).toFixed(1) + 'mm;text-align:center}'
        + '.ltr-a{top:4%;left:50%;transform:translateX(-50%)}.ltr-c{bottom:4%;left:50%;transform:translateX(-50%) rotate(180deg)}'
        + '.ltr-b{right:2.5%;top:50%;transform:translateY(-50%) rotate(90deg)}.ltr-d{left:2.5%;top:50%;transform:translateY(-50%) rotate(-90deg)}'
        + '.no{position:absolute;top:3%;left:4%;font-weight:700;font-size:' + (size * 0.07).toFixed(1) + 'mm}.cls{position:absolute;top:4%;right:4%;font-size:' + (size * 0.032).toFixed(1) + 'mm;color:#444;max-width:16%;text-align:right}'
        + '.nm{position:absolute;bottom:3.5%;left:4%;width:16%;font-size:' + (size * 0.03).toFixed(1) + 'mm;line-height:1.15;overflow:hidden;max-height:' + (size * 0.11).toFixed(1) + 'mm}'
        + '.tip{font-size:10pt;text-align:center;color:#555;margin:0 0 3mm}';
      var pages = [], i;
      for (i = 0; i < list.length; i += per) pages.push('<div class="page">' + list.slice(i, i + per).map(cardHtml).join('') + '</div>');
      var html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thẻ Chế độ giấy · ' + esc(className()) + '</title><style>' + css + '</style></head><body>' + pages.join('') + '</body></html>';
      var old = doc.getElementById('cdgPrintFrame'); if (old) old.remove();
      var f = doc.createElement('iframe'); f.id = 'cdgPrintFrame'; f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
      doc.body.appendChild(f);
      var d = f.contentWindow.document; d.open(); d.write(html); d.close();
      setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Không mở được hộp in. Hãy thử lại.'); } }, 350);
    }).catch(function () { toast('Chưa tải được bộ tạo mã thẻ. Kiểm tra mạng rồi thử lại.'); });
  }

  /* ---------- Chơi ---------- */
  function collect() {
    var v = function (id) { var e = doc.getElementById(id); return e ? e.value : null; };
    if (v('cdgCount') === null) return;
    cfg.count = v('cdgCount') || '10'; cfg.time = Number(v('cdgTime')) || 0; cfg.order = v('cdgOrder') === 'shuffle' ? 'shuffle' : 'set';
    cfg.absent = v('cdgAbsent') !== '0'; cfg.sound = v('cdgSound') !== '0'; cfg.res = v('cdgRes') === '1080' ? '1080' : '720'; cfg.perPage = Number(v('cdgPer')) || 2;
    if (v('cdgCam') !== null) cfg.cam = v('cdgCam') || '';
    write(SKEY, cfg);
  }
  function begin() {
    if (doc.getElementById('cdgSetup')) collect();
    var src = source(); if (!src.list.length) { toast('Chưa có câu hỏi trắc nghiệm. Bấm “Chọn bộ câu hỏi khác” để chọn một bộ.'); return; }
    var r = roster(); if (!r.length) { toast('Lớp chưa có danh sách học sinh. Vào mục Lớp học để nhập danh sách trước.'); return; }
    var list = cfg.order === 'shuffle' ? shuffle(src.list.slice()) : src.list.slice(), n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10);
    if (win.hmvTran && typeof win.hmvTran.limit === 'function') { var lim = win.hmvTran.limit(TYPE, n); if (lim > 0) n = Math.min(n, lim); }
    var keepCam = !!stream;
    S = { questions: list.slice(0, n), sourceName: src.name, roster: r, q: 0, phase: 'answer', paused: false, answers: {}, left: 0, nextLeft: null, recorded: {} };
    win.classroomGame = { type: TYPE, started: true };
    S.left = answerTime();
    pending = {}; testHits = {};
    clearInterval(timer); lastT = Date.now(); timer = setInterval(tick, 250);
    if (win.hmvTran && typeof win.hmvTran.begin === 'function') win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return !!(S && S.paused); } });
    tone('start'); render(true);
    if (keepCam) attachVideo(); else startCam();
    setTimeout(function () { var e = doc.querySelector('.cdg-game'); if (e && e.scrollIntoView && !doc.fullscreenElement && !doc.body.classList.contains('hmv-game-full')) e.scrollIntoView({ block: 'start' }); }, 60);
  }
  function answerTime() { var t = cfg.time; if (win.hmvTran && typeof win.hmvTran.answer === 'function') { var a = win.hmvTran.answer(TYPE, null); if (a !== null && a !== undefined) t = Number(a) || 0; } return t; }
  function revealTime() { var r = win.hmvTran && typeof win.hmvTran.reveal === 'function' ? win.hmvTran.reveal(TYPE, 0) : 0; return Number(r) || 0; }
  function tick() {
    if (!S || S.phase === 'end') return;
    var now = Date.now(), dt = (now - lastT) / 1000; lastT = now;
    if (S.paused || win.hmvHold) return;
    if (S.phase === 'answer' && S.left > 0) { S.left = Math.max(0, S.left - dt); if (S.left <= 0) { lock(); return; } paintClock(); }
    else if (S.phase === 'reveal' && S.nextLeft !== null) { S.nextLeft -= dt; if (S.nextLeft <= 0) { S.nextLeft = null; next(); return; } paintClock(); }
  }
  function expected() { return S.roster.filter(function (s) { return !(cfg.absent && s.absent); }); }
  function counts() { var c = [0, 0, 0, 0], m = ansMap(); Object.keys(m).forEach(function (k) { var i = LET.indexOf(m[k]); if (i >= 0) c[i]++; }); return c; }
  function lock() {
    if (!S || S.phase !== 'answer') return;
    S.phase = 'reveal'; S.left = 0; pending = {};
    var q = Q(), c = counts(), tot = c.reduce(function (a, b) { return a + b; }, 0);
    if (!S.recorded[S.q] && win.hmvKetQua && typeof win.hmvKetQua.record === 'function') {
      S.recorded[S.q] = 1;
      try { win.hmvKetQua.record({ game: TYPE, source: S.sourceName, id: q.id, text: q.text, answers: q.answers.slice(), correct: q.correct, counts: c.slice(0, q.answers.length), total: tot, right: c[q.correct], grade: q.grade, subject: q.subject, topic: q.topic }); } catch (e) {}
    }
    var r = revealTime(); S.nextLeft = r > 0 ? r : null;
    tone('reveal'); render(true);
  }
  function next() {
    if (!S) return;
    if (S.phase === 'answer') { lock(); return; }
    if (S.q + 1 >= S.questions.length) { finish(); return; }
    if (win.hmvTran && typeof win.hmvTran.reached === 'function') { try { if (win.hmvTran.reached(TYPE, S.q + 1)) { finish(); return; } } catch (e) {} }
    S.q++; S.phase = 'answer'; S.left = answerTime(); S.nextLeft = null; pending = {}; render(true);
  }
  function finish() {
    if (!S) return;
    if (S.phase === 'answer' && Object.keys(ansMap()).length) lock();
    var played = S.phase === 'reveal' ? S.q + 1 : S.q; S.questions = S.questions.slice(0, Math.max(0, played));
    S.phase = 'end'; clearInterval(timer); timer = 0; stopCam(); closePick();
    if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} }
    write(LKEY, { at: Date.now(), cls: className(), source: S.sourceName, rows: tableRows(), n: S.questions.length });
    tone('end'); render(true);
  }
  function pause() { if (!S || S.phase === 'end') return; S.paused = !S.paused; lastT = Date.now(); paintPlay(); }
  function back() { clearInterval(timer); timer = 0; clearTimeout(autoNx); stopCam(); S = null; testHits = {}; var g = game(); g.type = null; g.started = false; if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} } if (typeof win.renderGames === 'function') win.renderGames(); }
  function toSetup() { clearInterval(timer); timer = 0; if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} } S = null; testHits = {}; win.classroomGame = { type: TYPE, started: false }; render(true); }
  function setManual(no, L) {
    if (!S || S.phase !== 'answer') return;
    var m = ansMap(); if (L) m[no] = L; else delete m[no];
    closePick(); paintPlay();
  }

  /* ---------- Bảng kết quả ---------- */
  function tableRows() {
    return S.roster.map(function (st) {
      var right = 0, done = 0, marks = S.questions.map(function (q, i) { var a = (S.answers[i] || {})[st.no]; if (!a) return '–'; done++; var ok = LET.indexOf(a) === q.correct; if (ok) right++; return a + (ok ? '✓' : '✗'); });
      return { no: st.no, name: st.name, absent: st.absent, right: right, done: done, marks: marks };
    });
  }
  function exportCsv() {
    if (!S) return;
    var rows = tableRows(), head = ['Thẻ', 'Học sinh', 'Số câu đúng', 'Số câu đã trả lời', 'Tổng số câu'].concat(S.questions.map(function (q, i) { return 'Câu ' + (i + 1); }));
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [head.map(q).join(',')].concat(rows.map(function (r) { return [r.no, r.name, r.right, r.done, S.questions.length].concat(r.marks).map(q).join(','); }));
    lines.push(''); lines.push(q('Đáp án đúng') + ',,,,,' + S.questions.map(function (x) { return LET[x.correct]; }).join(','));
    S.questions.forEach(function (x, i) { lines.push(q('Câu ' + (i + 1) + ': ' + x.text)); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = doc.createElement('a'), d = new Date();
    a.href = URL.createObjectURL(blob); a.download = 'Che-do-giay_' + className().replace(/[^\wÀ-ỹ.-]+/g, '-') + '_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.csv';
    doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Đã tải bảng kết quả (mở bằng Excel)');
  }

  /* ---------- Giao diện ---------- */
  function css() {
    if (doc.getElementById('cdgStyle')) return;
    var s = doc.createElement('style'); s.id = 'cdgStyle';
    s.textContent = ''
      + '.cdg-wrap{display:grid;gap:16px}.cdg-wrap .page-title h2{margin:0}.cdg-grid2{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:16px;align-items:start}'
      + '.cdg-box{background:#fff;border:1px solid #e4defc;border-radius:20px;padding:18px;box-shadow:0 6px 18px #4c1d9514;color:#1e1b4b}.cdg-box h3{margin:0 0 10px;font-size:19px;color:#3b0764}.cdg-box p{margin:6px 0;color:#475569}'
      + '.cdg-steps{margin:0;padding-left:22px;display:grid;gap:8px}.cdg-steps li{color:#334155}.cdg-steps b{color:#1e1b4b}'
      + '.cdg-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.cdg-row .btn{min-height:44px}'
      + '.cdg-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cdg-form label{display:grid;gap:5px;font-weight:700;color:#334155;font-size:15px}.cdg-form select{min-height:42px;border:1px solid #c4b5fd;border-radius:12px;padding:6px 10px;font:inherit;background:#fff}'
      + '.cdg-startbox{position:sticky;bottom:12px;z-index:5;box-shadow:0 10px 30px #4c1d9540}.cdg-start{display:block;width:100%;min-height:64px;font-size:22px!important;margin-top:6px}'
      + '.cdg-cam{position:relative;background:#0f172a;border-radius:16px;overflow:hidden;aspect-ratio:16/9;display:grid;place-items:center}.cdg-cam video,.cdg-cam canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.cdg-cam .off{color:#cbd5e1;font-size:15px;padding:16px;text-align:center}.cdg-cam.on .off{display:none}'
      + '.cdg-msg{font-size:14px;color:#475569;margin:8px 0 0}.cdg-msg.warn{color:#b45309;font-weight:700}.cdg-test{margin-top:8px;padding:10px 12px;border-radius:12px;background:#f5f3ff;color:#312e81;font-size:15px;min-height:22px}'
      + '.cdg-phone{margin-top:10px;border:1px solid #fde68a;background:#fffbeb;border-radius:14px;padding:10px 14px}.cdg-phone summary{cursor:pointer;font-weight:800;color:#92400e}.cdg-phone ol{margin:8px 0 0;padding-left:20px;display:grid;gap:6px;color:#422006}.cdg-phone h4{margin:10px 0 4px;color:#78350f}'
      + '.cdg-mini{display:flex;flex-wrap:wrap;gap:6px;max-height:150px;overflow:auto;margin-top:8px}.cdg-mini span{background:#f1f5f9;border-radius:999px;padding:4px 10px;font-size:13px;color:#334155}.cdg-mini b{color:#6d28d9}'
      + '.cdg-warn{color:#b45309;font-weight:700}'
      + '.cdg-game .page-title{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.cdg-game .toolbar{display:flex;gap:8px;flex-wrap:wrap}'
      + '.cdg-stage{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,.75fr);gap:16px;align-items:start}'
      + '.cdg-q{background:#fff;border-radius:22px;padding:20px 22px;box-shadow:0 8px 24px #4c1d951a;color:#1e1b4b}.cdg-qhead{display:flex;justify-content:space-between;gap:10px;color:#6d28d9;font-weight:800;font-size:17px}'
      + '#cdgQuestion{font-size:clamp(24px,2.6vw,38px);font-weight:850;line-height:1.25;margin:10px 0 14px}.cdg-qimg{max-width:100%;max-height:220px;border-radius:12px;display:block;margin:0 auto 12px}'
      + '.cdg-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cdg-opt{display:flex;gap:12px;align-items:center;border:3px solid #ddd6fe;border-radius:18px;padding:12px 14px;background:#faf5ff;font-size:clamp(18px,1.8vw,26px);font-weight:750;position:relative}'
      + '.cdg-opt b{display:grid;place-items:center;min-width:48px;height:48px;border-radius:14px;background:#6d28d9;color:#fff;font-size:26px}.cdg-opt .n{margin-left:auto;font-size:18px;color:#475569;font-weight:800}'
      + '.cdg-opt.ok{border-color:#16a34a;background:#dcfce7}.cdg-opt.ok b{background:#16a34a}.cdg-opt.no{opacity:.6}.cdg-opt .bar{position:absolute;left:0;bottom:0;height:6px;border-radius:0 6px 6px 0;background:#a78bfa}.cdg-opt.ok .bar{background:#16a34a}'
      + '.cdg-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cdg-acts .btn{min-height:52px;font-size:18px}'
      + '.cdg-clock{font-variant-numeric:tabular-nums}.cdg-clock.low{color:#dc2626}'
      + '.cdg-side{display:grid;gap:12px}.cdg-count{font-size:30px;font-weight:900;color:#3b0764;text-align:center}.cdg-count small{display:block;font-size:14px;color:#64748b;font-weight:700}'
      + '.cdg-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;margin-top:14px}'
      + '.cdg-tile{border:2px solid #e2e8f0;border-radius:12px;padding:7px 9px;background:#fff;text-align:left;font:inherit;cursor:pointer;color:#334155;display:flex;gap:7px;align-items:center;min-height:42px}'
      + '.cdg-tile i{font-style:normal;font-weight:900;color:#6d28d9;min-width:22px}.cdg-tile span{font-size:14px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
      + '.cdg-tile.done{background:#ede9fe;border-color:#a78bfa}.cdg-tile.done i::after{content:" ✓";color:#16a34a}.cdg-tile.abs{opacity:.45}'
      + '.cdg-tile.right{background:#dcfce7;border-color:#22c55e}.cdg-tile.wrong{background:#fee2e2;border-color:#f87171}.cdg-tile em{margin-left:auto;font-style:normal;font-weight:900}'
      + '.cdg-pick{position:fixed;z-index:1400;background:#fff;border-radius:16px;box-shadow:0 16px 40px #0f172a55;padding:10px;display:grid;gap:8px;min-width:220px}.cdg-pick h4{margin:0;font-size:15px;color:#1e1b4b}.cdg-pick div{display:flex;gap:6px}.cdg-pick button{min-width:44px;min-height:44px;border-radius:12px;border:2px solid #c4b5fd;background:#f5f3ff;font:inherit;font-weight:900;font-size:20px;cursor:pointer}.cdg-pick button.x{font-size:14px;font-weight:700}'
      + '.cdg-paused{background:#fef3c7;color:#92400e;border-radius:12px;padding:8px 12px;font-weight:800;text-align:center}'
      + '.cdg-end table{width:100%;border-collapse:collapse;font-size:15px}.cdg-end th,.cdg-end td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}.cdg-end th{background:#f5f3ff;color:#4c1d95}.cdg-end td.m{font-family:ui-monospace,monospace;white-space:nowrap}'
      + '.cdg-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.cdg-sum div{background:#f5f3ff;border-radius:14px;padding:12px;text-align:center;font-weight:800;color:#3b0764;font-size:24px}.cdg-sum small{display:block;font-size:13px;color:#64748b}'
      + '@media(max-width:900px){.cdg-grid2,.cdg-stage{grid-template-columns:1fr}.cdg-side{order:-1;grid-template-columns:1fr 1.7fr;align-items:center}.cdg-side .cdg-box{padding:10px}.cdg-count{font-size:24px}.cdg-side .cdg-msg{display:none}.cdg-form{grid-template-columns:1fr}.cdg-opts{grid-template-columns:1fr}}';
    doc.head.appendChild(s);
  }
  function phoneHelp() {
    return '<details class="cdg-phone"><summary>📱 Dùng điện thoại làm camera quét thẻ</summary>'
      + '<p>Điện thoại quét gần và nét hơn webcam, thầy cô cầm đi giữa lớp được. Chọn một trong ba cách:</p>'
      + '<h4>Cách 1 – Mở app ngay trên điện thoại (đơn giản nhất)</h4><ol><li>Trên điện thoại, mở Chrome (Android) hoặc Safari (iPhone), vào đúng địa chỉ app của trường.</li><li>Chọn đúng lớp, vào Trò chơi → Chế độ giấy → Bắt đầu, cho phép dùng camera.</li><li>Cầm điện thoại quét lớp; câu hỏi và kết quả hiện trên điện thoại. Kết quả lưu trên điện thoại đó.</li></ol>'
      + '<h4>Cách 2 – Biến điện thoại thành webcam của máy tính (câu hỏi chiếu lên tivi)</h4><ol><li>Cài ứng dụng miễn phí <b>Iriun Webcam</b> (hoặc DroidCam) trên cả điện thoại và máy tính; Android hay iPhone đều được.</li><li>Cho điện thoại và máy tính dùng chung một mạng Wi-Fi (hoặc cắm cáp USB), mở ứng dụng trên cả hai máy.</li><li>Ở mục <b>Camera dùng để quét</b> phía trên, bấm Mở camera rồi chọn tên camera của ứng dụng (ví dụ “Iriun Webcam”).</li></ol>'
      + '<h4>Cách 3 – Máy Windows 11 với điện thoại Android</h4><ol><li>Trên máy tính: Cài đặt → Bluetooth &amp; thiết bị → Thiết bị di động → bật “Cho phép máy tính truy cập điện thoại”, ghép với điện thoại qua ứng dụng Liên kết với Windows.</li><li>Bật “Sử dụng làm camera kết nối”. Điện thoại xuất hiện trong ô “Chọn camera” phía trên.</li></ol>'
      + '<p>Mẹo: đứng cách học sinh 2–5 mét, lớp đủ sáng, in thẻ đúng tỉ lệ 100%. Lớp đông thì quét làm hai lượt: dãy trái rồi dãy phải.</p></details>';
  }
  function setupHtml() {
    var src = source(), r = roster(), ok = src.list.length > 0 && r.length > 0, last = read(LKEY, null);
    var miniCards = r.slice(0, 60).map(function (s) { return '<span><b>' + s.no + '</b> ' + esc(s.name) + '</span>'; }).join('');
    return '<div class="cdg-wrap"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY</h2><p>Cả lớp trả lời trắc nghiệm bằng thẻ giấy – camera quét, máy chấm. Học sinh không cần thiết bị.</p></div><div class="toolbar"><button class="btn soft" data-cdg="back">← Thư viện</button></div></div>'
      + '<div class="cdg-grid2"><div style="display:grid;gap:16px">'
      + '<section class="cdg-box"><h3>Cách chơi</h3><ol class="cdg-steps"><li><b>In thẻ</b> cho cả lớp (mỗi bạn một thẻ có số riêng), phát thẻ.</li><li><b>Chiếu câu hỏi</b>. Học sinh xoay thẻ cho chữ mình chọn (A, B, C hoặc D) nằm ở <b>cạnh trên</b>, rồi giơ thẻ hướng về camera.</li><li>Camera quét cả lớp, ô tên học sinh hiện dấu ✓. Thầy cô bấm <b>Chốt &amp; hiện đáp án</b>, rồi <b>Câu tiếp</b>.</li></ol></section>'
      + '<section class="cdg-box"><h3>1 · Thẻ của lớp</h3><p>' + esc(className()) + ' · <b>' + r.length + '</b> học sinh · số thẻ gắn cố định với từng bạn (bạn mới nhận số kế tiếp, thẻ đã in vẫn dùng được).</p>'
      + (r.length ? '<div class="cdg-mini">' + miniCards + (r.length > 60 ? '<span>…</span>' : '') + '</div>' : '<p class="cdg-warn">Lớp chưa có danh sách học sinh. Vào mục Lớp học để nhập danh sách.</p>')
      + '<div class="cdg-form" style="margin-top:12px"><label>Số thẻ mỗi trang A4<select id="cdgPer">' + opt(1, cfg.perPage, '1 thẻ (to nhất, quét xa)') + opt(2, cfg.perPage, '2 thẻ (khuyên dùng)') + opt(4, cfg.perPage, '4 thẻ (tiết kiệm giấy, quét gần)') + '</select></label></div>'
      + '<div class="cdg-row"><button class="btn color" data-cdg="print"' + (r.length ? '' : ' disabled') + '>🖨 In thẻ cả lớp</button></div><p class="cdg-msg">Khi in: chọn khổ A4, tỉ lệ 100% (không “thu nhỏ cho vừa”). Cắt theo đường nét đứt.</p></section>'
      + '<section class="cdg-box"><h3>2 · Câu hỏi</h3><p>' + (src.list.length ? 'Bộ câu hỏi: <b>' + esc(src.name) + '</b> · <b>' + src.list.length + '</b> câu trắc nghiệm dùng được (2–4 phương án, câu Đúng/Sai dùng A–B).' : '<span class="cdg-warn">Chưa có câu trắc nghiệm A–B–C–D. Chọn một bộ trong Kho câu hỏi.</span>') + '</p><div class="cdg-row"><button class="btn soft" data-cdg="kho">📚 Chọn bộ câu hỏi khác</button></div></section>'
      + '<section class="cdg-box" id="cdgSetup"><h3>3 · Luật chơi</h3><div id="cdgRules"></div><div class="cdg-form" style="margin-top:12px">'
      + '<label>Số câu<select id="cdgCount">' + opt('5', cfg.count, '5 câu') + opt('10', cfg.count, '10 câu') + opt('15', cfg.count, '15 câu') + opt('20', cfg.count, '20 câu') + opt('all', cfg.count, 'Tất cả') + '</select></label>'
      + '<label>Thời gian trả lời mỗi câu<select id="cdgTime">' + [0, 15, 20, 30, 45, 60, 90, 120].map(function (n) { return opt(n, cfg.time, n ? n + ' giây (hết giờ tự chốt)' : 'Không giới hạn (thầy cô chốt)'); }).join('') + '</select></label>'
      + '<label>Thứ tự câu hỏi<select id="cdgOrder">' + opt('set', cfg.order, 'Theo thứ tự trong bộ') + opt('shuffle', cfg.order, 'Trộn ngẫu nhiên') + '</select></label>'
      + '<label>Học sinh vắng<select id="cdgAbsent">' + opt(1, cfg.absent ? 1 : 0, 'Không tính vào sĩ số') + opt(0, cfg.absent ? 1 : 0, 'Vẫn tính') + '</select></label>'
      + '<label>Tiếng báo khi quét được thẻ<select id="cdgSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label>'
      + '</div></section></div>'
      + '<div style="display:grid;gap:16px"><section class="cdg-box"><h3>4 · Camera dùng để quét</h3>'
      + '<div class="cdg-cam" id="cdgCamBox"><video id="cdgVideo" autoplay muted playsinline></video><canvas id="cdgOverlay"></canvas><div class="off">Camera đang tắt.<br>Bấm “Mở camera” để thử quét một thẻ.</div></div>'
      + '<div class="cdg-row"><button class="btn color" id="cdgCamBtn" data-cdg="cam">📷 Mở camera</button></div>'
      + '<div class="cdg-form" style="margin-top:10px"><label>Chọn camera<select id="cdgCam">' + camOptions() + '</select></label><label>Độ nét<select id="cdgRes">' + opt('720', cfg.res, 'Thường (máy nhẹ)') + opt('1080', cfg.res, 'Cao (quét xa hơn)') + '</select></label></div>'
      + '<p class="cdg-msg" id="cdgCamMsg"></p><div class="cdg-test" id="cdgTest">Giơ thử một thẻ trước camera để kiểm tra.</div>' + phoneHelp() + '</section>'
      + (last && last.rows ? '<section class="cdg-box"><h3>Lượt gần nhất</h3><p>' + esc(last.cls) + ' · ' + esc(new Date(last.at).toLocaleString('vi-VN')) + ' · ' + esc(last.source) + '</p></section>' : '')
      + '<section class="cdg-box cdg-startbox"><button class="btn color cdg-start" data-cdg="start"' + (ok ? '' : ' disabled') + '>▶ Bắt đầu</button><p class="cdg-msg" style="text-align:center">Cài đặt xong mới bấm. Camera đang mở sẽ được dùng luôn.</p></section>'
      + '</div></div></div>';
  }
  function playHtml() {
    return '<div class="cdg-game"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY</h2><p>' + esc(className()) + ' · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn soft" data-cdg="pause" id="cdgPauseBtn">Ⅱ Tạm dừng</button><button class="btn soft" id="cdgCamBtn" data-cdg="cam">📷 Tắt camera</button><button class="btn soft" data-cdg="finish">Kết thúc</button></div></div>'
      + '<div class="cdg-stage"><section><div class="cdg-q" id="cdgStage"><div class="cdg-qhead"><span id="cdgNo"></span><span class="cdg-clock" id="cdgClock"></span></div><div id="cdgPaused"></div><div id="cdgQuestion"></div><div id="cdgImg"></div><div class="cdg-opts" id="cdgOpts"></div><div class="cdg-acts" id="cdgActs"></div></div>'
      + '<div class="cdg-tiles" id="cdgTiles"></div></section>'
      + '<aside class="cdg-side"><div class="cdg-box"><div class="cdg-count" id="cdgCount"></div></div><div class="cdg-box"><div class="cdg-cam" id="cdgCamBox"><video id="cdgVideo" autoplay muted playsinline></video><canvas id="cdgOverlay"></canvas><div class="off">Camera đang tắt.<br>Vẫn chơi được: bấm vào ô tên học sinh để ghi đáp án.</div></div><p class="cdg-msg" id="cdgCamMsg"></p></div></aside></div></div>';
  }
  function paintClock() {
    var el = doc.getElementById('cdgClock'); if (!el || !S) return;
    if (S.phase === 'answer' && S.left > 0) { var s = Math.ceil(S.left); el.textContent = '⏱ ' + s + ' giây'; el.classList.toggle('low', s <= 5); }
    else if (S.phase === 'reveal' && S.nextLeft !== null) { el.textContent = 'Câu tiếp sau ' + Math.max(0, Math.ceil(S.nextLeft)) + ' giây'; el.classList.remove('low'); }
    else { el.textContent = ''; el.classList.remove('low'); }
  }
  function paintPlay() {
    if (!S || S.phase === 'end') return;
    var q = Q(), m = ansMap(), rev = S.phase === 'reveal', c = counts(), exp = expected(), got = exp.filter(function (s) { return m[s.no]; }).length, extra = Object.keys(m).length - got;
    var maxc = Math.max(1, Math.max.apply(null, c));
    doc.getElementById('cdgNo').textContent = 'Câu ' + (S.q + 1) + '/' + S.questions.length;
    var qq = doc.getElementById('cdgQuestion'); if (qq.dataset.k !== String(S.q)) { qq.dataset.k = String(S.q); qq.textContent = q.text; doc.getElementById('cdgImg').innerHTML = q.image && /^(data:image|https?:|\.\/|assets\/)/.test(q.image) ? '<img class="cdg-qimg" alt="" src="' + esc(q.image) + '">' : ''; }
    doc.getElementById('cdgPaused').innerHTML = S.paused ? '<div class="cdg-paused">ĐANG TẠM DỪNG – máy chưa ghi thêm thẻ</div>' : '';
    doc.getElementById('cdgOpts').innerHTML = q.answers.map(function (a, i) {
      var cls = rev ? (i === q.correct ? ' ok' : ' no') : '';
      return '<div class="cdg-opt' + cls + '"><b>' + LET[i] + '</b><span class="cdg-opt-text">' + esc(a) + '</span>' + (rev ? '<span class="n">' + c[i] + ' bạn</span><span class="bar" style="width:' + Math.round(c[i] / maxc * 100) + '%"></span>' : '') + '</div>';
    }).join('');
    doc.getElementById('cdgActs').innerHTML = rev
      ? '<button class="btn color" data-cdg="next">' + (S.q + 1 >= S.questions.length ? '🏁 Xem kết quả' : 'Câu tiếp →') + '</button>'
      : '<button class="btn color" data-cdg="lock">🔒 Chốt &amp; hiện đáp án</button>';
    doc.getElementById('cdgCount').innerHTML = got + '/' + exp.length + '<small>' + (rev ? 'bạn trả lời · ' + c[q.correct] + ' bạn đúng' : 'bạn đã giơ thẻ') + (extra > 0 ? ' · +' + extra + ' bạn vắng' : '') + '</small>';
    doc.getElementById('cdgTiles').innerHTML = S.roster.map(function (st) {
      var a = m[st.no], cls = a ? (rev ? (LET.indexOf(a) === q.correct ? ' right' : ' wrong') : ' done') : '';
      if (cfg.absent && st.absent && !a) cls += ' abs';
      return '<button type="button" class="cdg-tile' + cls + '" data-cdg-tile="' + st.no + '" title="Bấm để ghi đáp án bằng tay"><i>' + st.no + '</i><span>' + esc(st.name) + '</span>' + (rev && a ? '<em>' + a + '</em>' : '') + '</button>';
    }).join('');
    var pb = doc.getElementById('cdgPauseBtn'); if (pb) pb.textContent = S.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
    paintClock(); paintCam();
  }
  function endHtml() {
    var rows = tableRows(), n = S.questions.length, took = rows.filter(function (r) { return r.done; }), avg = took.length ? took.reduce(function (s, r) { return s + r.right; }, 0) / took.length : 0;
    var perQ = S.questions.map(function (q, i) { var m = S.answers[i] || {}, k = Object.keys(m), r = k.filter(function (no) { return LET.indexOf(m[no]) === q.correct; }).length; return k.length ? Math.round(r / k.length * 100) : 0; });
    var hardest = -1; perQ.forEach(function (v, i) { if (Object.keys(S.answers[i] || {}).length && (hardest < 0 || v < perQ[hardest])) hardest = i; });
    if (!n) return '<div class="cdg-game cdg-end"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY · KẾT QUẢ</h2><p>' + esc(className()) + '</p></div><div class="toolbar"><button class="btn soft" data-cdg="again">↻ Chơi lại</button><button class="btn soft" data-cdg="back">← Thư viện</button></div></div><div class="cdg-box"><p>Lượt này chưa chốt câu nào nên chưa có kết quả.</p></div></div>';
    return '<div class="cdg-game cdg-end"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY · KẾT QUẢ</h2><p>' + esc(className()) + ' · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn color" data-cdg="csv">⇩ Tải bảng kết quả (Excel)</button><button class="btn soft" data-cdg="again">↻ Chơi lại</button><button class="btn soft" data-cdg="back">← Thư viện</button></div></div>'
      + '<div class="cdg-box"><div class="cdg-sum"><div>' + n + '<small>câu hỏi</small></div><div>' + took.length + '/' + rows.length + '<small>học sinh có trả lời</small></div><div>' + avg.toFixed(1).replace('.', ',') + '/' + n + '<small>số câu đúng trung bình</small></div>' + (hardest >= 0 ? '<div>Câu ' + (hardest + 1) + '<small>khó nhất (' + perQ[hardest] + '% đúng)</small></div>' : '') + '</div>'
      + '<div style="overflow:auto"><table><thead><tr><th>Thẻ</th><th>Học sinh</th><th>Đúng</th>' + S.questions.map(function (q, i) { return '<th title="' + esc(q.text) + '">C' + (i + 1) + '<br><small>' + LET[q.correct] + ' · ' + perQ[i] + '%</small></th>'; }).join('') + '</tr></thead><tbody>'
      + rows.map(function (r) { return '<tr><td>' + r.no + '</td><td>' + esc(r.name) + (r.absent ? ' <small>(vắng)</small>' : '') + '</td><td><b>' + r.right + '/' + n + '</b></td>' + r.marks.map(function (x) { return '<td class="m" style="color:' + (/✓/.test(x) ? '#15803d' : /✗/.test(x) ? '#b91c1c' : '#94a3b8') + '">' + x + '</td>'; }).join('') + '</tr>'; }).join('')
      + '</tbody></table></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return; css();
    if (!S) { if (force || !doc.getElementById('cdgSetup')) { g.innerHTML = setupHtml(); attachVideo(); paintCam(); if (!camDevices.length) listCams().then(function () { var sel = doc.getElementById('cdgCam'); if (sel && camDevices.length) sel.innerHTML = camOptions(); }); } return; }
    if (S.phase === 'end') { g.innerHTML = endHtml(); return; }
    if (force || !doc.getElementById('cdgStage')) { g.innerHTML = playHtml(); attachVideo(); }
    paintPlay();
  }

  /* ---------- Ô chọn đáp án bằng tay ---------- */
  function closePick() { var p = doc.getElementById('cdgPick'); if (p) p.remove(); }
  function openPick(no, anchor) {
    closePick(); if (!S || S.phase !== 'answer') { toast(S && S.phase === 'reveal' ? 'Câu này đã chốt.' : ''); return; }
    var st = byNo(no), q = Q(), r = anchor.getBoundingClientRect(), p = doc.createElement('div');
    p.className = 'cdg-pick'; p.id = 'cdgPick';
    p.innerHTML = '<h4>Thẻ ' + no + ' · ' + esc(st ? st.name : '') + '</h4><div>' + q.answers.map(function (a, i) { return '<button type="button" data-cdg-set="' + LET[i] + '">' + LET[i] + '</button>'; }).join('') + '<button type="button" class="x" data-cdg-set="">Xoá</button></div>';
    p.dataset.no = String(no); doc.body.appendChild(p);
    var top = Math.min(win.innerHeight - p.offsetHeight - 8, r.bottom + 6), left = Math.min(win.innerWidth - p.offsetWidth - 8, Math.max(8, r.left));
    p.style.top = Math.max(8, top) + 'px'; p.style.left = left + 'px';
  }

  /* ---------- Sự kiện ---------- */
  doc.addEventListener('click', function (e) {
    var pk = e.target.closest && e.target.closest('#cdgPick');
    if (pk) { var sb = e.target.closest('[data-cdg-set]'); if (sb) setManual(Number(pk.dataset.no), sb.dataset.cdgSet); return; }
    closePick();
    if (game().type !== TYPE) return;
    var g = games(); if (!g || !g.contains(e.target)) return;
    var t = e.target.closest('[data-cdg-tile]'); if (t) { openPick(Number(t.dataset.cdgTile), t); return; }
    var b = e.target.closest('[data-cdg]'); if (!b || b.disabled) return;
    var act = b.dataset.cdg;
    if (act === 'start') begin();
    else if (act === 'back') back();
    else if (act === 'print') { collect(); printCards(roster()); }
    else if (act === 'cam') { if (stream) { stopCam(); paintCam(); } else { collect(); startCam(); } }
    else if (act === 'lock') lock();
    else if (act === 'next') next();
    else if (act === 'pause') pause();
    else if (act === 'finish') { if (win.confirm ? win.confirm('Kết thúc lượt chơi và xem kết quả?') : true) finish(); }
    else if (act === 'csv') exportCsv();
    else if (act === 'again') toSetup();
    else if (act === 'kho') { back(); if (typeof win.openView === 'function') win.openView('questions'); }
  });
  doc.addEventListener('change', function (e) {
    if (game().type !== TYPE || S || !e.target) return;
    if (e.target.id === 'cdgCam' || e.target.id === 'cdgRes') { collect(); if (stream) startCam(); }
    else if (/^cdg/.test(e.target.id)) collect();
  });
  doc.addEventListener('keydown', function (e) {
    if (game().type !== TYPE || !S || S.phase === 'end') return;
    var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') { closePick(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); if (S.phase === 'answer') lock(); else next(); }
  });
  doc.addEventListener('visibilitychange', function () { lastT = Date.now(); });

  /* ---------- Gắn vào ứng dụng ---------- */
  var baseSetup = win.gameSetup, baseRender = win.renderGames, baseStart = win.gameStart, baseOpen = win.openView, baseBack = win.gameBack;
  win.gameSetup = function (t) { if (t === TYPE) { clearInterval(timer); timer = 0; S = null; testHits = {}; win.classroomGame = { type: TYPE, started: false }; render(true); return; } if (game().type === TYPE) { stopCam(); S = null; } return baseSetup.apply(this, arguments); };
  win.renderGames = function () { if (game().type === TYPE) { render(false); return; } var out = baseRender.apply(this, arguments); decorateCard(); return out; };
  win.gameStart = function () { if (game().type === TYPE) { if (!S) begin(); return; } return baseStart.apply(this, arguments); };
  if (typeof baseBack === 'function') win.gameBack = function () { if (game().type === TYPE) { clearInterval(timer); timer = 0; stopCam(); S = null; closePick(); } return baseBack.apply(this, arguments); };
  if (typeof baseOpen === 'function') win.openView = function (id) { if (id !== 'games' && game().type === TYPE) back(); var out = baseOpen.apply(this, arguments); if (id === 'games') setTimeout(decorateCard, 0); return out; };
  function decorateCard() {
    var g = games(); if (!g) return;
    Array.prototype.forEach.call(g.querySelectorAll('.game-library-card'), function (card) {
      var h = card.querySelector('h3'); if (!h || h.textContent.trim() !== 'Chế độ giấy' || card.dataset.cdg) return;
      card.dataset.cdg = '1';
      var p = card.querySelector('p'); if (p) p.textContent = 'Học sinh giơ thẻ giấy A/B/C/D, camera quét cả lớp cùng lúc và chấm ngay. Không cần thiết bị cho học sinh.';
      var tags = card.querySelectorAll('.game-tags span'); if (tags[0]) tags[0].textContent = '👥 Cả lớp'; if (tags[1]) tags[1].textContent = '📷 Camera · thẻ giấy';
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', decorateCard); else setTimeout(decorateCard, 0);

  win.hmvCheDoGiay = { state: function () { return S ? { phase: S.phase, q: S.q, n: S.questions.length, answers: JSON.parse(JSON.stringify(ansMap())), paused: S.paused } : null; }, roster: roster, letterOf: letterOf, markerSvg: markerSvg, loadLib: loadLib, set: setManual, cfg: function () { return cfg; } };
})();
