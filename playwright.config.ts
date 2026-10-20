import { defineConfig, devices } from '@playwright/test'

/**
 * Teste ponta a ponta do fluxo de assinatura.
 * Precisa do app no ar: `docker compose up --build` (porta 3000) ou `pnpm dev`.
 * Outra URL: E2E_BASE_URL=http://localhost:4000 pnpm e2e
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 90_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        // Opcional: usar um Chromium já instalado na máquina
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
