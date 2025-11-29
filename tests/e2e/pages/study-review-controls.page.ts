import { expect, type Locator, type Page } from "@playwright/test";

import type { SubmitReviewCommand } from "@/types";

/**
 * Page Object Model for the Study review controls (quality buttons).
 */
export class StudyReviewControlsPage {
  readonly page: Page;
  readonly container: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("study-review-options");
  }

  /**
   * Retrieve locator for specific quality option.
   */
  getOptionByQuality(quality: SubmitReviewCommand["quality"]) {
    return this.page.getByTestId(`study-review-option-${quality}`);
  }

  /**
   * Ensure all quality buttons are visible.
   */
  async expectVisible() {
    await expect(this.container).toBeVisible();
    await expect(this.getOptionByQuality(1)).toBeVisible();
    await expect(this.getOptionByQuality(3)).toBeVisible();
    await expect(this.getOptionByQuality(5)).toBeVisible();
  }

  /**
   * Choose a quality option.
   */
  async chooseQuality(quality: SubmitReviewCommand["quality"]) {
    const option = this.getOptionByQuality(quality);
    await option.click();
  }
}

