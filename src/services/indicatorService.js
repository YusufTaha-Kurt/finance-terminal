// ============================================================================
//  indicatorService.js — Teknik İndikatör Hesaplama Motoru (Genişletilmiş)
//  SMA, EMA, Wilder's RSI, MACD, Bollinger, Stochastic, ATR, ADX, CCI,
//  Williams %R, OBV, VWAP, Parabolic SAR, Ichimoku, Supertrend, Pivot,
//  MFI, ROC, Keltner Channels
// ============================================================================

// ============================================================================
//  TEMEL FONKSİYONLAR (SMA, EMA)
// ============================================================================

export const calculateSMA = (dataArray, period) => {
  if (!dataArray || dataArray.length === 0) return [];
  const smaValues = new Array(dataArray.length).fill(null);
  const validEntries = [];
  for (let i = 0; i < dataArray.length; i++) {
    if (dataArray[i] !== null && dataArray[i] !== undefined) {
      validEntries.push({ index: i, value: dataArray[i] });
    }
  }
  if (validEntries.length < period) return smaValues;
  for (let i = period - 1; i < validEntries.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += validEntries[j].value;
    }
    smaValues[validEntries[i].index] = sum / period;
  }
  return smaValues;
};

export const calculateEMA = (candles, period) => {
  if (!candles || candles.length === 0) return [];
  const emaValues = new Array(candles.length).fill(null);
  const multiplier = 2 / (period + 1);
  if (candles.length < period) return emaValues;
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += (candles[i].close !== undefined ? candles[i].close : candles[i]);
  }
  emaValues[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    const val = candles[i].close !== undefined ? candles[i].close : candles[i];
    emaValues[i] = (val - emaValues[i - 1]) * multiplier + emaValues[i - 1];
  }
  return emaValues;
};

/**
 * Sayı dizisi üzerinden EMA hesaplar (candles yerine ham değerler)
 */
const emaFromArray = (arr, period) => {
  const emaValues = new Array(arr.length).fill(null);
  const multiplier = 2 / (period + 1);
  
  // İlk geçerli değerleri bul
  const validEntries = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== null && arr[i] !== undefined) {
      validEntries.push({ index: i, value: arr[i] });
    }
  }
  
  if (validEntries.length < period) return emaValues;
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += validEntries[i].value;
  }
  emaValues[validEntries[period - 1].index] = sum / period;
  
  let prevEma = sum / period;
  for (let i = period; i < validEntries.length; i++) {
    const ema = (validEntries[i].value - prevEma) * multiplier + prevEma;
    emaValues[validEntries[i].index] = ema;
    prevEma = ema;
  }
  
  return emaValues;
};

// ============================================================================
//  RSI (Wilder's Smoothing)
// ============================================================================

export const calculateRSI = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return new Array(candles?.length || 0).fill(null);
  const rsiValues = new Array(candles.length).fill(null);
  const changes = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiValues[period] = 100 - 100 / (1 + rs);
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const currentRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues[i + 1] = 100 - 100 / (1 + currentRS);
  }
  return rsiValues;
};

// ============================================================================
//  MACD (12, 26, 9)
// ============================================================================

export const calculateMACD = (candles) => {
  if (!candles || candles.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;
  const emaFast = calculateEMA(candles, fastPeriod);
  const emaSlow = calculateEMA(candles, slowPeriod);
  const macdLine = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }
  const macdCandles = macdLine.map((v) => ({ close: v ?? 0 }));
  const firstValidIdx = macdLine.findIndex((v) => v !== null);
  const signalLine = new Array(candles.length).fill(null);
  if (firstValidIdx !== -1) {
    const validMacdCandles = macdCandles.slice(firstValidIdx);
    const signalEMA = calculateEMA(validMacdCandles, signalPeriod);
    for (let i = 0; i < signalEMA.length; i++) {
      signalLine[firstValidIdx + i] = signalEMA[i];
    }
  }
  const histogram = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }
  return { macdLine, signalLine, histogram };
};

