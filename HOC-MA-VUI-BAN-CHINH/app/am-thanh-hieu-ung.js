/* Keep result sounds on the audio context unlocked by the user's first tap.
 * New HTMLAudio elements may be blocked when a timer/camera produces a result. */
(function(win,doc){
 'use strict';
 var ctx=null,cache=new Map(),channels={},serial=0;
 var tracks=['assets/audio/tra-loi-dung.mp3','assets/audio/tra-loi-sai.mp3','assets/audio/win.mp3','assets/audio/cheer.mp3'];
 function context(){if(!ctx||ctx.state==='closed'){var C=win.AudioContext||win.webkitAudioContext;if(!C)return null;ctx=new C();}return ctx;}
 function load(source){
  if(cache.has(source))return cache.get(source);
  var bytes=typeof source==='string'?fetch(source).then(function(r){if(!r.ok)throw Error('Audio HTTP '+r.status);return r.arrayBuffer();}):source.arrayBuffer();
  var p=bytes.then(function(b){var c=context();if(!c)throw Error('Web Audio unavailable');return new Promise(function(ok,no){c.decodeAudioData(b,ok,no);});});
  cache.set(source,p);p.catch(function(){if(cache.get(source)===p)cache.delete(source);});return p;
 }
 function unlock(){
  try{var c=context();if(c){var p=c.resume();if(p&&p.catch)p.catch(function(){});var s=c.createBufferSource();s.buffer=c.createBuffer(1,1,c.sampleRate);s.connect(c.destination);s.start();}
   // Also unlock the existing synthesised fallback on this same gesture.
   if(typeof win.audioContext==='function')win.audioContext();
   tracks.forEach(function(t){load(t).catch(function(){});});
  }catch(e){}
 }
 function stop(channel){var s=channels[channel];if(!s)return;delete channels[channel];if(s.node){s.node.onended=null;try{s.node.stop();s.node.disconnect();s.gain.disconnect();}catch(e){}}}
 function play(channel,source,volume,done,failed){
  stop(channel);var s={id:++serial,source:typeof source==='string'?source:'custom',playing:false,node:null};channels[channel]=s;
  var c=context();if(!c){if(failed)failed();return;}
  load(source).then(function(buffer){
   if(channels[channel]!==s)return;
   if(c.state!=='running')throw Error('Audio needs a user gesture');
   var n=c.createBufferSource(),g=c.createGain();n.buffer=buffer;g.gain.value=Math.max(0,Math.min(1,Number(volume)||0));n.connect(g);g.connect(c.destination);s.node=n;s.gain=g;s.playing=true;
   n.onended=function(){if(channels[channel]!==s)return;stop(channel);if(done)done();};n.start();
  }).catch(function(){if(channels[channel]!==s)return;stop(channel);if(failed)failed();});
 }
 function state(channel){var s=channels[channel];return{playing:!!(s&&s.playing&&ctx&&ctx.state==='running'),source:s?s.source:'',context:ctx?ctx.state:'none'};}
 win.hmvEffectAudio={unlock:unlock,play:play,stop:stop,state:state};
 doc.addEventListener('pointerdown',unlock,{capture:true,passive:true});doc.addEventListener('keydown',unlock,true);
 win.addEventListener('pagehide',function(){Object.keys(channels).forEach(stop);});
 // Preserve uploaded wheel sounds, volume controls, the win -> cheer sequence,
 // and the existing cancellation generation used when leaving the wheel.
 var baseStop=win.audioStopAll,baseEffect=win.audioEffect;
 if(typeof baseStop==='function')win.audioStopAll=function(){stop('wheel');return baseStop.apply(this,arguments);};
 if(typeof baseEffect==='function')win.audioEffect=function(k,onComplete){
  if(k!=='win'&&k!=='cheer')return baseEffect.apply(this,arguments);
  if(!win.audioMasterEnabled)return;
  win.audioStopAll();var generation=win.audioGeneration,volume=win.audioLevel(k);
  if(volume<=0)return;
  var rec=win.audioCustom&&win.audioCustom[k],source=rec&&rec.blob?rec.blob:'assets/audio/'+k+'.mp3';
  play('wheel',source,volume,function(){if(generation===win.audioGeneration&&typeof onComplete==='function')onComplete();},function(){if(generation===win.audioGeneration)baseEffect(k,onComplete);});
 };
})(window,document);
