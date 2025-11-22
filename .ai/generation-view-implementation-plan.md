# Plan implementacji widoku: Generowanie Fiszek (AI)

## 1. Przegląd
Widok "Generuj Fiszki (AI)" umożliwia użytkownikom automatyczne tworzenie fiszek na podstawie dostarczonego tekstu. Użytkownik wkleja tekst, system generuje propozycje fiszek za pomocą AI, a następnie użytkownik może je edytować, wybrać i zapisać w swojej kolekcji. Celem jest przyspieszenie procesu tworzenia materiałów do nauki.

## 2. Routing widoku
Widok będzie dostępny pod ścieżką `/generate`.

## 3. Struktura komponentów
Hierarchia komponentów zostanie zaimplementowana jako React "island" wewnątrz strony Astro.

```
- /src/pages/generate.astro
  - <GenerateFlashcardsView /> (React, client:load)
    - <SourceTextForm />
      - <Textarea /> (shadcn/ui)
      - <Button /> (shadcn/ui)
    - <Skeleton /> (shadcn/ui, stan ładowania)
    - <ProposalsList />
      - <ProposalCard />[]
        - <Checkbox /> (shadcn/ui)
        - <Input /> (shadcn/ui, przód)
        - <Input /> (shadcn/ui, tył)
    - <ActionsFooter />
      - <Button /> (shadcn/ui)
```

## 4. Szczegóły komponentów

### `GenerateFlashcardsView`
- **Opis komponentu:** Główny kontener widoku, renderowany po stronie klienta. Zarządza całym stanem, logiką biznesową i komunikacją z API.
- **Główne elementy:** `SourceTextForm`, `ProposalsList`, `ActionsFooter` oraz logika warunkowego renderowania dla stanu ładowania i błędów.
- **Obsługiwane interakcje:** Przesłanie tekstu do generacji, zapisanie wybranych fiszek.
- **Obsługiwana walidacja:** Brak bezpośredniej walidacji; zarządza stanem walidacji pochodzącym z komponentów podrzędnych.
- **Typy:** `GenerateFlashcardsViewModel`.
- **Propsy:** Brak.

### `SourceTextForm`
- **Opis komponentu:** Formularz do wprowadzania tekstu źródłowego przez użytkownika.
- **Główne elementy:** Komponent `Textarea` na tekst, `Button` do rozpoczęcia generacji, licznik znaków i komunikaty walidacyjne.
- **Obsługiwane interakcje:** `onTextChange` (aktualizacja tekstu w stanie), `onSubmit` (uruchomienie generacji).
- **Obsługiwana walidacja:**
  - Tekst musi mieć długość od 1000 do 10000 znaków.
  - Przycisk "Generuj fiszki" jest nieaktywny, jeśli warunek nie jest spełniony.
- **Typy:** `(text: string) => void`, `() => void`.
- **Propsy:**
  - `sourceText: string`
  - `onTextChange: (text: string) => void`
  - `onSubmit: () => void`
  - `isLoading: boolean`
  - `isValid: boolean`

### `ProposalsList`
- **Opis komponentu:** Renderuje listę propozycji fiszek zwróconych przez AI.
- **Główne elementy:** Lista komponentów `ProposalCard`.
- **Obsługiwane interakcje:** Deleguje obsługę zdarzeń do `ProposalCard`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `FlashcardProposalViewModel[]`.
- **Propsy:**
  - `proposals: FlashcardProposalViewModel[]`
  - `onUpdateProposal: (id: string, updates: Partial<FlashcardProposalViewModel>) => void`

### `ProposalCard`
- **Opis komponentu:** Reprezentuje pojedynczą, edytowalną propozycję fiszki.
- **Główne elementy:** `Checkbox` do zaznaczania, dwa pola `Input` (dla przodu i tyłu fiszki), komunikaty o błędach walidacji.
- **Obsługiwane interakcje:** `onSelectionChange`, `onFrontChange`, `onBackChange`.
- **Obsługiwana walidacja:**
  - Pole "przód" musi zawierać od 1 dо 200 znaków.
  - Pole "tył" musi zawierać od 1 do 500 znaków.
