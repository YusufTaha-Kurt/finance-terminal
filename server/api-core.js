// ============================================================================
//  api-core.js — Finance Terminal REST API çekirdeği (ortam bağımsız)
//
//  Aynı mantık iki yerde kullanılır:
//    • Vite dev sunucusu  → server/api-plugin.js
//    • Vercel serverless  → api/index.js  (herkese açık üretim API'si)
//
//  Dışa açık tek giriş noktası: handleApiRequest(pathname, searchParams, baseUrl)
// ============================================================================

// Node.js'te CORS yok — doğrudan Yahoo Finance'e istek atabiliriz
const YAHOO_BASE = 'https://query1.finance.yahoo.com';

// ─── Sembol Çözümleme ───────────────────────────────────────────────────────
function resolveYahooSymbol(symbol, marketType) {
  const s = symbol.toUpperCase();
  switch (marketType) {
    case 'bist':      return `${s}.IS`;
    case 'us':        return s;
    case 'crypto':    return s.includes('-USD') ? s : `${s}-USD`;
    case 'commodity': return s;
    case 'bond':      return s;
    case 'forex':     return s.includes('=X') ? s : `${s}=X`;
    case 'viop':      return `${s}.IS`;
    default:          return `${s}.IS`;
  }
}

function getDefaultRange(interval) {
  switch (interval) {
    case '1m': case '5m': case '15m': return '5d';
    case '30m': case '1h': return '1mo';
    case '4h': return '3mo';
    case '1d': return '1y';
    case '1wk': return '5y';
    case '1mo': return 'max';
    default: return '1y';
  }
}

// ─── Yahoo Finance Veri Çekme ────────────────────────────────────────────────
async function fetchYahooData(symbol, market, interval) {
  const yahooSymbol = resolveYahooSymbol(symbol, market);
  const range = getDefaultRange(interval);
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BorsaTakipAPI/1.0)' },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  return res.json();
}

function parseCandles(json, interval) {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Veri alınamadı');
  const ts = result.timestamp;
  const q = result.indicators?.quote?.[0];
  if (!ts || !q) throw new Error('Timestamp/quote eksik');

  const isIntraday = ['1m','5m','15m','30m','1h','4h'].includes(interval);
  const candles = [];
  const seen = new Set();
  const meta = result.meta || {};
  const utcDay = (sec) => new Date(sec * 1000).toISOString().split('T')[0];

  // Yahoo, son islem gununun mumunda close'u bir sure null birakir; acilis,
  // yuksek, dusuk ve hacim doludur ve gercek kapanis meta.regularMarketPrice'ta
  // durur. Bu mumu atarsak seri gunlerce geride kalir (bkz. Belgeler/04).
  // Yalnizca SON mum icin ve ancak meta ayni gune aitse tamamliyoruz.
  const metaClose = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
  const metaDay = meta.regularMarketTime ? utcDay(meta.regularMarketTime) : null;

  for (let i = 0; i < ts.length; i++) {
    let open = q.open[i];
    let high = q.high[i];
    let low = q.low[i];
    let close = q.close[i];
    let volume = q.volume[i];

    if (close == null && i === ts.length - 1 && metaClose !== null
        && metaDay !== null && utcDay(ts[i]) === metaDay) {
      close = metaClose;
      if (high == null) high = meta.regularMarketDayHigh ?? close;
      if (low == null) low = meta.regularMarketDayLow ?? close;
      if (open == null) open = meta.chartPreviousClose ?? close;
      if (volume == null) volume = meta.regularMarketVolume ?? 0;
    }

    // Tamamen bos mum (islem olmayan gun) atlanir
    if (open == null || close == null) continue;
    if (high == null) high = Math.max(open, close);
    if (low == null) low = Math.min(open, close);

    const time = isIntraday
      ? ts[i] + 10800
      : utcDay(ts[i]);

    if (seen.has(time)) continue;
    seen.add(time);

    // Basamak sayisi fiyat buyuklugune gore: kuruslu hisseler ve SHIB gibi
    // mikro fiyatli kriptolar 2 basamaga yuvarlanirsa sifirlaniyordu.
    const r = (v) => {
      const a = Math.abs(v);
      const d = a >= 100 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 5 : 8;
      return +v.toFixed(d);
    };

    candles.push({
      time,
      open: r(open),
      high: r(high),
      low: r(low),
      close: r(close),
      volume: volume ?? 0,
    });
  }
  return { candles, meta };
}

// ─── İndikatör Hesaplamaları (Server-side) ───────────────────────────────────

function calcEMA(closes, period) {
  const ema = new Array(closes.length).fill(null);
  if (closes.length < period) return ema;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  ema[period - 1] = sum / period;
  for (let i = period; i < closes.length; i++) {
    ema[i] = (closes[i] - ema[i - 1]) * k + ema[i - 1];
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return new Array(closes.length).fill(null);
  const rsi = new Array(closes.length).fill(null);
  let avgG = 0, avgL = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    d >= 0 ? avgG += d : avgL += Math.abs(d);
  }
  avgG /= period; avgL /= period;
  rsi[period] = 100 - 100 / (1 + (avgL === 0 ? 100 : avgG / avgL));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + (d >= 0 ? d : 0)) / period;
    avgL = (avgL * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
    rsi[i] = 100 - 100 / (1 + (avgL === 0 ? 100 : avgG / avgL));
  }
  return rsi;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = closes.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : null
  );
  const validMacd = macdLine.filter(v => v !== null);
  const signalEma = calcEMA(validMacd, 9);
  const firstValid = macdLine.findIndex(v => v !== null);
  const signalLine = new Array(closes.length).fill(null);
  for (let i = 0; i < signalEma.length; i++) {
    signalLine[firstValid + i] = signalEma[i];
  }
  const histogram = closes.map((_, i) =>
    macdLine[i] !== null && signalLine[i] !== null ? macdLine[i] - signalLine[i] : null
  );
  return { macdLine, signalLine, histogram };
}

