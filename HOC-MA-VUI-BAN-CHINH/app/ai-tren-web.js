/* BAN-CHINH 2.10 · AI trên bản web: mỗi người dùng tự dán khóa Gemini của riêng mình.
 * Chỉ chạy khi ứng dụng mở từ địa chỉ web (không phải localhost / 127.0.0.1). Bản cài trên máy vẫn dùng máy chủ nội bộ
 * và tệp CAI-DAT-AI\khoa-gemini.txt như cũ; tệp này không làm gì ở đó.
 * - Khóa chỉ nằm trong trình duyệt của người dùng (localStorage nếu chọn "ghi nhớ", nếu không thì sessionStorage – đóng trình duyệt là mất).
 * - Trình duyệt gọi thẳng generativelanguage.googleapis.com, khóa nằm trong tiêu đề x-goog-api-key (không bao giờ trong địa chỉ URL).
 * - Khóa không được gửi tới Vercel, GitHub hay máy của người chia sẻ ứng dụng.
 * Các trang khác vẫn gọi ./api/ai/status|key|generate|tts như với máy chủ nội bộ; hàm hmvAiFetch trả lời thay bằng cùng định dạng.
 */
(function (win) {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|)$/i.test(String(win.location && win.location.hostname || ''));
  var ACTIVE = !LOCAL;
  var STORE = 'hmv_gemini_web_v1';
  var DEFAULT_MODELS = { quality: ['gemini-3.8-flash', 'gemini-3.5-flash-lite'], fast: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'], tts: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'] };
  var MAX_TEXT = 60000, MAX_IMAGES = 6, WINDOW = 60000, LIMIT = 30;
  var hits = [], lastOk = null, lastError = null;

  function base() { return 'https://generativelanguage.googleapis.com'; }
  function validKey(k) { return typeof k === 'string' && /^[A-Za-z0-9._~+\/=\-]{20,400}$/.test(k); }
  function storages() { var out = []; try { out.push(win.localStorage); } catch (e) {} try { out.push(win.sessionStorage); } catch (e) {} return out.filter(Boolean); }
  function readSaved() {
    var list = storages();
    for (var i = 0; i < list.length; i++) {
      try { var o = JSON.parse(list[i].getItem(STORE) || 'null'); if (o && validKey(o.key)) return { key: o.key, model: typeof o.model === 'string' ? o.model : '', remember: i === 0 }; } catch (e) {}
    }
    return null;
  }
  function writeSaved(key, remember, model) {
    storages().forEach(function (s) { try { s.removeItem(STORE); } catch (e) {} });
    if (!key) return true;
    var target = remember ? (function () { try { return win.localStorage; } catch (e) { return null; } })() : (function () { try { return win.sessionStorage; } catch (e) { return null; } })();
    if (!target) return false;
    try { target.setItem(STORE, JSON.stringify({ key: key, model: model || '', at: new Date().toISOString() })); return true; } catch (e) { return false; }
  }
  function models(tier) {
    var list = DEFAULT_MODELS[tier] || DEFAULT_MODELS.quality, s = readSaved();
    if (tier === 'tts' || !s || !s.model || !/^[a-z0-9.\-]{3,80}$/i.test(s.model)) return list.slice();
    return [s.model].concat(list.filter(function (m) { return m !== s.model; }));
  }
  function status() {
    var s = readSaved();
    return { ok: true, server: 2, provider: 'gemini', web: true, configured: !!s, keyHint: s ? '…' + s.key.slice(-4) : '', remember: s ? s.remember : true, model: s && s.model || '', models: models('quality'), lastOk: lastOk, lastError: lastError };
  }
  function limited() { var now = Date.now(); hits = hits.filter(function (t) { return now - t < WINDOW; }); if (hits.length >= LIMIT) return true; hits.push(now); return false; }

  function errorOf(st, json) {
    var er = json && json.error || {}, msg = String(er.message || ''), code = String(er.status || '');
    var reason = String((Array.isArray(er.details) ? er.details : []).map(function (d) { return d && d.reason; }).filter(Boolean)[0] || '');
    var note = ' (Google báo: ' + [st, code, reason].filter(Boolean).join(' ') + (msg ? ' – ' + msg.replace(/\s+/g, ' ').slice(0, 160) : '') + ')';
    if (st === 401 || /api key not valid|api_key_invalid|invalid api key/i.test(msg) || (st === 400 && /api key/i.test(msg))) return { stop: true, http: 401, code: 'KEY_INVALID', message: 'Khóa Gemini không hợp lệ hoặc bị Google từ chối. Hãy sao chép lại nguyên khóa, hoặc tạo khóa mới trong Google AI Studio.' + note };
    if (st === 403) return { stop: true, http: 403, code: 'KEY_DENIED', message: 'Khóa Gemini chưa được phép dùng dịch vụ này (403). Hãy tạo khóa mới trong Google AI Studio.' + note };
    if (st === 404) return { stop: false, http: 502, code: 'MODEL_NOT_FOUND', message: 'Mô hình Gemini không còn tồn tại. Hãy ghi tên mô hình mới vào ô “Tên mô hình” trong Kết nối AI.' + note };
    if (st === 429 || code === 'RESOURCE_EXHAUSTED') return { stop: false, http: 429, code: 'RATE_LIMIT', message: 'Gemini đang giới hạn lượt dùng của khóa này. Hãy chờ khoảng một phút rồi thử lại.' };
    if (st >= 500) return { stop: false, http: 503, code: 'UNAVAILABLE', message: 'Gemini đang quá tải hoặc tạm ngưng. Hãy thử lại sau ít phút.' };
    return { stop: true, http: 502, code: 'BAD_REQUEST', message: 'Gemini từ chối yêu cầu' + (msg ? ': ' + msg.slice(0, 200) : '.'), schemaIssue: st === 400 };
  }
  function netError(e) {
    if (e && e.name === 'AbortError' && !e.userAbort) return { http: 504, code: 'TIMEOUT', message: 'Gemini xử lý quá lâu. Hãy thử lại với ít nội dung hơn.' };
    return { http: 503, code: 'NO_NETWORK', message: 'Không kết nối được tới Gemini. Hãy kiểm tra Internet của máy.' };
  }
  function callGemini(model, key, payload, timeoutMs, outer) {
    var ctl = new win.AbortController(), timer = win.setTimeout(function () { ctl.abort(); }, timeoutMs);
    var stop = function () { var e = new Error('abort'); e.name = 'AbortError'; e.userAbort = true; ctl.abort(); };
    if (outer) { if (outer.aborted) stop(); else outer.addEventListener('abort', stop); }
    return realFetch(base() + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload), signal: ctl.signal
    }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} win.clearTimeout(timer); return { status: r.status, json: j }; });
    }, function (e) { win.clearTimeout(timer); if (outer && outer.aborted) { var u = new Error('abort'); u.name = 'AbortError'; u.userAbort = true; throw u; } throw e; });
  }
  function cleanParts(parts) {
    var out = [], images = 0, chars = 0;
    (Array.isArray(parts) ? parts : []).forEach(function (p) {
      if (p && typeof p.text === 'string' && p.text) { var t = p.text.slice(0, Math.max(0, MAX_TEXT - chars)); chars += t.length; if (t) out.push({ text: t }); }
      else if (p && p.inlineData && typeof p.inlineData.data === 'string' && /^(image\/(png|jpeg|webp)|application\/pdf)$/.test(String(p.inlineData.mimeType || '')) && images < MAX_IMAGES) { images++; out.push({ inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data.replace(/^data:[^,]*,/, '') } }); }
    });
    return out;
  }
  function cleanContents(list) { return (Array.isArray(list) ? list : []).slice(-24).map(function (m) { return { role: m && m.role === 'model' ? 'model' : 'user', parts: cleanParts(m && m.parts) }; }).filter(function (m) { return m.parts.length; }); }
  function tryModels(list, key, build, timeoutMs, outer) {
    var i = 0, last = null;
    function hide(err) { if (err && err.message) err.message = err.message.split(key).join('…'); return err; }
    function next() {
      if (i >= list.length) return Promise.resolve({ ok: false, error: last || { http: 502, code: 'UNKNOWN', message: 'Gemini không trả về kết quả.' } });
      var model = list[i++];
      return callGemini(model, key, build(false), timeoutMs, outer).then(function (r) {
        if (r.status >= 200 && r.status < 300 && r.json) return { ok: true, model: model, json: r.json };
        var err = errorOf(r.status, r.json), retry = err.schemaIssue ? build(true) : null;
        var after = retry ? callGemini(model, key, retry, timeoutMs, outer).then(function (r2) { if (r2.status >= 200 && r2.status < 300 && r2.json) return { ok: true, model: model, json: r2.json }; return errorOf(r2.status, r2.json); }, netError) : Promise.resolve(err);
        return after.then(function (x) { if (x && x.ok) return x; last = hide(x); return x.stop ? { ok: false, error: last } : next(); });
      }, function (e) {
        if (e && e.userAbort) throw e;
        last = netError(e); return last.code === 'NO_NETWORK' ? { ok: false, error: last } : next();
      });
    }
    return next();
  }
  function textOf(json) {
    var c = json && json.candidates && json.candidates[0];
    var text = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('') : '';
    return { text: text, finish: c && c.finishReason || '', blocked: json && json.promptFeedback && json.promptFeedback.blockReason || '' };
  }
  function wavB64(b64, rate) {
    var bin = win.atob(b64), n = bin.length, buf = new ArrayBuffer(44 + n), v = new DataView(buf), u = new Uint8Array(buf), i;
    function str(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n, true);
    for (i = 0; i < n; i++) u[44 + i] = bin.charCodeAt(i);
    var out = '', CH = 0x8000; for (i = 0; i < u.length; i += CH) out += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return win.btoa(out);
  }
  function generate(body, key, outer) {
    var contents = cleanContents(body.contents);
    if (!contents.length) return Promise.resolve({ http: 400, out: { ok: false, code: 'EMPTY', message: 'Chưa có nội dung để gửi.' } });
    var system = typeof body.system === 'string' ? body.system.slice(0, 8000) : '';
    var wantJson = !!body.json, schema = body.schema && typeof body.schema === 'object' ? body.schema : null;
    var temperature = Math.max(0, Math.min(1.2, Number(body.temperature))) || 0.4;
    var maxOut = Math.max(256, Math.min(16384, Number(body.maxOutputTokens) || 8192));
    var build = function (noSchema) {
      if (noSchema && !(wantJson && schema)) return null;
      var cfg = { temperature: temperature, maxOutputTokens: maxOut };
      if (wantJson) { cfg.responseMimeType = 'application/json'; if (schema && !noSchema) cfg.responseSchema = schema; }
      var p = { contents: contents, generationConfig: cfg };
      if (system) p.systemInstruction = { parts: [{ text: system }] };
      return p;
    };
    return tryModels(models(body.tier === 'fast' ? 'fast' : 'quality'), key, build, Math.max(15000, Math.min(120000, Number(body.timeoutMs) || 75000)), outer).then(function (r) {
      if (!r.ok) return { http: r.error.http, out: { ok: false, code: r.error.code, message: r.error.message } };
      var t = textOf(r.json);
      if (!t.text) return { http: 502, model: r.model, out: { ok: false, code: t.blocked ? 'BLOCKED' : 'EMPTY_ANSWER', message: t.blocked ? 'Gemini từ chối nội dung này vì lý do an toàn. Hãy sửa lại nguồn hoặc yêu cầu.' : 'Gemini không trả về nội dung' + (t.finish === 'MAX_TOKENS' ? ' (vượt giới hạn độ dài). Hãy giảm số câu hoặc rút ngắn nguồn.' : '. Hãy thử lại.') } };
      return { http: 200, model: r.model, out: { ok: true, text: t.text, model: r.model, truncated: t.finish === 'MAX_TOKENS' } };
    });
  }
  function tts(body, key, outer) {
    var text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (!text) return Promise.resolve({ http: 400, out: { ok: false, code: 'EMPTY', message: 'Chưa có nội dung để đọc.' } });
    var voice = /^[A-Za-z]{2,30}$/.test(String(body.voice || '')) ? body.voice : 'Kore';
    var style = typeof body.style === 'string' ? body.style.trim().slice(0, 200) : '';
    var build = function (noSchema) { return noSchema ? null : { contents: [{ role: 'user', parts: [{ text: style ? style + ': ' + text : text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }; };
    return tryModels(models('tts'), key, build, 60000, outer).then(function (r) {
      if (!r.ok) return { http: r.error.http, out: { ok: false, code: r.error.code, message: r.error.message } };
      var c = r.json.candidates && r.json.candidates[0], part = c && c.content && (c.content.parts || []).filter(function (p) { return p.inlineData && p.inlineData.data; })[0];
      if (!part) return { http: 502, model: r.model, out: { ok: false, code: 'EMPTY_ANSWER', message: 'Gemini không trả về âm thanh.' } };
      var mime = String(part.inlineData.mimeType || '');
      if (/wav|mpeg|mp3|ogg/i.test(mime)) return { http: 200, model: r.model, out: { ok: true, mime: mime.split(';')[0], audio: part.inlineData.data, model: r.model } };
      var rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
      return { http: 200, model: r.model, out: { ok: true, mime: 'audio/wav', audio: wavB64(part.inlineData.data, rate), model: r.model } };
    });
  }

  function reply(statusCode, obj) { return new win.Response(JSON.stringify(obj), { status: statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  function fail(statusCode, code, message) { return reply(statusCode, { ok: false, code: code, message: message }); }
  function route(url) { try { var p = new win.URL(String(url), win.location.href).pathname; var m = p.match(/\/api\/ai\/(status|key|generate|tts)$/); return m ? m[1] : ''; } catch (e) { return ''; } }
  var realFetch = win.fetch ? win.fetch.bind(win) : null;

  /* Thay cho fetch('./api/ai/…'): trên web trả lời ngay trong trình duyệt; trên máy cài đặt chuyển nguyên cho máy chủ nội bộ. */
  function aiFetch(url, init) {
    var what = ACTIVE ? route(url) : '';
    if (!what) return realFetch(url, init);
    init = init || {};
    if (what === 'status') return Promise.resolve(reply(200, status()));
    var body = {}; try { body = JSON.parse(init.body || '{}') || {}; } catch (e) { return Promise.resolve(fail(400, 'BAD_JSON', 'Dữ liệu gửi lên không hợp lệ.')); }
    if (what === 'key') {
      var k = String(body.key || '').trim(), model = String(body.model || '').trim();
      if (k && !validKey(k)) return Promise.resolve(fail(400, 'KEY_FORMAT', 'Khóa không đúng định dạng. Hãy sao chép lại nguyên khóa từ Google AI Studio.'));
      if (model && !/^[a-z0-9.\-]{3,80}$/i.test(model)) return Promise.resolve(fail(400, 'MODEL_FORMAT', 'Tên mô hình không hợp lệ. Để trống nếu không chắc.'));
      if (!k && body.keep) { var cur = readSaved(); if (cur) writeSaved(cur.key, 'remember' in body ? body.remember !== false : cur.remember, 'model' in body ? model : cur.model); return Promise.resolve(reply(200, status())); }   /* đổi tùy chọn, giữ nguyên khóa */
      if (!writeSaved(k, body.remember !== false, model)) return Promise.resolve(fail(500, 'KEY_WRITE', 'Trình duyệt này không cho lưu khóa (có thể đang ở chế độ ẩn danh bị chặn lưu trữ).'));
      lastError = null; lastOk = null;
      return Promise.resolve(reply(200, status()));
    }
    var saved = readSaved();
    if (!saved) return Promise.resolve(fail(503, 'NO_KEY', 'Chưa có khóa Gemini. Hãy vào Trợ lý AI → Kết nối AI để dán khóa của thầy cô.'));
    if (limited()) return Promise.resolve(fail(429, 'LOCAL_LIMIT', 'Đang gửi quá nhiều yêu cầu. Hãy chờ một phút.'));
    var job = what === 'tts' ? tts(body, saved.key, init.signal) : generate(body, saved.key, init.signal);
    return job.then(function (r) {
      if (r.http === 200) { lastOk = { at: new Date().toISOString(), model: r.model }; lastError = null; } else lastError = { at: new Date().toISOString(), code: r.out.code, message: r.out.message };
      return reply(r.http, r.out);
    }, function (e) {
      if (e && e.userAbort) { var a = new Error('abort'); a.name = 'AbortError'; throw a; }
      return fail(500, 'SERVER', 'Trình duyệt gặp lỗi khi gọi AI.');
    });
  }

  win.hmvAiFetch = aiFetch;
  win.hmvAiWeb = { active: ACTIVE, status: status, forget: function () { writeSaved('', false); }, _test: { validKey: validKey, errorOf: errorOf, route: route, wavB64: wavB64 } };
})(window);
