# Dokument wymagań produktu (PRD) - 10xCards

## 1. Przegląd produktu

10xCards to aplikacja internetowa zaprojektowana w celu usprawnienia procesu tworzenia fiszek edukacyjnych poprzez wykorzystanie sztucznej inteligencji. Aplikacja pozwala użytkownikom na generowanie fiszek na podstawie wklejonego tekstu, a także na ich manualne tworzenie, edycję i usuwanie. Celem produktu jest zminimalizowanie czasu potrzebnego na przygotowanie materiałów do nauki i zachęcenie do korzystania z metody powtórek w interwałach (spaced repetition). Wersja MVP (Minimum Viable Product) skupia się na podstawowej funkcjonalności, prostym systemie kont użytkowników oraz integracji z gotowym algorytmem powtórek SM-2, kierując ofertę do szerokiej grupy odbiorców bez koncentracji na konkretnej niszy.

## 2. Problem użytkownika

Manualne tworzenie wysokiej jakości fiszek edukacyjnych jest procesem czasochłonnym i żmudnym. Uczniowie, studenci i osoby uczące się samodzielnie często rezygnują z tej formy nauki, mimo jej udowodnionej skuteczności. Bariera wejścia, związana z koniecznością ręcznego przepisywania i syntetyzowania informacji, zniechęca do regularnego stosowania metody spaced repetition, co obniża efektywność przyswajania wiedzy.

## 3. Wymagania funkcjonalne

### 3.1. System kont użytkowników
- Użytkownicy muszą mieć możliwość rejestracji i logowania, aby bezpiecznie przechowywać swoje fiszki.
- Dane użytkownika, w tym wszystkie stworzone fiszki, muszą być usuwane wraz z usunięciem konta.

### 3.2. Generowanie fiszek przez AI
- Aplikacja musi udostępniać pole tekstowe, w które użytkownik może wkleić tekst o długości od 1000 do 10000 znaków.
- Po przesłaniu tekstu, system wykorzystujący AI powinien wygenerować listę propozycji fiszek (z "przodem" i "tyłem").
- Liczba generowanych fiszek jest określana autonomicznie przez AI, z górnym limitem kilkunastu na jeden tekst.
- "Przód" fiszki (pytanie/pojęcie) ma limit 200 znaków.
- "Tył" fiszki (odpowiedź/definicja) ma limit 500 znaków.
- System musi posiadać warstwę abstrakcji umożliwiającą łatwą zmianę dostawcy usług AI w przyszłości.

### 3.3. Zarządzanie fiszkami
- Użytkownik musi mieć możliwość przeglądania listy wygenerowanych propozycji fiszek.
- Użytkownik musi mieć możliwość edycji treści (przód i tył) każdej z propozycji wygenerowanej przez AI przed jej zaakceptowaniem. Edycja odbywa się w trybie czystego tekstu.
- Użytkownik musi jawnie zaznaczyć, które fiszki (oryginalne lub edytowane) chce zapisać na swoim koncie. Niezaznaczone fiszki są odrzucane.
- Użytkownik musi mieć możliwość manualnego tworzenia fiszek poprzez prosty formularz (przód, tył).
- Użytkownik musi mieć dostęp do widoku listy wszystkich swoich zapisanych fiszek.
- Użytkownik musi mieć możliwość usunięcia dowolnej fiszki ze swojej kolekcji.

### 3.4. System nauki
- Aplikacja musi zaimplementować algorytm powtórek SM-2 do zarządzania cyklem nauki.
- W interfejsie głównym musi znajdować się jeden przycisk "Rozpocznij naukę".
- Kliknięcie przycisku rozpoczyna sesję nauki, prezentując użytkownikowi wyłącznie te fiszki, które są zaplanowane na dany dzień zgodnie z algorytmem.

### 3.5. Wymagania prawne
- Aplikacja musi udostępniać użytkownikom podstawową Politykę Prywatności i Regulamin.

## 4. Granice produktu

Następujące funkcjonalności celowo NIE wchodzą w zakres MVP:
- Zaawansowane algorytmy powtórek (np. SuperMemo, Anki). Zostanie użyty prostszy SM-2.
- Import plików w formatach takich jak PDF, DOCX, itp. Dane wejściowe to wyłącznie tekst wklejany do formularza.
- Funkcje społecznościowe, takie jak współdzielenie zestawów fiszek między użytkownikami.
- Integracje z zewnętrznymi platformami edukacyjnymi.
- Dedykowane aplikacje mobilne (produkt będzie dostępny wyłącznie jako aplikacja internetowa).
- Systemy moderacji lub filtrowania treści. Użytkownik ponosi pełną odpowiedzialność za treści na swoim koncie.

