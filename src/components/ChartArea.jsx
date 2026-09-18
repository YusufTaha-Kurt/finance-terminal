import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { Loader2 } from 'lucide-react';
import { fetchCandleData } from '../services/yahooService';
import { calculateAll, INDICATOR_CATALOG } from '../services/indicatorService';
import { generateSignals } from '../services/signalEngine';
import { computeCustomIndicator } from '../services/customIndicatorEngine';
import IndicatorPanel from './IndicatorPanel';
import TechnicalAnalysisPanel from './TechnicalAnalysisPanel';
import DrawingToolbar from './DrawingToolbar';
import DrawingOverlay from './DrawingOverlay';
import useDrawing from '../hooks/useDrawing';
import { hitTestDrawing, roundPrice } from '../utils/drawingGeometry';

// ============================================================================
//  Zaman Dilimi Seçenekleri
// ============================================================================
const INTERVALS = [
  { label: '1S', value: '1h' },
  { label: '4S', value: '4h' },
  { label: '1G', value: '1d' },
];

// ============================================================================
//  Panel Yükseklikleri
//  Çok sayıda osilatör açıldığında paneller daralmak yerine dikey kaydırma
//  devreye girsin diye ana grafiğe bir alt sınır, osilatörlere sabit boy verilir.
// ============================================================================
const MAIN_CHART_MIN_H = 400;
const OSC_PANEL_H = 150;

// ============================================================================
//  Ortak grafik tema ayarları
// ============================================================================
const chartTheme = {
  layout: {
    background: { type: ColorType.Solid, color: '#131313' },
    textColor: '#787b86',
    fontSize: 11,
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: '#1e1e1e' },
    horzLines: { color: '#1e1e1e' },
  },
  crosshair: {
    mode: 1,
    vertLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#262626' },
    horzLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#262626' },
  },
  rightPriceScale: { borderColor: '#262626' },
  timeScale: { borderColor: '#262626', rightOffset: 5 },
  // Düz fare tekerleği paneli kaydırsın; yakınlaştırma Ctrl+tekerlek ile
  // (aşağıda elle uygulanan onWheelZoom dinleyicisi üstleniyor).
  handleScroll: { mouseWheel: false },
  handleScale: { mouseWheel: false },
};

// ============================================================================
//  Yatay referans çizgisi
// ============================================================================
const addHorizontalLine = (series, value, color, lineStyle = 2) => {
  series.createPriceLine({
    price: value,
    color,
    lineWidth: 1,
    lineStyle,
    axisLabelVisible: true,
    title: '',
  });
};

// ============================================================================
//  Zaman Senkronizasyonu
// ============================================================================
const syncTimeScales = (charts) => {
  let isSyncing = false;
  const subscriptions = charts.map((sourceChart, sourceIdx) => {
    const handler = (logicalRange) => {
      if (isSyncing) return;
      isSyncing = true;
      charts.forEach((targetChart, targetIdx) => {
        if (targetIdx !== sourceIdx && logicalRange) {
          targetChart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      });
      isSyncing = false;
    };
    sourceChart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return { chart: sourceChart, handler };
  });

  return () => {
    subscriptions.forEach(({ chart, handler }) => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    });
  };
};

// ============================================================================
//  Hangi osilatörler aktif?
// ============================================================================
const getActiveOscillators = (activeIndicators) => {
  return activeIndicators.filter(id => {
    const ind = INDICATOR_CATALOG[id];
    return ind && !ind.overlay;
  });
};

