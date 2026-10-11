/* Mô-đun giả lập dùng TRONG KIỂM THỬ: có đúng hình dạng API của @mediapipe/tasks-vision mà ban-tay-camera.js gọi.
   Trả về vị trí đầu ngón trỏ theo window.__hand = [{x,y}, ...] (tọa độ 0..1 của ảnh gốc) do kịch bản kiểm thử đặt. */
export const FilesetResolver = { forVisionTasks: async (wasmPath) => ({ wasmPath }) };
export class HandLandmarker {
  static async createFromOptions(fileset, options) { window.__hl = { options, fileset, calls: 0, closed: 0 }; return new HandLandmarker(); }
  detectForVideo(video, timestamp) { window.__hl.calls++; const pts = window.__hand || []; return { landmarks: pts.map(p => { const a = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9, z: 0 })); a[8] = { x: p.x, y: p.y, z: 0 }; return a; }) }; }
  close() { window.__hl.closed++; }
}
export class FaceLandmarker { static async createFromOptions() { throw new Error('not used in this test'); } }
