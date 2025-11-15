# API Endpoint Implementation Plan: Get Generation Details

## 1. Przegląd endpointu

Ten endpoint (`GET /api/generations/:id`) umożliwia pobranie szczegółowych informacji o konkretnej sesji generowania fiszek przez AI. Użytkownik musi być uwierzytelniony, aby uzyskać dostęp do tego zasobu, i może pobierać tylko dane dotyczące własnych sesji.

## 2. Szczegóły żądania

-   **Metoda HTTP:** `GET`
-   **Struktura URL:** `/api/generations/[id].ts` (zgodnie z routingiem opartym na plikach w Astro)
-   **Parametry:**
    -   **Wymagane:**
        -   `id` (parametr URL, integer): Unikalny identyfikator sesji generowania.
    -   **Opcjonalne:** Brak
-   **Request Body:** Brak

## 3. Wykorzystywane typy

-   `GenerationDetailResponseDTO` (`src/types.ts`): Typ używany do serializacji danych w odpowiedzi na pomyślne żądanie. Jest to alias do typu `Generation`, który bezpośrednio mapuje się na strukturę tabeli `generations` w bazie danych.
-   `ErrorResponseDTO` (`src/types.ts`): Standardowy format odpowiedzi w przypadku wystąpienia błędu.

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu (200 OK):**
    ```json
    {
      "id": 123,
      "user_id": "uuid-of-the-user",
      "generated_count": 8,
      "accepted_count": 6,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:05:00Z"
    }
    ```
-   **Odpowiedzi błędów:** Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych

1.  Klient wysyła żądanie `GET` na adres `/api/generations/[id]`.
2.  Middleware Astro weryfikuje token JWT i dane sesji użytkownika z Supabase. Jeśli użytkownik jest nieprawidłowy, zwraca `401 Unauthorized`.
3.  Handler API w pliku `src/pages/api/generations/[id].ts` jest wywoływany.
4.  Handler pobiera `id` z parametrów URL (`context.params`).
5.  Parametr `id` jest walidowany przy użyciu schemy Zod, aby upewnić się, że jest to dodatnia liczba całkowita. W przypadku niepowodzenia walidacji, zwracany jest błąd `400 Bad Request`.
6.  Handler wywołuje funkcję z serwisu `GenerationService.getGenerationById(id, supabase)`, przekazując zwalidowane ID oraz instancję klienta Supabase.
7.  `GenerationService` wykonuje zapytanie do bazy danych: `SELECT * FROM generations WHERE id = :id LIMIT 1`.
8.  -   **Jeśli rekord zostanie znaleziony:** Serwis zwraca obiekt z danymi generacji. Handler API serializuje go do formatu `GenerationDetailResponseDTO` i zwraca odpowiedź `200 OK`.
    -   **Jeśli rekord nie zostanie znaleziony:** Serwis zwraca `null`. Handler API zwraca odpowiedź `404 Not Found`.
9.  Jeśli podczas operacji na bazie danych wystąpi błąd, serwis zgłosi wyjątek, który zostanie przechwycony przez handler API, a ten zwróci odpowiedź `500 Internal Server Error`.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Endpoint jest chroniony i wymaga aktywnej, zweryfikowanej sesji użytkownika. Dostęp anonimowy jest niemożliwy.
-   **Autoryzacja:** Autoryzacja jest zapewniana przez mechanizm Row Level Security (RLS) w Supabase, który jest skonfigurowany tak, aby użytkownicy mieli dostęp wyłącznie do własnych danych. Zapobiega to wyciekowi danych między użytkownikami (IDOR).
-   **Walidacja danych wejściowych:** Parametr `id` jest rygorystycznie walidowany, co chroni przed atakami typu SQL Injection oraz błędami aplikacji.

## 7. Rozważania dotyczące wydajności

-   Zapytanie do bazy danych jest proste i wykorzystuje klucz główny (`id`), co zapewnia wysoką wydajność operacji odczytu.
-   Dla tego punktu końcowego nie przewiduje się problemów z wydajnością przy standardowym obciążeniu.

## 8. Etapy wdrożenia

1.  **Aktualizacja/stworzenie serwisu:**
    -   W pliku `src/lib/services/generation.service.ts` utwórz lub zaktualizuj funkcję asynchroniczną `getGenerationById(id: number, supabase: SupabaseClient)`.
    -   Funkcja powinna przyjmować `id` oraz instancję klienta Supabase jako argumenty.
    -   Wewnątrz funkcji wykonaj zapytanie `.from('generations').select().eq('id', id).single()`.
    -   Funkcja powinna zwracać obiekt `Generation` w przypadku sukcesu lub `null`, jeśli dane nie zostaną znalezione. Błędy powinny być propagowane w górę.

2.  **Stworzenie pliku endpointu API:**
    -   Utwórz nowy plik: `src/pages/api/generations/[id].ts`.

3.  **Implementacja handlera GET:**
    -   W pliku `[id].ts` dodaj `export const prerender = false;` zgodnie z wytycznymi projektu.
    -   Zaimplementuj asynchroniczną funkcję `GET({ params, locals }: APIContext)`.
    -   Pobierz sesję użytkownika z `locals.user`. Jeśli nie istnieje, zwróć odpowiedź `401 Unauthorized`.
    -   Zdefiniuj schemę walidacji Zod dla parametru `id`.
    -   Sparsuj i zwaliduj `params.id`. W przypadku błędu walidacji, zwróć `400 Bad Request`.
    -   Wywołaj funkcję `generationService.getGenerationById` z ID generacji i klientem Supabase.
    -   Obsłuż wynik: jeśli dane istnieją, zwróć `200 OK` z danymi; jeśli `null`, zwróć `404 Not Found`.
    -   Owiń całą logikę w blok `try...catch`, aby obsłużyć nieoczekiwane błędy i zwrócić `500 Internal Server Error`.
