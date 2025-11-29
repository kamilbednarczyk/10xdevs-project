import { expect, type Locator, type Page } from "@playwright/test";

import { DeleteFlashcardDialogPage } from "./delete-flashcard-dialog.page";
import { FlashcardFormDialogPage } from "./flashcard-form-dialog.page";
import { FlashcardsTablePage } from "./flashcards-table.page";
import { NavigationPage } from "./navigation.page";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * High-level Page Object Model for the "Moje fiszki" page.
 */
export class FlashcardsPage {
  readonly page: Page;
  readonly navigation: NavigationPage;
  readonly table: FlashcardsTablePage;
  readonly formDialog: FlashcardFormDialogPage;
  readonly deleteDialog: DeleteFlashcardDialogPage;
  readonly addFlashcardButton: Locator;
  readonly refreshButton: Locator;
  readonly heroHeading: Locator;
  readonly collectionHeading: Locator;
  readonly flashcardsIsland: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = new NavigationPage(page);
    this.table = new FlashcardsTablePage(page);
    this.formDialog = new FlashcardFormDialogPage(page);
    this.deleteDialog = new DeleteFlashcardDialogPage(page);
    this.addFlashcardButton = page.getByTestId("flashcards-add-button");
    this.refreshButton = page.getByTestId("flashcards-refresh-button");
    this.heroHeading = page.getByRole("heading", { name: /Zarządzaj swoimi fiszkami/i });
    this.collectionHeading = page.getByRole("heading", { name: /Moje fiszki/i });
    this.flashcardsIsland = page.locator('astro-island[component-url*="FlashcardsView"]');
  }

  private getToastLocator(text?: string | RegExp) {
    if (!text) {
      return this.page.getByRole("status").first();
    }

    const matcher = typeof text === "string" ? new RegExp(escapeRegExp(text), "i") : text;
    return this.page.getByRole("status").filter({ hasText: matcher });
  }

  /**
   * Navigate directly to /flashcards and wait for hydration.
   */
  async goto() {
    await this.page.goto("/flashcards");
    await this.waitForHydration();
  }

  /**
   * Wait until the FlashcardsView island hydrates (client:load).
   */
  async waitForHydration() {
    await this.flashcardsIsland.waitFor({ state: "attached", timeout: 15000 });
    const islandHandle = await this.flashcardsIsland.elementHandle();
    if (!islandHandle) {
      throw new Error("Flashcards island not found");
    }

    await this.page.waitForFunction((island: Element) => !island.hasAttribute("ssr"), islandHandle, {
      timeout: 15000,
    });
  }

  /**
   * Ensure key sections and actions are visible.
   */
  async expectPageLoaded() {
    await this.navigation.expectLinkActive("flashcards");
    await expect(this.heroHeading).toBeVisible();
    await expect(this.collectionHeading).toBeVisible();
    await expect(this.addFlashcardButton).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
  }

  /**
   * Open the create flashcard dialog.
   */
  async openCreateDialog() {
    await this.addFlashcardButton.click();
    await this.formDialog.expectVisible();
  }

  /**
   * Create a flashcard through the dialog.
   */
  async createFlashcard(front: string, back: string) {
    await this.openCreateDialog();
    await this.formDialog.fillForm(front, back);
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/flashcards") && response.request().method() === "POST"
    );
    await this.formDialog.submit();
    const response = await responsePromise;
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to create flashcard: ${response.status} ${body}`);
    }
    await this.formDialog.waitForClosed();
  }

  /**
   * Wait for a toast message (success or error).
   */
  async waitForToast(message?: string | RegExp) {
    const toast = this.getToastLocator(message);
    await expect(toast).toBeVisible({ timeout: 10000 });
    if (typeof message === "string") {
      await expect(toast).toContainText(new RegExp(escapeRegExp(message), "i"));
    } else if (message instanceof RegExp) {
      await expect(toast).toContainText(message);
    }
  }
}
