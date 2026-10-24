// HTML thẻ AI status (để dùng trong review-ui.js)
// Trạng thái: 'idle', 'loading', 'done', 'error', 'partial'

function createAIStatusCard(state, message) {
  const card = document.createElement('div');
  card.className = 'hmv-ai-status-card';
  card.setAttribute('aria-live', 'polite');
  card.setAttribute('aria-label', `Trạng thái AI: ${message}`);
  
  const icon = document.createElement('span');
  icon.className = 'hmv-ai-status-icon';
  
  let statusText = '';
  switch (state) {
    case 'loading':
      icon.textContent = '⏳';
      statusText = 'Đang xử lý…';
      break;
    case 'done':
      icon.textContent = '✅';
      statusText = 'Xong';
      break;
    case 'error':
      icon.textContent = '❌';
      statusText = 'Lỗi';
      break;
    case 'partial':
      icon.textContent = '⚠️';
      statusText = 'Đọc một phần';
      break;
    default:
      icon.textContent = '';
      statusText = '';
  }
  
  const text = document.createElement('span');
  text.className = 'hmv-ai-status-text';
  text.textContent = statusText + (message ? ': ' + message : '');
  
  card.appendChild(icon);
  card.appendChild(text);
  
  // CSS inline
  card.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 44px;
    margin: 12px 0;
    border-radius: 8px;
    background: #f5f5f5;
    border-left: 4px solid #527ee4;
    font-size: 14px;
    line-height: 1.5;
  `;
  
  if (state === 'error') {
    card.style.borderLeftColor = '#d32f2f';
    card.style.background = '#ffebee';
  } else if (state === 'partial') {
    card.style.borderLeftColor = '#f57c00';
    card.style.background = '#fff3e0';
  } else if (state === 'done') {
    card.style.borderLeftColor = '#388e3c';
    card.style.background = '#e8f5e9';
  }
  
  icon.style.cssText = 'font-size: 20px; flex-shrink: 0;';
  text.style.cssText = 'flex: 1;';
  
  return card;
}

// Hàm cập nhật thẻ (gọi từ analyze hoặc callAI)
function updateAIStatus(container, state, message) {
  const existing = container.querySelector('.hmv-ai-status-card');
  if (existing) {
    existing.remove();
  }
  
  if (state && state !== 'idle') {
    const card = createAIStatusCard(state, message);
    container.insertAdjacentElement('beforeend', card);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createAIStatusCard, updateAIStatus };
}
