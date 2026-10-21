/* BAN-CHINH 1.2 · Vòng quay kết nối: bố cục hai cột.
 *
 * Trái  = chỉ còn vòng quay, luôn nằm trọn trong màn hình (kể cả toàn màn hình).
 * Phải  = toàn bộ điều khiển: thẻ chế độ, nút QUAY NGAY, số học sinh, cài đặt âm thanh, toàn màn hình, kết quả gần đây.
 *
 * Tệp này chỉ SẮP XẾP LẠI các phần tử sẵn có (giữ nguyên id và sự kiện của chúng); không đổi cách quay, cách chọn hay dữ liệu.
 */
(function () {
  'use strict';
  var doc = document, redrawTimer = 0, watching = false;

  function redraw() {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(function () { if (typeof window.drawPickerWheel === 'function') { try { window.drawPickerWheel(); } catch (e) {} } }, 70);
  }
  function move(node, parent) { if (node && parent && node.parentElement !== parent) parent.appendChild(node); }
  function fullLabel() {
    var b = doc.querySelector('#picker .picker-fullscreen'); if (!b) return;
    var on = doc.fullscreenElement && doc.fullscreenElement.id === 'picker';
    b.textContent = on ? '✕ Thoát toàn màn' : '⛶ Toàn màn hình';
    b.title = on ? 'Thoát chế độ toàn màn hình (phím Esc)' : 'Mở vòng quay toàn màn hình';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function arrange() {
    var sec = doc.getElementById('picker'); if (!sec) return false;
    var layout = sec.querySelector('.picker-layout'), side = sec.querySelector('.picker-side'), stage = sec.querySelector('.picker-stage');
    var bar = doc.getElementById('phase1ModeBar');
    if (!layout || !side || !stage || !bar) return false;

    var box = side.querySelector('.vq-controls');
    if (!box) {
      /* Gom phần "Kết quả gần đây" sẵn có vào một khối để nó tự cuộn bên trong cột. */
      var history = doc.createElement('div'); history.className = 'vq-history';
      while (side.firstChild) history.appendChild(side.firstChild);
      box = doc.createElement('div'); box.className = 'vq-controls';
      box.innerHTML = '<div class="vq-head"><b>🎡 VÒNG QUAY KẾT NỐI</b><small>Gọi tên vui và Nhiệm vụ bất ngờ</small></div>'
        + '<div class="vq-group vq-mode"><span class="vq-label">Chế độ quay</span></div>'
        + '<div class="vq-group vq-spin"></div>'
        + '<div class="vq-group vq-tools"><span class="vq-label">Cài đặt</span><div class="vq-tool-row"></div></div>';
      side.appendChild(box); side.appendChild(history);
    }
    var mode = box.querySelector('.vq-mode'), spin = box.querySelector('.vq-spin'), tools = box.querySelector('.vq-tool-row');
    move(bar, mode);
    move(doc.getElementById('phase1ModePanel'), mode);
    move(doc.getElementById('spinButton'), spin);
    move(doc.getElementById('pickerRemaining'), spin);
    move(sec.querySelector('.audio-gear'), tools);
    move(sec.querySelector('.picker-fullscreen'), tools);

    var gear = bar.querySelector('[data-open-task-settings]');
    if (gear && !gear.dataset.vq) { gear.dataset.vq = '1'; gear.textContent = '⚙'; gear.title = 'Kho nhiệm vụ: thêm, sửa, xóa nhiệm vụ'; gear.setAttribute('aria-label', 'Mở Kho nhiệm vụ'); }
    side.hidden = false;
    if (!sec.classList.contains('vq-on')) { sec.classList.add('vq-on'); redraw(); }
    fullLabel();

    if (!watching) {
      watching = true;
      /* Các lớp cũ thêm nút (bánh răng âm thanh, bánh răng nhiệm vụ) muộn hơn: thấy là chuyển sang cột phải. */
      var obs = new MutationObserver(function () { arrange(); });
      obs.observe(sec, { childList: true });
      var top = sec.querySelector('.picker-top'); if (top) obs.observe(top, { childList: true });
      obs.observe(bar, { childList: true });
    }
    return true;
  }

  function later() { [0, 60, 300, 1200].forEach(function (ms) { setTimeout(arrange, ms); }); }

  var baseOpen = window.openView;
  if (typeof baseOpen === 'function') window.openView = function (id) { var out = baseOpen.apply(this, arguments); if (id === 'picker') { later(); redraw(); } return out; };

  /* Bản cũ ẩn cột phải khi toàn màn hình; nay cột phải chứa điều khiển nên phải luôn hiện. */
  doc.addEventListener('fullscreenchange', function () {
    [0, 80, 350].forEach(function (ms) { setTimeout(function () { var side = doc.querySelector('#picker .picker-side'); if (side) side.hidden = false; fullLabel(); redraw(); }, ms); });
  });
  window.addEventListener('resize', redraw);

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', later); else later();
  window.addEventListener('load', later);
  /* 1.3 (21/10/2026): nhạc nền vòng quay. Trước đây nhạc nền chỉ bật khi bấm nút "Bật âm thanh trò chơi";
   * từ khi âm thanh được mở khóa tự động ở lần chạm đầu (am-thanh-hieu-ung.js) nút đó không còn hiện nên nhạc nền
   * không bao giờ phát. Nay: thầy cô chạm/bấm trong màn hình Vòng quay là nhạc nền phát (lặp); tạm nghỉ trong lúc
   * phát tiếng thắng cuộc/cổ vũ rồi tự phát lại; dừng khi rời màn hình. Tắt bằng "Âm thanh: Tắt" hoặc kéo âm lượng
   * Nhạc nền về 0 như cũ. */
  var bgWanted = false, lastBusy = 0;
  function onWheel() { var v = doc.getElementById('picker'); return !!(v && v.classList.contains('active')) && !doc.hidden; }
  function effectBusy() {
    var t = window.audioTransient; if (t && Object.keys(t).length) return true;
    var e = window.hmvEffectAudio; return !!(e && typeof e.state === 'function' && e.state('wheel').playing);
  }
  function bgNode() { try { return window.audioNodes && window.audioNodes.background; } catch (e) { return null; } }
  function bgCheck() {
    if (typeof window.audioStart !== 'function') return;
    var n = bgNode(), on = onWheel() && bgWanted && window.audioMasterEnabled;
    if (!on) { if (n && !n.paused && typeof window.audioStop === 'function' && !onWheel()) window.audioStop('background'); return; }
    if (effectBusy()) { lastBusy = Date.now(); return; }
    if (Date.now() - lastBusy < 2500) return; /* chờ hết chuỗi thắng cuộc → cổ vũ rồi mới phát lại */
    if (!n || n.paused) { try { window.audioBgStarted = true; window.audioStart('background'); } catch (e) {} }
  }
  doc.addEventListener('pointerdown', function (e) { if (e.target && e.target.closest && e.target.closest('#picker')) { bgWanted = true; setTimeout(bgCheck, 0); } }, true);
  setInterval(bgCheck, 1000);

  window.hmvVongQuay = { arrange: arrange, version: '1.3', bgCheck: bgCheck };
})();
