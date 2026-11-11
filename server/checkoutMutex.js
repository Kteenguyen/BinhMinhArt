// server/checkoutMutex.js
/**
 * Concurrency Mutex ensuring serialized, atomic checkout execution.
 * Prevents double-selling unique physical artworks across concurrent client requests.
 */
export class AsyncMutex {
  constructor() {
    this._queue = Promise.resolve();
  }

  async runExclusive(callback) {
    let release;
    const waitPromise = new Promise(resolve => {
      release = resolve;
    });
    const previousQueue = this._queue;
    this._queue = previousQueue.catch(() => {}).then(() => waitPromise);
    await previousQueue.catch(() => {});
    try {
      return await callback();
    } finally {
      release();
    }
  }
}

export const checkoutMutex = new AsyncMutex();
export default checkoutMutex;
