import { useState, useMemo } from 'react';
import { ChevronDown, Search, Plus, X, Sliders } from 'lucide-react';
import { INDICATOR_CATALOG, INDICATOR_CATEGORIES } from '../services/indicatorService';

export default function IndicatorPanel({ activeIndicators, onToggleIndicator, onOpenCustomEditor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const groups = {};
    Object.entries(INDICATOR_CATALOG).forEach(([id, ind]) => {
      const cat = ind.category;
      if (!groups[cat]) groups[cat] = [];
      // Arama filtresi
      if (search && !ind.name.toLowerCase().includes(search.toLowerCase())) return;
      groups[cat].push({ id, ...ind });
    });
    return groups;
  }, [search]);

  const activeCount = activeIndicators.length;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-wallstreet-dark border border-wallstreet-border hover:border-wallstreet-green/50 text-wallstreet-muted hover:text-white"
      >
        <Sliders className="w-3.5 h-3.5" />
        İndikatörler
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-wallstreet-green/20 text-wallstreet-green rounded text-[10px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-72 bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-wallstreet-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wallstreet-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="İndikatör ara..."
                  className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green/50 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Categories */}
            <div className="max-h-80 overflow-y-auto p-1">
              {Object.entries(INDICATOR_CATEGORIES).map(([catId, catInfo]) => {
                const items = grouped[catId];
                if (!items || items.length === 0) return null;

                return (
                  <div key={catId} className="mb-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-wallstreet-muted uppercase tracking-wider flex items-center gap-1.5">
                      <span>{catInfo.icon}</span>
                      {catInfo.label}
                    </div>
                    {items.map(({ id, name, color }) => {
                      const isActive = activeIndicators.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => onToggleIndicator(id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                            isActive
                              ? 'bg-wallstreet-dark text-white'
                              : 'text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: isActive ? color : '#333' }}
                            />
                            <span>{name}</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-colors relative ${
                            isActive ? 'bg-wallstreet-green/30' : 'bg-wallstreet-border'
                          }`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                              isActive ? 'bg-wallstreet-green left-[18px]' : 'bg-wallstreet-muted left-0.5'
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Custom Indicator Button */}
            <div className="p-2 border-t border-wallstreet-border">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomEditor?.();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-wallstreet-green bg-wallstreet-green/10 hover:bg-wallstreet-green/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Özel İndikatör Ekle
              </button>
            </div>

            {/* Active indicators chips */}
            {activeCount > 0 && (
              <div className="px-2 pb-2 flex flex-wrap gap-1">
                {activeIndicators.map((id) => {
                  const ind = INDICATOR_CATALOG[id];
                  if (!ind) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-wallstreet-dark border border-wallstreet-border text-wallstreet-muted"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                      {ind.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleIndicator(id); }}
                        className="ml-0.5 hover:text-wallstreet-red"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
