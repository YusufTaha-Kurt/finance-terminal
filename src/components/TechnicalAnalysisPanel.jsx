import { useState, useMemo } from 'react';
import { BarChart3, ChevronDown, TrendingUp, TrendingDown, Minus, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { computeTechnicalAnalysis, SIGNAL } from '../services/technicalAnalysisEngine';

// ============================================================================
//  Gauge SVG Bileşeni — Investing.com benzeri yarım daire gösterge
// ============================================================================
const GaugeMeter = ({ score, signal, label, buy, sell, neutral }) => {
  // score: -2..+2 arası ortalama, bunu -90..+90 derece açıya çevirelim
  const clampedScore = Math.max(-2, Math.min(2, score));
  const angle = (clampedScore / 2) * 90; // -90 (güçlü sat) ... +90 (güçlü al)

  // Sinyal rengini belirle
  const getSignalColor = (sig) => {
    switch (sig) {
      case SIGNAL.STRONG_BUY: return '#26a69a';
      case SIGNAL.BUY: return '#66bb6a';
      case SIGNAL.NEUTRAL: return '#787b86';
      case SIGNAL.SELL: return '#ef9a9a';
      case SIGNAL.STRONG_SELL: return '#ef5350';
      default: return '#787b86';
    }
  };

  const getSignalBg = (sig) => {
    switch (sig) {
      case SIGNAL.STRONG_BUY: return 'rgba(38,166,154,0.15)';
      case SIGNAL.BUY: return 'rgba(102,187,106,0.15)';
      case SIGNAL.NEUTRAL: return 'rgba(120,123,134,0.15)';
      case SIGNAL.SELL: return 'rgba(239,154,154,0.15)';
      case SIGNAL.STRONG_SELL: return 'rgba(239,83,80,0.15)';
      default: return 'rgba(120,123,134,0.15)';
    }
  };

  const color = getSignalColor(signal);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Gauge Label */}
      <div className="text-[11px] font-medium text-wallstreet-muted">{label}</div>

      {/* SVG Gauge */}
      <div className="relative" style={{ width: 130, height: 75 }}>
        <svg viewBox="0 0 130 75" width="130" height="75">
          {/* Arka plan yayı — 5 bölge */}
          <path d="M 10 65 A 55 55 0 0 1 28 20" fill="none" stroke="#ef5350" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
          <path d="M 28 20 A 55 55 0 0 1 48 8" fill="none" stroke="#ef9a9a" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <path d="M 48 8 A 55 55 0 0 1 82 8" fill="none" stroke="#787b86" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
          <path d="M 82 8 A 55 55 0 0 1 102 20" fill="none" stroke="#66bb6a" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <path d="M 102 20 A 55 55 0 0 1 120 65" fill="none" stroke="#26a69a" strokeWidth="5" strokeLinecap="round" opacity="0.6" />

          {/* İbre */}
          <g transform={`rotate(${angle}, 65, 65)`}>
            <line x1="65" y1="65" x2="65" y2="16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="65" cy="65" r="4" fill={color} />
          </g>

          {/* Etiketler */}
          <text x="5" y="72" fontSize="7" fill="#ef5350" fontWeight="600">Güçlü Sat</text>
          <text x="89" y="72" fontSize="7" fill="#26a69a" fontWeight="600">Güçlü Al</text>
        </svg>
      </div>

      {/* Sinyal Badge */}
      <div
        className="px-3 py-1 rounded-lg text-xs font-bold"
        style={{ backgroundColor: getSignalBg(signal), color }}
      >
        {signal}
      </div>

      {/* Al/Sat/Nötr Sayıları */}
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1 text-wallstreet-green">
          <ArrowUpRight className="w-3 h-3" />
          {buy} Al
        </span>
        <span className="flex items-center gap-1 text-wallstreet-muted">
          <Minus className="w-3 h-3" />
          {neutral} Nötr
        </span>
        <span className="flex items-center gap-1 text-wallstreet-red">
          <ArrowDownRight className="w-3 h-3" />
          {sell} Sat
        </span>
      </div>
    </div>
  );
};

// ============================================================================
//  Sinyal Badge Bileşeni
// ============================================================================
const SignalBadge = ({ signal }) => {
  const config = {
    [SIGNAL.STRONG_BUY]: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    [SIGNAL.BUY]: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/25' },
    [SIGNAL.NEUTRAL]: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/25' },
    [SIGNAL.SELL]: { bg: 'bg-red-400/15', text: 'text-red-400', border: 'border-red-400/25' },
    [SIGNAL.STRONG_SELL]: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };
  const c = config[signal] || config[SIGNAL.NEUTRAL];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
      {signal === SIGNAL.STRONG_BUY || signal === SIGNAL.BUY ? (
        <TrendingUp className="w-3 h-3" />
      ) : signal === SIGNAL.STRONG_SELL || signal === SIGNAL.SELL ? (
        <TrendingDown className="w-3 h-3" />
      ) : (
        <Minus className="w-3 h-3" />
      )}
      {signal}
    </span>
  );
};

