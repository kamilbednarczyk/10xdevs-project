import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  private emailInput() {
    return this.page.getByLabel("Adres email");
  }

  private passwordInput() {
    return this.page.getByLabel("Hasło");
  }

  private submitButton() {
    return this.page.getByRole("button", { name: "Zaloguj się" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async expectFormVisible() {
    await expect(this.page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
    await expect(this.emailInput()).toBeVisible();
    await expect(this.passwordInput()).toBeVisible();
  }

  async expectInitialScreenshot() {
    await expect(this.page).toHaveScreenshot("login-initial.png", {
      animations: "disabled",
      fullPage: true,
      caret: "hide",
    });
  }
}
