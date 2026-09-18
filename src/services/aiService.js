// ============================================================================
//  aiService.js — Çoklu AI Sağlayıcı Entegrasyonu
//  OpenAI, Google Gemini, Anthropic Claude desteği
//  Hem analiz (read) hem de uygulama kontrolü (write) yeteneği
// ============================================================================

// ============================================================================
//  AI Provider Yapılandırmaları
// ============================================================================

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    defaultModel: 'gpt-4o-mini',
  },
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    defaultModel: 'gemini-2.0-flash',
  },
  claude: {
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-opus-5', label: 'Claude Opus 5' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
    defaultModel: 'claude-sonnet-5',
    // Anahtar girilmese de çalışır: istek sunucu tarafındaki proxy'ye gider.
    hasServerKey: true,
  },
};

export { PROVIDERS };

// ============================================================================
//  Sunucu Tarafı Claude Proxy
//  Anahtar ön yüz paketine konulamaz — siteyi açan herkes okuyabilirdi.
//  Bu yüzden anahtarsız istekler Vercel'deki proxy'ye gider; anahtar orada.
//  Ayarlardan kendi anahtarınızı girerseniz doğrudan Anthropic'e gidilir.
// ============================================================================
export const CLAUDE_PROXY_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/ai/chat`
  : '/api/v1/ai/chat';

// ============================================================================
//  Tool Tanımları — AI'ın uygulama üzerinde yapabilecekleri
// ============================================================================

const TOOLS = [
  {
    name: 'addSymbol',
    description: 'Watchlist\'e yeni bir sembol ekler. Sembol ve market türü belirtilmelidir.',
    parameters: {
      symbol: { type: 'string', description: 'Eklenecek sembol (örn: AAPL, BTC, THYAO)' },
      marketType: { type: 'string', description: 'Market türü: bist, us, crypto, commodity, bond, forex, viop' },
    },
  },
  {
    name: 'removeSymbol',
    description: 'Watchlist\'ten bir sembolü kaldırır.',
    parameters: {
      symbol: { type: 'string', description: 'Kaldırılacak sembol' },
    },
  },
  {
    name: 'switchMarket',
    description: 'Aktif piyasa sekmesini değiştirir.',
    parameters: {
      marketType: { type: 'string', description: 'Geçilecek market türü: bist, us, crypto, commodity, bond, forex, viop' },
    },
  },
  {
    name: 'selectSymbol',
    description: 'Belirtilen sembolü seçer ve grafiğini açar.',
    parameters: {
      symbol: { type: 'string', description: 'Seçilecek sembol' },
    },
  },
  {
    name: 'toggleIndicator',
    description: 'Bir teknik indikatörü açar veya kapatır.',
    parameters: {
      indicatorId: { type: 'string', description: 'İndikatör ID (ema9, ema21, ema50, rsi, macd, bollinger, stochastic, atr, adx, cci, williamsR, obv, vwap, psar, ichimoku, supertrend, pivot, mfi, roc, keltner)' },
      enabled: { type: 'boolean', description: 'true=aç, false=kapat' },
    },
  },
  {
    name: 'setInterval',
    description: 'Grafik zaman dilimini değiştirir.',
    parameters: {
      interval: { type: 'string', description: 'Zaman dilimi: 1h, 4h, 1d' },
    },
  },
  {
    name: 'drawHorizontalLine',
    description: 'Grafik üzerine yatay destek/direnç çizgisi ekler.',
    parameters: {
      price: { type: 'number', description: 'Fiyat seviyesi' },
      label: { type: 'string', description: 'Etiket (opsiyonel, örn: Destek, Direnç)' },
    },
  },
  {
    name: 'getNews',
    description: 'Belirtilen sembol veya genel finans haberleri getirir.',
    parameters: {
      symbol: { type: 'string', description: 'Sembol (opsiyonel, boş bırakılırsa genel haberler)' },
    },
  },
];

// ============================================================================
//  System Prompt — AI'ın rolü ve bağlamı
// ============================================================================

const SYSTEM_PROMPT = `Sen profesyonel bir finans terminali asistanısın. Finance Terminal uygulamasına entegre edildin.

YAPABILECEKLERIN:
- Hisse senedi, kripto para, emtia, tahvil ve döviz analizi yapabilirsin
- Teknik analiz yorumları yapabilirsin (EMA, RSI, MACD, Bollinger, Ichimoku, vb.)
- Kullanıcının watchlist'ine sembol ekleyebilir/çıkarabilirsin
- İndikatörleri açıp kapatabilirsin
- Destek/direnç çizgileri ekleyebilirsin
- Zaman dilimini değiştirebilirsin
- Haberleri getirebilirsin

