(function(){
  'use strict';
  var directStarts={tug:function(){window.gameStart()},millionaire:function(){window.gameStart()},lens:function(){window.lensStart&&window.lensStart()},tiles:function(){window.flipStart&&window.flipStart()},gift:function(){window.giftStart&&window.giftStart()},race:function(){window.raceStart&&window.raceStart()},buzzer:function(){window.buzzStart&&window.buzzStart()}};
  function playNow(type){
    if(!type||typeof window.gameSetup!=='function'){if(window.showToast)showToast('Không mở được trò chơi này. Hãy thử Thiết lập.');return}
    try{window.gameSetup(type);if(type==='head-tilt'){if(window.showToast)showToast('Mở phần thiết lập để chọn câu hỏi và xác nhận camera trước khi bắt đầu.');return}if(type==='paper-mode'){if(window.showToast)showToast('Chế độ giấy cần đồng bộ thẻ học sinh trước khi bắt đầu.');return}
      var start=directStarts[type]||function(){if(typeof window.gameStart==='function')window.gameStart()};setTimeout(function(){try{start()}catch(error){console.error('[C5 Play Now]',type,error);if(window.showToast)showToast('Chưa thể bắt đầu nhanh; cấu hình vẫn được giữ. Dùng Thiết lập để kiểm tra dữ liệu.')}},0)
    }catch(error){console.error('[C5 Play Now]',type,error);if(window.showToast)showToast('Không mở được trò chơi. Cấu hình đã lưu được giữ nguyên.')}
  }
  document.addEventListener('click',function(event){var button=event.target&&event.target.closest&&event.target.closest('.game-library-card .game-card-actions button');if(!button||!/chơi ngay/i.test(button.textContent||''))return;var card=button.closest('.game-library-card'),handler=button.getAttribute('onclick')||'',m=handler.match(/gameSetup\s*\(\s*['"]([^'"]+)['"]\s*\)/);if(!m&&card){var marker=card.getAttribute('data-game-type');if(marker)m=[null,marker]}if(!m)return;event.preventDefault();event.stopImmediatePropagation();playNow(m[1])},true);
  window.hmvStage5PlayNow=playNow;
})();
