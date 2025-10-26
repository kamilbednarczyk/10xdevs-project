# API Endpoint Implementation Plan: POST /api/generations

## 1. Endpoint Overview
This document outlines the implementation plan for the `POST /api/generations` endpoint. Its purpose is to accept a block of text from an authenticated user, utilize an AI service to generate flashcard proposals from that text, create a `generations` record in the database for tracking, and return the proposals to the client for user review and approval.

## 2. Request Details
-   **HTTP Method:** `POST`
-   **URL Structure:** `/api/generations`
-   **Request Body:** The body must be a JSON object conforming to the `CreateGenerationCommand` model.

    ```json
    {
      "text": "string"
    }
    ```

-   **Validation:**
    -   `text`: Required, `string`, minimum 1000 characters, maximum 10000 characters.

## 3. Used Types
The implementation will use the following predefined types from `src/types.ts`:
-   **Command Model (Request):** `CreateGenerationCommand`
-   **DTO (Success Response):** `GenerationResponseDTO`
-   **DTO (Component):** `FlashcardProposalDTO`
-   **DTO (Error Response):** `ErrorResponseDTO`

## 4. Response Details
-   **Success (201 Created):**
    -   Indicates that the AI generation was successful and a tracking record was created.
    -   The response body will be a JSON object conforming to the `GenerationResponseDTO` type.
    ```json
    {
      "generation_id": 123,
      "generated_count": 8,
      "proposals": [
        {
          "front": "What is Astro?",
          "back": "A web framework for building fast, content-focused websites."
        }
      ]
    }
    ```
-   **Error Responses:** See the Error Handling section for details.

## 5. Data Flow
1.  A `POST` request is sent to `/api/generations` with the required `text` in the request body.
2.  The Astro middleware authenticates the user via their Supabase JWT and attaches the user object to `Astro.locals`.
3.  The API route handler (`src/pages/api/generations/index.ts`) is triggered.
4.  The handler first checks `Astro.locals.user`. If no user is present, it returns a `401 Unauthorized` error.
5.  The request body is parsed and validated against a Zod schema for the `CreateGenerationCommand`. If validation fails, it returns a `400 Bad Request` error.
6.  The handler calls the `GenerationService`, passing the validated text and the user's ID.
7.  The `GenerationService` calls the `OpenRouterService` with the user's text.
8.  The `OpenRouterService` constructs a system prompt and sends the request to the configured AI model via the OpenRouter API.
9.  Upon receiving a successful response, the `GenerationService` parses the AI-generated JSON into an array of `FlashcardProposalDTO`.
10. The `GenerationService` inserts a new record into the `generations` database table, including the `user_id` and the `generated_count` (the number of proposals received).
11. The service returns an object containing the new `generation_id`, `generated_count`, and the list of `proposals`.
12. The API route handler receives this data and sends a `201 Created` response to the client.

## 6. Security Considerations
-   **Authentication:** The endpoint is protected by Supabase authentication. The route handler must verify that `Astro.locals.user` exists before processing the request.
-   **Authorization:** All database queries performed by the service must be scoped to the authenticated user's ID to prevent data leakage or unauthorized access.
-   **Rate Limiting:** To prevent abuse and control costs associated with the AI service, a rate-limiting mechanism should be implemented (e.g., using a middleware or a service like Upstash). A reasonable limit would be 10 requests per user per hour.
-   **Environment Variables:** The `OPENROUTER_API_KEY` must be stored securely in environment variables and never exposed on the client side.

## 7. Error Handling
Errors will be handled gracefully and will return a standardized `ErrorResponseDTO`.

| Status Code | Error Code               | Reason                                                                    |
| ----------- | ------------------------ | ------------------------------------------------------------------------- |
| `400`       | `VALIDATION_ERROR`       | The request body fails validation (e.g., missing `text`, wrong type, or out of length bounds). |
| `401`       | `UNAUTHORIZED`           | The user is not authenticated.                                            |
| `500`       | `AI_SERVICE_ERROR`       | The AI service returns a malformed or unparsable response.                |
| `500`       | `INTERNAL_ERROR`         | A database error occurs, or any other unexpected server-side exception.   |
| `503`       | `AI_SERVICE_ERROR`       | The AI service is temporarily unavailable or returns a non-200 status code. |

## 8. Performance Considerations
-   The primary performance bottleneck will be the latency of the external AI service (OpenRouter). The client-side implementation should account for this by displaying a loading state to the user during processing.
-   The database insert operation is expected to be very fast and should not significantly impact overall response time.

## 9. Implementation Steps
1.  **Environment Setup:**
    -   Add `OPENROUTER_API_KEY` to the `.env` and `.env.example` files.

2.  **Validation Schema:**
    -   Create a file `src/lib/schemas/generation.schema.ts`.
    -   Define and export a Zod schema named `CreateGenerationSchema` for the request body.

3.  **AI Service Abstraction:**
    -   Create a new service file: `src/lib/services/openrouter.service.ts`.
    -   Implement a class or function that handles communication with the OpenRouter API.
    -   It should include logic for constructing the prompt, making the API call, and handling potential API errors.

4.  **Business Logic Service:**
    -   Create a new service file: `src/lib/services/generation.service.ts`.
    -   Implement the core business logic:
        -   Accepts `text` and `userId`.
        -   Calls the `OpenRouterService`.
        -   Parses and validates the AI response.
        -   Uses the Supabase client to insert a new record into the `generations` table.
        -   Returns the final `GenerationResponseDTO`.

5.  **API Route Handler:**
    -   Create the API route file `src/pages/api/generations/index.ts`.
    -   Implement the `POST` handler function.
    -   Perform authentication check for `Astro.locals.user`.
    -   Use the `CreateGenerationSchema` to validate the request body.
    -   Wrap the call to `GenerationService` in a `try...catch` block to handle errors gracefully.
    -   Return the appropriate success (`201`) or error responses.

6.  **Type Safety:**
    -   Ensure all functions and variables are strongly typed using the existing DTOs and Command Models from `src/types.ts`.
