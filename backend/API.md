# GoalIQ Live Backend API Documentation

## Overview

GoalIQ Live Backend is a Node.js/Express application that provides real-time football data through a REST API. The system uses the RapidAPI "free-api-live-football-data" provider as the primary data source, with intelligent caching, normalization, and real-time updates.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

Currently, the API does not require authentication for public endpoints. Admin endpoints may require API keys in the future.

## Data Provider

The backend uses **RapidAPI - Free API Live Football Data** as the primary data provider.

### Provider Configuration

- **Host**: `free-api-live-football-data.p.rapidapi.com`
- **Base URL**: `https://free-api-live-football-data.p.rapidapi.com`
- **API Key**: Configured via `RAPIDAPI_KEY` environment variable

### Available Endpoints

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `/football-get-all-countries` | Get all countries | None |
| `/football-get-all-leagues` | Get all leagues | None |
| `/football-current-live` | Get live matches | `leagueid` (optional) |
| `/football-get-all-matches-by-league` | Get matches by league | `leagueid`, `teamid`, `date` (optional) |
| `/football-get-list-all-team` | Get standings/teams | `leagueid` (optional) |
| `/football-get-hometeam-lineup` | Get home team lineup | `eventid` |
| `/football-get-awayteam-lineup` | Get away team lineup | `eventid` |
| `/football-get-match-all-stats` | Get match statistics | `eventid` |
| `/football-get-match-detail` | Get match details | `eventid` |
| `/football-get-player-detail` | Get player details | `playerid`, `leagueid` (optional) |
| `/football-get-top-players-by-goals` | Get top scorers | `leagueid`, `season` (optional) |
| `/football-get-head-to-head` | Get H2H data | `eventid` |

## API Endpoints

### Matches

#### Get All Matches
```http
GET /api/v1/matches
```

**Query Parameters:**
- `league` (optional): Filter by league ID
- `team` (optional): Filter by team ID
- `date` (optional): Filter by date (YYYY-MM-DD)
- `status` (optional): Filter by status (LIVE, FT, NS)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "match-123",
      "external_id": "5467671",
      "home_team": {
        "id": "team-1",
        "name": "Team A",
        "logo": "https://..."
      },
      "away_team": {
        "id": "team-2",
        "name": "Team B",
        "logo": "https://..."
      },
      "status": "LIVE",
      "home_score": 1,
      "away_score": 1,
      "minute": 45,
      "kickoff_time": "2024-01-15T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### Get Live Matches
```http
GET /api/v1/matches/live
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "match-123",
      "status": "LIVE",
      "home_score": 1,
      "away_score": 1,
      "minute": 45
    }
  ]
}
```

#### Get Match Details
```http
GET /api/v1/matches/:matchId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "match-123",
    "home_team": {...},
    "away_team": {...},
    "status": "LIVE",
    "home_score": 1,
    "away_score": 1,
    "events": [...],
    "statistics": {...}
  }
}
```

#### Get Match Events
```http
GET /api/v1/matches/:matchId/events
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "GOAL",
      "minute": 23,
      "player": "Player Name",
      "team": "home"
    }
  ]
}
```

#### Get Match Statistics
```http
GET /api/v1/matches/:matchId/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "possession": {
      "home": 55,
      "away": 45
    },
    "shots": {
      "home": 12,
      "away": 8
    }
  }
}
```

#### Get Match Lineups
```http
GET /api/v1/matches/:matchId/lineups
```

**Response:**
```json
{
  "success": true,
  "data": {
    "home": [...],
    "away": [...]
  }
}
```

#### SSE Live Updates
```http
GET /api/v1/matches/:matchId/live
```

Returns Server-Sent Events for real-time match updates.

### Leagues

#### Get All Leagues
```http
GET /api/v1/leagues
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "league-1",
      "name": "Premier League",
      "country": "England",
      "logo": "https://..."
    }
  ]
}
```

#### Get League Details
```http
GET /api/v1/leagues/:leagueId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "league-1",
    "name": "Premier League",
    "country": "England",
    "season": "2024/2025"
  }
}
```

#### Get League Standings
```http
GET /api/v1/leagues/:leagueId/standings
```

