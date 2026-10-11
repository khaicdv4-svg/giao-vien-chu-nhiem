'use strict';
/* HỌC MÀ VUI · BẢN CHÍNH — cầu nối AI của máy chủ nội bộ (cổng 8780).
 * Trình duyệt -> /api/ai/* (cùng máy) -> Gemini. Khóa Gemini chỉ nằm trong tệp CAI-DAT-AI\khoa-gemini.txt
 * trên máy giáo viên; không bao giờ nằm trong trang web và không được trả về trình duyệt.
 * Tệp này chỉ giữ khóa và chuyển yêu cầu; câu lệnh (prompt) nằm ở app\tro-ly-ai.js để sửa được mà không phải khởi động lại.
 */
const fs = require('fs'), path = require('path'), https = require('https'), http = require('http');

const SERVER_VERSION = 2;
const DIR = process.env.HMV_AI_DIR || path.join(__dirname, 'CAI-DAT-AI');
const KEY_FILE = path.join(DIR, 'khoa-gemini.txt');
const MODEL_FILE = path.join(DIR, 'mo-hinh.txt');
const BASE = String(process.env.HMV_GEMINI_BASE || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const DEFAULT_MODELS = { quality: ['gemini-3.8-flash', 'gemini-3.5-flash-lite'], fast: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'], tts: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'] };
const MAX_BODY = 14 * 1024 * 1024, MAX_TEXT = 60000, MAX_IMAGES = 6, WINDOW = 60000, LIMIT = Number(process.env.HMV_AI_LIMIT) || 30;
const KEY_TEMPLATE = [
  '# HỌC MÀ VUI - khóa Gemini (Google AI Studio).',
  '# Dán khóa vào MỘT dòng riêng ở bên dưới rồi lưu tệp. Không cần khởi động lại ứng dụng.',
  '# Không gửi tệp này cho người khác. Muốn tắt AI: xóa dòng khóa.',
  ''
].join('\r\n');

let hits = [], lastOk = null, lastError = null;

function ensureDir() {
  try { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, KEY_TEMPLATE, 'utf8'); } catch (e) { /* thư mục chỉ đọc: vẫn chạy, chỉ là chưa có khóa */ }
}
function readText(file) {
  let buf; try { buf = fs.readFileSync(file); } catch (e) { return ''; }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3).toString('utf8');
  return buf.toString('utf8');
}
function lines(file) { return readText(file).split(/\r?\n/).map(s => s.trim()).filter(s => s && s[0] !== '#'); }
/* Khóa Google có hai dạng: cũ "AIza…" và mới "AQ.…" (có dấu chấm). Chỉ chặn khoảng trắng, kí tự lạ và độ dài bất thường. */
function validKey(k) { return typeof k === 'string' && /^[A-Za-z0-9._~+\/=\-]{20,400}$/.test(k); }
function readKey() {
  const fromFile = lines(KEY_FILE).map(s => s.replace(/^(?:KHOA|KEY|GEMINI_API_KEY)\s*[=:]\s*/i, '').replace(/^["']|["']$/g, '')).find(validKey);
  if (fromFile) return fromFile;
  const env = String(process.env.GEMINI_API_KEY || '').trim();
  return validKey(env) ? env : '';
}
function models(tier) {
  const base = DEFAULT_MODELS[tier] || DEFAULT_MODELS.quality;
  if (tier === 'tts') return base;
  const custom = lines(MODEL_FILE).filter(s => /^[a-z0-9.\-]{3,80}$/i.test(s));
  return custom.length ? custom.concat(base.filter(m => custom.indexOf(m) < 0)) : base;
}

function send(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': body.length, 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function fail(res, status, code, message, extra) { send(res, status, Object.assign({ ok: false, code: code, message: message }, extra || {})); }

/* Chỉ nhận yêu cầu từ chính trang của ứng dụng trên máy này. */
function sameOrigin(req, port) {
  const host = String(req.headers.host || '').toLowerCase();
  const okHosts = ['127.0.0.1:' + port, 'localhost:' + port];
  if (okHosts.indexOf(host) < 0) return false;
  const origin = req.headers.origin;
  if (origin && okHosts.map(h => 'http://' + h).indexOf(String(origin).toLowerCase()) < 0) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  return true;
}
function limited() { const now = Date.now(); hits = hits.filter(t => now - t < WINDOW); if (hits.length >= LIMIT) return true; hits.push(now); return false; }
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, done = false;
    req.on('data', c => { if (done) return; size += c.length; if (size > MAX_BODY) { done = true; reject(Object.assign(new Error('too large'), { status: 413 })); return; } chunks.push(c); });
    req.on('end', () => { if (done) return; done = true; try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('bad json'), { status: 400 })); } });
    req.on('error', e => { if (!done) { done = true; reject(e); } });
  });
}