- **Typy:** `FlashcardProposalViewModel`.
- **Propsy:**
  - `proposal: FlashcardProposalViewModel`
  - `onUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void`

### `ActionsFooter`
- **Opis komponentu:** Stopka z przyciskiem akcji do zapisywania zaznaczonych fiszek.
- **Główne elementy:** `Button` "Zapisz zaznaczone", informacja o liczbie zaznaczonych fiszek.
- **Obsługiwane interakcje:** `onSave`.
- **Obsługiwana walidacja:** Przycisk "Zapisz" jest aktywny tylko, gdy co najmniej jedna poprawna propozycja jest zaznaczona.
- **Typy:** `() => void`.
- **Propsy:**
  - `selectedCount: number`
  - `canSave: boolean`
  - `onSave: () => void`
  - `isSaving: boolean`

## 5. Typy

### DTO (Data Transfer Objects)
```typescript
// Odpowiedź z POST /api/generations
interface GenerationResponseDto {
  generation_id: number;
  generated_count: number;
  proposals: {
    front: string;
    back: string;
  }[];
}

// Ciało żądania dla POST /api/flashcards/batch
interface BatchCreateRequestDto {
  flashcards: {
    front: string;
    back: string;
    generation_type: "ai";
    generation_id: number;
  }[];
}
```

### ViewModel (Typy dla stanu frontendu)
```typescript
// Model widoku dla pojedynczej propozycji fiszki
interface FlashcardProposalViewModel {
  id: string; // Unikalny identyfikator po stronie klienta
  front: string;
  back: string;
  isSelected: boolean;
  errors: {
    front?: string; // Komunikat błędu dla pola 'front'
    back?: string;  // Komunikat błędu dla pola 'back'
  };
}

// Główny model widoku dla całego komponentu
interface GenerateFlashcardsViewModel {
  sourceText: string;
  status: 'idle' | 'loading' | 'proposalsReady' | 'saving' | 'success';
  proposals: FlashcardProposalViewModel[];
  generationId: number | null;
  error: string | null; // Globalny błąd API
}
```

## 6. Zarządzanie stanem
Cała logika i stan zostaną zamknięte w customowym hooku `useGenerateFlashcards`, który będzie używany wewnątrz komponentu `GenerateFlashcardsView`.

**Hook `useGenerateFlashcards`:**
- **Zarządzany stan:** `sourceText`, `status`, `proposals`, `generationId`, `apiError`.
- **Udostępniane funkcje:**
  - `handleGenerate()`: Wysyła tekst do API w celu generacji propozycji.
  - `handleSaveSelected()`: Wysyła zaznaczone i zwalidowane fiszki do API.
  - `updateProposal()`: Aktualizuje stan pojedynczej propozycji (zmiana tekstu, zaznaczenie).
- **Wartości wyliczane:**
  - `isValidSourceText`: Sprawdza, czy tekst źródłowy ma poprawną długość.
  - `selectedProposals`: Filtruje zaznaczone propozycje.
  - `canSave`: Sprawdza, czy można zapisać (co najmniej jedna zaznaczona i poprawna propozycja).

## 7. Integracja API

1.  **Generowanie propozycji:**
    - **Endpoint:** `POST /api/generations`
    - **Akcja:** Wywoływane po kliknięciu "Generuj fiszki".
    - **Typ żądania:** `{ text: string }`
    - **Typ odpowiedzi:** `GenerationResponseDto`
    - **Obsługa:** W przypadku sukcesu, stan `status` zmienia się na `proposalsReady`, a lista propozycji jest mapowana na `FlashcardProposalViewModel`. W przypadku błędu, `status` jest aktualizowany i wyświetlany jest komunikat błędu.

2.  **Zapisywanie fiszek:**
    - **Endpoint:** `POST /api/flashcards/batch`
    - **Akcja:** Wywoływane po kliknięciu "Zapisz zaznaczone".
    - **Typ żądania:** `BatchCreateRequestDto`
    - **Typ odpowiedzi:** `{ created_count: number, flashcards: Flashcard[] }`
    - **Obsługa:** W przypadku sukcesu, stan `status` zmienia się na `success`, wyświetlany jest `Toast` z potwierdzeniem, a widok jest resetowany. W przypadku błędu, wyświetlany jest `Toast` z błędem.

