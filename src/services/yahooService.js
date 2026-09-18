// ============================================================================
//  yahooService.js — Yahoo Finance Veri Çekme Servisi (Multi-Market)
//  BIST, ABD, Kripto, Emtia, Tahvil, Döviz, VİOP desteği
// ============================================================================

/**
 * Market türleri
 */
export const MARKET_TYPES = {
  bist: { label: 'BIST', suffix: '.IS', placeholder: 'THYAO, GARAN, ASELS...' },
  us: { label: 'ABD', suffix: '', placeholder: 'AAPL, MSFT, TSLA...' },
  crypto: { label: 'Kripto', suffix: '-USD', placeholder: 'BTC, ETH, SOL...' },
  commodity: { label: 'Emtia', suffix: '', placeholder: 'GC=F, SI=F, CL=F...' },
  bond: { label: 'Tahvil', suffix: '', placeholder: '^TNX, ^TYX...' },
  forex: { label: 'Döviz', suffix: '=X', placeholder: 'USDTRY, EURTRY...' },
  viop: { label: 'VİOP', suffix: '.IS', placeholder: 'XU030, XU100...' },
};

/**
 * Her market türü için varsayılan semboller
 */
export const DEFAULT_SYMBOLS = {
  bist: ['THYAO', 'GARAN', 'ASELS', 'BIMAS', 'TUPRS', 'SASA'],
  us: ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN'],
  crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'],
  commodity: ['GC=F', 'SI=F', 'CL=F'],
  bond: ['^TNX', '^TYX'],
  forex: ['USDTRY', 'EURTRY', 'GBPTRY'],
  viop: ['XU030'],
};

// ============================================================================
//  Interval → Range Eşleşmesi
// ============================================================================

const getDefaultRange = (interval) => {
  switch (interval) {
    case '1m':
    case '5m':
    case '15m': return '5d';
    case '30m':  return '1mo';
    case '1h':   return '1mo';
    case '4h':   return '3mo';
    case '1d':   return '1y';
    case '1wk':  return '5y';
    case '1mo':  return 'max';
    default:     return '1y';
  }
};

// ============================================================================
//  Sembol Çözümleme
// ============================================================================

/**
 * Kullanıcı sembolünü Yahoo Finance sembolüne çevirir.
 * @param {string} symbol — Kullanıcı sembolü
 * @param {string} marketType — Market türü ('bist', 'us', 'crypto', vs.)
 * @returns {string} Yahoo Finance sembolü
 */
export const resolveYahooSymbol = (symbol, marketType = 'bist') => {
  const upperSymbol = symbol.toUpperCase();

  switch (marketType) {
    case 'bist':
      return `${upperSymbol}.IS`;
    case 'us':
      return upperSymbol;
    case 'crypto':
      // Zaten '-USD' içeriyorsa dokunma
      return upperSymbol.includes('-USD') ? upperSymbol : `${upperSymbol}-USD`;
    case 'commodity':
      // =F içeriyorsa dokunma (GC=F gibi)
      return upperSymbol;
    case 'bond':
      // ^ ile başlıyorsa dokunma (^TNX gibi)
      return upperSymbol;
    case 'forex':
      // =X içeriyorsa dokunma
      return upperSymbol.includes('=X') ? upperSymbol : `${upperSymbol}=X`;
    case 'viop':
      return `${upperSymbol}.IS`;
    default:
      return `${upperSymbol}.IS`;
  }
};

// ============================================================================
//  HTTP İstekleri
// ============================================================================

const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || '';

const fetchWithStrategies = async (yahooPath) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const externalProxies = CORS_PROXY
    ? [() => fetch(`${CORS_PROXY}${yahooPath}`)]
    : [];

  const strategies = isLocalhost
    ? [() => fetch(`/api/yahoo${yahooPath}`), ...externalProxies]
    : externalProxies;

  let lastError = null;
  for (let i = 0; i < strategies.length; i++) {
    try {
      const response = await strategies[i]();
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

      const text = await response.text();
      if (!text.startsWith('{') && !text.startsWith('[')) {
        throw new Error('Geçersiz format: Yanıt JSON değil (muhtemelen HTML hata sayfası)');
      }
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      console.warn(`Strateji ${i + 1} başarısız:`, err.message);
    }
  }
  throw new Error(`Tüm veri kaynakları başarısız oldu. Son hata: ${lastError?.message}`);
};

