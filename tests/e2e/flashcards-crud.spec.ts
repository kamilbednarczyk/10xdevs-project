import { test } from "./fixtures/auth.fixture";
import { FlashcardsPage } from "./pages/flashcards.page";

test.describe("Flashcards CRUD flow", () => {
  test("user can create, edit and delete a flashcard", async ({ authenticatedPage }) => {
    const flashcardsPage = new FlashcardsPage(authenticatedPage);
    const uniqueSuffix = Date.now();
    const flashcardFront = `Scenariusz E2E front ${uniqueSuffix}`;
    const flashcardBack = `Scenariusz E2E back ${uniqueSuffix}`;
    const updatedFront = `${flashcardFront} - edytowana treść`;
    const updatedBack = `${flashcardBack} - zmieniona odpowiedź`;

    await test.step("Przejście do strony Moje Fiszki", async () => {
      await flashcardsPage.navigation.goToFlashcards();
      await flashcardsPage.waitForHydration();
      await flashcardsPage.expectPageLoaded();
    });

    // Create flashcard
    await test.step("Dodanie nowej fiszki", async () => {
      await flashcardsPage.createFlashcard(flashcardFront, flashcardBack);
      await flashcardsPage.waitForToast("Dodano nową fiszkę");
    });

    // Verify it appears in the table
    const createdRowByFront = await flashcardsPage.table.waitForRowByFrontText(flashcardFront);
    const flashcardId = await createdRowByFront.getId();
    const createdRow = flashcardsPage.table.getRowById(flashcardId);
    await createdRow.expectFrontText(flashcardFront);
    await createdRow.expectBackText(flashcardBack);

    // Edit flashcard
    await test.step("Edycja istniejącej fiszki", async () => {
      await createdRow.clickEdit();
      await flashcardsPage.formDialog.expectVisible();
      await flashcardsPage.formDialog.fillForm(updatedFront, updatedBack);
      await flashcardsPage.formDialog.submit();
      await flashcardsPage.formDialog.waitForClosed();
      await flashcardsPage.waitForToast("Zapisano zmiany");
    });

    const updatedRow = await flashcardsPage.table.waitForRowById(flashcardId);
    await updatedRow.expectFrontText(updatedFront);
    await updatedRow.expectBackText(updatedBack);

    // Delete flashcard
    await test.step("Usunięcie fiszki", async () => {
      await updatedRow.clickDelete();
      await flashcardsPage.deleteDialog.expectVisible();
      await flashcardsPage.deleteDialog.confirm();
      await flashcardsPage.waitForToast("Fiszka została usunięta");
    });

    await flashcardsPage.table.expectRowMissingById(flashcardId);
  });
});
