import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the main navigation bar
 */
export class NavigationPage {
  readonly page: Page;
  readonly dashboardLink: Locator;
  readonly flashcardsLink: Locator;
  readonly generateLink: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardLink = page.getByTestId("nav-dashboard");
    this.flashcardsLink = page.getByTestId("nav-flashcards");
    this.generateLink = page.getByTestId("nav-generate");
    this.userMenu = page.getByTestId("user-menu");
  }

  /**
   * Navigate to the Dashboard page
   */
  async goToDashboard() {
    await this.dashboardLink.click();
    await expect(this.page).toHaveURL("/");
  }

  /**
   * Navigate to the Flashcards page
   */
  async goToFlashcards() {
    await this.flashcardsLink.click();
    await expect(this.page).toHaveURL("/flashcards");
  }

  /**
   * Navigate to the Generate Flashcards page
   */
  async goToGenerate() {
    await this.generateLink.click();
    await expect(this.page).toHaveURL("/generate");
  }

  /**
   * Verify that the navigation bar is visible
   */
  async expectNavigationVisible() {
    await expect(this.dashboardLink).toBeVisible();
    await expect(this.flashcardsLink).toBeVisible();
    await expect(this.generateLink).toBeVisible();
  }

  /**
   * Verify that a specific link is active (current page)
   */
  async expectLinkActive(link: "dashboard" | "flashcards" | "generate") {
    const locator =
      link === "dashboard" ? this.dashboardLink : link === "flashcards" ? this.flashcardsLink : this.generateLink;
    await expect(locator).toHaveAttribute("aria-current", "page");
  }
}
