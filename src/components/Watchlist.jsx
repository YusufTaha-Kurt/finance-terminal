import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Activity, HelpCircle, Settings, Sparkles, Newspaper } from 'lucide-react';
import { fetchQuote, MARKET_TYPES, DEFAULT_SYMBOLS } from '../services/yahooService';
import HelpGuide from './HelpGuide';
import AdSlot from './AdSlot';
import { AD_SLOTS } from '../config/ads';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================================
//  Market Sekme Yapılandırması
// ============================================================================
const MARKET_TABS = [
  { id: 'bist', label: 'BIST', emoji: '🇹🇷' },
  { id: 'us', label: 'ABD', emoji: '🇺🇸' },
  { id: 'crypto', label: 'Kripto', emoji: '₿' },
  { id: 'commodity', label: 'Emtia', emoji: '🥇' },
  { id: 'bond', label: 'Tahvil', emoji: '📜' },
  { id: 'forex', label: 'Döviz', emoji: '💱' },
  { id: 'viop', label: 'VİOP', emoji: '📊' },
];

// ============================================================================
//  Sortable Watchlist Item
// ============================================================================
function SortableWatchlistItem({ symbol, isActive, q, setActiveSymbol, removeSymbol, marketType }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  const isLoading = q?.loading;
  const hasData = q?.price !== null && q?.price !== undefined;
  const isPositive = (q?.changePercent ?? 0) >= 0;
  const marketInfo = MARKET_TYPES[marketType];

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveSymbol(symbol)}
      className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors border-l-2 ${
        isActive
          ? 'bg-wallstreet-dark border-wallstreet-green'
          : 'border-transparent hover:bg-wallstreet-dark/60'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col pointer-events-none">
        <span className={`font-medium ${isActive ? 'text-wallstreet-green' : 'text-white'}`}>
          {symbol}
        </span>
        <span className="text-[10px] text-wallstreet-muted">{marketInfo?.label || 'BIST'}</span>
      </div>

      {/* Fiyat & Değişim */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end min-w-[70px] pointer-events-none">
          {isLoading ? (
            <span className="text-xs text-wallstreet-muted animate-pulse">yükleniyor...</span>
          ) : hasData ? (
            <>
              <span className="text-sm font-medium text-white tabular-nums">
                {q.price.toFixed(2)}
              </span>
              <span
                className={`text-xs font-medium tabular-nums ${
                  isPositive ? 'text-wallstreet-green' : 'text-wallstreet-red'
                }`}
              >
                {isPositive ? '+' : ''}{q.changePercent.toFixed(2)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-wallstreet-muted">--</span>
              <span className="text-xs text-wallstreet-muted">--%</span>
            </>
          )}
        </div>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            removeSymbol(symbol);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-wallstreet-muted hover:text-wallstreet-red transition-all"
          title="Kaldır"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

// ============================================================================
//  Watchlist Ana Bileşen
// ============================================================================
export default function Watchlist({
  activeSymbol,
  setActiveSymbol,
  activeMarket,
  setActiveMarket,
  // Panel kontrolleri — eskiden grafiğin sağ alt köşesinde yüzen butonlardı,
  // grafiği kapattıkları için başlığa, Kullanım Rehberi'nin yanına alındı.
  onOpenSettings,
  onToggleNews,
  onToggleAI,
  showNews = false,
  showAI = false,
}) {
  // Her market için ayrı sembol listesi
  const [allSymbols, setAllSymbols] = useState(() => {
    try {
      const saved = localStorage.getItem('watchlist_multi');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_SYMBOLS };
  });

  const [newSymbol, setNewSymbol] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotes, setQuotes] = useState({});
  const intervalRef = useRef(null);

  // Resize sidebar
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('watchlist_width');
      if (saved) return Math.max(200, Math.min(600, parseInt(saved)));
    } catch {}
    return 320;
  });
  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!isResizingRef.current) return;
      const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
      const newWidth = Math.max(200, Math.min(600, clientX));
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onUp);
  }, []);

  // Save width on change
  useEffect(() => {
    localStorage.setItem('watchlist_width', String(sidebarWidth));
  }, [sidebarWidth]);

  const symbols = allSymbols[activeMarket] || [];

  // localStorage senkronizasyonu
  useEffect(() => {
    localStorage.setItem('watchlist_multi', JSON.stringify(allSymbols));
  }, [allSymbols]);

  // Canlı fiyat çekme
  useEffect(() => {
    let cancelled = false;

    const loadQuotes = async () => {
      const entries = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const data = await fetchQuote(symbol, activeMarket);
          return { symbol, ...data, loading: false, error: null };
        })
      );

      if (cancelled) return;

      const newQuotes = {};
      entries.forEach((result, idx) => {
        const symbol = symbols[idx];
        if (result.status === 'fulfilled') {
          newQuotes[symbol] = result.value;
        } else {
          newQuotes[symbol] = {
            symbol,
            price: null,
            change: null,
            changePercent: null,
            loading: false,
            error: result.reason?.message || 'Hata',
          };
        }
      });
      setQuotes(newQuotes);
    };

    const initialQuotes = {};
    symbols.forEach((s) => {
      initialQuotes[s] = { symbol: s, price: null, change: null, changePercent: null, loading: true, error: null };
    });
    setQuotes(initialQuotes);

    loadQuotes();

    intervalRef.current = window.setInterval(loadQuotes, 60_000);

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [symbols, activeMarket]);

  const addSymbol = (e) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (symbol && !symbols.includes(symbol)) {
      setAllSymbols((prev) => ({
        ...prev,
        [activeMarket]: [...(prev[activeMarket] || []), symbol],
      }));
      setNewSymbol('');
      setActiveSymbol(symbol);
    }
  };

  // AI'dan çağrılabilecek dışa açık fonksiyon
  const addSymbolExternal = (symbol, marketType) => {
    const market = marketType || activeMarket;
    const sym = symbol.trim().toUpperCase();
    const currentSymbols = allSymbols[market] || [];
    if (sym && !currentSymbols.includes(sym)) {
      setAllSymbols((prev) => ({
        ...prev,
        [market]: [...(prev[market] || []), sym],
      }));
      if (market === activeMarket) {
        setActiveSymbol(sym);
      }
    }
  };

  const removeSymbol = (symbolToRemove) => {
    setAllSymbols((prev) => ({
      ...prev,
      [activeMarket]: (prev[activeMarket] || []).filter((s) => s !== symbolToRemove),
    }));
    if (activeSymbol === symbolToRemove) {
      const remaining = symbols.filter((s) => s !== symbolToRemove);
      if (remaining.length > 0) setActiveSymbol(remaining[0]);
    }
  };

  // Drag and Drop ayarları
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setAllSymbols((prev) => {
        const items = [...(prev[activeMarket] || [])];
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return {
          ...prev,
          [activeMarket]: arrayMove(items, oldIndex, newIndex),
        };
      });
    }
  };

  const marketInfo = MARKET_TYPES[activeMarket] || MARKET_TYPES.bist;

  return (
    <>
      <div
        className="bg-wallstreet-card border-r border-wallstreet-border flex flex-col h-[40vh] md:h-screen shrink-0 relative"
        style={{ width: window.innerWidth >= 768 ? `${sidebarWidth}px` : '100%' }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 group hover:bg-wallstreet-green/30 transition-colors"
          title="Genişliği ayarla"
        >
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-12 rounded-full bg-wallstreet-border group-hover:bg-wallstreet-green transition-colors" />
        </div>
        {/* Header */}
        <div className="p-4 border-b border-wallstreet-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-wallstreet-green" />
            <h2 className="font-semibold text-lg tracking-wide text-white">İzleme Listesi</h2>
          </div>
          {/* Panel butonları — grafiğin üstünü kapatmasınlar diye burada */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-md text-wallstreet-muted hover:text-wallstreet-green hover:bg-wallstreet-dark transition-colors"
              title="Kullanım Rehberi"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleAI}
              className={`p-1.5 rounded-md transition-colors ${
                showAI
                  ? 'text-wallstreet-green bg-wallstreet-green/15'
                  : 'text-wallstreet-muted hover:text-wallstreet-green hover:bg-wallstreet-dark'
              }`}
              title="AI Asistan"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleNews}
              className={`p-1.5 rounded-md transition-colors ${
                showNews
                  ? 'text-wallstreet-green bg-wallstreet-green/15'
                  : 'text-wallstreet-muted hover:text-wallstreet-green hover:bg-wallstreet-dark'
              }`}
              title="Haberler"
            >
              <Newspaper className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-md text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark transition-colors"
              title="Ayarlar"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market Tabs */}
        <div className="flex border-b border-wallstreet-border overflow-x-auto shrink-0 scrollbar-hide">
          {MARKET_TABS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => {
                setActiveMarket(id);
                const marketSymbols = allSymbols[id] || [];
                if (marketSymbols.length > 0) setActiveSymbol(marketSymbols[0]);
              }}
              className={`flex items-center gap-1 px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all border-b-2 shrink-0 ${
                activeMarket === id
                  ? 'text-wallstreet-green border-wallstreet-green bg-wallstreet-green/5'
                  : 'text-wallstreet-muted border-transparent hover:text-white hover:bg-wallstreet-dark/50'
              }`}
            >
              <span className="text-xs">{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-3 border-b border-wallstreet-border shrink-0">
          <form onSubmit={addSymbol} className="relative">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder={marketInfo.placeholder}
              className="w-full bg-wallstreet-dark border border-wallstreet-border rounded px-3 py-2 text-sm focus:outline-none focus:border-wallstreet-green text-white uppercase placeholder-wallstreet-muted transition-colors"
            />
            <button
              type="submit"
              disabled={!newSymbol.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-wallstreet-muted hover:text-wallstreet-green disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {symbols.length === 0 ? (
            <div className="p-4 text-center text-sm text-wallstreet-muted">
              Listeniz boş. Lütfen sembol ekleyin.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={symbols}
                strategy={verticalListSortingStrategy}
              >
                <ul className="py-1">
                  {symbols.map((symbol) => (
                    <SortableWatchlistItem
                      key={symbol}
                      symbol={symbol}
                      isActive={symbol === activeSymbol}
                      q={quotes[symbol]}
                      setActiveSymbol={setActiveSymbol}
                      removeSymbol={removeSymbol}
                      marketType={activeMarket}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Reklam */}
        <div className="shrink-0 border-t border-wallstreet-border p-2">
          <AdSlot slot={AD_SLOTS.watchlist} />
        </div>
      </div>

      {/* Kullanım Rehberi */}
      <HelpGuide isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
