// SPDX-License-Identifier: MIT
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/*.test.mjs'],
        // The real Worker-deadline probe gives its child process up to 10s.
        testTimeout: 15000
    }
});
