import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the Actions Footer component
 * Manages the save action for selected flashcard proposals
 */
export class ActionsFooterPage {
  readonly page: Page;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByTestId("save-selected-button");
  }

  /**
   * Click the save button to save selected proposals
   */
  async clickSave() {
    await this.saveButton.click();
  }

  /**
   * Verify that the save button is visible
   */
  async expectSaveButtonVisible() {
    await expect(this.saveButton).toBeVisible();
  }

  /**
   * Verify that the save button is enabled
   */
  async expectSaveButtonEnabled() {
    await expect(this.saveButton).toBeEnabled();
  }

  /**
   * Verify that the save button is disabled
   */
  async expectSaveButtonDisabled() {
    await expect(this.saveButton).toBeDisabled();
  }

  /**
   * Verify that the button shows loading state
   */
  async expectSavingState() {
    await expect(this.saveButton).toHaveText("Zapisywanie...");
    await expect(this.saveButton).toBeDisabled();
  }

  /**
   * Verify that the button shows default state
   */
  async expectDefaultState() {
    await expect(this.saveButton).toHaveText("Zapisz zaznaczone");
  }
}
