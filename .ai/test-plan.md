## 1. Wprowadzenie i cele testowania

Celem testowania aplikacji 10xCards jest **zapewnienie jakości** i **stabilności** kluczowych funkcjonalności: uwierzytelniania, zarządzania fiszkami, generowania fiszek z użyciem AI (OpenRouter), sesji nauki (SM‑2) oraz integracji z Supabase (baza danych, auth).  
Plan testów jest dostosowany do **stacku Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui** oraz backendu opartego o **Supabase** z integracją AI przez **OpenRouter.ai**.  
Testy mają zweryfikować:

- **Poprawność funkcjonalną** (scenariusze użytkownika end‑to‑end)
- **Bezpieczeństwo i kontrolę dostępu** (middleware, sesje, API)
- **Niezawodność integracji** (Supabase, OpenRouter)
- **Wydajność i skalowalność** (duża liczba fiszek, generacje AI)
- **Użyteczność i dostępność UI** (komponenty Shadcn/ui, ARIA, responsywność)

## 2. Zakres testów

### 2.1. Zakres funkcjonalny (co testujemy)

- **Uwierzytelnianie i autoryzacja**
  - Strony: `login.astro`, `register.astro`, `forgot-password.astro`, `auth/confirm.astro`
  - Komponenty: `LoginForm`, `RegisterForm`, `ResetPasswordRequestForm`, `UpdatePasswordForm`
  - API: `src/pages/api/auth/login.ts`, `logout.ts`, `register.ts`
  - Middleware: `src/middleware/index.ts` (ochrona ścieżek, statusy 401/redirecty)

- **Dashboard i nawigacja**
  - Strona główna: `index.astro` (dashboard użytkownika)
  - Komponenty: `DashboardClient`, `DashboardCard`, `DueFlashcardsCounter`, `StartStudyButton`
  - Nawigacja: `AppNavbar.astro`, `AppFooter.astro`, strona `flashcards.astro`, `generate.astro`, `study.astro`, `privacy.astro`, `terms.astro`

- **Zarządzanie fiszkami**
  - API: `src/pages/api/flashcards/index.ts`, `batch.ts`, `[id].ts`, `[id]/review.ts`
  - Komponenty: `FlashcardsView`, `FlashcardsList`, `FlashcardCard`, `FlashcardActions`, `CreateFlashcardDialog`, `EditFlashcardDialog`, `DeleteFlashcardDialog`, data‑table (`DataTable*`)
  - Hooki: `useFlashcards`, `useDueFlashcards`
  - Schematy: `flashcard.schema.ts`, `common.schema.ts`
  - Serwisy: `flashcard.service.ts`

- **Generowanie fiszek z AI**
  - Strona: `generate.astro` + `GenerateFlashcardsApp` / `GenerateFlashcardsView`
  - Komponenty: `SourceTextForm`, `ProposalsList`, `ProposalCard`, `SelectionToolbar`, `ActionsFooter`
  - Serwisy: `openrouter.service.ts`, `generation.service.ts`, opcjonalnie `mock-ai.service.ts`
  - API: `src/pages/api/generations/index.ts`, `[id].ts`
  - Schematy: `generation.schema.ts`
  - Typy i DTO: `FlashcardProposalDTO`, typy w `src/types.ts`

- **Sesja nauki (Study / SM‑2)**
  - Strona: `study.astro`
  - Komponenty: `StudyView`, `FlashcardDisplay`, `ReviewControls`, `SessionSummary`, `LoadingSpinner`
  - Hooki: `useStudySession`, `useDueFlashcards`
  - API: `src/pages/api/study/due.ts`
  - Schematy: `study.schema.ts`

- **Warstwa wspólna i infrastruktura**
  - Layouty: `Layout.astro`, `AuthLayout.astro`
  - UI: `button`, `card`, `input`, `label`, `textarea`, `Toast`, `ToastProvider`, `ErrorMessage`, `skeleton`
  - Hooki wspólne: `useToast`, `useBreakpoint`, `useGenerateFlashcards`
  - Supabase: `supabase.client.ts`, `database.types.ts`, migracje w `supabase/migrations`
  - Konfiguracja i typy: `env.d.ts`, `src/types.ts`, `src/lib/utils.ts`
  - CI/CD: integracja z GitHub Actions (testy i lint w pipeline)

