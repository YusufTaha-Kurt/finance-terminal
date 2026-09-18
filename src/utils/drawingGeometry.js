// ============================================================================
//  drawingGeometry.js — Çizim koordinat dönüşümleri ve hit-test yardımcıları
//  ChartArea (tıklama/seçim) ve DrawingOverlay (canvas render) ortak kullanır.
// ============================================================================

/**
 * Bir çizim noktasını ({ time, logical }) ekran X koordinatına çevirir.
 * Önce gerçek zaman kullanılır; veri dışı (boşluk) alanlarda logical index'e düşer.
 */
export function pointToX(chart, pt) {
  if (!chart || !pt) return null;
  let ts;
  try { ts = chart.timeScale(); } catch { return null; }

  if (pt.time !== null && pt.time !== undefined) {
    const x = ts.timeToCoordinate(pt.time);
    if (x !== null && x !== undefined && !isNaN(x)) return x;
  }
  if (pt.logical !== null && pt.logical !== undefined) {
    const x = ts.logicalToCoordinate(pt.logical);
    if (x !== null && x !== undefined && !isNaN(x)) return x;
  }
  return null;
}

/**
 * Fiyatı ekran Y koordinatına çevirir.
 */
export function priceToY(series, price) {
  if (!series || price === null || price === undefined) return null;
  try {
    const y = series.priceToCoordinate(price);
    return y === null || y === undefined || isNaN(y) ? null : y;
  } catch {
    return null;
  }
}

/**
 * Ana panelin (fiyat ekseni ve zaman ekseni hariç) ölçüsü.
 */
export function getPaneSize(chart, el) {
  try {
    const s = chart.paneSize(0);
    if (s && s.width > 0 && s.height > 0) return { width: s.width, height: s.height };
  } catch { /* eski sürüm — fallback */ }
  return { width: el?.clientWidth || 0, height: el?.clientHeight || 0 };
}

/**
 * #rrggbb → rgba(...)
 */
export function hexToRgba(hex, alpha) {
  if (typeof hex !== 'string') return `rgba(239, 83, 80, ${alpha})`;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const num = parseInt(full, 16);
  if (isNaN(num)) return `rgba(239, 83, 80, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

/**
 * Fiyatı büyüklüğüne göre makul basamağa yuvarlar (kripto için hassasiyet korunur).
 */
export function roundPrice(p) {
  const abs = Math.abs(p);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 5 : 8;
  return parseFloat(p.toFixed(digits));
}

/**
 * Bir noktanın doğru parçasına uzaklığı.
 */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Ekran koordinatının bir çizime denk gelip gelmediğini test eder.
 */
export function hitTestDrawing(chart, series, d, x, y, tol = 7) {
  if (!d) return false;

  if (d.type === 'hline') {
    const ly = priceToY(series, d.price);
    return ly !== null && Math.abs(ly - y) <= tol;
  }

  if (d.type === 'trendline') {
    const x1 = pointToX(chart, d.point1);
    const y1 = priceToY(series, d.point1?.price);
    const x2 = pointToX(chart, d.point2);
    const y2 = priceToY(series, d.point2?.price);
    if ([x1, y1, x2, y2].some((v) => v === null)) return false;
    return distanceToSegment(x, y, x1, y1, x2, y2) <= tol;
  }

  if (d.type === 'rect') {
    const x1 = pointToX(chart, d.topLeft);
    const y1 = priceToY(series, d.topLeft?.price);
    const x2 = pointToX(chart, d.bottomRight);
    const y2 = priceToY(series, d.bottomRight?.price);
    if ([x1, y1, x2, y2].some((v) => v === null)) return false;
    const left = Math.min(x1, x2), right = Math.max(x1, x2);
    const top = Math.min(y1, y2), bottom = Math.max(y1, y2);
    return x >= left - tol && x <= right + tol && y >= top - tol && y <= bottom + tol;
  }

  if (d.type === 'text') {
    const tx = pointToX(chart, d.position);
    const ty = priceToY(series, d.position?.price);
    if (tx === null || ty === null) return false;
    const w = 8 + (d.text?.length || 0) * 7;
    return x >= tx - 4 && x <= tx + w && y >= ty - 14 && y <= ty + 6;
  }

  return false;
}
