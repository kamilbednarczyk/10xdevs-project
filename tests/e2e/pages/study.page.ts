import { expect, type Locator, type Page } from "@playwright/test";

import type { SubmitReviewCommand } from "@/types";

import { StudyFlashcardDisplayPage } from "./study-flashcard-display.page";
import { StudyReviewControlsPage } from "./study-review-controls.page";
import { StudySessionSummaryPage } from "./study-session-summary.page";

/**
 * High-level Page Object Model for the Study page.
 */
export class StudyPage {
  readonly page: Page;
  readonly studyIsland: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly sessionPanel: Locator;
  readonly revealButton: Locator;
  readonly savingIndicator: Locator;
  readonly nextReviewBox: Locator;
  readonly flashcard: StudyFlashcardDisplayPage;
  readonly reviewControls: StudyReviewControlsPage;
  readonly summary: StudySessionSummaryPage;

  constructor(page: Page) {
    this.page = page;
    this.studyIsland = page.locator('astro-island[component-url*="StudyView"]');
    this.heading = page.getByRole("heading", { name: /Przeprowadź sesję nauki SM-2/i });
    this.description = page.getByText(
      "Odkrywaj odpowiedzi, oceniaj swoją znajomość materiału, a my zajmiemy się wyznaczeniem kolejnych powtórek."
    );
    this.sessionPanel = page.getByTestId("study-session-panel");
    this.revealButton = page.getByTestId("study-reveal-button");
    this.savingIndicator = page.getByTestId("study-saving-indicator");
    this.nextReviewBox = page.getByTestId("study-next-review");
    this.flashcard = new StudyFlashcardDisplayPage(page);
    this.reviewControls = new StudyReviewControlsPage(page);
    this.summary = new StudySessionSummaryPage(page);
  }

  /**
   * Navigate to /study and wait for hydration.
   */
  async goto() {
    await this.page.goto("/study");
    await this.waitForHydration();
  }

  /**
   * Wait until the StudyView client island hydrates.
   */
  async waitForHydration() {
    await this.studyIsland.waitFor({ state: "attached", timeout: 15000 });
    const islandHandle = await this.studyIsland.elementHandle();
    if (!islandHandle) {
      throw new Error("StudyView island not found");
    }

    await this.page.waitForFunction((island: Element) => !island.hasAttribute("ssr"), islandHandle, {
      timeout: 15000,
    });
  }

  /**
   * Verify hero content is visible.
   */
  async expectHeroVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
  }

  /**
   * Ensure the interactive session is ready with a flashcard.
   */
  async expectSessionReady() {
    await this.flashcard.expectVisible();
    await expect(this.revealButton).toBeVisible();
    await this.flashcard.expectAnswerHidden();
    await expect(this.nextReviewBox).toBeVisible();
  }

  /**
   * Reveal the current flashcard answer.
   */
  async revealAnswer() {
    await this.revealButton.click();
    await this.reviewControls.expectVisible();
    await this.flashcard.expectAnswerRevealed();
  }

  /**
   * Submit review decision for the current flashcard.
   */
  async submitReview(quality: SubmitReviewCommand["quality"]) {
    await this.reviewControls.chooseQuality(quality);
    await expect(this.savingIndicator).toBeVisible();
    await expect(this.savingIndicator).toBeHidden();
  }

  /**
   * Wait for either the next flashcard or the session summary to appear.
   */
  private async waitForNextState(): Promise<"next-card" | "summary"> {
    await this.page.waitForFunction(() => {
      return Boolean(
        document.querySelector('[data-testid="study-session-summary"]') ||
          document.querySelector('[data-testid="study-reveal-button"]')
      );
    });

    if (await this.summary.isVisible()) {
      return "summary";
    }

    await expect(this.revealButton).toBeVisible();
    await this.flashcard.expectAnswerHidden();
    return "next-card";
  }

  /**
   * Complete a single flashcard review round.
   */
  async completeCurrentFlashcard(quality: SubmitReviewCommand["quality"]) {
    await this.revealAnswer();
    await this.submitReview(quality);
    return this.waitForNextState();
  }

  /**
   * Loop through all flashcards until session summary screen is shown.
   */
  async completeSession(quality: SubmitReviewCommand["quality"]) {
    while (!(await this.summary.isVisible())) {
      const state = await this.completeCurrentFlashcard(quality);
      if (state === "summary") {
        break;
      }
    }

    await this.summary.expectVisible();
  }
}
