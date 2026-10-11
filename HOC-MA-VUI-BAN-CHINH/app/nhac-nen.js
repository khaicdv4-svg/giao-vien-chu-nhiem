/* BAN-CHINH 1.5 · Nhạc nền cho các trò chơi chưa có: Hộp quà bí mật, Chinh phục tri thức, Quiz Nghiêng Đầu, Bóng bay tri thức.
 * (Kéo co kiến thức và Ai nhanh hơn đã có nhạc nền riêng ngay trong mã của trò.)
 *
 * - Nhạc là tệp trong ứng dụng (assets/audio), chạy offline. Mỗi bản phát lặp theo một đoạn đúng nhịp (120 nhịp/phút)
 *   bằng Web Audio nên chỗ nối không hở tiếng.
 * - Tệp này KHÔNG sửa mã của các trò: nó chỉ quan sát màn hình trò chơi để biết đang chơi / tạm dừng / đã kết thúc.
 * - Nhạc phát khi đang chơi; tạm ngưng khi tạm dừng hoặc rời màn hình; tắt khi kết thúc hoặc về thư viện.
 * - Mỗi trò có nút "🎵 Nhạc nền: Bật/Tắt" riêng, lựa chọn được ghi nhớ.
 */
(function () {
  'use strict';
  var doc = document, KEY = 'hmv_game_music_v1';
  var TRACKS = {
    'boc-tham': { name: 'Bốc thăm trúng thưởng', url: 'assets/audio/nhac-boc-tham.mp3', loop: [0.015, 12.015], start: 0, gain: 0.45 },
    'nghich-ngom': { name: 'Vui vẻ nghịch ngợm', url: 'assets/audio/nhac-nghich-ngom.mp3', loop: [1.015, 17.015], start: 1.0, gain: 0.55 },
    'vui-nhon': { name: 'Giai điệu trống vui nhộn', url: 'assets/audio/ai-nhanh-hon.mp3', loop: [1, 13], start: 0.03, gain: 0.3 }
  };
  var GAMES = { gift: 'boc-tham', millionaire: 'boc-tham', 'head-tilt': 'nghich-ngom', balloon: 'vui-nhon' };

  var ctx = null, gain = null, buffers = {}, loading = {}, broken = {}, src = null, srcTrack = '', want = '', el = null, elTrack = '';

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function isOn(type) { var s = read()[type]; return !s || s.on !== false; }
  function setOn(type, on) { var s = read(); s[type] = Object.assign({}, s[type], { on: !!on }); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function level(type) { var s = read()[type], t = TRACKS[GAMES[type]], v = s && typeof s.vol === 'number' ? s.vol : t.gain; return Math.max(0, Math.min(1, v)); }

  function dropSource() { if (src) { try { src.stop(); } catch (e) {} try { src.disconnect(); } catch (e) {} src = null; srcTrack = ''; } if (el) { try { el.pause(); el.currentTime = 0; } catch (e) {} } }
  function stop() { want = ''; dropSource(); }
  function hold() { want = ''; if (ctx && ctx.state === 'running' && src) { try { ctx.suspend(); } catch (e) {} } if (el) { try { el.pause(); } catch (e) {} } }
  function playElement(id, vol) { /* Dự phòng khi trình duyệt không giải mã được bằng Web Audio. */
    try { if (!el || elTrack !== id) { if (el) el.pause(); el = new Audio(TRACKS[id].url); el.loop = true; elTrack = id; } el.volume = vol * (window.hmvDuck || 1); if (el.paused) { var p = el.play(); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
  }
  function play(id, vol) {
    var t = TRACKS[id]; if (!t) return;
    want = id;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C || broken[id]) { playElement(id, vol); return; }
    try {
      if (!ctx || ctx.state === 'closed') { ctx = new C(); gain = ctx.createGain(); gain.connect(ctx.destination); }
      gain.gain.value = vol * (window.hmvDuck || 1);   /* 2.2: nhỏ lại khi đang đọc to câu hỏi */
      if (src && srcTrack !== id) dropSource();
      if (ctx.state === 'suspended') { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); }
      if (src) return;
      if (buffers[id]) {
        src = ctx.createBufferSource(); src.buffer = buffers[id]; src.loop = true; srcTrack = id;
        if (buffers[id].duration > t.loop[1] + 0.1) { src.loopStart = t.loop[0]; src.loopEnd = t.loop[1]; }
        src.connect(gain); src.start(0, t.start);
        return;
      }
      if (!loading[id]) loading[id] = fetch(t.url).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (ok, no) { ctx.decodeAudioData(ab, ok, no); }); })
        .then(function (buf) { buffers[id] = buf; loading[id] = null; if (want === id) sync(); })
        .catch(function () { loading[id] = null; broken[id] = true; if (want === id) sync(); });
    } catch (e) { broken[id] = true; playElement(id, vol); }
  }

  function gamesEl() { return doc.getElementById('games'); }
  function onStage(type) { var g = gamesEl(); return !!(g && g.classList.contains('active') && window.classroomGame && window.classroomGame.type === type && !doc.hidden); }
  /* 'play' = đang chơi, 'hold' = tạm dừng, 'stop' = chưa bắt đầu / đã kết thúc. */
  function stateOf(type) {
    var g = gamesEl(); if (!g) return 'stop';
    if (type === 'gift') {
      if (!g.querySelector('.gift-game') || g.querySelector('.gift-result')) return 'stop';
      var paused = Array.prototype.some.call(g.querySelectorAll('.page-title .toolbar button'), function (b) { return /Tiếp tục/.test(b.textContent); });
      return paused ? 'hold' : 'play';
    }
    if (type === 'millionaire') { if (!g.querySelector('.millionaire')) return 'stop'; var st = window.millionaireState; return st && st.result ? 'stop' : 'play'; }
    if (type === 'head-tilt') return g.querySelector('.tilt-options') && !g.querySelector('.tilt-finish') ? 'play' : 'stop';
    if (type === 'balloon') return window.hmvBalloon && typeof window.hmvBalloon.musicState === 'function' ? window.hmvBalloon.musicState() : 'stop';
    return 'stop';
  }

  function label(b, type) { var on = isOn(type), text = '🎵 Nhạc nền: ' + (on ? 'Bật' : 'Tắt'); if (b.textContent !== text) b.textContent = text; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = 'Nhạc nền: ' + TRACKS[GAMES[type]].name; }
  function ensureButton(type) {
    var g = gamesEl(); if (!g) return;
    var b = g.querySelector('.hmv-music-btn');
    if (!b) {
      var title = g.querySelector('.page-title, .tilt-head, .millionaire-head'); if (!title) return;
      b = doc.createElement('button'); b.type = 'button'; b.className = 'btn soft hmv-music-btn';
      b.onclick = function () { var t = window.classroomGame && window.classroomGame.type; if (!GAMES[t]) return; setOn(t, !isOn(t)); label(b, t); sync(); if (typeof window.showToast === 'function') window.showToast(isOn(t) ? 'Đã bật nhạc nền' : 'Đã tắt nhạc nền'); };
      (title.querySelector('.toolbar, .tilt-score, .millionaire-meta') || title).appendChild(b);
    }
    label(b, type);
  }

  var current = '';
  function sync() {
    var type = window.classroomGame && window.classroomGame.type || '';
    if (!GAMES[type]) { if (current) { stop(); current = ''; } return; }
    current = type;
    ensureButton(type);
    var st = stateOf(type);
    if (st === 'stop' || !isOn(type) || level(type) <= 0) { stop(); return; }
    if (st === 'hold' || !onStage(type)) { hold(); return; }
    play(GAMES[type], level(type));
  }

  var pending = 0;
  function soon() { if (pending) return; pending = setTimeout(function () { pending = 0; sync(); }, 60); }
  function boot() {
    var g = gamesEl(); if (g) new MutationObserver(soon).observe(g, { childList: true, subtree: true, characterData: true });
    doc.addEventListener('visibilitychange', sync);
    setInterval(sync, 500);
    sync();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();

  window.hmvMusic = {
    sync: sync, isOn: isOn, setOn: function (type, on) { setOn(type, on); sync(); }, tracks: TRACKS, games: GAMES,
    state: function () { return { game: current, want: want, track: srcTrack || (el && !el.paused ? elTrack : ''), mode: src ? 'webaudio' : (el && !el.paused ? 'element' : ''), ctx: ctx ? ctx.state : '', playing: !!(src && ctx && ctx.state === 'running') || !!(el && !el.paused), loop: src ? [src.loopStart, src.loopEnd] : null, gain: gain ? gain.gain.value : null, time: ctx ? ctx.currentTime : 0 }; }
  };
})();
