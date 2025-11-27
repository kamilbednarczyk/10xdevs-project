import { test } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Login page", () => {
  test("renders the login form and matches the visual baseline", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectFormVisible();
    await loginPage.expectInitialScreenshot();
  });
});