## 5. Historyjki użytkowników

### Zarządzanie kontem

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji, aby zapisywać swoje fiszki i śledzić postępy w nauce.
- Kryteria akceptacji:
  - Użytkownik może wejść na stronę rejestracji.
  - Formularz wymaga podania adresu e-mail i hasła (z potwierdzeniem).
  - System waliduje poprawność formatu e-maila i sprawdza, czy nie jest już zajęty.
  - Hasło musi spełniać podstawowe wymogi bezpieczeństwa (np. minimalna długość).
  - Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowany do głównego panelu aplikacji.

- ID: US-002
- Tytuł: Logowanie do systemu
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich fiszek.
- Kryteria akceptacji:
  - Użytkownik może wejść na stronę logowania.
  - Formularz wymaga podania adresu e-mail i hasła.
  - Po podaniu poprawnych danych, użytkownik jest zalogowany i przekierowany do głównego panelu.
  - W przypadku podania błędnych danych, wyświetlany jest stosowny komunikat.

- ID: US-003
- Tytuł: Wylogowanie z systemu
- Opis: Jako zalogowany użytkownik, chcę móc wylogować się z aplikacji, aby zabezpieczyć swoje konto.
- Kryteria akceptacji:
  - W interfejsie użytkownika dostępny jest przycisk "Wyloguj" - na pasku nawigacyjnym na górze strony.
  - Po kliknięciu przycisku sesja użytkownika jest kończona i jest on przekierowywany na stronę logowania.

- ID: US-012
- Tytuł: Reset hasła
- Opis: Jako użytkownik, który zapomniał hasła, chcę móc zresetować swoje hasło, aby odzyskać dostęp do konta.
- Kryteria akceptacji:
  - Na stronie logowania dostępny jest link "Zapomniałeś hasła?".
  - Po kliknięciu użytkownik jest przekierowany do formularza resetowania hasła.
  - Formularz wymaga podania adresu e-mail powiązanego z kontem.
  - Po przesłaniu formularza, Supabase wysyła e-mail z linkiem do resetowania hasła.
  - Użytkownik otrzymuje komunikat potwierdzający wysłanie e-maila (nawet jeśli adres nie istnieje w systemie, ze względów bezpieczeństwa).
  - Link w e-mailu przekierowuje użytkownika do strony z formularzem ustawienia nowego hasła.
  - Formularz nowego hasła wymaga podania hasła (z potwierdzeniem).
  - Nowe hasło musi spełniać te same wymogi bezpieczeństwa co przy rejestracji.
  - Po pomyślnej zmianie hasła użytkownik jest przekierowany do strony logowania z komunikatem o sukcesie.

### Generowanie fiszek

- ID: US-004
- Tytuł: Generowanie propozycji fiszek z tekstu
- Opis: Jako użytkownik, chcę wkleić fragment tekstu do analizy i otrzymać od AI listę sugerowanych fiszek, aby szybko stworzyć materiały do nauki.
- Kryteria akceptacji:
  - W interfejsie znajduje się pole tekstowe oraz przycisk "Generuj fiszki".
  - System uniemożliwia wysłanie tekstu krótszego niż 1000 znaków i dłuższego niż 10000 znaków, wyświetlając odpowiedni komunikat.
  - Po kliknięciu przycisku i przetworzeniu tekstu, na ekranie pojawia się lista propozycji fiszek, każda z polem "przód" i "tył".
  - W trakcie generowania wyświetlany jest wskaźnik ładowania.

- ID: US-005
- Tytuł: Przeglądanie i akceptacja wygenerowanych fiszek
- Opis: Jako użytkownik, chcę przejrzeć listę wygenerowanych fiszek i wybrać te, które chcę zapisać na moim koncie.
- Kryteria akceptacji:
  - Każda propozycja na liście ma pole wyboru (checkbox).
  - Użytkownik może zaznaczyć dowolną liczbę fiszek.
  - Dostępny jest przycisk "Zapisz zaznaczone".
  - Po kliknięciu przycisku, tylko zaznaczone fiszki są dodawane do kolekcji użytkownika, a widok propozycji jest zamykany.

- ID: US-006
- Tytuł: Edycja propozycji fiszki przed zapisaniem
- Opis: Jako użytkownik, chcę mieć możliwość edycji treści wygenerowanej fiszki przed jej zaakceptowaniem, aby dostosować ją do swoich potrzeb.
- Kryteria akceptacji:
  - Pola "przód" i "tył" każdej propozycji są edytowalne.
  - Edycja nie może przekroczyć limitu 200 znaków dla "przodu" i 500 dla "tyłu".
  - Zmiany są zachowywane po zaznaczeniu fiszki i kliknięciu "Zapisz zaznaczone".

