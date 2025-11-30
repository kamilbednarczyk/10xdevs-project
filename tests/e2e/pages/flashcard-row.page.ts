import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for a single flashcard row inside the desktop table.
 */
export class FlashcardRowPage {
  readonly page: Page;
  readonly row: Locator;
  readonly frontCell: Locator;
  readonly backCell: Locator;
  readonly actions: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page, row: Locator) {
    this.page = page;
    this.row = row;
    this.frontCell = row.getByTestId("flashcard-table-front");
    this.backCell = row.getByTestId("flashcard-table-back");
    this.actions = row.getByTestId("flashcard-actions");
    this.editButton = row.getByTestId("flashcard-edit-button");
    this.deleteButton = row.getByTestId("flashcard-delete-button");
  }

  /**
   * Resolve the unique identifier stored on the row element.
   */
  async getId(): Promise<string> {
    const id = await this.row.getAttribute("data-flashcard-id");
    if (!id) {
      throw new Error("Flashcard row is missing the data-flashcard-id attribute");
    }
    return id;
  }

  /**
   * Verify the row is visible.
   */
  async expectVisible() {
    await expect(this.row).toBeVisible();
  }

  /**
   * Assert the front cell text.
   */
  async expectFrontText(text: string | RegExp) {
    await expect(this.frontCell).toHaveText(text);
  }

  /**
   * Assert the back cell text.
   */
  async expectBackText(text: string | RegExp) {
    await expect(this.backCell).toHaveText(text);
  }

  /**
   * Open the edit dialog for this row.
   */
  async clickEdit() {
    await this.editButton.click();
  }

  /**
   * Open the delete confirmation dialog for this row.
   */
  async clickDelete() {
    await this.deleteButton.click();
  }
}
