# GoalIQ Live API Documentation

## Overview

GoalIQ Live is a production-ready football data backend powered by **API-Football v3** as the primary and only data provider. All data returned is real-time football data with no mock data or fallbacks.

**Base URL:** `http://localhost:3001/api/v1`

**Data Provider:** API-Football v3 (https://www.api-football.com/documentation-v3)

---

## Authentication

Currently, the API does not require authentication for public endpoints. Rate limiting is applied to prevent abuse.

---

## Endpoints

### Health Check

#### GET `/health`

Returns the health status of the backend.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-28T01:13:19.294Z",
  "env": "development"
}
```

---

### Matches

#### GET `/api/v1/matches/live`

Returns all currently live matches from API-Football.

**Cache TTL:** 10 seconds (realtime data)

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "1535317",
      "home_team": "Corinthians",
      "away_team": "Platense",
      "home_score": 0,
      "away_score": 1,
      "minute": 45,
      "status": "LIVE",
      "league": "CONMEBOL Libertadores",
      "venue": "Neo Química Arena",
      "kickoff": "2026-05-28T00:30:00+00:00",
      "logo_home": "https://media.api-sports.io/football/teams/131.png",
      "logo_away": "https://media.api-sports.io/football/teams/1064.png",
      "last_event": {
        "external_id": "1535317:Card:33:196750",
        "type": "yellow_card",
        "team_side": "away",
        "player": "J. Gauto",
        "player_id": "196750",
        "assist_player": null,
        "minute": 33,
        "extra_time": 0,
        "extra": {
          "detail": "Yellow Card",
          "comments": "Tripping"
        }
      },
      "updated_at": "2026-05-28T01:13:26.253Z"
    }
  ],
  "count": 22
}
```

---

#### GET `/api/v1/matches`

Returns fixtures with optional filtering.

**Query Parameters:**
- `league_id` (optional): Filter by league ID
- `season` (optional): Filter by season (required with league_id)
- `date` (optional): Filter by date (YYYY-MM-DD format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Cache TTL:** 1 hour for fixtures, 15 seconds for live matches

**Example Requests:**
```
GET /api/v1/matches
GET /api/v1/matches?date=2026-05-28
GET /api/v1/matches?league_id=140&season=2024
GET /api/v1/matches?page=2&limit=50
```

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "1524622",
      "home_team": "River Light",
      "away_team": "RKC",
      "home_score": 0,
      "away_score": 0,
      "minute": 46,
      "status": "LIVE",
      "league": "USL League Two",
      "venue": null,
      "kickoff": "2026-05-28T00:00:00+00:00",
      "logo_home": "https://media.api-sports.io/football/teams/23121.png",
      "logo_away": "https://media.api-sports.io/football/teams/21286.png",
      "updated_at": "2026-05-28T01:13:52.555Z"
    }
  ],
  "count": 119,
  "page": 1,
  "limit": 20
}
```

---

#### GET `/api/v1/matches/:id`

Returns detailed information for a specific match including events.

**Path Parameters:**
- `id`: Match ID (API-Football fixture ID)

**Cache TTL:** 15 seconds for live matches, 1 hour for finished matches

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": "1535317",
    "home_team": "Corinthians",
    "away_team": "Platense",
    "home_score": 0,
    "away_score": 1,
    "minute": 45,
    "status": "LIVE",
    "league": "CONMEBOL Libertadores",
    "venue": "Neo Química Arena",
    "referee": "Alexis Herrera, Venezuela",
    "kickoff": "2026-05-28T00:30:00+00:00",
    "logo_home": "https://media.api-sports.io/football/teams/131.png",
    "logo_away": "https://media.api-sports.io/football/teams/1064.png",
    "league_id": "13",
    "season": "2026",
    "country": "World",
    "events": [
      {
        "external_id": "1535317:Card:13:129905",
        "type": "yellow_card",
        "team_side": "away",
        "player": "A. Lagos",
        "player_id": "129905",
        "assist_player": null,
        "minute": 13,
        "extra_time": 0,
        "extra": {
          "detail": "Yellow Card",
          "comments": "Foul"
        }
      },
      {
        "external_id": "1535317:Goal:21:322307",
        "type": "goal",
        "team_side": "away",
        "player": "F. Zapiola",
        "player_id": "322307",
        "assist_player": null,
        "minute": 21,
        "extra_time": 0,
        "extra": {
          "detail": "Penalty",
          "comments": null
        }
      }
    ],
    "updated_at": "2026-05-28T01:15:11.387Z"
  }
}
```

---

#### GET `/api/v1/matches/:id/events`

Returns timeline events for a specific match.

**Path Parameters:**
- `id`: Match ID

