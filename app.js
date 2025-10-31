// ===== React App (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ: BOS с EMA) =====
const { useEffect, useState } = React;

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString();
}

// Utils
function fmt(n, d = 2) {
  if (n == null || Number.isNaN(+n)) return '—';
  return Number(n).toFixed(d);
}
function getColorClass(value) {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-300';
}

// Tooltip
function InfoTooltip({ text }) {
  let goldColor = '#ffd700';
  let panelBg = '#0a0a0a';
  try {
    goldColor = getComputedStyle(document.documentElement).getPropertyValue('--gold') || goldColor;
    panelBg = getComputedStyle(document.documentElement).getPropertyValue('--panel') || panelBg;
  } catch(e){}
  
  return (
    <span 
      className="relative group cursor-pointer text-gray-400 ml-1" 
      style={{ display: 'inline-block', lineHeight: '1', verticalAlign: 'middle', color: goldColor }}
      title=""
    >
      <span className="text-xs font-bold">ⓘ</span>
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 p-2 w-72 rounded-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 shadow-lg"
        style={{ 
          whiteSpace: 'normal', 
          backgroundColor: panelBg,
          color: goldColor,
          border: `1px solid ${goldColor}`,
          boxShadow: `0 0 8px rgba(255, 215, 0, 0.7)`,
        }}
      >
        {text}
      </div>
    </span>
  );
}

// --- Preset Definitions (Обновлен BOS) ---
const pumpPresets = [
  { name: 'early', label: '🟢 Ранний', color: '#00ff41', oi: 0.02, cvd: 150000 },
  { name: 'mid', label: '🟠 Средний', color: '#ffd700', oi: 0.05, cvd: 500000 },
  { name: 'strong', label: '🔴 Сильный', color: '#ff5555', oi: 0.10, cvd: 1000000 }
];
const spPresets = [
  { name: 'early', label: '🟢 Ранний', color: '#00ff41', oi: 0.01, price: 0.01 },
  { name: 'mid', label: '🟠 Средний', color: '#ffd700', oi: 0.02, price: 0.02 },
  { name: 'strong', label: '🔴 Сильный', color: '#ff5555', oi: 0.05, price: 0.05 }
];
const flowPresets = [
  { name: 'early', label: '💧 Лёгкий', color: '#87cefa', oi: 0.01, cvd: 100000 },
  { name: 'mid', label: '🌊 Средний', color: '#ffd700', oi: 0.05, cvd: 500000 },
  { name: 'strong', label: '🚨 Сильный', color: '#ff5555', oi: 0.15, cvd: 1500000 }
];
const disbalancePresets = [
  { name: 'early', label: '💡 Лёгкий', color: '#87cefa', oi: 0.05, cvd: 200000 },
  { name: 'mid', label: '⚖️ Средний', color: '#ffd700', oi: 0.10, cvd: 500000 },
  { name: 'strong', label: '💥 Сильный', color: '#ff5555', oi: 0.25, cvd: 1500000 }
];
const bosPresets = [
  // NEW: Добавлен bosEmaPeriod
  { name: 'early', label: '🔪 Чувствительный (3 св.)', color: '#87cefa', period: 3, volMult: 1.5, emaPeriod: 10 },
  { name: 'mid', label: '📈 Стандарт (5 св.)', color: '#ffd700', period: 5, volMult: 2.0, emaPeriod: 20 },
  { name: 'strong', label: '🏰 Строгий (10 св.)', color: '#ff5555', period: 10, volMult: 3.0, emaPeriod: 50 }
];
const divPresets = [
  { name: 'early', label: '🟢 Ранний дивер', color: '#00ff41', rsiPeriod: 9, rsiDiffMin: 3 },
  { name: 'mid', label: '🟠 Средний дивер', color: '#ffd700', rsiPeriod: 9, rsiDiffMin: 4 },
  { name: 'strong', label: '🔴 Настоящий дивер', color: '#ff5555', rsiPeriod: 14, rsiDiffMin: 6 }
];

// --- Utility function to get preset values (Обновлен BOS) ---
function getPresetValues(moduleKey, name){
    const nameStr = name || 'mid';
    if(moduleKey==='pump') {
        const p = pumpPresets.find(x=>x.name===nameStr);
        return p ? { minOIPct: p.oi, minCVDUsd: p.cvd } : null;
    }
    if(moduleKey==='smartpump') {
        const p = spPresets.find(x=>x.name===nameStr);
        return p ? { minOIPct: p.oi, minPricePct: p.price } : null;
    }
    if(moduleKey==='flow') {
        const p = flowPresets.find(x=>x.name===nameStr);
        return p ? { flowOIPct: p.oi, flowCVDUsd: p.cvd } : null;
    }
    if(moduleKey==='disbalance') {
        const p = disbalancePresets.find(x=>x.name===nameStr);
        return p ? { disbalanceOIPct: p.oi, disbalanceCVDUsd: p.cvd } : null;
    }
    if(moduleKey==='bos') {
        const p = bosPresets.find(x=>x.name===nameStr);
        // NEW: Добавлен bosEmaPeriod
        return p ? { bosPeriod: p.period, bosVolumeMult: p.volMult, bosEmaPeriod: p.emaPeriod } : null;
    }
    if(moduleKey==='div') {
        const p = divPresets.find(x=>x.name===nameStr);
        return p ? { divRsiPeriod: p.rsiPeriod, divRsiDiffMin: p.rsiDiffMin } : null;
    }
    return null;
}

