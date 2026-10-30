/* BAN-CHINH 1.9 · Trợ lý AI: tạo câu hỏi nhanh → chơi ngay, AI rà soát câu hỏi, Trợ lý Sư phạm, kết nối Gemini.
 * Trang chỉ gọi máy chủ nội bộ (./api/ai/…); khóa Gemini nằm trong tệp trên máy giáo viên, không nằm trong trang.
 * 2.10: trên bản web, ./api/ai/… được ai-tren-web.js trả lời ngay trong trình duyệt bằng khóa riêng của từng người dùng.
 * Câu lệnh (prompt) nằm ở tệp này nên sửa được mà không phải khởi động lại máy chủ.
 * Không gửi tên học sinh: tên trong danh sách lớp được thay bằng bí danh [HS1], [HS2]… trước khi gửi.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var VIEW = 'troLyAI', LS = 'hmv_tro_ly_ai_v1';
  /* 2.8: ứng dụng đặt trên web (không mở từ localhost) thì không có máy chủ AI nội bộ – báo đúng như vậy, không bảo khởi động lại máy chủ. */
  var WEB = !/^(localhost|127\.0\.0\.1|\[::1\]|)$/i.test(String(win.location && win.location.hostname || ''));
  var WEB_MSG = 'Bản trên web chưa có AI Gemini. Tạo câu hỏi bằng AI, rà soát câu hỏi, Trợ lý Sư phạm và giọng đọc Gemini chỉ chạy ở bản cài trên máy tính (mở bằng tệp MO-HOC-MA-VUI.cmd). Trò chơi, Kho câu hỏi và các phần khác trên web vẫn dùng bình thường.';
  var OLD_MSG = WEB ? WEB_MSG : 'Máy chủ nội bộ đang chạy bản cũ, chưa có phần AI. Hãy bấm đúp tệp KHOI-DONG-LAI-MAY-CHU.cmd trong thư mục ứng dụng, rồi tải lại trang này.';
  var SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Đạo đức', 'Tự nhiên và Xã hội', 'Tin học', 'Công nghệ', 'Tiếng Anh', 'Âm nhạc', 'Mĩ thuật', 'Giáo dục thể chất', 'Hoạt động trải nghiệm'];
  var LEVELS = { 'Mức 1': 'nhận biết, nhắc lại hoặc mô tả nội dung đã học, áp dụng trực tiếp vào tình huống quen thuộc', 'Mức 2': 'kết nối, sắp xếp nội dung đã học để giải quyết vấn đề có nội dung tương tự', 'Mức 3': 'vận dụng nội dung đã học để giải quyết vấn đề mới hoặc đưa ra phản hồi hợp lí trong học tập và cuộc sống' };
  var S = { status: null, tab: 'quick', busy: '', drafts: [], images: [], pdfs: [], dropped: 0, saved: null, note: '', task: 'matrix', chats: {}, test: '' };

  function $(id) { return doc.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { if (typeof win.showToast === 'function') win.showToast(m); }
  function uid(p) { return p + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
  function norm(t) { return String(t == null ? '' : t).toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim(); }
  function prefs() { try { return JSON.parse(win.localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function savePrefs(p) { try { win.localStorage.setItem(LS, JSON.stringify(p)); } catch (e) {} }
  function fail(code, message) { var e = new Error(message); e.code = code; e.hmv = true; return e; }

  /* ---------- Gọi máy chủ nội bộ ---------- */
  function call(path, body, timeoutMs) {
    var ctl = typeof win.AbortController === 'function' ? new win.AbortController() : null, timer = ctl ? win.setTimeout(function () { ctl.abort(); }, timeoutMs || 110000) : 0;
    function done() { if (timer) win.clearTimeout(timer); }
    return (win.hmvAiFetch || win.fetch)('./api/ai/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body || {}), signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} return { r: r, j: j }; }); })
      .then(function (x) {
        done();
        if (!x.j) throw fail(x.r.status === 404 || x.r.status === 405 || x.r.status === 501 ? 'OLD_SERVER' : 'SERVER', x.r.status === 404 || x.r.status === 405 || x.r.status === 501 ? OLD_MSG : 'Máy chủ nội bộ trả lời không hợp lệ.');
        if (!x.r.ok || x.j.ok === false) throw fail(x.j.code || 'ERROR', x.j.message || 'AI gặp lỗi. Hãy thử lại.');
        return x.j;
      }, function (e) { done(); throw fail(e && e.name === 'AbortError' ? 'TIMEOUT' : 'OFFLINE', e && e.name === 'AbortError' ? 'AI xử lý quá lâu. Hãy bấm tạo lại, hoặc giảm số câu, bớt nội dung nguồn.' : 'Không gọi được máy chủ nội bộ. Hãy kiểm tra ứng dụng còn đang chạy.'); });
  }
  /* Thêm file Word/PDF làm nguồn bài học (30/10/2026): chữ đọc được thì chép vào ô Nguồn để thầy cô xem, sửa;
     PDF scan (không có chữ) thì gửi nguyên tệp cho AI đọc, tối đa 2 tệp, mỗi tệp 9 MB. */
  function b64(buf) { var bytes = new Uint8Array(buf), out = '', step = 0x8000; for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step)); return win.btoa(out); }
  function docText(file, ext) {
    if (ext === 'txt') return file.text();
    if (win.HmvReviewImport && typeof win.HmvReviewImport.readFile === 'function') return win.HmvReviewImport.readFile(file).then(function (d) { return ((d.source && d.source.pages) || []).map(function (p) { return p.text || ''; }).join('\n\n'); });
    if (ext === 'docx' && win.hmvC7QuestionBank && typeof win.hmvC7QuestionBank.readFile === 'function') return win.hmvC7QuestionBank.readFile(file).then(function (r) { return r.raw || ''; });
    return Promise.resolve('');
  }
  function addDocs(files) {
    var list = Array.prototype.slice.call(files || []); if (!list.length) return;
    list.reduce(function (chain, file) { return chain.then(function () {
      var ext = String(file.name || '').split('.').pop().toLowerCase();
      if (['docx', 'pdf', 'txt'].indexOf(ext) < 0) { toast((ext === 'doc' ? 'File .doc đời cũ chưa đọc được. Thầy cô mở bằng Word rồi lưu lại thành .docx nhé: ' : 'Chỉ nhận file Word (.docx), PDF hoặc .txt: ') + file.name); return; }
      if (file.size > 20 * 1024 * 1024) { toast('File quá lớn (tối đa 20 MB): ' + file.name); return; }
      setNote('Đang đọc file ' + file.name + '…');
      return docText(file, ext).catch(function () { return ''; }).then(function (text) {
        text = String(text || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        var box = $('taSource');
        if (text && box) {
          var cur = box.value.trim(), next = (cur ? cur + '\n\n' : '') + '[Từ file ' + file.name + ']\n' + text, cut = next.length > 20000;
          box.value = next.slice(0, 20000);
          setNote('Đã chép ' + Math.min(text.length, 20000).toLocaleString('vi-VN') + ' ký tự từ file ' + file.name + ' vào ô Nguồn bài học.' + (cut ? ' Nguồn dài quá nên chỉ giữ 20 000 ký tự đầu, thầy cô xóa bớt phần không cần.' : ' Thầy cô xem lại, xóa phần không cần trước khi tạo câu hỏi.'));
          return;
        }
        if (ext !== 'pdf') { setNote('File ' + file.name + ' không có chữ để đọc.', true); return; }
        if (S.pdfs.length >= 2) { setNote('Chỉ gửi được tối đa 2 file PDF scan. Thầy cô bỏ bớt file cũ rồi thêm lại.', true); return; }
        if (file.size > 9 * 1024 * 1024) { setNote('File ' + file.name + ' lớn hơn 9 MB nên chưa gửi được cho AI. Thầy cô tách bớt trang hoặc chụp ảnh trang sách.', true); return; }
        return file.arrayBuffer().then(function (buf) { S.pdfs.push({ name: file.name, data: b64(buf) }); renderThumbs(); setNote('App không lấy được chữ trong file ' + file.name + ' (thường là bản scan), nên sẽ gửi nguyên file PDF cho AI đọc.'); });
      });
    }); }, Promise.resolve()).catch(function (e) { setNote('Chưa đọc được file: ' + (e && e.message || e), true); });
  }
  function loadStatus() {
    return (win.hmvAiFetch || win.fetch)('./api/ai/status?t=' + Date.now(), { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { server: 0 }; })
      .catch(function () { return { server: 0 }; })
      .then(function (s) { S.status = s && s.server ? s : { server: 0 }; paintStatus(); return S.status; });
  }
  function ready() { return !!(S.status && S.status.server && S.status.configured); }
  function generate(opts) { return call('generate', opts, opts.timeoutMs ? opts.timeoutMs + 8000 : 0); }
  function parseJson(text) {
    var t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''), a, b;
    try { return JSON.parse(t); } catch (e) {}
    a = t.indexOf('{'); b = t.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) {} }
    a = t.indexOf('['); b = t.lastIndexOf(']'); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e3) {} }
    return null;
  }

  /* ---------- Ẩn tên học sinh trước khi gửi ---------- */
  function nameList() {
    var arr = []; try { arr = typeof students !== 'undefined' && Array.isArray(students) ? students : []; } catch (e) { arr = []; }
    return arr.map(function (s) { return String(s && (s.fullName || s.name) || '').trim(); }).filter(function (n, i, all) { return n.split(/\s+/).length >= 2 && !/^Học sinh \d+$/i.test(n) && all.indexOf(n) === i; }).sort(function (a, b) { return b.length - a.length; });
  }
  function mask(text, map) {
    var out = String(text == null ? '' : text);
    nameList().forEach(function (n) {
      if (out.indexOf(n) < 0) return;
      var hit = map.filter(function (m) { return m.name === n; })[0];
      if (!hit) { hit = { name: n, code: '[HS' + (map.length + 1) + ']' }; map.push(hit); }
      out = out.split(n).join(hit.code);
    });
    return out;
  }
  function unmask(text, map) { var out = String(text == null ? '' : text); (map || []).forEach(function (m) { out = out.split(m.code).join(m.name); }); return out; }

  /* ---------- Markdown an toàn → HTML ---------- */
  function inline(t) { return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function cells(row) { return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  function md(src) {
    var lines = String(src || '').replace(/\r/g, '').split('\n'), html = [], i = 0, l, buf, m;
    while (i < lines.length) {
      l = lines[i];
      if (/^\s*```/.test(l)) { buf = []; i++; while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]); i++; html.push('<pre>' + esc(buf.join('\n')) + '</pre>'); continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        var head = cells(l), rows = []; i += 2;
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) rows.push(cells(lines[i++]));
        html.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + head.map(function (_, k) { return '<td>' + inline(r[k] == null ? '' : r[k]).replace(/&lt;br\s*\/?&gt;/gi, '<br>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
        continue;
      }
      m = l.match(/^(#{1,6})\s+(.*)$/); if (m) { var n = Math.min(5, m[1].length + 2); html.push('<h' + n + '>' + inline(m[2].replace(/\s*#+\s*$/, '')) + '</h' + n + '>'); i++; continue; }
      if (/^\s*(?:[-*•+]|\d+[.)])\s+/.test(l)) {
        var ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
        while (i < lines.length && /^\s*(?:[-*•+]|\d+[.)])\s+/.test(lines[i])) { var deep = /^\s{2,}/.test(lines[i]); items.push('<li' + (deep ? ' class="ta-sub"' : '') + '>' + inline(lines[i].replace(/^\s*(?:[-*•+]|\d+[.)])\s+/, '')) + '</li>'); i++; }
        html.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>')); continue;
      }
      if (/^\s*(?:---+|\*\*\*+)\s*$/.test(l)) { html.push('<hr>'); i++; continue; }
      if (!l.trim()) { i++; continue; }
      buf = [];
      while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i]) && !/^\s*(?:[-*•+]|\d+[.)])\s+/.test(lines[i]) && !(/^\s*\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) buf.push(inline(lines[i++]));
      html.push('<p>' + buf.join('<br>') + '</p>');
    }
    return html.join('');
  }
  function download(name, mime, content) { var blob = new Blob([content], { type: mime }), url = URL.createObjectURL(blob), a = doc.createElement('a'); a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove(); win.setTimeout(function () { URL.revokeObjectURL(url); }, 1500); }
  function wordDoc(title, bodyHtml) { return '\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.35}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4pt 6pt;vertical-align:top}th{background:#eee}h3,h4,h5{margin:10pt 0 4pt}</style></head><body>' + bodyHtml + '</body></html>'; }
  function copyText(t) { var p = win.navigator.clipboard && win.navigator.clipboard.writeText ? win.navigator.clipboard.writeText(t) : Promise.reject(); return p.catch(function () { var a = doc.createElement('textarea'); a.value = t; doc.body.appendChild(a); a.select(); try { doc.execCommand('copy'); } catch (e) {} a.remove(); }); }

  /* ---------- Tạo câu hỏi ---------- */
  var Q_SCHEMA = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, kind: { type: 'STRING', enum: ['ABCD', 'TRUEFALSE', 'SHORT'] }, answers: { type: 'ARRAY', items: { type: 'STRING' } }, correct: { type: 'INTEGER' }, answerText: { type: 'STRING' }, explanation: { type: 'STRING' }, level: { type: 'STRING', enum: ['Mức 1', 'Mức 2', 'Mức 3'] } }, required: ['text', 'kind', 'answers', 'correct', 'answerText', 'explanation', 'level'] } } }, required: ['questions'] };
  var Q_SYSTEM = 'Bạn là giáo viên tiểu học Việt Nam giàu kinh nghiệm, soạn câu hỏi cho trò chơi học tập trên lớp. Luôn bám Chương trình giáo dục phổ thông 2018 và yêu cầu cần đạt của đúng khối lớp; dùng tiếng Việt chuẩn, câu ngắn, từ ngữ hợp lứa tuổi; kiến thức và đáp án phải chính xác tuyệt đối, tự giải lại từng câu trước khi ghi đáp án; không đánh đố, không mẹo chữ; không nhắc tên hay thông tin cá nhân của học sinh. Chỉ trả về JSON đúng lược đồ, không kèm lời dẫn.';
  function questionPrompt(f, avoid) {
    var kind = { ABCD: 'Tất cả là trắc nghiệm bốn phương án (kind "ABCD").', TRUEFALSE: 'Tất cả là câu Đúng/Sai (kind "TRUEFALSE").', MIX: 'Khoảng hai phần ba số câu là trắc nghiệm bốn phương án (kind "ABCD"), còn lại là câu Đúng/Sai (kind "TRUEFALSE"), xếp xen kẽ.', SHORT: 'Tất cả là câu trả lời ngắn để hỏi miệng (kind "SHORT").' }[f.kind] || '';
    var level = f.level === 'ALL' ? 'Phân bổ đủ ba mức theo Thông tư 27/2020/TT-BGDĐT: khoảng một nửa số câu ở Mức 1 (' + LEVELS['Mức 1'] + '), khoảng một phần ba ở Mức 2 (' + LEVELS['Mức 2'] + '), còn lại ở Mức 3 (' + LEVELS['Mức 3'] + ').' : 'Tất cả ở ' + f.level + ' theo Thông tư 27/2020/TT-BGDĐT (' + LEVELS[f.level] + ').';
    var p = ['Soạn đúng ' + f.count + ' câu hỏi cho học sinh lớp ' + f.grade + ', môn ' + f.subject + (f.topic ? ', bài/chủ đề: ' + f.topic : '') + '.', 'Dạng câu: ' + kind, 'Mức độ: ' + level,
      'Quy cách để chiếu trong trò chơi:', '- Câu hỏi không quá 150 ký tự; mỗi phương án không quá 45 ký tự.', '- Câu "ABCD": answers có đúng 4 phương án khác nhau, chỉ MỘT phương án đúng; correct là vị trí phương án đúng (0–3); phương án nhiễu là lỗi học sinh hay mắc; không dùng "Tất cả đều đúng", "Cả A và B"; answerText để chuỗi rỗng.', '- Câu "TRUEFALSE": text là một mệnh đề khẳng định; answers là ["Đúng","Sai"]; correct là 0 nếu mệnh đề đúng, 1 nếu sai; số mệnh đề đúng và sai xấp xỉ nhau.', '- Câu "SHORT": answers là mảng rỗng, correct là -1, answerText là đáp án ngắn (một số hoặc 1–4 từ).', '- explanation: một câu giải thích ngắn, dễ hiểu với học sinh.', '- level: "Mức 1", "Mức 2" hoặc "Mức 3".', '- Các câu không trùng ý nhau.'];
    if (avoid && avoid.length) p.push('Không lặp lại ý của các câu đã có sau đây:\n' + avoid.slice(0, 40).map(function (t) { return '- ' + t; }).join('\n'));
    if (f.source || f.images) p.push('Chỉ dùng kiến thức có trong NGUỒN BÀI HỌC' + (f.images ? ' (gồm ' + f.images + ' ảnh/tệp PDF trang sách đính kèm' + (f.source ? ' và đoạn văn bản dưới đây' : '') + ')' : ' dưới đây') + '; không hỏi điều nằm ngoài nguồn.');
    else p.push('Không có nguồn kèm theo: hãy dựa vào nội dung chuẩn của bài/chủ đề này trong sách giáo khoa lớp ' + f.grade + ' theo Chương trình 2018.');
    if (f.source) p.push('NGUỒN BÀI HỌC:\n"""\n' + f.source + '\n"""');
    return p.join('\n');
  }
  function isTrue(s) { return /^(đúng|dung|true|đ|yes)\.?$/i.test(String(s).trim()); }
  function isFalse(s) { return /^(sai|false|s|no)\.?$/i.test(String(s).trim()); }
  function shuffleKeep(answers, correct) { var idx = answers.map(function (_, i) { return i; }), i, j, t; for (i = idx.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = idx[i]; idx[i] = idx[j]; idx[j] = t; } return { answers: idx.map(function (k) { return answers[k]; }), correct: idx.indexOf(correct) }; }
  function normalizeQuestions(data) {
    var list = Array.isArray(data) ? data : data && Array.isArray(data.questions) ? data.questions : [], seen = {}, out = [], dropped = 0;
    list.forEach(function (q) {
      if (!q || typeof q !== 'object') { dropped++; return; }
      var text = String(q.text || q.question || '').replace(/\s+/g, ' ').trim(), kind = String(q.kind || q.type || '').toUpperCase();
      var answers = (Array.isArray(q.answers) ? q.answers : Array.isArray(q.options) ? q.options : []).map(function (a) { return String(a == null ? '' : a).replace(/^\s*[A-Da-d][.)]\s+/, '').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
      var correct = Number.isInteger(q.correct) ? q.correct : parseInt(q.correct, 10), answerText = String(q.answerText || q.correctAnswer || '').trim();
      if (/TRUE|ĐÚNG|DUNG/.test(kind) || (answers.length === 2 && answers.every(function (a) { return isTrue(a) || isFalse(a); }))) kind = 'TRUEFALSE';
      else if (/SHORT|FILL|NGẮN/.test(kind) || (!answers.length && answerText)) kind = 'SHORT'; else kind = 'ABCD';
      var key = norm(text); if (!text || seen[key]) { dropped++; return; }
      var lv = String(q.level || q.difficulty || '').match(/[123]/), item = { text: text, kind: kind, answers: [], correct: null, answerText: '', explanation: String(q.explanation || '').replace(/\s+/g, ' ').trim(), level: lv ? 'Mức ' + lv[0] : 'Mức 1', pick: true, review: null };
      if (kind === 'ABCD') {
        var uniq = []; answers.forEach(function (a) { if (uniq.map(norm).indexOf(norm(a)) < 0) uniq.push(a); });
        if (!(correct >= 0 && correct < answers.length) && answerText) correct = answers.map(norm).indexOf(norm(answerText));
        if (answers.length !== 4 || uniq.length !== 4 || !(correct >= 0 && correct < 4)) { dropped++; return; }
        var sh = shuffleKeep(answers, correct); item.answers = sh.answers; item.correct = sh.correct;
      } else if (kind === 'TRUEFALSE') {
        var val = null;
        if (typeof q.correct === 'boolean') val = q.correct;
        if (val === null && answers.length === 2 && correct >= 0 && correct < 2) val = isTrue(answers[correct]) ? true : isFalse(answers[correct]) ? false : null;
        if (val === null && answerText) val = isTrue(answerText) ? true : isFalse(answerText) ? false : null;
        if (val === null) { dropped++; return; }
        item.answers = ['Đúng', 'Sai']; item.correct = val ? 0 : 1;
      } else {
        if (!answerText && answers.length && correct >= 0) answerText = answers[correct] || '';
        if (!answerText) { dropped++; return; }
        item.answerText = answerText;
      }
      seen[key] = 1; out.push(item);
    });
    return { list: out, dropped: dropped };
  }
  function bankTexts() { var all = {}; (Array.isArray(win.questionBankSets) ? win.questionBankSets : []).forEach(function (s) { (s.questions || []).forEach(function (q) { all[norm(q.text || q.question)] = 1; }); }); return all; }
  function localIssues(d, i, bank) {
    var out = [];
    if (!d.text.trim()) out.push('Thiếu nội dung câu hỏi');
    if (d.text.length > 180) out.push('Câu hỏi dài, khó chiếu trong trò chơi');
    if (d.kind === 'ABCD') { if (d.answers.length !== 4 || d.answers.some(function (a) { return !String(a).trim(); })) out.push('Cần đủ bốn phương án'); else if (d.answers.map(norm).filter(function (a, k, all) { return all.indexOf(a) === k; }).length !== 4) out.push('Có phương án trùng nhau'); if (!(d.correct >= 0 && d.correct < 4)) out.push('Chưa chọn đáp án đúng'); if (d.answers.some(function (a) { return String(a).length > 60; })) out.push('Phương án dài, khó chiếu'); }
    if (d.kind === 'TRUEFALSE' && !(d.correct === 0 || d.correct === 1)) out.push('Chưa chọn Đúng hay Sai');
    if (d.kind === 'SHORT' && !String(d.answerText).trim()) out.push('Thiếu đáp án');
    if (S.drafts.some(function (o, k) { return k < i && norm(o.text) === norm(d.text); })) out.push('Trùng với câu phía trên');
    if (bank[norm(d.text)]) out.push('Đã có trong Kho câu hỏi');
    return out;
  }
  function blocking(issues) { return issues.filter(function (x) { return !/khó chiếu|Đã có trong Kho/.test(x); }); }
  function readForm() {
    var subject = $('taSubject') ? $('taSubject').value : 'Toán'; if (subject === '__other') subject = ($('taSubjectOther').value || '').trim();
    return { grade: $('taGrade').value, subject: subject, topic: ($('taTopic').value || '').trim().slice(0, 200), count: Math.max(1, Math.min(20, parseInt($('taCount').value, 10) || 10)), kind: $('taKind').value, level: $('taLevel').value, source: ($('taSource').value || '').trim().slice(0, 20000), images: S.images.length + S.pdfs.length };
  }
  function runGenerate(more) {
    if (S.busy) return;
    var f = readForm(), map = [];
    if (!f.subject) return setNote('Hãy nhập tên môn học.', true);
    if (!f.topic && !f.source && !f.images) return setNote('Hãy nhập bài/chủ đề, hoặc dán nội dung bài học, hoặc thêm file Word/PDF, ảnh trang sách.', true);
    var p = prefs(); p.form = { grade: f.grade, subject: $('taSubject').value, other: $('taSubjectOther').value, topic: f.topic, count: f.count, kind: f.kind, level: f.level }; savePrefs(p);
    f.source = mask(f.source, map); f.topic = mask(f.topic, map);
    var parts = [{ text: questionPrompt(f, more ? S.drafts.map(function (d) { return d.text; }) : null) }];
    S.images.forEach(function (im) { parts.push({ inlineData: { mimeType: im.mime, data: im.data } }); });
    S.pdfs.forEach(function (pf) { parts.push({ inlineData: { mimeType: 'application/pdf', data: pf.data } }); });
    if (!more) S.saved = null; // bỏ thẻ "Đã lưu" của lần trước để khung 3 chỉ nói về lần đang chạy
    setBusy(more ? 'more' : 'gen'); setNote('AI đang đọc nguồn và soạn ' + f.count + ' câu… (thường mất 10–40 giây)'); renderDrafts();
    generate({ system: Q_SYSTEM, contents: [{ role: 'user', parts: parts }], json: true, schema: Q_SCHEMA, temperature: 0.5, thinking: 'low', maxOutputTokens: Math.min(16000, 2500 + f.count * 450), timeoutMs: 90000 })
      .then(function (r) {
        var res = normalizeQuestions(parseJson(unmask(r.text, map)));
        if (!res.list.length) throw fail('BAD_OUTPUT', 'AI trả về kết quả không dùng được. Hãy bấm tạo lại, hoặc giảm số câu.');
        if (more) { var have = {}; S.drafts.forEach(function (d) { have[norm(d.text)] = 1; }); res.list = res.list.filter(function (d) { return !have[norm(d.text)]; }); S.drafts = S.drafts.concat(res.list); }
        else { S.drafts = res.list; S.meta = { grade: f.grade, subject: f.subject, topic: unmask(f.topic, map) }; var nameBox = $('taSetName'); if (nameBox) nameBox.value = ''; }
        S.dropped = res.dropped; S.saved = null; S.model = r.model;
        setBusy(''); setNote((more ? 'Đã thêm ' : 'AI đã soạn ') + res.list.length + ' câu' + (res.dropped ? ' (bỏ ' + res.dropped + ' câu sai quy cách)' : '') + (map.length ? ' · đã ẩn ' + map.length + ' tên học sinh trước khi gửi' : '') + '. Thầy cô kiểm tra rồi lưu.');
        renderDrafts();
      })
      .catch(function (e) { setBusy(''); setNote(e.message, true, e.code); renderDrafts(); });
  }

  /* ---------- AI rà soát ---------- */
  var R_SCHEMA = { type: 'OBJECT', properties: { reviews: { type: 'ARRAY', items: { type: 'OBJECT', properties: { index: { type: 'INTEGER' }, verdict: { type: 'STRING', enum: ['ok', 'warn', 'error'] }, issues: { type: 'ARRAY', items: { type: 'STRING' } }, level: { type: 'STRING' }, fixText: { type: 'STRING' }, fixAnswers: { type: 'ARRAY', items: { type: 'STRING' } }, fixCorrect: { type: 'INTEGER' }, fixAnswerText: { type: 'STRING' } }, required: ['index', 'verdict', 'issues'] } } }, required: ['reviews'] };
  var R_SYSTEM = 'Bạn là tổ trưởng chuyên môn tiểu học, thẩm định câu hỏi trước khi dùng trên lớp. Với từng câu, hãy TỰ GIẢI LẠI độc lập rồi mới so với đáp án được ghi. Chỉ báo lỗi khi chắc chắn; không bắt lỗi vụn vặt. Chỉ trả về JSON đúng lược đồ.';
  function reviewPrompt(meta) {
    return ['Rà soát các câu hỏi dùng cho học sinh lớp ' + meta.grade + ', môn ' + meta.subject + (meta.topic ? ', bài/chủ đề: ' + meta.topic : '') + '.', 'Với mỗi câu, kiểm tra:', '1. Đáp án được ghi có đúng không (tự tính, tự giải lại).', '2. Có hơn một phương án đúng, hoặc không có phương án nào đúng.', '3. Câu hỏi mơ hồ, thiếu dữ kiện, dễ hiểu theo hai cách.', '4. Kiến thức vượt quá hoặc không thuộc chương trình lớp ' + meta.grade + '.', '5. Lỗi chính tả, diễn đạt khó hiểu với học sinh tiểu học.', '6. Mức độ theo Thông tư 27 (Mức 1, Mức 2, Mức 3) được ghi có hợp lí không.', 'Trả về reviews, mỗi phần tử ứng với một câu theo index:', '- verdict: "ok" nếu dùng được ngay; "warn" nếu nên chỉnh; "error" nếu sai kiến thức hoặc sai đáp án.', '- issues: các nhận xét ngắn bằng tiếng Việt (mảng rỗng nếu ok).', '- level: mức độ em cho là đúng ("Mức 1", "Mức 2" hoặc "Mức 3").', '- Khi verdict khác "ok" và sửa được, đưa bản sửa: fixText (câu hỏi đã sửa), fixAnswers (đủ các phương án theo đúng thứ tự A, B, C, D), fixCorrect (vị trí đáp án đúng, tính từ 0), fixAnswerText (đáp án cho câu trả lời ngắn). Không sửa được thì bỏ trống các trường fix.', 'Danh sách câu hỏi (JSON):'].join('\n');
  }
  function runReview() {
    if (S.busy || !S.drafts.length) return;
    syncDrafts();
    var meta = S.meta || { grade: $('taGrade') ? $('taGrade').value : '4', subject: 'Toán', topic: '' }, map = [];
    var payload = S.drafts.map(function (d, i) { return { index: i, kind: d.kind, text: mask(d.text, map), answers: d.answers, correct: d.kind === 'SHORT' ? -1 : d.correct, answerText: d.answerText, level: d.level }; });
    setBusy('review'); setNote('AI đang giải lại và rà soát ' + payload.length + ' câu…');
    generate({ system: R_SYSTEM, contents: [{ role: 'user', parts: [{ text: reviewPrompt(meta) + '\n' + JSON.stringify(payload) }] }], json: true, schema: R_SCHEMA, temperature: 0.1, maxOutputTokens: Math.min(16000, 2000 + payload.length * 400), timeoutMs: 90000 })
      .then(function (r) {
        var data = parseJson(unmask(r.text, map)), list = data && Array.isArray(data.reviews) ? data.reviews : Array.isArray(data) ? data : null;
        if (!list) throw fail('BAD_OUTPUT', 'AI trả về kết quả rà soát không đọc được. Hãy thử lại.');
        var n = { ok: 0, warn: 0, error: 0 };
        S.drafts.forEach(function (d) { d.review = null; });
        list.forEach(function (x) {
          var d = S.drafts[x && x.index]; if (!d) return;
          var verdict = x.verdict === 'error' || x.verdict === 'warn' ? x.verdict : 'ok', issues = (Array.isArray(x.issues) ? x.issues : []).map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 5), lv = String(x.level || '').match(/[123]/), fix = null;
          if (verdict !== 'ok') {
            fix = {}; if (x.fixText && String(x.fixText).trim() && norm(x.fixText) !== norm(d.text)) fix.text = String(x.fixText).trim();
            if (d.kind === 'ABCD' && Array.isArray(x.fixAnswers) && x.fixAnswers.length === 4 && x.fixCorrect >= 0 && x.fixCorrect < 4) { fix.answers = x.fixAnswers.map(function (a) { return String(a).replace(/^\s*[A-Da-d][.)]\s+/, '').trim(); }); fix.correct = x.fixCorrect; }
            else if (d.kind === 'TRUEFALSE' && (x.fixCorrect === 0 || x.fixCorrect === 1)) fix.correct = x.fixCorrect;
            else if (d.kind === 'SHORT' && x.fixAnswerText && String(x.fixAnswerText).trim()) fix.answerText = String(x.fixAnswerText).trim();
            if (!Object.keys(fix).length) fix = null;
          }
          d.review = { verdict: verdict, issues: issues, level: lv ? 'Mức ' + lv[0] : '', fix: fix }; n[verdict]++;
        });
        setBusy(''); setNote('Đã rà soát: ' + n.ok + ' câu ổn, ' + n.warn + ' câu nên chỉnh, ' + n.error + ' câu sai. AI rà soát cũng có thể nhầm — thầy cô là người quyết định cuối cùng.', n.error > 0);
        renderDrafts();
      })
      .catch(function (e) { setBusy(''); setNote(e.message, true, e.code); });
  }
  function applyFix(i) { var d = S.drafts[i], f = d && d.review && d.review.fix; if (!f) return; if (f.text) d.text = f.text; if (f.answers) d.answers = f.answers.slice(); if (f.correct != null) d.correct = f.correct; if (f.answerText) d.answerText = f.answerText; if (d.review.level) d.level = d.review.level; d.review = { verdict: 'ok', issues: ['Đã áp dụng bản sửa của AI — thầy cô xem lại lần cuối.'], level: '', fix: null }; renderDrafts(); }

  /* ---------- Lưu vào Kho, chơi ngay ---------- */
  function toKho(d, meta) {
    var abc = d.kind !== 'SHORT', labels = d.kind === 'ABCD' ? ['A', 'B', 'C', 'D'] : d.kind === 'TRUEFALSE' ? ['Đúng', 'Sai'] : [];
    return { id: uid('ai-q-'), text: d.text, question: d.text, kind: d.kind, type: d.kind, answers: abc ? d.answers.slice() : [], options: abc ? d.answers.slice() : [], optionLabels: labels, correct: abc ? d.correct : null, correctAnswers: abc ? [d.correct] : [], correctAnswer: abc ? d.answers[d.correct] : d.answerText, answerText: abc ? '' : d.answerText, explanation: d.explanation || '', hint: '', pairs: [], grade: 'Lớp ' + meta.grade, subject: meta.subject, topic: meta.topic || 'Chưa xác định chủ đề', lesson: meta.topic || 'Chưa xác định bài học', difficulty: d.level, level: d.level, source: 'Trợ lý AI (Gemini)', points: 1, time: 30, answerStatus: 'Hợp lệ', reviewStatus: 'Hợp lệ', classificationStatus: 'Có căn cứ đã nhập', reviewErrors: [], answerKeyValid: true };
  }
  function saveSet() {
    syncDrafts();
    var bank = bankTexts(), chosen = S.drafts.filter(function (d) { return d.pick; });
    if (!chosen.length) { setNote('Hãy chọn ít nhất một câu để lưu.', true); return Promise.resolve(null); }
    var bad = S.drafts.map(function (d, i) { return d.pick && blocking(localIssues(d, i, bank)).length ? i + 1 : 0; }).filter(Boolean);
    if (bad.length) { setNote('Câu ' + bad.join(', ') + ' còn thiếu hoặc sai quy cách; hãy sửa hoặc bỏ chọn trước khi lưu.', true); return Promise.resolve(null); }
    var db = win.audioDB; if (!db || !db.objectStoreNames.contains('questionSets')) { setNote('Kho lưu trữ chưa sẵn sàng. Hãy tải lại trang rồi thử lại.', true); return Promise.resolve(null); }
    var meta = S.meta || { grade: '4', subject: 'Toán', topic: '' }, now = new Date(), iso = now.toISOString(), levels = chosen.map(function (d) { return d.level; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var base = (($('taSetName') && $('taSetName').value) || '').trim() || defaultName(meta), taken = (win.questionBankSets || []).map(function (s) { return s.name; }), name = base, k = 2; while (taken.indexOf(name) >= 0) name = base + ' (' + (k++) + ')';
    var yearEl = $('workspaceYear'), set = { id: uid('ai-set-'), name: name, setTitle: name, description: 'Soạn bằng Trợ lý AI ngày ' + now.toLocaleDateString('vi-VN') + '; giáo viên đã duyệt.', grade: 'Lớp ' + meta.grade, schoolYear: yearEl && yearEl.value ? yearEl.value : 'Chưa xác định năm học', subject: meta.subject, topic: meta.topic || 'Chưa xác định chủ đề', lesson: meta.topic || 'Chưa xác định bài học', difficulty: levels.length === 1 ? levels[0] : 'Nhiều giá trị', source: 'Trợ lý AI (Gemini)', purpose: 'Luyện tập', createdAt: iso, updatedAt: iso, questions: chosen.map(function (d) { return toKho(d, meta); }), games: [] };
    return new Promise(function (resolve) {
      var tx; try { tx = db.transaction('questionSets', 'readwrite'); tx.objectStore('questionSets').add(set); } catch (e) { setNote('Không lưu được bộ câu hỏi: ' + (e.message || 'lỗi lưu trữ'), true); resolve(null); return; }
      tx.oncomplete = function () {
        if (!Array.isArray(win.questionBankSets)) win.questionBankSets = [];
        win.questionBankSets.push(set); win.questionBankSelected = set.id; S.saved = { id: set.id, name: set.name, count: set.questions.length };
        S.drafts = S.drafts.filter(function (d) { return !d.pick; });
        toast('Đã lưu bộ "' + set.name + '" gồm ' + set.questions.length + ' câu vào Kho.'); setNote(''); renderDrafts(); resolve(set);
      };
      tx.onerror = tx.onabort = function () { setNote('Lưu thất bại: ' + (tx.error && tx.error.message || 'lỗi lưu trữ') + '. Dữ liệu cũ vẫn nguyên.', true); resolve(null); };
    });
  }
  function defaultName(meta) { return [meta.subject, meta.topic].filter(Boolean).join(' · ') + ' (AI)'; }
  function playSet(id) {
    if (typeof win.openView !== 'function') return;
    win.openView('questions');
    var tries = 0;
    (function look() { var b = doc.querySelector('#questions [data-kho-play="' + id + '"]'); if (b) { b.click(); return; } if (tries++ < 20) win.setTimeout(look, 100); else toast('Bộ vừa lưu nằm trong Kho câu hỏi — bấm "Chơi ngay" ở bộ đó.'); })();
  }

  /* ---------- Trợ lý Sư phạm ---------- */
  var C_SYSTEM = 'Bạn là Trợ lý Sư phạm của ứng dụng HỌC MÀ VUI, hỗ trợ giáo viên tiểu học Việt Nam trong công việc chuyên môn. Nguyên tắc: bám Chương trình giáo dục phổ thông 2018; đánh giá học sinh theo Thông tư 27/2020/TT-BGDĐT (nhận xét vì sự tiến bộ của học sinh, động viên, không so sánh học sinh này với học sinh khác; câu hỏi và bài tập theo ba mức); sinh hoạt chuyên môn theo nghiên cứu bài học tập trung vào việc học của học sinh, không đánh giá xếp loại giáo viên. Trả lời bằng tiếng Việt, ngắn gọn, dùng được ngay; trình bày bằng Markdown (tiêu đề, gạch đầu dòng, bảng khi là ma trận hoặc kế hoạch). Không bịa số hiệu văn bản; điều gì không chắc thì nói rõ và nhắc giáo viên đối chiếu văn bản hiện hành của Bộ, Sở và nhà trường. Các ký hiệu dạng [HS1], [HS2] là bí danh của học sinh: giữ nguyên các ký hiệu đó trong câu trả lời, không tự đặt tên. Không yêu cầu thông tin cá nhân của học sinh.';
  function sel(id, label, options, value) { return '<label class="ta-f"><span>' + label + '</span><select id="' + id + '" class="select">' + options.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>'; }
  function inp(id, label, placeholder, value) { return '<label class="ta-f"><span>' + label + '</span><input id="' + id + '" class="input" placeholder="' + esc(placeholder || '') + '" value="' + esc(value || '') + '"></label>'; }
  function area(id, label, placeholder, rows) { return '<label class="ta-f ta-wide"><span>' + label + '</span><textarea id="' + id + '" class="input" rows="' + (rows || 3) + '" placeholder="' + esc(placeholder || '') + '"></textarea></label>'; }
  function lowerFirst(t) { t = String(t || ''); return t.charAt(0).toLocaleLowerCase('vi') + t.slice(1); }
  function val(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
  function gradeNow() { var g = $('workspaceGrade'); return g && /^[1-5]$/.test(g.value) ? g.value : '4'; }
  var TASKS = [
    { id: 'games', icon: '🎮', title: 'Câu hỏi cho trò chơi', sub: 'Soạn nhanh rồi chơi ngay' },
    { id: 'matrix', icon: '📊', title: 'Ma trận và đề kiểm tra', sub: 'Theo ba mức của Thông tư 27',
      form: function () { return sel('tcGrade', 'Lớp', ['1', '2', '3', '4', '5'], gradeNow()) + sel('tcSubject', 'Môn', SUBJECTS, 'Toán') + sel('tcWhen', 'Thời điểm', ['Giữa học kì I', 'Cuối học kì I', 'Giữa học kì II', 'Cuối năm học'], 'Giữa học kì I') + inp('tcTime', 'Thời gian làm bài', '', '40 phút') + inp('tcRatio', 'Tỉ lệ ba mức (chỉnh theo quy định của trường)', '', 'Mức 1: 50% · Mức 2: 30% · Mức 3: 20%') + inp('tcShape', 'Cấu trúc', '', 'Trắc nghiệm 4 điểm, tự luận 6 điểm') + area('tcContent', 'Nội dung, mạch kiến thức đã học đến thời điểm kiểm tra', 'Ví dụ: Số tự nhiên đến lớp triệu; bốn phép tính; góc nhọn, góc tù; yến, tạ, tấn…', 4) + '<label class="ta-check ta-wide"><input type="checkbox" id="tcFull" checked> Soạn luôn đề kiểm tra và đáp án, hướng dẫn chấm theo ma trận</label>'; },
      prompt: function () { var c = val('tcContent'); if (!c) return null; return 'Xây dựng ma trận đề kiểm tra định kì môn ' + val('tcSubject') + ' lớp ' + val('tcGrade') + ', ' + lowerFirst(val('tcWhen')) + ', thời gian ' + val('tcTime') + '.\nCấu trúc: ' + val('tcShape') + '. Tỉ lệ điểm theo mức: ' + val('tcRatio') + '.\nNội dung đã học: ' + c + '\nYêu cầu:\n1. Ma trận dạng bảng: mỗi hàng là một mạch kiến thức/nội dung; các cột là Mức 1, Mức 2, Mức 3 (mỗi mức tách TN và TL: số câu, số điểm, câu số) và cột Tổng; hàng cuối là tổng số câu, tổng điểm, tỉ lệ %. Tổng điểm đúng 10.\n2. Kiểm lại phép cộng trong ma trận trước khi trả lời.' + ($('tcFull') && $('tcFull').checked ? '\n3. Sau ma trận, soạn đề kiểm tra hoàn chỉnh đúng theo ma trận (ghi rõ mức và điểm sau mỗi câu), rồi đáp án và hướng dẫn chấm.' : ''); } },
    { id: 'comment', icon: '✍️', title: 'Lời nhận xét học sinh', sub: 'Động viên, cụ thể, vì sự tiến bộ',
      form: function () { return sel('tcArea', 'Nhận xét về', ['Môn học và hoạt động giáo dục', 'Năng lực chung', 'Năng lực đặc thù', 'Phẩm chất chủ yếu', 'Nhận xét tổng hợp cuối kì'], 'Môn học và hoạt động giáo dục') + sel('tcSubject', 'Môn (nếu nhận xét môn học)', ['(không)'].concat(SUBJECTS), 'Toán') + sel('tcWhen', 'Thời điểm', ['Thường xuyên (hằng tuần, hằng tháng)', 'Giữa học kì I', 'Cuối học kì I', 'Giữa học kì II', 'Cuối năm học'], 'Giữa học kì I') + sel('tcResult', 'Mức đạt được', ['Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành', '(không ghi mức)'], 'Hoàn thành') + sel('tcCount', 'Số phương án', ['3', '5', '8'], '3') + area('tcGood', 'Điểm nổi bật, tiến bộ của học sinh', 'Ví dụ: tính nhẩm nhanh, hăng hái phát biểu, chữ viết tiến bộ…', 2) + area('tcNeed', 'Điều cần cố gắng', 'Ví dụ: còn nhầm khi đặt tính chia, đọc chưa lưu loát…', 2) + '<p class="ta-hint ta-wide">Không cần ghi họ tên học sinh. Nếu thầy cô gõ họ tên có trong danh sách lớp, ứng dụng tự thay bằng bí danh trước khi gửi.</p>'; },
      prompt: function () { var good = val('tcGood'), need = val('tcNeed'); if (!good && !need) return null; var subj = val('tcSubject'); return 'Viết ' + val('tcCount') + ' phương án lời nhận xét cho một học sinh lớp ' + gradeNow() + '.\nNội dung nhận xét: ' + val('tcArea') + (subj && subj !== '(không)' ? ' — môn ' + subj : '') + '. Thời điểm: ' + val('tcWhen') + '.' + (val('tcResult') !== '(không ghi mức)' ? ' Mức đạt được: ' + val('tcResult') + '.' : '') + (good ? '\nĐiểm nổi bật, tiến bộ: ' + good : '') + (need ? '\nĐiều cần cố gắng: ' + need : '') + '\nYêu cầu: mỗi phương án 1–2 câu, tối đa khoảng 200 ký tự để ghi vừa ô nhận xét; nêu điều học sinh làm được trước, sau đó là điều cần cố gắng kèm một gợi ý cụ thể; lời lẽ ấm áp, không chê trách, không so sánh với bạn khác; xưng "em"; mỗi phương án diễn đạt khác nhau. Đánh số các phương án.'; } },
    { id: 'warmup', icon: '🚀', title: 'Hoạt động khởi động, củng cố', sub: 'Trò chơi 3–5 phút gắn với bài',
      form: function () { return sel('tcGrade', 'Lớp', ['1', '2', '3', '4', '5'], gradeNow()) + sel('tcSubject', 'Môn', SUBJECTS, 'Toán') + inp('tcLesson', 'Bài học', 'Ví dụ: Phân số bằng nhau', '') + sel('tcKind', 'Loại hoạt động', ['Khởi động đầu tiết', 'Củng cố cuối tiết', 'Giải lao giữa tiết'], 'Khởi động đầu tiết') + sel('tcTime', 'Thời lượng', ['3 phút', '5 phút', '7 phút'], '5 phút') + inp('tcRoom', 'Điều kiện lớp', '', 'Có máy chiếu, khoảng 35 học sinh'); },
      prompt: function () { var l = val('tcLesson'); if (!l) return null; return 'Gợi ý 3 hoạt động "' + lowerFirst(val('tcKind')) + '" cho bài "' + l + '", môn ' + val('tcSubject') + ' lớp ' + val('tcGrade') + '. Thời lượng mỗi hoạt động: ' + val('tcTime') + '. Điều kiện: ' + val('tcRoom') + '.\nVới mỗi hoạt động nêu: tên, mục tiêu gắn với bài, chuẩn bị, cách tổ chức từng bước, câu hỏi/nhiệm vụ cụ thể để dùng ngay, cách để mọi học sinh cùng tham gia. Ứng dụng HỌC MÀ VUI đang có các trò: Vòng quay kết nối (gọi tên ngẫu nhiên), Kéo co kiến thức, Ai nhanh hơn (bấm chuông), Hộp quà bí mật, Chinh phục tri thức, Quiz Nghiêng Đầu và Bóng bay tri thức (chơi bằng camera) — ít nhất một hoạt động hãy dùng một trong các trò này và nói rõ dùng thế nào.'; } },
    { id: 'lesson', icon: '👥', title: 'Góp ý tiết dạy (Nghiên cứu bài học)', sub: 'Tập trung vào việc học của học sinh',
      form: function () { return sel('tcGrade', 'Lớp', ['1', '2', '3', '4', '5'], gradeNow()) + sel('tcSubject', 'Môn', SUBJECTS, 'Toán') + inp('tcLesson', 'Bài dạy minh họa', 'Ví dụ: Tìm số trung bình cộng', '') + area('tcNotes', 'Ghi chép khi dự giờ: học sinh đã học như thế nào?', 'Ví dụ: Hoạt động 1 nhóm 3 thảo luận sôi nổi; hoạt động 2 khoảng 6 em chưa làm được bài 2, nhiều em nhầm chia cho 2…', 5) + '<label class="ta-check ta-wide"><input type="checkbox" id="tcMinutes"> Soạn kèm dàn ý biên bản sinh hoạt chuyên môn</label>'; },
      prompt: function () { var n = val('tcNotes'); if (!n) return null; return 'Tôi vừa dự tiết dạy minh họa bài "' + (val('tcLesson') || '(chưa ghi tên bài)') + '", môn ' + val('tcSubject') + ' lớp ' + val('tcGrade') + ' trong buổi sinh hoạt chuyên môn theo nghiên cứu bài học. Ghi chép quan sát việc học của học sinh:\n' + n + '\nHãy giúp tôi chuẩn bị ý kiến phát biểu: (1) những biểu hiện cho thấy học sinh học tốt và nguyên nhân; (2) những chỗ học sinh gặp khó khăn và nguyên nhân có thể (từ nhiệm vụ, học liệu, cách tổ chức); (3) đề xuất điều chỉnh cụ thể cho bài này; (4) điều rút ra cho các bài sau; (5) hai câu hỏi gợi mở để cả tổ thảo luận. Chỉ nói về việc học của học sinh, không nhận xét xếp loại giáo viên dạy.' + ($('tcMinutes') && $('tcMinutes').checked ? '\nSau đó soạn dàn ý biên bản sinh hoạt chuyên môn theo nghiên cứu bài học: thời gian, địa điểm, thành phần (để trống cho tôi điền), nội dung, tóm tắt các ý kiến trên, kết luận và việc cần làm tiếp.' : ''); } },
    { id: 'free', icon: '💬', title: 'Hỏi tự do', sub: 'Kế hoạch, báo cáo, tình huống sư phạm' }
  ];
  function taskOf(id) { return TASKS.filter(function (t) { return t.id === id; })[0] || TASKS[TASKS.length - 1]; }
  function chatOf(id) { if (!S.chats[id]) S.chats[id] = { messages: [], map: [] }; return S.chats[id]; }
  function sendChat(text, summary) {
    text = String(text || '').trim(); if (!text || S.busy) return;
    var chat = chatOf(S.task), masked = mask(text, chat.map);
    chat.messages.push({ role: 'user', text: masked, shown: summary || text });
    setBusy('chat'); renderChat();
    generate({ system: C_SYSTEM, contents: chat.messages.map(function (m) { return { role: m.role, parts: [{ text: m.text }] }; }), temperature: 0.6, maxOutputTokens: 8192, timeoutMs: 100000 })
      .then(function (r) { chat.messages.push({ role: 'model', text: r.text, shown: unmask(r.text, chat.map), truncated: r.truncated }); setBusy(''); renderChat(); })
      .catch(function (e) { chat.messages.pop(); chat.error = { message: e.message, code: e.code, text: text }; setBusy(''); renderChat(); });
  }

  /* ---------- Giao diện ---------- */
  function setBusy(b) { S.busy = b; var v = $(VIEW); if (v) v.classList.toggle('ta-busy', !!b); var g = $('taGenerate'); if (g) g.textContent = b === 'gen' ? '⏳ Đang soạn câu hỏi…' : '✨ Tạo câu hỏi'; ['taGenerate','taMore', 'taReview', 'taSave', 'taPlay', 'taChatSend', 'taTaskRun', 'taKeySave', 'taKeyTest'].forEach(function (id) { var e = $(id); if (e) e.disabled = !!b || e.hasAttribute('data-ta-off'); }); }
  function setNote(text, bad, code) {
    S.note = text; var n = $('taNote'); if (!n) return;
    n.className = 'ta-note' + (bad ? ' bad' : '') + (!bad && S.busy && text ? ' ta-note-busy' : '') + (text ? '' : ' empty');
    n.innerHTML = esc(text) + (code === 'NO_KEY' || code === 'OLD_SERVER' || code === 'KEY_INVALID' || code === 'KEY_DENIED' ? ' <button type="button" class="btn soft" data-ta-tab="setup">Mở Kết nối AI</button>' : '') + (bad && code && code !== 'BAD_OUTPUT' ? ' <button type="button" class="btn soft" data-ta-paste>Dùng cách dán ChatGPT</button>' : '');
  }
  function paintStatus() {
    var c = $('taStatus'); if (!c) return; var s = S.status;
    if (!s) { c.textContent = 'Đang kiểm tra kết nối AI…'; c.className = 'ta-chip'; return; }
    if (!s.server) { c.textContent = WEB ? '🌐 Bản web: AI Gemini chỉ có ở bản cài trên máy' : '⚠️ Cần khởi động lại máy chủ để bật AI'; c.className = 'ta-chip warn'; }
    else if (!s.configured) { c.textContent = s.web ? '🔑 Dán khóa Gemini của thầy cô để dùng AI' : '🔑 Chưa có khóa Gemini'; c.className = 'ta-chip warn'; }
    else { c.textContent = s.web ? '🟢 Gemini: khóa riêng của thầy cô (' + (s.keyHint || '') + ')' : '🟢 Gemini đã có khóa (' + (s.keyHint || '') + ')'; c.className = 'ta-chip ok'; }
    if (S.tab === 'setup') renderSetup();
  }
  function shell() {
    var v = $(VIEW); if (v) return v;
    var main = doc.querySelector('main.main') || doc.body; v = doc.createElement('section'); v.id = VIEW; v.className = 'view';
    v.innerHTML = '<div class="ta-head"><div><h2>✨ Trợ lý AI</h2><p>Soạn câu hỏi trong một phút rồi chơi ngay; phân tích kết quả sau trò chơi; hỗ trợ ma trận đề, lời nhận xét, góp ý tiết dạy.</p></div><button type="button" class="ta-chip" id="taStatus" data-ta-tab="setup">Đang kiểm tra kết nối AI…</button></div>'
      + '<div class="ta-tabs" role="tablist"><button type="button" role="tab" data-ta-tab="quick">⚡ Tạo câu hỏi nhanh</button><button type="button" role="tab" data-ta-tab="chat">💬 Trợ lý Sư phạm</button><button type="button" role="tab" data-ta-tab="stats">📈 Phân tích</button><button type="button" role="tab" data-ta-tab="setup">⚙️ Kết nối AI</button></div><div id="taBody"></div>';
    main.appendChild(v);
    v.addEventListener('click', onClick); v.addEventListener('change', onChange); v.addEventListener('input', onInput);
    v.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'taChatInput') { e.preventDefault(); var t = e.target.value; e.target.value = ''; sendChat(t); } });
    return v;
  }
  function render() {
    var v = shell(); Array.prototype.forEach.call(v.querySelectorAll('.ta-tabs [data-ta-tab]'), function (b) { var on = b.dataset.taTab === S.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (S.tab === 'chat') renderChatTab(); else if (S.tab === 'setup') renderSetup(); else if (S.tab === 'stats' && win.hmvKetQua) win.hmvKetQua.render($('taBody')); else { if (S.tab === 'stats') S.tab = 'quick'; renderQuick(); }
    paintStatus();
  }
  function renderQuick() {
    var f = prefs().form || {}, grade = f.grade || gradeNow(), body = $('taBody');
    body.innerHTML = '<div class="ta-quick"><section class="card ta-form"><h3>1 · Thầy cô muốn hỏi về bài nào?</h3><div class="ta-grid">'
      + sel('taGrade', 'Lớp', ['1', '2', '3', '4', '5'], grade) + sel('taSubject', 'Môn', SUBJECTS.concat([['__other', 'Môn khác…']]), f.subject || 'Toán')
      + '<label class="ta-f" id="taOtherWrap"' + (f.subject === '__other' ? '' : ' hidden') + '><span>Tên môn</span><input id="taSubjectOther" class="input" value="' + esc(f.other || '') + '"></label>'
      + '<label class="ta-f ta-wide"><span>Bài học / chủ đề</span><input id="taTopic" class="input" placeholder="Ví dụ: Phân số bằng nhau" value="' + esc(f.topic || '') + '"></label>'
      + '</div><div class="ta-grid ta-three">' + sel('taCount', 'Số câu', ['5', '10', '15', '20'], String(f.count || 10)) + sel('taKind', 'Dạng câu', [['ABCD', 'Trắc nghiệm A–B–C–D'], ['TRUEFALSE', 'Đúng / Sai'], ['MIX', 'Hỗn hợp A–B–C–D và Đúng/Sai'], ['SHORT', 'Trả lời ngắn (hỏi miệng)']], f.kind || 'ABCD') + sel('taLevel', 'Mức độ', [['ALL', 'Đủ ba mức'], ['Mức 1', 'Chỉ Mức 1'], ['Mức 2', 'Chỉ Mức 2'], ['Mức 3', 'Chỉ Mức 3']], f.level || 'ALL')
      + '</div><h3>2 · Nguồn bài học <small>(không bắt buộc)</small></h3><textarea id="taSource" class="input ta-source" rows="4" placeholder="Dán nội dung bài học, ghi nhớ trong sách hoặc yêu cầu cần đạt. Để trống thì AI dựa vào tên bài."></textarea>'
      + '<div class="ta-img-row"><label class="btn soft ta-file">📷 Thêm ảnh trang sách<input type="file" id="taImages" accept="image/png,image/jpeg,image/webp" multiple hidden></label><label class="btn soft ta-file">📄 Thêm file Word/PDF<input type="file" id="taDocs" accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple hidden></label><span class="ta-hint">Tối đa 4 ảnh và 2 file PDF gửi nguyên. Chữ trong file Word/PDF được chép vào ô trên để thầy cô xem, sửa. Không dùng tài liệu có tên hay bài làm của học sinh.</span></div><div id="taThumbs" class="ta-thumbs"></div>'
      + '<div class="ta-actions"><button type="button" class="btn color ta-big" id="taGenerate">✨ Tạo câu hỏi</button><button type="button" class="btn soft" data-ta-paste>Cách dán ChatGPT (không cần khóa)</button></div><div id="taNote" class="ta-note empty" role="status"></div></section>'
      + '<section class="card ta-result"><h3>3 · Duyệt, lưu và chơi</h3><div id="taDrafts"></div></section></div>';
    renderThumbs(); renderDrafts(); if (S.note) setNote(S.note); setBusy(S.busy);
  }
  function renderThumbs() { var t = $('taThumbs'); if (!t) return; t.innerHTML = S.images.map(function (im, i) { return '<span class="ta-thumb"><img alt="Ảnh nguồn ' + (i + 1) + '" src="data:' + im.mime + ';base64,' + im.data + '"><button type="button" data-ta-img-del="' + i + '" aria-label="Bỏ ảnh ' + (i + 1) + '">×</button></span>'; }).join('') + S.pdfs.map(function (pf, i) { return '<span class="ta-thumb ta-doc" title="' + esc(pf.name) + '"><span class="ta-doc-name">📄 ' + esc(pf.name) + '</span><button type="button" data-ta-pdf-del="' + i + '" aria-label="Bỏ file ' + esc(pf.name) + '">×</button></span>'; }).join(''); }
  function draftHtml(d, i, bank) {
    var issues = localIssues(d, i, bank), r = d.review, badge = r ? '<span class="ta-badge ' + r.verdict + '">' + (r.verdict === 'ok' ? '✅ AI: ổn' : r.verdict === 'warn' ? '⚠️ AI: nên chỉnh' : '❌ AI: sai') + '</span>' : '';
    var body = '';
    if (d.kind === 'ABCD') body = '<div class="ta-answers">' + d.answers.map(function (a, k) { return '<label class="ta-ans' + (d.correct === k ? ' on' : '') + '"><input type="radio" name="taC' + i + '" data-ta-correct="' + i + '" value="' + k + '"' + (d.correct === k ? ' checked' : '') + ' aria-label="Đáp án đúng là ' + 'ABCD'[k] + '"><b>' + 'ABCD'[k] + '</b><input class="input" data-ta-ans="' + i + ':' + k + '" value="' + esc(a) + '"></label>'; }).join('') + '</div>';
    else if (d.kind === 'TRUEFALSE') body = '<div class="ta-tf">' + ['Đúng', 'Sai'].map(function (a, k) { return '<label class="ta-ans' + (d.correct === k ? ' on' : '') + '"><input type="radio" name="taC' + i + '" data-ta-correct="' + i + '" value="' + k + '"' + (d.correct === k ? ' checked' : '') + '><b>' + a + '</b></label>'; }).join('') + '</div>';
    else body = '<label class="ta-short"><span>Đáp án</span><input class="input" data-ta-short="' + i + '" value="' + esc(d.answerText) + '"></label>';
    return '<article class="ta-draft' + (d.pick ? '' : ' off') + (r && r.verdict !== 'ok' ? ' ' + r.verdict : '') + '" data-ta-draft="' + i + '"><header><label class="ta-pick"><input type="checkbox" data-ta-pick="' + i + '"' + (d.pick ? ' checked' : '') + '> Câu ' + (i + 1) + '</label><span class="ta-kind">' + (d.kind === 'ABCD' ? 'A–B–C–D' : d.kind === 'TRUEFALSE' ? 'Đúng/Sai' : 'Trả lời ngắn') + '</span><select class="select ta-level" data-ta-level="' + i + '" aria-label="Mức độ câu ' + (i + 1) + '">' + ['Mức 1', 'Mức 2', 'Mức 3'].map(function (l) { return '<option' + (l === d.level ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select>' + badge + '<button type="button" class="ta-del" data-ta-del="' + i + '" aria-label="Xóa câu ' + (i + 1) + '">Xóa</button></header>'
      + '<textarea class="input ta-text" rows="2" data-ta-text="' + i + '" aria-label="Nội dung câu ' + (i + 1) + '">' + esc(d.text) + '</textarea>' + body
      + (d.explanation ? '<p class="ta-explain">💡 ' + esc(d.explanation) + '</p>' : '')
      + (issues.length ? '<p class="ta-issues">' + issues.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>' : '')
      + (r && (r.issues.length || r.fix) ? '<div class="ta-review">' + (r.issues.length ? '<ul>' + r.issues.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (r.fix ? '<div class="ta-fix"><b>AI đề nghị sửa:</b> ' + esc([r.fix.text, r.fix.answers ? r.fix.answers.map(function (a, k) { return 'ABCD'[k] + '. ' + a + (k === r.fix.correct ? ' ✔' : ''); }).join(' · ') : '', r.fix.answers ? '' : r.fix.correct != null && d.kind === 'TRUEFALSE' ? 'Đáp án: ' + ['Đúng', 'Sai'][r.fix.correct] : '', r.fix.answerText ? 'Đáp án: ' + r.fix.answerText : ''].filter(Boolean).join(' — ')) + ' <button type="button" class="btn soft" data-ta-fix="' + i + '">Áp dụng</button></div>' : '') + '</div>' : '') + '</article>';
  }
  function renderDrafts() {
    var box = $('taDrafts'); if (!box) return;
    if (S.busy === 'gen') { box.innerHTML = '<div class="ta-working" role="status"><span class="ta-spin" aria-hidden="true"></span><div><b>Đang soạn ' + (parseInt($('taCount') && $('taCount').value, 10) || 10) + ' câu mới…</b><small>Khung này chờ kết quả của lần soạn hiện tại. Thường mất 10–40 giây.</small></div></div>'; return; }
    var saved = !S.busy && S.saved ? '<div class="ta-saved">✅ Đã lưu bộ <b>' + esc(S.saved.name) + '</b> (' + S.saved.count + ' câu) vào Kho. <button type="button" class="btn color" data-ta-play-saved>▶ Chơi ngay</button> <button type="button" class="btn soft" data-ta-open-bank>Mở Kho câu hỏi</button></div>' : '';
    if (!S.drafts.length) { box.innerHTML = saved + '<p class="ta-empty">' + (S.saved ? 'Muốn soạn bộ khác, hãy điền bên trái rồi bấm “Tạo câu hỏi”.' : 'Câu hỏi AI soạn sẽ hiện ở đây để thầy cô sửa, bỏ bớt, rồi lưu vào Kho và chơi ngay.') + '</p>'; return; }
    var bank = bankTexts(), meta = S.meta || { subject: '', topic: '' }, picked = S.drafts.filter(function (d) { return d.pick; }).length;
    box.innerHTML = saved + '<div class="ta-warn">AI có thể soạn sai. Thầy cô đọc lại kiến thức và đáp án trước khi dùng trên lớp.</div>'
      + '<div class="ta-toolbar"><label class="ta-f ta-name"><span>Tên bộ</span><input id="taSetName" class="input" value="' + esc(($('taSetName') && $('taSetName').value) || defaultName(meta)) + '"></label><span class="ta-count" id="taPicked">Đã chọn ' + picked + '/' + S.drafts.length + ' câu</span></div>'
      + S.drafts.map(function (d, i) { return draftHtml(d, i, bank); }).join('')
      + '<div class="ta-actions ta-sticky"><button type="button" class="btn soft" id="taReview">🔎 AI rà soát</button><button type="button" class="btn soft" id="taMore">＋ Soạn thêm</button><button type="button" class="btn soft" id="taSave">💾 Lưu vào Kho</button><button type="button" class="btn color ta-big" id="taPlay">▶ Lưu và chơi ngay</button></div>';
    setBusy(S.busy);
  }
  function syncDrafts() {
    var v = $(VIEW); if (!v) return;
    Array.prototype.forEach.call(v.querySelectorAll('[data-ta-text]'), function (e) { var d = S.drafts[+e.dataset.taText]; if (d) d.text = e.value.replace(/\s+/g, ' ').trim(); });
    Array.prototype.forEach.call(v.querySelectorAll('[data-ta-ans]'), function (e) { var p = e.dataset.taAns.split(':'), d = S.drafts[+p[0]]; if (d) d.answers[+p[1]] = e.value.trim(); });
    Array.prototype.forEach.call(v.querySelectorAll('[data-ta-short]'), function (e) { var d = S.drafts[+e.dataset.taShort]; if (d) d.answerText = e.value.trim(); });
  }
  function renderChatTab() {
    var body = $('taBody');
    body.innerHTML = '<div class="ta-chat"><aside class="ta-tasks" aria-label="Việc cần hỗ trợ">' + TASKS.map(function (t) { return '<button type="button" class="ta-task' + (t.id === S.task ? ' active' : '') + '" data-ta-task="' + t.id + '"><span class="ta-ico">' + t.icon + '</span><span><b>' + t.title + '</b><small>' + t.sub + '</small></span></button>'; }).join('') + '</aside><section class="card ta-thread-card"><div id="taTaskForm"></div><div id="taThread" class="ta-thread" aria-live="polite"></div><div class="ta-composer"><textarea id="taChatInput" class="input" rows="2" placeholder="Nhập yêu cầu hoặc hỏi thêm… (Ctrl + Enter để gửi)"></textarea><button type="button" class="btn color" id="taChatSend">Gửi</button></div><p class="ta-hint">Nội dung được gửi tới Gemini của Google để xử lý. Không nhập thông tin riêng tư của học sinh; họ tên có trong danh sách lớp sẽ tự được thay bằng bí danh.</p></section></div>';
    renderTaskForm(true); renderChat();
  }
  function renderTaskForm(force) {
    var t = taskOf(S.task), box = $('taTaskForm'); if (!box) return; var has = chatOf(S.task).messages.length > 0 || S.busy === 'chat';
    if (force || box.dataset.task !== S.task) { box.dataset.task = S.task; box.innerHTML = '<div class="ta-task-head"><h3>' + t.icon + ' ' + esc(t.title) + '</h3><button type="button" class="btn soft" id="taNewChat" data-ta-new>Cuộc trao đổi mới</button></div>' + (t.form ? '<div id="taFormWrap"><div class="ta-grid">' + t.form() + '</div><div class="ta-actions"><button type="button" class="btn color ta-big" id="taTaskRun">✨ Soạn giúp tôi</button></div></div>' : ''); }
    var wrap = $('taFormWrap'), again = $('taNewChat'); if (wrap) wrap.hidden = has; if (again) again.hidden = !has;
    setBusy(S.busy);
  }
  function renderChat() {
    var box = $('taThread'); if (!box) return; var chat = chatOf(S.task);
    renderTaskForm();
    box.innerHTML = chat.messages.map(function (m, i) {
      if (m.role === 'user') return '<div class="ta-msg user"><div class="ta-bubble">' + esc(m.shown).replace(/\n/g, '<br>') + '</div></div>';
      return '<div class="ta-msg model"><div class="ta-bubble ta-md">' + md(m.shown) + (m.truncated ? '<p class="ta-hint">Câu trả lời bị cắt vì quá dài — hãy gõ “viết tiếp”.</p>' : '') + '</div><div class="ta-msg-actions"><button type="button" class="btn soft" data-ta-copy="' + i + '">Sao chép</button><button type="button" class="btn soft" data-ta-word="' + i + '">Tải tệp Word</button></div></div>';
    }).join('') + (S.busy === 'chat' ? '<div class="ta-msg model"><div class="ta-bubble ta-wait">Trợ lý đang soạn…</div></div>' : '') + (chat.error ? '<div class="ta-note bad">' + esc(chat.error.message) + (chat.error.code === 'NO_KEY' || chat.error.code === 'OLD_SERVER' || chat.error.code === 'KEY_INVALID' ? ' <button type="button" class="btn soft" data-ta-tab="setup">Mở Kết nối AI</button>' : '') + '</div>' : '') + (!chat.messages.length && !taskOf(S.task).form ? '<p class="ta-empty">Thầy cô gõ việc cần hỗ trợ vào ô bên dưới, ví dụ: “Gợi ý kế hoạch sinh hoạt chuyên môn tháng 11 cho tổ khối 4”.</p>' : '');
    if (chat.error && (chat.messages.length || !taskOf(S.task).form) && $('taChatInput') && !$('taChatInput').value) $('taChatInput').value = chat.error.text;
    chat.error = null; box.scrollTop = box.scrollHeight; setBusy(S.busy);
  }
  function renderSetup() {
    var body = $('taBody'), s = S.status || { server: 0 };
    var state = !s.server ? '<div class="ta-note bad">' + esc(OLD_MSG) + '</div>' : s.configured ? '<div class="ta-note">' + (s.web ? 'Đang dùng khóa Gemini <b>riêng của thầy cô</b> (' + esc(s.keyHint) + '), lưu ' + (s.remember ? 'trong trình duyệt này' : 'tạm đến khi đóng trình duyệt') + '.' : 'Đã có khóa Gemini (' + esc(s.keyHint) + ').') + ' Mô hình ưu tiên: <b>' + esc((s.models || [])[0] || '') + '</b>.' + (s.lastError ? ' Lần gọi gần nhất báo: ' + esc(s.lastError.message) : '') + '</div>' : '<div class="ta-note bad">Chưa có khóa Gemini nên AI chưa hoạt động.</div>';
    body.innerHTML = '<div class="ta-setup"><section class="card"><h3>Kết nối Gemini</h3>' + state
      + (WEB && !s.server ? '</section>' : ''
      + (s.web
        ? '<ol class="ta-steps"><li>Mở <b>aistudio.google.com</b>, đăng nhập <b>tài khoản Google của chính thầy cô</b>, chọn <b>Get API key</b> → <b>Create API key</b>.</li><li>Sao chép khóa, dán vào ô dưới đây và bấm <b>Lưu khóa</b>.</li><li>Bấm <b>Kiểm tra kết nối</b>.</li></ol>'
          + '<p class="ta-get-key"><a class="btn color" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Bấm vào đây để lấy mã API key</a></p>'
          + '<div class="ta-note ta-web-key">🔒 Mỗi người dùng một khóa riêng. Khóa chỉ được lưu <b>trong trình duyệt trên máy này</b> và chỉ gửi tới Google (Gemini). Khóa không gửi về trang web, không gửi cho người chia sẻ ứng dụng, và lượt dùng AI tính vào khóa của thầy cô. Trên máy dùng chung (phòng máy, máy mượn), hãy bỏ chọn “Ghi nhớ khóa” hoặc bấm “Xóa khóa” khi dùng xong.</div>'
        : '<ol class="ta-steps"><li>Mở <b>aistudio.google.com</b>, đăng nhập tài khoản Google, chọn <b>Get API key</b> → <b>Create API key</b>.</li><li>Sao chép khóa, dán vào ô dưới đây và bấm <b>Lưu khóa</b>. Khóa được ghi vào tệp <code>CAI-DAT-AI\\khoa-gemini.txt</code> trên máy này, không lưu trong trình duyệt.</li><li>Bấm <b>Kiểm tra kết nối</b>.</li></ol>')
      + '<div class="ta-key"><input type="password" id="taKey" class="input" autocomplete="off" spellcheck="false" placeholder="Dán khóa Gemini vào đây"' + (s.server ? '' : ' disabled') + '><button type="button" class="btn color" id="taKeySave"' + (s.server ? '' : ' disabled data-ta-off') + '>Lưu khóa</button><button type="button" class="btn soft" id="taKeyTest"' + (s.server && s.configured ? '' : ' disabled data-ta-off') + '>Kiểm tra kết nối</button>' + (s.configured ? '<button type="button" class="btn soft" id="taKeyClear">Xóa khóa</button>' : '') + '</div>'
      + (s.web ? '<div class="ta-key-opts"><label class="ta-check"><input type="checkbox" id="taKeyRemember"' + (s.configured && !s.remember ? '' : ' checked') + '> Ghi nhớ khóa trên trình duyệt này (bỏ chọn: đóng trình duyệt là khóa tự xóa)</label><label class="ta-f ta-model"><span>Tên mô hình <small>(không bắt buộc – để trống nếu không chắc)</small></span><input id="taModel" class="input" autocomplete="off" spellcheck="false" placeholder="' + esc(((s.models || [])[0]) || '') + '" value="' + esc(s.model || '') + '"></label></div>' : '')
      + '<div id="taTest" class="ta-note' + (S.test ? '' : ' empty') + '">' + esc(S.test) + '</div></section>')
      + '<section class="card"><h3>Cần biết khi dùng AI</h3><ul class="ta-list"><li>AI cần Internet. Mọi phần khác của ứng dụng vẫn chạy khi mất mạng.</li><li>Với khóa miễn phí, nội dung gửi đi có thể được Google dùng để cải tiến sản phẩm. Vì vậy không gửi tên, điểm, hoàn cảnh hay ảnh bài làm của học sinh.</li><li>Ứng dụng tự thay họ tên có trong danh sách lớp bằng bí danh trước khi gửi, rồi trả lại tên trên màn hình của thầy cô.</li><li>AI có thể sai. Câu hỏi, đề kiểm tra, lời nhận xét đều cần thầy cô đọc lại trước khi dùng.</li><li>Khóa miễn phí có giới hạn số lượt mỗi phút và mỗi ngày; khi hết lượt, hãy chờ rồi thử lại.</li></ul><h3>Không dùng khóa?</h3><p>Thầy cô vẫn soạn được câu hỏi bằng cách tạo câu lệnh, dán sang ChatGPT rồi dán kết quả về.</p><button type="button" class="btn soft" data-ta-paste>Mở cách dán ChatGPT</button></section><div id="dtSettings" class="dt-host"></div></div>';
    if (win.hmvDocTo) win.hmvDocTo.renderSettings($('dtSettings'));   /* 2.2: phần Đọc to câu hỏi */
    setBusy(S.busy);
  }
  function openPaste() { if (typeof win.sharedOpenAI === 'function') win.sharedOpenAI(); else toast('Chưa mở được cách dán ChatGPT.'); }
  function addImages(files) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\/(png|jpeg|webp)$/.test(f.type); }), room = 4 - S.images.length;
    if (!list.length) return; if (list.length > room) toast('Chỉ nhận tối đa 4 ảnh.');
    list.slice(0, Math.max(0, room)).forEach(function (file) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { var max = 1600, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = doc.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); var data = c.toDataURL('image/jpeg', 0.85).split(',')[1]; URL.revokeObjectURL(url); if (S.images.length < 4) { S.images.push({ mime: 'image/jpeg', data: data, name: file.name }); renderThumbs(); } };
      img.onerror = function () { URL.revokeObjectURL(url); toast('Không đọc được ảnh ' + file.name); };
      img.src = url;
    });
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button,[data-ta-tab]') : null; if (!t || t.disabled) return; var d = t.dataset, i;
    if (d.taTab) { S.tab = d.taTab; render(); if (S.tab === 'setup') loadStatus(); return; }
    if ('taPaste' in d) return openPaste();
    if (t.id === 'taGenerate') return runGenerate(false);
    if (t.id === 'taMore') { syncDrafts(); return runGenerate(true); }
    if (t.id === 'taReview') return runReview();
    if (t.id === 'taSave') { saveSet(); return; }
    if (t.id === 'taPlay') { saveSet().then(function (set) { if (set) playSet(set.id); }); return; }
    if ('taPlaySaved' in d && S.saved) return playSet(S.saved.id);
    if ('taOpenBank' in d) { if (typeof win.openView === 'function') win.openView('questions'); return; }
    if (d.taDel) { syncDrafts(); S.drafts.splice(+d.taDel, 1); return renderDrafts(); }
    if (d.taFix) { syncDrafts(); return applyFix(+d.taFix); }
    if (d.taImgDel) { S.images.splice(+d.taImgDel, 1); return renderThumbs(); }
    if (d.taPdfDel) { S.pdfs.splice(+d.taPdfDel, 1); return renderThumbs(); }
    if (d.taTask) { if (d.taTask === 'games') { S.tab = 'quick'; return render(); } S.task = d.taTask; return renderChatTab(); }
    if ('taNew' in d) { S.chats[S.task] = { messages: [], map: [] }; return renderChatTab(); }
    if (t.id === 'taTaskRun') { var task = taskOf(S.task), p = task.prompt ? task.prompt() : null; if (!p) return toast('Hãy điền nội dung chính trước khi soạn.'); return sendChat(p, task.title + ': ' + p.split('\n')[0].slice(0, 220)); }
    if (t.id === 'taChatSend') { var inp2 = $('taChatInput'), txt = inp2.value; inp2.value = ''; return sendChat(txt); }
    if (d.taCopy) { i = +d.taCopy; copyText(chatOf(S.task).messages[i].shown).then(function () { toast('Đã sao chép.'); }); return; }
    if (d.taWord) { i = +d.taWord; var task2 = taskOf(S.task); download('tro-ly-su-pham-' + task2.id + '-' + new Date().toISOString().slice(0, 10) + '.doc', 'application/msword', wordDoc(task2.title, md(chatOf(S.task).messages[i].shown))); return; }
    if (t.id === 'taKeySave') {
      var k = ($('taKey').value || '').trim(); if (!k) return toast('Hãy dán khóa vào ô trước.');
      var rem = $('taKeyRemember'), mdl = $('taModel');
      setBusy('key'); call('key', { key: k, remember: rem ? rem.checked : true, model: mdl ? mdl.value.trim() : '' }, 15000).then(function (s) { S.status = s; S.test = s.web ? 'Đã lưu khóa riêng của thầy cô ' + (s.remember ? 'trong trình duyệt này' : 'tạm thời (đóng trình duyệt là xóa)') + '. Hãy bấm “Kiểm tra kết nối”.' : 'Đã lưu khóa. Hãy bấm “Kiểm tra kết nối”.'; setBusy(''); $('taKey').value = ''; paintStatus(); }).catch(function (e2) { S.test = e2.message; setBusy(''); renderSetup(); }); return;
    }
    if (t.id === 'taKeyClear') { setBusy('key'); call('key', { key: '' }, 15000).then(function (s) { S.status = s; S.test = s.web ? 'Đã xóa khóa khỏi trình duyệt này.' : 'Đã xóa khóa khỏi máy này.'; setBusy(''); paintStatus(); }).catch(function (e3) { S.test = e3.message; setBusy(''); renderSetup(); }); return; }
    if (t.id === 'taKeyTest') {
      var started = Date.now(); S.test = 'Đang gọi thử Gemini…'; setBusy('test'); renderSetup();
      generate({ tier: 'fast', contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng hai từ: SẴN SÀNG' }] }], temperature: 0, maxOutputTokens: 512, timeoutMs: 30000 })
        .then(function (r) { S.test = '✅ Kết nối tốt · mô hình ' + r.model + ' · ' + ((Date.now() - started) / 1000).toFixed(1) + ' giây.'; setBusy(''); loadStatus().then(renderSetup); })
        .catch(function (e4) { S.test = '❌ ' + e4.message; setBusy(''); loadStatus().then(renderSetup); });
      return;
    }
  }
  function onChange(e) {
    var t = e.target, d = t.dataset || {};
    if ((t.id === 'taKeyRemember' || t.id === 'taModel') && S.status && S.status.web && S.status.configured) {
      var opt = { keep: true }; if (t.id === 'taKeyRemember') opt.remember = t.checked; else opt.model = t.value.trim();
      /* Không vẽ lại cả khung (để không xóa khóa thầy cô đang dán dở trong ô) – chỉ cập nhật dòng báo. */
      call('key', opt, 15000).then(function (s2) { S.status = s2; S.test = t.id === 'taModel' ? (s2.model ? 'Đã đặt mô hình ưu tiên: ' + s2.model + '.' : 'Dùng mô hình mặc định.') : s2.remember ? 'Khóa được ghi nhớ trên trình duyệt này.' : 'Khóa chỉ giữ tạm, đóng trình duyệt là tự xóa.'; var n = $('taTest'); if (n) { n.textContent = S.test; n.className = 'ta-note'; } }).catch(function (e5) { S.test = e5.message; var n = $('taTest'); if (n) { n.textContent = S.test; n.className = 'ta-note bad'; } });
      return;
    }
    if (t.id === 'taSubject') { var w = $('taOtherWrap'); if (w) w.hidden = t.value !== '__other'; return; }
    if (t.id === 'taImages') { addImages(t.files); t.value = ''; return; }
    if (t.id === 'taDocs') { addDocs(t.files); t.value = ''; return; }
    if (d.taPick) { S.drafts[+d.taPick].pick = t.checked; var art = t.closest('.ta-draft'); if (art) art.classList.toggle('off', !t.checked); var c = $('taPicked'); if (c) c.textContent = 'Đã chọn ' + S.drafts.filter(function (x) { return x.pick; }).length + '/' + S.drafts.length + ' câu'; return; }
    if (d.taCorrect) { syncDrafts(); S.drafts[+d.taCorrect].correct = +t.value; return renderDrafts(); }
    if (d.taLevel) { S.drafts[+d.taLevel].level = t.value; return; }
  }
  function onInput(e) { var d = e.target.dataset || {}; if (d.taText || d.taAns || d.taShort) syncDrafts(); }

  function open(tab) { if (tab) S.tab = tab; render(); loadStatus(); }
  function install() {
    shell();
    var nav = doc.querySelector('.sidebar .nav-main');
    if (nav && !nav.querySelector('[data-view="' + VIEW + '"]')) { var b = doc.createElement('button'); b.type = 'button'; b.dataset.view = VIEW; b.setAttribute('aria-label', 'Trợ lý AI'); b.innerHTML = '<span aria-hidden="true">✨</span>Trợ lý AI'; b.onclick = function () { win.openView(VIEW); }; var after = nav.querySelector('[data-view="questions"]'); if (after && after.nextSibling) nav.insertBefore(b, after.nextSibling); else nav.appendChild(b); }
    var old = win.openView;
    if (typeof old === 'function' && !old.__hmvTroLy) { win.openView = function (id) { var out = old.apply(this, arguments); if (id === VIEW) open(); return out; }; win.openView.__hmvTroLy = true; }
    loadStatus();
  }
  /* 2.1: nhận các câu AI soạn từ thẻ Phân tích để duyệt, lưu và chơi như câu soạn nhanh. */
  function loadDrafts(list, meta, note) { S.drafts = (list || []).slice(); S.meta = meta || S.meta; S.saved = null; S.dropped = 0; S.note = note || ''; S.tab = 'quick'; var box = $('taSetName'); if (box) box.value = ''; render(); }
  win.hmvTroLyAI = { loadDrafts: loadDrafts, open: function (tab) { if (typeof win.openView === 'function') win.openView(VIEW); open(tab); }, status: function () { return S.status; }, refresh: loadStatus, state: function () { return { tab: S.tab, busy: S.busy, drafts: S.drafts.length, saved: S.saved, task: S.task }; }, generate: generate, parseJson: parseJson, ready: ready, _test: { normalizeQuestions: normalizeQuestions, md: md, mask: mask, unmask: unmask, questionPrompt: questionPrompt, toKho: toKho } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { win.setTimeout(install, 0); }); else win.setTimeout(install, 0);
})(window);
