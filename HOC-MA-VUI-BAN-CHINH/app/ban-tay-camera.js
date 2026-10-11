/* BAN-CHINH 1.5 · Camera AI cho trò "Bóng bay tri thức": tìm đầu ngón tay trỏ bằng MediaPipe Hand Landmarker.
 *
 * - Tìm bộ nhận diện trong ./vendor/mediapipe/ trước (chạy hoàn toàn offline); chưa có thì tải từ máy chủ chính thức
 *   của MediaPipe, service worker lưu lại để lần sau dùng offline.
 * - Nếu không nạp được bộ nhận diện bàn tay nhưng có bộ nhận diện khuôn mặt (đã dùng cho Quiz Nghiêng Đầu)
 *   thì dùng đầu mũi làm con trỏ thay cho ngón tay.
 * - Chỉ lấy tọa độ điểm; không lưu, không gửi khung hình nào ra ngoài.
 *
 * Giao tiếp: window.hmvHandCamera.start(stream, onFrame[, {numHands, full}]) → Promise<{source, mode}>; onFrame({points:[{x,y}], mode}).
 *            Với full:true, onFrame nhận thêm hands (21 điểm mỗi bàn tay) và world (tọa độ không gian).
 *            Với scan:true, dò trên ảnh tĩnh của từng khung hình, kèm 6 ô phóng to (tiles:false để bỏ) — dùng cho Bình chọn ngón tay.
 *            x, y trong khoảng 0..1 theo ảnh gốc của camera (chưa lật gương).
 */
