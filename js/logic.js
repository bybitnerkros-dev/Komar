// ===== KOMAR — Logic Engine (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ: BOS с EMA) =====

// ---- НАСТРОЙКИ ----
const Settings = {
  minVolumeM: 50,
  exchanges: { binance:true, bybit:true },

  moduleTimeframes:{
    smartpump:'5m',
    divergence: '15m',
    pumpdump: '5m',
    flow: '5m',
    bos: '5m',
    disbalance: '5m'
  },

  activeModules:{
    smartpump:true,
    divergence: true,
    pumpdump: true,
    flow: false,
    bos: false,
    disbalance: false
  },

  sensitivity:{
    smartpump:{minOIPct:0.02,minPricePct:0.02},
    // Pump/Dump (УПРОЩЕНО)
    volumeMult: 2.8, 
    volumePeriod: 20, 
    bodyMinPerc: 0.35,
    pumpMinOIPct: 0.05,
    pumpMinCVDUsd: 500000, 

    // Divergence
    div: {
      rsiPeriod:9,
      rsiDiffMin:4,
    },

    flow:{
      minOIPct:0.05,
      minCVDUsd:500000,
      flowPreset:'mid'
    },

    disbalance:{
      minOIPct:0.10,
      minCVDUsd:1000000,
      disbalancePreset:'mid'
    },

    bos:{
      bosPeriod:15,
      bosVolumeMult:3.0,
      bosEmaPeriod: 20, // <-- NEW: Настройка периода EMA
      bosPreset:'strong'
    },

    sound:true,
    cooldownSec:1800
  }
};

// ---- Глобал ----
let _intervalId=null, _running=false;
let _seenCycle = new Set();
const _lastSignalTs = Object.create(null);

// NEW: Хранилище для отслеживания частоты SmartPump за 24ч
const _smartPumpHistory24h = Object.create(null);

// ---- TF (Используется в API.js) ----
function tfFor(exchange, tf){
  if(exchange==='bybit'){
    if(tf==='5m') return '5';
    if(tf==='15m') return '15';
    if(tf==='1h') return '60';
    if(tf==='4h') return '240';
  }
  return tf;
}

function tfToMinutes(tf){
  if(tf==='5m') return 5;
  if(tf==='15m') return 15;
  if(tf==='1h') return 60;
  if(tf==='4h') return 240;
  return 5;
}

// ---- Volume filter ----
async function getSymbolsByVolume(){
  const minQuote = Settings.minVolumeM * 1e6;
  const out={binance:[],bybit:[]};

  if(Settings.exchanges.binance){
    try{
      const arr = await API.binance24h();
      out.binance = arr
        .filter(x=>x.symbol.endsWith('USDT'))
        .filter(x=>Number(x.quoteVolume)>=minQuote)
        .sort((a,b)=>b.quoteVolume-a.quoteVolume)
        .map(x=>x.symbol);
    }catch{}
  }

  if(Settings.exchanges.bybit){
    try{
      const arr = await API.bybitTickers();
      out.bybit = arr
        .filter(x=>String(x.symbol).endsWith('USDT'))
        .filter(x=>Number(x.turnover24h||0)>=minQuote)
        .sort((a,b)=>b.turnover24h-a.turnover24h)
        .map(x=>x.symbol);
    }catch{}
  }

  return out;
}

// ===================
// МОДУЛИ АНАЛИТИКИ
// ===================

function analyzeDisbalanceSmart(kl, oiVal, cvdVal){
  if(!kl || kl.length<4 || oiVal==null || cvdVal==null) return null;
  const idx = lastClosedIndex(kl);
  const close = Number(kl[idx][4]);
  const prevClose = Number(kl[idx-1][4]);
  const minOIPct = Settings.sensitivity.disbalance.minOIPct;
  const minCVDUsd = Settings.sensitivity.disbalance.minCVDUsd;

  if(close<prevClose && cvdVal>=minCVDUsd && oiVal>=minOIPct)
    return {side:'Лонг',kind:'Дисбаланс: Лонг-Сквиз',price:close,detail:{oi:oiVal,cvd:cvdVal}};

  if(close>prevClose && cvdVal<=-minCVDUsd && oiVal<=-minOIPct)
    return {side:'Шорт',kind:'Дисбаланс: Шорт-Сквиз',price:close,detail:{oi:oiVal,cvd:cvdVal}};

  return null;
}

