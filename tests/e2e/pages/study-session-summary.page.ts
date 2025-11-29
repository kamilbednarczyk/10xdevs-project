import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the session summary displayed after study completion.
 */
export class StudySessionSummaryPage {
  readonly page: Page;
  readonly container: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly emptyState: Locator;
  readonly secondaryAction: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("study-session-summary");
    this.title = page.getByTestId("study-session-summary-title");
    this.description = page.getByTestId("study-session-summary-description");
    this.emptyState = page.getByTestId("study-session-summary-empty-state");
    this.secondaryAction = page.getByTestId("study-session-summary-secondary-action");
  }

  /**
   * Check if the summary is currently visible.
   */
  async isVisible() {
    return (await this.container.count()) > 0;
  }

  /**
   * Wait until the summary card is visible.
   */
  async expectVisible() {
    await expect(this.container).toBeVisible();
  }

  /**
   * Return the rendered title.
   */
  async getTitleText() {
    if ((await this.title.count()) === 0) {
      return "";
    }
    return (await this.title.textContent())?.trim() ?? "";
  }

  /**
   * Click the secondary action button (e.g., navigate back to flashcards).
   */
  async clickSecondaryAction() {
    await this.secondaryAction.click();
  }
}

