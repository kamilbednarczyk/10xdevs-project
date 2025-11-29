import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the Proposals List component
 * Manages the list of generated flashcard proposals
 */
export class ProposalsListPage {
  readonly page: Page;
  readonly proposalsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proposalsList = page.getByTestId("proposals-list");
  }

  /**
   * Get all proposal cards
   */
  getProposalCards(): Locator {
    return this.page.getByTestId("proposal-card");
  }

  /**
   * Get a specific proposal card by index (0-based)
   */
  getProposalCard(index: number): Locator {
    return this.getProposalCards().nth(index);
  }

  /**
   * Get the first proposal card
   */
  getFirstProposalCard(): Locator {
    return this.getProposalCard(0);
  }

  /**
   * Get the last proposal card
   */
  getLastProposalCard(): Locator {
    return this.getProposalCards().last();
  }

  /**
   * Get the checkbox for a specific proposal card
   */
  getProposalCheckbox(index: number): Locator {
    return this.getProposalCard(index).getByTestId("proposal-checkbox");
  }

  /**
   * Get the front input for a specific proposal card
   */
  getProposalFrontInput(index: number): Locator {
    return this.getProposalCard(index).getByTestId("proposal-front-input");
  }

  /**
   * Get the back input for a specific proposal card
   */
  getProposalBackInput(index: number): Locator {
    return this.getProposalCard(index).getByTestId("proposal-back-input");
  }

  /**
   * Check (select) a specific proposal by index
   */
  async selectProposal(index: number) {
    await this.getProposalCheckbox(index).check();
  }

  /**
   * Uncheck (deselect) a specific proposal by index
   */
  async deselectProposal(index: number) {
    await this.getProposalCheckbox(index).uncheck();
  }

  /**
   * Select multiple proposals by their indices
   */
  async selectMultipleProposals(indices: number[]) {
    for (const index of indices) {
      await this.selectProposal(index);
    }
  }

  /**
   * Edit the front text of a specific proposal
   */
  async editProposalFront(index: number, text: string) {
    await this.getProposalFrontInput(index).fill(text);
  }

  /**
   * Edit the back text of a specific proposal
   */
  async editProposalBack(index: number, text: string) {
    await this.getProposalBackInput(index).fill(text);
  }

  /**
   * Get the count of all proposals
   */
  async getProposalCount(): Promise<number> {
    return await this.getProposalCards().count();
  }

  /**
   * Get the count of selected proposals
   */
  async getSelectedProposalCount(): Promise<number> {
    const cards = this.getProposalCards();
    const count = await cards.count();
    let selectedCount = 0;

    for (let i = 0; i < count; i++) {
      const checkbox = this.getProposalCheckbox(i);
      if (await checkbox.isChecked()) {
        selectedCount++;
      }
    }

    return selectedCount;
  }

  /**
   * Wait for proposals to be loaded (list becomes visible)
   */
  async waitForProposals(timeout = 30000) {
    await this.proposalsList.waitFor({ state: "visible", timeout });
  }

  /**
   * Verify that the proposals list is visible
   */
  async expectProposalsVisible() {
    await expect(this.proposalsList).toBeVisible();
  }

  /**
   * Verify that a specific number of proposals are displayed
   */
  async expectProposalCount(count: number) {
    await expect(this.getProposalCards()).toHaveCount(count);
  }

  /**
   * Verify that a specific proposal is selected
   */
  async expectProposalSelected(index: number) {
    await expect(this.getProposalCheckbox(index)).toBeChecked();
  }

  /**
   * Verify that a specific proposal is not selected
   */
  async expectProposalNotSelected(index: number) {
    await expect(this.getProposalCheckbox(index)).not.toBeChecked();
  }

  /**
   * Verify that the front input of a proposal has specific text
   */
  async expectProposalFrontText(index: number, text: string) {
    await expect(this.getProposalFrontInput(index)).toHaveValue(text);
  }

  /**
   * Verify that the back input of a proposal has specific text
   */
  async expectProposalBackText(index: number, text: string) {
    await expect(this.getProposalBackInput(index)).toHaveValue(text);
  }

  /**
   * Verify that at least one proposal exists
   */
  async expectAtLeastOneProposal() {
    await expect(this.getProposalCards()).not.toHaveCount(0);
  }
}
