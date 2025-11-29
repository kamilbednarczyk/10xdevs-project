import { expect, type Locator, type Page } from "@playwright/test";

import { FlashcardRowPage } from "./flashcard-row.page";

/**
 * Page Object Model for the desktop flashcards table.
 */
export class FlashcardsTablePage {
  readonly page: Page;
  readonly table: Locator;
  readonly tableContent: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByTestId("flashcards-table");
    this.tableContent = page.getByTestId("flashcards-table-content");
    this.rows = page.getByTestId("flashcard-table-row");
  }

  /**
   * Make sure the table is rendered (desktop layout).
   */
  async expectVisible() {
    await expect(this.table).toBeVisible();
    await expect(this.tableContent).toBeVisible();
  }

  private createRow(rowLocator: Locator) {
    return new FlashcardRowPage(this.page, rowLocator);
  }

  /**
   * Locate a row using its Flashcard ID.
   */
  getRowById(id: string) {
    const rowLocator = this.page.locator(`[data-testid="flashcard-table-row"][data-flashcard-id="${id}"]`);
    return this.createRow(rowLocator);
  }

  /**
   * Locate a row by the front text value.
   */
  getRowByFrontText(frontText: string | RegExp) {
    const frontLocator = this.page.getByTestId("flashcard-table-front").filter({ hasText: frontText });
    const rowLocator = this.rows.filter({ has: frontLocator }).first();
    return this.createRow(rowLocator);
  }

  /**
   * Wait until a row with the given front text appears.
   */
  async waitForRowByFrontText(frontText: string | RegExp, timeout = 15000) {
    const row = this.getRowByFrontText(frontText);
    await expect(row.row).toBeVisible({ timeout });
    return row;
  }

  /**
   * Wait until the row with the provided id is visible.
   */
  async waitForRowById(id: string, timeout = 15000) {
    const row = this.getRowById(id);
    await expect(row.row).toBeVisible({ timeout });
    return row;
  }

  /**
   * Wait until a specific row disappears after deletion.
   */
  async expectRowMissingById(id: string, timeout = 15000) {
    const locator = this.page.locator(`[data-testid="flashcard-table-row"][data-flashcard-id="${id}"]`);
    await expect(locator).toHaveCount(0, { timeout });
  }
}
