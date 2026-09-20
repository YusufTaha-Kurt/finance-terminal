import { useState } from 'react';
import { X, Key, Brain, Newspaper, RotateCcw } from 'lucide-react';
import { PROVIDERS } from '../services/aiService';
import AdSlot from './AdSlot';
import { AD_SLOTS } from '../config/ads';

export default function SettingsModal({ isOpen, onClose, settings, updateSetting, updateSettings }) {
  const [activeTab, setActiveTab] = useState('ai');

  if (!isOpen) return null;

  const tabs = [
    { id: 'ai', label: 'AI Ayarları', icon: Brain },
    { id: 'news', label: 'Haberler', icon: Newspaper },
  ];

  const currentProvider = PROVIDERS[settings.aiProvider] || PROVIDERS.openai;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-wallstreet-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-wallstreet-green" />
            Ayarlar
          </h2>
          <button onClick={onClose} className="text-wallstreet-muted hover:text-wallstreet-red transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-wallstreet-border">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === id
                  ? 'text-wallstreet-green border-b-2 border-wallstreet-green bg-wallstreet-green/5'
                  : 'text-wallstreet-muted hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {activeTab === 'ai' && (
            <>
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-wallstreet-muted mb-2">AI Sağlayıcı</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PROVIDERS).map(([key, prov]) => (
                    <button
                      key={key}
                      onClick={() => updateSettings({
                        aiProvider: key,
                        aiModel: prov.defaultModel,
                      })}
                      className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                        settings.aiProvider === key
                          ? 'bg-wallstreet-green/15 text-wallstreet-green border-wallstreet-green/40'
                          : 'bg-wallstreet-dark text-wallstreet-muted border-wallstreet-border hover:border-wallstreet-muted'
                      }`}
                    >
                      {prov.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-wallstreet-muted mb-2">Model</label>
                <select
                  value={settings.aiModel}
                  onChange={(e) => updateSetting('aiModel', e.target.value)}
                  className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-wallstreet-green transition-colors"
                >
                  {currentProvider.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-wallstreet-muted mb-2">
                  {currentProvider.name} API Anahtarı
                </label>
                <input
                  type="password"
                  value={settings.aiApiKey}
                  onChange={(e) => updateSetting('aiApiKey', e.target.value)}
                  placeholder={
                    currentProvider.hasServerKey
                      ? 'Boş bırakın — hazır anahtar kullanılır'
                      : 'sk-... veya API anahtarınız'
                  }
                  className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green transition-colors"
                />
                <p className="mt-1.5 text-xs text-wallstreet-muted">
                  {currentProvider.hasServerKey
                    ? 'Claude için anahtar girmenize gerek yok; istekler sunucudaki hazır anahtarla karşılanır. Kendi anahtarınızı girerseniz onun üzerinden gider ve yalnızca tarayıcınızda saklanır.'
                    : 'Anahtarınız sadece tarayıcınızda saklanır, sunucuya gönderilmez.'}
                </p>
              </div>

              {/* Status */}
              {(() => {
                const ready = !!settings.aiApiKey || currentProvider.hasServerKey;
                const label = settings.aiApiKey
                  ? 'AI bağlantısı yapılandırıldı (kendi anahtarınız)'
                  : currentProvider.hasServerKey
                    ? 'Anahtar girilmedi — sunucudaki anahtar denenecek'
                    : 'API anahtarı girilmedi';
                return (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    ready ? 'bg-wallstreet-green/10 text-wallstreet-green' : 'bg-wallstreet-red/10 text-wallstreet-red'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${ready ? 'bg-wallstreet-green' : 'bg-wallstreet-red'}`} />
                    {label}
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === 'news' && (
            <>
              <div>
                <label className="block text-sm font-medium text-wallstreet-muted mb-2">
                  Finnhub API Anahtarı
                </label>
                <input
                  type="password"
                  value={settings.finnhubApiKey}
                  onChange={(e) => updateSetting('finnhubApiKey', e.target.value)}
                  placeholder="Finnhub API anahtarınız"
                  className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green transition-colors"
                />
                <p className="mt-1.5 text-xs text-wallstreet-muted">
                  <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" className="text-wallstreet-green hover:underline">
                    finnhub.io
                  </a>
                  {' '}adresinden ücretsiz API anahtarı alabilirsiniz.
                </p>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                settings.finnhubApiKey
                  ? 'bg-wallstreet-green/10 text-wallstreet-green'
                  : 'bg-wallstreet-red/10 text-wallstreet-red'
              }`}>
                <div className={`w-2 h-2 rounded-full ${settings.finnhubApiKey ? 'bg-wallstreet-green' : 'bg-wallstreet-red'}`} />
                {settings.finnhubApiKey ? 'Haber servisi yapılandırıldı' : 'API anahtarı girilmedi'}
              </div>
            </>
          )}
        </div>

        {/* Reklam */}
        <div className="px-5 pb-3">
          <AdSlot slot={AD_SLOTS.settings} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-wallstreet-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-wallstreet-green/15 text-wallstreet-green rounded-lg text-sm font-medium hover:bg-wallstreet-green/25 transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
