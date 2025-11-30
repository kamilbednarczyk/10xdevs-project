import { test as base, type Page } from "@playwright/test";

import { LoginPage } from "../pages/login.page";

/**
 * Test credentials from .env.test
 */
export const testCredentials = {
  email: process.env.E2E_USERNAME || "test@example.com",
  password: process.env.E2E_PASSWORD || "testpassword123",
};

/**
 * Extended test fixture with authenticated page
 */
interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Login helper function
 * Performs login and waits for successful authentication
 */
export async function loginAsTestUser(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.loginWithCredentials(testCredentials.email, testCredentials.password);
}

/**
 * Extended test with authentication fixture
 * Usage:
 *   import { test } from './fixtures/auth.fixture';
 *   test('my test', async ({ authenticatedPage }) => { ... });
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, run) => {
    // Perform login before each test
    await loginAsTestUser(page);

    // Provide the authenticated page to the test
    await run(page);

    // Cleanup (if needed) happens here after the test
  },
});

export { expect } from "@playwright/test";
