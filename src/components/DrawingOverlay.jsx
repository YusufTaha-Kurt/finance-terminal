// ============================================================================
//  DrawingOverlay.jsx — Grafik üzerine çizim katmanı (canvas)
//  Trend çizgisi, dikdörtgen, metin notu ve seçim vurgusunu çizer.
//  pointer-events:none — tıklama/pan/zoom lightweight-charts'ta kalır.
// ============================================================================

import { useEffect, useRef } from 'react';
import { pointToX, priceToY, getPaneSize, hexToRgba } from '../utils/drawingGeometry';

const HANDLE_R = 3.5;

export default function DrawingOverlay({
  chartRef,
  seriesRef,
  chartVersion,
  drawings = [],
  pendingDraw,
  selectedId,
}) {
  const canvasRef = useRef(null);
  const mouseRef = useRef(null);

  // Her render'dan sonra güncel state'i ref'e yaz — rAF döngüsü buradan okur.
  const stateRef = useRef({ drawings, pendingDraw, selectedId });
  useEffect(() => {
    stateRef.current = { drawings, pendingDraw, selectedId };
  }, [drawings, pendingDraw, selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const chart = chartRef?.current;
    if (!canvas || !chart) return;

    const onCrosshairMove = (param) => {
      mouseRef.current = param?.point ? { x: param.point.x, y: param.point.y } : null;
    };
    try { chart.subscribeCrosshairMove(onCrosshairMove); } catch { /* noop */ }

    let raf = 0;
    let lastSig = null;

    const paint = () => {
      const series = seriesRef?.current;
      const el = canvas.parentElement;
      if (!el) return;

      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!series) return;

      const { drawings: items, pendingDraw: pending, selectedId: selId } = stateRef.current;
      const pane = getPaneSize(chart, el);
      const paneW = pane.width || w;
      const paneH = pane.height || h;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, paneW, paneH);
      ctx.clip();

      items.forEach((d) => {
        const isSel = d.id === selId;
        const color = d.color || '#ef5350';

        if (d.type === 'trendline') {
          const x1 = pointToX(chart, d.point1);
          const y1 = priceToY(series, d.point1 && d.point1.price);
          const x2 = pointToX(chart, d.point2);
          const y2 = priceToY(series, d.point2 && d.point2.price);
          if ([x1, y1, x2, y2].some((v) => v === null)) return;

          ctx.strokeStyle = color;
          ctx.lineWidth = isSel ? 3 : 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          if (isSel) {
            drawHandle(ctx, x1, y1, color);
            drawHandle(ctx, x2, y2, color);
          }
        } else if (d.type === 'rect') {
          const x1 = pointToX(chart, d.topLeft);
          const y1 = priceToY(series, d.topLeft && d.topLeft.price);
          const x2 = pointToX(chart, d.bottomRight);
          const y2 = priceToY(series, d.bottomRight && d.bottomRight.price);
          if ([x1, y1, x2, y2].some((v) => v === null)) return;

          const left = Math.min(x1, x2);
          const top = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1);
          const rh = Math.abs(y2 - y1);

          ctx.fillStyle = hexToRgba(color, 0.12);
          ctx.fillRect(left, top, rw, rh);
          ctx.strokeStyle = color;
          ctx.lineWidth = isSel ? 2.5 : 1.5;
          ctx.setLineDash([]);
          ctx.strokeRect(left, top, rw, rh);

          if (isSel) {
            drawHandle(ctx, x1, y1, color);
            drawHandle(ctx, x2, y2, color);
          }
        } else if (d.type === 'text') {
          const tx = pointToX(chart, d.position);
          const ty = priceToY(series, d.position && d.position.price);
          if (tx === null || ty === null) return;
          drawLabel(ctx, tx, ty, d.text || '', color, isSel);
        } else if (d.type === 'hline' && isSel) {
          // Yatay çizgi native price line ile çiziliyor; burada sadece seçim vurgusu
          const ly = priceToY(series, d.price);
          if (ly === null) return;
          ctx.strokeStyle = hexToRgba(color, 0.9);
          ctx.lineWidth = 4;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(paneW, ly);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // ── Devam eden çizim önizlemesi ────────────────────────────
      const mouse = mouseRef.current;
      if (pending && mouse) {
        const anchor = pending.point1 || pending.topLeft;
        const ax = pointToX(chart, anchor);
        const ay = priceToY(series, anchor && anchor.price);
        if (ax !== null && ay !== null) {
          const color = pending.color || '#2196f3';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);

          if (pending.type === 'trendline') {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          } else if (pending.type === 'rect') {
            ctx.strokeRect(
              Math.min(ax, mouse.x),
              Math.min(ay, mouse.y),
              Math.abs(mouse.x - ax),
              Math.abs(mouse.y - ay),
            );
          }
          ctx.setLineDash([]);
          drawHandle(ctx, ax, ay, color);
        }
      }

      ctx.restore();
    };

    const frame = () => {
      const series = seriesRef?.current;
      const el = canvas.parentElement;
      let sig = 'empty';

      if (series && el) {
        let from = 0;
        let to = 0;
        try {
          const r = chart.timeScale().getVisibleLogicalRange();
          if (r) { from = r.from; to = r.to; }
        } catch { /* noop */ }

        // Fiyat ekseni dönüşümünü de imzaya kat (dikey sürükleme/zoom)
        let p0 = 0;
        let p1 = 0;
        try {
          p0 = series.coordinateToPrice(0) || 0;
          p1 = series.coordinateToPrice(100) || 0;
        } catch { /* noop */ }

        const { drawings: items, pendingDraw: pending, selectedId: selId } = stateRef.current;
        const m = mouseRef.current;
        sig = [
          from, to, p0, p1,
          el.clientWidth, el.clientHeight,
          items.length,
          items.length ? items[items.length - 1].id : 0,
          selId === null || selId === undefined ? '-' : selId,
          pending ? pending.type + ':' + (m ? Math.round(m.x) + ',' + Math.round(m.y) : 'n') : '-',
        ].join('|');
      }

      if (sig !== lastSig) {
        lastSig = sig;
        try { paint(); } catch { /* render hatası döngüyü kırmasın */ }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      try { chart.unsubscribeCrosshairMove(onCrosshairMove); } catch { /* noop */ }
    };
  }, [chartVersion, chartRef, seriesRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
}

function drawHandle(ctx, x, y, color) {
  ctx.setLineDash([]);
  ctx.fillStyle = '#131313';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawLabel(ctx, x, y, text, color, isSel) {
  ctx.setLineDash([]);
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 10;
  const h = 18;

  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.fillRect(x, y - h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = isSel ? 2 : 1;
  ctx.strokeRect(x, y - h / 2, w, h);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(text, x + 5, y + 0.5);
}
