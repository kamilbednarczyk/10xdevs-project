# Architektura UI dla 10xCards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla 10xCards została zaprojektowana w celu zapewnienia płynnego, responsywnego i intuicyjnego doświadczenia dla użytkowników. Zbudowana w oparciu o Astro, React, TypeScript i Tailwind CSS, z wykorzystaniem biblioteki komponentów shadcn/ui, architektura ta stawia na pierwszym miejscu prostotę i wydajność.

Główne założenia architektury:
- **Centralny Dashboard:** Służy jako punkt wyjścia do kluczowych akcji, takich jak nauka i tworzenie fiszek.
- **Wydzielone widoki:** Każda główna funkcja aplikacji (zarządzanie fiszkami, generowanie AI, sesja nauki) ma dedykowany, zoptymalizowany widok.
- **Spójna nawigacja:** Stały pasek nawigacyjny zapewnia łatwy dostęp do wszystkich głównych sekcji aplikacji.
- **Jasna informacja zwrotna:** System wykorzystuje powiadomienia "toast", szkieletowe ekrany ładowania (skeleton loaders) i komunikaty wbudowane (inline), aby na bieżąco informować użytkownika o stanie aplikacji.
- **Podejście "Mobile-First":** Kluczowe interfejsy, takie jak sesja nauki, są projektowane z myślą o urządzeniach mobilnych, a bardziej złożone widoki, jak lista fiszek, adaptują się do większych ekranów.
- **Bezpieczeństwo:** Akcje destrukcyjne, takie jak usuwanie fiszek, są zabezpieczone oknami dialogowymi z prośbą o potwierdzenie, aby zapobiec przypadkowej utracie danych.

## 2. Lista widoków

### Widok: Uwierzytelnianie
- **Ścieżka:** `/auth`
- **Główny cel:** Umożliwienie nowym użytkownikom rejestracji, a powracającym zalogowania się na swoje konto.
- **Kluczowe informacje:** Formularz logowania (e-mail, hasło) i formularz rejestracji (e-mail, hasło, potwierdzenie hasła) z możliwością przełączania się między nimi.
- **Kluczowe komponenty:** `Card`, `Tabs`, `Input`, `Button`, `Form`, `Label`.
- **UX, dostępność i bezpieczeństwo:** Walidacja po stronie klienta (za pomocą `zod`) w czasie rzeczywistym informuje o błędach w formularzu (np. niepoprawny format e-maila, zbyt krótkie hasło). Użycie pola typu `password` maskuje wprowadzane hasło. Komunikaty o błędach są jasne i zwięzłe.

### Widok: Dashboard (Panel główny)
- **Ścieżka:** `/`
- **Główny cel:** Służy jako centrum nawigacyjne po zalogowaniu. Prezentuje podsumowanie stanu nauki i zapewnia szybki dostęp do głównych funkcji.
- **Kluczowe informacje:** Liczba fiszek zaplanowanych do powtórki na dany dzień.
- **Kluczowe komponenty:** `Card`, `Button` ("Rozpocznij naukę"), `Dialog` (dla ręcznego dodawania fiszek), `Skeleton` (podczas ładowania danych).
- **UX, dostępność i bezpieczeństwo:** Przycisk "Rozpocznij naukę" jest nieaktywny, jeśli nie ma fiszek do powtórki, co zapobiega frustracji użytkownika. W przypadku braku fiszek, widok prezentuje stan pusty z wyraźnym wezwaniem do działania (np. "Stwórz swoją pierwszą fiszkę!").

### Widok: Generuj Fiszki (AI)
- **Ścieżka:** `/generate`
- **Główny cel:** Umożliwienie użytkownikowi szybkiego tworzenia fiszek na podstawie wklejonego tekstu przy użyciu AI.
- **Kluczowe informacje:** Pole tekstowe na materiał źródłowy; lista propozycji fiszek wygenerowanych przez AI (przód i tył).
- **Kluczowe komponenty:** `Textarea`, `Button`, `Checkbox`, `Input` (do edycji propozycji), `Skeleton` (podczas przetwarzania przez AI), `Toast`.
- **UX, dostępność i bezpieczeństwo:** Interaktywna walidacja informuje o przekroczeniu limitów znaków w polu tekstowym. Wyraźny wskaźnik ładowania zarządza oczekiwaniami użytkownika. Użytkownik ma pełną kontrolę nad ostatecznym kształtem i wyborem fiszek przed ich zapisaniem.

### Widok: Moje Fiszki
- **Ścieżka:** `/flashcards`
- **Główny cel:** Przeglądanie, zarządzanie i usuwanie wszystkich zapisanych fiszek.
- **Kluczowe informacje:** Lista wszystkich fiszek użytkownika z podziałem na strony.
- **Kluczowe komponenty:** `Table` i `Pagination` (desktop), `AlertDialog` (potwierdzenie usunięcia), `Button`. Na urządzeniach mobilnych widok zmienia się w listę komponentów `Card`.
- **UX, dostępność i bezpieczeństwo:** Zastosowanie optymistycznego UI przy usuwaniu daje wrażenie natychmiastowej reakcji systemu. Dialog potwierdzenia (`AlertDialog`) chroni przed przypadkowym usunięciem danych. Responsywny układ zapewnia czytelność zarówno na desktopie, jak i na mobile.

