/* BAN-CHINH 2.15 · Luật trận đấu chung cho mọi trò chơi có câu hỏi + bộ câu hỏi demo tự liên kết từ Kho.
 * 1. Thẻ "⏱ Luật trận đấu" trong màn hình thiết lập của từng trò:
 *    - Kết thúc trận: theo luật riêng của trò / khi chơi đủ số câu / khi hết thời gian trận (đồng hồ trận hiện trên màn hình chơi).
 *    - Thời gian trả lời mỗi câu (hết giờ thì hiện đáp án) và thời gian hiện đáp án trước khi chuyển câu.
 *      Trò đã có sẵn ô tương ứng thì ô đó được chuyển vào thẻ (vẫn là ô cũ, lưu như cũ); trò chưa có thì thẻ thêm ô mới.
 * 2. Bộ câu hỏi demo: trò chưa được chọn bộ nào và "Kho hiện tại" có ít hơn 10 câu hợp lệ cho trò đó (máy mới, Ngày hội)
 *    → tự dùng một bộ trong Kho (bộ của thầy cô trước, rồi các bộ Mẫu 1–7). Bộ Mẫu bị xóa vẫn có bản dự phòng trong bo-cau-hoi-mau.js.
 *    Thầy cô đổi được: Tự động / Luôn dùng bộ demo / Chỉ dùng câu hỏi của tôi.
 * Mọi trò gọi window.hmvTran (begin, limit, reached, timeUp, answer, reveal); không có tệp này thì trò chạy như bản 2.14.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var KEY = 'hmv_tran_dau_v1', MIN_OWN = 10;
  var NAMES = { tug: 'Kéo co kiến thức', buzzer: 'Ai nhanh hơn', race: 'Đường đua kiến thức', gift: 'Hộp quà bí mật', tiles: 'Lật mảnh ghép', millionaire: 'Chinh phục tri thức', balloon: 'Bóng bay tri thức', poll: 'Bình chọn ngón tay', 'magic-hand': 'Bàn tay phép thuật', 'raise-hand': 'Giơ tay giành quyền', 'head-tilt': 'Quiz Nghiêng Đầu', 'paper-mode': 'Chế độ giấy' };
  /* host: nơi đặt thẻ (thẻ chèn vào đầu phần tử này); answer/reveal/count: id ô sẵn có của trò được chuyển vào thẻ.
   * revealDef: số giây mặc định của trò (0 = giáo viên bấm chuyển câu); rule: mô tả luật kết thúc riêng; auto: dùng bộ demo tự động. */
  var G = {
    tug: { host: '.tug-settings', answer: 'tugTime', reveal: 'tugDelay', rule: 'Đội kéo đủ số bước thắng, hoặc hết câu hỏi', auto: true },
    buzzer: { host: '.buzz-settings', answer: 'buzzResponse', reveal: 'buzzDelay', rule: 'Hết bộ câu hỏi', auto: true },
    race: { host: '.race-settings', answer: 'raceTime', revealDef: 3, manual: true, rule: 'Đội về đích trước, hoặc hết câu hỏi', auto: true },
    gift: { host: '.gift-settings', answer: 'giftTime', revealDef: 1, rule: 'Mở hết các hộp quà', auto: true },
    tiles: { host: '.flip-settings', answer: 'flipTime', revealDef: 1, rule: 'Mở hết các mảnh ghép', auto: true },
    millionaire: { host: '#games .card .game-setup', after: true, count: 'millionaireMode', revealDef: 1, answerDef: 0, rule: '', auto: true },
    balloon: { host: '#bbSetup', count: 'bbCount', answer: 'bbTime', revealDef: 3 },
    poll: { host: '#bcSetup', count: 'bcCount', answer: 'bcTime', revealDef: 5, manual: true, countNote: 'Áp dụng khi hỏi theo bộ câu hỏi' },
    'magic-hand': { host: '#mhSetup', count: 'mhCount', answer: 'mhTime', revealDef: 3 },
    'raise-hand': { host: '#rhSetup', count: 'rhCount', answer: 'rhAnswerTime', revealDef: 4 },
    'head-tilt': { host: '#tiltSetupModal .tilt-setup-grid', before: true, count: 'tiltLimit', revealDef: 2, answerDef: 0 },
    'paper-mode': { host: '#games .paper-mode-panel .paper-note', after: true, revealDef: 0, manual: true, answerDef: 0, rule: 'Giáo viên bấm Kết thúc, hoặc hết câu hỏi', auto: true }
  };
  var store = {}; try { store = JSON.parse(win.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  function save() { try { win.localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function native(t) { return !!(G[t] && G[t].count); }
  function cfg(t) {
    var c = store[t] || {}, g = G[t] || {};
    var end = c.end === 'count' || c.end === 'time' || c.end === 'rule' ? c.end : (native(t) ? 'count' : 'rule');
    if (native(t) && end === 'rule') end = 'count';
    return { end: end, count: Math.max(1, Math.min(100, Number(c.count) || 10)), minutes: Math.max(1, Math.min(90, Number(c.minutes) || 5)),
      answer: c.answer === undefined || c.answer === '' ? null : Math.max(0, Number(c.answer) || 0),
      reveal: c.reveal === undefined || c.reveal === '' ? null : Math.max(0, Number(c.reveal) || 0), src: c.src === 'demo' || c.src === 'own' ? c.src : 'auto' };
  }
  function set(t, k, v) { store[t] = store[t] || {}; store[t][k] = v; save(); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { if (typeof win.showToast === 'function') win.showToast(m); }
  function game() { return win.classroomGame || {}; }

  /* ---------- API cho các trò ---------- */
  function limit(t, n) { var c = cfg(t); return c.end === 'count' && !native(t) ? Math.min(n, c.count) : n; }
  function reached(t, done) { var c = cfg(t); return c.end === 'count' && !native(t) && done >= c.count; }
  function answer(t, def) { var c = cfg(t); return c.answer === null ? def : c.answer; }
  function reveal(t, def) { var c = cfg(t); return c.reveal === null ? def : c.reveal; }

  /* Đồng hồ trận: chỉ chạy khi chọn "Khi hết thời gian trận", trò đang mở trên màn hình và không tạm dừng. */
  var M = null, ticker = 0, badge = null;
  function onScreen(t) { var v = doc.getElementById('games'); return game().type === t && v && v.classList.contains('active') && !doc.hidden; }
  function begin(t, hooks) {
    stop();
    var c = cfg(t); if (c.end !== 'time' || !hooks || typeof hooks.end !== 'function') return false;
    M = { type: t, total: c.minutes * 60, left: c.minutes * 60, hooks: hooks, last: Date.now(), warned: false };
    ticker = win.setInterval(tick, 250); paintBadge(); return true;
  }
  function live() { try { return !!(M && M.hooks.live ? M.hooks.live() : M); } catch (e) { return false; } }
  function tick() {
    if (!M) return stop();
    var now = Date.now(), dt = Math.min(1, Math.max(0, (now - M.last) / 1000)); M.last = now;
    if (game().type !== M.type || !live()) return stop();
    var paused = false; try { paused = !!(M.hooks.paused && M.hooks.paused()); } catch (e) {}
    if (onScreen(M.type) && !paused) M.left = Math.max(0, M.left - dt);
    if (M.left <= 30 && !M.warned && M.total > 60) { M.warned = true; toast('⏰ Còn 30 giây nữa là hết thời gian trận đấu.'); }
    if (M.left <= 0) { var h = M.hooks; M.done = true; paintBadge(); stop(); toast('⏰ Hết thời gian trận đấu!'); try { h.end('time'); } catch (e) { if (win.console) console.error('[Luật trận đấu]', e); } return; }
    paintBadge(paused);
  }
  function stop() { if (ticker) win.clearInterval(ticker); ticker = 0; M = null; if (badge) badge.hidden = true; }
  function fmt(s) { s = Math.ceil(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function paintBadge(paused) {
    if (!badge) { badge = doc.createElement('div'); badge.id = 'hmvTdClock'; badge.className = 'hmv-td-clock'; badge.setAttribute('role', 'timer'); badge.setAttribute('aria-live', 'off'); doc.body.appendChild(badge); }
    if (!M) { badge.hidden = true; return; }
    badge.hidden = !onScreen(M.type);
    badge.classList.toggle('hurry', M.left <= 30); badge.classList.toggle('paused', !!paused);
    badge.innerHTML = '<span aria-hidden="true">⏱</span> Trận còn <b>' + fmt(M.left) + '</b>' + (paused ? ' · tạm dừng' : '');
  }
  function timeUp(t) { return !!(M && M.type === t && M.left <= 0); }

  /* ---------- Bộ câu hỏi demo tự liên kết từ Kho ---------- */
  function errs(q, t) { try { return typeof win.hmvC6QuestionErrors === 'function' ? win.hmvC6QuestionErrors(q, t) : []; } catch (e) { return ['?']; } }
  function forGame(q) {
    var c = Object.assign({}, q), k = c.kind || c.type, n = (c.answers || []).length;
    c.text = String(c.text || c.question || '').trim(); c.question = c.text; c.answers = Array.isArray(c.answers) ? c.answers.slice() : [];
    if (k === 'OPEN') c.kind = 'ORAL'; else if (k === 'SINGLE' && n === 4) c.kind = 'ABCD'; else if (k === 'ABCD' && n === 2) c.kind = 'TRUEFALSE'; else if (!c.kind && n === 4) c.kind = 'ABCD'; else if (!c.kind && n === 2) c.kind = 'TRUEFALSE';
    if (!Number.isInteger(c.correct) && c.correct !== null && c.correct !== undefined && c.correct !== '') c.correct = Number(c.correct);
    return c;
  }
  function usable(list, t) { return (list || []).map(forGame).filter(function (q) { return q.text && (q.kind === 'ABCD' || q.kind === 'TRUEFALSE') && !errs(q, t).length && (t !== 'millionaire' && t !== 'paper-mode' || q.answers.length === 4); }); }
  function demoSets() {
    var kho = Array.isArray(win.questionBankSets) ? win.questionBankSets : [], mine = kho.filter(function (s) { return !/^mau-\d/.test(String(s.id)); }), mau = kho.filter(function (s) { return /^mau-\d/.test(String(s.id)); });
    var spare = win.HMV_DEMO && Array.isArray(win.HMV_DEMO.sets) ? win.HMV_DEMO.sets.filter(function (s) { return !mau.some(function (m) { return m.id === s.id; }); }) : [];
    return { mine: mine, demo: mau.concat(spare) };
  }
  var picked = {};
  function pickDemo(t, onlyDemo) {
    var groups = demoSets(), order = onlyDemo ? groups.demo : groups.mine.concat(groups.demo), need = 10;
    for (var i = 0; i < order.length; i++) { var l = usable(order[i].questions, t); if (l.length >= need) return { set: order[i], list: l, demo: /^mau-\d/.test(String(order[i].id)) }; }
    return null;
  }
  var baseQ = null, baseName = null, baseSrc = null;
  function legacyMode(t) { try { var x = JSON.parse(win.localStorage.getItem('tk_question_source_v3') || '{}')[t]; return x && x.mode || 'all'; } catch (e) { return 'all'; } }
  function ownCount(t) { var l = null; try { l = baseSrc ? baseSrc(t) : win.questionData; } catch (e) { l = win.questionData; } return usable(l, t).length; }
  /* Trả về bộ demo cho trò t nếu cần, không thì null (trò dùng nguồn cũ). Kết quả giữ nguyên trong một trận để câu không đổi giữa chừng. */
  function autoFor(t) {
    if (!G[t] || !G[t].auto) return null;
    var c = cfg(t); if (c.src === 'own') return null;
    if (c.src !== 'demo' && (legacyMode(t) !== 'all' || ownCount(t) >= MIN_OWN)) return null;
    var key = c.src + '|' + (Array.isArray(win.questionBankSets) ? win.questionBankSets.length : 0);
    var hit = picked[t]; if (hit && hit.key === key && (game().started || hit.at > Date.now() - 2000)) return hit.r;
    var r = pickDemo(t, c.src === 'demo'); picked[t] = { key: key, r: r, at: Date.now() }; return r;
  }
  function info(t) {
    var r = autoFor(t), c = cfg(t);
    if (r) return { auto: true, name: r.set.name || r.set.setTitle || 'Bộ câu hỏi', n: r.list.length, demo: r.demo };
    var chosen = baseName ? baseName(t) : '';
    return { auto: false, name: chosen || (legacyMode(t) !== 'all' ? 'Theo “Nguồn câu hỏi” đã chọn' : 'Kho hiện tại'), n: ownCount(t), chosen: !!chosen, src: c.src };
  }
  function wrapSources() {
    if (baseQ || typeof win.hmvC6QuestionsForGame !== 'function') return !!baseQ;
    baseQ = win.hmvC6QuestionsForGame; baseName = win.hmvC6SelectionName; baseSrc = win.questionSourceList;
    win.hmvC6QuestionsForGame = function (t) { var r = baseQ.apply(this, arguments); if (r) return r; var a = autoFor(t); return a ? a.list : null; };
    win.hmvC6SelectionName = function (t) { var n = baseName ? baseName.apply(this, arguments) : ''; if (n) return n; var a = autoFor(t); return a ? (a.set.name || '') : ''; };
    var prevList = win.questionSourceList;
    if (typeof prevList === 'function') win.questionSourceList = function (t) { var r = baseQ(t || game().type); if (r) return r; var a = autoFor(t || game().type); if (a) return a.list; return prevList.apply(this, arguments); };
    return true;
  }

  /* ---------- Thẻ "Luật trận đấu" ---------- */
  function opt(v, label, cur) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + label + '</option>'; }
  function secs(v) { return v === 0 ? 'Không giới hạn' : v + ' giây'; }
  function cardHtml(t) {
    var c = cfg(t), g = G[t], nat = native(t), src = '';
    var endOpts = (nat ? '' : opt('rule', 'Theo luật của trò chơi', c.end)) + opt('count', nat ? 'Khi chơi đủ số câu' : 'Khi chơi đủ số câu', c.end) + opt('time', 'Khi hết thời gian trận', c.end);
    var countRow = nat ? '<div class="hmv-td-slot" data-td-slot="count"></div>' : '<label data-td-show="count">Số câu của trận<select data-td="count">' + [5, 8, 10, 12, 15, 20, 25, 30, 40].map(function (n) { return opt(n, n + ' câu', c.count); }).join('') + '</select></label>';
    var minRow = '<label data-td-show="time">Thời gian trận<select data-td="minutes">' + [1, 2, 3, 5, 7, 10, 15, 20, 30, 45].map(function (n) { return opt(n, n + ' phút', c.minutes); }).join('') + '</select></label>';
    var ansRow = g.answer ? '<div class="hmv-td-slot" data-td-slot="answer"></div>' : '<label>Thời gian trả lời mỗi câu<select data-td="answer">' + opt('', 'Mặc định (' + secs(g.answerDef || 0) + ')', c.answer === null ? '' : 'x') + [5, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120, 180].map(function (n) { return opt(n, n + ' giây', c.answer); }).join('') + '</select></label>';
    var def = g.revealDef === 0 ? 'giáo viên bấm' : (g.revealDef + ' giây');
    var revRow = g.reveal ? '<div class="hmv-td-slot" data-td-slot="reveal"></div>' : '<label>Hiện đáp án rồi chuyển câu sau<select data-td="reveal">' + opt('', 'Mặc định (' + def + ')', c.reveal === null ? '' : 'x') + (g.manual && g.revealDef !== 0 ? opt(0, 'Giáo viên bấm chuyển câu', c.reveal) : '') + [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30].map(function (n) { return opt(n, n + ' giây', c.reveal); }).join('') + '</select></label>';
    if (g.auto) {
      var i = info(t);
      src = '<div class="hmv-td-src"><p>📚 Câu hỏi của trận: <b>' + esc(i.name) + '</b> · ' + i.n + ' câu dùng được' + (i.auto ? (i.demo ? ' <span class="hmv-td-tag">Bộ demo · chơi ngay</span>' : ' <span class="hmv-td-tag">Tự chọn từ Kho</span>') : '') + '</p>'
        + '<label>Nguồn câu hỏi<select data-td="src">' + opt('auto', 'Tự động: chưa đủ ' + MIN_OWN + ' câu thì dùng bộ trong Kho', c.src) + opt('demo', 'Luôn dùng bộ demo (Mẫu trong Kho)', c.src) + opt('own', 'Chỉ dùng câu hỏi của tôi', c.src) + '</select></label></div>';
    }
    return '<div class="hmv-td-head"><h3>⏱ Luật trận đấu</h3><span>' + esc(g.rule ? 'Luật riêng: ' + g.rule : (g.countNote || '')) + '</span></div>'
      + '<div class="hmv-td-grid"><label>Kết thúc trận<select data-td="end">' + endOpts + '</select></label>' + countRow + minRow + ansRow + revRow + '</div>'
      + '<p class="hmv-td-note" data-td-note></p>' + src;
  }
  function note(card, t) {
    var c = cfg(t), n = card.querySelector('[data-td-note]'); if (!n) return;
    var txt = c.end === 'time' ? 'Đồng hồ trận đếm ngược ' + c.minutes + ' phút ở góc trên màn hình chơi; hết giờ thì trận dừng ngay và tính kết quả hiện có' + (native(t) ? ' (hết câu trước thì kết thúc sớm).' : '.') : c.end === 'count' ? (native(t) ? 'Trận kết thúc khi chơi xong số câu đã chọn.' : 'Trận kết thúc sau ' + c.count + ' câu (hoặc sớm hơn nếu luật riêng của trò đã có người thắng).') : 'Trận kết thúc theo luật riêng của trò.';
    n.textContent = txt;
    card.querySelectorAll('[data-td-show]').forEach(function (e) { e.hidden = e.getAttribute('data-td-show') !== c.end; });
  }
  function moveIn(card, slot, id) {
    var s = card.querySelector('[data-td-slot="' + slot + '"]'), el = id && doc.getElementById(id); if (!s || !el) { if (s) s.remove(); return; }
    var lab = el.closest('label') || el; if (lab.contains(card)) return;
    lab.classList.add('hmv-td-moved'); s.replaceWith(lab);
  }
  function hostOf(t) { var g = G[t]; return g && doc.querySelector(g.host); }
  function decorate() {
    var t = game().type; if (!G[t]) return;
    legacySummary(t);
    if (t === 'head-tilt') tiltIds();
    var host = hostOf(t); if (!host || (host.parentNode && host.parentNode.querySelector('.hmv-td')) || host.querySelector('.hmv-td')) return;
    var card = doc.createElement('section'); card.className = 'hmv-td'; card.setAttribute('data-td-game', t); card.innerHTML = cardHtml(t);
    var g = G[t];
    if (g.after) host.parentNode.insertBefore(card, host.nextSibling); else if (g.before) host.parentNode.insertBefore(card, host); else host.insertBefore(card, host.firstChild);
    moveIn(card, 'count', g.count); moveIn(card, 'answer', g.answer); moveIn(card, 'reveal', g.reveal);
    card.addEventListener('change', function (e) {
      var k = e.target && e.target.getAttribute('data-td'); if (!k) return;
      set(t, k, e.target.value); picked[t] = null; note(card, t);
      if (k === 'src') { var r = win.renderGames; if (t === 'head-tilt' && typeof win.tiltOpenSetup === 'function') win.tiltOpenSetup(); else if (typeof r === 'function') r(); toast('Đã đổi nguồn câu hỏi cho ' + NAMES[t] + '.'); }
    });
    note(card, t);
  }
  /* Ô "Nguồn câu hỏi" cũ ghi "Có 2 câu phù hợp" trong khi trận dùng bộ demo → ghi rõ để thầy cô khỏi băn khoăn. */
  function legacySummary(t) {
    var p = doc.querySelector('#games .question-source-summary'); if (!p) return;
    var a = autoFor(t); if (a && !p.querySelector('.hmv-td-tag')) p.insertAdjacentHTML('beforeend', ' <span class="hmv-td-tag">Trận sẽ dùng: ' + esc(a.set.name || 'bộ trong Kho') + '</span>');
  }
  /* Quiz Nghiêng Đầu: ô "Số câu mỗi lượt" chưa có id → gắn id để chuyển vào thẻ. */
  function tiltIds() { var m = doc.getElementById('tiltSetupModal'); if (!m || doc.getElementById('tiltLimit')) return; var s = m.querySelector('select[onchange*="limitChoice"]'); if (s) s.id = 'tiltLimit'; }
  var pend = false;
  function soon() { if (pend) return; pend = true; (win.requestAnimationFrame || win.setTimeout)(function () { pend = false; try { decorate(); } catch (e) { if (win.console) console.error('[Luật trận đấu]', e); } if (M) paintBadge(); }); }
  function boot() {
    wrapSources();
    var g = doc.getElementById('games');
    if (win.MutationObserver) { if (g) new win.MutationObserver(soon).observe(g, { childList: true, subtree: true }); new win.MutationObserver(soon).observe(doc.body, { childList: true }); }
    doc.addEventListener('visibilitychange', function () { if (M) { M.last = Date.now(); paintBadge(); } });
    soon();
  }
  wrapSources();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  win.hmvTran = { cfg: cfg, set: set, limit: limit, reached: reached, answer: answer, reveal: reveal, begin: begin, stop: function () { stop(); }, timeUp: timeUp, state: function () { return M ? { type: M.type, left: M.left, total: M.total } : null; }, info: info, auto: autoFor, refresh: soon, games: G, _skip: function (sec) { if (M) M.left = Math.max(0, M.left - (Number(sec) || 0)); } };
})(window);