(function () {
  'use strict';
  var VERSION = '0.10.14';
  var LOCAL = './vendor/mediapipe/';
  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSION + '/';
  var HAND_CDN = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  var FACE_CDN = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  var INDEX_TIP = 8, NOSE_TIP = 1, FRAME_MS = 50;

  var detector = null, mode = '', loadedFrom = '', loading = null;
  var video = null, running = false, timer = 0, failures = 0, session = 0;
  /* 2.0: tùy chọn cho "Bình chọn ngón tay" — nhận nhiều bàn tay và trả đủ 21 điểm mỗi bàn tay. */
  var wantHands = 2, wantFull = false, wantScan = false, scanTiles = true, scanSlow = false, avgMs = 0, scanCount = 0, frameCanvas = null, tileCanvas = null;

  function fail(message, cause) { var e = new Error(message); e.userMessage = message; e.cause = cause; return e; }
  function has(files) {
    return Promise.all(files.map(function (f) { return fetch(LOCAL + f, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok; }).catch(function () { return false; }); })).then(function (l) { return l.every(Boolean); });
  }
  function create(kind, base, modelUrl) {
    return import(base + 'vision_bundle.mjs').then(function (vision) {
      var Task = kind === 'hand' ? vision.HandLandmarker : vision.FaceLandmarker;
      if (!vision || !vision.FilesetResolver || !Task) throw new Error('Gói MediaPipe không đúng định dạng');
      return vision.FilesetResolver.forVisionTasks(base + 'wasm').then(function (fileset) {
        var opt = function (delegate) { var o = { baseOptions: { modelAssetPath: modelUrl, delegate: delegate }, runningMode: wantScan ? 'IMAGE' : 'VIDEO' }; if (kind === 'hand') { o.numHands = wantHands; if (wantFull) { o.minHandDetectionConfidence = 0.4; o.minHandPresenceConfidence = 0.4; o.minTrackingConfidence = 0.4; } } else o.numFaces = 2; return o; };
        return Task.createFromOptions(fileset, opt('GPU')).catch(function () { return Task.createFromOptions(fileset, opt('CPU')); });
      });
    });
  }
  function loadKind(kind) {
    var model = kind === 'hand' ? 'hand_landmarker.task' : 'face_landmarker.task', cdnModel = kind === 'hand' ? HAND_CDN : FACE_CDN;
    var fromCdn = function () { return create(kind, CDN, cdnModel).then(function (d) { loadedFrom = 'cdn'; return d; }); };
    return has(['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', model]).then(function (local) {
      if (!local) return fromCdn();
      return create(kind, LOCAL, LOCAL + model).then(function (d) { loadedFrom = 'local'; return d; }, fromCdn);
    });
  }
  function load() {
    if (detector) return Promise.resolve(detector);
    if (loading) return loading;
    loading = loadKind('hand').then(function (d) { mode = 'hand'; return d; }, function (handError) {
      /* Không có bộ nhận diện bàn tay: thử dùng khuôn mặt (đầu mũi) làm con trỏ. */
      return loadKind('face').then(function (d) { mode = 'face'; return d; }, function () {
        throw fail(navigator.onLine === false ? 'máy đang không có mạng và bộ nhận diện bàn tay chưa được tải về.' : 'không tải được bộ nhận diện bàn tay (cần Internet ở lần đầu, hoặc chạy tệp TAI-BO-NHAN-DIEN-CAMERA).', handError);
      });
    }).then(function (d) { detector = d; loading = null; return d; }, function (e) { loading = null; throw e; });
    return loading;
  }

  function tick(cb, mine) {
    if (!running || mine !== session) return;
    timer = setTimeout(function () { tick(cb, mine); }, FRAME_MS);
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    var result;
    try { result = detector.detectForVideo(video, performance.now()); failures = 0; }
    catch (e) { if (++failures === 30) { console.warn('[HOC-MA-VUI] Bộ nhận diện bàn tay lỗi liên tiếp:', e); cb({ points: [], mode: mode, error: true }); } return; }
    var list = mode === 'hand' ? (result && result.landmarks || []) : (result && result.faceLandmarks || []), tip = mode === 'hand' ? INDEX_TIP : NOSE_TIP, points = [];
    for (var i = 0; i < list.length; i++) { var p = list[i] && list[i][tip]; if (p && isFinite(p.x) && isFinite(p.y)) points.push({ x: p.x, y: p.y }); }
    if (wantFull && mode === 'hand') cb({ points: points, mode: mode, hands: list, world: result && result.worldLandmarks || [] }); else cb({ points: points, mode: mode });
  }

  /* ---- Chế độ quét ảnh tĩnh (dùng cho "Bình chọn ngón tay") ----
   * Mỗi lượt: chụp khung hình, dò bàn tay trên cả khung rồi dò lại trên 6 ô phóng to chồng mép nhau (3 cột × 2 hàng)
   * để bắt được cả những bàn tay nhỏ ở xa; gộp các bàn tay trùng nhau. Chậm hơn chế độ video nhưng thấy được nhiều tay hơn. */
  function collect(src, x, y, w, h, fw, fh, found) {
    src.hmvCrop = { x: x / fw, y: y / fh, w: w / fw, h: h / fh };
    var r = detector.detect(src), list = r && r.landmarks || [], wl = r && r.worldLandmarks || [];
    for (var i = 0; i < list.length; i++) {
      var raw = list[i]; if (!raw || raw.length < 21) continue;
      var lm = [], edge = 1, k;
      for (k = 0; k < 21; k++) { var p = raw[k]; lm.push({ x: (x + p.x * w) / fw, y: (y + p.y * h) / fh, z: p.z || 0 }); edge = Math.min(edge, p.x, 1 - p.x, p.y, 1 - p.y); }
      var cx = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5, cy = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
      var size = Math.hypot((lm[9].x - lm[0].x) * fw, (lm[9].y - lm[0].y) * fh), item = { lm: lm, world: wl[i] || null, cx: cx, cy: cy, size: size, edge: edge }, dup = -1;
      for (k = 0; k < found.length; k++) if (Math.hypot((found[k].cx - cx) * fw, (found[k].cy - cy) * fh) < Math.max(found[k].size, size) * 0.9) { dup = k; break; }
      if (dup < 0) found.push(item); else if (edge > found[dup].edge) found[dup] = item;
    }
  }
  function scanTick(cb, mine) {
    if (!running || mine !== session) return;
    var next = function (wait) { timer = setTimeout(function () { scanTick(cb, mine); }, wait); };
    if (!video || video.readyState < 2 || !video.videoWidth) return next(80);
    var t0 = performance.now(), found = [], fw, fh;
    try {
      var W = video.videoWidth, H = video.videoHeight, sc = Math.min(1, 1280 / W); fw = Math.round(W * sc); fh = Math.round(H * sc);
      if (!frameCanvas) { frameCanvas = document.createElement('canvas'); tileCanvas = document.createElement('canvas'); }
      if (frameCanvas.width !== fw || frameCanvas.height !== fh) { frameCanvas.width = fw; frameCanvas.height = fh; }
      frameCanvas.getContext('2d').drawImage(video, 0, 0, fw, fh);
      collect(frameCanvas, 0, 0, fw, fh, fw, fh, found);
      if (scanTiles) {
        var tw = Math.round(fw * 0.5), th = Math.round(fh * 0.6), g;
        if (tileCanvas.width !== tw || tileCanvas.height !== th) { tileCanvas.width = tw; tileCanvas.height = th; }
        g = tileCanvas.getContext('2d');
        for (var ry = 0; ry < 2; ry++) for (var cx = 0; cx < 3; cx++) { var x = Math.round((fw - tw) * cx / 2), y = Math.round((fh - th) * ry); g.drawImage(frameCanvas, x, y, tw, th, 0, 0, tw, th); collect(tileCanvas, x, y, tw, th, fw, fh, found); }
      }
      failures = 0;
    } catch (e) { if (++failures === 15) { console.warn('[HOC-MA-VUI] Bộ nhận diện bàn tay lỗi liên tiếp:', e); cb({ points: [], hands: [], world: [], mode: mode, error: true }); } return next(120); }
    /* Ba lượt đầu còn khởi động (nạp mô hình lên card đồ họa) nên không tính vào tốc độ trung bình. */
    var ms = performance.now() - t0; if (++scanCount > 3) avgMs = avgMs ? avgMs * 0.7 + ms * 0.3 : ms;
    /* Máy yếu: mỗi lượt quét quá lâu thì bỏ bước dò từng ô, chỉ dò cả khung. */
    if (scanTiles && scanCount > 6 && avgMs > 1100) { scanTiles = false; scanSlow = true; avgMs = 0; }
    cb({ points: found.map(function (f) { return { x: f.lm[INDEX_TIP].x, y: f.lm[INDEX_TIP].y }; }), hands: found.map(function (f) { return f.lm; }), world: found.map(function (f) { return f.world; }), mode: mode, aspect: fw / fh, ms: Math.round(ms), tiles: scanTiles, slow: scanSlow });
    next(30);
  }

  function start(stream, onFrame, options) {
    stop();
    wantHands = options && options.numHands > 0 ? Math.min(20, Math.round(options.numHands)) : 2; wantFull = !!(options && options.full);
    wantScan = !!(options && options.scan); scanTiles = !(options && options.tiles === false); scanSlow = false; avgMs = 0; scanCount = 0;
    var mine = ++session;
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.autoplay = true; video.srcObject = stream;
    var played = video.play(); if (played && played.catch) played.catch(function () {});
    return load().then(function () {
      if (mine !== session) throw fail('camera đã được tắt.');
      running = true; failures = 0;
      if (wantScan && mode === 'hand') scanTick(onFrame, mine); else tick(onFrame, mine);
      return { source: loadedFrom, mode: mode };
    }, function (e) { if (mine === session) stop(); throw e; });
  }
  /* Dừng vòng đo, ngắt video và giải phóng bộ nhận diện. */
  function stop() {
    session++; running = false;
    if (timer) clearTimeout(timer);
    timer = 0;
    if (video) { try { video.pause(); } catch (e) {} video.srcObject = null; video = null; }
    if (detector) { try { detector.close(); } catch (e) {} detector = null; mode = ''; loadedFrom = ''; }
  }

  window.hmvHandCamera = { start: start, stop: stop, isRunning: function () { return running; }, mode: function () { return mode; }, source: function () { return loadedFrom; }, version: VERSION };
})();
