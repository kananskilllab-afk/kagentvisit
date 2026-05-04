'use strict';
/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    forceExit: true,
    // Increase timeout for integration tests that may await DB operations
    testTimeout: 15000,
    // Suppress noisy console output during test runs
    silent: false
};
