import { useState, useCallback } from "react";
import { uploadE2EEPublicKey, fetchE2EEPublicKey } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

const DB_NAME = "CipherNetE2EE";
const STORE_NAME = "keypair";
const KEY_ALGO = { name: "ECDH", namedCurve: "P-256" };

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Helper to store private key in DB
async function savePrivateKey(userId, privateKey) {
  if (!userId) throw new Error("User ID is required to save private key.");
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(privateKey, `privateKey_${userId}`);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

// Helper to load private key from DB
async function loadPrivateKey(userId) {
  if (!userId) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`privateKey_${userId}`);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Helper to store public key string in DB
async function savePublicKeyString(userId, publicKeyString) {
  if (!userId) throw new Error("User ID is required to save public key.");
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(publicKeyString, `publicKey_${userId}`);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

// Helper to load public key string from DB
async function loadPublicKeyString(userId) {
  if (!userId) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`publicKey_${userId}`);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Cache derived session keys in-memory for performance
const derivedKeysCache = {}; // Map of currentUserId_contactUserId -> CryptoKey (AES-GCM)

export function useE2EE() {
  const { user } = useAuthStore();
  const currentUserId = user?._id;
  const [encrypting, setEncrypting] = useState(false);
  const [keysReady, setKeysReady] = useState(false);

  // Helper to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = useCallback((buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }, []);

  // Helper to convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }, []);

  // 1. Generate ECDH Key Pair & Upload Public Key
  const generateAndRegisterKeys = useCallback(async () => {
    if (!currentUserId) return;
    try {
      // Load our private key and public key string from IndexedDB
      const existingPrivateKey = await loadPrivateKey(currentUserId);
      const existingPublicKeyString = await loadPublicKeyString(currentUserId);
      const serverPublicKey = user?.publicKey;

      // If we have local keys AND they match the server's public key, we are good!
      if (existingPrivateKey && existingPublicKeyString && serverPublicKey && existingPublicKeyString === serverPublicKey) {
        console.log("E2EE: Keys already generated and synchronized with server.");
        setKeysReady(true);
        return;
      }

      // If we have local keys but server is missing or mismatched, re-upload local public key to preserve chat history
      if (existingPrivateKey && existingPublicKeyString && (!serverPublicKey || serverPublicKey !== existingPublicKeyString)) {
        console.log("E2EE: Local keys exist but server public key is missing or mismatched. Re-uploading local public key...");
        try {
          await uploadE2EEPublicKey(existingPublicKeyString);
          // Sync with auth store
          if (user) {
            useAuthStore.setState({ user: { ...user, publicKey: existingPublicKeyString } });
          }
          console.log("E2EE: Public key synchronized with server successfully.");
          setKeysReady(true);
          return;
        } catch (uploadErr) {
          console.warn("E2EE: Failed to sync existing public key, generating new keys instead:", uploadErr.message);
        }
      }

      console.log("E2EE: Generating new ECDH P-256 key pair...");
      const keyPair = await window.crypto.subtle.generateKey(
        KEY_ALGO,
        true, // extractable
        ["deriveKey", "deriveBits"]
      );

      // Save Private Key locally in IndexedDB
      await savePrivateKey(currentUserId, keyPair.privateKey);

      // Export Public Key to JWK format
      const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      const publicKeyString = JSON.stringify(publicKeyJWK);

      // Save Public Key string locally in IndexedDB
      await savePublicKeyString(currentUserId, publicKeyString);

      // Upload to backend profile
      await uploadE2EEPublicKey(publicKeyString);

      // Sync with auth store
      if (user) {
        useAuthStore.setState({ user: { ...user, publicKey: publicKeyString } });
      }

      console.log("E2EE: New public key uploaded and registered successfully.");
      setKeysReady(true);
    } catch (err) {
      console.error("E2EE key registration error:", err.message);
    }
  }, [currentUserId, user]);

  // 2. Derive Shared AES-256 Symmetric Key
  const deriveSessionKey = useCallback(async (contactUserId) => {
    if (!currentUserId) throw new Error("Logged in user ID is required to derive key.");
    const cacheKey = `${currentUserId}_${contactUserId}`;
    // Return cached key if available
    if (derivedKeysCache[cacheKey]) {
      return derivedKeysCache[cacheKey];
    }

    try {
      // Fetch contact's public key from server
      const contactKeyData = await fetchE2EEPublicKey(contactUserId);
      if (!contactKeyData || !contactKeyData.publicKey) {
        throw new Error("Contact does not have E2EE public key.");
      }

      // Import contact's public key
      const contactPublicKeyJWK = JSON.parse(contactKeyData.publicKey);
      const contactPublicKey = await window.crypto.subtle.importKey(
        "jwk",
        contactPublicKeyJWK,
        KEY_ALGO,
        true,
        [] // No key usages are specified for importing public key during derivation
      );

      // Load our private key from IndexedDB
      const ourPrivateKey = await loadPrivateKey(currentUserId);
      if (!ourPrivateKey) {
        throw new Error("Device private key not found. Regenerate keys in settings.");
      }

      console.log(`E2EE: Performing ECDH key agreement with User ${contactUserId}...`);
      
      // Derive 256-bit AES-GCM key
      const sharedAESKey = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: contactPublicKey
        },
        ourPrivateKey,
        {
          name: "AES-GCM",
          length: 256
        },
        true, // exportable
        ["encrypt", "decrypt"]
      );

      // Cache derived key
      derivedKeysCache[cacheKey] = sharedAESKey;
      return sharedAESKey;
    } catch (err) {
      console.error(`E2EE key derivation error for user ${contactUserId}:`, err.message);
      throw err;
    }
  }, [currentUserId]);

  // 3. Encrypt Plaintext message
  const encryptMessage = useCallback(async (plaintext, contactUserId) => {
    setEncrypting(true);
    try {
      const sessionKey = await deriveSessionKey(contactUserId);
      
      // Generate random 12-byte IV (nonce)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        sessionKey,
        plaintextBuffer
      );

      const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
      const ivBase64 = arrayBufferToBase64(iv);

      setEncrypting(false);
      return {
        ciphertext: ciphertextBase64,
        iv: ivBase64
      };
    } catch (err) {
      setEncrypting(false);
      console.error("Encryption failed:", err.message);
      throw err;
    }
  }, [deriveSessionKey, arrayBufferToBase64]);

  // 4. Decrypt Ciphertext message
  const decryptMessage = useCallback(async (ciphertextBase64, ivBase64, contactUserId) => {
    try {
      const sessionKey = await deriveSessionKey(contactUserId);
      const ciphertext = base64ToArrayBuffer(ciphertextBase64);
      const iv = base64ToArrayBuffer(ivBase64);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(iv)
        },
        sessionKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (err) {
      console.warn(`Decryption failed for user ${contactUserId}, retrying with fresh key... Error:`, err.message);
      try {
        // Clear cached session key
        const cacheKey = `${currentUserId}_${contactUserId}`;
        delete derivedKeysCache[cacheKey];

        // Force derivation (which fetches fresh public key since cache is cleared)
        const sessionKey = await deriveSessionKey(contactUserId);
        const ciphertext = base64ToArrayBuffer(ciphertextBase64);
        const iv = base64ToArrayBuffer(ivBase64);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: new Uint8Array(iv)
          },
          sessionKey,
          ciphertext
        );

        const decoder = new TextDecoder();
        console.log(`Decryption retry successful for user ${contactUserId}!`);
        return decoder.decode(decryptedBuffer);
      } catch (retryErr) {
        console.error(`Decryption retry also failed for user ${contactUserId}:`, retryErr.message);
        return "[Decryption failed: Key handshake incomplete]";
      }
    }
  }, [currentUserId, deriveSessionKey, base64ToArrayBuffer]);

  return {
    encrypting,
    keysReady,
    generateAndRegisterKeys,
    encryptMessage,
    decryptMessage
  };
}
