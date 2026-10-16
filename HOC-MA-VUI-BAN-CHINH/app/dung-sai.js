/* BAN-CHINH 2.7 · Tiếng "ĐÚNG" / "SAI" ngay khi một câu trả lời được chấm, dùng chung cho mọi trò chơi.
 *
 * Tệp: assets/audio/tra-loi-dung.mp3 và assets/audio/tra-loi-sai.mp3 – cắt gọn (khoảng 2,4 giây) từ dung.mp3 và sai.mp3
 * trong thư viện âm thanh của giáo viên, để tiếng vang lên ngay lúc chấm và không kéo sang câu sau.
 *
 * - Mỗi trò tự gọi hmvDungSai.play(đúng?, âm lượng, tiếng dự phòng) đúng lúc chấm và tự xét nút "Tiếng: Bật/Tắt" của trò.
 * - Không phát được tệp (trình duyệt chặn, thiếu tệp) → gọi tiếng "bíp" cũ của trò.
 * - Câu sau được chấm khi tiếng trước chưa dứt → tiếng trước tắt, tiếng mới phát (không chồng tiếng).
 * - Tiếng mừng chiến thắng vang lên → tiếng đúng/sai nhường chỗ.
 * - Máy bắt đầu đọc câu hỏi kế tiếp khi tiếng còn ngân → tiếng tự tắt để không lấn giọng đọc.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var SRC = { right: 'assets/audio/tra-loi-dung.mp3', wrong: 'assets/audio/tra-loi-sai.mp3' };
  var els = {}, cur = null, watch = 0, counts = { right: 0, wrong: 0 }, last = null, epoch = 0;

  function el(k) { if (!els[k]) { els[k] = new win.Audio(SRC[k]); els[k].preload = 'auto'; } return els[k]; }
  function quiet(k) { var a = els[k]; if (a) { try { a.pause(); a.currentTime = 0; } catch (e) {} } }
  function stop() { epoch++; if (win.hmvEffectAudio) win.hmvEffectAudio.stop('answer'); if (watch) { win.clearInterval(watch); watch = 0; } quiet('right'); quiet('wrong'); cur = null; }
  function level(v) { v = Number(v); if (isNaN(v)) return 0.8; if (v <= 0) return 0; return Math.min(1, 0.5 + v * 0.5); }   /* cùng cách tính với tiếng mừng chiến thắng */
  function reading() { return typeof win.hmvDuck === 'number' && win.hmvDuck < 1; }
  function mungOn() { try { return !!(win.hmvMung && win.hmvMung.state().playing); } catch (e) { return false; } }
  function play(ok, volume, fallback) {
    var k = ok ? 'right' : 'wrong', v = level(volume);
    stop(); counts[k]++; last = { ok: !!ok, at: Date.now(), volume: v, fallback: false, skipped: '' };
    if (v <= 0) { last.skipped = 'tắt tiếng'; return true; }
    if (mungOn()) { last.skipped = 'đang phát tiếng mừng'; return true; }
    var generation = epoch;
    function back() { if (generation !== epoch) return; nativeStarted = true; last.fallback = true; if (typeof fallback === 'function') { try { fallback(); } catch (e) {} } }
    var a, nativeAudio = !!win.hmvEffectAudio, nativeStarted = false;
    try {
      if (nativeAudio) win.hmvEffectAudio.play('answer', SRC[k], v, null, back);
      else {
      a = el(k); a.volume = v; try { a.currentTime = 0; } catch (e) {}
      var p = a.play(); if (p && p.catch) p.catch(back);
      }
    } catch (e) { back(); return false; }
    cur = k;
    var wasReading = reading();
    watch = win.setInterval(function () {
      var ended;
      if (nativeAudio) { var playing = win.hmvEffectAudio.state('answer').playing; if (playing) nativeStarted = true; ended = nativeStarted && !playing; }
      else ended = !a || a.ended || a.paused;
      if (ended) { win.clearInterval(watch); watch = 0; if (cur === k) cur = null; return; }
      if (!reading()) wasReading = false; else if (!wasReading) stop();   /* giọng đọc câu kế tiếp vừa cất lên */
    }, 100);
    return true;
  }
  function warm() { try { el('right').load(); el('wrong').load(); } catch (e) {} }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', warm); else warm();
  win.addEventListener('pagehide', stop);

  function st(k) { var a = els[k]; return { playing: !!(cur === k && win.hmvEffectAudio ? win.hmvEffectAudio.state('answer').playing : a && !a.paused && !a.ended), time: a ? a.currentTime : 0, volume: a ? a.volume : null, ready: a ? a.readyState : 0, error: a && a.error ? a.error.code : 0, duration: a && isFinite(a.duration) ? a.duration : 0 }; }
  win.hmvDungSai = { play: play, right: function (v, f) { return play(true, v, f); }, wrong: function (v, f) { return play(false, v, f); }, stop: stop, src: SRC,
    state: function () { return { right: counts.right, wrong: counts.wrong, playing: cur && st(cur).playing ? cur : '', last: last, audio: { right: st('right'), wrong: st('wrong') } }; } };
})(window);
