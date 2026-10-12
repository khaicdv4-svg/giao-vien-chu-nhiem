/* BAN-CHINH 1.0 · Kho câu hỏi: một lối thêm câu hỏi, phân loại theo dạng, Chơi ngay và Luyện tập.
 * Thay cho question-bank-stage7b.js. Đọc dữ liệu cũ nguyên trạng, không tự chuyển đổi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var ORDER = ['ABCD', 'TRUEFALSE', 'MULTI', 'FILL', 'SHORT', 'MATCHING', 'OPEN', 'SINGLE'];
  var TYPES = {
    ABCD: { label: 'A–B–C–D', icon: '🔠', hint: 'Bốn lựa chọn, một đáp án đúng' },
    TRUEFALSE: { label: 'Đúng/Sai', icon: '✅', hint: 'Hai lựa chọn Đúng hoặc Sai' },
    MULTI: { label: 'Nhiều đáp án', icon: '☑️', hint: 'Từ hai đáp án đúng trở lên' },
    FILL: { label: 'Điền khuyết', icon: '✏️', hint: 'Điền số hoặc từ vào chỗ trống' },
    SHORT: { label: 'Trả lời ngắn', icon: '💬', hint: 'Trả lời bằng một số hoặc vài từ' },
    MATCHING: { label: 'Ghép đôi', icon: '🔗', hint: 'Ghép mỗi ý bên trái với một ý bên phải' },
    OPEN: { label: 'Câu hỏi mở', icon: '🗣️', hint: 'Trả lời miệng, giáo viên nhận xét' },
    SINGLE: { label: 'Một đáp án', icon: '🔘', hint: 'Hai, ba hoặc hơn bốn lựa chọn, một đáp án đúng' }
  };
  var GAMES = [['tug', 'Kéo co kiến thức'], ['gift', 'Hộp quà bí mật'], ['buzzer', 'Ai nhanh hơn'], ['millionaire', 'Chinh phục tri thức'], ['balloon', 'Bóng bay tri thức'], ['poll', 'Bình chọn ngón tay'], ['raise-hand', 'Giơ tay giành quyền'], ['magic-hand', 'Bàn tay phép thuật (câu Đúng/Sai)'], ['race', 'Đường đua kiến thức'], ['head-tilt', 'Quiz Nghiêng Đầu']];
  var META = [['grade', 'Khối/lớp', 'Chưa xác định lớp'], ['subject', 'Môn', 'Chưa xác định môn'], ['topic', 'Chủ đề', 'Chưa xác định chủ đề'], ['lesson', 'Bài học', 'Chưa xác định bài học'], ['difficulty', 'Mức độ', 'Chưa xác định mức độ']];

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function known(v) { return !!String(v == null ? '' : v).trim() && !/^chưa (?:phân loại|xác định|rõ)/i.test(String(v).trim()); }
  function answersOf(q) { return Array.isArray(q.answers) ? q.answers : []; }
  function keysOf(q) { return Array.isArray(q.correctAnswers) && q.correctAnswers.length ? q.correctAnswers : Number.isInteger(q.correct) ? [q.correct] : []; }
  function textOf(q) { return String(q.text || q.question || ''); }

  /* Dạng hiển thị. Câu một đáp án có đúng bốn lựa chọn được gọi là A–B–C–D; câu giáo viên chấm là câu hỏi mở. */
  function kindOf(q) {
    var k = q.kind || q.type || 'ABCD', n = answersOf(q).length;
    if (k === 'ORAL') return 'OPEN';
    if (k === 'SINGLE' && n === 4) return 'ABCD';
    if (k === 'ABCD' && n === 2) return 'TRUEFALSE';
    return TYPES[k] ? k : 'OPEN';
  }
  function validity(q) {
    var errors = [], kind = kindOf(q), answers = answersOf(q), keys = keysOf(q), blank = answers.some(function (a) { return !String(a == null ? '' : a).trim(); });
    if (!textOf(q).trim()) errors.push('Thiếu nội dung');
    if (kind === 'ABCD' && (answers.length !== 4 || blank)) errors.push('Cần đủ bốn phương án A–D');
    if (kind === 'SINGLE' && (answers.length < 2 || answers.length > 10 || blank)) errors.push('Cần 2–10 phương án');
    if (kind === 'TRUEFALSE' && (answers.length !== 2 || blank)) errors.push('Cần hai phương án Đúng/Sai');
    if (kind === 'MULTI' && (answers.length < 2 || blank)) errors.push('Cần ít nhất hai phương án');
    if (['ABCD', 'SINGLE', 'TRUEFALSE'].indexOf(kind) >= 0 && keys.length !== 1) errors.push('Cần đúng một khóa đáp án');
    if (kind === 'MULTI' && keys.length < 2) errors.push('Cần ít nhất hai đáp án đúng');
    if (['ABCD', 'SINGLE', 'TRUEFALSE', 'MULTI'].indexOf(kind) >= 0 && keys.some(function (i) { return !Number.isInteger(i) || i < 0 || i >= answers.length; })) errors.push('Khóa đáp án nằm ngoài các phương án');
    if (kind === 'MATCHING' && (q.pairs || []).length < 2) errors.push('Cần ít nhất hai cặp ghép');
    if ((kind === 'FILL' || kind === 'SHORT') && !String(q.answerText || '').trim()) errors.push('Thiếu đáp án tham chiếu');
    return errors;
  }
  function forGame(q) { var copy = Object.assign({}, q), k = kindOf(q); copy.kind = k === 'OPEN' ? 'ORAL' : k; return copy; }
  function compatibility(q, type, check) { var issue = validity(q); if (issue.length) return issue; if (typeof check !== 'function') return ['Chưa có bộ kiểm tra luật trò chơi']; return check(forGame(q), type); }
  function keyText(q) {
    var kind = kindOf(q), answers = answersOf(q), keys = keysOf(q);
    if (kind === 'MATCHING') return (q.pairs || []).map(function (p) { return p.left + ' ↔ ' + p.right; }).join(' · ');
    if (kind === 'FILL' || kind === 'SHORT') return String(q.answerText || '');
    if (kind === 'OPEN') return q.answerText ? 'Gợi ý: ' + q.answerText : 'Giáo viên nhận xét';
    if (kind === 'TRUEFALSE') return keys.map(function (i) { return answers[i]; }).join(', ');
    return keys.map(function (i) { return String.fromCharCode(65 + i) + '. ' + answers[i]; }).join(' · ');
  }

  /* So khớp câu trả lời gõ tay: bỏ khoảng trắng, không phân biệt hoa thường, coi dấu phẩy và dấu chấm thập phân như nhau; đáp án là số thì chấp nhận kèm đơn vị. */
  function normAnswer(v) { return String(v == null ? '' : v).normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g, '').replace(/,/g, '.').replace(/[.。]+$/, ''); }
  function answerMatches(input, expected) {
    var given = normAnswer(input); if (!given) return false;
    return String(expected == null ? '' : expected).split('|').some(function (alt) {
      var want = normAnswer(alt); if (!want) return false;
      if (given === want) return true;
      /* "100.000" viết kiểu dấu chấm ngăn hàng nghìn vẫn được tính là 100 000. */
      if (/^-?\d+$/.test(want)) { var dotted = String(input).replace(/\s+/g, ''); if (/^\d{1,3}(\.\d{3})+$/.test(dotted) && Number(dotted.replace(/\./g, '')) === Number(want)) return true; }
      if (/^-?\d+(\.\d+)?$/.test(want)) { var m = given.match(/^-?\d+(\.\d+)?/); return !!m && Number(m[0]) === Number(want) && !/^\d/.test(given.slice(m[0].length)); }
      return false;
    });
  }
  function shuffle(list, seed) { var a = list.slice(), s = seed || 1; for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function install(win) {
    var doc = win.document;
    var filters = { search: '', grade: 'ALL', subject: 'ALL', topic: 'ALL', level: 'ALL', kind: 'ALL' };
    var roots = ['questions', 'games'].map(function (id) { return doc.getElementById(id); }).filter(Boolean);

    function sets() { return Array.isArray(win.questionBankSets) ? win.questionBankSets : []; }
    function byId(id) { return sets().find(function (s) { return String(s.id) === String(id); }); }
    function isDemo(s) { return !!(s && /^mau-\d/.test(String(s.id))); }
    function meta(set, key, fallback) { var direct = set && set[key]; if (known(direct)) return direct; var values = Array.from(new Set((set && set.questions || []).map(function (q) { return q[key]; }).filter(known))); return values.length === 1 ? values[0] : values.length > 1 ? 'Nhiều giá trị' : fallback; }
    function summarize(s) { var list = s.questions || [], counts = {}, valid = 0; list.forEach(function (q) { var k = kindOf(q); counts[k] = (counts[k] || 0) + 1; if (!validity(q).length) valid++; }); return { total: list.length, valid: valid, review: list.length - valid, types: counts }; }
    function gameCounts(s) { return GAMES.map(function (g) { var accepted = [], rejected = []; (s.questions || []).forEach(function (q) { var e = compatibility(q, g[0], win.hmvC6QuestionErrors); if (e.length) rejected.push(e.join(', ')); else accepted.push(q); }); return { id: g[0], label: g[1], accepted: accepted, rejected: rejected }; }); }
    function toast(text) { if (typeof win.showToast === 'function') win.showToast(text); }

    /* ---------- Trang Kho ---------- */
    function typeBadges(types) { return ORDER.filter(function (k) { return types[k]; }).map(function (k) { return '<span class="kho-type t-' + k + '">' + TYPES[k].icon + ' ' + esc(TYPES[k].label) + ' · ' + types[k] + '</span>'; }).join(''); }
    function cardHtml(s) {
      var v = summarize(s), playable = gameCounts(s).some(function (g) { return g.accepted.length; }), id = esc(s.id);
      return '<article class="kho-card' + (isDemo(s) ? ' is-demo' : '') + '"><div class="kho-card-main"><h3>' + esc(s.name || s.setTitle || 'Bộ câu hỏi') + (isDemo(s) ? ' <span class="kho-demo">Bộ mẫu</span>' : '') + '</h3>'
        + '<p class="kho-meta">' + esc(meta(s, 'grade', 'Chưa xác định lớp')) + ' · ' + esc(meta(s, 'subject', 'Chưa xác định môn')) + ' · ' + esc(meta(s, 'topic', 'Chưa xác định chủ đề')) + '</p>'
        + '<div class="kho-types"><span class="kho-count">' + v.total + ' câu</span>' + typeBadges(v.types) + (v.review ? '<span class="kho-warn">⚠ ' + v.review + ' câu cần sửa</span>' : '') + '</div></div>'
        + '<div class="kho-actions">' + (playable ? '<button class="btn color" data-kho-play="' + id + '">▶ Chơi ngay</button>' : '')
        + '<button class="btn ' + (playable ? 'soft' : 'color') + '" data-kho-practice="' + id + '"' + (v.valid ? '' : ' disabled') + '>✎ Luyện tập</button><button class="btn soft" data-kho-view="' + id + '">Xem</button>'
        + '<details class="kho-more"><summary aria-label="Thao tác khác">⋯</summary><div><button data-kho-edit="' + id + '">Sửa</button><button data-kho-copy="' + id + '">Sao chép</button><button data-kho-export="' + id + '">Xuất dữ liệu</button><button data-kho-delete="' + id + '">Xóa…</button></div></details></div>'
        + (playable ? '' : '<p class="kho-reason">' + (v.valid ? 'Các trò chơi hiện chỉ nhận câu A–B–C–D, Đúng/Sai và câu hỏi mở. Bộ này dùng được ở Luyện tập.' : 'Bộ này chưa có câu hợp lệ. Bấm Xem để biết lỗi từng câu.') + '</p>') + '</article>';
    }
    function options(values, selected, label) { return '<option value="ALL">' + esc(label) + '</option>' + values.filter(known).sort().map(function (v) { return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join(''); }
    function bankHtml() {
      var all = sets(), totals = {}, count = 0;
      all.forEach(function (s) { (s.questions || []).forEach(function (q) { var k = kindOf(q); totals[k] = (totals[k] || 0) + 1; count++; }); });
      var uniq = function (key, fallback) { return Array.from(new Set(all.map(function (s) { return meta(s, key, fallback); }))); };
      var needle = filters.search.toLocaleLowerCase('vi');
      var visible = all.filter(function (s) {
        var qs = s.questions || [];
        if (needle && [s.name, s.setTitle, s.subject, s.topic].concat(qs.map(textOf)).join(' ').toLocaleLowerCase('vi').indexOf(needle) < 0) return false;
        if (filters.grade !== 'ALL' && meta(s, 'grade', 'Chưa xác định lớp') !== filters.grade) return false;
        if (filters.subject !== 'ALL' && meta(s, 'subject', 'Chưa xác định môn') !== filters.subject) return false;
        if (filters.topic !== 'ALL' && meta(s, 'topic', 'Chưa xác định chủ đề') !== filters.topic) return false;
        if (filters.level !== 'ALL' && meta(s, 'difficulty', 'Chưa xác định mức độ') !== filters.level) return false;
        if (filters.kind !== 'ALL' && !qs.some(function (q) { return kindOf(q) === filters.kind; })) return false;
        return true;
      });
      var mine = visible.filter(function (s) { return !isDemo(s); }).sort(function (a, b) { return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')); });
      var demo = visible.filter(isDemo);
      var chips = '<button class="kho-chip' + (filters.kind === 'ALL' ? ' active' : '') + '" data-kho-kind="ALL">Tất cả <b>' + count + '</b></button>'
        + ORDER.filter(function (k) { return k !== 'SINGLE' || totals.SINGLE; }).map(function (k) { return '<button class="kho-chip t-' + k + (filters.kind === k ? ' active' : '') + '" data-kho-kind="' + k + '" title="' + esc(TYPES[k].hint) + '">' + TYPES[k].icon + ' ' + esc(TYPES[k].label) + ' <b>' + (totals[k] || 0) + '</b></button>'; }).join('');
      var demoMissing = win.HMV_DEMO && win.HMV_DEMO.sets.some(function (s) { return !byId(s.id); });
      var section = function (title, list, emptyText) { return '<h3 class="kho-section">' + esc(title) + ' <span>' + list.length + ' bộ</span></h3>' + (list.length ? '<section class="kho-list">' + list.map(cardHtml).join('') + '</section>' : '<div class="kho-empty">' + emptyText + '</div>'); };
      var filtered = filters.search || filters.kind !== 'ALL' || filters.grade !== 'ALL' || filters.subject !== 'ALL' || filters.topic !== 'ALL' || filters.level !== 'ALL';
      return '<div class="kho-bank"><header class="kho-title"><div><h2>📚 KHO CÂU HỎI</h2><p>' + all.length + ' bộ · ' + count + ' câu. Thêm câu hỏi, ứng dụng tự phân loại theo dạng; chọn một bộ để chơi hoặc luyện tập.</p></div>'
        + '<div class="kho-title-actions">' + (demoMissing ? '<button class="btn soft" data-kho-demo>Nạp bộ câu hỏi mẫu</button>' : '') + '<button class="btn soft kho-add" data-kho-file title="Nhập câu hỏi từ tệp Word, Excel, CSV, TXT, JSON">📄 Nhập từ tệp</button><button id="qbStage7Import" class="btn color kho-add" data-kho-add>＋ Thêm câu hỏi</button></div></header>'
        + '<nav class="kho-chips" aria-label="Lọc theo dạng câu hỏi">' + chips + '</nav>'
        + '<div class="kho-filters"><input class="input" data-kho-filter="search" placeholder="Tìm tên bộ hoặc nội dung câu hỏi" value="' + esc(filters.search) + '">'
        + '<select data-kho-filter="grade" aria-label="Khối/lớp">' + options(uniq('grade', 'Chưa xác định lớp'), filters.grade, 'Tất cả lớp') + '</select>'
        + '<select data-kho-filter="subject" aria-label="Môn">' + options(uniq('subject', 'Chưa xác định môn'), filters.subject, 'Tất cả môn') + '</select>'
        + '<select data-kho-filter="topic" aria-label="Chủ đề">' + options(uniq('topic', 'Chưa xác định chủ đề'), filters.topic, 'Tất cả chủ đề') + '</select>'
        + '<select data-kho-filter="level" aria-label="Mức độ">' + options(uniq('difficulty', 'Chưa xác định mức độ'), filters.level, 'Tất cả mức độ') + '</select>'
        + (filtered ? '<button class="btn soft" data-kho-clear>Bỏ lọc</button>' : '') + '</div>'
        + section('Bộ câu hỏi của tôi', mine, filtered ? 'Không có bộ nào khớp bộ lọc.' : 'Chưa có bộ nào. Bấm <b>＋ Thêm câu hỏi</b> để dán, tải tệp Word/Excel hoặc nhập từng câu.')
        + (demo.length || !filtered ? section('Bộ câu hỏi mẫu', demo, demoMissing ? 'Bấm <b>Nạp bộ câu hỏi mẫu</b> để thêm lại các bộ mẫu.' : 'Không có bộ mẫu khớp bộ lọc.') : '') + '</div>';
    }
    function refresh() { var q = doc.getElementById('questions'); if (q && q.classList.contains('active')) win.renderQuestions(); else if (win.questionBankOpen && typeof win.renderGames === 'function') win.renderGames(); }

    /* ---------- Hộp thoại dùng chung ---------- */
    function modal(title, body, actions, extraClass) {
      var old = doc.getElementById('khoModal'); if (old) old.remove();
      var m = doc.createElement('div'); m.id = 'khoModal'; m.className = 'kho-overlay';
      m.innerHTML = '<section class="kho-dialog ' + (extraClass || '') + '" role="dialog" aria-modal="true"><header><h2>' + esc(title) + '</h2><button class="btn soft" data-kho-close>Đóng</button></header><div class="kho-dialog-body">' + body + '</div><footer>' + (actions || '') + '</footer></section>';
      doc.body.appendChild(m);
      m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-kho-close]')) m.remove(); });
      return m;
    }

    /* ---------- Xem ---------- */
    function view(id, only) {
      var s = byId(id); if (!s) return;
      var v = summarize(s), kinds = ORDER.filter(function (k) { return v.types[k]; }), pick = only && v.types[only] ? only : 'ALL';
      var rows = (s.questions || []).map(function (q, i) {
        var kind = kindOf(q); if (pick !== 'ALL' && kind !== pick) return '';
        var errors = validity(q), answers = answersOf(q), shown = kind === 'TRUEFALSE' || kind === 'MATCHING' || kind === 'OPEN' || kind === 'FILL' || kind === 'SHORT' ? '' : answers.map(function (a, j) { return String.fromCharCode(65 + j) + '. ' + a; }).join(' · ');
        return '<article class="kho-question"><b>Câu ' + (i + 1) + ' <span class="kho-type t-' + kind + '">' + esc(TYPES[kind].label) + '</span>' + (known(q.grade) ? ' <span class="kho-grade">' + esc(q.grade) + '</span>' : '') + '</b><p>' + esc(textOf(q)) + '</p>' + (shown ? '<small>' + esc(shown) + '</small>' : '') + '<small class="kho-key">Đáp án: ' + esc(keyText(q) || 'Chưa có') + '</small>' + (errors.length ? '<span class="bad">' + esc(errors.join(' · ')) + '</span>' : '') + '</article>';
      }).join('');
      var chips = kinds.length > 1 ? '<nav class="kho-chips small"><button class="kho-chip' + (pick === 'ALL' ? ' active' : '') + '" data-kho-viewkind="ALL">Tất cả <b>' + v.total + '</b></button>' + kinds.map(function (k) { return '<button class="kho-chip t-' + k + (pick === k ? ' active' : '') + '" data-kho-viewkind="' + k + '">' + esc(TYPES[k].label) + ' <b>' + v.types[k] + '</b></button>'; }).join('') + '</nav>' : '';
      var m = modal(s.name || 'Bộ câu hỏi', '<p class="kho-sub">' + v.total + ' câu · ' + v.valid + ' hợp lệ' + (v.review ? ' · ' + v.review + ' cần sửa' : '') + '</p>' + chips + '<div class="kho-questions">' + rows + '</div>', '<button class="btn soft" data-kho-edit="' + esc(s.id) + '">Sửa bộ</button><button class="btn soft" data-kho-practice="' + esc(s.id) + '"' + (v.valid ? '' : ' disabled') + '>✎ Luyện tập</button>');
      m.querySelectorAll('[data-kho-viewkind]').forEach(function (b) { b.onclick = function () { view(id, b.dataset.khoViewkind); }; });
    }

    /* ---------- Chơi ngay ---------- */
    function play(id) {
      var s = byId(id); if (!s) return;
      var total = (s.questions || []).length;
      var rows = gameCounts(s).map(function (g) { return '<button class="kho-game" data-kho-start="' + g.id + '"' + (g.accepted.length ? '' : ' disabled') + '><b>' + esc(g.label) + '</b><span>' + g.accepted.length + '/' + total + ' câu dùng được' + (g.id === 'head-tilt' && g.accepted.length ? ' · camera hoặc phím ←/→' : '') + '</span>' + (g.rejected.length ? '<small>' + (g.accepted.length ? g.rejected.length + ' câu không dùng: ' : 'Không dùng được: ') + esc(g.rejected[0]) + '</small>' : '') + '</button>'; }).join('');
      var m = modal('Chơi ngay · ' + (s.name || 'Bộ câu hỏi'), '<p class="kho-sub">Chọn trò chơi. Ứng dụng dùng bộ này cùng cấu hình trò chơi đã lưu và vào chơi ngay.</p><div class="kho-games">' + rows + '</div>', '<button class="btn soft" data-kho-practice="' + esc(s.id) + '">✎ Luyện tập bộ này</button>');
      m.querySelectorAll('[data-kho-start]').forEach(function (b) {
        b.onclick = function () {
          var result = typeof win.hmvC6PlayBankSet === 'function' ? win.hmvC6PlayBankSet(b.dataset.khoStart, s.id) : { ok: false, reason: 'Chưa có bộ nối câu hỏi với trò chơi.' };
          if (!result.ok) { toast(result.reason); return; }
          m.remove();
        };
      });
    }

    /* ---------- Sửa ---------- */
    function edit(id) {
      var original = byId(id); if (!original) return;
      var draft = JSON.parse(JSON.stringify(original));
      var rows = (draft.questions || []).map(function (q, i) {
        var keys = keysOf(q), kind = q.kind || q.type || 'ABCD';
        return '<details class="kho-edit-q" data-qindex="' + i + '"><summary>Câu ' + (i + 1) + ' · ' + esc(TYPES[kindOf(q)].label) + ' · ' + esc(textOf(q).slice(0, 90)) + '</summary><button type="button" class="btn soft kho-delq" data-kho-delq>🗑 Xóa câu này</button>'
          + '<label>Nội dung<textarea data-field="text">' + esc(textOf(q)) + '</textarea></label>'
          + '<label>Dạng<select data-field="kind">' + ['ABCD', 'SINGLE', 'TRUEFALSE', 'MULTI', 'FILL', 'SHORT', 'MATCHING', 'OPEN'].concat(TYPES[kind] ? [] : [kind]).map(function (k) { return '<option value="' + k + '"' + (kind === k || (kind === 'ORAL' && k === 'OPEN') ? ' selected' : '') + '>' + esc(TYPES[k] ? TYPES[k].label : k) + '</option>'; }).join('') + '</select></label>'
          + '<label>Phương án, mỗi dòng một phương án<textarea data-field="answers">' + esc(answersOf(q).join('\n')) + '</textarea></label>'
          + '<label>Khóa đáp án (A hoặc A,C)<input data-field="key" value="' + esc(keys.map(function (j) { return String.fromCharCode(65 + j); }).join(',')) + '"></label>'
          + '<label>Đáp án tham chiếu (điền khuyết, trả lời ngắn, gợi ý câu hỏi mở)<input data-field="answerText" value="' + esc(q.answerText || '') + '"></label>'
          + '<label>Cặp ghép, mỗi dòng: trái =&gt; phải<textarea data-field="pairs">' + esc((q.pairs || []).map(function (p) { return p.left + ' => ' + p.right; }).join('\n')) + '</textarea></label></details>';
      }).join('');
      var body = '<p class="kho-sub">Chỉ ghi thay đổi khi bấm Xác nhận lưu. Nếu lưu thất bại, bộ cũ vẫn nguyên.</p><div class="kho-edit-meta"><label>Tên bộ<input data-set-field="name" value="' + esc(draft.name || '') + '"></label>'
        + META.map(function (f) { return '<label>' + f[1] + '<input data-set-field="' + f[0] + '" value="' + esc(known(draft[f[0]]) ? draft[f[0]] : '') + '" placeholder="' + esc(f[2]) + '"></label>'; }).join('') + '</div><div class="kho-questions">' + rows + '</div><p id="khoEditStatus" role="status"></p>';
      var m = modal('Sửa bộ câu hỏi', body, '<button class="btn color" data-kho-save>Xác nhận lưu</button>');
      m.addEventListener('click', function (e) {
        var del = e.target.closest('[data-kho-delq]'); if (!del) return;
        var row = del.closest('[data-qindex]'), gone = row.dataset.removed === '1';
        row.dataset.removed = gone ? '' : '1'; row.classList.toggle('kho-removed', !gone); del.textContent = gone ? '🗑 Xóa câu này' : '↶ Giữ lại câu này';
      });
      m.querySelector('[data-kho-save]').onclick = function () {
        var status = m.querySelector('#khoEditStatus'), problems = [], removed = [];
        m.querySelectorAll('[data-set-field]').forEach(function (el) { var key = el.dataset.setField, value = el.value.trim(); if (key === 'name') draft.name = value || original.name || 'Bộ câu hỏi'; else draft[key] = value || (known(original[key]) ? '' : original[key]) || (META.find(function (f) { return f[0] === key; }) || [])[2]; });
        draft.setTitle = draft.name;
        META.forEach(function (f) { var k = f[0]; if (!known(draft[k])) return; draft.questions.forEach(function (q) { if (!known(q[k]) || q[k] === original[k]) { q[k] = draft[k]; if (k === 'difficulty') q.level = draft[k]; } }); });
        m.querySelectorAll('[data-qindex]').forEach(function (row) {
          var index = Number(row.dataset.qindex); if (row.dataset.removed === '1') { removed.push(index); return; }
          var q = draft.questions[index], value = function (k) { return row.querySelector('[data-field="' + k + '"]').value.trim(); };
          q.text = q.question = value('text'); q.kind = q.type = value('kind');
          q.answers = value('answers').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); q.options = q.answers.slice();
          if (q.kind === 'TRUEFALSE' && !q.answers.length) { q.answers = ['Đúng', 'Sai']; q.options = q.answers.slice(); }
          q.answerText = value('answerText');
          q.pairs = value('pairs').split('\n').map(function (line) { var p = line.split(/\s*(?:=>|↔|⇔|→)\s*/); return p.length >= 2 && p[0].trim() ? { left: p[0].trim(), right: p.slice(1).join(' => ').trim() } : null; }).filter(Boolean);
          var raw = value('key').toUpperCase(), keys = raw ? raw.split(/[\s,;|/]+/).filter(Boolean).map(function (k) { return /^[A-J]$/.test(k) ? k.charCodeAt(0) - 65 : /^(Đ|ĐÚNG|DUNG)$/.test(k) ? 0 : /^(S|SAI)$/.test(k) ? 1 : -1; }) : [];
          q.correctAnswers = keys; q.correct = keys.length === 1 ? keys[0] : null;
          q.correctAnswer = keys.map(function (j) { return q.answers[j]; }).filter(Boolean).join(' / ') || q.answerText || '';
          var errors = validity(q); q.answerKeyValid = !errors.length; q.reviewErrors = errors.slice();
          if (errors.length) problems.push('Câu ' + (index + 1) + ': ' + errors.join(', '));
        });
        if (problems.length) { status.textContent = problems.slice(0, 5).join(' · ') + (problems.length > 5 ? ' …' : ''); status.className = 'bad'; return; }
        if (removed.length >= draft.questions.length) { status.textContent = 'Bộ phải còn ít nhất một câu. Muốn bỏ cả bộ, hãy dùng Xóa trong menu ⋯.'; status.className = 'bad'; return; }
        if (!win.confirm('Lưu các thay đổi vào bộ này?' + (removed.length ? ' Sẽ xóa ' + removed.length + ' câu khỏi bộ.' : ''))) return;
        if (removed.length) draft.questions = draft.questions.filter(function (_, i) { return removed.indexOf(i) < 0; });
        var db = win.audioDB; if (!db || !db.objectStoreNames.contains('questionSets')) { status.textContent = 'Kho lưu trữ chưa sẵn sàng.'; status.className = 'bad'; return; }
        draft.updatedAt = new Date().toISOString();
        var tx = db.transaction('questionSets', 'readwrite'); tx.objectStore('questionSets').put(draft);
        tx.oncomplete = function () { var i = sets().findIndex(function (x) { return x.id === id; }); if (i >= 0) sets()[i] = draft; m.remove(); refresh(); toast('Đã lưu bộ câu hỏi.'); };
        tx.onerror = tx.onabort = function () { status.textContent = 'Lưu thất bại; bộ cũ vẫn nguyên.'; status.className = 'bad'; };
      };
    }

    /* ---------- Luyện tập: làm được mọi dạng câu ---------- */
    function practice(id) {
      var s = byId(id); if (!s) return;
      var list = (s.questions || []).filter(function (q) { return !validity(q).length; });
      if (!list.length) { toast('Bộ này chưa có câu hợp lệ để luyện tập.'); return; }
      var st = { i: 0, right: 0, done: false, ok: false, picked: [], revealed: false };
      var m = modal('Luyện tập · ' + (s.name || 'Bộ câu hỏi'), '<div id="khoPractice"></div>', '', 'kho-practice');
      var host = m.querySelector('#khoPractice'), foot = m.querySelector('footer');
      function finish(ok) { st.done = true; st.ok = ok; if (ok) st.right++; draw(); }
      function feedback(q) {
        if (!st.done) return '';
        var kind = kindOf(q), key = keyText(q);
        return '<div class="lt-feedback ' + (st.ok ? 'ok' : 'bad') + '"><b>' + (st.ok ? '✅ Chính xác!' : kind === 'OPEN' ? '📝 Cần luyện thêm.' : '❌ Chưa đúng.') + '</b>' + (kind !== 'OPEN' || q.answerText ? ' <span>Đáp án: ' + esc(key) + '</span>' : '') + (q.explanation ? '<p>' + esc(q.explanation) + '</p>' : '') + '</div>';
      }
      function draw() {
        if (st.i >= list.length) {
          host.innerHTML = '<div class="lt-end"><h3>🎉 Hoàn thành!</h3><p class="lt-score">Đúng ' + st.right + '/' + list.length + ' câu</p><p>' + (st.right === list.length ? 'Tuyệt vời, em làm đúng tất cả!' : st.right >= list.length * .7 ? 'Em làm rất tốt. Xem lại vài câu chưa đúng nhé.' : 'Cố gắng thêm nhé. Em có thể làm lại bộ này.') + '</p></div>';
          foot.innerHTML = '<button class="btn soft" data-lt-restart>↻ Làm lại</button><button class="btn color" data-kho-close>Xong</button>';
          return;
        }
        var q = list[st.i], kind = kindOf(q), answers = answersOf(q), keys = keysOf(q), body = '';
        if (kind === 'ABCD' || kind === 'SINGLE' || kind === 'TRUEFALSE') {
          body = '<div class="lt-options' + (kind === 'TRUEFALSE' ? ' two' : '') + '">' + answers.map(function (a, j) { var cls = st.done ? (keys[0] === j ? ' correct' : st.picked[0] === j ? ' wrong' : '') : ''; return '<button class="lt-option' + cls + '" data-lt-pick="' + j + '"' + (st.done ? ' disabled' : '') + '>' + (kind === 'TRUEFALSE' ? '' : '<b>' + String.fromCharCode(65 + j) + '</b>') + '<span>' + esc(a) + '</span></button>'; }).join('') + '</div>';
        } else if (kind === 'MULTI') {
          body = '<p class="lt-hint">Chọn tất cả đáp án đúng rồi bấm Kiểm tra.</p><div class="lt-options">' + answers.map(function (a, j) { var on = st.picked.indexOf(j) >= 0, cls = st.done ? (keys.indexOf(j) >= 0 ? ' correct' : on ? ' wrong' : '') : (on ? ' picked' : ''); return '<button class="lt-option' + cls + '" data-lt-toggle="' + j + '"' + (st.done ? ' disabled' : '') + '><b>' + String.fromCharCode(65 + j) + '</b><span>' + esc(a) + '</span></button>'; }).join('') + '</div>';
        } else if (kind === 'FILL' || kind === 'SHORT') {
          body = '<p class="lt-hint">' + (kind === 'FILL' ? 'Gõ số hoặc từ cần điền rồi bấm Kiểm tra.' : 'Gõ câu trả lời ngắn rồi bấm Kiểm tra.') + '</p><input class="lt-input" data-lt-input autocomplete="off" value="' + esc(st.picked[0] || '') + '"' + (st.done ? ' disabled' : '') + ' placeholder="Câu trả lời của em">';
        } else if (kind === 'MATCHING') {
          var plain = (q.pairs || []).map(function (p) { return p.right; }), rights = shuffle(plain, st.i + 7); if (rights.length > 1 && rights.join('\u0001') === plain.join('\u0001')) rights.push(rights.shift());
          body = '<p class="lt-hint">Chọn ý bên phải khớp với mỗi ý bên trái rồi bấm Kiểm tra.</p><div class="lt-pairs">' + (q.pairs || []).map(function (p, j) { var cls = st.done ? (st.picked[j] === p.right ? ' correct' : ' wrong') : ''; return '<label class="lt-pair' + cls + '"><span>' + esc(p.left) + '</span><select data-lt-match="' + j + '"' + (st.done ? ' disabled' : '') + '><option value="">— chọn —</option>' + rights.map(function (r) { return '<option' + (st.picked[j] === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>';
        } else {
          body = '<p class="lt-hint">Câu hỏi mở: em trả lời miệng, thầy cô nhận xét.</p>' + (st.revealed && q.answerText ? '<div class="lt-reveal">Gợi ý: ' + esc(q.answerText) + '</div>' : '');
        }
        host.innerHTML = '<div class="lt-top"><span>Câu ' + (st.i + 1) + '/' + list.length + '</span><span class="kho-type t-' + kind + '">' + TYPES[kind].icon + ' ' + esc(TYPES[kind].label) + '</span>' + (known(q.grade) ? '<span class="kho-grade">' + esc(q.grade) + '</span>' : '') + '<span class="lt-right">Đúng ' + st.right + '</span></div><div class="lt-question">' + esc(textOf(q)) + '</div>' + body + feedback(q);
        var actions = '';
        if (st.done) actions = '<button class="btn color" data-lt-next>' + (st.i >= list.length - 1 ? 'Xem kết quả →' : 'Câu tiếp theo →') + '</button>';
        else if (kind === 'OPEN') actions = (q.answerText && !st.revealed ? '<button class="btn soft" data-lt-reveal>Xem gợi ý đáp án</button>' : '') + '<button class="btn soft" data-lt-grade="0">Cần luyện thêm</button><button class="btn color" data-lt-grade="1">✔ Đạt</button>';
        else if (kind === 'MULTI' || kind === 'FILL' || kind === 'SHORT' || kind === 'MATCHING') actions = '<button class="btn color" data-lt-check>Kiểm tra</button>';
        foot.innerHTML = '<button class="btn soft" data-lt-skip' + (st.done ? ' hidden' : '') + '>Bỏ qua</button>' + actions;
        var input = host.querySelector('[data-lt-input]'); if (input && !st.done) { input.focus(); input.oninput = function () { st.picked[0] = input.value; }; input.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } }; }
        host.querySelectorAll('[data-lt-match]').forEach(function (sel) { sel.onchange = function () { st.picked[Number(sel.dataset.ltMatch)] = sel.value; }; });
      }
      function check() {
        var q = list[st.i], kind = kindOf(q), keys = keysOf(q);
        if (kind === 'MULTI') { if (!st.picked.length) { toast('Hãy chọn ít nhất một đáp án.'); return; } finish(st.picked.length === keys.length && keys.every(function (k) { return st.picked.indexOf(k) >= 0; })); }
        else if (kind === 'FILL' || kind === 'SHORT') { if (!String(st.picked[0] || '').trim()) { toast('Hãy gõ câu trả lời.'); return; } finish(answerMatches(st.picked[0], q.answerText)); }
        else if (kind === 'MATCHING') { var pairs = q.pairs || []; if (pairs.some(function (_, j) { return !st.picked[j]; })) { toast('Hãy ghép đủ các ý.'); return; } finish(pairs.every(function (p, j) { return st.picked[j] === p.right; })); }
      }
      function next() { st.i++; st.done = false; st.ok = false; st.picked = []; st.revealed = false; draw(); }
      m.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || b.disabled) return; var d = b.dataset;
        if (d.ltPick !== undefined && !st.done) { st.picked = [Number(d.ltPick)]; finish(keysOf(list[st.i])[0] === Number(d.ltPick)); }
        else if (d.ltToggle !== undefined && !st.done) { var j = Number(d.ltToggle), at = st.picked.indexOf(j); if (at >= 0) st.picked.splice(at, 1); else st.picked.push(j); draw(); }
        else if ('ltCheck' in d) check();
        else if ('ltReveal' in d) { st.revealed = true; draw(); }
        else if (d.ltGrade !== undefined) finish(d.ltGrade === '1');
        else if ('ltNext' in d || 'ltSkip' in d) next();
        else if ('ltRestart' in d) { st.i = 0; st.right = 0; st.done = false; st.picked = []; st.revealed = false; draw(); }
      });
      draw();
    }

    /* ---------- Bộ câu hỏi mẫu ---------- */
    function seedDemo(force) {
      var demo = win.HMV_DEMO; if (!demo || !Array.isArray(demo.sets)) return Promise.resolve(0);
      var flag = 'hmv_demo_sets_v' + demo.version, done = false;
      try { done = !!win.localStorage.getItem(flag); } catch (e) {}
      if (done && !force) return Promise.resolve(0);
      var db = win.audioDB; if (!db || !db.objectStoreNames.contains('questionSets')) return Promise.reject(new Error('Kho lưu trữ chưa sẵn sàng'));
      var missing = demo.sets.filter(function (s) { return !byId(s.id); }).map(function (s) { var copy = JSON.parse(JSON.stringify(s)), now = new Date().toISOString(); copy.createdAt = copy.updatedAt = now; return copy; });
      return new Promise(function (resolve, reject) {
        if (!missing.length) { try { win.localStorage.setItem(flag, '1'); } catch (e) {} resolve(0); return; }
        var tx = db.transaction('questionSets', 'readwrite'); missing.forEach(function (s) { tx.objectStore('questionSets').put(s); });
        tx.oncomplete = function () { missing.forEach(function (s) { if (!byId(s.id)) sets().push(s); }); try { win.localStorage.setItem(flag, '1'); } catch (e) {} refresh(); resolve(missing.length); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error('Không nạp được bộ mẫu')); };
      });
    }
    function seedWhenReady(tries) { if (win.audioDB && sets().length) { seedDemo(false).catch(function () {}); return; } if (tries > 0) win.setTimeout(function () { seedWhenReady(tries - 1); }, 250); }

    function exportSet(s) { var blob = new Blob([JSON.stringify({ format: 'HMV-question-set-v1', exportedAt: new Date().toISOString(), set: s }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = doc.createElement('a'); a.href = url; a.download = 'bo-cau-hoi-' + String(s.id || 'bo').replace(/[^a-z0-9-]/gi, '_') + '.json'; a.click(); win.setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }

    function action(e) {
      var b = e.target.closest('[data-kho-view],[data-kho-edit],[data-kho-play],[data-kho-practice],[data-kho-copy],[data-kho-export],[data-kho-delete],[data-kho-add],[data-kho-file],[data-kho-demo],[data-kho-kind],[data-kho-clear]');
      if (!b || b.disabled) return; var d = b.dataset;
      if (d.khoView) view(d.khoView);
      else if (d.khoEdit) edit(d.khoEdit);
      else if (d.khoPlay) play(d.khoPlay);
      else if (d.khoPractice) practice(d.khoPractice);
      else if (d.khoCopy && typeof win.questionBankCopy === 'function') { win.questionBankCopy(d.khoCopy); win.setTimeout(refresh, 0); }
      else if (d.khoExport) exportSet(byId(d.khoExport));
      else if (d.khoDelete && typeof win.questionBankRemoveSet === 'function') { win.questionBankRemoveSet(d.khoDelete); win.setTimeout(refresh, 0); }
      else if ('khoAdd' in d) { if (win.hmvC7QuestionBank && typeof win.hmvC7QuestionBank.open === 'function') win.hmvC7QuestionBank.open(); }
      /* 1.1: lối vào riêng cho nhập bằng tệp — mở cùng hộp thoại Thêm câu hỏi, ở sẵn thẻ "Tải tệp". */
      else if ('khoFile' in d) { if (win.hmvC7QuestionBank && typeof win.hmvC7QuestionBank.open === 'function') { win.hmvC7QuestionBank.open(); var tab = doc.querySelector('#qbStage7Modal [data-source="file"]'); if (tab) tab.click(); } }
      else if ('khoDemo' in d) seedDemo(true).then(function (n) { toast(n ? 'Đã nạp ' + n + ' bộ câu hỏi mẫu.' : 'Các bộ mẫu đã có sẵn.'); }).catch(function (err) { toast(err.message || 'Không nạp được bộ mẫu.'); });
      else if (d.khoKind) { filters.kind = d.khoKind; refresh(); }
      else if ('khoClear' in d) { filters = { search: '', grade: 'ALL', subject: 'ALL', topic: 'ALL', level: 'ALL', kind: 'ALL' }; refresh(); }
    }
    roots.forEach(function (r) {
      r.addEventListener('click', action);
      r.addEventListener('change', function (e) { var k = e.target.dataset && e.target.dataset.khoFilter; if (!k || k === 'search') return; filters[k] = e.target.value; refresh(); });
      r.addEventListener('input', function (e) { if (!e.target.dataset || e.target.dataset.khoFilter !== 'search') return; filters.search = e.target.value; var pos = e.target.selectionStart; refresh(); var f = doc.querySelector('#questions [data-kho-filter="search"], #games [data-kho-filter="search"]'); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (err) {} } });
    });
    doc.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#khoModal')) action(e); else if (!e.target.closest || !e.target.closest('.kho-more')) doc.querySelectorAll('.kho-more[open]').forEach(function (x) { x.open = false; }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = doc.getElementById('khoModal'); if (m) m.remove(); } });

    win.questionBankRender = bankHtml;
    win.renderQuestions = function () { var el = doc.getElementById('questions'); if (el) el.innerHTML = bankHtml(); };
    win.hmvKho = { validity: validity, kindOf: kindOf, compatibility: compatibility, gameCounts: gameCounts, renderBank: bankHtml, seedDemo: seedDemo, practice: practice, answerMatches: answerMatches, refresh: refresh };
    win.hmvC7B = win.hmvKho;
    var active = doc.getElementById('questions'); if (active && active.classList.contains('active')) win.renderQuestions();
    seedWhenReady(60);
  }

  return { ORDER: ORDER, TYPES: TYPES, validity: validity, kindOf: kindOf, compatibility: compatibility, known: known, keyText: keyText, answerMatches: answerMatches, install: install };
});
