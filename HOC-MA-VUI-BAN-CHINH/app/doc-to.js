/* BAN-CHINH 2.2 · Đọc to câu hỏi.
 *
 * - Khi máy có giọng đọc tiếng Việt, một nút loa hiện ngay sau câu hỏi trong các trò chơi. Bấm để nghe, bấm lần nữa để dừng.
 * - Hai nguồn giọng: (1) giọng tiếng Việt có sẵn trong máy/trình duyệt (không cần mạng, phát ngay);
 *   (2) giọng AI Gemini qua máy chủ nội bộ ./api/ai/tts (cần khóa và Internet; câu đã đọc được lưu lại để lần sau phát ngay).
 * - Máy chưa có giọng nào: KHÔNG hiện nút trong trò chơi (không để nút bấm không kêu); cách bật nằm ở Trợ lý AI → Kết nối AI.
 * - Tệp này không sửa luật chơi: chỉ đọc chữ đang hiện trên màn hình. Không gửi tên học sinh (chỉ gửi câu hỏi và phương án).
 * - Khi đang đọc, nhạc nền của trò chơi tự nhỏ lại (window.hmvDuck) rồi trở về như cũ.
 * - 2.4: đọc thẳng nội dung câu hỏi (không lời dẫn); "Chờ đọc xong mới tính giờ": trong lúc máy đọc, đồng hồ và việc tự chuyển câu
 *   của trò chơi tạm chờ (window.hmvHold); nút bánh răng cạnh nút loa mở nhanh tốc độ đọc và các lựa chọn.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var LS = 'hmv_doc_to_v1', DB = 'hmv_doc_to_v1', STORE = 'audio', MAX_CACHE = 150, DUCK = 0.25;
  var AI_VOICES = [['Kore', 'Kore – nữ, rõ ràng'], ['Leda', 'Leda – nữ, trẻ trung'], ['Aoede', 'Aoede – nữ, nhẹ nhàng'], ['Puck', 'Puck – nam, vui tươi'], ['Charon', 'Charon – nam, điềm đạm']];
  var RATES = [['0.8', 'Chậm'], ['0.95', 'Vừa'], ['1.1', 'Nhanh']];
  var GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5a.5.5 0 0 0 .1-.7l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7.3 7.3 0 0 0-1.7-1l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7.3 7.3 0 0 0-1.7 1l-2.4-1a.5.5 0 0 0-.6.2L2.7 8.8a.5.5 0 0 0 .1.7l2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5a.5.5 0 0 0-.1.7l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1.1.7 1.7 1l.4 2.5c0 .2.3.4.5.4h3.8c.2 0 .5-.2.5-.4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1c.2.1.5 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.7l-2-1.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>';
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 9.2v5.6c0 .5.4.9.9.9h2.9l4.3 3.6c.6.5 1.5.1 1.5-.7V5.4c0-.8-.9-1.2-1.5-.7L7.8 8.3H4.9c-.5 0-.9.4-.9.9z"/><path class="w1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.6 9.2c.8.7 1.3 1.7 1.3 2.8s-.5 2.1-1.3 2.8"/><path class="w2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M19 6.6c1.5 1.4 2.4 3.3 2.4 5.4s-.9 4-2.4 5.4"/></svg>';

  /* Mỗi trò: khung chứa câu hỏi, phần tử chữ câu hỏi, các phương án. */
  var GAMES = [
    { id: 'tug', box: '.tug-question', q: 'h2', a: '.tug-answers button' },
    { id: 'buzzer', box: '.buzz-question', q: 'h2', a: '.buzz-answer' },
    { id: 'gift', box: '.gift-question', q: 'h2', a: '.gift-answer', off: function (q) { return !q.parentNode.querySelector('.toolbar'); } },   /* lúc đang chọn hộp, khung này chỉ là lời nhắc "Chọn một hộp quà" – không phải câu hỏi */
    { id: 'race', box: '.race-question', q: 'h2', a: '.race-answer' },
    { id: 'millionaire', box: '.millionaire-question', q: '.millionaire-question-text', a: '.millionaire-answer', skip: function (i) { var st = win.millionaireState; return !!(st && st.hidden && st.hidden.indexOf(i) >= 0); } },
    { id: 'head-tilt', box: '.tilt-question', q: '.tilt-question-text' },
    { id: 'balloon', box: '#bbStage', q: '#bbQuestion', a: '.bb-balloon', letter: '.bb-body > b', text: '.bb-text' },
    { id: 'poll', box: '#bcStage', q: '#bcQuestion', a: '.bc-row', letter: '.bc-key b', text: '.bc-label', off: function (q) { return q.classList.contains('quick'); } },
    { id: 'raise-hand', box: '#rhStage', q: '#rhQuestion', a: '.rh-ans', letter: '.rh-ans > b', text: '.rh-ans-text' },
    { id: 'magic-hand', box: '#mhStage', q: '#mhPrompt' },
    { id: 'paper', box: '#games', q: '.paper-question', a: '.paper-answer-chip' }
  ];

  var cfg = load();
  var S = { state: 'idle', token: 0, engine: '', audio: null, url: '', utter: [], watch: 0, last: null, lastText: '', autoTimer: 0, tryNote: '', mem: {}, voices: [], scanTimer: 0, gameRead: false, holdTimer: 0, pop: null };

  function load() {
    var d = { engine: 'auto', voice: '', aiVoice: 'Kore', rate: 0.95, answers: true, auto: false, wait: true }, s = null;
    try { s = JSON.parse(win.localStorage.getItem(LS) || 'null'); } catch (e) {}
    if (s && typeof s === 'object') {
      if (s.engine === 'auto' || s.engine === 'browser' || s.engine === 'ai') d.engine = s.engine;
      if (typeof s.voice === 'string') d.voice = s.voice;
      if (AI_VOICES.some(function (v) { return v[0] === s.aiVoice; })) d.aiVoice = s.aiVoice;
      if (RATES.some(function (r) { return Number(r[0]) === Number(s.rate); })) d.rate = Number(s.rate);
      if (typeof s.answers === 'boolean') d.answers = s.answers;
      if (typeof s.auto === 'boolean') d.auto = s.auto;
      if (typeof s.wait === 'boolean') d.wait = s.wait;
    }
    return d;
  }
  function save() { try { win.localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { if (typeof win.showToast === 'function') win.showToast(m); }
  function fail(code, message) { var e = new Error(message); e.code = code; return e; }

  /* ---------- Chữ trên màn hình → câu để đọc ---------- */
  var UNITS = { km: 'ki-lô-mét', hm: 'héc-tô-mét', dam: 'đề-ca-mét', dm: 'đề-xi-mét', cm: 'xăng-ti-mét', mm: 'mi-li-mét', m: 'mét', kg: 'ki-lô-gam', hg: 'héc-tô-gam', dag: 'đề-ca-gam', g: 'gam', ml: 'mi-li-lít', l: 'lít' };
  function unit(u, p) { return UNITS[u.toLowerCase()] + (p === '2' || p === '²' ? ' vuông' : p === '3' || p === '³' ? ' khối' : ''); }
  function say(t) {
    var s = String(t == null ? '' : t).replace(/[​﻿]/g, '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var math = /[=+×÷]/.test(s);
    s = s.replace(/(?<!\d)(\d{1,3})((?: \d{3})+)(?!\d)/g, function (m0, a, b) { return a + b.replace(/ /g, ''); });   /* 1 000 000 → 1000000 */
    s = s.replace(/=\s*(?:\?|…+|\.{2,}|_{2,})\s*([.?!]*)$/, ' bằng bao nhiêu?');                  /* "… = ?" ở cuối câu */
    s = s.replace(/=\s*(?:\?|…+|\.{2,}|_{2,})/g, ' bằng bao nhiêu ');
    s = s.replace(/(^|[=+\-−–×÷:*<>(]\s*)\?(?=\s*(?:[=+\-−–×÷:*<>)]|$))/g, '$1 mấy ');              /* "? + 5 = 12" */
    s = s.replace(/…+|\.{3,}|_{2,}/g, ' chấm chấm ');
    s = s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, '$1 tháng $2 năm $3');
    s = s.replace(/(ngày\s+)(\d{1,2})\/(\d{1,2})\b/gi, '$1$2 tháng $3');
    s = s.replace(/\/\s*(giờ|h)(?![0-9A-Za-zÀ-ỹ])/g, ' trên giờ');
    s = s.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 phần $2');
    s = s.replace(/(?<![A-Za-zÀ-ỹ])(km|hm|dam|dm|cm|mm|kg|hg|dag|ml)(2|²|3|³)?(?![0-9A-Za-zÀ-ỹ])/g, function (m0, u, p) { return ' ' + unit(u, p); });
    s = s.replace(/(\d|nhiêu|mấy)\s*(m|g|l)(2|²|3|³)?(?![0-9A-Za-zÀ-ỹ])/g, function (m0, a, u, p) { return a + ' ' + unit(u, p); });
    s = s.replace(/%/g, ' phần trăm');
    s = s.replace(/≤/g, ' bé hơn hoặc bằng ').replace(/≥/g, ' lớn hơn hoặc bằng ').replace(/≠/g, ' khác ');
    s = s.replace(/</g, ' bé hơn ').replace(/>/g, ' lớn hơn ');
    s = s.replace(/\+/g, ' cộng ').replace(/[×✕*]/g, ' nhân ').replace(/÷/g, ' chia ').replace(/−/g, ' trừ ');
    s = s.replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1 nhân ');
    s = s.replace(/(\d|\)|mấy)\s+:\s+(?=\d|\(|mấy)/g, '$1 chia ');
    s = s.replace(/(\d|\)|mấy)\s+[-–]\s+(?=\d|\(|mấy)/g, '$1 trừ ');
    if (math) s = s.replace(/(\d)\s*-\s*(?=\d)/g, '$1 trừ ').replace(/(\d):(?=\d)/g, '$1 chia ');
    s = s.replace(/=/g, ' bằng ');
    return s.replace(/\s+/g, ' ').replace(/\s+([,.;:?!])/g, '$1').trim();
  }
  /* Không đo bố cục (tránh làm chậm trò chơi): chỉ xét màn hình đang mở và thuộc tính hidden. */
  function visible(el) { if (!el || !el.isConnected || el.closest('[hidden]')) return false; var v = el.closest('.view'); return !v || v.classList.contains('active'); }
  function ownText(el) { var s = ''; Array.prototype.forEach.call(el.childNodes, function (n) { if (n.nodeType === 1 && (n.classList.contains('hmv-dt-btn') || n.classList.contains('hmv-dt-gear'))) return; s += n.textContent; }); return s.replace(/\s+/g, ' ').trim(); }
  function current() {
    for (var i = 0; i < GAMES.length; i++) {
      var g = GAMES[i], box = doc.querySelector(g.box); if (!box || !visible(box)) continue;
      var q = box.querySelector(g.q); if (!q || !visible(q) || (g.off && g.off(q))) continue;
      var text = ownText(q); if (!text) continue;
      return { g: g, box: box, q: q, text: text };
    }
    return null;
  }
  function answersOf(c) {
    var g = c.g, out = []; if (!g.a) return out;
    Array.prototype.forEach.call(c.box.querySelectorAll(g.a), function (el, i) {
      if (!visible(el) || (g.skip && g.skip(i))) return;
      var letter = '', text = '';
      if (g.letter) { var l = el.querySelector(g.letter), t = el.querySelector(g.text); letter = l ? l.textContent.trim() : ''; text = t ? t.textContent.trim() : ''; }
      else { var raw = el.textContent.replace(/\s+/g, ' ').trim(), m = /^([A-H])[.)]\s*(.*)$/.exec(raw); if (m) { letter = m[1]; text = m[2]; } else text = raw; }
      if (text) out.push({ letter: letter, text: text });
    });
    return out;
  }
  function build(c) {
    var q = say(c.text), parts = [q + (/[.?!:]$/.test(q) ? '' : '.')];   /* đọc thẳng nội dung câu hỏi, không thêm lời dẫn */
    if (cfg.answers) answersOf(c).forEach(function (a) { var t = say(a.text); parts.push((a.letter ? a.letter + ', ' : '') + t + (/[.?!]$/.test(t) ? '' : '.')); });
    return parts.join(' ');
  }

  /* ---------- Nguồn giọng ---------- */
  function synth() { return win.speechSynthesis && typeof win.SpeechSynthesisUtterance === 'function' ? win.speechSynthesis : null; }
  function isVi(v) { return /^vi([-_]|$)/i.test(v.lang || '') || /vietnam|việt/i.test(v.name || ''); }
  function loadVoices() {
    var sy = synth(), list = []; try { list = sy ? sy.getVoices() || [] : []; } catch (e) {}
    S.voices = Array.prototype.filter.call(list, isVi).sort(function (a, b) { var na = /natural|online/i.test(a.name) ? 0 : 1, nb = /natural|online/i.test(b.name) ? 0 : 1; return na - nb || String(a.name).localeCompare(String(b.name)); });
    return S.voices;
  }
  function voice() { var l = S.voices; if (!l.length) return null; for (var i = 0; i < l.length; i++) if (l[i].voiceURI === cfg.voice || l[i].name === cfg.voice) return l[i]; return l[0]; }
  function aiReady() { return !!(win.hmvTroLyAI && typeof win.hmvTroLyAI.ready === 'function' && win.hmvTroLyAI.ready()); }
  function engine() {
    var v = !!voice(), ai = aiReady();
    if (cfg.engine === 'ai') return ai ? 'ai' : v ? 'browser' : '';
    if (cfg.engine === 'browser') return v ? 'browser' : ai ? 'ai' : '';
    return v ? 'browser' : ai ? 'ai' : '';
  }

  /* ---------- Bộ nhớ đệm giọng AI (cơ sở dữ liệu riêng, không đụng dữ liệu của ứng dụng) ---------- */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok) {
      try {
        var r = win.indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { var st = r.result.createObjectStore(STORE, { keyPath: 'k' }); st.createIndex('t', 't'); };
        r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ok(null); }; r.onblocked = function () { ok(null); };
      } catch (e) { ok(null); }
    });
    return dbp;
  }
  function cacheGet(k) {
    if (S.mem[k]) return Promise.resolve(S.mem[k]);
    return db().then(function (d) { if (!d) return null; return new Promise(function (ok) { try { var q = d.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = function () { var v = q.result; ok(v && v.blob ? v.blob : null); }; q.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); })
      .then(function (b) { if (b) S.mem[k] = b; return b; });
  }
  function cachePut(k, blob) {
    S.mem[k] = blob;
    return db().then(function (d) {
      if (!d) return;
      try {
        var tx = d.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE); st.put({ k: k, t: Date.now(), blob: blob });
        var c = st.count(); c.onsuccess = function () { var extra = c.result - MAX_CACHE; if (extra <= 0) return; var cur = st.index('t').openCursor(); cur.onsuccess = function () { var x = cur.result; if (!x || extra <= 0) return; x.delete(); extra--; x.continue(); }; };
      } catch (e) {}
    });
  }
  function cacheCount() { return db().then(function (d) { if (!d) return 0; return new Promise(function (ok) { try { var c = d.transaction(STORE).objectStore(STORE).count(); c.onsuccess = function () { ok(c.result); }; c.onerror = function () { ok(0); }; } catch (e) { ok(0); } }); }); }
  function b64Blob(b64, mime) { var bin = win.atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || 'audio/wav' }); }
  function fetchAi(text) {
    var ctl = typeof win.AbortController === 'function' ? new win.AbortController() : null, timer = ctl ? win.setTimeout(function () { ctl.abort(); }, 70000) : 0;
    return win.fetch('./api/ai/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ text: text, voice: cfg.aiVoice, style: ' ' }),   /* style rỗng: chỉ đọc đúng nội dung, không kèm lời dẫn */ signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} return { r: r, j: j }; }); })
      .then(function (x) {
        if (timer) win.clearTimeout(timer);
        if (!x.j) throw fail('SERVER', /^(localhost|127\.0\.0\.1|\[::1\]|)$/i.test(String(win.location && win.location.hostname || '')) ? 'Máy chủ nội bộ chưa có phần giọng AI. Hãy chạy KHOI-DONG-LAI-MAY-CHU.cmd rồi tải lại trang.' : 'Bản trên web chưa có giọng AI Gemini; giọng này chỉ có ở bản cài trên máy tính.');
        if (!x.r.ok || x.j.ok === false || !x.j.audio) throw fail(x.j.code || 'ERROR', x.j.message || 'Giọng AI gặp lỗi. Hãy thử lại.');
        return b64Blob(x.j.audio, x.j.mime);
      }, function (e) { if (timer) win.clearTimeout(timer); throw fail(e && e.name === 'AbortError' ? 'TIMEOUT' : 'OFFLINE', e && e.name === 'AbortError' ? 'Giọng AI trả lời quá lâu. Hãy thử lại.' : 'Không gọi được máy chủ nội bộ.'); });
  }

  /* ---------- Phát ---------- */
  function duck(on) { win.hmvDuck = on ? DUCK : 1; try { if (win.hmvMusic && win.hmvMusic.sync) win.hmvMusic.sync(); } catch (e) {} }
  /* Chờ đọc xong mới tính giờ: các trò chơi xem window.hmvHold trong vòng đồng hồ của mình. */
  var holdLast = {};
  win.hmvHoldMs = function (key) { if (!win.hmvHold) { holdLast[key] = 0; return 0; } var now = Date.now(), d = holdLast[key] ? Math.max(0, Math.min(2000, now - holdLast[key])) : 0; holdLast[key] = now; return d; };
  function syncHold() {
    var on = !!(cfg.wait && ((S.state !== 'idle' && S.gameRead) || S.autoTimer));
    if (on === !!win.hmvHold) return;
    win.hmvHold = on ? Date.now() : 0;
    try { doc.body.classList.toggle('hmv-dang-doc', on); } catch (e) {}
    if (S.holdTimer) { win.clearTimeout(S.holdTimer); S.holdTimer = 0; }
    if (on) S.holdTimer = win.setTimeout(function () { S.holdTimer = 0; win.hmvHold = 0; try { doc.body.classList.remove('hmv-dang-doc'); } catch (e) {} }, 120000);   /* không bao giờ giữ đồng hồ quá 2 phút */
  }
  function setState(st) { S.state = st; if (st === 'idle') S.gameRead = false; duck(st === 'speaking'); syncHold(); paint(); paintTry(); }
  function halt() {
    S.token++;
    if (S.watch) { win.clearInterval(S.watch); S.watch = 0; }
    var sy = synth(); if (sy && S.engine === 'browser') { try { sy.cancel(); } catch (e) {} }
    S.utter = [];
    if (S.audio) { try { S.audio.onended = S.audio.onerror = null; S.audio.pause(); } catch (e) {} S.audio = null; }
    if (S.url) { try { win.URL.revokeObjectURL(S.url); } catch (e) {} S.url = ''; }
  }
  function stop() { halt(); if (S.state !== 'idle') setState('idle'); }
  function chunks(text) {
    var out = [], cur = '';
    (text.match(/[^.?!;]+[.?!;]*\s*/g) || [text]).forEach(function (p) { if (cur && (cur + p).length > 190) { out.push(cur.trim()); cur = ''; } cur += p; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function speakBrowser(text, token) {
    return new Promise(function (ok, no) {
      var sy = synth(), v = voice(); if (!sy || !v) return no(fail('NO_VOICE', 'Máy chưa có giọng đọc tiếng Việt.'));
      var list = chunks(text), left = list.length, began = false;
      function begin() {
        if (token !== S.token) return ok(false);
        try { sy.resume(); } catch (e) {}
        S.utter = list.map(function (part) {
          var u = new win.SpeechSynthesisUtterance(part); u.voice = v; u.lang = v.lang || 'vi-VN'; u.rate = cfg.rate; u.pitch = 1; u.volume = 1;
          u.onstart = function () { began = true; };
          u.onend = function () { if (token !== S.token) return; left--; if (left <= 0) ok(true); };
          u.onerror = function (ev) { if (token !== S.token) return; var why = ev && ev.error; if (why === 'interrupted' || why === 'canceled') return ok(false); no(fail('SPEECH', why === 'network' ? 'Giọng đọc này cần Internet. Hãy kiểm tra mạng hoặc chọn giọng khác.' : 'Trình duyệt không đọc được bằng giọng này.')); };
          return u;
        });
        S.utter.forEach(function (u) { sy.speak(u); });
        setState('speaking');
        /* Một số bản Chrome không báo "đọc xong"; tự kiểm để nút không kẹt ở trạng thái đang đọc. */
        var quiet = 0; S.watch = win.setInterval(function () { if (token !== S.token) return; var busy = false; try { busy = sy.speaking || sy.pending; } catch (e) {} quiet = busy ? 0 : quiet + 1; if (quiet >= (began ? 3 : 8)) ok(true); }, 400);
      }
      var was = false; try { was = sy.speaking || sy.pending; sy.cancel(); } catch (e) {}
      if (was) win.setTimeout(begin, 80); else begin();
    });
  }
  function speakAi(text, token) {
    var key = 'v2|' + cfg.aiVoice + '|' + text;   /* v2: bản không lời dẫn; âm thanh lưu từ bản trước không dùng lại */
    setState('loading');
    return cacheGet(key).then(function (b) { return b || fetchAi(text).then(function (nb) { cachePut(key, nb); return nb; }); }).then(function (blob) {
      if (token !== S.token) return false;
      return new Promise(function (ok, no) {
        var a = new win.Audio(); S.url = win.URL.createObjectURL(blob); S.audio = a; a.src = S.url;
        try { a.playbackRate = cfg.rate >= 1.05 ? 1.2 : cfg.rate <= 0.85 ? 0.85 : 1; } catch (e) {}
        a.onended = function () { if (token === S.token) ok(true); };
        a.onerror = function () { if (token === S.token) no(fail('AUDIO', 'Không phát được âm thanh của giọng AI.')); };
        var p = a.play(); setState('speaking');
        if (p && p.catch) p.catch(function () { if (token === S.token) no(fail('BLOCKED', 'Trình duyệt chưa cho phát tiếng. Hãy bấm lại nút loa.')); });
      });
    });
  }
  function speak(text) {
    halt();
    var token = S.token, eng = engine(); S.engine = eng; S.lastText = text;
    if (!text) return Promise.resolve(false);
    if (!eng) { setState('idle'); return Promise.reject(fail('NO_VOICE', 'Máy này chưa có giọng đọc tiếng Việt. Xem cách bật ở Trợ lý AI → Kết nối AI.')); }
    var run = eng === 'ai' ? speakAi(text, token) : speakBrowser(text, token).catch(function (e) {
      if (token !== S.token || !aiReady()) throw e;
      halt(); token = S.token; S.engine = 'ai'; return speakAi(text, token);          /* giọng của máy hỏng → thử giọng AI */
    });
    return run.then(function (done) { if (token === S.token) { halt(); setState('idle'); } return done; }, function (e) { if (token === S.token) { halt(); setState('idle'); } throw e; });
  }
  function readCurrent() {
    var c = current(); if (!c) return Promise.resolve(false);
    var text = build(c), id = c.g.id; halt(); S.gameRead = true;
    /* 2.6: báo cho trò chơi biết máy đã đọc xong (Bình chọn ngón tay dùng để tự bắt đầu đếm). */
    return speak(text).catch(function (e) { toast(e.message); return false; }).then(function (done) { try { doc.dispatchEvent(new win.CustomEvent('hmv-doc-to-xong', { detail: { game: id, done: done === true } })); } catch (e) {} return done; });
  }
  function toggle() { if (S.state !== 'idle') { stop(); return; } readCurrent(); }

  /* ---------- Nút loa trong trò chơi ---------- */
  function label() { return S.state === 'speaking' ? 'Dừng đọc' : S.state === 'loading' ? 'Đang chuẩn bị giọng đọc… Bấm để hủy' : 'Đọc to câu hỏi'; }
  function paint() {
    Array.prototype.forEach.call(doc.querySelectorAll('.hmv-dt-btn'), function (b) {
      b.classList.toggle('speaking', S.state === 'speaking'); b.classList.toggle('loading', S.state === 'loading');
      var l = label(); if (b.title !== l) { b.title = l; b.setAttribute('aria-label', l); } b.setAttribute('aria-pressed', S.state === 'idle' ? 'false' : 'true');
    });
  }
  function scan() {
    var c = current(), ready = !!engine();
    Array.prototype.forEach.call(doc.querySelectorAll('.hmv-dt-btn, .hmv-dt-gear'), function (b) { if (!ready || !c || b.parentNode !== c.q) b.remove(); });
    var key = c ? c.g.id + '|' + c.text : '';
    if (c && ready && !c.q.querySelector('.hmv-dt-btn')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'hmv-dt-btn'; b.innerHTML = ICON; c.q.appendChild(b); paint();
    }
    if (c && ready && !c.q.querySelector('.hmv-dt-gear')) {
      var g = doc.createElement('button'); g.type = 'button'; g.className = 'hmv-dt-gear'; g.innerHTML = GEAR; g.title = 'Cài đặt đọc to'; g.setAttribute('aria-label', 'Cài đặt đọc to'); g.setAttribute('aria-haspopup', 'dialog'); c.q.appendChild(g);
    }
    if (S.pop && (!c || !ready)) closePop();
    if (key !== S.last) {
      var first = S.last === null; S.last = key;
      if (S.state !== 'idle' && !S.trying) stop();                                    /* sang câu khác hoặc rời trò: thôi đọc câu cũ */
      if (S.autoTimer) { win.clearTimeout(S.autoTimer); S.autoTimer = 0; }
      if (key && ready && cfg.auto && !first && !doc.hidden) S.autoTimer = win.setTimeout(function () { S.autoTimer = 0; var n = current(); if (n && n.g.id + '|' + n.text === key && S.state === 'idle') readCurrent(); syncHold(); }, 700);
      syncHold();
    }
  }
  var pending = false;
  function soon() { if (pending) return; pending = true; Promise.resolve().then(function () { pending = false; try { scan(); } catch (e) {} }); }

  /* ---------- Phần cài đặt (Trợ lý AI → Kết nối AI) ---------- */
  function opt(v, cur, text) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(text) + '</option>'; }
  function statusHtml() {
    var v = voice(), ai = aiReady(), eng = engine();
    if (eng === 'browser') return '<div class="ta-note">Đang dùng giọng tiếng Việt của máy: <b>' + esc(v.name) + '</b>' + (v.localService === false ? ' (giọng trực tuyến, cần Internet)' : ' (không cần mạng)') + '. Nút loa hiện ngay sau câu hỏi trong các trò chơi.</div>';
    if (eng === 'ai') return '<div class="ta-note">Đang dùng <b>giọng AI Gemini</b> (cần Internet). Lần đầu đọc một câu phải chờ vài giây; câu đã đọc được lưu trên máy này nên lần sau phát ngay. Nút loa hiện ngay sau câu hỏi trong các trò chơi.</div>';
    return '<div class="ta-note bad">Máy này chưa có giọng đọc tiếng Việt nên nút loa chưa hiện trong trò chơi. Có hai cách bật, chọn một:</div>'
      + '<ol class="dt-steps"><li><b>Giọng AI Gemini</b> (tự nhiên nhất, cần Internet): làm xong phần <b>Kết nối Gemini</b> ở trên là dùng được ngay.</li>'
      + '<li><b>Giọng tiếng Việt của Windows</b> (miễn phí, không cần mạng): mở <b>Cài đặt Windows → Thời gian &amp; ngôn ngữ → Giọng nói (Speech) → Thêm giọng nói (Add voices)</b>, chọn <b>Tiếng Việt</b>. Tải xong thì đóng hẳn trình duyệt rồi mở lại ứng dụng.</li></ol>';
  }
  function renderSettings(host) {
    if (!host) return; loadVoices();
    var vs = S.voices, v = voice(), ai = aiReady(), ready = !!engine();
    host.innerHTML = '<section class="card dt-card"><h3>🔊 Đọc to câu hỏi</h3>' + statusHtml()
      + '<div class="ta-grid dt-grid">'
      + '<label>Nguồn giọng<select id="dtEngine" class="input">' + opt('auto', cfg.engine, 'Tự chọn (khuyên dùng)') + opt('browser', cfg.engine, 'Giọng tiếng Việt của máy') + opt('ai', cfg.engine, 'Giọng AI Gemini') + '</select></label>'
      + '<label>Giọng của máy<select id="dtVoice" class="input"' + (vs.length ? '' : ' disabled') + '>' + (vs.length ? vs.map(function (x) { return opt(x.voiceURI || x.name, v && (v.voiceURI || v.name), x.name); }).join('') : '<option>Chưa có giọng tiếng Việt</option>') + '</select></label>'
      + '<label>Giọng AI<select id="dtAiVoice" class="input"' + (ai ? '' : ' disabled') + '>' + AI_VOICES.map(function (x) { return opt(x[0], cfg.aiVoice, x[1]); }).join('') + '</select></label>'
      + '<label>Tốc độ đọc<select id="dtRate" class="input">' + RATES.map(function (r) { return opt(r[0], cfg.rate, r[1]); }).join('') + '</select></label></div>'
      + '<label class="dt-check"><input type="checkbox" id="dtAnswers"' + (cfg.answers ? ' checked' : '') + '> Đọc cả các phương án A, B, C, D</label>'
      + '<label class="dt-check"><input type="checkbox" id="dtAuto"' + (cfg.auto ? ' checked' : '') + '> Tự đọc mỗi khi sang câu mới (không cần bấm nút loa)</label>'
      + '<label class="dt-check"><input type="checkbox" id="dtWait"' + (cfg.wait ? ' checked' : '') + '> Chờ đọc xong mới tính giờ (đồng hồ và việc tự chuyển câu của trò chơi tạm chờ trong lúc máy đọc)</label>'
      + '<div class="dt-try"><button type="button" class="btn color" id="dtTry"' + (ready ? '' : ' disabled') + '>▶ Nghe thử</button><span id="dtTryNote" class="dt-try-note"></span></div>'
      + '<p class="dt-foot">Dùng được trong: Kéo co, Ai nhanh hơn, Hộp quà, Đường đua, Chinh phục tri thức, Quiz Nghiêng Đầu, Bóng bay, Bình chọn ngón tay, Chế độ giấy. Chỉ câu hỏi và phương án được đọc, không có lời dẫn; không gửi tên học sinh. Trong trò chơi, nút bánh răng cạnh nút loa mở nhanh các lựa chọn này.</p></section>';
    paintTry();
  }
  function paintTry() {
    var b = doc.getElementById('dtTry'), n = doc.getElementById('dtTryNote'); if (!b) return;
    b.textContent = S.trying && S.state === 'speaking' ? '■ Dừng' : S.trying && S.state === 'loading' ? '… Đang chuẩn bị giọng' : '▶ Nghe thử';
    if (n) n.textContent = S.tryNote || '';
  }
  function rerender() { var h = doc.getElementById('dtSettings'); if (h) renderSettings(h); soon(); }
  function tryIt() {
    if (S.trying && S.state !== 'idle') { S.trying = false; stop(); return; }
    S.trying = true; S.tryNote = ''; var started = Date.now(), eng = engine();
    S.gameRead = false; speak(say('27 + 15 = ?') + ' A, 32. B, 42. C, 41. D, 52.').then(function (done) { S.trying = false; S.tryNote = done ? (eng === 'ai' ? 'Giọng AI · ' : 'Giọng của máy · ') + ((Date.now() - started) / 1000).toFixed(1) + ' giây' : ''; paintTry(); }, function (e) { S.trying = false; S.tryNote = e.message; paintTry(); });
    paintTry();
  }
  function onChange(e) {
    var t = e.target; if (!t || !t.id || t.id.indexOf('dt') !== 0 || !t.closest('.dt-card')) return;
    if (t.id === 'dtEngine') cfg.engine = t.value; else if (t.id === 'dtVoice') cfg.voice = t.value; else if (t.id === 'dtAiVoice') cfg.aiVoice = t.value;
    else if (t.id === 'dtRate') cfg.rate = Number(t.value) || 0.95; else if (t.id === 'dtAnswers') cfg.answers = !!t.checked; else if (t.id === 'dtAuto') cfg.auto = !!t.checked; else if (t.id === 'dtWait') cfg.wait = !!t.checked; else return;
    save(); S.tryNote = ''; if (S.state !== 'idle') stop(); syncHold(); rerender();
  }
  /* ---------- Bảng chọn nhanh trong trò chơi (nút bánh răng cạnh nút loa) ---------- */
  function popHtml() {
    return '<div class="hmv-dt-pop-title">🔊 Đọc to câu hỏi</div>'
      + '<div class="hmv-dt-pop-row"><span>Tốc độ đọc</span><div class="hmv-dt-seg" role="group" aria-label="Tốc độ đọc">' + RATES.map(function (r) { var on = Number(r[0]) === Number(cfg.rate); return '<button type="button" data-dt-rate="' + r[0] + '"' + (on ? ' class="on"' : '') + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + r[1] + '</button>'; }).join('') + '</div></div>'
      + '<label class="hmv-dt-pop-check"><input type="checkbox" data-dt-opt="wait"' + (cfg.wait ? ' checked' : '') + '><span>Chờ đọc xong mới tính giờ</span></label>'
      + '<label class="hmv-dt-pop-check"><input type="checkbox" data-dt-opt="auto"' + (cfg.auto ? ' checked' : '') + '><span>Tự đọc khi sang câu mới</span></label>'
      + '<label class="hmv-dt-pop-check"><input type="checkbox" data-dt-opt="answers"' + (cfg.answers ? ' checked' : '') + '><span>Đọc cả phương án A, B, C, D</span></label>';
  }
  function placePop(anchor) {
    var p = S.pop; if (!p) return; var r = anchor.getBoundingClientRect(), w = p.offsetWidth || 300, h = p.offsetHeight || 220, vw = win.innerWidth, vh = win.innerHeight;
    var left = Math.max(8, Math.min(vw - w - 8, r.right - w)), top = r.bottom + 10; if (top + h > vh - 8) top = Math.max(8, r.top - h - 10);
    p.style.left = left + 'px'; p.style.top = top + 'px';
  }
  function closePop() { if (S.pop) { try { S.pop.remove(); } catch (e) {} S.pop = null; } Array.prototype.forEach.call(doc.querySelectorAll('.hmv-dt-gear'), function (g) { g.setAttribute('aria-expanded', 'false'); }); }
  function openPop(anchor) {
    closePop();
    var p = doc.createElement('div'); p.id = 'hmvDtPop'; p.className = 'hmv-dt-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Cài đặt đọc to'); p.innerHTML = popHtml();
    (doc.fullscreenElement || doc.body).appendChild(p); S.pop = p; anchor.setAttribute('aria-expanded', 'true'); placePop(anchor);
  }
  function popChanged() { save(); syncHold(); if (S.pop) S.pop.innerHTML = popHtml(); var h = doc.getElementById('dtSettings'); if (h) renderSettings(h); }
  function onPopChange(e) {
    var t = e.target; if (!t || !t.dataset || !t.dataset.dtOpt || !S.pop || !S.pop.contains(t)) return;
    var k = t.dataset.dtOpt; if (k === 'wait' || k === 'auto' || k === 'answers') { cfg[k] = !!t.checked; popChanged(); }
  }
  function onClick(e) {
    var el = e.target && e.target.closest ? e.target : null; if (!el) return;
    if (S.pop && S.pop.contains(el)) {                                            /* bấm trong bảng chọn nhanh: không để trò chơi nhận cú bấm */
      e.stopPropagation(); var rb = el.closest('[data-dt-rate]'); if (rb) { e.preventDefault(); cfg.rate = Number(rb.dataset.dtRate) || 0.95; popChanged(); }
      return;
    }
    var t = el.closest('.hmv-dt-btn, .hmv-dt-gear, #dtTry');
    if (!t) { if (S.pop) closePop(); return; }
    e.preventDefault(); e.stopPropagation();
    if (t.id === 'dtTry') { if (!t.disabled) tryIt(); return; }
    if (t.classList.contains('hmv-dt-gear')) { if (S.pop) closePop(); else openPop(t); return; }
    if (S.pop) closePop();
    toggle();
  }

  function boot() {
    loadVoices();
    var sy = synth(); if (sy) { try { sy.addEventListener('voiceschanged', function () { loadVoices(); rerender(); }); } catch (e) { try { sy.onvoiceschanged = function () { loadVoices(); rerender(); }; } catch (e2) {} } }
    doc.addEventListener('click', onClick, true); doc.addEventListener('change', onChange); doc.addEventListener('change', onPopChange, true);
    doc.addEventListener('keydown', function (e) { if (!S.pop) return; if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closePop(); } else if (S.pop.contains(e.target)) e.stopPropagation(); }, true);
    win.addEventListener('resize', closePop);
    var root = doc.querySelector('main.main') || doc.body;
    try { new win.MutationObserver(soon).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] }); } catch (e) {}
    S.scanTimer = win.setInterval(function () { try { scan(); } catch (e) {} }, 700);
    win.addEventListener('pagehide', function () { halt(); duck(false); win.hmvHold = 0; });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && S.state !== 'idle') stop(); });
    scan();
  }

  win.hmvDocTo = {
    renderSettings: renderSettings, read: readCurrent, stop: stop, speak: speak, refresh: rerender,
    state: function () { return { state: S.state, engine: S.engine, ready: !!engine(), choice: engine(), voices: S.voices.map(function (v) { return v.name; }), lastText: S.lastText, hold: !!win.hmvHold, pop: !!S.pop, cfg: JSON.parse(JSON.stringify(cfg)) }; },
    set: function (o) { Object.keys(o || {}).forEach(function (k) { if (k in cfg) cfg[k] = o[k]; }); save(); syncHold(); rerender(); },
    _test: { say: say, build: function () { var c = current(); return c ? build(c) : ''; }, current: function () { var c = current(); return c ? { game: c.g.id, text: c.text, answers: answersOf(c) } : null; }, chunks: chunks, cacheCount: cacheCount }
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