// ============================================================================
//  Bollinger Bands (20, 2)
// ============================================================================

export const calculateBollinger = (candles, period = 20, multiplier = 2) => {
  if (!candles || candles.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }
  const upper = new Array(candles.length).fill(null);
  const middle = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const sma = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += Math.pow(candles[j].close - sma, 2);
    }
    const stdDev = Math.sqrt(sqSum / period);
    middle[i] = sma;
    upper[i] = sma + multiplier * stdDev;
    lower[i] = sma - multiplier * stdDev;
  }
  return { upper, middle, lower };
};

// ============================================================================
//  YENİ İNDİKATÖRLER
// ============================================================================

// --- True Range & ATR (Average True Range) ---
export const calculateATR = (candles, period = 14) => {
  if (!candles || candles.length < 2) return new Array(candles?.length || 0).fill(null);
  const atr = new Array(candles.length).fill(null);
  const tr = new Array(candles.length).fill(null);
  
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }
  
  if (candles.length < period) return atr;
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;
  
  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
};

// --- Stochastic Oscillator (14, 3, 3) ---
export const calculateStochastic = (candles, kPeriod = 14, dPeriod = 3) => {
  if (!candles || candles.length < kPeriod) {
    return { k: new Array(candles?.length || 0).fill(null), d: new Array(candles?.length || 0).fill(null) };
  }
  const k = new Array(candles.length).fill(null);
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let high = -Infinity, low = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > high) high = candles[j].high;
      if (candles[j].low < low) low = candles[j].low;
    }
    k[i] = high === low ? 50 : ((candles[i].close - low) / (high - low)) * 100;
  }
  
  const d = calculateSMA(k, dPeriod);
  return { k, d };
};

// --- ADX (Average Directional Index, 14) ---
export const calculateADX = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) {
    return { adx: new Array(candles?.length || 0).fill(null), pdi: new Array(candles?.length || 0).fill(null), mdi: new Array(candles?.length || 0).fill(null) };
  }
  
  const n = candles.length;
  const plusDM = new Array(n).fill(0);
  const minusDM = new Array(n).fill(0);
  const tr = new Array(n).fill(0);
  
  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }
  
  const atr = new Array(n).fill(null);
  const smoothPlusDM = new Array(n).fill(null);
  const smoothMinusDM = new Array(n).fill(null);
  const pdi = new Array(n).fill(null);
  const mdi = new Array(n).fill(null);
  const dx = new Array(n).fill(null);
  const adx = new Array(n).fill(null);
  
  let sumTR = 0, sumPDM = 0, sumMDM = 0;
  for (let i = 1; i <= period; i++) {
    sumTR += tr[i];
    sumPDM += plusDM[i];
    sumMDM += minusDM[i];
  }
  
  atr[period] = sumTR;
  smoothPlusDM[period] = sumPDM;
  smoothMinusDM[period] = sumMDM;
  pdi[period] = atr[period] > 0 ? (smoothPlusDM[period] / atr[period]) * 100 : 0;
  mdi[period] = atr[period] > 0 ? (smoothMinusDM[period] / atr[period]) * 100 : 0;
  dx[period] = (pdi[period] + mdi[period]) > 0 ? Math.abs(pdi[period] - mdi[period]) / (pdi[period] + mdi[period]) * 100 : 0;
  
  for (let i = period + 1; i < n; i++) {
    atr[i] = atr[i - 1] - (atr[i - 1] / period) + tr[i];
    smoothPlusDM[i] = smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / period) + plusDM[i];
    smoothMinusDM[i] = smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / period) + minusDM[i];
    pdi[i] = atr[i] > 0 ? (smoothPlusDM[i] / atr[i]) * 100 : 0;
    mdi[i] = atr[i] > 0 ? (smoothMinusDM[i] / atr[i]) * 100 : 0;
    dx[i] = (pdi[i] + mdi[i]) > 0 ? Math.abs(pdi[i] - mdi[i]) / (pdi[i] + mdi[i]) * 100 : 0;
  }
  
  // ADX = DX'in periyotluk EMA'sı
  let dxSum = 0;
  let dxCount = 0;
  for (let i = period; i < Math.min(period * 2, n); i++) {
    if (dx[i] !== null) {
      dxSum += dx[i];
      dxCount++;
    }
  }
  if (dxCount >= period && period * 2 <= n) {
    adx[period * 2 - 1] = dxSum / period;
    for (let i = period * 2; i < n; i++) {
      adx[i] = (adx[i - 1] * (period - 1) + (dx[i] ?? 0)) / period;
    }
  }
  
  return { adx, pdi, mdi };
};

