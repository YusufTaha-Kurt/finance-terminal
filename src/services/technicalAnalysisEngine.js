// ============================================================================
//  technicalAnalysisEngine.js — Teknik Analiz Özet Motoru
//  Her indikatör için Al/Sat/Nötr analizi yapar, Investing.com benzeri
//  kategori özetleri ve genel değerlendirme üretir.
// ============================================================================

import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollinger,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateCCI,
  calculateWilliamsR,
  calculateMFI,
  calculateROC,
  calculateParabolicSAR,
  calculateIchimoku,
  calculateSupertrend,
  calculateSMA,
} from './indicatorService';

// ============================================================================
//  Sinyal Sabitleri
// ============================================================================
const SIGNAL = {
  STRONG_BUY: 'Güçlü Al',
  BUY: 'Al',
  NEUTRAL: 'Nötr',
  SELL: 'Sat',
  STRONG_SELL: 'Güçlü Sat',
};

// Sinyali sayısal değere çevir (toplam puan hesabı için)
const signalScore = (signal) => {
  switch (signal) {
    case SIGNAL.STRONG_BUY: return 2;
    case SIGNAL.BUY: return 1;
    case SIGNAL.NEUTRAL: return 0;
    case SIGNAL.SELL: return -1;
    case SIGNAL.STRONG_SELL: return -2;
    default: return 0;
  }
};

// Puana göre genel sinyal belirle
const scoreToSignal = (score, count) => {
  if (count === 0) return SIGNAL.NEUTRAL;
  const avg = score / count;
  if (avg >= 1.0) return SIGNAL.STRONG_BUY;
  if (avg >= 0.3) return SIGNAL.BUY;
  if (avg > -0.3) return SIGNAL.NEUTRAL;
  if (avg > -1.0) return SIGNAL.SELL;
  return SIGNAL.STRONG_SELL;
};

