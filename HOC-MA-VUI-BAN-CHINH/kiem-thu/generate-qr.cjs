// Development only: npm install qrcode jsqr pngjs. No runtime QR dependency.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const QR=require(process.env.HMV_QRCODE||'qrcode');
const app=path.resolve(__dirname,'../app');
const window={addEventListener(){}};const document={readyState:'loading',addEventListener(){}};
vm.runInNewContext(fs.readFileSync(path.join(app,'qr-experiences.js'),'utf8'),{window,document});
const dir=path.join(app,'assets/qr');fs.mkdirSync(dir,{recursive:true});
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function art(x){switch(x.art){
case 'wheel':return '<g transform="translate(320 72)">'+['#fb923c','#facc15','#4ade80','#38bdf8','#a78bfa','#f472b6'].map((c,i)=>`<path d="M0 0L0 -36A36 36 0 0 1 31.18 -18Z" fill="${c}" transform="rotate(${i*60})"/>`).join('')+'<circle r="9" fill="white"/><path d="M-7 -44h14l-7 15z" fill="#17324d"/></g>';
case 'rope':return '<path d="M50 65Q160 35 265 65T590 65" stroke="#b45309" stroke-width="9" fill="none"/><g fill="#166534"><circle cx="100" cy="40" r="15"/><path d="M100 55l-20 35m20-35 30 30" stroke="#166534" stroke-width="10"/></g><g fill="#ea580c"><circle cx="540" cy="40" r="15"/><path d="M540 55l20 35m-20-35-30 30" stroke="#ea580c" stroke-width="10"/></g>';
case 'race':return '<path d="M70 90L210 20H430L570 90" fill="none" stroke="#93c5fd" stroke-width="30"/><path d="M70 90L210 20H430L570 90" fill="none" stroke="white" stroke-width="3" stroke-dasharray="12 10"/><path d="M480 20v70" stroke="#17324d" stroke-width="4"/><path d="M482 20h55v32h-55z" fill="#17324d"/><path d="M482 20h14v16h-14zm28 0h14v16h-14zm-14 16h14v16h-14zm28 0h14v16h-14z" fill="white"/>';
case 'mountain':return '<path d="M100 95L240 10L320 95M280 95L410 15L540 95" fill="#fed7aa" stroke="#9a3412" stroke-width="4"/><path d="M240 10v-5h40v24h-40" fill="#f59e0b"/><path d="M380 35l30-20 30 20-20-5-10 10-10-10z" fill="white"/>';
case 'phone':return '<g transform="translate(285 5) rotate(-12 35 43)"><rect width="70" height="86" rx="14" fill="#7e22ce"/><rect x="6" y="8" width="58" height="66" rx="8" fill="white"/><circle cx="35" cy="41" r="22" fill="#fde047"/><circle cx="27" cy="36" r="3"/><circle cx="43" cy="36" r="3"/><path d="M26 47q9 12 18 0" fill="none" stroke="#17324d" stroke-width="3"/></g><text x="150" y="65" font-size="40" fill="#be123c">✕</text><text x="450" y="65" font-size="40" fill="#166534">✓</text>';
case 'balloon':return [100,180,460,540].map((cx,i)=>`<ellipse cx="${cx}" cy="38" rx="25" ry="32" fill="${['#f472b6','#fbbf24','#38bdf8','#a78bfa'][i]}"/><path d="M${cx} 70q-15 12 0 25" fill="none" stroke="#64748b" stroke-width="2"/><ellipse cx="${cx-8}" cy="25" rx="5" ry="9" fill="white" opacity=".7"/>`).join('');
case 'book':return '<path d="M180 20Q250 0 320 30Q390 0 460 20V90Q390 70 320 95Q250 70 180 90Z" fill="#cffafe" stroke="#0e7490" stroke-width="4"/><path d="M320 30v65M205 36l85 8m-85 12 85 8m55-20 85-8m-85 28 85-8" stroke="#0e7490" stroke-width="3"/>';
default:return '<path d="M320 5l48 25-10 51-38 20-38-20-10-51z" fill="#6848ef"/><path d="M320 23l8 17 19 3-14 14 3 19-16-9-16 9 3-19-14-14 19-3z" fill="#fde047"/><path d="M70 55l10-22 10 22 22 10-22 10-10 22-10-22-22-10zM550 35l7-16 7 16 16 7-16 7-7 16-7-16-16-7z" fill="#fbbf24"/>';
}}
(async()=>{for(const [i,x] of window.hmvQr.items.entries()){
 const url=window.hmvQr.link(x),q=QR.create(url,{errorCorrectionLevel:'H'}),n=q.modules.size;
 let d='';for(let y=0;y<n;y++)for(let col=0;col<n;col++)if(q.modules.get(y,col))d+=`M${col+4} ${y+4}h1v1h-1z`;
 const code=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+8} ${n+8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${d}" fill="#101b35"/></svg>`;
 fs.writeFileSync(path.join(dir,x.id+'.svg'),code);
 const nested=code.replace('<svg ','<svg x="120" y="230" width="400" height="400" ');
 const poster=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><rect width="640" height="800" rx="36" fill="${x.color}"/><rect x="12" y="12" width="616" height="776" rx="28" fill="#fff"/><rect x="24" y="24" width="592" height="100" rx="22" fill="${x.color}" opacity=".08"/>${art(x)}<g font-family="Arial,sans-serif" text-anchor="middle"><text x="320" y="153" font-size="15" fill="${x.color}" font-weight="bold">TRẢI NGHIỆM ${String(i+1).padStart(2,'0')} / 08</text><text x="320" y="192" font-size="${x.id==='gioi-thieu'?27:32}" fill="#17324d" font-weight="bold">${esc(x.title)}</text><text x="320" y="218" font-size="16" fill="#475569">${esc(x.hint)}</text></g><rect x="108" y="228" width="424" height="410" rx="${[32,60,12,24,8,40,70,16][i]}" fill="${x.color}" opacity=".12"/>${nested}<g font-family="Arial,sans-serif" text-anchor="middle"><text x="320" y="675" font-size="24" font-weight="bold" fill="${x.color}">QUÉT ĐỂ TRẢI NGHIỆM · 1 PHÚT</text><text x="320" y="704" font-size="16" fill="#475569">Lần đầu cần Internet · Không cần đăng nhập</text><text x="320" y="739" font-size="19" font-weight="bold" fill="#17324d">ThayKhaiEdu · Trường TH Trần Văn Ơn</text><text x="320" y="765" font-size="12" fill="#475569">giao-vien-chu-nhiem.vercel.app/#trai-nghiem/${x.id}</text></g></svg>`;
 fs.writeFileSync(path.join(dir,x.id+'-poster.svg'),poster);
 console.log(x.id+' '+url);
}})().catch(e=>{console.error(e);process.exitCode=1});
