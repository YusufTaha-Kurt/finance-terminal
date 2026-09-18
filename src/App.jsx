import { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Watchlist from './components/Watchlist';
import ChartArea from './components/ChartArea';
import AIChatPanel from './components/AIChatPanel';
import NewsPanel from './components/NewsPanel';
import SettingsModal from './components/SettingsModal';
import CustomIndicatorEditor from './components/CustomIndicatorEditor';
import { useSettings } from './hooks/useSettings';
import { INDICATOR_CATALOG } from './services/indicatorService';

function App() {
  const [activeSymbol, setActiveSymbol] = useState('THYAO');
  const [activeMarket, setActiveMarket] = useState('bist');
  const [chartInterval, setChartInterval] = useState('1d');

  // Panels
  const [showAI, setShowAI] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Settings
  const { settings, updateSetting, updateSettings, aiConfig, newsConfig } = useSettings();

  // Active Indicators
  const [activeIndicators, setActiveIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('active_indicators');
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.keys(INDICATOR_CATALOG).filter(k => INDICATOR_CATALOG[k].default);
  });

  // Custom Indicators
  const [customIndicators, setCustomIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_indicators');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const toggleIndicator = useCallback((indicatorId, forceState) => {
    setActiveIndicators(prev => {
      let next;
      if (forceState !== undefined) {
        if (forceState && !prev.includes(indicatorId)) {
          next = [...prev, indicatorId];
        } else if (!forceState) {
          next = prev.filter(id => id !== indicatorId);
        } else {
          next = prev;
        }
      } else {
        next = prev.includes(indicatorId)
          ? prev.filter(id => id !== indicatorId)
          : [...prev, indicatorId];
      }
      localStorage.setItem('active_indicators', JSON.stringify(next));
      return next;
    });
  }, []);

  const saveCustomIndicator = useCallback((indicator) => {
    setCustomIndicators(prev => {
      const next = [...prev, indicator];
      localStorage.setItem('custom_indicators', JSON.stringify(next));
      toast.success(`"${indicator.name}" indikatörü eklendi`);
      return next;
    });
  }, []);

  // AI App Actions — AI'ın uygulama üzerinde yapabileceği aksiyonlar
  const appActions = {
    addSymbol: (symbol, marketType) => {
      // Watchlist bileşeni kendi state'ini yönetiyor, burada sadece sembol değiştiriyoruz
      if (marketType) setActiveMarket(marketType);
      setActiveSymbol(symbol.toUpperCase());
      toast.success(`${symbol} eklendi`);
    },
    removeSymbol: (symbol) => {
      toast.success(`${symbol} kaldırıldı`);
    },
    switchMarket: (marketType) => {
      setActiveMarket(marketType);
      toast.success(`${marketType.toUpperCase()} piyasasına geçildi`);
    },
    selectSymbol: (symbol) => {
      setActiveSymbol(symbol.toUpperCase());
    },
    toggleIndicator: (indicatorId, enabled) => {
      toggleIndicator(indicatorId, enabled);
      toast.success(`${indicatorId} ${enabled ? 'açıldı' : 'kapatıldı'}`);
    },
    setInterval: (interval) => {
      setChartInterval(interval);
      toast.success(`Zaman dilimi: ${interval}`);
    },
    drawHorizontalLine: (price, label) => {
      toast.success(`${price} seviyesine çizgi eklendi`);
    },
    getNews: () => {
      setShowNews(true);
    },
  };

  // AI Context — mevcut uygulama durumu
  const appContext = {
    activeSymbol,
    marketType: activeMarket,
    interval: chartInterval,
    indicators: activeIndicators,
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#d1d4dc',
            border: '1px solid #262626',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#26a69a', secondary: '#1a1a1a' },
          },
          error: {
            iconTheme: { primary: '#ef5350', secondary: '#1a1a1a' },
          },
        }}
      />

      <div className="flex flex-col md:flex-row h-screen w-screen overflow-x-hidden overflow-y-auto md:overflow-hidden bg-wallstreet-dark font-sans text-wallstreet-text">
        <Watchlist
          activeSymbol={activeSymbol}
          setActiveSymbol={setActiveSymbol}
          activeMarket={activeMarket}
          setActiveMarket={setActiveMarket}
          onOpenSettings={() => setShowSettings(true)}
          onToggleNews={() => { setShowNews(!showNews); if (showAI) setShowAI(false); }}
          onToggleAI={() => { setShowAI(!showAI); if (showNews) setShowNews(false); }}
          showNews={showNews}
          showAI={showAI}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          <ChartArea
            selectedSymbol={activeSymbol}
            activeMarket={activeMarket}
            activeIndicators={activeIndicators}
            onToggleIndicator={toggleIndicator}
            customIndicators={customIndicators}
            onOpenCustomEditor={() => setShowCustomEditor(true)}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
          />

        </div>
      </div>

      {/* Panels */}
      <AIChatPanel
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        aiConfig={aiConfig}
        appContext={appContext}
        appActions={appActions}
      />

      <NewsPanel
        isOpen={showNews}
        onClose={() => setShowNews(false)}
        finnhubApiKey={settings.finnhubApiKey}
        activeSymbol={activeSymbol}
        marketType={activeMarket}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        updateSetting={updateSetting}
        updateSettings={updateSettings}
      />

      <CustomIndicatorEditor
        isOpen={showCustomEditor}
        onClose={() => setShowCustomEditor(false)}
        onSave={saveCustomIndicator}
      />
    </>
  );
}

export default App;