// --- Signal Descriptions (Обновлен BOS) ---
const signalDescriptions = {
  'Дивергенция': 'Ищет расхождение между ценой и RSI. Подтверждается нейтральным или противоположным потоком OI/CVD, что указывает на слабость текущего тренда.',
  'PUMP': 'Резкий рост цены, подкрепленный аномально высоким ростом Open Interest (OI) и Кумулятивной Дельты Объема (CVD). Сильный сигнал активного входа.',
  'DUMP': 'Резкое падение цены, подкрепленное аномально высоким падением OI и CVD. Сильный сигнал активного выхода.',
  'Smart Pump': 'Ранний сигнал роста/падения цены, сопровождаемый значительным изменением OI. Используется для раннего обнаружения сильной направленной активности.',
  'Flow': 'Ищет сильный поток сделок (Agg Buy/Sell), сопровождаемый ростом OI и CVD. Используется для подтверждения направленного рыночного потока.',
  'Дисбаланс': 'Ситуация, когда цена движется против CVD, но в направлении изменения OI. Часто предшествует сквизу (резкому развороту).',
  // NEW: Обновлено описание BOS
  'BOS': 'Break of Structure (BOS): ищет пробой экстремумов N-периодов назад на аномальном объеме, подтвержденный OI и нахождением цены выше/ниже настраиваемой EMA. Сигнал продолжения тренда.'
};

