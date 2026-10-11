/* 05C: Local metadata-only batch suggestions for the saved Note Music clips. */
(() => {
  'use strict';
  const groups = [['warmup','Khởi động'],['move','Vận động nhẹ'],['transition','Chuyển tiếp'],['relax','Thư giãn'],['unclassified','Chưa phân loại']];
  const label = key => groups.find(group => group[0] === key)?.[1] || 'Chưa phân loại';
  const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const rules = {
    warmup: ['khoi dong','warm up','warmup','bat dau','mo dau','hello song'],
    move: ['van dong','the duc','nhay','dance','tap the duc','the thao'],
    transition: ['chuyen tiep','chuyen tiet','doi tiet','doi hoat dong','transition'],
    relax: ['thu gian','nghi ngoi','hit tho','relax','meditation','nhe nhang']
  };
  function suggest(row) {
    const scores = Object.fromEntries(Object.keys(rules).map(key => [key,0]));
    const matches=[];
    for (const [field,text,weight] of [['tiêu đề',row.title,3],['tên tệp',row.name,2],['mô tả',row.description,1]]) {
      const hay = ' ' + normal(text) + ' ';
      for (const [key,words] of Object.entries(rules)) {
        const hit=words.find(word => hay.includes(' ' + word + ' '));
        if (hit) {scores[key] += weight;matches.push({key,field,word:hit})}
      }
    }
    const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
    if (!ranked[0][1] || (ranked[1][1] && ranked[0][1] - ranked[1][1] < 2)) return {category:'unclassified',confidence:'Không đủ căn cứ',reason:matches.length?'Từ khóa thuộc nhiều nhóm; cần giáo viên chọn.':'Không có từ khóa đủ rõ trong metadata.'};
    const match=matches.find(item => item.key===ranked[0][0]);
    return {category:ranked[0][0],confidence:ranked[0][1] >= 3 ? 'Cao' : 'Vừa',reason:'Từ khóa “'+match.word+'” trong '+match.field+'.'};
  }
  function mount(card) {
    if (card.querySelector('#windBatch05c')) return;
    const panel = document.createElement('section'); panel.id = 'windBatch05c'; panel.className = 'wind-batch-05c';
    const button = document.createElement('button'); button.type='button';button.className='btn color';button.textContent='✨ AI tự động phân loại';
    const note = document.createElement('p');note.textContent='Gợi ý cục bộ theo tiêu đề, tên tệp và mô tả; không phân tích hình ảnh, âm thanh hay nội dung video. Không gửi metadata ra ngoài.';
    const preview = document.createElement('div');preview.id='windBatch05cPreview';preview.hidden=true;
    panel.append(button,note,preview);
    (card.querySelector('#windSettingsList') || card).before(panel);
    button.onclick = async () => {
      button.disabled=true;preview.hidden=false;preview.replaceChildren();
      const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Đang đọc metadata clip đã lưu…';preview.append(status);
      try {
        const saved=await window.hmvClipStore.load();
        if (!card.isConnected) return;
        const rows=saved.slice().sort((a,b) => Number(!!a.category && a.category !== 'unclassified') - Number(!!b.category && b.category !== 'unclassified'));
        const suggestions=rows.filter(row => (!row.category || row.category==='unclassified') && suggest(row).category!=='unclassified').length;
        status.textContent=rows.length ? 'Xem trước ' + rows.length + ' clip; đề xuất ' + suggestions + ' clip chưa phân loại. Chỉ các hàng được đánh dấu mới được lưu.' : 'Kho clip chưa có tệp.';
        if (!rows.length) {button.disabled=false;return}
        const wrap=document.createElement('div');wrap.className='wind-batch-05c-scroll';
        const table=document.createElement('table');table.className='wind-batch-05c-table';
        const thead=document.createElement('thead');const tr=document.createElement('tr');
        for(const name of ['Áp dụng','Tên clip','Nhóm hiện tại','Nhóm đề xuất','Lý do đề xuất','Tin cậy','Giáo viên chỉnh nhóm']) {const th=document.createElement('th');th.textContent=name;tr.append(th)}
        thead.append(tr);table.append(thead);
        const body=document.createElement('tbody');const plans=[];
        for(const row of rows) {
          const current=row.category || 'unclassified',proposal=suggest(row),line=document.createElement('tr');
          const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Áp dụng cho '+(row.title || row.name));
          const select=document.createElement('select');select.className='select';select.setAttribute('aria-label','Chỉnh nhóm cho '+(row.title || row.name));
          for(const [key,text] of groups) {const option=document.createElement('option');option.value=key;option.textContent=text;select.append(option)}
          select.value=current==='unclassified'?proposal.category:current;
          check.checked=current==='unclassified' && proposal.category!=='unclassified';
          check.disabled=select.value===current;
          select.onchange=() => {check.disabled=select.value===current;if(check.disabled)check.checked=false;else check.checked=true};
          const cells=[check,row.title || row.name || 'Clip',label(current),label(proposal.category),proposal.reason,proposal.confidence,select];
          for(const value of cells){const td=document.createElement('td');if(value instanceof Node)td.append(value);else td.textContent=value;line.append(td)}
          body.append(line);plans.push({id:row.id,current,confidence:proposal.confidence,check,select});
        }
        table.append(body);wrap.append(table);preview.append(wrap);
        const actions=document.createElement('div');actions.className='wind-batch-05c-actions';
        const apply=document.createElement('button');apply.type='button';apply.className='btn color';apply.textContent='ÁP DỤNG PHÂN LOẠI';
        const skip=document.createElement('button');skip.type='button';skip.className='btn soft';skip.textContent='Bỏ qua clip không đủ căn cứ';
        skip.onclick=() => {let count=0;for(const item of plans){if(item.confidence==='Không đủ căn cứ' && item.select.value===item.current){item.check.checked=false;count++}}status.textContent='Đã bỏ qua '+count+' clip không đủ căn cứ. Các nhóm giáo viên đã chọn vẫn được giữ.'};
        const cancel=document.createElement('button');cancel.type='button';cancel.className='btn soft';cancel.textContent='Hủy';cancel.onclick=() => {preview.hidden=true;preview.replaceChildren();button.disabled=false};
        actions.append(apply,skip,cancel);preview.append(actions);
        apply.onclick=async () => {
          const selected=plans.filter(p => p.check.checked && !p.check.disabled && p.select.value!==p.current);
          if(!selected.length){status.textContent='Không có clip nào được chọn để đổi nhóm. Clip không đủ căn cứ được bỏ qua.';return}
          apply.disabled=true;skip.disabled=true;cancel.disabled=true;let updated=0;
          try {
            const currentRows=await window.hmvClipStore.load();
            for(const item of selected){
              const row=currentRows.find(x => x.id===item.id);
              if(!row || (row.category || 'unclassified')!==item.current)throw Error('Kho clip đã thay đổi. Hãy xem trước lại trước khi lưu.');
            }
            for(const item of selected){
              const row=await window.hmvClipStore.get(item.id);
              if(!row || (row.category || 'unclassified')!==item.current)throw Error('Kho clip đã thay đổi trong lúc lưu.');
              await window.hmvClipStore.put({...row,category:item.select.value});updated++;
            }
            status.textContent='Đã phân loại '+updated+' clip; các clip không chọn vẫn giữ nguyên. Nội dung video không thay đổi.';
            const refreshed=await window.hmvClipStore.load();
            card.querySelectorAll('.wind-settings-item').forEach(item => {
              const meta=item.querySelector('small'),row=refreshed.find(x => x.id===item.dataset.windId);
              if(meta && row) meta.textContent=label(row.category)+' · '+meta.textContent.split(' · ').slice(1).join(' · ');
            });
            button.disabled=false;apply.remove();skip.remove();cancel.textContent='Đóng';cancel.disabled=false;
          } catch(error) {
            status.textContent='Đã cập nhật '+updated+' clip trước khi gặp lỗi: '+(error?.message || 'không thể lưu')+'. Hãy mở lại bảng xem trước để kiểm tra.';
            button.disabled=false;skip.disabled=false;cancel.disabled=false;
          }
        };
      } catch(error) {status.textContent='Không thể đọc Kho clip: '+(error?.message || 'lỗi lưu trữ');button.disabled=false}
    };
  }
  const style=document.createElement('style');style.textContent='.wind-batch-05c{margin:16px 0;padding:14px;border:1px solid #c4b5fd;border-radius:14px;background:#faf7ff}.wind-batch-05c p{margin:8px 0;color:#475569}.wind-batch-05c-scroll{overflow:auto;max-height:50vh}.wind-batch-05c-table{width:100%;border-collapse:collapse;min-width:760px}.wind-batch-05c-table th,.wind-batch-05c-table td{text-align:left;padding:9px;border-bottom:1px solid #ddd6fe;vertical-align:middle}.wind-batch-05c-table th{position:sticky;top:0;background:#ede9fe}.wind-batch-05c-table select{min-width:150px}.wind-batch-05c-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}';document.head.append(style);
  const observer=new MutationObserver(() => {const card=document.getElementById('windSettingsCard');if(card)mount(card)});
  observer.observe(document.body,{childList:true,subtree:true});
  const card=document.getElementById('windSettingsCard');if(card)mount(card);
})();