### 2.2. Zakres niefunkcjonalny

- **Wydajność**:
  - Czas odpowiedzi API (Supabase, OpenRouter)
  - Responsywność UI przy dużej liczbie fiszek (lista, sortowanie, paginacja)
- **Bezpieczeństwo**:
  - Ochrona zasobów (middleware, statusy 401, redirecty)
  - Walidacja danych (Zod, błędy walidacji)
  - Bezpieczne przechowywanie sesji (Supabase SSR cookies)
- **Użyteczność i dostępność**:
  - Poprawne stany UI (loading, empty state, error)
  - Zgodność z wytycznymi ARIA (role, aria‑* na kluczowych komponentach)
- **Niezawodność**:
  - Odporność na błędy sieci (Supabase/OpenRouter)
  - Idempotencja niektórych operacji API (np. batch create)

### 2.3. Zakres wyłączony (na ten moment)

- Testy penetracyjne i audyty bezpieczeństwa na poziomie kodu źródłowego serwera bazodanowego Supabase (poza zakresem aplikacji klienckiej).
- Skalowanie pod ekstremalnie duży ruch produkcyjny (load tests > tysiące RPS) – opcjonalnie w późniejszej fazie.

## 3. Typy testów do przeprowadzenia

- **Testy jednostkowe**
  - **Serwisy**: `openrouter.service.ts`, `generation.service.ts`, `flashcard.service.ts`, `mock-ai.service.ts`, `utils.ts`
  - **Schematy Zod**: `auth.schema.ts`, `flashcard.schema.ts`, `generation.schema.ts`, `study.schema.ts`
  - **Hooki**: `useGenerateFlashcards`, `useFlashcards`, `useDueFlashcards`, `useStudySession`, `useToast`, `useBreakpoint`
  - **Małe komponenty UI**: `ErrorMessage`, `Toast`, `FlashcardCard`, `ProposalCard`

- **Testy integracyjne (backend i logika domenowa)**
  - API routes (`src/pages/api/*`) z użyciem **Supabase test instance** / mockowanej warstwy danych
  - Integracja `openrouter.service.ts` z `generation.service.ts` z mockowanym `fetch`
  - Middleware `src/middleware/index.ts` (różne kombinacje ścieżek, stanu sesji, typów żądań)

- **Testy integracyjne (frontend)**
  - Interakcja komponentów: np. `FlashcardsView` + `DataTable*` + `Create/Edit/DeleteFlashcardDialog`
  - Flow: `GenerateFlashcardsView` (wprowadzanie tekstu, wywołanie hooka, render propozycji, zaznaczanie, zapis)
  - Flow: `StudyView` (pobieranie fiszek, prezentacja, rejestrowanie odpowiedzi, podsumowanie)

- **Testy end‑to‑end (E2E)**
  - Pełne ścieżki użytkownika w przeglądarce z użyciem np. **Playwright / Cypress**
  - Obejmujące: rejestracja → logowanie → tworzenie fiszek → generacja AI → sesja nauki → wylogowanie

- **Testy użyteczności i UI**
  - Ręczne / częściowo zautomatyzowane testy widoków na różnych rozdzielczościach (mobile‑first, desktop)
  - Weryfikacja stanów loading/empty/error, poprawności komunikatów w języku polskim

- **Testy wydajnościowe**
  - Czas odpowiedzi API (Supabase, OpenRouter) dla typowych i skrajnych ładunków
  - Wydajność listy fiszek z dużą ilością danych (paginacja, sortowanie, filtrowanie)

- **Testy bezpieczeństwa (podstawowe)**
  - Sprawdzenie poprawności kontroli dostępu (middleware, 401, redirecty)
  - Próby nieautoryzowanego dostępu do API (`/api/flashcards`, `/api/generations`, `/api/study/due`)
  - Wstrzykiwanie niepoprawnych danych (Zod + Supabase błędy, sanityzacja wejścia)

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Uwierzytelnianie i autoryzacja

