#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) Server for Google Apps Script & Google Sheets.
 * Provides direct tool access for Antigravity AI to interact with BinhMinhArt Database.
 */
import readline from 'readline';

const APPS_SCRIPT_URL =
  process.env.GOOGLE_SHEET_URL ||
  'https://script.google.com/macros/s/AKfycbx-VdoMZvfi3-41sq_HyB8qdImGVWbdPbuxe5hc1PmSXoodkBi4Jm8DIvClEB0FnnCF/exec';

// Protect JSON-RPC stdio channel: redirect all logs to stderr
const sendJsonRpc = (obj) => {
  process.stdout.write(JSON.stringify(obj) + '\n');
};

const log = (...args) => {
  process.stderr.write(`[AppScript-MCP] ${args.join(' ')}\n`);
};

// -------------------------------------------------------------
// MCP Tools Definition
// -------------------------------------------------------------
const MCP_TOOLS = [
  {
    name: 'appscript_get_status',
    description: 'Kiểm tra trạng thái kết nối tới Google Apps Script Web App và thống kê số lượng bản ghi của 6 bảng trong Google Sheets.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'appscript_get_table',
    description: 'Lấy toàn bộ dữ liệu từ một bảng trong Google Sheets (paintings, customers, location_history, customer_interests, custom_locations, meta).',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Tên bảng: paintings | customers | location_history | customer_interests | custom_locations | meta',
          enum: ['paintings', 'customers', 'location_history', 'customer_interests', 'custom_locations', 'meta'],
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'appscript_query_paintings',
    description: 'Tìm kiếm, lọc danh sách tranh trong Google Sheets theo tác giả, tên tranh, tình trạng (chua_ban / da_ban), vị trí hoặc chất liệu.',
    inputSchema: {
      type: 'object',
      properties: {
        tac_gia: { type: 'string', description: 'Tên họa sĩ (vd: Đoàn Hồng, Dương Văn Sen, Nam Anh)' },
        ten_tac_pham: { type: 'string', description: 'Tên tranh hoặc từ khóa' },
        tinh_trang: { type: 'string', enum: ['chua_ban', 'da_ban'], description: 'Tình trạng bán' },
        location: { type: 'string', description: 'Vị trí hiện tại (Kho, Phòng khách, Hành lang...)' },
        chat_lieu: { type: 'string', description: 'Chất liệu tranh (Sơn mài, Sơn dầu, Lụa...)' },
        limit: { type: 'number', description: 'Số lượng tối đa cần lấy (mặc định 20)' },
      },
    },
  },
  {
    name: 'appscript_insert_record',
    description: 'Thêm một bản ghi mới vào một bảng trong Google Sheets qua Google Apps Script.',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Tên bảng cần thêm bản ghi',
          enum: ['paintings', 'customers', 'location_history', 'customer_interests', 'custom_locations', 'meta'],
        },
        data: {
          type: 'object',
          description: 'Dữ liệu của bản ghi cần thêm',
        },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'appscript_update_record',
    description: 'Cập nhật bản ghi trong Google Sheets theo ID.',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Tên bảng',
          enum: ['paintings', 'customers', 'location_history', 'customer_interests', 'custom_locations', 'meta'],
        },
        id: {
          type: 'string',
          description: 'Giá trị khóa chính (ID tranh, ID khách hàng, hoặc key meta)',
        },
        data: {
          type: 'object',
          description: 'Các trường cần cập nhật',
        },
        pkField: {
          type: 'string',
          description: 'Tên trường khóa chính (mặc định là id, hoặc key cho bảng meta)',
        },
      },
      required: ['table', 'id', 'data'],
    },
  },
  {
    name: 'appscript_delete_record',
    description: 'Xóa bản ghi trong Google Sheets theo ID.',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Tên bảng',
          enum: ['paintings', 'customers', 'location_history', 'customer_interests', 'custom_locations', 'meta'],
        },
        id: {
          type: 'string',
          description: 'ID của bản ghi cần xóa',
        },
        pkField: {
          type: 'string',
          description: 'Tên trường khóa chính (mặc định là id)',
        },
      },
      required: ['table', 'id'],
    },
  },
];

