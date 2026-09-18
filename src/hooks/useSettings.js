// ============================================================================
//  useSettings.js — Global Settings Hook (localStorage tabanlı)
//  AI provider, API key'ler, tema ve genel tercihler
// ============================================================================

import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'ft_settings';

const DEFAULT_SETTINGS = {
  // AI Ayarları
  // Varsayılan Claude: anahtar girilmese de sunucu tarafındaki proxy
  // üzerinden çalışır (bkz. aiService.js / CLAUDE_PROXY_URL).
  aiProvider: 'claude', // 'openai' | 'gemini' | 'claude'
  aiApiKey: '',
  aiModel: 'claude-sonnet-5',

  // Haber Ayarları
  finnhubApiKey: '',

  // Genel
  theme: 'dark',
  language: 'tr',
};

/**
 * localStorage tabanlı global ayarlar hook'u.
 * Tüm bileşenlerden aynı ayarlara erişim sağlar.
 */
export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        // Kendi anahtarını girmemiş kullanıcıyı hazır çalışan Claude'a al.
        // Anahtarı olanın ayarına dokunulmaz.
        if (!merged.aiApiKey) {
          merged.aiProvider = 'claude';
          if (!String(merged.aiModel || '').startsWith('claude-')) {
            merged.aiModel = DEFAULT_SETTINGS.aiModel;
          }
        }
        return merged;
      }
    } catch (e) {
      console.warn('Ayarlar yüklenemedi:', e);
    }
    return { ...DEFAULT_SETTINGS };
  });

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Ayarlar kaydedilemedi:', e);
      }
      return next;
    });
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Ayarlar kaydedilemedi:', e);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Ayarlar sıfırlanamadı:', e);
    }
  }, []);

  // AI yapılandırma bilgilerini türet
  const aiConfig = useMemo(() => {
    const { aiProvider, aiApiKey, aiModel } = settings;
    // Claude'da sunucu tarafı anahtar var; kullanıcı anahtarı olmadan da hazır.
    const isConfigured = !!aiApiKey || aiProvider === 'claude';
    return { provider: aiProvider, apiKey: aiApiKey, model: aiModel, isConfigured };
  }, [settings.aiProvider, settings.aiApiKey, settings.aiModel]);

  const newsConfig = useMemo(() => {
    return { apiKey: settings.finnhubApiKey, isConfigured: !!settings.finnhubApiKey };
  }, [settings.finnhubApiKey]);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    aiConfig,
    newsConfig,
  };
}

export default useSettings;
