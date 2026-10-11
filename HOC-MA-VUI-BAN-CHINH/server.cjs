const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'app'),port=Number(process.env.HMV_PREVIEW_PORT||8780);
/* Phần AI (tùy chọn): nếu thiếu ai-server.cjs thì máy chủ vẫn phục vụ ứng dụng như cũ. */
let ai=null;try{ai=require('./ai-server.cjs')}catch(e){console.error('Khong nap duoc ai-server.cjs: '+e.message)}
const types={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',mp3:'audio/mpeg',mp4:'video/mp4',woff2:'font/woff2',mjs:'text/javascript; charset=utf-8',wasm:'application/wasm',task:'application/octet-stream'};
http.createServer((req,res)=>{if(ai){try{if(ai.handle(req,res,{port:port}))return}catch(e){console.error('AI: '+e.message);if(!res.headersSent){res.writeHead(500);return res.end()}return}}let file;try{let uri=new URL(req.url,'http://localhost').pathname;file=path.resolve(root,'.'+decodeURIComponent(uri==='/'?'/index.html':uri));}catch{res.writeHead(400);return res.end()}
 if(!file.startsWith(root+path.sep)||path.relative(root,file).split(path.sep).some(x=>x.startsWith('.'))){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end()}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types[path.extname(file).slice(1)]||'application/octet-stream');if(file===path.join(root,'index.html'))res.setHeader('X-Source-SHA256',crypto.createHash('sha256').update(data).digest('hex'));res.end(data)})
}).on('error',e=>{console.error(e.message);process.exitCode=1}).listen(port,'127.0.0.1',()=>console.log('HOC MA VUI: http://localhost:'+port+'/'));