// ============================================================================
//  Hareketli Ortalama Analizleri
// ============================================================================
const analyzeMovingAverages = (candles) => {
  if (!candles || candles.length < 2) return [];
  const lastCandle = candles[candles.length - 1];
  const price = lastCandle.close;
  const results = [];

  // EMA'lar
  const emaPeriods = [
    { period: 5, label: 'EMA (5)' },
    { period: 9, label: 'EMA (9)' },
    { period: 10, label: 'EMA (10)' },
    { period: 20, label: 'EMA (20)' },
    { period: 21, label: 'EMA (21)' },
    { period: 30, label: 'EMA (30)' },
    { period: 50, label: 'EMA (50)' },
    { period: 100, label: 'EMA (100)' },
    { period: 200, label: 'EMA (200)' },
  ];

  emaPeriods.forEach(({ period, label }) => {
    if (candles.length < period) return;
    const emaArr = calculateEMA(candles, period);
    const value = emaArr[emaArr.length - 1];
    if (value === null || value === undefined) return;

    let signal, description;
    const diff = ((price - value) / value) * 100;

    if (price > value) {
      signal = Math.abs(diff) > 2 ? SIGNAL.STRONG_BUY : SIGNAL.BUY;
      description = `Fiyat (${price.toFixed(2)}) ${label}'ın (${value.toFixed(2)}) üzerinde`;
    } else if (price < value) {
      signal = Math.abs(diff) > 2 ? SIGNAL.STRONG_SELL : SIGNAL.SELL;
      description = `Fiyat (${price.toFixed(2)}) ${label}'ın (${value.toFixed(2)}) altında`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Fiyat ${label} ile aynı seviyede`;
    }

    results.push({ name: label, value: value.toFixed(2), signal, description, category: 'ma' });
  });

  // SMA'lar
  const smaPeriods = [
    { period: 5, label: 'SMA (5)' },
    { period: 10, label: 'SMA (10)' },
    { period: 20, label: 'SMA (20)' },
    { period: 50, label: 'SMA (50)' },
    { period: 100, label: 'SMA (100)' },
    { period: 200, label: 'SMA (200)' },
  ];

  smaPeriods.forEach(({ period, label }) => {
    if (candles.length < period) return;
    const closes = candles.map(c => c.close);
    const smaArr = calculateSMA(closes, period);
    const value = smaArr[smaArr.length - 1];
    if (value === null || value === undefined) return;

    let signal, description;
    const diff = ((price - value) / value) * 100;

    if (price > value) {
      signal = Math.abs(diff) > 2 ? SIGNAL.STRONG_BUY : SIGNAL.BUY;
      description = `Fiyat (${price.toFixed(2)}) ${label}'ın (${value.toFixed(2)}) üzerinde`;
    } else if (price < value) {
      signal = Math.abs(diff) > 2 ? SIGNAL.STRONG_SELL : SIGNAL.SELL;
      description = `Fiyat (${price.toFixed(2)}) ${label}'ın (${value.toFixed(2)}) altında`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Fiyat ${label} ile aynı seviyede`;
    }

    results.push({ name: label, value: value.toFixed(2), signal, description, category: 'ma' });
  });

  return results;
};

// ============================================================================
//  Osilatör / Teknik İndikatör Analizleri
// ============================================================================
const analyzeOscillators = (candles) => {
  if (!candles || candles.length < 2) return [];
  const lastCandle = candles[candles.length - 1];
  const price = lastCandle.close;
  const results = [];

  // ── RSI ───────────────────────────────────────────────────────
  const rsiArr = calculateRSI(candles, 14);
  const rsiVal = rsiArr[rsiArr.length - 1];
  if (rsiVal !== null && rsiVal !== undefined) {
    let signal, description;
    if (rsiVal < 20) {
      signal = SIGNAL.STRONG_BUY;
      description = `RSI (${rsiVal.toFixed(1)}) aşırı satım bölgesinde — güçlü toparlanma potansiyeli`;
    } else if (rsiVal < 30) {
      signal = SIGNAL.BUY;
      description = `RSI (${rsiVal.toFixed(1)}) satım bölgesinde — alım fırsatı`;
    } else if (rsiVal > 80) {
      signal = SIGNAL.STRONG_SELL;
      description = `RSI (${rsiVal.toFixed(1)}) aşırı alım bölgesinde — sert düzeltme riski`;
    } else if (rsiVal > 70) {
      signal = SIGNAL.SELL;
      description = `RSI (${rsiVal.toFixed(1)}) alım bölgesinde — satış baskısı olabilir`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `RSI (${rsiVal.toFixed(1)}) nötr bölgede`;
    }
    results.push({ name: 'RSI (14)', value: rsiVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── MACD ──────────────────────────────────────────────────────
  const macd = calculateMACD(candles);
  const macdVal = macd.macdLine[macd.macdLine.length - 1];
  const signalVal = macd.signalLine[macd.signalLine.length - 1];
  const histVal = macd.histogram[macd.histogram.length - 1];
  if (macdVal !== null && signalVal !== null) {
    let signal, description;
    const prevHist = macd.histogram[macd.histogram.length - 2];
    if (macdVal > signalVal && histVal > 0 && (prevHist !== null && histVal > prevHist)) {
      signal = SIGNAL.STRONG_BUY;
      description = `MACD (${macdVal.toFixed(3)}) sinyal çizgisinin üstünde, histogram genişliyor`;
    } else if (macdVal > signalVal) {
      signal = SIGNAL.BUY;
      description = `MACD (${macdVal.toFixed(3)}) sinyal çizgisinin (${signalVal.toFixed(3)}) üstünde`;
    } else if (macdVal < signalVal && histVal < 0 && (prevHist !== null && histVal < prevHist)) {
      signal = SIGNAL.STRONG_SELL;
      description = `MACD (${macdVal.toFixed(3)}) sinyal çizgisinin altında, histogram daralıyor`;
    } else if (macdVal < signalVal) {
      signal = SIGNAL.SELL;
      description = `MACD (${macdVal.toFixed(3)}) sinyal çizgisinin (${signalVal.toFixed(3)}) altında`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = 'MACD sinyal çizgisi ile aynı seviyede';
    }
    results.push({ name: 'MACD (12,26)', value: macdVal.toFixed(3), signal, description, category: 'oscillator' });
  }

  // ── Stochastic ────────────────────────────────────────────────
  const stoch = calculateStochastic(candles, 14, 3);
  const kVal = stoch.k[stoch.k.length - 1];
  const dVal = stoch.d[stoch.d.length - 1];
  if (kVal !== null && kVal !== undefined) {
    let signal, description;
    if (kVal < 20 && dVal !== null && kVal > dVal) {
      signal = SIGNAL.STRONG_BUY;
      description = `Stochastic K (${kVal.toFixed(1)}) aşırı satım bölgesinde, D'yi yukarı kesiyor`;
    } else if (kVal < 20) {
      signal = SIGNAL.BUY;
      description = `Stochastic K (${kVal.toFixed(1)}) aşırı satım bölgesinde`;
    } else if (kVal > 80 && dVal !== null && kVal < dVal) {
      signal = SIGNAL.STRONG_SELL;
      description = `Stochastic K (${kVal.toFixed(1)}) aşırı alım bölgesinde, D'yi aşağı kesiyor`;
    } else if (kVal > 80) {
      signal = SIGNAL.SELL;
      description = `Stochastic K (${kVal.toFixed(1)}) aşırı alım bölgesinde`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Stochastic K (${kVal.toFixed(1)}) nötr bölgede`;
    }
    results.push({ name: 'Stochastic (14,3,3)', value: kVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── CCI ───────────────────────────────────────────────────────
  const cciArr = calculateCCI(candles, 20);
  const cciVal = cciArr[cciArr.length - 1];
  if (cciVal !== null && cciVal !== undefined) {
    let signal, description;
    if (cciVal < -200) {
      signal = SIGNAL.STRONG_BUY;
      description = `CCI (${cciVal.toFixed(1)}) aşırı satım — güçlü dip sinyali`;
    } else if (cciVal < -100) {
      signal = SIGNAL.BUY;
      description = `CCI (${cciVal.toFixed(1)}) satım bölgesinde`;
    } else if (cciVal > 200) {
      signal = SIGNAL.STRONG_SELL;
      description = `CCI (${cciVal.toFixed(1)}) aşırı alım — tepe sinyali`;
    } else if (cciVal > 100) {
      signal = SIGNAL.SELL;
      description = `CCI (${cciVal.toFixed(1)}) alım bölgesinde`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `CCI (${cciVal.toFixed(1)}) nötr bölgede`;
    }
    results.push({ name: 'CCI (20)', value: cciVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── Williams %R ───────────────────────────────────────────────
  const wrArr = calculateWilliamsR(candles, 14);
  const wrVal = wrArr[wrArr.length - 1];
  if (wrVal !== null && wrVal !== undefined) {
    let signal, description;
    if (wrVal < -80) {
      signal = SIGNAL.BUY;
      description = `Williams %R (${wrVal.toFixed(1)}) aşırı satım bölgesinde`;
    } else if (wrVal > -20) {
      signal = SIGNAL.SELL;
      description = `Williams %R (${wrVal.toFixed(1)}) aşırı alım bölgesinde`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Williams %R (${wrVal.toFixed(1)}) nötr bölgede`;
    }
    results.push({ name: 'Williams %R', value: wrVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── MFI ───────────────────────────────────────────────────────
  const mfiArr = calculateMFI(candles, 14);
  const mfiVal = mfiArr[mfiArr.length - 1];
  if (mfiVal !== null && mfiVal !== undefined) {
    let signal, description;
    if (mfiVal < 20) {
      signal = SIGNAL.BUY;
      description = `MFI (${mfiVal.toFixed(1)}) aşırı satım — para akışı zayıf, dip potansiyeli`;
    } else if (mfiVal > 80) {
      signal = SIGNAL.SELL;
      description = `MFI (${mfiVal.toFixed(1)}) aşırı alım — para akışı güçlü, tepe potansiyeli`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `MFI (${mfiVal.toFixed(1)}) nötr bölgede`;
    }
    results.push({ name: 'MFI (14)', value: mfiVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── ROC ───────────────────────────────────────────────────────
  const rocArr = calculateROC(candles, 12);
  const rocVal = rocArr[rocArr.length - 1];
  if (rocVal !== null && rocVal !== undefined) {
    let signal, description;
    if (rocVal > 5) {
      signal = SIGNAL.STRONG_BUY;
      description = `ROC (%${rocVal.toFixed(2)}) güçlü yukarı momentum`;
    } else if (rocVal > 0) {
      signal = SIGNAL.BUY;
      description = `ROC (%${rocVal.toFixed(2)}) pozitif momentum`;
    } else if (rocVal < -5) {
      signal = SIGNAL.STRONG_SELL;
      description = `ROC (%${rocVal.toFixed(2)}) güçlü aşağı momentum`;
    } else if (rocVal < 0) {
      signal = SIGNAL.SELL;
      description = `ROC (%${rocVal.toFixed(2)}) negatif momentum`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `ROC (%${rocVal.toFixed(2)}) nötr`;
    }
    results.push({ name: 'ROC (12)', value: `%${rocVal.toFixed(2)}`, signal, description, category: 'oscillator' });
  }

  // ── ADX ───────────────────────────────────────────────────────
  const adxData = calculateADX(candles, 14);
  const adxVal = adxData.adx[adxData.adx.length - 1];
  const pdiVal = adxData.pdi[adxData.pdi.length - 1];
  const mdiVal = adxData.mdi[adxData.mdi.length - 1];
  if (adxVal !== null && adxVal !== undefined && pdiVal !== null && mdiVal !== null) {
    let signal, description;
    if (adxVal > 25 && pdiVal > mdiVal) {
      signal = SIGNAL.BUY;
      description = `ADX (${adxVal.toFixed(1)}) güçlü trend, +DI (${pdiVal.toFixed(1)}) > -DI (${mdiVal.toFixed(1)}) — yükseliş trendi`;
    } else if (adxVal > 25 && mdiVal > pdiVal) {
      signal = SIGNAL.SELL;
      description = `ADX (${adxVal.toFixed(1)}) güçlü trend, -DI (${mdiVal.toFixed(1)}) > +DI (${pdiVal.toFixed(1)}) — düşüş trendi`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `ADX (${adxVal.toFixed(1)}) zayıf trend — piyasa yatay`;
    }
    results.push({ name: 'ADX (14)', value: adxVal.toFixed(1), signal, description, category: 'oscillator' });
  }

  // ── Supertrend ────────────────────────────────────────────────
  const st = calculateSupertrend(candles, 10, 3);
  const stDir = st.direction[st.direction.length - 1];
  const stVal = st.supertrend[st.supertrend.length - 1];
  if (stDir !== null && stVal !== null) {
    let signal, description;
    if (stDir === 1) {
      signal = SIGNAL.BUY;
      description = `Supertrend (${stVal.toFixed(2)}) yükseliş modunda — fiyat destek üzerinde`;
    } else {
      signal = SIGNAL.SELL;
      description = `Supertrend (${stVal.toFixed(2)}) düşüş modunda — fiyat direnç altında`;
    }
    results.push({ name: 'Supertrend', value: stVal.toFixed(2), signal, description, category: 'oscillator' });
  }

  // ── Parabolic SAR ────────────────────────────────────────────
  const psarArr = calculateParabolicSAR(candles);
  const psarVal = psarArr[psarArr.length - 1];
  if (psarVal !== null && psarVal !== undefined) {
    let signal, description;
    if (price > psarVal) {
      signal = SIGNAL.BUY;
      description = `PSAR (${psarVal.toFixed(2)}) fiyatın altında — yükseliş trendi`;
    } else {
      signal = SIGNAL.SELL;
      description = `PSAR (${psarVal.toFixed(2)}) fiyatın üstünde — düşüş trendi`;
    }
    results.push({ name: 'Parabolic SAR', value: psarVal.toFixed(2), signal, description, category: 'oscillator' });
  }

  // ── Ichimoku ──────────────────────────────────────────────────
  const ichi = calculateIchimoku(candles);
  const tenkanVal = ichi.tenkan[ichi.tenkan.length - 1];
  const kijunVal = ichi.kijun[ichi.kijun.length - 1];
  if (tenkanVal !== null && kijunVal !== null) {
    let signal, description;
    if (price > kijunVal && tenkanVal > kijunVal) {
      signal = SIGNAL.BUY;
      description = `Ichimoku — Fiyat Kijun (${kijunVal.toFixed(2)}) üzerinde, Tenkan > Kijun`;
    } else if (price < kijunVal && tenkanVal < kijunVal) {
      signal = SIGNAL.SELL;
      description = `Ichimoku — Fiyat Kijun (${kijunVal.toFixed(2)}) altında, Tenkan < Kijun`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Ichimoku — Karışık sinyal, fiyat Kijun yakınında`;
    }
    results.push({ name: 'Ichimoku', value: kijunVal.toFixed(2), signal, description, category: 'oscillator' });
  }

  // ── Bollinger Bands ───────────────────────────────────────────
  const boll = calculateBollinger(candles, 20, 2);
  const bollUpper = boll.upper[boll.upper.length - 1];
  const bollLower = boll.lower[boll.lower.length - 1];
  const bollMiddle = boll.middle[boll.middle.length - 1];
  if (bollUpper !== null && bollLower !== null && bollMiddle !== null) {
    let signal, description;
    if (price < bollLower) {
      signal = SIGNAL.BUY;
      description = `Fiyat (${price.toFixed(2)}) Bollinger alt bandının (${bollLower.toFixed(2)}) altında — aşırı satım`;
    } else if (price > bollUpper) {
      signal = SIGNAL.SELL;
      description = `Fiyat (${price.toFixed(2)}) Bollinger üst bandının (${bollUpper.toFixed(2)}) üstünde — aşırı alım`;
    } else {
      signal = SIGNAL.NEUTRAL;
      description = `Fiyat Bollinger bantları içinde (${bollLower.toFixed(2)} - ${bollUpper.toFixed(2)})`;
    }
    results.push({ name: 'Bollinger Bands', value: bollMiddle.toFixed(2), signal, description, category: 'oscillator' });
  }

  // ── ATR (bilgi amaçlı, sinyal yok) ───────────────────────────
  const atrArr = calculateATR(candles, 14);
  const atrVal = atrArr[atrArr.length - 1];
  if (atrVal !== null && atrVal !== undefined) {
    const atrPct = (atrVal / price) * 100;
    results.push({
      name: 'ATR (14)',
      value: atrVal.toFixed(2),
      signal: SIGNAL.NEUTRAL,
      description: `Volatilite: ${atrVal.toFixed(2)} (${atrPct.toFixed(1)}%) — ${atrPct > 3 ? 'yüksek' : atrPct > 1.5 ? 'orta' : 'düşük'} volatilite`,
      category: 'oscillator',
    });
  }

  return results;
};

// ============================================================================
//  ANA FONKSİYON — Tam Teknik Analiz Raporu
// ============================================================================
export const computeTechnicalAnalysis = (candles) => {
  if (!candles || candles.length < 30) {
    return {
      maAnalysis: [],
      oscAnalysis: [],
      maSummary: { buy: 0, sell: 0, neutral: 0, signal: SIGNAL.NEUTRAL, score: 0 },
      oscSummary: { buy: 0, sell: 0, neutral: 0, signal: SIGNAL.NEUTRAL, score: 0 },
      overallSummary: { buy: 0, sell: 0, neutral: 0, signal: SIGNAL.NEUTRAL, score: 0 },
    };
  }

  const maAnalysis = analyzeMovingAverages(candles);
  const oscAnalysis = analyzeOscillators(candles);

  // Kategori özetleri
  const summarize = (items) => {
    let buy = 0, sell = 0, neutral = 0, totalScore = 0;
    items.forEach(item => {
      const s = signalScore(item.signal);
      totalScore += s;
      if (s > 0) buy++;
      else if (s < 0) sell++;
      else neutral++;
    });
    return {
      buy,
      sell,
      neutral,
      signal: scoreToSignal(totalScore, items.length),
      score: items.length > 0 ? totalScore / items.length : 0,
    };
  };

  const maSummary = summarize(maAnalysis);
  const oscSummary = summarize(oscAnalysis);
  const allItems = [...maAnalysis, ...oscAnalysis];
  const overallSummary = summarize(allItems);

  return {
    maAnalysis,
    oscAnalysis,
    maSummary,
    oscSummary,
    overallSummary,
  };
};

export { SIGNAL };
