# GoalIQ Live REST API Documentation

This document outlines the API endpoints, authentication standards, and data structures of the GoalIQ Live backend system.

* **Base URL**: `http://localhost:3001/api/v1`
* **Default Request Header**: `Content-Type: application/json`

---

## 1. Authentication & Security

Endpoints marked with **[SECURE]** require a valid JSON Web Token (JWT) issued by your Supabase Auth instance.

### Authorization Header Format:
```text
Authorization: Bearer <your_supabase_jwt_token>
```

When a secure request is processed:
1. The backend validates the signature of the token against Supabase services.
2. The user profile is automatically loaded.
3. If this is the user's first time interacting with the system, their profile is automatically registered and seeded inside the `users` table.

---

## 2. Match & Score Endpoints

### 2.1 Get Live Matches
Retrieve all matches that are currently active (`LIVE` or `HT`/Half-Time).

* **URL**: `/matches/live`
* **Method**: `GET`
* **Auth Required**: No
* **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "match-e40da1",
        "external_id": "862910",
        "home_team": "Manchester City",
        "away_team": "Real Madrid",
        "home_score": 1,
        "away_score": 1,
        "status": "LIVE",
        "minute": 54,
        "league": "UEFA Champions League",
        "start_time": "2026-05-20T20:00:00.000Z",
        "venue": "Etihad Stadium",
        "events": [
          {
            "external_id": "ev-101",
            "type": "goal",
            "team_side": "home",
            "player": "Erling Haaland",
            "minute": 23
          },
          {
            "external_id": "ev-102",
            "type": "yellow_card",
            "team_side": "away",
            "player": "Vinicius Junior",
            "minute": 41
          }
        ]
      }
    ],
    "count": 1
  }
  ```

---

### 2.2 Query Match Fixtures (Paginated)
Fetch fixtures filtered by league, date, or status.

* **URL**: `/matches`
* **Method**: `GET`
* **Auth Required**: No
* **Query Parameters**:
  * `league_id` (optional): Filter matches by specific league external ID.
  * `status` (optional): Filter by state (`NS` - Not Started, `LIVE` - In Progress, `FT` - Finished).
  * `date` (optional): Filter by date in `YYYY-MM-DD` format.
  * `page` (optional, default `1`): Pagination offset page.
  * `limit` (optional, default `20`): Pagination size limit.
* **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "match-f30bb2",
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "home_score": 0,
        "away_score": 0,
        "status": "NS",
        "minute": 0,
        "league": "Premier League",
        "start_time": "2026-05-21T15:00:00.000Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
  ```

---

### 2.3 Get Match by ID
Fetch a single match profile containing a comprehensive events timeline.

* **URL**: `/matches/:id`
* **Method**: `GET`
* **Auth Required**: No
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "match-e40da1",
    "home_team": "Manchester City",
    "away_team": "Real Madrid",
    "home_score": 1,
    "away_score": 1,
    "status": "LIVE",
    "minute": 54,
    "league": "UEFA Champions League",
    "events": [
      { "type": "goal", "team_side": "home", "player": "Erling Haaland", "minute": 23 }
    ]
  }
  ```

---

## 3. Predictions & streaks

### 3.1 Submit Prediction **[SECURE]**
Submit a forecasted scoreline for an upcoming match fixture.

* **URL**: `/predictions`
* **Method**: `POST`
* **Auth Required**: Yes (`Bearer <token>`)
* **Request Body**:
  ```json
  {
    "match_id": "match-f30bb2",
    "predicted_home": 2,
    "predicted_away": 1
  }
  ```
* **Points System Rules**:
  * **Correct Winner**: $+5$ points
  * **Exact Score**: $+10$ points
  * **Goal Difference**: $+3$ points
  * **Incorrect Result**: $0$ points
* **Success Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "pred-901842",
      "user_id": "usr-8a2b3c",
      "match_id": "match-f30bb2",
      "predicted_home": 2,
      "predicted_away": 1,
      "points": null,
      "result": "pending"
    }
  }
  ```