### Zarządzanie kolekcją fiszek

- ID: US-007
- Tytuł: Manualne tworzenie nowej fiszki
- Opis: Jako użytkownik, chcę mieć możliwość ręcznego dodania nowej fiszki do mojej kolekcji, gdy mam konkretne pojęcie do zapamiętania.
- Kryteria akceptacji:
  - W widoku kolekcji fiszek dostępny jest przycisk "Dodaj nową fiszkę".
  - Po kliknięciu pojawia się formularz z polami "przód" i "tył".
  - Obowiązują te same limity znaków (200/500).
  - Po zapisaniu nowa fiszka pojawia się na liście w kolekcji.

- ID: US-008
- Tytuł: Przeglądanie kolekcji fiszek
- Opis: Jako użytkownik, chcę widzieć listę wszystkich moich zapisanych fiszek, aby zarządzać swoją bazą wiedzy.
- Kryteria akceptacji:
  - Dostępny jest ekran "Moje fiszki" lub podobny.
  - Fiszki są wyświetlane w formie listy, pokazując treść "przodu" i/lub "tyłu".

- ID: US-009
- Tytuł: Usuwanie fiszki z kolekcji
- Opis: Jako użytkownik, chcę móc usunąć fiszkę, której już nie potrzebuję, aby utrzymać porządek w mojej kolekcji.
- Kryteria akceptacji:
  - Przy każdej fiszce na liście znajduje się przycisk "Usuń".
  - Przed permanentnym usunięciem wyświetlane jest okno z prośbą o potwierdzenie.
  - Po potwierdzeniu fiszka jest trwale usuwana z bazy danych.

### Proces nauki

- ID: US-010
- Tytuł: Rozpoczynanie sesji nauki
- Opis: Jako użytkownik, chcę za pomocą jednego kliknięcia rozpocząć sesję powtórkową, aby system pokazał mi fiszki do nauki na dziś.
- Kryteria akceptacji:
  - W głównym widoku aplikacji widoczny jest przycisk "Rozpocznij naukę".
  - Przycisk jest aktywny tylko wtedy, gdy są fiszki zaplanowane do powtórki na dany dzień.
  - Po kliknięciu użytkownik jest przenoszony do interfejsu nauki.

- ID: US-011
- Tytuł: Powtarzanie fiszki
- Opis: Jako użytkownik w trakcie sesji nauki, chcę zobaczyć pytanie z fiszki, a następnie samodzielnie odkryć odpowiedź, aby sprawdzić swoją wiedzę.
- Kryteria akceptacji:
  - Interfejs nauki początkowo wyświetla tylko "przód" fiszki.
  - Dostępny jest przycisk "Pokaż odpowiedź".
  - Po kliknięciu przycisku, na ekranie pojawia się treść z "tyłu" fiszki.

- ID: US-012
- Tytuł: Ocena odpowiedzi i planowanie kolejnej powtórki
- Opis: Jako użytkownik, po zobaczeniu odpowiedzi chcę ocenić swoją znajomość materiału, aby algorytm mógł zaplanować kolejną powtórkę.
- Kryteria akceptacji:
  - Po odkryciu odpowiedzi, na ekranie pojawiają się przyciski do samooceny (np. "Źle", "Dobrze", "Idealnie").
  - Wybór jednej z opcji powoduje zapisanie wyniku i obliczenie przez algorytm SM-2 daty następnej powtórki.
  - System automatycznie przechodzi do kolejnej fiszki zaplanowanej na dany dzień lub kończy sesję, jeśli to była ostatnia.

## 6. Metryki sukcesu

- Kryterium 1: 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika.
  - Sposób pomiaru: Dla każdego żądania generowania fiszek system będzie logował w dedykowanej tabeli bazy danych dwa pola: `generated_count` i `accepted_count`. Pozwoli to na obliczenie globalnego wskaźnika akceptacji (`sum(generated_count) / sum(accepted_count)`).

- Kryterium 2: Użytkownicy tworzą 75% fiszek z wykorzystaniem AI.
  - Sposób pomiaru: System będzie logował dwa typy zdarzeń przy tworzeniu fiszki: `ai_generated` oraz `user_generated`. Stosunek tych dwóch wartości w danym okresie pozwoli na ocenę tego kryterium.