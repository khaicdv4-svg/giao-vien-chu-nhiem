const { open, importFile, saveSet, play } = require('./lib.cjs');
const fs = require('fs');
const DEMO = require('../main/app/bo-cau-hoi-mau.js');
const R = []; const rec = (id, name, ok, detail) => { R.push({ id, name, status: ok ? 'PASS' : 'FAIL', detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 240) : '')); };
const KEYS = JSON.parse(fs.readFileSync('files/keys.json'));
const noErr = logs => !logs.some(l => /PAGEERROR|console.error/.test(l));
const cards = page => page.evaluate(() => Array.from(document.querySelectorAll('#questions .kho-card')).map(c => c.innerText.replace(/\n+/g, ' | ')));
const gstate = (page, setId) => page.evaluate((setId) => { const set = questionBankSets.find(s => s.id === setId); const body = document.getElementById('games').innerText; const src = typeof questionSourceList === 'function' && classroomGame.type ? questionSourceList(classroomGame.type) : []; return { view: document.querySelector('.view.active')?.id, type: classroomGame.type, started: classroomGame.started, srcN: src.length, fromSet: src.length > 0 && src.every(q => set.questions.some(x => x.id === q.id || x.text === q.text)), head: body.replace(/\s+/g, ' ').slice(0, 130) }; }, setId);
(async () => {
  // ===== A. Bộ câu hỏi mẫu =====
  { const { browser, page, logs } = await open();
    await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const a = await page.evaluate(() => ({ demo: questionBankSets.filter(s => /^mau-/.test(s.id)).map(s => ({ id: s.id, n: s.questions.length, kinds: Array.from(new Set(s.questions.map(q => hmvKho.kindOf(q)))).join(), bad: s.questions.filter(q => hmvKho.validity(q).length).length })), chips: Array.from(document.querySelectorAll('#questions .kho-chips .kho-chip')).map(c => c.innerText.replace(/\s+/g, ' ').trim()), sections: Array.from(document.querySelectorAll('#questions .kho-section')).map(c => c.innerText.replace(/\s+/g, ' ')) }));
    rec('A1', 'Lần chạy đầu tự nạp 7 bộ mẫu, mỗi bộ 20 câu, mỗi bộ đúng một dạng, không câu nào lỗi', a.demo.length === 7 && a.demo.every(s => s.n === 20 && s.bad === 0) && a.demo.map(s => s.kinds).join('|') === 'ABCD|TRUEFALSE|MULTI|FILL|SHORT|MATCHING|OPEN', a.demo.map(s => s.kinds + ':' + s.n).join(' '));
    rec('A2', 'Thanh phân loại hiện 7 dạng kèm số câu', ['A–B–C–D 22', 'Đúng/Sai 20', 'Nhiều đáp án 20', 'Điền khuyết 20', 'Trả lời ngắn 20', 'Ghép đôi 20', 'Câu hỏi mở 20'].every(t => a.chips.some(c => c.includes(t))), a.chips.join(' · '));
    rec('A3', 'Kho chia hai nhóm: “Bộ câu hỏi của tôi” và “Bộ câu hỏi mẫu”', /Bộ câu hỏi của tôi/.test(a.sections[0]) && /Bộ câu hỏi mẫu 7 bộ/.test(a.sections[1]), a.sections.join(' / '));
    const ui = await page.evaluate(() => ({ add: document.querySelectorAll('#questions [data-kho-add]').length, old: Array.from(document.querySelectorAll('#questions button')).filter(b => /Tạo bộ|Nhập thông minh|Dùng cho trò chơi|Dán nhanh/.test(b.textContent)).length }));
    rec('A4', 'Chỉ còn một nút thêm câu hỏi; không còn nút trùng chức năng của bản cũ', ui.add === 1 && ui.old === 0, ui);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.length > 1); await page.waitForTimeout(800);
    rec('A5', 'Tải lại trang không nạp trùng bộ mẫu', await page.evaluate(() => questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7 && new Set(questionBankSets.map(s => s.id)).size === questionBankSets.length));
    await page.evaluate(() => openView('questions')); await page.click('#questions .kho-card:has([data-kho-view="mau-3-nhieu-dap-an"]) .kho-more summary'); await page.click('#questions [data-kho-delete="mau-3-nhieu-dap-an"]'); await page.waitForTimeout(600);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.length > 1); await page.waitForTimeout(900); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const d = await page.evaluate(() => ({ n: questionBankSets.filter(s => /^mau-/.test(s.id)).length, btn: !!document.querySelector('#questions [data-kho-demo]') }));
    rec('A6', 'Xóa một bộ mẫu (có hộp xác nhận) → không tự nạp lại; hiện nút “Nạp bộ câu hỏi mẫu”', d.n === 6 && d.btn && logs.some(l => /DIALOG confirm: Xóa bộ/.test(l)), d);
    await page.click('#questions [data-kho-demo]'); await page.waitForTimeout(700);
    rec('A7', 'Bấm “Nạp bộ câu hỏi mẫu” → đủ lại 7 bộ', await page.evaluate(() => questionBankSets.filter(s => /^mau-/.test(s.id)).length === 7 && !document.querySelector('#questions [data-kho-demo]')));
    rec('A8', 'Không lỗi JavaScript', noErr(logs), logs.filter(l => !/DIALOG/.test(l)).join(' || ')); await browser.close(); }
  // ===== B. Thêm câu hỏi: tự phân loại =====
  { const { browser, page, logs } = await open();
    const { id, r } = await saveSet(page, 'files/ds20-tieu-de.docx');
    rec('B1', 'Word 20 câu Đ/S có tiêu đề → đúng 20 câu Đúng/Sai, 20 khóa khớp', r.rows.length === 20 && r.rows.every((x, i) => x.kind === 'TRUEFALSE' && x.key === (KEYS[i] === 0 ? 'Đúng' : 'Sai')), r.summary);
    rec('B2', 'Bảng xem trước ghi rõ kết quả tự phân loại', /Tự phân loại: Đúng\/Sai: 20/.test(r.summary), r.summary);
    rec('B3', 'Tự gắn Lớp 4, năm học 2026–2027, môn Toán (từ tiêu đề)', r.rows.every(x => x.grade === 'Lớp 4' && x.subject === 'Toán') && r.year === '2026–2027');
    const c = (await cards(page)).find(x => x.startsWith('ds20-tieu-de'));
    rec('B4', 'Bộ mới nằm trong “Bộ câu hỏi của tôi”, thẻ ghi lớp – môn – dạng – số câu, có Chơi ngay và Luyện tập', !!c && /Lớp 4 · Toán/.test(c) && /20 câu \| ✅ Đúng\/Sai · 20/.test(c) && /Chơi ngay/.test(c) && /Luyện tập/.test(c), c);
    const m = await saveSet(page, 'files/mixed100.txt'); const want = JSON.parse(fs.readFileSync('files/mixed100.want.json'));
    rec('B5', '100 câu hỗn hợp → tự phân loại đúng 100/100 thành 5 dạng', m.r.rows.length === 100 && m.r.rows.every((x, i) => x.kind === want[i]), m.r.summary);
    const ab = await saveSet(page, 'files/abcd12.txt');
    const kinds = await page.evaluate((id) => { const s = questionBankSets.find(x => x.id === id); return { raw: Array.from(new Set(s.questions.map(q => q.kind))).join(), shown: Array.from(new Set(s.questions.map(q => hmvKho.kindOf(q)))).join(), keys: s.questions.map(q => 'ABCD'[q.correct]).join('') }; }, ab.id);
    rec('B6', '12 câu bốn lựa chọn (có “…”, một dòng, hai cột) → lưu là dạng A–B–C–D, 12 khóa đúng', kinds.raw === 'ABCD' && kinds.shown === 'ABCD' && kinds.keys === 'CBADCBADBCBC', kinds);
    const dup = await importFile(page, 'files/ds20-tieu-de.docx'); await page.click('#q7Save'); await page.waitForTimeout(400);
    rec('B7', 'Nhập lại cùng tệp → báo 20 câu trùng, không lưu chồng', /trùng 20/.test(dup.summary) && await page.evaluate(() => /Chọn ít nhất một câu mới/.test(document.querySelector('#q7Status')?.textContent || '')), dup.summary);
    await page.evaluate(() => document.getElementById('qbStage7Modal')?.remove());
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.length > 8); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const re = await page.evaluate((id) => { const s = questionBankSets.find(x => x.id === id); return { n: s.questions.length, keys: s.questions.map(q => q.correct).join(''), total: questionBankSets.length }; }, id);
    rec('B8', 'Tải lại trang: các bộ đã nhập còn nguyên câu và khóa', re.n === 20 && re.keys === KEYS.join('') && re.total === 11, re);
    // lọc theo dạng
    await page.click('#questions [data-kho-kind="FILL"]'); await page.waitForTimeout(200); const f1 = await page.evaluate(() => Array.from(document.querySelectorAll('#questions .kho-card h3')).map(h => h.innerText.replace(/\s+/g, ' ')));
    rec('B9', 'Bấm thẻ “Điền khuyết” → chỉ còn các bộ có câu điền khuyết', f1.length === 2 && f1.some(x => /Mẫu 4/.test(x)) && f1.some(x => /mixed100/.test(x)), f1);
    await page.click('#questions [data-kho-kind="ALL"]'); await page.selectOption('#questions [data-kho-filter="grade"]', 'Lớp 4'); await page.waitForTimeout(200); const f2 = await page.evaluate(() => document.querySelectorAll('#questions .kho-card').length);
    await page.selectOption('#questions [data-kho-filter="subject"]', 'Khoa học'); await page.waitForTimeout(200); const f3 = await page.evaluate(() => Array.from(document.querySelectorAll('#questions .kho-card h3')).map(h => h.innerText));
    await page.click('#questions [data-kho-clear]'); await page.waitForTimeout(200); await page.fill('#questions [data-kho-filter="search"]', 'thế kỉ'); await page.waitForTimeout(300); const f4 = await page.evaluate(() => ({ h: Array.from(document.querySelectorAll('#questions .kho-card h3')).map(h => h.innerText.replace(/\s+/g, ' ')), v: document.querySelector('#questions [data-kho-filter="search"]').value, focused: document.activeElement === document.querySelector('#questions [data-kho-filter="search"]') }));
    rec('B10', 'Lọc theo Khối, Môn, Bỏ lọc và ô tìm kiếm đều hoạt động', f2 === 4 && f3.length === 1 && /mixed100/.test(f3[0]) && f4.h.length === 2 && f4.v === 'thế kỉ' && f4.focused, { lop4: f2, khoahoc: f3, tim: f4.h });
    rec('B11', 'Không lỗi JavaScript', noErr(logs), logs.join(' || ')); await browser.close(); }
  // ===== C. Luyện tập: làm trọn 7 bộ mẫu bằng đáp án trong dữ liệu =====
  { const { browser, page, logs } = await open(); await page.evaluate(() => openView('questions'));
    for (const set of DEMO.sets) {
      await page.click('#questions [data-kho-practice="' + set.id + '"]'); await page.waitForSelector('#khoPractice .lt-question');
      let okCount = 0, shownOk = true;
      for (const q of set.questions) {
        const shown = await page.evaluate(() => document.querySelector('#khoPractice .lt-question').innerText); if (shown.trim() !== q.text.trim()) shownOk = false;
        if (q.kind === 'ABCD' || q.kind === 'TRUEFALSE') await page.click('#khoModal [data-lt-pick="' + q.correct + '"]');
        else if (q.kind === 'MULTI') { for (const k of q.correctAnswers) await page.click('#khoModal [data-lt-toggle="' + k + '"]'); await page.click('#khoModal [data-lt-check]'); }
        else if (q.kind === 'FILL' || q.kind === 'SHORT') { await page.fill('#khoModal [data-lt-input]', q.answerText); await page.keyboard.press('Enter'); }
        else if (q.kind === 'MATCHING') { for (let j = 0; j < q.pairs.length; j++) await page.selectOption('#khoModal [data-lt-match="' + j + '"]', { label: q.pairs[j].right }); await page.click('#khoModal [data-lt-check]'); }
        else { await page.click('#khoModal [data-lt-reveal]'); await page.click('#khoModal [data-lt-grade="1"]'); }
        if (await page.evaluate(() => !!document.querySelector('#khoPractice .lt-feedback.ok'))) okCount++;
        await page.click('#khoModal [data-lt-next]');
      }
      const end = await page.evaluate(() => document.querySelector('#khoPractice .lt-end')?.innerText.replace(/\s+/g, ' ') || '');
      rec('C-' + set.id, 'Luyện tập “' + set.name.replace(' · Toán lớp 1–5', '') + '”: 20 câu hiện đúng nội dung, trả lời theo đáp án → Đúng 20/20', shownOk && okCount === 20 && /Đúng 20\/20/.test(end), okCount + '/20 · ' + end.slice(0, 60));
      await page.click('#khoModal [data-kho-close]');
    }
    // trả lời sai
    await page.click('#questions [data-kho-practice="mau-1-abcd"]'); await page.waitForSelector('#khoPractice .lt-question'); await page.click('#khoModal [data-lt-pick="0"]'); const w1 = await page.evaluate(() => document.querySelector('#khoPractice .lt-feedback')?.innerText.replace(/\s+/g, ' '));
    rec('C8', 'A–B–C–D trả lời sai → báo chưa đúng và hiện đáp án đúng', /Chưa đúng/.test(w1) && /Đáp án: B\. 7/.test(w1), w1); await page.click('#khoModal [data-kho-close]');
    await page.click('#questions [data-kho-practice="mau-4-dien-khuyet"]'); await page.waitForSelector('#khoPractice .lt-question'); await page.fill('#khoModal [data-lt-input]', '6'); await page.click('#khoModal [data-lt-check]'); const w2 = await page.evaluate(() => document.querySelector('#khoPractice .lt-feedback')?.innerText.replace(/\s+/g, ' '));
    rec('C9', 'Điền khuyết trả lời sai → báo chưa đúng và hiện đáp án', /Chưa đúng/.test(w2) && /Đáp án: 5/.test(w2), w2); await page.click('#khoModal [data-lt-next]');
    await page.fill('#khoModal [data-lt-input]', ' 3 '); await page.click('#khoModal [data-lt-check]'); await page.click('#khoModal [data-lt-next]'); await page.click('#khoModal [data-lt-skip]');
    const mid = await page.evaluate(() => document.querySelector('#khoPractice .lt-top').innerText.replace(/\s+/g, ' '));
    rec('C10', 'Bỏ qua và đếm điểm đúng: sau 1 sai, 1 đúng, 1 bỏ qua → đang ở câu 4, Đúng 1', /Câu 4\/20/.test(mid) && /Đúng 1/.test(mid), mid); await page.click('#khoModal [data-kho-close]');
    await page.click('#questions [data-kho-practice="mau-6-ghep-doi"]'); await page.waitForSelector('#khoPractice .lt-question'); const order = await page.evaluate(() => Array.from(document.querySelectorAll('#khoModal [data-lt-match="0"] option')).slice(1).map(o => o.textContent));
    rec('C11', 'Ghép đôi: các ý bên phải được xáo trộn, không trùng thứ tự đáp án', order.join() !== DEMO.sets[5].questions[0].pairs.map(p => p.right).join() && order.length === 4, order); await page.click('#khoModal [data-kho-close]');
    rec('C12', 'Không lỗi JavaScript trong Luyện tập', noErr(logs), logs.join(' || ')); await browser.close(); }
  // ===== D. Chơi ngay với bộ mẫu =====
  { const { browser, page, logs } = await open();
    for (const g of ['tug', 'gift', 'buzzer', 'millionaire', 'balloon', 'race']) { const p = await play(page, 'mau-1-abcd', g); const s = await gstate(page, 'mau-1-abcd'); rec('D1-' + g, 'Bộ mẫu A–B–C–D → ' + g + ': vào chơi thẳng với 20 câu của bộ', !p.locked && s.type === g && s.started === true && s.srcN === 20 && s.fromSet, s); }
    let p = await play(page, 'mau-1-abcd', 'head-tilt'); rec('D1-head-tilt', 'Bộ A–B–C–D → Quiz Nghiêng Đầu bị khóa, nêu lý do', p.locked && /chỉ nhận Đúng\/Sai/.test(p.text), p.text); await page.evaluate(() => document.getElementById('khoModal')?.remove());
    for (const g of ['tug', 'gift', 'buzzer', 'balloon', 'race']) { const q = await play(page, 'mau-2-dung-sai', g); const s = await gstate(page, 'mau-2-dung-sai'); rec('D2-' + g, 'Bộ mẫu Đúng/Sai → ' + g + ': vào chơi thẳng với 20 câu của bộ', !q.locked && s.type === g && s.started === true && s.srcN === 20 && s.fromSet, s); }
    p = await play(page, 'mau-2-dung-sai', 'millionaire'); rec('D2-millionaire', 'Bộ Đúng/Sai → Chinh phục tri thức bị khóa, nêu lý do', p.locked && /4 phương án/.test(p.text), p.text); await page.evaluate(() => document.getElementById('khoModal')?.remove());
    p = await play(page, 'mau-7-cau-hoi-mo', 'tug'); const so = await gstate(page, 'mau-7-cau-hoi-mo'); rec('D3', 'Bộ mẫu Câu hỏi mở → Kéo co (giáo viên chấm) vào chơi với 20 câu', !p.locked && so.type === 'tug' && so.srcN === 20, so);
    const c3 = (await (async () => { await page.evaluate(() => openView('questions')); await page.waitForTimeout(200); return cards(page); })()).find(x => x.startsWith('Mẫu 4'));
    rec('D4', 'Bộ chỉ có dạng chưa có trò chơi nhận (Điền khuyết): không hiện Chơi ngay, có Luyện tập và lời giải thích', !!c3 && !/Chơi ngay/.test(c3) && /Luyện tập/.test(c3) && /dùng được ở Luyện tập/.test(c3), c3);
    rec('D5', 'Chuyển qua lại 12 lượt trò chơi không lỗi JavaScript', noErr(logs), logs.join(' || ')); await browser.close(); }
  // ===== E. Bóng bay tri thức trọn vòng với bộ mẫu Đúng/Sai (thay cho Lật mảnh ghép đã gỡ) =====
  { const { browser, page, logs } = await open(); await play(page, 'mau-2-dung-sai', 'balloon'); await page.waitForSelector('#bbStage .bb-balloon');
    const bs = () => page.evaluate(() => window.hmvBalloon.state().match);
    let c = await bs(); rec('E1', 'Vào trận: hiện câu của bộ, 2 quả bóng Đúng/Sai, 10 câu mỗi lượt (mặc định)', c.total === 10 && c.question.answers.join() === 'Đúng,Sai' && /Mẫu 2/.test(c.source), { total: c.total, src: c.source });
    await page.keyboard.press(String(2 - c.question.correct)); await page.waitForTimeout(200); let c2 = await bs(); rec('E2', 'Trả lời sai → không cộng điểm, hiện đáp án đúng', c2.phase === 'done' && c2.score[0] === 0 && !c2.outcome.ok, c2.outcome);
    let guard = 0; const seen = [c.question.text];
    while (guard++ < 80) { c = await bs(); if (!c || c.phase === 'end') break; if (c.phase === 'done') { await page.keyboard.press('Enter'); await page.waitForTimeout(40); continue; } seen.push(c.question.text); await page.keyboard.press(String(c.question.correct + 1)); await page.waitForTimeout(40); }
    await page.waitForSelector('.bb-end', { timeout: 6000 }); const endText = (await page.innerText('.bb-end')).replace(/\s+/g, ' ');
    rec('E3', 'Trả lời đúng 9 câu còn lại → kết quả Đúng 9/10, 90 điểm, câu không lặp', /Đúng 9\/10/.test(endText) && /90/.test(endText) && new Set(seen).size === 10, endText.slice(0, 90));
    await page.click('.bb-end [data-bb="start"]'); await page.waitForSelector('#bbStage .bb-balloon'); c = await bs(); rec('E4', 'Chơi lại đặt lại ván chơi', c.q === 0 && c.score[0] === 0, c.q);
    await page.evaluate(() => balloonBack()); await page.waitForTimeout(400); rec('E5', 'Thoát về thư viện, không lỗi JavaScript', await page.evaluate(() => classroomGame.type === null) && noErr(logs), logs.join(' || ')); await browser.close(); }
  // ===== F. Xem / Sửa / Sao chép / Xuất =====
  { const { browser, page, logs } = await open();
    await page.evaluate(() => new Promise((res, rej) => { const U = 'Chưa phân loại'; const mk = (t, kind, i) => ({ id: 'old-' + kind + i, text: t, question: t, kind, type: kind, answers: kind === 'TRUEFALSE' ? ['Đúng', 'Sai'] : [], options: [], optionLabels: [], correct: kind === 'TRUEFALSE' ? i % 2 : null, correctAnswers: kind === 'TRUEFALSE' ? [i % 2] : [], answerText: '', pairs: [], grade: U, schoolYear: U, subject: U, topic: U, lesson: U, difficulty: U, source: U, answerStatus: 'Hợp lệ', reviewErrors: [] }); const qs = [mk('20 CÂU HỎI ĐÚNG/SAI – TOÁN LỚP 4', 'OPEN', 0)]; for (let i = 1; i <= 20; i++) qs.push(mk('Câu cũ số ' + i + ' là đúng.', 'TRUEFALSE', i)); const set = { id: 'q7-set-legacy', name: 'Bộ nhập Chặng 7', setTitle: U, grade: U, schoolYear: U, subject: U, topic: U, lesson: U, difficulty: U, source: U, purpose: 'Luyện tập', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), questions: qs, games: [] }; const tx = audioDB.transaction('questionSets', 'readwrite'); tx.objectStore('questionSets').put(set); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }));
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.some(s => s.id === 'q7-set-legacy')); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const c0 = (await cards(page)).find(x => x.startsWith('Bộ nhập Chặng 7'));
    rec('F1', 'Bộ cũ kiểu Chặng 7 (21 câu, “Chưa phân loại”) đọc nguyên vẹn, không bị tự sửa', !!c0 && /21 câu/.test(c0) && /Đúng\/Sai · 20/.test(c0) && /Câu hỏi mở · 1/.test(c0), c0);
    await page.click('#questions [data-kho-view="q7-set-legacy"]'); await page.waitForSelector('#khoModal'); const v = await page.evaluate(() => ({ n: document.querySelectorAll('#khoModal .kho-question').length, chips: Array.from(document.querySelectorAll('#khoModal .kho-chip')).map(c => c.innerText.replace(/\s+/g, ' ')) })); await page.click('#khoModal [data-kho-viewkind="OPEN"]'); await page.waitForTimeout(200); const v2 = await page.evaluate(() => Array.from(document.querySelectorAll('#khoModal .kho-question p')).map(p => p.innerText));
    rec('F2', 'Xem: liệt kê 21 câu kèm đáp án; lọc theo dạng trong bộ', v.n === 21 && v.chips.length === 3 && v2.length === 1 && /20 CÂU HỎI/.test(v2[0]), v.chips.join(' · '));
    await page.click('#khoModal [data-kho-edit]'); await page.waitForSelector('#khoModal [data-kho-save]'); await page.click('#khoModal [data-qindex="0"] summary'); await page.click('#khoModal [data-qindex="0"] [data-kho-delq]');
    await page.fill('#khoModal [data-set-field="grade"]', 'Lớp 4'); await page.fill('#khoModal [data-set-field="subject"]', 'Toán'); await page.fill('#khoModal [data-set-field="name"]', 'Toán 4 – Đúng/Sai (đã sửa)'); await page.click('#khoModal [data-kho-save]'); await page.waitForTimeout(700);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.audioDB && questionBankSets.some(s => s.id === 'q7-set-legacy')); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const e = await page.evaluate(() => { const s = questionBankSets.find(x => x.id === 'q7-set-legacy'); return { name: s.name, n: s.questions.length, hasHeading: s.questions.some(q => /20 CÂU HỎI/.test(q.text)), grade: s.grade, subject: s.subject, topic: s.topic, qGrade: Array.from(new Set(s.questions.map(q => q.grade))), qSubject: Array.from(new Set(s.questions.map(q => q.subject))), keys: s.questions.map(q => q.correct).join('') }; });
    rec('F3', 'Sửa: xóa riêng “câu” tiêu đề 21 → 20, 20 câu còn lại giữ khóa; có hộp xác nhận nêu số câu bị xóa', e.n === 20 && !e.hasHeading && e.keys === Array.from({ length: 20 }, (_, i) => (i + 1) % 2).join('') && logs.some(l => /Sẽ xóa 1 câu/.test(l)), { n: e.n });
    rec('F4', 'Sửa: đổi tên, Khối, Môn của bộ → cập nhật xuống từng câu, còn sau tải lại', e.name === 'Toán 4 – Đúng/Sai (đã sửa)' && e.grade === 'Lớp 4' && e.subject === 'Toán' && e.qGrade.join() === 'Lớp 4' && e.qSubject.join() === 'Toán', e);
    const menu = async (sid) => { await page.evaluate(() => document.querySelectorAll('#questions details[open]').forEach(d => d.open = false)); await page.click('#questions .kho-card:has([data-kho-view="' + sid + '"]) .kho-more summary'); await page.waitForTimeout(150); };
    await menu('q7-set-legacy'); const n0 = await page.evaluate(() => questionBankSets.length); await page.click('#questions [data-kho-copy="q7-set-legacy"]'); await page.waitForTimeout(700); const cp = await page.evaluate(() => ({ n: questionBankSets.length, last: questionBankSets[questionBankSets.length - 1].name, mine: Array.from(document.querySelectorAll('#questions .kho-section'))[0].innerText.replace(/\s+/g, ' ') }));
    rec('F5', 'Sao chép tạo bộ mới trong “Bộ câu hỏi của tôi”', cp.n === n0 + 1 && /Bản sao/.test(cp.last), cp);
    await menu('mau-1-abcd'); await page.click('#questions [data-kho-copy="mau-1-abcd"]'); await page.waitForTimeout(700); const cp2 = await page.evaluate(() => ({ demo: questionBankSets.filter(s => /^mau-\d/.test(s.id)).length, sec: Array.from(document.querySelectorAll('#questions .kho-section')).map(x => x.innerText.replace(/\s+/g, ' ')) }));
    rec('F6', 'Sao chép một bộ mẫu → bản sao thuộc “Bộ của tôi”, bộ mẫu vẫn 7', cp2.demo === 7 && /4 bộ/.test(cp2.sec[0]), cp2.sec.join(' / '));
    await menu('q7-set-legacy'); const dl = page.waitForEvent('download', { timeout: 4000 }).catch(() => null); await page.click('#questions [data-kho-export="q7-set-legacy"]'); const d = await dl;
    rec('F7', 'Xuất dữ liệu tải về tệp JSON của bộ', !!d && /bo-cau-hoi-.*\.json/.test(d.suggestedFilename()), d ? d.suggestedFilename() : 'không có tệp');
    rec('F8', 'Không lỗi JavaScript', noErr(logs), logs.filter(l => !/DIALOG/.test(l)).join(' || ')); await browser.close(); }
  // ===== G. Ngắt mạng =====
  { const { browser, ctx, page, logs } = await open();
    const sw = await page.evaluate(async () => { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 8000))]); if (!reg) return null; const keys = await caches.keys(); return { caches: keys, n: (await (await caches.open(keys[0])).keys()).length }; });
    rec('G1', 'Service worker cài xong và lưu đủ 26 tệp ứng dụng', !!sw && sw.caches.join() === 'hmv-ban-chinh-2.12' && sw.n >= 26, sw);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); await ctx.setOffline(true); await page.reload({ waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => window.audioDB && Array.isArray(window.questionBankSets) && questionBankSets.length > 7, null, { timeout: 8000 }); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const off = await page.evaluate(() => ({ online: navigator.onLine, marker: document.getElementById('runtimeBuildMarker').textContent, demo: questionBankSets.filter(s => /^mau-/.test(s.id)).length, styled: getComputedStyle(document.querySelector('.kho-title')).backgroundColor, cam: !!window.hmvTiltCamera }));
    rec('G2', 'Ngắt mạng rồi tải lại: ứng dụng, Kho và 7 bộ mẫu vẫn mở đúng bản chính', off.online === false && off.demo === 7 && /BAN-CHINH-2.12/.test(off.marker) && off.styled === 'rgb(243, 240, 255)' && off.cam, off);
    const r = await importFile(page, 'files/ds20-D-S.docx'); rec('G3', 'Ngắt mạng: đọc tệp Word 20 câu, tự phân loại Đúng/Sai', r.rows.length === 20 && r.rows.every(x => x.kind === 'TRUEFALSE'), r.summary); await page.evaluate(() => document.getElementById('qbStage7Modal')?.remove());
    await page.click('#questions [data-kho-practice="mau-5-tra-loi-ngan"]'); await page.waitForSelector('#khoPractice .lt-question'); await page.fill('#khoModal [data-lt-input]', '10'); await page.keyboard.press('Enter'); const fb = await page.evaluate(() => !!document.querySelector('#khoPractice .lt-feedback.ok')); await page.click('#khoModal [data-kho-close]');
    rec('G4', 'Ngắt mạng: Luyện tập chấm đúng', fb);
    await play(page, 'mau-2-dung-sai', 'race'); const s = await gstate(page, 'mau-2-dung-sai'); rec('G5', 'Ngắt mạng: Chơi ngay → Đường đua chạy với 20 câu của bộ mẫu', s.type === 'race' && s.started && s.srcN === 20, s);
    rec('G6', 'Ngắt mạng: không lỗi JavaScript', !logs.some(l => /PAGEERROR/.test(l)), logs.join(' || ')); await browser.close(); }
  // ===== H. Bố cục =====
  for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    const { browser, page } = await open({ viewport: vp }); await saveSet(page, 'files/ds20-tieu-de.docx'); await page.evaluate(() => openView('questions')); await page.waitForTimeout(300);
    const m = await page.evaluate(() => { const lum = (c) => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }; const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }; const h = document.querySelector('.kho-title h2'), chip = document.querySelector('.kho-chip:not(.active)'), search = document.querySelector('[data-kho-filter="search"]').getBoundingClientRect(); return { overflowX: document.documentElement.scrollWidth > innerWidth, title: +cr(getComputedStyle(h).color, getComputedStyle(h.closest('.kho-title')).backgroundColor).toFixed(1), chip: +cr(getComputedStyle(chip).color, getComputedStyle(chip).backgroundColor).toFixed(1), searchW: Math.round(search.width), cardH: Array.from(document.querySelectorAll('.kho-card')).map(c => Math.round(c.getBoundingClientRect().height)), overlap: (() => { for (const card of document.querySelectorAll('.kho-card')) { const b = Array.from(card.querySelectorAll('.kho-actions > *')).map(x => x.getBoundingClientRect()); for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const A = b[i], B = b[j]; if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) return true; } } return false; })() }; });
    await page.screenshot({ path: 'k-kho-' + vp.width + '.png' });
    rec('H-' + vp.width, vp.width + '×' + vp.height + ': không tràn ngang, chữ đủ tương phản, ô tìm rộng, thẻ gọn, nút không chồng', !m.overflowX && m.title >= 7 && m.chip >= 7 && m.searchW >= 220 && Math.max(...m.cardH) <= 140 && !m.overlap, m);
    await browser.close(); }
  // ===== I. Hồi quy =====
  { const { browser, page, logs } = await open(); for (const v of ['dashboard', 'students', 'picker', 'groups', 'games', 'questions', 'scores', 'attendance', 'ai', 'settings']) { await page.evaluate((v) => openView(v), v); await page.waitForTimeout(350); }
    rec('I1', 'Mở lần lượt 10 màn hình chính không lỗi JavaScript', noErr(logs), logs.join(' || '));
    await page.evaluate(() => { openView('games'); }); await page.waitForTimeout(300); await page.evaluate(() => { const b = document.getElementById('questionBankOpenButton') || Array.from(document.querySelectorAll('#games button')).find(x => /Kho câu hỏi/.test(x.textContent)); b.click(); }); await page.waitForTimeout(400);
    const inGames = await page.evaluate(() => ({ bank: !!document.querySelector('#games .kho-bank'), add: document.querySelectorAll('#games [data-kho-add]').length }));
    rec('I2', 'Nút “Kho câu hỏi” trong thư viện trò chơi mở đúng Kho mới (cùng một giao diện)', inGames.bank && inGames.add === 1, inGames);
    await browser.close(); }
  fs.writeFileSync('kho-results.json', JSON.stringify(R, null, 1));
  console.log('\nKHO: ' + R.filter(x => x.status === 'PASS').length + ' PASS / ' + R.filter(x => x.status === 'FAIL').length + ' FAIL');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
