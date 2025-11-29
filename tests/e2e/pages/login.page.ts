import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the Login page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly heading: Locator;
  readonly loginFormIsland: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Adres email");
    this.passwordInput = page.getByLabel("Hasło");
    this.submitButton = page.getByRole("button", { name: "Zaloguj się" });
    this.heading = page.getByRole("heading", { name: "Zaloguj się" });
    this.loginFormIsland = page.locator('astro-island[component-url*="LoginForm"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Wait until the client-hydrated LoginForm is ready
   * Astro marks hydrated islands by removing the `ssr` attribute.
   * Interacting before hydration finishes causes React Hook Form to reset
   * our filled values, so we guard against that race.
   */
  async waitForLoginFormHydration() {
    const islandHandle = await this.loginFormIsland.elementHandle();
    if (!islandHandle) {
      throw new Error("Login form island not found");
    }

    await this.page.waitForFunction((island: Element) => !island.hasAttribute("ssr"), islandHandle, {
      timeout: 10000,
    });
  }

  /**
   * Fill the email input
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password input
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Perform login with email and password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Complete login flow: navigate, fill form, and submit
   */
  async loginWithCredentials(email: string, password: string) {
    await this.goto();
    await this.waitForLoginFormHydration();
    await this.login(email, password);
    // SPA redirect resolves without triggering a full page load, so we wait for
    // the URL change to be committed rather than waiting for the "load" event.
    await this.page.waitForURL("**/", {
      timeout: 20000,
      waitUntil: "commit",
    });
  }

  /**
   * Verify that the login form is visible
   */
  async expectFormVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Verify that we're on the login page
   */
  async expectOnLoginPage() {
    await expect(this.page).toHaveURL("/login");
    await this.expectFormVisible();
  }

  /**
   * Verify initial screenshot (for visual regression testing)
   */
  async expectInitialScreenshot() {
    await expect(this.page).toHaveScreenshot("login-initial.png", {
      animations: "disabled",
      fullPage: true,
      caret: "hide",
    });
  }

  /**
   * Verify that login was successful (redirected to dashboard)
   */
  async expectLoginSuccessful() {
    await expect(this.page).toHaveURL("/");
  }

  /**
   * Verify that an error message is displayed
   */
  async expectErrorMessage(message?: string) {
    const errorElement = this.page.getByRole("alert");
    await expect(errorElement).toBeVisible();
    if (message) {
      await expect(errorElement).toContainText(message);
    }
  }

  /**
   * Verify that a success message is displayed
   */
  async expectSuccessMessage() {
    const successElement = this.page.getByRole("alert");
    await expect(successElement).toBeVisible();
    await expect(successElement).toContainText("Logowanie zakończone sukcesem");
  }
}
