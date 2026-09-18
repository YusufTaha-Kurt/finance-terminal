// ============================================================================
//  useDrawing.js — Grafik Çizim Araçları State Yönetimi
//  Yatay çizgi, trend çizgisi, dikdörtgen, metin notu
// ============================================================================

import { useState, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'ft_drawings_';

/**
 * Çizim türleri
 */
export const DRAWING_TOOLS = {
  none: { label: 'Seçim', icon: '🖱️', cursor: 'default' },
  hline: { label: 'Yatay Çizgi', icon: '📏', cursor: 'crosshair' },
  trendline: { label: 'Trend Çizgisi', icon: '📐', cursor: 'crosshair' },
  rect: { label: 'Dikdörtgen', icon: '▬', cursor: 'crosshair' },
  text: { label: 'Metin', icon: '🔤', cursor: 'text' },
};

/**
 * Varsayılan çizim renkleri
 */
const DEFAULT_COLORS = [
  '#ef5350', '#26a69a', '#2196f3', '#ff9800', '#ab47bc',
  '#f7d731', '#e91e63', '#00bcd4', '#4caf50', '#ff5722',
];

/**
 * Çizim state yönetimi hook'u.
 * Sembol bazlı çizimleri localStorage'da saklar.
 */
export function useDrawing(symbol) {
  const [activeTool, setActiveTool] = useState('none');
  const [activeColor, setActiveColor] = useState('#ef5350');
  const [drawings, setDrawings] = useState(() => loadDrawings(symbol));
  const [undoStack, setUndoStack] = useState([]);
  const [pendingDraw, setPendingDraw] = useState(null); // Çizim sırasında geçici veri
  const nextIdRef = useRef(Date.now());

  /**
   * Çizimleri localStorage'dan yükle
   */
  function loadDrawings(sym) {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + sym);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  /**
   * Çizimleri localStorage'a kaydet
   */
  const saveDrawings = useCallback((newDrawings, sym) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + (sym || symbol), JSON.stringify(newDrawings));
    } catch (e) {
      console.warn('Çizimler kaydedilemedi:', e);
    }
  }, [symbol]);

  /**
   * Sembol değiştiğinde çizimleri yeniden yükle
   */
  const switchSymbol = useCallback((newSymbol) => {
    const loaded = loadDrawings(newSymbol);
    setDrawings(loaded);
    setUndoStack([]);
    setPendingDraw(null);
  }, []);

  /**
   * Yeni çizim ekle
   */
  const addDrawing = useCallback((drawing) => {
    const newDrawing = {
      ...drawing,
      id: nextIdRef.current++,
      color: activeColor,
      timestamp: Date.now(),
    };

    setDrawings((prev) => {
      const next = [...prev, newDrawing];
      saveDrawings(next);
      return next;
    });
    setUndoStack((prev) => [...prev, { action: 'add', drawing: newDrawing }]);
  }, [activeColor, saveDrawings]);

  /**
   * Yatay çizgi ekle (doğrudan fiyat seviyesiyle)
   */
  const addHorizontalLine = useCallback((price, label = '') => {
    addDrawing({
      type: 'hline',
      price,
      label,
    });
  }, [addDrawing]);

  /**
   * Trend çizgisi ekle (iki nokta)
   */
  const addTrendLine = useCallback((point1, point2) => {
    addDrawing({
      type: 'trendline',
      point1, // { time, price }
      point2, // { time, price }
    });
  }, [addDrawing]);

  /**
   * Dikdörtgen ekle
   */
  const addRectangle = useCallback((topLeft, bottomRight) => {
    addDrawing({
      type: 'rect',
      topLeft, // { time, price }
      bottomRight, // { time, price }
    });
  }, [addDrawing]);

  /**
   * Metin notu ekle
   */
  const addTextNote = useCallback((position, text) => {
    addDrawing({
      type: 'text',
      position, // { time, price }
      text,
    });
  }, [addDrawing]);

  /**
   * Çizim sil
   */
  const removeDrawing = useCallback((id) => {
    setDrawings((prev) => {
      const removed = prev.find((d) => d.id === id);
      if (removed) {
        setUndoStack((stack) => [...stack, { action: 'remove', drawing: removed }]);
      }
      const next = prev.filter((d) => d.id !== id);
      saveDrawings(next);
      return next;
    });
  }, [saveDrawings]);

  /**
   * Tüm çizimleri sil
   */
  const clearAll = useCallback(() => {
    setUndoStack((prev) => [...prev, { action: 'clearAll', drawings: [...drawings] }]);
    setDrawings([]);
    saveDrawings([]);
  }, [drawings, saveDrawings]);

  /**
   * Son işlemi geri al
   */
  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const lastAction = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);

      if (lastAction.action === 'add') {
        setDrawings((prev) => {
          const next = prev.filter((d) => d.id !== lastAction.drawing.id);
          saveDrawings(next);
          return next;
        });
      } else if (lastAction.action === 'remove') {
        setDrawings((prev) => {
          const next = [...prev, lastAction.drawing];
          saveDrawings(next);
          return next;
        });
      } else if (lastAction.action === 'clearAll') {
        setDrawings(lastAction.drawings);
        saveDrawings(lastAction.drawings);
      }

      return newStack;
    });
  }, [saveDrawings]);

  return {
    // State
    activeTool,
    activeColor,
    drawings,
    pendingDraw,
    canUndo: undoStack.length > 0,
    drawingCount: drawings.length,

    // Actions
    setActiveTool,
    setActiveColor,
    setPendingDraw,
    addDrawing,
    addHorizontalLine,
    addTrendLine,
    addRectangle,
    addTextNote,
    removeDrawing,
    clearAll,
    undo,
    switchSymbol,

    // Constants
    DRAWING_TOOLS,
    DEFAULT_COLORS,
  };
}

export default useDrawing;