**Cache TTL:** 15 seconds for live matches, 1 hour for finished matches

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "event_id": "1535317:Card:13:129905",
      "type": "card",
      "minute": 13,
      "player": "A. Lagos",
      "assist": null,
      "team_side": "Platense",
      "detail": "Yellow Card"
    },
    {
      "event_id": "1535317:Goal:21:322307",
      "type": "goal",
      "minute": 21,
      "player": "F. Zapiola",
      "assist": null,
      "team_side": "Platense",
      "detail": "Penalty"
    }
  ],
  "count": 3
}
```

---

#### GET `/api/v1/matches/:id/statistics`

Returns match statistics for a specific match.

**Path Parameters:**
- `id`: Match ID

**Cache TTL:** 30 seconds for live matches, 1 hour for finished matches

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "team": {
        "id": 131,
        "name": "Corinthians",
        "logo": "https://media.api-sports.io/football/teams/131.png"
      },
      "statistics": [
        {
          "type": "Shots on Goal",
          "value": 3
        },
        {
          "type": "Ball Possession",
          "value": "52%"
        }
      ]
    }
  ],
  "count": 2
}
```

---

#### GET `/api/v1/matches/:id/lineups`

Returns lineups for a specific match.

**Path Parameters:**
- `id`: Match ID

**Cache TTL:** Until match finished (5 min for live, 24h for finished)

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "team": {
        "id": 131,
        "name": "Corinthians",
        "logo": "https://media.api-sports.io/football/teams/131.png"
      },
      "formation": "4-3-3",
      "startXI": [
        {
          "player": {
            "id": 16284,
            "name": "Cássio",
            "number": 12,
            "pos": "G",
            "grid": "1"
          }
        }
      ],
      "substitutes": [
        {
          "player": {
            "id": 16285,
            "name": "Hugo",
            "number": 1,
            "pos": "G",
            "grid": null
          }
        }
      ]
    }
  ],
  "count": 2
}
```

---

### Leagues

#### GET `/api/v1/leagues`

Returns all available leagues.

**Cache TTL:** 24 hours

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "league": {
        "id": 140,
        "name": "La Liga",
        "type": "League",
        "logo": "https://media.api-sports.io/football/leagues/140.png"
      },
      "country": {
        "name": "Spain",
        "code": "ES",
        "flag": "https://media.api-sports.io/flags/es.svg"
      },
      "seasons": [
        {
          "year": 2024,
          "start": "2024-08-16",
          "end": "2025-05-26",
          "current": true,
          "coverage": {
            "fixtures": {
              "events": true,
              "lineups": true,
              "statistics_fixtures": true,
              "statistics_players": true
            },
            "standings": true,
            "players": true,
            "top_scorers": true,
            "top_assists": true,
            "top_cards": true,
            "injuries": false,
            "predictions": true,
            "odds": true
          }
        }
      ]
    }
  ],
  "count": 1229
}
```

---

#### GET `/api/v1/leagues/:id/standings`

Returns league standings for a specific league and season.

**Path Parameters:**
- `id`: League ID

**Query Parameters:**
- `season` (optional): Season year (default: current year)

**Cache TTL:** 6 hours

**Note:** Free API-Football plan only supports seasons 2022-2024. For 2025+, upgrade to paid plan.

**Example Request:**
```
GET /api/v1/leagues/140/standings?season=2024
```

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "league": {
        "id": 140,
        "name": "La Liga",
        "country": "Spain",
        "season": 2024,
        "logo": "https://media.api-sports.io/football/leagues/140.png"
      },
      "standings": [
        {
          "rank": 1,
          "team": {
            "id": 541,
            "name": "Real Madrid",
            "logo": "https://media.api-sports.io/football/teams/541.png"
          },
          "points": 95,
          "goalsDiff": 65,
          "group": "LaLiga",
          "form": "WWWWW",
          "status": "same",
          "description": "Champions League",
          "all": {
            "played": 38,
            "win": 30,
            "draw": 5,
            "lose": 3,
            "goals": {
              "for": 91,
              "against": 26
            }
          }
        }
      ]
    }
  ],
  "count": 1
}
```

---

### Teams

#### GET `/api/v1/teams/:id`

Returns detailed information for a specific team.

**Path Parameters:**
- `id`: Team ID

**Cache TTL:** 24 hours

**Response:**
```json
{
  "status": "ok",
  "data": {
    "team": {
      "id": 131,
      "name": "Corinthians",
      "code": "COR",
      "country": "Brazil",
      "founded": 1910,
      "national": false,
      "logo": "https://media.api-sports.io/football/teams/131.png"
    },
    "venue": {
      "id": 11531,
      "name": "Neo Química Arena",
      "address": "Avenida Miguel Inácio Curi, 111, Vila Carmosina, Itaquera",
      "city": "São Paulo, São Paulo",
      "capacity": 49205,
      "surface": "grass",
      "image": "https://media.api-sports.io/football/venues/11531.png"
    }
  }
}
```

---

### System

#### GET `/api/v1/system/health`

Returns detailed provider metrics and circuit states.

**Response:**
```json
{
  "status": "success",
  "data": {
    "api_football": {
      "state": "CLOSED",
      "failureCount": 0,
      "consecutiveSuccessCount": 0,
      "score": 100,
      "averageLatencyMs": 0,
      "totalRequests": 4,
      "totalSuccesses": 4,
      "totalFailures": 0,
      "lastSuccess": "2026-05-28T01:13:26.253Z",
      "cooldownRemainingMs": 0
    }
  }
}
```

---

#### GET `/api/v1/system/provider-health`

Returns API-Football provider health and telemetry.

**Response:**
```json
{
  "status": "success",
  "data": {
    "provider": {
      "provider": "api-football",
      "status": "healthy",
      "circuitState": "CLOSED",
      "circuitFailureCount": 0,
      "dailyCallCount": 4,
      "dailyLimit": 500,
      "dailyRemaining": 496,
      "lastResetDate": "Thu May 28 2026",
      "baseUrl": "https://v3.football.api-sports.io"
    },
    "cache": {
      "redisAvailable": true
    },
    "timestamp": "2026-05-28T01:14:27.693Z"
  }
}
```

---

#### GET `/api/v1/system/queue`

Returns ingestion queue and DLQ metrics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "queueSize": 0,
    "dlqSize": 0,
    "processingRate": 0,
    "lastProcessedAt": null
  }
}
```

