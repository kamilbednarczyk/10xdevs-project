import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the delete confirmation dialog.
 */
export class DeleteFlashcardDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly message: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("delete-flashcard-dialog");
    this.message = page.getByTestId("delete-flashcard-message");
    this.confirmButton = page.getByTestId("delete-flashcard-confirm-button");
    this.cancelButton = page.getByTestId("delete-flashcard-cancel-button");
  }

  /**
   * Ensure the confirmation dialog is visible.
   */
  async expectVisible() {
    await expect(this.dialog).toBeVisible();
  }

  /**
   * Wait until the dialog disappears.
   */
  async waitForClosed() {
    await this.dialog.waitFor({ state: "detached", timeout: 10000 });
  }

  /**
   * Confirm deletion.
   */
  async confirm() {
    await this.confirmButton.click();
    await this.waitForClosed();
  }

  /**
   * Cancel deletion.
   */
  async cancel() {
    await this.cancelButton.click();
    await this.waitForClosed();
  }

  /**
   * Assert that the dialog message contains specific text.
   */
  async expectMessageContains(text: string | RegExp) {
    await expect(this.message).toContainText(text);
  }
}