// ============================================================================
//  DIŞA AKTARILAN FONKSİYONLAR
// ============================================================================

/**
 * Yahoo Finance'ten mum verilerini çeker — çoklu market desteği.
 * @param {string} symbol — Sembol
 * @param {string} [interval='1d'] — Zaman dilimi
 * @param {string} [range] — Veri aralığı
 * @param {string} [marketType='bist'] — Market türü
 * @returns {Promise<Array>}
 */
export const fetchCandleData = async (symbol, interval = '1d', range, marketType = 'bist') => {
  const yahooSymbol = resolveYahooSymbol(symbol, marketType);
  const effectiveRange = range || getDefaultRange(interval);
  const yahooPath = `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${effectiveRange}&interval=${interval}`;

  const json = await fetchWithStrategies(yahooPath);
  return parseYahooResponse(json, interval);
};

/**
 * Belirli bir sembolün anlık fiyat ve yüzde değişimini döndürür.
 * @param {string} symbol — Sembol
 * @param {string} [marketType='bist'] — Market türü
 * @returns {Promise<{price: number, change: number, changePercent: number}>}
 */
export const fetchQuote = async (symbol, marketType = 'bist') => {
  const yahooSymbol = resolveYahooSymbol(symbol, marketType);
  const yahooPath = `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`;

  const json = await fetchWithStrategies(yahooPath);

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Fiyat verisi alınamadı.');

  const meta = result.meta;
  const price = meta?.regularMarketPrice ?? 0;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? price;

  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
  };
};

// ============================================================================
//  YAHOO JSON PARSER
// ============================================================================

const parseYahooResponse = (json, interval = '1d') => {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo Finance\'ten geçerli veri alınamadı.');

  const timestamps = result.timestamp;
  const quote = result.indicators?.quote?.[0];
  if (!timestamps || !quote) throw new Error('Veri yapısında timestamp veya fiyat bilgisi eksik.');

  const { open, high, low, close, volume } = quote;
  const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);

  const candles = [];
  const seenTimes = new Set();
  const meta = result.meta || {};
  const utcDay = (sec) => new Date(sec * 1000).toISOString().split('T')[0];

  // Yahoo, son işlem gününün mumunda close'u bir süre null bırakır; açılış,
  // yüksek, düşük ve hacim doludur, gerçek kapanış meta.regularMarketPrice'ta
  // durur. Bu mumu atarsak grafik günlerce geride kalır.
  // Aynı düzeltme sunucu tarafında da var: server/api-core.js → parseCandles.
  const metaClose = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
  const metaDay = meta.regularMarketTime ? utcDay(meta.regularMarketTime) : null;

  // Fiyat büyüklüğüne göre basamak — mikro fiyatlı kriptolar (SHIB gibi)
  // 2 basamağa yuvarlanınca sıfırlanıyordu.
  const round = (v) => {
    const a = Math.abs(v);
    const d = a >= 100 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 5 : 8;
    return parseFloat(v.toFixed(d));
  };

  for (let i = 0; i < timestamps.length; i++) {
    let o = open[i];
    let h = high[i];
    let l = low[i];
    let c = close[i];
    let v = volume[i];

    if (c == null && i === timestamps.length - 1 && metaClose !== null
        && metaDay !== null && utcDay(timestamps[i]) === metaDay) {
      c = metaClose;
      if (h == null) h = meta.regularMarketDayHigh ?? c;
      if (l == null) l = meta.regularMarketDayLow ?? c;
      if (o == null) o = meta.chartPreviousClose ?? c;
      if (v == null) v = meta.regularMarketVolume ?? 0;
    }

    // Tamamen boş mum (işlem olmayan gün) atlanır
    if (o == null || c == null) continue;
    if (h == null) h = Math.max(o, c);
    if (l == null) l = Math.min(o, c);

    const time = isIntraday
      ? timestamps[i] + 10800
      : utcDay(timestamps[i]);

    if (seenTimes.has(time)) continue;
    seenTimes.add(time);

    candles.push({
      time,
      open: round(o),
      high: round(h),
      low: round(l),
      close: round(c),
      volume: v ?? 0,
    });
  }

  return candles;
};
