import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the flashcard display within the Study view.
 */
export class StudyFlashcardDisplayPage {
  readonly page: Page;
  readonly card: Locator;
  readonly frontText: Locator;
  readonly content: Locator;
  readonly backLabel: Locator;
  readonly backValue: Locator;
  readonly placeholder: Locator;

  constructor(page: Page) {
    this.page = page;
    this.card = page.getByTestId("study-flashcard-card");
    this.frontText = page.getByTestId("study-flashcard-front");
    this.content = page.getByTestId("study-flashcard-content");
    this.backLabel = page.getByTestId("study-flashcard-back-label");
    this.backValue = page.getByTestId("study-flashcard-back-value");
    this.placeholder = page.getByTestId("study-flashcard-placeholder");
  }

  /**
   * Wait for the card container to be visible.
   */
  async expectVisible() {
    await expect(this.card).toBeVisible();
    await expect(this.content).toBeVisible();
  }

  /**
   * Ensure the answer is still hidden.
   */
  async expectAnswerHidden() {
    await expect(this.placeholder).toBeVisible();
    await expect(this.backLabel).toHaveCount(0);
    await expect(this.backValue).toHaveCount(0);
  }

  /**
   * Ensure the answer has been revealed.
   */
  async expectAnswerRevealed() {
    await expect(this.placeholder).toHaveCount(0);
    await expect(this.backLabel).toHaveCount(1);
    await expect(this.backValue).toBeVisible();
  }

  /**
   * Retrieve the current front text.
   */
  async getFrontText() {
    return (await this.frontText.textContent())?.trim() ?? "";
  }

  /**
   * Retrieve the current back text (only when revealed).
   */
  async getBackText() {
    if ((await this.backValue.count()) === 0) {
      return "";
    }
    return (await this.backValue.first().textContent())?.trim() ?? "";
  }
}
