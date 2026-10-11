const lib = require('./lib.cjs');
const fs = require('fs');
const R = []; const ok = (n, c, d) => { R.push({ name: n, pass: !!c, detail: d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d)) }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 210) : '')); };
const st = p => p.evaluate(() => window.hmvBuzzState());
const setS = (p, patch) => p.evaluate(patch => { const cur = JSON.parse(localStorage.getItem('tk_buzzer_settings') || '{}'); localStorage.setItem('tk_buzzer_settings', JSON.stringify(Object.assign({ v: 2 }, cur, patch))); }, patch);
const ready = p => p.waitForFunction(() => window.questionBankSets && window.questionBankSets.length >= 7 && window.hmvKho);
(async () => {
  const { browser, page, logs } = await lib.open({ args: ['--autoplay-policy=document-user-activation-required'] });
  let s = await st(page);
  ok('Mặc định: nhạc nền bật, tiếng chuông bật', s.settings.music === true && s.settings.sound === true && s.settings.musicVolume === 0.3, { music: s.settings.music, sound: s.settings.sound, vol: s.settings.musicVolume });
  // màn thiết lập
  await page.evaluate(() => { openView('games'); gameSetup('buzzer'); }); await page.waitForTimeout(400);
  ok('Màn thiết lập có ô "Nhạc nền" và thanh âm lượng nhạc', await page.isVisible('#buzzMusic') && await page.isVisible('#buzzMusicVolume') && await page.isChecked('#buzzMusic'));
  s = await st(page); ok('Ở màn thiết lập (chưa chơi) nhạc chưa phát', !s.music.playing);
  // chơi từ Kho
  const r = await lib.play(page, 'mau-1-abcd', 'buzzer'); await page.waitForTimeout(1200); s = await st(page);
  ok('Kho → Chơi ngay → Ai nhanh hơn: vào trận', !r.locked && s.match && /QUESTION_VISIBLE|BUZZER_OPEN/.test(s.match.phase), s.match && s.match.phase);
  ok('Nhạc nền phát ngay khi vào trận (Web Audio)', s.music.playing && s.music.mode === 'webaudio' && s.music.ctx === 'running', s.music);
  ok('Đúng tệp đã chọn: dài ~16 giây, phát lặp đoạn 1 s → 13 s, âm lượng 30%', Math.abs(s.music.duration - 16.03) < 0.15 && s.music.loop && s.music.loop[0] === 1 && s.music.loop[1] === 13 && Math.abs(s.music.gain - 0.3) < 0.01, s.music);
  const t1 = s.music.time; await page.waitForTimeout(1000); s = await st(page);
  ok('Đồng hồ âm thanh đang chạy (nhạc thực sự phát)', s.music.time - t1 > 0.7, { dt: +(s.music.time - t1).toFixed(2) });
  ok('Màn chơi có nút "🎵 Nhạc nền: Bật" và "🔊 Tiếng: Bật"', /Bật/.test(await page.innerText('#buzzMusicToggle')) && /Bật/.test(await page.innerText('#buzzSoundToggle')));
  await page.screenshot({ path: __dirname + '/buzz-play.png' });
  // luật chơi vẫn nguyên: mở chuông, đội bấm phím, chấm đúng
  await page.waitForFunction(() => window.hmvBuzzState().match.buzzer === 'OPEN', null, { timeout: 6000 }); await page.keyboard.press('q'); await page.waitForTimeout(300); s = await st(page);
  ok('Mở chuông → đội 1 bấm phím Q giành quyền (luật chơi giữ nguyên)', s.match.buzzer === 'TEAM_LOCKED' && s.match.claimed === 0, { buzzer: s.match.buzzer, claimed: s.match.claimed });
  await page.keyboard.press('d'); await page.waitForTimeout(300); s = await st(page);
  ok('Giáo viên chấm đúng (D) → cộng 10 điểm; nhạc vẫn phát qua các lần vẽ lại màn hình', s.match.scores[0] === 10 && s.music.playing, { scores: s.match.scores, playing: s.music.playing });
  await page.keyboard.press('n'); await page.waitForTimeout(300); s = await st(page);
  ok('Sang câu tiếp theo (N): nhạc không bị ngắt hay phát chồng', s.match.q === 1 && s.music.playing && s.music.source, { q: s.match.q });
  // tạm dừng
  await page.click('button:has-text("Tạm dừng")'); await page.waitForTimeout(500); s = await st(page); const tp = s.music.time; await page.waitForTimeout(800); let s2 = await st(page);
  ok('Tạm dừng → nhạc dừng', s.match.paused && !s2.music.playing && s2.music.time - tp < 0.05, { ctx: s2.music.ctx });
  await page.click('button:has-text("Tiếp tục")'); await page.waitForTimeout(500); s = await st(page);
  ok('Tiếp tục → nhạc phát tiếp', !s.match.paused && s.music.playing, s.music.ctx);
  // nút nhạc
  await page.click('#buzzMusicToggle'); await page.waitForTimeout(300); s = await st(page);
  ok('Nút "Nhạc nền" tắt nhạc', !s.music.playing && s.settings.music === false && /Tắt/.test(await page.innerText('#buzzMusicToggle')));
  await page.click('#buzzMusicToggle'); await page.waitForTimeout(700); s = await st(page);
  ok('Nút "Nhạc nền" bật lại nhạc', s.music.playing && s.settings.music === true);
  await page.click('#buzzSoundToggle'); await page.waitForTimeout(200); s = await st(page); const off = s.settings.sound; await page.click('#buzzSoundToggle'); await page.waitForTimeout(200); s = await st(page);
  ok('Nút "Tiếng" bật/tắt tiếng chuông, không ảnh hưởng nhạc nền', off === false && s.settings.sound === true && s.music.playing);
  // rời màn hình
  await page.evaluate(() => openView('home')); await page.waitForTimeout(600); s = await st(page);
  ok('Rời sang màn hình khác → nhạc dừng', !s.music.playing, s.music.ctx);
  await page.evaluate(() => openView('games')); await page.waitForTimeout(600); s = await st(page);
  ok('Quay lại trò chơi → nhạc phát tiếp', s.music.playing);
  // kết thúc
  await page.evaluate(() => buzzEnd()); await page.waitForTimeout(500); s = await st(page);
  ok('Kết thúc trò chơi (bảng chiến thắng) → nhạc dừng', s.match.phase === 'GAME_FINISHED' && !s.music.playing && !s.music.source);
  await page.click('.buzz-result button:has-text("Chơi lại")'); await page.waitForTimeout(700); s = await st(page);
  ok('Chơi lại → nhạc phát lại', s.match.phase !== 'GAME_FINISHED' && s.music.playing);
  await page.evaluate(() => buzzBack()); await page.waitForTimeout(400); s = await st(page);
  ok('Về thư viện → nhạc dừng hẳn', !s.music.playing && !s.music.source && !s.match);
  // tắt nhạc trong thiết lập rồi bắt đầu
  await page.evaluate(() => gameSetup('buzzer')); await page.waitForSelector('#buzzMusic'); await page.uncheck('#buzzMusic'); await page.click('button:has-text("Bắt đầu trò chơi")'); await page.waitForTimeout(700); s = await st(page);
  ok('Bỏ chọn "Nhạc nền" ở thiết lập rồi Bắt đầu → không phát nhạc', s.match && !s.music.playing && s.settings.music === false);
  await page.evaluate(() => buzzBack());
  // thiết lập giữ đúng giá trị đã lưu
  await page.evaluate(() => gameSetup('buzzer')); await page.waitForSelector('#buzzTeams'); await page.selectOption('#buzzTeams', '3'); await page.selectOption('#buzzResponse', '20'); await page.check('#buzzMusic'); await page.evaluate(() => { const v = document.getElementById('buzzMusicVolume'); v.value = 50; }); await page.evaluate(() => buzzSaveSettings()); await page.waitForTimeout(300);
  const ui = await page.evaluate(() => ({ teams: document.getElementById('buzzTeams').value, resp: document.getElementById('buzzResponse').value, music: document.getElementById('buzzMusic').checked, vol: document.getElementById('buzzMusicVolume').value })); s = await st(page);
  ok('Lưu thiết lập: các ô vẫn hiện đúng giá trị vừa lưu (3 đội, 20 giây, nhạc 50%)', ui.teams === '3' && ui.resp === '20' && ui.music && ui.vol === '50' && s.settings.musicVolume === 0.5, ui);
  // tải lại giữa trận
  await setS(page, { teams: 2, musicVolume: 0.3, music: true }); await page.reload(); await ready(page);
  await lib.play(page, 'mau-1-abcd', 'buzzer'); await page.waitForTimeout(800);
  // kiểm tra chỗ nối khi phát lặp: dựng 40 giây bằng OfflineAudioContext. Bản nhạc lặp đúng chu kỳ 4 giây,
  // nên nếu chỗ nối liền mạch thì tín hiệu ở thời điểm t và t+4 s phải trùng nhau ở MỌI nơi, kể cả quanh chỗ nối.
  const loop = await page.evaluate(async () => {
    const ab = await fetch('assets/audio/ai-nhanh-hon.mp3').then(r => r.arrayBuffer());
    const probe = new OfflineAudioContext(1, 44100, 44100); const buf = await probe.decodeAudioData(ab);
    const run = async (useRegion) => { const sr = 44100, off = new OfflineAudioContext(1, sr * 40, sr); const src = off.createBufferSource(); src.buffer = buf; src.loop = true; if (useRegion) { src.loopStart = 1; src.loopEnd = 13; } src.connect(off.destination); src.start(0, .03); const out = (await off.startRendering()).getChannelData(0); const w = sr / 4, lag = sr * 4; let min = 1, at = 0, n = 0; for (let i = sr; i + lag + w <= out.length; i += w) { let ab = 0, aa = 0, bb = 0; for (let j = 0; j < w; j++) { const x = out[i + j], y = out[i + lag + j]; ab += x * y; aa += x * x; bb += y * y; } const c = ab / Math.sqrt(aa * bb + 1e-12); n++; if (c < min) { min = c; at = i / sr; } } return { windows: n, minSimilarity: +min.toFixed(3), worstAtSecond: +at.toFixed(2) }; };
    // độ trùng khớp vốn có của chính bản nhạc gốc (không lặp) trong đoạn 1 s → 13 s, để so sánh
    const d = buf.getChannelData(0), sr0 = buf.sampleRate, w0 = sr0 / 4, lag0 = sr0 * 4; let base = 1; for (let i = sr0; i + lag0 + w0 <= sr0 * 13; i += w0) { let ab = 0, aa = 0, bb = 0; for (let j = 0; j < w0; j++) { const x = d[i + j], y = d[i + lag0 + j]; ab += x * y; aa += x * x; bb += y * y; } base = Math.min(base, ab / Math.sqrt(aa * bb + 1e-12)); }
    return { duration: +buf.duration.toFixed(3), originalMusic: +base.toFixed(3), loopRegion: await run(true), wholeFile: await run(false) };
  });
  ok('Phát lặp 40 giây theo đoạn 1 s → 13 s: chỗ nối liền mạch (giữ nhịp y như bản nhạc gốc; phát lặp cả tệp thì lệch nhịp)', loop.loopRegion.minSimilarity >= loop.originalMusic - 0.02 && loop.wholeFile.minSimilarity < 0.5, loop);
  const errs = logs.filter(l => !/^DIALOG/.test(l)); ok('Không có lỗi JavaScript / tải tệp', errs.length === 0, errs.slice(0, 4));
  fs.writeFileSync(__dirname + '/ai-nhanh-hon-nhac-results.json', JSON.stringify({ at: new Date().toISOString(), pass: R.filter(x => x.pass).length, total: R.length, results: R }, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} PASS`);
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
