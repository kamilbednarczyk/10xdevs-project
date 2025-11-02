# REST API Plan - 10xCards

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Flashcards | `flashcards` | User's flashcard collection with SM-2 algorithm data |
| Generations | `generations` | AI generation session metrics and tracking |
| Study | `flashcards` (filtered) | Flashcards due for review based on SM-2 algorithm |

## 2. Endpoints

### 2.1 Flashcards Resource

#### List User's Flashcards

**Endpoint:** `GET /api/flashcards`

**Description:** Retrieve all flashcards belonging to the authenticated user with pagination support.

**Authentication:** Required (Supabase Auth)

**Query Parameters:**
- `page` (optional, integer, default: 1) - Page number
- `limit` (optional, integer, default: 50, max: 100) - Items per page
- `sort` (optional, string, default: "created_at") - Sort field (created_at, due_date, updated_at)
- `order` (optional, string, default: "desc") - Sort order (asc, desc)

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 0,
      "repetition": 0,
      "ease_factor": 2.5,
      "due_date": "2025-10-25T12:00:00Z",
      "generation_type": "ai",
      "generation_id": 123,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

**Success Codes:**
- `200 OK` - Flashcards retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid query parameters

---

#### Get Single Flashcard

**Endpoint:** `GET /api/flashcards/:id`

**Description:** Retrieve a specific flashcard by ID.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id` (required, uuid) - Flashcard ID

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "interval": 0,
  "repetition": 0,
  "ease_factor": 2.5,
  "due_date": "2025-10-25T12:00:00Z",
  "generation_type": "manual",
  "generation_id": null,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**Success Codes:**
- `200 OK` - Flashcard retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

---

#### Create Manual Flashcard

**Endpoint:** `POST /api/flashcards`

**Description:** Create a new flashcard manually (not AI-generated).

**Authentication:** Required (Supabase Auth)

**Request Payload:**
```json
{
  "front": "string",
  "back": "string",
  "generation_type": "manual"
}
```

**Response Payload (201 Created):**
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "interval": 0,
  "repetition": 0,
  "ease_factor": 2.5,
  "due_date": "2025-10-25T12:00:00Z",
  "generation_type": "manual",
  "generation_id": null,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**Success Codes:**
- `201 Created` - Flashcard created successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Validation failed (see validation rules)
- `422 Unprocessable Entity` - Invalid data format

**Validation Rules:**
- `front`: Required, 1-200 characters
- `back`: Required, 1-500 characters
- `generation_type`: Required

---

#### Create Multiple Flashcards (Batch)

**Endpoint:** `POST /api/flashcards/batch`

**Description:** Create multiple flashcards at once, typically from AI-generated proposals. Updates the generation record's accepted_count.

**Authentication:** Required (Supabase Auth)

**Request Payload:**
```json
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "generation_type": "ai" | "manual",
      "generation_id": 123,
    }
  ]
}
```

**Response Payload (201 Created):**
```json
{
  "created_count": 5,
  "flashcards": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 0,
      "repetition": 0,
      "ease_factor": 2.5,
      "due_date": "2025-10-25T12:00:00Z",
      "generation_type": "ai",
      "generation_id": 123,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:00:00Z"
    }
  ]
}
```

**Success Codes:**
- `201 Created` - Flashcards created successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Validation failed or generation_id doesn't belong to user
- `404 Not Found` - Generation record not found
- `422 Unprocessable Entity` - Invalid data format

**Validation Rules:**
- `generation_id`: Required, must exist and belong to user
- `flashcards`: Required, array with at least 1 item
- Each flashcard `front`: Required, 1-200 characters
- Each flashcard `back`: Required, 1-500 characters
- Each flashcard `generation_type`: Required

---

#### Update Flashcard

**Endpoint:** `PUT /api/flashcards/:id`

**Description:** Update an existing flashcard's content.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id` (required, uuid) - Flashcard ID

**Request Payload:**
```json
{
  "front": "string",
  "back": "string"
}
```

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "interval": 0,
  "repetition": 0,
  "ease_factor": 2.5,
  "due_date": "2025-10-25T12:00:00Z",
  "generation_type": "manual",
  "generation_id": null,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T12:30:00Z"
}
```

**Success Codes:**
- `200 OK` - Flashcard updated successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user
- `400 Bad Request` - Validation failed
- `422 Unprocessable Entity` - Invalid data format

**Validation Rules:**
- `front`: Required, 1-200 characters
- `back`: Required, 1-500 characters

---

#### Delete Flashcard

**Endpoint:** `DELETE /api/flashcards/:id`

**Description:** Permanently delete a flashcard.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id` (required, uuid) - Flashcard ID

