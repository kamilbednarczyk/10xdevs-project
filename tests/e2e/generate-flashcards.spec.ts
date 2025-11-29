import { expect, test } from "./fixtures/auth.fixture";
import { SampleTexts } from "./fixtures/sample-texts";
import { GenerateFlashcardsPage } from "./pages/generate-flashcards.page";

test.describe("Generate Flashcards Flow", () => {
  let generatePage: GenerateFlashcardsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    generatePage = new GenerateFlashcardsPage(authenticatedPage);
    await generatePage.goto();
  });

  test("should display the generate flashcards page correctly", async () => {
    await generatePage.expectPageLoaded();
    await generatePage.sourceTextForm.expectGenerateButtonDisabled();
  });

  test("should enable generate button when valid text is entered", async () => {
    const sampleText = GenerateFlashcardsPage.generateSampleText(1000);

    await generatePage.sourceTextForm.fillSourceText(sampleText);
    await generatePage.sourceTextForm.expectValidCharacterCount();
    await generatePage.sourceTextForm.expectGenerateButtonEnabled();
  });

  test("should disable generate button when text is too short", async () => {
    await generatePage.sourceTextForm.fillSourceText(SampleTexts.tooShort);
    await generatePage.sourceTextForm.expectGenerateButtonDisabled();
  });

  test("should generate flashcard proposals from source text", async () => {
    // Skip this test if no API key is configured
    test.skip(!process.env.OPENROUTER_API_KEY, "Skipping: OPENROUTER_API_KEY not configured");

    const sampleText = GenerateFlashcardsPage.generateSampleText(1500);

    // Fill source text
    await generatePage.sourceTextForm.fillSourceText(sampleText);
    await generatePage.sourceTextForm.expectGenerateButtonEnabled();

    // Click generate button
    await generatePage.sourceTextForm.clickGenerate();

    // Verify loading state
    await generatePage.sourceTextForm.expectLoadingState();

    // Wait for proposals to load
    await generatePage.proposalsList.waitForProposals();

    // Verify proposals are displayed
    await generatePage.proposalsList.expectAtLeastOneProposal();
  });

  test("should select and deselect proposals", async () => {
    test.skip(!process.env.OPENROUTER_API_KEY, "Skipping: OPENROUTER_API_KEY not configured");

    const sampleText = GenerateFlashcardsPage.generateSampleText(1200);

    // Generate proposals
    await generatePage.sourceTextForm.submitSourceText(sampleText);
    await generatePage.proposalsList.waitForProposals();

    // Select first proposal
    await generatePage.proposalsList.selectProposal(0);
    await generatePage.proposalsList.expectProposalSelected(0);

    // Verify save button is enabled
    await generatePage.actionsFooter.expectSaveButtonEnabled();

    // Deselect first proposal
    await generatePage.proposalsList.deselectProposal(0);
    await generatePage.proposalsList.expectProposalNotSelected(0);

    // Verify save button is disabled
    await generatePage.actionsFooter.expectSaveButtonDisabled();
  });

  test("should edit proposal content before saving", async () => {
    test.skip(!process.env.OPENROUTER_API_KEY, "Skipping: OPENROUTER_API_KEY not configured");

    const sampleText = GenerateFlashcardsPage.generateSampleText(1300);

    // Generate proposals
    await generatePage.sourceTextForm.submitSourceText(sampleText);
    await generatePage.proposalsList.waitForProposals();

    // Edit first proposal
    const customFront = "Co to jest fotosynteza?";
    const customBack = "Proces przekształcania energii świetlnej w chemiczną";

    await generatePage.proposalsList.editProposalFront(0, customFront);
    await generatePage.proposalsList.editProposalBack(0, customBack);

    // Verify changes
    await generatePage.proposalsList.expectProposalFrontText(0, customFront);
    await generatePage.proposalsList.expectProposalBackText(0, customBack);
  });

  test("should complete full generate and save flow", async ({ authenticatedPage }) => {
    test.skip(!process.env.OPENROUTER_API_KEY, "Skipping: OPENROUTER_API_KEY not configured");

    const sampleText = GenerateFlashcardsPage.generateSampleText(1400);

    // Execute full flow
    await generatePage.generateAndSaveFlashcards(sampleText, [0]);

    // Verify success state
    const successToast = authenticatedPage.getByRole("status").filter({
      hasText: /Fiszki zapisane/i,
    });
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText("Fiszki zapisane");
  });

  test("should save multiple selected proposals", async () => {
    test.skip(!process.env.OPENROUTER_API_KEY, "Skipping: OPENROUTER_API_KEY not configured");

    const sampleText = GenerateFlashcardsPage.generateSampleText(2000);

    // Generate proposals
    await generatePage.sourceTextForm.submitSourceText(sampleText);
    await generatePage.proposalsList.waitForProposals();

    // Get proposal count
    const proposalCount = await generatePage.proposalsList.getProposalCount();
    expect(proposalCount).toBeGreaterThan(1);

    // Select first two proposals
    await generatePage.proposalsList.selectMultipleProposals([0, 1]);

    // Verify both are selected
    await generatePage.proposalsList.expectProposalSelected(0);
    await generatePage.proposalsList.expectProposalSelected(1);

    // Save selected proposals
    await generatePage.actionsFooter.clickSave();
    await generatePage.waitForSuccessToast("Fiszki zapisane");
  });

  test("should navigate to generate page via navigation bar", async ({ authenticatedPage }) => {
    // Start from home page
    await authenticatedPage.goto("/");

    // Use navigation to go to generate page
    await generatePage.navigation.goToGenerate();

    // Verify we're on the generate page
    await generatePage.expectPageLoaded();
    await generatePage.navigation.expectLinkActive("generate");
  });

  test("should handle empty proposals state", async () => {
    await generatePage.expectPageLoaded();

    // Verify no proposals are shown initially
    await expect(generatePage.proposalsList.proposalsList).not.toBeVisible();

    // Verify save button is disabled
    await generatePage.actionsFooter.expectSaveButtonDisabled();
  });

  test("should display character count correctly", async () => {
    const text1000 = GenerateFlashcardsPage.generateSampleText(1000);
    const text5000 = GenerateFlashcardsPage.generateSampleText(5000);

    // Test with 1000 characters
    await generatePage.sourceTextForm.fillSourceText(text1000.slice(0, 1000));
    await generatePage.sourceTextForm.expectCharacterCount(1000);

    // Test with 5000 characters
    await generatePage.sourceTextForm.fillSourceText(text5000.slice(0, 5000));
    await generatePage.sourceTextForm.expectCharacterCount(5000);
  });
});