export default function ChartArea({
  selectedSymbol = 'THYAO',
  activeMarket = 'bist',
  activeIndicators,
  onToggleIndicator,
  customIndicators = [],
  onOpenCustomEditor,
  interval: externalInterval,
  onIntervalChange,
}) {
  const mainContainerRef = useRef(null);
  const oscillatorContainersRef = useRef({});
  const scrollContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const oscillatorChartsRef = useRef({});
  const candleSeriesRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interval, setIntervalState] = useState(externalInterval || '1d');
  const [candleData, setCandleData] = useState(null);

  // Drawing tools
  const drawing = useDrawing(selectedSymbol);
  // Grafik/seri her yeniden kurulduğunda artar — çizim katmanı buna göre tazelenir
  const [chartVersion, setChartVersion] = useState(0);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);

  // Sync interval with external state
  useEffect(() => {
    if (externalInterval && externalInterval !== interval) {
      setIntervalState(externalInterval);
    }
  }, [externalInterval]);

  const handleIntervalChange = (val) => {
    setIntervalState(val);
    onIntervalChange?.(val);
  };

  // Switch drawings when symbol changes
  useEffect(() => {
    drawing.switchSymbol(selectedSymbol);
  }, [selectedSymbol]);

  // Active oscillators
  const activeOscillators = getActiveOscillators(activeIndicators);

  // Seçili çizim hâlâ listede mi? (sembol değişimi / sil / geri al sonrası)
  const selectedId = drawing.drawings.some((d) => d.id === selectedDrawingId)
    ? selectedDrawingId
    : null;

  // ==========================================================================
  //  Çizim — grafik tıklama işleyicisi
  //  NOT: subscribeClick yalnızca grafik oluşturulurken bir kez bağlanır.
  //  Bu yüzden handler'ı doğrudan bağlamak yerine ref üzerinden çağırıyoruz;
  //  aksi halde closure "activeTool: none" değerinde donup kalıyordu.
  // ==========================================================================
  const handleChartClick = useCallback((param) => {
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series || !param.point) return;

    const price = series.coordinateToPrice(param.point.y);
    if (price === null || price === undefined || isNaN(price)) return;
    const p = roundPrice(price);

    // Zaman ve logical index — boşluk alanına tıklandığında da konum korunur
    const ts = chart.timeScale();
    let time = param.time;
    if (time === null || time === undefined) {
      try { time = ts.coordinateToTime(param.point.x); } catch { time = null; }
    }
    let logical = null;
    try { logical = ts.coordinateToLogical(param.point.x); } catch { /* veri yok */ }
    const pt = { time: time ?? null, logical, price: p };

    // ── Seçim modu: tıklanan çizimi seç ────────────────────────
    if (drawing.activeTool === 'none') {
      const hit = [...drawing.drawings].reverse().find((d) =>
        hitTestDrawing(chart, series, d, param.point.x, param.point.y)
      );
      setSelectedDrawingId(hit ? hit.id : null);
      return;
    }

    if (drawing.activeTool === 'hline') {
      drawing.addHorizontalLine(p, String(p));
    } else if (drawing.activeTool === 'trendline') {
      if (!drawing.pendingDraw) {
        drawing.setPendingDraw({ type: 'trendline', color: drawing.activeColor, point1: pt });
      } else {
        drawing.addTrendLine(drawing.pendingDraw.point1, pt);
        drawing.setPendingDraw(null);
      }
    } else if (drawing.activeTool === 'rect') {
      if (!drawing.pendingDraw) {
        drawing.setPendingDraw({ type: 'rect', color: drawing.activeColor, topLeft: pt });
      } else {
        drawing.addRectangle(drawing.pendingDraw.topLeft, pt);
        drawing.setPendingDraw(null);
      }
    } else if (drawing.activeTool === 'text') {
      const text = window.prompt('Metin notu girin:');
      if (text) drawing.addTextNote(pt, text);
    }
  }, [
    drawing.activeTool, drawing.activeColor, drawing.drawings, drawing.pendingDraw,
    drawing.addHorizontalLine, drawing.addTrendLine, drawing.addRectangle,
    drawing.addTextNote, drawing.setPendingDraw,
  ]);

  // Güncel handler'ı ref'te tut — grafiğe sabit bir sarmalayıcı bağlanır
  const chartClickRef = useRef(handleChartClick);
  useEffect(() => {
    chartClickRef.current = handleChartClick;
  }, [handleChartClick]);
  const stableChartClick = useCallback((param) => chartClickRef.current?.(param), []);

  // ── Yatay çizgiler: native price line olarak (fiyat ekseni etiketiyle) ───
  const drawingLinesRef = useRef([]);
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    drawingLinesRef.current.forEach((line) => {
      try { series.removePriceLine(line); } catch { /* seri yenilenmiş olabilir */ }
    });
    drawingLinesRef.current = [];

    drawing.drawings.forEach((d) => {
      if (d.type !== 'hline') return;
      try {
        drawingLinesRef.current.push(series.createPriceLine({
          price: d.price,
          color: d.color,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: d.label || '',
        }));
      } catch { /* noop */ }
    });
  }, [drawing.drawings, chartVersion]);

  // ── Klavye: Esc → devam eden çizimi iptal, Del → seçili çizimi sil ───────
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      if (e.key === 'Escape') {
        if (drawing.pendingDraw) drawing.setPendingDraw(null);
        else if (drawing.activeTool !== 'none') drawing.setActiveTool('none');
        setSelectedDrawingId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
        e.preventDefault();
        drawing.removeDrawing(selectedId);
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawing.pendingDraw, drawing.activeTool, drawing.setPendingDraw, drawing.setActiveTool, drawing.removeDrawing, selectedId]);

  // Araç değişince bekleyen çizimi ve seçimi sıfırla
  const handleSetTool = useCallback((tool) => {
    drawing.setPendingDraw(null);
    setSelectedDrawingId(null);
    drawing.setActiveTool(tool);
  }, [drawing.setPendingDraw, drawing.setActiveTool]);

  useEffect(() => {
    if (!mainContainerRef.current) return;

    // ================================================================
    //  Önceki grafikleri temizle
    // ================================================================
    if (mainChartRef.current) {
      mainChartRef.current.remove();
      mainChartRef.current = null;
    }
    Object.values(oscillatorChartsRef.current).forEach(c => {
      try { c.remove(); } catch {}
    });
    oscillatorChartsRef.current = {};

    // ================================================================
    //  1) Ana Grafik
    // ================================================================
    const mainChart = createChart(mainContainerRef.current, {
      ...chartTheme,
      layout: { ...chartTheme.layout, textColor: '#d1d4dc' },
      timeScale: {
        ...chartTheme.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    mainChartRef.current = mainChart;

    // Click handler for drawings (sabit sarmalayıcı — güncel handler ref'ten okunur)
    mainChart.subscribeClick(stableChartClick);

    // ================================================================
    //  2) Osilatör Grafikleri
    // ================================================================
    const oscCharts = {};
    activeOscillators.forEach(oscId => {
      const container = oscillatorContainersRef.current[oscId];
      if (!container) return;
      const oscChart = createChart(container, {
        ...chartTheme,
        timeScale: oscId === activeOscillators[activeOscillators.length - 1]
          ? { ...chartTheme.timeScale }
          : { ...chartTheme.timeScale, visible: false },
        rightPriceScale: {
          borderColor: '#262626',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
      });
      oscCharts[oscId] = oscChart;
    });
    oscillatorChartsRef.current = oscCharts;

    // ================================================================
    //  Zaman Senkronizasyonu
    // ================================================================
    const allCharts = [mainChart, ...Object.values(oscCharts)];
    const cleanupSync = syncTimeScales(allCharts);

    // ================================================================
    //  Fare Tekerleği: düz = panel kaydırma, Ctrl = grafik yakınlaştırma
    //  Capture aşamasında bayrağı çeviriyoruz; böylece aynı olayı
    //  lightweight-charts işlemeden önce doğru mod devrede oluyor.
    // ================================================================
    //  Grafiğin kendi tekerlek yakınlaştırması kapalı (chartTheme), böylece düz
    //  tekerlek paneli kaydırır. Ctrl basılıyken yakınlaştırmayı elle uyguluyoruz;
    //  zaman ekseni senkronize olduğu için osilatörler de birlikte yakınlaşır.
    const scrollEl = scrollContainerRef.current;
    const ZOOM_STEP = 1.15;
    const onWheelZoom = (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // düz tekerlek → panel kaydırma
      e.preventDefault();

      const ts = mainChart.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;

      // Fare imlecinin altındaki noktayı sabit tutarak yakınlaştır
      const rect = mainContainerRef.current?.getBoundingClientRect();
      let anchor = (range.from + range.to) / 2;
      if (rect) {
        const x = e.clientX - rect.left;
        const a = ts.coordinateToLogical(x);
        if (a !== null && a !== undefined && !isNaN(a)) anchor = a;
      }

      const k = e.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP; // aşağı = uzaklaş
      const from = anchor - (anchor - range.from) * k;
      const to = anchor + (range.to - anchor) * k;
      if (to - from < 5) return; // aşırı yakınlaşmayı engelle

      try { ts.setVisibleLogicalRange({ from, to }); } catch { /* noop */ }
    };
    scrollEl?.addEventListener('wheel', onWheelZoom, { passive: false });

    // ================================================================
    //  Veri Yükleme
    // ================================================================
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const candles = await fetchCandleData(selectedSymbol, interval, undefined, activeMarket);
        const indicators = calculateAll(candles, activeIndicators);

        // ──────────────────────────────────────────
        //  ANA GRAFİK — Mum Serisi
        // ──────────────────────────────────────────
        const candleSeries = mainChart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        candleSeries.setData(candles);
        candleSeriesRef.current = candleSeries;
        setCandleData(candles);
        // Çizim katmanı ve yatay çizgiler yeni seriye bağlansın
        setChartVersion((v) => v + 1);

        // ──────────────────────────────────────────
        //  ANA GRAFİK — Overlay İndikatörler
        // ──────────────────────────────────────────
        const overlayInds = activeIndicators.filter(id => INDICATOR_CATALOG[id]?.overlay);

        overlayInds.forEach(indId => {
          const indConfig = INDICATOR_CATALOG[indId];
          if (!indConfig) return;

          switch (indId) {
            case 'ema9':
            case 'ema21':
            case 'ema50': {
              const data = indicators[indId];
              if (!data) return;
              const series = mainChart.addSeries(LineSeries, {
                color: indConfig.color,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              break;
            }
            case 'bollinger': {
              const boll = indicators.bollinger;
              if (!boll) return;
              ['upper', 'middle', 'lower'].forEach((band, idx) => {
                const series = mainChart.addSeries(LineSeries, {
                  color: idx === 1 ? '#9c27b0' : '#9c27b066',
                  lineWidth: idx === 1 ? 1 : 1,
                  lineStyle: idx === 1 ? 0 : 2,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                series.setData(
                  candles.map((c, i) => ({ time: c.time, value: boll[band][i] })).filter(d => d.value !== null)
                );
              });
              break;
            }
            case 'vwap': {
              const data = indicators.vwap;
              if (!data) return;
              const series = mainChart.addSeries(LineSeries, {
                color: indConfig.color,
                lineWidth: 1.5,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              break;
            }
            case 'psar': {
              const data = indicators.psar;
              if (!data) return;
              const series = mainChart.addSeries(LineSeries, {
                color: indConfig.color,
                lineWidth: 0,
                pointMarkersVisible: true,
                pointMarkersRadius: 1.5,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              break;
            }
            case 'supertrend': {
              const st = indicators.supertrend;
              if (!st) return;
              // Bullish (green) and bearish (red) portions
              const bullData = candles.map((c, i) => ({
                time: c.time,
                value: st.direction[i] === 1 ? st.supertrend[i] : null,
              })).filter(d => d.value !== null);
              const bearData = candles.map((c, i) => ({
                time: c.time,
                value: st.direction[i] === -1 ? st.supertrend[i] : null,
              })).filter(d => d.value !== null);

              if (bullData.length > 0) {
                const s = mainChart.addSeries(LineSeries, {
                  color: '#26a69a',
                  lineWidth: 2,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                s.setData(bullData);
              }
              if (bearData.length > 0) {
                const s = mainChart.addSeries(LineSeries, {
                  color: '#ef5350',
                  lineWidth: 2,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                s.setData(bearData);
              }
              break;
            }
            case 'ichimoku': {
              const ichi = indicators.ichimoku;
              if (!ichi) return;
              const ichConfigs = [
                { data: ichi.tenkan, color: '#2196f3', label: 'Tenkan' },
                { data: ichi.kijun, color: '#ef5350', label: 'Kijun' },
                { data: ichi.senkouA, color: '#26a69a66', label: 'Senkou A' },
                { data: ichi.senkouB, color: '#ef535066', label: 'Senkou B' },
              ];
              ichConfigs.forEach(({ data, color }) => {
                const series = mainChart.addSeries(LineSeries, {
                  color,
                  lineWidth: 1,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                series.setData(
                  candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
                );
              });
              break;
            }
            case 'keltner': {
              const kc = indicators.keltner;
              if (!kc) return;
              ['upper', 'middle', 'lower'].forEach((band, idx) => {
                const series = mainChart.addSeries(LineSeries, {
                  color: idx === 1 ? '#795548' : '#79554866',
                  lineWidth: 1,
                  lineStyle: idx === 1 ? 0 : 2,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                series.setData(
                  candles.map((c, i) => ({ time: c.time, value: kc[band][i] })).filter(d => d.value !== null)
                );
              });
              break;
            }
            case 'pivot': {
              const pv = indicators.pivot;
              if (!pv) return;
              const pvConfigs = [
                { data: pv.pivot, color: '#607d8b', style: 0 },
                { data: pv.r1, color: '#ef535066', style: 2 },
                { data: pv.s1, color: '#26a69a66', style: 2 },
                { data: pv.r2, color: '#ef535044', style: 3 },
                { data: pv.s2, color: '#26a69a44', style: 3 },
              ];
              pvConfigs.forEach(({ data, color, style }) => {
                const series = mainChart.addSeries(LineSeries, {
                  color,
                  lineWidth: 1,
                  lineStyle: style,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                });
                series.setData(
                  candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
                );
              });
              break;
            }
            default: break;
          }
        });

        // ──────────────────────────────────────────
        //  Custom İndikatörler (Overlay)
        // ──────────────────────────────────────────
        customIndicators.filter(ci => ci.overlay).forEach(ci => {
          try {
            const values = computeCustomIndicator(ci.formula, candles);
            const series = mainChart.addSeries(LineSeries, {
              color: ci.color,
              lineWidth: 1.5,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            series.setData(
              candles.map((c, i) => ({ time: c.time, value: values[i] })).filter(d => d.value !== null)
            );
          } catch (err) {
            console.warn(`Custom indicator error (${ci.name}):`, err.message);
          }
        });

        // ──────────────────────────────────────────
        //  Çizimler (Yatay Çizgiler)
        // ──────────────────────────────────────────
        drawing.drawings.filter(d => d.type === 'hline').forEach(d => {
          addHorizontalLine(candleSeries, d.price, d.color, 0);
        });

        // ──────────────────────────────────────────
        //  AL/SAT Sinyalleri
        // ──────────────────────────────────────────
        const signals = generateSignals(candles, indicators);
        const markers = signals
          .map((signal) => ({
            time: signal.time,
            position: signal.type === 'buy' ? 'belowBar' : 'aboveBar',
            color: signal.type === 'buy' ? '#26a69a' : '#ef5350',
            shape: signal.type === 'buy' ? 'arrowUp' : 'arrowDown',
            text: signal.type === 'buy' ? 'AL' : 'SAT',
          }))
          .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

        createSeriesMarkers(candleSeries, markers);

        // ──────────────────────────────────────────
        //  OSİLATÖR GRAFİKLERİ
        // ──────────────────────────────────────────
        activeOscillators.forEach(oscId => {
          const oscChart = oscCharts[oscId];
          if (!oscChart) return;

          switch (oscId) {
            case 'rsi': {
              const rsiSeries = oscChart.addSeries(LineSeries, {
                color: '#b39ddb', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              rsiSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: indicators.rsi[i] })).filter(d => d.value !== null)
              );
              if (indicators.rsiSma) {
                const rsiSmaSeries = oscChart.addSeries(LineSeries, {
                  color: '#FCE570', lineWidth: 1,
                  priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
                });
                rsiSmaSeries.setData(
                  candles.map((c, i) => ({ time: c.time, value: indicators.rsiSma[i] })).filter(d => d.value !== null)
                );
              }
              addHorizontalLine(rsiSeries, 70, '#ef535066', 2);
              addHorizontalLine(rsiSeries, 30, '#26a69a66', 2);
              break;
            }
            case 'macd': {
              const histData = candles.map((c, i) => {
                const val = indicators.macd.histogram[i];
                if (val === null) return null;
                return { time: c.time, value: val, color: val >= 0 ? '#26a69a80' : '#ef535080' };
              }).filter(Boolean);

              const histSeries = oscChart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
              histSeries.setData(histData);

              const macdLine = oscChart.addSeries(LineSeries, {
                color: '#2196f3', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
              });
              macdLine.setData(
                candles.map((c, i) => ({ time: c.time, value: indicators.macd.macdLine[i] })).filter(d => d.value !== null)
              );

              const signalLine = oscChart.addSeries(LineSeries, {
                color: '#ff9800', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
              });
              signalLine.setData(
                candles.map((c, i) => ({ time: c.time, value: indicators.macd.signalLine[i] })).filter(d => d.value !== null)
              );

              addHorizontalLine(macdLine, 0, '#ffffff20', 2);
              break;
            }
            case 'stochastic': {
              const stoch = indicators.stochastic;
              if (!stoch) return;
              const kSeries = oscChart.addSeries(LineSeries, {
                color: '#00bcd4', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              kSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: stoch.k[i] })).filter(d => d.value !== null)
              );
              const dSeries = oscChart.addSeries(LineSeries, {
                color: '#ff9800', lineWidth: 1,
                priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
              });
              dSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: stoch.d[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(kSeries, 80, '#ef535066', 2);
              addHorizontalLine(kSeries, 20, '#26a69a66', 2);
              break;
            }
            case 'cci': {
              const data = indicators.cci;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#ff9800', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(series, 100, '#ef535066', 2);
              addHorizontalLine(series, -100, '#26a69a66', 2);
              addHorizontalLine(series, 0, '#ffffff20', 2);
              break;
            }
            case 'williamsR': {
              const data = indicators.williamsR;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#e91e63', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(series, -20, '#ef535066', 2);
              addHorizontalLine(series, -80, '#26a69a66', 2);
              break;
            }
            case 'atr': {
              const data = indicators.atr;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#4caf50', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              break;
            }
            case 'adx': {
              const adxData = indicators.adx;
              if (!adxData) return;
              const adxSeries = oscChart.addSeries(LineSeries, {
                color: '#9c27b0', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              adxSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: adxData.adx[i] })).filter(d => d.value !== null)
              );
              const pdiSeries = oscChart.addSeries(LineSeries, {
                color: '#26a69a', lineWidth: 1,
                priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
              });
              pdiSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: adxData.pdi[i] })).filter(d => d.value !== null)
              );
              const mdiSeries = oscChart.addSeries(LineSeries, {
                color: '#ef5350', lineWidth: 1,
                priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
              });
              mdiSeries.setData(
                candles.map((c, i) => ({ time: c.time, value: adxData.mdi[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(adxSeries, 25, '#ffffff20', 2);
              break;
            }
            case 'obv': {
              const data = indicators.obv;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#ff5722', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              break;
            }
            case 'mfi': {
              const data = indicators.mfi;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#3f51b5', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(series, 80, '#ef535066', 2);
              addHorizontalLine(series, 20, '#26a69a66', 2);
              break;
            }
            case 'roc': {
              const data = indicators.roc;
              if (!data) return;
              const series = oscChart.addSeries(LineSeries, {
                color: '#009688', lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
              });
              series.setData(
                candles.map((c, i) => ({ time: c.time, value: data[i] })).filter(d => d.value !== null)
              );
              addHorizontalLine(series, 0, '#ffffff20', 2);
              break;
            }
            default: break;
          }
        });

        // Custom indicators (panel)
        customIndicators.filter(ci => !ci.overlay).forEach(ci => {
          // Would need a dedicated oscillator chart — for now skip
        });

        // Grafikleri sığdır
        mainChart.timeScale().fitContent();

      } catch (err) {
        console.error('Veri yükleme hatası:', err);
        setError(err.message || 'Bilinmeyen bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // ================================================================
    //  Boyutlandırma
    // ================================================================
    const applySize = (chart, container) => {
      if (container && chart) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      applySize(mainChart, mainContainerRef.current);
      Object.entries(oscCharts).forEach(([id, chart]) => {
        applySize(chart, oscillatorContainersRef.current[id]);
      });
    });

    resizeObserver.observe(mainContainerRef.current);
    Object.entries(oscillatorContainersRef.current).forEach(([id, container]) => {
      if (container) resizeObserver.observe(container);
    });

    applySize(mainChart, mainContainerRef.current);
    Object.entries(oscCharts).forEach(([id, chart]) => {
      applySize(chart, oscillatorContainersRef.current[id]);
    });

    // ================================================================
    //  Cleanup
    // ================================================================
    return () => {
      cleanupSync();
      scrollEl?.removeEventListener('wheel', onWheelZoom);
      resizeObserver.disconnect();
      try { mainChart.unsubscribeClick(stableChartClick); } catch { /* noop */ }
      [mainChart, ...Object.values(oscCharts)].forEach((c) => { try { c.remove(); } catch {} });
      mainChartRef.current = null;
      oscillatorChartsRef.current = {};
      candleSeriesRef.current = null;
      drawingLinesRef.current = [];
    };
    // drawing.drawings BİLEREK bağımlılık değil: her çizimde grafiğin
    // yeniden kurulması çizim akışını bozuyordu.
  }, [selectedSymbol, interval, activeMarket, activeIndicators.join(','), customIndicators.length]);

  // Active overlay indicators for legend
  const activeOverlays = activeIndicators.filter(id => INDICATOR_CATALOG[id]?.overlay);

  return (
    <div className="flex-1 bg-wallstreet-dark h-screen flex flex-col overflow-hidden">
      {/* ─── Top Toolbar ────────────────────────── */}
      <div className="h-12 border-b border-wallstreet-border flex items-center justify-between px-4 bg-wallstreet-card shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-white tracking-wider">
            {selectedSymbol}
          </div>

          {/* Interval Seçici */}
          <div className="flex items-center gap-1 ml-2">
            {INTERVALS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleIntervalChange(value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  interval === value
                    ? 'bg-wallstreet-green/20 text-wallstreet-green border border-wallstreet-green/40'
                    : 'text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ayırıcı */}
          <div className="w-px h-5 bg-wallstreet-border" />

          {/* Active Overlay Legend */}
          <div className="flex items-center gap-3 text-xs text-wallstreet-muted overflow-x-auto max-w-xs">
            {activeOverlays.slice(0, 5).map(id => {
              const ind = INDICATOR_CATALOG[id];
              if (!ind) return null;
              return (
                <span key={id} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-[2px] inline-block rounded" style={{ backgroundColor: ind.color }} />
                  {ind.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right Side — Analysis & Indicator Panel */}
        <div className="flex items-center gap-2">
          <TechnicalAnalysisPanel candles={candleData} />
          <IndicatorPanel
            activeIndicators={activeIndicators}
            onToggleIndicator={onToggleIndicator}
            onOpenCustomEditor={onOpenCustomEditor}
          />
        </div>
      </div>

      {/* ─── Charts Container ───────────────────── */}
      {/* Araç çubuğu, ipucu ve katmanlar burada sabit durur; grafikler içeride kayar */}
      <div className="flex-1 w-full relative min-h-0">
        {/* Drawing Toolbar */}
        <DrawingToolbar
          activeTool={drawing.activeTool}
          activeColor={drawing.activeColor}
          onSetTool={handleSetTool}
          onSetColor={drawing.setActiveColor}
          onClearAll={() => { setSelectedDrawingId(null); drawing.clearAll(); }}
          onUndo={() => { setSelectedDrawingId(null); drawing.undo(); }}
          canUndo={drawing.canUndo}
          drawingCount={drawing.drawingCount}
        />

        {/* ── Kaydırılabilir grafik sütunu ─────────────────────────────────
            Ana grafik yer kaldıkça büyür ama MAIN_CHART_MIN_H altına inmez;
            her osilatör OSC_PANEL_H yüksekliğinde sabit kalır. Toplam yükseklik
            ekranı aştığında panel daralmak yerine dikey kaydırma devreye girer. */}
        <div
          ref={scrollContainerRef}
          className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col chart-scroll"
        >
          {/* Ana Grafik + Çizim Katmanı */}
          <div
            className="relative flex-1 shrink-0"
            style={{ minHeight: MAIN_CHART_MIN_H }}
          >
            <div
              ref={mainContainerRef}
              className="absolute inset-0"
              style={{ cursor: drawing.activeTool !== 'none' ? 'crosshair' : 'default' }}
            />
            <DrawingOverlay
              chartRef={mainChartRef}
              seriesRef={candleSeriesRef}
              chartVersion={chartVersion}
              drawings={drawing.drawings}
              pendingDraw={drawing.pendingDraw}
              selectedId={selectedId}
            />
          </div>

          {/* Osilatör Panelleri — Dinamik, sabit yükseklikli */}
          {activeOscillators.map((oscId) => {
            const ind = INDICATOR_CATALOG[oscId];
            return (
              <div
                key={oscId}
                className="border-t border-wallstreet-border shrink-0 relative"
                style={{ height: OSC_PANEL_H }}
              >
                <div className="absolute left-2 top-1 z-10 text-[10px] font-medium" style={{ color: ind?.color }}>
                  {ind?.name}
                </div>
                <div
                  ref={(el) => { oscillatorContainersRef.current[oscId] = el; }}
                  className="w-full h-full"
                />
              </div>
            );
          })}
        </div>

        {/* Çizim durum ipucu — kaydırmadan bağımsız, hep görünür */}
        {(drawing.activeTool !== 'none' || selectedId !== null) && (
          <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-md bg-wallstreet-card/90 backdrop-blur-sm border border-wallstreet-border text-[11px] text-wallstreet-muted pointer-events-none">
            {drawing.pendingDraw
              ? 'İkinci noktayı seçmek için tıklayın · Esc ile iptal'
              : drawing.activeTool === 'hline'
                ? 'Yatay çizgi için grafiğe tıklayın · Esc ile çık'
                : drawing.activeTool === 'trendline'
                  ? 'Trend çizgisi: ilk noktaya tıklayın'
                  : drawing.activeTool === 'rect'
                    ? 'Dikdörtgen: ilk köşeye tıklayın'
                    : drawing.activeTool === 'text'
                      ? 'Metin notu için grafiğe tıklayın'
                      : 'Çizim seçildi · Del ile sil, Esc ile bırak'}
          </div>
        )}

        {/* Yakınlaştırma ipucu — tekerlek artık paneli kaydırıyor */}
        <div className="absolute bottom-2 right-16 z-20 text-[10px] text-wallstreet-muted/60 pointer-events-none select-none">
          Ctrl + tekerlek: yakınlaştır
        </div>

        {/* ─── Loading Overlay ──────────────────── */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-wallstreet-dark/80 backdrop-blur-sm">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-wallstreet-green animate-spin" />
              <div className="absolute inset-0 rounded-full blur-xl bg-wallstreet-green/20 animate-pulse" />
            </div>
            <div className="mt-4 text-sm text-wallstreet-muted">
              {selectedSymbol} verisi yükleniyor...
            </div>
          </div>
        )}

        {/* ─── Error Overlay ────────────────────── */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-wallstreet-dark/80 backdrop-blur-sm">
            <div className="text-wallstreet-red text-lg font-medium">Veri Yüklenemedi</div>
            <div className="mt-2 text-sm text-wallstreet-muted max-w-md text-center">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
