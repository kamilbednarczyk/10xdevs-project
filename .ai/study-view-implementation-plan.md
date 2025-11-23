# Plan implementacji widoku: Sesja Nauki

## 1. Przegląd

Widok "Sesja Nauki" to interaktywny interfejs, który umożliwia użytkownikowi przeprowadzanie sesji powtórkowych dla fiszek, które są zaplanowane na dany dzień. Proces opiera się na algorytmie Spaced Repetition (SM-2). Użytkownikowi prezentowana jest jedna fiszka naraz (najpierw awers), a po odkryciu rewersu, ocenia on swoją znajomość materiału. Na podstawie tej oceny system oblicza datę kolejnej powtórki i prezentuje kolejną fiszkę.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:
- **URL**: `/study`

Strona zostanie zaimplementowana jako strona Astro (`src/pages/study.astro`), która będzie renderować główny komponent Reactowy z dyrektywą `client:load`.

## 3. Struktura komponentów

Struktura komponentów będzie zorganizowana w sposób hierarchiczny, z głównym komponentem kontenerowym zarządzającym stanem i logiką sesji.

```
/study (Astro Page)
└── StudyView (React, client:load)
    ├── if (ładowanie) -> <LoadingSpinner />
    ├── if (błąd) -> <ErrorMessage />
    ├── if (koniec sesji) -> <SessionSummary />
    └── if (sesja w toku)
        ├── <p>Fiszka {aktualny_numer} z {całkowita_liczba}</p>
        ├── FlashcardDisplay
        │   └── (wyświetla awers, a po interakcji rewers fiszki)
        └── if (odpowiedź nieodkryta)
            └── Button "Pokaż odpowiedź"
        └── if (odpowiedź odkryta)
            └── ReviewControls
                ├── Button "Nie pamiętam"
                ├── Button "Pamiętam z trudem"
                └── Button "Pamiętam dobrze"
```

## 4. Szczegóły komponentów

### `StudyView` (Kontener)
- **Opis**: Główny komponent orkiestrujący całą sesję nauki. Odpowiada za pobieranie danych, zarządzanie stanem (która fiszka jest aktualna, czy odpowiedź jest widoczna) i komunikację z API. Renderuje komponenty podrzędne w zależności od aktualnego stanu sesji (ładowanie, błąd, w toku, zakończona).
- **Główne elementy**: Wykorzystuje komponenty `LoadingSpinner`, `ErrorMessage`, `SessionSummary`, `FlashcardDisplay` i `ReviewControls`.
- **Obsługiwane interakcje**: Inicjuje pobieranie fiszek przy załadowaniu. Przekazuje akcje użytkownika (odkrycie odpowiedzi, ocena) do hooka zarządzającego stanem.
- **Warunki walidacji**: Brak.
- **Typy**: `StudySessionViewModel`.
- **Propsy**: Brak.

### `FlashcardDisplay` (Prezentacyjny)
- **Opis**: Komponent odpowiedzialny za wizualne przedstawienie pojedynczej fiszki. Używa komponentu `Card` z biblioteki `Shadcn/ui`. Wyświetla awers, a po otrzymaniu odpowiedniego propa, również rewers.
- **Główne elementy**: `Card`, `CardHeader`, `CardContent`, `CardTitle`.
- **Obsługiwane interakcje**: Brak (jest sterowany przez rodzica).
- **Warunki walidacji**: Brak.
- **Typy**: `StudyFlashcardViewModel`.
- **Propsy**:
    - `flashcard: StudyFlashcardViewModel`: Obiekt z danymi aktualnej fiszki.
    - `isRevealed: boolean`: Flaga informująca, czy rewers ma być widoczny.

### `ReviewControls` (Prezentacyjny)
- **Opis**: Grupa przycisków służących do oceny odpowiedzi. Komponent jest widoczny tylko po odkryciu rewersu fiszki.
- **Główne elementy**: Trzy komponenty `Button` z `Shadcn/ui`.
- **Obsługiwane interakcje**: Kliknięcie na dowolny przycisk.
- **Warunki walidacji**: Brak.
- **Typy**: Brak.
- **Propsy**:
    - `onReview: (quality: number) => void`: Funkcja zwrotna wywoływana po kliknięciu przycisku oceny, przekazująca odpowiednią wartość `quality`.
    - `isDisabled: boolean`: Flaga do blokowania przycisków podczas wysyłania oceny do API.

