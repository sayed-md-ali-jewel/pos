import axios from 'axios';

const DB_NAME = 'mr-trading-pos';
const DB_VERSION = 1;
const PRODUCT_STORE = 'products';
const CUSTOMER_STORE = 'customers';
const SALE_QUEUE_STORE = 'saleQueue';

export interface QueuedSale {
  id: string;
  payload: any;
  token?: string | null;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) db.createObjectStore(PRODUCT_STORE);
      if (!db.objectStoreNames.contains(CUSTOMER_STORE)) db.createObjectStore(CUSTOMER_STORE);
      if (!db.objectStoreNames.contains(SALE_QUEUE_STORE))
        db.createObjectStore(SALE_QUEUE_STORE, { keyPath: 'id' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const cacheProducts = (products: any[]) =>
  withStore(PRODUCT_STORE, 'readwrite', (store) => store.put(products, 'all'));
export const getCachedProducts = () =>
  withStore<any[]>(PRODUCT_STORE, 'readonly', (store) => store.get('all'));

export const cacheCustomers = (customers: any[]) =>
  withStore(CUSTOMER_STORE, 'readwrite', (store) => store.put(customers, 'all'));
export const getCachedCustomers = () =>
  withStore<any[]>(CUSTOMER_STORE, 'readonly', (store) => store.get('all'));

export const queueSale = (payload: any, token?: string | null) => {
  const queuedSale: QueuedSale = {
    id: `offline-sale-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    payload,
    token,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  return withStore(SALE_QUEUE_STORE, 'readwrite', (store) => store.add(queuedSale));
};

export const getQueuedSales = () =>
  withStore<QueuedSale[]>(SALE_QUEUE_STORE, 'readonly', (store) => store.getAll());

export const removeQueuedSale = (id: string) =>
  withStore<undefined>(SALE_QUEUE_STORE, 'readwrite', (store) => store.delete(id));

export const updateQueuedSale = (sale: QueuedSale) =>
  withStore<IDBValidKey>(SALE_QUEUE_STORE, 'readwrite', (store) => store.put(sale));

export const syncQueuedSales = async () => {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const queuedSales = await getQueuedSales();
  let synced = 0;
  let failed = 0;

  for (const sale of queuedSales) {
    try {
      await updateQueuedSale({ ...sale, status: 'syncing', error: undefined });
      await axios.post('/api/sales', sale.payload, {
        headers: sale.token ? { Authorization: `Bearer ${sale.token}` } : undefined,
      });
      await removeQueuedSale(sale.id);
      synced += 1;
    } catch (error: any) {
      failed += 1;
      await updateQueuedSale({
        ...sale,
        status: 'failed',
        error: error.response?.data?.message || error.message || 'Sync failed',
      });
    }
  }

  return { synced, failed };
};
