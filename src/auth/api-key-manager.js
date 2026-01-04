/**
 * API Key Manager
 *
 * Manages API keys for proxy authentication.
 * Keys are stored with SHA-256 hashes for security.
 *
 * Storage: ~/.config/antigravity-proxy/api-keys.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { createHash, randomBytes } from 'crypto';
import { homedir } from 'os';

// Storage path
const CONFIG_DIR = join(homedir(), '.config', 'antigravity-proxy');
const API_KEYS_PATH = join(CONFIG_DIR, 'api-keys.json');

// Key format: sk-ant-{48 random alphanumeric characters}
const KEY_PREFIX = 'sk-ant-';
const KEY_RANDOM_LENGTH = 48;

/**
 * Generate a random API key
 * Format: sk-ant-{48 alphanumeric characters}
 * @returns {string} The generated API key
 */
export function generateApiKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    const bytes = randomBytes(KEY_RANDOM_LENGTH);
    for (let i = 0; i < KEY_RANDOM_LENGTH; i++) {
        randomPart += chars[bytes[i] % chars.length];
    }
    return KEY_PREFIX + randomPart;
}

/**
 * Hash an API key using SHA-256
 * @param {string} key - The API key to hash
 * @returns {string} The hashed key with sha256: prefix
 */
export function hashKey(key) {
    const hash = createHash('sha256').update(key).digest('hex');
    return `sha256:${hash}`;
}

/**
 * Generate a unique key ID
 * @returns {string} A unique key ID
 */
function generateKeyId() {
    return 'key_' + randomBytes(8).toString('hex');
}

/**
 * Load API keys from storage
 * @returns {Object} The stored keys data
 */
function loadKeys() {
    if (!existsSync(API_KEYS_PATH)) {
        return { keys: [] };
    }
    try {
        const data = readFileSync(API_KEYS_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading API keys:', error.message);
        return { keys: [] };
    }
}

/**
 * Save API keys to storage
 * @param {Object} data - The keys data to save
 */
function saveKeys(data) {
    try {
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
        writeFileSync(API_KEYS_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving API keys:', error.message);
        throw error;
    }
}

/**
 * Add a new API key
 * @param {string} name - A friendly name for the key
 * @returns {Object} The created key info including the raw key (shown only once)
 */
export function addKey(name) {
    const apiKey = generateApiKey();
    const keyHash = hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12) + '...';
    const id = generateKeyId();

    const data = loadKeys();

    const keyInfo = {
        id,
        name,
        keyHash,
        keyPrefix,
        createdAt: new Date().toISOString(),
        enabled: true
    };

    data.keys.push(keyInfo);
    saveKeys(data);

    // Return with raw key (only shown once)
    return {
        ...keyInfo,
        apiKey // The actual key - only returned on creation
    };
}

/**
 * Remove an API key by ID
 * @param {string} id - The key ID to remove
 * @returns {boolean} True if removed, false if not found
 */
export function removeKey(id) {
    const data = loadKeys();
    const initialLength = data.keys.length;
    data.keys = data.keys.filter(k => k.id !== id);

    if (data.keys.length < initialLength) {
        saveKeys(data);
        return true;
    }
    return false;
}

/**
 * Disable an API key
 * @param {string} id - The key ID to disable
 * @returns {boolean} True if disabled, false if not found
 */
export function disableKey(id) {
    const data = loadKeys();
    const key = data.keys.find(k => k.id === id);

    if (key) {
        key.enabled = false;
        saveKeys(data);
        return true;
    }
    return false;
}

/**
 * Enable an API key
 * @param {string} id - The key ID to enable
 * @returns {boolean} True if enabled, false if not found
 */
export function enableKey(id) {
    const data = loadKeys();
    const key = data.keys.find(k => k.id === id);

    if (key) {
        key.enabled = true;
        saveKeys(data);
        return true;
    }
    return false;
}

/**
 * Validate an API key
 * @param {string} apiKey - The raw API key to validate
 * @returns {Object|null} The key info if valid, null if invalid
 */
export function validateKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return null;
    }

    // Check format
    if (!apiKey.startsWith(KEY_PREFIX)) {
        return null;
    }

    const keyHash = hashKey(apiKey);
    const data = loadKeys();

    const key = data.keys.find(k => k.keyHash === keyHash);

    if (!key) {
        return null;
    }

    // Return key info (without hash)
    return {
        id: key.id,
        name: key.name,
        enabled: key.enabled,
        createdAt: key.createdAt
    };
}

/**
 * List all API keys (without sensitive data)
 * @returns {Array} Array of key info objects
 */
export function listKeys() {
    const data = loadKeys();
    return data.keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        enabled: k.enabled,
        createdAt: k.createdAt
    }));
}

/**
 * Get count of enabled API keys
 * @returns {number} Number of enabled keys
 */
export function getEnabledKeyCount() {
    const data = loadKeys();
    return data.keys.filter(k => k.enabled).length;
}

/**
 * Check if any API keys are configured
 * @returns {boolean} True if at least one key exists
 */
export function hasKeys() {
    const data = loadKeys();
    return data.keys.length > 0;
}

export default {
    generateApiKey,
    hashKey,
    addKey,
    removeKey,
    disableKey,
    enableKey,
    validateKey,
    listKeys,
    getEnabledKeyCount,
    hasKeys
};
