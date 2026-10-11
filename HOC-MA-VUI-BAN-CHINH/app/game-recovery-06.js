/* HMV game recovery 06: small safety layer over the existing Chinh phuc game. */
(function(){
  var originalRender=window.renderGames;
  var legacyAudioDefault=window.hmvLegacyAudioDefault;
  var mutedAudioDefault=window.hmvMutedAudioDefault;
  var selectedCount=10;
  window.millionaireTarget=function(){return selectedCount};
  window.millionaireSetMode=function(value){
    var count=Number(value);
    selectedCount=count===3||count===5?count:10;
    window.renderGames();
  };
  if(typeof originalRender==='function')window.renderGames=function(){
    originalRender.apply(this,arguments);
    var root=document.getElementById('games'),game=window.classroomGame;
    if(!root||!game||game.type!=='millionaire')return;
    root.querySelectorAll('h2,h3,.millionaire-logo span').forEach(function(el){
      el.textContent=el.textContent.replace(/Ai là triệu phú/gi,'Chinh phục tri thức');
    });
    if(game.started){
      if(selectedCount<10){
        var stage=root.querySelector('.millionaire');
        if(stage)stage.classList.add('millionaire-quick');
        var badge=root.querySelector('.millionaire-meta .pill');
        if(badge)badge.textContent='Trải nghiệm nhanh · '+selectedCount+' câu';
        var result=root.querySelector('.millionaire-result-card');
        if(result){
          var paragraphs=result.querySelectorAll('p');
          if(paragraphs[1])paragraphs[1].textContent='Kết quả: '+(game.q+(window.millionaireState.result==='win'?1:0))+'/'+selectedCount+' câu đúng · Thời gian: '+window.millionaireFormatTime(window.millionaireState.seconds);
        }
      }
      return;
    }
    var subtitle=root.querySelector('.page-title p');
    if(subtitle)subtitle.textContent=selectedCount<10
      ?'Trải nghiệm nhanh '+selectedCount+' câu từ Kho câu hỏi đã chọn; ba quyền trợ giúp vẫn dùng được.'
      :'Trả lời 10 câu từ Kho câu hỏi đã chọn và sử dụng ba quyền trợ giúp.';
    var card=root.querySelector('.card'),setup=card&&card.querySelector('.game-setup');
    if(!card||!setup)return;
    var labels=setup.querySelectorAll('label');
    if(labels[0]){
      labels[0].textContent='Chế độ ';
      var select=document.createElement('select');
      select.id='millionaireMode';
      [[10,'Gameshow đầy đủ · 10 câu'],[3,'Trải nghiệm nhanh · 3 câu'],[5,'Trải nghiệm nhanh · 5 câu']].forEach(function(option){
        var item=document.createElement('option');item.value=String(option[0]);item.textContent=option[1];select.appendChild(item);
      });
      select.value=String(selectedCount);
      select.onchange=function(){window.millionaireSetMode(this.value)};
      labels[0].appendChild(select);
    }
    if(labels[1])labels[1].remove();
    var count=typeof window.millionaireQuestionsList==='function'?window.millionaireQuestionsList().length:0;
    var note=card.querySelector('p');
    if(note)note.textContent=count<selectedCount
      ?'Nguồn hiện có '+count+' câu hợp lệ. Cần tối thiểu '+selectedCount+' câu hỏi bốn lựa chọn để bắt đầu; hãy chọn bộ câu hỏi hoặc khối lớp khác.'
      :'Nguồn có '+count+' câu hợp lệ. Trò chơi sẽ dùng '+selectedCount+' câu đầu tiên theo bộ lọc đã chọn.';
    var start=card.querySelector('button[onclick="gameStart()"]');
    if(start){start.disabled=count<selectedCount;if(count<selectedCount)start.title='Cần tối thiểu '+selectedCount+' câu hợp lệ';}
  };

  var originalStart=window.millionaireStart;
  if(typeof originalStart==='function')window.millionaireStart=function(){
    var count=typeof window.millionaireQuestionsList==='function'?window.millionaireQuestionsList().length:0;
    if(count<selectedCount){if(typeof window.showToast==='function')window.showToast('Cần tối thiểu '+selectedCount+' câu hỏi hợp lệ từ bộ câu hỏi đã chọn.');return}
    if(typeof legacyAudioDefault==='function')window.audioDefault=legacyAudioDefault;
    try{return originalStart.apply(this,arguments)}catch(error){if(typeof mutedAudioDefault==='function')window.audioDefault=mutedAudioDefault;throw error}
  };

  function muteLegacyAudio(){if(typeof mutedAudioDefault==='function')window.audioDefault=mutedAudioDefault}

  var originalBack=window.gameBack;
  if(typeof originalBack==='function')window.gameBack=function(){
    if(window.classroomGame&&window.classroomGame.type==='millionaire'){
      if(typeof window.millionaireStop==='function')window.millionaireStop();
      if(typeof window.audioStopAll==='function')window.audioStopAll();
      muteLegacyAudio();
    }
    var result=originalBack.apply(this,arguments);
    selectedCount=10;
    return result;
  };

  var originalOpen=window.openView;
  if(typeof originalOpen==='function')window.openView=function(view){
    if(view!=='games'&&window.classroomGame&&window.classroomGame.type==='millionaire'){
      if(typeof window.millionaireStop==='function')window.millionaireStop();
      if(typeof window.audioStopAll==='function')window.audioStopAll();
      muteLegacyAudio();
    }
    return originalOpen.apply(this,arguments);
  };

  window.addEventListener('pagehide',function(){
    if(window.classroomGame&&window.classroomGame.type==='millionaire'){
      if(typeof window.millionaireStop==='function')window.millionaireStop();
      if(typeof window.audioStopAll==='function')window.audioStopAll();
      muteLegacyAudio();
    }
  });
  var style=document.createElement('style');
  style.textContent='.millionaire-quick .millionaire-content{grid-template-columns:minmax(0,1fr)}.millionaire-quick .millionaire-prizes{display:none}';
  document.head.appendChild(style);
  console.info('[HMV 06] Chinh phục tri thức safety layer ready');
})();
