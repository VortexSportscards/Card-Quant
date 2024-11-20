import { openDB, IDBPDatabase } from 'idb';
import { User, InventoryItem, Stream, InventoryCheck, InventoryChange } from './types';

const DB_NAME = 'cardquant_db';
const DB_VERSION = 1;

const STORES = {
  INVENTORY: 'inventory',
  STREAMS: 'streams',
  INVENTORY_CHECKS: 'inventory_checks',
  INVENTORY_CHANGES: 'inventory_changes',
  CATEGORIES: 'categories',
  USERS: 'users',
  CURRENT_USER: 'current_user'
} as const;

class StorageManager {
  private static instance: StorageManager;
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initDatabase();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create stores with keyPath configuration
          if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
            db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.STREAMS)) {
            db.createObjectStore(STORES.STREAMS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.INVENTORY_CHECKS)) {
            db.createObjectStore(STORES.INVENTORY_CHECKS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.INVENTORY_CHANGES)) {
            db.createObjectStore(STORES.INVENTORY_CHANGES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
            db.createObjectStore(STORES.CATEGORIES);
          }
          if (!db.objectStoreNames.contains(STORES.USERS)) {
            db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.CURRENT_USER)) {
            db.createObjectStore(STORES.CURRENT_USER);
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.db = null;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initPromise;
    }
  }

  private async getFromStore<T>(storeName: string, defaultValue: T): Promise<T> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        
        let value: T;
        if (store.keyPath) {
          // For stores with keyPath, get all items
          value = await store.getAll() as T;
        } else {
          // For stores without keyPath, get by key
          value = await store.get('data') as T;
        }
        
        await tx.done;
        return value ?? defaultValue;
      }
    } catch (error) {
      console.error(`Error reading from ${storeName}:`, error);
    }

    return this.getFromLocalStorage(storeName, defaultValue);
  }

  private async saveToStore<T>(storeName: string, data: T): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.db) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        if (store.keyPath) {
          // For stores with keyPath, use put for each item in array
          if (Array.isArray(data)) {
            await Promise.all(data.map(item => store.put(item)));
          } else {
            await store.put(data);
          }
        } else {
          // For stores without keyPath, use put with explicit key
          await store.put(data, 'data');
        }
        
        await tx.done;
        this.saveToLocalStorage(storeName, data);
        this.broadcastChange(storeName, data);
      }
    } catch (error) {
      console.error(`Error saving to ${storeName}:`, error);
      this.saveToLocalStorage(storeName, data);
    }
  }

  private getFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`cardquant_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for ${key}:`, error);
      return defaultValue;
    }
  }

  private saveToLocalStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`cardquant_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage for ${key}:`, error);
    }
  }

  private broadcastChange<T>(key: string, data: T): void {
    window.dispatchEvent(new StorageEvent('storage', {
      key: `cardquant_${key}`,
      newValue: JSON.stringify(data),
      storageArea: localStorage
    }));
  }

  async saveInventory(inventory: InventoryItem[]): Promise<void> {
    await this.saveToStore(STORES.INVENTORY, inventory);
  }

  async loadInventory(defaultInventory: InventoryItem[]): Promise<InventoryItem[]> {
    return this.getFromStore(STORES.INVENTORY, defaultInventory);
  }

  async saveStreams(streams: Stream[]): Promise<void> {
    await this.saveToStore(STORES.STREAMS, streams);
  }

  async loadStreams(defaultStreams: Stream[]): Promise<Stream[]> {
    return this.getFromStore(STORES.STREAMS, defaultStreams);
  }

  async saveInventoryChecks(checks: InventoryCheck[]): Promise<void> {
    await this.saveToStore(STORES.INVENTORY_CHECKS, checks);
  }

  async loadInventoryChecks(defaultChecks: InventoryCheck[]): Promise<InventoryCheck[]> {
    return this.getFromStore(STORES.INVENTORY_CHECKS, defaultChecks);
  }

  async saveInventoryChanges(changes: InventoryChange[]): Promise<void> {
    await this.saveToStore(STORES.INVENTORY_CHANGES, changes);
  }

  async loadInventoryChanges(defaultChanges: InventoryChange[]): Promise<InventoryChange[]> {
    return this.getFromStore(STORES.INVENTORY_CHANGES, defaultChanges);
  }

  async saveCategories(categories: string[]): Promise<void> {
    await this.saveToStore(STORES.CATEGORIES, categories);
  }

  async loadCategories(defaultCategories: string[]): Promise<string[]> {
    return this.getFromStore(STORES.CATEGORIES, defaultCategories);
  }

  async saveUsers(users: User[]): Promise<void> {
    await this.saveToStore(STORES.USERS, users);
  }

  async loadUsers(defaultUsers: User[]): Promise<User[]> {
    return this.getFromStore(STORES.USERS, defaultUsers);
  }

  async saveCurrentUser(user: User | null): Promise<void> {
    await this.saveToStore(STORES.CURRENT_USER, user);
  }

  async loadCurrentUser(): Promise<User | null> {
    return this.getFromStore<User | null>(STORES.CURRENT_USER, null);
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    
    if (this.db) {
      const stores = this.db.objectStoreNames;
      const tx = this.db.transaction([...stores], 'readwrite');
      await Promise.all([...stores].map(store => tx.objectStore(store).clear()));
      await tx.done;
    }

    Object.values(STORES).forEach(store => {
      localStorage.removeItem(`cardquant_${store}`);
    });
  }

  async resetDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
    }

    await deleteDB(DB_NAME);
    this.initPromise = this.initDatabase();
    await this.initPromise;
  }
}

async function deleteDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export const storage = StorageManager.getInstance();