// ===== Utils =====
const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
const fmt = (n,d=2)=>{ const x=typeof n==='string'?Number(n):n; if(!isFinite(x)) return '-'; return x.toLocaleString(undefined,{maximumFractionDigits:d}); };
const nowTime = ()=> new Date().toLocaleTimeString();

// Sound
let pingLong = null, pingShort = null;
let soundEnabled = true;

function initAudio(){
  if(!pingLong){
    pingLong = new Audio('ping.wav');
    pingLong.volume = 0.9;
  }
  if(!pingShort){
    pingShort = new Audio('ping.wav');
    pingShort.volume = 0.7;
  }
  try{ pingShort.play().catch(()=>{}); pingShort.pause(); pingShort.currentTime=0; }catch{}
  try{ pingLong.play().catch(()=>{}); pingLong.pause(); pingLong.currentTime=0; }catch{}
  console.log('🔊 Звук инициализирован');
}
async function playSound(kind='long'){
  if(!soundEnabled) return;
  try{
    const a = kind==='short' ? pingShort : pingLong;
    a.currentTime = 0;
    const p = a.play(); if(p && p.catch) p.catch(()=>{});
  }catch(e){ console.warn('sound error:', e); }
}
function toggleSound(on){ soundEnabled = !!on; }
