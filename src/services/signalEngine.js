// ============================================================================
//  signalEngine.js — Agresif AL/SAT Sinyal Motoru
//  Death Cross, Golden Cross, MACD Kesişim, RSI, Bollinger, Hacim Patlaması
// ============================================================================

/**
 * Mum ve indikatör verilerini alarak agresif kurallara göre AL/SAT sinyalleri üretir.
 *
 * SAT Kuralları (Erken Kaçış & Stop-Loss):
 *   - Death Cross: EMA9, EMA21'i aşağı keserse
 *   - MACD negatif kesişim: MACD Line, Signal Line'ı aşağı keserse
 *   - RSI 75'i aşağı keserse (aşırı alımdan dönüş)
 *   - Fiyat EMA50'nin altına düşerse
 *
 * AL Kuralları (Momentum Avcısı):
 *   - Golden Cross: EMA9, EMA21'i yukarı keserse
 *   - Bollinger Üst Bant Kırılımı: Fiyat üst bandı hacimli geçerse
 *   - MACD pozitif kesişim VE RSI > 40
 *   - Hacim patlaması: Hacim bir önceki muma göre %150+ artmışsa VE yeşil mumsa
 *
 * @param {Array<{time: string, open: number, high: number, low: number, close: number, volume: number}>} candles
 * @param {{
 *   ema9: Array<number|null>,
 *   ema21: Array<number|null>,
 *   ema50: Array<number|null>,
 *   rsi: Array<number|null>,
 *   macd: { macdLine: Array<number|null>, signalLine: Array<number|null>, histogram: Array<number|null> },
 *   bollinger: { upper: Array<number|null>, middle: Array<number|null>, lower: Array<number|null> }
 * }} indicators
 * @returns {Array<{ time: string, index: number, type: 'buy'|'sell', reason: string }>}
 */
