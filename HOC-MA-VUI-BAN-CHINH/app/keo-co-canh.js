/* BAN-CHINH 2.15 · Kéo co kiến thức: cảnh hai đội đang kéo co (thay cho dây + lá cờ ⚑).
 * window.hmvTugScene(s) trả về HTML của cảnh; s = { key, pos, winMoves, colors:[c0,c1], names:[n0,n1], phase, winner (0|1|-1), live }.
 * - Cả sợi dây và hai đội trượt sang trái/phải theo điểm (pos): dải đỏ giữa dây chạm vạch đội nào là đội đó thắng.
 * - Đang thi đấu: các bạn nhỏ gồng người kéo; đội vừa trả lời đúng giật mạnh một nhịp.
 * - Thắng: đội thắng nhảy lên, giơ tay ăn mừng, có cúp; đội thua chúi về phía trước. Hòa: hai đội đứng nghỉ.
 * Hình vẽ hoàn toàn bằng SVG trong tệp này (chạy offline), không dùng ảnh ngoài.
 */
(function (win) {
  'use strict';
  var last = { key: null, pos: 0 };
  var SKIN = ['#f6cfa8', '#e9b48a', '#f2c398'], HAIR = ['#2b1d16', '#3a281d', '#191414'], SPAN = 125;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function color(c, d) { return /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : d; }
  /* Một bạn nhỏ nhìn sang phải, chân ở gốc tọa độ, người ngả ra sau để kéo dây (dây ngang tầm y = -46). */
  function kid(x, i, shirt, mirror) {
    var skin = SKIN[i % 3], hair = HAIR[i % 3];
    return '<g class="tk-kid" transform="translate(' + x + ' 165)' + (mirror ? ' scale(-1 1)' : '') + '"><g class="tk-body" style="animation-delay:-' + (i * 0.23).toFixed(2) + 's">'
      + '<ellipse class="tk-shadow" cx="0" cy="2" rx="26" ry="4.5"/>'
      + '<path d="M-8 -36 L-22 -16 L-14 -1" class="tk-leg"/><path d="M-8 -36 L5 -18 L16 -1" class="tk-leg"/>'
      + '<ellipse cx="-11" cy="-1" rx="8" ry="4" class="tk-shoe"/><ellipse cx="20" cy="-1" rx="8" ry="4" class="tk-shoe"/>'
      + '<path d="M-14 -41 L-3 -33" class="tk-shorts"/>'
      + '<path d="M-8 -39 L-24 -69" stroke="' + shirt + '" class="tk-shirt"/>'
      + '<path d="M-22 -64 L3 -51 L24 -47" stroke="' + skin + '" class="tk-arm tk-pull"/><path d="M-20 -60 L7 -48 L31 -46" stroke="' + skin + '" class="tk-arm tk-pull"/>'
      + '<path d="M-24 -66 L-36 -93 M-21 -66 L-9 -95" stroke="' + skin + '" class="tk-arm tk-up"/>'
      + '<circle cx="-29" cy="-85" r="13.5" fill="' + skin + '"/>'
      + '<path d="M-42.5 -86 A13.5 13.5 0 0 1 -15.5 -86 Q-29 -93 -42.5 -86 Z" fill="' + hair + '"/>'
      + '<path d="M-42.4 -88 Q-29 -95 -15.6 -88" stroke="' + shirt + '" class="tk-band"/>'
      + '<circle cx="-21" cy="-86" r="2" class="tk-eye"/><path d="M-25 -78 L-18 -79" class="tk-mouth tk-grit"/><path d="M-26 -79 Q-21 -74 -17 -79" class="tk-mouth tk-smile"/>'
      + '</g></g>';
  }
  function team(side, c, name) {
    var l = side === 0, xs = l ? [150, 232, 314] : [850, 768, 686], out = '<g class="tk-team ' + (l ? 'l' : 'r') + '">';
    xs.forEach(function (x, i) { out += kid(x, i + (l ? 0 : 1), c, !l); });
    var cx = l ? 232 : 768;
    out += '<g class="tk-tag"><rect x="' + (cx - 78) + '" y="171" width="156" height="24" rx="12" fill="' + c + '"/><text x="' + cx + '" y="188" text-anchor="middle">' + esc(clip(name, 18)) + '</text></g>';
    out += '<text class="tk-cup" x="' + cx + '" y="44" text-anchor="middle">🏆</text>';
    return out + '</g>';
  }
  function scene(s) {
    s = s || {};
    var wm = Math.max(1, Number(s.winMoves) || 3), p = Math.max(-wm, Math.min(wm, Number(s.pos) || 0)), to = Math.round(p / wm * SPAN);
    var from = last.key === s.key ? last.pos : to; last = { key: s.key, pos: to };
    var c0 = color(s.colors && s.colors[0], '#2563eb'), c1 = color(s.colors && s.colors[1], '#f97316');
    var cls = ['tk-scene'];
    if (s.phase === 'won' && (s.winner === 0 || s.winner === 1)) cls.push('won', 'won-' + (s.winner === 0 ? 'l' : 'r'));
    else if (s.phase === 'ended') cls.push('rest');
    else if (to !== from) cls.push('pull-' + (to < from ? 'l' : 'r'));
    if (s.live) cls.push('live');
    var h = '<svg class="' + cls.join(' ') + '" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hai đội đang kéo co: '
      + esc(clip(s.names && s.names[0], 30)) + ' bên trái, ' + esc(clip(s.names && s.names[1], 30)) + ' bên phải' + (p ? '; dây đang nghiêng về ' + (p < 0 ? 'bên trái' : 'bên phải') + ' ' + Math.abs(p) + '/' + wm + ' bước' : '; dây đang ở giữa') + '">'
      + '<defs><linearGradient id="tkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#fef9c3"/></linearGradient>'
      + '<linearGradient id="tkGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86efac"/><stop offset="1" stop-color="#22c55e"/></linearGradient>'
      + '<pattern id="tkRope" width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="10" fill="#c98a4b"/><rect width="7" height="10" fill="#a8693a"/></pattern></defs>'
      + '<rect width="1000" height="200" fill="url(#tkSky)"/>'
      + '<circle cx="70" cy="34" r="20" fill="#fde047" opacity=".85"/><g class="tk-cloud"><ellipse cx="840" cy="34" rx="34" ry="11" fill="#fff"/><ellipse cx="862" cy="27" rx="20" ry="11" fill="#fff"/></g>'
      + '<rect y="150" width="1000" height="50" fill="url(#tkGrass)"/>'
      + '<path d="M500 150 V200" stroke="#fff" stroke-width="4" stroke-dasharray="8 6"/>'
      + '<g class="tk-goal"><path d="M' + (500 - SPAN) + ' 152 V200" stroke="' + c0 + '" stroke-width="5"/><path d="M' + (500 - SPAN) + ' 92 V152" stroke="#475569" stroke-width="3"/><path d="M' + (500 - SPAN) + ' 92 L' + (500 - SPAN - 26) + ' 100 L' + (500 - SPAN) + ' 108 Z" fill="' + c0 + '"/></g>'
      + '<g class="tk-goal"><path d="M' + (500 + SPAN) + ' 152 V200" stroke="' + c1 + '" stroke-width="5"/><path d="M' + (500 + SPAN) + ' 92 V152" stroke="#475569" stroke-width="3"/><path d="M' + (500 + SPAN) + ' 92 L' + (500 + SPAN + 26) + ' 100 L' + (500 + SPAN) + ' 108 Z" fill="' + c1 + '"/></g>'
      + '<g class="tk-move" style="--tk-from:' + from + 'px;--tk-to:' + to + 'px;transform:translateX(' + to + 'px)">'
      + '<g class="tk-rope"><path d="M96 119 H904" stroke="url(#tkRope)" stroke-width="9" stroke-linecap="round"/><path d="M96 119 q-14 4 -10 22 q4 14 -14 16" stroke="#a8693a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M904 119 q14 4 10 22 q-4 14 14 16" stroke="#a8693a" stroke-width="7" fill="none" stroke-linecap="round"/></g>'
      + team(0, c0, s.names && s.names[0]) + team(1, c1, s.names && s.names[1])
      + '<g class="tk-ribbon"><circle cx="500" cy="119" r="7" fill="#dc2626"/><path d="M495 122 L486 152 L497 146 Z M505 122 L514 152 L503 146 Z" fill="#ef4444"/></g>'
      + '</g></svg>';
    return h;
  }
  win.hmvTugScene = scene;
})(window);
