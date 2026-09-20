<p align="center">
  <img src="public/finance-terminal.jpg" alt="Finance Terminal" width="480" style="border-radius: 16px" />
</p>

<h1 align="center">Finance Terminal</h1>

<p align="center">
  <strong>Browser-based financial charting and market tracking tool.</strong><br/>
  View candlestick charts, apply 20+ technical indicators, draw support/resistance levels, and track 7 different markets — all from a single screen, no account required.
</p>

<p align="center">
  <a href="https://borsa.yusuftahakurt.com"><strong>🔴 Live Demo</strong></a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#disclaimer">Disclaimer</a> •
  <a href="#türkçe">Türkçe</a>
</p>

<p align="center">
  Don't want to clone and run it locally? Try it live: <a href="https://borsa.yusuftahakurt.com">borsa.yusuftahakurt.com</a>
</p>

---

> **⚠️ This is NOT investment advice.** This tool is for chart viewing and market tracking only. It does not recommend buying or selling any asset. See the [LICENSE](LICENSE) for the full disclaimer.

---

## Features

**Markets** — Track BIST (Borsa Istanbul), US equities, crypto, commodities, bonds, forex, and Turkish derivatives (VİOP) with drag-and-drop watchlists across 7 market tabs.

**Charts** — Professional candlestick charts powered by [lightweight-charts](https://github.com/nicehash/lightweight-charts) with smooth zoom, pan, and multiple timeframes (1H, 4H, 1D, 1W, 1M).

**20 Technical Indicators** — EMA (9/21/50), Bollinger Bands, Ichimoku Cloud, VWAP, Parabolic SAR, SuperTrend, Keltner Channels, Pivot Points as overlays. RSI, MACD, Stochastic, CCI, Williams %R, ATR, ADX, OBV, MFI, ROC as oscillator panes.

**Drawing Tools** — Horizontal lines, trend lines, rectangles, and text annotations. All drawings are saved per symbol in your browser's localStorage.

**AI Chat** — Optional integration with OpenAI, Google Gemini, or Anthropic Claude. The AI can interact with the app — switch symbols, toggle indicators, draw levels on the chart. Bring your own API key.

**News** — Financial news from Yahoo Finance RSS (no key needed) with optional Finnhub integration.

**Custom Indicators** — Write your own indicators using a built-in formula engine.

**Technical Analysis Guide** — A 21-topic in-app education center that explains every indicator, from basic moving averages to Ichimoku Cloud strategies.

**100% Client-Side** — Your API keys, watchlists, drawings, and settings stay in your browser. Nothing is sent to any server.

## Quick Start

**Prerequisites:** Node.js ≥ 20

```bash
# Clone the repo
git clone https://github.com/YusufTaha-Kurt/finance-terminal.git
cd finance-terminal

# Install dependencies
npm install

# Set up your CORS proxy URL (see below)
cp .env.example .env.local
# Edit .env.local → set VITE_CORS_PROXY_URL

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). That's it.

### CORS Proxy

Yahoo Finance blocks direct browser requests (CORS). In development, Vite proxies these automatically. In production, you need a small [Cloudflare Worker](https://developers.cloudflare.com/workers/) (free tier is enough):

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = `https://query1.finance.yahoo.com${url.pathname}${url.search}`;
    const resp = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return new Response(resp.body, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  },
};
```

Set `VITE_CORS_PROXY_URL` in `.env.local` to your Worker URL.

### Optional: AI Chat Proxy

The app includes a serverless API proxy for Claude (`server/api-core.js`) that can be deployed to Vercel. This lets users chat with AI without exposing their API key in the browser. See `server/` for details.

## Tech Stack

| What | Technology |
|---|---|
| UI | React 19, Vite 8, TailwindCSS 4 |
| Charts | lightweight-charts v5 |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |
| Data | Yahoo Finance (via CORS proxy) |
| AI (optional) | OpenAI, Gemini, Claude |
| Hosting | Firebase Hosting (or any static host) |

## Project Structure

```
├── index.html              SPA shell with SEO meta tags
├── vite.config.js          Vite + TailwindCSS + custom API plugin
├── server/
│   ├── api-core.js         Serverless API logic (also serves as dev API)
│   └── api-plugin.js       Vite dev server integration
└── src/
    ├── App.jsx              Main layout, panel state, AI actions
    ├── components/
    │   ├── ChartArea.jsx    Chart rendering, indicators, zoom, scroll
    │   ├── Watchlist.jsx    Market tabs, symbol list, drag-and-drop
    │   ├── AIChatPanel.jsx  AI conversation with tool calling
    │   ├── NewsPanel.jsx    Financial news feed
    │   ├── SettingsModal.jsx  API keys, AI provider config
    │   ├── IndicatorPanel.jsx  Indicator selector
    │   ├── DrawingOverlay.jsx  Canvas drawing layer
    │   ├── DrawingToolbar.jsx  Drawing tool selector
    │   ├── TechnicalAnalysisPanel.jsx  Analysis summary
    │   ├── HelpGuide.jsx    21-topic TA education center
    │   └── CustomIndicatorEditor.jsx
    ├── hooks/
    │   ├── useDrawing.js    Drawing state + localStorage
    │   └── useSettings.js   Settings + AI config
    ├── services/
    │   ├── yahooService.js      Market data fetching
    │   ├── indicatorService.js  20 indicator calculations
    │   ├── aiService.js         Multi-provider AI integration
    │   ├── newsService.js       News from Yahoo RSS / Finnhub
    │   ├── signalEngine.js      Buy/sell signal generation
    │   ├── technicalAnalysisEngine.js
    │   └── customIndicatorEngine.js
    └── utils/
        └── drawingGeometry.js   Coordinate transforms, hit-testing
