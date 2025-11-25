# Specyfikacja Implementacji Modułu Autentykacji

Niniejszy dokument opisuje architekturę techniczną modułu rejestracji, logowania i odzyskiwania hasła, opartą na stosie technologicznym Astro 5, React 19 oraz Supabase Auth (SSR).

## 1. Zależności i Konfiguracja

### Nowe Biblioteki
W celu realizacji pełnej funkcjonalności SSR oraz obsługi formularzy, wymagane jest dodanie następujących zależności:
- `@supabase/ssr`: Do obsługi autentykacji po stronie serwera (cookies) w Astro.
- `react-hook-form`: Do zarządzania stanem formularzy React.
- `@hookform/resolvers`: Do integracji Zod z formularzami.

### Konfiguracja Środowiska
Wymagane zmienne środowiskowe (w `.env`):
- `PUBLIC_SUPABASE_URL`: URL projektu Supabase.
- `PUBLIC_SUPABASE_ANON_KEY`: Klucz publiczny API.
- `SUPABASE_SERVICE_ROLE_KEY`: (Opcjonalnie) Do operacji administracyjnych po stronie serwera (tylko w API routes).

## 2. Architektura Interfejsu Użytkownika (Frontend)

### Layouty
- **`src/layouts/AuthLayout.astro`**: Nowy layout dedykowany dla stron autentykacji (Logowanie, Rejestracja, Reset hasła).
  - **Struktura**: Minimalistyczny design, wyśrodkowany kontener (Card), brak pełnej nawigacji aplikacji.
  - **Elementy**: Logo aplikacji, kontener na formularz, linki pomocnicze (np. "Wróć do strony głównej").

- **`src/layouts/Layout.astro`**: Rozszerzenie istniejącego głównego layoutu.
  - Integracja stanu sesji użytkownika (przekazywanego z serwera lub pobieranego w layoucie).

### Strony (Astro Pages)
Wszystkie strony autentykacji będą renderowane po stronie serwera (`output: 'server'`), co pozwala na sprawdzenie sesji przed renderowaniem i ewentualne przekierowanie (np. zalogowany użytkownik wchodzący na `/login` zostanie przekierowany do `/dashboard` lub `/`).

1.  **`src/pages/login.astro`**
    - Wyświetla komponent `LoginForm`.
    - Link do rejestracji i odzyskiwania hasła.
2.  **`src/pages/register.astro`**
    - Wyświetla komponent `RegisterForm`.
    - Link do logowania.
3.  **`src/pages/forgot-password.astro`**
    - Formularz prośby o reset hasła (`ResetPasswordRequestForm`).
4.  **`src/pages/auth/confirm.astro`** (lub `/update-password`)
    - Strona docelowa po kliknięciu w link z maila resetującego hasło.
    - Wyświetla komponent `UpdatePasswordForm`.
    - Weryfikuje poprawność sesji (czy użytkownik został zalogowany przez link magiczny/recovery).

### Komponenty (React - Client Side)
Komponenty formularzy będą "wyspami" interaktywności (`client:load`), obsługującymi walidację i komunikację z API. Wykorzystają komponenty UI z `shadcn/ui` (`Input`, `Button`, `Label`, `Card`, `Alert`).

1.  **`src/components/auth/LoginForm.tsx`**
    - Pola: Email, Hasło.
    - Walidacja: Wymagane pola, format email.
    - Akcja: POST do `/api/auth/signin`.
    - Obsługa błędów: Wyświetlenie komunikatu "Nieprawidłowy email lub hasło".

2.  **`src/components/auth/RegisterForm.tsx`**
    - Pola: Email, Hasło, Potwierdź hasło.
    - Walidacja: Zgodność haseł, siła hasła (min. 6 znaków).
    - Akcja: POST do `/api/auth/register`.
    - Feedback: Automatyczne logowanie i przekierowanie do dashboardu (zgodnie z US-001).

3.  **`src/components/auth/ResetPasswordRequestForm.tsx`**
    - Pola: Email.
    - Akcja: POST do `/api/auth/reset-password`.
    - Feedback: Komunikat "Link został wysłany" (niezależnie od istnienia maila w bazie - security).

4.  **`src/components/auth/UpdatePasswordForm.tsx`**
    - Pola: Nowe hasło, Potwierdź hasło.
    - Akcja: POST do `/api/auth/update-password`.
    - Walidacja: Zgodność i siła hasła.
    - Feedback: Przekierowanie na stronę logowania `/login` z komunikatem o sukcesie (zgodnie z US-012).

5.  **`src/components/navigation/UserMenu.tsx`** (Rozszerzenie AppNavbar)
    - Stan zalogowany: Avatar/Email + Dropdown z opcją "Wyloguj".
    - Stan niezalogowany: Przyciski "Zaloguj" / "Zarejestruj".
    - Przycisk Wyloguj: POST do `/api/auth/signout`.

## 3. Logika Backendowa (Astro API & Middleware)