**Request Payload:** None

**Response Payload (204 No Content):** Empty

**Success Codes:**
- `204 No Content` - Flashcard deleted successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

---

### 2.2 Generations Resource

#### Create AI Generation Session

**Endpoint:** `POST /api/generations`

**Description:** Submit text for AI processing and receive flashcard proposals. Creates a generation record for metrics tracking.

**Authentication:** Required (Supabase Auth)

**Request Payload:**
```json
{
  "text": "string"
}
```

**Response Payload (201 Created):**
```json
{
  "generation_id": 123,
  "generated_count": 8,
  "proposals": [
    {
      "front": "string",
      "back": "string"
    }
  ]
}
```

**Success Codes:**
- `201 Created` - Generation completed successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Text length validation failed
- `422 Unprocessable Entity` - Invalid data format
- `500 Internal Server Error` - AI service error
- `503 Service Unavailable` - AI service temporarily unavailable

**Validation Rules:**
- `text`: Required, 1000-10000 characters

**Business Logic:**
1. Validate text length (1000-10000 characters)
2. Send text to AI service (OpenRouter)
3. Parse AI response into flashcard proposals
4. Create generation record with `generated_count`
5. Return proposals to frontend for user review

---

#### Get Generation Details

**Endpoint:** `GET /api/generations/:id`

**Description:** Retrieve details of a specific generation session.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id` (required, integer) - Generation ID

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "id": 123,
  "user_id": "uuid",
  "generated_count": 8,
  "accepted_count": 6,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T10:05:00Z"
}
```

**Success Codes:**
- `200 OK` - Generation retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Generation not found or doesn't belong to user

---

#### List User's Generations

**Endpoint:** `GET /api/generations`

**Description:** Retrieve all generation sessions for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Query Parameters:**
- `page` (optional, integer, default: 1) - Page number
- `limit` (optional, integer, default: 20, max: 50) - Items per page

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "id": 123,
      "generated_count": 8,
      "accepted_count": 6,
      "acceptance_rate": 0.75,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Success Codes:**
- `200 OK` - Generations retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid query parameters

---

### 2.3 Study Resource

#### Get Due Flashcards

**Endpoint:** `GET /api/study/due`

**Description:** Retrieve all flashcards that are due for review today based on SM-2 algorithm.

**Authentication:** Required (Supabase Auth)

**Query Parameters:**
- `date` (optional, ISO 8601 date, default: today) - Date to check for due flashcards

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "due_count": 12,
  "flashcards": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "interval": 1,
      "repetition": 2,
      "ease_factor": 2.6,
      "due_date": "2025-10-25T00:00:00Z"
    }
  ]
}
```

**Success Codes:**
- `200 OK` - Due flashcards retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid date format

**Business Logic:**
- Query uses indexed lookup: `WHERE user_id = ? AND due_date <= ?`
- Returns flashcards in order of due_date (oldest first)

---

#### Submit Review Result

**Endpoint:** `POST /api/flashcards/:id/review`

**Description:** Submit user's self-assessment of a flashcard and update SM-2 algorithm parameters.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id` (required, uuid) - Flashcard ID

**Request Payload:**
```json
{
  "quality": 3
}
```

**Response Payload (200 OK):**
```json
{
  "id": "uuid",
  "interval": 3,
  "repetition": 3,
  "ease_factor": 2.6,
  "due_date": "2025-10-28T00:00:00Z",
  "updated_at": "2025-10-25T12:30:00Z"
}
```

**Success Codes:**
- `200 OK` - Review recorded and SM-2 parameters updated

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user
- `400 Bad Request` - Invalid quality value
- `422 Unprocessable Entity` - Invalid data format

**Validation Rules:**
- `quality`: Required, integer 0-5 (SM-2 standard scale)
  - 0: Complete blackout
  - 1: Incorrect response, correct answer seemed familiar
  - 2: Incorrect response, correct answer seemed easy to recall
  - 3: Correct response, but required significant effort
  - 4: Correct response, after some hesitation
  - 5: Perfect response

**Business Logic (SM-2 Algorithm):**
1. If quality < 3:
   - Set repetition = 0
   - Set interval = 1
