// ============================================================================
//  newsService.js — Finnhub Haber Çekme Servisi
//  Genel finans haberleri + sembol bazlı haberler
// ============================================================================

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// ============================================================================
//  Anahtarsiz yedek: kendi API'miz
//  Kullanici Ayarlar'a Finnhub anahtari girmediyse haberler buradan gelir.
//  Kaynak Yahoo Finance RSS (BIST dahil calisir); sunucuda FINNHUB_API_KEY
//  tanimliysa Finnhub akislari da eklenir.
// ============================================================================
const API_BASE = (typeof window !== 'undefined'
  && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  ? '' // dev sunucusunda ayni origin (vite eklentisi)
  : (import.meta.env.VITE_API_BASE_URL || '');

/** Kendi API cevabini panelin bekledigi Finnhub bicimine cevirir. */
const toFinnhubShape = (items) => items.map((n) => ({
  headline: n.title,
  summary: n.summary || '',
  url: n.url,
  source: n.source,
  datetime: n.publishedAt ? Math.floor(Date.parse(n.publishedAt) / 1000) : 0,
  related: (n.relatedSymbols || []).join(','),
}));

const fetchFromBorsaApi = async ({ symbol, market, category, limit = 40 }) => {
  const q = new URLSearchParams({ limit: String(limit) });
  if (symbol) q.set('symbol', symbol);
  if (market) q.set('market', market);
  if (category) q.set('category', category);

  const res = await fetch(`${API_BASE}/api/v1/news?${q}`);
  if (!res.ok) throw new Error(`Haber cekme hatasi: HTTP ${res.status}`);
  const data = await res.json();
  return toFinnhubShape(data.news || []);
};


/**
 * Genel finans haberlerini çeker.
 * @param {string} apiKey — Finnhub API key
 * @param {string} [category='general'] — Kategori: general, forex, crypto, merger
 * @returns {Promise<Array<{id: number, headline: string, summary: string, source: string, url: string, image: string, datetime: number, category: string}>>}
 */
export const fetchGeneralNews = async (apiKey, category = 'general', market = 'bist') => {
  // Anahtar yoksa kendi API'mize düş — kullanıcıdan hiçbir şey istemez
  if (!apiKey) return fetchFromBorsaApi({ market, category });

  const response = await fetch(
    `${FINNHUB_BASE}/news?category=${category}&token=${apiKey}`
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error('Geçersiz Finnhub API anahtarı.');
    if (response.status === 429) throw new Error('API istek limiti aşıldı. Lütfen bekleyin.');
    throw new Error(`Haber çekme hatası: HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.slice(0, 50) : [];
};

/**
 * Belirli bir sembol için şirket haberlerini çeker.
 * @param {string} apiKey — Finnhub API key
 * @param {string} symbol — Hisse sembolü (ABD formatında: AAPL, MSFT vs.)
 * @param {number} [days=7] — Kaç gün geriye bak
 * @returns {Promise<Array>}
 */
export const fetchCompanyNews = async (apiKey, symbol, days = 7, market = 'bist') => {
  // Anahtar yoksa kendi API'mize düş (BIST dahil çalışır)
  if (!apiKey) return fetchFromBorsaApi({ symbol, market });

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const response = await fetch(
    `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${apiKey}`
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error('Geçersiz Finnhub API anahtarı.');
    if (response.status === 429) throw new Error('API istek limiti aşıldı. Lütfen bekleyin.');
    throw new Error(`Haber çekme hatası: HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.slice(0, 30) : [];
};

/**
 * Haber tarihini okunabilir formata çevirir.
 * @param {number} timestamp — Unix timestamp
 * @returns {string}
 */
export const formatNewsDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};
