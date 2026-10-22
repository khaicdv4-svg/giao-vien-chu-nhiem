/* BAN-CHINH 2.11 · Cài HỌC MÀ VUI như một ứng dụng (biểu tượng trên màn hình nền / màn hình chính, mở cửa sổ riêng).
 * - manifest.webmanifest + biểu tượng trong assets/icons/ giúp Chrome, Edge (máy tính, Android) hiện nút "Cài đặt ứng dụng"
 *   trên thanh địa chỉ; tệp này thêm nút cài ngay trong ứng dụng: trên thanh trên cùng và trong "Cài đặt & dữ liệu".
 * - iPhone / iPad (Safari) không có lệnh cài tự động → hiện hướng dẫn "Chia sẻ → Thêm vào MH chính".
 * - Dữ liệu không đổi chỗ: ứng dụng đã cài dùng chung bộ nhớ trình duyệt với trang web cùng địa chỉ.
 * Tệp được nạp trong <head> để không lỡ sự kiện beforeinstallprompt.
 */
(function (win) {
  'use strict';
  var doc = win.document; if (!doc) return;
  var S = { prompt: null, installed: false, justInstalled: false };
  var ua = String(win.navigator && win.navigator.userAgent || '');
  var IOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in doc);
  var ANDROID = /Android/i.test(ua), EDGE = /Edg\//.test(ua), FIREFOX = /Firefox\//.test(ua);
  var SAFARI_MAC = /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua) && !IOS;
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(win.location && win.location.hostname || ''));

  function standalone() {
    try { if (win.matchMedia && (win.matchMedia('(display-mode: standalone)').matches || win.matchMedia('(display-mode: window-controls-overlay)').matches || win.matchMedia('(display-mode: minimal-ui)').matches)) return true; } catch (e) {}
    return win.navigator && win.navigator.standalone === true;
  }
  function toast(m) { if (typeof win.showToast === 'function') win.showToast(m); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  win.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); S.prompt = e; paint(); });
  win.addEventListener('appinstalled', function () { S.prompt = null; S.installed = true; S.justInstalled = true; paint(); toast('Đã cài HỌC MÀ VUI. Mở từ biểu tượng trên màn hình nền.'); });

  function state() { return standalone() ? 'running' : S.installed ? 'installed' : S.prompt ? 'ready' : IOS ? 'ios' : 'manual'; }

  function install() {
    if (!S.prompt) { if (typeof win.openView === 'function') win.openView('settings'); setTimeout(function () { var c2 = doc.getElementById('hmvInstallCard'); if (c2 && c2.scrollIntoView) c2.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); return Promise.resolve('manual'); }
    var p = S.prompt; S.prompt = null;
    try { p.prompt(); } catch (e) { paint(); return Promise.resolve('error'); }
    return Promise.resolve(p.userChoice).then(function (r) {
      var out = r && r.outcome || 'dismissed';
      if (out === 'accepted') { S.installed = true; } else toast('Chưa cài. Khi cần, bấm lại nút “Cài ứng dụng”.');
      paint(); return out;
    }, function () { paint(); return 'error'; });
  }

  function steps() {
    if (IOS) return '<ol class="hmv-inst-steps"><li>Mở trang này bằng <b>Safari</b>.</li><li>Bấm nút <b>Chia sẻ</b> <span class="hmv-inst-ico" aria-hidden="true">⬆︎</span> ở thanh dưới (iPad: góc trên).</li><li>Kéo xuống, chọn <b>Thêm vào MH chính</b> (Add to Home Screen) → <b>Thêm</b>.</li></ol>';
    if (ANDROID) return '<ol class="hmv-inst-steps"><li>Mở trang này bằng <b>Chrome</b>.</li><li>Bấm nút <b>⋮</b> ở góc trên bên phải.</li><li>Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>) → <b>Cài đặt</b>.</li></ol>';
    if (FIREFOX || SAFARI_MAC) return '<p class="hmv-inst-note">Trình duyệt này chưa hỗ trợ cài trang web thành ứng dụng. Hãy mở cùng địa chỉ bằng <b>Google Chrome</b> hoặc <b>Microsoft Edge</b> rồi cài.</p>';
    if (EDGE) return '<ol class="hmv-inst-steps"><li>Bấm biểu tượng <b>Cài đặt ứng dụng</b> <span class="hmv-inst-ico" aria-hidden="true">⊞</span> ở cuối thanh địa chỉ, <i>hoặc</i> nút <b>…</b> → <b>Ứng dụng</b> → <b>Cài đặt trang web này dưới dạng ứng dụng</b>.</li><li>Bấm <b>Cài đặt</b>.</li></ol>';
    return '<ol class="hmv-inst-steps"><li>Bấm biểu tượng <b>màn hình có mũi tên</b> <span class="hmv-inst-ico" aria-hidden="true">🖥︎⬇</span> ở cuối thanh địa chỉ, <i>hoặc</i> nút <b>⋮</b> → <b>Truyền, lưu và chia sẻ</b> → <b>Cài đặt trang dưới dạng ứng dụng</b>.</li><li>Bấm <b>Cài đặt</b>. Biểu tượng HỌC MÀ VUI xuất hiện trên màn hình nền và trong menu Start.</li></ol>';
  }
  function cardHtml() {
    var st = state(), head = '<div class="hmv-inst-head"><img src="assets/icons/icon-192.png" alt="" width="56" height="56"><div><h3>📲 Cài HỌC MÀ VUI như một ứng dụng</h3><p>Có biểu tượng trên màn hình nền, mở bằng một cú bấm trong cửa sổ riêng (không thanh địa chỉ, rộng hơn khi chiếu lên bảng). Học sinh, câu hỏi và điểm vẫn giữ nguyên.</p></div></div>';
    var body;
    if (st === 'running') body = '<div class="hmv-inst-ok">✅ Thầy cô đang dùng HỌC MÀ VUI ở dạng ứng dụng đã cài.</div>';
    else if (st === 'installed') body = '<div class="hmv-inst-ok">✅ Đã cài xong. Lần sau mở HỌC MÀ VUI từ biểu tượng trên màn hình nền (hoặc menu Start).</div>';
    else if (st === 'ready') body = '<button type="button" class="btn color hmv-inst-btn" data-hmv-install>📲 Cài ứng dụng</button><p class="hmv-inst-note">Trình duyệt sẽ hỏi lại một lần, bấm <b>Cài đặt</b>.</p>';
    else body = steps() + '<p class="hmv-inst-note">Nếu không thấy lệnh cài: có thể máy đã cài rồi – hãy tìm biểu tượng HỌC MÀ VUI trên màn hình nền.</p>';
    if (LOCAL && st !== 'running') body += '<p class="hmv-inst-note">Đây là bản trên máy (mở bằng MO-HOC-MA-VUI.cmd): ứng dụng cài từ đây chỉ mở được khi máy chủ nội bộ đang chạy. Người khác nên cài từ địa chỉ web <b>giao-vien-chu-nhiem.vercel.app</b>.</p>';
    /* 2.13: mã QR dẫn tới trang hướng dẫn cài (cai-dat.html) – để cài trên điện thoại hoặc gửi cho người khác. */
    body += '<div class="hmv-inst-qr"><img src="assets/qr-cai-dat.svg" alt="Mã QR mở trang cài HỌC MÀ VUI" width="132" height="132"><div><b>📱 Cài trên điện thoại / gửi cho đồng nghiệp</b><p>Quét mã bằng Camera của điện thoại. Trang cài tự nhận ra iPhone, Android hay đang mở trong Zalo/Facebook và chỉ đúng từng bước.</p><div class="hmv-inst-links"><a class="btn soft" href="cai-dat.html" target="_blank" rel="noopener">Mở trang cài</a><a class="btn soft" href="assets/ap-phich-cai-dat.png" download="HOC-MA-VUI-ma-QR-cai-dat.png">🖨 Tải áp phích A4</a><button type="button" class="btn soft" data-hmv-copy-install>📋 Sao chép link</button></div></div></div>';
    return head + body;
  }
  function ensureCard() {
    var view = doc.getElementById('settings'); if (!view) return;
    var card = doc.getElementById('hmvInstallCard');
    if (!card) { card = doc.createElement('div'); card.id = 'hmvInstallCard'; card.className = 'card hmv-inst-card'; var title = view.querySelector('.page-title'); if (title && title.parentNode === view) view.insertBefore(card, title.nextSibling); else view.insertBefore(card, view.firstChild); }
    var html = cardHtml(); if (card.__html !== html) { card.innerHTML = html; card.__html = html; }
  }
  function ensureTopButton() {
    var bar = doc.querySelector('.topbar .actions'); if (!bar) return;
    var b = doc.getElementById('hmvInstallTop');
    var show = true;   /* luôn hiện nút "Cài ứng dụng": bấm vào sẽ cài ngay hoặc mở phần hướng dẫn/trạng thái cài */
    if (!b && show) { b = doc.createElement('button'); b.type = 'button'; b.id = 'hmvInstallTop'; b.className = 'icon-btn hmv-inst-top'; b.setAttribute('data-hmv-install', ''); b.title = 'Cài HỌC MÀ VUI thành ứng dụng trên máy này'; b.textContent = '📲 Cài ứng dụng'; bar.insertBefore(b, bar.firstChild); }
    if (b) b.hidden = !show;
    bar.classList.toggle('hmv-has-install', !!(b && show));   /* thanh trên dùng lưới cố định: thêm một cột cho nút cài */
  }
  function paint() { try { ensureTopButton(); ensureCard(); } catch (e) {} }

  var INSTALL_URL = 'https://giao-vien-chu-nhiem.vercel.app/cai-dat.html';
  doc.addEventListener('click', function (e) {
    var c = e.target && e.target.closest ? e.target.closest('[data-hmv-copy-install]') : null; if (!c) return;
    var ok = function () { toast('Đã sao chép link cài: ' + INSTALL_URL); };
    try { if (win.navigator.clipboard && win.navigator.clipboard.writeText) { win.navigator.clipboard.writeText(INSTALL_URL).then(ok, function () { toast(INSTALL_URL); }); return; } } catch (er) {}
    toast(INSTALL_URL);
  });
  doc.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-hmv-install]') : null; if (!t) return; e.preventDefault(); install(); });
  function boot() {
    paint();
    var v = doc.getElementById('settings');
    if (v && win.MutationObserver) new win.MutationObserver(function () { if (!doc.getElementById('hmvInstallCard')) paint(); }).observe(v, { childList: true });
    try { win.matchMedia('(display-mode: standalone)').addEventListener('change', paint); } catch (e) {}
    if (standalone()) doc.documentElement.classList.add('hmv-standalone');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();

  win.hmvInstall = { state: state, install: install, refresh: paint, _test: { ios: IOS, android: ANDROID, edge: EDGE } };
})(window);
