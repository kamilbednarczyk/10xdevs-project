import { expect, type Page } from "@playwright/test";

import { ActionsFooterPage } from "./actions-footer.page";
import { NavigationPage } from "./navigation.page";
import { ProposalsListPage } from "./proposals-list.page";
import { SourceTextFormPage } from "./source-text-form.page";

/**
 * Main Page Object Model for the Generate Flashcards page
 * Aggregates all sub-components for the flashcard generation flow
 */
export class GenerateFlashcardsPage {
  readonly page: Page;
  readonly navigation: NavigationPage;
  readonly sourceTextForm: SourceTextFormPage;
  readonly proposalsList: ProposalsListPage;
  readonly actionsFooter: ActionsFooterPage;

  constructor(page: Page) {
    this.page = page;
    this.navigation = new NavigationPage(page);
    this.sourceTextForm = new SourceTextFormPage(page);
    this.proposalsList = new ProposalsListPage(page);
    this.actionsFooter = new ActionsFooterPage(page);
  }

  private getToastLocator(text?: string) {
    if (!text) {
      return this.page.getByRole("status").first();
    }

    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page.getByRole("status").filter({
      hasText: new RegExp(escapedText, "i"),
    });
  }

  /**
   * Navigate directly to the Generate Flashcards page
   */
  async goto() {
    await this.page.goto("/generate");
  }

  /**
   * Navigate to the Generate Flashcards page via navigation bar
   */
  async gotoViaNavigation() {
    await this.navigation.goToGenerate();
  }

  /**
   * Wait for a success toast notification
   */
  async waitForSuccessToast(message?: string) {
    const toast = this.getToastLocator(message);
    await expect(toast).toBeVisible({ timeout: 10000 });
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  /**
   * Wait for an error toast notification
   */
  async waitForErrorToast(message?: string) {
    const toast = this.getToastLocator(message);
    await expect(toast).toBeVisible({ timeout: 10000 });
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  /**
   * Verify that the page heading is visible
   */
  async expectPageHeadingVisible() {
    await expect(this.page.getByRole("heading", { name: /Przyspiesz tworzenie fiszek/i })).toBeVisible();
  }

  /**
   * Verify that all main sections are visible
   */
  async expectPageLoaded() {
    await this.expectPageHeadingVisible();
    await this.sourceTextForm.expectFormVisible();
  }

  /**
   * Complete the full flow: generate and save flashcards
   * @param sourceText - The source text to generate flashcards from
   * @param proposalIndices - Array of proposal indices to select (defaults to [0])
   */
  async generateAndSaveFlashcards(sourceText: string, proposalIndices: number[] = [0]) {
    // Step 1: Fill and submit source text
    await this.sourceTextForm.submitSourceText(sourceText);

    // Step 2: Wait for proposals to load
    await this.proposalsList.waitForProposals();

    // Step 3: Select proposals
    await this.proposalsList.selectMultipleProposals(proposalIndices);

    // Step 4: Save selected proposals
    await this.actionsFooter.clickSave();

    // Step 5: Wait for success confirmation
    await this.waitForSuccessToast("Fiszki zapisane");
  }

  /**
   * Generate a sample source text with a specific character count
   * @param minLength - Minimum length (default: 1000)
   * @returns Generated text
   */
  static generateSampleText(minLength = 1000): string {
    const baseText = `
Fotosynteza to fundamentalny proces biochemiczny zachodzący w komórkach roślin, glonów i niektórych bakterii.
Jest to proces, w którym energia świetlna jest przekształcana w energię chemiczną związków organicznych.
Chlorofil, zielony barwnik znajdujący się w chloroplastach, absorbuje światło słoneczne.
W wyniku fotosyntezy powstaje glukoza i tlen. Proces ten zachodzi w dwóch głównych etapach: fazie jasnej i fazie ciemnej.

Faza jasna zachodzi w błonach tylakoidów i wymaga obecności światła. W tym etapie następuje fotoliza wody,
czyli jej rozszczepienie pod wpływem energii świetlnej. Powstaje przy tym tlen, który jest uwalniany do atmosfery.
Energia świetlna jest wykorzystywana do syntezy ATP i NADPH, które są nośnikami energii chemicznej.

Faza ciemna, zwana także cyklem Calvina, zachodzi w stromie chloroplastów i nie wymaga bezpośredniego udziału światła.
W tym etapie dwutlenek węgla z atmosfery jest wiązany i przekształcany w związki organiczne, głównie glukozę.
Proces ten wykorzystuje ATP i NADPH powstałe w fazie jasnej. Cykl Calvina składa się z trzech głównych etapów:
wiązania CO2, redukcji i regeneracji akceptora CO2.

Fotosynteza ma kluczowe znaczenie dla życia na Ziemi. Dzięki niej powstaje tlen, którym oddychają organizmy aerobowe.
Ponadto, produkty fotosyntezy stanowią podstawę łańcuchów pokarmowych w ekosystemach. Rośliny, jako producenci,
dostarczają energii i materii organicznej dla konsumentów. Fotosynteza odgrywa również istotną rolę w obiegu węgla
w przyrodzie, pochłaniając CO2 z atmosfery i tym samym wpływając na klimat Ziemi.
    `.trim();

    let result = baseText;
    while (result.length < minLength) {
      result += "\n\n" + baseText;
    }

    return result.slice(0, 10000); // Max length limit
  }
}
