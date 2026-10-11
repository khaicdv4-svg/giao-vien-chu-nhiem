/* BAN-CHINH 1.5 · Trang chủ thiết kế lại.
 *
 * - Bộ biểu tượng tự vẽ (SVG trong tệp này, không dùng ký hiệu cờ vua hay ký tự có sẵn), mỗi chức năng một màu riêng.
 * - Ba việc dùng nhiều nhất trong tiết học đặt thành ô lớn; các mục còn lại là ô nhỏ; cột phải tóm tắt lớp đang chọn
 *   và gợi ý trò chơi dùng camera.
 * - Chỉ thay phần hiển thị dưới ảnh bìa: các phần tử cũ (#statStudents…) được giữ lại và ẩn đi để mã cũ vẫn cập nhật bình thường.
 */
(function () {
  'use strict';
  var doc = document, win = window;
  function svg(inner) { return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
  var ICON = {
    wheel: svg('<circle cx="32" cy="36" r="25" fill="#fff"/><path d="M32 36L32 14A22 22 0 0 1 51.05 25Z" fill="#fb923c"/><path d="M32 36L51.05 25A22 22 0 0 1 51.05 47Z" fill="#facc15"/><path d="M32 36L51.05 47A22 22 0 0 1 32 58Z" fill="#4ade80"/><path d="M32 36L32 58A22 22 0 0 1 12.95 47Z" fill="#38bdf8"/><path d="M32 36L12.95 47A22 22 0 0 1 12.95 25Z" fill="#a78bfa"/><path d="M32 36L12.95 25A22 22 0 0 1 32 14Z" fill="#f472b6"/><circle cx="32" cy="36" r="6" fill="#fff"/><circle cx="32" cy="36" r="2.6" fill="#1e1b4b"/><path d="M32 17l-6.5-11h13z" fill="#1e1b4b"/>'),
    games: svg('<path d="M24 15c0-5 16-5 16 0v7H24z" fill="#c4b5fd"/><rect x="5" y="20" width="54" height="32" rx="16" fill="#7c3aed"/><rect x="14" y="33.5" width="16" height="5" rx="2.5" fill="#fff"/><rect x="19.5" y="28" width="5" height="16" rx="2.5" fill="#fff"/><circle cx="42" cy="31" r="4.2" fill="#fde047"/><circle cx="50" cy="39" r="4.2" fill="#f9a8d4"/>'),
    groups: svg('<circle cx="17" cy="24" r="8.5" fill="#2dd4bf"/><path d="M3 50c0-9 6-14 14-14s14 5 14 14z" fill="#2dd4bf"/><circle cx="47" cy="24" r="8.5" fill="#fbbf24"/><path d="M33 50c0-9 6-14 14-14s14 5 14 14z" fill="#fbbf24"/><circle cx="32" cy="31" r="11.5" fill="#fff"/><circle cx="32" cy="31" r="9" fill="#6366f1"/><path d="M14 59c0-11 8-17 18-17s18 6 18 17z" fill="#6366f1" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>'),
    bank: svg('<rect x="17" y="8" width="38" height="46" rx="8" fill="#93c5fd" transform="rotate(9 36 31)"/><rect x="9" y="10" width="38" height="46" rx="8" fill="#2563eb"/><path d="M21 27c0-10 14-10 14 0 0 5.5-7 5.5-7 11.5" fill="none" stroke="#fff" stroke-width="5.2" stroke-linecap="round"/><circle cx="28" cy="46.5" r="3.1" fill="#fff"/>'),
    trophy: svg('<path d="M19 13h-9c0 10 4.5 15 11 15.5M45 13h9c0 10-4.5 15-11 15.5" fill="none" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/><path d="M19 8h26v17c0 9-5.5 14-13 14s-13-5-13-14z" fill="#f59e0b"/><rect x="27.5" y="38" width="9" height="9" fill="#d97706"/><rect x="18" y="46.5" width="28" height="9" rx="3.5" fill="#92400e"/><path d="M32 13.5l2.5 5.1 5.6.8-4.05 3.95.95 5.6L32 26.3l-5 2.65.95-5.6-4.05-3.95 5.6-.8z" fill="#fff"/>'),
    ai: svg('<path d="M13 9h38a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H33L21 56V45h-8a8 8 0 0 1-8-8V17a8 8 0 0 1 8-8z" fill="#ec4899"/><path d="M27 15.5l3.1 7.9 7.9 3.1-7.9 3.1-3.1 7.9-3.1-7.9-7.9-3.1 7.9-3.1z" fill="#fff"/><path d="M44.5 16l1.5 3.8 3.8 1.5-3.8 1.5-1.5 3.8-1.5-3.8-3.8-1.5 3.8-1.5z" fill="#fde68a"/><path d="M45 31l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#fff"/>'),
    music: svg('<path d="M25 13.5L52 8v31.5a9 9 0 1 1-6.5-8.65V19.3L31.5 22.2V46a9 9 0 1 1-6.5-8.65z" fill="#16a34a"/><circle cx="16" cy="13" r="3.2" fill="#86efac"/><circle cx="57" cy="52" r="2.4" fill="#86efac"/>'),
    students: svg('<circle cx="22" cy="23" r="10" fill="#8b5cf6"/><path d="M5 53c0-11 7.5-17 17-17s17 6 17 17z" fill="#8b5cf6"/><circle cx="45" cy="27" r="8" fill="#c4b5fd"/><path d="M38 38.5c2.200-1.200 4.500-1.800 7-1.800 8 0 14 5 14 14.300v2H43.500c0-5.800-1.900-10.800-5.500-14.500z" fill="#c4b5fd"/>'),
    offline: svg('<path d="M19 47a12 12 0 0 1-1.500-23.900A16 16 0 0 1 48.300 21 13 13 0 0 1 47 47z" fill="#38bdf8"/><path d="M24 34.500l6 6 11-12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    poll: svg('<rect x="17" y="8" width="8" height="30" rx="4" fill="#f59e0b"/><rect x="28" y="5" width="8" height="33" rx="4" fill="#fbbf24"/><rect x="39" y="24" width="8" height="14" rx="4" fill="#fcd9a0"/><rect x="6" y="26" width="8" height="12" rx="4" fill="#fcd9a0"/><path d="M6 34h41v10a15 15 0 0 1-15 15h-11A15 15 0 0 1 6 44z" fill="#f59e0b"/><circle cx="50" cy="13" r="9" fill="#3b82f6"/><path d="M46.500 13.400l2.600 2.600 4.600-5" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/>'),
    balloon: svg('<path d="M32 49l-2 9" fill="none" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round"/><path d="M32 6c11 0 18 8 18 19 0 12-10 21-18 24-8-3-18-12-18-24C14 14 21 6 32 6z" fill="#ef4444"/><path d="M28.500 47h7l-1.200 5h-4.600z" fill="#b91c1c"/><ellipse cx="25" cy="18" rx="4.200" ry="6.500" fill="#fff" opacity=".55" transform="rotate(-24 25 18)"/>'),
    tilt: svg('<circle cx="32" cy="32" r="23" fill="#fbbf24" transform="rotate(-14 32 32)"/><g transform="rotate(-14 32 32)"><circle cx="24" cy="27" r="3.400" fill="#1e1b4b"/><circle cx="40" cy="27" r="3.400" fill="#1e1b4b"/><path d="M22 37c3 6 17 6 20 0" fill="none" stroke="#1e1b4b" stroke-width="3.600" stroke-linecap="round"/></g><path d="M52 9l7 3-5 6" fill="none" stroke="#7c3aed" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"/>')
  };

  var BIG = [
    { key: 'wheel', title: 'Vòng quay kết nối', text: 'Gọi tên ngẫu nhiên, giao nhiệm vụ bất ngờ', go: function () { win.openView('picker'); } },
    { key: 'games', title: 'Trò chơi học tập', text: 'Kéo co, bấm chuông, bóng bay và nhiều trò khác', go: function () { win.openView('games'); } },
    { key: 'groups', title: 'Chia nhóm', text: 'Chia cả lớp thành nhóm trong vài giây', go: function () { win.openView('groups'); } }
  ];
  var SMALL = [
    { key: 'bank', title: 'Kho câu hỏi', text: 'Thêm, phân loại, luyện tập', go: function () { win.openView('questions'); } },
    { key: 'trophy', title: 'Thi đua', text: 'Điểm thi đua và tổng kết', go: function () { win.openView('scores'); } },
    { key: 'ai', title: 'Trợ lý AI', text: 'Câu hỏi, ma trận, nhận xét', go: function () { if (win.hmvTroLyAI) win.hmvTroLyAI.open(); else win.openView('ai'); } },
    { key: 'music', title: 'Nốt nhạc vui', text: 'Khởi động bằng âm nhạc', go: openMusic }
  ];
  var TRY = [
    { key: 'poll', title: 'Bình chọn ngón tay', text: 'Giơ 1–4 ngón để chọn A–D', type: 'poll' },
    { key: 'balloon', title: 'Bóng bay tri thức', text: 'Giơ tay chạm vào bóng', type: 'balloon' },
    { key: 'tilt', title: 'Quiz Nghiêng Đầu', text: 'Nghiêng đầu để chọn', type: 'head-tilt' }
  ];
  function openMusic() { var b = Array.prototype.find.call(doc.querySelectorAll('.sidebar .nav button, .sidebar nav button'), function (x) { return /Nốt nhạc vui/.test(x.textContent); }); if (b) b.click(); else if (typeof win.openView === 'function') win.openView('games'); }
  function openGame(type) { if (typeof win.openView === 'function') win.openView('games'); if (typeof win.gameSetup === 'function') win.gameSetup(type); }

  function tile(t, cls, i) { return '<button type="button" class="th-tile ' + cls + ' th-' + t.key + '" data-th="' + cls + ':' + i + '"><span class="th-art">' + ICON[t.key] + '</span><span class="th-copy"><b>' + t.title + '</b><small>' + t.text + '</small></span></button>'; }
  function html() {
    return '<div class="th-main"><h2 class="th-heading">Bắt đầu tiết học</h2><div class="th-big">' + BIG.map(function (t, i) { return tile(t, 'big', i); }).join('') + '</div><div class="th-small">' + SMALL.map(function (t, i) { return tile(t, 'small', i); }).join('') + '</div></div>'
      + '<aside class="th-side"><section class="th-class"><h3 id="thClassName">Lớp đang chọn</h3><ul><li><span class="th-mini">' + ICON.students + '</span><span><b id="thStudents">0</b> học sinh</span></li><li><span class="th-mini">' + ICON.bank + '</span><span><b id="thSets">0</b> bộ câu hỏi, <b id="thQuestions">0</b> câu</span></li><li><span class="th-mini">' + ICON.offline + '</span><span>Chạy được khi không có mạng</span></li></ul></section>'
      + '<section class="th-try"><h3>Chơi bằng camera</h3>' + TRY.map(function (t, i) { return '<button type="button" class="th-row" data-th="try:' + i + '"><span class="th-mini lg">' + ICON[t.key] + '</span><span class="th-copy"><b>' + t.title + (t.tag ? ' <em>' + t.tag + '</em>' : '') + '</b><small>' + t.text + '</small></span><span class="th-play">Chơi</span></button>'; }).join('') + '</section></aside>';
  }

  function refresh() {
    var home = doc.getElementById('thHome'); if (!home) return;
    var st = doc.getElementById('statStudents'), n = st ? String(st.textContent || '').trim() : '';
    if (!/^\d+$/.test(n) && Array.isArray(win.students)) n = String(win.students.length);
    var e = doc.getElementById('thStudents'); if (e && n && e.textContent !== n) e.textContent = n;
    var sets = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], q = sets.reduce(function (a, s) { return a + ((s.questions || []).length); }, 0);
    var a = doc.getElementById('thSets'), b = doc.getElementById('thQuestions'); if (a && a.textContent !== String(sets.length)) a.textContent = String(sets.length); if (b && b.textContent !== String(q)) b.textContent = String(q);
    var crumb = doc.querySelector('.main > .topbar .crumb'), name = crumb ? String(crumb.textContent || '').split('·')[0].trim() : '';
    var c = doc.getElementById('thClassName'); if (c && name && !/Đang tải/.test(name) && c.textContent !== name) c.textContent = name;
  }
  function build() {
    var dash = doc.getElementById('dashboard'); if (!dash || doc.getElementById('thHome')) return !!dash;
    var home = doc.createElement('div'); home.id = 'thHome'; home.className = 'th-home'; home.innerHTML = html();
    var hero = dash.querySelector('.hero'); if (hero && hero.nextSibling) dash.insertBefore(home, hero.nextSibling); else dash.appendChild(home);
    dash.classList.add('th-on');
    home.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-th]'); if (!b) return;
      var p = b.dataset.th.split(':'), i = Number(p[1]);
      if (p[0] === 'big') BIG[i].go(); else if (p[0] === 'small') SMALL[i].go(); else if (p[0] === 'try') openGame(TRY[i].type);
    });
    var st = doc.getElementById('statStudents'); if (st) new MutationObserver(refresh).observe(st, { childList: true, characterData: true, subtree: true });
    var crumb = doc.querySelector('.main > .topbar .crumb'); if (crumb) new MutationObserver(refresh).observe(crumb, { childList: true, characterData: true, subtree: true });
    refresh();
    return true;
  }
  var baseOpen = win.openView;
  if (typeof baseOpen === 'function') win.openView = function (id) { var out = baseOpen.apply(this, arguments); if (id === 'dashboard' || id === 'home') { build(); refresh(); } return out; };
  function boot() { build(); [300, 1200, 3000].forEach(function (ms) { setTimeout(refresh, ms); }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.addEventListener('load', boot);
  win.hmvHome = { refresh: refresh, icons: ICON };
})();
