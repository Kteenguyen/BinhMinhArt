import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import FilterToolbar from './components/FilterToolbar';
import ExcelGrid from './components/ExcelGrid';
import ExhibitionView from './components/ExhibitionView';
import CustomerExhibitionView from './components/CustomerExhibitionView';
import AddPaintingModal from './components/AddPaintingModal';
import PaintingDetailModal from './components/PaintingDetailModal';
import ColumnManagerModal from './components/ColumnManagerModal';
import ExcelImportModal from './components/ExcelImportModal';
import BulkIngestModal from './components/BulkIngestModal';
import NetworkConfigModal from './components/NetworkConfigModal';
import LightboxModal from './components/LightboxModal';
import SoldQuickModal from './components/SoldQuickModal';
import ArtworkDetailPage from './components/ArtworkDetailPage';
import QrScannerModal from './components/QrScannerModal';
import BatchTagPrintModal from './components/BatchTagPrintModal';
import CustomerManagementView from './components/CustomerManagementView';
import QuickAddCustomerModal from './components/QuickAddCustomerModal';
import CustomerDetailModal from './components/CustomerDetailModal';
import { Tag, Printer, CheckSquare, X, UploadCloud } from 'lucide-react';
import { matchArtistQuery, removeVietnameseTones } from './utils/vietnameseSearch';

import {
  DEFAULT_COLUMNS,
  SOLD_COLUMNS,
  STORAGE_KEY_COLUMNS,
  STORAGE_KEY_SOLD_COLUMNS,
  STORAGE_KEY_VISIBILITY,
  loadColumns
} from './types';

function getArtworkIdFromLocation() {
  const path = window.location.pathname;
  if (path.toLowerCase().startsWith('/tranh/')) {
    const raw = decodeURIComponent(path.slice('/tranh/'.length)).split('/')[0].trim();
    if (raw) return raw;
  }
  const params = new URLSearchParams(window.location.search);
  const qTranh = params.get('tranh') || params.get('id');
  return qTranh ? qTranh.trim() : null;
}

