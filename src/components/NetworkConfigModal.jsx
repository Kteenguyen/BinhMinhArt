import React, { useState, useEffect } from 'react';
import { X, Wifi, Database, CheckCircle2, Copy, Check } from 'lucide-react';

export default function NetworkConfigModal({ isOpen, onClose, onSaved }) {
  const [config, setConfig] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [customIp, setCustomIp] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/network-info')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setConfig(data.config);
          setDbStatus(data.dbStatus);
          setCustomIp(data.config.customIp || '');
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveIp = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/network-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customIp })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        onSaved && onSaved('Đã lưu cấu hình địa chỉ IP WiFi nội bộ');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const activeAddress =
    config?.customUrl || config?.autoUrl || config?.defaultUrl || 'https://localhost:5001';
  const activeHttpsAddress =
    config?.customHttpsUrl || config?.autoHttpsUrl || config?.defaultHttpsUrl || 'https://localhost:5001';

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DFCBAA] shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DFCBAA] bg-[#FAF7F0]">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[#7D1818]" />
            <h3 className="font-serif text-sm font-bold text-[#7D1818] uppercase tracking-wider">
              Cấu Hình Mạng WiFi Nội Bộ & Database Excel
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 bg-[#FAF8F5] text-[12px]">
          {/* Section 1: SQLite database + Excel report status */}
          <div className="bg-white border border-[#DFCBAA] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" />
                Cơ Sở Dữ Liệu Gốc (SQLite):
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />{' '}
                {dbStatus ? `${dbStatus.paintingCount} tác phẩm` : 'Đang kiểm tra'}
              </span>
            </div>
            <p className="font-mono text-[11px] text-stone-600 break-all bg-stone-50 p-2 border border-stone-200">
              {dbStatus?.filePath || 'data/binhminhart.db'}
            </p>
            <p className="text-[11px] text-stone-500">
              Mọi thay đổi trên Web được lưu an toàn vào cơ sở dữ liệu này, tự sao lưu mỗi ngày
              (thư mục data/backups).
            </p>
            <div className="pt-1.5 border-t border-stone-100 space-y-1">
              <p className="font-bold text-stone-900">File Excel báo cáo:</p>
              <p className="font-mono text-[11px] text-stone-600 break-all bg-stone-50 p-2 border border-stone-200">
                {dbStatus?.excelReport?.filePath || 'exports/BinhMinhArt_Inventory.xlsx'}
              </p>
              {dbStatus?.excelReport?.ok === false ? (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2">
                  Chưa ghi được file Excel (đang mở trong Excel?). Dữ liệu vẫn an toàn trong cơ sở dữ
                  liệu, hệ thống tự thử lại. Hãy đóng file Excel đó.
                </p>
              ) : (
                <p className="text-[11px] text-stone-500">
                  Tự tạo lại sau mỗi thay đổi để xem/in báo cáo. Sửa trong file này sẽ không đồng bộ
                  ngược về hệ thống; muốn nạp dữ liệu từ Excel hãy dùng nút Nhập Excel.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Localhost & Custom WiFi IP */}
          <form onSubmit={handleSaveIp} className="bg-white border border-[#DFCBAA] p-3.5 space-y-3">
            <div>
              <label className="block font-bold text-stone-900 mb-1">
                Địa Chỉ HTTPS Quản Trị & Quét QR Trực Tiếp (Cổng 5001):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activeHttpsAddress || activeAddress}
                  className="flex-1 h-[36px] px-3 font-mono text-[12px] font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-300"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(activeHttpsAddress || activeAddress)}
                  className="h-[36px] px-3 bg-emerald-800 hover:bg-emerald-900 text-white text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Bổ sung Địa Chỉ IP WiFi Nội Bộ (Tuỳ chọn — để trống sẽ dùng localhost):
              </label>
              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="VD: 192.168.1.15 (Nhập sau khi cần dùng qua WiFi trong nhà)"
                className="w-full h-[36px] px-3 font-mono text-[12px] bg-white border border-[#DFCBAA] focus:outline-none focus:border-[#7D1818]"
              />
              {config?.detectedLanIps?.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                  <span>Gợi ý IP mạng hiện tại của máy:</span>
                  {config.detectedLanIps.map((ip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomIp(ip.address)}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-mono font-semibold"
                    >
                      {ip.address}
                    </button>
                  ))}
                  {customIp && (
                    <button
                      type="button"
                      onClick={() => setCustomIp('')}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600"
                    >
                      Đặt lại localhost
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5D9]">
              <button
                type="button"
                onClick={onClose}
                className="h-[34px] px-3.5 text-[11.5px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-[34px] px-4 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#5E1010]"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình IP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
