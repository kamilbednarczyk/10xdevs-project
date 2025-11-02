# API Endpoint Implementation Plan: Create Multiple Flashcards (Batch)

## 1. Przegląd punktu końcowego
Ten punkt końcowy (`POST /api/flashcards/batch`) umożliwia użytkownikom tworzenie wielu fiszek w jednym żądaniu. Obsługuje zarówno fiszki tworzone manualnie, jak i te pochodzące z generacji AI. W przypadku fiszek typu "ai", endpoint atomowo aktualizuje licznik zaakceptowanych fiszek w powiązanym rekordzie generacji, zapewniając spójność danych.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/flashcards/batch`
- **Parametry:** Brak parametrów w URL.
- **Request Body:** Oczekiwany format to JSON zawierający obiekt z jednym polem `flashcards`.

```json
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "generation_type": "ai",
      "generation_id": 123
    },
    {
      "front": "string",
      "back": "string",
      "generation_type": "manual",
      "generation_id": null
    }
  ]
}
```

## 3. Wykorzystywane typy
- **Request Command Model:** `CreateFlashcardsBatchCommand`
- **Request Item Command Model:** `FlashcardBatchItemCommand`
- **Response DTO:** `FlashcardsBatchResponseDTO`

(Wszystkie typy są już zdefiniowane w `src/types.ts`)

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (201 Created):**
```json
{
  "created_count": 2,
  "flashcards": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 0,
      "repetition": 0,
      "ease_factor": 2.5,
      "due_date": "2025-10-25T12:00:00Z",
      "generation_type": "ai",
      "generation_id": 123,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:00:00Z"
    }
  ]
}
```
- **Odpowiedzi błędów:** Zgodnie ze standardowym formatem `ErrorResponseDTO` zdefiniowanym w `src/types.ts`.

## 5. Przepływ danych
1.  **Endpoint API (`/api/flashcards/batch.ts`):**
    *   Odbiera żądanie `POST`.
    *   Weryfikuje sesję użytkownika z `Astro.locals.supabase`. Jeśli brak, zwraca `401 Unauthorized`.
    *   Pobiera `user_id` z sesji.
    *   Waliduje ciało żądania przy użyciu schemy Zod. W przypadku błędu zwraca `400 Bad Request` ze szczegółami.
    *   Wywołuje metodę serwisową, np. `flashcardService.createFlashcardsBatch(validatedData, userId)`.
    *   Obsługuje potencjalne błędy z warstwy serwisowej (np. `GenerationNotFound`, `ForbiddenAccess`) i mapuje je na odpowiednie kody statusu HTTP (`404`, `400`).
    *   W przypadku sukcesu, zwraca odpowiedź `201 Created` z danymi zwróconymi przez serwis.
2.  **Warstwa serwisowa (`FlashcardService`):**
    *   Otrzymuje zweryfikowane dane i `userId`.
    *   Gromadzi wszystkie unikalne `generation_id` z fiszek typu "ai".
    *   Jeśli istnieją `generation_id`, wykonuje zapytanie do bazy w celu weryfikacji, czy wszystkie podane ID istnieją i należą do danego `userId`. Jeśli nie, rzuca odpowiedni błąd.
    *   Otwiera transakcję w bazie danych.
    *   W ramach transakcji:
        a.  Mapuje dane z `command` na obiekty do wstawienia do tabeli `flashcards` (dodając `user_id` i domyślne wartości SM-2).
        b.  Wykonuje operację `insert` na tabeli `flashcards`.
        c.  Dla każdego unikalnego `generation_id` inkrementuje pole `accepted_count` w tabeli `generations` o liczbę fiszek z tego `generation_id` w żądaniu.
    *   Zatwierdza transakcję.
    *   Zwraca nowo utworzone rekordy fiszek do endpointu.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint musi być chroniony. Dostęp jest możliwy tylko dla zalogowanych użytkowników. Middleware w Astro (`src/middleware/index.ts`) powinno zarządzać sesją Supabase.
- **Autoryzacja:** Przed przypisaniem fiszki do generacji (`generation_id`), serwis musi zweryfikować, czy rekord generacji należy do uwierzytelnionego użytkownika. Zapobiega to sytuacji, w której użytkownik A przypisuje fiszki do generacji użytkownika B.
- **Walidacja danych wejściowych:** Użycie Zod do ścisłej walidacji ciała żądania chroni przed nieoczekiwanymi danymi i potencjalnymi atakami (np. Mass Assignment). Należy walidować typy, długości stringów oraz wartości enum.

## 7. Obsługa błędów
| Kod Statusu | Nazwa Błędu (propozycja) | Opis                                                                                                                              |
| :---------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `400`       | `VALIDATION_ERROR`       | Ciało żądania nie przeszło walidacji Zod (np. brakujące pola, zły format, pusta tablica).                                          |
| `400`       | `FORBIDDEN`              | Użytkownik próbuje utworzyć fiszkę z `generation_id`, które nie należy do niego.                                                    |
| `401`       | `UNAUTHORIZED`           | Użytkownik nie jest zalogowany (brak aktywnej sesji).                                                                               |
| `404`       | `NOT_FOUND`              | Podany `generation_id` nie istnieje w bazie danych.                                                                               |
| `422`       | `UNPROCESSABLE_ENTITY`   | Błąd parsowania JSON, ciało żądania jest w nieprawidłowym formacie.                                                                |
| `500`       | `INTERNAL_ERROR`         | Błąd podczas wykonywania transakcji w bazie danych lub inny nieprzewidziany błąd po stronie serwera. Logować po stronie serwera. |

## 8. Rozważania dotyczące wydajności
- **Transakcje:** Wykonanie wszystkich operacji na bazie danych (wstawienie fiszek, aktualizacja liczników) w ramach jednej transakcji jest kluczowe nie tylko dla integralności, ale także dla wydajności, minimalizując liczbę "round-tripów" do bazy.
- **Operacje masowe:** Należy używać masowych operacji `insert` (np. `supabase.from('flashcards').insert([...])`) zamiast wstawiania rekordów w pętli, aby zredukować obciążenie bazy danych.
- **Limit żądania:** Chociaż specyfikacja tego nie określa, warto rozważyć nałożenie limitu na liczbę fiszek w jednym żądaniu (np. 100), aby zapobiec zbyt dużym i długotrwałym transakcjom.

## 9. Etapy wdrożenia
1.  **Stworzenie plików:**
    *   Utworzyć nowy plik dla endpointu: `src/pages/api/flashcards/batch.ts`.
    *   Utworzyć nowy plik dla serwisu: `src/lib/services/flashcard.service.ts`.
    *   Utworzyć nowy plik dla schematów walidacji: `src/lib/schemas/flashcard.schema.ts`.
2.  **Schema walidacji (Zod):**
    *   W `flashcard.schema.ts` zdefiniować `FlashcardBatchItemSchema` i `CreateFlashcardsBatchSchema`.
    *   Dodać walidację warunkową (`.refine()`), aby `generation_id` było wymagane tylko dla typu `ai`.
3.  **Warstwa serwisowa (`FlashcardService`):**
    *   Stworzyć klasę `FlashcardService` z konstruktorem przyjmującym instancję `SupabaseClient`.
    *   Zaimplementować metodę `createFlashcardsBatch(command, userId)`.
    *   W metodzie zawrzeć logikę weryfikacji uprawnień do `generation_id`.
    *   Zaimplementować logikę transakcyjną do wstawiania fiszek i aktualizowania liczników generacji.
4.  **Endpoint API (`batch.ts`):**
    *   Zaimplementować handler `POST`.
    *   Dodać `export const prerender = false;`
    *   Pobrać klienta Supabase i `userId` z `Astro.locals`.
    *   Zwalidować ciało żądania przy użyciu stworzonej schemy Zod.
    *   Zainicjować `FlashcardService` i wywołać metodę `createFlashcardsBatch`.
    *   Dodać kompleksową obsługę błędów z bloku `try...catch` i zwracać odpowiednie kody statusu.
    *   Zwrócić `201 Created` w przypadku powodzenia.