// --- CCI (Commodity Channel Index, 20) ---
export const calculateCCI = (candles, period = 20) => {
  if (!candles || candles.length < period) return new Array(candles?.length || 0).fill(null);
  const cci = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    // Typical Price
    const tps = [];
    for (let j = i - period + 1; j <= i; j++) {
      tps.push((candles[j].high + candles[j].low + candles[j].close) / 3);
    }
    const mean = tps.reduce((a, b) => a + b, 0) / period;
    const meanDev = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    cci[i] = meanDev === 0 ? 0 : (tps[tps.length - 1] - mean) / (0.015 * meanDev);
  }
  return cci;
};

// --- Williams %R (-14) ---
export const calculateWilliamsR = (candles, period = 14) => {
  if (!candles || candles.length < period) return new Array(candles?.length || 0).fill(null);
  const wr = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    let high = -Infinity, low = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > high) high = candles[j].high;
      if (candles[j].low < low) low = candles[j].low;
    }
    wr[i] = high === low ? -50 : ((high - candles[i].close) / (high - low)) * -100;
  }
  return wr;
};

// --- OBV (On-Balance Volume) ---
export const calculateOBV = (candles) => {
  if (!candles || candles.length === 0) return [];
  const obv = new Array(candles.length).fill(null);
  obv[0] = candles[0].volume;
  
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv[i] = obv[i - 1] + candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      obv[i] = obv[i - 1] - candles[i].volume;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
};

// --- VWAP (Volume Weighted Average Price) ---
export const calculateVWAP = (candles) => {
  if (!candles || candles.length === 0) return [];
  const vwap = new Array(candles.length).fill(null);
  let cumTPV = 0;
  let cumVol = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumTPV += tp * candles[i].volume;
    cumVol += candles[i].volume;
    vwap[i] = cumVol > 0 ? cumTPV / cumVol : null;
  }
  return vwap;
};