function analyzeBOSSmart(kl, oiVal, cvdVal){
  // --- НОВЫЕ ПАРАМЕТРЫ ---
  const MIN_OI_BOS = 0.01;      // Мин. % изменения OI для подтверждения
  const BOS_EMA_PERIOD = Settings.sensitivity.bos.bosEmaPeriod || 20; // NEW: Берем из настроек
  // -----------------------
  
  if (oiVal == null) return null; 
  const period = Settings.sensitivity.bos.bosPeriod||15;
  const volReq = Settings.sensitivity.bos.bosVolumeMult||3;
  if(!kl || kl.length<period+BOS_EMA_PERIOD) return null; // Увеличиваем требование к длине данных

  const idx = lastClosedIndex(kl);
  const close = Number(kl[idx][4]);
  
  // 1. Расчет EMA
  const cls = closes(kl);
  // Используем closes(kl) для расчета EMA
  const emaValue = ema(cls, BOS_EMA_PERIOD);
  if (emaValue == null) return null; 

  // 2. Определение экстремумов
  const bosSlice = kl.slice(idx - period, idx);
  const highs = bosSlice.map(c=>+c[2]);
  const lows  = bosSlice.map(c=>+c[3]);

  const bosHigh=Math.max(...highs);
  const bosLow=Math.min(...lows);

  // 3. Проверка объема
  const vols=volumes(kl);
  const vAvg=sma(vols.slice(0, idx),20);
  const vLast = vols[idx];
  const volMult = vLast / (vAvg || 1);
  
  if(vLast < vAvg * volReq) return null; // Нет аномального объема

  let side = null, scoreClass = 's1';

  // --- ЛОГИКА BOS (Лонг: Пробой High) ---
  if(close > bosHigh){
    const isOiConfirmed = oiVal >= MIN_OI_BOS;
    const isEmaConfirmed = close > emaValue; // NEW: Цена выше EMA
    
    if(isOiConfirmed && isEmaConfirmed){
      side = 'Лонг'; scoreClass = 's3';
    } else if (isOiConfirmed || isEmaConfirmed) {
      side = 'Лонг'; scoreClass = 's2';
    } else {
      side = 'Лонг'; scoreClass = 's1'; 
    }
  } 
  
  // --- ЛОГИКА BOS (Шорт: Пробой Low) ---
  else if(close < bosLow){
    const isOiConfirmed = oiVal <= -MIN_OI_BOS;
    const isEmaConfirmed = close < emaValue; // NEW: Цена ниже EMA

    if(isOiConfirmed && isEmaConfirmed){
      side = 'Шорт'; scoreClass = 's3';
    } else if (isOiConfirmed || isEmaConfirmed) {
      side = 'Шорт'; scoreClass = 's2';
    } else {
      side = 'Шорт'; scoreClass = 's1'; 
    }
  }

  if(side){
    return {
      side: side,
      kind: `${side==='Лонг'?'Bullish':'Bearish'} BOS (${period})`,
      price: close,
      detail: {
        oi: oiVal,
        ema: emaValue, // NEW: Добавляем EMA
        emaPeriod: BOS_EMA_PERIOD, // NEW: Добавляем период EMA
        bosPeriod: period,
        volMult: volMult,
        scoreClass: scoreClass
      }
    };
  }
  
  return null;
}