### Inne komponenty
- **`SessionSummary`**: Wyświetla podsumowanie po zakończeniu sesji.
- **`LoadingSpinner`**: Wyświetla wskaźnik ładowania danych.
- **`ErrorMessage`**: Wyświetla komunikat błędu z opcją ponowienia akcji.

## 5. Typy

Do implementacji widoku wymagane będą następujące typy danych.

### Typy DTO (Data Transfer Object)
Pochodzą bezpośrednio z definicji API.

```typescript
// DTO dla fiszki w sesji nauki (odpowiedź z GET /api/study/due)
export type StudyFlashcardDTO = {
  id: string;
  front: string;
  back: string;
  interval: number;
  repetition: number;
  ease_factor: number;
  due_date: string; // ISO 8601 Date
};

// Obiekt wysyłany do API w celu oceny fiszki (ciało żądania POST /api/flashcards/:id/review)
export interface SubmitReviewCommand {
  quality: 0 | 1 | 2 | 3 | 4 | 5;
}
```

### Typy ViewModel
Typy używane do zarządzania stanem na froncie.

```typescript
// Model widoku dla pojedynczej fiszki - na potrzeby tego widoku identyczny z DTO
export type StudyFlashcardViewModel = StudyFlashcardDTO;

// Model widoku dla całej sesji nauki
export type StudySessionViewModel = {
  flashcards: StudyFlashcardViewModel[];
  currentCardIndex: number;
  isAnswerRevealed: boolean;
  sessionStatus: 'loading' | 'in_progress' | 'submitting' | 'ended' | 'error';
  errorMessage?: string;
};
```

## 6. Zarządzanie stanem

Cała logika i stan komponentu `StudyView` zostaną zamknięte w dedykowanym customowym hooku `useStudySession`.

### `useStudySession`
- **Cel**: Abstrakcja logiki biznesowej sesji nauki od komponentu prezentacyjnego.
- **Wewnętrzny stan**:
    - `sessionState: StudySessionViewModel`: Główny obiekt stanu opisany powyżej.
- **Zwracane wartości i funkcje**:
    - `currentFlashcard: StudyFlashcardViewModel | null`: Aktualnie wyświetlana fiszka.
    - `sessionStatus: StudySessionViewModel['sessionStatus']`: Aktualny status sesji.
    - `progress: { current: number, total: number }`: Postęp sesji.
    - `isAnswerRevealed: boolean`: Czy odpowiedź jest odkryta.
    - `errorMessage: string | undefined`: Komunikat błędu.
    - `revealAnswer(): void`: Funkcja do odkrywania odpowiedzi.
    - `submitReview(quality: number): Promise<void>`: Funkcja do wysyłania oceny.
    - `retry(): void`: Funkcja do ponawiania nieudanej operacji.

## 7. Integracja API

Integracja z backendem będzie realizowana poprzez dwa endpointy:

1.  **Pobieranie fiszek do nauki**
    -   **Endpoint**: `GET /api/study/due`
    -   **Akcja**: Wywoływane przy pierwszym renderowaniu komponentu `StudyView`.
    -   **Typ odpowiedzi**: `Promise<StudyFlashcardDTO[]>`
    -   **Obsługa**: W przypadku sukcesu stan jest wypełniany fiszkami. W przypadku pustej tablicy sesja jest od razu oznaczana jako zakończona. W przypadku błędu, wyświetlany jest komunikat.

2.  **Zapisywanie oceny fiszki**
    -   **Endpoint**: `POST /api/flashcards/:id/review`
    -   **Akcja**: Wywoływane po kliknięciu przez użytkownika jednego z przycisków oceny w `ReviewControls`.
    -   **Typ żądania**: `SubmitReviewCommand`
    -   **Typ odpowiedzi**: `Promise<ReviewResponseDTO>` (odpowiedź nie jest krytyczna dla dalszego działania, wystarczy status 200 OK)
    -   **Obsługa**: Po pomyślnym zapisie, stan przechodzi do następnej fiszki lub kończy sesję. W przypadku błędu, użytkownik otrzymuje możliwość ponowienia próby zapisu.

## 8. Interakcje użytkownika

