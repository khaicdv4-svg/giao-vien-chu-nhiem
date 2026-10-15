/* BAN-CHINH 2.17 · Gọi tên vui – Tuỳ chọn học sinh.
 *
 * - Vòng quay chỉ còn MỘT bánh răng ⚙ (cạnh nút Nhiệm vụ bất ngờ). Bấm vào hiện menu nhỏ:
 *     🧩 Cài đặt Nhiệm vụ bất ngờ  và  👥 Tuỳ chọn học sinh.
 *   Nút "⚙ Cài đặt" trùng lặp dưới thẻ Kho nhiệm vụ được ẩn đi.
 * - Ngoài menu ra, màn hình vòng quay không có chữ hay dấu hiệu nào về tuỳ chọn (giữ bí mật khi dự giờ).
 * - Hộp tuỳ chọn: danh sách học sinh của lớp đang chọn, mỗi bạn một ô tích; công tắc Bật/Tắt tuỳ chọn.
 * - Khi bật: vòng quay VẪN HIỆN ĐỦ TÊN CẢ LỚP, bộ đếm vẫn tính cả lớp. Chỉ có kết quả là được "ngầm" chọn:
 *   kim luôn dừng ở một bạn đã tích và chưa tham gia. Gọi hết các bạn đã tích thì quay ngẫu nhiên như bình thường.
 * - Luật "không gọi lặp" (ĐÃ THAM GIA, lượt mới) giữ nguyên. Lựa chọn lưu riêng cho từng lớp, trên máy đang dùng.
 */
