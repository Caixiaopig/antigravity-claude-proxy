/**
 * API Key Authentication Middleware
 *
 * Express middleware that validates API keys for protected endpoints.
 * Public endpoints (like /health) are skipped.
 *
 * Environment variable SKIP_API_KEY_AUTH=true disables authentication
 * (for development only).
 */

import { validateKey, hasKeys, getEnabledKeyCount } from './api-key-manager.js';

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
    '/health'
];

/**
 * Check if a path is a public endpoint
 * @param {string} path - Request path
 * @returns {boolean} True if public
 */
function isPublicEndpoint(path) {
    return PUBLIC_ENDPOINTS.some(ep => path === ep || path.startsWith(ep + '/'));
}

/**
 * API Key authentication middleware
 */
export function apiKeyMiddleware(req, res, next) {
    // Skip for public endpoints
    if (isPublicEndpoint(req.path)) {
        return next();
    }

    // Skip if authentication is disabled (development only)
    if (process.env.SKIP_API_KEY_AUTH === 'true') {
        return next();
    }

    // Check if any keys are configured
    if (!hasKeys()) {
        return res.status(503).json({
            error: {
                type: 'configuration_error',
                message: 'No API keys configured. Please run: npm run api-keys:add'
            }
        });
    }

    // Get API key from header
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: {
                type: 'authentication_error',
                message: 'Missing API key. Please provide x-api-key header.'
            }
        });
    }

    // Validate the key
    const keyInfo = validateKey(apiKey);

    if (!keyInfo) {
        return res.status(401).json({
            error: {
                type: 'authentication_error',
                message: 'Invalid API key.'
            }
        });
    }

    if (!keyInfo.enabled) {
        return res.status(401).json({
            error: {
                type: 'authentication_error',
                message: 'API key is disabled.'
            }
        });
    }

    // Attach key info to request for logging/auditing
    req.apiKeyInfo = keyInfo;

    next();
}

/**
 * Get authentication status for startup display
 * @returns {Object} Status info
 */
export function getAuthStatus() {
    const keyCount = getEnabledKeyCount();
    const hasAnyKeys = hasKeys();
    const isDisabled = process.env.SKIP_API_KEY_AUTH === 'true';

    return {
        enabled: !isDisabled && hasAnyKeys,
        keyCount,
        isDisabled,
        message: isDisabled
            ? 'API Key Auth: DISABLED (SKIP_API_KEY_AUTH=true)'
            : hasAnyKeys
                ? `API Key Auth: Enabled (${keyCount} active key${keyCount !== 1 ? 's' : ''})`
                : 'API Key Auth: No keys configured!'
    };
}

/**
 * Print API Key auth status to console (call after server starts)
 * Minimal integration point for index.js
 */
export function printAuthStatus() {
    const status = getAuthStatus();

    if (status.isDisabled) {
        console.log('  ⚠️  API Key Auth: DISABLED (dev mode)');
    } else if (status.enabled) {
        console.log(`  ✅ API Key Auth: ${status.keyCount} active key(s)`);
    } else {
        console.log('  ⚠️  API Key Auth: No keys configured!');
        console.log('      Run: npm run api-keys:add');
    }
    console.log('');
}

export default {
    apiKeyMiddleware,
    getAuthStatus,
    printAuthStatus
};