- **Użytkownik wchodzi na `/study`**:
    1. Wyświetla się `LoadingSpinner`.
    2. Po załadowaniu danych, pojawia się pierwsza fiszka (awers) i przycisk "Pokaż odpowiedź".
- **Użytkownik klika "Pokaż odpowiedź"**:
    1. Przycisk znika.
    2. Pojawia się rewers fiszki.
    3. Pojawiają się trzy przyciski oceny: "Nie pamiętam", "Pamiętam z trudem", "Pamiętam dobrze".
- **Użytkownik klika przycisk oceny**:
    1. Przyciski oceny zostają zablokowane, wyświetlany jest stan `submitting`.
    2. Po pomyślnym zapisie, widok przechodzi do następnej fiszki (pokazując jej awers i przycisk "Pokaż odpowiedź").
    3. Jeśli była to ostatnia fiszka, wyświetlany jest komponent `SessionSummary`.

## 9. Warunki i walidacja

- **Uwierzytelnienie**: Wszystkie wywołania API wymagają uwierzytelnienia. Globalny mechanizm obsługi błędów API powinien przechwytywać status `401 Unauthorized` i przekierowywać użytkownika na stronę logowania.
- **Wartość `quality`**: Walidacja nie jest potrzebna na poziomie interfejsu, ponieważ przyciski są sztywno powiązane z predefiniowanymi wartościami:
    - "Nie pamiętam" -> `quality: 1`
    - "Pamiętam z trudem" -> `quality: 3`
    - "Pamiętam dobrze" -> `quality: 5`

## 10. Obsługa błędów

- **Błąd pobierania fiszek**: Jeśli `GET /api/study/due` zwróci błąd, komponent `ErrorMessage` wyświetli stosowny komunikat oraz przycisk "Spróbuj ponownie", który ponownie uruchomi proces pobierania danych.
- **Błąd zapisu oceny**: Jeśli `POST /api/flashcards/:id/review` zwróci błąd, `ErrorMessage` poinformuje o problemie. Przycisk "Spróbuj ponownie" pozwoli na ponowne wysłanie tej samej oceny dla tej samej fiszki, bez utraty postępu.
- **Brak fiszek do nauki**: Jeśli API zwróci pustą listę fiszek, użytkownik zobaczy od razu ekran `SessionSummary` z informacją "Brak fiszek do powtórki na dziś!".

## 11. Kroki implementacji

1.  **Utworzenie strony Astro**: Stworzenie pliku `src/pages/study.astro` i osadzenie w nim pustego komponentu React `StudyView` z dyrektywą `client:load`.
2.  **Zdefiniowanie typów**: Utworzenie lub aktualizacja plików z typami (`StudyFlashcardDTO`, `SubmitReviewCommand`, `StudySessionViewModel` itd.) w `src/types.ts`.
3.  **Implementacja hooka `useStudySession`**:
    -   Zaimplementowanie logiki stanu przy użyciu `useState` i `useReducer`.
    -   Dodanie funkcji do pobierania danych z `GET /api/study/due`.
    -   Dodanie funkcji `revealAnswer` i `submitReview` (z wywołaniem `POST`).
    -   Implementacja obsługi stanów: `loading`, `in_progress`, `submitting`, `ended`, `error`.
4.  **Budowa komponentów prezentacyjnych**:
    -   Stworzenie komponentu `FlashcardDisplay` używającego `Card` z Shadcn/ui.
    -   Stworzenie komponentu `ReviewControls` z trzema przyciskami.
    -   Stworzenie prostych komponentów `SessionSummary`, `LoadingSpinner`, `ErrorMessage`.
5.  **Złożenie widoku w `StudyView`**:
    -   Wykorzystanie hooka `useStudySession` do pozyskania stanu i funkcji.
    -   Implementacja logiki renderowania warunkowego w zależności od `sessionStatus`.
    -   Połączenie propsów i handlerów zdarzeń między `StudyView` a komponentami podrzędnymi.
6.  **Stylowanie i RWD**: Zapewnienie, że widok jest w pełni responsywny i zgodny z podejściem "mobile-first" przy użyciu Tailwind CSS.
7.  **Obsługa uwierzytelniania**: Integracja z istniejącym w aplikacji mechanizmem obsługi sesji i przekierowań dla niezalogowanych użytkowników.
