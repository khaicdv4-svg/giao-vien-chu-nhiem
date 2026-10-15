/* BAN-CHINH 2.15 · Bộ nhiệm vụ có sẵn cho Vòng quay kết nối (chế độ "Nhiệm vụ bất ngờ").
 * - Máy chưa từng dùng Kho nhiệm vụ (chưa có khóa tk_picker_tasks): nạp sẵn bộ "Tổng hợp" 12 nhiệm vụ để quay được ngay (Ngày hội).
 *   Kho đã có nhiệm vụ, hoặc thầy cô đã xóa hết (kho rỗng) → không tự nạp lại.
 * - Trong hộp "⚙ Cài đặt Nhiệm vụ bất ngờ": thêm khối "📦 Bộ nhiệm vụ có sẵn" (5 bộ × 12 nhiệm vụ). Bấm một bộ = thêm vào Kho
 *   bằng chính ô nhập và nút "Thêm" của hộp (bỏ qua nhiệm vụ trùng, không xóa nhiệm vụ cũ).
 * Tệp nạp trong <head> để nạp sẵn trước khi vòng quay đọc Kho.
 */
(function (win) {
  'use strict';
  var doc = win.document, KEY = 'tk_picker_tasks';
  var SETS = [
    { id: 'tong-hop', icon: '🎲', name: 'Tổng hợp (nạp sẵn)', tasks: ['Đứng lên vỗ tay 5 cái thật to', 'Đếm thêm 9 từ 9 đến 90', 'Tìm 3 từ chỉ màu sắc', 'Nói một điều em biết ơn hôm nay', 'Hát một câu bài hát em thích', 'Làm động tác “cây trong gió” 10 giây', 'Đọc bảng nhân 7', 'Nói một câu khen bạn bên cạnh', 'Kể tên 5 loại trái cây trong 10 giây', 'Diễn tả một từ bằng hành động, cả lớp đoán', 'Nêu một quy tắc an toàn khi qua đường', 'Bắt chước tiếng một con vật, cả lớp đoán'] },
    { id: 'van-dong', icon: '🤸', name: 'Khởi động vui nhộn', tasks: ['Đứng lên vỗ tay 5 cái thật to', 'Làm động tác “cây trong gió” 10 giây', 'Nhảy nhẹ tại chỗ 5 cái', 'Vươn vai thật cao rồi chạm mũi chân', 'Làm mặt cười thật tươi với cả lớp', 'Bắt chước tiếng một con vật, cả lớp đoán', 'Xoay vai 5 vòng về trước, 5 vòng về sau', 'Đi kiểu chim cánh cụt quanh chỗ ngồi', 'Làm động tác mèo vươn vai', 'Đếm từ 1 đến 10 bằng giọng rô-bốt', 'Vỗ tay theo nhịp thầy cô gõ', 'Hít thở sâu 3 lần cùng cả lớp'] },
    { id: 'toan-4', icon: '🔢', name: 'Toán nhanh lớp 4', tasks: ['Đếm thêm 9 từ 9 đến 90', 'Nêu 3 số chẵn có ba chữ số', 'Đọc bảng nhân 7', 'Nêu số liền trước và số liền sau của 10 000', 'Tính nhẩm 25 × 4', 'Kể tên 2 đơn vị đo khối lượng lớn hơn ki-lô-gam', 'Vẽ nhanh một góc vuông lên bảng', 'Nêu cách tìm số trung bình cộng của hai số', 'So sánh 1/2 và 1/3 rồi giải thích', 'Đố bạn bên cạnh một phép chia hết', 'Làm tròn số 4 567 đến hàng trăm', 'Kể tên các loại góc đã học'] },
    { id: 'tieng-viet-4', icon: '📖', name: 'Tiếng Việt vui', tasks: ['Tìm 3 từ chỉ màu sắc', 'Đặt một câu có từ “chăm chỉ”', 'Tìm từ trái nghĩa với “dũng cảm”', 'Nói một câu khen bạn bên cạnh', 'Kể tên 3 danh từ chỉ đồ vật trong lớp', 'Tìm 2 động từ chỉ hoạt động ở trường', 'Đọc diễn cảm một câu thơ em thích', 'Nêu một câu tục ngữ hoặc thành ngữ em biết', 'Đặt một câu hỏi về sở thích của bạn', 'Tìm từ đồng nghĩa với “siêng năng”', 'Kể tên 2 tính từ tả người', 'Nói một câu cảm có dấu chấm than'] },
    { id: 'ket-noi', icon: '🤝', name: 'Kết nối – Kĩ năng', tasks: ['Nói một điều em biết ơn hôm nay', 'Kể một việc tốt em đã làm tuần này', 'Nói lời cảm ơn một bạn đã giúp em', 'Giới thiệu một cuốn sách em thích', 'Chia sẻ ước mơ của em trong một câu', 'Hướng dẫn cả lớp một động tác thể dục', 'Nêu một cách giữ lớp học sạch đẹp', 'Nêu một quy tắc an toàn khi qua đường', 'Khen một điểm tốt của tổ em', 'Kể một việc em làm để giúp bố mẹ', 'Mời một bạn cùng hát một câu', 'Nói một lời động viên cả lớp'] },
    { id: 'nang-khieu', icon: '🎨', name: 'Năng khiếu – Tài năng', tasks: ['Hát một câu bài hát em thích', 'Vẽ nhanh một con vật trong 30 giây', 'Kể một câu chuyện vui thật ngắn', 'Đọc một câu ca dao về tình bạn', 'Biểu diễn một động tác múa đơn giản', 'Đọc một câu theo giọng phát thanh viên', 'Đọc nhanh một câu nói líu lưỡi', 'Tạo dáng “bức tượng” trong 5 giây', 'Kể tên 5 loại trái cây trong 10 giây', 'Đố cả lớp một câu đố vui', 'Gõ nhịp một bài hát, cả lớp đoán tên bài', 'Diễn tả một từ bằng hành động, cả lớp đoán'] }
  ];
  /* 1. Nạp sẵn cho máy chưa từng dùng Kho nhiệm vụ. */
  try {
    if (win.localStorage.getItem(KEY) === null) {
      var now = Date.now();
      win.localStorage.setItem(KEY, JSON.stringify(SETS[0].tasks.map(function (t, i) { return { id: 'task-mau-' + now + '-' + i, text: t, preset: SETS[0].id }; })));
      win.hmvNhiemVuSeeded = true;
    }
  } catch (e) {}

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function key(t) { return String(t || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
  function stored() { try { return JSON.parse(win.localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function missing(set) { var have = {}; stored().forEach(function (x) { if (x && x.text) have[key(x.text)] = 1; }); return set.tasks.filter(function (t) { return !have[key(t)]; }); }
  function paint(box) {
    box.querySelector('.hmv-nv-grid').innerHTML = SETS.map(function (s) {
      var left = missing(s).length;
      return '<div class="hmv-nv-set"><button type="button" class="btn ' + (left ? 'color' : 'soft') + '" data-nv-add="' + s.id + '"' + (left ? '' : ' disabled') + '><span aria-hidden="true">' + s.icon + '</span> ' + esc(s.name) + '<small>' + (left ? '＋ Thêm ' + left + ' nhiệm vụ' : '✓ Đã có trong Kho') + '</small></button>'
        + '<details><summary>Xem ' + s.tasks.length + ' nhiệm vụ</summary><ol>' + s.tasks.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></details></div>';
    }).join('');
  }
  function addSet(modal, id) {
    var s = SETS.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    var input = modal.querySelector('textarea'), btn = modal.querySelector('.phase1-task-row .btn.color'); if (!input || !btn) return;
    var keep = input.value; input.value = s.tasks.join('\n'); input.dispatchEvent(new Event('input', { bubbles: true }));
    btn.click();   /* nút "Thêm" sẵn có: tự bỏ qua trùng, lưu Kho, vẽ lại vòng quay, báo số nhiệm vụ đã thêm */
    if (keep && !input.value) { input.value = keep; input.dispatchEvent(new Event('input', { bubbles: true })); }
    var box = modal.querySelector('.hmv-nv'); if (box) paint(box);
  }
  function decorate() {
    var modal = doc.getElementById('phase11TaskModal'); if (!modal || modal.querySelector('.hmv-nv')) return;
    var row = modal.querySelector('.phase1-task-row'); if (!row) return;
    var box = doc.createElement('section'); box.className = 'hmv-nv';
    box.innerHTML = '<h4>📦 Bộ nhiệm vụ có sẵn</h4><p>Bấm một bộ để thêm vào Kho nhiệm vụ (nhiệm vụ trùng tự bỏ qua, nhiệm vụ cũ giữ nguyên). Thêm xong là quay được ngay.</p><div class="hmv-nv-grid"></div>';
    var preview = modal.querySelector('.phase11-task-preview'); (preview || row).insertAdjacentElement('afterend', box);
    paint(box);
    box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-nv-add]'); if (b) addSet(modal, b.getAttribute('data-nv-add')); });
  }
  function boot() { decorate(); if (win.MutationObserver) new win.MutationObserver(decorate).observe(doc.body, { childList: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.hmvNhiemVu = { sets: SETS, missing: missing };
})(window);