2. If quality >= 3:
   - If repetition == 0: interval = 1
   - If repetition == 1: interval = 6
   - If repetition > 1: interval = previous_interval * ease_factor
   - Increment repetition
3. Update ease_factor:
   - ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
   - Minimum ease_factor = 1.3
4. Calculate due_date = current_date + interval days
5. Update flashcard record

---

## 3. Authentication and Authorization

### Authentication Mechanism

**Provider:** Supabase Auth

**Implementation:**
- Frontend uses Supabase JavaScript client for authentication
- Users authenticate via email/password (Supabase handles registration, login, logout)
- Supabase returns JWT tokens managed by the client library
- API endpoints receive authenticated requests with JWT in Authorization header

**Token Format:**
```
Authorization: Bearer <supabase_jwt_token>
```

### Authorization

**Row-Level Security (RLS):**
- All API operations use Supabase client with user's JWT
- Database enforces RLS policies:
  - `flashcards` table: `USING (auth.uid() = user_id)`
  - `generations` table: `USING (auth.uid() = user_id)`
- Users can only access their own data
- No additional authorization layer needed in API

**Cascade Deletion:**
- When user account is deleted (via Supabase Auth), all associated records are automatically deleted via `ON DELETE CASCADE` foreign key constraints

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Flashcards

| Field | Validation |
|-------|-----------|
| `front` | Required, string, 1-200 characters, non-empty |
| `back` | Required, string, 1-500 characters, non-empty |
| `generation_type` | Required, string, must be 'manual' or 'ai' (extensible for future types) |
| `generation_id` | Required for AI flashcards, must exist and belong to user; null for manual |
| `interval` | Auto-set: default 0 |
| `repetition` | Auto-set: default 0 |
| `ease_factor` | Auto-set: default 2.5 |
| `due_date` | Auto-set: default now() |

#### Generations

| Field | Validation |
|-------|-----------|
| `text` | Required, string, 1000-10000 characters |
| `generated_count` | Auto-set: count of AI-generated proposals |
| `accepted_count` | Auto-updated when flashcards are saved via batch endpoint |

#### Study/Review

| Field | Validation |
|-------|-----------|
| `quality` | Required, integer, 0-5 |
| `date` | Optional, ISO 8601 date format |

---

### 4.2 Business Logic Implementation

#### AI Generation Flow

1. **POST /api/generations**
   - Validate text length (1000-10000 chars)
   - Call AI service (OpenRouter) with prompt template
   - Parse AI response into structured flashcard proposals
   - Create generation record: `INSERT INTO generations (user_id, generated_count) VALUES (?, ?)`
   - Return generation_id and proposals to frontend
   - Frontend displays proposals for user review/editing

2. **POST /api/flashcards/batch**
   - Validate generation_id belongs to user
   - Validate each flashcard (front/back length)
   - Insert flashcards with `generation_type='ai'` and `generation_id`
   - Update generation record: `UPDATE generations SET accepted_count = ? WHERE id = ?`
   - Return created flashcards

#### Manual Flashcard Creation

1. **POST /api/flashcards**
   - Validate front/back length
   - Insert flashcard with `generation_type='manual'`, `generation_id=NULL`
   - Set SM-2 defaults: interval=0, repetition=0, ease_factor=2.5, due_date=now()
   - Return created flashcard

#### Study Session Flow

1. **GET /api/study/due**
   - Query flashcards: `WHERE user_id = ? AND due_date <= ?`
   - Use indexed query for performance
   - Return list ordered by due_date ascending
   - Frontend displays flashcards one by one

2. **POST /api/flashcards/:id/review**
   - Validate quality (0-5)
   - Apply SM-2 algorithm (see endpoint details)
   - Update flashcard: interval, repetition, ease_factor, due_date
   - Return updated flashcard
   - Frontend proceeds to next flashcard or ends session

#### Metrics Tracking

**Success Metric 1: AI Acceptance Rate**
- Tracked via `generations` table
- Formula: `SUM(accepted_count) / SUM(generated_count)`
- Target: 75% acceptance rate

**Success Metric 2: AI vs Manual Creation**
- Tracked via `flashcards.generation_type` field
- Query: `SELECT generation_type, COUNT(*) FROM flashcards GROUP BY generation_type`
- Target: 75% AI-generated flashcards

---

### 4.3 Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "front",
      "constraint": "Must be between 1 and 200 characters"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - User doesn't have access to resource
- `AI_SERVICE_ERROR` - AI service returned error
- `INTERNAL_ERROR` - Unexpected server error

---

