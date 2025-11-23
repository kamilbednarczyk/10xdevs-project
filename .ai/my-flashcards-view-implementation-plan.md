
# Plan implementacji widoku: Moje Fiszki

## 1. Przegląd

Celem tego dokumentu jest stworzenie szczegółowego planu implementacji dla widoku "Moje Fiszki". Widok ten pozwoli użytkownikom na przeglądanie, zarządzanie (dodawanie/usuwanie) i nawigację po swojej kolekcji fiszek. Widok będzie responsywny, prezentując dane w formie tabeli na urządzeniach desktopowych i listy kart na urządzeniach mobilnych.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:
- **Ścieżka:** `/flashcards`

## 3. Struktura komponentów

Widok zostanie zaimplementowany w architekturze komponentowej. Stroną Astro (`/src/pages/flashcards.astro`) będzie hostować główny komponent React, który będzie zarządzał stanem i logiką.

```
/src/pages/flashcards.astro
└── FlashcardsView.tsx (Komponent kliencki React)
    ├── CreateFlashcardDialog.tsx (Dialog do tworzenia nowej fiszki)
    ├── DataTable.tsx (Komponent generyczny, może wymagać dostosowania)
    │   ├── DataTableToolbar.tsx (zawiera przycisk "Dodaj nową")
    │   ├── DataTableContent.tsx (Tabela wyświetlająca fiszki)
    │   │   └── FlashcardActions.tsx (Dropdown z akcjami "Edytuj", "Usuń")
    │   │       └── DeleteFlashcardDialog.tsx (Dialog potwierdzenia usunięcia)
    │   └── DataTablePagination.tsx (Paginacja)
    └── FlashcardsList.tsx (Widok mobilny)
        └── FlashcardCard.tsx (Pojedyncza karta fiszki dla widoku mobilnego)
            └── FlashcardActions.tsx
                └── DeleteFlashcardDialog.tsx
```

## 4. Szczegóły komponentów

### FlashcardsView.tsx

- **Opis komponentu:** Główny komponent widoku, który orkiestruje pobieranie danych, zarządzanie stanem i renderowanie komponentów podrzędnych (tabeli lub listy kart w zależności od szerokości ekranu).
- **Główne elementy:** Wykorzystuje hook `useBreakpoint` do warunkowego renderowania `DataTable` (desktop) lub `FlashcardsList` (mobile).
- **Obsługiwane interakcje:** Inicjalizacja pobierania danych, przekazywanie handlerów do komponentów podrzędnych.
- **Typy:** `FlashcardListResponseDTO`, `FlashcardResponseDTO`.
- **Propsy:** Brak.

### CreateFlashcardDialog.tsx

- **Opis komponentu:** Komponent modalny (dialog) zawierający formularz do tworzenia nowej, manualnej fiszki.
- **Główne elementy:** `Dialog` (Shadcn), `Form` (react-hook-form), `Input` (dla `front`), `Textarea` (dla `back`), `Button` (do zapisu).
- **Obsługiwane interakcje:** Otwieranie/zamykanie dialogu, wprowadzanie danych, walidacja pól, wysłanie formularza.
- **Warunki walidacji:**
  - `front`: Wymagane, minimum 1 znak, maksimum 200 znaków.
  - `back`: Wymagane, minimum 1 znak, maksimum 500 znaków.
- **Typy:** `CreateFlashcardCommand`, `FlashcardResponseDTO`.
- **Propsy:** `isOpen`, `onOpenChange`, `onSuccess(newFlashcard: FlashcardResponseDTO)`.

### DataTable.tsx / FlashcardsList.tsx

- **Opis komponentu:** Komponenty odpowiedzialne za wyświetlanie listy fiszek. `DataTable` używa `tanstack/react-table` do wyświetlania danych w tabeli, a `FlashcardsList` renderuje listę komponentów `FlashcardCard`.
- **Główne elementy:**
  - `DataTable`: `Table`, `TableRow`, `TableCell` (Shadcn).
  - `FlashcardsList`: `div` (flex container), mapowanie po `FlashcardCard`.
- **Obsługiwane interakcje:** Wyświetlanie danych, paginacja, wywoływanie akcji (usuwanie) z poziomu wiersza/karty.
- **Typy:** `FlashcardResponseDTO[]`, `PaginationDTO`.
- **Propsy:** `data`, `pagination`, `onPageChange`, `onDelete`.

### FlashcardActions.tsx

- **Opis komponentu:** Komponent "kropki" (`...`) z menu kontekstowym dla pojedynczej fiszki.
- **Główne elementy:** `DropdownMenu` (Shadcn).
- **Obsługiwane interakcje:** Otwarcie menu, kliknięcie "Usuń".
- **Typy:** `FlashcardResponseDTO`.
- **Propsy:** `flashcard`, `onDelete(id: string)`.

### DeleteFlashcardDialog.tsx

- **Opis komponentu:** Dialog potwierdzający operację usunięcia fiszki.
- **Główne elementy:** `AlertDialog` (Shadcn).
- **Obsługiwane interakcje:** Potwierdzenie lub anulowanie usunięcia.
- **Typy:** -
- **Propsy:** `isOpen`, `onOpenChange`, `onConfirm`.

## 5. Typy

Do implementacji widoku wykorzystane zostaną głównie istniejące typy z `src/types.ts`:

- **`FlashcardResponseDTO`**: Reprezentuje pojedynczą fiszkę pobraną z API.
- **`FlashcardListResponseDTO`**: Reprezentuje odpowiedź z API dla listy fiszek, zawiera `data` i `pagination`.
- **`PaginationDTO`**: Obiekt z metadanymi paginacji.
- **`CreateFlashcardCommand`**: Obiekt wysyłany do API w celu stworzenia nowej manualnej fiszki.

