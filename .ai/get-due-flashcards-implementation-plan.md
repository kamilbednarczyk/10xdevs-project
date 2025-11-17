# API Endpoint Implementation Plan: Get Due Flashcards

## 1. Przegląd endpointu

Ten endpoint (`GET /api/study/due`) jest odpowiedzialny za pobieranie wszystkich fiszek, które są przeznaczone do powtórki dla uwierzytelnionego użytkownika. Wykorzystuje on algorytm SM-2, filtrując fiszki, których `due_date` jest wcześniejsza lub równa bieżącej dacie (lub dacie podanej w opcjonalnym parametrze).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/study/due`
- **Parametry zapytania (Query Parameters)**:
  - **Opcjonalne**:
    - `date` (`string`): Data w formacie ISO 8601 (np. `2025-11-17T10:00:00Z`). Jeśli nie zostanie podany, endpoint użyje bieżącej daty serwera.
- **Request Body**: Brak.

## 3. Wykorzystywane typy

Do implementacji tego punktu końcowego zostaną wykorzystane następujące typy zdefiniowane w `src/types.ts`:

- **`StudyFlashcardDTO[]`**: Odpowiedź będzie tablicą obiektów `StudyFlashcardDTO`.
- **`StudyFlashcardDTO`**: Typ reprezentujący pojedynczą fiszkę w kontekście sesji nauki.
  ```typescript
  export type StudyFlashcardDTO = Pick<
    Flashcard,
    "id" | "front" | "back" | "interval" | "repetition" | "ease_factor" | "due_date"
  >;
  ```
- **`ErrorResponseDTO`**: Standardowy format odpowiedzi w przypadku błędu.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK)**:
  ```json
  [
    {
      "id": "uuid-string-1",
      "front": "What is Astro?",
      "back": "A web framework for building fast, content-focused websites.",
      "interval": 2,
      "repetition": 1,
      "ease_factor": 2.5,
      "due_date": "2025-11-17T00:00:00Z"
    }
  ]
  ```
- **Odpowiedź błędu (4xx/5xx)**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR", // lub "UNAUTHORIZED", "DATABASE_ERROR"
      "message": "Invalid date format."
    }
  }
  ```

## 5. Przepływ danych

1.  Klient wysyła żądanie `GET` na adres `/api/study/due`.
2.  Middleware Astro weryfikuje sesję użytkownika Supabase. Jeśli sesja jest nieprawidłowa, żądanie jest odrzucane z kodem `401 Unauthorized`.
3.  Handler API w `src/pages/api/study/due.ts` otrzymuje żądanie.
4.  Handler pobiera opcjonalny parametr `date` z `Astro.url.searchParams`.
5.  Dane wejściowe są walidowane za pomocą schemy Zod. W przypadku błędu zwracany jest status `400 Bad Request`.
6.  Handler wywołuje funkcję `getDueFlashcards` z serwisu `src/lib/services/flashcard.service.ts`, przekazując `user_id` z `context.locals.user` oraz zweryfikowaną datę.
7.  Funkcja serwisowa buduje i wykonuje zapytanie do bazy Supabase:
    ```sql
    SELECT id, front, back, interval, repetition, ease_factor, due_date
    FROM flashcards
    WHERE user_id = :userId AND due_date <= :effectiveDate
    ORDER BY due_date ASC;
    ```
8.  Serwis zwraca listę fiszek (`StudyFlashcardDTO[]`) do handlera.
9.  Handler odsyła do klienta bezpośrednio tablicę fiszek otrzymaną z serwisu z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Endpoint musi być chroniony i dostępny tylko dla zalogowanych użytkowników. Należy wykorzystać `context.locals.supabase` i `context.locals.user` dostarczane przez middleware Astro.
- **Autoryzacja**: Wszystkie zapytania do bazy danych muszą być ściśle ograniczone do `user_id` aktualnie zalogowanego użytkownika. Zapobiegnie to wyciekowi danych między kontami.
- **Walidacja danych wejściowych**: Parametr `date` musi być rygorystycznie walidowany, aby zapobiec błędom w logice zapytań i potencjalnym atakom.

## 7. Rozważania dotyczące wydajności

- **Indeksowanie bazy danych**: Kluczowym elementem wydajności jest zapytanie filtrujące po `user_id` i `due_date`. Wymagany złożony indeks `(user_id, due_date)` na tabeli `flashcards` już istnieje, co zapewnia szybkie działanie zapytań.
- **Projekcja kolumn**: Zapytanie powinno pobierać tylko te kolumny, które są niezbędne dla `StudyFlashcardDTO`, aby zminimalizować transfer danych między bazą a serwerem.

## 8. Etapy wdrożenia

1.  **Aktualizacja Serwisu**:
    - W pliku `src/lib/services/flashcard.service.ts` dodaj nową metodę `getDueFlashcards(userId: string, date: string)`.
    - Zaimplementuj w niej logikę zapytania do Supabase, używając `supabase.from('flashcards').select(...)`.
    - Upewnij się, że zapytanie filtruje po `user_id`, `due_date` i sortuje wyniki.

2.  **Utworzenie Schemy Walidacji**:
    - W nowym pliku `src/lib/schemas/study.schema.ts` (lub istniejącym, jeśli pasuje) zdefiniuj schemę Zod dla parametrów zapytania:
      ```typescript
      import { z } from "zod";

      export const getDueFlashcardsSchema = z.object({
        date: z.string().datetime().optional(),
      });
      ```

3.  **Implementacja Handlera API**:
    - Utwórz nowy plik `src/pages/api/study/due.ts`.
    - Zaimplementuj `export const GET: APIRoute = async ({ locals, url }) => { ... }`.
    - Wewnątrz handlera:
      a. Sprawdź, czy `locals.user` istnieje. Jeśli nie, zwróć `401`.
      b. Pobierz `date` z `url.searchParams`.
      c. Zwaliduj parametry przy użyciu `getDueFlashcardsSchema`. W razie błędu zwróć `400`.
      d. Ustaw domyślną datę na `new Date().toISOString()`, jeśli parametr nie został podany.
      e. Wywołaj metodę `flashcardService.getDueFlashcards`.
      f. Obsłuż potencjalne błędy z serwisu i zwróć `500`.
      g. Sformatuj pomyślną odpowiedź jako `DueFlashcardsResponseDTO` i zwróć ją z kodem `200`.
      h. Dodaj `export const prerender = false;` na końcu pliku.
