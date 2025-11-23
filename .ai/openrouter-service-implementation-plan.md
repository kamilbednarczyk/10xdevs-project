# Przewodnik Implementacji Usługi OpenRouter

## 1. Opis usługi

`OpenRouterService` to klasa po stronie serwera, zaprojektowana do hermetyzacji logiki komunikacji z API OpenRouter. Jej celem jest uproszczenie procesu wysyłania zapytań do modeli językowych (LLM), zarządzanie konfiguracją i autentykacją oraz zapewnienie spójnej obsługi błędów. Usługa będzie działać wyłącznie w środowisku serwerowym (w ramach endpointów API Astro), aby chronić klucz API i inne wrażliwe dane.

## 2. Opis konstruktora

Konstruktor klasy `OpenRouterService` inicjalizuje serwis, wczytując klucz API ze zmiennych środowiskowych. Zapewnia to, że klucz nie jest "hardkodowany" w kodzie i jest zarządzany w bezpieczny sposób.

```typescript
// src/lib/openrouter/OpenRouterService.ts

export class OpenRouterService {
  private apiKey: string;
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    // Wczytanie klucza API ze zmiennych środowiskowych Astro
    this.apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!this.apiKey) {
      console.error('Brak klucza OPENROUTER_API_KEY w zmiennych środowiskowych.');
      throw new Error('Brak konfiguracji dla OpenRouterService.');
    }
  }

  // ... metody
}
```

## 3. Publiczne metody i pola

### `async getChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>`

Główna metoda publiczna do interakcji z API. Wysyła zapytanie o uzupełnienie czatu i zwraca odpowiedź modelu.

-   **Parametry (`ChatCompletionOptions`):**
    -   `model`: `string` - Nazwa modelu do użycia (np. `'google/gemini-flash-1.5'`).
    -   `messages`: `ChatMessage[]` - Tablica obiektów wiadomości (`{ role: 'system' | 'user' | 'assistant', content: string }`).
    -   `response_format?`: `ResponseFormat` - (Opcjonalne) Definiuje format odpowiedzi, np. w celu uzyskania ustrukturyzowanego JSONa.
    -   `temperature?`: `number` - (Opcjonalne) Kreatywność odpowiedzi (0.0 - 2.0).
    -   `max_tokens?`: `number` - (Opcjonalne) Maksymalna liczba tokenów w odpowiedzi.
    -   `...inne parametry API`

-   **Zwraca:** `Promise<ChatCompletionResponse>` - Obiekt zawierający odpowiedź z API, w tym `choices` z treścią wygenerowaną przez model.

-   **Rzuca:** `OpenRouterApiError` w przypadku problemów z komunikacją z API.

## 4. Prywatne metody i pola

### `private apiKey: string`

Przechowuje klucz API OpenRouter wczytany z `.env`.

### `private readonly apiUrl: string`

Przechowuje stały adres URL endpointu API OpenRouter.

### `private async makeRequest(body: Record<string, any>): Promise<any>`

Prywatna metoda pomocnicza, która wykonuje rzeczywiste zapytanie `fetch` do API.

-   **Funkcjonalność:**
    -   Buduje nagłówki autoryzacyjne (`Authorization: Bearer ${this.apiKey}`).
    -   Wysyła zapytanie POST z podanym `body`.
    -   Sprawdza status odpowiedzi HTTP i rzuca `OpenRouterApiError` w przypadku błędu.
    -   Parsuje i zwraca odpowiedź JSON.

## 5. Obsługa błędów

Błędy będą obsługiwane za pomocą niestandardowej klasy `OpenRouterApiError`, która rozszerza standardowy `Error`. Pozwoli to na przechwytywanie specyficznych błędów związanych z API i odpowiednie reagowanie na nie w kodzie.

-   **`OpenRouterApiError`:**
    -   `status`: `number` - Kod statusu HTTP odpowiedzi.
    -   `message`: `string` - Komunikat błędu.
    -   `originalError?`: `any` - Oryginalny błąd, jeśli wystąpił.

-   **Scenariusze błędów:**
    1.  **401 Unauthorized:** Nieprawidłowy lub brakujący klucz API. Serwis zaloguje błąd i rzuci `OpenRouterApiError` ze statusem 401.
    2.  **400 Bad Request:** Nieprawidłowe parametry zapytania (np. zła nazwa modelu, błąd w schemacie JSON).
    3.  **429 Too Many Requests:** Przekroczono limity zapytań. W przyszłości można zaimplementować mechanizm ponawiania z `exponential backoff`.
    4.  **5xx Server Error:** Błędy po stronie serwerów OpenRouter.
    5.  **Błędy sieciowe:** Problemy z połączeniem zostaną przechwycone i opakowane w `OpenRouterApiError`.

## 6. Kwestie bezpieczeństwa

1.  **Zarządzanie kluczem API:** Klucz API **musi** być przechowywany w pliku `.env` i nigdy nie może być ujawniony po stronie klienta. `OpenRouterService` musi być używany wyłącznie w kodzie serwerowym (np. w `src/pages/api/**/*.ts`).
2.  **Walidacja danych wejściowych:** Wszystkie dane przychodzące od klienta (np. treść promptu) powinny być walidowane przed przekazaniem do API, aby zapobiec atakom typu "prompt injection".
3.  **Ograniczenie dostępu:** Endpointy API Astro korzystające z tej usługi powinny być zabezpieczone, aby uniemożliwić nieautoryzowane użycie i nadmierne zużycie zasobów.

