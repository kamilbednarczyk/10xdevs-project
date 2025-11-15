# API Endpoint Implementation Plan: Update Flashcard

## 1. Przegląd endpointu
Ten dokument opisuje plan wdrożenia endpointu `PUT /api/flashcards/:id`, który umożliwia uwierzytelnionym użytkownikom aktualizację treści (`front` i `back`) posiadanej fiszki.

## 2. Szczegóły żądania
-   **Metoda HTTP:** `PUT`
-   **Struktura URL:** `/api/flashcards/:id`
-   **Parametry:**
    -   **URL (wymagane):**
        -   `id` (`string`, format `uuid`): Unikalny identyfikator fiszki do zaktualizowania.
    -   **Opcjonalne:** Brak.
-   **Request Body:** Wymagany jest obiekt JSON o następującej strukturze:
    ```json
    {
      "front": "string",
      "back": "string"
    }
    ```

## 3. Wykorzystywane typy
-   **Command Model (Request):** `UpdateFlashcardCommand` (z `src/types.ts`)
-   **DTO (Response):** `FlashcardResponseDTO` (z `src/types.ts`)
-   **DTO (Error):** `ErrorResponseDTO` (z `src/types.ts`)

## 4. Szczegóły odpowiedzi
-   **Odpowiedź sukcesu (200 OK):** Zwraca pełny, zaktualizowany obiekt fiszki.
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 0,
      "repetition": 0,
      "ease_factor": 2.5,
      "due_date": "2025-10-25T12:00:00Z",
      "generation_type": "manual",
      "generation_id": null,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T12:30:00Z"
    }
    ```
-   **Odpowiedzi błędów:** Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych
1.  Żądanie `PUT` trafia do endpointa Astro `src/pages/api/flashcards/[id].ts`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje token JWT użytkownika i dołącza sesję do `context.locals`. Klient Supabase jest inicjowany z tym tokenem, co aktywuje polityki RLS dla wszystkich zapytań. Jeśli token jest nieprawidłowy, middleware zwraca `401 Unauthorized`.
3.  Handler `PUT` w pliku endpointa odczytuje `id` z `Astro.params` oraz ciało żądania z `Astro.request`.
4.  Parametr `id` jest walidowany jako poprawny UUID.
5.  Ciało żądania jest walidowane przy użyciu schemy Zod zdefiniowanej w `src/lib/schemas/flashcard.schema.ts`, która sprawdza obecność, typ i długość pól `front` i `back`.
6.  Jeśli walidacja się nie powiedzie, handler zwraca odpowiedź `400 Bad Request` ze szczegółami błędu.
7.  Handler wywołuje metodę serwisową, np. `flashcardService.update(id, validatedData)`, przekazując ID fiszki oraz zwalidowane dane. ID użytkownika nie jest jawnie przekazywane, ponieważ RLS zajmie się autoryzacją na poziomie bazy danych.
8.  Metoda `update` w `FlashcardService` wykonuje zapytanie `UPDATE` do bazy Supabase. Dzięki RLS, zapytanie to zadziała tylko na wierszach należących do uwierzytelnionego użytkownika:
    ```sql
    UPDATE flashcards
    SET front = :front, back = :back, updated_at = now()
    WHERE id = :id;
    -- Warunek user_id jest niejawnie dodawany przez politykę RLS w Supabase
    ```
9.  Serwis sprawdza, czy operacja `UPDATE` zmodyfikowała dokładnie jeden wiersz. Jeśli nie, oznacza to, że fiszka o podanym `id` nie istnieje lub nie należy do użytkownika (została odfiltrowana przez RLS), więc serwis zwraca błąd (lub `null`).
10. Handler endpointa otrzymuje zaktualizowaną fiszkę (lub błąd) z serwisu.
11. W przypadku sukcesu, handler wysyła odpowiedź `200 OK` z danymi zaktualizowanej fiszki.
12. W przypadku błędu z serwisu (np. fiszka nie znaleziona), handler wysyła odpowiedź `404 Not Found`.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie:** Endpoint musi być chroniony. Dostęp jest dozwolony tylko dla uwierzytelnionych użytkowników z ważnym tokenem sesji Supabase.
-   **Autoryzacja:** Za autoryzację odpowiada polityka Row Level Security (RLS) w bazie danych Supabase. Polityki RLS dla tabeli `flashcards` zapewniają, że użytkownicy mogą modyfikować wyłącznie własne rekordy. Eliminuje to potrzebę dodawania jawnych warunków `WHERE user_id = ...` w kodzie aplikacji, co zmniejsza ryzyko błędu programisty.
-   **Walidacja danych wejściowych:** Wszystkie dane wejściowe (`id`, `front`, `back`) muszą być rygorystycznie walidowane pod kątem formatu, typu i długości, aby zapobiec błędom i potencjalnym atakom (np. przepełnienie bufora).

## 7. Obsługa błędów
Endpoint będzie zwracał błędy w ustandaryzowanym formacie `ErrorResponseDTO`.
-   **`400 Bad Request`**:
    -   **Kod:** `VALIDATION_ERROR`
    -   **Przyczyna:** `id` w URL nie jest poprawnym UUID lub ciało żądania nie spełnia wymagań schemy Zod (np. brakujące pola, nieprawidłowe typy, przekroczona długość znaków).
-   **`401 Unauthorized`**:
    -   **Kod:** `UNAUTHORIZED`
    -   **Przyczyna:** Brak, nieważny lub wygasły token JWT.
-   **`404 Not Found`**:
    -   **Kod:** `NOT_FOUND`
    -   **Przyczyna:** Fiszka o podanym `id` nie istnieje lub nie należy do uwierzytelnionego użytkownika.
-   **`500 Internal Server Error`**:
    -   **Kod:** `DATABASE_ERROR` lub `INTERNAL_ERROR`
    -   **Przyczyna:** Wystąpił problem z połączeniem z bazą danych lub inny nieprzewidziany błąd po stronie serwera.

## 8. Rozważania dotyczące wydajności
-   Nie przewiduje się problemów wydajnościowych dla tego endpointa przy normalnym obciążeniu.

## 9. Etapy wdrożenia
1.  **Schema Walidacji:** W pliku `src/lib/schemas/flashcard.schema.ts`, utwórz lub zaktualizuj schemę Zod (`updateFlashcardSchema`) do walidacji ciała żądania `PUT /api/flashcards/:id`.
2.  **Logika Serwisu:** W pliku `src/lib/services/flashcard.service.ts`, zaimplementuj metodę `update(id: string, data: UpdateFlashcardCommand): Promise<FlashcardResponseDTO | null>`. Metoda powinna wykonać zapytanie `UPDATE` w Supabase (bez jawnego `userId`) i zwrócić zaktualizowany rekord lub `null` w przypadku niepowodzenia.
3.  **Implementacja Endpointa:** W pliku `src/pages/api/flashcards/[id].ts`, dodaj handler `PUT`.
4.  **Integracja Walidacji:** W handlerze `PUT`, użyj stworzonej schemy Zod do walidacji `Astro.request.body`.
5.  **Pobranie Danych Użytkownika:** Handler `PUT` nie musi już jawnie pobierać `userId` w celu przekazania go do serwisu, ponieważ RLS jest aktywowane w `context.locals`.
6.  **Wywołanie Serwisu:** Wywołaj metodę `flashcardService.update()` z ID fiszki i zwalidowanymi danymi.
7.  **Obsługa Odpowiedzi:** Zaimplementuj logikę zwracania odpowiedzi `200 OK` w przypadku sukcesu lub odpowiednich kodów błędów (`400`, `404`, `500`) w zależności od wyniku operacji.
