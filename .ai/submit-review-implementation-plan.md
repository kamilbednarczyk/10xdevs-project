# API Endpoint Implementation Plan: `POST /api/flashcards/:id/review`

## 1. Przegląd endpointu

Ten endpoint jest przeznaczony do obsługi procesu oceny fiszki przez użytkownika w ramach sesji nauki. Po otrzymaniu oceny jakości (`quality`) od użytkownika, serwer oblicza nowe parametry dla algorytmu powtórek w odstępach (Spaced Repetition) SM-2. Aktualizuje on interwał następnej powtórki, współczynnik łatwości i datę kolejnej nauki, a następnie zapisuje te zmiany w bazie danych. Punkt końcowy jest kluczowym elementem mechaniki nauki i wymaga uwierzytelnienia użytkownika.

## 2. Szczegóły żądania

-   **Metoda HTTP**: `POST`
-   **Struktura URL**: `/api/flashcards/{id}/review`
-   **Parametry**:
    -   **Wymagane**:
        -   `id` (w URL, uuid): Unikalny identyfikator fiszki, która jest oceniana.
    -   **Opcjonalne**: Brak.
-   **Ciało żądania (Request Body)**:
    -   Format: `application/json`
    -   Struktura:
        ```json
        {
          "quality": 3
        }
        ```
    -   Pola:
        -   `quality` (wymagany, integer): Ocena jakości odpowiedzi użytkownika w skali od 0 do 5.

## 3. Wykorzystywane typy

-   **Command Model (Request)**: `SubmitReviewCommand` (`src/types.ts`)
    ```typescript
    export interface SubmitReviewCommand {
      quality: 0 | 1 | 2 | 3 | 4 | 5;
    }
    ```
-   **DTO (Response)**: `ReviewResponseDTO` (`src/types.ts`)
    ```typescript
    export type ReviewResponseDTO = Pick<
      Flashcard,
      "id" | "interval" | "repetition" | "ease_factor" | "due_date" | "updated_at"
    >;
    ```

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu (200 OK)**:
    -   Zwraca zaktualizowane parametry SM-2 dla fiszki.
    -   Struktura:
        ```json
        {
          "id": "uuid-string-of-the-flashcard",
          "interval": 5,
          "repetition": 3,
          "ease_factor": 2.36,
          "due_date": "2025-11-22T10:00:00Z",
          "updated_at": "2025-11-17T10:00:00Z"
        }
        ```
