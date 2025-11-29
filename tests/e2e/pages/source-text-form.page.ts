import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the Source Text Form component
 * Used for inputting source text to generate flashcards
 */
export class SourceTextFormPage {
  readonly page: Page;
  readonly form: Locator;
  readonly sourceTextInput: Locator;
  readonly characterCount: Locator;
  readonly generateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("source-text-form");
    this.sourceTextInput = page.getByTestId("source-text-input");
    this.characterCount = page.getByTestId("character-count");
    this.generateButton = page.getByTestId("generate-flashcards-button");
  }

  /**
   * Fill the source text input with the provided text
   */
  async fillSourceText(text: string) {
    await this.sourceTextInput.fill(text);
  }

  /**
   * Clear the source text input
   */
  async clearSourceText() {
    await this.sourceTextInput.clear();
  }

  /**
   * Click the generate button to start flashcard generation
   */
  async clickGenerate() {
    await this.generateButton.click();
  }

  /**
   * Fill source text and submit the form
   */
  async submitSourceText(text: string) {
    await this.fillSourceText(text);
    await this.clickGenerate();
  }

  /**
   * Get the current character count text
   */
  async getCharacterCount(): Promise<string> {
    return (await this.characterCount.textContent()) || "";
  }

  /**
   * Verify that the form is visible
   */
  async expectFormVisible() {
    await expect(this.form).toBeVisible();
    await expect(this.sourceTextInput).toBeVisible();
    await expect(this.generateButton).toBeVisible();
  }

  /**
   * Verify that the generate button is enabled
   */
  async expectGenerateButtonEnabled() {
    await expect(this.generateButton).toBeEnabled();
  }

  /**
   * Verify that the generate button is disabled
   */
  async expectGenerateButtonDisabled() {
    await expect(this.generateButton).toBeDisabled();
  }

  /**
   * Verify that the button shows loading state
   */
  async expectLoadingState() {
    await expect(this.generateButton).toHaveText("Generowanie...");
    await expect(this.generateButton).toBeDisabled();
  }

  /**
   * Verify that the character count shows a specific value
   */
  async expectCharacterCount(count: number) {
    const formattedCount = count.toLocaleString("pl-PL");
    await expect(this.characterCount).toContainText(formattedCount);
  }

  /**
   * Verify that the character count is within valid range (1000-10000)
   */
  async expectValidCharacterCount() {
    const text = await this.getCharacterCount();
    const match = text.match(/(\d[\d\s]*)/);
    if (match) {
      const count = parseInt(match[1].replace(/\s/g, ""), 10);
      expect(count).toBeGreaterThanOrEqual(1000);
      expect(count).toBeLessThanOrEqual(10000);
    }
  }
}
