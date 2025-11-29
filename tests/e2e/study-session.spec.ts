import { expect, test } from "./fixtures/auth.fixture";
import { FlashcardsPage } from "./pages/flashcards.page";
import { StudyPage } from "./pages/study.page";

test.describe("Study session flow", () => {
  test("user can review due flashcards until reaching the summary screen", async ({ authenticatedPage }) => {
    const flashcardsPage = new FlashcardsPage(authenticatedPage);
    const studyPage = new StudyPage(authenticatedPage);
    const uniqueSuffix = Date.now();
    const flashcardFront = `Sesja nauki front ${uniqueSuffix}`;
    const flashcardBack = `Sesja nauki back ${uniqueSuffix}`;
    let createdFlashcardId: string | null = null;

    await test.step("Przygotowanie fiszki dostępnej do nauki", async () => {
      await flashcardsPage.navigation.goToFlashcards();
      await flashcardsPage.waitForHydration();
      await flashcardsPage.expectPageLoaded();
      await flashcardsPage.createFlashcard(flashcardFront, flashcardBack);
      await flashcardsPage.waitForToast("Dodano nową fiszkę");

      const createdRow = await flashcardsPage.table.waitForRowByFrontText(flashcardFront);
      createdFlashcardId = await createdRow.getId();
    });

    await test.step("Rozpoczęcie sesji nauki i ocena fiszek", async () => {
      await studyPage.goto();
      await studyPage.expectHeroVisible();
      await studyPage.expectSessionReady();
      await studyPage.completeSession(5);

      const summaryTitle = await studyPage.summary.getTitleText();
      expect(summaryTitle).toContain("sesja zakończona");

      await studyPage.summary.clickSecondaryAction();
      await expect(flashcardsPage.page).toHaveURL("/flashcards");
      await flashcardsPage.waitForHydration();
      await flashcardsPage.expectPageLoaded();
    });

    await test.step("Sprzątanie danych testowych", async () => {
      if (!createdFlashcardId) {
        throw new Error("Brak identyfikatora utworzonej fiszki – nie można posprzątać danych testowych.");
      }

      const row = await flashcardsPage.table.waitForRowById(createdFlashcardId);
      await row.clickDelete();
      await flashcardsPage.deleteDialog.expectVisible();
      await flashcardsPage.deleteDialog.confirm();
      await flashcardsPage.waitForToast("Fiszka została usunięta");
      await flashcardsPage.table.expectRowMissingById(createdFlashcardId);
    });
  });
});
