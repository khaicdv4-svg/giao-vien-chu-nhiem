(function () {
  'use strict';
  const D = () => window.HmvReviewDomain;
  const approvalUnavailable = 'Chưa có máy chủ xác thực và kiểm tra quyền duyệt. Chức năng duyệt và xuất bản đang khóa; thầy cô vẫn có thể lưu bản nháp.';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let repo, root, doc, attempt, card = 0, previewURL, htmlPreviewURL;
  const $ = s => root.querySelector(s);
  const uid = () => 'rv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
  function button(id, text) { return `<button type="button" id="${id}">${text}</button>`; }
  function field(label, id, value, kind) { if(id==='rv-blocks')return (doc.blocks||[]).map((b,j)=>`<label>${esc(b.title||`Đoạn đọc ${j+1}`)}<textarea data-block="${esc(b.id)}">${esc(b.text||b.content||'')}</textarea></label>`).join('')+button('rv-add-block','＋ Thêm đoạn đọc');return `<label>${label}${kind === 'area' ? `<textarea id="${id}">${esc(value)}</textarea>` : `<input id="${id}" value="${esc(value)}">`}</label>`; }
  function notify(message) { const el = $('#rv-message'); if (el) { el.textContent = message; el.focus(); } }
  function shell(body) { root.innerHTML = `<div class="rv-heading"><div><p class="rv-eyebrow">HỌC MÀ VUI · THAYKHAIEDU</p><h1>🌱 Ôn tập và Kiểm tra</h1><p>Kho đa môn lớp 1–5 · Thử nghiệm lớp 4</p></div>${button('rv-library','← Về kho')}</div><p class="rv-local">Khách trên thiết bị này · Học liệu và bài làm được lưu cục bộ. Đăng nhập, đồng bộ và LMS đang chờ môi trường thử nghiệm.</p><p id="rv-message" role="status" tabindex="-1"></p>${body}`; $('#rv-library').onclick = library; }
  async function list(store) { return await repo.list(store); }
  async function library() {
    releasePreview(); doc = null; attempt = null;card=0;
    const docs = await list('documents');
    shell(`<section class="rv-upload" id="rv-drop"><h2>Tạo bài ôn tập từ file đề</h2><ol class="rv-steps"><li>Chọn file đề (PDF, Word hoặc ảnh chụp đề).</li><li>Chờ app đọc đề, các câu hỏi hiện ra để thầy cô xem lại. AI làm hết, kể cả đáp án; thầy cô chỉ xem lướt và sửa chỗ cần.</li><li>Bấm <b>Xuất gói SCORM (QLMS)</b> ở cuối trang để lấy file gửi lên QLMS, hoặc <b>Xuất Word</b> để in đề.</li></ol><label class="rv-check"><input type="checkbox" id="rv-use-ai"> <span>✨ Dùng AI đọc đề <small>(khuyên dùng: đọc được cả PDF scan, ảnh chụp, đề không theo mẫu)</small></span></label><p class="rv-ai-hint" id="rv-ai-hint"></p><label class="rv-pick">📄 Chọn file đề<input id="rv-import" type="file" accept=".pdf,.docx,.txt,.json,image/*"></label><span class="rv-or">hoặc kéo thả file vào khung này</span><div id="rv-progress" class="rv-progress" role="status" aria-live="polite" hidden></div></section><div class="rv-tools rv-more">${button('rv-new','✍ Soạn tay từ đầu')}<details><summary>Sao lưu / khôi phục</summary><div class="rv-tools">${button('rv-backup','Tải bản sao lưu')}<label class="rv-file">Khôi phục bản sao<input id="rv-restore" type="file" accept=".json"></label></div></details></div><div class="rv-filters"><label>Tìm học liệu<input id="rv-search" placeholder="Tên bài, chủ đề…"></label><label>Lớp<select id="rv-grade"><option value="">Tất cả</option>${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select></label><label>Môn học<input id="rv-subject" placeholder="Tất cả môn"></label></div><div class="rv-grid" id="rv-documents"></div>`);
    const render = () => {
      const text = $('#rv-search').value.toLocaleLowerCase('vi'), grade = $('#rv-grade').value, subject = $('#rv-subject').value.toLocaleLowerCase('vi');
      const filtered = docs.filter(d => (!grade || String(d.metadata?.grade) === grade) && (!subject || String(d.metadata?.subject || '').toLocaleLowerCase('vi').includes(subject)) && JSON.stringify([d.title,d.metadata]).toLocaleLowerCase('vi').includes(text));
      $('#rv-documents').innerHTML = filtered.map(d=>`<article class="rv-tile"><span class="rv-tag">Lớp ${esc(d.metadata?.grade || '?')} · ${esc(d.metadata?.subject || 'Chưa chọn môn')}</span><h2>${esc(d.title || 'Học liệu chưa đặt tên')}</h2><p>${(d.questions || []).length} câu · ${esc(({draft:'Bản nháp',reviewed:'Đã duyệt',published:'Đã xuất bản'})[d.status] || d.status)}</p><button data-rv-open="${esc(d.id)}">Mở học liệu →</button></article>`).join('') || '<div class="rv-panel">Chưa có học liệu phù hợp. Thầy cô có thể tạo bài đầu tiên hoặc nhập tài liệu nguồn.</div>';
      root.querySelectorAll('[data-rv-open]').forEach(b => b.onclick = async () => { doc = await repo.get('documents', b.dataset.rvOpen); await editor(); });
    };
    ['rv-search','rv-grade','rv-subject'].forEach(id => $('#' + id).oninput = render); render();
    $('#rv-new').onclick = () => { doc = D().normalizeDocument({id:uid(),title:'Học liệu mới',metadata:{grade:4,subject:'Toán',purpose:'Bài tập thường xuyên',attemptLimit:3,scoreVisibility:'immediate',answerVisibility:'after-attempts'},questions:[],blocks:[]}); editor(); };
    const box=$('#rv-progress'),useAI=$('#rv-use-ai'),hint=$('#rv-ai-hint');let busy=false;
    const progress=(html,kind)=>{box.hidden=!html;box.className='rv-progress'+(kind?' rv-'+kind:'');box.innerHTML=html||'';};
    const aiStatus=s=>{const ok=!!(s&&s.server&&s.configured);useAI.checked=ok;hint.innerHTML=ok?'Đang dùng khóa Gemini đã lưu trong Trợ lý AI.':'Muốn dùng AI: vào <b>Trợ lý AI → Kết nối AI</b>, dán khóa Gemini một lần'+(typeof window.openView==='function'?' <button type="button" id="rv-go-ai">Mở Kết nối AI</button>':'')+'.';const go=$('#rv-go-ai');if(go)go.onclick=()=>window.openView('troLyAI');};
    Promise.resolve().then(()=>(window.hmvAiFetch||window.fetch)('./api/ai/status?t='+Date.now(),{cache:'no-store'})).then(r=>r.ok?r.json():{}).catch(()=>({})).then(aiStatus);
    async function readSource(f){
      if(!f||busy)return;busy=true;const start=Date.now(),ai=useAI.checked&&!/\.json$/i.test(f.name);let timer=0;
      const tick=()=>progress(`<span class="rv-spin" aria-hidden="true"></span> ${ai?'AI đang đọc':'Đang đọc'} <b>${esc(f.name)}</b>… ${Math.round((Date.now()-start)/1000)} giây${ai?' (thường 30–90 giây, thầy cô đừng đóng trang)':''}`);
      tick();timer=setInterval(tick,1000);
      try{
        const src=await window.HmvReviewImport.readFile(f);let report=null,aiError='';
        if(ai){if(!window.HmvReviewAi)throw Error('Chưa tải được phần Đọc đề bằng AI. Hãy tải lại trang.');try{const r=await window.HmvReviewAi.analyze(f,src);doc=D().normalizeDocument(r.doc);report=r.report;}catch(e){aiError=e.message;}}
        if(!report)doc=D().normalizeDocument(src);
        clearInterval(timer);
        if(!doc.questions.length){busy=false;return progress((aiError?'AI chưa đọc được: '+esc(aiError)+'<br>':'')+'Không tìm thấy câu hỏi nào trong file này'+(ai?'.':'. File có thể là PDF scan hoặc ảnh chụp: thầy cô đánh dấu <b>✨ Dùng AI đọc đề</b> rồi chọn lại file.'),'error');}
        if(report)doc.aiReport=report;
        await editor();
        const solved=report?window.HmvReviewAi.aiSolved(doc).length:0;
        notify(report?`AI đã làm xong ${report.count} câu, tổng ${String(report.points).replace('.',',')} điểm${solved?`, trong đó ${solved} câu AI tự giải đáp án`:''}. Thầy cô xem lướt, sửa chỗ cần rồi bấm Lưu bản nháp. Sau đó bấm Xuất gói SCORM (QLMS) hoặc Xuất Word ở cuối trang.`:(aiError?`AI chưa đọc được: ${aiError}\nApp đã đọc theo cách thường được ${doc.questions.length} câu, thầy cô kiểm tra kỹ.`:`App đã đọc được ${doc.questions.length} câu. Thầy cô xem lại đáp án và điểm từng câu, rồi bấm Xuất gói SCORM (QLMS) ở cuối trang.`));
      }catch(err){clearInterval(timer);progress('⚠ Không đọc được: '+esc(err.message),'error');}
      busy=false;
    }
    $('#rv-import').onchange = e => { const f=e.target.files[0]; e.target.value=''; readSource(f); };
    const drop=$('#rv-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('rv-over');};drop.ondragleave=()=>drop.classList.remove('rv-over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('rv-over');readSource(e.dataTransfer.files[0]);};
    $('#rv-backup').onclick = async () => download('hmv-ban-sao.json', await repo.exportBackup());
    $('#rv-restore').onchange = async e => { const f=e.target.files[0]; if(!f)return; try { if(!confirm('Khôi phục sẽ thay thế toàn bộ học liệu và bài làm của phân hệ này trên thiết bị. Tiếp tục?'))return;await repo.importBackup(JSON.parse(await f.text())); await library(); notify('Đã khôi phục bản sao trên thiết bị.'); } catch(err){notify(err.message);} };
  }
  function releasePreview() { if(previewURL) URL.revokeObjectURL(previewURL); if(htmlPreviewURL) URL.revokeObjectURL(htmlPreviewURL); previewURL=null; htmlPreviewURL=null; }
  async function reanalyze(){
    const source=doc.source||{};if(!(source.blob instanceof Blob))throw Error('Học liệu này không còn tệp nguồn để AI đọc lại.');
    if(!confirm('AI sẽ đọc lại tệp nguồn và THAY TOÀN BỘ câu hỏi đang có trong trình biên tập. Tiếp tục?'))return;
    const file=source.blob instanceof File?source.blob:new File([source.blob],source.name||'de',{type:source.mime||source.blob.type});
    const btn=$('#rv-ai-reanalyze');if(btn)btn.disabled=true;notify('AI đang đọc lại đề, thường mất 30–90 giây…');
    try{const r=await window.HmvReviewAi.analyze(file,doc);const n=D().normalizeDocument(r.doc);
      doc={...doc,title:n.title,metadata:n.metadata,blocks:n.blocks,questions:n.questions,status:'draft',version:(doc.version||1)+1,aiReport:r.report};
      await editor();notify(`AI đã đọc lại ${r.report.count} câu. Thầy cô xem lướt, sửa chỗ cần rồi bấm Lưu bản nháp.`);}
    finally{if(btn&&btn.isConnected)btn.disabled=false;}
  }
  function exportWord(){
    const snapshot=readEditorDocument(),layout=$('#rv-word-layout').value,minutes=Number($('#rv-word-minutes').value)||0;
    const bytes=window.HmvReviewWord.renderDocx(snapshot,{layout,minutes:minutes>0?minutes:null});
    download(window.HmvReviewWord.filename(snapshot.title,layout),bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    notify('Đã tải tệp Word: đề in theo mẫu của trường + trang hướng dẫn chấm. Thầy cô mở bằng Word để xem lại, chèn hình (nếu có) rồi in.');
  }
  function download(name,value,type='application/json') { const url=URL.createObjectURL(new Blob([typeof value==='string'||value instanceof Uint8Array?value:JSON.stringify(value,null,2)],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function questionEditor(q,i) {
    const grouped=q.type==='TRUEFALSE'&&Array.isArray(q.statements);
    const choice=['ABCD','SINGLE','MULTI','TRUEFALSE'].includes(q.type)&&!grouped;
    const options=q.type==='TRUEFALSE'?(q.options?.length===2?q.options:['Đúng','Sai']):Array.from({length:Math.max(4,(q.options||[]).length)},(_,j)=>q.options?.[j]||'');
    const choices=choice?`<p>Nhập lựa chọn và đánh dấu đáp án đúng${q.type==='MULTI'?' (có thể chọn nhiều)':''}.</p>${options.map((o,j)=>`<div class="rv-choice-edit"><label class="rv-key"><input type="${q.type==='MULTI'?'checkbox':'radio'}" name="key-${i}" data-key="${j}" ${(q.correctAnswers||[]).includes(j)?'checked':''}>${String.fromCharCode(65+j)} đúng</label><label>Nội dung ${String.fromCharCode(65+j)}<input data-option="${j}" value="${esc(o)}"></label></div>`).join('')}`:'';
    const pairs=q.type==='MATCHING'?Array.from({length:Math.max(2,(q.pairs||[]).length)},(_,j)=>`<div class="rv-form"><label>Vế trái ${j+1}<input data-left="${j}" value="${esc(q.pairs?.[j]?.left||'')}"></label><label>Vế phải tương ứng<input data-right="${j}" value="${esc(q.pairs?.[j]?.right||'')}"></label><button type="button" data-remove-pair="${i}:${j}">Bỏ cặp</button></div>`).join('')+`<button type="button" data-add-pair="${i}" ${(q.pairs||[]).length>=8?'disabled':''}>Thêm cặp (2–8 cặp)</button>`:'';
    const reference=['FILL','SHORT','OPEN'].includes(q.type)&&!(q.type==='FILL'&&Array.isArray(q.blanks))?`<label>${q.type==='OPEN'?'Đáp án tham khảo':'Đáp án chuẩn'}<textarea data-q="answerText">${esc(q.answerText||'')}</textarea></label>`:'';
    const short=q.type==='SHORT'?`<label>Các đáp án tương đương (mỗi dòng một đáp án)<textarea data-q="acceptedAnswers">${esc((q.metadata?.acceptedAnswers||[]).join('\n'))}</textarea></label><label class="rv-key"><input type="checkbox" data-q="autoGrade" ${q.metadata?.shortScoring==='exact'?'checked':''}>Đáp án xác định, cho phép tự chấm khớp chính xác</label><p>Chỉ chuẩn hóa Unicode và khoảng trắng. Đơn vị, chữ hoa và cách viết số khác phải thêm vào danh sách tương đương; bỏ chọn để chờ giáo viên chấm.</p>`:'';
    const guide=['SINGLE','ABCD','MULTI','TRUEFALSE','FILL','SHORT','OPEN','MATCHING'].includes(q.type)?`<label>${q.type==='OPEN'?'Hướng dẫn/tiêu chí chấm':'Lời giải chi tiết'}<textarea data-q="explanation">${esc(q.explanation||'')}</textarea></label>`:'';
    const statements=q.type==='TRUEFALSE'?`${grouped?q.statements.map((item,j)=>`<div data-statement="${j}"><label>Nhận định ${j+1}<textarea data-statement-text>${esc(item.text||'')}</textarea></label><label>Đáp án<select data-statement-answer><option value="" ${typeof item.answer!=='boolean'?'selected':''}>Chọn đáp án</option><option value="true" ${item.answer===true?'selected':''}>Đúng</option><option value="false" ${item.answer===false?'selected':''}>Sai</option></select></label><button type="button" data-remove-statement="${i}:${j}">Bỏ nhận định</button></div>`).join(''):''}<button type="button" data-add-statement="${i}">${grouped?'Thêm nhận định':'Soạn dạng nhiều nhận định'}</button>`:'';
    const blanks=q.type==='FILL'?`<p>Đặt [[1]], [[2]]… trong nội dung, rồi cập nhật chỗ trống.</p><button type="button" data-sync-blanks="${i}">Cập nhật chỗ trống</button>${(q.blanks||[]).map(b=>`<div data-blank="${esc(b.id)}"><h4>Ô [[${esc(b.id)}]]</h4><label>Đáp án chuẩn<input data-blank-key value="${esc(b.answerText||'')}"></label><label>Đáp án tương đương (mỗi dòng một đáp án)<textarea data-blank-alternatives>${esc((b.acceptedAnswers||[]).join('\n'))}</textarea></label></div>`).join('')}`:'';
    const layout=q.type==='OPEN'?`<label>Khung bài làm của học sinh<select data-q="answerLayout">${[['plain','Ô văn bản thông thường'],['grid-calculation','Vở ô li đặt tính'],['grid-text','Vở ô li trình bày tự luận']].map(([value,label])=>`<option value="${value}" ${q.metadata?.answerLayout===value?'selected':''}>${label}</option>`).join('')}</select></label>`:'';
    return `<fieldset class="rv-question" data-question="${i}"><legend>Câu ${i+1}</legend><label>Loại câu hỏi<select data-q="type">${['ABCD','SINGLE','MULTI','TRUEFALSE','FILL','SHORT','OPEN','MATCHING'].map(t=>`<option value="${t}" ${q.type===t?'selected':''}>${({ABCD:'Bốn lựa chọn',SHORT:'Trả lời ngắn',SINGLE:'Chọn một đáp án',MULTI:'Nhiều đáp án đúng',TRUEFALSE:'Đúng / Sai',FILL:'Điền khuyết',OPEN:'Tự luận',MATCHING:'Nối cặp'})[t]}</option>`).join('')}</select></label><label>Nội dung<textarea data-q="text">${esc(q.text)}</textarea></label>${choices}${q.type==='MULTI'?`<button type="button" data-add-option="${i}">Thêm phương án</button>`:''}${statements}${blanks}${reference}${short}${guide}${layout}${pairs}<div><p>Ngữ liệu dùng cho câu hỏi này</p>${(doc.blocks||[]).map((b,j)=>`<label class="rv-key"><input type="checkbox" data-block-link="${esc(b.id)}" ${(q.blockIds||[]).includes(b.id)?'checked':''}>${esc(b.title||`Đoạn đọc ${j+1}`)}</label>`).join('')||'<p>Chưa có đoạn đọc.</p>'}</div><label>Điểm<input data-q="points" type="number" min="0.01" step="0.25" value="${esc(q.points || 1)}"></label><div class="rv-tools"><button type="button" data-up="${i}" ${i===0?'disabled':''}>↑ Lên</button><button type="button" data-down="${i}" ${i===(doc.questions||[]).length-1?'disabled':''}>↓ Xuống</button><button type="button" data-remove="${i}">Xóa câu ${i+1}</button></div></fieldset>`;
  }
  function readEditorDocument() {
    const edited={...doc};
    edited.title=$('#rv-title').value; edited.metadata={...edited.metadata,grade:Number($('#rv-edit-grade').value),subject:$('#rv-edit-subject').value,topic:$('#rv-topic').value,purpose:$('#rv-purpose').value};
    const limit=$('#rv-attempt-limit').value;
    if(limit!=='legacy')edited.metadata.attemptLimit=limit==='unlimited'?'unlimited':Number(limit);
    for(const key of ['scoreVisibility','answerVisibility']){const value=$('#rv-'+key).value;if(value!=='legacy')edited.metadata[key]=value;}
    const submitUrl=$('#rv-submit-url').value.trim();if(submitUrl)edited.metadata.submitUrl=submitUrl;else delete edited.metadata.submitUrl;
    const musicFile=$('#rv-music-file');if(musicFile.dataset.loading==='true')throw Error('Tệp nhạc đang được đọc. Thầy cô đợi đọc xong rồi lưu/xuất.');
    const music={enabled:$('#rv-music-enabled').checked,onlineUrl:$('#rv-music-url').value.trim(),offlineSrc:musicFile.dataset.audio||null,fileName:musicFile.dataset.name||'',volume:Number($('#rv-music-volume').value)/100,rightsConfirmed:$('#rv-music-rights').checked};
    if(doc.metadata?.backgroundMusic||music.enabled||music.onlineUrl||music.offlineSrc)edited.metadata.backgroundMusic=music;
    edited.blocks=(edited.blocks||[]).map(b=>{const el=Array.from(root.querySelectorAll('[data-block]')).find(el=>el.dataset.block===b.id);return el?{...b,text:el.value,...(Object.hasOwn(b,'content')?{content:el.value}:{})}:b;});
    edited.questions=Array.from(root.querySelectorAll('[data-question]')).map((el,i)=>{
      const val=k=>el.querySelector(`[data-q="${k}"]`)?.value||'';
      const optionInputs=Array.from(el.querySelectorAll('[data-option]')), options=optionInputs.map(x=>x.value), keys=Array.from(el.querySelectorAll('[data-key]:checked')).map(x=>Number(x.dataset.key));
      if(['SINGLE','MULTI'].includes(val('type')))while(options.length&&!options[options.length-1].trim())options.pop();
      return {...edited.questions[i],...(val('type')==='FILL'&&Array.isArray(edited.questions[i].blanks)?{blanks:Array.from(el.querySelectorAll('[data-blank]')).map(row=>({id:row.dataset.blank,answerText:row.querySelector('[data-blank-key]').value,acceptedAnswers:row.querySelector('[data-blank-alternatives]').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}))}:{}),...(val('type')==='TRUEFALSE'&&Array.isArray(edited.questions[i].statements)?{statements:Array.from(el.querySelectorAll('[data-statement]')).map(row=>({text:row.querySelector('[data-statement-text]').value,answer:row.querySelector('[data-statement-answer]').value===''?null:row.querySelector('[data-statement-answer]').value==='true'}))}:{}),type:val('type'),text:val('text'),blockIds:Array.from(el.querySelectorAll('[data-block-link]:checked')).map(x=>x.dataset.blockLink),points:Number(val('points')),options,correctAnswers:keys,answerText:val('answerText'),explanation:el.querySelector('[data-q="explanation"]')?.value??edited.questions[i].explanation,metadata:{...edited.questions[i].metadata,...(val('type')==='OPEN'?{answerLayout:val('answerLayout')||'plain'}:{}),...(val('type')==='SHORT'?{shortScoring:el.querySelector('[data-q="autoGrade"]')?.checked?'exact':'manual',acceptedAnswers:val('acceptedAnswers').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}:{})},pairs:Array.from(el.querySelectorAll('[data-left]')).map((x,j)=>({left:x.value,right:el.querySelector(`[data-right="${j}"]`).value}))};
    });
    return edited;
  }
  function collect() {
    const edited=readEditorDocument();
    if(JSON.stringify([doc.title,doc.metadata,doc.blocks,doc.questions])!==JSON.stringify([edited.title,edited.metadata,edited.blocks,edited.questions])){edited.status='draft';edited.version=(doc.version||1)+1;}
    doc=edited;
  }
  async function buildHtml() {
    const snapshot=readEditorDocument();
    window.HmvReviewHtml.createPractice(snapshot);
    const response=await fetch(new URL('./review-domain.js',document.baseURI));
    if(!response.ok) throw Error('Không tải được mã chấm điểm offline. Hãy tải lại ứng dụng.');
    return {snapshot,html:window.HmvReviewHtml.renderHtml(snapshot,await response.text())};
  }
  async function exportHtml() {
    const {snapshot,html}=await buildHtml();
    download(window.HmvReviewHtml.filename(snapshot.title),html,'text/html;charset=utf-8');
    notify('Đã tải HTML luyện tập offline. Câu tự luận và câu ngắn chưa đủ căn cứ sẽ chờ giáo viên chấm. Đề gốc không thay đổi.');
  }
  async function exportScorm() {
    const snapshot=readEditorDocument();
    window.HmvReviewHtml.createPractice(snapshot);
    const response=await fetch(new URL('./review-domain.js',document.baseURI));
    if(!response.ok) throw Error('Không tải được mã chấm điểm offline. Hãy tải lại ứng dụng.');
    const bytes=window.HmvReviewHtml.renderScormPackage(snapshot,await response.text());
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=window.HmvReviewHtml.scormFilename(snapshot.title);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('Đã tải gói SCORM. Trên QLMS chọn Thêm mới học liệu → Scorm → tải tệp .zip này lên. Điểm phần tự chấm được gửi về hệ thống khi học sinh nộp bài.');
  }
  async function previewHtml() {
    const {html}=await buildHtml();
    if(htmlPreviewURL) URL.revokeObjectURL(htmlPreviewURL);
    htmlPreviewURL=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const frame=$('#rv-html-preview');frame.src=htmlPreviewURL;frame.hidden=false;
    notify('Đang xem trước HTML từ dữ liệu hiện tại trong trình biên tập.');
  }
  async function prepareDraft() {
    const saved = await repo.get('documents', doc.id);
    if (saved?.status === 'published') {
      doc = {...doc, id:uid(), revisionOf:saved.id, version:Math.max(doc.version||1,(saved.version||1)+1)};
    }
    doc.status='draft';
    delete doc.review;
  }
  async function save() { collect(); const fillErrors=doc.questions.flatMap((q,i)=>D().validateFillBlanks(q).map(e=>'Câu '+(i+1)+': '+e));if(fillErrors.length)throw Error(fillErrors.join('; ')); await prepareDraft(); await repo.put('documents',doc); await editor(); notify('Đã lưu bản nháp. Sau khi sửa cần duyệt lại trước khi xuất bản.'); }
  async function editor() {
    releasePreview(); const source=doc.source || {}; const blob=source.blob;
    if(blob instanceof Blob && (blob.type.startsWith('image/') || blob.type === 'application/pdf')) previewURL=URL.createObjectURL(blob);
    shell(`<div class="rv-tools">${button('rv-save','Lưu bản nháp')}${button('rv-export-html','Xuất HTML tương tác')}${button('rv-review','Duyệt học liệu')}${button('rv-publish','Xuất bản trên thiết bị')}${button('rv-practice','Mở bài học')}${button('rv-history','Bài làm đã lưu')}</div><p class="rv-tag">Trạng thái: ${esc(doc.status)} · Nguồn: ${esc(source.name || doc.metadata?.source || 'Nhập thủ công')}</p><div class="rv-panel rv-form">${field('Tên học liệu','rv-title',doc.title)}${field('Lớp (1–5)','rv-edit-grade',doc.metadata?.grade || 4)}${field('Môn học','rv-edit-subject',doc.metadata?.subject)}${field('Chủ đề','rv-topic',doc.metadata?.topic)}</div><details class="rv-panel" ${doc.importStatus==='needs-ocr'?'OPEN':''}><summary>Tài liệu nguồn và khối nội dung</summary><p>${doc.importStatus==='needs-ocr'?'Tài liệu cần nhận dạng chữ. Hãy nhập và đối chiếu câu hỏi bằng tay; hệ thống chưa tạo đáp án.':'Đối chiếu nội dung và đáp án với tài liệu gốc trước khi duyệt.'}</p>${previewURL?(String(source.mime||blob.type).startsWith('image/')?`<img class="rv-source" src="${previewURL}" alt="Tài liệu nguồn">`:`<iframe class="rv-source" title="Tài liệu nguồn" src="${previewURL}"></iframe>`):''}${field('Đoạn đọc','rv-blocks','')}</details><div id="rv-edit-questions">${(doc.questions||[]).map(questionEditor).join('')}</div>${button('rv-add','＋ Thêm câu hỏi')}<p>Không tự suy đoán đáp án. Câu tự luận cần giáo viên chấm sau khi nộp.</p>`);
    const purposeLabel=document.createElement('label');
    purposeLabel.textContent='Loại học liệu';
    const purpose=document.createElement('select');purpose.id='rv-purpose';
    ['Bài tập thường xuyên','Đề kiểm tra','Tài liệu tham khảo'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;purpose.append(option);});
    purpose.value=doc.metadata?.purpose||'Bài tập thường xuyên';
    root.querySelector('.rv-form').append(purposeLabel);purposeLabel.append(purpose);
    const limitLabel=document.createElement('label');limitLabel.textContent='Số lần học sinh được làm bài';
    const limit=document.createElement('select');limit.id='rv-attempt-limit';
    const choices=[['1','1 lần'],['2','2 lần'],['3','3 lần'],['unlimited','Không giới hạn']];
    if(doc.metadata?.attemptLimit==null)choices.unshift(['legacy','Giữ hành vi đề cũ']);
    choices.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;limit.append(option);});
    limit.value=String(doc.metadata?.attemptLimit??'legacy');limitLabel.append(limit);root.querySelector('.rv-form').append(limitLabel);
    const updateLimit=()=>{limitLabel.hidden=purpose.value!=='Bài tập thường xuyên';limit.disabled=limitLabel.hidden;limitLabel.style.display=limitLabel.hidden?'none':'';};purpose.addEventListener('change',updateLimit);updateLimit();
    for(const [key,title,choices] of [
      ['scoreVisibility','Cho phép xem điểm',[['immediate','Ngay sau khi nộp bài'],['teacher','Khi giáo viên công bố'],['never','Không hiển thị']]],
      ['answerVisibility','Cho phép xem đáp án',[['immediate','Ngay sau khi nộp bài'],['after-attempts','Sau khi sử dụng hết lượt làm'],['teacher','Khi giáo viên công bố'],['never','Không hiển thị']]]]){
      const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id='rv-'+key;
      const options=doc.metadata?.[key]==null?[['legacy','Giữ hành vi đề cũ'],...choices]:choices;
      options.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);});select.value=doc.metadata?.[key]??'legacy';label.append(select);root.querySelector('.rv-form').append(label);
      const refresh=()=>{label.hidden=purpose.value!=='Bài tập thường xuyên';label.style.display=label.hidden?'none':'';select.disabled=label.hidden;};purpose.addEventListener('change',refresh);refresh();
    }
    const submitLabel=document.createElement('label');submitLabel.textContent='Nhận bài trực tuyến – đường dẫn Google Apps Script (để trống nếu không dùng)';
    const submitInput=document.createElement('input');submitInput.id='rv-submit-url';submitInput.type='url';submitInput.placeholder='https://script.google.com/macros/s/…/exec';submitInput.value=doc.metadata?.submitUrl||'';
    submitLabel.append(submitInput);root.querySelector('.rv-form').append(submitLabel);
    const music=doc.metadata?.backgroundMusic||{},musicBox=document.createElement('fieldset');musicBox.innerHTML=`<legend>Nhạc nền bài luyện tập</legend><label><input id="rv-music-enabled" type="checkbox" ${music.enabled?'checked':''}>Bật nhạc nền</label><label>URL nhạc HTTPS công khai (không tham số)<input id="rv-music-url" type="url" value="${esc(music.onlineUrl||'')}"></label><label>Tệp nhạc dự phòng MP3/OGG/WAV, tối đa 1 MB<input id="rv-music-file" type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav"></label><p id="rv-music-file-name"></p><button id="rv-music-clear" type="button">Bỏ tệp nhạc</button><label>Âm lượng (%)<input id="rv-music-volume" type="range" min="0" max="100" value="${Math.round((typeof music.volume==='number'?music.volume:.1)*100)}"></label><label><input id="rv-music-rights" type="checkbox" ${music.rightsConfirmed?'checked':''}>Tôi xác nhận nguồn nhạc không lời này được phép sử dụng cho bài luyện tập.</label><p>Nhạc mặc định tắt, chỉ tải sau khi học sinh bấm bật. URL được ưu tiên; tệp chỉ nhúng khi giáo viên chủ động chọn và bật chức năng.</p>`;
    root.querySelector('.rv-form').append(musicBox);const musicInput=$('#rv-music-file');musicInput.dataset.audio=music.offlineSrc||'';musicInput.dataset.name=music.fileName||'';$('#rv-music-file-name').textContent=music.fileName||'Chưa chọn tệp nhạc.';
    musicInput.onchange=async()=>{const file=musicInput.files[0];if(!file)return;if(file.size>1024*1024||!['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav'].includes(file.type)){notify('Chọn tệp MP3/OGG/WAV hợp lệ không quá 1 MB.');musicInput.value='';return;}musicInput.dataset.loading='true';try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});musicInput.dataset.audio=data;musicInput.dataset.name=file.name;$('#rv-music-file-name').textContent=file.name;}catch(_){notify('Không đọc được tệp nhạc.');}finally{musicInput.dataset.loading='false';}};
    $('#rv-music-clear').onclick=()=>{musicInput.dataset.audio='';musicInput.dataset.name='';musicInput.value='';$('#rv-music-file-name').textContent='Chưa chọn tệp nhạc.';};
    const refreshMusic=()=>{musicBox.hidden=purpose.value!=='Bài tập thường xuyên';musicBox.style.display=musicBox.hidden?'none':'';};purpose.addEventListener('change',refreshMusic);refreshMusic();
    const guarded=fn=>async()=>{try{await fn();}catch(e){notify(e.message);}};
    $('#rv-save').onclick=guarded(save);
    $('#rv-export-html').onclick=guarded(exportHtml);
    $('#rv-export-html').insertAdjacentHTML('afterend','<span class="rv-tag">HTML luyện tập – chấm phần đủ điều kiện offline</span>');
    $('#rv-export-html').insertAdjacentHTML('afterend','<button type="button" id="rv-preview-html">Xem trước HTML</button>');
    $('#rv-preview-html').onclick=guarded(previewHtml);
    $('#rv-preview-html').insertAdjacentHTML('afterend','<button type="button" id="rv-export-scorm">Xuất gói SCORM (QLMS)</button>');
    $('#rv-export-scorm').onclick=guarded(exportScorm);
    $('#rv-export-scorm').insertAdjacentHTML('afterend',`<div class="rv-word"><button type="button" id="rv-export-word">Xuất Word (đề in + đáp án)</button><label>Kiểu trình bày<select id="rv-word-layout"><option value="compact">Gọn – vừa số trang</option><option value="roomy">Thoáng – rộng chỗ viết</option></select></label><label>Thời gian làm bài (phút)<input id="rv-word-minutes" type="number" min="0" max="180" step="5" value="${esc(doc.metadata?.duration||40)}"></label></div>`);
    $('#rv-export-word').onclick=guarded(exportWord);
    if(window.HmvReviewAi&&doc.source?.blob instanceof Blob){$('#rv-export-word').insertAdjacentHTML('beforebegin','<button type="button" id="rv-ai-reanalyze">✨ AI đọc lại đề</button>');$('#rv-ai-reanalyze').onclick=guarded(reanalyze);}
    if(window.HmvReviewAi)window.HmvReviewAi.decorate(root,doc);
    $('#rv-edit-questions').insertAdjacentHTML('afterend','<iframe id="rv-html-preview" title="Xem trước HTML luyện tập" sandbox="allow-scripts allow-downloads" hidden></iframe>');
    $('#rv-add-block').onclick=guarded(()=>{collect();doc.blocks.push({id:uid(),type:'text',text:''});editor();});
    root.querySelectorAll('[data-q="type"]').forEach(select=>select.onchange=guarded(()=>{collect();if(select.value==='MATCHING'){const q=doc.questions[Number(select.closest('[data-question]').dataset.question)];q.metadata={...q.metadata,matchingScoring:'per-pair'};if(!q.pairs?.length)q.pairs=[{left:'',right:''},{left:'',right:''}];}if(select.value==='FILL')doc.questions[Number(select.closest('[data-question]').dataset.question)].blanks=[];if(select.value==='TRUEFALSE')doc.questions[Number(select.closest('[data-question]').dataset.question)].statements=[{text:'',answer:null}];editor();}));
    root.querySelectorAll('[data-add-pair]').forEach(b=>b.onclick=guarded(()=>{collect();const q=doc.questions[Number(b.dataset.addPair)];if(q.pairs.length<8)q.pairs.push({left:'',right:''});editor();}));
    root.querySelectorAll('[data-remove-pair]').forEach(b=>b.onclick=guarded(()=>{collect();const [i,j]=b.dataset.removePair.split(':').map(Number);if(doc.questions[i].pairs.length>2)doc.questions[i].pairs.splice(j,1);editor();}));
    root.querySelectorAll('[data-sync-blanks]').forEach(b=>b.onclick=guarded(()=>{collect();const q=doc.questions[Number(b.dataset.syncBlanks)],ids=Array.from(q.text.matchAll(/\[\[([^\]]*)\]\]/g),m=>m[1]);if(!ids.length||ids.some(id=>!/^[1-9]\d*$/.test(id))||new Set(ids).size!==ids.length)throw Error('Mã chỗ trống thiếu, không hợp lệ hoặc trùng.');q.blanks=ids.map(id=>(q.blanks||[]).find(item=>item.id===id)||{id,answerText:'',acceptedAnswers:[]});editor();}));
    root.querySelectorAll('[data-add-option]').forEach(b=>b.onclick=guarded(()=>{collect();const q=doc.questions[Number(b.dataset.addOption)];while(q.options.length<4)q.options.push('');q.options.push('');editor();}));
    root.querySelectorAll('[data-add-statement]').forEach(b=>b.onclick=guarded(()=>{collect();const q=doc.questions[Number(b.dataset.addStatement)];if(!Array.isArray(q.statements))q.statements=[];q.statements.push({text:'',answer:null});editor();}));
    root.querySelectorAll('[data-remove-statement]').forEach(b=>b.onclick=guarded(()=>{collect();const [i,j]=b.dataset.removeStatement.split(':').map(Number);doc.questions[i].statements.splice(j,1);editor();}));
    $('#rv-add').onclick=guarded(()=>{collect();doc.questions.push({id:uid(),type:'SINGLE',text:'',options:[],correctAnswers:[],points:1});editor();});
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=guarded(()=>{collect();doc.questions.splice(Number(b.dataset.remove),1);editor();}));
    root.querySelectorAll('[data-up],[data-down]').forEach(b=>b.onclick=guarded(()=>{collect();const i=Number(b.dataset.up??b.dataset.down),j=b.hasAttribute('data-up')?i-1:i+1;[doc.questions[i],doc.questions[j]]=[doc.questions[j],doc.questions[i]];editor();}));
    // No trusted approval service is wired. Local profile fields cannot grant access.
    ['rv-review','rv-publish'].forEach(id=>{const control=$('#'+id);control.disabled=true;control.title=approvalUnavailable;control.onclick=()=>notify(approvalUnavailable);});
    const approvalNote=document.createElement('p');approvalNote.id='rv-approval-unavailable';approvalNote.textContent=approvalUnavailable;
    root.querySelector('.rv-tools').after(approvalNote);
    $('#rv-practice').insertAdjacentHTML('beforebegin','<label>Hoạt động<select id="rv-activity"><option value="practice">Ôn tập</option><option value="assessment">Kiểm tra thử trên thiết bị</option></select></label>');
    $('#rv-practice').onclick=guarded(()=>{attempt=null;card=0;const activity=$('#rv-activity').value;practice(activity);}); $('#rv-history').onclick=guarded(history);
  }
  function answerInput(q,value) {
    if(q.type==='FILL'&&Array.isArray(q.blanks))return q.blanks.map(b=>`<label>Ô [[${esc(b.id)}]]<input data-fill="${esc(b.id)}" value="${esc(value?.[b.id]||'')}"></label>`).join('');
    if(q.type==='TRUEFALSE'&&Array.isArray(q.statements))return q.statements.map((item,j)=>`<div><p>${esc(item.text)}</p>${[true,false].map(v=>`<label class="rv-answer"><input data-tf="${j}" type="radio" name="tf-${esc(q.id)}-${j}" value="${v}" ${value?.[j]===v?'checked':''}>${v?'Đúng':'Sai'}</label>`).join('')}</div>`).join('');
    if(['ABCD','SINGLE','MULTI','TRUEFALSE'].includes(q.type)) return (q.options||[]).map((o,i)=>`<label class="rv-answer"><input type="${q.type==='MULTI'?'checkbox':'radio'}" name="answer-${esc(q.id)}" value="${i}" ${[].concat(value??[]).includes(i)?'checked':''}>${esc(o)}</label>`).join('');
    if(q.type==='MATCHING'&&q.metadata?.matchingScoring==='per-pair')return q.pairs.map((p,i)=>`<label>${esc(p.left)}<select data-match-select="${i}"><option value="">Chưa nối</option>${q.pairs.map((b,j)=>`<option value="${j}" ${value?.[i]===j?'selected':''}>${esc(b.right)}</option>`).join('')}</select></label>`).join('');
    if(q.type==='MATCHING') return (q.pairs||[]).map((p,i)=>`<label>${esc(p.left)}<input data-pair="${i}" value="${esc(value?.[i]?.right || '')}" placeholder="Nhập vế phải tương ứng"></label>`).join('');
    return `<textarea data-answer-text rows="${q.type==='OPEN'?4:2}">${esc(value||'')}</textarea>`;
  }
  function captureAnswers() {
    if(!attempt)return;
    root.querySelectorAll('[data-answer-id]').forEach(el=>{const q=attempt.questions.find(q=>q.id===el.dataset.answerId);let value;if(q.type==='FILL'&&Array.isArray(q.blanks))value=Object.fromEntries(Array.from(el.querySelectorAll('[data-fill]')).map(input=>[input.dataset.fill,input.value]));else if(q.type==='TRUEFALSE'&&Array.isArray(q.statements))value=q.statements.map((_,j)=>{const selected=el.querySelector('[data-tf="'+j+'"]:checked');return selected?selected.value==='true':null;});else if(q.type==='MATCHING'&&q.metadata?.matchingScoring==='per-pair')value=Array.from(el.querySelectorAll('[data-match-select]')).map(input=>input.value===''?null:Number(input.value));else if(q.type==='MATCHING')value=Array.from(el.querySelectorAll('[data-pair]')).map((x,i)=>({left:q.pairs[i].left,right:x.value}));else if(['ABCD','SINGLE','MULTI','TRUEFALSE'].includes(q.type)){const values=Array.from(el.querySelectorAll('input:checked')).map(x=>Number(x.value));value=q.type==='MULTI'?values:values.length?values[0]:null;}else value=el.querySelector('[data-answer-text]').value;attempt.answers[q.id]=value;});
  }
  async function practice(activity) {
    if(doc.status!=='published') throw Error('Học liệu cần được duyệt và xuất bản trước khi làm bài.');
    if(!attempt) attempt=structuredClone(D().createAttempt(doc,{id:uid(),mode:activity||'practice'}));
    attempt.answers=attempt.answers||{};
    shell(`<div class="rv-panel"><h2>${esc(doc.title)}</h2><div class="rv-tools"><label>Cách xem<select id="rv-mode"><option value="worksheet">Phiếu học tập</option><option value="cards">Thẻ từng câu</option></select></label>${button('rv-save-attempt','Lưu bài đang làm')}${button('rv-submit','Nộp bài')}${button('rv-game','Chơi bằng câu hỏi')}</div><p id="rv-progress"></p><div id="rv-paper"></div><div class="rv-tools">${button('rv-prev','← Câu trước')}${button('rv-next','Câu tiếp →')}</div></div>`);
    const paper=()=>{const mode=$('#rv-mode').value, qs=attempt.questions;attempt.viewMode=mode;$('#rv-progress').textContent=mode==='cards'?`Câu ${card+1} / ${qs.length}`:`${qs.length} câu hỏi`;$('#rv-paper').innerHTML=(attempt.blocks||[]).map(b=>`<article class="rv-panel"><h3>${esc(b.title||'Ngữ liệu')}</h3><p style="white-space:pre-wrap">${esc(b.text||b.content||'')}</p></article>`).join('')+(mode==='cards'?[qs[card]]:qs).filter(Boolean).map(q=>`<fieldset class="rv-question" data-answer-id="${esc(q.id)}"><legend>Câu ${qs.indexOf(q)+1} · ${q.points} điểm</legend><p class="rv-student-question">${esc(q.text)}</p>${answerInput(q,attempt.answers[q.id])}</fieldset>`).join('');$('#rv-prev').hidden=$('#rv-next').hidden=mode!=='cards';$('#rv-prev').disabled=card===0;$('#rv-next').disabled=card>=qs.length-1;};
    if(attempt.mode==='assessment')$('#rv-progress').insertAdjacentHTML('beforebegin','<p class="rv-local">Kiểm tra thử trên thiết bị. Đáp án nằm trên thiết bị, chưa dùng cho kỳ kiểm tra chính thức có bảo mật.</p>');
    $('#rv-mode').value=attempt.viewMode||'worksheet';$('#rv-mode').onchange=()=>{captureAnswers();paper();};
    $('#rv-prev').onclick=()=>{captureAnswers();card--;paper();};$('#rv-next').onclick=()=>{captureAnswers();card++;paper();};paper();
    $('#rv-save-attempt').onclick=async()=>{captureAnswers();await repo.put('attempts',attempt);notify('Đã lưu bài đang làm trên thiết bị.');};
    $('#rv-submit').onclick=async()=>{try{captureAnswers();attempt=D().submitAttempt(attempt,attempt.answers,{submissionId:attempt.submissionId||uid()});await repo.atomicAttempt(attempt);results(attempt);}catch(e){notify(e.message);}};
    $('#rv-game').onclick=games;
  }
  function games(){
    root.querySelector('#rv-game-panel')?.remove();
    captureAnswers();
    const panel=document.createElement('div');panel.id='rv-game-panel';panel.className='rv-panel';panel.innerHTML='<h2>Chọn trò chơi</h2><label>Trò chơi<select id="rv-game-type"><option value="millionaire">Ai là triệu phú</option><option value="race">Đường đua</option><option value="gift">Hộp quà</option><option value="tug">Kéo co</option><option value="tiles">Lật ô</option></select></label><p id="rv-game-report"></p><button id="rv-game-play">Bắt đầu với câu tương thích</button>';root.append(panel);
    const select=panel.querySelector('select'), report=panel.querySelector('p');let adapted;
    const check=()=>{adapted=D().gameAdapter(doc,select.value,window.hmvC6QuestionErrors);report.textContent=`${adapted.accepted.length} câu tương thích; ${adapted.rejected.length} câu không dùng được. `+adapted.rejected.map(x=>x.questionId+': '+x.reasons.join('; ')).join('\n');panel.querySelector('button').disabled=!adapted.accepted.length;};select.onchange=check;check();
    panel.querySelector('button').onclick=()=>{try{if(typeof window.hmvC6PlayBankSet!=='function')throw Error('Trò chơi chưa sẵn sàng.');const set={id:uid(),name:doc.title,title:doc.title,subject:doc.metadata.subject,questions:adapted.accepted};if(!Array.isArray(window.questionBankSets))window.questionBankSets=[];window.questionBankSets.push(set);let result;try{result=window.hmvC6PlayBankSet(select.value,set.id,set.questions.map(q=>q.id));}finally{window.questionBankSets=window.questionBankSets.filter(s=>s!==set);}if(!result?.ok)throw Error(result?.reason||'Không mở được trò chơi.');}catch(e){notify(e.message);}};
  }
  async function history() {
    const items=(await list('attempts')).filter(a=>a.documentId===doc.id);
    shell(`<div class="rv-panel"><h2>Bài làm · ${esc(doc.title)}</h2>${items.map(a=>`<button data-attempt="${esc(a.id)}">${esc(a.status)} · ${esc(a.id)}</button>`).join('')||'<p>Chưa có bài làm.</p>'}</div>`);
    root.querySelectorAll('[data-attempt]').forEach(b=>b.onclick=async()=>{card=0;attempt=structuredClone(await repo.get('attempts',b.dataset.attempt));if(attempt.status==='in-progress')practice();else results(attempt);});
  }
  function results(a) {
    shell(`<div class="rv-panel"><h2>🌟 Kết quả bài làm</h2><p>Trạng thái: ${esc(a.status)}</p><pre>${esc(JSON.stringify({score:a.score,maxScore:a.maxScore,pendingManual:a.pendingManual,results:a.results},null,2))}</pre><p>Các câu tự luận cần giáo viên chấm. Điểm chỉ hoàn tất khi không còn câu chờ chấm.</p><div id="rv-manual">${a.questions.filter(q=>q.type==='OPEN').map(q=>`<label>${esc(q.text)}<p>${esc(a.answers?.[q.id])}</p><input type="number" min="0" max="${q.points}" step="0.25" data-manual="${esc(q.id)}" placeholder="0 đến ${q.points} điểm"></label>`).join('')}</div>${button('rv-grade','Lưu điểm giáo viên')}${button('rv-export','Tải kết quả JSON')}</div>`);
    $('#rv-export').onclick=()=>download('hmv-ket-qua.json',a);
    $('#rv-grade').onclick=async()=>{try{let graded=a;for(const el of root.querySelectorAll('[data-manual]')){if(el.value!=='')graded=D().gradeManual(graded,el.dataset.manual,Number(el.value));}await repo.put('attempts',graded);attempt=graded;results(graded);notify('Đã lưu điểm giáo viên.');}catch(e){notify(e.message);}};
  }
  async function open() {
    if(!root){root=document.createElement('section');root.id='review';root.className='view';(document.querySelector('.main')||document.body).append(root);}
    try { repo=repo||await window.HmvReviewStorage.open(); if(typeof window.openView==='function')window.openView('review');else root.classList.add('active');await library(); } catch(e){shell('<div class="rv-panel">Không mở được kho trên thiết bị.</div>');notify(e.message);}
  }
  function entries(){['dashboard','questions'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.querySelector('.rv-entry')){const b=document.createElement('button');b.className='rv-entry';b.textContent='🌱 Ôn tập và Kiểm tra · Kho đa môn';b.onclick=open;el.prepend(b);}});}
  function boot(){entries();new MutationObserver(entries).observe(document.body,{childList:true,subtree:true});new MutationObserver(()=>{if(root&&!root.classList.contains('active'))releasePreview();}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']});}
  window.HmvReviewUI={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();










