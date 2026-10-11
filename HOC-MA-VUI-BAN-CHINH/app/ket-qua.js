/* BAN-CHINH 2.1 · Phân tích sau trò chơi.
 *
 * - Mỗi lần một câu hỏi được chấm trong trò chơi (Kéo co, Ai nhanh hơn, Hộp quà, Chinh phục tri thức, Quiz Nghiêng Đầu,
 *   Bóng bay, Bình chọn ngón tay), ứng dụng ghi lại: câu nào, phương án được chọn, đúng hay sai. KHÔNG ghi tên học sinh, tên đội.
 * - Số liệu nằm trong trình duyệt của máy này (localStorage "hmv_ket_qua_v1"), tối đa 3000 lượt gần nhất.
 * - Thẻ "📈 Phân tích" trong Trợ lý AI: câu nào lớp sai nhiều, hay chọn nhầm phương án nào; tạo bộ "Ôn lại chỗ sai" (không cần mạng);
 *   nhờ AI nhận xét chỗ hổng và soạn câu tương tự (cần Gemini).
 */
(function (win) {
  'use strict';
  var doc = win.document, KEY = 'hmv_ket_qua_v1', MAX = 3000;
  var GAMES = { tug: 'Kéo co kiến thức', buzzer: 'Ai nhanh hơn', gift: 'Hộp quà bí mật', millionaire: 'Chinh phục tri thức', 'head-tilt': 'Quiz Nghiêng Đầu', balloon: 'Bóng bay tri thức', poll: 'Bình chọn ngón tay' };
  var data = load(), V = { period: 'today', set: 'ALL', weak: false, busy: '', note: '', bad: false, comment: '', ai: null, saved: null, confirm: false };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(t) { return String(t == null ? '' : t).toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim(); }
  function toast(m) { if (typeof win.showToast === 'function') win.showToast(m); }
  function load() { try { var d = JSON.parse(win.localStorage.getItem(KEY) || 'null'); if (d && d.v === 1 && d.q && Array.isArray(d.e)) return d; } catch (e) {} return { v: 1, q: {}, e: [] }; }
  function save() {
    if (data.e.length > MAX) data.e.splice(0, data.e.length - MAX);
    var used = {}; data.e.forEach(function (e) { used[e.k] = 1; }); Object.keys(data.q).forEach(function (k) { if (!used[k]) delete data.q[k]; });
    try { win.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* đầy bộ nhớ: bỏ bớt một nửa số liệu cũ rồi thử lại */ data.e.splice(0, Math.floor(data.e.length / 2)); try { win.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e2) {} }
  }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function keyOf(q) { return hash(norm(q.text) + '|' + (q.answers || []).map(norm).join('|') + '|' + q.correct); }

  /* Ghi một lượt. ev: {game, source, text, answers, correct, chosen, ok} hoặc (bình chọn) {game, …, counts:[…], total, right}. */
  function record(ev) {
    if (!ev || !ev.game) return false;
    var text = String(ev.text || '').replace(/\s+/g, ' ').trim(), answers = (Array.isArray(ev.answers) ? ev.answers : []).map(function (a) { return String(a == null ? '' : a).trim(); });
    var correct = ev.correct === null || ev.correct === undefined || ev.correct === '' ? null : Number(ev.correct);
    if (!text) return false;
    if (correct !== null && !(Number.isInteger(correct) && correct >= 0 && correct < answers.length)) correct = null;
    var polled = Array.isArray(ev.counts);
    if (polled && correct === null) return false;                 /* bình chọn ý kiến, không có đáp án: không tính vào phân tích */
    if (!polled && typeof ev.ok !== 'boolean') return false;
    var q = { text: text, answers: answers, correct: correct, kind: ev.kind || '', grade: ev.grade || '', subject: ev.subject || '', topic: ev.topic || '', key: ev.answerText || '' }, k = keyOf(q);
    if (!data.q[k]) data.q[k] = q; else { ['grade', 'subject', 'topic'].forEach(function (f) { if (!data.q[k][f] && q[f]) data.q[k][f] = q[f]; }); }
    var e = { t: Date.now(), g: ev.game, k: k, s: String(ev.source || '').slice(0, 80) };
    if (polled) { e.c = ev.counts.slice(0, answers.length).map(function (n) { return Math.max(0, Math.round(Number(n) || 0)); }); if (!e.c.reduce(function (a, b) { return a + b; }, 0)) return false; }
    else { e.o = ev.ok ? 1 : 0; var ch = Number(ev.chosen); if (ev.chosen !== null && ev.chosen !== undefined && Number.isInteger(ch) && ch >= 0 && ch < answers.length) e.x = ch; }
    data.e.push(e); save(); return true;
  }
  /* Lối gọi ngắn cho các trò chơi: hmvRec('tug', câuHỏi, vịTríĐãChọn, đúngSai). */
  function rec(game, q, chosen, ok) {
    try {
      if (!q) return false; var name = typeof win.hmvC6SelectionName === 'function' ? win.hmvC6SelectionName(game) : '';
      return record({ game: game, source: name || '', text: q.text || q.question, answers: q.answers || q.options || [], correct: q.correct, kind: q.kind || q.type, grade: q.grade, subject: q.subject, topic: q.topic, answerText: q.answerText, chosen: chosen, ok: !!ok });
    } catch (e) { return false; }
  }
  function since(period) { var d = new Date(); if (period === 'today') { d.setHours(0, 0, 0, 0); return d.getTime(); } if (period === 'week') return Date.now() - 7 * 864e5; return 0; }
  function events(period, set) { var t0 = since(period || 'all'); return data.e.filter(function (e) { return e.t >= t0 && (!set || set === 'ALL' || e.s === set); }); }
  function summary(period, set) {
    var list = events(period, set), by = {}, order = [], attempts = 0, right = 0, games = {};
    list.forEach(function (e) {
      var q = data.q[e.k]; if (!q) return;
      var r = by[e.k]; if (!r) { r = by[e.k] = { key: e.k, text: q.text, answers: q.answers, correct: q.correct, kind: q.kind, grade: q.grade, subject: q.subject, topic: q.topic, answerText: q.key, attempts: 0, right: 0, wrong: q.answers.map(function () { return 0; }), games: {}, last: 0 }; order.push(r); }
      if (e.c) { var n = e.c.reduce(function (a, b) { return a + b; }, 0); r.attempts += n; r.right += e.c[q.correct] || 0; e.c.forEach(function (v, i) { if (i !== q.correct) r.wrong[i] += v; }); attempts += n; right += e.c[q.correct] || 0; }
      else { r.attempts++; r.right += e.o; if (!e.o && e.x !== undefined) r.wrong[e.x]++; attempts++; right += e.o; }
      r.games[e.g] = 1; games[e.g] = 1; r.last = Math.max(r.last, e.t);
    });
    order.forEach(function (r) { r.pct = r.attempts ? Math.round(r.right * 100 / r.attempts) : 0; var top = -1; r.wrong.forEach(function (v, i) { if (v > 0 && (top < 0 || v > r.wrong[top])) top = i; }); r.topWrong = top; });
    order.sort(function (a, b) { return a.pct - b.pct || b.attempts - a.attempts || a.text.localeCompare(b.text, 'vi'); });
    return { attempts: attempts, right: right, pct: attempts ? Math.round(right * 100 / attempts) : 0, questions: order, weak: order.filter(function (r) { return r.pct < 60; }), games: Object.keys(games), events: list.length };
  }
  function sources() { var s = {}; data.e.forEach(function (e) { if (e.s) s[e.s] = 1; }); return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, 'vi'); }); }
  function clear() { data = { v: 1, q: {}, e: [] }; try { win.localStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- Bộ "Ôn lại chỗ sai" ---------- */
  function kindOf(r) { var a = r.answers.map(norm).sort().join('|'); return r.answers.length === 2 && a === 'sai|đúng' ? 'TRUEFALSE' : r.answers.length === 4 ? 'ABCD' : r.answers.length >= 2 ? 'SINGLE' : 'SHORT'; }
  function toKho(r) {
    var kind = kindOf(r), labels = kind === 'TRUEFALSE' ? r.answers.slice() : r.answers.map(function (_, i) { return String.fromCharCode(65 + i); });
    return { id: 'on-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), text: r.text, question: r.text, kind: kind, type: kind, answers: r.answers.slice(), options: r.answers.slice(), optionLabels: labels, correct: r.correct, correctAnswers: [r.correct], correctAnswer: r.answers[r.correct], answerText: '', explanation: '', hint: '', pairs: [], grade: r.grade || 'Chưa xác định lớp', subject: r.subject || 'Chưa xác định môn', topic: r.topic || 'Chưa xác định chủ đề', lesson: r.topic || 'Chưa xác định bài học', difficulty: 'Chưa xác định mức độ', level: 'Mức 1', source: 'Ôn lại chỗ sai (phân tích sau trò chơi)', points: 1, time: 30, answerStatus: 'Hợp lệ', reviewStatus: 'Hợp lệ', classificationStatus: 'Có căn cứ đã nhập', reviewErrors: [], answerKeyValid: true };
  }
  function pickWeak(sum) { var list = sum.weak.filter(function (r) { return r.correct !== null && r.answers.length >= 2; }); if (list.length < 3) list = sum.questions.filter(function (r) { return r.correct !== null && r.answers.length >= 2 && r.pct < 100; }).slice(0, 10); return list.slice(0, 20); }
  function common(list, f) { var v = list.map(function (r) { return r[f]; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }); return v.length === 1 ? v[0] : v.length ? 'Nhiều giá trị' : ''; }
  function saveReviewSet(list) {
    var db = win.audioDB;
    if (!list.length) return Promise.reject(new Error('Chưa có câu nào bị sai để ôn lại.'));
    if (!db || !db.objectStoreNames.contains('questionSets')) return Promise.reject(new Error('Kho lưu trữ chưa sẵn sàng. Hãy tải lại trang rồi thử lại.'));
    var now = new Date(), iso = now.toISOString(), base = 'Ôn lại chỗ sai · ' + now.toLocaleDateString('vi-VN'), taken = (win.questionBankSets || []).map(function (s) { return s.name; }), name = base, k = 2; while (taken.indexOf(name) >= 0) name = base + ' (' + (k++) + ')';
    var set = { id: 'on-set-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: name, setTitle: name, description: 'Các câu lớp trả lời sai nhiều trong trò chơi, gom lại để ôn.', grade: common(list, 'grade') || 'Chưa xác định lớp', schoolYear: (doc.getElementById('workspaceYear') || {}).value || 'Chưa xác định năm học', subject: common(list, 'subject') || 'Chưa xác định môn', topic: common(list, 'topic') || 'Ôn lại chỗ sai', lesson: 'Ôn lại chỗ sai', difficulty: 'Nhiều giá trị', source: 'Phân tích sau trò chơi', purpose: 'Củng cố', createdAt: iso, updatedAt: iso, questions: list.map(toKho), games: [] };
    return new Promise(function (resolve, reject) {
      var tx; try { tx = db.transaction('questionSets', 'readwrite'); tx.objectStore('questionSets').add(set); } catch (e) { reject(e); return; }
      tx.oncomplete = function () { if (!Array.isArray(win.questionBankSets)) win.questionBankSets = []; win.questionBankSets.push(set); win.questionBankSelected = set.id; resolve(set); };
      tx.onerror = tx.onabort = function () { reject(tx.error || new Error('Lưu thất bại. Dữ liệu cũ vẫn nguyên.')); };
    });
  }
  function playSet(id) { if (typeof win.openView !== 'function') return; win.openView('questions'); var tries = 0; (function look() { var b = doc.querySelector('#questions [data-kho-play="' + id + '"]'); if (b) { b.click(); return; } if (tries++ < 20) win.setTimeout(look, 100); })(); }

  /* ---------- AI nhận xét ---------- */
  var A_SCHEMA = { type: 'OBJECT', properties: { comment: { type: 'STRING' }, questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, kind: { type: 'STRING', enum: ['ABCD', 'TRUEFALSE'] }, answers: { type: 'ARRAY', items: { type: 'STRING' } }, correct: { type: 'INTEGER' }, answerText: { type: 'STRING' }, explanation: { type: 'STRING' }, level: { type: 'STRING', enum: ['Mức 1', 'Mức 2', 'Mức 3'] } }, required: ['text', 'kind', 'answers', 'correct', 'answerText', 'explanation', 'level'] } } }, required: ['comment', 'questions'] };
  var A_SYSTEM = 'Bạn là giáo viên tiểu học Việt Nam giàu kinh nghiệm, phân tích kết quả trả lời của lớp sau một trò chơi học tập để tìm chỗ học sinh chưa vững và soạn câu hỏi ôn lại. Nhận xét dựa trên số liệu được cung cấp, không suy diễn quá mức khi số lượt còn ít; lời lẽ tích cực, hướng tới việc giúp học sinh tiến bộ; không nhắc tới cá nhân học sinh. Câu hỏi mới phải đúng chương trình của khối lớp, đáp án chính xác tuyệt đối. Chỉ trả về JSON đúng lược đồ.';
  function aiPrompt(list, sum) {
    var grade = common(list, 'grade'), subject = common(list, 'subject'), n = Math.min(10, Math.max(5, list.length));
    var rows = list.map(function (r, i) { return { stt: i + 1, cau_hoi: r.text, phuong_an: r.answers, dap_an_dung: r.answers[r.correct], so_luot: r.attempts, ti_le_dung: r.pct + '%', hay_chon_sai: r.topWrong >= 0 ? r.answers[r.topWrong] + ' (' + r.wrong[r.topWrong] + ' lượt)' : '' }; });
    return ['Dưới đây là các câu hỏi mà lớp' + (grade && grade !== 'Nhiều giá trị' ? ' (' + grade + ')' : '') + ' trả lời sai nhiều trong các trò chơi' + (subject && subject !== 'Nhiều giá trị' ? ' môn ' + subject : '') + '. Toàn bộ: ' + sum.attempts + ' lượt trả lời, đúng ' + sum.pct + '%.',
      JSON.stringify(rows),
      'Yêu cầu:',
      '1. comment: nhận xét ngắn bằng Markdown (tối đa khoảng 180 từ) gồm ba mục: "Chỗ lớp chưa vững" (gom các câu theo kiến thức, kĩ năng), "Lỗi thường gặp" (suy ra từ phương án sai hay được chọn), "Gợi ý dạy lại" (2–3 việc cụ thể làm được trong 5–10 phút). Nếu số lượt còn ít, nói rõ nhận xét chỉ mang tính tham khảo.',
      '2. questions: soạn đúng ' + n + ' câu hỏi MỚI, tương tự về kiến thức với các câu trên nhưng đổi số liệu, ngữ cảnh; dễ hơn một chút để học sinh lấy lại tự tin. Câu "ABCD": answers có đúng 4 phương án khác nhau, một phương án đúng, correct là vị trí đúng (0–3), answerText để rỗng. Câu "TRUEFALSE": answers là ["Đúng","Sai"], correct là 0 nếu mệnh đề đúng, 1 nếu sai. Câu hỏi không quá 150 ký tự, phương án không quá 45 ký tự; explanation là một câu giải thích ngắn.'].join('\n');
  }
  function runAi(el) {
    var ai = win.hmvTroLyAI; if (!ai || typeof ai.generate !== 'function') { V.note = 'Chưa có Trợ lý AI.'; V.bad = true; return render(el); }
    var sum = summary(V.period, V.set), list = pickWeak(sum); if (!list.length) { V.note = 'Chưa có câu nào bị sai để phân tích.'; V.bad = true; return render(el); }
    V.busy = 'ai'; V.note = 'AI đang xem số liệu và soạn câu ôn lại… (thường mất 10–40 giây)'; V.bad = false; render(el);
    ai.generate({ system: A_SYSTEM, contents: [{ role: 'user', parts: [{ text: aiPrompt(list, sum) }] }], json: true, schema: A_SCHEMA, temperature: 0.5, maxOutputTokens: 9000, timeoutMs: 90000 })
      .then(function (r) {
        var d = ai.parseJson(r.text), res = d && ai._test.normalizeQuestions(d.questions || []);
        if (!d || !String(d.comment || '').trim()) throw new Error('AI trả về kết quả không đọc được. Hãy thử lại.');
        V.comment = String(d.comment).trim(); V.ai = { list: res ? res.list : [], meta: { grade: (String(common(list, 'grade')).match(/[1-5]/) || ['4'])[0], subject: common(list, 'subject') && common(list, 'subject') !== 'Nhiều giá trị' ? common(list, 'subject') : 'Tổng hợp', topic: 'Ôn lại chỗ sai' } };
        V.busy = ''; V.note = ''; render(el);
      })
      .catch(function (e) { V.busy = ''; V.note = e.message || 'AI gặp lỗi. Hãy thử lại.'; V.bad = true; V.code = e.code; render(el); });
  }

  /* ---------- Giao diện (nằm trong thẻ "Phân tích" của Trợ lý AI) ---------- */
  function fmtTime(t) { var d = new Date(t); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  function render(el) {
    el = el || doc.getElementById('kqRoot') && doc.getElementById('kqRoot').parentNode; if (!el) return;
    var all = data.e.length, sum = summary(V.period, V.set), srcs = sources(), shown = V.weak ? sum.weak : sum.questions, md = win.hmvTroLyAI && win.hmvTroLyAI._test ? win.hmvTroLyAI._test.md : function (t) { return esc(t); };
    if (V.set !== 'ALL' && srcs.indexOf(V.set) < 0) V.set = 'ALL';
    var opt = function (v, cur, label) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; };
    var head = '<div class="kq-bar"><label class="ta-f"><span>Thời gian</span><select id="kqPeriod" class="select">' + opt('today', V.period, 'Hôm nay') + opt('week', V.period, '7 ngày qua') + opt('all', V.period, 'Tất cả') + '</select></label><label class="ta-f"><span>Bộ câu hỏi</span><select id="kqSet" class="select">' + opt('ALL', V.set, 'Tất cả các bộ') + srcs.map(function (s) { return opt(s, V.set, s); }).join('') + '</select></label><label class="ta-check kq-weak"><input type="checkbox" id="kqWeak"' + (V.weak ? ' checked' : '') + '> Chỉ hiện câu đúng dưới 60%</label></div>';
    var body;
    if (!all) body = '<p class="ta-empty">Chưa có số liệu. Sau khi lớp chơi một trò có câu hỏi (Kéo co, Ai nhanh hơn, Hộp quà, Chinh phục tri thức, Quiz Nghiêng Đầu, Bóng bay, Bình chọn ngón tay), kết quả từng câu sẽ hiện ở đây.</p>';
    else if (!sum.questions.length) body = '<p class="ta-empty">Không có lượt trả lời nào trong khoảng thời gian này. Hãy chọn “7 ngày qua” hoặc “Tất cả”.</p>';
    else {
      body = '<div class="kq-stats"><div><b>' + sum.attempts + '</b><span>lượt trả lời</span></div><div class="' + (sum.pct >= 80 ? 'good' : sum.pct >= 60 ? 'mid' : 'low') + '"><b>' + sum.pct + '%</b><span>trả lời đúng</span></div><div><b>' + sum.questions.length + '</b><span>câu đã hỏi</span></div><div class="' + (sum.weak.length ? 'low' : 'good') + '"><b>' + sum.weak.length + '</b><span>câu đúng dưới 60%</span></div></div>'
        + '<p class="ta-hint">Trò đã chơi: ' + esc(sum.games.map(function (g) { return GAMES[g] || g; }).join(', ')) + '. Trong trò chơi theo đội, mỗi lượt là câu trả lời của một đội hoặc một bạn, không phải của cả lớp; hãy xem đây là gợi ý để hỏi lại, không phải điểm số.</p>'
        + (shown.length ? '<div class="kq-table-wrap"><table class="kq-table"><thead><tr><th>#</th><th>Câu hỏi</th><th>Lượt</th><th>Đúng</th><th>Hay chọn sai</th></tr></thead><tbody>' + shown.slice(0, 40).map(function (r, i) { return '<tr class="' + (r.pct < 60 ? 'low' : r.pct < 80 ? 'mid' : 'good') + '"><td>' + (i + 1) + '</td><td class="kq-q">' + esc(r.text) + (r.correct !== null ? '<small>Đáp án: ' + esc(r.answers[r.correct]) + '</small>' : '') + '</td><td>' + r.attempts + '</td><td><span class="kq-pct"><i style="width:' + r.pct + '%"></i></span><b>' + r.pct + '%</b></td><td>' + (r.topWrong >= 0 ? esc(r.answers[r.topWrong]) + ' <small>(' + r.wrong[r.topWrong] + ' lượt)</small>' : '<small>–</small>') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (shown.length > 40 ? '<p class="ta-hint">Đang hiện 40 câu thấp nhất trong ' + shown.length + ' câu.</p>' : '') : '<p class="ta-empty">Không có câu nào đúng dưới 60% — lớp làm tốt.</p>');
    }
    var canReview = all && pickWeak(sum).length > 0;
    var actions = all ? '<div class="ta-actions kq-actions"><button type="button" class="btn color" id="kqReview"' + (canReview && !V.busy ? '' : ' disabled') + '>📦 Tạo bộ “Ôn lại chỗ sai”</button><button type="button" class="btn soft" id="kqAi"' + (canReview && !V.busy ? '' : ' disabled') + '>✨ AI nhận xét và soạn câu tương tự</button><span class="kq-spacer"></span>' + (V.confirm ? '<span class="kq-confirm">Xóa toàn bộ số liệu phân tích trên máy này? <button type="button" class="btn soft" id="kqClearYes">Xóa</button> <button type="button" class="btn soft" id="kqClearNo">Thôi</button></span>' : '<button type="button" class="btn soft" id="kqClear">🗑 Xóa số liệu</button>') + '</div>' : '';
    var saved = V.saved ? '<div class="ta-saved">✅ Đã lưu bộ <b>' + esc(V.saved.name) + '</b> (' + V.saved.count + ' câu) vào Kho. <button type="button" class="btn color" id="kqPlay">▶ Chơi ngay</button></div>' : '';
    var note = V.note ? '<div class="ta-note' + (V.bad ? ' bad' : '') + '">' + esc(V.note) + (V.bad && (V.code === 'NO_KEY' || V.code === 'OLD_SERVER' || V.code === 'KEY_INVALID') ? ' <button type="button" class="btn soft" data-ta-tab="setup">Mở Kết nối AI</button>' : '') + '</div>' : '';
    var ai = V.comment ? '<section class="kq-ai"><h3>✨ Nhận xét của AI</h3><div class="ta-md">' + md(V.comment) + '</div>' + (V.ai && V.ai.list.length ? '<div class="ta-actions"><button type="button" class="btn color" id="kqDrafts">Xem và duyệt ' + V.ai.list.length + ' câu ôn AI vừa soạn ▶</button></div>' : '') + '<p class="ta-hint">AI chỉ thấy câu hỏi và số lượt đúng, sai; không thấy tên học sinh. Nhận xét có thể chưa đúng — thầy cô là người quyết định.</p></section>' : '';
    el.innerHTML = '<div id="kqRoot" class="kq"><section class="card"><h3>📈 Lớp đã trả lời thế nào?</h3>' + head + saved + note + body + actions + '</section>' + ai + '</div>';
    bind(el);
    if (!V.busy) { V.note = ''; V.bad = false; V.code = ''; }   /* thông báo chỉ hiện một lần */
  }
  function bind(el) {
    var $ = function (id) { return doc.getElementById(id); }, on = function (id, type, fn) { var e = $(id); if (e) e.addEventListener(type, fn); };
    on('kqPeriod', 'change', function (e) { V.period = e.target.value; V.saved = null; render(el); });
    on('kqSet', 'change', function (e) { V.set = e.target.value; V.saved = null; render(el); });
    on('kqWeak', 'change', function (e) { V.weak = e.target.checked; render(el); });
    on('kqReview', 'click', function () { var list = pickWeak(summary(V.period, V.set)); V.busy = 'save'; saveReviewSet(list).then(function (set) { V.busy = ''; V.saved = { id: set.id, name: set.name, count: set.questions.length }; V.note = ''; toast('Đã lưu bộ "' + set.name + '" vào Kho.'); render(el); }, function (e) { V.busy = ''; V.note = e.message || 'Không lưu được.'; V.bad = true; render(el); }); });
    on('kqPlay', 'click', function () { if (V.saved) playSet(V.saved.id); });
    on('kqAi', 'click', function () { runAi(el); });
    on('kqDrafts', 'click', function () { if (V.ai && win.hmvTroLyAI && typeof win.hmvTroLyAI.loadDrafts === 'function') win.hmvTroLyAI.loadDrafts(V.ai.list.map(function (d) { return Object.assign({}, d, { pick: true, review: null }); }), V.ai.meta, 'AI đã soạn ' + V.ai.list.length + ' câu ôn lại từ kết quả trò chơi. Thầy cô kiểm tra rồi lưu.'); });
    on('kqClear', 'click', function () { V.confirm = true; render(el); });
    on('kqClearNo', 'click', function () { V.confirm = false; render(el); });
    on('kqClearYes', 'click', function () { clear(); V.confirm = false; V.comment = ''; V.ai = null; V.saved = null; V.note = 'Đã xóa số liệu phân tích trên máy này. Câu hỏi trong Kho không bị ảnh hưởng.'; V.bad = false; render(el); });
  }

  win.hmvRec = rec;
  win.hmvKetQua = { record: record, rec: rec, summary: summary, events: events, sources: sources, clear: clear, render: render, count: function () { return data.e.length; }, reload: function () { data = load(); }, _test: { pickWeak: pickWeak, toKho: toKho, aiPrompt: aiPrompt, view: V } };
})(window);
