// server/googleSheetSingleton.js
import { formatCompoundLocation, parseCompoundLocation } from '../src/utils/location.js';

// DÁN ĐƯỜNG DẪN WEB APP URL CỦA GOOGLE APPS SCRIPT VÀO ĐÂY (hoặc đặt trong biến môi trường GOOGLE_SHEET_URL)
const APPS_SCRIPT_URL = process.env.GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbx-VdoMZvfi3-41sq_HyB8qdImGVWbdPbuxe5hc1PmSXoodkBi4Jm8DIvClEB0FnnCF/exec';

class GoogleSheetSingleton {
    constructor() {
        if (GoogleSheetSingleton.instance) {
            return GoogleSheetSingleton.instance;
        }

        this.url = APPS_SCRIPT_URL;
        this.isInitialized = false;
        this.pendingWrites = 0;
        this.pollTimer = null;

        // Bộ nhớ RAM lưu trữ toàn bộ 6 bảng giống hệt cấu trúc SQLite & JSON
        this.tables = {
            paintings: [],
            location_history: [],
            customers: [],
            customer_interests: [],
            custom_locations: [],
            meta: []
        };

        // Hàng đợi đồng bộ ngầm lên Google Sheets để không làm nghẽn (block) luồng chính
        this.writeQueue = Promise.resolve();

        GoogleSheetSingleton.instance = this;
    }

    isConfigured() {
        return Boolean(this.url && !this.url.includes('DÁN_URL_WEB_APP'));
    }

    /**
     * Khởi tạo: Tải toàn bộ dữ liệu từ Google Sheets về RAM khi bật Server
     */
    async init() {
        if (this.isInitialized) return;
        if (!this.isConfigured()) {
            console.warn('⚠️ [GoogleSheetSingleton] Chưa cấu hình GOOGLE_SHEET_URL! Đang chạy với dữ liệu trống trong RAM.');
            this.isInitialized = true;
            return;
        }

        console.log('🔄 [GoogleSheetSingleton] Đang tải toàn bộ CSDL từ Google Sheets...');
        await this.pullAllTables();
        this.isInitialized = true;

        console.log('✅ [GoogleSheetSingleton] Đồng bộ thành công! Số lượng bản ghi:', {
            paintings: this.tables.paintings.length,
            customers: this.tables.customers.length,
            customer_interests: this.tables.customer_interests.length,
            location_history: this.tables.location_history.length,
            custom_locations: this.tables.custom_locations.length
        });

        // Tự động đồng bộ ngầm mỗi 20 giây nếu có thay đổi trực tiếp trên Google Sheet ở máy khác
        this.startPolling(20000);
    }

    async pullAllTables() {
        if (!this.isConfigured() || this.pendingWrites > 0) return;
        const tableNames = Object.keys(this.tables);

        await Promise.all(
            tableNames.map(async (table) => {
                try {
                    const res = await fetch(`${this.url}?table=${encodeURIComponent(table)}`, {
                        method: 'GET',
                        redirect: 'follow'
                    });
                    const json = await res.json();
                    if (json && json.status === 'success' && Array.isArray(json.data) && this.pendingWrites === 0) {
                        this.tables[table] = this._normalizeTable(table, json.data);
                    }
                } catch (err) {
                    console.error(`❌ [GoogleSheetSingleton] Lỗi khi tải bảng "${table}":`, err.message);
                }
            })
        );
    }

