/* BAN-CHINH 2.3 · Tiếng mừng chiến thắng lúc kết thúc trò chơi (tệp assets/audio/mung-chien-thang.mp3 do giáo viên cung cấp).
 *
 * Dùng cho các trò CHƯA có tiếng mừng riêng: Ai nhanh hơn, Đường đua kiến thức, Hộp quà bí mật, Chinh phục tri thức (khi thắng),
 * Quiz Nghiêng Đầu, Bóng bay tri thức. Kéo co kiến thức và Vòng quay kết nối giữ tiếng mừng sẵn có của mình.
 *
 * - Mỗi trò tự gọi hmvMung.play(âm lượng, tiếng dự phòng, còn-ở-màn-kết-quả?) đúng lúc kết thúc và tự xét nút "Tiếng: Bật/Tắt" của trò.
 * - Không phát được tệp (trình duyệt chặn, thiếu tệp) → gọi tiếng dự phòng cũ của trò.
 * - Bấm Chơi lại / Về thư viện / sang màn hình khác khi tiếng đang phát → tự tắt.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var SRC = 'assets/audio/mung-chien-thang.mp3';
  var audio = null, watch = 0, plays = 0, last = null;

  function el() { if (!audio) { audio = new win.Audio(SRC); audio.preload = 'auto'; } return audio; }
  function stop() { if (watch) { win.clearInterval(watch); watch = 0; } if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (e) {} } }
  function level(v) { v = Number(v); if (isNaN(v)) return 0.8; if (v <= 0) return 0; return Math.min(1, 0.5 + v * 0.5); }   /* thanh âm lượng của trò đang > 0 thì tiếng mừng ít nhất ở mức vừa */
  function onStage() { var g = doc.getElementById('games'); return !!(g && g.classList.contains('active')); }
  function play(volume, fallback, still) {
    stop(); try { if (win.hmvDungSai) win.hmvDungSai.stop(); } catch (e) {}   /* 2.7: tiếng đúng/sai nhường chỗ cho tiếng mừng */
    var v = level(volume); last = { at: Date.now(), volume: v, fallback: false }; plays++;
    if (v <= 0) return true;
    function back() { last.fallback = true; if (typeof fallback === 'function') { try { fallback(); } catch (e) {} } }
    try {
      var a = el(); a.volume = v; try { a.currentTime = 0; } catch (e) {}
      var p = a.play(); if (p && p.catch) p.catch(back);
    } catch (e) { back(); return false; }
    watch = win.setInterval(function () {
      var keep = onStage(); if (keep && typeof still === 'function') { try { keep = !!still(); } catch (e) { keep = false; } }
      if (!keep) stop(); else if (!audio || audio.ended || audio.paused) { win.clearInterval(watch); watch = 0; }
    }, 250);
    return true;
  }
  function warm() { try { el().load(); } catch (e) {} }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', warm); else warm();
  win.addEventListener('pagehide', stop);

  win.hmvMung = { play: play, stop: stop, src: SRC, state: function () { return { plays: plays, playing: !!(audio && !audio.paused && !audio.ended), time: audio ? audio.currentTime : 0, volume: audio ? audio.volume : null, last: last, ready: audio ? audio.readyState : 0, error: audio && audio.error ? audio.error.code : 0 }; } };
})(window);