function calcBollinger(closes, period = 20, mult = 2) {
  const upper = new Array(closes.length).fill(null);
  const middle = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    const sma = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (closes[j] - sma) ** 2;
    const std = Math.sqrt(sqSum / period);
    middle[i] = sma;
    upper[i] = sma + mult * std;
    lower[i] = sma - mult * std;
  }
  return { upper, middle, lower };
}

function calcATR(candles, period = 14) {
  const atr = new Array(candles.length).fill(null);
  const tr = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    tr.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  if (candles.length < period) return atr;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

function calcStochastic(candles, kP = 14) {
  const k = new Array(candles.length).fill(null);
  for (let i = kP - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - kP + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    k[i] = hi === lo ? 50 : ((candles[i].close - lo) / (hi - lo)) * 100;
  }
  return k;
}

// ─── Teknik Analiz Yorum Üretici ─────────────────────────────────────────────
function generateAnalysis(candles, meta) {
  const closes = candles.map(c => c.close);
  const n = closes.length;
  const last = candles[n - 1];
  const prev = candles[n - 2];

  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const boll = calcBollinger(closes, 20, 2);
  const atr = calcATR(candles, 14);
  const stoch = calcStochastic(candles, 14);

  // Son değerler
  const lastEma9 = ema9[n - 1];
  const lastEma21 = ema21[n - 1];
  const lastEma50 = ema50[n - 1];
  const lastRSI = rsi[n - 1];
  const lastMACD = macd.macdLine[n - 1];
  const lastSignal = macd.signalLine[n - 1];
  const lastHistogram = macd.histogram[n - 1];
  const lastBollUpper = boll.upper[n - 1];
  const lastBollMiddle = boll.middle[n - 1];
  const lastBollLower = boll.lower[n - 1];
  const lastATR = atr[n - 1];
  const lastStoch = stoch[n - 1];

  // Yüzde değişim
  const price = last.close;
  const prevClose = meta?.chartPreviousClose ?? prev?.close ?? price;
  const change = price - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose * 100) : 0;

  // Trend belirleme
  const trendSignals = [];
  if (lastEma9 && lastEma21 && lastEma50) {
    if (price > lastEma50) trendSignals.push('Fiyat EMA50 üzerinde (Boğa)');
    else trendSignals.push('Fiyat EMA50 altında (Ayı)');
    
    if (lastEma9 > lastEma21) trendSignals.push('EMA9 > EMA21 (Kısa vadeli yükseliş)');
    else trendSignals.push('EMA9 < EMA21 (Kısa vadeli düşüş)');

    if (lastEma9 > lastEma50 && lastEma21 > lastEma50) trendSignals.push('Genel trend: YUKARI');
    else if (lastEma9 < lastEma50 && lastEma21 < lastEma50) trendSignals.push('Genel trend: AŞAĞI');
    else trendSignals.push('Genel trend: KARARSIZ');
  }

  // RSI yorumu
  let rsiComment = '';
  if (lastRSI !== null) {
    if (lastRSI > 70) rsiComment = 'AŞIRI ALIM bölgesi — Satış riski yüksek';
    else if (lastRSI > 60) rsiComment = 'Güçlü alan — Momentum yukarı';
    else if (lastRSI > 40) rsiComment = 'Nötr bölge';
    else if (lastRSI > 30) rsiComment = 'Zayıf bölge — Alım fırsatı olabilir';
    else rsiComment = 'AŞIRI SATIM bölgesi — Tepki ihtimali yüksek';
  }

  // MACD yorumu
  let macdComment = '';
  if (lastMACD !== null && lastSignal !== null) {
    if (lastMACD > lastSignal && lastHistogram > 0) macdComment = 'MACD pozitif kesişim — AL sinyali';
    else if (lastMACD < lastSignal && lastHistogram < 0) macdComment = 'MACD negatif kesişim — SAT sinyali';
    else macdComment = 'MACD nötr';
  }

  // Bollinger yorumu
  let bollComment = '';
  if (lastBollUpper && lastBollLower) {
    const bandwidth = ((lastBollUpper - lastBollLower) / lastBollMiddle * 100);
    if (price > lastBollUpper) bollComment = `Fiyat üst bandın ÜSTÜNDE — Aşırı genişleme (Bant genişliği: %${bandwidth.toFixed(1)})`;
    else if (price < lastBollLower) bollComment = `Fiyat alt bandın ALTINDA — Sıkışma (Bant genişliği: %${bandwidth.toFixed(1)})`;
    else bollComment = `Fiyat bantlar içinde (Bant genişliği: %${bandwidth.toFixed(1)})`;
  }

  // Destek/Direnç seviyeleri (son 50 mum'dan)
  const recentCandles = candles.slice(-50);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  // Hacim analizi
  const avgVolume = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
  const volumeRatio = last.volume / avgVolume;
  let volumeComment = '';
  if (volumeRatio > 2) volumeComment = `Hacim patlaması! (Ortalama'nın ${volumeRatio.toFixed(1)}x katı)`;
  else if (volumeRatio > 1.3) volumeComment = `Hacim ortalamanın üzerinde (${volumeRatio.toFixed(1)}x)`;
  else if (volumeRatio < 0.5) volumeComment = `Düşük hacim (${volumeRatio.toFixed(1)}x)`;
  else volumeComment = `Normal hacim (${volumeRatio.toFixed(1)}x)`;

  return {
    summary: {
      symbol: meta?.symbol || 'N/A',
      currency: meta?.currency || 'N/A',
      price: +price.toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePct.toFixed(2),
      dayHigh: last.high,
      dayLow: last.low,
      volume: last.volume,
      avgVolume20: Math.round(avgVolume),
      timestamp: last.time,
    },
    indicators: {
      ema: {
        ema9: lastEma9 ? +lastEma9.toFixed(2) : null,
        ema21: lastEma21 ? +lastEma21.toFixed(2) : null,
        ema50: lastEma50 ? +lastEma50.toFixed(2) : null,
      },
      rsi: {
        value: lastRSI ? +lastRSI.toFixed(2) : null,
        comment: rsiComment,
      },
      macd: {
        macdLine: lastMACD ? +lastMACD.toFixed(4) : null,
        signalLine: lastSignal ? +lastSignal.toFixed(4) : null,
        histogram: lastHistogram ? +lastHistogram.toFixed(4) : null,
        comment: macdComment,
      },
      bollinger: {
        upper: lastBollUpper ? +lastBollUpper.toFixed(2) : null,
        middle: lastBollMiddle ? +lastBollMiddle.toFixed(2) : null,
        lower: lastBollLower ? +lastBollLower.toFixed(2) : null,
        comment: bollComment,
      },
      atr: lastATR ? +lastATR.toFixed(2) : null,
      stochastic: lastStoch ? +lastStoch.toFixed(2) : null,
    },
    trend: trendSignals,
    supportResistance: {
      nearestResistance: +resistance.toFixed(2),
      nearestSupport: +support.toFixed(2),
      distanceToResistance: +((resistance - price) / price * 100).toFixed(2) + '%',
      distanceToSupport: +((price - support) / price * 100).toFixed(2) + '%',
    },
    volume: {
      current: last.volume,
      average20: Math.round(avgVolume),
      ratio: +volumeRatio.toFixed(2),
      comment: volumeComment,
    },
    lastCandles: candles.slice(-5),
  };
}