---

## 4. Live Match Reactions

### 4.1 Post Emoji Reaction **[SECURE]**
Post a real-time emoji reaction for a match event. Emojis trigger synchronization on client dashboard real-time channels.

* **URL**: `/reactions`
* **Method**: `POST`
* **Auth Required**: Yes (`Bearer <token>`)
* **Request Body**:
  ```json
  {
    "match_id": "match-e40da1",
    "emoji": "🔥" // Permitted emojis: 🔥, 👏, 😮
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Reaction recorded"
  }
  ```

---

## 5. Gamification & Leaderboards

### 5.1 Leaderboard Rankings
Query user point standings.

* **URL**: `/users/leaderboard`
* **Method**: `GET`
* **Auth Required**: No
* **Query Parameters**:
  * `limit` (optional, default `50`): Max users to return.
* **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "usr-1",
        "username": "soccer_guru",
        "display_name": "Soccer Guru",
        "total_points": 120,
        "total_predictions": 15,
        "accuracy_pct": 66.67
      }
    ]
  }
  ```

---

## 6. Real-Time System Telemetry (Observability)

### 6.1 Provider Health Metrics
Query active API circuit status, average latency, and health scores.

* **URL**: `/system/health`
* **Method**: `GET`
* **Auth Required**: No
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "football_data": {
        "state": "CLOSED",
        "failureCount": 0,
        "score": 100,
        "averageLatencyMs": 340,
        "totalRequests": 14,
        "totalSuccesses": 14,
        "totalFailures": 0,
        "lastSuccess": "2026-05-20T07:50:43.000Z",
        "cooldownRemainingMs": 0
      },
      "api_football": {
        "state": "CLOSED",
        "failureCount": 0,
        "score": 100,
        "averageLatencyMs": 0,
        "totalRequests": 0,
        "totalSuccesses": 0,
        "totalFailures": 0,
        "lastSuccess": null,
        "cooldownRemainingMs": 0
      }
    }
  }
  ```

---

### 6.2 Ingestion Queue Status
Check persistence loop task queue length and dead-letter queue (DLQ) state.

* **URL**: `/system/queue`
* **Method**: `GET`
* **Auth Required**: No
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "queueLength": 0,
      "dlqLength": 0,
      "totalProcessed": 482,
      "totalFailed": 0,
      "isProcessing": false,
      "dlqEntries": []
    }
  }
  ```

---

### 6.3 Aggregated Flush Batches
Get recent micro-batches flushed by the Real-Time Batch Aggregator.

* **URL**: `/system/batches`
* **Method**: `GET`
* **Auth Required**: No
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "match_id": "match-e40da1",
        "updates": [
          {
            "type": "SCORE_CHANGE",
            "match_id": "match-e40da1",
            "payload": {
              "previous_home_score": 0,
              "previous_away_score": 1,
              "current_home_score": 1,
              "current_away_score": 1
            },
            "hash": "40b12a8e4df..."
          }
        ],
        "state_diff": {
          "home_score": 1
        },
        "timestamp": "2026-05-20T07:50:45.120Z"
      }
    ]
  }
  ```

---

## 7. Error Handling Schemas

If a request fails, the API returns a corresponding HTTP status code along with a structured JSON error object:

### Unauthorized Error (`401 Unauthorized`)
* **Trigger**: Missing or invalid Authorization Bearer header.
```json
{
  "error": "Missing or invalid authorization token",
  "code": "UNAUTHORIZED"
}
```

### Validation Error (`400 Bad Request`)
* **Trigger**: Invalid body payloads.
```json
{
  "error": "Prediction numbers must be positive integers",
  "code": "VALIDATION_ERROR"
}
```

### Not Found Error (`404 Not Found`)
* **Trigger**: Querying an invalid match ID.
```json
{
  "error": "Match match-999 not found",
  "code": "NOT_FOUND"
}
```
