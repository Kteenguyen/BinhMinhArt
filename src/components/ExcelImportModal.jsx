import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatUSD } from '../types';

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess
}) {
  const [file, setFile] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { summary, items }
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const runPreview = async (selectedFile) => {
    setIsPreviewing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/import-excel/preview', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        setError(data.message || 'Không thể đọc dữ liệu từ file Excel');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ khi kiểm tra file Excel');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.xlsx') && !selected.name.endsWith('.xls')) {
        setError('Vui lòng chọn file định dạng Excel (.xlsx hoặc .xls)');
        return;
      }
      setFile(selected);
      setPreviewData(null);
      setError(null);
      runPreview(selected);
    }
  };

  const handleSetAllDuplicatesResolution = (resolution) => {
    if (!previewData) return;
    setPreviewData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.is_duplicate ? { ...item, duplicate_resolution: resolution } : item
      )
    }));
  };

  const handleSetItemDuplicateResolution = (index, resolution) => {
    if (!previewData) return;
    setPreviewData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === index ? { ...item, duplicate_resolution: resolution } : item
      )
    }));
  };

  const handleUpload = async () => {
    if (!previewData || !previewData.items) return;
    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: previewData.items })
      });
      const data = await res.json();
      if (data.success) {
        onImportSuccess(data.message);
        onClose();
      } else {
        setError(data.message || 'Lỗi khi nhập file Excel');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsUploading(false);
    }
  };

  const duplicateItems = (previewData?.items || []).filter(i => i.is_duplicate);
  const newItemsCount = (previewData?.items || []).filter(i => !i.is_duplicate).length;
  const keepOriginalCount = duplicateItems.filter(
    i => i.duplicate_resolution === 'keep_original'
  ).length;
  const overwriteCount = duplicateItems.filter(
    i => i.duplicate_resolution !== 'keep_original'
  ).length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className={`bg-white border border-[#EAE5D9] shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${
          previewData ? 'max-w-4xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE5D9] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h3 className="font-serif text-sm font-semibold text-stone-900">
              Nhập Kho Dữ Liệu Từ File Excel (.xlsx)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-[11.5px] text-stone-600 leading-relaxed">
            Hệ thống tự động kiểm tra trùng lặp với Kho Tranh hiện có. Với các tác phẩm trùng lặp, bạn có quyền chọn{' '}
            <strong>Giữ bản gốc</strong> hoặc <strong>Thay thế (ghi đè & cập nhật Ngày cập nhật SP)</strong>.
          </p>

          {/* Upload Area */}
          <label className="border-2 border-dashed border-[#DDD5C4] hover:border-emerald-500 p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#FAF8F5]">
            <Upload className="w-6 h-6 text-stone-400 mb-1.5" />
            <span className="text-[12px] font-semibold text-stone-700">
              {file ? `📄 ${file.name}` : 'Nhấp để chọn file Excel (.xlsx)'}
            </span>
            <span className="text-[10.5px] text-stone-400 mt-0.5">
              {isPreviewing
                ? 'Đang kiểm tra dữ liệu và đối chiếu trùng lặp...'
                : 'Hỗ trợ định dạng .xlsx, tự động cảnh báo khi phát hiện mã trùng'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[11.5px] border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewData && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF8F5] px-3 py-2 border border-[#EAE5D9]">
                <div className="flex items-center gap-2 text-[12px] font-bold text-stone-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Tổng số dòng đọc được: {previewData.items.length} tác phẩm</span>
                </div>
                <div className="text-[11.5px] text-stone-700">
                  Mới hoàn toàn: <strong className="text-emerald-700">{newItemsCount}</strong> •
                  Trùng lặp: <strong className="text-amber-700">{duplicateItems.length}</strong>
                </div>
              </div>

              {duplicateItems.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-400 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[12px]">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Cảnh Báo: Có {duplicateItems.length} tác phẩm trùng với dữ liệu đang có trong kho!
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900">
                      Chọn <strong>Giữ bản gốc</strong> (không ghi đè) hoặc <strong>Thay thế</strong> (ghi đè & cập nhật Ngày cập nhật SP = hôm nay DD-MM-YYYY).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetAllDuplicatesResolution('keep_original')}
                      className={`h-[32px] px-2.5 text-[11px] font-bold border cursor-pointer ${
                        keepOriginalCount === duplicateItems.length
                          ? 'bg-stone-800 text-white border-stone-900'
                          : 'bg-white text-stone-800 border-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      Giữ Bản Gốc Tất Cả ({keepOriginalCount}/{duplicateItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllDuplicatesResolution('overwrite')}
                      className={`h-[32px] px-2.5 text-[11px] font-bold border cursor-pointer ${
                        overwriteCount === duplicateItems.length
                          ? 'bg-[#7D1818] text-white border-[#7D1818]'
                          : 'bg-white text-[#7D1818] border-[#7D1818] hover:bg-red-50'
                      }`}
                    >
                      Thay Thế & Cập Nhật Ngày Tất Cả ({overwriteCount}/{duplicateItems.length})
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-[260px] overflow-y-auto border border-[#EAE5D9]">
                <table className="w-full text-left border-collapse text-[11.5px]">
                  <thead className="bg-[#F5F2EB] sticky top-0 z-10 border-b border-[#DFCBAA] text-[10.5px] uppercase text-stone-700">
                    <tr>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">Mã Tranh</th>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">Tên Tác Phẩm</th>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">Họa Sĩ</th>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">KT Tranh</th>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">KT Khung</th>
                      <th className="py-1.5 px-2 border-r border-[#EAE5D9]">Giá ($ USD)</th>
                      <th className="py-1.5 px-2">Trạng Thái / Xử Lý Trùng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE5D9]">
                    {previewData.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={
                          item.is_duplicate
                            ? item.duplicate_resolution === 'keep_original'
                              ? 'bg-stone-100/70 opacity-75'
                              : 'bg-amber-50/50'
                            : 'hover:bg-[#FAF8F5]'
                        }
                      >
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono font-bold text-[#7D1818]">
                          {item.id}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-serif font-bold text-stone-900">
                          {item.ten_tac_pham}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">{item.tac_gia}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono">{item.kich_thuoc_tranh || '—'}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono">{item.kich_thuoc_khung_tranh || '—'}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono font-bold">
                          {formatUSD(item.gia)}
                        </td>
                        <td className="py-1.5 px-2">
                          {item.is_duplicate ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 font-bold text-[10px]">
                                Trùng ({item.existing_snapshot?.id || item.id})
                              </span>
                              <div className="inline-flex border border-stone-300 bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleSetItemDuplicateResolution(idx, 'keep_original')}
                                  className={`px-2 py-0.5 text-[10.5px] font-bold cursor-pointer ${
                                    item.duplicate_resolution === 'keep_original'
                                      ? 'bg-stone-800 text-white'
                                      : 'text-stone-600 hover:bg-stone-100'
                                  }`}
                                >
                                  Giữ bản gốc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetItemDuplicateResolution(idx, 'overwrite')}
                                  className={`px-2 py-0.5 text-[10.5px] font-bold cursor-pointer ${
                                    item.duplicate_resolution !== 'keep_original'
                                      ? 'bg-[#7D1818] text-white'
                                      : 'text-[#7D1818] hover:bg-red-50'
                                  }`}
                                >
                                  Thay thế & Cập nhật ngày
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                              + Mới hoàn toàn
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-3.5 text-[11.5px] font-medium text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9]"
            >
              Hủy
            </button>
            <button
              onClick={handleUpload}
              disabled={!previewData || isUploading || isPreviewing}
              className="h-[34px] px-4 text-[11.5px] font-semibold text-white bg-emerald-800 hover:bg-emerald-900 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isUploading
                  ? 'Đang đồng bộ...'
                  : previewData
                  ? `Xác Nhận Nhập (${newItemsCount} mới, ${overwriteCount} thay thế, ${keepOriginalCount} giữ gốc)`
                  : 'Bắt Đầu Nhập'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
