import { expect, test } from "@playwright/test";

import { testCredentials } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login.page";

test.describe("Login page", () => {
  test("renders the login form and matches the visual baseline", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectFormVisible();
    await loginPage.expectInitialScreenshot();
  });

  test("should successfully login with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginWithCredentials(testCredentials.email, testCredentials.password);

    // Verify successful login (redirected to dashboard)
    await loginPage.expectLoginSuccessful();
    await expect(page).toHaveURL("/");
  });

  test("should display login form correctly", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectOnLoginPage();
  });
});
