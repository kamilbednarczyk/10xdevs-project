# API Endpoint Implementation Plan: Usuwanie Fiszki

## 1. Przegląd ednpointu

Ten dokument opisuje plan wdrożenia endpointu `DELETE /api/flashcards/:id`, który umożliwia uwierzytelnionym użytkownikom trwałe usuwanie swoich fiszek.

## 2. Szczegóły żądania

-   **Metoda HTTP:** `DELETE`
-   **Struktura URL:** `/api/flashcards/:id`
-   **Parametry:**
    -   **Wymagane:**
        -   `id` (parametr URL): Unikalny identyfikator fiszki w formacie UUID.
    -   **Opcjonalne:** Brak.
-   **Request Body:** Brak.

## 3. Wykorzystywane typy

-   **Odpowiedź błędu:** `ErrorResponseDTO` z `src/types.ts`

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu:**
    -   **Kod stanu:** `204 No Content`
    -   **Ciało odpowiedzi:** Puste.
-   **Odpowiedzi błędów:**
    -   **Kod stanu:** `400 Bad Request` (Błędne dane wejściowe)
    -   **Kod stanu:** `401 Unauthorized` (Brak uwierzytelnienia)
    -   **Kod stanu:** `404 Not Found` (Zasób nie znaleziony)
    -   **Kod stanu:** `500 Internal Server Error` (Błąd serwera)

## 5. Przepływ danych

1.  Użytkownik wysyła żądanie `DELETE` na adres `/api/flashcards/:id`.
2.  Middleware Astro weryfikuje token JWT użytkownika w celu uwierzytelnienia. Jeśli token jest nieprawidłowy lub go brakuje, zwraca `401 Unauthorized`.
3.  Handler endpointu w `src/pages/api/flashcards/[id].ts` odbiera żądanie.
4.  Handler waliduje parametr `id` z URL za pomocą schemy Zod (`z.string().uuid()`). W przypadku błędu walidacji zwraca `400 Bad Request`.
5.  Handler wywołuje funkcję `deleteFlashcard` z `flashcard.service.ts`, przekazując `id` fiszki.
6.  `flashcard.service.ts` wykonuje zapytanie `DELETE` do bazy danych Supabase: `DELETE FROM flashcards WHERE id = :id`. Polityka RLS (Row Level Security) automatycznie filtruje zapytanie, aby upewnić się, że operacja dotyczy tylko fiszek należących do uwierzytelnionego użytkownika.
7.  Jeśli zapytanie nie usunęło żadnego wiersza (ponieważ fiszka nie istnieje lub nie należy do użytkownika), serwis zwraca informację o niepowodzeniu. Handler na tej podstawie zwraca `404 Not Found`.
8.  Jeśli zapytanie zakończy się sukcesem, serwis zwraca informację o powodzeniu.
9.  Handler endpointu zwraca odpowiedź `204 No Content`.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Dostęp do endpointu jest chroniony przez middleware Astro, który weryfikuje sesję użytkownika Supabase.
-   **Autoryzacja:** Logika autoryzacji jest egzekwowana na poziomie bazy danych za pomocą polityki RLS (Row Level Security) w Supabase. Gwarantuje to, że użytkownicy mogą usuwać wyłącznie własne zasoby, a logika autoryzacji nie jest rozproszona w kodzie aplikacji.
-   **Walidacja danych wejściowych:** Parametr `id` będzie walidowany jako UUID, aby zapobiec błędom zapytań i potencjalnym atakom (np. SQL Injection, chociaż Supabase SDK jest sparametryzowane).
-   **Zapobieganie wyciekom informacji:** Endpoint będzie zwracał `404 Not Found` zarówno wtedy, gdy zasób nie istnieje, jak i wtedy, gdy użytkownik nie ma do niego uprawnień. Zapobiega to możliwości odgadnięcia istnienia zasobu przez stronę trzecią.

## 7. Rozważania dotyczące wydajności

-   Operacja `DELETE` na indeksowanym kluczu głównym (`id`) jest wysoce wydajna w PostgreSQL.
-   Polityka RLS dodaje nieznaczny narzut, ale jest on zoptymalizowany i nie powinien stanowić wąskiego gardła wydajnościowego przy normalnym użytkowaniu.
-   Endpoint nie powinien stanowić wąskiego gardła wydajnościowego przy normalnym użytkowaniu.

## 8. Etapy wdrożenia

1.  **Modyfikacja serwisu (`src/lib/services/flashcard.service.ts`):**
    -   Dodać nową, asynchroniczną funkcję `deleteFlashcard(id: string): Promise<ServiceResult<null>>`.
    -   Wewnątrz funkcji, użyć klienta Supabase do wykonania operacji `delete()` na tabeli `flashcards`, autoryzacja jest obsługiwana przez RLS.
    -   Zastosować filtr `.eq('id', id)`.
    -   Sprawdzić wynik operacji; jeśli `error`, zwrócić błąd. Jeśli `count` usuniętych wierszy wynosi 0, zwrócić błąd typu `not-found`. W przeciwnym razie zwrócić sukces.

2.  **Implementacja handlera API (`src/pages/api/flashcards/[id].ts`):**
    -   Dodać `export async function DELETE({ params, locals }: APIContext)`.
    -   Sprawdzić, czy użytkownik jest zalogowany (`locals.user`), jeśli nie - zwrócić `401 Unauthorized`.
    -   Zwalidować `params.id` za pomocą Zod (`z.string().uuid()`). W przypadku błędu zwrócić `400 Bad Request`.
    -   Wywołać `flashcardService.deleteFlashcard(id)`.
    -   Na podstawie obiektu `ServiceResult` zwróconego przez serwis, zwrócić odpowiednią odpowiedź HTTP:
        -   Jeśli sukces: `204 No Content`.
        -   Jeśli błąd `not-found`: `404 Not Found`.
        -   Jeśli inny błąd: `500 Internal Server Error`.
