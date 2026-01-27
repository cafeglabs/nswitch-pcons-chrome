/**
 * Encrypted Storage Utilities
 * Handles secure storage of Nintendo authentication tokens
 */

class SecureStorage {
  constructor() {
    this.STORAGE_KEY = 'nintendo_auth_data';
    this.ENCRYPTION_KEY_NAME = 'nintendo_encryption_key';
  }

  /**
   * Generate or retrieve encryption key
   */
  async getEncryptionKey() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.ENCRYPTION_KEY_NAME], async (result) => {
        if (result[this.ENCRYPTION_KEY_NAME]) {
          // Import existing key
          try {
            const keyData = this._base64ToArrayBuffer(result[this.ENCRYPTION_KEY_NAME]);
            const key = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'AES-GCM' },
              true,
              ['encrypt', 'decrypt']
            );
            resolve(key);
          } catch (error) {
            reject(error);
          }
        } else {
          // Generate new key
          try {
            const key = await crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt']
            );

            // Store key
            const exportedKey = await crypto.subtle.exportKey('raw', key);
            const keyBase64 = this._arrayBufferToBase64(exportedKey);

            chrome.storage.local.set({ [this.ENCRYPTION_KEY_NAME]: keyBase64 }, () => {
              resolve(key);
            });
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  /**
   * Encrypt data
   */
  async encrypt(data) {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedData
    );

    return {
      iv: this._arrayBufferToBase64(iv),
      data: this._arrayBufferToBase64(encryptedData)
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedObj) {
    const key = await this.getEncryptionKey();
    const iv = this._base64ToArrayBuffer(encryptedObj.iv);
    const encryptedData = this._base64ToArrayBuffer(encryptedObj.data);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }

  /**
   * Save authentication data
   */
  async saveAuthData(authData) {
    const encrypted = await this.encrypt(authData);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: encrypted }, () => {
        resolve();
      });
    });
  }

  /**
   * Load authentication data
   */
  async loadAuthData() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.STORAGE_KEY], async (result) => {
        if (result[this.STORAGE_KEY]) {
          try {
            const decrypted = await this.decrypt(result[this.STORAGE_KEY]);
            resolve(decrypted);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Clear authentication data
   */
  async clearAuthData() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.STORAGE_KEY], () => {
        resolve();
      });
    });
  }

  /**
   * Clear all data including encryption key
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  /**
   * Convert ArrayBuffer to base64
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  _base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureStorage };
}
