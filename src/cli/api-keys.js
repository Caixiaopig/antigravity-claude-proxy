#!/usr/bin/env node

/**
 * API Keys CLI
 *
 * Command-line interface for managing API keys.
 *
 * Usage:
 *   npm run api-keys:list     List all API keys
 *   npm run api-keys:add      Add a new API key
 *   npm run api-keys:remove   Remove an API key
 *   npm run api-keys:disable  Disable an API key
 */

import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';
import {
    addKey,
    removeKey,
    disableKey,
    enableKey,
    listKeys
} from '../auth/api-key-manager.js';

/**
 * Create readline interface
 */
function createRL() {
    return createInterface({ input: stdin, output: stdout });
}

/**
 * Display keys in a formatted table
 */
function displayKeys(keys) {
    if (keys.length === 0) {
        console.log('\nNo API keys configured.');
        console.log('Run: npm run api-keys:add\n');
        return;
    }

    console.log(`\n${keys.length} API key(s) configured:\n`);
    console.log('  ID              Name                 Status    Created');
    console.log('  ─────────────────────────────────────────────────────────────');

    for (const key of keys) {
        const status = key.enabled ? '✅ Active' : '⛔ Disabled';
        const date = new Date(key.createdAt).toLocaleDateString();
        const name = key.name.padEnd(20).substring(0, 20);
        console.log(`  ${key.id}  ${name} ${status}  ${date}`);
    }
    console.log('');
}

/**
 * List all API keys
 */
async function list() {
    const keys = listKeys();
    displayKeys(keys);
}

/**
 * Add a new API key
 */
async function add(rl) {
    console.log('\n=== Add New API Key ===\n');

    const name = await rl.question('Enter a name for this key (e.g., "production"): ');

    if (!name || name.trim().length === 0) {
        console.log('\n✗ Name cannot be empty.\n');
        return;
    }

    const result = addKey(name.trim());

    console.log('\n✓ API Key created successfully!\n');
    console.log(`  Name: ${result.name}`);
    console.log(`  ID:   ${result.id}`);
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════════════════╗');
    console.log(`  ║  🔑 ${result.apiKey}  ║`);
    console.log('  ╚══════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  ⚠️  IMPORTANT: Save this key now! It will not be shown again.');
    console.log('');
    console.log('  Usage:');
    console.log(`    curl -H "x-api-key: ${result.apiKey}" http://localhost:8080/v1/models`);
    console.log('');
}

/**
 * Remove an API key
 */
async function remove(rl) {
    const keys = listKeys();

    if (keys.length === 0) {
        console.log('\nNo API keys to remove.\n');
        return;
    }

    displayKeys(keys);

    const id = await rl.question('Enter the ID of the key to remove (or "cancel"): ');

    if (id.toLowerCase() === 'cancel') {
        console.log('\nCancelled.\n');
        return;
    }

    const success = removeKey(id);

    if (success) {
        console.log('\n✓ API Key removed successfully.\n');
    } else {
        console.log('\n✗ Key not found.\n');
    }
}

/**
 * Disable an API key
 */
async function disable(rl) {
    const keys = listKeys().filter(k => k.enabled);

    if (keys.length === 0) {
        console.log('\nNo active API keys to disable.\n');
        return;
    }

    console.log('\nActive API keys:\n');
    for (const key of keys) {
        console.log(`  ${key.id}  ${key.name}`);
    }
    console.log('');

    const id = await rl.question('Enter the ID of the key to disable (or "cancel"): ');

    if (id.toLowerCase() === 'cancel') {
        console.log('\nCancelled.\n');
        return;
    }

    const success = disableKey(id);

    if (success) {
        console.log('\n✓ API Key disabled.\n');
    } else {
        console.log('\n✗ Key not found.\n');
    }
}

/**
 * Enable an API key
 */
async function enable(rl) {
    const keys = listKeys().filter(k => !k.enabled);

    if (keys.length === 0) {
        console.log('\nNo disabled API keys to enable.\n');
        return;
    }

    console.log('\nDisabled API keys:\n');
    for (const key of keys) {
        console.log(`  ${key.id}  ${key.name}`);
    }
    console.log('');

    const id = await rl.question('Enter the ID of the key to enable (or "cancel"): ');

    if (id.toLowerCase() === 'cancel') {
        console.log('\nCancelled.\n');
        return;
    }

    const success = enableKey(id);

    if (success) {
        console.log('\n✓ API Key enabled.\n');
    } else {
        console.log('\n✗ Key not found.\n');
    }
}

/**
 * Show help
 */
function showHelp() {
    console.log('\nUsage:');
    console.log('  npm run api-keys:list     List all API keys');
    console.log('  npm run api-keys:add      Add a new API key');
    console.log('  npm run api-keys:remove   Remove an API key');
    console.log('  npm run api-keys:disable  Disable an API key');
    console.log('  npm run api-keys:enable   Enable a disabled API key');
    console.log('');
}

/**
 * Main CLI
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'list';

    console.log('╔════════════════════════════════════════╗');
    console.log('║     Antigravity API Key Manager        ║');
    console.log('╚════════════════════════════════════════╝');

    const rl = createRL();

    try {
        switch (command) {
            case 'list':
                await list();
                break;
            case 'add':
                await add(rl);
                break;
            case 'remove':
                await remove(rl);
                break;
            case 'disable':
                await disable(rl);
                break;
            case 'enable':
                await enable(rl);
                break;
            case 'help':
                showHelp();
                break;
            default:
                console.log(`\nUnknown command: ${command}`);
                showHelp();
        }
    } finally {
        rl.close();
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
