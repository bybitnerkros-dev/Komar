// ===== API: Binance + Bybit (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ) =====

// Примечание: Для работы API.oiDelta и API.cvdDelta требуется глобальная функция tfToMinutes из logic.js.

const API = {
  // --- 24hr Tickers ---
  async binance24h(){
    const url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
    const res = await fetch(url);
    if(!res.ok) throw new Error('Binance 24hr fetch failed');
    return await res.json();
  },

  async bybitTickers(){
    const url = 'https://api.bybit.com/v5/market/tickers?category=linear';
    const res = await fetch(url);
    if(!res.ok) throw new Error('Bybit tickers fetch failed');
    const data = await res.json();
    return data?.result?.list || [];
  },
  
  // --- Klines ---
  async binanceKlines(symbol, interval='15m', limit=120){
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Binance klines failed: '+symbol);
    return await res.json();
  },

  async bybitKlines(symbol, interval='15', limit=120){
    const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Bybit klines failed: '+symbol);
    const data = await res.json();
    // Bybit возвращает список в обратном порядке [самая старая, ..., самая новая]
    return (data?.result?.list || []).reverse();
  },

  // --- Open Interest (OI) ---
  async fetchOI(exchange, symbol, timeframeMin) {
    try {
      const tfMinStr = timeframeMin + 'm';

      if (exchange === 'Bybit') {
        // Bybit OI endpoint использует интервал в минутах (например, 5min)
        const url = `https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=${timeframeMin}min`;
        const r = await fetch(url);
        const data = await r.json();
        const list = data?.result?.list || [];
        if (list.length < 2) return { oiPct: null };
        const prev = parseFloat(list[list.length - 2].openInterest);
        const cur  = parseFloat(list[list.length - 1].openInterest);
        return { oiPct: ((cur - prev) / prev) * 100 };
      }

      // Binance OI endpoint использует период (например, 5m)
      const url = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${tfMinStr}&limit=30`;
      const r = await fetch(url);
      const list = await r.json();
      if (list.length < 2) return { oiPct: null };
      const prev = parseFloat(list[list.length - 2].sumOpenInterest);
      const cur  = parseFloat(list[list.length - 1].sumOpenInterest);
      return { oiPct: ((cur - prev) / prev) * 100 };

    } catch (e) {
      console.warn(`OI fetch error (${exchange} ${symbol}):`, e.message);
      return { oiPct: null };
    }
  },

  // --- Cumulative Volume Delta (CVD) ---
  async fetchCVD(exchange, symbol, timeframeMin) {
    try {
      // Рассчитываем временную метку начала таймфрейма
      const sinceMs = Date.now() - timeframeMin * 60_000;
      let list = [];

      // API для получения недавних сделок
      if (exchange === 'Bybit') {
        const url = `https://api.bybit.com/v5/market/recent-trade?category=linear&symbol=${symbol}&limit=1000`;
        const r = await fetch(url);
        const data = await r.json();
        list = data?.result?.list || [];
      } else {
        const url = `https://fapi.binance.com/fapi/v1/trades?symbol=${symbol}&limit=1000`;
        const r = await fetch(url);
        list = await r.json();
      }

      let buy = 0, sell = 0;

      for (const t of list) {
        const ts = parseInt(t?.time || t?.timestamp || 0);
        // Фильтруем сделки, которые произошли до начала таймфрейма
        if (ts && ts < sinceMs) continue;

        let price, qty, isBuy;

        if (exchange === 'Bybit') {
          price = parseFloat(t?.price);
          qty = parseFloat(t?.size);
          isBuy = t?.side === 'Buy';
        } else {
          price = parseFloat(t?.price);
          qty = parseFloat(t?.qty);
          isBuy = !t?.isBuyerMaker; // Binance: isBuyerMaker=true значит "продавец, купивший" (sell)
        }

        if (!isFinite(price) || !isFinite(qty)) continue;
        const quote = price * qty; // Стоимость сделки в USDT

        if (isBuy) buy += quote;
        else sell += quote;
      }

      return { cvdUsd: buy - sell };

    } catch (e) {
      console.warn(`CVD fetch error (${exchange} ${symbol}):`, e.message);
      return { cvdUsd: null };
    }
  },
};


// === Unified wrappers (Используют tfToMinutes из logic.js) ===
// (Эти обертки исправлены для использования глобальной tfToMinutes)

API.oiDelta = async function(exchange, symbol, tf){
  const min = tfToMinutes(tf); // Использует глобальную функцию
  const r = await API.fetchOI(exchange==='binance'?'Binance':'Bybit', symbol, min);
  return r.oiPct??0;
};

API.cvdDelta = async function(exchange, symbol, tf){
  const min = tfToMinutes(tf); // Использует глобальную функцию
  const r = await API.fetchCVD(exchange==='binance'?'Binance':'Bybit', symbol, min);
  return r.cvdUsd??0;
};