function analyzeFlowSmart(kl, oiVal, cvdVal){
  if (oiVal == null || cvdVal == null) return null;
  const vols = volumes(kl);
  const idx = lastClosedIndex(kl);
  const vAvg=sma(vols.slice(0, idx),20);
  const vLast=vols[idx];
  const volRatio=vLast/(vAvg||1);
  const close = +kl[idx][4];

  const minOIPct=Settings.sensitivity.flow.minOIPct;
  const minCVD=Settings.sensitivity.flow.minCVDUsd;

  if(volRatio>=2 && cvdVal>=minCVD&&oiVal>=minOIPct)
    return {side:'Лонг',kind:'Flow: Agg Buy',price:close,detail:{volMult:volRatio,oi:oiVal,cvd:cvdVal}};

  if(volRatio>=2 && cvdVal<=-minCVD&&oiVal<=-minOIPct)
    return {side:'Шорт',kind:'Flow: Agg Sell',price:close,detail:{volMult:volRatio,oi:oiVal,cvd:cvdVal}};

  return null;
}

// ---- Divergence (ОЧИЩЕННАЯ ЛОГИКА) ----
function analyzeDivergenceSmart(kl, oiVal, cvdVal){
  if(!kl || kl.length<50 || oiVal==null || cvdVal==null) return null;
  const idx = lastClosedIndex(kl);
  const cls = closes(kl);

  const rsiPeriod = Settings.sensitivity.div.rsiPeriod || 9;
  
  // RSI на текущей закрытой свече
  const rNow = rsi(cls, rsiPeriod);
  
  // RSI 5 свечей назад (для сравнения)
  const rPrev = rsi(cls.slice(0,idx-4), rsiPeriod); 
  
  if(rNow==null || rPrev==null) return null;

  const priceNow = +kl[idx][4];
  const pricePrev= +kl[idx-5][4];
  const minDiff = Settings.sensitivity.div.rsiDiffMin || 4;

  let side=null, baseReason='';
  if(priceNow < pricePrev && rNow > rPrev + minDiff){ side='Лонг'; baseReason='Дивергенция: Bullish'; }
  if(priceNow > pricePrev && rNow < rPrev - minDiff){ side='Шорт'; baseReason='Дивергенция: Bearish'; }
  if(!side) return null;

  // Конфирмация
  const isCvdOk = (side === 'Лонг' && cvdVal <= 0) || (side === 'Шорт' && cvdVal >= 0);
  const isOiOk  = (side === 'Лонг' && oiVal <= 0) || (side === 'Шорт' && oiVal >= 0);

  let scoreClass='s1', reason=baseReason;
  if(isCvdOk || isOiOk) { 
    scoreClass='s2'; 
    if(isCvdOk && isOiOk) {
      scoreClass='s3'; 
      reason+=' [CVD+OI Confirmed]';
    } else if(isCvdOk){
      reason+=' [CVD Confirmed]';
    } else if(isOiOk){
      reason+=' [OI Confirmed]';
    }
  }

  // Для Divergence также проверяем объем сигнальной свечи относительно среднего
  const vols = volumes(kl);
  const vAvg=sma(vols.slice(0, idx),20);
  const vLast=vols[idx];
  const volMult = vLast / (vAvg || 1);

  return { 
    side,
    reason,
    price:priceNow,
    detail:{
      rNow,
      rPrev,
      oi:oiVal,
      cvd:cvdVal,
      volMult,
      scoreClass
    } 
  };
}

// ---- Pump/Dump (УПРОЩЕННАЯ ЛОГИКА: Только OI + CVD + Цена) ----

function analyzeSmartPump(kl, oiVal, cvdVal){
  if(!kl || oiVal==null) return null;
  const cfg = Settings.sensitivity.smartpump || {};
  const minOIPct = cfg.minOIPct||0.02;
  const minPricePct = cfg.minPricePct||0.02;
  const idx = lastClosedIndex(kl);
  const open = Number(kl[idx][1]);
  const close = Number(kl[idx][4]);
  const priceChangePct = ((close-open)/open)*100;

  let hit = null;

  if(oiVal>=minOIPct && priceChangePct>=minPricePct){
    hit = {side:'Лонг',kind:'⚡ Smart Pump: Buy',price:close,detail:{oi:oiVal,priceChangePct,cvd:cvdVal}};
  }
  if(oiVal<=-minOIPct && priceChangePct<=-minPricePct){
    hit = {side:'Шорт',kind:'⚡ Smart Pump: Sell',price:close,detail:{oi:oiVal,priceChangePct,cvd:cvdVal}};
  }
  
  if(hit){
    return {...hit, detail:{...hit.detail, isSmartPump: true}};
  }
  return null;
}

