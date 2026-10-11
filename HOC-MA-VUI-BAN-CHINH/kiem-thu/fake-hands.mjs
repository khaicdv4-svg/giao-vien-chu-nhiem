/* Mô-đun giả lập dùng TRONG KIỂM THỬ cho "Bình chọn ngón tay" và "Bóng bay": có đúng hình dạng API của @mediapipe/tasks-vision.
   window.__hands = [{x, y, n, thumb, down, scale}] — mỗi phần tử là một bàn tay ở vị trí (x, y) (0..1 theo cả khung hình)
   đang giơ n ngón (0–4); thumb:true duỗi thêm ngón cái; down:true bàn tay chúc xuống.
   detect(canvas): chế độ ảnh tĩnh; canvas.hmvCrop cho biết ô đang dò để chỉ trả về bàn tay nằm trong ô (theo tọa độ của ô).
   detectForVideo(video): chế độ video; với Bóng bay dùng window.__hand = [{x,y}] (đầu ngón trỏ). */
export const FilesetResolver = { forVisionTasks: async (wasmPath) => ({ wasmPath }) };
function hand(h, cx, cy, kx, ky) {
  const s = h.scale || 1, d = h.down ? -1 : 1;
  const P = (dx, dy) => ({ x: cx + dx * s * kx, y: cy + dy * s * ky * d, z: 0 });
  const lm = new Array(21);
  lm[0] = P(0, 0.11);
  if (h.thumb) { lm[1] = P(-0.03, 0.08); lm[2] = P(-0.05, 0.05); lm[3] = P(-0.07, 0.03); lm[4] = P(-0.09, 0.01); }
  else { lm[1] = P(-0.03, 0.08); lm[2] = P(-0.04, 0.05); lm[3] = P(-0.02, 0.04); lm[4] = P(0, 0.045); }
  for (let f = 0; f < 4; f++) {
    const bx = (f - 1.5) * 0.024, b = 5 + f * 4, up = f < h.n;
    lm[b] = P(bx, 0.02);
    if (up) { lm[b + 1] = P(bx, -0.02); lm[b + 2] = P(bx, -0.05); lm[b + 3] = P(bx, -0.08); }
    else { lm[b + 1] = P(bx, -0.012); lm[b + 2] = P(bx, 0.012); lm[b + 3] = P(bx, 0.035); }
  }
  return lm;
}
export class HandLandmarker {
  static async createFromOptions(fileset, options) { window.__hl = { options, fileset, calls: 0, closed: 0, crops: [] }; return new HandLandmarker(); }
  detect(src) {
    window.__hl.calls++;
    const c = src && src.hmvCrop || { x: 0, y: 0, w: 1, h: 1 }; if (window.__hl.crops.length < 40) window.__hl.crops.push([c.x, c.y, c.w, c.h].map(v => Math.round(v * 100) / 100).join(','));
    const inside = (window.__hands || []).filter(h => h.x >= c.x && h.x <= c.x + c.w && h.y >= c.y && h.y <= c.y + c.h).slice(0, window.__hl.options.numHands || 2);
    if (window.__slow) { const end = performance.now() + window.__slow; while (performance.now() < end) { /* giả lập máy chậm */ } }
    return { landmarks: inside.map(h => hand(h, (h.x - c.x) / c.w, (h.y - c.y) / c.h, 0.5625 / c.w, 1 / c.h)), worldLandmarks: window.__noWorld ? [] : inside.map(h => hand(h, 0, 0, 1, 1)) };
  }
  detectForVideo(video, timestamp) {
    window.__hl.calls++;
    if (window.__hand) return { landmarks: window.__hand.map(p => { const a = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9, z: 0 })); a[8] = { x: p.x, y: p.y, z: 0 }; return a; }), worldLandmarks: [] };
    const list = (window.__hands || []).slice(0, window.__hl.options.numHands || 2);
    return { landmarks: list.map(h => hand(h, h.x, h.y, 0.5625, 1)), worldLandmarks: list.map(h => hand(h, 0, 0, 1, 1)) };
  }
  close() { window.__hl.closed++; }
}
export class FaceLandmarker { static async createFromOptions() { throw new Error('not used in this test'); } }