// ============================================================================
//  Piyasa Tarayıcı (Screener)
//  Tek sembol yerine bir listeyi tarayıp teknik skora göre sıralar.
//  "Şu an yükselişe en yatkın hisse hangisi?" sorusunun cevabı buradan çıkar.
// ============================================================================

// Sembol verilmezse taranan varsayılan evren
const UNIVERSE = {
  bist: [
    'THYAO', 'GARAN', 'AKBNK', 'ISCTR', 'YKBNK', 'ASELS', 'KCHOL', 'SAHOL',
    'EREGL', 'BIMAS', 'TUPRS', 'SISE', 'FROTO', 'TOASO', 'PGSUS', 'TCELL',
    'TTKOM', 'AGHOL', 'PETKM', 'SASA', 'ENKAI', 'ARCLK', 'MGROS', 'ALARK',
    'DOAS', 'TAVHL', 'VESTL', 'OYAKC', 'ASTOR', 'SOKM', 'HEKTS', 'KRDMD',
    'EKGYO', 'TKFEN', 'TTRAK', 'ULKER', 'VAKBN', 'HALKB', 'TSKB', 'ODAS',
    'SMRTG', 'CIMSA', 'AKSEN', 'AEFES', 'BRSAN', 'GUBRF', 'ISMEN', 'KONTR',
    'KORDS', 'MAVI', 'OTKAR', 'PENTA', 'REEDR', 'TRGYO', 'ZOREN', 'AKSA',
    'ANSGR', 'BERA', 'CANTE',
  ],
  us: [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO',
    'BRK-B', 'LLY', 'JPM', 'V', 'UNH', 'XOM', 'WMT', 'MA',
    'JNJ', 'PG', 'ORCL', 'HD', 'COST', 'ABBV', 'NFLX', 'BAC',
    'KO', 'MRK', 'CVX', 'AMD', 'PEP', 'ADBE', 'CRM', 'TMO',
    'LIN', 'MCD', 'CSCO', 'ACN', 'ABT', 'WFC', 'IBM', 'QCOM',
    'GE', 'DIS', 'TXN', 'CAT', 'VZ', 'INTU', 'AMGN', 'PFE',
    'CMCSA', 'NOW', 'PM', 'SPGI', 'UNP', 'RTX', 'AXP', 'LOW',
    'HON', 'BKNG', 'COP', 'T', 'NEE', 'UPS', 'BA', 'MS',
    'GS', 'BLK', 'ELV', 'SBUX', 'MDT', 'DE', 'PLD', 'LMT',
    'ADP', 'GILD', 'CVS', 'SCHW', 'MDLZ', 'TJX', 'C', 'CB',
    'SO', 'DUK', 'PYPL', 'MU', 'INTC', 'PLTR', 'UBER', 'COIN',
    'SHOP', 'ABNB', 'SNOW', 'RIVN', 'LCID', 'SOFI', 'HOOD', 'MSTR',
    'ARM', 'SMCI', 'DELL',
  ],
  crypto: [
    'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX',
    'LINK', 'DOT', 'LTC', 'SHIB', 'TRX', 'ATOM', 'XLM', 'NEAR',
    'ICP', 'FIL', 'ARB', 'OP', 'INJ',
  ],
  commodity: ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'PL=F', 'ZC=F', 'ZW=F'],
  forex: ['USDTRY', 'EURTRY', 'GBPTRY', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'],
  bond: ['^TNX', '^TYX', '^FVX', '^IRX'],
  viop: ['XU030', 'XU100'],
};

function calcROC(closes, period = 10) {
  const n = closes.length;
  if (n <= period) return null;
  const prev = closes[n - 1 - period];
  if (!prev) return null;
  return ((closes[n - 1] - prev) / prev) * 100;
}

/**
 * Tek sembol için teknik skor üretir.
 * Skor -100 (güçlü satış) .. +100 (güçlü alış) aralığına normalize edilir.
 */