// -------------------------------------------------------------
// Google Apps Script API Handlers
// -------------------------------------------------------------
async function fetchTable(table) {
  const res = await fetch(`${APPS_SCRIPT_URL}?table=${encodeURIComponent(table)}`, {
    method: 'GET',
    redirect: 'follow',
  });
  const json = await res.json();
  if (json && json.status === 'success' && Array.isArray(json.data)) {
    return json.data;
  }
  throw new Error(json.error || `Không thể tải bảng ${table}`);
}

async function postAction(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  return await res.json();
}

async function handleToolCall(name, args) {
  switch (name) {
    case 'appscript_get_status': {
      const tables = ['paintings', 'customers', 'location_history', 'customer_interests', 'custom_locations', 'meta'];
      const stats = {};
      await Promise.all(
        tables.map(async (t) => {
          try {
            const data = await fetchTable(t);
            stats[t] = data.length;
          } catch (e) {
            stats[t] = `Lỗi: ${e.message}`;
          }
        })
      );
      return JSON.stringify(
        {
          status: 'online',
          url: APPS_SCRIPT_URL,
          table_counts: stats,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      );
    }

    case 'appscript_get_table': {
      const { table } = args;
      const data = await fetchTable(table);
      return JSON.stringify(
        {
          table,
          total_records: data.length,
          data,
        },
        null,
        2
      );
    }

    case 'appscript_query_paintings': {
      const paintings = await fetchTable('paintings');
      let filtered = paintings;

      if (args.tac_gia) {
        const needle = args.tac_gia.toLowerCase();
        filtered = filtered.filter((p) => (p.tac_gia || '').toLowerCase().includes(needle));
      }
      if (args.ten_tac_pham) {
        const needle = args.ten_tac_pham.toLowerCase();
        filtered = filtered.filter((p) => (p.ten_tac_pham || '').toLowerCase().includes(needle));
      }
      if (args.tinh_trang) {
        filtered = filtered.filter((p) => p.tinh_trang === args.tinh_trang);
      }
      if (args.location) {
        const needle = args.location.toLowerCase();
        filtered = filtered.filter((p) => (p.location || '').toLowerCase().includes(needle));
      }
      if (args.chat_lieu) {
        const needle = args.chat_lieu.toLowerCase();
        filtered = filtered.filter((p) => (p.chat_lieu || '').toLowerCase().includes(needle));
      }

      const limit = Number(args.limit) || 20;
      const result = filtered.slice(0, limit);

      return JSON.stringify(
        {
          total_matched: filtered.length,
          returned: result.length,
          paintings: result,
        },
        null,
        2
      );
    }

    case 'appscript_insert_record': {
      const { table, data } = args;
      const res = await postAction({ action: 'insert', table, data });
      return JSON.stringify(res, null, 2);
    }

    case 'appscript_update_record': {
      const { table, id, data, pkField } = args;
      const res = await postAction({
        action: 'update',
        table,
        id,
        data,
        pkField: pkField || 'id',
      });
      return JSON.stringify(res, null, 2);
    }

    case 'appscript_delete_record': {
      const { table, id, pkField } = args;
      const res = await postAction({
        action: 'delete',
        table,
        id,
        pkField: pkField || 'id',
      });
      return JSON.stringify(res, null, 2);
    }

    default:
      throw new Error(`Tool không tồn tại: ${name}`);
  }
}

// -------------------------------------------------------------
// JSON-RPC 2.0 Dispatcher
// -------------------------------------------------------------
async function processMessage(msg) {
  const msgId = msg.id ?? null;
  const method = msg.method;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: msgId,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'appscript-mcp-server',
          version: '1.0.0',
        },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id: msgId, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: msgId,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const params = msg.params || {};
    const toolName = params.name || '';
    const args = params.arguments || {};
    try {
      const outputText = await handleToolCall(toolName, args);
      return {
        jsonrpc: '2.0',
        id: msgId,
        result: {
          content: [
            {
              type: 'text',
              text: outputText,
            },
          ],
        },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: msgId,
        result: {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Lỗi thực thi tool ${toolName}: ${err.message}`,
            },
          ],
        },
      };
    }
  }

  if (msgId !== null) {
    return {
      jsonrpc: '2.0',
      id: msgId,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  }
  return null;
}

// -------------------------------------------------------------
// Main Loop
// -------------------------------------------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    const resp = await processMessage(msg);
    if (resp !== null) {
      sendJsonRpc(resp);
    }
  } catch (err) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` },
    });
  }
});
