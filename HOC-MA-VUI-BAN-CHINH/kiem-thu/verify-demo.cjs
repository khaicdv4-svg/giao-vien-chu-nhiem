/* Kiểm tra độc lập đáp án của 140 câu hỏi mẫu: tính lại bằng máy những gì tính được. */
const d = require(process.argv[2]);
const F = require('fs');
const num = s => Number(String(s).replace(/\s/g, '').replace(',', '.'));
const calc = e => { const js = String(e).replace(/\s/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/:/g, '/').replace(/−/g, '-'); if (!/^[0-9.+\-*/()]+$/.test(js)) return null; return Math.round(eval(js) * 1e9) / 1e9; };
const frac = s => { const m = String(s).match(/^(\d+)\/(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : null; };
const unit = { mm: ['L', .001], cm: ['L', .01], dm: ['L', .1], m: ['L', 1], km: ['L', 1000], g: ['M', 1], kg: ['M', 1000], 'yến': ['M', 1e4], 'tạ': ['M', 1e5], 'tấn': ['M', 1e6], ml: ['V', 1e-3], l: ['V', 1], 'cm³': ['V', 1e-3], 'dm³': ['V', 1], 'm³': ['V', 1000], 'm²': ['A', 1], ha: ['A', 1e4], 'km²': ['A', 1e6], 'giây': ['T', 1], 'phút': ['T', 60], 'giờ': ['T', 3600], 'tháng': ['Y', 1], 'năm': ['Y', 12] };
const measure = s => { let total = 0, dim = null; for (const part of String(s).split('+')) { const m = part.trim().match(/^([\d\s.,]+)\s*(.+)$/); if (!m || !unit[m[2].trim()]) return null; const u = unit[m[2].trim()]; if (dim && dim !== u[0]) return null; dim = u[0]; total += num(m[1]) * u[1]; } return dim + ':' + Math.round(total * 1e6) / 1e6; };
let checked = 0, manual = 0; const fails = [], log = [];
const ok = (id, cond, note) => { checked++; if (!cond) fails.push(id + ' ' + note); log.push((cond ? 'OK   ' : 'FAIL ') + id + ' — ' + note); };
const byId = {}; d.sets.forEach(s => s.questions.forEach(q => byId[q.id] = q));
// ---- A–B–C–D: giá trị đúng tính độc lập ----
const A = { 1: 3 + 4, 2: 9 - 5, 3: 19 + 1, 4: Math.max(7, 12, 9, 10), 5: 35 + 27, 6: 5 * 4, 7: 10, 8: 100 - 1, 9: 7 * 8, 10: 63 / 9, 11: 1000, 12: 4 * 5, 13: 5e4 + 3e3 + 200 + 4, 14: (12 + 15 + 18) / 3, 16: 3 * 1000 + 5 * 100, 18: .25 * 80, 19: 6 * 4 / 2, 20: 2.5 + 3.75 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-abcd-' + i], pick = q.answers[q.correct]; const lead = a => { const m = String(a).replace(/(\d)\s(?=\d)/g, '$1').replace(',', '.').match(/^-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; }; if (A[i] !== undefined) ok(q.id, lead(pick) === A[i] && q.answers.filter(a => lead(a) === A[i]).length === 1, q.text + ' → ' + pick + ' (máy tính: ' + A[i] + ', chỉ một phương án đúng)'); else if (i === 15) ok(q.id, pick === 'góc vuông', q.text + ' → ' + pick); else if (i === 17) ok(q.id, frac(pick) === .5 && q.answers.filter(a => frac(a) === .5).length === 1, q.text + ' → ' + pick); }
// ---- Đúng/Sai ----
const T = { 1: 5 + 3 === 8, 2: 10 - 4 === 5, 3: 15 > 51, 4: 2 * 10 + 0 === 20, 5: 46 + 38 === 84, 6: 2 * 9 === 16, 7: 1 * 100 === 100, 8: true, 9: 6 * 7 === 42, 10: 72 / 8 === 8, 11: true, 12: true, 13: 2024 % 2 === 0, 14: false, 15: true, 16: (4 + 10) / 2 === 8, 17: .25 === 1 / 4, 18: 3.5 * 2 === 6, 19: true, 20: .2 * 50 === 5 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-ds-' + i]; ok(q.id, (q.correct === 0) === T[i], q.text + ' → ' + q.answers[q.correct]); }
// ---- Nhiều đáp án: tập đúng tính độc lập ----
const M = { 1: a => num(a) > 5, 2: a => calc(a) === 6, 3: a => num(a) < 10, 4: a => /vuông|chữ nhật/.test(a), 5: a => num(a) % 10 === 0, 6: a => calc(a) === 10, 7: a => num(a) > 500, 8: a => ['cm', 'm'].includes(a), 9: a => num(a) % 3 === 0, 10: a => calc(a) === 24, 11: a => /vuông|chữ nhật/.test(a), 12: a => num(a) >= 1000 && num(a) <= 9999, 13: a => num(a) % 2 === 0, 14: a => /nhọn|45°/.test(a), 15: a => frac(a) === .5, 16: a => measure(a) === measure('2 kg'), 17: a => num(a) > .5, 18: a => (frac(a) ?? num(a)) === .5, 19: a => measure(a) === measure('1,5 m'), 20: a => calc(a) === 1 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-nda-' + i], want = q.answers.map((a, j) => M[i](a) ? j : -1).filter(j => j >= 0); ok(q.id, want.join() === q.correctAnswers.slice().sort().join() && want.length >= 2, q.text + ' → ' + q.correctAnswers.map(j => q.answers[j]).join(' ; ') + ' (máy tính: ' + want.map(j => q.answers[j]).join(' ; ') + ')'); }
// ---- Điền khuyết / Trả lời ngắn ----
const Fk = { 1: 9 - 4, 2: 10 - 7, 3: 30 - 1, 4: 14, 5: 45 + 18, 6: 14 / 2, 7: 100, 8: 352, 9: 48 / 8, 10: 81 / 9, 11: 1000, 12: (8 + 5) * 2, 13: 1000, 14: (20 + 30) / 2, 15: 5 * 60, 16: 99999 + 1, 17: .75 * 100, 18: 3.2 * 10, 19: 1.5 * 60, 20: Math.round(1.2 * 1.2 * 100) / 100 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-dk-' + i]; ok(q.id, num(q.answerText) === Fk[i], q.text + ' → ' + q.answerText + ' (máy tính: ' + Fk[i] + ')'); }
const Sk = { 1: 10, 2: 6 + 3, 3: 4, 4: 7, 5: 100 - 36, 6: 5 * 7, 7: 60, 8: 999, 9: 9 * 9, 10: 12, 11: 54 / 6, 12: 4 * 4, 13: 98, 14: 180, 15: (10 + 20 + 30) / 3, 16: 60 + 30, 17: .15 * 200, 18: 4.8 / 2, 19: 3 ** 3, 20: 120 / 2 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-tln-' + i]; ok(q.id, num(q.answerText) === Sk[i], q.text + ' → ' + q.answerText + ' (máy tính: ' + Sk[i] + ')'); }
// ---- Ghép đôi: mỗi cặp tính lại; vế phải không trùng nhau ----
const words = { 11: 'mười một', 15: 'mười lăm', 20: 'hai mươi', 14: 'mười bốn', 105: 'một trăm linh năm', 150: 'một trăm năm mươi', 501: 'năm trăm linh một', 510: 'năm trăm mười' };
const angle = { 'Góc nhọn': v => v > 0 && v < 90, 'Góc vuông': v => v === 90, 'Góc tù': v => v > 90 && v < 180, 'Góc bẹt': v => v === 180 };
for (let i = 1; i <= 20; i++) { const q = byId['mau-gd-' + i]; const rights = q.pairs.map(p => p.right); ok(q.id + '-unique', new Set(rights).size === rights.length && q.pairs.length === 4, 'bốn cặp, vế phải không trùng');
  q.pairs.forEach(p => { let good = null, how = '';
    if (calc(p.left) !== null && /[+\-−×:]/.test(p.left)) { good = calc(p.left) === num(p.right); how = 'tính'; }
    else if (i === 3) { good = num(p.left) + 1 === num(p.right); how = 'liền sau'; }
    else if (words[num(p.left)] !== undefined && (i === 2 || i === 8)) { good = words[num(p.left)] === p.right; how = 'cách đọc'; }
    else if (measure(p.left) && measure(p.right)) { good = measure(p.left) === measure(p.right); how = 'đổi đơn vị'; }
    else if (/^Cạnh/.test(p.left)) { good = num(p.left.replace('Cạnh', '').replace('cm', '')) * 4 === num(p.right.replace('cm', '')); how = 'chu vi'; }
    else if (angle[p.left]) { good = angle[p.left](num(p.right.replace('°', ''))); how = 'loại góc'; }
    else if (frac(p.left) !== null && frac(p.right) !== null) { good = Math.abs(frac(p.left) - frac(p.right)) < 1e-12; how = 'phân số bằng nhau'; }
    else if (frac(p.left) !== null) { good = frac(p.left) === num(p.right); how = 'phân số = số thập phân'; }
    else if (/%$/.test(p.right)) { good = num(p.left) * 100 === num(p.right.replace('%', '')); how = 'phần trăm'; }
    else if (i === 16) { const digits = String(num(p.left)), pos = digits.indexOf('5'); good = 5 * 10 ** (digits.length - 1 - pos) === num(p.right); how = 'giá trị chữ số 5'; }
    if (good === null) { manual++; log.push('TAY  ' + q.id + ' — ' + p.left + ' ↔ ' + p.right); } else ok(q.id, good, p.left + ' ↔ ' + p.right + ' (' + how + ')'); }); }
// ---- cấu trúc chung ----
const texts = Object.values(byId).map(q => q.text); ok('all-unique-text', new Set(texts).size === 140, '140 nội dung câu hỏi không trùng nhau: ' + new Set(texts).size);
d.sets.forEach(s => { const g = {}; s.questions.forEach(q => g[q.grade] = (g[q.grade] || 0) + 1); ok(s.id + '-spread', s.questions.length === 20 && [1, 2, 3, 4, 5].every(n => g['Lớp ' + n] === 4), s.name + ': 20 câu, mỗi lớp 4 câu'); });
d.sets[0].questions.forEach(q => ok(q.id + '-distinct', new Set(q.answers).size === 4, 'bốn phương án khác nhau'));
const pos = [0, 0, 0, 0]; d.sets[0].questions.forEach(q => pos[q.correct]++); ok('abcd-balance', pos.every(n => n === 5), 'vị trí đáp án A/B/C/D: ' + pos.join('/'));
console.log(log.filter(l => !l.startsWith('OK')).join('\n') || '(không có mục FAIL/TAY)');
console.log('\nĐÃ KIỂM BẰNG MÁY: ' + checked + ' phép kiểm · LỖI: ' + fails.length + ' · cần xem tay: ' + manual + ' (câu hỏi mở 20 câu không có đáp án duy nhất)');
if (process.argv[3]) F.writeFileSync(process.argv[3], JSON.stringify({ checked, fails, manual, log }, null, 1));
process.exit(fails.length ? 1 : 0);
