// ===== Индикаторы =====
const sum = (arr)=>arr.reduce((a,b)=>a+b,0);
const sma = (arr, p)=> arr.length<p ? null : sum(arr.slice(-p))/p;

function ema(arr,p){
  if(arr.length<p) return null;
  const k=2/(p+1); let prev=sum(arr.slice(0,p))/p;
  for(let i=p;i<arr.length;i++){ prev = arr[i]*k + prev*(1-k); }
  return prev;
}

function rsi(closes, period=14){
  if(closes.length<period+1) return null;
  let gains=0, losses=0;
  for(let i=1;i<=period;i++){ const d=closes[i]-closes[i-1]; if(d>=0) gains+=d; else losses-=d; }
  let avgG=gains/period, avgL=losses/period;
  for(let i=period+1;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    const g=d>0?d:0, l=d<0?-d:0;
    avgG=(avgG*(period-1)+g)/period; avgL=(avgL*(period-1)+l)/period;
  }
  if(avgL===0) return 100; const rs=avgG/avgL; return 100-(100/(1+rs));
}

function macd(closes, fast=12, slow=26, signal=9){
  if(closes.length<slow+signal) return null;
  const kf=2/(fast+1), ks=2/(slow+1);
  let ef=sum(closes.slice(0,slow))/slow, es=ef;
  const macdSeries=[];
  for(let i=slow;i<closes.length;i++){
    ef=closes[i]*kf + ef*(1-kf);
    es=closes[i]*ks + es*(1-ks);
    macdSeries.push(ef-es);
  }
  let prev=sum(macdSeries.slice(0,signal))/signal;
  const k=2/(signal+1);
  for(let i=signal;i<macdSeries.length;i++){ prev = macdSeries[i]*k + prev*(1-k); }
  const macdVal = macdSeries[macdSeries.length-1];
  const hist = macdVal - prev;
  return { macd: macdVal, signal: prev, hist };
}

function atr(kl, period=14){
  if(!kl || kl.length<period+1) return null;
  const trs=[];
  for(let i=1;i<kl.length;i++){
    const high=Number(kl[i][2]), low=Number(kl[i][3]), prevClose=Number(kl[i-1][4]);
    const tr=Math.max(high-low, Math.abs(high-prevClose), Math.abs(low-prevClose));
    trs.push(tr);
  }
  return sma(trs, period);
}

function vwap(kl){
  if(!kl || kl.length<2) return null;
  let pv=0, vol=0;
  for(const c of kl){
    const typical=(Number(c[2])+Number(c[3])+Number(c[4]))/3;
    const v=Number(c[5]);
    pv += typical*v; vol += v;
  }
  return vol===0? null : pv/vol;
}

const lastClosedIndex = (kl)=> kl.length-2;
const closes = (kl)=> kl.map(c=>Number(c[4]));
const volumes = (kl)=> kl.map(c=>Number(c[5]));
