import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import dotenv from "dotenv";
import path from "path";

const testEnvPath = path.resolve(process.cwd(), ".env.test");
const shouldLoadTestEnv = !process.env.CI && existsSync(testEnvPath);

if (shouldLoadTestEnv) {
  dotenv.config({ path: testEnvPath });
} else {
  dotenv.config();
}

const devServerPort = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${devServerPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/playwright.teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: `npx wrangler dev --env test --host 127.0.0.1 --port ${devServerPort}`,
    url: `http://127.0.0.1:${devServerPort}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
});
