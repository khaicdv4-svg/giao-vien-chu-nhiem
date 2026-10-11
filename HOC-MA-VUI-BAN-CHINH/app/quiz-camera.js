/* BAN-CHINH 1.1 · Quiz Nghiêng Đầu: đo góc nghiêng của đầu bằng MediaPipe Face Landmarker.
 *
 * - Tìm bộ nhận diện trong ./vendor/mediapipe/ trước (chạy hoàn toàn offline).
 * - Nếu chưa có, tải từ máy chủ chính thức của MediaPipe; service worker lưu lại để lần sau dùng offline.
 * - Chỉ tính góc giữa hai đuôi mắt (tư thế đầu), không dùng vị trí khuôn mặt trong khung hình.
 * - Không lưu, không gửi khung hình nào ra ngoài.
 *
 * Giao tiếp: window.hmvTiltCamera.start(stream, onFrame) → Promise<{source}>; onFrame({faces, roll}).
 *            roll (độ) > 0: người chơi nghiêng về bên PHẢI của mình; < 0: nghiêng TRÁI.
 */
(function () {
  'use strict';
  var VERSION = '0.10.14';
  var LOCAL = './vendor/mediapipe/';
  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSION + '/';
  var MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  var RIGHT_EYE_OUTER = 33, LEFT_EYE_OUTER = 263;
  var FRAME_MS = 66;

  var landmarker = null, loadedFrom = '', loading = null;
  var video = null, running = false, timer = 0, failures = 0, session = 0;

  function fail(message, cause) { var e = new Error(message); e.userMessage = message; e.cause = cause; return e; }

  function localAvailable() {
    var files = ['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', 'face_landmarker.task'];
    return Promise.all(files.map(function (f) {
      return fetch(LOCAL + f, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok; }).catch(function () { return false; });
    })).then(function (list) { return list.every(Boolean); });
  }

  function create(base, modelUrl) {
    return import(base + 'vision_bundle.mjs').then(function (vision) {
      if (!vision || !vision.FilesetResolver || !vision.FaceLandmarker) throw new Error('Gói MediaPipe không đúng định dạng');
      return vision.FilesetResolver.forVisionTasks(base + 'wasm').then(function (fileset) {
        var options = function (delegate) { return { baseOptions: { modelAssetPath: modelUrl, delegate: delegate }, runningMode: 'VIDEO', numFaces: 2 }; };
        return vision.FaceLandmarker.createFromOptions(fileset, options('GPU')).catch(function () {
          return vision.FaceLandmarker.createFromOptions(fileset, options('CPU'));
        });
      });
    });
  }

  function load() {
    if (landmarker) return Promise.resolve(landmarker);
    if (loading) return loading;
    var fromCdn = function () {
      return create(CDN, MODEL_CDN).then(function (lm) { loadedFrom = 'cdn'; return lm; }).catch(function (e) {
        throw fail(navigator.onLine === false
          ? 'máy đang không có mạng và bộ nhận diện khuôn mặt chưa được tải về.'
          : 'không tải được bộ nhận diện khuôn mặt (cần Internet ở lần đầu, hoặc chạy tệp TAI-BO-NHAN-DIEN-CAMERA).', e);
      });
    };
    loading = localAvailable().then(function (hasLocal) {
      if (!hasLocal) return fromCdn();
      /* Có tệp trong máy nhưng nạp lỗi (tệp hỏng) thì thử nguồn chính thức trên mạng. */
      return create(LOCAL, LOCAL + 'face_landmarker.task').then(function (lm) { loadedFrom = 'local'; return lm; }, fromCdn);
    }).then(function (lm) { landmarker = lm; loading = null; return lm; }, function (e) { loading = null; throw e; });
    return loading;
  }

  function rollOf(face, w, h) {
    var a = face[RIGHT_EYE_OUTER], b = face[LEFT_EYE_OUTER];
    if (!a || !b) return null;
    /* Trong ảnh gốc (chưa lật gương), mắt trái của người chơi nằm bên phải ảnh. Nghiêng về vai trái làm mắt trái hạ xuống → góc dương. Đổi dấu để PHẢI là dương. */
    return -Math.atan2((b.y - a.y) * h, (b.x - a.x) * w) * 180 / Math.PI;
  }

  /* 1.1: dùng setTimeout thay cho requestAnimationFrame để vòng đo không bị đứng khi cửa sổ bị che (vd. đang trình chiếu màn hình mở rộng). */
  function tick(cb, mine) {
    if (!running || mine !== session) return;
    timer = setTimeout(function () { tick(cb, mine); }, FRAME_MS);
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    var result;
    try { result = landmarker.detectForVideo(video, performance.now()); failures = 0; }
    catch (e) { if (++failures === 30) { console.warn('[HOC-MA-VUI] Bộ nhận diện khuôn mặt lỗi liên tiếp:', e); cb({ faces: 0, roll: 0, error: true }); } return; }
    var faces = result && result.faceLandmarks || [], roll = 0;
    if (faces.length === 1) { var r = rollOf(faces[0], video.videoWidth, video.videoHeight); if (r === null) { cb({ faces: 0, roll: 0 }); return; } roll = r; }
    cb({ faces: faces.length, roll: roll });
  }

  function start(stream, onFrame) {
    stop();
    var mine = ++session;
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.autoplay = true; video.srcObject = stream;
    var played = video.play(); if (played && played.catch) played.catch(function () {});
    return load().then(function () {
      if (mine !== session) throw fail('camera đã được tắt.');
      running = true; failures = 0;
      tick(onFrame, mine);
      return { source: loadedFrom };
    }, function (e) { if (mine === session) stop(); throw e; });
  }

  /* Dừng vòng lặp, ngắt video và giải phóng bộ nhận diện. */
  function stop() {
    session++;
    running = false;
    if (timer) clearTimeout(timer);
    timer = 0;
    if (video) { try { video.pause(); } catch (e) {} video.srcObject = null; video = null; }
    if (landmarker) { try { landmarker.close(); } catch (e) {} landmarker = null; loadedFrom = ''; }
  }

  window.hmvTiltCamera = { start: start, stop: stop, isRunning: function () { return running; }, source: function () { return loadedFrom; }, hasLocal: localAvailable, rollOf: rollOf, version: VERSION };
})();
