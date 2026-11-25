/* BAN-CHINH 2.45 · Kênh nối máy tính ↔ điện thoại cho trò "Chế độ giấy".
 *
 * Dùng Supabase Realtime (Broadcast, giao thức 1.0.0) qua WebSocket: tin nhắn chỉ được chuyển tiếp giữa các máy
 * đang mở cùng một phòng, không ghi vào cơ sở dữ liệu. Phòng có mã ngẫu nhiên 6 ký tự do máy tính tạo ra.
 * Nội dung gửi qua kênh: số thẻ + chữ A/B/C/D (điện thoại → máy tính); câu hỏi đang chiếu và số thẻ đã nhận
 * (máy tính → điện thoại). KHÔNG gửi tên học sinh.
 *
 * window.HMVRT.join(code, role, onMessage, onStatus) → { send(event, payload), close(), status() }
 */
(function (win) {
  'use strict';
  var CFG = {
    url: 'wss://hirullckrmbkhmlchsdd.supabase.co/realtime/v1/websocket',
    key: 'sb_publishable_qhky--zyK4iFaNgzl2BPhg_KHkGGD5v'
  };
  try { var o = JSON.parse(win.localStorage.getItem('hmv_cdg_rt') || 'null'); if (o && o.url && o.key) CFG = o; } catch (e) {}

  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() {
    var a = new Uint8Array(6), s = '';
    (win.crypto && win.crypto.getRandomValues ? win.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }));
    for (var i = 0; i < 6; i++) s += ALPHA[a[i] % ALPHA.length];
    return s;
  }
  function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }

  function join(code, role, onMessage, onStatus) {
    code = cleanCode(code);
    var topic = 'realtime:hmv-cdg-' + code, ws = null, ref = 0, joinRef = null, hb = 0, retry = 0, retryT = 0, closed = false, st = 'connecting', queue = [];
    var me = role + '-' + Math.random().toString(36).slice(2, 8);
    function set(s, why) { if (st === s && !why) return; st = s; try { onStatus && onStatus(s, why || ''); } catch (e) {} }
    function raw(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; }
    function open() {
      if (closed) return;
      set('connecting');
      try { ws = new win.WebSocket(CFG.url + '?apikey=' + encodeURIComponent(CFG.key) + '&vsn=1.0.0'); } catch (e) { schedule('Không mở được kết nối'); return; }
      ws.onopen = function () {
        joinRef = String(++ref);
        raw({ topic: topic, event: 'phx_join', payload: { config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, private: false } }, ref: joinRef, join_ref: joinRef });
        clearInterval(hb); hb = setInterval(function () { raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }); }, 20000);
      };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.topic !== topic) return;
        if (m.event === 'phx_reply' && m.ref === joinRef) {
          if (m.payload && m.payload.status === 'ok') { retry = 0; set('online'); var q = queue; queue = []; q.forEach(function (x) { send(x[0], x[1]); }); }
          else { set('error', (m.payload && m.payload.response && m.payload.response.reason) || 'Máy chủ từ chối kết nối'); }
          return;
        }
        if (m.event === 'broadcast' && m.payload && m.payload.type === 'broadcast') {
          var p = m.payload.payload || {}; if (p._from === me) return;
          try { onMessage && onMessage(m.payload.event, p); } catch (e) { if (win.console) console.error('[HMVRT]', e); }
        }
        if (m.event === 'phx_error' || m.event === 'phx_close') { try { ws.close(); } catch (e) {} }
      };
      ws.onclose = function () { clearInterval(hb); hb = 0; if (!closed) schedule(''); };
      ws.onerror = function () {};
    }
    function schedule(why) {
      if (closed) return;
      set('offline', why);
      clearTimeout(retryT); var d = [1000, 2000, 5000, 10000][Math.min(retry++, 3)]; retryT = setTimeout(open, d);
    }
    function send(event, payload) {
      payload = Object.assign({}, payload || {}, { _from: me, _t: Date.now() });
      if (st !== 'online') { if (queue.length < 20) queue.push([event, payload]); return false; }
      return raw({ topic: topic, event: 'broadcast', payload: { type: 'broadcast', event: event, payload: payload }, ref: String(++ref), join_ref: joinRef });
    }
    function close() { closed = true; clearTimeout(retryT); clearInterval(hb); try { if (ws && ws.readyState === 1) raw({ topic: topic, event: 'phx_leave', payload: {}, ref: String(++ref), join_ref: joinRef }); ws && ws.close(); } catch (e) {} set('closed'); }
    open();
    win.addEventListener('online', function () { if (!closed && st !== 'online' && (!ws || ws.readyState > 1)) { clearTimeout(retryT); retry = 0; open(); } });
    return { send: send, close: close, status: function () { return st; }, code: code, id: me };
  }

  win.HMVRT = { join: join, newCode: newCode, cleanCode: cleanCode, cfg: function () { return { url: CFG.url }; } };
})(window);