## 8. Interakcje użytkownika
- **Wpisywanie tekstu:** Aktualizuje stan `sourceText` i waliduje jego długość w czasie rzeczywistym, aktywując/dezaktywując przycisk "Generuj".
- **Kliknięcie "Generuj":** Zmienia stan na `loading`, wyświetla komponenty `Skeleton` i wywołuje API. Po otrzymaniu odpowiedzi, wyświetla listę propozycji lub błąd.
- **Edycja propozycji:** Zmiana tekstu w polach `Input` aktualizuje stan konkretnej propozycji i uruchamia jej walidację.
- **Zaznaczenie propozycji:** Zmiana stanu `Checkbox` aktualizuje flagę `isSelected` i wpływa na stan przycisku "Zapisz".
- **Kliknięcie "Zapisz":** Zmienia stan na `saving`, blokuje przycisk, wywołuje API. Po odpowiedzi, informuje użytkownika o wyniku za pomocą `Toast`.

## 9. Warunki i walidacja
- **Formularz tekstu źródłowego (`SourceTextForm`):**
  - **Warunek:** `sourceText.length >= 1000 && sourceText.length <= 10000`.
  - **Efekt:** Przycisk "Generuj fiszki" jest włączony/wyłączony. Komunikat walidacyjny jest widoczny dla użytkownika.
- **Karta propozycji (`ProposalCard`):**
  - **Warunek 1:** `front.length > 0 && front.length <= 200`.
  - **Warunek 2:** `back.length > 0 && back.length <= 500`.
  - **Efekt:** Wyświetlenie komunikatu o błędzie pod odpowiednim polem `Input`. Propozycja z błędem nie jest uwzględniana przy aktywacji przycisku "Zapisz".

## 10. Obsługa błędów
- **Błędy walidacji (400, 422):** Wyświetlane jako komunikaty błędów bezpośrednio w formularzu (`SourceTextForm`) lub na karcie (`ProposalCard`). Walidacja po stronie klienta powinna minimalizować ryzyko ich wystąpienia.
- **Brak autoryzacji (401):** Globalny mechanizm obsługi sesji powinien przechwycić ten błąd i przekierować użytkownika na stronę logowania.
- **Błędy serwera (5xx) lub sieci:** W komponencie `GenerateFlashcardsView` zostanie wyświetlony ogólny komunikat o błędzie (np. "Wystąpił błąd podczas komunikacji z serwerem. Spróbuj ponownie później.") za pomocą komponentu `Toast`.

## 11. Kroki implementacji
1.  Stworzenie pliku strony `/src/pages/generate.astro`.
2.  Implementacja komponentu kontenera `GenerateFlashcardsView.tsx` z podstawową strukturą JSX.
3.  Zaimplementowanie customowego hooka `useGenerateFlashcards` z definicją stanu (`GenerateFlashcardsViewModel`) i pustymi funkcjami obsługi.
4.  Stworzenie komponentu `SourceTextForm` i podłączenie go do stanu i walidacji z hooka.
5.  Implementacja logiki `handleGenerate` w hooku, w tym wywołanie API `POST /api/generations` i obsługa stanu ładowania (`Skeleton`).
6.  Stworzenie komponentów `ProposalsList` i `ProposalCard` do wyświetlania propozycji.
7.  Implementacja logiki edycji i zaznaczania w `updateProposal` w hooku, w tym walidacja pól `front` i `back`.
8.  Stworzenie komponentu `ActionsFooter` i podłączenie go do stanu z hooka w celu zarządzania aktywnością przycisku "Zapisz".
9.  Implementacja logiki `handleSaveSelected` w hooku, w tym filtrowanie, mapowanie danych i wywołanie API `POST /api/flashcards/batch`.
10. Zintegrowanie obsługi błędów API i wyświetlanie powiadomień `Toast` dla sukcesu i porażki.
11. Stylowanie wszystkich komponentów za pomocą Tailwind CSS zgodnie z systemem projektowym.
12. Przeprowadzenie testów manualnych w celu weryfikacji wszystkich historyjek użytkownika (US-004, US-005, US-006).