- **Rejestracja użytkownika (API + UI)**
  - **Scenariusze pozytywne**:
    - Rejestracja z poprawnym e‑mailem i hasłem (spełnia kryteria `RegisterSchema`), otrzymanie odpowiedzi 200 z obiektem user.
    - Po rejestracji możliwość zalogowania się na `/login`.
  - **Scenariusze negatywne**:
    - Nieprawidłowy JSON w body → odpowiedź 400 `INVALID_BODY`.
    - Dane niezgodne ze schematem (`RegisterSchema`) → 400 `VALIDATION_ERROR` z czytelnym komunikatem.
    - Próba rejestracji istniejącego e‑maila → 400 `AUTH_ERROR` z komunikatem z Supabase.
    - Brak wymaganych pól (email, password) → walidacja klienta + serwera.

- **Logowanie / wylogowanie**
  - Logowanie z poprawnymi danymi → ustawienie sesji Supabase, redirect na `/`.
  - Logowanie z błędnym hasłem → odpowiedni komunikat (bez ujawniania, czy konto istnieje).
  - Zachowanie przy próbie wejścia na `/login` będąc zalogowanym → redirect na `/` (middleware).
  - Wylogowanie → usunięcie sesji, przekierowanie na stronę publiczną (np. `/login` lub `/`), kolejne wejście na `/` → redirect na `/login`.

- **Ochrona zasobów (middleware)**
  - Niezalogowany:
    - Wejście na `/`, `/flashcards`, `/generate`, `/study` → redirect na `/login`.
    - Wywołanie API np. `/api/flashcards`, `/api/generations`, `/api/study/due` → 401 `UNAUTHORIZED`.
  - Zalogowany:
    - Wejście na `/login`, `/register`, `/forgot-password`, `/auth/confirm` → redirect na `/`.
    - Dostęp do `/privacy`, `/terms` zawsze dozwolony.
  - Żądania do zasobów statycznych (`/_astro`, `/_image`, `/favicon`, `/robots`, `/sitemap`, `/public`) → omijają middleware (brak zbędnych redirectów/błędów).

### 4.2. Dashboard i nawigacja

- **Dashboard (strona `/`)**
  - Wejście zalogowanego użytkownika → widoczny `DashboardClient`, sekcja z liczbą fiszek do powtórki (`DueFlashcardsCounter`).
  - Różne stany:
    - Brak fiszek → widok pusty / CTA do stworzenia pierwszej fiszki.
    - Kilka fiszek do powtórki → poprawna liczba, przycisk do rozpoczęcia nauki działa i prowadzi do `/study`.
  - Błędy w pobieraniu danych → wyświetlenie komunikatu błędu/toasta, brak nieskończonego stanu loading.

- **Nawigacja główna**
  - Linki w `AppNavbar` / `AppFooter` prowadzą do poprawnych podstron (flashcards, generate, study, privacy, terms).
  - Spójne zachowanie na mobile/desktop (hamburger menu, jeśli występuje).
  - Podświetlenie aktualnej sekcji (np. aria‑current).

### 4.3. Zarządzanie fiszkami

- **Tworzenie fiszki**
  - Formularz `CreateFlashcardDialog`:
    - Walidacja wymaganych pól (front/back, ewentualne tagi).
    - Błędne dane → komunikaty inline (`ErrorMessage`), brak wysyłki requestu.
    - Poprawne dane → wywołanie API `POST /api/flashcards`, aktualizacja listy bez przeładowania strony, toast potwierdzający.
  - Scenariusze negatywne:
    - Błąd sieci / 5xx z API → czytelny komunikat i brak duplikatów wpisów przy ponowieniu.

- **Edycja fiszki**
  - Edycja istniejącej fiszki (zmiana treści, tagów).
  - Walidacja danych – brak możliwości zapisania pustej strony fiszki.
  - Współbieżność: edycja fiszki, która została usunięta przez innego użytkownika → obsługa błędu (np. 404) z komunikatem.

- **Usuwanie fiszki**
  - `DeleteFlashcardDialog` wymaga potwierdzenia (ochrona przed przypadkowym usunięciem).
  - Po usunięciu lista się odświeża, fiszka znika z widoku.
  - Próba usunięcia fiszki już usuniętej → poprawny komunikat z API (np. 404) i odpowiedni UX.

- **Lista fiszek i data‑table**
  - Sortowanie, filtrowanie, paginacja działają zgodnie z oczekiwaniami.
  - Przy dużej liczbie fiszek (np. 1000+) – UI pozostaje responsywne (test wydajności).
  - Stany: brak danych, loading, błąd.

