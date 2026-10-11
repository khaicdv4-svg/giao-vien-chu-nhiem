/* Stage 7 local-first question bank importer. No network requests or CDN readers. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var TYPES = ['SINGLE', 'TRUEFALSE', 'MULTI', 'MATCHING', 'FILL', 'SHORT', 'OPEN'];
  var LABELS = { SINGLE: 'Trắc nghiệm một đáp án', TRUEFALSE: 'Đúng/Sai', MULTI: 'Trắc nghiệm nhiều đáp án', MATCHING: 'Ghép đôi', FILL: 'Điền khuyết', SHORT: 'Trả lời ngắn', OPEN: 'Câu hỏi mở' };
  function clean(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/đ/g, 'd').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' '); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function csvRows(raw, delimiter) {
    var rows = [], row = [], cell = '', quoted = false, s = String(raw || '').replace(/^\uFEFF/, '');
    delimiter = delimiter || (s.split('\n')[0].indexOf('\t') >= 0 ? '\t' : s.split('\n')[0].indexOf(';') >= 0 ? ';' : ',');
    for (var i = 0; i < s.length; i++) { var c = s[i]; if (c === '"' && s[i + 1] === '"' && quoted) { cell += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === delimiter && !quoted) { row.push(cell.trim()); cell = ''; } else if (c === '\n' && !quoted) { row.push(cell.trim()); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
    if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  function keyIndexes(v, labels) {
    var s = String(v || '').trim(); if (!s) return [];
    var parts = s.split(/\s*[,;|/]\s*|\s+và\s+/i).map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
    return parts.map(function (x) { var n = labels.indexOf(x); return n >= 0 ? n : -1; });
  }
  function parseKey(text, labels, kind) {
    var s = String(text || '').trim().normalize('NFC'), low = s.toLocaleLowerCase('vi');
    if (kind === 'TRUEFALSE') { var tf = tfValue(s); if (tf !== null) return { indexes: [tf], valid: true }; if (/^(1|có|co)$/i.test(low)) return { indexes: [0], valid: true }; if (/^(0|không|khong)$/i.test(low)) return { indexes: [1], valid: true }; }
    var ix = keyIndexes(s, labels);
    if (ix.length && ix.every(function (n) { return n >= 0; })) return { indexes: Array.from(new Set(ix)), valid: true };
    return { indexes: [], valid: false };
  }
  /* 7B-FIX1: "Đ", "S", "Đúng." … đều là khóa Đúng/Sai hợp lệ. Trả 0 = Đúng, 1 = Sai, null = không phải. */
  function tfValue(v) {
    var s = String(v == null ? '' : v).normalize('NFC').trim().replace(/[\s.;,!]+$/, '').toLocaleLowerCase('vi');
    if (/^(đúng|dung|đ|true|t)$/.test(s)) return 0;
    if (/^(sai|s|false|f)$/.test(s)) return 1;
    return null;
  }
  /* 7B-FIX1: tách "A. … B. … C. … D. …" viết trên cùng một dòng. Chỉ tách theo đúng thứ tự A, B, C… viết hoa. */
  function splitInlineOptions(line) {
    var s = String(line == null ? '' : line), marks = [], re = /(^|[\s\t])([A-J])\s?[.)]\s+/g, m, lead = s.match(/^\s*([A-J])\s?[.)]\s+/), expect = lead ? lead[1].charCodeAt(0) - 65 : 0;
    while ((m = re.exec(s))) { if (m[2].charCodeAt(0) - 65 === expect) { marks.push(m.index + m[1].length); expect++; } }
    if (marks.length < 2) return [s];
    var leading = !s.slice(0, marks[0]).trim();
    if (!leading && marks.length < 3) return [s];
    var parts = leading ? [] : [s.slice(0, marks[0])];
    marks.forEach(function (at, i) { parts.push(s.slice(at, i + 1 < marks.length ? marks[i + 1] : s.length)); });
    return parts.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /* 7B-FIX1: chỉ nhận môn khi dòng tiêu đề ghi rõ "Môn X" hoặc "X lớp N"; nhiều hơn một môn thì không đoán. */
  var SUBJECTS = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Lịch sử và Địa lí', 'Tự nhiên và Xã hội', 'Đạo đức', 'Tin học', 'Công nghệ', 'Âm nhạc', 'Mĩ thuật', 'Giáo dục thể chất', 'Hoạt động trải nghiệm'];
  function subjectFromHeading(lines) {
    var found = [];
    (lines || []).forEach(function (raw) {
      var c = ' ' + clean(raw) + ' ';
      SUBJECTS.forEach(function (name) { var k = clean(name); if ((c.indexOf(' mon ' + k + ' ') >= 0 || new RegExp(' ' + k + ' (?:lop|khoi) [1-5] ').test(c)) && found.indexOf(name) < 0) found.push(name); });
    });
    return found.length === 1 ? found[0] : '';
  }
  var ANSWER_RE = /^(?:đáp\s*án(?:\s*đúng)?|answer|khóa\s*đáp\s*án|đáp\s*án\s*ngắn)\s*[:：]/i;
  function metaLine(line, meta) {
    var m = line.match(/^(năm học|khối|lớp|môn(?: học)?|chủ đề|bài(?: học)?|mức độ|độ khó|nguồn)\s*[:：]\s*(.*?)\s*$/i);
    if (!m) return false;
    var k = clean(m[1]), key = k.indexOf('nam hoc') === 0 ? 'schoolYear' : k === 'khoi' || k === 'lop' ? 'grade' : k.indexOf('mon') === 0 ? 'subject' : k === 'chu de' ? 'topic' : k.indexOf('bai') === 0 ? 'lesson' : k === 'muc do' || k === 'do kho' ? 'difficulty' : 'source';
    meta[key] = m[2].trim(); return true;
  }
  function defaultsMeta() { return { schoolYear: 'Chưa xác định năm học', grade: 'Chưa xác định lớp', subject: 'Chưa xác định môn', topic: 'Chưa xác định chủ đề', lesson: 'Chưa xác định bài học', difficulty: 'Chưa xác định mức độ', source: 'Chưa rõ nguồn' }; }
  function knownMeta(v) { return !!v && !/^chưa (?:phân loại|xác định|rõ)/i.test(String(v).trim()); }
  function makeQuestion(block, globalMeta, index) {
    var meta = Object.assign(defaultsMeta(), globalMeta || {}), lines = [], prompt = [], options = [], pairs = [], extra = [], keyLine = '', hasKeyLine = false, answerText = '', explicit = '', currentOption = -1, errors = [];
    block.forEach(function (raw) { splitInlineOptions(String(raw == null ? '' : raw).trim()).forEach(function (x) { lines.push(x); }); });
    lines.forEach(function (raw) {
      var line = String(raw || '').trim(); if (!line) return;
      line = line.replace(/^câu\s*\d+\s*[:.)-]?\s*/i, ''); if (!line) return;
      if (metaLine(line, meta)) return;
      var typ = line.match(/^dạng\s*[:：]\s*(.+)$/i); if (typ) { explicit = clean(typ[1]); return; }
      var ans = line.match(/^(?:đáp\s*án(?:\s*đúng)?|answer|khóa\s*đáp\s*án|đáp\s*án\s*ngắn)\s*[:：]\s*(.*?)\s*$/i);
      if (ans) { keyLine = ans[1]; hasKeyLine = true; if (/đáp\s*án\s*ngắn/i.test(line)) explicit = 'tra loi ngan'; currentOption = -1; return; }
      var note = line.match(/^(?:giải\s*thích|lời\s*giải|hướng\s*dẫn\s*giải)\s*[:：]\s*(.+)$/i); if (note) { extra.push(note[1].trim()); currentOption = -1; return; }
      var pair = line.match(/^(?:cặp\s*)?(.+?)\s*(?:=>|↔|⇔|→|\s=\s)\s*(.+)$/);
      if (pair && (explicit.indexOf('ghep') >= 0 || /^cặp\s/i.test(line))) { pairs.push({ left: pair[1].replace(/^cặp\s*[:：]?\s*/i, '').trim(), right: pair[2].trim() }); currentOption = -1; return; }
      var op = line.match(/^([A-J])\s*[.)\]:：-]\s*(.*?)\s*$/i);
      if (op) { currentOption = op[1].toUpperCase().charCodeAt(0) - 65; options[currentOption] = op[2]; return; }
      var gap = line.match(/^(?:điền\s*(?:vào\s*)?(?:chỗ\s*)?(?:trống)?|từ\s*cần\s*điền)\s*[:：]\s*(.+)$/i);
      if (gap) { answerText = gap[1].trim(); explicit = 'dien khuyet'; currentOption = -1; return; }
      /* 7B-FIX1: dòng nằm sau dòng "Đáp án" không thuộc nội dung câu hỏi (vd. "--- HẾT ---"). */
      if (hasKeyLine && currentOption < 0) { if (!/^[\s\-–—=*_.·•~]*(?:hết|het|the\s*end|end)?[\s\-–—=*_.·•~]*$/i.test(line)) extra.push(line); return; }
      if (currentOption >= 0) options[currentOption] = (options[currentOption] || '') + (options[currentOption] ? ' ' : '') + line;
      else prompt.push(line);
    });
    var text = prompt.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) errors.push('Thiếu nội dung câu hỏi');
    var nonemptyOptions = options.map(function (x, i) { return { label: String.fromCharCode(65 + i), text: String(x || '').trim(), index: i }; }).filter(function (x) { return x.text; });
    var labels = nonemptyOptions.map(function (x) { return x.label; });
    var tfOptions = nonemptyOptions.length === 2 && clean(nonemptyOptions[0].text) === 'dung' && clean(nonemptyOptions[1].text) === 'sai';
    var kind;
    if (explicit.indexOf('ghep') >= 0 || pairs.length) kind = 'MATCHING';
    else if (explicit.indexOf('dien') >= 0) kind = 'FILL';
    else if (explicit.indexOf('tra loi ngan') >= 0 || explicit.indexOf('ngan') >= 0) kind = 'SHORT';
    else if (explicit.indexOf('cau hoi mo') >= 0 || explicit.indexOf('giao vien cham') >= 0 || explicit.indexOf('tu luan') >= 0 || explicit.indexOf('open') >= 0) kind = 'OPEN';
    else if (explicit.indexOf('dung sai') >= 0 || explicit.indexOf('true false') >= 0 || tfOptions || (!nonemptyOptions.length && tfValue(keyLine) !== null)) kind = 'TRUEFALSE';
    else if (explicit.indexOf('nhieu dap an') >= 0) kind = 'MULTI';
    /* 7B-FIX1: có từ hai phương án trở lên thì là trắc nghiệm, kể cả khi đề có dấu "…" hay "___". */
    else if (nonemptyOptions.length >= 2) kind = 'SINGLE';
    else if (/_{2,}|\[\s*\]|\.{3,}|…/.test(text)) kind = 'FILL';
    /* 7B-FIX1: có khóa dạng chữ cái nhưng không có phương án → báo lỗi, không lặng lẽ coi là câu hỏi mở. */
    else if (/^[A-J](?:\s*[,;/|]\s*[A-J])*$/i.test(keyLine.trim())) kind = 'SINGLE';
    else kind = 'OPEN';
    if (kind === 'TRUEFALSE' && !nonemptyOptions.length) nonemptyOptions = [{ label: 'Đúng', text: 'Đúng', index: 0 }, { label: 'Sai', text: 'Sai', index: 1 }];
    var key = kind === 'FILL' || kind === 'SHORT' ? { indexes: [], valid: !!answerText || !!keyLine.trim() } : kind === 'OPEN' ? { indexes: [], valid: true } : parseKey(keyLine, labels, kind);
    if ((kind === 'FILL' || kind === 'SHORT') && !answerText) answerText = keyLine.trim();
    /* 7B-FIX1: câu hỏi mở có ghi đáp án thì giữ lại làm đáp án tham chiếu cho giáo viên. */
    if (kind === 'OPEN' && !answerText && keyLine.trim()) answerText = keyLine.trim();
    if (kind === 'SINGLE' && key.indexes.length > 1) kind = 'MULTI';
    if (kind === 'MATCHING' && !pairs.length) errors.push('Ghép đôi cần ít nhất một cặp ghi rõ bằng mũi tên hoặc “=”');
    if (kind === 'SINGLE' || kind === 'MULTI' || kind === 'TRUEFALSE') {
      if (nonemptyOptions.length < 2) errors.push('Thiếu phương án');
      if (!key.valid) errors.push('Thiếu hoặc không nhận diện được khóa đáp án');
      if (kind === 'MULTI' && key.indexes.length < 2) errors.push('Câu nhiều đáp án cần ít nhất hai khóa rõ ràng');
    }
    if ((kind === 'FILL' || kind === 'SHORT') && !answerText) errors.push('Thiếu đáp án tham chiếu');
    var seenMeta = Object.keys(meta).some(function (k) { return knownMeta(meta[k]); });
    if (kind === 'MATCHING' && pairs.length) key.valid = true;
    var answerStatus = kind === 'OPEN' ? 'Cần giáo viên chấm' : kind === 'MATCHING' && pairs.length ? 'Hợp lệ · cặp rõ' : key.valid ? (key.indexes.length > 1 ? 'Hợp lệ · nhiều đáp án' : 'Hợp lệ') : 'Thiếu';
    return { id: 'c7-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 7), text: text, question: text, kind: kind, type: kind, answers: nonemptyOptions.map(function (x) { return x.text; }), options: nonemptyOptions.map(function (x) { return x.text; }), optionLabels: nonemptyOptions.map(function (x) { return x.label; }), correct: key.indexes.length === 1 ? key.indexes[0] : null, correctAnswers: key.indexes.slice(), correctAnswer: key.indexes.map(function (i) { return nonemptyOptions[i] && nonemptyOptions[i].text; }).filter(Boolean).join(' / '), answerText: answerText, explanation: extra.join(' '), pairs: pairs, grade: meta.grade, schoolYear: meta.schoolYear, subject: meta.subject, topic: meta.topic, lesson: meta.lesson, difficulty: meta.difficulty, level: meta.difficulty, source: meta.source, answerStatus: answerStatus, reviewStatus: errors.length ? 'Cần rà soát' : kind === 'OPEN' ? 'Cần giáo viên chấm' : 'Hợp lệ', classificationStatus: seenMeta ? 'Có căn cứ từ nguồn hoặc lựa chọn giáo viên' : 'Chưa phân loại', confidence: errors.length ? 'Thấp' : kind === 'OPEN' ? 'Rà soát giáo viên' : 'Cấu trúc rõ', reviewErrors: errors, duplicate: false, selected: !errors.length };
  }
  function parseText(raw, globalMeta) {
    var text = String(raw || '').replace(/^﻿/, '').replace(/\r/g, '').trim(); if (!text) return [];
    if (/^\s*[\[{]/.test(text)) return parseJSON(text, globalMeta);
    var blocks = [], current = [], preamble = [], lines = text.split('\n'), startRe = /^\s*(?:Câu|Question)\s*\d+\s*[:.)-]?\s*/i, plainRe = /^\s*(\d{1,3})\s*[.)]\s+(?=\S)/;
    var starts = Object.create(null), numbered = false, plain = false;
    lines.forEach(function (line, i) { if (startRe.test(line)) { starts[i] = true; numbered = true; } });
    if (!numbered) {
      /* 7B-FIX1: chấp nhận cách đánh số "1." "2)" khi số tăng liên tục từ 1. */
      var expect = 1, hits = [];
      lines.forEach(function (line, i) { var m = line.match(plainRe); if (m && Number(m[1]) === expect) { hits.push(i); expect++; } });
      if (hits.length >= 2) { hits.forEach(function (i) { starts[i] = true; }); numbered = plain = true; }
    }
    if (numbered) {
      lines.forEach(function (line, i) { if (starts[i]) { if (current.length) blocks.push(current); current = [plain ? line.replace(plainRe, '') : line]; } else if (current.length) current.push(line); else preamble.push(line); });
      if (current.length) blocks.push(current);
    } else {
      blocks = text.split(/\n\s*\n+/).map(function (b) { return b.split('\n'); });
      /* 7B-FIX1: khối đầu không có đáp án/phương án trong khi các khối sau đều có → đó là tiêu đề, không phải câu hỏi. */
      var keyed = function (b) { return b.some(function (x) { var t = x.trim(); return ANSWER_RE.test(t) || /^[A-J]\s*[.)]\s*\S/.test(t) || /^(?:dạng|cặp)\s*[:：]/i.test(t); }); };
      if (blocks.length > 1 && !keyed(blocks[0])) { var rest = blocks.slice(1); if (rest.filter(keyed).length >= Math.ceil(rest.length * 0.8)) { preamble = blocks[0]; blocks = rest; } }
    }
    var inherited = Object.assign(defaultsMeta(), globalMeta || {}), inferredSubject = '';
    preamble.forEach(function (line) { metaLine(line.trim(), inherited); });
    if (!knownMeta(inherited.subject)) { inferredSubject = subjectFromHeading(preamble); if (inferredSubject) inherited.subject = inferredSubject; }
    blocks = blocks.filter(function (b) { var actual=b.filter(function(x){return x.trim();}), meaningful = actual.some(function (x) { return /^(?:câu|question)\s*\d+/i.test(x.trim()) || /^[A-J]\s*[.)]/i.test(x.trim()) || /^(?:dạng|đáp án|answer|đáp án ngắn|cặp)\s*[:：]/i.test(x.trim()); }); if (!actual.length) return false; if (!meaningful && actual.every(function (x) { return /^(?:năm học|lớp|khối|môn|chủ đề|bài|mức độ|nguồn)\s*[:：]/i.test(x.trim()); })) { actual.forEach(function (x) { metaLine(x.trim(), inherited); }); return false; } return true; });
    var out = blocks.map(function (b, i) { return makeQuestion(b, inherited, i); });
    out.inferredSubject = inferredSubject;
    return out;
  }
  function parseJSON(raw, globalMeta) {
    var obj = JSON.parse(raw), arr = Array.isArray(obj) ? obj : obj && (obj.questions || obj.items); if (!Array.isArray(arr)) throw Error('JSON cần là mảng câu hỏi hoặc có trường questions/items');
    return arr.slice(0, 501).map(function (item, i) {
      var meta = Object.assign(defaultsMeta(), globalMeta || {}); ['schoolYear','grade','subject','topic','lesson','difficulty','source'].forEach(function (k) { if (item[k]) meta[k] = String(item[k]); });
      var kind = String(item.kind || item.type || '').toUpperCase(); var typeMap = { ABCD: 'SINGLE', MULTIPLE: 'MULTI', MULTISELECT: 'MULTI', TRUE_FALSE: 'TRUEFALSE', PAIRS: 'MATCHING', FILL_IN: 'FILL', SHORT_ANSWER: 'SHORT', ESSAY: 'OPEN' }; kind = typeMap[kind] || kind;
      var answers = Array.isArray(item.answers) ? item.answers : Array.isArray(item.options) ? item.options : [], keyText = item.answerKey ?? item.correctAnswer ?? item.correctAnswers ?? item.correct;
      if (kind === 'OPEN') return makeQuestion(['Dạng: Câu hỏi mở', item.text || item.question || ''], meta, i);
      if (kind === 'MATCHING' || item.pairs) return makeQuestion(['Dạng: Ghép đôi', item.text || item.question || '', ...(item.pairs || []).map(function (p) { return 'Cặp: ' + (p.left || p[0]) + ' => ' + (p.right || p[1]); })], meta, i);
      if (kind === 'FILL' || kind === 'SHORT') return makeQuestion(['Dạng: ' + (kind === 'FILL' ? 'Điền khuyết' : 'Trả lời ngắn'), item.text || item.question || '', 'Đáp án: ' + (item.answerText || keyText || '')], meta, i);
      var labels = answers.map(function (_, j) { return String.fromCharCode(65 + j); }), keys = Array.isArray(keyText) ? keyText.map(function (v) { return Number.isInteger(v) ? String.fromCharCode(65 + v) : String(v); }).join(',') : typeof keyText === 'number' ? (kind === 'TRUEFALSE' ? (keyText === 0 ? 'Đúng' : 'Sai') : String.fromCharCode(65 + keyText)) : String(keyText || '');
      var block = ['Câu ' + (i + 1) + ': ' + (item.text || item.question || '')].concat(answers.map(function (a, j) { return labels[j] + '. ' + a; }), ['Đáp án: ' + keys]);
      if (kind === 'TRUEFALSE') block.unshift('Dạng: Đúng/Sai'); else if (kind === 'MULTI') block.unshift('Dạng: Trắc nghiệm nhiều đáp án');
      return makeQuestion(block, meta, i);
    });
  }
  function parseCSV(raw, globalMeta) {
    var rows = csvRows(raw); if (!rows.length) return [];
    var headers = rows[0].map(clean), hasHeader = headers.some(function (h) { return /^(cau hoi|noi dung|question|text)$/.test(h); });
    if (!hasHeader) return parseText(raw.replace(/\t/g, ' | '), globalMeta);
    var data = rows.slice(1), find = function (re) { return headers.findIndex(function (h) { return re.test(h); }); };
    var qi = find(/^(cau hoi|noi dung|question|text)$/), keyi = find(/^(dap an dung|dap an|answer|answer key|correct answer|khoa dap an|dap an tham chieu|dap an ngan)$/), typei = find(/^(dang|loai|type|kind)$/), gi = find(/^(lop|khoi|grade)$/), si = find(/^(mon|mon hoc|subject)$/), ti = find(/^(chu de|bai hoc|topic|lesson)$/), li = find(/^(muc do|do kho|difficulty|level)$/), srci = find(/^(nguon|source)$/), pairi = find(/^(cap|pair|pairs|ghep doi)$/);
    var optIndexes = headers.map(function (h, i) { return /^[a-j]$/.test(h) ? i : /^dap an [a-j]$/.test(h) ? i : -1; }).filter(function (i) { return i >= 0; }).slice(0, 10);
    return data.map(function (row, i) { var meta = Object.assign({}, globalMeta || {}); if (row[gi]) meta.grade = row[gi]; if (row[si]) meta.subject = row[si]; if (row[ti]) meta.topic = meta.lesson = row[ti]; if (row[li]) meta.difficulty = row[li]; if (row[srci]) meta.source = row[srci]; var block = ['Câu ' + (i + 1) + ': ' + (row[qi] || '')]; optIndexes.forEach(function (col, j) { if (row[col]) block.push(String.fromCharCode(65 + j) + '. ' + row[col]); }); var type = clean(row[typei] || ''); if (/dung sai|true false/.test(type)) block.unshift('Dạng: Đúng/Sai'); else if (/nhieu dap an|multiple/.test(type)) block.unshift('Dạng: Trắc nghiệm nhiều đáp án'); else if (/ghep doi|matching/.test(type) || pairi >= 0) block.unshift('Dạng: Ghép đôi'); else if (/dien khuyet|fill/.test(type)) block.unshift('Dạng: Điền khuyết'); else if (/tra loi ngan|short/.test(type)) block.unshift('Dạng: Trả lời ngắn'); else if (/cau hoi mo|open/.test(type)) block.unshift('Dạng: Câu hỏi mở'); if (row[keyi]) block.push('Đáp án: ' + row[keyi]); if (pairi >= 0 && row[pairi]) String(row[pairi]).split(/\s*[|;\n]\s*/).forEach(function (p) { if (p.trim()) block.push('Cặp: ' + p); }); return makeQuestion(block, meta, i); });
  }
  /* BAN-CHINH: khóa so trùng giữ nguyên dấu phép tính, để "25 + 15" và "25 − 15" không bị coi là một câu. */
  function dupKey(v) { return String(v == null ? '' : v).normalize('NFC').toLocaleLowerCase('vi').replace(/[“”"'`]/g, '').replace(/\s+/g, ' ').replace(/[\s.?!:;…]+$/, '').trim(); }
  function duplicates(items, existing) {
    var seen = Object.create(null); (existing || []).forEach(function (q) { seen[dupKey(q.text || q.question)] = true; });
    items.forEach(function (q) { var k = dupKey(q.text); q.duplicate = !!k && !!seen[k]; if (k) seen[k] = true; }); return items;
  }
  function classify(items) { return items.map(function (q) { q.classificationStatus = [q.grade,q.subject,q.topic,q.lesson,q.difficulty,q.source].some(knownMeta) ? 'Có căn cứ đã nhập' : 'Cần bổ sung phân loại'; q.answerStatus = q.kind === 'OPEN' ? 'Cần giáo viên chấm' : (q.reviewErrors && q.reviewErrors.length ? (q.reviewErrors.some(function (e) { return /đáp án|khóa/i.test(e); }) ? 'Thiếu' : 'Cần rà soát') : (q.kind === 'MULTI' ? 'Hợp lệ · nhiều đáp án' : q.kind === 'MATCHING' ? 'Hợp lệ · cặp rõ' : 'Hợp lệ')); return q; }); }
  async function unzipEntry(buffer, wanted) {
    var b = new Uint8Array(buffer), dv = new DataView(buffer), end = -1;
    for (var p = b.length - 22; p >= Math.max(0, b.length - 65558); p--) if (dv.getUint32(p, true) === 0x06054b50) { end = p; break; }
    if (end < 0) throw Error('Tệp ZIP/DOCX/XLSX bị lỗi hoặc không hợp lệ');
    var count = dv.getUint16(end + 10, true), off = dv.getUint32(end + 16, true), entry = null;
    for (var i = 0; i < count; i++) { if (dv.getUint32(off, true) !== 0x02014b50) throw Error('Bảng thư mục ZIP không hợp lệ'); var method = dv.getUint16(off + 10, true), size = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lo = dv.getUint32(off + 42, true), name = new TextDecoder().decode(b.slice(off + 46, off + 46 + nl)); if (name === wanted) { entry = { method: method, size: size, local: lo, nameLength: dv.getUint16(lo + 26, true), extraLength: dv.getUint16(lo + 28, true) }; break; } off += 46 + nl + el + cl; }
    if (!entry) return null; if (dv.getUint32(entry.local, true) !== 0x04034b50) throw Error('Đầu mục ZIP không hợp lệ'); var start = entry.local + 30 + entry.nameLength + entry.extraLength, compressedSize = dv.getUint32(off + 20, true), bytes = b.slice(start, start + compressedSize);
    if (entry.method === 0) return new TextDecoder().decode(bytes);
    if (entry.method !== 8 || typeof DecompressionStream === 'undefined') throw Error('Trình duyệt không hỗ trợ giải nén cục bộ cho định dạng này');
    try { var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); var out = await new Response(stream).arrayBuffer(); return new TextDecoder().decode(out); } catch (_) { throw Error('Không giải nén được tệp Office cục bộ'); }
  }
  function xmlDoc(raw) { var doc = new DOMParser().parseFromString(raw, 'application/xml'); if (doc.querySelector('parsererror')) throw Error('Tệp Office có XML không hợp lệ'); return doc; }
  async function readDocx(buffer) {
    var xml = await unzipEntry(buffer, 'word/document.xml'); if (!xml) throw Error('DOCX thiếu word/document.xml'); var doc = xmlDoc(xml), paras = Array.from(doc.getElementsByTagNameNS('*', 'p'));
    return paras.map(function (p) { var out = ''; Array.from(p.getElementsByTagNameNS('*', '*')).forEach(function (n) { var local = n.localName; if (local === 't') out += n.textContent; else if (local === 'tab') out += '\t'; else if (local === 'br' || local === 'cr') out += '\n'; }); return out; }).filter(Boolean).join('\n');
  }
  function colIndex(ref) { var m = String(ref || '').match(/^[A-Z]+/i); if (!m) return 0; return m[0].toUpperCase().split('').reduce(function (n, c) { return n * 26 + c.charCodeAt(0) - 64; }, 0) - 1; }
  async function readXlsx(buffer) {
    var wb = xmlDoc(await unzipEntry(buffer, 'xl/workbook.xml')); var relDoc = xmlDoc(await unzipEntry(buffer, 'xl/_rels/workbook.xml.rels')); var sheet = wb.getElementsByTagNameNS('*', 'sheet')[0]; if (!sheet) throw Error('XLSX không có trang tính'); var rid = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id'); var rel = Array.from(relDoc.getElementsByTagNameNS('*', 'Relationship')).find(function (x) { return x.getAttribute('Id') === rid; }); var target = rel && rel.getAttribute('Target'); if (!target) throw Error('Không xác định được trang tính XLSX'); var sheetPath = target[0] === '/' ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    var shared = [], sharedXml = await unzipEntry(buffer, 'xl/sharedStrings.xml'); if (sharedXml) shared = Array.from(xmlDoc(sharedXml).getElementsByTagNameNS('*', 'si')).map(function (si) { return Array.from(si.getElementsByTagNameNS('*', 't')).map(function (x) { return x.textContent; }).join(''); });
    var doc = xmlDoc(await unzipEntry(buffer, sheetPath)), rows = Array.from(doc.getElementsByTagNameNS('*', 'row')).map(function (r) { var cells = []; Array.from(r.getElementsByTagNameNS('*', 'c')).forEach(function (c) { var pos = colIndex(c.getAttribute('r')), v = c.getElementsByTagNameNS('*', 'v')[0], inline = Array.from(c.getElementsByTagNameNS('*', 't')).map(function (x) { return x.textContent; }).join(''), value = c.getAttribute('t') === 's' && v ? shared[Number(v.textContent)] || '' : c.getAttribute('t') === 'inlineStr' ? inline : v ? v.textContent : inline; cells[pos] = value; }); return cells.map(function (x) { return x || ''; }); });
    return rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  }
  async function readFile(file) {
    if (file.size > 20 * 1024 * 1024) throw Error('Tệp quá lớn (giới hạn 20 MB)');
    var ext = String(file.name.split('.').pop() || '').toLowerCase(), raw;
    if (['txt','csv','json'].indexOf(ext) >= 0) raw = await file.text();
    else if (ext === 'docx') raw = await readDocx(await file.arrayBuffer());
    else if (ext === 'xlsx') raw = await readXlsx(await file.arrayBuffer());
    else if (ext === 'pdf') throw Error('PDF chưa có bộ đọc văn bản offline được đóng gói. PDF scan hoặc không đọc được không được phân tích âm thầm; hãy xuất sang TXT/CSV.');
    else throw Error('Định dạng chưa hỗ trợ: .' + ext);
    if (!String(raw || '').trim()) throw Error('Tệp không có lớp văn bản đọc được');
    return { ext: ext, raw: raw };
  }
  /* BAN-CHINH: không so trùng với các bộ câu hỏi mẫu (mau-…); bộ của giáo viên phải được nhập đủ câu. */
  function allQuestions(win) { var out = Array.isArray(win.questionData) ? win.questionData.slice() : []; (win.questionBankSets || []).forEach(function (s) { if (/^mau-\d/.test(String(s.id))) return; out = out.concat(s.questions || []); }); return out; }
  function install(win) {
    var draft = [], filter = 'ALL', sourceName = '';
    if (typeof win.questionBankNormalize === 'function' && !win.questionBankNormalize._stage7Wrapped) {
      var baseNormalize = win.questionBankNormalize;
      var extendedNormalize = function (q, i) {
        var n = baseNormalize(q, i), k = q && (q.kind || q.type);
        if (TYPES.indexOf(k) < 0) return n;
        return Object.assign({}, n, q, { id: q.id || n.id, text: String(q.text || q.question || ''), question: String(q.text || q.question || ''), kind: k, type: k, answers: Array.isArray(q.answers) ? q.answers.slice(0, 10) : [], options: Array.isArray(q.answers) ? q.answers.slice(0, 10) : [], correct: Number.isInteger(q.correct) ? q.correct : null, correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers.slice() : [], pairs: Array.isArray(q.pairs) ? q.pairs.map(function (p) { return Object.assign({}, p); }) : [], answerText: q.answerText || '', answerKeyValid: !!q.answerKeyValid, schoolYear: q.schoolYear || 'Chưa phân loại', grade: q.grade || 'Chưa phân loại', subject: q.subject || 'Chưa phân loại', topic: q.topic || 'Chưa phân loại', lesson: q.lesson || 'Chưa phân loại', difficulty: q.difficulty || 'Chưa phân loại', source: q.source || 'Chưa phân loại', answerStatus: q.answerStatus || 'Cần rà soát', classificationStatus: q.classificationStatus || 'Chưa phân loại' });
      };
      extendedNormalize._stage7Wrapped = true; win.questionBankNormalize = extendedNormalize;
    }
    if (typeof win.questionBankUse === 'function' && !win.questionBankUse._stage7Guarded) {
      var baseUse = win.questionBankUse;
      var guardedUse = function () {
        var set = typeof win.questionBankCurrent === 'function' ? win.questionBankCurrent() : null;
        var unsupported = set && (set.questions || []).filter(function (q) { var kind=q.kind||q.type||'ABCD'; return !(['ABCD','SINGLE'].indexOf(kind)>=0 && Array.isArray(q.answers) && q.answers.length===4 && q.answers.every(function(a){return String(a||'').trim();}) && Number.isInteger(q.correct) && q.correct>=0 && q.correct<4); });
        if (unsupported && unsupported.length) { if (typeof win.showToast==='function') win.showToast('Bộ có '+unsupported.length+' câu chưa tương thích với cách dùng chung. Hãy chọn câu qua ⚙ Câu hỏi trong từng trò để lọc theo luật; dữ liệu gốc vẫn được giữ.'); return false; }
        return baseUse.apply(this, arguments);
      };
      guardedUse._stage7Guarded=true; win.questionBankUse=guardedUse;
    }
    function addButton() { if (win.document.querySelector('#qbStage7Import')) return; var roots = [win.document.getElementById('games'), win.document.getElementById('questions')]; for (var i = 0; i < roots.length; i++) { var r = roots[i], bar = r && r.querySelector('.qb-search-row'); if (!bar) continue; var b = win.document.createElement('button'); b.id = 'qbStage7Import'; b.type = 'button'; b.className = 'btn color'; b.textContent = '🧠 Nhập thông minh'; b.onclick = open; bar.appendChild(b); return; } }
    function open() {
      draft = []; var old = win.document.getElementById('qbStage7Modal'); if (old) old.remove(); var m = win.document.createElement('div'); m.id = 'qbStage7Modal'; m.className = 'q7-overlay';
      m.innerHTML = '<section class="q7-card" role="dialog" aria-modal="true" aria-labelledby="q7Title"><header><div><h2 id="q7Title">＋ Thêm câu hỏi vào Kho</h2><p>Dán, tải tệp hoặc nhập từng câu. Ứng dụng tự nhận dạng câu (A–B–C–D, Đúng/Sai, nhiều đáp án, điền khuyết, trả lời ngắn, ghép đôi, câu hỏi mở) và đáp án; câu chưa rõ được đánh dấu để thầy cô rà soát.</p></div><button type="button" class="btn soft" data-close>Đóng</button></header><nav><button type="button" class="active" data-source="paste">📋 Dán hàng loạt</button><button type="button" data-source="file">⬆ Tải tệp</button><button type="button" data-source="manual">✍ Thêm từng câu</button></nav><div class="q7-meta"><label>Năm học<input id="q7Year" placeholder="VD: 2026–2027"></label><label>Khối/lớp<select id="q7Grade"><option value="">Chưa xác định lớp</option><option>Lớp 1</option><option>Lớp 2</option><option>Lớp 3</option><option>Lớp 4</option><option>Lớp 5</option></select></label><label>Môn<input id="q7Subject" placeholder="VD: Toán (để trống nếu chưa rõ)"></label><label>Chủ đề<input id="q7Topic" placeholder="Để trống nếu chưa rõ"></label><label>Bài học<input id="q7Lesson" placeholder="Để trống nếu chưa rõ"></label><label>Mức độ<input id="q7Difficulty" placeholder="VD: Mức 1"></label><label>Nguồn<input id="q7Source" placeholder="VD: Đề ôn tập tuần 6"></label></div><section class="q7-pane" data-pane="paste"><textarea id="q7Raw" placeholder="Câu 1: 25 + 15 = ?&#10;A. 30&#10;B. 35&#10;C. 40&#10;D. 45&#10;Đáp án: C"></textarea><button type="button" class="btn color" id="q7Analyze">Phân tích và xem trước</button></section><section class="q7-pane" data-pane="file" hidden><p>Đọc cục bộ/offline: TXT, CSV, JSON, XLSX, DOCX. PDF chưa có bộ đọc được đóng gói; PDF scan bị từ chối rõ ràng.</p><input id="q7File" type="file" accept=".txt,.csv,.json,.xlsx,.docx,.pdf"><button type="button" class="btn color" id="q7ReadFile">Đọc tệp và xem trước</button><p id="q7FileStatus" aria-live="polite"></p></section><section class="q7-pane" data-pane="manual" hidden><button type="button" class="btn soft" id="q7AddManual">＋ Thêm câu trống vào bản xem trước</button><p>Câu hỏi mở cần giáo viên chấm; câu thiếu khóa không được tự đoán.</p></section><div class="q7-filters"><label>Lọc xem trước<select id="q7Filter"><option value="ALL">Tất cả</option><option value="VALID">Hợp lệ</option><option value="REVIEW">Cần rà soát</option><option value="DUP">Trùng lặp</option><option value="MISSING">Thiếu đáp án</option></select></label><label><input id="q7SkipDup" type="checkbox" checked> Bỏ qua câu trùng đã có hoặc trong lượt nhập</label><span id="q7Summary" aria-live="polite">Chưa phân tích.</span></div><div id="q7Preview" class="q7-preview"></div><footer><span id="q7Status" role="status">Chưa lưu. Dữ liệu chỉ được ghi khi xác nhận.</span><button type="button" class="btn soft" data-close>Hủy</button><button type="button" class="btn color" id="q7Save">Xác nhận lưu thành bộ mới</button></footer></section>';
      win.document.body.appendChild(m);
      var ctx = typeof win.getCurrentClassContext === 'function' ? win.getCurrentClassContext() : {}, currentGrade = String(ctx.currentGrade || ctx.gradeId || '').match(/^[1-5]$/);
      if (currentGrade) m.querySelector('#q7Grade').value = 'Lớp ' + currentGrade[0];
      if (ctx.currentSchoolYear) m.querySelector('#q7Year').value = ctx.currentSchoolYear;
      var bulkMeta = win.document.createElement('button'); bulkMeta.type = 'button'; bulkMeta.className = 'btn soft'; bulkMeta.textContent = 'Áp dụng phân loại trên cho tất cả câu';
      m.querySelector('.q7-filters').insertAdjacentElement('beforebegin', bulkMeta);
      bulkMeta.onclick = function () { var meta = getMeta(m); draft.forEach(function (q) { Object.keys(meta).forEach(function (key) { if (knownMeta(meta[key])) q[key] = meta[key]; }); }); classify(draft); render(m); setStatus('Đã áp dụng phân loại cho ' + draft.length + ' câu trong bản xem trước. Chưa lưu dữ liệu.', false); };
      m.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { m.remove(); }; }); m.addEventListener('click', function (e) { if (e.target === m) m.remove(); }); m.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.remove(); });
      m.querySelectorAll('[data-source]').forEach(function (b) { b.onclick = function () { m.querySelectorAll('[data-source]').forEach(function (x) { x.classList.toggle('active', x === b); }); m.querySelectorAll('[data-pane]').forEach(function (x) { x.hidden = x.dataset.pane !== b.dataset.source; }); }; });
      m.querySelector('#q7Analyze').onclick = function () { sourceName = ''; analyze(m.querySelector('#q7Raw').value); };
      m.querySelector('#q7ReadFile').onclick = async function () { var f = m.querySelector('#q7File').files[0]; if (!f) return setStatus('Chọn tệp trước.', true); sourceName = ''; setStatus('Đang đọc tệp cục bộ…'); try { var fdata = await readFile(f); sourceName = String(f.name || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100); m.querySelector('#q7Raw').value = fdata.raw; m.querySelector('#q7FileStatus').textContent = 'Đã trích xuất nội dung từ .' + fdata.ext + '; hãy kiểm tra trước khi lưu.'; analyze(fdata.raw, fdata.ext); } catch (e) { m.querySelector('#q7FileStatus').textContent = e.message; setStatus(e.message, true); } };
      m.querySelector('#q7AddManual').onclick = function () { draft.push(makeQuestion(['Dạng: Câu hỏi mở',''], getMeta(m), draft.length)); render(m); };
      m.querySelector('#q7Filter').onchange = function () { filter = this.value; render(m); }; m.querySelector('#q7SkipDup').onchange = function () { render(m); };
      m.querySelector('#q7Save').onclick = function () { save(m); };
      function setStatus(text, bad) { var e = m.querySelector('#q7Status'); e.textContent = text; e.className = bad ? 'bad' : ''; }
      function getMeta(scope) { var val = function (id, fallback) { return (scope.querySelector('#' + id).value || '').trim() || fallback; }, ctx = typeof win.getCurrentClassContext === 'function' ? win.getCurrentClassContext() : {}, grade = String(ctx.currentGrade || ctx.gradeId || '').match(/^[1-5]$/); return { schoolYear: val('q7Year', ctx.currentSchoolYear || 'Chưa xác định năm học'), grade: val('q7Grade', grade ? 'Lớp ' + grade[0] : 'Chưa xác định lớp'), subject: val('q7Subject', 'Chưa xác định môn'), topic: val('q7Topic', 'Chưa xác định chủ đề'), lesson: val('q7Lesson', 'Chưa xác định bài học'), difficulty: val('q7Difficulty', 'Chưa xác định mức độ'), source: val('q7Source', 'Chưa rõ nguồn') }; }
      function analyze(raw, ext) { try { var g = getMeta(m); draft = ext === 'csv' || ext === 'xlsx' ? parseCSV(raw, g) : parseText(raw, g); var existing = allQuestions(win); duplicates(draft, existing); classify(draft); var guessed = draft.inferredSubject, box = m.querySelector('#q7Subject'); if (guessed && box && !box.value.trim()) box.value = guessed; setStatus('Phân tích hoàn tất: nhận ' + draft.length + ' câu.' + (guessed ? ' Môn «' + guessed + '» lấy từ dòng tiêu đề; thầy cô kiểm tra lại.' : '') + (draft.some(function (q) { return q.duplicate; }) ? ' Có ' + draft.filter(function (q) { return q.duplicate; }).length + ' câu trùng với câu đã có trong bộ của thầy cô; mặc định bỏ qua, bỏ dấu chọn “Bỏ qua câu trùng” nếu muốn lưu cả.' : '') + ' Xem các câu cần rà soát trước khi xác nhận.', false); render(m); var sum = m.querySelector('.q7-filters'); if (sum && sum.scrollIntoView) sum.scrollIntoView({ block: 'start' }); } catch (e) { draft = []; setStatus(e.message || 'Không phân tích được dữ liệu.', true); render(m); } }
      function visible(q) { var err = q.reviewErrors && q.reviewErrors.length, dup = q.duplicate; return filter === 'ALL' || filter === 'VALID' && !err && !dup || filter === 'REVIEW' && (!!err || q.kind === 'OPEN') || filter === 'DUP' && dup || filter === 'MISSING' && q.answerStatus === 'Thiếu'; }
      function render(scope) {
        var host = scope.querySelector('#q7Preview'), shown = draft.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return visible(x.q); });
        var counts = { valid: 0, review: 0, dup: 0, missing: 0 }; draft.forEach(function (q) { if (q.duplicate) counts.dup++; if (q.answerStatus === 'Thiếu') counts.missing++; if (!q.reviewErrors.length && !q.duplicate && q.kind !== 'OPEN') counts.valid++; else counts.review++; });
        var byKind = {}; draft.forEach(function (q) { var k = q.kind === 'SINGLE' && q.answers.length === 4 ? 'ABCD' : q.kind; byKind[k] = (byKind[k] || 0) + 1; }); var kindText = ['ABCD'].concat(TYPES).filter(function (k) { return byKind[k]; }).map(function (k) { return (k === 'ABCD' ? 'A–B–C–D' : LABELS[k]) + ': ' + byKind[k]; }).join(' · ');
        scope.querySelector('#q7Summary').textContent = 'Nhận ' + draft.length + ' · hợp lệ ' + counts.valid + ' · rà soát ' + counts.review + ' · trùng ' + counts.dup + ' · thiếu đáp án ' + counts.missing + (kindText ? '  —  Tự phân loại: ' + kindText : '');
        host.innerHTML = shown.length ? '<div class="q7-table-wrap"><table><thead><tr><th>Chọn</th><th>STT / nội dung câu hỏi</th><th>Dạng · đáp án</th><th>Lớp · môn · chủ đề / bài</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + shown.map(function (x) { var q=x.q,i=x.i, answer=q.kind==='OPEN'?'Giáo viên chấm':q.kind==='MATCHING'?q.pairs.length+' cặp':q.kind==='FILL'||q.kind==='SHORT'?q.answerText:q.correctAnswers.map(function (j) { return q.optionLabels[j] || String.fromCharCode(65+j); }).join(', ') || '—'; var stat=(q.reviewErrors||[]).concat(q.duplicate?['Trùng lặp']:[]); return '<tr data-q7-row="'+i+'"><td><input type="checkbox" data-pick="'+i+'" '+(q.selected?'checked':'')+'></td><td><b>Câu '+(i+1)+'</b><textarea data-field="text" data-i="'+i+'">'+esc(q.text)+'</textarea></td><td><select data-field="kind" data-i="'+i+'">'+TYPES.map(function(t){return '<option value="'+t+'" '+(q.kind===t?'selected':'')+'>'+LABELS[t]+'</option>';}).join('')+'</select><small>'+esc(answer)+'</small><textarea data-field="answers" data-i="'+i+'" aria-label="Phương án, mỗi dòng một dòng">'+esc(q.answers.join('\n'))+'</textarea><input data-field="key" data-i="'+i+'" placeholder="Khóa A,C (nếu có)" value="'+esc(q.correctAnswers.map(function(j){return q.optionLabels[j]||String.fromCharCode(65+j);}).join(','))+'"><input data-field="answerText" data-i="'+i+'" placeholder="Đáp án tham chiếu" value="'+esc(q.answerText||'')+'"><textarea data-field="pairs" data-i="'+i+'" placeholder="Cặp trái => phải (mỗi dòng)">'+esc(q.pairs.map(function(p){return p.left+' => '+p.right;}).join('\n'))+'</textarea></td><td><input data-meta="schoolYear" data-i="'+i+'" value="'+esc(q.schoolYear)+'" aria-label="Năm học"><input data-meta="grade" data-i="'+i+'" value="'+esc(q.grade)+'" aria-label="Lớp"><input data-meta="subject" data-i="'+i+'" value="'+esc(q.subject)+'" aria-label="Môn"><input data-meta="topic" data-i="'+i+'" value="'+esc(q.topic)+'" aria-label="Chủ đề"><input data-meta="lesson" data-i="'+i+'" value="'+esc(q.lesson)+'" aria-label="Bài học"><input data-meta="difficulty" data-i="'+i+'" value="'+esc(q.difficulty)+'" aria-label="Mức độ"><input data-meta="source" data-i="'+i+'" value="'+esc(q.source)+'" aria-label="Nguồn"></td><td><span class="'+(stat.length?'warn':'ok')+'">'+esc(stat.join(' · ')||q.answerStatus+' · '+q.classificationStatus)+'</span></td><td><button type="button" class="btn soft" data-delete="'+i+'">Xóa</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="q7-empty">Chưa có dòng trong nhóm lọc này.</p>';
        host.querySelectorAll('[data-pick]').forEach(function (e) { e.onchange=function(){draft[Number(e.dataset.pick)].selected=e.checked;}; });
        host.querySelectorAll('[data-field]').forEach(function (e) { e.onchange=function(){var q=draft[Number(e.dataset.i)],f=e.dataset.field;if(f==='text'){q.text=e.value;q.question=q.text;}else if(f==='kind'){q.kind=q.type=e.value;}else if(f==='answers'){q.answers=e.value.split('\n').map(function(x){return x.trim();}).filter(Boolean);q.options=q.answers.slice();q.optionLabels=q.answers.map(function(_,j){return String.fromCharCode(65+j);});}else if(f==='key'){var k=parseKey(e.value,q.optionLabels||[],q.kind);q.correctAnswers=k.indexes;q.correct=k.indexes.length===1?k.indexes[0]:null;}else if(f==='pairs'){q.pairs=e.value.split('\n').map(function(x){var p=x.split(/\s*(?:=>|↔|⇔|→|=)\s*/);return p.length>=2?{left:p[0].trim(),right:p.slice(1).join(' => ').trim()}:null;}).filter(Boolean);}else q.answerText=e.value;validateEdited(q);duplicates(draft,allQuestions(win));classify(draft);render(scope);}; });
        host.querySelectorAll('[data-meta]').forEach(function(e){e.onchange=function(){draft[Number(e.dataset.i)][e.dataset.meta]=e.value.trim()||defaultsMeta()[e.dataset.meta];classify([draft[Number(e.dataset.i)]]);};});
        host.querySelectorAll('[data-delete]').forEach(function(e){e.onclick=function(){draft.splice(Number(e.dataset.delete),1);duplicates(draft,allQuestions(win));render(scope);};});
      }
      function validateEdited(q) { q.reviewErrors=[]; if(!q.text.trim())q.reviewErrors.push('Thiếu nội dung câu hỏi'); if(['SINGLE','MULTI','TRUEFALSE'].indexOf(q.kind)>=0&&q.answers.length<2)q.reviewErrors.push('Cần ít nhất hai phương án'); if(q.kind==='TRUEFALSE'&&q.answers.length!==2)q.reviewErrors.push('Đúng/Sai cần đúng hai phương án'); if((q.kind==='SINGLE'||q.kind==='TRUEFALSE')&&q.correctAnswers.length!==1)q.reviewErrors.push('Thiếu hoặc mơ hồ khóa đáp án'); if(q.kind==='MULTI'&&q.correctAnswers.length<2)q.reviewErrors.push('Cần ít nhất hai khóa cho câu nhiều đáp án'); if(q.correctAnswers.some(function(i){return i<0||i>=q.answers.length;}))q.reviewErrors.push('Khóa đáp án vượt số phương án'); if((q.kind==='FILL'||q.kind==='SHORT')&&!q.answerText.trim())q.reviewErrors.push('Thiếu đáp án tham chiếu'); if(q.kind==='MATCHING'&&!q.pairs.length)q.reviewErrors.push('Thiếu cặp ghép'); q.reviewStatus=q.reviewErrors.length?'Cần rà soát':'Hợp lệ'; q.answerStatus=q.reviewErrors.some(function(x){return /đáp án|khóa/i.test(x);})?'Thiếu':q.kind==='OPEN'?'Cần giáo viên chấm':q.reviewErrors.length?'Mơ hồ':'Hợp lệ'; }
      return { setStatus: setStatus, getMeta: getMeta };
      function save(scope) { var skip = scope.querySelector('#q7SkipDup').checked; var chosen = draft.filter(function(q){return q.selected&&!(skip&&q.duplicate);}); if(!chosen.length)return setStatus('Chọn ít nhất một câu mới để lưu.',true); var invalid=chosen.filter(function(q){return q.reviewErrors.length;}); if(invalid.length)return setStatus(invalid.length+' câu đang thiếu hoặc mơ hồ; sửa trước khi xác nhận lưu.',true); if(chosen.length>500)return setStatus('Tối đa 500 câu trong một bộ.',true); var common=function(key,fallback){var values=Array.from(new Set(chosen.map(function(q){return q[key];}).filter(knownMeta)));return values.length===1?values[0]:values.length>1?'Nhiều giá trị':fallback;}; var now=new Date().toISOString(),id='q7-set-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),g=getMeta(scope); var set={id:id,name:[g.subject,g.topic].filter(function(x){return x&&x!=='Chưa phân loại';}).join(' · ')||'Bộ nhập Chặng 7',setTitle:[g.subject,g.topic].join(' · '),grade:common('grade',g.grade),schoolYear:common('schoolYear',g.schoolYear),subject:common('subject',g.subject),topic:common('topic',g.topic),lesson:common('lesson',g.lesson),difficulty:common('difficulty',g.difficulty),source:common('source',g.source),purpose:'Luyện tập',description:'Nhập qua Thêm câu hỏi',createdAt:now,updatedAt:now,questions:chosen.map(function(q){var copy=JSON.parse(JSON.stringify(q));copy.id='q7-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);if(copy.kind==='SINGLE'&&copy.answers.length===4)copy.kind='ABCD';copy.question=copy.text;copy.type=copy.kind;copy.correctAnswer=copy.correctAnswers.map(function(j){return copy.answers[j];}).filter(Boolean).join(' / ')||copy.answerText||'';copy.answerKeyValid=copy.answerStatus==='Hợp lệ'||copy.answerStatus==='Hợp lệ · nhiều đáp án';return copy;}),games:[]};
        var both=knownMeta(set.subject)&&knownMeta(set.topic)&&set.subject!=='Nhiều giá trị'&&set.topic!=='Nhiều giá trị',stamp=new Date(now),baseName=both?set.subject+' · '+set.topic:sourceName||((knownMeta(set.subject)&&set.subject!=='Nhiều giá trị'?set.subject+' · ':'')+'Bộ nhập '+stamp.toLocaleDateString('vi-VN')+' '+stamp.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})),taken=(win.questionBankSets||[]).map(function(x){return x.name;}),finalName=baseName,dupNo=2;while(taken.indexOf(finalName)>=0)finalName=baseName+' ('+(dupNo++)+')';set.name=finalName;set.setTitle=set.name;
        try { if(!win.audioDB||!win.audioDB.objectStoreNames.contains('questionSets'))throw Error('Kho IndexedDB chưa sẵn sàng'); var tx=win.audioDB.transaction('questionSets','readwrite'); tx.objectStore('questionSets').add(set); tx.oncomplete=function(){ if(!Array.isArray(win.questionBankSets))win.questionBankSets=[];win.questionBankSets.push(set);win.questionBankSelected=set.id; if(win.document.querySelector('#games .qb-search-row')&&typeof win.renderGames==='function')win.renderGames();else if(typeof win.renderQuestions==='function')win.renderQuestions(); if(typeof win.showToast==='function')win.showToast('Đã lưu bộ mới gồm '+set.questions.length+' câu; bộ cũ được giữ nguyên.');m.remove();}; tx.onerror=function(){setStatus('Lưu thất bại: '+(tx.error&&tx.error.message||'lỗi IndexedDB')+'. Dữ liệu cũ vẫn nguyên.',true);}; tx.onabort=function(){setStatus('Giao dịch lưu bị hủy; dữ liệu cũ vẫn nguyên.',true);}; } catch(e){setStatus(e.message||'Không lưu được bộ câu hỏi.',true);}
      }
    }
    /* BAN-CHINH: nút Thêm câu hỏi do kho-cau-hoi.js vẽ; không tự chèn nút thứ hai. */ win.document.addEventListener('keydown',function(e){if(e.key==='Escape'){var m=win.document.getElementById('qbStage7Modal');if(m)m.remove();}});
    win.hmvC7QuestionBank = { parseText: parseText, parseCSV: parseCSV, parseJSON: parseJSON, readFile: readFile, labels: LABELS, duplicateKey: clean, open: open };
  }
  return { TYPES: TYPES, LABELS: LABELS, tfValue: tfValue, splitInlineOptions: splitInlineOptions, subjectFromHeading: subjectFromHeading, parseText: parseText, parseCSV: parseCSV, parseJSON: parseJSON, readFile: readFile, clean: clean, dupKey: dupKey, duplicates: duplicates, classify: classify, install: install };
});