// ============================================================================
//  Ana Bileşen — TechnicalAnalysisPanel
// ============================================================================
export default function TechnicalAnalysisPanel({ candles }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | oscillators | ma

  // Teknik analiz hesapla
  const analysis = useMemo(() => {
    if (!candles || candles.length < 30) return null;
    return computeTechnicalAnalysis(candles);
  }, [candles]);

  // Özet sinyal rengi (buton için)
  const getButtonSignalColor = (sig) => {
    if (!sig) return '';
    switch (sig) {
      case SIGNAL.STRONG_BUY:
      case SIGNAL.BUY:
        return 'text-wallstreet-green';
      case SIGNAL.STRONG_SELL:
      case SIGNAL.SELL:
        return 'text-wallstreet-red';
      default:
        return 'text-wallstreet-muted';
    }
  };

  const overallSignal = analysis?.overallSummary?.signal;

  const tabs = [
    { id: 'all', label: 'Özet' },
    { id: 'oscillators', label: 'Teknik İndikatörler' },
    { id: 'ma', label: 'Hareketli Ortalamalar' },
  ];

  const getDisplayItems = () => {
    if (!analysis) return [];
    switch (activeTab) {
      case 'oscillators': return analysis.oscAnalysis;
      case 'ma': return analysis.maAnalysis;
      default: return [...analysis.oscAnalysis, ...analysis.maAnalysis];
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-wallstreet-dark border border-wallstreet-border hover:border-wallstreet-green/50 text-wallstreet-muted hover:text-white"
      >
        <Activity className="w-3.5 h-3.5" />
        Analizler
        {overallSignal && (
          <span className={`ml-1 text-[10px] font-bold ${getButtonSignalColor(overallSignal)}`}>
            {overallSignal}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-[560px] bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl z-50 overflow-hidden analysis-panel-enter">
            {/* Header */}
            <div className="px-4 py-3 border-b border-wallstreet-border bg-gradient-to-r from-wallstreet-card to-wallstreet-dark">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-wallstreet-green" />
                <span className="text-sm font-semibold text-white">Teknik Analiz</span>
              </div>
            </div>

            {!analysis ? (
              <div className="p-8 text-center text-wallstreet-muted text-sm">
                Yeterli veri yok. En az 30 mum verisi gereklidir.
              </div>
            ) : (
              <>
                {/* Gauge Göstergeleri */}
                <div className="px-4 py-4 border-b border-wallstreet-border">
                  <div className="grid grid-cols-3 gap-2">
                    <GaugeMeter
                      score={analysis.oscSummary.score}
                      signal={analysis.oscSummary.signal}
                      label="Teknik İndikatörler"
                      buy={analysis.oscSummary.buy}
                      sell={analysis.oscSummary.sell}
                      neutral={analysis.oscSummary.neutral}
                    />
                    <GaugeMeter
                      score={analysis.overallSummary.score}
                      signal={analysis.overallSummary.signal}
                      label="Özet"
                      buy={analysis.overallSummary.buy}
                      sell={analysis.overallSummary.sell}
                      neutral={analysis.overallSummary.neutral}
                    />
                    <GaugeMeter
                      score={analysis.maSummary.score}
                      signal={analysis.maSummary.signal}
                      label="Hareketli Ortalamalar"
                      buy={analysis.maSummary.buy}
                      sell={analysis.maSummary.sell}
                      neutral={analysis.maSummary.neutral}
                    />
                  </div>
                </div>

                {/* Sekmeler */}
                <div className="flex border-b border-wallstreet-border">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                        activeTab === tab.id
                          ? 'text-wallstreet-green border-b-2 border-wallstreet-green bg-wallstreet-green/5'
                          : 'text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* İndikatör Tablosu */}
                <div className="max-h-72 overflow-y-auto">
                  {/* Tablo Başlığı */}
                  <div className="sticky top-0 grid grid-cols-[1fr_90px_100px] gap-2 px-4 py-2 text-[10px] font-semibold text-wallstreet-muted uppercase tracking-wider bg-wallstreet-card border-b border-wallstreet-border">
                    <span>İndikatör</span>
                    <span className="text-right">Değer</span>
                    <span className="text-right">Sinyal</span>
                  </div>

                  {getDisplayItems().map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="group grid grid-cols-[1fr_90px_100px] gap-2 px-4 py-2 text-xs border-b border-wallstreet-border/50 hover:bg-wallstreet-dark/50 transition-colors items-center"
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{item.name}</span>
                        <span className="text-[10px] text-wallstreet-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 line-clamp-2">
                          {item.description}
                        </span>
                      </div>
                      <span className="text-right text-wallstreet-text font-mono text-[11px]">
                        {item.value}
                      </span>
                      <div className="flex justify-end">
                        <SignalBadge signal={item.signal} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alt Bilgi */}
                <div className="px-4 py-2 border-t border-wallstreet-border bg-wallstreet-dark/30">
                  <div className="flex items-center justify-between text-[10px] text-wallstreet-muted">
                    <span>
                      Toplam {getDisplayItems().length} indikatör analiz edildi
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-wallstreet-green animate-pulse" />
                      Canlı analiz
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