- **Review API dla fiszek**
  - `POST /api/flashcards/[id]/review`:
    - Rejestruje odpowiedzi użytkownika (jakość odpowiedzi, data kolejnej powtórki).
    - Waliduje id i payload (np. ocena w dozwolonym zakresie).
    - Odporność na powtórne wysłanie tego samego requestu (idempotencja lub komunikat błędu).

### 4.4. Generowanie fiszek z AI

- **Formularz źródłowego tekstu (`SourceTextForm`)**
  - Walidacja:
    - Pusty tekst → informacja o konieczności wprowadzenia treści.
    - Zbyt krótki tekst → ewentualne ostrzeżenie.
    - Zbyt długi tekst → odpowiedni limit/komunikat (jeśli zdefiniowany).
  - Po wysłaniu:
    - Stan loading (spinner, zablokowanie przycisku).
    - Po sukcesie: wyświetlenie listy propozycji (`ProposalsList` → `ProposalCard`).

- **Integracja z OpenRouter (serwis i API)**
  - `OpenRouterService.generateFlashcards`:
    - Pusty tekst → `OpenRouterApiError` 400.
    - Błędny model / brak konfiguracji → wyrzuca błąd z opisem (brak `OPENROUTER_API_KEY`).
    - Odpowiedzi z OpenRouter:
      - Poprawne JSON array → poprawne mapowanie na `FlashcardProposalDTO`.
      - Niepoprawny JSON / brak `content` → `OpenRouterApiError` 502 z logami.
    - Retries:
      - Statusy w `RETRIABLE_STATUS_CODES` (429, 500, 503, itd.) → ponawianie z opóźnieniem.
      - Po przekroczeniu limitu → odpowiedni błąd dla UI.

  - UI przy błędach AI:
    - Błąd sieci / limitów (429) → informacja dla użytkownika, możliwość ponowienia.
    - Brak propozycji → komunikat, ewentualnie CTA do ręcznego dodania fiszek.

- **Wybór i zapis wygenerowanych fiszek**
  - Zaznaczanie/odznaczanie propozycji (`SelectionToolbar`).
  - Wysłanie wybranych kart do API (np. batch create).
  - Poprawne zapisanie do bazy i pojawienie się na liście fiszek (integracja z modułem flashcards).
  - Obsługa częściowej porażki (jeśli 1 z N propozycji się nie zapisze).

### 4.5. Sesja nauki (SM‑2)

- **Start sesji**
  - Wejście na `/study`:
    - Jeśli są zaległe fiszki (`/api/study/due`) → wyświetlenie pierwszej fiszki w `FlashcardDisplay`.
    - Jeśli nie ma zaległych fiszek → komunikat "Brak fiszek do powtórki" i CTA do generowania / tworzenia nowych fiszek.
  - Błędy API → komunikat + możliwość ponowienia.

- **Przebieg sesji**
  - Odkrywanie odpowiedzi (zmiana stanu karty).
  - Ocenianie znajomości (np. przyciski od 0 do 5) – poprawne mapowanie na logikę SM‑2.
  - Przejście do kolejnej fiszki, brak pętli nieskończonej.
  - Obsługa sytuacji, gdy w trakcie sesji fiszki zostały zmienione/usunięte.

- **Zakończenie sesji**
  - Po przejściu wszystkich fiszek:
    - Wyświetlenie `SessionSummary` (liczba powtórzonych fiszek, rozkład ocen, ewentualne statystyki).
    - Powrót do dashboardu z aktualną liczbą fiszek do powtórki.
  - Idempotencja: odświeżenie strony po zakończeniu sesji nie powinno ponownie rejestrować tych samych odpowiedzi.

### 4.6. UI, dostępność i responsywność

- **Responsywność (mobile‑first)**
  - Widoki: dashboard, lista fiszek, generacja AI, study – testy na małych ekranach (320–480 px), tablet, desktop.
  - Elementy Shadcn/ui (dialogi, przyciski, inputy) poprawnie skalują się na mobile.

- **Dostępność**
  - ARIA landmarks (`main`, `navigation`) obecne na kluczowych widokach.
  - Formularze mają `label` powiązane z `input` (`aria-labelledby` lub `for`/`id`).
  - Dialogi mają focus trap, można je obsłużyć klawiaturą (Tab, Esc).
  - Toasty nie utrudniają obsługi klawiaturą.

