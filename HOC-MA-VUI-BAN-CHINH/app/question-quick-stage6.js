(function () {
  'use strict';
  var KEY = 'hmv_c6_game_question_selection_v1';
  var saved = {};
  var session = Object.create(null);
  var draft = [];
  var chosen = null;
  var currentGame = '';
  var sourceTab = 'paste';
  var bankSet = '';
  var bankFilter = { grade: 'ALL', subject: 'ALL', kind: 'ALL', query: '' };

  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { saved = {}; }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function appType() { return window.classroomGame && window.classroomGame.type || ''; }
  function gameName(t) {
    var names = { millionaire: 'Chinh phục tri thức', tug: 'Kéo co kiến thức', gift: 'Hộp quà bí mật', buzzer: 'Ai nhanh hơn', tiles: 'Lật mảnh ghép', balloon: 'Bóng bay tri thức', poll: 'Bình chọn ngón tay', 'magic-hand': 'Bàn tay phép thuật', 'raise-hand': 'Giơ tay giành quyền', 'head-tilt': 'Quiz Nghiêng Đầu', lens: 'Ống kính may mắn', race: 'Đường đua kiến thức', 'paper-mode': 'Chế độ giấy' };
    return names[t] || t || 'Trò chơi';
  }
  function sets() { return Array.isArray(window.questionBankSets) ? window.questionBankSets : []; }
  function setById(id) { return sets().find(function (s) { return String(s.id) === String(id); }) || null; }
  function normalize(q, i, meta) {
    var answers = Array.isArray(q.answers) ? q.answers.slice() : [];
    var kind = q.kind || (answers.length === 2 && (answers[0] === 'Đúng' || answers[1] === 'Sai') ? 'TRUEFALSE' : answers.length === 4 ? 'ABCD' : 'ORAL');
    return {
      id: q.id || 'c6-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 7),
      text: String(q.text || q.question || '').trim(), question: String(q.text || q.question || '').trim(),
      answers: answers, options: answers.slice(), correct: Number.isInteger(q.correct) ? q.correct : null,
      kind: kind, answerKeyValid: Number.isInteger(q.correct) && q.correct >= 0 && q.correct < answers.length,
      subject: q.subject || (meta && meta.subject) || 'Tùy chọn', grade: q.grade || (meta && meta.grade) || 'Lớp 4',
      topic: q.topic || (meta && meta.topic) || 'Lượt chơi nhanh', level: q.level || 'Mức 1',
      explanation: q.explanation || '', answerText: q.answerText || q.correctAnswer || ''
    };
  }
  function parseCSVLine(line) {
    var cells = [], cell = '', quote = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"' && line[i + 1] === '"' && quote) { cell += '"'; i++; }
      else if (ch === '"') quote = !quote;
      else if (ch === ',' && !quote) { cells.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  }
  function parse(raw, ext) {
    var text = String(raw || '').replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
    if (!text) return [];
    if (/^\s*[\[{]/.test(text)) {
      var json = JSON.parse(text), arr = Array.isArray(json) ? json : (json && Array.isArray(json.questions) ? json.questions : []);
      return arr.slice(0, 101).map(function (q, i) {
        var answers = Array.isArray(q.answers) ? q.answers : Array.isArray(q.options) ? q.options : [];
        var c = q.correct;
        if (typeof c === 'string') { var k = c.trim().toUpperCase(); c = /^[A-D]$/.test(k) ? k.charCodeAt(0) - 65 : null; }
        return normalize({ text: q.text || q.question, answers: answers, correct: Number.isInteger(c) ? c : null, kind: q.kind }, i, q);
      });
    }
    if (ext === 'csv') {
      var csvRows = text.split('\n').filter(function (x) { return x.trim(); }).map(parseCSVLine);
      if (csvRows.some(function (r) { return r.length >= 6; })) {
        var heads = csvRows[0].map(function (x) { return x.toLocaleLowerCase('vi').trim(); });
        var hasHeader = /câu hỏi|nội dung|question/.test(heads.join(' '));
        var dataRows = hasHeader ? csvRows.slice(1) : csvRows;
        var cols = { question: heads.findIndex(function (x) { return /câu hỏi|nội dung|question/.test(x); }), a: heads.findIndex(function (x) { return /^đáp án\s*a$|^a$/.test(x); }), b: heads.findIndex(function (x) { return /^đáp án\s*b$|^b$/.test(x); }), c: heads.findIndex(function (x) { return /^đáp án\s*c$|^c$/.test(x); }), d: heads.findIndex(function (x) { return /^đáp án\s*d$|^d$/.test(x); }), key: heads.findIndex(function (x) { return /đáp án đúng|^đáp án$|^answer$/.test(x); }), grade: heads.findIndex(function (x) { return /lớp|khối|grade/.test(x); }), subject: heads.findIndex(function (x) { return /môn|subject/.test(x); }), topic: heads.findIndex(function (x) { return /bài|chủ đề|topic/.test(x); }) };
        return dataRows.map(function (row, i) {
          var qText = row[cols.question >= 0 ? cols.question : 0] || '';
          var answerCells = [cols.a, cols.b, cols.c, cols.d].map(function (c, j) { return row[c >= 0 ? c : j + 1] || ''; });
          var keyCell = row[cols.key >= 0 ? cols.key : 5] || '';
          var keyText = String(keyCell).trim().normalize('NFC').toLocaleLowerCase('vi'), key = /^[a-d]$/i.test(keyText) ? keyText.toUpperCase().charCodeAt(0) - 65 : /^(đúng|true|t)$/i.test(keyText) ? 0 : /^(sai|false|f)$/i.test(keyText) ? 1 : null;
          var kind = answerCells.every(Boolean) ? 'ABCD' : (answerCells.slice(0, 2).every(Boolean) ? 'TRUEFALSE' : 'ABCD');
          var q = normalize({ text: qText, answers: kind === 'TRUEFALSE' ? answerCells.slice(0, 2) : answerCells, correct: key, kind: kind }, i, { grade: row[cols.grade] || 'Lớp 4', subject: row[cols.subject] || 'Tùy chọn', topic: row[cols.topic] || 'Lượt chơi nhanh' });
          return q;
        });
      }
    }
    var lines = text.split('\n'), blocks = [], block = [];
    lines.forEach(function (line) {
      if (/^\s*Câu\s*\d+\s*[:.)-]?\s*/i.test(line) && block.some(function (x) { return x.trim(); })) { blocks.push(block); block = []; }
      if (!line.trim() && block.length && block.some(function (x) { return x.trim(); })) { block.push(''); return; }
      block.push(line);
    });
    if (block.length) blocks.push(block);
    if (blocks.length === 1 && !/^\s*Câu\s*\d+/i.test(text) && text.split(/\n\s*\n/).filter(Boolean).length > 1) blocks = text.split(/\n\s*\n+/).map(function (b) { return b.split('\n'); });
    var out = [];
    blocks.forEach(function (rows, index) {
      var question = [], opts = {}, key = null, oral = false, current = '';
      rows.forEach(function (rawLine) {
        var line = rawLine.trim();
        if (!line) { if (current) opts[current] += '\n'; return; }
        line = line.replace(/^Câu\s*\d+\s*[:.)-]?\s*/i, '');
        var mode = line.match(/^Dạng\s*:\s*(.+)$/i);
        if (mode) { oral = /giáo viên chấm|trả lời miệng|tự luận/i.test(mode[1]); current = ''; return; }
        var ans = line.match(/^(?:Đáp\s*án(?:\s*đúng)?|Answer)\s*:\s*(.+)$/i);
        if (ans) { var value = ans[1].trim().normalize('NFC').toLocaleLowerCase('vi'); if (/^(đúng|true|t)$/i.test(value)) key = 0; else if (/^(sai|false|f)$/i.test(value)) key = 1; else if (/^[a-d]$/i.test(value)) key = value.toUpperCase().charCodeAt(0) - 65; else key = null; current = ''; return; }
        var option = line.match(/^([A-D])\s*[.)]\s*(.*)$/i);
        if (option) { current = option[1].toUpperCase(); opts[current] = option[2].trim(); return; }
        if (current) opts[current] = (opts[current] || '') + (opts[current] ? ' ' : '') + line;
        else question.push(line);
      });
      var qtext = question.join(' ').replace(/\s+/g, ' ').trim();
      if (!qtext) return;
      var answers = ['A', 'B', 'C', 'D'].filter(function (k) { return Object.prototype.hasOwnProperty.call(opts, k); }).map(function (k) { return opts[k].trim(); });
      var kind = oral ? 'ORAL' : (answers.length === 4 ? 'ABCD' : (answers.length === 2 || (answers.length === 0 && (key === 0 || key === 1)) ? 'TRUEFALSE' : 'ABCD'));
      if (kind === 'TRUEFALSE' && answers.length === 0) answers = ['Đúng', 'Sai'];
      out.push(normalize({ text: qtext, answers: answers, correct: key, kind: kind }, index, {}));
    });
    return out;
  }
  function errors(q, game) {
    var e = [];
    if (!q.text) e.push('Thiếu nội dung câu hỏi');
    if (q.kind === 'ORAL' || q.kind === 'OPEN') {
      if (game === 'millionaire' || game === 'head-tilt' || game === 'paper-mode' || game === 'balloon' || game === 'poll') e.push('Trò này cần câu có lựa chọn và khóa đáp án');
      else if (!q.answers.length) return e;
    } else if (q.kind === 'TRUEFALSE') {
      if (game === 'millionaire' || game === 'paper-mode') e.push('Trò này yêu cầu 4 phương án A–D');
      if (q.answers.length !== 2) e.push('Đúng/Sai cần đúng 2 phương án');
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 1) e.push('Thiếu khóa Đúng/Sai rõ ràng');
    } else {
      if (q.answers.length !== 4 || q.answers.some(function (x) { return !String(x || '').trim(); })) e.push('Cần đủ 4 phương án A–D');
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) e.push('Thiếu khóa đáp án A/B/C/D rõ ràng');
    }
    if (game === 'head-tilt' && q.kind !== 'TRUEFALSE') e.push('Quiz Nghiêng Đầu chỉ nhận Đúng/Sai');
    if (game === 'magic-hand' && q.kind !== 'TRUEFALSE') e.push('Bàn tay phép thuật dùng câu Đúng/Sai (xếp thẻ vào ô Đúng hoặc Sai)');
    return e;
  }
  function duplicateIndexes(items) {
    var seen = Object.create(null), dup = Object.create(null);
    items.forEach(function (q, i) { var k = q.text.toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim(); if (!k) return; if (seen[k] !== undefined) { dup[i] = true; dup[seen[k]] = true; } else seen[k] = i; });
    return dup;
  }
  function activeQuestions(type) {
    if (session[type]) return session[type];
    var cfg = saved[type];
    if (!cfg || !cfg.setId) return null;
    var s = setById(cfg.setId); if (!s) return null;
    var ids = Array.isArray(cfg.ids) ? cfg.ids : [];
    /* BAN-CHINH: bộ đã lưu cũng được chuẩn hóa dạng câu như khi bấm Chơi ngay, và chỉ lấy câu hợp luật trò chơi. */
    var list = s.questions.filter(function (q) { return !ids.length || ids.indexOf(q.id) >= 0; }).map(forGame).filter(function (q) { return !errors(q, type).length; });
    return list.length ? list : null;
  }
  function forGame(q) { var copy = Object.assign({}, q), kind = copy.kind || copy.type, n = (copy.answers || []).length; if (kind === 'OPEN') copy.kind = 'ORAL'; else if (kind === 'SINGLE' && n === 4) copy.kind = 'ABCD'; else if (kind === 'ABCD' && n === 2) copy.kind = 'TRUEFALSE'; else if (!copy.kind && kind) copy.kind = kind; return copy; }
  window.hmvC6SelectionName = function (type) { var cfg = saved[type], s = cfg && cfg.setId ? setById(cfg.setId) : null; return s ? (s.name || s.setTitle || '') : ''; };
  window.hmvC6QuestionsForGame = activeQuestions;
  var previousQuestionSource = window.questionSourceList;
  if (typeof previousQuestionSource === 'function') window.questionSourceList = function (type) {
    var list = activeQuestions(type || appType());
    if (list) return list;
    return previousQuestionSource.apply(this, arguments);
  };

  function typeFilter(items, type) { return items.filter(function (q) { return !errors(q, type).length; }); }
  function parseAndPreview() {
    var area = document.getElementById('c6Paste'), ext = document.getElementById('c6FileExt');
    try { draft = parse(area ? area.value : '', ext ? ext.value : 'txt'); }
    catch (e) { draft = []; status('Không đọc được nội dung: ' + (e.message || 'định dạng không hợp lệ'), true); }
    if (draft.length > 100) { status('Nhận diện ' + draft.length + ' câu; giới hạn lưu là 100 câu mỗi lượt.', true); }
    renderPreview();
  }
  function status(message, bad) { var e = document.getElementById('c6Status'); if (e) { e.textContent = message; e.className = 'c6-status ' + (bad ? 'bad' : ''); } }
  function renderPreview() {
    var host = document.getElementById('c6Preview'); if (!host) return;
    var type = currentGame, dups = duplicateIndexes(draft), valid = 0, fixes = 0, recognized = 0;
    var rows = draft.map(function (q, i) {
      var issue = errors(q, type); if (dups[i]) issue.push('Trùng nội dung');
      if (q.answerKeyValid || q.kind === 'ORAL') recognized++;
      if (!issue.length) valid++; else fixes++;
      var labels = q.kind === 'TRUEFALSE' ? ['Đúng', 'Sai'] : q.kind === 'ABCD' ? ['A', 'B', 'C', 'D'] : [];
      var optionHtml = labels.map(function (label, j) { return '<label class="c6-option"><b>' + label + '</b><input data-opt="' + j + '" data-row="' + i + '" value="' + esc(q.answers[j] || '') + '"></label>'; }).join('');
      return '<article class="c6-row ' + (issue.length ? 'invalid' : 'valid') + '" data-row-card="' + i + '"><header><b>Câu ' + (i + 1) + '</b><span>' + (issue.length ? esc(issue.join(' · ')) : '✓ Hợp lệ') + '</span><button class="btn soft" data-remove="' + i + '">Loại câu</button></header><textarea data-text="' + i + '" aria-label="Nội dung câu ' + (i + 1) + '">' + esc(q.text) + '</textarea><div class="c6-options">' + optionHtml + '</div><div class="c6-row-meta"><label>Dạng<select data-kind="' + i + '"><option value="ABCD" ' + (q.kind === 'ABCD' ? 'selected' : '') + '>A–B–C–D</option><option value="TRUEFALSE" ' + (q.kind === 'TRUEFALSE' ? 'selected' : '') + '>Đúng/Sai</option><option value="ORAL" ' + (q.kind === 'ORAL' ? 'selected' : '') + '>Giáo viên chấm</option></select></label><label>Đáp án<select data-key="' + i + '"><option value="">Chưa có khóa</option>' + labels.map(function (x, j) { return '<option value="' + j + '" ' + (q.correct === j ? 'selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div></article>';
    }).join('');
    host.innerHTML = '<div class="c6-summary"><b>Đã nhận diện: ' + draft.length + '</b><b>Hợp lệ: ' + valid + '</b><b>Cần sửa: ' + fixes + '</b><b>Khóa/dạng rõ: ' + recognized + '</b><button class="btn soft" id="c6RemoveInvalid">Loại câu lỗi</button></div>' + (rows || '<p>Chưa có câu hỏi. Dán nội dung hoặc chọn bộ trong Kho.</p>');
    var removeInvalid = document.getElementById('c6RemoveInvalid'); if (removeInvalid) removeInvalid.onclick = function () { var dup = duplicateIndexes(draft); draft = draft.filter(function (q, i) { return !errors(q, type).length && !dup[i]; }); renderPreview(); };
    status('Đã nhận diện ' + draft.length + ' câu. Sửa nội dung/đáp án nếu cần rồi xác nhận lưu.', false);
    host.querySelectorAll('[data-text]').forEach(function (el) { el.oninput = function () { draft[Number(el.dataset.text)].text = el.value; }; });
    host.querySelectorAll('[data-opt]').forEach(function (el) { el.oninput = function () { var q = draft[Number(el.dataset.row)], index = Number(el.dataset.opt); q.answers[index] = el.value; q.options = q.answers.slice(); }; });
    host.querySelectorAll('[data-kind]').forEach(function (el) { el.onchange = function () { var q = draft[Number(el.dataset.kind)]; q.kind = el.value; q.answers = q.kind === 'TRUEFALSE' ? ['Đúng', 'Sai'] : q.kind === 'ORAL' ? [] : ['','','','']; q.options = q.answers.slice(); q.correct = null; q.answerKeyValid = false; renderPreview(); }; });
    host.querySelectorAll('[data-key]').forEach(function (el) { el.onchange = function () { var q = draft[Number(el.dataset.key)]; q.correct = el.value === '' ? null : Number(el.value); q.answerKeyValid = Number.isInteger(q.correct); renderPreview(); }; });
    host.querySelectorAll('[data-remove]').forEach(function (el) { el.onclick = function () { draft.splice(Number(el.dataset.remove), 1); renderPreview(); }; });
  }
  function meta() { return { grade: document.getElementById('c6Grade')?.value || 'Lớp 4', subject: document.getElementById('c6Subject')?.value.trim() || 'Tùy chọn', topic: document.getElementById('c6Topic')?.value.trim() || 'Lượt chơi nhanh' }; }
  function selectedDraft() {
    if (!draft.length) { status('Chưa nhận diện được câu hỏi.', true); return null; }
    if (draft.length > 100) { status('Mỗi lượt nhận tối đa 100 câu.', true); return null; }
    var dups = duplicateIndexes(draft), bad = [];
    draft.forEach(function (q, i) { var e = errors(q, currentGame); if (dups[i]) e.push('Trùng nội dung'); if (e.length) bad.push('Câu ' + (i + 1) + ': ' + e.join(', ')); });
    if (bad.length) { status(bad.slice(0, 4).join(' | ') + (bad.length > 4 ? ' …' : ''), true); return null; }
    var m = meta(); return draft.map(function (q, i) { var out = normalize(q, i, m); out.grade = m.grade; out.subject = m.subject; out.topic = m.topic; return out; });
  }
  function chooseGameQuestions(list, persisted) {
    if (!list || !list.length) return false;
    session[currentGame] = list.slice();
    chosen = list.slice();
    if (persisted) { saved[currentGame] = { setId: persisted.setId, ids: persisted.ids || [] }; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {} }
    status('Đã gắn ' + list.length + ' câu vào ' + gameName(currentGame) + '.', false);
    return true;
  }
  function saveSet(list, play) {
    var m = meta(), now = new Date().toISOString(), id = 'c6-set-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var set = { id: id, name: (m.subject + ' · ' + m.topic + ' · ' + gameName(currentGame)).slice(0, 120), setTitle: m.subject + ' · ' + m.topic, grade: m.grade, subject: m.subject, topic: m.topic, lesson: m.topic, purpose: 'Luyện tập', description: 'Tạo từ Câu hỏi cho lượt chơi · ' + gameName(currentGame), createdAt: now, updatedAt: now, questions: list.map(function (q, i) { return normalize(q, i, m); }), games: [currentGame] };
    return (window.audioDB ? Promise.resolve(window.audioDB) : (typeof window.audioOpenDB === 'function' ? window.audioOpenDB() : Promise.reject(Error('Kho câu hỏi IndexedDB chưa sẵn sàng')))).then(function (db) {
      if (!db.objectStoreNames.contains('questionSets')) throw Error('Kho câu hỏi không có bảng questionSets');
      return new Promise(function (resolve, reject) { var tx = db.transaction('questionSets', 'readwrite'); tx.objectStore('questionSets').add(set); tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error || Error('Không thể lưu bộ câu hỏi')); }; tx.onabort = function () { reject(tx.error || Error('Giao dịch lưu bị hủy')); }; });
    }).then(function () {
      if (!Array.isArray(window.questionBankSets)) window.questionBankSets = [];
      window.questionBankSets.push(set);
      chooseGameQuestions(set.questions, { setId: set.id, ids: set.questions.map(function (q) { return q.id; }) });
      if (play) startNow(); else status('Đã lưu bộ mới vào Kho câu hỏi; bộ cũ không bị ghi đè.', false);
      return set;
    }).catch(function (e) { status('Lưu thất bại: ' + (e.message || 'lỗi IndexedDB') + '. Dữ liệu cũ vẫn được giữ nguyên.', true); throw e; });
  }
  function bankOptions() {
    var all = sets().slice(), selected = bankSet && setById(bankSet);
    if (!selected && all.length) bankSet = all[0].id;
    var grade = document.getElementById('c6BankGrade')?.value || 'ALL', subject = document.getElementById('c6BankSubject')?.value || 'ALL', kind = document.getElementById('c6BankKind')?.value || 'ALL';
    var query = (document.getElementById('c6BankSearch')?.value || '').toLocaleLowerCase('vi').trim();
    var game = currentGame, s = setById(bankSet), qs = s ? s.questions || [] : [];
    var items = qs.map(function (q, i) { return normalize(q, i, s); }).filter(function (q) {
      var g = String(q.grade || '').replace(/^Lớp\s*/i, '');
      return (grade === 'ALL' || g === grade) && (subject === 'ALL' || q.subject === subject) && (kind === 'ALL' || q.kind === kind) && (!query || (q.text + ' ' + q.answers.join(' ')).toLocaleLowerCase('vi').includes(query));
    });
    var list = document.getElementById('c6BankList'); if (!list) return;
    var subjectOptions = Array.from(new Set(qs.map(function (q) { return q.subject || 'Tùy chọn'; })));
    var subj = document.getElementById('c6BankSubject'); if (subj) { var old = subj.value; subj.innerHTML = '<option value="ALL">Tất cả môn</option>' + subjectOptions.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); subj.value = subjectOptions.indexOf(old) >= 0 ? old : 'ALL'; }
    list.innerHTML = '<div class="c6-bank-toolbar"><label>Bộ<select id="c6BankSet">' + all.map(function (x) { return '<option value="' + esc(x.id) + '" ' + (x.id === bankSet ? 'selected' : '') + '>' + esc(x.name || x.setTitle || x.id) + ' · ' + (x.questions || []).length + '</option>'; }).join('') + '</select></label><label>Lớp<select id="c6BankGrade"><option value="ALL">Tất cả lớp</option><option value="1">Lớp 1</option><option value="2">Lớp 2</option><option value="3">Lớp 3</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select></label><label>Môn<select id="c6BankSubject"><option value="ALL">Tất cả môn</option></select></label><label>Dạng<select id="c6BankKind"><option value="ALL">Tất cả dạng</option><option value="ABCD">A–B–C–D</option><option value="TRUEFALSE">Đúng/Sai</option><option value="ORAL">Giáo viên chấm</option></select></label><label>Tìm<input id="c6BankSearch" placeholder="Từ khóa"></label></div><div class="c6-bank-list">' + (items.length ? items.map(function (q, i) { var bad = errors(q, game); return '<label><input type="checkbox" data-bank-index="' + i + '" checked ' + (bad.length ? 'disabled' : '') + '><span><b>' + esc(q.text) + '</b><small>' + esc(q.grade + ' · ' + q.subject + ' · ' + q.kind + (bad.length ? ' · KHÔNG TƯƠNG THÍCH: ' + bad.join(', ') : '')) + '</small></span></label>'; }).join('') : '<p>Không có câu phù hợp trong bộ này.</p>') + '</div><button class="btn soft" id="c6SelectAll">Chọn tất cả câu hợp lệ (' + items.filter(function (q) { return !errors(q, game).length; }).length + ')</button><button class="btn color" id="c6UseBank">Dùng câu đã chọn (' + items.filter(function (q) { return !errors(q, game).length; }).length + ')</button>';
    var setSel = document.getElementById('c6BankSet'); if (setSel) setSel.onchange = function () { bankSet = setSel.value; bankOptions(); };
    ['c6BankGrade', 'c6BankSubject', 'c6BankKind', 'c6BankSearch'].forEach(function (id) { var e = document.getElementById(id); if (e) { if (id === 'c6BankGrade') e.value = grade; if (id === 'c6BankSubject') e.value = subject; if (id === 'c6BankKind') e.value = kind; if (id === 'c6BankSearch') e.value = query; e.oninput = function () { bankOptions(); }; } });
    var selectAll = document.getElementById('c6SelectAll'); if (selectAll) selectAll.onclick = function () { list.querySelectorAll('[data-bank-index]:not(:disabled)').forEach(function (x) { x.checked = true; }); };
    var use = document.getElementById('c6UseBank'); if (use) use.onclick = function () {
      var selected = [], ids = [];
      list.querySelectorAll('[data-bank-index]:checked').forEach(function (x) { selected.push(items[Number(x.dataset.bankIndex)]); ids.push(items[Number(x.dataset.bankIndex)].id); });
      if (!selected.length) { status('Chọn ít nhất một câu hợp lệ.', true); return; }
      chooseGameQuestions(selected, { setId: bankSet, ids: ids }); status('Đã chọn ' + selected.length + ' câu từ Kho cho ' + gameName(currentGame) + '.', false);
    };
  }
  function openTab(name) {
    sourceTab = name;
    document.querySelectorAll('.c6-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    document.querySelectorAll('.c6-pane').forEach(function (p) { p.hidden = p.dataset.pane !== name; });
    if (name === 'bank') bankOptions();
  }
  function open() {
    currentGame = appType(); if (!currentGame) { if (window.showToast) showToast('Hãy mở một trò chơi trước.'); return; }
    var old = document.getElementById('c6QuestionModal'); if (old) old.remove(); draft = [];
    chosen = null;
    var modal = document.createElement('div'); modal.id = 'c6QuestionModal'; modal.className = 'c6-overlay';
    modal.innerHTML = '<section class="c6-card" role="dialog" aria-modal="true" aria-labelledby="c6Title"><header class="c6-head"><div><h2 id="c6Title">🧩 Câu hỏi cho lượt chơi</h2><p>' + esc(gameName(currentGame)) + ' · câu hỏi không phù hợp sẽ được báo rõ</p></div><button class="btn soft" data-close>Đóng</button></header><nav class="c6-tabs"><button class="c6-tab active" data-tab="paste">📋 Dán câu hỏi</button><button class="c6-tab" data-tab="file">⬆ Tải tệp</button><button class="c6-tab" data-tab="bank">📚 Chọn từ Kho</button></nav><div class="c6-meta"><label>Lớp<select id="c6Grade"><option>Lớp 1</option><option>Lớp 2</option><option>Lớp 3</option><option selected>Lớp 4</option><option>Lớp 5</option></select></label><label>Môn<input id="c6Subject" value="Toán"></label><label>Bài/chủ đề<input id="c6Topic" value="Lượt chơi nhanh"></label></div><section class="c6-pane" data-pane="paste"><p>Hỗ trợ câu hỏi A–D, Đúng/Sai và “Dạng: Giáo viên chấm”. Mỗi câu bắt đầu bằng “Câu 1:”. Đáp án không rõ sẽ không được tự đoán.</p><textarea id="c6Paste" placeholder="Câu 1: 3 + 2 = ?&#10;A. 4&#10;B. 5&#10;C. 6&#10;D. 7&#10;Đáp án: B&#10;&#10;Câu 2: Số 12 là số chẵn.&#10;Đáp án: Đúng"></textarea><button class="btn color" id="c6Parse">Xem trước và kiểm tra</button></section><section class="c6-pane" data-pane="file" hidden><p>Đọc trực tiếp offline: TXT, CSV, JSON. XLSX, DOCX và PDF chưa được kiểm chứng offline trong gói này; hãy xuất sang TXT/CSV để tránh phụ thuộc CDN.</p><input id="c6File" type="file" accept=".txt,.csv,.json,.xlsx,.docx,.pdf,text/plain,text/csv,application/json"><input type="hidden" id="c6FileExt" value="txt"><button class="btn color" id="c6ParseFile">Đọc và xem trước</button><p id="c6FileNote" class="c6-status"></p></section><section class="c6-pane" data-pane="bank" hidden><div id="c6BankList"></div></section><div id="c6Preview" class="c6-preview"><p>Dán nội dung hoặc chọn câu trong Kho để bắt đầu.</p></div><footer class="c6-foot"><span id="c6Status" class="c6-status">Chưa lưu. Bản gốc trong Kho không bị sửa.</span><label class="c6-save-choice"><input id="c6SaveToBank" type="checkbox"> Lưu thành bộ mới trong Kho (không ghi đè bộ cũ)</label><button class="btn soft" id="c6UseThis">Dùng cho lượt này</button><button class="btn soft" id="c6SaveBank">Lưu bộ vào Kho</button><button class="btn color" id="c6SavePlay">Lưu và chơi ngay</button></footer></section>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { openTab(b.dataset.tab); }; });
    modal.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = close; });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#c6Parse').onclick = parseAndPreview;
    modal.querySelector('#c6File').onchange = function () { var f = this.files && this.files[0]; if (!f) return; var ext = f.name.split('.').pop().toLowerCase(); document.getElementById('c6FileExt').value = ext; document.getElementById('c6FileNote').textContent = ext === 'txt' || ext === 'csv' || ext === 'json' ? 'Đã chọn ' + f.name : 'Chưa hỗ trợ bộ đọc offline cho .' + ext + '. Chưa đọc hoặc lưu nội dung tệp.'; };
    modal.querySelector('#c6ParseFile').onclick = function () { var f = modal.querySelector('#c6File').files[0]; if (!f) { status('Hãy chọn tệp trước.', true); return; } var ext = f.name.split('.').pop().toLowerCase(); if (!['txt', 'csv', 'json'].includes(ext)) { status('Tệp .' + ext + ' chưa có bộ đọc offline; không có dữ liệu nào được lưu.', true); return; } var reader = new FileReader(); reader.onload = function () { modal.querySelector('#c6Paste').value = reader.result; document.getElementById('c6FileExt').value = ext; parseAndPreview(); openTab('file'); }; reader.onerror = function () { status('Không đọc được tệp; nội dung chưa bị thay đổi.', true); }; reader.readAsText(f, 'utf-8'); };
    modal.querySelector('#c6UseThis').onclick = function () { var q = draft.length ? selectedDraft() : (chosen && chosen.length ? chosen : null); if (!q) { status('Dán câu hỏi hoặc chọn câu từ Kho trước.', true); return; } chooseGameQuestions(typeFilter(q, currentGame), null); if (session[currentGame]) close(); };
    modal.querySelector('#c6SaveBank').onclick = function () { var q = selectedDraft(); if (!q) return; saveSet(q, false).then(close).catch(function () {}); };
    modal.querySelector('#c6SavePlay').onclick = function () {
      var q = draft.length ? selectedDraft() : (chosen && chosen.length ? chosen : null); if (!q) { status('Dán câu hỏi hoặc chọn câu từ Kho trước.', true); return; }
      if (modal.querySelector('#c6SaveToBank').checked) saveSet(q, true).then(close).catch(function () {});
      else { if (!chooseGameQuestions(q, null)) return; startNow(); }
    };
    openTab(sourceTab);
  }
  function close() { var m = document.getElementById('c6QuestionModal'); if (m) m.remove(); }
  function gameInProgress(type) {
    var selectors = { tug: '.tug-game .tug-question', millionaire: '#millionaireTimer', lens: '.lens-board .lens-answer', tiles: '.flip-layout .flip-question', balloon: '#bbStage', poll: '#bcStage', 'magic-hand': '#mhStage', 'raise-hand': '#rhStage', gift: '.gift-question', race: '.race-question', buzzer: '.buzz-status' };
    return !!(selectors[type] && document.querySelector(selectors[type]));
  }
  function startNow() {
    var type = currentGame;
    if (type === 'head-tilt' || type === 'paper-mode') { close(); /* 7B-FIX1: mở luôn màn hình của trò, không để giáo viên phải tự tìm trong thư viện. */ if ((!window.classroomGame || window.classroomGame.type !== type) && typeof window.gameSetup === 'function') window.gameSetup(type); if (window.showToast) showToast(type === 'head-tilt' ? 'Đã gắn bộ câu hỏi. Bấm ▶ Bắt đầu để chơi.' : 'Câu hỏi đã gắn. Hoàn tất hiệu chỉnh thẻ trong thiết lập trước khi bắt đầu.'); return; }
    if (window.classroomGame && window.classroomGame.type === type && gameInProgress(type)) {
      if (!confirm('Bắt đầu lại ván với bộ câu hỏi mới? Tiến trình ván hiện tại sẽ kết thúc.')) return;
      var backs = { balloon: 'balloonBack', poll: 'pollBack', 'magic-hand': 'magicHandBack', 'raise-hand': 'raiseHandBack', tug: 'tugBack', gift: 'giftBack', buzzer: 'buzzBack', race: 'raceBack', tiles: 'flipBack', lens: 'lensBack' };
      if (backs[type] && typeof window[backs[type]] === 'function') window[backs[type]](); else if (typeof window.gameBack === 'function') window.gameBack();
      if (typeof window.gameSetup === 'function') window.gameSetup(type);
    } else if (!window.classroomGame || window.classroomGame.type !== type) {
      if (typeof window.gameSetup === 'function') window.gameSetup(type);
    }
    close();
    setTimeout(function () {
      var starts = { tug: function () { window.gameStart && window.gameStart(); }, millionaire: function () { window.gameStart && window.gameStart(); }, lens: function () { window.lensStart && window.lensStart(); }, tiles: function () { window.flipStart && window.flipStart(); }, gift: function () { window.giftStart && window.giftStart(); }, race: function () { window.raceStart && window.raceStart(); }, buzzer: function () { window.buzzStart && window.buzzStart(); } };
      try { if (starts[type]) starts[type](); else if (window.gameStart) window.gameStart(); }
      catch (e) { console.error('[C6 Quick Questions]', e); if (window.showToast) showToast('Không thể bắt đầu. Bộ câu hỏi đã được giữ lại.'); }
    }, 50);
  }
  function gear() {
    var root = document.getElementById('games'), type = appType(); if (!type) { session = Object.create(null); chosen = null; return; } if (!root) return;
    var title = root.querySelector('.page-title, .tug-head, .lens-head, .game-play-head'); if (!title) return;
    if (title.querySelector('.c6-question-gear')) return;
    var button = document.createElement('button'); button.type = 'button'; button.className = 'btn soft c6-question-gear'; button.title = 'Câu hỏi cho lượt chơi'; button.setAttribute('aria-label', 'Câu hỏi cho lượt chơi'); button.textContent = '⚙ Câu hỏi'; button.onclick = open;
    var toolbar = title.querySelector('.toolbar'); if (toolbar) toolbar.prepend(button); else title.appendChild(button);
  }
  var observer = new MutationObserver(function () { gear(); });
  function boot() {
    var root = document.getElementById('games'); if (root) observer.observe(root, { childList: true, subtree: true });
    gear();
    if (window.questionBankSets && !Array.isArray(window.questionBankSets)) window.questionBankSets = [];
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('c6QuestionModal')) close(); });
  }
  window.hmvC6PlayBankSet = function (type, setId, ids) {
    var set = setById(setId);
    if (!set) return { ok: false, reason: 'Không tìm thấy bộ câu hỏi đã chọn.' };
    var wanted = Array.isArray(ids) ? ids.map(String) : [], candidates = (set.questions || []).filter(function (q) { return !wanted.length || wanted.indexOf(String(q.id)) >= 0; });
    var list = candidates.map(function (q, i) { return normalize(forGame(q), i, set); }).filter(function (q) { return !errors(q, type).length; });
    if (!list.length) return { ok: false, reason: 'Bộ này chưa có câu hợp lệ cho ' + gameName(type) + '.' };
    /* 7B-FIX1: đang mở một trò khác thì thoát trò đó bằng chính nút "Về thư viện" của nó để dừng timer/âm thanh. */
    var active = window.classroomGame && window.classroomGame.type;
    if (active && active !== type) { try { var backBtn = Array.from(document.querySelectorAll('#games button')).find(function (b) { return /Về thư viện|←\s*Thư viện/.test(b.textContent || ''); }); if (backBtn) backBtn.click(); else if (typeof window.gameBack === 'function') window.gameBack(); } catch (_) {} }
    currentGame = type;
    chooseGameQuestions(list, { setId: set.id, ids: list.map(function (q) { return q.id; }) });
    if (typeof window.openView === 'function') window.openView('games');
    if (typeof window.questionBankOpen !== 'undefined') window.questionBankOpen = false;
    startNow();
    return { ok: true, count: list.length, total: candidates.length, needsSetup: type === 'head-tilt' };
  };
  /* BAN-CHINH 2.18: chọn bộ câu hỏi từ màn hình trò chơi (hai chiều với Kho → Chơi ngay). Chỉ gắn bộ, không tự bắt đầu. */
  function usableList(type, setId, ids) {
    var set = setById(setId); if (!set) return { set: null, list: [], total: 0 };
    var wanted = Array.isArray(ids) ? ids.map(String) : [], candidates = (set.questions || []).filter(function (q) { return !wanted.length || wanted.indexOf(String(q.id)) >= 0; });
    var list = candidates.map(function (q, i) { return normalize(forGame(q), i, set); }).filter(function (q) { return !errors(q, type).length; });
    return { set: set, list: list, total: candidates.length };
  }
  window.hmvC6UsableCount = function (type, setId) { var u = usableList(type, setId); return { count: u.list.length, total: u.total }; };
  window.hmvC6SelectBankSet = function (type, setId, ids) {
    var u = usableList(type, setId, ids);
    if (!u.set) return { ok: false, reason: 'Không tìm thấy bộ câu hỏi đã chọn.' };
    if (!u.list.length) return { ok: false, reason: 'Bộ này chưa có câu hợp lệ cho ' + gameName(type) + '.' };
    var keep = currentGame; currentGame = type;
    chooseGameQuestions(u.list, { setId: u.set.id, ids: u.list.map(function (q) { return q.id; }) });
    currentGame = keep || type;
    return { ok: true, count: u.list.length, total: u.total, name: u.set.name || u.set.setTitle || '' };
  };
  window.hmvC6ClearSelection = function (type) {
    if (!type) return; delete session[type];
    if (saved[type]) { delete saved[type]; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {} }
  };
  window.hmvC6Selection = function (type) {
    var cfg = saved[type], list = activeQuestions(type);
    if (!list) return null;
    var s = cfg && cfg.setId ? setById(cfg.setId) : null;
    return { setId: s ? s.id : '', name: s ? (s.name || s.setTitle || '') : 'Câu hỏi vừa chọn', count: list.length };
  };
  window.hmvC6ParseQuestions = parse;
  window.hmvC6QuestionErrors = errors;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
