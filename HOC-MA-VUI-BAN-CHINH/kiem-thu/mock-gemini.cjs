// Máy chủ Gemini giả để kiểm thử (không gọi Google). Cổng 8799.
const http = require('http');
let mode = 'normal', calls = [], last = null;
function sample(n, kindText) {
  const qs = [];
  for (let i = 1; i <= n; i++) {
    if (/TRUEFALSE"\)\.$|Tất cả là câu Đúng\/Sai/.test(kindText) || (/xen kẽ/.test(kindText) && i % 3 === 0)) qs.push({ text: 'Mệnh đề số ' + i + ': ' + i + ' + ' + i + ' = ' + (i % 2 ? 2 * i : 2 * i + 1) + '.', kind: 'TRUEFALSE', answers: ['Đúng', 'Sai'], correct: i % 2 ? 0 : 1, answerText: '', explanation: 'Tính lại phép cộng.', level: 'Mức 1' });
    else if (/SHORT/.test(kindText)) qs.push({ text: 'Câu ngắn ' + i + ': ' + i + ' × 3 bằng bao nhiêu?', kind: 'SHORT', answers: [], correct: -1, answerText: String(i * 3), explanation: 'Bảng nhân 3.', level: 'Mức 2' });
    else qs.push({ text: 'Câu ' + i + ': ' + (10 * i) + ' + ' + i + ' = ?', kind: 'ABCD', answers: ['A. ' + (11 * i), String(11 * i + 1), String(11 * i - 1), String(1000 + i)], correct: 0, answerText: '', explanation: 'Cộng hàng đơn vị rồi hàng chục.', level: 'Mức ' + (1 + i % 3) });
  }
  return qs;
}
http.createServer((req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8'); const send = (s, o) => { const b = Buffer.from(JSON.stringify(o)); res.writeHead(s, { 'Content-Type': 'application/json', 'Content-Length': b.length }); res.end(b); };
    if (req.url === '/__mode') { mode = JSON.parse(raw).mode; calls = []; return send(200, { mode }); }
    if (req.url === '/__last') return send(200, { last, calls, mode });
    const m = req.url.match(/^\/v1beta\/models\/([^:]+):generateContent/); if (!m || req.method !== 'POST') return send(404, { error: { code: 404, message: 'not found', status: 'NOT_FOUND' } });
    const model = decodeURIComponent(m[1]), key = req.headers['x-goog-api-key'] || ''; let body = {}; try { body = JSON.parse(raw); } catch (e) {}
    calls.push({ model, hasKeyInUrl: /key=/.test(req.url) }); last = { model, key, body };
    if (/^BAD/.test(key)) return send(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } });
    if (mode === '429first' && calls.length === 1) return send(429, { error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } });
    if (mode === '429all') return send(429, { error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } });
    if (mode === '404first' && calls.length === 1) return send(404, { error: { code: 404, message: 'models/x is not found', status: 'NOT_FOUND' } });
    if (mode === 'schema400' && body.generationConfig && body.generationConfig.responseSchema) return send(400, { error: { code: 400, message: 'Unknown name "responseSchema"', status: 'INVALID_ARGUMENT' } });
    if (mode === 'blocked') return send(200, { promptFeedback: { blockReason: 'SAFETY' } });
    const text = (body.contents || []).map(c => (c.parts || []).map(p => p.text || '').join('\n')).join('\n');
    const reply = t => send(200, { candidates: [{ content: { role: 'model', parts: [{ text: t }] }, finishReason: 'STOP' }] });
    if (body.generationConfig && body.generationConfig.responseModalities) return send(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.alloc(4800).toString('base64') } }] } }] });
    if (/Soạn đúng (\d+) câu hỏi/.test(text)) {
      const n = Number(text.match(/Soạn đúng (\d+) câu hỏi/)[1]); const kindLine = (text.match(/Dạng câu: (.*)/) || [])[1] || '';
      let qs = sample(n, kindLine);
      if (/Không lặp lại ý/.test(text)) qs = qs.map((q, i) => Object.assign({}, q, { text: 'Thêm ' + q.text })).concat([sample(1, kindLine)[0]]);
      else if (!/SHORT|Đúng\/Sai \(kind/.test(kindLine) || /xen kẽ/.test(kindLine)) qs.push({ text: 'Câu hỏng: chỉ có ba phương án?', kind: 'ABCD', answers: ['1', '2', '3'], correct: 0, answerText: '', explanation: '', level: 'Mức 1' });
      if (mode === 'fenced') return reply('Đây là kết quả:\n```json\n' + JSON.stringify({ questions: qs }) + '\n```');
      return reply(JSON.stringify({ questions: qs }));
    }
    if (/Dưới đây là các câu hỏi mà lớp/.test(text)) {
      const m = text.match(/soạn đúng (\d+) câu hỏi MỚI/); const n = m ? Number(m[1]) : 5;
      return reply(JSON.stringify({ comment: '### Chỗ lớp chưa vững\n\n- Phép cộng có nhớ qua hàng chục.\n\n### Lỗi thường gặp\n\n- Quên nhớ 1 sang hàng chục.\n\n### Gợi ý dạy lại\n\n1. Cho học sinh đặt tính trên bảng con.\n2. Chơi lại bộ ôn trong 5 phút.', questions: sample(n, 'Tất cả là trắc nghiệm bốn phương án (kind "ABCD").').map(q => Object.assign({}, q, { text: 'Ôn: ' + q.text })) }));
    }
    if (/Rà soát các câu hỏi/.test(text)) {
      const list = JSON.parse(text.slice(text.indexOf('[{')));
      return reply(JSON.stringify({ reviews: list.map((q, i) => i === 1 ? { index: q.index, verdict: 'error', issues: ['Đáp án được ghi không đúng: tính lại ra kết quả khác.'], level: 'Mức 2', fixText: 'Câu đã sửa: 20 + 2 = ?', fixAnswers: ['21', '22', '23', '24'], fixCorrect: 1 } : i === 2 ? { index: q.index, verdict: 'warn', issues: ['Câu hỏi hơi dài với học sinh lớp 4.'], level: 'Mức 1' } : { index: q.index, verdict: 'ok', issues: [], level: q.level }) }));
    }
    if (/SẴN SÀNG/.test(text)) return reply('SẴN SÀNG');
    if (/ma trận/i.test(text)) return reply('## Ma trận đề kiểm tra\n\n| Mạch kiến thức | Mức 1 | Mức 2 | Mức 3 | Tổng |\n|---|---|---|---|---|\n| Số và phép tính | 3 câu – 3 điểm | 2 câu – 2 điểm | 1 câu – 1 điểm | 6 điểm |\n| Hình học và đo lường | 2 câu – 2 điểm | 1 câu – 1 điểm | 1 câu – 1 điểm | 4 điểm |\n\n**Tổng:** 10 điểm.\n\n1. Kiểm tra lại phép cộng\n2. Đối chiếu quy định của trường\n\n<script>alert(1)</script>');
    const hs = text.match(/\[HS\d+\]/g) || [];
    return reply('### Gợi ý\n\n- Phương án 1: ' + (hs[0] || 'Em') + ' tính nhẩm nhanh, cần cẩn thận hơn khi đặt tính.\n- Phương án 2: ' + (hs[0] || 'Em') + ' có tiến bộ rõ.\n\n*Lưu ý:* thầy cô chỉnh lại cho phù hợp.');
  });
}).listen(8799, '127.0.0.1', () => console.log('mock gemini 8799'));
