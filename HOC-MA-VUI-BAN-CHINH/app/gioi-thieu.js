/* BAN-CHINH 2.16 · Giới thiệu dự án và nhóm phát triển.
 *
 * - Cuối trang chủ có một dòng chân trang nhỏ: © năm · trường · người thực hiện, kèm nút "Giới thiệu dự án".
 * - Bấm nút thì mở khung Giới thiệu: tên app, mục đích, nhóm phát triển chia theo vai trò.
 * - Không đặt trong màn hình trò chơi hay Kho câu hỏi để học sinh không bị rối khi chiếu lên bảng.
 * - Muốn sửa tên, vai trò: chỉ cần sửa mảng TEAM bên dưới.
 */
(function () {
  'use strict';
  var doc = document, win = window;
  var SCHOOL = 'Trường TH Trần Văn Ơn';
  var YEAR = '2026';
  var TEAM = [
    { role: 'Chỉ đạo', who: 'Ban Giám hiệu – ' + SCHOOL },
    { role: 'Phối hợp', who: 'Chi đoàn, Công đoàn – ' + SCHOOL },
    { role: 'Thực hiện', who: 'Thầy Võ Việt Khái, thầy Lê Thanh Tùng – ' + SCHOOL }
  ];

  var CSS = ''
    + '.gt-foot{margin:22px 0 6px;padding:12px 4px 4px;border-top:1px solid #ffffff4d;display:flex;align-items:center;justify-content:center;gap:10px 14px;flex-wrap:wrap;text-align:center;color:#ffffffd9;font-size:13px;line-height:1.45;text-shadow:0 1px 2px #1e1b4b55}'
    + '.gt-foot b{color:#fff;font-weight:700}'
    + '.gt-open{border:1px solid #ddd6fe;background:#fff;color:#6d28d9;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}'
    + '.gt-open:hover,.gt-open:focus-visible{background:#f5f3ff;outline:none;box-shadow:0 0 0 3px #ddd6fe}'
    + '.gt-overlay{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;padding:16px;background:#1e1b4b8c}'
    + '.gt-overlay.on{display:flex}'
    + '.gt-box{position:relative;width:min(560px,100%);max-height:92vh;overflow:auto;box-sizing:border-box;background:#fff;color:#242044;border-radius:22px;box-shadow:0 22px 60px #0f172a66}'
    + '.gt-head{padding:22px 24px 18px;border-radius:22px 22px 0 0;background:linear-gradient(110deg,#4f46e5 0%,#7c3aed 48%,#ec4899 100%);color:#fff}'
    + '.gt-head small{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.85}'
    + '.gt-head h2{margin:4px 0 4px;font-size:26px;line-height:1.15}'
    + '.gt-head p{margin:0;font-size:14px;opacity:.92;line-height:1.45}'
    + '.gt-body{padding:18px 24px 22px}'
    + '.gt-body h3{margin:0 0 12px;font-size:15px;letter-spacing:.04em;color:#6d28d9;text-align:center}'
    + '.gt-team{list-style:none;margin:0;padding:0;display:grid;gap:10px}'
    + '.gt-team li{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start;padding:11px 14px;border:1px solid #ece9f7;border-radius:14px;background:#faf9ff}'
    + '.gt-team .r{font-weight:800;color:#4f46e5;font-size:14px}'
    + '.gt-team .w{font-size:15px;line-height:1.45}'
    + '.gt-note{margin:16px 0 0;text-align:center;color:#75718f;font-size:12.5px}'
    + '.gt-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border:0;border-radius:50%;background:#ffffff33;color:#fff;font-size:24px;font-weight:700;line-height:1;font-family:Arial,sans-serif;cursor:pointer}'
    + '.gt-close:hover,.gt-close:focus-visible{background:#ffffff55;outline:none}'
    + '@media(max-width:480px){.gt-team li{grid-template-columns:1fr;gap:2px}.gt-head h2{font-size:22px}}';

  function addStyle() {
    if (doc.getElementById('gtStyle')) return;
    var s = doc.createElement('style'); s.id = 'gtStyle'; s.textContent = CSS; doc.head.appendChild(s);
  }

  function makeDialog() {
    var ov = doc.getElementById('gtOverlay'); if (ov) return ov;
    ov = doc.createElement('div'); ov.id = 'gtOverlay'; ov.className = 'gt-overlay';
    ov.innerHTML = '<div class="gt-box" role="dialog" aria-modal="true" aria-labelledby="gtTitle">'
      + '<div class="gt-head"><button type="button" class="gt-close" aria-label="Đóng">×</button>'
      + '<small>' + SCHOOL + '</small><h2 id="gtTitle">Học mà vui</h2>'
      + '<p>Ứng dụng hỗ trợ dạy học tích cực: gọi tên, chia nhóm, trò chơi học tập và trò chơi bằng camera, giúp mỗi tiết học thêm vui và hiệu quả.</p></div>'
      + '<div class="gt-body"><h3>NHÓM PHÁT TRIỂN DỰ ÁN</h3><ul class="gt-team">'
      + TEAM.map(function (t) { return '<li><span class="r">' + t.role + '</span><span class="w">' + t.who + '</span></li>'; }).join('')
      + '</ul><p class="gt-note">© ' + YEAR + ' ' + SCHOOL + '</p></div></div>';
    doc.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.gt-close')) close(); });
    return ov;
  }

  var lastFocus = null;
  function open() {
    addStyle();
    var ov = makeDialog(); lastFocus = doc.activeElement;
    ov.classList.add('on');
    var c = ov.querySelector('.gt-close'); if (c) c.focus();
  }
  function close() {
    var ov = doc.getElementById('gtOverlay'); if (!ov || !ov.classList.contains('on')) return;
    ov.classList.remove('on');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function buildFooter() {
    var dash = doc.getElementById('dashboard'); if (!dash) return;
    if (doc.getElementById('gtFoot')) { if (dash.lastElementChild && dash.lastElementChild.id !== 'gtFoot') dash.appendChild(doc.getElementById('gtFoot')); return; }
    addStyle();
    var f = doc.createElement('footer'); f.id = 'gtFoot'; f.className = 'gt-foot';
    f.innerHTML = '<span>© ' + YEAR + ' <b>' + SCHOOL + '</b> · Nhóm thực hiện: thầy Võ Việt Khái, thầy Lê Thanh Tùng</span>'
      + '<button type="button" class="gt-open">ℹ️ Giới thiệu dự án</button>';
    f.querySelector('.gt-open').addEventListener('click', open);
    dash.appendChild(f);
  }

  var baseOpen = win.openView;
  if (typeof baseOpen === 'function') win.openView = function (id) { var out = baseOpen.apply(this, arguments); if (id === 'dashboard' || id === 'home') buildFooter(); return out; };
  function boot() { buildFooter(); [300, 1200, 3000].forEach(function (ms) { setTimeout(buildFooter, ms); }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.addEventListener('load', boot);
  win.hmvGioiThieu = { open: open, close: close, team: TEAM };
})();
