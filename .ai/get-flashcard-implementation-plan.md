# API Endpoint Implementation Plan: Get Single Flashcard

## 1. Przegląd endpointu

Endpoint `GET /api/flashcards/:id` służy do pobierania szczegółowych informacji o pojedynczej fiszce na podstawie jej unikalnego identyfikatora (UUID).

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/flashcards/[id].ts`
- **Parametry:**
  - **Wymagane:**
    - `id` (parametr URL): Identyfikator UUID fiszki, która ma zostać pobrana.
  - **Opcjonalne:** Brak
- **Request Body:** Brak

## 3. Wykorzystywane typy

- `FlashcardResponseDTO` (`src/types.ts`): Typ używany do formatowania pomyślnej odpowiedzi. Odpowiada strukturze tabeli `flashcards`.
- `ErrorResponseDTO` (`src/types.ts`): Standardowy obiekt odpowiedzi w przypadku wystąpienia błędu.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK):** Zwraca obiekt JSON reprezentujący fiszkę.
  ```json
  {
    "id": "uuid-string-here",
    "user_id": "user-uuid-string-here",
    "front": "What is Astro?",
    "back": "A web framework for building content-driven websites.",
    "interval": 0,
    "repetition": 0,
    "ease_factor": 2.5,
    "due_date": "2025-10-25T12:00:00Z",
    "generation_type": "manual",
    "generation_id": null,
    "created_at": "2025-10-25T10:00:00Z",
    "updated_at": "2025-10-25T10:00:00Z"
  }
  ```
- **Odpowiedzi błędów:**
  - `400 Bad Request`: Nieprawidłowy format ID fiszki.
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Fiszka o podanym ID nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera (np. błąd bazy danych).

## 5. Przepływ danych

1.  Użytkownik wysyła żądanie `GET` na adres `/api/flashcards/[id]`.
2.  Middleware Astro weryfikuje token JWT użytkownika, uwierzytelnia go i umieszcza sesję oraz instancję klienta Supabase w `context.locals`.
3.  Handler API (`src/pages/api/flashcards/[id].ts`) zostaje wywołany.
4.  Handler sprawdza, czy `context.locals.user` istnieje. Jeśli nie, zwraca `401`.
5.  Parametr `id` z `context.params` jest walidowany przy użyciu schematu Zod (`z.string().uuid()`). W przypadku błędu zwracany jest `400`.
6.  Handler wywołuje funkcję `getFlashcardById` z serwisu `flashcard.service.ts`, przekazując instancję Supabase, zweryfikowane `id` fiszki oraz `id` użytkownika z sesji.
7.  Serwis wykonuje zapytanie do tabeli `flashcards` w bazie Supabase: `SELECT * FROM flashcards WHERE id = :flashcardId AND user_id = :userId LIMIT 1`.
8.  Jeśli zapytanie nie zwróci żadnego rekordu, serwis zwraca `null`. Handler interpretuje to jako `404 Not Found`.
9.  Jeśli zapytanie zwróci rekord, serwis przekazuje go do handlera.
10. Handler formatuje odpowiedź jako `FlashcardResponseDTO` i wysyła ją z kodem statusu `200 OK`.
11. Wszelkie nieprzechwycone błędy (np. błąd połączenia z bazą danych) są łapane, logowane i zwracany jest status `500 Internal Server Error`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie:** Middleware Astro będzie odpowiedzialne za weryfikację sesji Supabase. Każde żądanie bez ważnej sesji zostanie odrzucone.
- **Autoryzacja:** Kluczowym elementem jest filtrowanie zapytań do bazy danych po `user_id`. Zapytanie w serwisie musi zawierać klauzulę `WHERE`, która sprawdza zarówno `id` fiszki, jak i `user_id` zalogowanego użytkownika. Zapobiega to wyciekowi danych między użytkownikami (IDOR).
- **Walidacja danych wejściowych:** Użycie Zod do walidacji formatu `id` jako UUID chroni przed potencjalnymi błędami zapytań i atakami.

## 7. Rozważania dotyczące wydajności

- Zapytanie do bazy danych będzie operować na kluczu głównym (`id`), co jest wysoce wydajne.
- Przy tej skali operacji nie przewiduje się problemów z wydajnością.

## 8. Etapy wdrożenia

1.  **Utworzenie serwisu:**
    -   Utwórz plik `src/lib/services/flashcard.service.ts`, jeśli nie istnieje.
    -   Zaimplementuj w nim asynchroniczną funkcję `getFlashcardById(supabase: SupabaseClient, flashcardId: string, userId: string): Promise<Flashcard | null>`.
    -   Funkcja powinna wykonać zapytanie `select().eq('id', flashcardId).eq('user_id', userId).single()` i zwrócić dane lub `null`.

2.  **Utworzenie walidatora:**
    -   Utwórz plik `src/lib/validators/common.validators.ts` (lub podobny), jeśli nie istnieje.
    -   Zdefiniuj i wyeksportuj schemat Zod: `export const UuidSchema = z.string().uuid();`.

3.  **Implementacja trasy API:**
    -   Utwórz plik `src/pages/api/flashcards/[id].ts`.
    -   Dodaj `export const prerender = false;`.
    -   Zaimplementuj handler `GET({ params, locals }: APIContext)`.

4.  **Logika w handlerze API:**
    -   Sprawdź istnienie sesji użytkownika w `locals.user`. W przypadku braku zwróć odpowiedź `401`.
    -   Zwaliduj `params.id` za pomocą `UuidSchema.safeParse()`. W przypadku błędu zwróć odpowiedź `400`.
    -   Wywołaj `getFlashcardById` z serwisu, przekazując `locals.supabase`, `params.id` oraz `locals.user.id`.
    -   Jeśli wynik z serwisu jest `null`, zwróć odpowiedź `404`.
    -   Jeśli dane zostały pobrane, zwróć odpowiedź `200` z danymi fiszki.
    -   Owiń logikę w blok `try...catch`, aby obsłużyć nieoczekiwane błędy i zwrócić `500`.