function analyzePumpDumpSmart(kl, oiVal, cvdVal){
  if(!kl || oiVal==null || cvdVal==null) return null;
  
  // 1. Пороги из настроек
  const minOIPct = Settings.sensitivity.pumpMinOIPct || 0.05;
  const minCVDUsd = Settings.sensitivity.pumpMinCVDUsd || 500000;
  
  const idx = lastClosedIndex(kl);
  const open  = +kl[idx][1];
  const close = +kl[idx][4];

  // Расчет % изменения цены для вывода
  const priceChangePct = ((close - open) / open) * 100; 

  // 2. Условия PUMP/DUMP (OI + CVD и Направление цены)
  
  // PUMP (Лонг): Цена выросла И OI >= порог И CVD >= порог
  const isPump = close > open && oiVal >= minOIPct && cvdVal >= minCVDUsd;
  
  // DUMP (Шорт): Цена упала И OI <= -порог И CVD <= -порог
  const isDump = close < open && oiVal <= -minOIPct && cvdVal <= -minCVDUsd;

  if(isPump){
    return {
      side:'Лонг',
      kind:'🚀 PUMP (OI + CVD)',
      price:close,
      detail:{
          oi:oiVal, 
          cvd:cvdVal, 
          priceChangePct: priceChangePct
      }
    };
  }

  if(isDump){
    return {
      side:'Шорт',
      kind:'📉 DUMP (OI + CVD)',
      price:close,
      detail:{
          oi:oiVal, 
          cvd:cvdVal, 
          priceChangePct: priceChangePct
      }
    };
  }

  return null;
}


// ===================
// АНАЛИЗ СИМВОЛА (analyzeOne вынесен на глобальный уровень)
// ===================
async function analyzeOne(exchange, symbol){ 
  try {
    const limit = 200;
    const reqTFs = new Set();
    const activeModules = Settings.activeModules;

    // Сбор необходимых ТФ
    for(const m in activeModules)
      if(activeModules[m])
        reqTFs.add(Settings.moduleTimeframes[m]);

    const klines={};
    for(const tf of reqTFs){
      const klineTf = tfFor(exchange, tf);
      klines[tf] = exchange==='binance'
        ? await API.binanceKlines(symbol, klineTf, limit)
        : await API.bybitKlines(symbol, klineTf, limit);
    }
    
    // Получение OI/CVD (берем ТФ по умолчанию для скорости)
    const baseTf = Settings.moduleTimeframes.pumpdump || '5m';
    
    // Используем API.oiDelta и API.cvdDelta 
    const oiVal = await API.oiDelta(exchange, symbol, baseTf);
    const cvdVal = await API.cvdDelta(exchange, symbol, baseTf);

    const pipeline = [
      ['pumpdump', analyzePumpDumpSmart],
      ['smartpump', analyzeSmartPump],
      ['divergence', analyzeDivergenceSmart],
      ['flow', analyzeFlowSmart],
      ['disbalance', analyzeDisbalanceSmart],
      ['bos', analyzeBOSSmart]
    ];

    for(const [key, fn] of pipeline){
      if(!activeModules[key]) continue;
      const tf = Settings.moduleTimeframes[key];
      const kl = klines[tf];
      if(!kl || kl.length<50) continue;

      const hit = fn(kl,oiVal,cvdVal); 
      
      if(hit){
        // --- Логика для SmartPump Count ---
        if (key === 'smartpump' && hit.detail.isSmartPump) {
            const currentTs = Date.now();
            const totalCount = recordSmartPumpSignal(exchange, symbol, currentTs); 
            hit.detail.smartPumpCount24h = totalCount;
            if(!hit.detail.scoreClass) hit.detail.scoreClass = totalCount>=3 ? 's3' : totalCount>=2 ? 's2' : 's1';
        }
        // ------------------------------------------

        return {
          ...hit,
          symbol,
          exchange,
          detail:{...hit.detail, signalTf:tf}
        };
      }
    }

    return null;
    
  } catch(e){
    // console.warn("analyzeOne error:", symbol, e.message); 
    return null;
  }
}