function scoreSymbol(candles, meta) {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  if (n < 60) return null;

  const price = closes[n - 1];
  const ema9 = calcEMA(closes, 9)[n - 1];
  const ema21 = calcEMA(closes, 21)[n - 1];
  const ema50 = calcEMA(closes, 50)[n - 1];
  const rsi = calcRSI(closes, 14)[n - 1];
  const macd = calcMACD(closes);
  const hist = macd.histogram[n - 1];
  const histPrev = macd.histogram[n - 2];
  const boll = calcBollinger(closes, 20, 2);
  const bUp = boll.upper[n - 1];
  const bLo = boll.lower[n - 1];
  const bMid = boll.middle[n - 1];
  const atr = calcATR(candles, 14)[n - 1];
  const roc = calcROC(closes, 10);

  const avgVol = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
  const volRatio = avgVol > 0 ? candles[n - 1].volume / avgVol : 1;

  const signals = [];
  let score = 0;
  let maxScore = 0;

  const add = (name, dir, weight, detail) => {
    signals.push({ name, direction: dir > 0 ? 'AL' : dir < 0 ? 'SAT' : 'NÖTR', detail });
    score += dir * weight;
    maxScore += weight;
  };

  // 1) EMA dizilimi — en güçlü trend göstergesi
  if (ema9 && ema21 && ema50) {
    const dir = ema9 > ema21 && ema21 > ema50 ? 1 : ema9 < ema21 && ema21 < ema50 ? -1 : 0;
    add('EMA dizilimi', dir, 2,
      dir > 0 ? 'EMA9 > EMA21 > EMA50 (boğa dizilimi)'
        : dir < 0 ? 'EMA9 < EMA21 < EMA50 (ayı dizilimi)' : 'Karışık');
  }

  // 2) Fiyatın EMA50'ye göre konumu
  if (ema50) {
    add('Fiyat / EMA50', price > ema50 ? 1 : -1, 1.5,
      `${price} ${price > ema50 ? '>' : '<'} ${ema50.toFixed(2)}`);
  }

  // 3) MACD histogramı — hem işaret hem yön
  if (hist !== null && histPrev !== null) {
    const dir = hist > 0 ? (hist > histPrev ? 1 : 0.5) : (hist < histPrev ? -1 : -0.5);
    add('MACD', dir, 1.5,
      `histogram ${hist.toFixed(4)} (${hist > histPrev ? 'güçleniyor' : 'zayıflıyor'})`);
  }

  // 4) RSI bölgesi
  if (rsi !== null) {
    let dir = 0;
    let detail = `RSI ${rsi.toFixed(1)}`;
    if (rsi > 70) { dir = -1; detail += ' — aşırı alım'; }
    else if (rsi >= 55) { dir = 1; detail += ' — güçlü'; }
    else if (rsi >= 45) { dir = 0; detail += ' — nötr'; }
    else if (rsi >= 30) { dir = -0.5; detail += ' — zayıf'; }
    else { dir = 1; detail += ' — aşırı satım, tepki ihtimali'; }
    add('RSI (14)', dir, 1, detail);
  }

  // 5) Bollinger içindeki konum (%B)
  let pctB = null;
  if (bUp && bLo && bUp !== bLo) {
    pctB = ((price - bLo) / (bUp - bLo)) * 100;
    const dir = pctB > 95 ? -1 : pctB < 5 ? 1 : pctB > 55 ? 0.5 : pctB < 45 ? -0.5 : 0;
    add('Bollinger %B', dir, 1, `%B ${pctB.toFixed(0)}`);
  }

  // 6) Momentum (10 periyot değişim)
  if (roc !== null) {
    add('Momentum (ROC 10)', roc > 0 ? 1 : -1, 1, `%${roc.toFixed(2)}`);
  }

  // 7) Hacim teyidi — yönü doğrulayan hacim puanı artırır
  if (volRatio > 1.3 && roc !== null) {
    add('Hacim teyidi', roc > 0 ? 1 : -1, 0.5, `ortalamanın ${volRatio.toFixed(1)}x katı`);
  }

  const normalized = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const verdict =
    normalized >= 50 ? 'GÜÇLÜ AL'
      : normalized >= 20 ? 'AL'
        : normalized > -20 ? 'NÖTR'
          : normalized > -50 ? 'SAT' : 'GÜÇLÜ SAT';

  const recent = candles.slice(-50);
  const resistance = Math.max(...recent.map((c) => c.high));
  const support = Math.min(...recent.map((c) => c.low));

  return {
    price,
    currency: meta?.currency || null,
    asOf: candles[n - 1].time,
    score: normalized,
    verdict,
    signals,
    indicators: {
      ema9: ema9 ? +ema9.toFixed(2) : null,
      ema21: ema21 ? +ema21.toFixed(2) : null,
      ema50: ema50 ? +ema50.toFixed(2) : null,
      rsi14: rsi !== null ? +rsi.toFixed(2) : null,
      macdHistogram: hist !== null ? +hist.toFixed(4) : null,
      bollingerPercentB: pctB !== null ? +pctB.toFixed(1) : null,
      bollingerMiddle: bMid ? +bMid.toFixed(2) : null,
      atr14: atr ? +atr.toFixed(2) : null,
      roc10: roc !== null ? +roc.toFixed(2) : null,
      volumeRatio: +volRatio.toFixed(2),
    },
    supportResistance: {
      support,
      resistance,
      distanceToResistancePct: +(((resistance - price) / price) * 100).toFixed(2),
      distanceToSupportPct: +(((price - support) / price) * 100).toFixed(2),
    },
  };
}

/**
 * Bir sembol listesini tarar ve skora göre sıralar.
 * Yahoo'yu boğmamak için gruplar hâlinde paralel çeker.
 */
