import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

export default function LightboxModal({ isOpen, onClose, imageSrc, title, subtitle }) {
  const [scale, setScale] = useState(1);

  if (!isOpen || !imageSrc) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with info and controls */}
        <div className="w-full flex items-center justify-between text-white/90 bg-black/60 backdrop-blur px-4 py-2 rounded-t-lg border-b border-white/10">
          <div>
            <h3 className="font-serif text-sm font-semibold tracking-wide text-white">{title || 'Chi tiết tác phẩm'}</h3>
            {subtitle && <p className="text-[11px] text-white/60">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/15 rounded text-white/80 hover:text-white transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/15 rounded text-white/80 hover:text-white transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-white/15 rounded text-white/80 hover:text-white transition-colors"
              title="Kích thước gốc (100%)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-white/50 px-1">{Math.round(scale * 100)}%</span>
            <button
              onClick={onClose}
              className="ml-2 p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="w-full bg-[#121110] flex items-center justify-center p-4 overflow-auto max-h-[80vh] rounded-b-lg border border-t-0 border-white/10">
          <img
            src={imageSrc}
            alt={title}
            style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
            className="max-h-[74vh] max-w-full object-contain rounded shadow-2xl cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>
    </div>
  );
}