function App(){
  const [running, setRunning] = useState(false);

  // Modules
  const [activeModules, setActiveModules] = useState({
    divergence: true, pumpdump: true, flow: false, bos: false, disbalance: false, smartpump: true
  });
  const [moduleTfs, setModuleTfs] = useState({
    divergence: '15m', pumpdump: '5m', flow: '5m', bos: '5m', disbalance: '5m', smartpump: '5m'
  });

  const [minVol, setMinVol] = useState(50);
  const [useBinance, setUseBinance] = useState(true);
  const [useBybit, setUseBybit] = useState(true);
  const [status, setStatus] = useState('Готово.');
  const [signals, setSignals] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [cooldownSec, setCooldownSec] = useState(1800);

  // Pump/Dump
  const [pumpMinOIPct, setPumpMinOIPct] = useState(0.05);
  const [pumpMinCVDUsd, setPumpMinCVDUsd] = useState(500000);
  const [pumpPreset, setPumpPreset] = useState('mid');
  const [pumpCustom, setPumpCustom] = useState({});

  // Divergence
  const [divPreset, setDivPreset] = useState('mid');
  const [divRsiPeriod, setDivRsiPeriod] = useState(9);
  const [divRsiDiffMin, setDivRsiDiffMin] = useState(4);
  const [divCustom, setDivCustom] = useState({});

  // SmartPump settings
  const [spPreset, setSpPreset] = useState('mid');
  const [spMinOIPct, setSpMinOIPct] = useState(0.02);
  const [spMinPricePct, setSpMinPricePct] = useState(0.02);
  const [spCustom, setSpCustom] = useState({});

  // Flow
  const [flowPreset, setFlowPreset] = useState('mid');
  const [flowOIPct, setFlowOIPct] = useState(0.05);
  const [flowCVDUsd, setFlowCVDUsd] = useState(500000);
  const [flowCustom, setFlowCustom] = useState({});

  // Disbalance
  const [disbalancePreset, setDisbalancePreset] = useState('mid');
  const [disbalanceOIPct, setDisbalanceOIPct] = useState(0.10);
  const [disbalanceCVDUsd, setDisbalanceCVDUsd] = useState(1000000);
  const [disbalanceCustom, setDisbalanceCustom] = useState({});

  // BOS (NEW: Добавлен bosEmaPeriod)
  const [bosPreset, setBosPreset] = useState('mid');
  const [bosPeriod, setBosPeriod] = useState(5);
  const [bosVolumeMult, setBosVolumeMult] = useState(2.0);
  const [bosEmaPeriod, setBosEmaPeriod] = useState(20); // <-- NEW STATE
  const [bosCustom, setBosCustom] = useState({});


  // Load/Save (логика сохранена)
  useEffect(()=>{
    try{
      const s = JSON.parse(localStorage.getItem('komar_neon_div')||'{}');
      if (s.activeModules) setActiveModules(s.activeModules);
      if (s.moduleTfs) setModuleTfs(s.moduleTfs);
      if (s.minVol!=null) setMinVol(s.minVol);
      if (typeof s.useBinance==='boolean') setUseBinance(s.useBinance);
      if (typeof s.useBybit==='boolean') setUseBybit(s.useBybit);
      if (typeof s.soundOn==='boolean') setSoundOn(s.soundOn);
      if (s.cooldownSec!=null) setCooldownSec(s.cooldownSec);

      if (s.pumpPreset) setPumpPreset(s.pumpPreset);
      if (s.pumpMinOIPct!=null) setPumpMinOIPct(s.pumpMinOIPct);
      if (s.pumpMinCVDUsd!=null) setPumpMinCVDUsd(s.pumpMinCVDUsd);
      if (s.pumpCustom) setPumpCustom(s.pumpCustom);

      if (s.divPreset) setDivPreset(s.divPreset);
      if (s.divRsiPeriod!=null) setDivRsiPeriod(s.divRsiPeriod);
      if (s.divRsiDiffMin!=null) setDivRsiDiffMin(s.divRsiDiffMin);
      if (s.divCustom) setDivCustom(s.divCustom);
      
      if (s.spPreset) setSpPreset(s.spPreset);
      if (s.spMinOIPct!=null) setSpMinOIPct(s.spMinOIPct);
      if (s.spMinPricePct!=null) setSpMinPricePct(s.spMinPricePct);
      if (s.spCustom) setSpCustom(s.spCustom);

      if (s.flowPreset) setFlowPreset(s.flowPreset);
      if (s.flowOIPct!=null) setFlowOIPct(s.flowOIPct);
      if (s.flowCVDUsd!=null) setFlowCVDUsd(s.flowCVDUsd);
      if (s.flowCustom) setFlowCustom(s.flowCustom);

      if (s.disbalancePreset) setDisbalancePreset(s.disbalancePreset);
      if (s.disbalanceOIPct!=null) setDisbalanceOIPct(s.disbalanceOIPct);
      if (s.disbalanceCVDUsd!=null) setDisbalanceCVDUsd(s.disbalanceCVDUsd);
      if (s.disbalanceCustom) setDisbalanceCustom(s.disbalanceCustom);

      if (s.bosPreset) setBosPreset(s.bosPreset);
      if (s.bosPeriod!=null) setBosPeriod(s.bosPeriod);
      if (s.bosVolumeMult!=null) setBosVolumeMult(s.bosVolumeMult);
      if (s.bosEmaPeriod!=null) setBosEmaPeriod(s.bosEmaPeriod); // <-- NEW LOAD
      if (s.bosCustom) setBosCustom(s.bosCustom);
    }catch{}
  },[]);

  // Save (логика сохранена)
  useEffect(()=>{
    const s = {
      moduleTfs, minVol, useBinance, useBybit, activeModules, soundOn, cooldownSec,
      pumpMinOIPct, pumpMinCVDUsd, pumpPreset, pumpCustom, 
      divPreset, divRsiPeriod, divRsiDiffMin, divCustom,
      spMinOIPct, spMinPricePct, spPreset, spCustom,
      flowPreset, flowOIPct, flowCVDUsd, flowCustom,
      disbalancePreset, disbalanceOIPct, disbalanceCVDUsd, disbalanceCustom,
      bosPreset, bosPeriod, bosVolumeMult, bosEmaPeriod, // <-- NEW SAVE
      bosCustom
    };
    localStorage.setItem('komar_neon_div', JSON.stringify(s));
  },[
    moduleTfs, minVol, useBinance, useBybit, activeModules, soundOn, cooldownSec,
    pumpMinOIPct, pumpMinCVDUsd, pumpPreset, pumpCustom, 
    divPreset, divRsiPeriod, divRsiDiffMin, divCustom,
    spMinOIPct, spMinPricePct, spPreset, spCustom,
    flowPreset, flowOIPct, flowCVDUsd, flowCustom,
    disbalancePreset, disbalanceOIPct, disbalanceCVDUsd, disbalanceCustom,
    bosPreset, bosPeriod, bosVolumeMult, bosEmaPeriod, // <-- NEW DEPENDENCY
    bosCustom
  ]);

  // --- NEW: Check if current values match any standard preset (Обновлен BOS) ---
  const checkAndApplyPreset = (moduleKey, v1, v2, v3) => {
    let presets = [];
    let setters = [];
    if(moduleKey==='pump'){ presets=pumpPresets; setters=[setPumpPreset, setPumpMinOIPct, setPumpMinCVDUsd]; }
    else if(moduleKey==='smartpump'){ presets=spPresets; setters=[setSpPreset, setSpMinOIPct, setSpMinPricePct]; }
    else if(moduleKey==='flow'){ presets=flowPresets; setters=[setFlowPreset, setFlowOIPct, setFlowCVDUsd]; }
    else if(moduleKey==='disbalance'){ presets=disbalancePresets; setters=[setDisbalancePreset, setDisbalanceOIPct, setDisbalanceCVDUsd]; }
    else if(moduleKey==='bos'){ presets=bosPresets; setters=[setBosPreset, setBosPeriod, setBosVolumeMult, setBosEmaPeriod]; }
    else if(moduleKey==='div'){ presets=divPresets; setters=[setDivPreset, setDivRsiPeriod, setDivRsiDiffMin]; }

    for(const p of presets){
      const vals = getPresetValues(moduleKey, p.name);
      if(!vals) continue;

      let match = false;
      if(moduleKey==='pump' && Number(v1) === vals.minOIPct && Number(v2) === vals.minCVDUsd){ match=true; }
      else if(moduleKey==='smartpump' && Number(v1) === vals.minOIPct && Number(v2) === vals.minPricePct){ match=true; }
      else if(moduleKey==='flow' && Number(v1) === vals.flowOIPct && Number(v2) === vals.flowCVDUsd){ match=true; }
      else if(moduleKey==='disbalance' && Number(v1) === vals.disbalanceOIPct && Number(v2) === vals.disbalanceCVDUsd){ match=true; }
      // NEW BOS Check (v1=period, v2=volMult, v3=emaPeriod)
      else if(moduleKey==='bos' && Number(v1) === vals.bosPeriod && Number(v2) === vals.bosVolumeMult && Number(v3) === vals.bosEmaPeriod){ match=true; }
      else if(moduleKey==='div' && Number(v1) === vals.divRsiPeriod && Number(v2) === vals.divRsiDiffMin){ match=true; }
      
      if(match){
        setters[0](p.name); // Set preset to standard name
        return true;
      }
    }
    setters[0]('custom'); // Set preset to custom
    return false;
  }

  // Custom helpers (Обновлен BOS)
  const saveCustomSettings = (moduleKey) => {
    if (moduleKey === 'pump') {
      setPumpCustom({ pumpMinOIPct, pumpMinCVDUsd }); 
    } else if (moduleKey === 'div') {
      setDivCustom({ divRsiPeriod, divRsiDiffMin }); 
    } else if (moduleKey === 'smartpump') {
        setSpCustom({ spMinOIPct, spMinPricePct });
    } else if (moduleKey === 'flow') {
      setFlowCustom({ flowOIPct, flowCVDUsd });
    } else if (moduleKey === 'disbalance') {
      setDisbalanceCustom({ disbalanceOIPct, disbalanceCVDUsd });
    } else if (moduleKey === 'bos') {
      // NEW: Сохраняем bosEmaPeriod
      setBosCustom({ bosPeriod, bosVolumeMult, bosEmaPeriod });
    }
  };
  const loadCustomSettings = (moduleKey) => {
    let custom;
    if (moduleKey === 'pump') {
      custom = pumpCustom;
      if(custom.pumpMinOIPct!=null) setPumpMinOIPct(custom.pumpMinOIPct);
      if(custom.pumpMinCVDUsd!=null) setPumpMinCVDUsd(custom.pumpMinCVDUsd);
    } else if (moduleKey === 'div') {
      custom = divCustom;
      if(custom.divRsiPeriod!=null) setDivRsiPeriod(custom.divRsiPeriod);
      if(custom.divRsiDiffMin!=null) setDivRsiDiffMin(custom.divRsiDiffMin);
    } else if (moduleKey === 'smartpump') {
      custom = spCustom;
      if(custom.spMinOIPct!=null) setSpMinOIPct(custom.spMinOIPct);
      if(custom.spMinPricePct!=null) setSpMinPricePct(custom.spMinPricePct);
    } else if (moduleKey === 'flow') {
      custom = flowCustom;
      if(custom.flowOIPct!=null) setFlowOIPct(custom.flowOIPct);
      if(custom.flowCVDUsd!=null) setFlowCVDUsd(custom.flowCVDUsd);
    } else if (moduleKey === 'disbalance') {
      custom = disbalanceCustom;
      if(custom.disbalanceOIPct!=null) setDisbalanceOIPct(custom.disbalanceOIPct);
      if(custom.disbalanceCVDUsd!=null) setDisbalanceCVDUsd(custom.disbalanceCVDUsd);
    } else if (moduleKey === 'bos') {
      custom = bosCustom;
      if(custom.bosPeriod!=null) setBosPeriod(custom.bosPeriod);
      if(custom.bosVolumeMult!=null) setBosVolumeMult(custom.bosVolumeMult);
      if(custom.bosEmaPeriod!=null) setBosEmaPeriod(custom.bosEmaPeriod); // NEW: Загружаем bosEmaPeriod
    }
  };

  // Presets (Обновлен BOS)
  function applyPumpPreset(name){
    if (pumpPreset === name) return;
    if (pumpPreset === 'custom') saveCustomSettings('pump');
    setPumpPreset(name);

    if (name === 'custom') {
      loadCustomSettings('pump');
    } else {
      const vals = getPresetValues('pump', name);
      if(vals){
        setPumpMinOIPct(vals.minOIPct);
        setPumpMinCVDUsd(vals.minCVDUsd);
      }
    }
    setStatus(`✅ Пресет пампов/дампов: ${name}`);
  }
  function applyDivPreset(name){
    if (divPreset === name) return;
    if (divPreset === 'custom') saveCustomSettings('div');
    setDivPreset(name);

    if (name === 'custom') {
      loadCustomSettings('div');
    } else {
      const vals = getPresetValues('div', name);
      if(vals){
        setDivRsiPeriod(vals.divRsiPeriod); 
        setDivRsiDiffMin(vals.divRsiDiffMin);
      }
    }
    setStatus(`✅ Пресет диверов: ${name}`);
  }
  function applySpPreset(name){
    if (spPreset === name) return;
    if (spPreset === 'custom') saveCustomSettings('smartpump');
    setSpPreset(name);

    if (name === 'custom') {
      loadCustomSettings('smartpump');
    } else {
      const vals = getPresetValues('smartpump', name);
      if(vals){
        setSpMinOIPct(vals.minOIPct);
        setSpMinPricePct(vals.minPricePct);
      }
    }
    setStatus(`✅ Пресет SmartPump: ${name}`);
  }
  function applyFlowPreset(name){
    if (flowPreset === name) return;
    if (flowPreset === 'custom') saveCustomSettings('flow');
    setFlowPreset(name);

    if (name === 'custom') {
      loadCustomSettings('flow');
    } else {
      const vals = getPresetValues('flow', name);
      if(vals){
        setFlowOIPct(vals.flowOIPct);
        setFlowCVDUsd(vals.flowCVDUsd);
      }
    }
    setStatus(`✅ Пресет Flow/Поток: ${name}`);
  }
  function applyDisbalancePreset(name){
    if (disbalancePreset === name) return;
    if (disbalancePreset === 'custom') saveCustomSettings('disbalance');
    setDisbalancePreset(name);

    if (name === 'custom') {
      loadCustomSettings('disbalance');
    } else {
      const vals = getPresetValues('disbalance', name);
      if(vals){
        setDisbalanceOIPct(vals.disbalanceOIPct);
        setDisbalanceCVDUsd(vals.disbalanceCVDUsd);
      }
    }
    setStatus(`✅ Пресет Дисбаланс: ${name}`);
  }
  function applyBosPreset(name){
    if (bosPreset === name) return;
    if (bosPreset === 'custom') saveCustomSettings('bos');
    setBosPreset(name);

    if (name === 'custom') {
      loadCustomSettings('bos');
    } else {
      const vals = getPresetValues('bos', name);
      if(vals){
        setBosPeriod(vals.bosPeriod);
        setBosVolumeMult(vals.bosVolumeMult);
        setBosEmaPeriod(vals.bosEmaPeriod); // NEW: Устанавливаем период EMA из пресета
      }
    }
    setStatus(`✅ Пресет BOS: ${name}`);
  }


  // UI helpers (логика сохранена)
  const toggleModule = (moduleName) => {
    setActiveModules(prev => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };
  const setModuleTf = (moduleName, newTf) => {
    setModuleTfs(prev => ({ ...prev, [moduleName]: newTf }));
  };
  const isAnyModuleActive = Object.values(activeModules).some(Boolean);

  // Callbacks (логика сохранена)
  const onSignal = (sig)=>{
    setSignals(prev=>[sig, ...prev].slice(0,400));
    setHistory(prev=>[sig, ...prev].slice(0,50));
  };
  const onStatus = (msg)=> setStatus(`${nowTime()} — ${msg}`);

  // Start/Stop (логика сохранена)
  const handleStart = ()=>{
    if (!isAnyModuleActive) {
      setStatus(`⛔️ Ошибка: Выберите хотя бы один модуль.`);
      return;
    }
    if (pumpPreset === 'custom') saveCustomSettings('pump');
    if (divPreset === 'custom') saveCustomSettings('div');
    if (flowPreset === 'custom') saveCustomSettings('flow');
    if (disbalancePreset === 'custom') saveCustomSettings('disbalance');
    if (bosPreset === 'custom') saveCustomSettings('bos');

    // Flow, Disbalance, BOS, SmartPump settings are updated
    Settings.sensitivity.smartpump = { minOIPct: Number(spMinOIPct)||0.02, minPricePct: Number(spMinPricePct)||0.02, spPreset };
    Settings.sensitivity.flow = {
      minOIPct: Number(flowOIPct)||0.05,
      minCVDUsd: Number(flowCVDUsd)||500000,
      flowPreset
    };
    Settings.sensitivity.disbalance = {
      minOIPct: Number(disbalanceOIPct)||0.10,
      minCVDUsd: Number(disbalanceCVDUsd)||1000000,
      disbalancePreset
    };
    Settings.sensitivity.bos = {
      bosPeriod: Number(bosPeriod)||5,
      bosVolumeMult: Number(bosVolumeMult)||2.0,
      bosEmaPeriod: Number(bosEmaPeriod)||20, // <-- NEW: Передаем EMA период
      bosPreset
    };

    // Pump/Dump
    Settings.sensitivity.pumpMinOIPct = Number(pumpMinOIPct)||0.05;
    Settings.sensitivity.pumpMinCVDUsd = Number(pumpMinCVDUsd)||500000;

    // Global
    Settings.activeModules = activeModules;
    Settings.moduleTimeframes = moduleTfs;
    Settings.minVolumeM = Number(minVol)||50;
    Settings.exchanges = { binance: useBinance, bybit: useBybit };
    Settings.sensitivity = {
      ...Settings.sensitivity,
      div: {
        rsiPeriod: Number(divRsiPeriod)||9,
        rsiDiffMin: Number(divRsiDiffMin)||4,
      },
      sound: !!soundOn,
      cooldownSec: Number(cooldownSec)||1800,
    };

    if (typeof toggleSound === 'function') toggleSound(Settings.sensitivity.sound);
    setSignals([]);
    setShowSettings(false);
    startLoop({ onSignal, onStatus });
    setRunning(true);
  };
  const handleStop = ()=>{
    stopLoop({ onStatus });
    setRunning(false);
  };

  const timeframeOptions = ['5m', '15m', '1h', '4h'];
  const renderTfSelector = (moduleKey, label) => (
    <div className="md:col-span-1">
      <div className="th mb-1">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {timeframeOptions.map(t => (
          <span key={t}
                className={`chip ${moduleTfs[moduleKey]===t?'active':''}`}
                onClick={()=>setModuleTf(moduleKey, t)}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  const renderPresetChips = (currentPreset, setPresetFn, presets) => (
    <div className="flex gap-2 flex-wrap mb-3">
      {presets.map(({ name, label, color }) => (
        <span key={name}
              className={`chip ${currentPreset===name?'active':''}`}
              style={currentPreset===name && name!=='custom' ? {borderColor: color, boxShadow: `0 0 5px ${color}`} : {}}
              onClick={()=>setPresetFn(name)}>
          {label}
        </span>
      ))}
      <span key="custom"
            className={`chip ${currentPreset==='custom'?'active':''}`}
            style={currentPreset==='custom' ? {borderColor: 'gray', boxShadow: `0 0 5px gray`} : {}}
            onClick={()=>setPresetFn('custom')}>
        ⚙️ Свои настройки
      </span>
    </div>
  );


  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {!running ? (
            <button className="btn" onClick={handleStart} disabled={!isAnyModuleActive}>▶ Старт</button>
          ) : (
            <button className="btn" onClick={handleStop}>⏹ Стоп</button>
          )}
          <button id="btn-settings" className="btn" onClick={()=>setShowSettings(s=>!s)}>
            ⚙️ Настройки
          </button>
          <div className="text-sm link-muted">{status}</div>
        </div>
      </div>

      {showSettings && (
        <div className="card p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Active modes */}
            <div className="col-span-2">
              <div className="th mb-2">Активные режимы анализа</div>
              <div className="flex gap-2 flex-wrap">
                <span className={`chip ${activeModules.divergence ? 'active' : ''}`} onClick={() => toggleModule('divergence')}>
                  📈 Дивергенции
                  <InfoTooltip text="Ищет расхождение между ценой и индикатором RSI. Подтверждается нейтральным/противоположным потоком OI/CVD, что указывает на слабость текущего тренда." />
                </span>
                <span className={`chip ${activeModules.pumpdump ? 'active' : ''}`} onClick={() => toggleModule('pumpdump')}>
                  🚀 Пампы/Дампы
                  <InfoTooltip text="Ищет резкое направленное движение свечи, сопровождающееся значительным ростом OI и CVD в ту же сторону. Классический признак активности китов." />
                </span>
                <span className={`chip ${activeModules.smartpump ? 'active' : ''}`} onClick={() => toggleModule('smartpump')}>
                  ⚡ SmartPump
                  <InfoTooltip text="Ищет сильный рост/падение цены, подкрепленное значительным изменением OI. Используется для раннего обнаружения тренда без подтверждения CVD." />
                </span>
                <span className={`chip ${activeModules.flow ? 'active' : ''}`} onClick={() => toggleModule('flow')}>
                  🌊 Flow/Поток
                  <InfoTooltip text="Ищет сильный объем в одном направлении (Agg Buy/Sell), сопровождаемый ростом OI и CVD. Используется для подтверждения рыночного потока." />
                </span>
                <span className={`chip ${activeModules.disbalance ? 'active' : ''}`} onClick={() => toggleModule('disbalance')}>
                  ⚖️ Дисбаланс CVD/OI
                  <InfoTooltip text="Ищет ситуацию Лонг/Шорт-Сквиза: цена движется против CVD, но в направлении роста OI. Часто предшествует резкому развороту." />
                </span>
                <span className={`chip ${activeModules.bos ? 'active' : ''}`} onClick={() => toggleModule('bos')}>
                  💥 BOS/Пробой Структуры
                  <InfoTooltip text="Break of Structure (BOS): ищет пробой экстремумов N-периодов назад на аномальном объеме, подтвержденный OI и нахождением цены выше/ниже настраиваемой EMA. Сигнал продолжения тренда." />
                </span>
              </div>
              {!isAnyModuleActive && (<p className="text-red-500 mt-2 font-bold">⚠️ Выберите хотя бы один модуль для сканирования.</p>)}
            </div>

            <div className="h-px bg-[#1b1f2a] col-span-2" />

            {/* Timeframes */}
            <div className="col-span-2">
              <div className="th mb-2">Таймфреймы по модулям (ТФ)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderTfSelector('divergence', 'ТФ: Дивергенции')}
                {renderTfSelector('pumpdump', 'ТФ: Пампы/Дампы')}
                {renderTfSelector('smartpump', 'ТФ: SmartPump')}
                {renderTfSelector('flow', 'ТФ: Flow/Поток')}
                {renderTfSelector('disbalance', 'ТФ: Дисбаланс')}
                {renderTfSelector('bos', 'ТФ: BOS')}
              </div>
            </div>

            <div className="h-px bg-[#1b1f2a] col-span-2" />

            {/* Volume and exchanges */}
            <div className="md:col-span-1">
              <div className="th mb-1">
                Мин. объём (24ч), млн USDT
                <InfoTooltip text="Минимальный объем торгов за последние 24 часа в млн USDT." />
              </div>
              <input type="number" min="1" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                     value={minVol} onChange={e=>setMinVol(e.target.value)} />
            </div>
            <div className="col-span-2">
              <div className="th mb-1">Биржи</div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useBinance} onChange={e=>setUseBinance(e.target.checked)} /> Binance
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useBybit} onChange={e=>setUseBybit(e.target.checked)} /> Bybit
                </label>
              </div>
            </div>

          </div>

          <div className="h-px bg-[#1b1f2a]" />

          {/* PUMP/DUMP */}
          <div>
            <div className="th mb-2">Пресет для пампов/дампов (OI + CVD)</div>
            {renderPresetChips(pumpPreset, applyPumpPreset, pumpPresets)}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="th mb-1">
                  Мин. OI % (абс. знач.)
                  <InfoTooltip text="Минимальное изменение Open Interest (в %), требуемое для сигнала." />
                </div>
                <input type="number" step="0.01" min="0.00" 
                      className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                      value={pumpMinOIPct} 
                      onChange={e=>{
                        const newVal = e.target.value;
                        setPumpMinOIPct(newVal); 
                        checkAndApplyPreset('pump', newVal, pumpMinCVDUsd);
                      }} />
              </div>

              <div>
                <div className="th mb-1">
                  Мин. CVD (USD)
                  <InfoTooltip text="Минимальная кумулятивная дельта объёма в USD." />
                </div>
                <input type="number" step="10000" min="0" 
                      className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                      value={pumpMinCVDUsd} 
                      onChange={e=>{
                        const newVal = e.target.value;
                        setPumpMinCVDUsd(newVal);
                        checkAndApplyPreset('pump', pumpMinOIPct, newVal);
                      }} />
              </div>
              
              <div className="md:col-span-1">
                <div className="th mb-1">
                  Антиспам (сек)
                </div>
                <input type="number" step="60" min="0"
                  className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                  value={cooldownSec}
                  onChange={e=>setCooldownSec(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 md:col-span-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={soundOn}
                    onChange={e=>{
                      setSoundOn(e.target.checked);
                      if (typeof toggleSound === 'function') toggleSound(e.target.checked);
                    }}
                  />
                  Звук
                </label>
              </div>
            </div>
          </div>

          
          <div className="h-px bg-[#1b1f2a]" />

          {/* SMARTPUMP */}
          <div>
            <div className="th mb-2">Пресет для SmartPump (OI + Δ%)</div>
            {renderPresetChips(spPreset, applySpPreset, spPresets)}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="th mb-1">Мин. OI %</div>
                <input type="number" step="0.01" min="0.00"
                  className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                  value={spMinOIPct}
                  onChange={e=>{ 
                    const newVal = e.target.value;
                    setSpMinOIPct(newVal); 
                    checkAndApplyPreset('smartpump', newVal, spMinPricePct); 
                  }}
                />
              </div>
              <div>
                <div className="th mb-1">Мин. Δ% цены</div>
                <input type="number" step="0.01" min="0.00"
                  className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                  value={spMinPricePct}
                  onChange={e=>{ 
                    const newVal = e.target.value;
                    setSpMinPricePct(newVal); 
                    checkAndApplyPreset('smartpump', spMinOIPct, newVal);
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="h-px bg-[#1b1f2a]" />
          
          {/* FLOW */}
          <div>
            <div className="th mb-2">Пресет для Flow/Поток (OI + CVD)</div>
            {renderPresetChips(flowPreset, applyFlowPreset, flowPresets)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="th mb-1">
                  Мин. OI % (абс. знач.)
                </div>
                <input type="number" step="0.01" min="0.00" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={flowOIPct} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setFlowOIPct(newVal); 
                        checkAndApplyPreset('flow', newVal, flowCVDUsd);
                      }} />
              </div>
              <div>
                <div className="th mb-1">
                  Мин. CVD (USD)
                </div>
                <input type="number" step="10000" min="0" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={flowCVDUsd} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setFlowCVDUsd(newVal);
                        checkAndApplyPreset('flow', flowOIPct, newVal);
                      }} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[#1b1f2a]" />

          {/* DISBALANCE */}
          <div>
            <div className="th mb-2">Пресет для Дисбаланса (OI + CVD)</div>
            {renderPresetChips(disbalancePreset, applyDisbalancePreset, disbalancePresets)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="th mb-1">
                  Мин. OI % (абс. знач.)
                </div>
                <input type="number" step="0.01" min="0.00" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={disbalanceOIPct} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setDisbalanceOIPct(newVal); 
                        checkAndApplyPreset('disbalance', newVal, disbalanceCVDUsd);
                      }} />
              </div>
              <div>
                <div className="th mb-1">
                  Мин. CVD (USD)
                </div>
                <input type="number" step="10000" min="0" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={disbalanceCVDUsd} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setDisbalanceCVDUsd(newVal);
                        checkAndApplyPreset('disbalance', disbalanceOIPct, newVal);
                      }} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[#1b1f2a]" />

          {/* BOS (NEW: Добавлена настройка EMA) */}
          <div>
            <div className="th mb-2">Пресет для BOS (Пробой Структуры)</div>
            {renderPresetChips(bosPreset, applyBosPreset, bosPresets)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="th mb-1">
                  Период BOS (свечей)
                </div>
                <input type="number" step="1" min="2" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={bosPeriod} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setBosPeriod(newVal); 
                        checkAndApplyPreset('bos', newVal, bosVolumeMult, bosEmaPeriod);
                      }} />
              </div>
              <div>
                <div className="th mb-1">
                  × Объёма (к SMA20)
                </div>
                <input type="number" step="0.1" min="1.0" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={bosVolumeMult} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setBosVolumeMult(newVal);
                        checkAndApplyPreset('bos', bosPeriod, newVal, bosEmaPeriod);
                      }} />
              </div>
              {/* NEW: Поле для настройки периода EMA */}
              <div>
                <div className="th mb-1">
                  Период EMA (N)
                  <InfoTooltip text="EMA-фильтр для подтверждения тренда (цена должна быть выше/ниже EMA)." />
                </div>
                <input type="number" step="1" min="5" max="200" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={bosEmaPeriod} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setBosEmaPeriod(newVal);
                        checkAndApplyPreset('bos', bosPeriod, bosVolumeMult, newVal);
                      }} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[#1b1f2a]" />

          {/* DIVERGENCE */}
          <div>
            <div className="th mb-2">Пресет для диверов</div>
            {renderPresetChips(divPreset, applyDivPreset, divPresets)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="th mb-1">
                  RSI период
                </div>
                <input type="number" min="5" max="21" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={divRsiPeriod} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setDivRsiPeriod(newVal); 
                        checkAndApplyPreset('div', newVal, divRsiDiffMin);
                      }} />
              </div>
              <div>
                <div className="th mb-1">
                  Миним. разница RSI
                </div>
                <input type="number" step="1" min="1" className="w-full bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2"
                       value={divRsiDiffMin} 
                       onChange={e=>{
                        const newVal = e.target.value;
                        setDivRsiDiffMin(newVal);
                        checkAndApplyPreset('div', divRsiPeriod, newVal);
                      }} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Signals + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="th mb-2">Текущие сигналы</div>
          <div className="space-y-2">
            {signals.length===0 && <div className="text-gray-400">Пока нет сигналов.</div>}
            {signals.map((s, idx)=>{
              const isDiv = s.reason?.startsWith?.('Дивергенция');
              const isSmartPump = s.reason?.startsWith?.('Smart Pump') || s.kind?.startsWith?.('⚡ Smart Pump'); 
              const isPumpDump = s.kind?.startsWith?.('PUMP') || s.kind?.startsWith?.('DUMP'); 
              const isBOS = s.kind?.includes?.('BOS'); // <-- NEW: Проверка на BOS
              
              const smartPumpCount = s.detail?.smartPumpCount24h ?? null; 
              
              const volStr = s.detail?.volMult!=null ? `Vol×${fmt(s.detail.volMult,2)}` : '';
              const rsiStr = s.detail?.rNow!=null ? `RSI: ${fmt(s.detail.rNow,0)}` : ''; 
              
              const oiVal  = s.detail?.oi  ?? s.detail?.oiPct  ?? null;
              const cvdVal = s.detail?.cvd ?? s.detail?.cvdUsd ?? null;
              const priceChangePct = s.detail?.priceChangePct ?? null;
              
              const emaVal = s.detail?.ema ?? null; // <-- NEW: Значение EMA
              const emaPeriod = s.detail?.emaPeriod ?? null; // <-- NEW: Период EMA
              
              // Расчет OI в USD
              const oiUsd = (oiVal != null && s.price != null && s.detail?.oiUsd!=null) 
                ? s.detail.oiUsd
                : (oiVal != null && s.price != null) ? Math.abs(Number(oiVal))/100 * Number(s.price) * 1_000_000 : null; 
     
              const formatUsd = (usd) => {
                  if (usd == null) return '';
                  return (usd >= 1_000_000)
                      ? `$${fmt(usd / 1_000_000, 2)}M`
                      : `$${fmt(usd / 1_000, 0)}K`;
              };

              const oiElement = oiVal!=null ? (
                <span className={getColorClass(oiVal)}>
                  OI: {oiVal > 0 ? '+' : ''}{fmt(oiVal, 2)}% {oiUsd ? `(${formatUsd(oiUsd)})` : ''}
                </span>
              ) : null;
              
              // NEW: Элемент для EMA (только для BOS)
              const emaElement = emaVal!=null && isBOS ? (
                  <span className={s.price > emaVal ? 'text-green-400' : 'text-red-400'}>
                      EMA{emaPeriod}: {fmt(emaVal, 4)}
                  </span>
              ) : null;
              
              const cvdElement = cvdVal!=null ? (
                <span className={getColorClass(cvdVal)}>
                  CVD: {cvdVal > 0 ? '+' : ''}{fmt(cvdVal / 1_000_000, 2)}M
                </span>
              ) : null;
              
              const priceChangeElement = priceChangePct!=null ? ( 
                  <span className={getColorClass(priceChangePct)}>
                      Δ: {priceChangePct > 0 ? '↗ ' : '↘ '}{fmt(Math.abs(priceChangePct), 2)}%
                  </span>
              ) : null;
              
              // Элемент для счетчика SmartPump
              const spCountElement = smartPumpCount!=null && isSmartPump ? (
                  <span className='text-yellow-400 font-bold' style={{textShadow: '0 0 5px rgba(255, 255, 0, 0.5)'}}>
                      24h: {smartPumpCount}×
                  </span>
              ) : null;


              // NEW METRIC ORDER: Price Change > OI > CVD/EMA > SP Count > Vol > RSI
              const metricElements = [
                priceChangeElement,
                oiElement, 
                // Условное отображение CVD или EMA
                isBOS ? emaElement : cvdElement, // <-- NEW: BOS показывает EMA
                spCountElement, 
                (isBOS || isDiv) ? volStr : null, // BOS/DIV всегда показывают объем
                (isDiv ? rsiStr : null),
              ].filter(Boolean);


              // if Pump/Dump, SmartPump, Flow or Disbalance, focus on % and CVD/OI
              const showRawPrice = !(isPumpDump || isSmartPump || s.reason?.startsWith?.('Flow') || s.reason?.startsWith?.('Дисбаланс') || isBOS);
              const tfStr = s.detail?.signalTf || 'N/A';
              const sideEmoji = s.side==='Лонг' ? '🟢' : '🔴';

              // Определяем тип сигнала для описания
              let baseSignalKey = '';
              if (s.kind?.includes('PUMP')) baseSignalKey = 'PUMP';
              else if (s.kind?.includes('DUMP')) baseSignalKey = 'DUMP';
              else if (s.kind?.includes('Smart Pump')) baseSignalKey = 'Smart Pump';
              else if (s.kind?.includes('Flow')) baseSignalKey = 'Flow';
              else if (s.reason?.startsWith?.('Дивергенция')) baseSignalKey = 'Дивергенция';
              else if (s.reason?.startsWith?.('Дисбаланс')) baseSignalKey = 'Дисбаланс';
              else if (s.kind?.includes('BOS')) baseSignalKey = 'BOS';

              const descriptionText = signalDescriptions[baseSignalKey] || 'Нет подробного описания для этого сигнала.';
              
              const reasonDisplay = (
                  <span className="font-semibold text-blue-400" style={{textShadow: '0 0 5px rgba(0, 191, 255, 0.5)'}}>
                      {s.kind || s.reason}
                      <InfoTooltip text={descriptionText} />
                  </span>
              );

              return (
                <div key={idx} className="flex flex-col gap-1 bg-[#0E1115] border border-[#1b1f2a] rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${s.side==='Лонг'?'text-green-400':'text-red-400'}`}>{sideEmoji} {s.side}</span>
                      <span className="font-semibold">{s.symbol}</span>
                      <span className="text-xs text-gray-400">({s.exchange}, {tfStr})</span>
                    </div>
                    <span className={`score ${s.detail?.scoreClass||'s2'}`}>{isDiv?'DIV':'Сила'}</span> 
                  </div>

                  <div className="text-sm">
                    {reasonDisplay}
                  </div>

                  <div className="text-sm text-gray-300 kv">
                    {metricElements.map((el, i) => (
                      <React.Fragment key={i}>
                        {el}
                        {i < metricElements.length - 1 && <span className="separator"> | </span>}
                      </React.Fragment>
                    ))}

                    {showRawPrice && (
                      <>
                        <span className="separator"> | </span> 
                        <span className="text-gray-400 font-semibold">Цена:</span>
                        <span className="neon-price"> {fmt(s.price, 6)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <div className="th mb-2">История (последние 50)</div>
          <div className="space-y-1 max-h-[420px] overflow-auto">
            {history.length===0 && <div className="text-gray-400">Пока нет истории.</div>}
            {history.map((s, idx)=>{
              const sideEmoji = s.side==='Лонг' ? '🟢' : '🔴';
              const tfStr = s.detail?.signalTf || 'N/A';
              return (
                <div key={idx} className="flex items-center justify-between px-2 py-1 rounded bg-[#0E1115] border border-[#1b1f2a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(s.ts||Date.now()).toLocaleTimeString()}</span>
                    <span>{sideEmoji}</span>
                    <span className="font-semibold">{s.symbol}</span>
                    <span className="text-xs text-gray-400">({s.exchange}, {tfStr})</span>
                  </div>
                  <div className="text-xs text-gray-300">
                    { (s.detail?.priceChangePct!=null) ? `Δ: ${fmt(Math.abs(s.detail.priceChangePct),2)}%` : `Цена: ${fmt(s.price,6)}` }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<App/>, document.getElementById('root'));