```

## Disclaimer

**This software is a charting and market data visualization tool.** It does not provide investment advice, endorse any trading strategy, or recommend buying/selling any financial instrument.

Any signals, scores, or AI outputs are algorithmic results based on historical data and must not be treated as financial recommendations. The developer accepts no liability for financial decisions made using this software. Always consult a licensed financial advisor.

See [LICENSE](LICENSE) for the full legal text in English and Turkish.

## Contributing

Pull requests are welcome. Fork the repo, create a feature branch, and submit a PR.

---

<a id="türkçe"></a>

## 🇹🇷 Türkçe

### Finance Terminal Nedir?

Finance Terminal, tarayıcıda çalışan açık kaynaklı bir grafik izleme ve piyasa takip aracıdır. BIST, ABD borsası, kripto, emtia, tahvil, döviz ve VİOP piyasalarını tek ekrandan takip etmenizi sağlar.

Bu uygulama **yatırım tavsiyesi vermez**. Sadece fiyat grafiklerini görüntülemenize, teknik indikatörleri uygulamanıza ve piyasa verilerini izlemenize yardımcı olur.

Kurup denemek istemiyorsanız canlı sürümü buradan deneyebilirsiniz: **[borsa.yusuftahakurt.com](https://borsa.yusuftahakurt.com)**

### Ne Sunuyor?

- **7 piyasa sekmesi** ile sürükle-bırak izleme listeleri
- **Profesyonel mum grafikleri** — yakınlaştırma, kaydırma, çoklu zaman dilimleri
- **20 teknik indikatör** — EMA, RSI, MACD, Bollinger, Ichimoku, SuperTrend ve dahası
- **Çizim araçları** — yatay çizgi, trend çizgisi, dikdörtgen, metin notu
- **Yapay zeka sohbeti** — OpenAI, Gemini veya Claude ile isteğe bağlı entegrasyon
- **Haber paneli** — Yahoo Finance RSS üzerinden finansal haberler
- **Kendi indikatörlerinizi yazma** — formül motoru ile özel göstergeler
- **21 konulu teknik analiz rehberi** — her indikatörün detaylı açıklaması
- **%100 tarayıcı taraflı** — API anahtarlarınız ve ayarlarınız tarayıcınızda kalır

### Kurulum

```bash
git clone https://github.com/YusufTaha-Kurt/finance-terminal.git
cd finance-terminal
npm install
cp .env.example .env.local
# .env.local dosyasında VITE_CORS_PROXY_URL'i kendi Cloudflare Worker adresinize ayarlayın
npm run dev
```

Tarayıcınızda [http://localhost:5173](http://localhost:5173) açılacaktır.

### Güvenlik

- API anahtarları kaynak kodda **yoktur** — ortam değişkeni veya tarayıcı localStorage'ı
- Hiçbir kullanıcı verisi sunucuya gönderilmez
- İzleme listeniz, çizimleriniz, ayarlarınız sadece kendi tarayıcınızda yaşar

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/YusufTaha-Kurt">Yusuf Taha Kurt</a>
</p>
