// GĐ2: Hàm chia PDF/ảnh quá 9 MB thành từng trang
// Giả lập: đọc base64, chia đều theo kích thước trang

function splitLargeContent(base64String, maxSize = 9 * 1024 * 1024) {
  const chunks = [];
  const buffer = Buffer.from(base64String, 'base64');
  
  if (buffer.length <= maxSize) {
    return [{ index: 1, data: base64String, size: buffer.length }];
  }
  
  // Chia thành chunks tương đương
  const chunkCount = Math.ceil(buffer.length / maxSize);
  const chunkSizeBytes = Math.ceil(buffer.length / chunkCount);
  
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSizeBytes;
    const end = Math.min((i + 1) * chunkSizeBytes, buffer.length);
    const chunk = buffer.slice(start, end);
    chunks.push({
      index: i + 1,
      data: chunk.toString('base64'),
      size: chunk.length
    });
  }
  
  return chunks;
}

function mergeResults(resultsArray) {
  if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
    return { questions: [], blocks: [] };
  }
  
  // Sắp xếp theo index, ghép kết quả
  const sorted = resultsArray.sort((a, b) => (a.index || 0) - (b.index || 0));
  
  const merged = {
    questions: [],
    blocks: [],
    totalPages: sorted.length,
    mergedAt: new Date().toISOString()
  };
  
  const questionIds = new Set();
  const blockIds = new Set();
  
  for (const result of sorted) {
    if (result.questions && Array.isArray(result.questions)) {
      for (const q of result.questions) {
        if (!questionIds.has(q.id)) {
          merged.questions.push(q);
          questionIds.add(q.id);
        }
      }
    }
    if (result.blocks && Array.isArray(result.blocks)) {
      for (const b of result.blocks) {
        if (!blockIds.has(b.id)) {
          merged.blocks.push(b);
          blockIds.add(b.id);
        }
      }
    }
  }
  
  return merged;
}

module.exports = { splitLargeContent, mergeResults };