Nie przewiduje się potrzeby tworzenia nowych, złożonych typów ViewModel, ponieważ struktura DTO jest wystarczająca dla potrzeb UI.

## 6. Zarządzanie stanem

Logika zarządzania stanem zostanie scentralizowana w niestandardowym hooku `useFlashcards`.

### `useFlashcards`

- **Cel:** Abstrakcja logiki biznesowej związanej z fiszkami (pobieranie, tworzenie, usuwanie), zarządzanie stanem ładowania, błędów i paginacji.
- **Zarządzany stan:**
  - `flashcards: FlashcardResponseDTO[]`: Lista fiszek.
  - `pagination: PaginationDTO | null`: Dane paginacji.
  - `isLoading: boolean`: Status ładowania danych.
  - `error: Error | null`: Obiekt błędu.
- **Udostępniane funkcje:**
  - `fetchFlashcards(page, limit)`: Pobiera listę fiszek.
  - `createFlashcard(data: CreateFlashcardCommand)`: Tworzy nową fiszkę i odświeża listę.
  - `deleteFlashcard(id: string)`: Usuwa fiszkę (z optymistycznym UI) i odświeża listę.
  - `changePage(page: number)`: Zmienia stronę i pobiera nowe dane.

## 7. Integracja API

Komponenty będą komunikować się z API za pośrednictwem hooka `useFlashcards`, który będzie wykonywał następujące wywołania:

1.  **Pobieranie listy fiszek:**
    -   **Endpoint:** `GET /api/flashcards`
    -   **Parametry (Query):** `page`, `limit`
    -   **Typ odpowiedzi:** `FlashcardListResponseDTO`

2.  **Tworzenie nowej fiszki:**
    -   **Endpoint:** `POST /api/flashcards`
    -   **Typ żądania (Body):** `CreateFlashcardCommand`
    -   **Typ odpowiedzi:** `FlashcardResponseDTO`

3.  **Usuwanie fiszki:**
    -   **Endpoint:** `DELETE /api/flashcards/:id`
    -   **Parametry (URL):** `id`
    -   **Typ odpowiedzi:** `204 No Content`

## 8. Interakcje użytkownika

- **Przeglądanie fiszek:** Po załadowaniu widoku, inicjowane jest zapytanie do API o pierwszą stronę fiszek. Użytkownik może nawigować między stronami za pomocą komponentu paginacji.
- **Dodawanie fiszki:** Użytkownik klika przycisk "Dodaj nową fiszkę", co otwiera `CreateFlashcardDialog`. Po wypełnieniu i wysłaniu formularza, fiszka jest tworzona, a lista jest odświeżana.
- **Usuwanie fiszki:** Użytkownik klika "Usuń" w menu akcji fiszki, co otwiera `DeleteFlashcardDialog`. Po potwierdzeniu, fiszka jest usuwana (optymistycznie z UI), a w tle wysyłane jest żądanie do API.

## 9. Warunki i walidacja

- **Formularz tworzenia fiszki (`CreateFlashcardDialog`):**
  - Pole `front` nie może być puste i musi zawierać od 1 do 200 znaków.
  - Pole `back` nie może być puste i musi zawierać od 1 do 500 znaków.
  - Przycisk "Zapisz" jest nieaktywny, dopóki formularz nie jest poprawny.
  - Komunikaty o błędach są wyświetlane pod odpowiednimi polami.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli żądanie `GET /api/flashcards` zakończy się niepowodzeniem, w miejscu tabeli/listy zostanie wyświetlony komunikat o błędzie z przyciskiem "Spróbuj ponownie".
- **Błąd tworzenia fiszki:** W przypadku błędu z API, formularz w `CreateFlashcardDialog` wyświetli globalny komunikat o błędzie (np. "Nie udało się zapisać fiszki. Spróbuj ponownie."), a także szczegółowe błędy walidacji, jeśli zostaną zwrócone przez serwer.
- **Błąd usuwania fiszki:** W przypadku niepowodzenia operacji usuwania (np. z powodu utraty połączenia), fiszka, która została usunięta optymistycznie, zostanie przywrócona na liście, a użytkownik zobaczy powiadomienie (toast) o błędzie.

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie pliku strony `src/pages/flashcards.astro` oraz katalogu `src/components/flashcards` na komponenty React.
2.  **Hook `useFlashcards`:** Implementacja hooka z logiką pobierania, tworzenia i usuwania danych oraz zarządzania stanem.
3.  **Komponent `FlashcardsView`:** Stworzenie głównego komponentu, integracja hooka `useFlashcards` i warunkowe renderowanie widoku desktop/mobile.
4.  **Widok Desktop (`DataTable`):** Implementacja tabeli przy użyciu `tanstack/react-table` i komponentów Shadcn. Zdefiniowanie kolumn i integracja akcji.
5.  **Widok Mobile (`FlashcardsList`):** Implementacja listy kart, każda z komponentem `FlashcardCard`.
6.  **Dialog `CreateFlashcardDialog`:** Budowa formularza z użyciem `react-hook-form` i `zod` do walidacji, integracja z `useFlashcards.createFlashcard`.
7.  **Dialog `DeleteFlashcardDialog`:** Implementacja dialogu potwierdzenia i połączenie go z akcją `useFlashcards.deleteFlashcard`.
8.  **Stylowanie i responsywność:** Dopracowanie stylów Tailwind CSS i zapewnienie płynnego przejścia między widokiem tabeli a listą kart.
9.  **Obsługa stanów krańcowych:** Implementacja widoków dla stanu ładowania (np. `Skeleton`), stanu błędu oraz stanu pustego (brak fiszek).

