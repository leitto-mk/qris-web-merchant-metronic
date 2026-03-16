/**
 * Service for handling cryptographic operations using the Web Crypto API.
 */
const DB_NAME = 'BSG-MRCH-STORE';
const STORE_NAME = 'bsg-webmrch-key';
const KEY_NAME = 'bsg-web-assigned-trm';

const CryptoService = {
  /**
   * Opens IndexedDB and returns a Promise
   */
  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  /**
   * Generates a new RSA-PSS key pair for signing and verification.
   * @returns {Promise<{publicKey: string, privateKey: CryptoKey}>}
   */
  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      false, // extractable
      ['sign']
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    return {
      publicKey: publicKeyBase64,
      privateKey: keyPair.privateKey,
    };
  },

  /**
   * Signs a challenge string using the private key.
   * @param {CryptoKey} privateKey
   * @param {string} challenge
   * @returns {Promise<string>} Base64 encoded signature
   */
  async signChallenge(privateKey, challenge) {
    const encoder = new TextEncoder();
    const data = encoder.encode(challenge);

    const signature = await window.crypto.subtle.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      privateKey,
      data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  },

  /**
   * Stores the private key in IndexedDB for persistence.
   * @param {string} kdUser
   * @param {CryptoKey} privateKey
   */
  async saveKeys(kdUser, privateKey, publicKey) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ kdUser, privateKey, publicKey }, KEY_NAME);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = (event) => {
        db.close();
        reject(event.target.error);
      };
    });
  },

  /**
   * Retrieves keys from IndexedDB.
   * @param {string} kdUser
   * @returns {Promise<{privateKey: CryptoKey, publicKey: string} | null>}
   */
  async getKeys() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      request.onsuccess = (event) => {
        db.close();
        resolve(event.target.result || null);
      };
      request.onerror = (event) => {
        db.close();
        reject(event.target.error);
      };
    });
  },

  /**
   * Returns all keys stored in IndexedDB.
   * @returns {Promise<string[]>}
   */
  async getAllStoredKeys() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = (event) => {
        db.close();
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        db.close();
        reject(event.target.error);
      };
    });
  },

  /**
   * Checks if any keys exist in the IndexedDB store.
   * @returns {Promise<boolean>}
   */
  async hasAnyKeys() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = (event) => {
        db.close();
        resolve(event.target.result > 0);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  },

  /**
   * Clears the IndexedDB store and deletes the private key.
   * @returns {Promise<void>}
   */
  async clearKeys() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = (event) => {
        db.close();
        reject(event.target.error);
      };
    });
  }
};

export default CryptoService;