---

#### GET `/api/v1/system/batches`

Returns recent micro-batches flushed.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "match_id": "1535317",
      "updates": [],
      "state_diff": {
        "home_score": 0,
        "away_score": 1,
        "status": "LIVE",
        "minute": 45
      },
      "timestamp": "2026-05-28T01:13:26.253Z"
    }
  ]
}
```

---

## Match Status Codes

| Code | Description |
|------|-------------|
| `NS` | Not Started |
| `LIVE` | Live (In Play) |
| `1H` | First Half |
| `HT` | Half Time |
| `2H` | Second Half |
| `ET` | Extra Time |
| `P` | Penalty Shootout |
| `FT` | Full Time |
| `AET` | After Extra Time |
| `PEN` | Penalties |
| `BT` | Break Time |
| `SUSP` | Suspended |
| `INT` | Interrupted |
| `PST` | Postponed |
| `CANC` | Cancelled |
| `ABD` | Abandoned |
| `AWD` | Technical Loss |
| `WO` | Walkover |

---

## Event Types

| Type | Description |
|------|-------------|
| `goal` | Goal scored |
| `own_goal` | Own goal |
| `penalty` | Penalty goal |
| `yellow_card` | Yellow card |
| `red_card` | Red card |
| `substitution` | Player substitution |
| `var` | VAR review |

---

## Rate Limiting

- **Window:** 60 seconds
- **Max Requests:** 100 per IP
- **API-Football Quota:** 500 requests/day (configurable)

Exceeding rate limits will return:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `INTERNAL_ERROR` | Internal server error |
| `PROVIDER_API_ERROR` | API-Football API error |
| `PROVIDER_QUOTA_EXCEEDED` | Daily quota exceeded |
| `PROVIDER_INVALID_KEY` | Invalid API key |
| `CIRCUIT_BREAKER_OPEN` | Circuit breaker is open |

---

## Realtime Updates

Live match updates are broadcast via Supabase Realtime WebSocket on channel `gooly-live-matches`.

**Event:** `match-update`

**Payload:**
```json
{
  "match_id": "1535317",
  "home_score": 0,
  "away_score": 1,
  "status": "LIVE",
  "minute": 45,
  "events": [
    {
      "type": "goal",
      "player": "F. Zapiola",
      "minute": 21,
      "team_side": "away"
    }
  ],
  "timestamp": "2026-05-28T01:13:26.253Z"
}
```

---

## Cache Strategy

| Endpoint | TTL | Notes |
|----------|-----|-------|
| Live matches | 10s | Realtime data |
| Match details (live) | 15s | Live matches only |
| Match details (finished) | 1h | Historical data |
| Fixtures | 1h | Scheduled matches |
| Standings | 6h | League tables |
| Teams | 24h | Team information |
| Leagues | 24h | League information |
| Statistics (live) | 30s | Live matches only |
| Statistics (finished) | 1h | Historical data |
| Lineups (live) | 5min | Live matches only |
| Lineups (finished) | 24h | Historical data |

---

## Data Provider

**API-Football v3** is the sole data provider for this backend.

- **Documentation:** https://www.api-football.com/documentation-v3
- **Base URL:** https://v3.football.api-sports.io
- **Free Tier:** 100 requests/day (increased to 500 in our config)
- **Rate Limit:** 10 requests/minute
- **Coverage:** 900+ leagues, 100k+ teams, 500k+ players

---

## Production Deployment

The backend is production-ready and can be deployed on:

- **Railway:** Auto-deploys from Git
- **Docker:** Containerized deployment
- **Any Node.js 20+ host**

### Environment Variables

Required environment variables (see `.env.example`):

```bash
NODE_ENV=production
PORT=3001
API_VERSION=v1

SUPABASE_URL=your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

API_FOOTBALL_KEY=your-api-football-key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

REDIS_URL=redis://localhost:6379  # Optional
```

---

## Support

For issues or questions, refer to:
- API-Football Documentation: https://www.api-football.com/documentation-v3
- Supabase Documentation: https://supabase.com/docs
