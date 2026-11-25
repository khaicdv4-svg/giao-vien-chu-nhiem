/* BAN-CHINH 2.46 · Trợ lý AI → Tạo câu hỏi nhanh: lấy nguồn bài học từ kho PPCT Hub của tổ.
 *
 * - Chọn lớp, môn → danh sách bài theo phân phối chương trình (bảng công khai ppct_kho_chung_tiet, không cần đăng nhập).
 * - Đăng nhập tài khoản PPCT Hub (tài khoản trong tổ chức của trường) → app nối mỗi bài với số trang SGK
 *   (sgk_books, sgk_sections) và tải ảnh các trang đó (kho riêng sgk-pages). Quyền đọc do PPCT Hub quyết định;
 *   app không mở thêm quyền nào. Phiên đăng nhập giữ trong tab (hoặc trên máy nếu thầy cô chọn "Ghi nhớ").
 * - Ảnh trang được gửi kèm cho AI (tối đa 8 trang) để câu hỏi bám sát nội dung, ví dụ, bài tập trong sách.
 */
(function (win) {
  'use strict';
  var doc = win.document;
  var HUB = { url: 'https://jxadtcyteinalzketfbh.supabase.co', key: 'sb_publishable_a2JA7aO7af3I-leaEEcH1Q_iAdnJd5o' };
  try { var ov = JSON.parse(win.localStorage.getItem('hmv_ppct_hub') || 'null'); if (ov && ov.url && ov.key) HUB = ov; } catch (e) {}
  var MAX_PAGES = 8, PER_LESSON = 4, AKEY = 'hmv_ppct_auth_v1';
  var CODE = { 'Toán': 'toan', 'Tiếng Việt': 'tv', 'Khoa học': 'kh', 'Lịch sử và Địa lí': 'lsdl', 'Đạo đức': 'dd', 'Tự nhiên và Xã hội': 'tnxh', 'Tin học': 'th', 'Công nghệ': 'cn', 'Âm nhạc': 'amnhac', 'Mĩ thuật': 'mithuat', 'Giáo dục thể chất': 'gdtc', 'Hoạt động trải nghiệm': 'hdtn' };
  var auth = loadAuth(), cache = {}, M = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { if (typeof win.showToast === 'function') win.showToast(t); }
  function $(id) { return doc.getElementById(id); }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/y/g, 'i').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* ---------- Đăng nhập PPCT Hub ---------- */
  function loadAuth() {
    var a = null;
    try { a = JSON.parse(win.sessionStorage.getItem(AKEY) || 'null') || JSON.parse(win.localStorage.getItem(AKEY) || 'null'); } catch (e) {}
    return a && a.refresh ? a : null;
  }
  function saveAuth(a, remember) {
    auth = a;
    try { win.sessionStorage.removeItem(AKEY); win.localStorage.removeItem(AKEY); } catch (e) {}
    if (!a) return;
    try { (remember ? win.localStorage : win.sessionStorage).setItem(AKEY, JSON.stringify(a)); } catch (e) {}
  }
  function api(path, opt) {
    opt = opt || {};
    var h = Object.assign({ apikey: HUB.key }, opt.headers || {});
    if (opt.auth && auth && auth.token) h.Authorization = 'Bearer ' + auth.token;
    if (opt.body && !h['Content-Type']) h['Content-Type'] = 'application/json';
    return win.fetch(HUB.url + path, { method: opt.method || 'GET', headers: h, body: opt.body }).catch(function () { throw new Error('Không kết nối được PPCT Hub. Kiểm tra mạng rồi thử lại.'); });
  }
  function json(res) { return res.text().then(function (t) { var b = null; try { b = t ? JSON.parse(t) : null; } catch (e) {} if (!res.ok) { var m = b && (b.error_description || b.msg || b.message || b.error); var er = new Error(m || ('PPCT Hub báo lỗi ' + res.status)); er.status = res.status; throw er; } return b; }); }
  function login(email, pass, remember) {
    return api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email, password: pass }) }).then(json).then(function (r) {
      saveAuth({ token: r.access_token, refresh: r.refresh_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60000, email: (r.user && r.user.email) || email, remember: !!remember }, remember); return auth;
    }).catch(function (e) { if (e.status === 400 || /invalid/i.test(e.message)) throw new Error('Sai email hoặc mật khẩu PPCT Hub.'); throw e; });
  }
  function fresh() {
    if (!auth) return Promise.reject(new Error('Chưa đăng nhập PPCT Hub.'));
    if (auth.token && Date.now() < auth.exp) return Promise.resolve(auth);
    return api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: auth.refresh }) }).then(json).then(function (r) {
      saveAuth({ token: r.access_token, refresh: r.refresh_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60000, email: auth.email, remember: auth.remember }, auth.remember); return auth;
    }).catch(function () { saveAuth(null); throw new Error('Phiên đăng nhập PPCT Hub đã hết. Thầy cô đăng nhập lại.'); });
  }
  function logout() { var a = auth; saveAuth(null); cache = {}; if (a && a.token) api('/auth/v1/logout', { method: 'POST', auth: true, headers: { Authorization: 'Bearer ' + a.token } }).catch(function () {}); }

  /* ---------- Dữ liệu ---------- */
  function subjectId(subject, grade) { var c = CODE[subject]; return c ? 'subj-' + c + grade : ''; }
  function ppct(sid, grade) {
    var k = 'p|' + sid; if (cache[k]) return Promise.resolve(cache[k]);
    return api('/rest/v1/ppct_kho_chung_tiet?select=school_year,chu_de,bai,tuan,hoc_ki,tiet_ppct,ten_tiet&grade_id=eq.grade-' + grade + '&subject_id=eq.' + encodeURIComponent(sid) + '&order=tiet_ppct').then(json).then(function (rows) {
      rows = rows || []; var years = rows.map(function (r) { return r.school_year; }).sort(); var y = years[years.length - 1];
      rows = rows.filter(function (r) { return r.school_year === y; });
      var seen = {}, out = [];
      rows.forEach(function (r) { var name = String(r.bai || r.ten_tiet || '').trim(); if (!name) return; var key = name + '|' + r.tuan; if (seen[key]) { seen[key].tiet.push(r.tiet_ppct); return; } var o = { name: name, tuan: r.tuan, hk: r.hoc_ki, tiet: [r.tiet_ppct], chu_de: r.chu_de }; seen[key] = o; out.push(o); });
      cache[k] = { year: y, list: out }; return cache[k];
    });
  }
  function sgk(sid) {
    var k = 's|' + sid; if (cache[k]) return Promise.resolve(cache[k]);
    return fresh().then(function () { return api('/rest/v1/sgk_books?select=id,volume,title,printed_page_offset,status&subject_id=eq.' + encodeURIComponent(sid), { auth: true }).then(json); }).then(function (books) {
      books = (books || []).filter(function (b) { return b.status === 'DA_TACH'; });
      if (!books.length) return (cache[k] = { books: [], secs: [] });
      return api('/rest/v1/sgk_sections?select=book_id,kind,number_label,title,printed_page_start,printed_page_end,order_index&kind=neq.CHU_DE&book_id=in.(' + books.map(function (b) { return b.id; }).join(',') + ')&order=order_index', { auth: true }).then(json).then(function (secs) {
        var byId = {}; books.forEach(function (b) { b.vol = b.volume || 1; b.off = b.printed_page_offset == null ? 1 : b.printed_page_offset; byId[b.id] = b; });
        secs = (secs || []).filter(function (s) { return byId[s.book_id] && s.printed_page_start; }).map(function (s) { return { book: byId[s.book_id], label: s.number_label || '', title: s.title || '', from: s.printed_page_start, to: s.printed_page_end || s.printed_page_start, key: fold(s.title) }; });
        return (cache[k] = { books: books, secs: secs });
      });
    });
  }
  /* Nối từng bài PPCT với trang sách: số trang ghi trong tên bài → "Bài k" → trùng tên → bài liền trước (tiết LTVC, Viết… của cùng bài đọc). */
  function match(list, S) {
    var prev = null, nVol = Math.max.apply(null, [1].concat(S.books.map(function (b) { return b.vol; })));
    function volOf(it) { return nVol > 1 && (it.hk === 2 || it.tuan > 18) ? 2 : 1; }
    function pick(cands, it) { if (!cands.length) return null; var v = volOf(it), same = cands.filter(function (s) { return s.book.vol === v; }); return (same[0] || cands[0]); }
    list.forEach(function (it) {
      var name = it.name, m = name.match(/(?:^|[\s(,;])(?:tr|trang)\s*\.?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/i), sec = null, from = 0, to = 0;
      if (m) {
        var p = +m[1], q = m[2] ? +m[2] : 0, v = volOf(it);
        var c = S.secs.filter(function (s) { return p >= s.from && p <= s.to; });
        sec = pick(c, it);
        var book = sec ? sec.book : (S.books.filter(function (b) { return b.vol === v; })[0] || S.books[0]);
        if (book) { from = p; to = q && q >= p ? q : (sec ? Math.min(sec.to, p + 1) : p + 1); it.page = { book: book, from: from, to: to, how: 'trang', fixed: !!q }; prev = it.page; it.sec = sec; return; }
      }
      var nb = name.match(/^\s*bài\s*(\d{1,3})\b/i);
      if (nb) sec = pick(S.secs.filter(function (s) { return fold(s.label) === 'bai ' + nb[1]; }), it);
      if (!sec) {
        var key = fold(name.replace(/^\s*(đọc|luyện từ và câu|ltvc|viết|nói và nghe|tiết\s*\d+|bài\s*\d+)\s*[:.\-]\s*/i, '').replace(/\(tiết\s*\d+\)/ig, '').replace(/\btiet\s*\d+\b/g, ''));
        if (key.length >= 4) {
          var best = null, bs = 0, words = key.split(' ');
          S.secs.forEach(function (s) { if (!s.key) return; var sw = s.key.split(' '), hit = words.filter(function (w) { return sw.indexOf(w) >= 0; }).length, sc = hit / Math.max(words.length, sw.length); if (s.key === key || key.indexOf(s.key) >= 0 && s.key.length >= 6) sc = 1; if (sc > bs) { bs = sc; best = s; } });
          if (bs >= 0.6) sec = best;
        }
      }
      if (sec) { it.sec = sec; it.page = { book: sec.book, from: sec.from, to: Math.min(sec.to, sec.from + PER_LESSON - 1), how: 'bai' }; prev = it.page; return; }
      if (prev) it.page = { book: prev.book, from: prev.from, to: prev.to, how: 'truoc' };
    });
    /* Tiết "Luyện tập (tr.10)": chỉ lấy đến trước trang của tiết kế tiếp (tr.11) → đúng phần bài tập của tiết đó. */
    list.forEach(function (it, i) {
      if (!it.page || it.page.how !== 'trang' || it.page.fixed) return;
      for (var j = i + 1; j < list.length; j++) { var nx = list[j].page; if (!nx || nx.how !== 'trang') continue; if (nx.book.id === it.page.book.id && nx.from > it.page.from) it.page.to = Math.max(it.page.from, Math.min(it.page.to, nx.from - 1)); break; }
    });
    /* Tiết thứ mấy của bài: "Đọc: Thi nhạc (Tiết 2)" → 2/2. */
    var tot = {}; list.forEach(function (it) { var b = baseName(it.name); tot[b] = (tot[b] || 0) + 1; });
    list.forEach(function (it) { var m2 = it.name.match(/\(\s*tiết\s*(\d+)\s*\)/i), b = baseName(it.name); it.tietNo = m2 ? +m2[1] : 0; it.tietOf = tot[b] || 1; });
    return list;
  }
  function baseName(n) { return String(n || '').replace(/\(\s*tiết\s*\d+\s*\)/ig, '').replace(/\s+/g, ' ').trim(); }
  function partOf(n) {
    var f = fold(n);
    if (/^doc mo rong/.test(f)) return 'Đọc mở rộng';
    if (/^doc\b/.test(f)) return 'Đọc';
    if (/^(ltvc|luien tu va cau)\b/.test(f)) return 'Luyện từ và câu';
    if (/^viet\b/.test(f)) return 'Viết';
    if (/^noi va nghe\b/.test(f)) return 'Nói và nghe';
    if (/^luien tap chung\b/.test(f)) return 'Luyện tập chung';
    if (/^luien tap\b/.test(f)) return 'Luyện tập';
    if (/^on tap\b/.test(f)) return 'Ôn tập';
    return '';
  }
  function focusText(items) {
    var rule = { 'Đọc': 'chỉ hỏi về bài đọc: nội dung, chi tiết, nhân vật, ý nghĩa, từ ngữ trong bài đọc', 'Đọc mở rộng': 'hỏi về kĩ năng đọc mở rộng của bài', 'Luyện từ và câu': 'chỉ hỏi kiến thức luyện từ và câu nêu trong tên tiết, theo các bài tập luyện từ và câu trong trang; không hỏi nội dung bài đọc', 'Viết': 'chỉ hỏi kiến thức, kĩ năng viết nêu trong tên tiết; không hỏi nội dung bài đọc', 'Nói và nghe': 'chỉ hỏi nội dung phần nói và nghe nêu trong tên tiết', 'Luyện tập': 'chỉ dựa vào các bài tập ở đúng các trang này, ra câu cùng dạng', 'Luyện tập chung': 'chỉ dựa vào các bài tập ở đúng các trang này, ra câu cùng dạng', 'Ôn tập': 'chỉ dựa vào nội dung ôn tập ở đúng các trang này' };
    var lines = items.map(function (x) {
      var pg = x.page ? 'SGK trang ' + x.page.from + (x.page.to > x.page.from ? '–' + x.page.to : '') : 'không có trang sách';
      var part = partOf(x.name), t = x.tietNo && x.tietOf > 1 ? '; đây là tiết ' + x.tietNo + '/' + x.tietOf + ' của bài – tập trung phần nội dung ứng với tiết này' + (x.tietNo === 1 ? ' (phần đầu)' : x.tietNo >= x.tietOf ? ' (phần cuối, vận dụng)' : ' (phần giữa)') : '';
      return '- Tiết "' + x.name + '" (' + pg + ')' + (rule[part] ? ': ' + rule[part] : '') + t + '.';
    });
    return 'TRỌNG TÂM: câu hỏi chỉ dành cho các TIẾT đã chọn dưới đây, không phải cả bài. Các trang ảnh có thể chứa thêm phần khác của bài (bài đọc, luyện từ và câu, viết… của tiết khác) – KHÔNG hỏi những phần đó.\n' + lines.join('\n');
  }
  function pageBlob(book, printed) {
    var pdf = printed + book.off, path = book.id + '/p-' + String(pdf).padStart(3, '0') + '.jpg';
    return fresh().then(function () { return api('/storage/v1/object/authenticated/sgk-pages/' + path, { auth: true }); }).then(function (r) { if (!r.ok) throw new Error('Chưa có ảnh trang ' + printed + ' của ' + book.title + '.'); return r.blob(); });
  }
  function toJpeg(blob) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(blob), img = new Image();
      img.onload = function () { var max = 1600, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = doc.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]); };
      img.onerror = function () { URL.revokeObjectURL(u); bad(new Error('Ảnh trang sách bị lỗi.')); };
      img.src = u;
    });
  }

  /* ---------- Giao diện ---------- */
  function css() {
    if ($('ppctHubStyle')) return;
    var s = doc.createElement('style'); s.id = 'ppctHubStyle';
    s.textContent = '.ph-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#ecfeff,#f5f3ff);border:2px solid #a5f3fc}.ph-bar b{color:#0e7490}.ph-bar .btn{min-height:44px;font-weight:800}.ph-bar small{color:#475569;flex:1 1 220px}'
      + '.ph-ov{position:fixed;inset:0;z-index:1400;background:#0f172a99;display:grid;place-items:center;padding:12px}.ph-box{background:#fff;color:#17324d;border-radius:22px;width:min(860px,100%);max-height:94dvh;display:flex;flex-direction:column;box-shadow:0 24px 60px #0f172a66;overflow:hidden}'
      + '.ph-box header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:16px 20px 8px}.ph-box h2{margin:0;font-size:21px}.ph-box header p{margin:4px 0 0;color:#475569;font-size:14px}'
      + '.ph-row{display:flex;flex-wrap:wrap;gap:10px;padding:0 20px 10px;align-items:end}.ph-row label{display:grid;gap:4px;font-weight:700;font-size:14px;color:#334155}.ph-row select,.ph-row input{min-height:40px;border:1px solid #c4b5fd;border-radius:10px;padding:6px 10px;font:inherit}'
      + '.ph-auth{margin:0 20px 10px;padding:10px 12px;border-radius:14px;background:#fffbeb;border:1px solid #fde68a;font-size:14px}.ph-auth.ok{background:#f0fdf4;border-color:#86efac}.ph-auth form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px}.ph-auth input[type=email],.ph-auth input[type=password]{min-height:38px;border:1px solid #cbd5e1;border-radius:10px;padding:4px 10px;font:inherit;flex:1 1 180px}'
      + '.ph-list{overflow:auto;padding:0 20px 10px;display:grid;gap:6px;flex:1}.ph-week{font-weight:900;color:#6d28d9;margin:8px 0 2px;font-size:14px}'
      + '.ph-item{display:flex;gap:10px;align-items:center;border:2px solid #e2e8f0;border-radius:12px;padding:8px 10px;cursor:pointer;background:#fff}.ph-item:hover{border-color:#a78bfa}.ph-item.on{border-color:#7c3aed;background:#f5f3ff}.ph-item input{width:20px;height:20px}.ph-item .n{flex:1;font-weight:700}.ph-item .pg{font-size:12px;font-weight:800;border-radius:999px;padding:3px 9px;background:#e0f2fe;color:#075985;white-space:nowrap}.ph-item .pg.no{background:#f1f5f9;color:#64748b}.ph-item .pg.guess{background:#fef3c7;color:#92400e}'
      + '.ph-box footer{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 20px 16px;border-top:1px solid #ede9fe}.ph-box footer .btn{min-height:46px}.ph-sum{font-weight:700;color:#334155}.ph-msg{padding:0 20px 8px;color:#b45309;font-weight:700;font-size:14px}.ph-empty{color:#64748b;padding:20px;text-align:center}';
    doc.head.appendChild(s);
  }
  function inject() {
    var form = doc.querySelector('#troLyAI .ta-form, .ta-form'); if (!form) return;
    var old = form.querySelector('.ph-bar'), n = win.hmvTroLyAI && win.hmvTroLyAI.sgkCount ? win.hmvTroLyAI.sgkCount() : 0;
    if (old) { if (String(n) !== old.dataset.n) { old.dataset.n = String(n); old.querySelector('small').innerHTML = barNote(n); } return; }
    css();
    var bar = doc.createElement('div'); bar.className = 'ph-bar';
    bar.dataset.n = String(n); bar.innerHTML = '<button type="button" class="btn color" data-ph="open">📚 Chọn bài từ PPCT Hub</button><small>' + barNote(n) + '</small>';
    var h3 = form.querySelector('h3'); if (h3 && h3.nextSibling) form.insertBefore(bar, h3.nextSibling); else form.prepend(bar);
  }
  function barNote(n) { return n ? '✅ Đã gắn <b>' + n + ' trang SGK</b> làm nguồn (xem ở mục 2). Bấm “Tạo câu hỏi” là xong.' : 'Chọn lớp, môn, bài theo phân phối chương trình; app tự lấy đúng các trang SGK của bài gửi cho AI – không cần chụp ảnh sách.'; }
  function formVals() { var g = $('taGrade'), s = $('taSubject'); return { grade: g ? g.value : '4', subject: s && s.value !== '__other' ? s.value : 'Toán' }; }

  function open() {
    css(); var f = formVals();
    M = { grade: f.grade, subject: f.subject, list: [], picked: {}, week: '', q: '', busy: '', msg: '', year: '' };
    var o = doc.createElement('div'); o.className = 'ph-ov'; o.id = 'phModal';
    o.innerHTML = '<div class="ph-box" role="dialog" aria-modal="true" aria-labelledby="phTitle"><header><div><h2 id="phTitle">📚 Chọn bài từ PPCT Hub</h2><p>Theo phân phối chương trình của tổ. Có thể chọn nhiều bài (ví dụ ôn tập giữa kì).</p></div><button type="button" class="btn soft" data-ph="close">Đóng</button></header>'
      + '<div class="ph-auth" id="phAuth"></div>'
      + '<div class="ph-row"><label>Lớp<select id="phGrade">' + ['1', '2', '3', '4', '5'].map(function (g) { return '<option' + (g === M.grade ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label><label>Môn<select id="phSubject">' + Object.keys(CODE).map(function (s) { return '<option' + (s === M.subject ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label><label>Tuần<select id="phWeek"><option value="">Tất cả</option></select></label><label style="flex:1 1 200px">Tìm bài<input id="phQ" type="search" placeholder="Gõ tên bài…"></label></div>'
      + '<div class="ph-msg" id="phMsg"></div><div class="ph-list" id="phList"><p class="ph-empty">Đang tải phân phối chương trình…</p></div>'
      + '<footer><span class="ph-sum" id="phSum"></span><button type="button" class="btn color" data-ph="use" id="phUse" disabled>✓ Dùng làm nguồn</button></footer></div>';
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    doc.body.appendChild(o); paintAuth(); load();
  }
  function close() { var o = $('phModal'); if (o) o.remove(); M = null; }
  function paintAuth() {
    var el = $('phAuth'); if (!el) return;
    if (auth) { el.className = 'ph-auth ok'; el.innerHTML = '✅ Đã đăng nhập PPCT Hub: <b>' + esc(auth.email || '') + '</b> – app lấy được ảnh trang SGK. <button type="button" class="btn soft" data-ph="logout" style="min-height:32px;padding:2px 10px">Đăng xuất</button>'; return; }
    el.className = 'ph-auth';
    el.innerHTML = '🔐 <b>Đăng nhập tài khoản PPCT Hub</b> để app lấy ảnh trang SGK của bài (chưa đăng nhập vẫn chọn được tên bài).'
      + '<form id="phLogin"><input type="email" id="phEmail" placeholder="Email PPCT Hub" autocomplete="username" required><input type="password" id="phPass" placeholder="Mật khẩu" autocomplete="current-password" required><label style="display:flex;gap:6px;align-items:center;font-weight:600"><input type="checkbox" id="phRemember"> Ghi nhớ trên máy này</label><button class="btn color" type="submit" style="min-height:38px">Đăng nhập</button></form>';
    $('phLogin').onsubmit = function (e) {
      e.preventDefault(); var b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Đang đăng nhập…';
      login($('phEmail').value.trim(), $('phPass').value, $('phRemember').checked).then(function () { toast('Đã đăng nhập PPCT Hub'); paintAuth(); load(); })
        .catch(function (er) { b.disabled = false; b.textContent = 'Đăng nhập'; setMsg(er.message); });
    };
  }
  function setMsg(t) { if (M) M.msg = t || ''; var e = $('phMsg'); if (e) e.textContent = t || ''; }
  function load() {
    if (!M) return; var sid = subjectId(M.subject, M.grade), my = M;
    setMsg(''); $('phList').innerHTML = '<p class="ph-empty">Đang tải phân phối chương trình…</p>';
    if (!sid) { $('phList').innerHTML = '<p class="ph-empty">Môn này chưa có trong PPCT Hub.</p>'; return; }
    ppct(sid, M.grade).then(function (P) {
      if (M !== my) return;
      M.year = P.year; M.list = P.list.map(function (x) { return Object.assign({}, x); });
      paintWeeks(); paint();
      if (!auth) return;
      return sgk(sid).then(function (S) { if (M !== my) return; if (!S.books.length) { setMsg('Kho PPCT Hub chưa có SGK môn này – AI sẽ soạn theo tên bài.'); return; } match(M.list, S); paint(); })
        .catch(function (e) { if (M === my) { setMsg(e.message); paintAuth(); } });
    }).catch(function (e) { if (M === my) $('phList').innerHTML = '<p class="ph-empty">' + esc(e.message) + '</p>'; });
  }
  function paintWeeks() {
    var w = {}; M.list.forEach(function (x) { if (x.tuan) w[x.tuan] = 1; });
    var sel = $('phWeek'); sel.innerHTML = '<option value="">Tất cả</option>' + Object.keys(w).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return '<option value="' + n + '"' + (String(n) === M.week ? ' selected' : '') + '>Tuần ' + n + '</option>'; }).join('');
  }
  function pages() {
    var out = [], seen = {};
    M.list.forEach(function (x, i) { if (!M.picked[i] || !x.page) return; for (var p = x.page.from; p <= x.page.to; p++) { var k = x.page.book.id + '|' + p; if (!seen[k]) { seen[k] = 1; out.push({ book: x.page.book, p: p }); } } });
    return out;
  }
  function paint() {
    if (!M) return;
    var q = fold(M.q), rows = M.list.map(function (x, i) { return { x: x, i: i }; }).filter(function (r) { return (!M.week || String(r.x.tuan) === M.week) && (!q || fold(r.x.name).indexOf(q) >= 0); });
    var html = '', last = null;
    rows.forEach(function (r) {
      var x = r.x; if (x.tuan !== last) { last = x.tuan; html += '<div class="ph-week">Tuần ' + (x.tuan || '?') + '</div>'; }
      var pg = x.page ? '<span class="pg' + (x.page.how === 'truoc' ? ' guess' : '') + '" title="' + esc(x.page.book.title) + (x.page.how === 'truoc' ? ' – cùng bài với tiết trước' : '') + '">SGK tr.' + x.page.from + (x.page.to > x.page.from ? '–' + x.page.to : '') + (x.page.book.vol > 1 || x.page.book.title.indexOf('Tập') >= 0 ? ' · T' + x.page.book.vol : '') + '</span>' : (auth ? '<span class="pg no">chưa rõ trang</span>' : '');
      html += '<label class="ph-item' + (M.picked[r.i] ? ' on' : '') + '"><input type="checkbox" data-ph-i="' + r.i + '"' + (M.picked[r.i] ? ' checked' : '') + '><span class="n">' + esc(x.name) + '</span>' + pg + '</label>';
    });
    $('phList').innerHTML = html || '<p class="ph-empty">Không có bài phù hợp.</p>';
    var n = Object.keys(M.picked).length, pc = pages().length;
    $('phSum').textContent = n ? 'Đã chọn ' + n + ' bài' + (auth ? ' · ' + Math.min(pc, MAX_PAGES) + ' trang SGK' + (pc > MAX_PAGES ? ' (gửi ' + MAX_PAGES + ' trang đầu)' : '') : '') : 'Chưa chọn bài nào';
    $('phUse').disabled = !n || !!M.busy; $('phUse').textContent = M.busy ? '⏳ ' + M.busy : '✓ Dùng làm nguồn';
  }
  function topicText() {
    var names = M.list.filter(function (x, i) { return M.picked[i]; }).map(function (x) { return x.name.replace(/\s+/g, ' ').trim(); });
    var u = []; names.forEach(function (n) { if (u.indexOf(n) < 0) u.push(n); });
    return u.join('; ').slice(0, 200);
  }
  function use() {
    if (!M || M.busy) return;
    var topic = topicText(), pg = pages().slice(0, MAX_PAGES), my = M;
    var note = topic + ' (lớp ' + M.grade + ', môn ' + M.subject + (pg.length ? ', ' + pg[0].book.title + ' trang ' + pg.map(function (x) { return x.p; }).join(', ') : '') + ')';
    var form = { grade: M.grade, subject: M.subject, topic: topic }, focus = focusText(M.list.filter(function (x, i) { return M.picked[i]; }));
    var api2 = win.hmvTroLyAI;
    if (!pg.length) { if (api2 && api2.setSgk) api2.setSgk([], { form: form, focus: focus }); close(); toast(auth ? 'Đã điền tên bài. Chưa tìm được trang SGK cho bài này.' : 'Đã điền tên bài. Đăng nhập PPCT Hub để gửi kèm trang SGK.'); return; }
    M.busy = 'Đang tải ' + pg.length + ' trang SGK…'; paint();
    var out = [];
    pg.reduce(function (p, x) { return p.then(function () { return pageBlob(x.book, x.p).then(toJpeg).then(function (d) { out.push({ mime: 'image/jpeg', data: d, label: 'tr.' + x.p }); }); }); }, Promise.resolve())
      .then(function () { if (api2 && api2.setSgk) api2.setSgk(out, { note: note, form: form, focus: focus }); close(); toast('Đã gắn ' + out.length + ' trang SGK làm nguồn. Bấm “Tạo câu hỏi”.'); })
      .catch(function (e) { if (M !== my) return; M.busy = ''; paint(); setMsg(e.message); });
  }

  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ph]'); if (!b) return;
    var a = b.dataset.ph;
    if (a === 'open') open(); else if (a === 'close') close(); else if (a === 'use') use();
    else if (a === 'logout') { logout(); paintAuth(); if (M) { M.list.forEach(function (x) { delete x.page; delete x.sec; }); paint(); } }
  });
  doc.addEventListener('change', function (e) {
    if (!M || !e.target) return; var t = e.target;
    if (t.dataset && t.dataset.phI !== undefined) { var i = +t.dataset.phI; if (t.checked) M.picked[i] = 1; else delete M.picked[i]; paint(); return; }
    if (t.id === 'phGrade' || t.id === 'phSubject') { M.grade = $('phGrade').value; M.subject = $('phSubject').value; M.picked = {}; M.week = ''; load(); }
    else if (t.id === 'phWeek') { M.week = t.value; paint(); }
  });
  doc.addEventListener('input', function (e) { if (M && e.target && e.target.id === 'phQ') { M.q = e.target.value; paint(); } });
  doc.addEventListener('keydown', function (e) { if (M && e.key === 'Escape') close(); });
  var injT = 0;
  if (win.MutationObserver) new win.MutationObserver(function () { if (injT) return; injT = (win.requestAnimationFrame || win.setTimeout)(function () { injT = 0; inject(); }); }).observe(doc.body || doc.documentElement, { childList: true, subtree: true });
  setTimeout(inject, 0);

  win.hmvPpctHub = { open: open, match: match, fold: fold, state: function () { return M; }, loggedIn: function () { return !!auth; } };
})(window);