    startPolling(intervalMs = 20000) {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => {
            if (this.pendingWrites === 0) {
                this.pullAllTables().catch(() => { });
            }
        }, intervalMs);
        if (this.pollTimer.unref) this.pollTimer.unref();
    }

    /**
     * Chuẩn hóa kiểu dữ liệu từ Google Sheets về đúng kiểu của SQLite (Number, Array JSON, null...)
     */
    _normalizeTable(table, rows) {
        if (table === 'paintings') {
            return rows
                .filter((r) => r && String(r.id || '').trim() !== '')
                .map((r, idx) => {
                    const parsedLoc = parseCompoundLocation(r.location, r.location_level1, r.location_level2);
                    return {
                        ...r,
                        id: String(r.id || '').trim(),
                        position: r.position !== '' && r.position !== undefined && r.position !== null ? Number(r.position) : idx,
                        tinh_trang: r.tinh_trang === 'da_ban' ? 'da_ban' : 'chua_ban',
                        gia: r.gia === '' || r.gia === null || r.gia === undefined ? null : Number(r.gia),
                        ngay_ban: r.ngay_ban === '' || r.ngay_ban === undefined || r.ngay_ban === null ? null : String(r.ngay_ban),
                        hinh_anh: Array.isArray(r.hinh_anh)
                            ? r.hinh_anh
                            : typeof r.hinh_anh === 'string' && r.hinh_anh.trim().startsWith('[')
                                ? JSON.parse(r.hinh_anh)
                                : [],
                        da_in_tag: r.da_in_tag === 1 || r.da_in_tag === true || r.da_in_tag === '1' ? 1 : 0,
                        location_level1: parsedLoc.location_level1,
                        location_level2: parsedLoc.location_level2,
                        location: formatCompoundLocation(parsedLoc.location_level1, parsedLoc.location_level2)
                    };
                });
        }

        if (table === 'customers') {
            return rows
                .filter((r) => r && r.id !== '' && r.id !== undefined)
                .map((r) => ({
                    ...r,
                    id: Number(r.id)
                }));
        }

        if (table === 'location_history') {
            return rows
                .filter((r) => r && r.id !== '' && r.id !== undefined)
                .map((r) => {
                    const fromParsed = parseCompoundLocation(r.from_location, r.from_location_level1, r.from_location_level2);
                    const toParsed = parseCompoundLocation(r.to_location, r.to_location_level1, r.to_location_level2);
                    return {
                        ...r,
                        id: Number(r.id),
                        painting_id: String(r.painting_id || '').trim(),
                        from_location: formatCompoundLocation(fromParsed.location_level1, fromParsed.location_level2),
                        from_location_level1: fromParsed.location_level1,
                        from_location_level2: fromParsed.location_level2,
                        to_location: formatCompoundLocation(toParsed.location_level1, toParsed.location_level2),
                        to_location_level1: toParsed.location_level1,
                        to_location_level2: toParsed.location_level2,
                        timestamp: String(r.timestamp || ''),
                        note: String(r.note || '')
                    };
                });
        }

        if (table === 'customer_interests') {
            return rows
                .filter((r) => r && r.id !== '' && r.id !== undefined)
                .map((r) => ({
                    ...r,
                    id: Number(r.id),
                    customer_id: Number(r.customer_id),
                    deal_price:
                        r.deal_price === '' || r.deal_price === null || r.deal_price === undefined ? null : Number(r.deal_price)
                }));
        }

        if (table === 'custom_locations') {
            return rows
                .map((r) => ({
                    location_name: typeof r === 'string' ? r.trim() : String(r.location_name || '').trim()
                }))
                .filter((r) => r.location_name);
        }

        if (table === 'meta') {
            return rows
                .filter((r) => r && r.key)
                .map((r) => ({
                    key: String(r.key),
                    value: r.value !== undefined && r.value !== null ? String(r.value) : ''
                }));
        }

        return rows;
    }

    // ============================================================================
    // CÁC HÀM ĐỌC/GHI ĐỒNG BỘ (SYNCHRONOUS) DÙNG CHO TOÀN CỤC
    // ============================================================================

    getAll(table) {
        return this.tables[table] || [];
    }

    getById(table, idVal, pkField = 'id') {
        const list = this.tables[table] || [];
        return list.find((item) => String(item[pkField]) === String(idVal)) || null;
    }

    insert(table, rowObj, pkField = 'id') {
        const list = this.tables[table];
        if (!list) throw new Error(`Bảng không tồn tại: ${table}`);

        const copy = { ...rowObj };

        if (['customers', 'customer_interests', 'location_history'].includes(table) && !copy.id) {
            const maxId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
            copy.id = maxId + 1;
        }

        list.push(copy);
        this._enqueueSync({ action: 'insert', table, data: copy });
        return copy;
    }

    update(table, idVal, updates, pkField = 'id') {
        const list = this.tables[table];
        if (!list) throw new Error(`Bảng không tồn tại: ${table}`);

        const idx = list.findIndex((item) => String(item[pkField]) === String(idVal));
        if (idx === -1) {
            if (table === 'meta') {
                const newMeta = { key: String(idVal), value: String(updates.value ?? '') };
                list.push(newMeta);
                this._enqueueSync({ action: 'update', table: 'meta', id: idVal, data: newMeta });
                return newMeta;
            }
            return null;
        }

        list[idx] = { ...list[idx], ...updates };
        this._enqueueSync({ action: 'update', table, id: idVal, data: updates });
        return list[idx];
    }

    delete(table, idVal, pkField = 'id') {
        const list = this.tables[table];
        if (!list) throw new Error(`Bảng không tồn tại: ${table}`);

        const beforeLen = list.length;
        this.tables[table] = list.filter((item) => String(item[pkField]) !== String(idVal));
        const deletedCount = beforeLen - this.tables[table].length;

        if (table === 'customers' && deletedCount > 0) {
            this.tables.customer_interests = this.tables.customer_interests.filter(
                (ci) => String(ci.customer_id) !== String(idVal)
            );
        }

        if (deletedCount > 0) {
            this._enqueueSync({ action: 'delete', table, id: idVal });
        }
        return deletedCount > 0;
    }

    replaceAll(table, newRows) {
        this.tables[table] = [...newRows];
        this._enqueueSync({ action: 'replace_all', table, data: newRows });
        return this.tables[table];
    }

    _enqueueSync(payload) {
        if (!this.isConfigured()) return;

        this.pendingWrites += 1;
        this.writeQueue = this.writeQueue
            .then(async () => {
                const res = await fetch(this.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    redirect: 'follow',
                    signal: AbortSignal.timeout(8000)
                });
                const result = await res.json();
                if (result.error) {
                    console.error(`⚠️ [GoogleSheetSingleton] Lỗi từ Apps Script (${payload.action} -> ${payload.table}):`, result.error);
                }
            })
            .catch((err) => {
                console.error(`❌ [GoogleSheetSingleton] Lỗi kết nối khi đồng bộ (${payload.action} -> ${payload.table}):`, err.message);
            })
            .finally(() => {
                this.pendingWrites = Math.max(0, this.pendingWrites - 1);
            });
    }
}

const sheetDB = new GoogleSheetSingleton();
export default sheetDB;