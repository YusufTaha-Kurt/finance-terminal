import { useState, useEffect, useCallback } from 'react';
import { X, Newspaper, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchGeneralNews, fetchCompanyNews, formatNewsDate } from '../services/newsService';

const CATEGORIES = [
  { id: 'general', label: 'Genel' },
  { id: 'forex', label: 'Döviz' },
  { id: 'crypto', label: 'Kripto' },
  { id: 'merger', label: 'Birleşme' },
];

export default function NewsPanel({ isOpen, onClose, finnhubApiKey, activeSymbol, marketType }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('general');
  const [showSymbolNews, setShowSymbolNews] = useState(false);

  const loadNews = useCallback(async () => {
    // Anahtar şart değil: yoksa newsService kendi API'mize düşer.
    setLoading(true);
    setError(null);

    try {
      let data;
      if (showSymbolNews && activeSymbol && (marketType === 'us' || marketType === 'bist')) {
        data = await fetchCompanyNews(finnhubApiKey, activeSymbol, 7, marketType);
      } else {
        data = await fetchGeneralNews(finnhubApiKey, category, marketType);
      }
      setNews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [finnhubApiKey, category, showSymbolNews, activeSymbol, marketType]);

  useEffect(() => {
    if (isOpen) loadNews();
  }, [isOpen, loadNews]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-wallstreet-card border-l border-wallstreet-border z-[90] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-wallstreet-border shrink-0">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-wallstreet-green" />
          <h2 className="font-semibold text-white">Finans Haberleri</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadNews} disabled={loading} className="p-1.5 text-wallstreet-muted hover:text-wallstreet-green transition-colors" title="Yenile">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-1.5 text-wallstreet-muted hover:text-wallstreet-red transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-wallstreet-border flex items-center gap-2 shrink-0 overflow-x-auto">
        {activeSymbol && (
          <button
            onClick={() => setShowSymbolNews(!showSymbolNews)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showSymbolNews
                ? 'bg-wallstreet-green/15 text-wallstreet-green border-wallstreet-green/40'
                : 'bg-wallstreet-dark text-wallstreet-muted border-wallstreet-border hover:border-wallstreet-muted'
            }`}
          >
            {activeSymbol}
          </button>
        )}
        {!showSymbolNews && CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              category === id
                ? 'bg-wallstreet-green/15 text-wallstreet-green border-wallstreet-green/40'
                : 'bg-wallstreet-dark text-wallstreet-muted border-wallstreet-border hover:border-wallstreet-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="m-4 p-3 bg-wallstreet-red/10 border border-wallstreet-red/30 rounded-lg flex items-center gap-2 text-sm text-wallstreet-red">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-wallstreet-green animate-spin" />
          </div>
        )}

        {/* News List */}
        {!loading && news.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-wallstreet-muted text-sm">
            <Newspaper className="w-8 h-8 mb-2 opacity-30" />
            Haber bulunamadı.
          </div>
        )}

        {!loading && news.map((item, idx) => (
          <a
            key={`${item.id || idx}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 border-b border-wallstreet-border hover:bg-wallstreet-dark/50 transition-colors group"
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              {item.image && (
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-wallstreet-dark">
                  <img
                    src={item.image}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Headline */}
                <h3 className="text-sm font-medium text-white group-hover:text-wallstreet-green transition-colors line-clamp-2 leading-snug">
                  {item.headline}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-wallstreet-muted">
                  <span className="font-medium">{item.source}</span>
                  <span>•</span>
                  <span>{formatNewsDate(item.datetime)}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </div>

                {/* Summary */}
                {item.summary && (
                  <p className="mt-1 text-xs text-wallstreet-muted line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