async function scanMarket({ market = 'bist', interval = '1d', symbols, top = 10 }) {
  const list = (symbols && symbols.length ? symbols : UNIVERSE[market] || UNIVERSE.bist)
    .map((s) => String(s).trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 120);

  const results = [];
  const failed = [];
  const BATCH = 8;

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (symbol) => {
        const json = await fetchYahooData(symbol, market, interval);
        const { candles, meta } = parseCandles(json, interval);
        const scored = scoreSymbol(candles, meta);
        if (!scored) throw new Error('Yetersiz veri');
        return { symbol, ...scored };
      }),
    );
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled') results.push(r.value);
      else failed.push({ symbol: batch[idx], error: r.reason?.message || 'hata' });
    });
  }

  results.sort((a, b) => b.score - a.score);
  const n = Math.max(1, Math.min(Number(top) || 10, results.length));

  return {
    market,
    interval,
    scanned: list.length,
    succeeded: results.length,
    failed,
    asOf: results.length ? results[0].asOf : null,
    scoring:
      'Skor -100..+100. EMA dizilimi (a2.0), fiyat/EMA50 (a1.5), MACD (a1.5), '
      + 'RSI (a1.0), Bollinger %B (a1.0), ROC10 momentum (a1.0), hacim teyidi (a0.5) '
      + 'agirliklariyla hesaplanir. >=50 GUCLU AL, >=20 AL, -20..20 NOTR, <=-20 SAT.',
    topBullish: results.slice(0, n),
    topBearish: results.slice(-n).reverse(),
    all: results.map((r) => ({ symbol: r.symbol, score: r.score, verdict: r.verdict, price: r.price })),
    disclaimer: 'Teknik gostergelere dayali siralama. Yatirim tavsiyesi degildir.',
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================================
//  Haberler
//
//  Birincil kaynak Yahoo Finance RSS — anahtar gerektirmez ve BIST dahil
//  her piyasada calisir. Cok sembollu besleme (s=A.IS,B.IS,...) piyasa geneli
//  haber icin kullanilir.
//
//  Ikincil kaynak Finnhub — yalnizca FINNHUB_API_KEY ortam degiskeni
//  tanimliysa devreye girer ve kurgulu genel/kripto/forex akislarini ekler.
//  Finnhub ucretsiz plani sirket haberlerinde sadece ABD sembollerini kapsar.
// ============================================================================

const RSS_BASE = 'https://feeds.finance.yahoo.com/rss/2.0/headline';

function decodeEntities(str) {
  return String(str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1]) : null;
}

/** Yahoo Finance RSS beslemesinden haber cek. symbols: dizi veya tek sembol. */
async function fetchYahooRssNews(yahooSymbols) {
  const s = (Array.isArray(yahooSymbols) ? yahooSymbols : [yahooSymbols]).join(',');
  const url = `${RSS_BASE}?s=${encodeURIComponent(s)}&region=US&lang=en-US`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BorsaTakipAPI/1.0)' },
  });
  if (!res.ok) throw new Error(`Yahoo RSS HTTP ${res.status}`);
  const xml = await res.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    const pub = pickTag(b, 'pubDate');
    return {
      title: pickTag(b, 'title'),
      summary: pickTag(b, 'description'),
      url: pickTag(b, 'link'),
      source: 'Yahoo Finance',
      publishedAt: pub ? new Date(pub).toISOString() : null,
      relatedSymbols: (b.match(/<category[^>]*>([\s\S]*?)<\/category>/g) || [])
        .map((c) => decodeEntities(c.replace(/<\/?category[^>]*>/g, ''))).filter(Boolean),
    };
  }).filter((n) => n.title && n.url);
}

/** Finnhub kurgulu akislari — yalnizca anahtar varsa. */
async function fetchFinnhubNews(category = 'general') {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  const allowed = ['general', 'forex', 'crypto', 'merger'];
  const cat = allowed.includes(category) ? category : 'general';
  const res = await fetch(`https://finnhub.io/api/v1/news?category=${cat}&token=${key}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data.map((n) => ({
    title: n.headline,
    summary: n.summary || null,
    url: n.url,
    source: n.source || 'Finnhub',
    publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
    relatedSymbols: n.related ? String(n.related).split(',').filter(Boolean) : [],
  })).filter((n) => n.title && n.url);
}

/** Finnhub sirket haberi — ucretsiz planda yalnizca ABD sembolleri. */
async function fetchFinnhubCompanyNews(symbol, days = 14) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${key}`,
  );
  if (!res.ok) return []; // 403 = ucretsiz planin kapsamadigi borsa
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data.map((n) => ({
    title: n.headline,
    summary: n.summary || null,
    url: n.url,
    source: n.source || 'Finnhub',
    publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
    relatedSymbols: n.related ? String(n.related).split(',').filter(Boolean) : [],
  })).filter((n) => n.title && n.url);
}