/* Gọi Gemini REST. Trả về { status, json } hoặc ném lỗi mạng/quá giờ. */
function callGemini(model, key, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent');
    const data = Buffer.from(JSON.stringify(payload));
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request({ method: 'POST', hostname: url.hostname, port: url.port || (url.protocol === 'http:' ? 80 : 443), path: url.pathname + url.search, headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, 'x-goog-api-key': key } }, r => {
      const chunks = []; r.on('data', c => chunks.push(c));
      r.on('end', () => { let json = null; try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) {} resolve({ status: r.statusCode || 0, json: json }); });
    });
    req.setTimeout(timeoutMs, () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    req.end(data);
  });
}
function errorOf(status, json) {
  const er = json && json.error || {}, msg = String(er.message || ''), st = String(er.status || '');
  const reason = String((Array.isArray(er.details) ? er.details : []).map(d => d && d.reason).filter(Boolean)[0] || '');
  /* Kèm nguyên văn lí do của Google (rút gọn, không chứa khóa) để dễ tìm nguyên nhân khi khóa bị từ chối. */
  const note = ' (Google báo: ' + [status, st, reason].filter(Boolean).join(' ') + (msg ? ' – ' + msg.replace(/\s+/g, ' ').slice(0, 160) : '') + ')';
  if (status === 401 || /api key not valid|api_key_invalid|invalid api key/i.test(msg) || (status === 400 && /api key/i.test(msg))) return { stop: true, http: 401, code: 'KEY_INVALID', message: 'Khóa Gemini không hợp lệ hoặc bị Google từ chối. Hãy sao chép lại nguyên khóa, hoặc tạo khóa mới trong Google AI Studio.' + note };
  if (status === 403) return { stop: true, http: 403, code: 'KEY_DENIED', message: 'Khóa Gemini chưa được phép dùng dịch vụ này (403). Hãy tạo khóa mới trong Google AI Studio.' + note };
  if (status === 404) return { stop: false, http: 502, code: 'MODEL_NOT_FOUND', message: 'Mô hình Gemini không còn tồn tại. Hãy ghi tên mô hình mới vào CAI-DAT-AI\\mo-hinh.txt.' + note };
  if (status === 429 || st === 'RESOURCE_EXHAUSTED') return { stop: false, http: 429, code: 'RATE_LIMIT', message: 'Gemini đang giới hạn lượt dùng miễn phí. Hãy chờ khoảng một phút rồi thử lại.' };
  if (status >= 500) return { stop: false, http: 503, code: 'UNAVAILABLE', message: 'Gemini đang quá tải hoặc tạm ngưng. Hãy thử lại sau ít phút.' };
  return { stop: true, http: 502, code: 'BAD_REQUEST', message: 'Gemini từ chối yêu cầu' + (msg ? ': ' + msg.slice(0, 200) : '.'), schemaIssue: status === 400 };
}
function netError(e) {
  if (e && e.code === 'ETIMEDOUT') return { http: 504, code: 'TIMEOUT', message: 'Gemini xử lý quá lâu. Hãy thử lại với ít nội dung hơn.' };
  return { http: 503, code: 'NO_NETWORK', message: 'Không kết nối được tới Gemini. Hãy kiểm tra Internet của máy.' };
}
function cleanParts(parts) {
  const out = []; let images = 0, chars = 0;
  (Array.isArray(parts) ? parts : []).forEach(p => {
    if (p && typeof p.text === 'string' && p.text) { const t = p.text.slice(0, MAX_TEXT - chars); chars += t.length; if (t) out.push({ text: t }); }
    else if (p && p.inlineData && typeof p.inlineData.data === 'string' && /^(image\/(png|jpeg|webp)|application\/pdf)$/.test(String(p.inlineData.mimeType || '')) && images < MAX_IMAGES) { images++; out.push({ inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data.replace(/^data:[^,]*,/, '') } }); }
  });
  return out;
}
function cleanContents(list) {
  return (Array.isArray(list) ? list : []).slice(-24).map(m => ({ role: m && m.role === 'model' ? 'model' : 'user', parts: cleanParts(m && m.parts) })).filter(m => m.parts.length);
}
async function tryModels(list, key, build, timeoutMs) {
  let last = null;
  for (let i = 0; i < list.length; i++) {
    const model = list[i]; let r;
    try { r = await callGemini(model, key, build(false), timeoutMs); }
    catch (e) { last = netError(e); if (last.code === 'NO_NETWORK') break; continue; }
    if (r.status >= 200 && r.status < 300 && r.json) return { ok: true, model: model, json: r.json };
    let err = errorOf(r.status, r.json);
    if (err.schemaIssue && build(true)) { /* thử lại không kèm lược đồ: một số mô hình không nhận responseSchema */
      try { r = await callGemini(model, key, build(true), timeoutMs); if (r.status >= 200 && r.status < 300 && r.json) return { ok: true, model: model, json: r.json }; err = errorOf(r.status, r.json); } catch (e) { err = netError(e); }
    }
    if (key && err.message) err.message = err.message.split(key).join('…');   /* không bao giờ để lộ khóa trong thông báo */
    last = err; if (err.stop) break;
  }
  return { ok: false, error: last || { http: 502, code: 'UNKNOWN', message: 'Gemini không trả về kết quả.' } };
}
function textOf(json) {
  const c = json && json.candidates && json.candidates[0];
  const text = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter(p => !p.thought).map(p => p.text || '').join('') : '';
  return { text: text, finish: c && c.finishReason || '', blocked: json && json.promptFeedback && json.promptFeedback.blockReason || '' };
}
function wav(pcm, rate) {
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
function log(what, model, status, started) { try { console.log('[AI] ' + new Date().toISOString() + ' ' + what + ' ' + (model || '-') + ' ' + status + ' ' + (Date.now() - started) + 'ms'); } catch (e) {} }

async function generate(body, key) {
  const contents = cleanContents(body.contents);
  if (!contents.length) return { http: 400, out: { ok: false, code: 'EMPTY', message: 'Chưa có nội dung để gửi.' } };
  const system = typeof body.system === 'string' ? body.system.slice(0, 8000) : '';
  const wantJson = !!body.json, schema = body.schema && typeof body.schema === 'object' ? body.schema : null;
  const temperature = Math.max(0, Math.min(1.2, Number(body.temperature))) || 0.4;
  const maxOut = Math.max(256, Math.min(16384, Number(body.maxOutputTokens) || 8192));
  const build = noSchema => {
    if (noSchema && !(wantJson && schema)) return null;
    const cfg = { temperature: temperature, maxOutputTokens: maxOut };
    if (wantJson) { cfg.responseMimeType = 'application/json'; if (schema && !noSchema) cfg.responseSchema = schema; }
    const p = { contents: contents, generationConfig: cfg };
    if (system) p.systemInstruction = { parts: [{ text: system }] };
    return p;
  };
  const r = await tryModels(models(body.tier === 'fast' ? 'fast' : 'quality'), key, build, Math.max(15000, Math.min(120000, Number(body.timeoutMs) || 75000)));
  if (!r.ok) return { http: r.error.http, out: { ok: false, code: r.error.code, message: r.error.message } };
  const t = textOf(r.json);
  if (!t.text) return { http: 502, model: r.model, out: { ok: false, code: t.blocked ? 'BLOCKED' : 'EMPTY_ANSWER', message: t.blocked ? 'Gemini từ chối nội dung này vì lý do an toàn. Hãy sửa lại nguồn hoặc yêu cầu.' : 'Gemini không trả về nội dung' + (t.finish === 'MAX_TOKENS' ? ' (vượt giới hạn độ dài). Hãy giảm số câu hoặc rút ngắn nguồn.' : '. Hãy thử lại.') } };
  return { http: 200, model: r.model, out: { ok: true, text: t.text, model: r.model, truncated: t.finish === 'MAX_TOKENS' } };
}
async function tts(body, key) {
  const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!text) return { http: 400, out: { ok: false, code: 'EMPTY', message: 'Chưa có nội dung để đọc.' } };
  const voice = /^[A-Za-z]{2,30}$/.test(String(body.voice || '')) ? body.voice : 'Kore';
  /* 2.4: mặc định chỉ gửi đúng nội dung cần đọc. Trước đây kèm lời dặn "Đọc rõ ràng, chậm rãi…" ở đầu và giọng AI đọc luôn cả lời dặn đó. */
  const style = typeof body.style === 'string' ? body.style.trim().slice(0, 200) : '';
  const build = noSchema => noSchema ? null : ({ contents: [{ role: 'user', parts: [{ text: style ? style + ': ' + text : text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } });
  const r = await tryModels(models('tts'), key, build, 60000);
  if (!r.ok) return { http: r.error.http, out: { ok: false, code: r.error.code, message: r.error.message } };
  const c = r.json.candidates && r.json.candidates[0], part = c && c.content && (c.content.parts || []).find(p => p.inlineData && p.inlineData.data);
  if (!part) return { http: 502, model: r.model, out: { ok: false, code: 'EMPTY_ANSWER', message: 'Gemini không trả về âm thanh.' } };
  const mime = String(part.inlineData.mimeType || ''), raw = Buffer.from(part.inlineData.data, 'base64');
  if (/wav|mpeg|mp3|ogg/i.test(mime)) return { http: 200, model: r.model, out: { ok: true, mime: mime.split(';')[0], audio: raw.toString('base64'), model: r.model } };
  const rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
  return { http: 200, model: r.model, out: { ok: true, mime: 'audio/wav', audio: wav(raw, rate).toString('base64'), model: r.model } };
}

function status() {
  const key = readKey();
  return { ok: true, server: SERVER_VERSION, provider: 'gemini', configured: !!key, keyHint: key ? '…' + key.slice(-4) : '', models: models('quality'), keyFile: 'CAI-DAT-AI\\khoa-gemini.txt', lastOk: lastOk, lastError: lastError };
}

/* Trả true nếu đã nhận xử lý yêu cầu. */
function handle(req, res, opts) {
  let uri; try { uri = new URL(req.url, 'http://localhost').pathname; } catch (e) { return false; }
  if (uri.indexOf('/api/') !== 0) return false;
  const port = opts && opts.port || 8780;
  if (!sameOrigin(req, port)) { fail(res, 403, 'FORBIDDEN', 'Chỉ nhận yêu cầu từ ứng dụng trên máy này.'); return true; }
  if (uri === '/api/ai/status' && req.method === 'GET') { send(res, 200, status()); return true; }
  if (req.method !== 'POST') { fail(res, 405, 'METHOD', 'Chỉ hỗ trợ phương thức POST.'); return true; }
  if (String(req.headers['content-type'] || '').toLowerCase().indexOf('application/json') < 0) { fail(res, 400, 'CONTENT_TYPE', 'Yêu cầu phải là JSON.'); return true; }
  const started = Date.now();
  readBody(req).then(async body => {
    if (uri === '/api/ai/key') {
      const k = String(body.key || '').trim();
      if (k && !validKey(k)) return fail(res, 400, 'KEY_FORMAT', 'Khóa không đúng định dạng. Hãy sao chép lại nguyên khóa từ Google AI Studio.');
      try { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(KEY_FILE, KEY_TEMPLATE + (k ? k + '\r\n' : ''), 'utf8'); }
      catch (e) { return fail(res, 500, 'KEY_WRITE', 'Không ghi được tệp khóa. Hãy mở CAI-DAT-AI\\khoa-gemini.txt và dán khóa bằng tay.'); }
      lastError = null; log('key ' + (k ? 'set' : 'clear'), '', 200, started);
      return send(res, 200, status());
    }
    if (uri !== '/api/ai/generate' && uri !== '/api/ai/tts') return fail(res, 404, 'NOT_FOUND', 'Không có chức năng này.');
    const key = readKey();
    if (!key) return fail(res, 503, 'NO_KEY', 'Chưa có khóa Gemini. Hãy vào Trợ lý AI → Kết nối AI để dán khóa.');
    if (limited()) return fail(res, 429, 'LOCAL_LIMIT', 'Đang gửi quá nhiều yêu cầu. Hãy chờ một phút.');
    const r = uri === '/api/ai/tts' ? await tts(body, key) : await generate(body, key);
    log(uri.slice(8), r.model, r.http, started);
    if (r.http === 200) { lastOk = { at: new Date().toISOString(), model: r.model }; lastError = null; } else lastError = { at: new Date().toISOString(), code: r.out.code, message: r.out.message };
    return send(res, r.http, r.out);
  }).catch(e => { fail(res, e && e.status === 413 ? 413 : e && e.status === 400 ? 400 : 500, e && e.status === 413 ? 'TOO_LARGE' : e && e.status === 400 ? 'BAD_JSON' : 'SERVER', e && e.status === 413 ? 'Nội dung gửi quá lớn (ảnh quá nhiều hoặc quá nặng).' : e && e.status === 400 ? 'Dữ liệu gửi lên không hợp lệ.' : 'Máy chủ nội bộ gặp lỗi khi gọi AI.'); });
  return true;
}

ensureDir();
module.exports = { handle: handle, status: status, version: SERVER_VERSION, _test: { readKey: readKey, validKey: validKey, wav: wav, errorOf: errorOf, sameOrigin: sameOrigin } };
