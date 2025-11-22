# Plan implementacji widoku: Panel Główny (Dashboard)

## 1. Przegląd
Panel Główny (Dashboard) jest pierwszym widokiem, który użytkownik widzi po zalogowaniu. Jego głównym celem jest służenie jako centrum nawigacyjne, dostarczające kluczowych informacji o stanie nauki i umożliwiające szybkie rozpoczęcie sesji powtórkowej. Widok ten wyświetla liczbę fiszek zaplanowanych do nauki na dany dzień i zawiera przycisk do rozpoczęcia nauki, który jest aktywny tylko wtedy, gdy są dostępne fiszki do powtórki.

## 2. Routing widoku
Widok będzie dostępny pod główną ścieżką aplikacji, tuż po zalogowaniu.
- **Ścieżka:** `/`

## 3. Struktura komponentów
Widok zostanie zaimplementowany jako strona Astro (`src/pages/index.astro`), która będzie renderować interaktywne komponenty React (`client:load`).

```
- DashboardView (`/src/pages/index.astro`)
  - Layout (Wrapper)
    - DashboardClient (`/src/components/dashboard/DashboardClient.tsx`)
      - DashboardSkeleton (`/src/components/dashboard/DashboardSkeleton.tsx`) // Renderowany podczas ładowania
      - ErrorMessage (`/src/components/ui/ErrorMessage.tsx`) // Renderowany w przypadku błędu
      - DashboardCard (`/src/components/dashboard/DashboardCard.tsx`) // Renderowany po pomyślnym załadowaniu danych
        - DueFlashcardsCounter (`/src/components/dashboard/DueFlashcardsCounter.tsx`)
        - StartStudyButton (`/src/components/dashboard/StartStudyButton.tsx`)
```

## 4. Szczegóły komponentów

### `DashboardClient.tsx`
- **Opis komponentu:** Główny komponent React odpowiedzialny za logikę widoku. Wykorzystuje customowy hook `useDueFlashcards` do pobierania danych, zarządzania stanem ładowania i błędów. Warunkowo renderuje stan szkieletu (`DashboardSkeleton`), błędu (`ErrorMessage`) lub główną zawartość (`DashboardCard`).
- **Główne elementy:** `DashboardSkeleton`, `ErrorMessage`, `DashboardCard`.
- **Obsługiwane interakcje:** Brak bezpośrednich interakcji, zarządza stanem dla komponentów podrzędnych.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `DashboardViewModel`.
- **Propsy:** Brak.

### `DashboardCard.tsx`
- **Opis komponentu:** Komponent prezentacyjny, który wyświetla główną treść panelu wewnątrz komponentu `Card` z biblioteki Shadcn/ui. Otrzymuje dane o liczbie fiszek do powtórki i renderuje odpowiednie komunikaty oraz przycisk akcji.
- **Główne elementy:** `Card`, `CardHeader`, `CardContent`, `CardFooter`, `DueFlashcardsCounter`, `StartStudyButton`.
- **Obsługiwane interakcje:** Przekazuje akcję nawigacji do strony nauki.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `DashboardViewModel`.
- **Propsy:**
  ```typescript
  interface DashboardCardProps {
    data: DashboardViewModel;
  }
  ```

### `DueFlashcardsCounter.tsx`
- **Opis komponentu:** Wyświetla sformatowany komunikat informujący użytkownika o liczbie fiszek do powtórki na dany dzień.
- **Główne elementy:** `p` (HTML paragraph).
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `number`.
- **Propsy:**
  ```typescript
  interface DueFlashcardsCounterProps {
    count: number;
  }
  ```

### `StartStudyButton.tsx`
- **Opis komponentu:** Przycisk (`Button` z Shadcn/ui), który inicjuje sesję nauki. Jego stan (aktywny/nieaktywny) zależy od liczby dostępnych fiszek.
- **Główne elementy:** `Button`.
- **Obsługiwane interakcje:** `onClick`.
- **Obsługiwana walidacja:** Przycisk jest wyłączony (`disabled`), gdy liczba fiszek do powtórki wynosi 0.
- **Typy:** `number`.
- **Propsy:**
  ```typescript
  interface StartStudyButtonProps {
    count: number;
  }
  ```

### `DashboardSkeleton.tsx`
- **Opis komponentu:** Wyświetla animowany szkielet interfejsu (za pomocą komponentów `Skeleton` z Shadcn/ui) podczas ładowania danych z API, zapobiegając przesunięciom układu (layout shift).
- **Główne elementy:** `Card`, `Skeleton`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Brak.

## 5. Typy
Do implementacji widoku wymagany jest jeden nowy typ `ViewModel` oraz wykorzystanie istniejącego `DTO`.

- **`StudyFlashcardDTO` (istniejący DTO):** Typ danych pojedynczej fiszki zwracany przez API.
  ```typescript
  // src/types.ts
  export type StudyFlashcardDTO = Pick<
    Flashcard,
    "id" | "front" | "back" | "interval" | "repetition" | "ease_factor" | "due_date"
  >;
  ```