// ===================
// ЦИКЛ
// ===================
function canSend(key){
  const cd=Settings.sensitivity.cooldownSec*1000;
  const now=Date.now();
  const last=_lastSignalTs[key]||0;
  if(now-last<cd) return false;
  _lastSignalTs[key]=now;
  return true;
}

async function runScanCycle(onSignal,onStatus){
  _seenCycle.clear();
  const lists = await getSymbolsByVolume();
  onStatus?.(`Объём: Binance ${lists.binance.length}, Bybit ${lists.bybit.length}`);

  const plan=[];
  const cap=150;
  if(Settings.exchanges.binance) plan.push(...lists.binance.slice(0,cap).map(s=>['binance',s]));
  if(Settings.exchanges.bybit)   plan.push(...lists.bybit.slice(0,cap).map(s=>['bybit',s]));

  for(const [ex,sym] of plan){
    if(!_running) break;
    const sig = await analyzeOne(ex,sym);
    if(sig){
      const key = `${sig.exchange}|${sig.symbol}|${sig.side}|${sig.detail.signalTf}|${sig.kind || sig.reason}`;
      if(!_seenCycle.has(key)&&canSend(key)){
        _seenCycle.add(key);
        onSignal?.(sig);
        playSound(sig.side==='Лонг'?'long':'short');
      }
    }
    await sleep(110);
  }
}

// УДАЛЯЕТ старые метки времени (старше 24 часов) и ВОЗВРАЩАЕТ текущее количество
function getSmartPumpCount(exchange, symbol, nowTs) {
    const key = `${exchange}|${symbol}`;
    const history = _smartPumpHistory24h[key] || [];
    
    const cutoff = nowTs - 24 * 60 * 60 * 1000;
    
    // Фильтруем историю, оставляя только метки времени за последние 24 часа
    const freshHistory = history.filter(ts => ts > cutoff);
    
    // Обновляем хранилище и возвращаем количество
    _smartPumpHistory24h[key] = freshHistory;
    
    return freshHistory.length;
}

// ДОБАВЛЯЕТ новую метку времени в историю
function recordSmartPumpSignal(exchange, symbol, ts) {
    const key = `${exchange}|${symbol}`;
    // Сначала убеждаемся, что история актуальна (удаляем старые записи)
    const count = getSmartPumpCount(exchange, symbol, ts); 
    // Добавляем текущую метку времени
    _smartPumpHistory24h[key].push(ts);
    // Новое количество = (старое актуальное количество) + 1
    return count + 1; 
}

function startLoop(cb){
  if(_running) return;
  _running=true;
  cb?.onStatus?.('Старт...');
  // toggleSound и initAudio должны быть глобальными функциями из utils.js
  toggleSound(Settings.sensitivity.sound);
  initAudio();

  const tick=async()=>{
    if(!_running) return;
    try{
      await runScanCycle(cb?.onSignal,cb?.onStatus);
      cb?.onStatus?.('Цикл завершён, пауза 60с');
    }catch(e){
      cb?.onStatus?.('Ошибка: '+e.message);
    }
  };

  tick();
  _intervalId=setInterval(()=>{if(_running)tick();},60000);
}

function stopLoop(cb){
  _running=false;
  if(_intervalId) clearInterval(_intervalId);
  cb?.onStatus?.('Остановлено');
}