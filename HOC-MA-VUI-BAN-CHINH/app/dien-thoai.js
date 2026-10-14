/* BAN-CHINH 2.14 · Giao diện điện thoại (màn hình rộng ≤ 760 px).
 * - Thanh trên mảnh: logo + tên lớp đang chọn; bấm "Lớp" mới mở ô chọn năm học / khối / lớp (trước đây luôn chiếm nửa màn hình).
 * - Menu chuyển xuống đáy: Trang chủ · Trò chơi · Học liệu · Trợ lý AI · Thêm (các mục còn lại mở trong một bảng trượt).
 *   Khối menu 9 nút to ở đầu trang bị ẩn trên điện thoại → ảnh bìa nằm trên cùng Trang chủ.
 * - Bấm một chức năng: chỉ chức năng đó hiện, cuộn về đầu trang.
 * - Đang chơi một trò (Thư viện trò chơi đã mở vào một trò): ẩn thanh trên và menu đáy → trò chơi chiếm toàn màn hình;
 *   nút ✕ nhỏ ở góc để thoát nếu trò không có nút thoát dễ thấy.
 * - Máy tính, máy chiếu (> 760 px) không đổi gì.
 * Menu đáy bấm lại chính các nút của thanh bên cũ (đang ẩn) để mọi chức năng gắn với các nút đó vẫn chạy như cũ.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var MQ = '(max-width: 760px)';
  var TABS = [
    { view: 'dashboard', icon: '🏠', label: 'Trang chủ' },
    { view: 'games', icon: '🎮', label: 'Trò chơi' },
    { view: 'questions', icon: '📚', label: 'Học liệu' },
    { view: 'troLyAI', icon: '✨', label: 'Trợ lý AI' }
  ];
  var S = { on: false, play: false, view: 'dashboard', built: false };
  function $(id) { return doc.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mq() { try { return win.matchMedia(MQ).matches; } catch (e) { return false; } }
  function navButton(v) { return doc.querySelector('.sidebar [data-view="' + v + '"]'); }
  function go(v) {
    closeSheet(); closeClass();
    var b = navButton(v);
    if (b) b.click(); else if (typeof win.openView === 'function') win.openView(v);
    win.setTimeout(function () { try { win.scrollTo(0, 0); } catch (e) {} sync(); }, 0);
  }
  function activeView() { var a = doc.querySelector('.main > .view.active'); return a ? a.id : ''; }

  /* Đang chơi: mục Trò chơi đang mở mà không còn Thư viện trò chơi (đã vào một trò hoặc màn hình cài đặt trò). */
  function playing() {
    var g = $('games'); if (!g || !g.classList.contains('active')) return false;
    var lib = g.querySelector('.game-library');
    return !(lib && lib.offsetParent !== null);
  }
  function exitGame() {
    var g = $('games'); if (!g) return;
    var btn = Array.prototype.find.call(g.querySelectorAll('button'), function (b) { return b.offsetParent !== null && /Về thư viện|Thư viện trò chơi|← Thư viện|Thoát/i.test(b.textContent); });
    if (btn) { btn.click(); }
    else { try { if (win.classroomGame) { win.classroomGame.type = null; win.classroomGame.started = false; } if (typeof win.renderGames === 'function') win.renderGames(); } catch (e) {} }
    win.setTimeout(sync, 60);
  }

  function build() {
    if (S.built) return; S.built = true;
    var bar = doc.createElement('header'); bar.id = 'hmvMBar'; bar.className = 'hmv-mbar';
    bar.innerHTML = '<button type="button" class="hmv-mbar-home" data-hmv-m="dashboard" aria-label="Về Trang chủ"><img src="assets/icons/icon-192.png" alt="" width="34" height="34"><span><b>Học mà vui</b><small id="hmvMClass">Đang tải lớp…</small></span></button><button type="button" class="hmv-mbar-class" id="hmvMClassBtn" aria-expanded="false" aria-controls="hmvMClassPanel">Lớp ▾</button>';
    var tabs = doc.createElement('nav'); tabs.id = 'hmvMTabs'; tabs.className = 'hmv-mtabs'; tabs.setAttribute('aria-label', 'Menu chính');
    tabs.innerHTML = TABS.map(function (t) { return '<button type="button" data-hmv-m="' + t.view + '"><span aria-hidden="true">' + t.icon + '</span><small>' + t.label + '</small></button>'; }).join('') + '<button type="button" data-hmv-more aria-haspopup="dialog" aria-expanded="false"><span aria-hidden="true">☰</span><small>Thêm</small></button>';
    var sheet = doc.createElement('div'); sheet.id = 'hmvMSheet'; sheet.className = 'hmv-msheet'; sheet.hidden = true; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Các chức năng khác');
    var exit = doc.createElement('button'); exit.type = 'button'; exit.id = 'hmvMExit'; exit.className = 'hmv-mexit'; exit.setAttribute('aria-label', 'Thoát trò chơi, về Thư viện trò chơi'); exit.title = 'Thoát trò chơi'; exit.textContent = '✕';
    doc.body.appendChild(bar); doc.body.appendChild(tabs); doc.body.appendChild(sheet); doc.body.appendChild(exit);
    var panel = doc.querySelector('.main > .topbar'); if (panel) panel.id = panel.id || 'hmvMClassPanel';
    doc.addEventListener('click', function (e) {
      if (!S.on) return;
      var t = e.target && e.target.closest ? e.target.closest('[data-hmv-m],[data-hmv-more],#hmvMClassBtn,#hmvMExit,.hmv-msheet-bg') : null;
      if (!t) return;
      if (t.id === 'hmvMExit') return exitGame();
      if (t.id === 'hmvMClassBtn') return toggleClass();
      if (t.classList.contains('hmv-msheet-bg')) return closeSheet();
      if (t.hasAttribute('data-hmv-more')) return toggleSheet();
      go(t.getAttribute('data-hmv-m'));
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheet(); closeClass(); } });
  }
  function sheetHtml() {
    var main = TABS.map(function (t) { return t.view; });
    var items = Array.prototype.filter.call(doc.querySelectorAll('.sidebar [data-view]'), function (b) { return main.indexOf(b.dataset.view) < 0; });
    return '<div class="hmv-msheet-bg"></div><div class="hmv-msheet-card"><div class="hmv-msheet-grab" aria-hidden="true"></div><h3>Chức năng khác</h3><div class="hmv-msheet-grid">' + items.map(function (b) {
      var icon = (b.querySelector('span') || {}).textContent || '•', label = b.textContent.replace(icon, '').trim();
      return '<button type="button" data-hmv-m="' + esc(b.dataset.view) + '"><span aria-hidden="true">' + esc(icon) + '</span>' + esc(label) + '</button>';
    }).join('') + '</div></div>';
  }
  function toggleSheet() { var s = $('hmvMSheet'); if (s.hidden) { closeClass(); s.innerHTML = sheetHtml(); s.hidden = false; } else s.hidden = true; var m = doc.querySelector('[data-hmv-more]'); if (m) m.setAttribute('aria-expanded', String(!s.hidden)); }
  function closeSheet() { var s = $('hmvMSheet'); if (s && !s.hidden) { s.hidden = true; var m = doc.querySelector('[data-hmv-more]'); if (m) m.setAttribute('aria-expanded', 'false'); } }
  function toggleClass() { var open = !doc.documentElement.classList.contains('hmv-m-class'); closeSheet(); doc.documentElement.classList.toggle('hmv-m-class', open); var b = $('hmvMClassBtn'); if (b) { b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Đóng ▴' : 'Lớp ▾'; } }
  function closeClass() { if (doc.documentElement.classList.contains('hmv-m-class')) toggleClass(); }

  function sync() {
    var root = doc.documentElement, on = mq();
    if (on !== S.on) { S.on = on; root.classList.toggle('hmv-m', on); if (on) build(); else { closeSheet(); closeClass(); root.classList.remove('hmv-m-play'); } }
    if (!on) return;
    var v = activeView();
    if (v !== S.view) { S.view = v; try { win.scrollTo(0, 0); } catch (e) {} }
    var p = playing(); if (p !== S.play) { S.play = p; root.classList.toggle('hmv-m-play', p); if (p) { closeSheet(); closeClass(); try { win.scrollTo(0, 0); } catch (e) {} } }
    var mainTab = TABS.some(function (t) { return t.view === v; });
    Array.prototype.forEach.call(doc.querySelectorAll('#hmvMTabs [data-hmv-m]'), function (b) { var a = b.getAttribute('data-hmv-m') === v; b.classList.toggle('active', a); if (a) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var more = doc.querySelector('#hmvMTabs [data-hmv-more]'); if (more) more.classList.toggle('active', !mainTab && !!v);
    var crumb = doc.querySelector('.topbar .crumb'), c = $('hmvMClass'); if (crumb && c && c.textContent !== crumb.textContent.trim()) c.textContent = crumb.textContent.trim();
  }
  var pending = false;
  function soon() { if (pending) return; pending = true; win.requestAnimationFrame(function () { pending = false; sync(); }); }
  function boot() {
    sync();
    try { win.matchMedia(MQ).addEventListener('change', sync); } catch (e) { win.addEventListener('resize', soon); }
    var main = doc.querySelector('.main');
    if (main && win.MutationObserver) new win.MutationObserver(soon).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.hmvMobile = { state: function () { return { on: S.on, play: S.play, view: S.view }; }, go: go, exitGame: exitGame, refresh: sync };
})(window);
