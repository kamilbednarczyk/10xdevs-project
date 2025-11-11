# API Endpoint Implementation Plan: Create Flashcard

## 1. Przegląd endpointu

Ten endpoint umożliwia użytkownikom tworzenie nowej fiszki. Po pomyślnym utworzeniu zwraca pełny obiekt nowej fiszki.

## 2. Szczegóły żądania

-   **Metoda HTTP:** `POST`
-   **Struktura URL:** `/api/flashcards`
-   **Request Body:**

    ```json
    {
      "front": "string",
      "back": "string",
      "generation_type": "manual"
    }
    ```

-   **Parametry:**
    -   **Wymagane:** `front`, `back`, `generation_type`.
    -   **Opcjonalne:** Brak.
    -   **Uwaga:** Endpoint akceptuje tylko `generation_type: "manual"`. Fiszki AI są tworzone przez endpoint `/api/flashcards/batch`.

## 3. Wykorzystywane typy

-   **Command Model (Request):** `CreateFlashcardCommand` (`src/types.ts`)
-   **Response DTO (Success):** `FlashcardResponseDTO` (`src/types.ts`)
-   **Response DTO (Error):** `ErrorResponseDTO` (`src/types.ts`)

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu (201 Created):**

    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 0,
      "repetition": 0,
      "ease_factor": 2.5,
      "due_date": "timestamp",
      "generation_type": "manual",
      "generation_id": null,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
    ```

-   **Odpowiedzi błędów:**
    -   `400 Bad Request`: Błąd walidacji danych wejściowych.
    -   `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
    -   `422 Unprocessable Entity`: Nieprawidłowy format JSON w żądaniu.
    -   `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Klient wysyła żądanie `POST` na adres `/api/flashcards` z danymi fiszki w ciele żądania.
2.  Middleware Astro weryfikuje token JWT i umieszcza sesję użytkownika w `context.locals`.
3.  Handler API (`src/pages/api/flashcards/index.ts`) odbiera żądanie.
4.  Handler sprawdza istnienie sesji użytkownika. Jeśli jej nie ma, zwraca `401 Unauthorized`.
5.  Ciało żądania jest parsowane i walidowane przy użyciu predefiniowanego schematu `zod`. W przypadku błędu walidacji zwracany jest `400 Bad Request`.
6.  Handler wywołuje funkcję `createFlashcard` z serwisu `flashcard.service.ts`, przekazując zwalidowane dane oraz `user_id` z sesji.
7.  Funkcja serwisowa tworzy nowy obiekt fiszki, ustawiając `user_id` i pozostawiając wartości domyślne dla `interval`, `repetition`, `ease_factor` i `due_date`.
8.  Serwis używa klienta Supabase do wstawienia nowego rekordu do tabeli `flashcards`.
9.  Baza danych zwraca nowo utworzony rekord fiszki do serwisu.
10. Serwis zwraca pomyślny wynik do handlera.
11. Handler formatuje odpowiedź, używając `FlashcardResponseDTO`, i wysyła ją do klienta ze statusem `201 Created`.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Endpoint jest chroniony, a dostęp jest możliwy tylko po podaniu ważnego tokenu JWT (obsługiwane przez middleware Supabase). Identyfikator `user_id` jest pobierany z zaufanego źródła (sesji serwerowej), a nie z danych wejściowych klienta.
-   **Autoryzacja:** Użytkownicy mogą tworzyć zasoby tylko we własnym imieniu.
-   **Walidacja danych:** Użycie `zod` do walidacji danych wejściowych zapobiega wprowadzaniu nieprawidłowych lub złośliwych danych do bazy danych (np. zbyt długich tekstów).

## 7. Rozważania dotyczące wydajności

-   Operacja polega na pojedynczym zapisie (`INSERT`) do bazy danych, co jest operacją o niskim koszcie.
-   Nie przewiduje się problemów z wydajnością przy normalnym użytkowaniu.

## 8. Etapy wdrożenia

1.  **Utworzenie schematu walidacji Zod:**
    -   W pliku `src/lib/schemas/flashcard.schema.ts` zdefiniowano schemat `CreateFlashcardSchema` do walidacji przychodzących danych dla nowej fiszki.
    -   **Ważne:** Schemat akceptuje tylko `generation_type: "manual"` używając `z.literal("manual")`.

2.  **Implementacja logiki serwisowej:**
    -   Utworzyć plik `src/lib/services/flashcard.service.ts`, jeśli nie istnieje.
    -   Dodać funkcję `createFlashcard(command: CreateFlashcardCommand, userId: string, generationType: "manual" | "ai")`.
    -   Wewnątrz funkcji, użyć klienta Supabase (`supabase.from('flashcards').insert(...).select().single()`) do zapisu nowej fiszki w bazie danych.
    -   Funkcja powinna obsługiwać potencjalne błędy zapisu i zwracać je w ustrukturyzowany sposób (np. `Result` lub `Promise.reject`).

3.  **Implementacja handlera API w Astro:**
    -   Utworzyć plik `src/pages/api/flashcards/index.ts`.
    -   Zaimplementować funkcję `POST({ request, locals })`.
    -   Sprawdzić, czy `locals.session` istnieje; jeśli nie, zwrócić odpowiedź `401`.
    -   Sparować ciało żądania `request.json()`.
    -   Zwalidować dane przy użyciu `CreateFlashcardSchema.safeParse()`. W przypadku błędu, zwrócić odpowiedź `400` ze szczegółami.
    -   Wywołać `flashcardService.createFlashcard()` z poprawnymi danymi i `session.user.id`.
    -   Obsłużyć wynik z serwisu: w przypadku sukcesu zwrócić `201 Created` z danymi fiszki, a w przypadku błędu `500 Internal Server Error`.
