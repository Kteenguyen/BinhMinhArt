import React from 'react';
import { X, RotateCcw, Check, MoveUp, MoveDown, Eye } from 'lucide-react';

export default function ColumnManagerModal({
  isOpen,
  onClose,
  columns = [],
  subTabTitle = '',
  onToggleVisibility,
  onReorderColumns,
  onResetColumns
}) {
  const normalizedColumns = React.useMemo(() => {
    const list = Array.isArray(columns) ? columns : [];
    const nonActions = list.filter(c => c.id !== 'actions');
    const actionCol = list.find(c => c.id === 'actions');
    return actionCol ? [...nonActions, actionCol] : nonActions;
  }, [columns]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const moveColumn = (index, direction) => {
    const nonActions = normalizedColumns.filter(c => c.id !== 'actions');
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= nonActions.length) return;
    const reordered = [...nonActions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    const actionCol = normalizedColumns.find(c => c.id === 'actions');
    onReorderColumns(actionCol ? [...reordered, actionCol] : reordered);
  };

  const nonActionCount = normalizedColumns.filter(c => c.id !== 'actions').length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#EAE5D9] rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE5D9] bg-[#FAF8F5]">
          <div>
            <h3 className="font-serif text-sm font-semibold text-stone-900">
              Tùy Biến Cột Bảng Tính Excel {subTabTitle ? `(${subTabTitle})` : ''}
            </h3>
            <p className="text-[11px] text-stone-500">
              Bật/tắt hiển thị hoặc sắp xếp thứ tự các cột theo nhu cầu
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            data-testid="column-manager__close--btn"
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1.5 divide-y divide-stone-100">
          {normalizedColumns.map((col, idx) => {
            const isActions = col.id === 'actions';

            return (
              <div 
                key={col.id} 
                className="flex items-center justify-between py-1.5 px-2 hover:bg-[#FAF8F5] rounded transition-colors"
              >
                <label className={`flex items-center gap-2 ${isActions ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} flex-1 select-none`}>
                  <input
                    type="checkbox"
                    checked={col.visible !== false}
                    disabled={isActions}
                    onChange={() => onToggleVisibility(col.id)}
                    data-testid={`column-manager__checkbox--${col.id}`}
                    className="rounded border-stone-300 text-stone-800 focus:ring-0 focus:outline-none w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-stone-800">{col.label}</span>
                      {isActions && (
                        <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Cố định
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 block">{col.description}</span>
                  </div>
                </label>

                {/* Move up / down buttons */}
                {!isActions ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, -1)}
                      disabled={idx === 0}
                      data-testid={`column-manager__move-up--btn-${col.id}`}
                      aria-label={`Di chuyển cột ${col.label} lên`}
                      className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20 rounded cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, 1)}
                      disabled={idx >= nonActionCount - 1}
                      data-testid={`column-manager__move-down--btn-${col.id}`}
                      aria-label={`Di chuyển cột ${col.label} xuống`}
                      className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20 rounded cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#EAE5D9] bg-[#FAF8F5]">
          <button
            onClick={onResetColumns}
            data-testid="column-manager__reset--btn"
            className="h-[32px] px-2.5 text-[11px] font-medium text-stone-600 hover:text-stone-900 border border-[#EAE5D9] bg-white rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định ban đầu</span>
          </button>

          <button
            onClick={onClose}
            data-testid="column-manager__apply--btn"
            className="h-[32px] px-4 text-[11.5px] font-semibold text-white bg-[#252016] hover:bg-stone-800 rounded-md transition-colors shadow-sm cursor-pointer"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
}