-   **Odpowiedzi błędów**:
    -   `400 Bad Request`: Nieprawidłowe dane wejściowe.
    -   `401 Unauthorized`: Użytkownik nie jest zalogowany.
    -   `404 Not Found`: Fiszka nie została znaleziona lub nie należy do użytkownika.
    -   `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Żądanie `POST` trafia do endpointu Astro `src/pages/api/flashcards/[id]/review.ts`.
2.  Middleware (lub kod na początku endpointu) weryfikuje token JWT użytkownika w celu uwierzytelnienia.
3.  Endpoint parse'uje ciało żądania i waliduje je przy użyciu schematu Zod dla `SubmitReviewCommand`.
4.  Parametr `id` z URL jest walidowany jako UUID.
5.  Serwer wykonuje zapytanie do bazy danych Supabase, aby pobrać fiszkę o zadanym `id`. Dostęp do danych jest chroniony przez RLS (Row-Level Security), co gwarantuje, że zapytanie zwróci dane tylko dla zalogowanego użytkownika.
6.  Jeśli fiszka nie zostanie znaleziona, zwracany jest błąd 404.
7.  Endpoint wywołuje funkcję z serwisu `FlashcardService` (np. `reviewFlashcard`), przekazując jej pobrany obiekt fiszki i `quality` z żądania.
8.  Funkcja serwisowa implementuje logikę algorytmu SM-2, obliczając nowe wartości dla `interval`, `repetition`, `ease_factor` i `due_date`.
9.  Serwis zwraca obiekt z nowymi wartościami.
10. Endpoint wykonuje zapytanie `UPDATE` do bazy danych Supabase, aby zaktualizować rekord fiszki nowymi parametrami.
11. Po pomyślnej aktualizacji, endpoint konstruuje odpowiedź `ReviewResponseDTO` i wysyła ją do klienta ze statusem `200 OK`.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie**: Dostęp do endpointu musi być chroniony. Należy sprawdzić sesję użytkownika z `Astro.locals.user`. W przypadku braku sesji, zwrócić `401 Unauthorized`.
-   **Autoryzacja**: Najważniejszy aspekt bezpieczeństwa. Autoryzacja będzie zarządzana na poziomie bazy danych przez RLS (Row-Level Security) Supabase. Polityki RLS zapewnią, że użytkownicy mogą odczytywać i modyfikować wyłącznie własne fiszki. Dzięki temu zapytania w kodzie aplikacji nie muszą zawierać jawnych warunków `WHERE user_id = ...`, co upraszcza kod i centralizuje logikę bezpieczeństwa. Zapobiega to atakom typu IDOR.
-   **Walidacja Danych Wejściowych**: Ciało żądania musi być walidowane za pomocą Zod, aby upewnić się, że pole `quality` jest liczbą całkowitą w dozwolonym zakresie (0-5). Parametr `id` musi być sprawdzony pod kątem formatu UUID.

## 7. Rozważania dotyczące wydajności

-   **Operacje na bazie danych**: Endpoint wykonuje jedno zapytanie `SELECT` i jedno `UPDATE`. Są to operacje indeksowane (po kluczu głównym `id` i kluczu obcym `user_id`), więc powinny być bardzo wydajne.
-   **Obliczenia**: Algorytm SM-2 to proste obliczenia matematyczne, które nie stanowią wąskiego gardła wydajnościowego.
-   **Wnioski**: Nie przewiduje się problemów z wydajnością. Endpoint powinien odpowiadać bardzo szybko.

## 8. Etapy wdrożenia

1.  **Utworzenie schematu walidacji Zod**: W nowym pliku `src/lib/schemas/study.schema.ts` (lub istniejącym, jeśli pasuje) zdefiniować schemat dla `SubmitReviewCommand`.
2.  **Rozszerzenie `FlashcardService`**:
    -   W pliku `src/lib/services/flashcard.service.ts` dodać nową, publiczną metodę `reviewFlashcard`.
    -   Metoda ta powinna przyjmować jako argumenty oryginalny obiekt fiszki oraz ocenę `quality`.
    -   Na chwilę obecną zaimplementować mockową wersję logiki, która zwraca przykładowe, zakodowane na stałe wartości dla zaktualizowanych pól. Właściwa implementacja algorytmu SM-2 zostanie dodana w osobnym zadaniu.
    -   Metoda powinna zwracać obiekt zawierający zaktualizowane pola: `interval`, `repetition`, `ease_factor`, `due_date`.
3.  **Utworzenie pliku endpointu**: Utworzyć plik `src/pages/api/flashcards/[id]/review.ts`.
4.  **Implementacja obsługi żądania `POST`**:
    -   Zdefiniować funkcję `POST` obsługującą żądanie `Astro.request`.
    -   Sprawdzić uwierzytelnienie użytkownika (`Astro.locals.user`).
    -   Sprawdzić poprawność `id` z `Astro.params`.
    -   Zwalidować ciało żądania przy użyciu stworzonego schematu Zod.
    -   Pobrać fiszkę z bazy danych, weryfikując jej przynależność do użytkownika.
    -   Wywołać metodę `reviewFlashcard` z serwisu, aby uzyskać zaktualizowane dane.
    -   Zaktualizować rekord fiszki w bazie danych.
    -   Zwrócić odpowiedź `ReviewResponseDTO` w formacie JSON ze statusem 200.
5.  **Implementacja obsługi błędów**:
    -   Dodać bloki `try...catch` do obsługi potencjalnych błędów.
    -   Implementować zwracanie odpowiednich kodów statusu (400, 401, 404, 500) wraz z komunikatem błędu w standardowym formacie `ErrorResponseDTO`.