### Klient Supabase
Należy zrefaktoryzować `src/db/supabase.client.ts` lub stworzyć `src/lib/supabase.ts`, aby eksportował dwie fabryki klientów:
1.  `createBrowserClient`: Do użycia w komponentach React.
2.  `createServerClient`: Do użycia w API Routes i Middleware (z obsługą ciasteczek `req` i `res`).

### Middleware (`src/middleware/index.ts`)
Logika ochrony tras musi zostać zaimplementowana globalnie:
1.  Inicjalizacja klienta Supabase z kontekstem cookies requestu.
2.  Odświeżenie sesji (ważne dla SSR).
3.  **Reguły przekierowań**:
    - Próba dostępu do tras chronionych (np. `/dashboard`, `/study`) bez sesji -> Przekierowanie na `/login`.
    - Próba dostępu do stron auth (`/login`, `/register`) posiadając aktywną sesję -> Przekierowanie na `/` lub `/dashboard`.

### API Endpoints (`src/pages/api/auth/*.ts`)
Endpoints będą pośredniczyć między frontendem a Supabase, aby bezpiecznie zarządzać sesją (cookies) i obsługiwać błędy po stronie serwera.

1.  **`signin.ts` (POST)**
    - Odbiera `email` i `password`.
    - Wywołuje `supabase.auth.signInWithPassword`.
    - Zwraca 200 OK lub 400/401 Error.
    - Przy sukcesie: Przekierowanie na dashboard.

2.  **`register.ts` (POST)**
    - Odbiera `email` i `password`.
    - Wywołuje `supabase.auth.signUp`.
    - Wymaganie: Automatyczne logowanie po rejestracji (zgodnie z US-001). Zakładamy, że w Supabase wyłączone jest potwierdzenie emaila ("Enable email confirmations" = OFF) dla MVP.
    - Przy sukcesie: Przekierowanie na dashboard.

3.  **`signout.ts` (POST/GET)**
    - Wywołuje `supabase.auth.signOut`.
    - Czyści cookies sesyjne.
    - Przekierowuje na `/login`.

4.  **`callback.ts` (GET)**
    - Obsługuje powroty z OAuth (jeśli dodamy) i linki Magic Link / Recovery.
    - Wymienia `code` na sesję (`exchangeCodeForSession`).
    - Przekierowuje użytkownika do docelowej ścieżki (np. `/update-password` dla flow resetowania hasła).

5.  **`reset-password.ts` (POST)**
    - Wywołuje `supabase.auth.resetPasswordForEmail` z parametrem `redirectTo` ustawionym na `/api/auth/callback?next=/auth/confirm`.

6.  **`update-password.ts` (POST)**
    - Dostępny tylko dla uwierzytelnionego użytkownika (użytkownik jest "zalogowany" tymczasowo po kliknięciu w link recovery).
    - Wywołuje `supabase.auth.updateUser({ password: ... })`.
    - Po sukcesie: Wylogowuje użytkownika (lub nie, zależnie od implementacji, ale PRD wymaga przekierowania do logowania) i zwraca instrukcję przekierowania na `/login`.

## 4. Modele Danych i Walidacja

### Schematy Zod (`src/lib/schemas/auth.schema.ts`)
Współdzielone schematy walidacji dla frontendu i backendu:
- `LoginSchema`: email (email), password (min 1).
- `RegisterSchema`: email (email), password (min 6), confirmPassword (refine: match).
- `ResetPasswordSchema`: email (email).
- `UpdatePasswordSchema`: password (min 6), confirmPassword (refine: match).

### Obsługa Błędów
- Błędy walidacji formularza: Zwracane jako struktura JSON z polami błędów, wyświetlane bezpośrednio pod inputami (`form.formState.errors`).
- Błędy Supabase (np. "Invalid login credentials"): Mapowane na przyjazne komunikaty polskie i wyświetlane w komponencie `Alert` nad formularzem.

## 5. Scenariusze Krytyczne

1.  **Rejestracja istniejącego emaila**:
    - Zgodnie z US-001 system powinien sprawdzać zajętość emaila.
    - Endpoint `register` powinien obsłużyć błąd Supabase (np. `User already registered`) i zwrócić odpowiedni komunikat do frontendu ("Ten adres e-mail jest już zajęty"), zamiast "fałszywego sukcesu".
2.  **Wygasła sesja**: Middleware wykryje brak ważnego tokena przy próbie nawigacji i przekieruje do logowania.
3.  **Reset hasła**:
    - Użytkownik klika "Zapomniałem hasła".
    - Podaje email -> otrzymuje link.
    - Klika link -> trafia na `/api/auth/callback` -> przekierowanie na `/auth/confirm` (formularz zmiany hasła).
    - Formularz zmiany hasła działa w kontekście sesji odzyskanej z linku.
    - Po zmianie hasła: Przekierowanie użytkownika na stronę logowania z komunikatem o sukcesie (zgodnie z US-012).

## 6. Podsumowanie
Architektura opiera się na **Server-Side Rendering** z wykorzystaniem **Supabase Auth Helpers** dla maksymalnego bezpieczeństwa i wydajności. React zarządza interaktywnością formularzy, a Astro zarządza routingiem i ochroną dostępu.
