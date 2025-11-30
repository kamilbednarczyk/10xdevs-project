Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testowanie - Kompleksowa strategia zapewnienia jakości:
- Vitest do testów jednostkowych i integracyjnych (serwisy, hooki, komponenty)
- Testing Library (@testing-library/react, @testing-library/dom) do testowania komponentów React
- MSW (Mock Service Worker) do mockowania API w testach
- Playwright do testów end-to-end (pełne ścieżki użytkownika w przeglądarce)
- Cel: minimum 80% pokrycia kodu testami dla kluczowych funkcjonalności
- Automatyczne uruchamianie testów w pipeline CI/CD

CI/CD i Hosting:
- Github Actions do tworzenia pipeline'ów CI/CD (testy, lint, build, deploy)
- Cloudflare Pages do hostowania aplikacji (wykorzystanie edge computing dla niskich opóźnień)