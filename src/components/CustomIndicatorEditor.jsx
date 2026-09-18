import { useState } from 'react';
import { X, Beaker, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { validateFormula, SUPPORTED_FUNCTIONS, SUPPORTED_VARIABLES } from '../services/customIndicatorEngine';

const PRESET_COLORS = [
  '#f7d731', '#ff9800', '#2196f3', '#e91e63', '#4caf50',
  '#ab47bc', '#00bcd4', '#ff5722', '#9c27b0', '#607d8b',
];

export default function CustomIndicatorEditor({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [color, setColor] = useState('#f7d731');
  const [overlay, setOverlay] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const validation = formula.trim() ? validateFormula(formula) : { valid: false, error: null };

  const handleSave = () => {
    if (!name.trim() || !validation.valid) return;
    onSave({
      id: `custom_${Date.now()}`,
      name: name.trim(),
      formula: formula.trim(),
      color,
      overlay,
    });
    setName('');
    setFormula('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-wallstreet-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Beaker className="w-5 h-5 text-wallstreet-green" />
            Özel İndikatör
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(!showHelp)} className="text-wallstreet-muted hover:text-wallstreet-green transition-colors p-1" title="Yardım">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-wallstreet-muted hover:text-wallstreet-red transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Help Panel */}
          {showHelp && (
            <div className="bg-wallstreet-dark rounded-lg p-4 border border-wallstreet-border space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-white mb-1.5">Fonksiyonlar</h4>
                <div className="grid grid-cols-2 gap-1">
                  {SUPPORTED_FUNCTIONS.map(f => (
                    <div key={f.name} className="text-wallstreet-muted">
                      <code className="text-wallstreet-green">{f.syntax}</code>
                      <span className="ml-1">— {f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1.5">Değişkenler</h4>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_VARIABLES.map(v => (
                    <span key={v.name} className="text-wallstreet-muted">
                      <code className="text-[#ff9800]">{v.name}</code> ({v.desc})
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1.5">Örnekler</h4>
                <div className="space-y-1 text-wallstreet-muted">
                  <div><code className="text-white">SMA(close, 20)</code> — 20 periyotluk SMA</div>
                  <div><code className="text-white">EMA(close, 9) - EMA(close, 21)</code> — EMA farkı</div>
                  <div><code className="text-white">SMA(close, 20) + 2 * ATR(14)</code> — Üst bant</div>
                  <div><code className="text-white">(high + low) / 2</code> — Medyan fiyat</div>
                </div>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-wallstreet-muted mb-1.5">İndikatör Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Özel Bollinger Üst"
              className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green transition-colors"
            />
          </div>

          {/* Formula */}
          <div>
            <label className="block text-sm font-medium text-wallstreet-muted mb-1.5">Formül</label>
            <textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="SMA(close, 20) + 2 * ATR(14)"
              rows={3}
              className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green transition-colors font-mono resize-none"
            />
            {/* Validation */}
            {formula.trim() && (
              <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${validation.valid ? 'text-wallstreet-green' : 'text-wallstreet-red'}`}>
                {validation.valid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {validation.valid ? 'Formül geçerli' : validation.error}
              </div>
            )}
          </div>

          {/* Options Row */}
          <div className="flex items-center gap-4">
            {/* Color */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-wallstreet-muted mb-1.5">Renk</label>
              <div className="flex gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-wallstreet-card' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Overlay Toggle */}
            <div>
              <label className="block text-sm font-medium text-wallstreet-muted mb-1.5">Konum</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setOverlay(true)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    overlay ? 'bg-wallstreet-green/15 text-wallstreet-green' : 'bg-wallstreet-dark text-wallstreet-muted'
                  }`}
                >
                  Grafik Üstü
                </button>
                <button
                  onClick={() => setOverlay(false)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    !overlay ? 'bg-wallstreet-green/15 text-wallstreet-green' : 'bg-wallstreet-dark text-wallstreet-muted'
                  }`}
                >
                  Alt Panel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-wallstreet-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-wallstreet-muted hover:text-white transition-colors">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !validation.valid}
            className="px-4 py-2 bg-wallstreet-green/15 text-wallstreet-green rounded-lg text-sm font-medium hover:bg-wallstreet-green/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
