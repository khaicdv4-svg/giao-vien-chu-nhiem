/* BAN-CHINH 2.45 · Trò chơi "Chế độ giấy".
 *
 * 2.45: quét bằng điện thoại qua mã QR (trang quet-the.html, kênh rt-che-do-giay.js); bảng "Vừa quét" hiện tên + đáp án;
 *       chốt câu hiện danh sách Đúng / Chưa đúng / Chưa trả lời; màn hình kết quả có danh sách theo từng câu.
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
  var DEF = { count: '10', time: 0, order: 'set', absent: true, sound: true, cam: '', res: '720', perPage: 2, names: true, src: 'phone', show: 'now' };
  var LET = 'ABCD';
  var cfg = Object.assign({}, DEF, read(SKEY, {}));
  var link = null, linkCode = '', phoneSeen = 0, stateTimer = 0, feed = [], phoneTest = {}, qrPromise = null;
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


  /* ---------- 2.59: Hiệu ứng vui nhộn (nhận thẻ, chốt đáp án, kết thúc) ---------- */
  var EMO = ['🎉', '⭐', '🌟', '✨', '🚀', '💫', '🎈', '👏', '🥳', '💖'], fxLive = 0, fxMile = {};
  function fxCss() {
    if (doc.getElementById('cdgFxCss')) return;
    var st = doc.createElement('style'); st.id = 'cdgFxCss';
    st.textContent = '#cdgFx{position:fixed;inset:0;pointer-events:none;z-index:9990;overflow:hidden}'
      + '.cdg-fly{position:fixed;left:0;top:0;display:flex;align-items:center;gap:6px;padding:6px 12px 6px 6px;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font:800 16px/1 system-ui,sans-serif;box-shadow:0 8px 24px #7c3aed55;white-space:nowrap;transform:translate(-50%,-50%);will-change:transform,opacity}'
      + '.cdg-fly i{font-style:normal;background:#fff;color:#7c3aed;border-radius:999px;min-width:26px;height:26px;display:grid;place-items:center;font-size:14px}'
      + '.cdg-spark{position:fixed;left:0;top:0;font-size:22px;transform:translate(-50%,-50%);will-change:transform,opacity}'
      + '.cdg-bits{position:fixed;left:0;top:0;width:9px;height:14px;border-radius:2px;will-change:transform,opacity}'
      + '.cdg-banner{position:fixed;left:50%;top:22%;transform:translate(-50%,-50%) scale(.3);padding:18px 34px;border-radius:26px;background:#fff;color:#4c1d95;font:900 clamp(26px,4vw,48px)/1.15 system-ui,sans-serif;text-align:center;box-shadow:0 18px 60px #4c1d9555,0 0 0 6px #fde68a;opacity:0;animation:cdgBan 1.9s cubic-bezier(.2,1.4,.4,1) forwards}'
      + '.cdg-banner small{display:block;font-size:.45em;font-weight:700;color:#7c3aed;margin-top:6px}'
      + '@keyframes cdgBan{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-6deg)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.08) rotate(2deg)}28%{transform:translate(-50%,-50%) scale(1) rotate(0)}82%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-60%) scale(.9)}}'
      + '.cdg-ring.bump{animation:cdgBump .45s ease}@keyframes cdgBump{40%{transform:scale(1.18)}}'
      + '.cdg-tile.pop{animation:cdgPop .6s cubic-bezier(.2,1.6,.4,1)}@keyframes cdgPop{0%{transform:scale(.6)}50%{transform:scale(1.15) rotate(-3deg)}100%{transform:scale(1)}}'
      + '.cdg-lists .ok .cdg-chip{animation:cdgChip .5s cubic-bezier(.2,1.6,.4,1) both}.cdg-lists .ok .cdg-chip:nth-child(n){animation-delay:calc(var(--k,0)*60ms)}@keyframes cdgChip{0%{opacity:0;transform:translateY(14px) scale(.6)}100%{opacity:1;transform:none}}'
      + '.cdg-opt.ok{animation:cdgGlow 1.2s ease 2}@keyframes cdgGlow{50%{box-shadow:0 0 0 6px #86efac,0 0 34px #22c55e}}'
      + '.cdg-stars .s{animation:cdgChip .6s cubic-bezier(.2,1.6,.4,1) both}.cdg-stars .s:nth-of-type(2){animation-delay:.15s}.cdg-stars .s:nth-of-type(3){animation-delay:.3s}.cdg-stars .s:nth-of-type(4){animation-delay:.45s}'
      + '@media(prefers-reduced-motion:reduce){#cdgFx{display:none}.cdg-tile.pop,.cdg-banner,.cdg-ring.bump{animation:none}}';
    doc.head.appendChild(st);
  }
  function fxLayer() { fxCss(); var l = doc.getElementById('cdgFx'); if (!l) { l = doc.createElement('div'); l.id = 'cdgFx'; doc.body.appendChild(l); } return l; }
  function fxClear() { var l = doc.getElementById('cdgFx'); if (l) l.innerHTML = ''; fxLive = 0; }
  function anim(el, frames, ms, done) { try { var a = el.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }); a.onfinish = function () { el.remove(); if (done) done(); }; } catch (e) { setTimeout(function () { el.remove(); if (done) done(); }, ms); } }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function sparks(x, y, n, big) {
    var l = fxLayer();
    for (var i = 0; i < n; i++) {
      var e = doc.createElement('div'); e.className = 'cdg-spark'; e.textContent = EMO[(Math.random() * EMO.length) | 0];
      if (big) e.style.fontSize = (24 + Math.random() * 18) + 'px';
      var a = Math.random() * Math.PI * 2, d = (big ? 120 : 50) + Math.random() * (big ? 160 : 60);
      l.appendChild(e);
      anim(e, [{ transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(' + (x + Math.cos(a) * d) + 'px,' + (y + Math.sin(a) * d - 30) + 'px) translate(-50%,-50%) scale(1.1) rotate(' + ((Math.random() * 80) - 40) + 'deg)', opacity: 0 }], 700 + Math.random() * 500);
    }
  }
  function confetti(n) {
    var l = fxLayer(), W = win.innerWidth, H = win.innerHeight;
    for (var i = 0; i < n; i++) {
      var e = doc.createElement('div'); e.className = 'cdg-bits'; e.style.background = 'hsl(' + ((i * 47) % 360) + ',90%,58%)';
      var x0 = Math.random() * W, dx = (Math.random() - .5) * 240, rot = (Math.random() * 900) - 450;
      l.appendChild(e);
      anim(e, [{ transform: 'translate(' + x0 + 'px,-30px) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (x0 + dx) + 'px,' + (H + 40) + 'px) rotate(' + rot + 'deg)', opacity: .9 }], 1800 + Math.random() * 1600);
    }
  }
  function banner(text, sub) { var l = fxLayer(), b = doc.createElement('div'); b.className = 'cdg-banner'; b.innerHTML = esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : ''); l.appendChild(b); setTimeout(function () { b.remove(); }, 2000); }
  function ping(n) {   /* tiếng "bíp" vui, cao dần theo số bạn đã giơ thẻ */
    if (!cfg.sound) return;
    try {
      var C = win.AudioContext || win.webkitAudioContext; if (!C) return; if (!actx || actx.state === 'closed') actx = new C(); if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime + .01, f = 660 * Math.pow(2, ((n % 12) * 2) / 12);
      [f, f * 1.5].forEach(function (fr, i) { var o = actx.createOscillator(), g = actx.createGain(), s = t + i * .07; o.type = 'sine'; o.frequency.setValueAtTime(fr, s); o.frequency.exponentialRampToValueAtTime(fr * 1.25, s + .08); g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(.08, s + .015); g.gain.exponentialRampToValueAtTime(.0001, s + .16); o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + .2); });
    } catch (e) {}
  }
  function mp3(src, vol) { if (!cfg.sound) return null; try { var a = new win.Audio(src); a.volume = vol; var p = a.play(); if (p && p.catch) p.catch(function () {}); return a; } catch (e) { return null; } }
  function fxAnswer(no) {
    if (!S) return;
    var exp = expected(), m = ansMap(), got = exp.filter(function (s) { return m[s.no]; }).length;
    ping(got);
    var tile = doc.querySelector('[data-cdg-tile="' + no + '"]'), ring = doc.getElementById('cdgRing'), st = byNo(no);
    if (ring) { ring.classList.remove('bump'); void ring.offsetWidth; ring.classList.add('bump'); }
    if (tile) {
      var a = center(tile); sparks(a.x, a.y, 5, false);
      if (ring && fxLive < 6) {
        var b = center(ring), f = doc.createElement('div'); f.className = 'cdg-fly'; f.innerHTML = '<i>' + no + '</i>' + esc(st ? st.name : ''); fxLayer().appendChild(f); fxLive++;
        var mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 80;
        anim(f, [{ transform: 'translate(' + a.x + 'px,' + a.y + 'px) translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(' + a.x + 'px,' + (a.y - 30) + 'px) translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .2 }, { transform: 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%) scale(1)', opacity: 1, offset: .6 }, { transform: 'translate(' + b.x + 'px,' + b.y + 'px) translate(-50%,-50%) scale(.3)', opacity: 0 }], 1100, function () { fxLive--; });
      }
    }
    var key = S.q + '|' + S.round, pct = exp.length ? got / exp.length : 0;
    if (pct >= 1 && !fxMile[key + 'f']) { fxMile[key + 'f'] = 1; banner('Cả lớp đã giơ thẻ! 🎉', 'Thầy cô có thể chốt đáp án'); confetti(60); mp3('assets/audio/cheer.mp3', .55); }
    else if (pct >= .5 && exp.length >= 6 && !fxMile[key + 'h']) { fxMile[key + 'h'] = 1; banner('Nửa lớp rồi! 💪'); }
  }
  function fxReveal() {
    if (!S) return; fxClear();
    var q = Q(), c = counts(), tot = c.reduce(function (a, b) { return a + b; }, 0), r = tot ? c[q.correct] / tot : 0;
    var ok = doc.querySelectorAll('.cdg-lists .ok .cdg-chip'); Array.prototype.forEach.call(ok, function (el, i) { el.style.setProperty('--k', Math.min(i, 30)); });
    var opt = doc.querySelector('.cdg-opt.ok'); if (opt) { var p = center(opt); sparks(p.x, p.y, 14, true); }
    if (!tot) return;
    if (r >= .8) { banner(r === 1 ? 'Tuyệt vời! Cả lớp đều đúng! 🏆' : 'Xuất sắc! ' + c[q.correct] + ' bạn trả lời đúng 🌟'); confetti(90); try { if (cfg.sound && win.hmvDungSai) win.hmvDungSai.right(1); } catch (e) {} setTimeout(function () { mp3('assets/audio/cheer.mp3', .6); }, 350); }
    else if (r >= .5) { banner('Giỏi lắm! ' + c[q.correct] + ' bạn đúng 👏'); confetti(40); try { if (cfg.sound && win.hmvDungSai) win.hmvDungSai.right(1); } catch (e) {} }
    else { banner('Cùng xem lại nhé! 💡', c[q.correct] + ' bạn chọn đúng đáp án ' + LET[q.correct]); tone('reveal'); }
  }
  function fxEnd() {
    fxClear(); if (!S || !S.questions.length) return;
    banner('Hoàn thành! 🎊', 'Cả lớp giỏi quá!'); confetti(140); setTimeout(function () { confetti(90); }, 900);
    var played = cfg.sound && win.hmvMung && typeof win.hmvMung.play === 'function' ? win.hmvMung.play(1, function () { tone('end'); }) : false;
    if (!played) tone('end');
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
  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise(function (ok, bad) { var s = doc.createElement('script'); s.src = src; s.async = true; s.onload = function () { test() ? ok() : bad(new Error('load')); }; s.onerror = function () { bad(new Error('load')); }; doc.head.appendChild(s); });
  }
  function loadQr() { if (!qrPromise) qrPromise = loadScript('./qr-che-do-giay.js', function () { return typeof win.qrcode === 'function'; }).catch(function (e) { qrPromise = null; throw e; }); return qrPromise; }

  /* ---------- Điện thoại quét thẻ (mã QR) ---------- */
  function phoneUrl() {
    var pub = location.protocol === 'https:' && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    var base = pub ? location.href.replace(/[#?].*$/, '').replace(/[^\/]*$/, '') : 'https://giao-vien-chu-nhiem.vercel.app/';
    return base + 'quet-the.html#' + linkCode;
  }
  function phoneOn() { return Date.now() - phoneSeen < 12000; }
  function ensureLink() {
    if (link) return Promise.resolve(link);
    return loadScript('./rt-che-do-giay.js', function () { return !!win.HMVRT; }).then(function () {
      if (link) return link;
      try { linkCode = sessionStorage.getItem('hmv_cdg_room') || ''; } catch (e) {}
      if (!/^[A-Z0-9]{6}$/.test(linkCode)) { linkCode = win.HMVRT.newCode(); try { sessionStorage.setItem('hmv_cdg_room', linkCode); } catch (e) {} }
      link = win.HMVRT.join(linkCode, 'pc', onPhone, function () { paintLink(); if (link && link.status() === 'online') pushState(); });
      link.send('hello-pc', {});
      clearInterval(stateTimer); stateTimer = setInterval(function () { if (!here()) { closeLink(); return; } pushState(); paintLink(); }, 3000);
      return link;
    });
  }
  function closeLink() { clearInterval(stateTimer); stateTimer = 0; if (link) { try { link.close(); } catch (e) {} } link = null; phoneSeen = 0; }
  function onPhone(ev, p) {
    if (ev === 'hello' || ev === 'ping') {
      var was = phoneOn(); phoneSeen = Date.now();
      if (ev === 'hello') pushState();
      if (!was) { paintLink(); toast('📱 Điện thoại đã kết nối – sẵn sàng quét thẻ'); tone('start'); }
      return;
    }
    if (ev === 'test') { phoneSeen = Date.now(); var now = Date.now(), c = p.cards || {}; Object.keys(c).forEach(function (k) { phoneTest[k] = { L: c[k], t: now }; testHits[k] = { L: c[k], t: now }; }); paintTest(); return; }
    if (ev === 'scan') {
      phoneSeen = Date.now();
      if (!S || S.phase !== 'answer' || S.paused || p.q !== S.q || p.round !== S.round) return;
      var cards = p.cards || {}; Object.keys(cards).forEach(function (k) { record(Number(k), String(cards[k]), 'phone'); });
    }
  }
  var pushSoonT = 0;
  function pushSoon() { clearTimeout(pushSoonT); pushSoonT = setTimeout(pushState, 150); }
  function pushState() {
    if (!link) return;
    var st;
    if (S) { var q = Q(); st = { phase: S.phase, q: S.q, n: S.questions.length, round: S.round, paused: S.paused, text: S.phase === 'end' || !q ? '' : q.text, opts: q ? q.answers.length : 4, deck: S.roster.map(function (x) { return x.no; }), need: expected().map(function (x) { return x.no; }), got: Object.keys(ansMap()).map(Number) }; }
    else { var r = roster(); st = { phase: 'setup', deck: r.map(function (x) { return x.no; }), need: r.map(function (x) { return x.no; }), got: [] }; }
    link.send('state', st);
  }
  function qrSvg(text, cell) {
    var q = win.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: cell || 6, margin: 2, scalable: true });
  }
  function paintLink() {
    var on = phoneOn(), st = link ? link.status() : 'connecting';
    doc.querySelectorAll('[data-cdg-link]').forEach(function (el) {
      el.classList.toggle('on', on); el.classList.toggle('err', st === 'error' || st === 'offline');
      el.textContent = on ? '📱 Điện thoại đã kết nối' : st === 'online' ? 'Chờ điện thoại quét mã…' : st === 'error' ? 'Lỗi kết nối máy chủ' : st === 'offline' ? 'Mất mạng – đang thử lại…' : 'Đang mở phòng…';
    });
    doc.querySelectorAll('[data-cdg-code]').forEach(function (el) { el.textContent = linkCode; });
    doc.querySelectorAll('[data-cdg-qr]').forEach(function (el) {
      if (!linkCode || el.dataset.code === linkCode) return;
      loadQr().then(function () { el.innerHTML = qrSvg(phoneUrl(), 6); el.dataset.code = linkCode; el.title = phoneUrl(); }).catch(function () { el.textContent = 'Chưa tạo được mã QR (kiểm tra mạng).'; });
    });
    doc.querySelectorAll('[data-cdg-url]').forEach(function (el) { el.textContent = phoneUrl().replace(/^https:\/\//, ''); });
  }
  function bigQr() {
    loadQr().then(function () {
      var old = doc.getElementById('cdgQrBig'); if (old) { old.remove(); return; }
      var o = doc.createElement('div'); o.id = 'cdgQrBig'; o.className = 'cdg-qrbig';
      o.innerHTML = '<div class="in"><h3>📱 Quét mã bằng camera điện thoại</h3><div class="qr">' + qrSvg(phoneUrl(), 10) + '</div><p>Hoặc mở <b>' + esc(phoneUrl().replace(/^https:\/\//, '').replace(/#.*/, '')) + '</b> rồi nhập mã <b class="code">' + linkCode + '</b></p><p class="st" data-cdg-link></p><button class="btn color" type="button">Đóng</button></div>';
      o.onclick = function (e) { if (e.target === o || e.target.closest('button')) o.remove(); };
      doc.body.appendChild(o); paintLink();
    });
  }

  /* ---------- Ghi đáp án (camera máy tính, điện thoại, bấm tay) ---------- */
  function record(no, L, src) {
    if (!S || S.phase !== 'answer' || S.paused) return false;
    var st = byNo(no), q = Q(), i = LET.indexOf(L); if (!st || i < 0 || i >= q.answers.length) return false;
    var m = ansMap(), had = m[no]; if (had === L) return false;
    m[no] = L; feed.unshift({ no: no, L: L, t: Date.now(), change: !!had, src: src }); if (feed.length > 40) feed.length = 40;
    paintPlay(); pushSoon(); if (!had) fxAnswer(no); return true;
  }
  function feedHtml() {
    if (!feed.length) return '<p class="cdg-feed-empty">Chưa có thẻ nào. Học sinh giơ thẻ hướng về camera.</p>';
    var now = Date.now();
    return feed.slice(0, 8).map(function (f) {
      var st = byNo(f.no), fresh = now - f.t < 1500, ans = cfg.show === 'now' || (S && S.phase === 'reveal');
      return '<div class="cdg-feed-item' + (fresh ? ' fresh' : '') + '"><span class="no">' + f.no + '</span><span class="nm">' + esc(st ? st.name : '') + '</span>' + (ans ? '<span class="ch">' + (f.change ? 'đổi → ' : '') + '<b>' + f.L + '</b></span>' : '<span class="ch">✓</span>') + '</div>';
    }).join('');
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
      if (p.n >= 2) record(no, L, 'cam');
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
    if (v('cdgShow') !== null) cfg.show = v('cdgShow') === 'reveal' ? 'reveal' : 'now';
    write(SKEY, cfg);
  }
  function begin() {
    if (doc.getElementById('cdgSetup')) collect();
    var src = source(); if (!src.list.length) { toast('Chưa có câu hỏi trắc nghiệm. Bấm “Chọn bộ câu hỏi khác” để chọn một bộ.'); return; }
    var r = roster(); if (!r.length) { toast('Lớp chưa có danh sách học sinh. Vào mục Lớp học để nhập danh sách trước.'); return; }
    var list = cfg.order === 'shuffle' ? shuffle(src.list.slice()) : src.list.slice(), n = cfg.count === 'all' ? list.length : Math.min(list.length, Number(cfg.count) || 10);
    if (win.hmvTran && typeof win.hmvTran.limit === 'function') { var lim = win.hmvTran.limit(TYPE, n); if (lim > 0) n = Math.min(n, lim); }
    var keepCam = !!stream;
    S = { questions: list.slice(0, n), sourceName: src.name, roster: r, q: 0, phase: 'answer', paused: false, answers: {}, left: 0, nextLeft: null, recorded: {}, round: Date.now() % 1e9 }; feed = [];
    win.classroomGame = { type: TYPE, started: true };
    S.left = answerTime();
    pending = {}; testHits = {};
    clearInterval(timer); lastT = Date.now(); timer = setInterval(tick, 250);
    if (win.hmvTran && typeof win.hmvTran.begin === 'function') win.hmvTran.begin(TYPE, { end: function () { if (S && S.phase !== 'end') finish(); }, live: function () { return !!S && S.phase !== 'end'; }, paused: function () { return !!(S && S.paused); } });
    tone('start'); render(true);
    if (cfg.src === 'pc') { if (keepCam) attachVideo(); else startCam(); } else { if (keepCam) stopCam(); ensureLink().then(function () { pushState(); paintLink(); }).catch(function () {}); }
    pushState();
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
    render(true); pushState(); fxReveal();
  }
  function next() {
    if (!S) return;
    if (S.phase === 'answer') { lock(); return; }
    if (S.q + 1 >= S.questions.length) { finish(); return; }
    if (win.hmvTran && typeof win.hmvTran.reached === 'function') { try { if (win.hmvTran.reached(TYPE, S.q + 1)) { finish(); return; } } catch (e) {} }
    S.q++; S.phase = 'answer'; S.left = answerTime(); S.nextLeft = null; pending = {}; feed = []; fxClear(); render(true); pushState();
  }
  function finish() {
    if (!S) return;
    if (S.phase === 'answer' && Object.keys(ansMap()).length) lock();
    var played = S.phase === 'reveal' ? S.q + 1 : S.q; S.questions = S.questions.slice(0, Math.max(0, played));
    S.phase = 'end'; clearInterval(timer); timer = 0; stopCam(); closePick();
    if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} }
    write(LKEY, { at: Date.now(), cls: className(), source: S.sourceName, rows: tableRows(), n: S.questions.length });
    render(true); pushState(); fxEnd();
  }
  function pause() { if (!S || S.phase === 'end') return; S.paused = !S.paused; lastT = Date.now(); paintPlay(); pushState(); }
  function back() { fxClear(); try { if (win.hmvMung) win.hmvMung.stop(); } catch (e) {} clearInterval(timer); timer = 0; clearTimeout(autoNx); stopCam(); closeLink(); S = null; testHits = {}; var g = game(); g.type = null; g.started = false; if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} } if (typeof win.renderGames === 'function') win.renderGames(); }
  function toSetup() { clearInterval(timer); timer = 0; if (win.hmvTran && typeof win.hmvTran.stop === 'function') { try { win.hmvTran.stop(); } catch (e) {} } S = null; testHits = {}; win.classroomGame = { type: TYPE, started: false }; render(true); }
  function setManual(no, L) {
    if (!S || S.phase !== 'answer') return;
    closePick();
    if (L) { record(no, L, 'hand'); return; }
    delete ansMap()[no]; paintPlay(); pushSoon();
  }

  /* ---------- Danh sách Đúng / Chưa đúng / Chưa trả lời ---------- */
  function groups(i) {
    var q = S.questions[i], m = S.answers[i] || {}, g = { right: [], wrong: [], none: [] };
    S.roster.forEach(function (st) { var a = m[st.no]; if (!a) { if (!(cfg.absent && st.absent)) g.none.push({ st: st }); } else if (LET.indexOf(a) === q.correct) g.right.push({ st: st, a: a }); else g.wrong.push({ st: st, a: a }); });
    return g;
  }
  function listsHtml(i) {
    var g = groups(i), chip = function (x, showA) { return '<span class="cdg-chip"><i>' + x.st.no + '</i>' + esc(x.st.name) + (showA && x.a ? ' <b>' + x.a + '</b>' : '') + '</span>'; };
    return '<div class="cdg-lists"><section class="ok"><h4>✅ Đúng <span>' + g.right.length + '</span></h4><div>' + (g.right.map(function (x) { return chip(x, false); }).join('') || '<em>Chưa có bạn nào</em>') + '</div></section>'
      + '<section class="bad"><h4>❌ Chưa đúng <span>' + g.wrong.length + '</span></h4><div>' + (g.wrong.map(function (x) { return chip(x, true); }).join('') || '<em>Không có bạn nào 🎉</em>') + '</div></section>'
      + (g.none.length ? '<section class="none"><h4>⏳ Chưa trả lời <span>' + g.none.length + '</span></h4><div>' + g.none.map(function (x) { return chip(x, false); }).join('') + '</div></section>' : '') + '</div>';
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
      + '.cdg-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:14px}'
      + '.cdg-tile{border:2px solid #e2e8f0;border-radius:12px;padding:7px 9px;background:#fff;text-align:left;font:inherit;cursor:pointer;color:#334155;display:flex;gap:7px;align-items:center;min-height:42px}'
      + '.cdg-tile i{font-style:normal;font-weight:900;color:#6d28d9;min-width:22px}.cdg-tile span{font-size:14px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
      + '.cdg-tile.done{background:#ede9fe;border-color:#a78bfa}.cdg-tile.done i::after{content:" ✓";color:#16a34a}.cdg-tile.abs{opacity:.45}'
      + '.cdg-tile.right{background:#dcfce7;border-color:#22c55e}.cdg-tile.wrong{background:#fee2e2;border-color:#f87171}.cdg-tile em{margin-left:auto;font-style:normal;font-weight:900}'
      + '.cdg-pick{position:fixed;z-index:1400;background:#fff;border-radius:16px;box-shadow:0 16px 40px #0f172a55;padding:10px;display:grid;gap:8px;min-width:220px}.cdg-pick h4{margin:0;font-size:15px;color:#1e1b4b}.cdg-pick div{display:flex;gap:6px}.cdg-pick button{min-width:44px;min-height:44px;border-radius:12px;border:2px solid #c4b5fd;background:#f5f3ff;font:inherit;font-weight:900;font-size:20px;cursor:pointer}.cdg-pick button.x{font-size:14px;font-weight:700}'
      + '.cdg-paused{background:#fef3c7;color:#92400e;border-radius:12px;padding:8px 12px;font-weight:800;text-align:center}'
      + '.cdg-end table{width:100%;border-collapse:collapse;font-size:15px}.cdg-end th,.cdg-end td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}.cdg-end th{background:#f5f3ff;color:#4c1d95}.cdg-end td.m{font-family:ui-monospace,monospace;white-space:nowrap}'
      + '.cdg-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.cdg-sum div{background:#f5f3ff;border-radius:14px;padding:12px;text-align:center;font-weight:800;color:#3b0764;font-size:24px}.cdg-sum small{display:block;font-size:13px;color:#64748b}'
      + '.cdg-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.cdg-seg button{border:2px solid #ddd6fe;background:#faf5ff;border-radius:16px;padding:12px;font:inherit;font-weight:800;font-size:17px;color:#3b0764;cursor:pointer;text-align:left}.cdg-seg button small{display:block;font-weight:600;font-size:13px;color:#64748b}.cdg-seg button.on{border-color:#7c3aed;background:linear-gradient(135deg,#ede9fe,#fae8ff);box-shadow:0 6px 18px #7c3aed33}'
      + '.cdg-phonebox{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:center}.cdg-phonebox .qr,.cdg-mini-phone .qr{background:#fff;border-radius:18px;padding:8px;box-shadow:0 0 0 3px #7c3aed,0 10px 30px #7c3aed44;cursor:zoom-in;aspect-ratio:1;display:grid;place-items:center;color:#64748b;font-size:13px;animation:cdgGlow 2.4s ease-in-out infinite}.cdg-phonebox .qr svg,.cdg-mini-phone .qr svg,.cdg-qrbig .qr svg{width:100%;height:auto;display:block}'
      + '@keyframes cdgGlow{50%{box-shadow:0 0 0 3px #a855f7,0 10px 40px #a855f777}}.cdg-phonebox ol{margin:8px 0;padding-left:20px;color:#334155;display:grid;gap:4px;font-size:15px}.cdg-code{letter-spacing:.15em;color:#6d28d9;font-size:18px}'
      + '.cdg-link{margin:0;font-weight:800;color:#b45309}.cdg-link::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:8px;vertical-align:1px}.cdg-link.on{color:#15803d}.cdg-link.on::before{background:#22c55e;animation:cdgPing 1.6s infinite}.cdg-link.err{color:#b91c1c}.cdg-link.err::before{background:#ef4444}'
      + '@keyframes cdgPing{0%{box-shadow:0 0 0 0 #22c55e99}70%{box-shadow:0 0 0 9px #22c55e00}100%{box-shadow:0 0 0 0 #22c55e00}}'
      + '.cdg-qrbig{position:fixed;inset:0;z-index:1500;background:#1e1b4bcc;display:grid;place-items:center;padding:16px}.cdg-qrbig .in{background:#fff;border-radius:26px;padding:22px;text-align:center;width:min(520px,100%);color:#1e1b4b}.cdg-qrbig .qr{width:min(400px,80vw);margin:10px auto}.cdg-qrbig .code{letter-spacing:.15em;color:#6d28d9;font-size:22px}.cdg-qrbig .st{font-weight:800}'
      + '.cdg-mini-phone{display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:center}.cdg-mini-phone p{margin:4px 0}'
      + '.cdg-countbox{display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:center}.cdg-ring{--p:0;width:84px;height:84px;border-radius:50%;background:conic-gradient(#7c3aed calc(var(--p)*1%),#ede9fe 0);display:grid;place-items:center;transition:--p .4s}.cdg-ring::after{content:"";width:62px;height:62px;border-radius:50%;background:#fff}'
      + '.cdg-feed-h{margin:0 0 8px!important;font-size:17px!important}.cdg-feed{display:grid;gap:6px;max-height:340px;overflow:auto}.cdg-feed-empty{color:#64748b;font-size:14px;margin:0}'
      + '.cdg-feed-item{display:flex;align-items:center;gap:8px;background:#f8fafc;border-radius:12px;padding:7px 10px;font-size:15px}.cdg-feed-item .no{min-width:28px;height:28px;border-radius:8px;background:#ede9fe;color:#6d28d9;font-weight:900;display:grid;place-items:center;font-size:14px}.cdg-feed-item .nm{font-weight:700;color:#1e1b4b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cdg-feed-item .ch{color:#64748b;font-size:13px;white-space:nowrap}.cdg-feed-item .ch b{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#6d28d9;color:#fff;font-size:17px}'
      + '.cdg-feed-item.fresh{animation:cdgIn .5s ease-out;background:#f0fdf4;box-shadow:inset 3px 0 0 #22c55e}@keyframes cdgIn{from{opacity:0;transform:translateX(24px) scale(.96)}to{opacity:1;transform:none}}'
      + '.cdg-tile.pop{animation:cdgPop .6s ease-out}@keyframes cdgPop{0%{transform:scale(1)}35%{transform:scale(1.1);box-shadow:0 0 0 6px #a78bfa66}100%{transform:scale(1)}}.cdg-tile.done em{background:#6d28d9;color:#fff;border-radius:7px;padding:1px 7px}'
      + '.cdg-tiles.lists{display:block}.cdg-lists{display:grid;gap:12px}.cdg-lists section{background:#fff;border-radius:18px;padding:12px 14px;border:2px solid #e2e8f0}.cdg-lists section.ok{border-color:#86efac;background:#f0fdf4}.cdg-lists section.bad{border-color:#fca5a5;background:#fef2f2}.cdg-lists section.none{background:#f8fafc}'
      + '.cdg-lists h4{margin:0 0 8px;font-size:17px;color:#1e1b4b;display:flex;gap:8px;align-items:center}.cdg-lists h4 span{background:#1e1b4b;color:#fff;border-radius:999px;padding:1px 10px;font-size:14px}.cdg-lists section>div{display:flex;flex-wrap:wrap;gap:6px}.cdg-lists em{color:#64748b}'
      + '.cdg-chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:4px 10px 4px 4px;font-size:15px;color:#1e1b4b;animation:cdgIn .4s ease-out both}.cdg-chip i{font-style:normal;min-width:24px;height:24px;border-radius:50%;background:#ede9fe;color:#6d28d9;font-weight:900;font-size:12px;display:grid;place-items:center}.cdg-chip b{background:#dc2626;color:#fff;border-radius:6px;padding:0 6px}'
      + '.cdg-sec{margin:18px 0 8px!important;color:#3b0764}.cdg-qd{border:1px solid #e4defc;border-radius:14px;padding:10px 12px;margin:8px 0;background:#fcfbff}.cdg-qd summary{cursor:pointer;font-size:15px;color:#1e1b4b}.cdg-qd summary span{color:#6d28d9;font-weight:800;margin-left:6px}.cdg-qd .cdg-lists{margin-top:10px}'
      + '.cdg-stars{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:linear-gradient(135deg,#fef3c7,#fae8ff);border-radius:20px;padding:14px 16px;margin-bottom:14px}.cdg-stars .t{font-weight:900;color:#92400e;font-size:18px;margin-right:6px}.cdg-stars .s{background:#fff;border-radius:999px;padding:5px 12px;font-weight:800;color:#3b0764;box-shadow:0 3px 10px #f59e0b33}'
      + '@media(max-width:900px){.cdg-phonebox{grid-template-columns:1fr}.cdg-phonebox .qr{max-width:240px;margin:0 auto}.cdg-grid2,.cdg-stage{grid-template-columns:1fr}.cdg-side{order:-1;grid-template-columns:1fr 1.7fr;align-items:center}.cdg-side .cdg-box{padding:10px}.cdg-count{font-size:24px}.cdg-side .cdg-msg{display:none}.cdg-form{grid-template-columns:1fr}.cdg-opts{grid-template-columns:1fr}}';
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
  function phoneBox() {
    return '<div class="cdg-phonebox"><div class="qr" data-cdg-qr title="Bấm để phóng to" data-cdg="qr">Đang tạo mã…</div><div class="info"><p class="cdg-link" data-cdg-link>Đang mở phòng…</p><ol><li>Mở <b>camera</b> điện thoại (hoặc Zalo → Quét mã), hướng vào mã QR.</li><li>Bấm vào đường link hiện ra → <b>Mở camera</b> → cho phép.</li><li>Xong! Đi giữa lớp, hướng điện thoại về các thẻ học sinh giơ lên.</li></ol><p class="cdg-msg">Mã phòng: <b class="cdg-code" data-cdg-code></b> · <span data-cdg-url></span></p><button class="btn soft" type="button" data-cdg="qr">⛶ Phóng to mã QR</button></div></div>';
  }
  function pcCamBox() {
    return '<div class="cdg-cam" id="cdgCamBox"><video id="cdgVideo" autoplay muted playsinline></video><canvas id="cdgOverlay"></canvas><div class="off">Camera đang tắt.<br>Bấm “Mở camera” để thử quét một thẻ.</div></div>'
      + '<div class="cdg-row"><button class="btn color" id="cdgCamBtn" data-cdg="cam">📷 Mở camera</button></div>'
      + '<div class="cdg-form" style="margin-top:10px"><label>Chọn camera<select id="cdgCam">' + camOptions() + '</select></label><label>Độ nét<select id="cdgRes">' + opt('720', cfg.res, 'Thường (máy nhẹ)') + opt('1080', cfg.res, 'Cao (quét xa hơn)') + '</select></label></div>'
      + '<p class="cdg-msg" id="cdgCamMsg"></p>';
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
      + '<label>Âm thanh (nhận thẻ, chúc mừng)<select id="cdgSound">' + opt(1, cfg.sound ? 1 : 0, 'Bật') + opt(0, cfg.sound ? 1 : 0, 'Tắt') + '</select></label>'
      + '</div></section></div>'
      + '<div style="display:grid;gap:16px"><section class="cdg-box"><h3>4 · Quét thẻ bằng</h3>'
      + '<div class="cdg-seg"><button type="button" data-cdg="src" data-v="phone" class="' + (cfg.src === 'phone' ? 'on' : '') + '">📱 Điện thoại<small>quét mã QR là nối</small></button><button type="button" data-cdg="src" data-v="pc" class="' + (cfg.src === 'pc' ? 'on' : '') + '">💻 Camera máy tính<small>webcam, camera rời</small></button></div>'
      + (cfg.src === 'phone' ? phoneBox() : pcCamBox())
      + '<div class="cdg-test" id="cdgTest">Giơ thử một thẻ trước camera để kiểm tra.</div>'
      + '<div class="cdg-form" style="margin-top:12px"><label>Màn hình máy tính khi quét<select id="cdgShow">' + opt('now', cfg.show, 'Hiện tên + đáp án từng bạn ngay') + opt('reveal', cfg.show, 'Chỉ hiện ✓, đáp án hiện khi chốt') + '</select></label></div>'
      + (cfg.src === 'pc' ? phoneHelp() : '') + '</section>'
      + (last && last.rows ? '<section class="cdg-box"><h3>Lượt gần nhất</h3><p>' + esc(last.cls) + ' · ' + esc(new Date(last.at).toLocaleString('vi-VN')) + ' · ' + esc(last.source) + '</p></section>' : '')
      + '<section class="cdg-box cdg-startbox"><button class="btn color cdg-start" data-cdg="start"' + (ok ? '' : ' disabled') + '>▶ Bắt đầu</button><p class="cdg-msg" style="text-align:center">Cài đặt xong mới bấm. Camera đang mở sẽ được dùng luôn.</p></section>'
      + '</div></div></div>';
  }
  function playHtml() {
    return '<div class="cdg-game"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY</h2><p>' + esc(className()) + ' · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn soft" data-cdg="pause" id="cdgPauseBtn">Ⅱ Tạm dừng</button>' + (cfg.src === 'pc' ? '<button class="btn soft" id="cdgCamBtn" data-cdg="cam">📷 Tắt camera</button>' : '') + '<button class="btn soft" data-cdg="finish">Kết thúc</button></div></div>'
      + '<div class="cdg-stage"><section><div class="cdg-q" id="cdgStage"><div class="cdg-qhead"><span id="cdgNo"></span><span class="cdg-clock" id="cdgClock"></span></div><div id="cdgPaused"></div><div id="cdgQuestion"></div><div id="cdgImg"></div><div class="cdg-opts" id="cdgOpts"></div><div class="cdg-acts" id="cdgActs"></div></div>'
      + '<div class="cdg-tiles" id="cdgTiles"></div></section>'
      + '<aside class="cdg-side"><div class="cdg-box cdg-countbox"><div class="cdg-ring" id="cdgRing"></div><div class="cdg-count" id="cdgCount"></div></div>'
      + (cfg.src === 'phone'
        ? '<div class="cdg-box cdg-mini-phone"><div class="qr" data-cdg-qr data-cdg="qr" title="Bấm để phóng to"></div><div><p class="cdg-link" data-cdg-link></p><p class="cdg-msg">Mã phòng <b data-cdg-code></b></p><button class="btn soft" type="button" data-cdg="qr">⛶ Mã QR</button></div></div>'
        : '<div class="cdg-box"><div class="cdg-cam" id="cdgCamBox"><video id="cdgVideo" autoplay muted playsinline></video><canvas id="cdgOverlay"></canvas><div class="off">Camera đang tắt.<br>Vẫn chơi được: bấm vào ô tên học sinh để ghi đáp án.</div></div><p class="cdg-msg" id="cdgCamMsg"></p></div>')
      + '<div class="cdg-box"><h3 class="cdg-feed-h">⚡ Vừa quét</h3><div class="cdg-feed" id="cdgFeed"></div></div></aside></div></div>';
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
    var pct = exp.length ? Math.round(got / exp.length * 100) : 0, ring = doc.getElementById('cdgRing');
    if (ring) ring.style.setProperty('--p', pct);
    var fd = doc.getElementById('cdgFeed'); if (fd) fd.innerHTML = feedHtml();
    doc.getElementById('cdgCount').innerHTML = got + '/' + exp.length + '<small>' + (rev ? 'bạn trả lời · ' + c[q.correct] + ' bạn đúng' : 'bạn đã giơ thẻ') + (extra > 0 ? ' · +' + extra + ' bạn vắng' : '') + '</small>';
    var tl = doc.getElementById('cdgTiles'); tl.classList.toggle('lists', rev);
    if (rev) tl.innerHTML = listsHtml(S.q); else tl.innerHTML = S.roster.map(function (st) {
      var a = m[st.no], cls = a ? (rev ? (LET.indexOf(a) === q.correct ? ' right' : ' wrong') : ' done') : '';
      if (cfg.absent && st.absent && !a) cls += ' abs';
      return '<button type="button" class="cdg-tile' + cls + (a && feed[0] && feed[0].no === st.no && Date.now() - feed[0].t < 1200 ? ' pop' : '') + '" data-cdg-tile="' + st.no + '" title="Bấm để ghi đáp án bằng tay"><i>' + st.no + '</i><span>' + esc(st.name) + '</span>' + (a && cfg.show === 'now' ? '<em>' + a + '</em>' : '') + '</button>';
    }).join('');
    var pb = doc.getElementById('cdgPauseBtn'); if (pb) pb.textContent = S.paused ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng';
    paintClock(); if (cfg.src === 'pc') paintCam(); paintLink();
  }
  function starsHtml(rows, n) {
    var top = rows.filter(function (r) { return r.right > 0; }).sort(function (a, b) { return b.right - a.right || a.no - b.no; }), best = top.length ? top[0].right : 0, stars = top.filter(function (r) { return r.right === best; });
    if (!stars.length) return '';
    return '<div class="cdg-stars"><span class="t">🌟 Đúng nhiều nhất (' + best + '/' + n + ')</span>' + stars.slice(0, 12).map(function (r) { return '<span class="s">' + esc(r.name) + '</span>'; }).join('') + (stars.length > 12 ? '<span class="s">+' + (stars.length - 12) + ' bạn</span>' : '') + '</div>';
  }
  function endHtml() {
    var rows = tableRows(), n = S.questions.length, took = rows.filter(function (r) { return r.done; }), avg = took.length ? took.reduce(function (s, r) { return s + r.right; }, 0) / took.length : 0;
    var perQ = S.questions.map(function (q, i) { var m = S.answers[i] || {}, k = Object.keys(m), r = k.filter(function (no) { return LET.indexOf(m[no]) === q.correct; }).length; return k.length ? Math.round(r / k.length * 100) : 0; });
    var hardest = -1; perQ.forEach(function (v, i) { if (Object.keys(S.answers[i] || {}).length && (hardest < 0 || v < perQ[hardest])) hardest = i; });
    if (!n) return '<div class="cdg-game cdg-end"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY · KẾT QUẢ</h2><p>' + esc(className()) + '</p></div><div class="toolbar"><button class="btn soft" data-cdg="again">↻ Chơi lại</button><button class="btn soft" data-cdg="back">← Thư viện</button></div></div><div class="cdg-box"><p>Lượt này chưa chốt câu nào nên chưa có kết quả.</p></div></div>';
    return '<div class="cdg-game cdg-end"><div class="page-title"><div><h2>🃏 CHẾ ĐỘ GIẤY · KẾT QUẢ</h2><p>' + esc(className()) + ' · ' + esc(S.sourceName) + '</p></div><div class="toolbar"><button class="btn color" data-cdg="csv">⇩ Tải bảng kết quả (Excel)</button><button class="btn soft" data-cdg="again">↻ Chơi lại</button><button class="btn soft" data-cdg="back">← Thư viện</button></div></div>'
      + starsHtml(rows, n) + '<div class="cdg-box"><div class="cdg-sum"><div>' + n + '<small>câu hỏi</small></div><div>' + took.length + '/' + rows.length + '<small>học sinh có trả lời</small></div><div>' + avg.toFixed(1).replace('.', ',') + '/' + n + '<small>số câu đúng trung bình</small></div>' + (hardest >= 0 ? '<div>Câu ' + (hardest + 1) + '<small>khó nhất (' + perQ[hardest] + '% đúng)</small></div>' : '') + '</div>'
      + '<h3 class="cdg-sec">Danh sách theo từng câu</h3>' + S.questions.map(function (q, i) { return '<details class="cdg-qd"' + (i === 0 ? ' open' : '') + '><summary><b>Câu ' + (i + 1) + '</b> · ' + esc(q.text) + ' <span>Đáp án ' + LET[q.correct] + ' · ' + perQ[i] + '% đúng</span></summary>' + listsHtml(i) + '</details>'; }).join('')
      + '<h3 class="cdg-sec">Bảng tổng hợp</h3><div style="overflow:auto"><table><thead><tr><th>Thẻ</th><th>Học sinh</th><th>Đúng</th>' + S.questions.map(function (q, i) { return '<th title="' + esc(q.text) + '">C' + (i + 1) + '<br><small>' + LET[q.correct] + ' · ' + perQ[i] + '%</small></th>'; }).join('') + '</tr></thead><tbody>'
      + rows.map(function (r) { return '<tr><td>' + r.no + '</td><td>' + esc(r.name) + (r.absent ? ' <small>(vắng)</small>' : '') + '</td><td><b>' + r.right + '/' + n + '</b></td>' + r.marks.map(function (x) { return '<td class="m" style="color:' + (/✓/.test(x) ? '#15803d' : /✗/.test(x) ? '#b91c1c' : '#94a3b8') + '">' + x + '</td>'; }).join('') + '</tr>'; }).join('')
      + '</tbody></table></div></div></div>';
  }
  function render(force) {
    var g = games(); if (!g) return; css();
    if (!S) { if (force || !doc.getElementById('cdgSetup')) { g.innerHTML = setupHtml(); attachVideo(); paintCam(); if (cfg.src === 'phone') { ensureLink().then(function () { paintLink(); pushState(); }).catch(function () { var l = doc.querySelector('[data-cdg-link]'); if (l) l.textContent = 'Chưa tải được bộ kết nối (kiểm tra mạng).'; }); } if (!camDevices.length) listCams().then(function () { var sel = doc.getElementById('cdgCam'); if (sel && camDevices.length) sel.innerHTML = camOptions(); }); } return; }
    if (S.phase === 'end') { g.innerHTML = endHtml(); return; }
    if (force || !doc.getElementById('cdgStage')) { g.innerHTML = playHtml(); attachVideo(); paintLink(); }
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
    else if (act === 'src') { collect(); var v2 = b.dataset.v === 'pc' ? 'pc' : 'phone'; if (cfg.src !== v2) { cfg.src = v2; write(SKEY, cfg); if (v2 === 'phone') stopCam(); testHits = {}; render(true); } }
    else if (act === 'qr') bigQr();
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
    else if (e.target.id === 'cdgShow') { collect(); }
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
  if (typeof baseBack === 'function') win.gameBack = function () { if (game().type === TYPE) { clearInterval(timer); timer = 0; stopCam(); closeLink(); S = null; closePick(); } return baseBack.apply(this, arguments); };
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
