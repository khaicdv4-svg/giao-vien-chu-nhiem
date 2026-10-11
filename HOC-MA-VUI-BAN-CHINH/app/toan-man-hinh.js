/* BAN-CHINH 1.2 · Toàn màn hình cho mọi trò chơi trong mục Hoạt động.
 *
 * - Mọi màn hình trò chơi (thiết lập và đang chơi) đều có nút "⛶ Toàn màn hình".
 * - Phóng to CẢ TRANG (không phải riêng khung trò chơi) rồi ẩn thanh bên và thanh chọn lớp,
 *   nhờ vậy hộp thiết lập, thông báo và hộp xác nhận vẫn hiện bình thường khi đang toàn màn hình.
 * - Thoát: bấm lại nút, nhấn Esc, hoặc rời trò chơi.
 * - Các nút toàn màn hình sẵn có của Kéo co, Ai nhanh hơn, Đường đua, Hộp quà, Lật mảnh ghép được nối về cùng một cách làm.
 */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, CLS = 'hmv-game-full';

  function active() { return doc.body.classList.contains(CLS); }
  function inGame() { var g = doc.getElementById('games'); return !!(g && g.classList.contains('active') && window.classroomGame && window.classroomGame.type); }
  function toast(t) { if (typeof window.showToast === 'function') window.showToast(t); }

  function labels() {
    var on = active();
    doc.querySelectorAll('#games .hmv-full-btn, #games button[onclick$="Fullscreen()"]').forEach(function (b) {
      var text = on ? '✕ Thoát toàn màn' : '⛶ Toàn màn hình';
      if (b.textContent !== text) b.textContent = text;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? 'Thoát toàn màn hình (phím Esc)' : 'Mở trò chơi toàn màn hình';
    });
  }
  function enter() {
    doc.body.classList.add(CLS); labels();
    if (!doc.fullscreenElement && root.requestFullscreen) {
      var p; try { p = root.requestFullscreen(); } catch (e) { p = null; }
      if (p && p.catch) p.catch(function () { toast('Trình duyệt chưa cho phép toàn màn hình; trò chơi đã được mở rộng hết cửa sổ. Nhấn F11 để phóng to thêm.'); });
    } else if (!root.requestFullscreen) toast('Trò chơi đã được mở rộng hết cửa sổ. Nhấn F11 để phóng to thêm.');
    window.scrollTo(0, 0);
  }
  function leave() {
    doc.body.classList.remove(CLS); labels();
    if (doc.fullscreenElement && doc.exitFullscreen) { try { var p = doc.exitFullscreen(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  }
  function toggle() { if (active()) leave(); else enter(); }

  function ensureButton() {
    var g = doc.getElementById('games'); if (!g) return;
    if (!inGame()) { if (active()) leave(); return; }
    if (!g.querySelector('.hmv-full-btn, button[onclick$="Fullscreen()"]')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'btn soft hmv-full-btn'; b.onclick = toggle;
      var title = g.querySelector('.page-title, .tug-head, .lens-head, .game-play-head, .tilt-head, .millionaire-head');
      if (title) (title.querySelector('.toolbar, .tilt-score, .millionaire-meta') || title).appendChild(b);
      else {
        /* Trò chơi không có hàng tiêu đề quen thuộc: đặt một hàng nhỏ ở đầu màn hình trò chơi. */
        var row = doc.createElement('div'); row.className = 'hmv-full-bar'; row.appendChild(b);
        var first = Array.prototype.find.call(g.children, function (c) { return !c.classList.contains('wind-module-card'); });
        if (first) first.insertBefore(row, first.firstChild); else g.appendChild(row);
      }
    }
    labels();
  }

  ['tugFullscreen', 'buzzFullscreen', 'raceFullscreen', 'giftFullscreen', 'flipFullscreen', 'lensFullscreen'].forEach(function (name) { window[name] = toggle; });
  window.hmvGameFullscreen = { toggle: toggle, enter: enter, leave: leave, isActive: active };

  doc.addEventListener('fullscreenchange', function () {
    /* Esc hoặc F11 của trình duyệt: trả bố cục về bình thường. Không đụng tới toàn màn hình của Vòng quay (#picker). */
    if (!doc.fullscreenElement && active()) { doc.body.classList.remove(CLS); labels(); }
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active() && !doc.fullscreenElement && !doc.querySelector('dialog[open], .tilt-modal, #khoModal, #c6QuestionModal, #qbStage7Modal')) leave(); });

  var baseOpen = window.openView;
  if (typeof baseOpen === 'function') window.openView = function (id) { var out = baseOpen.apply(this, arguments); if (id !== 'games' && active()) leave(); return out; };

  function boot() {
    var g = doc.getElementById('games'); if (!g) return;
    new MutationObserver(ensureButton).observe(g, { childList: true, subtree: true });
    ensureButton();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
