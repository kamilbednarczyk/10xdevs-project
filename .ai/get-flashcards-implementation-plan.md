# API Endpoint Implementation Plan: GET /api/flashcards

## 1. Przegląd endpointu
Ten endpoint umożliwia pobranie listy wszystkich fiszek należących do uwierzytelnionego użytkownika. Obsługuje paginację w celu efektywnego zarządzania dużymi zbiorami danych oraz sortowanie wyników według określonych kryteriów.

## 2. Szczegóły żądania
- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/flashcards`
- **Parametry zapytania (Query Parameters):**
  - **Opcjonalne:**
    - `page` (integer, domyślnie: `1`) - Numer strony wyników.
    - `limit` (integer, domyślnie: `50`, max: `100`) - Liczba fiszek na stronę.
    - `sort` (string, domyślnie: `"created_at"`) - Pole do sortowania. Dozwolone wartości: `created_at`, `due_date`, `updated_at`.
    - `order` (string, domyślnie: `"desc"`) - Kierunek sortowania. Dozwolone wartości: `asc`, `desc`.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- `FlashcardListResponseDTO`: Główny obiekt odpowiedzi zawierający dane i informacje o paginacji.
- `FlashcardResponseDTO`: Reprezentacja pojedynczej fiszki (alias dla encji `Flashcard`).
- `PaginationDTO`: Obiekt z metadanymi paginacji (`page`, `limit`, `total`, `total_pages`).

## 4. Szczegóły odpowiedzi
- **200 OK:** Pomyślnie pobrano listę fiszek.
  ```json
  {
    "data": [
      {
        "id": "uuid",
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
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "total_pages": 3
    }
  }
  ```
- **Error Responses:** Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych
1.  Żądanie `GET` trafia do endpointu Astro w `src/pages/api/flashcards/index.ts`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje sesję użytkownika Supabase. W przypadku braku sesji, żądanie jest odrzucane z kodem `401 Unauthorized`.
3.  Handler `GET` w punkcie końcowym pobiera parametry zapytania z `Astro.url.searchParams`.
4.  Parametry są walidowane przy użyciu schemy Zod zdefiniowanej w `src/lib/schemas/flashcard.schema.ts`. W przypadku błędu walidacji, zwracany jest błąd `400 Bad Request`.
5.  Handler wywołuje funkcję serwisową, np. `flashcardService.listUserFlashcards`, przekazując `user.id` z sesji (`context.locals.session.user.id`) oraz zwalidowane parametry paginacji i sortowania.
6.  Funkcja serwisowa w `src/lib/services/flashcard.service.ts` buduje zapytanie do Supabase:
    -   Pobiera całkowitą liczbę fiszek dla danego `user_id` (`SELECT count(*) ...`).
    -   Pobiera listę fiszek z użyciem `SELECT ... FROM flashcards WHERE user_id = :userId`.
    -   Do zapytania dodawane jest sortowanie (`.order()`) oraz paginacja (`.range()`).
7.  Serwis oblicza `total_pages` i konstruuje obiekt `PaginationDTO`.
8.  Serwis zwraca obiekt zgodny z `FlashcardListResponseDTO`.
9.  Handler endpointu serializuje odpowiedź do formatu JSON i wysyła ją z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Każde żądanie musi być uwierzytelnione za pomocą tokena sesji Supabase. Dostęp do punktu końcowego bez ważnej sesji zostanie zablokowany.
- **Autoryzacja:** Logika zapytania w serwisie musi bezwzględnie zawierać klauzulę `WHERE user_id = :userId`, aby uniemożliwić użytkownikom dostęp do fiszek, które nie należą do nich.
- **Walidacja danych:** Parametry zapytania są rygorystycznie walidowane, aby zapobiec błędom zapytań SQL i potencjalnym atakom.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy parametry zapytania są nieprawidłowe (np. `limit` > 100, nieprawidłowa wartość `sort`). Odpowiedź będzie zawierać szczegóły błędu walidacji.
- **401 Unauthorized:** Zwracany, gdy użytkownik nie jest uwierzytelniony.
- **500 Internal Server Error:** Zwracany w przypadku nieoczekiwanych błędów po stronie serwera, np. problemu z połączeniem z bazą danych. Odpowiedź będzie zawierać ogólny komunikat o błędzie.

## 8. Rozważania dotyczące wydajności
- **Indeksowanie bazy danych:** Aby zapewnić szybkie sortowanie i filtrowanie, należy upewnić się, że w tabeli `flashcards` istnieją indeksy na kolumnach: `user_id` oraz na kolumnach używanych do sortowania (`created_at`, `due_date`, `updated_at`). Zalecany jest indeks złożony, np. `(user_id, created_at)`.
- **Limit paginacji:** Maksymalny limit 100 elementów na stronę zapobiega nadmiernemu obciążeniu bazy danych i serwera.

## 9. Etapy wdrożenia
1.  **Schema Walidacji:** W pliku `src/lib/schemas/flashcard.schema.ts` zdefiniuj schemę Zod do walidacji parametrów `page`, `limit`, `sort` i `order`.
2.  **Logika Serwisu:** W pliku `src/lib/services/flashcard.service.ts` zaimplementuj nową metodę `listUserFlashcards({ userId, page, limit, sort, order })`. Metoda ta powinna:
    -   Wykonać dwa zapytania do Supabase: jedno po całkowitą liczbę rekordów (`count`), a drugie po dane z uwzględnieniem paginacji i sortowania.
    -   Obliczyć `totalPages`.
    -   Zwrócić obiekt `{ data, pagination }`.
3.  **Implementacja Endpointu:** Utwórz plik `src/pages/api/flashcards/index.ts`.
4.  W pliku endpointu zaimplementuj handler `GET`:
    -   Pobierz sesję użytkownika z `context.locals.session`. Jeśli nie istnieje, zwróć `401`.
    -   Sparsuj i zwaliduj parametry zapytania przy użyciu stworzonej schemy Zod. W razie błędu zwróć `400`.
    -   Wywołaj metodę `listUserFlashcards` z serwisu.
    -   Obsłuż ewentualne błędy z serwisu w bloku `try...catch` i zwróć `500`.
    -   Zwróć pomyślną odpowiedź z kodem `200`.
5.  **Indeksy w Bazie Danych (Opcjonalnie):** Utwórz nową migrację Supabase, aby dodać indeksy do tabeli `flashcards` na kolumnach `(user_id, created_at)` i `(user_id, updated_at)`.
