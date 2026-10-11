// Giọng đọc GIẢ cho kiểm thử: ghi lại câu được đọc, không phát tiếng. window.__voices quyết định máy "có" giọng nào.
(() => {
  const VI = { name: 'Microsoft An - Vietnamese (Vietnam)', lang: 'vi-VN', voiceURI: 'Microsoft An - Vietnamese (Vietnam)', localService: true, default: false };
  const EN = { name: 'Microsoft David - English (United States)', lang: 'en-US', voiceURI: 'Microsoft David', localService: true, default: true };
  const mode = (() => { try { return sessionStorage.getItem('__fakeVoices') || window.__fakeVoiceMode || 'vi'; } catch (e) { return 'vi'; } })();
  window.__voices = mode === 'none' ? [EN] : mode === 'two' ? [EN, VI, { name: 'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)', lang: 'vi-VN', voiceURI: 'HoaiMy', localService: false }] : [EN, VI];
  window.__spoken = []; window.__speechMs = 500; window.__speechFail = '';
  let queue = [], cur = null, timer = 0; const listeners = [];
  function pump() {
    if (cur || !queue.length) { s.speaking = !!cur; s.pending = queue.length > 0; return; }
    cur = queue.shift(); s.speaking = true; s.pending = queue.length > 0;
    const u = cur;
    setTimeout(() => { if (cur !== u) return; if (window.__speechFail) { cur = null; s.speaking = false; u.onerror && u.onerror({ error: window.__speechFail }); pump(); return; } u.onstart && u.onstart({}); }, 10);
    timer = setTimeout(() => { if (cur !== u) return; cur = null; s.speaking = false; if (!window.__speechFail) { window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, lang: u.lang, at: Date.now() }); u.onend && u.onend({}); } pump(); }, window.__speechMs);
  }
  const s = {
    speaking: false, pending: false, paused: false,
    getVoices() { return window.__voices.slice(); },
    speak(u) { queue.push(u); pump(); },
    cancel() { const c = cur, q = queue; cur = null; queue = []; clearTimeout(timer); s.speaking = false; s.pending = false; window.__cancels = (window.__cancels || 0) + 1; if (c) setTimeout(() => c.onerror && c.onerror({ error: 'interrupted' }), 0); q.forEach(u => setTimeout(() => u.onerror && u.onerror({ error: 'canceled' }), 0)); },
    resume() {}, pause() {},
    addEventListener(n, f) { if (n === 'voiceschanged') listeners.push(f); },
    removeEventListener() {}
  };
  window.__setVoices = m => { window.__voices = m === 'none' ? [EN] : [EN, VI]; listeners.forEach(f => f({})); };
  function Utter(text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = ''; this.voice = null; }
  try { Object.defineProperty(window, 'speechSynthesis', { value: s, configurable: true }); } catch (e) { window.__fakeSpeechError = String(e); }
  window.SpeechSynthesisUtterance = Utter;
  // Ghi lại các đối tượng Audio để kiểm âm lượng nhạc nền
  window.__gains = []; try { const C = window.AudioContext || window.webkitAudioContext, cg = C.prototype.createGain; C.prototype.createGain = function () { const g = cg.apply(this, arguments); window.__gains.push(g); return g; }; } catch (e) {}
  const RealAudio = window.Audio; window.__audios = [];
  window.Audio = function (src) { const a = src === undefined ? new RealAudio() : new RealAudio(src); window.__audios.push(a); return a; }; window.Audio.prototype = RealAudio.prototype;
})();
