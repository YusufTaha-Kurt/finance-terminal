import { Minus, TrendingUp, Square, Type, Trash2, Undo2 } from 'lucide-react';
import { DRAWING_TOOLS } from '../hooks/useDrawing';

const TOOL_ICONS = {
  none: null,
  hline: Minus,
  trendline: TrendingUp,
  rect: Square,
  text: Type,
};

const DEFAULT_COLORS = [
  '#ef5350', '#26a69a', '#2196f3', '#ff9800', '#ab47bc',
  '#f7d731', '#e91e63', '#00bcd4', '#4caf50', '#ff5722',
];

export default function DrawingToolbar({
  activeTool,
  activeColor,
  onSetTool,
  onSetColor,
  onClearAll,
  onUndo,
  canUndo,
  drawingCount,
}) {
  return (
    <div className="absolute left-2 top-14 z-30 flex flex-col gap-1 bg-wallstreet-card/90 backdrop-blur-sm border border-wallstreet-border rounded-lg p-1.5 shadow-xl">
      {/* Drawing Tools */}
      {Object.entries(DRAWING_TOOLS).map(([toolId, tool]) => {
        if (toolId === 'none') return null;
        const Icon = TOOL_ICONS[toolId];
        if (!Icon) return null;

        const isActive = activeTool === toolId;
        return (
          <button
            key={toolId}
            onClick={() => onSetTool(isActive ? 'none' : toolId)}
            title={tool.label}
            className={`p-2 rounded-md transition-all ${
              isActive
                ? 'bg-wallstreet-green/20 text-wallstreet-green border border-wallstreet-green/40'
                : 'text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-full h-px bg-wallstreet-border my-0.5" />

      {/* Color Picker */}
      <div className="flex flex-col gap-1 py-1">
        {DEFAULT_COLORS.slice(0, 5).map((color) => (
          <button
            key={color}
            onClick={() => onSetColor(color)}
            className={`w-7 h-3 rounded-sm transition-all mx-auto ${
              activeColor === color ? 'ring-1 ring-white ring-offset-1 ring-offset-wallstreet-card' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-wallstreet-border my-0.5" />

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Geri Al"
        className="p-2 rounded-md text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      {/* Clear All */}
      <button
        onClick={onClearAll}
        disabled={drawingCount === 0}
        title="Tümünü Sil"
        className="p-2 rounded-md text-wallstreet-muted hover:text-wallstreet-red hover:bg-wallstreet-red/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