// --- Parabolic SAR ---
export const calculateParabolicSAR = (candles, step = 0.02, maxStep = 0.2) => {
  if (!candles || candles.length < 2) return new Array(candles?.length || 0).fill(null);
  const sar = new Array(candles.length).fill(null);
  
  let isUpTrend = candles[1].close > candles[0].close;
  let af = step;
  let ep = isUpTrend ? candles[0].high : candles[0].low;
  sar[0] = isUpTrend ? candles[0].low : candles[0].high;
  
  for (let i = 1; i < candles.length; i++) {
    const prevSar = sar[i - 1] ?? (isUpTrend ? candles[i - 1].low : candles[i - 1].high);
    let newSar = prevSar + af * (ep - prevSar);
    
    if (isUpTrend) {
      newSar = Math.min(newSar, candles[i - 1].low, i >= 2 ? candles[i - 2].low : candles[i - 1].low);
      if (candles[i].low < newSar) {
        isUpTrend = false;
        newSar = ep;
        ep = candles[i].low;
        af = step;
      } else {
        if (candles[i].high > ep) {
          ep = candles[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      newSar = Math.max(newSar, candles[i - 1].high, i >= 2 ? candles[i - 2].high : candles[i - 1].high);
      if (candles[i].high > newSar) {
        isUpTrend = true;
        newSar = ep;
        ep = candles[i].high;
        af = step;
      } else {
        if (candles[i].low < ep) {
          ep = candles[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
    
    sar[i] = newSar;
  }
  return sar;
};

// --- Ichimoku Cloud ---
export const calculateIchimoku = (candles, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52, displacement = 26) => {
  if (!candles || candles.length === 0) {
    return { tenkan: [], kijun: [], senkouA: [], senkouB: [], chikou: [] };
  }
  const n = candles.length;
  
  const getHighLow = (start, end) => {
    let high = -Infinity, low = Infinity;
    for (let j = start; j <= end; j++) {
      if (candles[j].high > high) high = candles[j].high;
      if (candles[j].low < low) low = candles[j].low;
    }
    return (high + low) / 2;
  };
  
  const tenkan = new Array(n).fill(null);
  const kijun = new Array(n).fill(null);
  const senkouA = new Array(n + displacement).fill(null);
  const senkouB = new Array(n + displacement).fill(null);
  const chikou = new Array(n).fill(null);
  
  for (let i = 0; i < n; i++) {
    if (i >= tenkanPeriod - 1) tenkan[i] = getHighLow(i - tenkanPeriod + 1, i);
    if (i >= kijunPeriod - 1) kijun[i] = getHighLow(i - kijunPeriod + 1, i);
    if (tenkan[i] !== null && kijun[i] !== null) {
      senkouA[i + displacement] = (tenkan[i] + kijun[i]) / 2;
    }
    if (i >= senkouBPeriod - 1) {
      senkouB[i + displacement] = getHighLow(i - senkouBPeriod + 1, i);
    }
    if (i >= displacement) {
      chikou[i - displacement] = candles[i].close;
    }
  }
  
  return { tenkan: tenkan.slice(0, n), kijun: kijun.slice(0, n), senkouA: senkouA.slice(0, n), senkouB: senkouB.slice(0, n), chikou: chikou.slice(0, n) };
};

// --- Supertrend (ATR tabanlı, 10, 3) ---
export const calculateSupertrend = (candles, period = 10, multiplier = 3) => {
  if (!candles || candles.length < period) {
    return { supertrend: new Array(candles?.length || 0).fill(null), direction: new Array(candles?.length || 0).fill(null) };
  }
  
  const atr = calculateATR(candles, period);
  const supertrend = new Array(candles.length).fill(null);
  const direction = new Array(candles.length).fill(null); // 1=up(bullish), -1=down(bearish)
  
  let prevUpperBand = 0, prevLowerBand = 0, prevSupertrend = 0, prevDir = 1;
  
  for (let i = period - 1; i < candles.length; i++) {
    if (atr[i] === null) continue;
    
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let upperBand = hl2 + multiplier * atr[i];
    let lowerBand = hl2 - multiplier * atr[i];
    
    if (i > period - 1) {
      upperBand = upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand ? upperBand : prevUpperBand;
      lowerBand = lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand ? lowerBand : prevLowerBand;
    }
    
    let dir;
    if (i === period - 1) {
      dir = candles[i].close > upperBand ? 1 : -1;
    } else {
      if (prevDir === 1 && candles[i].close < lowerBand) dir = -1;
      else if (prevDir === -1 && candles[i].close > upperBand) dir = 1;
      else dir = prevDir;
    }
    
    supertrend[i] = dir === 1 ? lowerBand : upperBand;
    direction[i] = dir;
    
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = supertrend[i];
    prevDir = dir;
  }
  
  return { supertrend, direction };
};

// --- Pivot Points ---
export const calculatePivotPoints = (candles) => {
  if (!candles || candles.length === 0) {
    return { pivot: [], r1: [], r2: [], r3: [], s1: [], s2: [], s3: [] };
  }
  const n = candles.length;
  const pivot = new Array(n).fill(null);
  const r1 = new Array(n).fill(null);
  const r2 = new Array(n).fill(null);
  const r3 = new Array(n).fill(null);
  const s1 = new Array(n).fill(null);
  const s2 = new Array(n).fill(null);
  const s3 = new Array(n).fill(null);
  
  for (let i = 1; i < n; i++) {
    const prev = candles[i - 1];
    const p = (prev.high + prev.low + prev.close) / 3;
    pivot[i] = p;
    r1[i] = 2 * p - prev.low;
    s1[i] = 2 * p - prev.high;
    r2[i] = p + (prev.high - prev.low);
    s2[i] = p - (prev.high - prev.low);
    r3[i] = prev.high + 2 * (p - prev.low);
    s3[i] = prev.low - 2 * (prev.high - p);
  }
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
};

// --- MFI (Money Flow Index, 14) ---
export const calculateMFI = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return new Array(candles?.length || 0).fill(null);
  const mfi = new Array(candles.length).fill(null);
  
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const rawMF = candles.map((c, i) => tp[i] * c.volume);
  
  for (let i = period; i < candles.length; i++) {
    let posMF = 0, negMF = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posMF += rawMF[j];
      else negMF += rawMF[j];
    }
    const mfr = negMF === 0 ? 100 : posMF / negMF;
    mfi[i] = 100 - 100 / (1 + mfr);
  }
  return mfi;
};

// --- ROC (Rate of Change, 12) ---
export const calculateROC = (candles, period = 12) => {
  if (!candles || candles.length <= period) return new Array(candles?.length || 0).fill(null);
  const roc = new Array(candles.length).fill(null);
  
  for (let i = period; i < candles.length; i++) {
    roc[i] = ((candles[i].close - candles[i - period].close) / candles[i - period].close) * 100;
  }
  return roc;
};

// --- Keltner Channels (20, 2) ---
export const calculateKeltner = (candles, emaPeriod = 20, atrPeriod = 10, multiplier = 2) => {
  if (!candles || candles.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }
  const ema = calculateEMA(candles, emaPeriod);
  const atr = calculateATR(candles, atrPeriod);
  const n = candles.length;
  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  
  for (let i = 0; i < n; i++) {
    if (ema[i] !== null && atr[i] !== null) {
      middle[i] = ema[i];
      upper[i] = ema[i] + multiplier * atr[i];
      lower[i] = ema[i] - multiplier * atr[i];
    }
  }
  return { upper, middle, lower };
};

// ============================================================================
//  İNDİKATÖR METADATA — UI için kategori ve parametre bilgileri
// ============================================================================

export const INDICATOR_CATALOG = {
  // Overlay (ana grafik üzerinde)
  ema9:       { name: 'EMA 9', category: 'trend', overlay: true, color: '#f7d731', default: true },
  ema21:      { name: 'EMA 21', category: 'trend', overlay: true, color: '#ff9800', default: true },
  ema50:      { name: 'EMA 50', category: 'trend', overlay: true, color: '#2196f3', default: true },
  bollinger:  { name: 'Bollinger Bands', category: 'volatility', overlay: true, color: '#9c27b0', default: false },
  ichimoku:   { name: 'Ichimoku Cloud', category: 'trend', overlay: true, color: '#00bcd4', default: false },
  vwap:       { name: 'VWAP', category: 'volume', overlay: true, color: '#ff5722', default: false },
  psar:       { name: 'Parabolic SAR', category: 'trend', overlay: true, color: '#e91e63', default: false },
  supertrend: { name: 'Supertrend', category: 'trend', overlay: true, color: '#4caf50', default: false },
  keltner:    { name: 'Keltner Channels', category: 'volatility', overlay: true, color: '#795548', default: false },
  pivot:      { name: 'Pivot Points', category: 'trend', overlay: true, color: '#607d8b', default: false },
  
  // Osilatörler (alt paneller)
  rsi:        { name: 'RSI (14)', category: 'momentum', overlay: false, color: '#b39ddb', default: true },
  macd:       { name: 'MACD', category: 'momentum', overlay: false, color: '#2196f3', default: true },
  stochastic: { name: 'Stochastic', category: 'momentum', overlay: false, color: '#00bcd4', default: false },
  cci:        { name: 'CCI (20)', category: 'momentum', overlay: false, color: '#ff9800', default: false },
  williamsR:  { name: 'Williams %R', category: 'momentum', overlay: false, color: '#e91e63', default: false },
  atr:        { name: 'ATR (14)', category: 'volatility', overlay: false, color: '#4caf50', default: false },
  adx:        { name: 'ADX (14)', category: 'trend', overlay: false, color: '#9c27b0', default: false },
  obv:        { name: 'OBV', category: 'volume', overlay: false, color: '#ff5722', default: false },
  mfi:        { name: 'MFI (14)', category: 'volume', overlay: false, color: '#3f51b5', default: false },
  roc:        { name: 'ROC (12)', category: 'momentum', overlay: false, color: '#009688', default: false },
};

export const INDICATOR_CATEGORIES = {
  trend: { label: 'Trend', icon: '📈' },
  momentum: { label: 'Momentum', icon: '⚡' },
  volatility: { label: 'Volatilite', icon: '🌊' },
  volume: { label: 'Hacim', icon: '📊' },
};

// ============================================================================
//  calculateAll — Seçili indikatörleri hesapla
// ============================================================================

export const calculateAll = (candles, activeIndicators = null) => {
  if (!candles || candles.length === 0) {
    return {
      ema9: [], ema21: [], ema50: [],
      rsi: [], rsiSma: [],
      macd: { macdLine: [], signalLine: [], histogram: [] },
      bollinger: { upper: [], middle: [], lower: [] },
    };
  }

  // Varsayılan indikatörler (geriye uyumluluk)
  const active = activeIndicators || Object.keys(INDICATOR_CATALOG).filter(k => INDICATOR_CATALOG[k].default);

  const result = {};
  
  // Temel EMA'lar
  if (active.includes('ema9')) result.ema9 = calculateEMA(candles, 9);
  if (active.includes('ema21')) result.ema21 = calculateEMA(candles, 21);
  if (active.includes('ema50')) result.ema50 = calculateEMA(candles, 50);
  
  // RSI
  if (active.includes('rsi')) {
    result.rsi = calculateRSI(candles, 14);
    result.rsiSma = calculateSMA(result.rsi, 14);
  }
  
  // MACD
  if (active.includes('macd')) result.macd = calculateMACD(candles);
  
  // Bollinger
  if (active.includes('bollinger')) result.bollinger = calculateBollinger(candles, 20, 2);
  
  // Yeni indikatörler
  if (active.includes('stochastic')) result.stochastic = calculateStochastic(candles, 14, 3);
  if (active.includes('atr')) result.atr = calculateATR(candles, 14);
  if (active.includes('adx')) result.adx = calculateADX(candles, 14);
  if (active.includes('cci')) result.cci = calculateCCI(candles, 20);
  if (active.includes('williamsR')) result.williamsR = calculateWilliamsR(candles, 14);
  if (active.includes('obv')) result.obv = calculateOBV(candles);
  if (active.includes('vwap')) result.vwap = calculateVWAP(candles);
  if (active.includes('psar')) result.psar = calculateParabolicSAR(candles);
  if (active.includes('ichimoku')) result.ichimoku = calculateIchimoku(candles);
  if (active.includes('supertrend')) result.supertrend = calculateSupertrend(candles, 10, 3);
  if (active.includes('pivot')) result.pivot = calculatePivotPoints(candles);
  if (active.includes('mfi')) result.mfi = calculateMFI(candles, 14);
  if (active.includes('roc')) result.roc = calculateROC(candles, 12);
  if (active.includes('keltner')) result.keltner = calculateKeltner(candles, 20, 10, 2);

  // Signal engine için geriye uyumluluk: eksikleri default ile doldur
  if (!result.ema9) result.ema9 = calculateEMA(candles, 9);
  if (!result.ema21) result.ema21 = calculateEMA(candles, 21);
  if (!result.ema50) result.ema50 = calculateEMA(candles, 50);
  if (!result.rsi) { result.rsi = calculateRSI(candles, 14); result.rsiSma = calculateSMA(result.rsi, 14); }
  if (!result.macd) result.macd = calculateMACD(candles);
  if (!result.bollinger) result.bollinger = calculateBollinger(candles, 20, 2);

  return result;
};