KURALLAR:
- Türkçe yanıt ver (kullanıcı farklı bir dil kullanmadıkça)
- Yanıtlarını kısa ve öz tut
- "Yatırım tavsiyesi" vermekten kaçın, sadece teknik analiz yap
- Tool çağrıları yap: kullanıcı bir aksiyon istediğinde ilgili tool'u çağır
- Grafik verileri sana bağlam olarak verilecek, bunları analiz et
`;

// ============================================================================
//  Provider'a Göre İstek Oluşturma
// ============================================================================

/**
 * OpenAI formatında mesaj gönder
 */
const sendOpenAI = async (apiKey, model, messages, tools) => {
  const openaiTools = tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
        ),
        required: Object.keys(t.parameters),
      },
    },
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: openaiTools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API hatası: HTTP ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  
  return {
    content: choice?.message?.content || '',
    toolCalls: choice?.message?.tool_calls?.map(tc => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}'),
    })) || [],
  };
};

/**
 * Google Gemini formatında mesaj gönder
 */
const sendGemini = async (apiKey, model, messages, tools) => {
  const geminiTools = [{
    functionDeclarations: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type.toUpperCase(), description: v.description }])
        ),
        required: Object.keys(t.parameters),
      },
    })),
  }];

  // Gemini mesaj formatına dönüştür
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: geminiTools,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API hatası: HTTP ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let content = '';
  const toolCalls = [];

  for (const part of parts) {
    if (part.text) content += part.text;
    if (part.functionCall) {
      toolCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      });
    }
  }

  return { content, toolCalls };
};

/**
 * Anthropic Claude formatında mesaj gönder
 */
const sendClaude = async (apiKey, model, messages, tools) => {
  const claudeTools = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
      ),
      required: Object.keys(t.parameters),
    },
  }));

  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const payload = {
    model,
    system: systemMsg,
    messages: chatMessages,
    tools: claudeTools,
    max_tokens: 2048,
    temperature: 0.7,
  };

  // Kendi anahtarı varsa doğrudan Anthropic'e, yoksa sunucu proxy'sine
  const response = apiKey
    ? await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(payload),
      })
    : await fetch(CLAUDE_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `Claude API hatası: HTTP ${response.status}`);
  }

  const data = await response.json();
  let content = '';
  const toolCalls = [];

  for (const block of data.content || []) {
    if (block.type === 'text') content += block.text;
    if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        args: block.input || {},
      });
    }
  }

  return { content, toolCalls };
};

// ============================================================================
//  ANA DIŞA AKTARMA
// ============================================================================

/**
 * Belirtilen AI provider ile mesaj gönderir ve yanıt alır.
 * @param {object} config — { provider, apiKey, model }
 * @param {Array<{role: string, content: string}>} messages — Mesaj geçmişi
 * @param {object} context — Mevcut uygulama durumu (grafik verileri, aktif sembol vs.)
 * @returns {Promise<{content: string, toolCalls: Array}>}
 */
export const sendMessage = async (config, messages, context = {}) => {
  const { provider, apiKey, model } = config;

  // Claude sunucu tarafındaki proxy üzerinden anahtarsız da çalışır;
  // diğer sağlayıcılar için kullanıcının kendi anahtarı şart.
  if (!apiKey && !PROVIDERS[provider]?.hasServerKey) {
    throw new Error('API anahtarı gerekli. Ayarlardan ekleyin.');
  }

  // Context'i system prompt'a ekle
  let contextInfo = '';
  if (context.activeSymbol) contextInfo += `\nAktif sembol: ${context.activeSymbol}`;
  if (context.marketType) contextInfo += `\nMarket türü: ${context.marketType}`;
  if (context.interval) contextInfo += `\nZaman dilimi: ${context.interval}`;
  if (context.price) contextInfo += `\nGüncel fiyat: ${context.price}`;
  if (context.changePercent !== undefined) contextInfo += `\nGünlük değişim: %${context.changePercent}`;
  if (context.indicators) contextInfo += `\nAktif indikatörler: ${context.indicators.join(', ')}`;
  if (context.latestCandles) {
    contextInfo += `\nSon 5 mum verisi: ${JSON.stringify(context.latestCandles.slice(-5))}`;
  }

  const systemMessage = {
    role: 'system',
    content: SYSTEM_PROMPT + (contextInfo ? `\n\nMEVCUT DURUM:${contextInfo}` : ''),
  };

  const fullMessages = [systemMessage, ...messages];

  switch (provider) {
    case 'openai':
      return sendOpenAI(apiKey, model, fullMessages, TOOLS);
    case 'gemini':
      return sendGemini(apiKey, model, fullMessages, TOOLS);
    case 'claude':
      return sendClaude(apiKey, model, fullMessages, TOOLS);
    default:
      throw new Error(`Bilinmeyen AI sağlayıcısı: ${provider}`);
  }
};

/**
 * AI tool çağrısını uygulama aksiyonuna çevirir.
 * @param {object} toolCall — { name, args }
 * @param {object} appActions — Uygulama aksiyon fonksiyonları
 * @returns {string} — Sonuç mesajı
 */
export const executeToolCall = (toolCall, appActions) => {
  const { name, args } = toolCall;

  try {
    switch (name) {
      case 'addSymbol':
        appActions.addSymbol?.(args.symbol, args.marketType);
        return `✅ ${args.symbol} sembolü ${args.marketType} listesine eklendi.`;
      case 'removeSymbol':
        appActions.removeSymbol?.(args.symbol);
        return `✅ ${args.symbol} sembolü kaldırıldı.`;
      case 'switchMarket':
        appActions.switchMarket?.(args.marketType);
        return `✅ ${args.marketType} piyasasına geçildi.`;
      case 'selectSymbol':
        appActions.selectSymbol?.(args.symbol);
        return `✅ ${args.symbol} seçildi.`;
      case 'toggleIndicator':
        appActions.toggleIndicator?.(args.indicatorId, args.enabled);
        return `✅ ${args.indicatorId} indikatörü ${args.enabled ? 'açıldı' : 'kapatıldı'}.`;
      case 'setInterval':
        appActions.setInterval?.(args.interval);
        return `✅ Zaman dilimi ${args.interval} olarak değiştirildi.`;
      case 'drawHorizontalLine':
        appActions.drawHorizontalLine?.(args.price, args.label);
        return `✅ ${args.price} seviyesine ${args.label || 'çizgi'} eklendi.`;
      case 'getNews':
        appActions.getNews?.(args.symbol);
        return `📰 ${args.symbol ? args.symbol + ' haberleri' : 'Genel haberler'} getiriliyor...`;
      default:
        return `⚠️ Bilinmeyen araç: ${name}`;
    }
  } catch (err) {
    return `❌ İşlem başarısız: ${err.message}`;
  }
};
