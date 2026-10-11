/* Mô-đun giả lập dùng TRONG KIỂM THỬ: có đúng hình dạng API của @mediapipe/tasks-vision mà quiz-camera.js gọi.
   Trả về điểm mốc khuôn mặt theo window.__face = { faces, roll } do kịch bản kiểm thử đặt. */
export const FilesetResolver = { forVisionTasks: async (wasmPath) => ({ wasmPath }) };
export class FaceLandmarker {
  static async createFromOptions(fileset, options) { window.__mp = { options, fileset, calls: 0, closed: 0 }; return new FaceLandmarker(); }
  detectForVideo(video, timestamp) {
    window.__mp.calls++; window.__mp.lastTs = timestamp;
    const s = window.__face || { faces: 0, roll: 0 }, w = video.videoWidth, h = video.videoHeight;
    const face = (rollRight) => { const ang = -rollRight * Math.PI / 180, a = { x: 0.4, y: 0.5, z: 0 }, b = { x: a.x + 120 * Math.cos(ang) / w, y: a.y + 120 * Math.sin(ang) / h, z: 0 }; const pts = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 })); pts[33] = a; pts[263] = b; return pts; };
    return { faceLandmarks: Array.from({ length: s.faces }, () => face(s.roll)) };
  }
  close() { window.__mp.closed++; }
}