export const generateSignals = (candles, indicators) => {
  if (!candles || candles.length < 2 || !indicators) return [];

  const { ema9, ema21, ema50, rsi, macd, bollinger } = indicators;
  const signals = [];

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];

    // Mevcut ve önceki indikatör değerlerini al
    const currEma9 = ema9[i];
    const prevEma9 = ema9[i - 1];
    const currEma21 = ema21[i];
    const prevEma21 = ema21[i - 1];
    const currEma50 = ema50[i];
    const currRSI = rsi[i];
    const prevRSI = rsi[i - 1];
    const currMacd = macd.macdLine[i];
    const prevMacd = macd.macdLine[i - 1];
    const currSignal = macd.signalLine[i];
    const prevSignal = macd.signalLine[i - 1];
    const currBollingerUpper = bollinger.upper[i];

    // ================================================================
    //  SAT SİNYALLERİ (Erken Kaçış & Stop-Loss)
    // ================================================================

    // 1) Death Cross — EMA9 aşağıdan EMA21'i kesiyor
    if (
      currEma9 !== null && prevEma9 !== null &&
      currEma21 !== null && prevEma21 !== null &&
      prevEma9 >= prevEma21 && currEma9 < currEma21
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'sell',
        reason: 'Death Cross — EMA9, EMA21\'i aşağı kesti',
      });
    }

    // 2) MACD negatif kesişim — MACD Line, Signal Line'ı aşağı kesiyor
    if (
      currMacd !== null && prevMacd !== null &&
      currSignal !== null && prevSignal !== null &&
      prevMacd >= prevSignal && currMacd < currSignal
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'sell',
        reason: 'MACD negatif kesişim — MACD, sinyal çizgisinin altına indi',
      });
    }

    // 3) RSI 75'i aşağı kesiyor (aşırı alımdan dönüş)
    if (
      currRSI !== null && prevRSI !== null &&
      prevRSI >= 75 && currRSI < 75
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'sell',
        reason: 'RSI 75 kırılımı — Aşırı alım bölgesinden çıkış',
      });
    }

    // 4) Fiyat EMA50'nin altına düştü
    if (
      currEma50 !== null &&
      prevCandle.close >= (ema50[i - 1] ?? Infinity) &&
      candle.close < currEma50
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'sell',
        reason: 'EMA50 kırılımı — Fiyat EMA50\'nin altına düştü',
      });
    }

    // ================================================================
    //  AL SİNYALLERİ (Momentum Avcısı)
    // ================================================================

    // 1) Golden Cross — EMA9 yukarıdan EMA21'i kesiyor
    if (
      currEma9 !== null && prevEma9 !== null &&
      currEma21 !== null && prevEma21 !== null &&
      prevEma9 <= prevEma21 && currEma9 > currEma21
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'buy',
        reason: 'Golden Cross — EMA9, EMA21\'i yukarı kesti',
      });
    }

    // 2) Bollinger Üst Bant Kırılımı (hacimli)
    if (
      currBollingerUpper !== null &&
      candle.close > currBollingerUpper &&
      candle.volume > (prevCandle.volume * 1.2) // Hacim en az %20 artmış
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'buy',
        reason: 'Bollinger kırılımı — Fiyat üst bandı hacimle aştı',
      });
    }

    // 3) MACD pozitif kesişim VE RSI > 40
    if (
      currMacd !== null && prevMacd !== null &&
      currSignal !== null && prevSignal !== null &&
      prevMacd <= prevSignal && currMacd > currSignal &&
      currRSI !== null && currRSI > 40
    ) {
      signals.push({
        time: candle.time,
        index: i,
        type: 'buy',
        reason: 'MACD pozitif kesişim + RSI > 40 — Momentum doğrulandı',
      });
    }

    // 4) Hacim patlaması (%150+) + yeşil mum
    const isGreenCandle = candle.close > candle.open;
    const volumeIncrease = prevCandle.volume > 0
      ? candle.volume / prevCandle.volume
      : 0;

    if (isGreenCandle && volumeIncrease >= 2.5) {
      // %150 artış = mevcut hacim öncekinin 2.5 katı
      signals.push({
        time: candle.time,
        index: i,
        type: 'buy',
        reason: `Hacim patlaması — Hacim %${Math.round((volumeIncrease - 1) * 100)} arttı (yeşil mum)`,
      });
    }

    // ================================================================
    //  YENİ SİNYALLER — Ek İndikatör Kuralları (Agresif)
    // ================================================================

    // 5) Stochastic kesişim — K, D'yi yukarı/aşağı kesiyor
    if (indicators.stochastic) {
      const currK = indicators.stochastic.k[i];
      const prevK = indicators.stochastic.k[i - 1];
      const currD = indicators.stochastic.d[i];
      const prevD = indicators.stochastic.d[i - 1];

      if (currK !== null && prevK !== null && currD !== null && prevD !== null) {
        // K, D'yi yukarı kesiyor (aşırı satım bölgesinde daha güçlü)
        if (prevK <= prevD && currK > currD && currK < 30) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'buy',
            reason: 'Stochastic kesişim — K, D\'yi aşırı satım bölgesinde yukarı kesti',
          });
        }
        // K, D'yi aşağı kesiyor (aşırı alım bölgesinde)
        if (prevK >= prevD && currK < currD && currK > 70) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'sell',
            reason: 'Stochastic kesişim — K, D\'yi aşırı alım bölgesinde aşağı kesti',
          });
        }
      }
    }

    // 6) Supertrend yön değişimi
    if (indicators.supertrend) {
      const currDir = indicators.supertrend.direction[i];
      const prevDir = indicators.supertrend.direction[i - 1];

      if (currDir !== null && prevDir !== null && currDir !== prevDir) {
        if (currDir === 1) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'buy',
            reason: 'Supertrend — Düşüşten yükselişe yön değiştirdi',
          });
        } else {
          signals.push({
            time: candle.time,
            index: i,
            type: 'sell',
            reason: 'Supertrend — Yükselişten düşüşe yön değiştirdi',
          });
        }
      }
    }

    // 7) Parabolic SAR yön değişimi
    if (indicators.psar) {
      const currPsar = indicators.psar[i];
      const prevPsar = indicators.psar[i - 1];
      if (currPsar !== null && prevPsar !== null) {
        const currAbove = candle.close > currPsar;
        const prevAbove = prevCandle.close > prevPsar;

        if (!prevAbove && currAbove) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'buy',
            reason: 'Parabolic SAR — Fiyat SAR\'ın üzerine çıktı, yükseliş başladı',
          });
        } else if (prevAbove && !currAbove) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'sell',
            reason: 'Parabolic SAR — Fiyat SAR\'ın altına düştü, düşüş başladı',
          });
        }
      }
    }

    // 8) CCI aşırı bölge kırılımı
    if (indicators.cci) {
      const currCCI = indicators.cci[i];
      const prevCCI = indicators.cci[i - 1];

      if (currCCI !== null && prevCCI !== null) {
        // CCI -100'ü yukarı kesiyor → AL
        if (prevCCI <= -100 && currCCI > -100) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'buy',
            reason: 'CCI — Aşırı satım bölgesinden çıkış (-100 yukarı kırıldı)',
          });
        }
        // CCI +100'ü aşağı kesiyor → SAT
        if (prevCCI >= 100 && currCCI < 100) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'sell',
            reason: 'CCI — Aşırı alım bölgesinden çıkış (+100 aşağı kırıldı)',
          });
        }
      }
    }

    // 9) ADX trend doğrulaması + DI kesişimi
    if (indicators.adx) {
      const currADX = indicators.adx.adx[i];
      const currPDI = indicators.adx.pdi[i];
      const prevPDI = indicators.adx.pdi[i - 1];
      const currMDI = indicators.adx.mdi[i];
      const prevMDI = indicators.adx.mdi[i - 1];

      if (currADX !== null && currADX > 25 &&
          currPDI !== null && prevPDI !== null &&
          currMDI !== null && prevMDI !== null) {
        // +DI, -DI'yı yukarı kesiyor (güçlü trendde)
        if (prevPDI <= prevMDI && currPDI > currMDI) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'buy',
            reason: `ADX (${currADX.toFixed(0)}) güçlü trend — +DI, -DI'yı yukarı kesti`,
          });
        }
        // -DI, +DI'yı yukarı kesiyor (güçlü trendde)
        if (prevMDI <= prevPDI && currMDI > currPDI) {
          signals.push({
            time: candle.time,
            index: i,
            type: 'sell',
            reason: `ADX (${currADX.toFixed(0)}) güçlü trend — -DI, +DI'yı yukarı kesti`,
          });
        }
      }
    }
  }

  // Tarih sırasına göre sırala (zaten sıralı olması gerekir ama garanti olsun)
  signals.sort((a, b) => a.index - b.index);

  return signals;
};