**Query Parameters:**
- `season` (optional): Season (e.g., "2024/2025")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "team": {
        "id": "team-1",
        "name": "Team A"
      },
      "played": 34,
      "won": 28,
      "drawn": 5,
      "lost": 1,
      "goals_for": 122,
      "goals_against": 36,
      "points": 89
    }
  ]
}
```

#### Get League Fixtures
```http
GET /api/v1/leagues/:leagueId/fixtures
```

**Query Parameters:**
- `season` (optional): Season
- `round` (optional): Round number

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Get League Top Scorers
```http
GET /api/v1/leagues/:leagueId/top-scorers
```

**Query Parameters:**
- `season` (optional): Season

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "player": {
        "id": "player-1",
        "name": "Player Name"
      },
      "team": {
        "id": "team-1",
        "name": "Team A"
      },
      "goals": 28,
      "assists": 10
    }
  ]
}
```

### Teams

#### Get All Teams
```http
GET /api/v1/teams
```

**Query Parameters:**
- `league` (optional): Filter by league ID
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-1",
      "name": "Team A",
      "logo": "https://...",
      "country": "England"
    }
  ],
  "pagination": {...}
}
```

#### Get Team Details
```http
GET /api/v1/teams/:teamId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "team-1",
    "name": "Team A",
    "logo": "https://...",
    "country": "England",
    "founded": 1886
  }
}
```

#### Get Team Fixtures
```http
GET /api/v1/teams/:teamId/fixtures
```

**Query Parameters:**
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### World Cup

#### Get World Cup Live Matches
```http
GET /api/v1/worldcup/live
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Get World Cup Fixtures
```http
GET /api/v1/worldcup/fixtures
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Get World Cup Standings
```http
GET /api/v1/worldcup/standings
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Get World Cup Groups
```http
GET /api/v1/worldcup/groups
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Group A": [...],
    "Group B": [...]
  }
}
```

#### Get World Cup Teams
```http
GET /api/v1/worldcup/teams
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Get World Cup Bracket
```http
GET /api/v1/worldcup/bracket
```

**Response:**
```json
{
  "success": true,
  "data": {
    "round_of_16": [...],
    "quarter_finals": [...],
    "semi_finals": [...],
    "final": {...}
  }
}
```

### System

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T15:00:00Z",
  "services": {
    "cache": "healthy",
    "database": "healthy",
    "provider": "healthy"
  }
}
```

#### System Metrics
```http
GET /api/v1/system/metrics
```

**Response:**
```json
{
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 512
  },
  "api_calls": {
    "total": 1000,
    "rapidapi": 800,
    "cache_hits": 600
  }
}
```

#### Provider Status
```http
GET /api/v1/system/providers
```

**Response:**
```json
{
  "rapidapi": {
    "status": "healthy",
    "daily_calls": 800,
    "daily_limit": 1000
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request parameters |
| `PROVIDER_ERROR` | Data provider error |
| `CACHE_ERROR` | Cache operation error |
| `DATABASE_ERROR` | Database operation error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Rate Limiting

- **Public endpoints**: 100 requests per minute per IP
- **SSE connections**: Unlimited (within server capacity)

## Caching

The system implements intelligent caching with the following TTLs:

- **Live matches**: 15 seconds
- **Fixtures**: 2 minutes
- **Standings**: 5 minutes
- **Teams**: 1 hour
- **Static data**: 24 hours

## Real-time Updates

Live match updates are provided through Server-Sent Events (SSE). Connect to:

```
GET /api/v1/matches/:matchId/live
```

Events include:
- Score changes
- Goals
- Cards
- Substitutions
- Match status changes

## Mobile Optimization

The API provides optimized responses for mobile clients through DTOs (Data Transfer Objects) with:
- Minimal payload size
- Stable JSON contracts
- Field selection support

## Environment Variables

Required environment variables:

```env
# RapidAPI Configuration
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=free-api-live-football-data.p.rapidapi.com
RAPIDAPI_BASE_URL=https://free-api-live-football-data.p.rapidapi.com

# Database
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Cache
REDIS_URL=your_redis_url (optional, falls back to in-memory cache)

# World Cup
WORLD_CUP_LEAGUE_ID=1

# Server
PORT=3001
NODE_ENV=development
```

## Development

### Start the server

```bash
npm install
npm start
```

### Run in development mode

```bash
npm run dev
```

### Run tests

```bash
npm test
```

## Architecture

The backend follows a modular architecture:

- **Providers**: Data ingestion layer (RapidAPI)
- **Cache**: Smart caching with Redis fallback
- **Normalizers**: Data normalization to unified schema
- **Persistence**: Database operations with Supabase
- **Services**: Business logic (real-time, World Cup priority, cost optimization)
- **API Routes**: REST API endpoints
- **DTOs**: Mobile-optimized data transfer objects

## Support

For issues or questions, please refer to the project repository or contact the development team.
