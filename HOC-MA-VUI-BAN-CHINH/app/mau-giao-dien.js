/* BAN-CHINH 2.12 · Bộ chỉnh màu giao diện.
 * - Thầy cô chọn một bảng màu có sẵn hoặc tự chọn một màu; ứng dụng tạo cả bộ màu (nền, thanh bên, nút, khung chào) từ màu đó.
 * - Chỉ đổi khung ứng dụng (nền, thanh bên, thẻ menu, khung chào Trang chủ, nút chính, nút phụ). Màn hình từng trò chơi giữ màu riêng
 *   để học sinh dễ nhận ra trò.
 * - Lưu trong trình duyệt của máy này (localStorage "hmv_theme_v1"); chọn "Tím (mặc định)" là trả về đúng giao diện gốc.
 * Tệp được nạp trong <head> để áp màu trước khi trang hiện ra (không nháy màu cũ).
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var LS = 'hmv_theme_v1';
  var PRESETS = [
    { id: 'tim', name: 'Tím (mặc định)', color: '#7c3aed' },
    { id: 'xanh-duong', name: 'Xanh dương', color: '#2563eb' },
    { id: 'xanh-ngoc', name: 'Xanh ngọc', color: '#0d9488' },
    { id: 'xanh-la', name: 'Xanh lá', color: '#16a34a' },
    { id: 'cam', name: 'Cam', color: '#ea580c' },
    { id: 'hong', name: 'Hồng', color: '#db2777' },
    { id: 'do', name: 'Đỏ', color: '#dc2626' },
    { id: 'xam-xanh', name: 'Xám xanh', color: '#475569' }
  ];

  function load() { try { var o = JSON.parse(win.localStorage.getItem(LS) || 'null'); if (o && typeof o === 'object') return o; } catch (e) {} return { id: 'tim' }; }
  function save(o) { try { win.localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }
  function validHex(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }

  function hsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function c(h, s, l) { h = ((Math.round(h) % 360) + 360) % 360; return 'hsl(' + h + ',' + Math.max(0, Math.min(100, Math.round(s))) + '%,' + Math.max(0, Math.min(100, Math.round(l))) + '%)'; }
  /* Độ tương phản (chuẩn WCAG) giữa một màu HSL và màu trắng / màu nền rất nhạt. */
  function rgbOf(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return [f(0), f(8), f(4)]; }
  function lum(h, s, l) { var v = rgbOf(((h % 360) + 360) % 360, s, l).map(function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  /* Hạ độ sáng tới khi chữ trắng trên màu đó (hoặc chữ màu đó trên nền nhạt có độ sáng bg) đạt ít nhất 4,6 : 1. Màu xanh lá, xanh ngọc vốn sáng nên cần tối hơn tím. */
  function fit(h, s, l, bgLum) { var w = bgLum == null ? 1 : bgLum; s = Math.max(0, Math.min(100, s)); while (l > 8 && (w + 0.05) / (lum(h, s, l) + 0.05) < 4.6) l -= 1; return l; }
  function cf(h, s, l, bgLum) { return c(h, s, fit(h, s, l, bgLum)); }
  /* Tạo cả bộ màu từ một màu gốc. Màu xám (độ bão hòa thấp) vẫn cho bộ màu dịu, không bị chuyển sang màu khác. */
  function palette(hex) {
    var p = hsl(hex), h = p.h, s = Math.max(12, Math.min(85, p.s)), sl = Math.max(10, Math.min(95, p.s));
    return {
      body: 'linear-gradient(120deg,' + c(h - 18, s * 0.85, 60) + ' 0%,' + c(h, s * 0.65, 50) + ' 52%,' + c(h + 22, s * 0.6, 55) + ' 100%)',
      side: 'linear-gradient(135deg,' + c(h - 12, sl, 97) + ' 0%,' + c(h + 8, sl, 96) + ' 55%,' + c(h, sl * 0.9, 95) + ' 100%)',
      card: 'linear-gradient(145deg,' + c(h, sl, 98) + ',' + c(h, sl * 0.9, 95) + ')',
      cardHover: 'linear-gradient(145deg,' + c(h, sl * 0.9, 95) + ',' + c(h, sl * 0.85, 90) + ')',
      active: 'linear-gradient(135deg,' + cf(h - 14, s, 46) + ' 0%,' + cf(h, s, 48) + ' 55%,' + cf(h + 10, s, 46) + ' 100%)',
      hero: 'linear-gradient(110deg,' + cf(h - 14, s, 46) + ' 0%,' + cf(h, s, 48) + ' 48%,' + cf(h + 50, s * 0.9, 56) + ' 100%)',
      btn: 'linear-gradient(135deg,' + cf(h - 12, s, 58) + ',' + cf(h, s * 0.7, 46) + ')',
      ink: cf(h, s * 0.75, 38, lum(h, Math.min(100, sl * 0.9), 95)), line: c(h, sl * 0.9, 82), soft: c(h, Math.max(40, sl), 95), softInk: cf(h, s * 0.6, 42, lum(h, Math.max(40, sl), 95)),
      shadow: 'hsla(' + h + ',' + Math.round(s) + '%,30%,.12)', meta: c(h, s, 48), swatch: 'linear-gradient(135deg,' + c(h - 14, s, 50) + ',' + c(h + 22, s * 0.7, 56) + ')'
    };
  }
  function css(p) {
    var R = 'html[data-hmv-theme] body';
    return ':root[data-hmv-theme]{--purple:' + p.meta + '}'
      + R + '{background-image:' + p.body + '!important}'
      + R + ' .sidebar{background-image:' + p.side + '!important}'
      + R + ' .sidebar .nav button,' + R + ' .nav-shell .nav button{background-image:' + p.card + '!important;background-color:transparent!important;color:' + p.ink + '!important;border-color:' + p.line + '!important;box-shadow:0 3px 8px ' + p.shadow + '!important}'
      + R + ' .sidebar .nav button:hover,' + R + ' .nav-shell .nav button:hover,' + R + ' .nav-shell .nav button:focus-visible{background-image:' + p.cardHover + '!important}'
      + R + ' .sidebar .nav button.active,' + R + ' .nav-shell .nav button.active{background-image:' + p.active + '!important;color:#fff!important}'
      + R + ' .hero,' + R + ' #dashboard .hero{background-image:' + p.hero + '!important}'
      + R + ' .btn.color,' + R + ' .main .topbar .actions>#hmvInstallTop{background-image:' + p.btn + '!important}'
      + R + ' .btn.soft{background-color:' + p.soft + '!important;color:' + p.softInk + '!important}';
  }
  function current() { var o = load(); if (o.id === 'rieng' && validHex(o.color)) return { id: 'rieng', color: o.color }; for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === o.id) return { id: o.id, color: PRESETS[i].color }; return { id: 'tim', color: PRESETS[0].color }; }
  var META_DEFAULT = null;
  function apply() {
    var cur = current(), root = doc.documentElement, el = doc.getElementById('hmvThemeStyle'), meta = doc.querySelector('meta[name="theme-color"]');
    if (meta && META_DEFAULT === null) META_DEFAULT = meta.getAttribute('content');
    if (cur.id === 'tim') {   /* mặc định: không chèn gì, giữ nguyên giao diện gốc */
      root.removeAttribute('data-hmv-theme'); if (el) el.parentNode.removeChild(el); if (meta && META_DEFAULT) meta.setAttribute('content', META_DEFAULT); return cur;
    }
    var p = palette(cur.color);
    if (!el) { el = doc.createElement('style'); el.id = 'hmvThemeStyle'; }
    el.textContent = css(p);
    (doc.body || doc.head || root).appendChild(el);   /* luôn đứng cuối để thắng các quy tắc cũ */
    root.setAttribute('data-hmv-theme', cur.id);
    if (meta) meta.setAttribute('content', p.meta);
    return cur;
  }
  function set(id, color) {
    if (id === 'rieng') { if (!validHex(color)) return false; save({ id: 'rieng', color: color.toLowerCase() }); }
    else { if (!PRESETS.some(function (x) { return x.id === id; })) return false; save({ id: id }); }
    apply(); paint(); return true;
  }

  /* ---------- Thẻ trong Cài đặt & dữ liệu ---------- */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function cardHtml() {
    var cur = current(), custom = cur.id === 'rieng' ? cur.color : '#0ea5e9';
    return '<h3>🎨 Màu giao diện</h3><p class="hmv-th-sub">Chọn màu cho nền, thanh menu bên trái, khung chào và các nút. Màn hình trò chơi giữ màu riêng. Màu chỉ lưu trên máy này.</p>'
      + '<div class="hmv-th-grid" role="radiogroup" aria-label="Bảng màu">' + PRESETS.map(function (x) {
        var on = cur.id === x.id;
        return '<button type="button" class="hmv-th-sw' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-hmv-pick="' + x.id + '"><i style="background:' + palette(x.color).swatch + '"></i><span>' + esc(x.name) + '</span>' + (on ? '<b aria-hidden="true">✓</b>' : '') + '</button>';
      }).join('')
      + '<label class="hmv-th-sw hmv-th-custom' + (cur.id === 'rieng' ? ' on' : '') + '" title="Tự chọn một màu"><input type="color" id="hmvThemeCustom" value="' + esc(custom) + '" aria-label="Tự chọn màu"><span>Màu riêng…</span>' + (cur.id === 'rieng' ? '<b aria-hidden="true">✓</b>' : '') + '</label></div>';
  }
  function paint() {
    var view = doc.getElementById('settings'); if (!view) return;
    var card = doc.getElementById('hmvThemeCard');
    if (!card) {
      card = doc.createElement('div'); card.id = 'hmvThemeCard'; card.className = 'card hmv-th-card';
      var after = doc.getElementById('hmvInstallCard') || view.querySelector('.page-title');
      if (after && after.parentNode === view) view.insertBefore(card, after.nextSibling); else view.insertBefore(card, view.firstChild);
    }
    var html = cardHtml(); if (card.__html !== html) { card.innerHTML = html; card.__html = html; }
  }
  doc.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-hmv-pick]') : null; if (!t || t.tagName !== 'BUTTON') return; set(t.getAttribute('data-hmv-pick')); });
  doc.addEventListener('input', function (e) { if (e.target && e.target.id === 'hmvThemeCustom') { save({ id: 'rieng', color: e.target.value.toLowerCase() }); apply(); } });
  doc.addEventListener('change', function (e) { if (e.target && e.target.id === 'hmvThemeCustom') { set('rieng', e.target.value); if (typeof win.showToast === 'function') win.showToast('Đã đổi màu giao diện.'); } });

  apply();   /* áp ngay khi còn ở <head> */
  function boot() {
    apply(); paint();
    var v = doc.getElementById('settings');
    if (v && win.MutationObserver) new win.MutationObserver(function () { if (!doc.getElementById('hmvThemeCard')) paint(); }).observe(v, { childList: true });
    if (win.MutationObserver && doc.body) new win.MutationObserver(function () { var el = doc.getElementById('hmvThemeStyle'); if (el && el.nextElementSibling && el.nextElementSibling.tagName === 'STYLE') doc.body.appendChild(el); }).observe(doc.body, { childList: true });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.addEventListener('storage', function (e) { if (e.key === LS) { apply(); paint(); } });   /* đổi màu ở cửa sổ khác cùng máy */

  win.hmvTheme = { presets: PRESETS.map(function (x) { return { id: x.id, name: x.name, color: x.color }; }), current: current, set: set, palette: palette, refresh: function () { apply(); paint(); } };
})(window);