### Widok: Sesja Nauki
- **Ścieżka:** `/study`
- **Główny cel:** Przeprowadzenie użytkownika przez zaplanowaną sesję powtórkową zgodnie z algorytmem SM-2.
- **Kluczowe informacje:** Przód (pytanie) bieżącej fiszki; tył (odpowiedź) fiszki (odsłaniany na żądanie); przyciski oceny.
- **Kluczowe komponenty:** `Card`, `Button`.
- **UX, dostępność i bezpieczeństwo:** Interfejs zaprojektowany w podejściu "mobile-first" z dużymi, łatwymi do naciśnięcia przyciskami. Prosty, trzystopniowy system oceny ("Nie pamiętam", "Pamiętam z trudem", "Pamiętam dobrze") jest bardziej intuicyjny niż skala 0-5. Każda ocena jest natychmiast zapisywana, co chroni postępy w razie przerwania sesji.

## 3. Mapa podróży użytkownika

Główny przepływ pracy użytkownika (happy path) wygląda następująco:
1.  **Logowanie:** Użytkownik wchodzi na stronę `/auth`, loguje się i zostaje przekierowany na `/` (Dashboard).
2.  **Tworzenie fiszek:** Na Dashboardzie klika skrót do generowania fiszek, przechodząc do `/generate`. Wkleja tekst, generuje propozycje, edytuje je i zapisuje wybrane. Po zapisie jest przekierowywany do `/flashcards` z powiadomieniem o sukcesie.
3.  **Rozpoczęcie nauki:** Użytkownik wraca na Dashboard (`/`). Widzi, że ma fiszki do nauki i klika przycisk "Rozpocznij naukę", co przenosi go do `/study`.
4.  **Sesja nauki:** W widoku `/study` użytkownik przechodzi przez kolejne fiszki. Dla każdej z nich:
    a. Odsłania odpowiedź.
    b. Ocenia swoją wiedzę za pomocą jednego z trzech przycisków.
    c. System automatycznie przechodzi do kolejnej fiszki.
5.  **Zakończenie sesji:** Po przejrzeniu ostatniej fiszki, użytkownik jest automatycznie przekierowywany z powrotem na Dashboard (`/`) i otrzymuje powiadomienie "toast" o pomyślnym zakończeniu sesji.

## 4. Układ i struktura nawigacji

- **Główna nawigacja:** Stały, poziomy pasek nawigacyjny umieszczony na górze strony, widoczny we wszystkich widokach oprócz `/auth` i `/study`. Zawiera:
    - Logo aplikacji (link do `/`)
    - Linki do: `Dashboard`, `Moje Fiszki`, `Generuj Fiszki`.
    - Rozwijane menu użytkownika z jego adresem e-mail i przyciskiem `Wyloguj`.
- **Stopka:** Prosta stopka na dole strony zawierająca linki do `Polityki Prywatności` i `Regulaminu`.

Ten układ zapewnia spójność i łatwy dostęp do kluczowych funkcji z dowolnego miejsca w aplikacji, minimalizując liczbę kliknięć potrzebnych do nawigacji.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów z biblioteki shadcn/ui, które będą stanowić podstawę systemu projektowego:
- **`Button`:** Standardowy komponent do wywoływania akcji (np. "Zapisz", "Generuj", "Usuń"). Będzie obsługiwał stany ładowania i nieaktywności.
- **`Input`, `Textarea`, `Checkbox`:** Podstawowe elementy formularzy używane do wprowadzania danych przez użytkownika.
- **`Card`:** Używany do grupowania powiązanych informacji w kontenery, np. na Dashboardzie, w sesji nauki czy w mobilnym widoku listy fiszek.
- **`Table` & `Pagination`:** Służą do wyświetlania i nawigowania po liście fiszek w widoku desktopowym.
- **`Dialog` & `AlertDialog`:** Komponenty modalne. `Dialog` będzie używany do wyświetlania formularza ręcznego dodawania fiszek, a `AlertDialog` do uzyskiwania potwierdzenia przed wykonaniem akcji destrukcyjnych.
- **`Toast`:** Dyskretne, globalne powiadomienia do informowania użytkownika o wynikach operacji (np. "Pomyślnie zapisano fiszki", "Wystąpił błąd").
- **`Skeleton`:** Służy jako "placeholder" w miejscach, gdzie dane są dynamicznie ładowane, zapobiegając przesunięciom układu (layout shift) i poprawiając postrzeganą wydajność.