export default function App() {
  // Primary View Mode: 'inventory' (Excel Grid) | 'exhibition' (Catalogue & PDF) | 'guest' (Customer Exhibition) | 'artwork_detail'
  const [activeArtworkId, setActiveArtworkId] = useState(() => getArtworkIdFromLocation());
  const [activeView, setActiveView] = useState(() => {
    if (getArtworkIdFromLocation()) return 'artwork_detail';
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path.includes('/trien-lam') || params.get('view') === 'khach' || params.get('view') === 'guest') {
      return 'guest';
    }
    return 'inventory';
  });

  // Main Data States
  const [paintings, setPaintings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Column Configuration State with LocalStorage Persistence
  const [columns, setColumns] = useState(() => {
    return loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY);
  });

  const [soldColumns, setSoldColumns] = useState(() => {
    return loadColumns(SOLD_COLUMNS, STORAGE_KEY_SOLD_COLUMNS, STORAGE_KEY_VISIBILITY);
  });

  // Filter & Sub-tab States
  const [searchTerm, setSearchTerm] = useState('');
  const [inventorySubTab, setInventorySubTab] = useState('chua_ban'); // 'chua_ban' | 'da_ban'
  const [pendingPriceOnly, setPendingPriceOnly] = useState(false);
  const [artistFilter, setArtistFilter] = useState('all');
  const [mediumFilter, setMediumFilter] = useState('all');
  const [highlightedPaintingId, setHighlightedPaintingId] = useState(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkIngestModalOpen, setIsBulkIngestModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [detailPainting, setDetailPainting] = useState(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);
  const [soldQuickPainting, setSoldQuickPainting] = useState(null);

  // CRM Customer Management States
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isExportingCustomers, setIsExportingCustomers] = useState(false);

  // Tag Batch Selection & Printing States
  const [selectedPaintingIdsForTag, setSelectedPaintingIdsForTag] = useState(new Set());
  const [isBatchTagPrintModalOpen, setIsBatchTagPrintModalOpen] = useState(false);

  // Global Drag & Drop for Word (.docx) Files
  const [droppedWordFiles, setDroppedWordFiles] = useState([]);
  const [isWindowDraggingDocx, setIsWindowDraggingDocx] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsWindowDraggingDocx(true);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsWindowDraggingDocx(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDraggingDocx(false);

      const files = Array.from(e.dataTransfer.files || []);
      const docxFiles = files.filter(f => f.name.toLowerCase().endsWith('.docx'));
      const legacyDocFiles = files.filter(f => f.name.toLowerCase().endsWith('.doc') && !f.name.toLowerCase().endsWith('.docx'));

      if (legacyDocFiles.length > 0 && docxFiles.length === 0) {
        showToast(`File "${legacyDocFiles[0].name}" là định dạng Word .doc cũ. Vui lòng Save As thành .docx!`, 'error');
        return;
      }

      if (docxFiles.length > 0) {
        setDroppedWordFiles(docxFiles);
        setIsBulkIngestModalOpen(true);
        showToast(`Đã nhận file Word: ${docxFiles.map(f => f.name).join(', ')}`);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const openArtworkPage = (paintingId) => {
    if (!paintingId) return;
    const cleanId = String(paintingId).trim();
    setActiveArtworkId(cleanId);
    setActiveView('artwork_detail');
    window.history.pushState({}, '', `/tranh/${encodeURIComponent(cleanId)}`);
  };

  const closeArtworkPage = () => {
    setActiveArtworkId(null);
    setActiveView('inventory');
    window.history.pushState({}, '', '/');
  };

  // Show toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Data from Server (SQLite database)
  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [resPaintings, resStats] = await Promise.all([
        fetch('/api/paintings'),
        fetch('/api/stats')
      ]);

      const jsonPaintings = await resPaintings.json();
      const jsonStats = await resStats.json();

      if (jsonPaintings.success) {
        setPaintings(jsonPaintings.data);
      }
      if (jsonStats.success) {
        setStats(jsonStats.stats);
      }
    } catch (err) {
      if (!silent) {
        showToast('Lỗi khi tải dữ liệu từ máy chủ: ' + err.message, 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch Customers Data
  const fetchCustomers = async (silent = false) => {
    try {
      if (!silent) setCustomersLoading(true);
      const res = await fetch('/api/customers');
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data || []);
      }
    } catch (err) {
      if (!silent) {
        showToast('Lỗi khi tải danh sách khách hàng: ' + err.message, 'error');
      }
    } finally {
      if (!silent) setCustomersLoading(false);
    }
  };

  const handleCreateCustomer = async (data) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        showToast('Đã thêm khách hàng thành công');
        setIsQuickAddCustomerOpen(false);
        fetchCustomers(true);
      } else {
        showToast(json.error || 'Lỗi khi thêm khách hàng', 'error');
      }
    } catch (err) {
      showToast('Lỗi mạng: ' + err.message, 'error');
    }
  };

  const handleUpdateCustomer = async (id, data) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        showToast('Đã cập nhật thông tin khách hàng');
        fetchCustomers(true);
      } else {
        showToast(json.error || 'Lỗi khi cập nhật khách hàng', 'error');
      }
    } catch (err) {
      showToast('Lỗi mạng: ' + err.message, 'error');
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Đã xoá khách hàng');
        setIsCustomerDetailOpen(false);
        setSelectedCustomerId(null);
        fetchCustomers(true);
      } else {
        showToast(json.error || 'Lỗi khi xoá khách hàng', 'error');
      }
    } catch (err) {
      showToast('Lỗi mạng: ' + err.message, 'error');
    }
  };

  const handleExportCustomersExcel = async () => {
    setIsExportingCustomers(true);
    try {
      const res = await fetch('/api/export-customers-excel');
      const json = await res.json();
      if (json.success) {
        showToast('Đã xuất file: ' + (json.file || 'BinhMinhArt_Customers.xlsx'));
        // Trigger direct browser download
        const downloadLink = document.createElement('a');
        downloadLink.href = '/exports/BinhMinhArt_Customers.xlsx?t=' + Date.now();
        downloadLink.download = 'BinhMinhArt_Customers.xlsx';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        showToast('Xuất Excel thất bại: ' + (json.error || ''), 'error');
      }
    } catch (err) {
      showToast('Lỗi khi xuất file Excel khách hàng: ' + err.message, 'error');
    } finally {
      setIsExportingCustomers(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCustomers(true);

    // Auto-sync when window regains focus (if user edited BinhMinhArt_Inventory.xlsx in Excel)
    const onFocus = () => fetchData(true);
    const onPopState = () => {
      const idFromUrl = getArtworkIdFromLocation();
      if (idFromUrl) {
        setActiveArtworkId(idFromUrl);
        setActiveView('artwork_detail');
      } else {
        setActiveArtworkId(null);
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/trien-lam')) {
          setActiveView('guest');
        } else {
          setActiveView('inventory');
        }
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Save Column Configurations to LocalStorage
  const handleReorderColumns = (newCols) => {
    const nonActions = newCols.filter(c => c.id !== 'actions');
    const actionCol = newCols.find(c => c.id === 'actions') || {
      id: 'actions',
      label: 'Thao Tác',
      width: 120,
      minWidth: 110,
      isEditable: false,
      type: 'action',
      visible: true
    };
    const reordered = [...nonActions, { ...actionCol, visible: true }];

    if (inventorySubTab === 'da_ban') {
      setSoldColumns(reordered);
      try {
        localStorage.setItem(STORAGE_KEY_SOLD_COLUMNS, JSON.stringify(reordered.map(c => c.id)));
      } catch (e) {
        console.warn('Failed to save sold column order:', e);
      }
    } else {
      setColumns(reordered);
      try {
        localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(reordered.map(c => c.id)));
      } catch (e) {
        console.warn('Failed to save column order:', e);
      }
    }
    showToast('Đã lưu thứ tự cột mới');
  };

  const handleToggleColumnVisibility = (colId) => {
    if (colId === 'actions') return;

    const activeCols = inventorySubTab === 'da_ban' ? soldColumns : columns;
    const targetCol = activeCols.find(c => c.id === colId);
    const newVisible = targetCol ? (targetCol.visible === false) : true;

    setColumns(prev => prev.map(c => (c.id === colId ? { ...c, visible: newVisible } : c)));
    setSoldColumns(prev => prev.map(c => (c.id === colId ? { ...c, visible: newVisible } : c)));

    try {
      let visMap = {};
      try {
        const savedVisibility = localStorage.getItem(STORAGE_KEY_VISIBILITY);
        if (savedVisibility) {
          const parsed = JSON.parse(savedVisibility);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) visMap = parsed;
        }
      } catch {
        visMap = {};
      }
      visMap[colId] = newVisible;
      localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visMap));
    } catch (e) {
      console.warn('Failed to save column visibility:', e);
    }
  };

  const handleResetColumns = () => {
    try {
      let visMap = {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY_VISIBILITY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) visMap = parsed;
        }
      } catch {
        visMap = {};
      }

      if (inventorySubTab === 'da_ban') {
        SOLD_COLUMNS.forEach(c => delete visMap[c.id]);
        try {
          localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visMap));
        } catch { /* storage full / blocked */ }
        try {
          localStorage.removeItem(STORAGE_KEY_SOLD_COLUMNS);
        } catch { /* storage blocked */ }
        setSoldColumns(SOLD_COLUMNS.map(c => ({ ...c })));
        setColumns(prev => prev.map(c => ({
          ...c,
          visible: c.id === 'actions' ? true : (visMap[c.id] !== undefined ? Boolean(visMap[c.id]) : (DEFAULT_COLUMNS.find(dc => dc.id === c.id)?.visible !== false))
        })));
      } else {
        DEFAULT_COLUMNS.forEach(c => delete visMap[c.id]);
        try {
          localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visMap));
        } catch { /* storage full / blocked */ }
        try {
          localStorage.removeItem(STORAGE_KEY_COLUMNS);
        } catch { /* storage blocked */ }
        setColumns(DEFAULT_COLUMNS.map(c => ({ ...c })));
        setSoldColumns(prev => prev.map(c => ({
          ...c,
          visible: c.id === 'actions' ? true : (visMap[c.id] !== undefined ? Boolean(visMap[c.id]) : (SOLD_COLUMNS.find(sc => sc.id === c.id)?.visible !== false))
        })));
      }
    } catch (e) {
      console.warn('Failed to reset column storage:', e);
      if (inventorySubTab === 'da_ban') {
        setSoldColumns(SOLD_COLUMNS.map(c => ({ ...c })));
      } else {
        setColumns(DEFAULT_COLUMNS.map(c => ({ ...c })));
      }
    }
    showToast('Đã khôi phục thứ tự cột mặc định');
  };

  // Add new painting (supports duplicate conflict resolution: keep_original / overwrite)
  const handleAddPainting = async (newPaintingData) => {
    try {
      const res = await fetch('/api/paintings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPaintingData)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        showToast(
          data.message || `Đã nhập kho & ghi vào Excel: ${data.data?.ten_tac_pham || ''}`
        );
        fetchData();
      } else {
        showToast(data.message || 'Lỗi thêm tranh', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Save painting from detail modal
  const handleSaveDetail = async (updatedData) => {
    try {
      const res = await fetch(`/api/paintings/${updatedData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      if (data.success) {
        setDetailPainting(null);
        showToast('Đã cập nhật hồ sơ tác phẩm');
        fetchData();
      } else {
        showToast(data.message || 'Lỗi cập nhật', 'error');
      }
    } catch {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Delete painting
  const handleDeletePainting = async (id) => {
    try {
      const res = await fetch(`/api/paintings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDetailPainting(null);
        showToast('Đã xóa tác phẩm khỏi kho');
        fetchData();
      } else {
        showToast(data.message || 'Lỗi khi xóa', 'error');
      }
    } catch {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Sold Quick Confirm
  const handleSoldConfirm = async (soldPayload) => {
    if (!soldQuickPainting) return;
    try {
      const res = await fetch(`/api/paintings/${soldQuickPainting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soldPayload)
      });
      const data = await res.json();
      if (data.success) {
        const soldId = soldQuickPainting.id;
        setSoldQuickPainting(null);
        setInventorySubTab('da_ban');
        showToast(
          `Đã chốt bán tác phẩm ${soldId} (Hoá đơn: ${soldPayload.hoa_don}) & chuyển sang Sub-tab Đã Bán`
        );
        fetchData();
      }
    } catch {
      showToast('Lỗi khi lưu giao dịch', 'error');
    }
  };

  // Revert Sold Painting back to Inventory Stock
  const handleRevertToStock = async (painting) => {
    if (
      !window.confirm(
        `Chuyển tác phẩm "${painting.ten_tac_pham}" (${painting.id}) trở lại Kho Tranh Chưa Bán?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/paintings/${painting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tinh_trang: 'chua_ban',
          ngay_ban: null
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã hoàn tác tác phẩm ${painting.id} về Kho Tranh Chưa Bán`);
        fetchData();
      }
    } catch {
      showToast('Lỗi khi hoàn tác trạng thái', 'error');
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/export-excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BinhMinhArt_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast('Đã tải bản sao file Excel (.xlsx) thành công!');
    } catch {
      showToast('Lỗi khi xuất file Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset to Initial Seed - Safeguarded
  const handleResetSeed = () => {
    showToast('Tính năng Phục Hồi Gốc đã bị khóa an toàn để bảo vệ 335 tác phẩm gốc của bộ sưu tập.', 'warning');
  };

  // Batch Tag Status Handler
  const handleBatchTagStatus = async (status = true) => {
    if (selectedPaintingIdsForTag.size === 0) return;
    try {
      const ids = Array.from(selectedPaintingIdsForTag);
      const res = await fetch('/api/paintings/batch-tag-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, da_in_tag: status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã cập nhật trạng thái tag cho ${ids.length} tác phẩm`);
        fetchData(true);
      }
    } catch (err) {
      showToast('Lỗi khi cập nhật trạng thái in tag', 'error');
    }
  };

  const handleToggleSelectPainting = (id) => {
    setSelectedPaintingIdsForTag(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPaintings = (ids) => {
    setSelectedPaintingIdsForTag(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Compute unique artists & counts
  const artistOptions = React.useMemo(() => {
    const map = new Map();
    paintings.forEach(p => {
      const name = String(p.tac_gia || 'Dương Văn Sen').trim() || 'Dương Văn Sen';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [paintings]);

  // Counts for Sub-tabs
  const inStockTotalCount = React.useMemo(
    () => paintings.filter(p => p.tinh_trang !== 'da_ban').length,
    [paintings]
  );
  const soldTotalCount = React.useMemo(
    () => paintings.filter(p => p.tinh_trang === 'da_ban').length,
    [paintings]
  );

  // Filtered & Searched Paintings
  const filteredPaintings = paintings.filter(p => {
    if (activeView === 'inventory') {
      if (inventorySubTab === 'chua_ban' && p.tinh_trang === 'da_ban') return false;
      if (inventorySubTab === 'da_ban' && p.tinh_trang !== 'da_ban') return false;
      if (inventorySubTab === 'chua_ban' && pendingPriceOnly && p.gia !== null && p.gia !== undefined) {
        return false;
      }
    }

    if (searchTerm.trim()) {
      const rawQ = searchTerm.trim().toLowerCase();
      const cleanQ = removeVietnameseTones(searchTerm);

      const matchId = (p.id || '').toLowerCase().includes(rawQ);
      const matchName = (p.ten_tac_pham || '').toLowerCase().includes(rawQ) || removeVietnameseTones(p.ten_tac_pham).includes(cleanQ);
      const matchArtist = matchArtistQuery(p.tac_gia, rawQ).match;
      const matchSize = (p.kich_thuoc_tranh || '').toLowerCase().includes(rawQ);
      const matchCustomer = (p.khach_hang || '').toLowerCase().includes(rawQ) || removeVietnameseTones(p.khach_hang).includes(cleanQ);
      const matchInvoice = (p.hoa_don || '').toLowerCase().includes(rawQ);
      if (!matchId && !matchName && !matchArtist && !matchSize && !matchCustomer && !matchInvoice) {
        return false;
      }
    }

    if (artistFilter !== 'all') {
      const pArtist = String(p.tac_gia || 'Dương Văn Sen').trim() || 'Dương Văn Sen';
      if (pArtist !== artistFilter) return false;
    }

    if (mediumFilter !== 'all') {
      const med = (p.chat_lieu || '').toLowerCase();
      if (!med.includes(mediumFilter.toLowerCase())) return false;
    }

    return true;
  });

  // Quick Jump Search Handler (When user scans QR or presses Enter in search box)
  const handleQuickJumpSearch = (rawInput) => {
    const text = String(rawInput || '').trim();
    if (!text) return;

    let code = text;
    if (text.includes('/tranh/')) {
      code = decodeURIComponent(text.split('/tranh/').pop().split(/[?#\s]/)[0]).trim();
    }

    const exactById = paintings.find(
      p => String(p.id || '').toLowerCase() === code.toLowerCase()
    );

    // Switch to inventory view if not already
    setActiveView('inventory');

    if (exactById) {
      if (exactById.tinh_trang === 'da_ban') {
        setInventorySubTab('da_ban');
      } else {
        setInventorySubTab('chua_ban');
      }
      setArtistFilter('all');
      setMediumFilter('all');
      setPendingPriceOnly(false);
      setSearchTerm(exactById.id);
      setHighlightedPaintingId(exactById.id);
      showToast(`Đã tìm thấy tác phẩm: ${exactById.id} - ${exactById.ten_tac_pham || ''}`);
      setTimeout(() => {
        const el = document.getElementById(`row-${exactById.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return;
    }

    // If query string matches any in list
    setSearchTerm(code);
    showToast(`Đang lọc theo mã: ${code}`);
  };

  // If in dedicated Artwork Detail Page ('artwork_detail' / '/tranh/:id')
  if (activeView === 'artwork_detail') {
    const matchedPainting =
      paintings.find(p => String(p.id || '').toLowerCase() === String(activeArtworkId || '').toLowerCase()) ||
      null;

    return (
      <>
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 shadow-xl text-[12px] font-medium transition-all animate-in slide-in-from-top-2 flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-900 text-white'
                : 'bg-[#252016] text-[#FAF8F5] border border-[#C5A059]'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        )}

        <ArtworkDetailPage
          painting={matchedPainting}
          allPaintings={paintings}
          onBack={closeArtworkPage}
          onSelectPainting={(id) => openArtworkPage(id)}
          onOpenEditModal={(p) => setDetailPainting(p)}
          onOpenLightbox={(src, title, subtitle) =>
            setLightboxData({ imageSrc: src, title, subtitle })
          }
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
        />

        <PaintingDetailModal
          isOpen={!!detailPainting}
          onClose={() => setDetailPainting(null)}
          painting={detailPainting}
          onSave={handleSaveDetail}
          onDelete={handleDeletePainting}
          onOpenLightbox={(src, title, subtitle) =>
            setLightboxData({ imageSrc: src, title, subtitle })
          }
        />

        <QrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          paintings={paintings}
          onSelectPaintingId={(id) => handleQuickJumpSearch(id)}
        />

        <LightboxModal
          isOpen={!!lightboxData}
          onClose={() => setLightboxData(null)}
          imageSrc={lightboxData?.imageSrc}
          title={lightboxData?.title}
          subtitle={lightboxData?.subtitle}
        />
      </>
    );
  }

  // If in Customer Exhibition Mode ('guest'), render dedicated Customer Gallery Showcase (hides all internal admin KPIs & revenue)
  if (activeView === 'guest') {
    return (
      <>
        <CustomerExhibitionView
          paintings={paintings}
          onOpenLightbox={(src, title, subtitle) =>
            setLightboxData({ imageSrc: src, title, subtitle })
          }
          onChangeView={(view) => {
            if (window.location.pathname.includes('/trien-lam')) {
              window.history.pushState({}, '', '/');
            }
            setActiveView(view);
          }}
          onExitGuestMode={() => {
            if (window.location.pathname.includes('/trien-lam')) {
              window.history.pushState({}, '', '/');
            }
            setActiveView('inventory');
          }}
        />
        <LightboxModal
          isOpen={!!lightboxData}
          onClose={() => setLightboxData(null)}
          imageSrc={lightboxData?.imageSrc}
          title={lightboxData?.title}
          subtitle={lightboxData?.subtitle}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 shadow-xl text-[12px] font-medium transition-all animate-in slide-in-from-top-2 flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-900 text-white'
              : 'bg-[#252016] text-[#FAF8F5] border border-[#C5A059]'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar (Tablet-First with View Switcher & Bulk Word+Folder Ingest CTA) */}
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenBulkIngestModal={() => setIsBulkIngestModalOpen(true)}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenColumnModal={() => setIsColumnModalOpen(true)}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        onResetSeed={handleResetSeed}
        isExporting={isExporting}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 flex flex-col min-w-0 overflow-x-hidden ${
          selectedPaintingIdsForTag.size > 0 ? 'pb-24 sm:pb-28' : ''
        }`}
      >
        {/* KPI Dashboard Cards & Filter Toolbar (Only in Inventory Management Mode so Exhibition Mode gets 100% viewport for paintings) */}
        {activeView === 'inventory' && (
          <>
            <KpiCards
              stats={stats}
              onFilterStatus={(status) => {
                if (status === 'da_ban') {
                  setInventorySubTab('da_ban');
                  setPendingPriceOnly(false);
                } else if (status === 'pending_price') {
                  setInventorySubTab('chua_ban');
                  setPendingPriceOnly(true);
                } else {
                  setInventorySubTab('chua_ban');
                  setPendingPriceOnly(false);
                }
              }}
            />

            <FilterToolbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onQuickJumpSearch={handleQuickJumpSearch}
              onOpenQrScanner={() => setIsQrScannerOpen(true)}
              inventorySubTab={inventorySubTab}
              setInventorySubTab={setInventorySubTab}
              inStockCount={inStockTotalCount}
              soldCount={soldTotalCount}
              pendingPriceOnly={pendingPriceOnly}
              setPendingPriceOnly={setPendingPriceOnly}
              artistFilter={artistFilter}
              setArtistFilter={setArtistFilter}
              artists={artistOptions}
              mediumFilter={mediumFilter}
              setMediumFilter={setMediumFilter}
              totalTabItems={inventorySubTab === 'da_ban' ? soldTotalCount : inStockTotalCount}
              filteredCount={filteredPaintings.length}
            />
          </>
        )}

        {/* View Content: Inventory Excel Grid OR Gallery Exhibition View OR Customer CRM View */}
        {loading ? (
          <div className="bg-white border border-[#EAE5D9] p-16 text-center shadow-sm">
            <div className="animate-spin w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-[12px] text-stone-500 font-medium">
              Đang tải dữ liệu từ Database Excel (BinhMinhArt_Inventory.xlsx)...
            </p>
          </div>
        ) : activeView === 'crm' ? (
          <CustomerManagementView
            customers={customers}
            paintings={paintings}
            onOpenQuickAdd={() => setIsQuickAddCustomerOpen(true)}
            onOpenDetail={(cust) => {
              setSelectedCustomerId(cust.id);
              setIsCustomerDetailOpen(true);
            }}
            onExportExcel={handleExportCustomersExcel}
            isExporting={isExportingCustomers}
            loading={customersLoading}
          />
        ) : activeView === 'exhibition' ? (
          <ExhibitionView
            paintings={paintings}
            onOpenDetail={(painting) => openArtworkPage(painting.id)}
            onOpenLightbox={(src, title, subtitle) =>
              setLightboxData({ imageSrc: src, title, subtitle })
            }
          />
        ) : (
          <ExcelGrid
            columns={inventorySubTab === 'da_ban' ? soldColumns : columns}
            paintings={filteredPaintings}
            inventorySubTab={inventorySubTab}
            highlightedPaintingId={highlightedPaintingId}
            selectedPaintingIds={selectedPaintingIdsForTag}
            onToggleSelectPainting={handleToggleSelectPainting}
            onSelectAllPaintings={handleSelectAllPaintings}
            onReorderColumns={handleReorderColumns}
            onOpenDetail={(painting) => setDetailPainting(painting)}
            onOpenArtworkPage={(id) => openArtworkPage(id)}
            onOpenLightbox={(src, title, subtitle) =>
              setLightboxData({ imageSrc: src, title, subtitle })
            }
            onStatusChangeToSold={(painting) => setSoldQuickPainting(painting)}
            onRevertToStock={handleRevertToStock}
          />
        )}
      </main>

      {/* Floating Bulk Action Bar when paintings are selected */}
      {selectedPaintingIdsForTag.size > 0 && activeView === 'inventory' && (
        <div
          data-testid="floating-bulk-action-bar"
          className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] w-max bg-[#252016] text-[#FAF8F5] border border-[#C5A059] shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-3 transition-all"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2.5 sm:pr-3 border-r border-[#4A3E2D] shrink-0">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#C5A059] text-[#252016] font-bold text-[10.5px] sm:text-[11px] flex items-center justify-center shrink-0">
              {selectedPaintingIdsForTag.size}
            </span>
            <span className="text-[11.5px] sm:text-[12px] font-medium tracking-wide whitespace-nowrap">
              tác phẩm được chọn
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBatchTagPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-[#1A160F] text-[11px] sm:text-[11.5px] font-bold rounded transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Printer size={14} className="shrink-0" />
            <span className="whitespace-nowrap">In Tag A4 ({selectedPaintingIdsForTag.size} tranh)</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchTagStatus(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#332A1E] hover:bg-[#433829] border border-[#554632] text-stone-200 hover:text-white text-[11px] sm:text-[11.5px] font-medium rounded transition-colors cursor-pointer shrink-0"
            title="Đánh dấu các tranh đã in tag vật lý"
          >
            <CheckSquare size={13} className="text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Đánh dấu Đã In Tag</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPaintingIdsForTag(new Set())}
            className="p-1.5 text-stone-400 hover:text-white rounded hover:bg-[#332A1E] transition-colors ml-0.5 sm:ml-1 cursor-pointer shrink-0"
            title="Bỏ chọn tất cả"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Modals */}
      <QuickAddCustomerModal
        isOpen={isQuickAddCustomerOpen}
        onClose={() => setIsQuickAddCustomerOpen(false)}
        onSave={handleCreateCustomer}
      />

      <CustomerDetailModal
        isOpen={isCustomerDetailOpen}
        onClose={() => {
          setIsCustomerDetailOpen(false);
          setSelectedCustomerId(null);
        }}
        customerId={selectedCustomerId}
        paintings={paintings}
        onCustomerUpdated={() => fetchCustomers(true)}
        onCustomerDeleted={() => {
          setIsCustomerDetailOpen(false);
          setSelectedCustomerId(null);
          fetchCustomers(true);
        }}
        onOpenLightbox={(src, title, subtitle) =>
          setLightboxData({ imageSrc: src, title, subtitle })
        }
      />
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        paintings={paintings}
        onSelectPaintingId={(id) => handleQuickJumpSearch(id)}
      />
      <BulkIngestModal
        isOpen={isBulkIngestModalOpen}
        onClose={() => {
          setIsBulkIngestModalOpen(false);
          setDroppedWordFiles([]);
        }}
        initialWordFiles={droppedWordFiles}
        onIngestSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />

      {isWindowDraggingDocx && !isBulkIngestModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#7D1818]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white pointer-events-none animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-amber-400 text-[#7D1818] flex items-center justify-center mb-4 shadow-2xl animate-bounce">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-amber-200 uppercase tracking-wide">
            Thả File Word Bảng Giá (.docx) Vào Đây
          </h2>
          <p className="text-stone-200 text-sm mt-2 text-center max-w-md">
            Hệ thống sẽ tự động bóc tách tên tác phẩm, họa sĩ, chất liệu, kích thước, giá và ảnh nhúng ngay lập tức.
          </p>
        </div>
      )}

      <NetworkConfigModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        onSaved={(msg) => showToast(msg)}
      />

      <AddPaintingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddPainting}
        existingArtists={artistOptions.map(a => a.name)}
        existingPaintings={paintings}
      />

      <PaintingDetailModal
        isOpen={!!detailPainting}
        onClose={() => setDetailPainting(null)}
        painting={detailPainting}
        onSave={handleSaveDetail}
        onDelete={handleDeletePainting}
        onOpenLightbox={(src, title, subtitle) =>
          setLightboxData({ imageSrc: src, title, subtitle })
        }
      />

      <ColumnManagerModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={inventorySubTab === 'da_ban' ? soldColumns : columns}
        subTabTitle={inventorySubTab === 'da_ban' ? 'Tranh Đã Bán' : 'Kho Chưa Bán'}
        onToggleVisibility={handleToggleColumnVisibility}
        onReorderColumns={handleReorderColumns}
        onResetColumns={handleResetColumns}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />

      <LightboxModal
        isOpen={!!lightboxData}
        onClose={() => setLightboxData(null)}
        imageSrc={lightboxData?.imageSrc}
        title={lightboxData?.title}
        subtitle={lightboxData?.subtitle}
      />

      <SoldQuickModal
        isOpen={!!soldQuickPainting}
        onClose={() => setSoldQuickPainting(null)}
        painting={soldQuickPainting}
        onConfirm={handleSoldConfirm}
      />

      <BatchTagPrintModal
        isOpen={isBatchTagPrintModalOpen}
        onClose={() => setIsBatchTagPrintModalOpen(false)}
        paintings={paintings.filter(p => selectedPaintingIdsForTag.has(p.id))}
        onUpdateTagStatus={async (ids, status) => {
          try {
            await fetch('/api/paintings/batch-tag-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids, da_in_tag: status })
            });
            fetchData(true);
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