- **Komunikaty błędów i stanów**
  - Wszystkie błędy (walidacja, serwer, sieć) wyświetlane są czytelnym tekstem po polsku.
  - Stany loading są zawsze widoczne, brak "martwych" przycisków.

## 5. Środowisko testowe

- **Środowiska**
  - **Dev**: lokalne środowisko developerskie (`npm run dev`), połączone z dev‑instancją Supabase oraz dev‑kluczem OpenRouter (lub `mock-ai.service.ts`).
  - **Test / QA**:
    - Oddzielna instancja Supabase z danymi testowymi.
    - Osobny klucz API OpenRouter z limitem kosztów.
    - Build produkcyjny (`npm run build` + `npm run preview` / Docker image na DigitalOcean).

- **Konfiguracja środowiska**
  - Pliki `.env` z wartościami:
    - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (opcjonalnie)
    - `OPENROUTER_API_KEY`
  - Migracje bazy (`supabase/migrations`) stosowane przed uruchomieniem testów (zwłaszcza indeksy dla paginacji generacji).

- **Dane testowe**
  - Konta testowe o różnych profilach (np. nowe konto bez fiszek, konto z dużą liczbą fiszek, konto z wieloma zaległymi powtórkami).
  - Zestawy fiszek (różne tagi, długości tekstu, daty powtórek).
  - Przykładowe teksty do generacji AI (krótkie, średnie, długie, specjalistyczne).

## 6. Narzędzia do testowania

- **Testy jednostkowe i integracyjne (kod TS/React)**
  - Rekomendacja: **Vitest** + **Testing Library** (`@testing-library/react`, `@testing-library/dom`) + **msw** (mockowanie API) – do wdrożenia w projekcie.
- **Testy E2E**
  - Rekomendacja: **Playwright** lub **Cypress**:
    - Automatyzacja scenariuszy: rejestracja, logowanie, CRUD fiszek, generacja AI, sesja nauki.
- **Testy wydajnościowe**
  - **k6** / **Artillery** dla API (proste scenariusze obciążenia dla `/api/flashcards`, `/api/generations`, `/api/study/due`).
- **Analiza statyczna i formatowanie**
  - **ESLint**, **Prettier** (już skonfigurowane w projekcie).
- **Raportowanie i śledzenie błędów**
  - System zgłoszeń (np. GitHub Issues, Jira) z ustalonym szablonem.
  - Opcjonalnie integracja z narzędziem typu **Sentry** dla logowania błędów runtime w produkcji.

## 7. Harmonogram testów

- **Etap 1 – Przygotowanie (1–2 tygodnie)**
  - Wybór i konfiguracja frameworków testowych (Vitest, Playwright/Cypress).
  - Przygotowanie środowiska QA (Supabase test, klucze OpenRouter, migracje).
  - Zdefiniowanie podstawowych danych testowych.

- **Etap 2 – Testy jednostkowe i integracyjne (2–3 tygodnie)**
  - Pokrycie serwisów (`openrouter.service`, `generation.service`, `flashcard.service`, `utils`) testami jednostkowymi.
  - Testy schematów Zod (auth, flashcards, generation, study).
  - Testy integracyjne API routes oraz middleware.

- **Etap 3 – Testy E2E i UI (2–3 tygodnie)**
  - Implementacja scenariuszy E2E dla głównych ścieżek użytkownika.
  - Testy regresji UI przy każdej większej zmianie (komponenty Shadcn/ui, layouty).
  - Weryfikacja responsywności i dostępności.

- **Etap 4 – Testy wydajnościowe i twarde scenariusze błędów (1–2 tygodnie)**
  - Testy obciążeniowe API (szczególnie generacja AI i lista fiszek).
  - Symulacja błędów sieci, przekroczeń limitów OpenRouter.

- **Etap 5 – Regresja i stabilizacja (ciągłe)**
  - Uruchamianie pełnego zestawu testów automatycznych w CI (GitHub Actions) przy każdym merge do głównej gałęzi.
  - Regresja manualna przed wydaniami na środowisko produkcyjne (DigitalOcean).

## 8. Kryteria akceptacji testów

