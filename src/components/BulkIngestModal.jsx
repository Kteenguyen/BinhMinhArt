import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
  Layers,
  UserCheck
} from 'lucide-react';
import { formatUSD } from '../types';

function recomputeSkusForArtist(items, newArtistName) {
  const cleanArtist = (newArtistName || '').trim();

  const counters = {};
  return items.map(item => {
    const effectiveArtist = cleanArtist || item.tac_gia || 'Bình Minh Art';
    const aInit =
      effectiveArtist
        .split(/\s+/)
        .map(w => (w[0] ? w[0].toUpperCase() : ''))
        .join('')
        .replace(/Đ/g, 'D') || 'BMA';

    const mLow = (item.chat_lieu || '').toLowerCase();
    let mInit = 'SM';
    if (mLow.includes('dầu')) mInit = 'SD';
    else if (mLow.includes('mài')) mInit = 'SM';
    else if (mLow.includes('lụa')) mInit = 'LU';
    else if (mLow.includes('nước')) mInit = 'MN';

    const prefix = `${aInit}-${mInit}`;
    counters[prefix] = (counters[prefix] || 0) + 1;
    const newId = `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;

    return {
      ...item,
      id: newId,
      tac_gia: effectiveArtist
    };
  });
}

export default function BulkIngestModal({ isOpen, onClose, onIngestSuccess }) {
  const [wordFiles, setWordFiles] = useState([]);
  const [folderImages, setFolderImages] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null); // { summary, items }
  const [overrideArtist, setOverrideArtist] = useState('');
  const [overridePeriod, setOverridePeriod] = useState('01/2026');
  const [commitMode, setCommitMode] = useState('merge'); // 'merge' | 'replace'

  const wordInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const looseImagesInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSelectWordFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.name.toLowerCase().endsWith('.docx'));
    if (valid.length === 0 && selected.length > 0) {
      setError('Vui lòng chọn file Word định dạng .docx (VD: BẢNG GIÁ.docx)');
      return;
    }
    setWordFiles(prev => [...prev, ...valid]);
    setPreviewData(null);
    setError(null);
    e.target.value = '';
  };

  const handleSelectFolder = (e) => {
    const selected = Array.from(e.target.files || []);
    const validImages = [];

    for (const file of selected) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['jpg', 'jpeg', 'png', 'webp', 'jfif'].includes(ext)) continue;
      const relPath = file.webkitRelativePath || file.name;
      const folderName = relPath.includes('/') ? relPath.split('/')[0] : 'Ảnh rời đính kèm';
      validImages.push({
        file,
        relativePath: relPath,
        folderName
      });
    }

    if (validImages.length > 0) {
      setFolderImages(prev => [...prev, ...validImages]);
      setPreviewData(null);
      setError(null);
    }
    e.target.value = '';
  };

  const handleRemoveFolderGroup = (folderName) => {
    setFolderImages(prev => prev.filter(item => item.folderName !== folderName));
    setPreviewData(null);
  };

  const handleRemoveWordFile = (idx) => {
    setWordFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviewData(null);
  };

  const groupedFolders = folderImages.reduce((acc, item) => {
    acc[item.folderName] = (acc[item.folderName] || 0) + 1;
    return acc;
  }, {});

  // Apply artist name override to all preview items + regenerate SKUs
  const handleArtistOverrideChange = (newArtist) => {
    setOverrideArtist(newArtist);
    if (!previewData) return;
    const updatedItems = recomputeSkusForArtist(previewData.items, newArtist);
    setPreviewData(prev => ({
      ...prev,
      summary: {
        ...prev.summary,
        detectedArtist: newArtist
      },
      items: updatedItems
    }));
  };

  // Toggle duplicate resolution for all duplicate items ('keep_original' | 'overwrite')
  const handleSetAllDuplicatesResolution = (resolution) => {
    if (!previewData) return;
    setPreviewData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.is_duplicate ? { ...item, duplicate_resolution: resolution } : item
      )
    }));
  };

  // Toggle duplicate resolution for a single item
  const handleSetItemDuplicateResolution = (index, resolution) => {
    if (!previewData) return;
    setPreviewData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === index ? { ...item, duplicate_resolution: resolution } : item
      )
    }));
  };

  const duplicateItems = (previewData?.items || []).filter(i => i.is_duplicate);
  const newItemsCount = (previewData?.items || []).filter(i => !i.is_duplicate).length;
  const keepOriginalCount = duplicateItems.filter(
    i => i.duplicate_resolution === 'keep_original'
  ).length;
  const overwriteCount = duplicateItems.filter(
    i => i.duplicate_resolution !== 'keep_original'
  ).length;

  // Run Parser Preview from uploaded Word + Folder files
  const handleRunParsePreview = async () => {
    if (wordFiles.length === 0 && folderImages.length === 0) {
      setError('Hãy chọn ít nhất 1 file Word (.docx) hoặc 1 Folder hình ảnh.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      wordFiles.forEach(wf => formData.append('wordFile', wf));

      const relPaths = [];
      folderImages.forEach(item => {
        formData.append('folderImages', item.file);
        relPaths.push(item.relativePath);
      });
      formData.append('relativePaths', JSON.stringify(relPaths));

      const res = await fetch('/api/bulk-ingest/preview', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
        setOverrideArtist(data.summary?.detectedArtist || '');
        setOverridePeriod(data.summary?.detectedPeriod || '01/2026');
      } else {
        setError(data.message || 'Không thể phân tách dữ liệu');
      }
    } catch (err) {
      setError('Lỗi kết nối khi phân tách dữ liệu: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Run Sample Test (BẢNG GIÁ.docx + TRANH/ + ĐÃ BÁN/)
  const handleRunSamplePreview = async () => {
    setIsParsing(true);
    setError(null);
    try {
      const res = await fetch('/api/bulk-ingest/sample-preview', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
        setOverrideArtist(data.summary?.detectedArtist || '');
        setOverridePeriod(data.summary?.detectedPeriod || '01/2026');
      } else {
        setError(data.message || 'Không tìm thấy bộ file mẫu');
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu mẫu: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Commit parsed items into the database
  const handleCommitToExcel = async () => {
    if (!previewData || !previewData.items || previewData.items.length === 0) return;
    setIsCommitting(true);
    setError(null);

    try {
      const res = await fetch('/api/bulk-ingest/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: previewData.items,
          mode: commitMode
        })
      });
      const data = await res.json();
      if (data.success) {
        onIngestSuccess(data.message);
        onClose();
      } else {
        setError(data.message || 'Lỗi khi ghi vào cơ sở dữ liệu');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DFCBAA] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DFCBAA] bg-[#FAF7F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#7D1818] text-[#F4E5B8] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#7D1818] uppercase tracking-wide">
                Nạp Loạt Dữ Liệu — Phân Tách Chuỗi & Ảnh (Word + Folder Đa Tác Giả)
              </h3>
              <p className="text-[11.5px] text-stone-600">
                Tự động tách văn bản & ảnh nhúng trong file Word (.docx), đối sánh ghép ảnh gốc Full HD từ các Folder ảnh đính kèm và lưu vào Database Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#FAF8F5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Word (.docx) Upload Box */}
            <div className="bg-white border border-[#DFCBAA] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#7D1818] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#C58C00]" />
                    1. Tải File Word Bảng Giá (.docx)
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Tách chuỗi + Ảnh nhúng
                  </span>
                </div>
                <p className="text-[11.5px] text-stone-600 mb-3 leading-relaxed">
                  Chọn file bảng giá Word của bất kỳ Họa sĩ nào. Hệ thống tự bóc tách Tên họa sĩ, Tên tranh, Chất liệu, Kích thước, Năm, Giá và toàn bộ ảnh nhúng trong bảng.
                </p>

                <button
                  type="button"
                  onClick={() => wordInputRef.current?.click()}
                  className="w-full py-3.5 px-4 border-2 border-dashed border-[#C58C00] bg-[#FAF7F0] hover:bg-[#FDF6E2] text-stone-800 font-semibold text-[12.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#7D1818]" />
                  <span>Chọn File Word (.docx)</span>
                </button>
                <input
                  ref={wordInputRef}
                  type="file"
                  accept=".docx"
                  multiple
                  onChange={handleSelectWordFiles}
                  className="hidden"
                />
              </div>

              <div className="mt-3 space-y-1.5">
                {wordFiles.length === 0 ? (
                  <div className="text-[11px] text-stone-400 italic py-1">
                    Chưa chọn file Word nào
                  </div>
                ) : (
                  wordFiles.map((wf, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border border-[#EAE5D9] text-[11.5px]"
                    >
                      <span className="font-semibold text-stone-800 truncate">
                        📄 {wf.name} ({(wf.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWordFile(idx)}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Step 2: Folder Images Upload Box */}
            <div className="bg-white border border-[#DFCBAA] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#7D1818] flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-[#C58C00]" />
                    2. Tải Folder Ảnh Đính Kèm
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    Tách tên file + Ảnh HD
                  </span>
                </div>
                <p className="text-[11.5px] text-stone-600 mb-3 leading-relaxed">
                  Chọn 1 hoặc nhiều Folder chứa hình ảnh (VD: <code className="font-mono text-emerald-800">TRANH</code>, <code className="font-mono text-amber-800">ĐÃ BÁN</code>) hoặc chọn nhiều ảnh rời. Tự động đọc tên file ảnh để ghép đúng tác phẩm.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="py-3.5 px-3 border-2 border-dashed border-emerald-700 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-950 font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Chọn Folder Ảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => looseImagesInputRef.current?.click()}
                    className="py-3.5 px-3 border-2 border-dashed border-stone-400 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-stone-600 shrink-0" />
                    <span>Chọn Ảnh Rời</span>
                  </button>
                </div>

                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  onChange={handleSelectFolder}
                  className="hidden"
                />
                <input
                  ref={looseImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSelectFolder}
                  className="hidden"
                />
              </div>

              <div className="mt-3 space-y-1.5">
                {Object.keys(groupedFolders).length === 0 ? (
                  <div className="text-[11px] text-stone-400 italic py-1">
                    Chưa chọn folder hình ảnh nào
                  </div>
                ) : (
                  Object.entries(groupedFolders).map(([fName, count]) => (
                    <div
                      key={fName}
                      className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border border-[#EAE5D9] text-[11.5px]"
                    >
                      <span className="font-semibold text-stone-800 truncate">
                        📁 Folder: <strong>{fName}</strong> ({count} ảnh)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFolderGroup(fName)}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Bar: Run Parser OR Quick Sample */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DFCBAA] p-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunSamplePreview}
                disabled={isParsing}
                className="h-[36px] px-3.5 text-[11.5px] font-semibold text-stone-800 bg-[#FDF6E2] hover:bg-[#F7E8BE] border border-[#C58C00] transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-[#C58C00]" />
                <span>Chạy Thử Bằng Bộ File Mẫu Có Sẵn (BẢNG GIÁ.docx + TRANH + ĐÃ BÁN)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunParsePreview}
              disabled={isParsing || (wordFiles.length === 0 && folderImages.length === 0)}
              className="h-[38px] px-5 text-[12px] font-bold text-white bg-[#C58C00] hover:bg-[#A97500] disabled:opacity-45 transition-colors flex items-center gap-2 shadow-xs"
            >
              <Layers className="w-4 h-4" />
              <span>
                {isParsing
                  ? 'Đang phân tách chuỗi & hình ảnh...'
                  : 'Phân Tách Chuỗi & Đối Soát Hình Ảnh'}
              </span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PREVIEW RESULTS TABLE + QUICK ARTIST OVERRIDE */}
          {previewData && previewData.summary && (
            <div className="bg-white border border-[#DFCBAA] p-4 space-y-3">
              {/* Quick Artist Name & Catalogue Period Override Bar */}
              <div className="bg-[#FAF7F0] border border-[#C58C00] p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#7D1818]" />
                    <label className="text-[12px] font-bold text-[#7D1818] uppercase">
                      Tên Họa Sĩ (Tác Giả):
                    </label>
                    <input
                      type="text"
                      value={overrideArtist}
                      onChange={(e) => handleArtistOverrideChange(e.target.value)}
                      placeholder="Nhập tên họa sĩ..."
                      className="h-[34px] w-[220px] px-3 text-[12.5px] font-bold text-stone-900 bg-white border border-[#7D1818] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11.5px] font-semibold text-stone-700">
                      Kỳ Bảng Giá:
                    </label>
                    <input
                      type="text"
                      value={overridePeriod}
                      onChange={(e) => setOverridePeriod(e.target.value)}
                      className="h-[34px] w-[95px] px-2.5 text-[12px] font-semibold text-center bg-white border border-[#DFCBAA] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Mode selector */}
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="font-semibold text-stone-600">Chế độ lưu:</span>
                  <select
                    value={commitMode}
                    onChange={(e) => setCommitMode(e.target.value)}
                    className="h-[34px] px-2.5 bg-white border border-[#DFCBAA] font-semibold text-stone-800"
                  >
                    <option value="merge">Gộp thêm vào kho (Giữ các tác giả cũ + Thêm/Cập nhật lô này)</option>
                    <option value="replace">Thay thế toàn bộ kho bằng danh sách này</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <h4 className="font-serif text-sm font-bold text-[#7D1818] uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Xem Trước {previewData.items.length} Tác Phẩm {overrideArtist ? `(${overrideArtist})` : ''}
                </h4>
                <p className="text-[11.5px] text-stone-600">
                  Mới hoàn toàn: <strong className="text-emerald-700">{newItemsCount} bức</strong> •
                  Trùng lặp: <strong className="text-amber-700">{duplicateItems.length} bức</strong> •
                  Khớp ảnh HD: <strong>{previewData.summary.matchedBothCount} bức</strong> •
                  Đã bán: <strong>{previewData.summary.soldDetectedCount} bức</strong>
                </p>
              </div>

              {/* DUPLICATE CONFLICT RESOLUTION WARNING BANNER */}
              {duplicateItems.length > 0 && commitMode === 'merge' && (
                <div className="bg-amber-50 border-2 border-amber-400 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-[12.5px]">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Cảnh Báo Trùng Lặp: Phát hiện {duplicateItems.length} tác phẩm đã tồn tại trong Kho Tranh!
                      </span>
                    </div>
                    <p className="text-[11.5px] text-amber-900 leading-relaxed">
                      Hãy chọn cách xử lý cho các mục trùng: <strong>Giữ bản gốc</strong> (bảo toàn dữ liệu & ngày cập nhật cũ) hoặc{' '}
                      <strong>Thay thế / Ghi đè</strong> (cập nhật thông tin mới & tự động đổi <strong>Ngày cập nhật SP = hôm nay DD-MM-YYYY</strong>).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetAllDuplicatesResolution('keep_original')}
                      className={`h-[34px] px-3 text-[11.5px] font-bold border transition-colors cursor-pointer ${
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
                      className={`h-[34px] px-3 text-[11.5px] font-bold border transition-colors cursor-pointer ${
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

              {/* Preview Grid */}
              <div className="max-h-[280px] overflow-y-auto border border-[#EAE5D9]">
                <table className="w-full text-left border-collapse text-[11.5px]">
                  <thead className="bg-[#F5F2EB] sticky top-0 z-10 border-b border-[#DFCBAA] text-[10.5px] uppercase text-stone-700">
                    <tr>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Ảnh</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Mã SKU</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Tên Tác Phẩm</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Chất Liệu</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">KT Tranh</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">KT Khung</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Năm</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Giá ($ USD)</th>
                      <th className="py-2 px-2 border-r border-[#EAE5D9]">Xử Lý Trùng Lặp</th>
                      <th className="py-2 px-2">Nguồn Dữ Liệu</th>
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
                              : 'bg-amber-50/50 hover:bg-amber-50'
                            : 'hover:bg-[#FAF8F5]'
                        }
                      >
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">
                          {item.hinh_anh && item.hinh_anh[0] ? (
                            <img
                              src={item.hinh_anh[0]}
                              alt={item.ten_tac_pham}
                              className="w-10 h-10 object-cover border border-[#DFCBAA]"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-[9px] text-stone-400">
                              No img
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono text-[11px] font-semibold text-[#7D1818]">
                          {item.id}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">
                          <div className="font-serif font-bold text-stone-900">{item.ten_tac_pham}</div>
                          <div className="text-[10px] text-stone-500">{item.tac_gia}</div>
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">{item.chat_lieu}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono">{item.kich_thuoc_tranh || '—'}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono text-stone-700">
                          {item.kich_thuoc_khung_tranh || '—'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">{item.nam_sang_tac || '—'}</td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9] font-mono font-bold text-stone-900">
                          {formatUSD(item.gia)}
                        </td>
                        <td className="py-1.5 px-2 border-r border-[#EAE5D9]">
                          {item.is_duplicate ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 font-bold text-[10px]">
                                  TRÙNG ({item.existing_snapshot?.id || item.id})
                                </span>
                                {item.existing_snapshot?.ngay_cap_nhat_san_pham && (
                                  <span className="text-[10px] text-stone-500">
                                    Cũ: {item.existing_snapshot.ngay_cap_nhat_san_pham}
                                  </span>
                                )}
                              </div>
                              <div className="inline-flex border border-stone-300 bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleSetItemDuplicateResolution(idx, 'keep_original')}
                                  className={`px-2 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
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
                                  className={`px-2 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
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
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10.5px]">
                              + Mới hoàn toàn
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-[10.5px]">
                          {item.match_source === 'word_and_folder' && (
                            <span className="text-emerald-800 font-semibold">
                              ✓ Word + Ảnh HD
                            </span>
                          )}
                          {item.match_source === 'word_embedded_only' && (
                            <span className="text-amber-800 font-semibold">
                              ✓ Tách từ Word
                            </span>
                          )}
                          {item.match_source === 'folder_only' && (
                            <span className="text-blue-800 font-semibold">
                              ✓ Tách từ Folder Ảnh
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
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#DFCBAA] bg-[#FAF7F0] flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-stone-600 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#7D1818]" />
            Database đích: <strong>BinhMinhArt_Inventory.xlsx</strong> (Đồng bộ 2 chiều tự động)
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-[36px] px-4 text-[12px] font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-[#DFCBAA]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleCommitToExcel}
              disabled={!previewData || isCommitting}
              className="h-[36px] px-5 text-[12px] font-bold text-white bg-[#7D1818] hover:bg-[#5E1010] disabled:opacity-40 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Database className="w-4 h-4 text-[#F4E5B8]" />
              <span>
                {isCommitting
                  ? 'Đang ghi vào cơ sở dữ liệu...'
                  : `Ghi ${previewData?.items?.length || 0} Tác Phẩm Vào Cơ Sở Dữ Liệu`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
