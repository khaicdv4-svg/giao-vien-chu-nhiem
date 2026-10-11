const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 210) : '')); };
const st = p => p.evaluate(() => window.hmvBuzzState());
const cur = p => p.evaluate(() => { const s = window.hmvBuzzState(), m = s.match; if (!m) return { m: null }; const list = window.hmvC6QuestionsForGame('buzzer'); return { m, q: list[m.order[m.q % m.order.length]], music: s.music, set: s.settings }; });
const setS = (p, patch) => p.evaluate(patch => { const c = JSON.parse(localStorage.getItem('tk_buzzer_settings') || '{}'); localStorage.setItem('tk_buzzer_settings', JSON.stringify(Object.assign({ v: 2 }, c, patch))); }, patch);
const ready = p => p.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
const waitPhase = (p, re, t = 6000) => p.waitForFunction(src => new RegExp(src).test((window.hmvBuzzState().match || {}).phase || ''), re.source, { timeout: t });
const fresh = async (p, patch) => { await p.evaluate(() => { try { buzzBack(); } catch (e) {} localStorage.removeItem('tk_buzzer_match'); }); await setS(p, patch); await p.reload(); await ready(p); };
(async () => {
  const vp = { width: 1366, height: 768 };
  const { browser, page, logs } = await lib.open({ viewport: vp, args: ['--autoplay-policy=document-user-activation-required'] });
  let s = await st(page);
  ok('Mặc định: tự chấm + tự chuyển câu (3 giây), chờ bấm chuông tối đa 20 giây', s.settings.auto === true && s.settings.autoDelay === 3 && s.settings.openWait === 20, { auto: s.settings.auto, d: s.settings.autoDelay, w: s.settings.openWait });
  // A. màn thiết lập gõ được tên đội (lỗi cũ: gõ phím nào cũng bị chặn)
  await page.evaluate(() => { openView('games'); gameSetup('buzzer'); }); await page.waitForSelector('#buzzName0');
  await page.fill('#buzzName0', ''); await page.type('#buzzName0', 'Sao Mai'); const typed = await page.inputValue('#buzzName0');
  ok('Màn thiết lập: gõ được tên đội (trước đây mọi phím bị chặn và báo lỗi)', typed === 'Sao Mai', typed);
  ok('Màn thiết lập có: Chấm điểm, Chờ trước khi chuyển câu, Chờ bấm chuông tối đa', await page.isVisible('#buzzAutoMode') && await page.isVisible('#buzzDelay') && await page.isVisible('#buzzOpenWait') && await page.inputValue('#buzzAutoMode') === '1');
  await page.fill('#buzzName0', 'Tổ 1');
  // B. chơi từ Kho, chuông tự mở
  const r = await lib.play(page, 'mau-1-abcd', 'buzzer'); await page.waitForTimeout(300); let c = await cur(page);
  ok('Kho → Chơi ngay → Ai nhanh hơn: vào trận, hiện câu hỏi và đáp án', !r.locked && !!c.m && (await page.$$('.buzz-answer')).length === 4, c.m && c.m.phase);
  await waitPhase(page, /BUZZER_OPEN/); c = await cur(page);
  ok('Chuông TỰ MỞ sau giây lát, không cần giáo viên bấm "Mở chuông"', c.m.buzzer === 'OPEN' && /BẤM CHUÔNG NGAY/.test(await page.innerText('.buzz-status')), await page.innerText('.buzz-status'));
  const fit = await page.evaluate(() => { const g = document.querySelector('.buzz-answer-grid').getBoundingClientRect(), f = document.querySelector('.buzz-feedback').getBoundingClientRect(); return { answersBottom: Math.round(g.bottom), feedbackBottom: Math.round(f.bottom), vh: innerHeight }; });
  ok('1366×768: thẻ đội, câu hỏi, 4 đáp án và dòng hướng dẫn nằm trọn một màn hình', fit.feedbackBottom <= fit.vh, fit);
  await page.screenshot({ path: __dirname + '/buzz-1-open.png' });
  // chạm đáp án khi chưa giành quyền → nhắc, không chấm
  await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(200); let c2 = await cur(page);
  ok('Chạm đáp án khi chưa giành quyền → chỉ nhắc "giành quyền trước", không chấm', c2.m.buzzer === 'OPEN' && !c2.m.answered && /giành quyền/i.test(await page.innerText('#toast')), await page.innerText('#toast'));
  // chạm thẻ đội 2 để giành quyền
  await page.click('.buzz-team >> nth=1'); await page.waitForTimeout(200); c2 = await cur(page);
  ok('CHẠM vào thẻ đội → đội đó giành quyền trả lời (không cần bàn phím)', c2.m.buzzer === 'TEAM_LOCKED' && c2.m.claimed === 1 && /Tổ 2 giành quyền/.test(await page.innerText('.buzz-status')), await page.innerText('.buzz-status'));
  ok('Tự chấm: không còn nút ✓ Đúng / ✗ Sai với câu trắc nghiệm', !(await page.$('.buzz-judge')) && /chạm vào một đáp án/.test(await page.innerText('.buzz-feedback')), await page.innerText('.buzz-feedback'));
  await page.click('.buzz-team >> nth=0'); await page.waitForTimeout(150); c2 = await cur(page);
  ok('Đội khác chạm khi đã có đội giành quyền → không cướp được', c2.m.claimed === 1);
  // chọn đáp án đúng → tự chấm
  await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(250); c2 = await cur(page);
  ok('Đội giành quyền chạm đáp án ĐÚNG → tự chấm đúng, +10 điểm', c2.m.phase === 'QUESTION_FINISHED' && c2.m.scores[1] === 10 && c2.m.outcome.ok === true, { phase: c2.m.phase, scores: c2.m.scores });
  ok('Đáp án đúng tô xanh; báo "trả lời đúng" kèm đếm ngược tự chuyển câu', await page.evaluate(i => document.querySelectorAll('.buzz-answer')[i].classList.contains('correct'), c.q.correct) && /Tổ 2 trả lời đúng/.test(await page.innerText('.buzz-feedback')) && await page.isVisible('#buzzAuto'), (await page.innerText('.buzz-feedback')).replace(/\n/g, ' | '));
  await page.screenshot({ path: __dirname + '/buzz-2-correct.png' });
  await page.waitForFunction(() => window.hmvBuzzState().match.q === 1, null, { timeout: 6000 }); c = await cur(page);
  ok('Sau ~3 giây TỰ CHUYỂN sang câu 2, điểm giữ nguyên, trạng thái đặt lại', c.m.q === 1 && c.m.phase === 'QUESTION_VISIBLE' && c.m.scores[1] === 10 && c.m.claimed === null && c.m.wrongTeams.length === 0);
  ok('Câu mới: chuông khóa khoảng 1 giây cho học sinh đọc đề ("CHUẨN BỊ…")', /CHUẨN BỊ/.test(await page.innerText('.buzz-status')), await page.innerText('.buzz-status'));
  await waitPhase(page, /BUZZER_OPEN/);
  ok('Câu 2: chuông lại tự mở', true);
  // C. bàn phím: Q giành quyền, phím số chọn đáp án sai → chuyển quyền
  await page.keyboard.press('q'); await page.waitForTimeout(150); c = await cur(page);
  ok('Phím Q → đội 1 giành quyền', c.m.claimed === 0 && c.m.buzzer === 'TEAM_LOCKED');
  const wrong = (c.q.correct + 1) % 4; await page.keyboard.press(String(wrong + 1)); await page.waitForTimeout(250); c2 = await cur(page);
  ok('Phím số chọn đáp án SAI → tự chấm sai, đội 1 mất quyền câu này, đáp án sai bị gạch', c2.m.wrong[0] === 1 && c2.m.wrongTeams.includes(0) && c2.m.tried.includes(wrong) && c2.m.phase === 'REOPENING' && /Tổ 1 trả lời chưa đúng/.test(await page.innerText('.buzz-feedback')), (await page.innerText('.buzz-feedback')).replace(/\n/g, ' | '));
  ok('Chưa lộ đáp án đúng khi chuông còn mở lại cho đội kia', await page.evaluate(() => !document.querySelector('.buzz-answer.correct')) && !/Đáp án đúng/.test(await page.innerText('.buzz-feedback')));
  await waitPhase(page, /BUZZER_OPEN/, 4000); c2 = await cur(page);
  ok('Chuông TỰ MỞ LẠI cho đội còn lại', c2.m.buzzer === 'OPEN');
  await page.keyboard.press('q'); await page.waitForTimeout(150); c2 = await cur(page);
  ok('Đội vừa trả lời sai bấm lại → không giành được quyền', c2.m.buzzer === 'OPEN' && c2.m.claimed === null);
  await page.click('.buzz-team >> nth=0'); await page.waitForTimeout(150);
  ok('Đội đã mất quyền chạm thẻ → được nhắc chờ câu sau', /mất quyền/.test(await page.innerText('#toast')), await page.innerText('#toast'));
  ok('Đáp án đã chọn sai bị khóa, không chọn lại được', await page.evaluate(i => document.querySelectorAll('.buzz-answer')[i].disabled, wrong));
  await page.keyboard.press('p'); await page.waitForTimeout(150); await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(250); c2 = await cur(page);
  ok('Đội 2 giành quyền (phím P) và trả lời đúng → đội 2 được điểm', c2.m.scores[1] === 20 && c2.m.phase === 'QUESTION_FINISHED');
  await page.keyboard.press('Enter'); await page.waitForTimeout(250); c = await cur(page);
  ok('Phím Enter (hoặc nút "Câu tiếp theo") chuyển ngay, không cần chờ', c.m.q === 2 && c.m.phase === 'QUESTION_VISIBLE');
  // D. cả hai đội sai → hiện đáp án, tự chuyển
  await waitPhase(page, /BUZZER_OPEN/); c = await cur(page); const w1 = (c.q.correct + 1) % 4, w2 = (c.q.correct + 2) % 4;
  await page.keyboard.press('q'); await page.waitForTimeout(120); await page.click(`.buzz-answer >> nth=${w1}`); await waitPhase(page, /BUZZER_OPEN/, 4000);
  await page.keyboard.press('p'); await page.waitForTimeout(120); await page.click(`.buzz-answer >> nth=${w2}`); await page.waitForTimeout(250); c2 = await cur(page);
  const fb = (await page.innerText('.buzz-feedback')).replace(/\n/g, ' | ');
  ok('Cả hai đội sai → khóa chuông, HIỆN ĐÁP ÁN ĐÚNG (tô xanh), hai đáp án sai tô đỏ', c2.m.phase === 'REVEALING_ANSWER' && /Đáp án đúng/.test(fb) && await page.evaluate(([k, a, b]) => { const x = document.querySelectorAll('.buzz-answer'); return x[k].classList.contains('correct') && x[a].classList.contains('wrong') && x[b].classList.contains('wrong'); }, [c.q.correct, w1, w2]), fb);
  await page.screenshot({ path: __dirname + '/buzz-3-reveal.png' });
  await page.waitForFunction(() => window.hmvBuzzState().match.q === 3, null, { timeout: 6000 });
  ok('Cả hai sai xong cũng tự chuyển câu', true);
  // E. tạm dừng giữ nguyên đếm ngược
  await waitPhase(page, /BUZZER_OPEN/); await page.keyboard.press(' '); await page.waitForTimeout(300); c = await cur(page); const ol = c.m.openLeft; await page.waitForTimeout(1200); c2 = await cur(page);
  ok('Tạm dừng (Space): đồng hồ chờ bấm chuông đứng yên', c.m.paused && Math.abs(c2.m.openLeft - ol) < 0.01, { a: ol, b: c2.m.openLeft });
  await page.keyboard.press('q'); await page.waitForTimeout(150); c2 = await cur(page);
  ok('Đang tạm dừng: bấm chuông không có tác dụng', c2.m.claimed === null);
  await page.keyboard.press(' '); await page.waitForTimeout(600); c2 = await cur(page);
  ok('Tiếp tục: đồng hồ chạy lại', !c2.m.paused && c2.m.openLeft < ol);
  // hoàn tác
  await page.keyboard.press('q'); await page.waitForTimeout(120); c = await cur(page); await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(200); await page.click('button:has-text("Hoàn tác")'); await page.waitForTimeout(200); c2 = await cur(page);
  ok('Hoàn tác lượt vừa chấm: điểm trả lại, đội đó trả lời lại, không tự chuyển câu', c2.m.scores[0] === 0 && c2.m.buzzer === 'TEAM_LOCKED' && c2.m.autoLeft === null && c2.m.q === c.m.q, { scores: c2.m.scores, phase: c2.m.phase });
  await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(200);
  // F. không ai bấm chuông
  await fresh(page, { openWait: 10, autoDelay: 2, response: 5, music: false });
  await lib.play(page, 'mau-1-abcd', 'buzzer'); await waitPhase(page, /BUZZER_OPEN/); c = await cur(page);
  ok('Hiện đếm ngược chờ bấm chuông trên băng trạng thái', await page.isVisible('#buzzOpenLeft'), await page.innerText('.buzz-status'));
  await page.waitForFunction(() => window.hmvBuzzState().match.phase === 'REVEALING_ANSWER', null, { timeout: 13000 }); c2 = await cur(page);
  ok('Không đội nào bấm chuông trong 10 giây → báo, hiện đáp án đúng', c2.m.outcome.why === 'nobuzz' && /Không đội nào bấm chuông/.test(await page.innerText('.buzz-feedback')) && /Đáp án đúng/.test(await page.innerText('.buzz-feedback')), (await page.innerText('.buzz-feedback')).replace(/\n/g, ' | '));
  await page.waitForFunction(() => window.hmvBuzzState().match.q === 1, null, { timeout: 5000 });
  ok('…rồi tự chuyển câu sau 2 giây (theo thiết lập)', true);
  // hết giờ trả lời
  await waitPhase(page, /BUZZER_OPEN/); await page.keyboard.press('q'); await page.waitForFunction(() => window.hmvBuzzState().match.phase === 'REOPENING' || window.hmvBuzzState().match.wrong[0] === 1, null, { timeout: 8000 }); c2 = await cur(page);
  ok('Giành quyền nhưng không trả lời trong 5 giây → tự tính sai (hết giờ), mở lại cho đội kia', c2.m.wrong[0] === 1 && c2.m.outcome.why === 'timeout' && /hết thời gian/.test(await page.innerText('.buzz-feedback')), (await page.innerText('.buzz-feedback')).replace(/\n/g, ' | '));
  // giáo viên bỏ qua câu bằng N khi chuông mở
  await waitPhase(page, /BUZZER_OPEN/, 4000); await page.keyboard.press('n'); await page.waitForTimeout(200); c2 = await cur(page);
  ok('Giáo viên bấm N khi chưa ai trả lời → hiện đáp án (bỏ qua câu)', c2.m.phase === 'REVEALING_ANSWER' && c2.m.outcome.why === 'skip');
  await page.keyboard.press('n'); await page.waitForTimeout(250); c2 = await cur(page); ok('Bấm N lần nữa → sang câu tiếp', c2.m.q === 2);
  // G. bộ Đúng/Sai và câu hỏi mở
  await fresh(page, { openWait: 20, autoDelay: 2, response: 15 });
  await lib.play(page, 'mau-2-dung-sai', 'buzzer'); await waitPhase(page, /BUZZER_OPEN/); c = await cur(page);
  await page.click('.buzz-team >> nth=0'); await page.waitForTimeout(120); await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(200); c2 = await cur(page);
  ok('Bộ Đúng/Sai (2 đáp án): chạm thẻ đội, chạm đáp án → tự chấm đúng', (await page.$$('.buzz-answer')).length === 2 && c2.m.scores[0] === 10);
  await fresh(page, {});
  await lib.play(page, 'mau-7-cau-hoi-mo', 'buzzer'); await waitPhase(page, /BUZZER_OPEN/);
  await page.keyboard.press('p'); await page.waitForTimeout(150);
  ok('Câu hỏi mở: sau khi đội giành quyền, hiện nút ✓ Đúng / ✗ Sai cho giáo viên', await page.isEnabled('.buzz-judge button:has-text("Đúng")') && /giáo viên bấm/.test(await page.innerText('.buzz-feedback')), await page.innerText('.buzz-feedback'));
  await page.click('.buzz-judge button:has-text("Đúng")'); await page.waitForTimeout(200); c2 = await cur(page);
  ok('Giáo viên bấm ✓ Đúng → cộng điểm, vẫn tự chuyển câu', c2.m.scores[1] === 10 && c2.m.autoLeft !== null);
  await page.waitForFunction(() => window.hmvBuzzState().match.q === 1, null, { timeout: 5000 }); ok('Câu hỏi mở: tự chuyển câu sau khi chấm', true);
  // H. chế độ giáo viên chấm tay giữ cách chơi cũ
  await fresh(page, { auto: false });
  await lib.play(page, 'mau-1-abcd', 'buzzer'); await page.waitForTimeout(2200); c = await cur(page);
  ok('Chế độ "Giáo viên chấm tay": chuông KHÔNG tự mở', c.m.phase === 'QUESTION_VISIBLE' && c.m.buzzer === 'LOCKED');
  await page.click('button:has-text("Mở chuông")'); await page.waitForTimeout(200); await page.keyboard.press('q'); await page.waitForTimeout(150); await page.click(`.buzz-answer >> nth=${c.q.correct}`); await page.waitForTimeout(200); c2 = await cur(page);
  ok('Chấm tay: chọn đáp án chưa chấm ngay, chờ giáo viên', c2.m.buzzer === 'TEAM_LOCKED' && !c2.m.answered && c2.m.selected === c.q.correct);
  await page.keyboard.press('d'); await page.waitForTimeout(2600); c2 = await cur(page);
  ok('Chấm tay: bấm D chấm đúng, không tự chuyển câu', c2.m.scores[0] === 10 && c2.m.q === 0 && c2.m.autoLeft === null);
  // I. hết bộ câu hỏi → kết thúc tự động, hòa/thắng
  await fresh(page, { auto: true, autoDelay: 2, openWait: 20 });
  await lib.play(page, 'mau-1-abcd', 'buzzer');
  for (let i = 0; i < 20; i++) { await waitPhase(page, /BUZZER_OPEN|GAME_FINISHED/, 8000); c = await cur(page); if (c.m.phase === 'GAME_FINISHED') break; await page.keyboard.press(i % 3 === 0 ? 'p' : 'q'); await page.waitForTimeout(60); await page.keyboard.press(String(c.q.correct + 1)); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
  await page.waitForFunction(() => window.hmvBuzzState().match.phase === 'GAME_FINISHED', null, { timeout: 8000 }); c = await cur(page);
  ok('Chơi hết 20 câu (toàn bằng bàn phím) → tự kết thúc, công bố đội thắng', c.m.phase === 'GAME_FINISHED' && c.m.scores[0] === 130 && c.m.scores[1] === 70 && /Tổ 1 CHIẾN THẮNG/.test(await page.innerText('.buzz-result')), { scores: c.m.scores, text: (await page.innerText('.buzz-result h2')) });
  await page.screenshot({ path: __dirname + '/buzz-4-finish.png' });
  // J. tải lại giữa trận
  await page.click('.buzz-result button:has-text("Chơi lại")'); await waitPhase(page, /BUZZER_OPEN/); await page.keyboard.press('q'); await page.waitForTimeout(100); c = await cur(page); await page.keyboard.press(String(c.q.correct + 1)); await page.waitForTimeout(200);
  await page.reload(); await page.waitForTimeout(1800); c = await cur(page);
  ok('Tải lại trang giữa trận: tiếp tục được, giữ điểm, mở đúng màn hình trò chơi', c.m && c.m.scores[0] === 10 && await page.isVisible('.buzz-game'), c.m && { phase: c.m.phase, scores: c.m.scores });
  await waitPhase(page, /BUZZER_OPEN/, 6000).then(() => ok('Sau khi tải lại, chuông lại tự mở', true), () => ok('Sau khi tải lại, chuông lại tự mở', false));
  const errs = logs.filter(l => !/^DIALOG/.test(l)); ok('Không có lỗi JavaScript', errs.length === 0, errs.slice(0, 4));
  fs.writeFileSync(__dirname + '/ai-nhanh-hon-tu-cham-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
