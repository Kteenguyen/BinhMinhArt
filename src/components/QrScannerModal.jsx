import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lock,
  ShieldCheck,
  ScanLine,
  Settings,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react';

function getDeviceType() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isIpad =
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIpad) return 'ipad';
  if (/iPhone|Android.*Mobile/i.test(ua)) return 'mobile';
  if (/Tablet|Android/i.test(ua)) return 'tablet';
  return 'desktop';
}

function extractPaintingIdFromScannedText(rawText, paintings = []) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  // 1. If URL contains /tranh/:id or ?tranh=:id
  if (text.includes('/tranh/')) {
    const seg = decodeURIComponent(text.split('/tranh/').pop().split(/[?#\s]/)[0]).trim();
    if (seg) return seg;
  }
  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const qTranh = url.searchParams.get('tranh') || url.searchParams.get('id');
      if (qTranh) return qTranh.trim();
    }
  } catch {
    // ignore URL parse error
  }

  // 2. Match against existing painting IDs
  const directMatch = paintings.find(
    p => String(p.id || '').toLowerCase() === text.toLowerCase()
  );
  if (directMatch) return directMatch.id;

  return text;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  paintings = [],
  onSelectPaintingId
}) {
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'blocked'
  const [cameraError, setCameraError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'insecure_http' | 'permission_denied' | 'not_found' | 'other'
  const [scanMessage, setScanMessage] = useState(null);

  const deviceType = getDeviceType();
  const isDesktop = deviceType === 'desktop';
  const isIpadOrTablet = deviceType === 'ipad' || deviceType === 'tablet';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraStatus('idle');
      setCameraError(null);
      setErrorType(null);
      setScanMessage(null);
    } else {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraStatus('idle');
  };

  const startCamera = async () => {
    setCameraStatus('requesting');
    setCameraError(null);
    setErrorType(null);
    setScanMessage(null);

    // Check if navigator.mediaDevices and getUserMedia exist in this browser context
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMediaDevices) {
      setCameraStatus('blocked');
      setErrorType('insecure_http');
      setCameraError(
        isDesktop
          ? 'Trình duyệt trên máy tính tự động khóa Camera khi không chạy qua HTTPS. Vui lòng mở bằng đường dẫn https://...:5001 để Chrome hiển thị pop-up hỏi quyền truy cập máy ảnh.'
          : 'Trình duyệt trên iPad tự động khóa Camera khi không chạy qua HTTPS. Vui lòng mở bằng đường dẫn https://...:5001 để Chrome hiển thị pop-up hỏi quyền.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isDesktop ? 'user' : { ideal: 'environment' }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        await video.play();
        setCameraStatus('active');
        rafRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err) {
      setCameraStatus('blocked');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission_denied');
        setCameraError(
          isDesktop
            ? 'Quyền Camera trên máy tính của bạn đang bị chặn bởi Chrome hoặc Cài đặt hệ thống (macOS / Windows).'
            : 'Quyền Camera đã bị từ chối hoặc Chrome trên iPad đang bị khóa Camera trong Cài Đặt.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('not_found');
        setCameraError(
          isDesktop
            ? 'Không tìm thấy Webcam trên máy tính này. Vui lòng cắm Webcam hoặc sử dụng tính năng tải ảnh QR.'
            : 'Không tìm thấy Camera trên thiết bị này.'
        );
      } else {
        setErrorType('other');
        setCameraError(`Không thể mở Camera: ${err.message || 'Lỗi không xác định'}.`);
      }
    }
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      let w = video.videoWidth;
      let h = video.videoHeight;
      const MAX_DIM = 1280;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        const extractedId = extractPaintingIdFromScannedText(code.data, paintings);
        if (extractedId) {
          setScanMessage(`Đã quét mã: ${extractedId}`);
          stopCamera();
          setTimeout(() => {
            onSelectPaintingId(extractedId);
            onClose();
          }, 150);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleUploadQrImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCameraError(null);
    setScanMessage('Đang phân tích hình ảnh mã QR...');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const MAX_DIM = 1200;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const extractedId = extractPaintingIdFromScannedText(code.data, paintings);
          if (extractedId) {
            setScanMessage(`Đã nhận diện: ${extractedId}`);
            setTimeout(() => {
              onSelectPaintingId(extractedId);
              onClose();
            }, 200);
          } else {
            setCameraError('Không tìm thấy Mã Tranh hợp lệ trong mã QR.');
            setScanMessage(null);
          }
        } else {
          setCameraError('Không nhận diện được mã QR trong bức ảnh vừa chọn.');
          setScanMessage(null);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-[#C5A059] shadow-2xl max-w-xl w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#1C1917] text-[#FAF8F5] flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#C5A059] text-[#1C1917] flex items-center justify-center font-bold">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-bold text-[#FAF8F5] tracking-wide uppercase">
                  Quét Mã QR Trực Tiếp
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-800 text-stone-300 rounded border border-stone-700 flex items-center gap-1">
                  {isDesktop ? <Monitor className="w-3 h-3 text-[#C5A059]" /> : <Tablet className="w-3 h-3 text-[#C5A059]" />}
                  <span>{isDesktop ? 'Máy Tính (Desktop)' : 'iPad / Tablet'}</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Hướng camera vào mã QR để tự động tìm và nhảy đến dòng tranh trong kho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live View Camera Body */}
        <div className="p-4 space-y-3.5">
          {/* Scan Success Notice */}
          {scanMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-400 text-emerald-950 text-[12px] font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{scanMessage} — Đang chuyển đến tác phẩm...</span>
            </div>
          )}

          {/* Blocked Case 1: Insecure HTTP */}
          {cameraStatus === 'blocked' && errorType === 'insecure_http' && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg space-y-3 text-amber-950 text-[12px]">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase tracking-wide">Yêu Cầu Kết Nối Bảo Mật HTTPS Để Quét Camera</h4>
                  <p className="text-[11.5px] text-amber-900 mt-1 leading-relaxed">
                    Trình duyệt (Safari trên iPhone/iPad và Chrome trên Android/PC) <strong>bắt buộc phải chạy HTTPS</strong> mới cho phép bật Camera phần cứng.
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Cổng <strong>5001</strong> của BinhMinhArt đã hỗ trợ song song cả HTTP và HTTPS. Nhấp vào nút bên dưới để chuyển sang HTTPS ngay lập tức:
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentUrl = window.location.href;
                    window.location.href = currentUrl.replace(/^http:/i, 'https:');
                  }}
                  className="px-3.5 py-1.5 bg-[#7D1818] hover:bg-[#922020] text-white font-bold rounded text-[11.5px] flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Chuyển Sang HTTPS (Bật Camera Ngay)</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-amber-400 font-semibold rounded text-[11px] text-stone-700 cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Blocked Case 2: Permission Denied */}
          {cameraStatus === 'blocked' && errorType === 'permission_denied' && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg space-y-2.5 text-red-950 text-[12px]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase">Quyền Camera đang bị chặn</h4>
                  <p className="text-[11.5px] text-red-900 mt-0.5">{cameraError}</p>
                </div>
              </div>

              {/* DYNAMIC INSTRUCTIONS BASED ON DEVICE TYPE */}
              {isDesktop ? (
                <div className="p-2.5 bg-white border border-red-200 rounded text-[11px] text-stone-700 space-y-1.5">
                  <div className="font-semibold text-stone-900 flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5 text-stone-600" />
                    <span>Cách mở quyền Camera trên Máy Tính (Chrome / macOS / Windows):</span>
                  </div>
                  <div>
                    1. <strong>Trong trình duyệt Chrome:</strong> Nhìn lên thanh địa chỉ ở trên cùng, nhấp vào biểu tượng <strong>Cài đặt trang web / Ổ khóa</strong> (bên trái link <code className="bg-stone-100 px-1 font-mono">https://...</code>) &gt; Bật công tắc <strong>Máy ảnh (Camera)</strong> sang <strong>"Cho phép" (Allow)</strong>.
                  </div>
                  <div>
                    2. <strong>Nếu dùng macOS:</strong> Vào <strong>Cài đặt hệ thống (System Settings)</strong> &gt; <strong>Quyền riêng tư & Bảo mật (Privacy & Security)</strong> &gt; <strong>Máy ảnh (Camera)</strong> &gt; Bật cho phép <strong>Google Chrome</strong>.
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-white border border-red-200 rounded text-[11px] text-stone-700 space-y-1">
                  <div className="font-semibold text-stone-900 flex items-center gap-1">
                    <Tablet className="w-3.5 h-3.5 text-stone-600" />
                    <span>Cách khắc phục trên iPad / iPhone:</span>
                  </div>
                  <div>1. Vào <strong>Cài đặt (Settings) iPad</strong> &gt; Chọn <strong>Chrome</strong> &gt; Bật <strong>Máy ảnh (Camera)</strong>.</div>
                  <div>2. Trong Chrome: Chạm vào biểu tượng ổ khóa cạnh thanh địa chỉ &gt; Chọn <strong>Cho phép Máy ảnh</strong>.</div>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3 py-1.5 bg-[#252016] text-[#FAF8F5] text-[11.5px] font-bold rounded flex items-center gap-1.5 cursor-pointer hover:bg-stone-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Đã bật quyền — Kích hoạt lại</span>
                </button>
              </div>
            </div>
          )}

          {/* Blocked Case 3: No Device Found */}
          {cameraStatus === 'blocked' && errorType === 'not_found' && (
            <div className="p-4 bg-stone-100 border-2 border-stone-300 rounded-lg space-y-2 text-stone-800 text-[12px]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase">Không tìm thấy Camera / Webcam</h4>
                  <p className="text-[11.5px] text-stone-600 mt-0.5">{cameraError}</p>
                </div>
              </div>
              <p className="text-[11px] text-stone-500 italic">
                * Bạn có thể sử dụng nút <strong>"Tải ảnh QR"</strong> ở góc dưới để quét từ file ảnh chụp sẵn.
              </p>
            </div>
          )}

          {/* LIVE CAMERA VIEWFINDER */}
          {cameraStatus !== 'blocked' && (
            <div className="relative bg-black border-2 border-stone-800 aspect-video max-h-[300px] w-full mx-auto flex items-center justify-center overflow-hidden rounded shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraStatus === 'requesting' && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-[#FAF8F5]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#C5A059]" />
                  <span className="text-[12px] font-semibold">Đang kích hoạt Camera...</span>
                  <span className="text-[10.5px] text-stone-400">(Nhấn "Cho phép" khi pop-up xuất hiện)</span>
                </div>
              )}

              {cameraStatus === 'active' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-[#C5A059] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] relative">
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent shadow-[0_0_8px_#FFD700] animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Toolbar: Refresh and Upload backup */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500 border-t border-[#EAE5D9]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang quét tự động ({isDesktop ? 'Webcam PC' : 'Camera iPad'})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startCamera()}
                className="h-[28px] px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Làm mới</span>
              </button>

              <label className="h-[28px] px-2.5 bg-white hover:bg-stone-50 text-stone-700 font-semibold border border-stone-300 rounded flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3 text-stone-500" />
                <span>Tải ảnh QR</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadQrImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