## 7. Plan wdrożenia krok po kroku

### Krok 1: Konfiguracja środowiska

1.  W głównym katalogu projektu utwórz plik `.env` (jeśli jeszcze nie istnieje).
2.  Dodaj do niego swój klucz API OpenRouter:
    ```env
    # .env
    OPENROUTER_API_KEY="sk-or-v1-..."
    ```
3.  Upewnij się, że plik `.env` jest dodany do `.gitignore`.

### Krok 2: Definicja typów

Zgodnie ze strukturą projektu, zdefiniuj typy dla usługi w `src/types.ts`.

```typescript
// src/types.ts

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type JsonSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, any>;
};

export type ResponseFormat = {
  type: 'json_schema';
  json_schema: JsonSchema;
};

export type ChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  // ... inne opcjonalne parametry
};

export type ChatCompletionResponse = {
  id: string;
  choices: {
    message: ChatMessage;
    // ... inne pola
  }[];
  // ... inne pola
};
```

### Krok 3: Implementacja `OpenRouterService`

Utwórz plik `src/lib/openrouter/OpenRouterService.ts` i zaimplementuj w nim klasę.

```typescript
// src/lib/openrouter/OpenRouterService.ts

import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
} from '../../types';

// Niestandardowa klasa błędu
export class OpenRouterApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OpenRouterApiError';
  }
}

export class OpenRouterService {
  private apiKey: string;
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      console.error('Brak klucza OPENROUTER_API_KEY w zmiennych środowiskowych.');
      throw new Error('Brak konfiguracji dla OpenRouterService.');
    }
  }

  public async getChatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.makeRequest(options);
      return response as ChatCompletionResponse;
    } catch (error) {
      console.error('Błąd podczas komunikacji z OpenRouter API:', error);
      if (error instanceof OpenRouterApiError) {
        throw error;
      }
      throw new OpenRouterApiError(500, 'Wystąpił nieznany błąd serwera.', error);
    }
  }

  private async makeRequest(body: Record<string, any>): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost', // Wymagane przez OpenRouter, dostosuj
        'X-Title': '10xDevs Project', // Wymagane, dostosuj
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Błąd API: ${response.status}`, errorBody);
      throw new OpenRouterApiError(response.status, `Błąd API: ${response.statusText}`);
    }

    return response.json();
  }
}

// Eksport instancji singletona dla łatwiejszego użycia
export const openRouterService = new OpenRouterService();
```

### Krok 4: Użycie usługi w Endpoincie API Astro

Utwórz przykładowy endpoint API w `src/pages/api/chat.ts`, aby przetestować usługę.

```typescript
// src/pages/api/chat.ts
import type { APIRoute } from 'astro';
import { openRouterService, OpenRouterApiError } from '../../lib/openrouter/OpenRouterService';
import type { ChatMessage, ResponseFormat } from '../../types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userPrompt } = body;

    if (!userPrompt || typeof userPrompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Brak `userPrompt` w zapytaniu.' }), { status: 400 });
    }

    // 1. Definicja komunikatu systemowego i użytkownika
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: "Jesteś asystentem, który generuje dane użytkownika w formacie JSON na podstawie podanego imienia. Zawsze odpowiadaj zgodnie z wymaganym schematem JSON.",
      },
      {
        role: 'user',
        content: `Wygeneruj dane dla: ${userPrompt}`,
      },
    ];

    // 2. Definicja schematu JSON dla `response_format`
    const responseFormat: ResponseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'user_data',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            fullName: { type: 'string', description: 'Pełne imię i nazwisko' },
            email: { type: 'string', format: 'email', description: 'Wygenerowany adres email' },
            age: { type: 'integer', description: 'Losowy wiek między 18 a 65' },
          },
          required: ['fullName', 'email', 'age'],
        },
      },
    };

    // 3. Wywołanie usługi z nazwą modelu, parametrami i formatem odpowiedzi
    const completion = await openRouterService.getChatCompletion({
      model: 'anthropic/claude-3-haiku', // 4. Nazwa modelu
      messages: messages,
      response_format: responseFormat,
      temperature: 0.8, // 5. Parametry modelu
      max_tokens: 500,
    });
    
    const responseContent = completion.choices[0].message.content;
    const jsonData = JSON.parse(responseContent);

    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof OpenRouterApiError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status });
    }
    console.error(error);
    return new Response(JSON.stringify({ error: 'Wystąpił błąd wewnętrzny serwera.' }), { status: 500 });
  }
};
```

### Krok 5: Testowanie

Uruchom serwer deweloperski Astro i wyślij zapytanie POST do `/api/chat` za pomocą narzędzia takiego jak `curl` lub Postman, aby zweryfikować działanie endpointu.

```bash
curl -X POST http://localhost:4321/api/chat \
-H "Content-Type: application/json" \
-d '{"userPrompt": "Jan Kowalski"}'
```

Oczekiwana odpowiedź będzie obiektem JSON zgodnym ze zdefiniowanym schematem.