- **Funkcjonalne**
  - 100% kluczowych scenariuszy biznesowych (auth, CRUD fiszek, generacja AI, sesja nauki) przeszło pozytywnie testy E2E.
  - Brak otwartych błędów o priorytecie **P0/P1** (krytyczne/blokujące).
  - Błędy **P2** (istotne) zarejestrowane z jasno zdefiniowanym planem naprawy.

- **Jakościowe**
  - Co najmniej **80% pokrycia testami jednostkowymi** dla kluczowych serwisów i hooków.
  - Żaden request do API nie zwraca nieobsłużonych wyjątków (spójny format odpowiedzi błędów).
  - Walidacja Zod dla wszystkich wejść użytkownika do API.

- **Wydajnościowe**
  - Średni czas odpowiedzi API w warunkach nominalnych < określony próg (np. 500 ms dla Supabase, 3–5 s dla OpenRouter).
  - UI pozostaje responsywne przy liczbie fiszek odpowiadającej realistycznemu obciążeniu (np. 1000+ rekordów).

- **Bezpieczeństwo i dostępność**
  - Brak krytycznych problemów z kontrolą dostępu (nieautoryzowane dostępy do API / stron).
  - Kluczowe widoki spełniają minimalne wymagania dostępności (nawigacja klawiaturą, etykiety formularzy).

## 9. Role i odpowiedzialności w procesie testowania

- **QA Lead / Inżynier QA (Ty jako autor planu)**
  - Definicja strategii testów, priorytetów, kryteriów akceptacji.
  - Nadzór nad przygotowaniem i utrzymaniem przypadków testowych.
  - Koordynacja testów manualnych i automatycznych.

- **Inżynierowie oprogramowania (frontend + backend/Supabase)**
  - Implementacja testów jednostkowych i integracyjnych dla komponentów, hooków i serwisów.
  - Naprawa błędów wykrytych w testach.
  - Współpraca przy tworzeniu mocków (Supabase, OpenRouter) dla testów.

- **Inżynier DevOps / CI/CD**
  - Konfiguracja pipeline’ów GitHub Actions (lint, testy jednostkowe, E2E).
  - Utrzymywanie środowisk testowych (QA, staging) na DigitalOcean.

- **Product Owner / Analityk**
  - Priorytetyzacja scenariuszy biznesowych.
  - Akceptacja rezultatów testów względem wymagań funkcjonalnych.

## 10. Procedury raportowania błędów

- **Zgłaszanie błędów**
  - Każdy błąd rejestrowany w wybranym systemie (np. GitHub Issues, Jira) z użyciem ustalonego szablonu:
    - **Tytuł**: zwięzły opis problemu.
    - **Środowisko**: dev/QA/staging/production (wersja builda, commit hash).
    - **Kroki do odtworzenia** (numerowana lista).
    - **Oczekiwany rezultat**.
    - **Rzeczywisty rezultat** (w tym komunikaty błędów z UI i/lub API).
    - **Logi / zrzuty ekranu / HAR** (jeśli dostępne).
    - **Severity / Priorytet** (P0–P3).

- **Klasyfikacja błędów**
  - **P0** – aplikacja niedostępna, brak kluczowej funkcjonalności (np. niemożność logowania).
  - **P1** – istotna funkcjonalność działa niepoprawnie (np. brak możliwości zapisania wygenerowanych fiszek).
  - **P2** – błąd funkcjonalny / UX mający obejście.
  - **P3** – drobne problemy UI, literówki, mało uciążliwe błędy.

- **Workflow obsługi błędów**
  - Statusy: `New` → `In Progress` → `Ready for QA` → `Verified` / `Reopened` → `Closed`.
  - Każda zmiana statusu powinna być udokumentowana komentarzem (co zostało zrobione, jak testowane).
  - Błędy `Reopened` – wymagają dodatkowej analizy przyczyny (np. brak testu regresji).

- **Regresja**
  - Przy każdym większym wydaniu:
    - Uruchomienie pełnego zestawu testów automatycznych.
    - Ręczna regresja kluczowych scenariuszy (auth, CRUD fiszek, generacja AI, sesja nauki).
  - Dla błędów P0/P1 – dodanie dedykowanych testów automatycznych, aby zapobiec regresji w przyszłości.