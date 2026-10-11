// Máy chủ tệp tĩnh giả lập nơi đặt web (kiểu Vercel): chỉ trả tệp trong thư mục, không có /api. Đổi thư mục gốc khi đang chạy qua /__root?dir=…
const http = require('http'), fs = require('fs'), path = require('path');
let root = path.resolve(process.argv[2]); const port = Number(process.argv[3] || 8790);
const types = { html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', mp3: 'audio/mpeg', woff2: 'font/woff2', wasm: 'application/wasm' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__root') { root = path.resolve(u.searchParams.get('dir')); res.writeHead(200); return res.end(root); }
  let file = path.resolve(root, '.' + decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!file.startsWith(root + path.sep) || req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(req.method === 'POST' ? 405 : 404, { 'Content-Type': 'text/html' }); return res.end('<h1>404</h1>'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<!doctype html><title>404: NOT_FOUND</title><h1>404</h1>'); }
    const h = { 'Content-Type': types[path.extname(file).slice(1)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Accept-Ranges': 'bytes' };
    const r = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    if (r) { const a = Number(r[1]), b = r[2] ? Number(r[2]) : data.length - 1; h['Content-Range'] = 'bytes ' + a + '-' + b + '/' + data.length; res.writeHead(206, h); return res.end(data.subarray(a, b + 1)); }
    res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(port, '127.0.0.1', () => console.log('static ' + root + ' :' + port));