- **`DashboardViewModel` (nowy ViewModel):** Uproszczony model danych na potrzeby komponentów widoku.
  ```typescript
  // src/components/dashboard/types.ts
  export interface DashboardViewModel {
    dueFlashcardsCount: number;
  }
  ```
  - `dueFlashcardsCount` (`number`): Przechowuje wyłącznie liczbę fiszek, która jest wynikiem `response.length` z zapytania API.

## 6. Zarządzanie stanem
Logika pobierania danych i zarządzania stanem zostanie zamknięta w customowym hooku `useDueFlashcards`.

- **Hook: `useDueFlashcards` (`src/lib/hooks/useDueFlashcards.ts`)**
  - **Cel:** Abstrakcja logiki komunikacji z API, zarządzanie stanami `isLoading`, `error` oraz `data`.
  - **Zwracane wartości:**
    ```typescript
    interface UseDueFlashcardsReturn {
      data: DashboardViewModel | null;
      isLoading: boolean;
      error: Error | null;
    }
    ```
  - **Implementacja:** Wewnątrz hooka zostanie użyty `useEffect` do jednorazowego pobrania danych po zamontowaniu komponentu oraz `useState` do przechowywania stanu.

## 7. Integracja API
Komponent `DashboardClient` za pośrednictwem hooka `useDueFlashcards` będzie komunikował się z jednym endpointem API.

- **Endpoint:** `GET /api/study/due`
- **Opis:** Pobiera listę fiszek przeznaczonych do nauki na dany dzień.
- **Typ żądania:** Brak (żądanie GET bez body).
- **Typ odpowiedzi (sukces):** `StudyFlashcardDTO[]` - tablica obiektów fiszek.
- **Logika po stronie klienta:** Po otrzymaniu odpowiedzi, jej długość (`response.length`) zostanie zapisana w stanie jako `dueFlashcardsCount`.

## 8. Interakcje użytkownika
1.  **Wejście na stronę (`/`):**
    - Użytkownik widzi `DashboardSkeleton`.
    - W tle wysyłane jest żądanie `GET /api/study/due`.
2.  **Pomyślne załadowanie danych:**
    - `DashboardSkeleton` jest zastępowany przez `DashboardCard`.
    - `DueFlashcardsCounter` wyświetla liczbę fiszek (np. "Masz 5 fiszek do powtórki.").
    - Jeśli liczba fiszek > 0, `StartStudyButton` jest aktywny.
    - Jeśli liczba fiszek = 0, `StartStudyButton` jest nieaktywny.
3.  **Kliknięcie aktywnego przycisku "Rozpocznij naukę":**
    - Użytkownik zostaje przekierowany na stronę sesji nauki (np. `/study`).

## 9. Warunki i walidacja
- **Warunek:** Aktywność przycisku "Rozpocznij naukę".
- **Komponent:** `StartStudyButton`.
- **Logika walidacji:** Przycisk otrzymuje prop `disabled`, który jest ustawiany na `true`, jeśli `dueFlashcardsCount` w `DashboardViewModel` wynosi `0`. W przeciwnym razie jest `false`.

## 10. Obsługa błędów
- **Błąd sieci lub serwera (np. status 500):**
  - Hook `useDueFlashcards` przechwyci błąd i ustawi stan `error`.
  - `DashboardClient` wyświetli generyczny komponent `ErrorMessage` z informacją o problemie i ewentualnym przyciskiem do ponowienia próby.
- **Błąd autoryzacji (status 401):**
  - Błąd zostanie przechwycony, a middleware po stronie serwera powinien przekierować użytkownika na stronę logowania. Jeśli żądanie dotrze na front, UI powinno obsłużyć ten stan, uniemożliwiając dalsze akcje.

## 11. Kroki implementacji
1.  Utworzenie struktury folderów: `/src/components/dashboard` oraz `/src/lib/hooks`.
2.  Zdefiniowanie typu `DashboardViewModel` w pliku `/src/components/dashboard/types.ts`.
3.  Implementacja customowego hooka `useDueFlashcards` w `/src/lib/hooks/useDueFlashcards.ts`. Hook powinien zawierać logikę `fetch` do endpointu `/api/study/due` i zarządzać stanami `data`, `isLoading`, `error`.
4.  Stworzenie komponentu `DashboardSkeleton.tsx` z użyciem komponentów `Card` i `Skeleton` z Shadcn/ui.
5.  Stworzenie komponentów prezentacyjnych: `DueFlashcardsCounter.tsx` i `StartStudyButton.tsx`.
6.  Stworzenie komponentu `DashboardCard.tsx`, który złoży w całość `DueFlashcardsCounter` i `StartStudyButton` wewnątrz `Card`.
7.  Stworzenie głównego komponentu `DashboardClient.tsx`, który będzie używał hooka `useDueFlashcards` i renderował warunkowo `DashboardSkeleton`, `ErrorMessage` lub `DashboardCard`.
8.  Aktualizacja strony Astro `/src/pages/index.astro`, aby renderowała komponent `DashboardClient.tsx` z dyrektywą `client:load`.
9.  Nawigacja w `StartStudyButton` powinna kierować do nowej strony, np. `/study` (strona docelowa musi zostać utworzona w osobnym zadaniu).
10. Ostylowanie komponentów za pomocą klas Tailwind CSS zgodnie z ogólnym designem aplikacji.