function dedupeNews(items) {
  const seen = new Set();
  return items.filter((n) => {
    const k = (n.url || n.title || '').toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Haber getir.
 *  - symbol verilirse o enstrumana ait haberler
 *  - verilmezse piyasa geneli (o piyasanin buyuk sembollerinin ortak beslemesi)
 */
async function getNews({ symbol, market = 'bist', category, limit = 10 } = {}) {
  const max = Math.max(1, Math.min(Number(limit) || 10, 50));
  const sources = [];
  const byDate = (a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  };

  // primary  = sorulan sembole/piyasaya dogrudan ait haberler
  // secondary= genel piyasa akisi (Finnhub); ilgili haberleri ezmesin diye sonra gelir
  let primary = [];
  let secondary = [];

  if (symbol) {
    const ySym = resolveYahooSymbol(symbol, market);
    try {
      const rss = await fetchYahooRssNews(ySym);
      if (rss.length) { primary = primary.concat(rss); sources.push('Yahoo Finance RSS'); }
    } catch { /* RSS kaynagi sessizce atlanir */ }

    // Sirkete ozel Finnhub haberi de birincil sayilir (ucretsiz planda ABD)
    if (process.env.FINNHUB_API_KEY && (market === 'us' || primary.length < 3)) {
      const fh = await fetchFinnhubCompanyNews(ySym);
      if (fh.length) { primary = primary.concat(fh); sources.push('Finnhub company-news'); }
    }
  } else {
    // Piyasa geneli: o piyasanin buyuk sembollerinin ortak RSS beslemesi
    const universe = (UNIVERSE[market] || UNIVERSE.bist).slice(0, 8)
      .map((s) => resolveYahooSymbol(s, market));
    try {
      const rss = await fetchYahooRssNews(universe);
      if (rss.length) { primary = primary.concat(rss); sources.push('Yahoo Finance RSS'); }
    } catch { /* atla */ }

    if (process.env.FINNHUB_API_KEY) {
      const cat = category || (market === 'crypto' ? 'crypto' : market === 'forex' ? 'forex' : 'general');
      const fh = await fetchFinnhubNews(cat);
      if (fh.length) { secondary = fh; sources.push(`Finnhub ${cat}`); }
    }
  }

  primary = dedupeNews(primary.sort(byDate)).map((n) => ({ ...n, scope: symbol ? 'symbol' : 'market' }));
  secondary = dedupeNews(secondary.sort(byDate)).map((n) => ({ ...n, scope: 'global' }));

  // Ilgili haberler once; kalan yer genel akisla doldurulur
  const items = dedupeNews([...primary, ...secondary]);

  return {
    requested: { symbol: symbol || null, market, category: category || null, limit: max },
    sources,
    finnhubEnabled: !!process.env.FINNHUB_API_KEY,
    count: Math.min(items.length, max),
    news: items.slice(0, max),
    note: items.length === 0
      ? 'Bu sembol icin haber bulunamadi. Kucuk sermayeli BIST hisselerinde kapsama sinirli olabilir; '
        + 'sembolsuz cagirarak piyasa geneli haberlere bakabilirsiniz.'
      : undefined,
    disclaimer: 'Haberler ucuncu taraf kaynaklardan gelir. Yatirim tavsiyesi degildir.',
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================================
//  Sembol Arama (Yahoo Finance search)
// ============================================================================
async function searchSymbols(query) {
  const url = `${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BorsaTakipAPI/1.0)' },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const marketOf = (q) => {
    const s = q.symbol || '';
    if (s.endsWith('.IS')) return 'bist';
    if (s.endsWith('-USD')) return 'crypto';
    if (s.endsWith('=X')) return 'forex';
    if (s.endsWith('=F')) return 'commodity';
    if (s.startsWith('^')) return 'bond';
    return 'us';
  };
  return (json.quotes || [])
    .filter((q) => q.symbol)
    .map((q) => ({
      symbol: q.symbol,
      market: marketOf(q),
      name: q.longname || q.shortname || null,
      exchange: q.exchDisp || q.exchange || null,
      type: q.quoteType || null,
    }));
}

// ============================================================================
//  Statik Cevaplar
// ============================================================================
export const MARKETS = {
  bist: { label: 'BIST (Borsa Istanbul)', suffix: '.IS', examples: ['THYAO', 'GARAN', 'ASELS'] },
  us: { label: 'ABD Borsasi (NYSE/NASDAQ)', suffix: '', examples: ['AAPL', 'MSFT', 'TSLA'] },
  crypto: { label: 'Kripto Para', suffix: '-USD', examples: ['BTC', 'ETH', 'SOL'] },
  commodity: { label: 'Emtia', suffix: '', examples: ['GC=F (Altin)', 'SI=F (Gumus)', 'CL=F (Petrol)'] },
  bond: { label: 'Tahvil', suffix: '', examples: ['^TNX (US 10Y)', '^TYX (US 30Y)'] },
  forex: { label: 'Doviz', suffix: '=X', examples: ['USDTRY', 'EURTRY', 'GBPTRY'] },
  viop: { label: 'VIOP', suffix: '.IS', examples: ['XU030'] },
};

export const INTERVALS = ['1h', '4h', '1d', '1wk', '1mo'];

const INDICATOR_LIST = {
  trend: ['EMA 9', 'EMA 21', 'EMA 50', 'Ichimoku Cloud', 'Parabolic SAR', 'Supertrend'],
  momentum: ['RSI (14)', 'MACD (12,26,9)', 'Stochastic (14,3,3)', 'CCI (20)', 'Williams %R', 'ROC (12)'],
  volatility: ['Bollinger Bands (20,2)', 'ATR (14)', 'Keltner Channels'],
  volume: ['OBV', 'VWAP', 'MFI (14)'],
};

// ============================================================================
//  API Dizini - bir AI ajani /api/v1 adresini okuyup tum uclari kesfedebilsin
// ============================================================================
function apiIndex(baseUrl) {
  const b = baseUrl || '';
  return {
    name: 'Finance Terminal API',
    description:
      'Borsa Istanbul, ABD borsasi, kripto, emtia, tahvil ve doviz icin canli fiyat, ' +
      'mum verisi, teknik analiz, piyasa taramasi ve haberler donduren, kimlik ' +
      'dogrulamasi gerektirmeyen JSON API.',
    version: '1.4.0',
    auth: 'Gerekmiyor - tum uclar herkese acik GET.',
    openapi: `${b}/api/v1/openapi.json`,
    mcp: `${b}/mcp`,
    markets: Object.keys(MARKETS),
    intervals: INTERVALS,
    coverage: {
      note: 'quote / candles / analyze / news uclari Yahoo Finance uzerinde islem goren HER sembolde calisir.',
      freshness: 'Son islem gununun mumu, Yahoo henuz kapanisi yayinlamamissa canli fiyattan tamamlanir; cevaplardaki asOf alani verinin ait oldugu gunu verir.',
      scanUniverse: {
        bist: UNIVERSE.bist.length,
        us: UNIVERSE.us.length,
        crypto: UNIVERSE.crypto.length,
        commodity: UNIVERSE.commodity.length,
        forex: UNIVERSE.forex.length,
        bond: UNIVERSE.bond.length,
        hint: 'scan varsayilan bir evren tarar; baska semboller icin symbols=A,B,C kullanin (en fazla 120).',
      },
    },
    endpoints: [
      { method: 'GET', path: '/api/v1', description: 'Bu dizin' },
      { method: 'GET', path: '/api/v1/openapi.json', description: 'OpenAPI 3.1 semasi' },
      { method: 'GET', path: '/api/v1/markets', description: 'Desteklenen piyasalar ve zaman dilimleri' },
      { method: 'GET', path: '/api/v1/indicators', description: 'Desteklenen teknik indikatorler' },
      { method: 'GET', path: '/api/v1/search?q=THY', description: 'Sembol arama' },
      { method: 'GET', path: '/api/v1/scan?market=bist&interval=1d&top=10', description: 'Piyasayi tara ve teknik skora gore sirala (yukselise en yatkin enstrumanlar)' },
      { method: 'GET', path: '/api/v1/news?symbol=THYAO&market=bist&limit=10', description: 'Haberler. symbol verilmezse piyasa geneli haberler.' },
      { method: 'GET', path: '/api/v1/quote/{symbol}?market=bist', description: 'Anlik fiyat ve gunluk degisim' },
      { method: 'GET', path: '/api/v1/candles/{symbol}?market=bist&interval=1d&limit=100', description: 'OHLCV mum verisi' },
      { method: 'GET', path: '/api/v1/analyze/{symbol}?market=bist&interval=1d', description: 'EMA/RSI/MACD/Bollinger/ATR, trend, destek-direnc ve hacim yorumu' },
      { method: 'POST', path: '/api/v1/ai/chat', description: 'Claude proxy (yalnizca uygulama kullanir; ANTHROPIC_API_KEY ortam degiskeni gerekir)' },
    ],
    examples: [
      `${b}/api/v1/analyze/THYAO?market=bist&interval=1d`,
      `${b}/api/v1/quote/AAPL?market=us`,
      `${b}/api/v1/candles/BTC?market=crypto&interval=1d&limit=50`,
      `${b}/api/v1/quote/USDTRY?market=forex`,
      `${b}/api/v1/search?q=aselsan`,
    ],
    notes: [
      'BIST sembolleri sade yazilir (THYAO); .IS eki market=bist ile otomatik eklenir.',
      'Kripto icin sade sembol yeterli (BTC); -USD otomatik eklenir.',
      'Veriler Yahoo Finance kaynaklidir, gecikmeli olabilir ve yatirim tavsiyesi degildir.',
    ],
    website: 'https://borsa.yusuftahakurt.com/',
  };
}

function openApiSpec(baseUrl) {
  const symbolParam = {
    name: 'symbol', in: 'path', required: true, schema: { type: 'string' },
    description: 'Enstruman sembolu, sade bicimde (THYAO, AAPL, BTC, USDTRY).',
  };
  const marketParam = {
    name: 'market', in: 'query', required: false,
    schema: { type: 'string', enum: Object.keys(MARKETS), default: 'bist' },
  };
  const intervalParam = {
    name: 'interval', in: 'query', required: false,
    schema: { type: 'string', enum: INTERVALS, default: '1d' },
  };
  const ok = { description: 'Basarili', content: { 'application/json': { schema: { type: 'object' } } } };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Finance Terminal API',
      version: '1.4.0',
      description:
        'BIST, ABD borsasi, kripto, emtia, tahvil ve doviz icin fiyat, mum verisi ve ' +
        'hazir teknik analiz. Kimlik dogrulamasi gerekmez.',
    },
    servers: [{ url: baseUrl || '/' }],
    paths: {
      '/api/v1/markets': { get: { operationId: 'listMarkets', summary: 'Desteklenen piyasalar', responses: { 200: ok } } },
      '/api/v1/indicators': { get: { operationId: 'listIndicators', summary: 'Desteklenen indikatorler', responses: { 200: ok } } },
      '/api/v1/search': {
        get: {
          operationId: 'searchSymbols', summary: 'Sembol arama',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: ok },
        },
      },
      '/api/v1/scan': {
        get: {
          operationId: 'scanMarket',
          summary: 'Piyasayi tara ve teknik skora gore sirala',
          parameters: [marketParam, intervalParam,
            { name: 'top', in: 'query', required: false, schema: { type: 'integer', default: 10, maximum: 120 } },
            { name: 'symbols', in: 'query', required: false, schema: { type: 'string' }, description: 'Virgulle ayrilmis sembol listesi' }],
          responses: { 200: ok },
        },
      },
      '/api/v1/news': {
        get: {
          operationId: 'getNews',
          summary: 'Haberler (sembol bazli veya piyasa geneli)',
          parameters: [
            { name: 'symbol', in: 'query', required: false, schema: { type: 'string' }, description: 'Bos birakilirsa piyasa geneli' },
            marketParam,
            { name: 'category', in: 'query', required: false, schema: { type: 'string', enum: ['general', 'forex', 'crypto', 'merger'] } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10, maximum: 50 } },
          ],
          responses: { 200: ok },
        },
      },
      '/api/v1/quote/{symbol}': {
        get: { operationId: 'getQuote', summary: 'Anlik fiyat', parameters: [symbolParam, marketParam], responses: { 200: ok } },
      },
      '/api/v1/candles/{symbol}': {
        get: {
          operationId: 'getCandles', summary: 'OHLCV mum verisi',
          parameters: [symbolParam, marketParam, intervalParam,
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100, maximum: 500 } }],
          responses: { 200: ok },
        },
      },
      '/api/v1/analyze/{symbol}': {
        get: {
          operationId: 'analyzeSymbol',
          summary: 'Teknik analiz (EMA, RSI, MACD, Bollinger, ATR, destek-direnc, hacim)',
          parameters: [symbolParam, marketParam, intervalParam],
          responses: { 200: ok },
        },
      },
    },
  };
}

// ============================================================================
//  Yonlendirici - ortam bagimsiz
//  @returns {Promise<{status:number, body:object}>}
// ============================================================================
export async function handleApiRequest(pathname, searchParams, baseUrl = '') {
  const params = searchParams || new URLSearchParams();
  const market = params.get('market') || 'bist';
  const interval = params.get('interval') || '1d';

  if (pathname === '/api/v1' || pathname === '/api/v1/') {
    return { status: 200, body: apiIndex(baseUrl) };
  }
  if (pathname === '/api/v1/openapi.json') {
    return { status: 200, body: openApiSpec(baseUrl) };
  }
  if (pathname === '/api/v1/markets') {
    return { status: 200, body: { markets: MARKETS, intervals: INTERVALS } };
  }
  if (pathname === '/api/v1/indicators') {
    return { status: 200, body: { indicators: INDICATOR_LIST } };
  }

  if (pathname === '/api/v1/news') {
    try {
      const body = await getNews({
        symbol: params.get('symbol') || null,
        market,
        category: params.get('category') || null,
        limit: params.get('limit'),
      });
      return { status: 200, body };
    } catch (err) {
      return { status: 502, body: { error: err.message } };
    }
  }

  if (pathname === '/api/v1/scan') {
    try {
      const symbolsParam = params.get('symbols');
      const body = await scanMarket({
        market,
        interval,
        symbols: symbolsParam ? symbolsParam.split(',') : null,
        top: params.get('top'),
      });
      return { status: 200, body };
    } catch (err) {
      return { status: 502, body: { error: err.message } };
    }
  }

  if (pathname === '/api/v1/search') {
    const q = params.get('q');
    if (!q) return { status: 400, body: { error: 'q parametresi gerekli', example: '/api/v1/search?q=aselsan' } };
    try {
      return { status: 200, body: { query: q, results: await searchSymbols(q) } };
    } catch (err) {
      return { status: 502, body: { error: err.message } };
    }
  }

  const HINT = 'Sembol veya market yanlis olabilir. /api/v1/search?q=... ile arayin.';

  const quoteMatch = pathname.match(/^\/api\/v1\/quote\/(.+)$/);
  if (quoteMatch) {
    const symbol = decodeURIComponent(quoteMatch[1]);
    try {
      const json = await fetchYahooData(symbol, market, '1m');
      const { meta } = parseCandles(json, '1m');
      const price = meta?.regularMarketPrice ?? 0;
      const prevClose = meta?.chartPreviousClose ?? price;
      const change = price - prevClose;
      const changePct = prevClose ? (change / prevClose) * 100 : 0;
      return {
        status: 200,
        body: {
          symbol: meta?.symbol,
          requested: { symbol, market },
          price: +price.toFixed(4),
          change: +change.toFixed(4),
          changePercent: +changePct.toFixed(2),
          currency: meta?.currency,
          exchange: meta?.exchangeName,
          marketState: meta?.marketState,
          asOf: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      return { status: 502, body: { error: err.message, hint: HINT } };
    }
  }

  const candlesMatch = pathname.match(/^\/api\/v1\/candles\/(.+)$/);
  if (candlesMatch) {
    const symbol = decodeURIComponent(candlesMatch[1]);
    const limit = Math.min(parseInt(params.get('limit') || '100', 10) || 100, 500);
    try {
      const json = await fetchYahooData(symbol, market, interval);
      const { candles, meta } = parseCandles(json, interval);
      return {
        status: 200,
        body: {
          symbol: meta?.symbol,
          requested: { symbol, market, interval },
          currency: meta?.currency,
          interval,
          count: Math.min(candles.length, limit),
          asOf: candles.length ? candles[candles.length - 1].time : null,
          candles: candles.slice(-limit),
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      return { status: 502, body: { error: err.message, hint: HINT } };
    }
  }

  const analyzeMatch = pathname.match(/^\/api\/v1\/analyze\/(.+)$/);
  if (analyzeMatch) {
    const symbol = decodeURIComponent(analyzeMatch[1]);
    try {
      const json = await fetchYahooData(symbol, market, interval);
      const { candles, meta } = parseCandles(json, interval);
      const analysis = generateAnalysis(candles, meta);
      return {
        status: 200,
        body: {
          ...analysis,
          requested: { symbol, market, interval },
          asOf: candles.length ? candles[candles.length - 1].time : null,
          disclaimer: 'Yatirim tavsiyesi degildir. Veriler Yahoo Finance kaynaklidir ve gecikmeli olabilir.',
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      return { status: 502, body: { error: err.message, hint: HINT } };
    }
  }

  return {
    status: 404,
    body: { error: 'Bilinmeyen uc nokta', pathname, seeAlso: `${baseUrl}/api/v1` },
  };
}

export {
  fetchYahooData, parseCandles, generateAnalysis, resolveYahooSymbol,
  searchSymbols, scanMarket, scoreSymbol, UNIVERSE, getNews,
};
