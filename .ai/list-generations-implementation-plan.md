# API Endpoint Implementation Plan: GET /api/generations

## 1. Przegląd endpointu

Ten endpoint jest odpowiedzialny za pobieranie historii sesji generowania fiszek dla uwierzytelnionego użytkownika. Zwraca paginowaną listę, która pozwala na przeglądanie poprzednich generacji, w tym kluczowych metryk, takich jak liczba wygenerowanych i zaakceptowanych fiszek oraz wskaźnik akceptacji.

## 2. Szczegóły żądania

-   **Metoda HTTP:** `GET`
-   **Struktura URL:** `/api/generations`
-   **Parametry (Query):**
    -   **Opcjonalne:**
        -   `page` (integer, `default: 1`): Numer strony wyników.
        -   `limit` (integer, `default: 20`, `max: 50`): Liczba wyników na stronie.
-   **Request Body:** Brak

## 3. Wykorzystywane typy

-   `GenerationListResponseDTO`: Główny obiekt odpowiedzi.
-   `GenerationListItemDTO`: Reprezentuje pojedynczą sesję generowania na liście.
-   `PaginationDTO`: Zawiera metadane dotyczące paginacji.
-   `ErrorResponseDTO`: Standardowy format odpowiedzi w przypadku błędu.

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu (200 OK):**
    ```json
    {
      "data": [
        {
          "id": 123,
          "generated_count": 10,
          "accepted_count": 8,
          "acceptance_rate": 0.8,
          "created_at": "2025-10-25T10:00:00Z",
          "updated_at": "2025-10-25T10:05:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 45,
        "total_pages": 3
      }
    }
    ```

## 5. Przepływ danych

1.  Żądanie `GET` trafia do handlera Astro w `src/pages/api/generations/index.ts`.
2.  Middleware Astro weryfikuje sesję użytkownika na podstawie ciasteczek. Jeśli sesja jest nieprawidłowa, żądanie jest odrzucane z błędem `401 Unauthorized`.
3.  Handler API pobiera `user_id` z `context.locals.user`.
4.  Parametry zapytania `page` i `limit` są walidowane przy użyciu schemy `zod`. W przypadku błędu zwracany jest status `400 Bad Request`.
5.  Handler tworzy instancję serwisu (`new GenerationService(supabase)`), a następnie wywołuje jego metodę `listUserGenerations(userId, page, limit)`.
6.  `GenerationService` wykonuje dwa zapytania do bazy danych Supabase:
    a.  Zapytanie o całkowitą liczbę rekordów (`COUNT`) w tabeli `generations` dla danego `user_id`.
    b.  Zapytanie o paginowaną listę generacji dla danego `user_id`, posortowaną malejąco po `created_at`.
7.  Serwis iteruje po wynikach, obliczając dla każdego rekordu `acceptance_rate` (`accepted_count / generated_count`). Jeśli `accepted_count` jest `null`, `acceptance_rate` wynosi `0`.
8.  Serwis konstruuje obiekt `PaginationDTO` na podstawie całkowitej liczby rekordów, `page` i `limit`.
9.  Serwis zwraca do handlera gotowy obiekt `GenerationListResponseDTO`.
10. Handler API serializuje obiekt DTO do formatu JSON i wysyła go do klienta ze statusem `200 OK`.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Endpoint musi być chroniony i dostępny tylko dla zalogowanych użytkowników. Middleware Astro jest odpowiedzialne za weryfikację tokena sesji Supabase.
-   **Walidacja wejścia:** Parametry `page` i `limit` muszą być walidowane, aby upewnić się, że są to liczby całkowite w dopuszczalnym zakresie. Ograniczenie `limit` do 50 chroni bazę danych przed nadmiernym obciążeniem.

## 7. Obsługa błędów

-   **`400 Bad Request`**: Zwracany, gdy parametry `page` lub `limit` są nieprawidłowe (np. nie są liczbą, `limit > 50`). Odpowiedź zawiera `ErrorResponseDTO` z kodem `VALIDATION_ERROR`.
-   **`401 Unauthorized`**: Zwracany, gdy użytkownik nie jest uwierzytelniony. Odpowiedź zawiera `ErrorResponseDTO` z kodem `UNAUTHORIZED`.
-   **`500 Internal Server Error`**: Zwracany w przypadku problemów z połączeniem z bazą danych lub innych nieoczekiwanych błędów po stronie serwera. Odpowiedź zawiera `ErrorResponseDTO` z kodem `DATABASE_ERROR` lub `INTERNAL_ERROR`.

## 8. Rozważania dotyczące wydajności

-   **Indeksowanie bazy danych:** Aby zapewnić szybkie i wydajne paginowanie, należy upewnić się, że na tabeli `generations` istnieje złożony indeks na kolumnach `(user_id, created_at DESC)`.
-   **Liczba zapytań:** Implementacja wymaga dwóch zapytań na jedno wywołanie API (jedno dla danych, drugie dla `COUNT`). Przy obecnej skali jest to akceptowalne. W przyszłości, przy bardzo dużych zbiorach danych, można rozważyć strategie optymalizacji, np. poprzez użycie `count()` jako window function lub estymacji.

## 9. Etapy wdrożenia

1.  **Struktura plików:** Utwórz plik `src/pages/api/generations/index.ts` dla handlera API oraz `src/lib/services/generation.service.ts` dla logiki biznesowej.
2.  **Walidacja:** W `index.ts` zdefiniuj schemę `zod` do walidacji parametrów `page` i `limit`.
3.  **Handler API:** W `index.ts` zaimplementuj handler `GET`, który:
    -   Pobiera sesję użytkownika z `context.locals`.
    -   Waliduje parametry zapytania.
    -   Wywołuje serwis `GenerationService`.
    -   Obsługuje błędy i zwraca odpowiednie kody statusu.
    -   Zwraca `GenerationListResponseDTO` w przypadku sukcesu.
4.  **Serwis:** W `generation.service.ts` zaimplementuj funkcję `listUserGenerations`, która:
    -   Jako metoda klasy, przyjmuje `userId`, `page` i `limit`, a do interakcji z bazą danych wykorzystuje `this.supabase`.
    -   Wykonuje zapytanie do bazy o paginowane dane generacji.
    -   Wykonuje zapytanie o całkowitą liczbę generacji.
    -   Mapuje wyniki z bazy danych na typ `GenerationListItemDTO`, obliczając `acceptance_rate`.
    -   Tworzy i zwraca obiekt `GenerationListResponseDTO`.
5.  **Baza danych:** Sprawdź i w razie potrzeby dodaj złożony indeks `(user_id, created_at DESC)` na tabeli `generations`.