(function () {
  'use strict';
  var doc = document, win = window;
  var KEY = 'hmv_picker_chon_hs_v1_';

  /* ---------- Dữ liệu ---------- */
  function list() { return (Array.isArray(win.students) ? win.students : (typeof students !== 'undefined' && Array.isArray(students) ? students : [])).filter(function (s) { return s && s.name; }); }
  function sid(s) { var id = typeof win.pickerStudentId === 'function' ? win.pickerStudentId(s) : ''; return id || ('ten:' + s.name); }
  function ctx() { try { return typeof win.pickerContext === 'function' ? win.pickerContext() : 'mac-dinh'; } catch (e) { return 'mac-dinh'; } }
  function load() {
    var r = null; try { r = JSON.parse(localStorage.getItem(KEY + encodeURIComponent(ctx())) || 'null'); } catch (e) {}
    return { on: !!(r && r.on), ids: r && Array.isArray(r.ids) ? r.ids : [] };
  }
  function save(st) { try { localStorage.setItem(KEY + encodeURIComponent(ctx()), JSON.stringify({ version: 1, on: !!st.on, ids: st.ids })); return true; } catch (e) { return false; } }
  function ensureIds() { /* Bản gốc tự gán mã cho học sinh chưa có mã khi lấy danh sách quay. */ try { if (typeof win.pickerPeoplePool === 'function') basePeople(); } catch (e) {} }
  function mode() { var b = doc.querySelector('#phase1ModeBar button.active'); return b ? b.dataset.phaseMode : 'students'; }

  /* Danh sách bạn được tích còn tồn tại trong lớp (bỏ qua bạn đã bị xoá khỏi lớp). */
  function chosenSet() {
    var st = load(); if (!st.on || !st.ids.length) return null;
    var want = new Set(st.ids), have = list().filter(function (s) { return want.has(sid(s)); });
    return have.length ? new Set(have.map(sid)) : null;
  }
  function active() { return mode() === 'students' && !!chosenSet(); }

  /* ---------- Gắn vào vòng quay ----------
   * Không đụng tới danh sách tên trên vòng quay. Ngay khi bấm QUAY (nút lớn, nút giữa vòng, QUAY TIẾP),
   * app "hẹn trước" ô thắng: các lần rút số ngẫu nhiên cho tới lúc vòng bắt đầu quay sẽ rơi vào ô của
   * một bạn đã tích (chọn ngẫu nhiên trong các bạn đã tích, chưa tham gia). Vòng quay bắt đầu là trả lại như cũ,
   * nên hiệu ứng pháo giấy và các trò khác vẫn ngẫu nhiên bình thường.
   * (Nút QUAY NGAY được mã cũ gắn thẳng vào hàm quay gốc, nên phải hẹn trước từ lúc bấm, không bọc hàm được.) */
  var basePeopleFn = win.pickerPeoplePool;
  function basePeople() { return typeof basePeopleFn === 'function' ? basePeopleFn() : []; }
  var realRandom = Math.random, armed = null, armTimer = 0;
  function disarm() { armed = null; clearTimeout(armTimer); }
  Math.random = function () {
    if (armed !== null) { if (win.pickerSpinning) disarm(); else return armed; }
    return realRandom.call(Math);
  };
  function arm() {
    disarm();
    if (win.pickerSpinning || mode() !== 'students') return;
    var set = chosenSet(); if (!set) return;
    var pool = []; try { pool = win.pickerPool() || []; } catch (e) {}
    var idx = []; pool.forEach(function (s, i) { if (s && set.has(sid(s))) idx.push(i); });
    if (!idx.length) return; /* Đã gọi hết các bạn đã tích: quay ngẫu nhiên như thường. */
    var target = idx[Math.floor(realRandom.call(Math) * idx.length)];
    armed = (target + 0.5) / pool.length;
    armTimer = setTimeout(disarm, 400); /* Bấm mà vòng không quay (đang quay, kho trống…) thì tự huỷ hẹn. */
  }
  win.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('#spinButton, #picker .picker-center')) arm();
  }, true);
  function wrapPick() {
    var inner = win.pickStudent; if (typeof inner !== 'function' || inner.chs) return;
    var wrapped = function () { if (armed === null) arm(); return inner.apply(this, arguments); };
    wrapped.chs = true; win.pickStudent = wrapped;
  }
  wrapPick();

  /* ---------- Giao diện ---------- */
  var CSS = ''
    + '#phase1ModePanel #phase1ManageTasks,#phase1ModePanel .phase11-task-summary button{display:none!important}'
    + '.chs-menu{position:fixed;z-index:5900;min-width:240px;padding:6px;background:#fff;border:1px solid #ddd5fb;border-radius:14px;box-shadow:0 14px 36px #1e1b4b33;display:none}'
    + '.chs-menu.on{display:block}'
    + '.chs-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:10px;background:none;color:#2e2a5a;font:inherit;font-size:15px;font-weight:700;text-align:left;cursor:pointer}'
    + '.chs-menu button:hover,.chs-menu button:focus-visible{background:#f4f1ff;outline:none}'
    + '.chs-overlay{position:fixed;inset:0;z-index:6000;display:none;align-items:center;justify-content:center;padding:16px;background:#1e1b4b8c}'
    + '.chs-overlay.on{display:flex}'
    + '.chs-box{display:flex;flex-direction:column;width:min(620px,100%);max-height:92vh;box-sizing:border-box;background:#fff;color:#242044;border-radius:20px;box-shadow:0 22px 60px #0f172a66;overflow:hidden}'
    + '.chs-head{padding:16px 20px;background:linear-gradient(110deg,#4f46e5,#7c3aed 55%,#ec4899);color:#fff;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}'
    + '.chs-head h3{margin:0;font-size:20px}.chs-head p{margin:4px 0 0;font-size:13px;opacity:.9;line-height:1.4}'
    + '.chs-x{flex:0 0 auto;width:36px;height:36px;border:0;border-radius:50%;background:#ffffff33;color:#fff;font:700 24px/1 Arial,sans-serif;cursor:pointer}'
    + '.chs-bar{padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;border-bottom:1px solid #ece9f7}'
    + '.chs-switch{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;cursor:pointer;margin-right:auto}'
    + '.chs-switch input{width:20px;height:20px;accent-color:#16a34a;cursor:pointer}'
    + '.chs-mini{border:1px solid #ddd5fb;background:#f4f1ff;color:#4c3aa8;border-radius:999px;padding:6px 12px;font-weight:700;font-size:13px;cursor:pointer}'
    + '.chs-search{width:100%;box-sizing:border-box;margin:10px 0 0;padding:9px 12px;border:1px solid #ddd5fb;border-radius:10px;font:inherit;font-size:14px}'
    + '.chs-list{flex:1 1 auto;overflow:auto;padding:12px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}'
    + '.chs-list label{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid #ece9f7;border-radius:12px;background:#faf9ff;cursor:pointer;font-size:14.5px;line-height:1.3}'
    + '.chs-list label.on{background:#ecfdf5;border-color:#86efac}'
    + '.chs-list input{width:18px;height:18px;flex:0 0 auto;accent-color:#16a34a;cursor:pointer}'
    + '.chs-list .n{color:#9ca3af;font-size:12px;min-width:20px;text-align:right}'
    + '.chs-list.off label{opacity:.55}'
    + '.chs-empty{grid-column:1/-1;text-align:center;color:#75718f;padding:20px}'
    + '.chs-foot{padding:12px 20px;border-top:1px solid #ece9f7;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
    + '.chs-count{font-weight:700;color:#4c3aa8;font-size:14px}.chs-warn{color:#dc2626;font-size:13px;font-weight:700}'
    + '.chs-save{border:0;background:linear-gradient(110deg,#7c3aed,#ec4899);color:#fff;border-radius:12px;padding:10px 20px;font-weight:800;font-size:15px;cursor:pointer}'
    + '@media(max-width:480px){.chs-list{grid-template-columns:1fr}}';
  function addStyle() { if (doc.getElementById('chsStyle')) return; var s = doc.createElement('style'); s.id = 'chsStyle'; s.textContent = CSS; doc.head.appendChild(s); }

  /* ---------- Bánh răng chung của vòng quay ---------- */
  function menu() {
    var m = doc.getElementById('chsMenu');
    if (!m) {
      addStyle();
      m = doc.createElement('div'); m.id = 'chsMenu'; m.className = 'chs-menu'; m.setAttribute('role', 'menu');
      m.innerHTML = '<button type="button" role="menuitem" data-chs="tasks">🧩 Cài đặt Nhiệm vụ bất ngờ</button>'
        + '<button type="button" role="menuitem" data-chs="students">👥 Tuỳ chọn học sinh</button>';
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-chs]'); if (!b) return;
        hideMenu();
        if (b.dataset.chs === 'tasks') { if (typeof win.openPickerDataManager === 'function') win.openPickerDataManager('tasks'); }
        else open();
      });
    }
    var host = doc.fullscreenElement || doc.body; if (m.parentElement !== host) host.appendChild(m);
    return m;
  }
  function hideMenu() { var m = doc.getElementById('chsMenu'); if (m) m.classList.remove('on'); }
  function showMenu(gear) {
    var m = menu(), r = gear.getBoundingClientRect();
    m.classList.add('on');
    var w = m.offsetWidth, h = m.offsetHeight, vw = win.innerWidth, vh = win.innerHeight;
    var left = Math.max(8, Math.min(r.right - w, vw - w - 8)), top = r.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    var first = m.querySelector('button'); if (first) first.focus();
  }
  function tuneGear() {
    var g = doc.querySelector('#phase1ModeBar [data-open-task-settings]'); if (!g) return false;
    addStyle();
    if (g.dataset.chs !== '1') { g.dataset.chs = '1'; }
    g.title = 'Cài đặt vòng quay'; g.setAttribute('aria-label', 'Cài đặt vòng quay'); g.setAttribute('aria-haspopup', 'menu');
    return true;
  }
  /* Chặn trước trình xử lý cũ (vốn mở thẳng Kho nhiệm vụ) để hiện menu chung. */
  win.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var g = t.closest('#phase1ModeBar [data-open-task-settings]');
    if (g) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); tuneGear(); var m = doc.getElementById('chsMenu'); if (m && m.classList.contains('on')) hideMenu(); else showMenu(g); return; }
    if (!t.closest('#chsMenu')) hideMenu();
  }, true);
  win.addEventListener('resize', hideMenu);
  win.addEventListener('scroll', hideMenu, true);

  var draft = null;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function overlay() {
    var ov = doc.getElementById('chsOverlay');
    if (!ov) {
      ov = doc.createElement('div'); ov.id = 'chsOverlay'; ov.className = 'chs-overlay';
      ov.innerHTML = '<div class="chs-box" role="dialog" aria-modal="true" aria-labelledby="chsTitle">'
        + '<div class="chs-head"><div><h3 id="chsTitle">👥 Tuỳ chọn học sinh</h3><p>Tích chọn các bạn sẽ có tên trên vòng quay. Bạn không được tích sẽ không bị gọi.</p></div><button type="button" class="chs-x" aria-label="Đóng">×</button></div>'
        + '<div class="chs-bar"><label class="chs-switch"><input type="checkbox" id="chsOn"> Bật tuỳ chọn học sinh</label>'
        + '<button type="button" class="chs-mini" data-all="1">Chọn tất cả</button><button type="button" class="chs-mini" data-all="0">Bỏ chọn tất cả</button>'
        + '<input type="search" class="chs-search" id="chsSearch" placeholder="Tìm tên học sinh…"></div>'
        + '<div class="chs-list" id="chsList"></div>'
        + '<div class="chs-foot"><span><span class="chs-count" id="chsCount"></span> <span class="chs-warn" id="chsWarn"></span></span><button type="button" class="chs-save">✓ Lưu và đóng</button></div></div>';
      ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target.closest('.chs-x')) return close();
        if (e.target.closest('.chs-save')) return commit();
        var all = e.target.closest('[data-all]');
        if (all) { var on = all.dataset.all === '1'; visible().forEach(function (s) { if (on) draft.ids.add(sid(s)); else draft.ids.delete(sid(s)); }); if (on) draft.on = true; paint(); }
      });
      ov.addEventListener('change', function (e) {
        if (e.target.id === 'chsOn') { draft.on = e.target.checked; paint(); return; }
        var id = e.target.dataset && e.target.dataset.id; if (!id) return;
        if (e.target.checked) { draft.ids.add(id); draft.on = true; } else draft.ids.delete(id);
        var lab = e.target.closest('label'); if (lab) lab.classList.toggle('on', e.target.checked);
        status();
      });
      ov.addEventListener('input', function (e) { if (e.target.id === 'chsSearch') paint(); });
    }
    var host = doc.fullscreenElement || doc.body; if (ov.parentElement !== host) host.appendChild(ov);
    return ov;
  }
  function visible() {
    var q = (doc.getElementById('chsSearch') || {}).value || ''; q = q.trim().toLowerCase();
    return list().filter(function (s) { return !q || s.name.toLowerCase().indexOf(q) >= 0; });
  }
  function paint() {
    var all = list(), box = doc.getElementById('chsList'); if (!box) return;
    doc.getElementById('chsOn').checked = draft.on;
    box.classList.toggle('off', !draft.on);
    var rows = visible();
    box.innerHTML = rows.length ? rows.map(function (s) {
      var id = sid(s), on = draft.ids.has(id), n = all.indexOf(s) + 1;
      return '<label class="' + (on ? 'on' : '') + '"><input type="checkbox" data-id="' + esc(id) + '"' + (on ? ' checked' : '') + '><span class="n">' + n + '</span><span>' + esc(s.name) + '</span></label>';
    }).join('') : '<div class="chs-empty">' + (all.length ? 'Không tìm thấy tên phù hợp.' : 'Lớp đang chọn chưa có học sinh.') + '</div>';
    status();
  }
  /* Cập nhật công tắc, số đã chọn và lời nhắc mà không vẽ lại danh sách (giữ nguyên vị trí cuộn). */
  function status() {
    var all = list(), box = doc.getElementById('chsList'); if (!box) return;
    doc.getElementById('chsOn').checked = draft.on; box.classList.toggle('off', !draft.on);
    var picked = all.filter(function (s) { return draft.ids.has(sid(s)); }).length;
    doc.getElementById('chsCount').textContent = 'Đã chọn ' + picked + '/' + all.length + ' học sinh';
    doc.getElementById('chsWarn').textContent = draft.on && !picked ? 'Hãy tích ít nhất 1 bạn.' : (!draft.on ? '· Đang tắt: vòng quay gọi cả lớp' : '');
  }
  function open() {
    if (win.pickerSpinning) return;
    ensureIds(); addStyle();
    var st = load(), ov = overlay();
    draft = { on: st.on, ids: new Set(st.ids) };
    var s = doc.getElementById('chsSearch'); if (s) s.value = '';
    paint(); ov.classList.add('on');
  }
  function close() { var ov = doc.getElementById('chsOverlay'); if (ov) ov.classList.remove('on'); draft = null; }
  function commit() {
    if (!draft) return close();
    var all = list(), ids = all.map(sid).filter(function (id) { return draft.ids.has(id); });
    if (draft.on && !ids.length) { paint(); return; }
    if (!save({ on: draft.on, ids: ids })) { if (typeof win.showToast === 'function') win.showToast('Không lưu được lựa chọn. Hãy thử lại.'); return; }
    var on = draft.on; close();
    try { if (typeof win.pickerDismissWinner === 'function') win.pickerDismissWinner(); } catch (e) {}
    try { if (typeof win.drawPickerWheel === 'function') win.drawPickerWheel(); } catch (e) {}
    if (typeof win.showToast === 'function') win.showToast('✓ Đã lưu');
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideMenu(); if (e.key === 'Escape' && doc.getElementById('chsOverlay') && doc.getElementById('chsOverlay').classList.contains('on')) close(); });
  doc.addEventListener('fullscreenchange', function () { hideMenu(); var ov = doc.getElementById('chsOverlay'); if (ov && ov.classList.contains('on')) overlay(); });

  function later() { [0, 100, 400, 1300, 3200].forEach(function (ms) { setTimeout(function () { tuneGear(); wrapPick(); }, ms); }); }
  var baseOpen = win.openView;
  if (typeof baseOpen === 'function') win.openView = function (id) { hideMenu(); var out = baseOpen.apply(this, arguments); if (id === 'picker') later(); return out; };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { addStyle(); later(); }); else { addStyle(); later(); }
  win.addEventListener('load', later);
  win.hmvChonHocSinh = { open: open, chosen: chosenSet, active: active };
})();
