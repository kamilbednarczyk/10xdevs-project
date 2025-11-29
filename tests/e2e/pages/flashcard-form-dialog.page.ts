import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the reusable Flashcard form dialog
 * Handles both create and edit flows.
 */
export class FlashcardFormDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly form: Locator;
  readonly frontInput: Locator;
  readonly backInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly frontError: Locator;
  readonly backError: Locator;
  readonly globalError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("flashcard-form-dialog");
    this.form = page.getByTestId("flashcard-form");
    this.frontInput = page.getByTestId("flashcard-front-input");
    this.backInput = page.getByTestId("flashcard-back-input");
    this.submitButton = page.getByTestId("flashcard-form-submit-button");
    this.cancelButton = page.getByTestId("flashcard-form-cancel-button");
    this.frontError = page.getByTestId("flashcard-front-error");
    this.backError = page.getByTestId("flashcard-back-error");
    this.globalError = page.getByTestId("flashcard-form-global-error");
  }

  /**
   * Wait for the dialog to appear and ensure inputs are interactive.
   */
  async expectVisible() {
    await expect(this.dialog).toBeVisible();
    await expect(this.form).toBeVisible();
    await expect(this.frontInput).toBeVisible();
    await expect(this.backInput).toBeVisible();
  }

  /**
   * Wait until the dialog is removed from the DOM.
   */
  async waitForClosed() {
    await this.dialog.waitFor({ state: "detached", timeout: 15000 });
  }

  /**
   * Fill the front input.
   */
  async fillFront(text: string) {
    await this.frontInput.fill(text);
  }

  /**
   * Fill the back textarea.
   */
  async fillBack(text: string) {
    await this.backInput.fill(text);
  }

  /**
   * Fill both form fields.
   */
  async fillForm(front: string, back: string) {
    await this.fillFront(front);
    await this.fillBack(back);
  }

  /**
   * Click the submit button.
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Cancel and wait for the dialog to close.
   */
  async cancel() {
    await this.cancelButton.click();
    await this.waitForClosed();
  }
}
