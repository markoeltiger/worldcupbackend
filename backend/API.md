# GoalIQ Live Backend API Documentation

## Overview

GoalIQ Live Backend is a Node.js/Express application that provides real-time football data through a REST API. The system uses the RapidAPI "free-api-live-football-data" provider as the primary data source, with intelligent caching, normalization, and real-time updates.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

The API uses **Firebase Authentication** for user authentication. All protected endpoints require a valid Firebase ID token in the Authorization header.

### Authentication Methods

- **Google Sign In**: OAuth-based authentication through Firebase
- **Email/Password**: Traditional email and password authentication
- **Anonymous Guest Users**: Temporary guest accounts for onboarding

### Authorization Header

```http
Authorization: Bearer <firebase_id_token>
```

### Authentication Middleware

- **requireAuth**: Requires valid authentication token
- **optionalAuth**: Optional authentication (allows guest access)

### Error Codes

| Code | Description |
|------|-------------|
| MISSING_TOKEN | Authentication token is required |
| INVALID_TOKEN | Invalid or expired authentication token |
| USER_NOT_FOUND | User not found |
| USERNAME_TAKEN | Username already taken |
| PROFILE_PRIVATE | This profile is private |

## User Management

### Get Current User Profile

```http
GET /api/v1/users/me
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firebase_uid": "firebase-uid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "photo_url": "https://...",
    "country": "US",
    "favorite_country": "BR",
    "favorite_teams": ["team-1", "team-2"],
    "favorite_leagues": ["league-1"],
    "favorite_players": ["player-1"],
    "user_type": "user",
    "language": "en",
    "timezone": "UTC",
    "is_guest": false,
    "is_premium": false,
    "prediction_points": 100,
    "prediction_rank": 42,
    "total_predictions": 10,
    "correct_predictions": 8,
    "followers_count": 5,
    "following_count": 3,
    "public_profile": true,
    "username": "johndoe",
    "bio": "Football enthusiast",
    "profile_completion_score": 85,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

### Update Current User Profile

```http
PATCH /api/v1/users/me
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "display_name": "John Doe",
  "photo_url": "https://...",
  "country": "US",
  "username": "johndoe",
  "bio": "Football enthusiast"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "display_name": "John Doe",
    "photo_url": "https://...",
    "country": "US",
    "username": "johndoe",
    "bio": "Football enthusiast",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

### Get User Preferences

```http
GET /api/v1/users/preferences
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications_enabled": true,
    "match_notifications": true,
    "goal_notifications": true,
    "favorite_team_notifications": true,
    "world_cup_notifications": true,
    "prediction_notifications": true,
    "marketing_notifications": false,
    "push_notifications": true,
    "email_notifications": false,
    "dark_mode": false,
    "language": "en",
    "timezone": "UTC"
  }
}
```

### Update User Preferences

```http
PATCH /api/v1/users/preferences
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "notifications_enabled": true,
  "match_notifications": true,
  "dark_mode": false,
  "language": "en"
}
```

### Get User Favorites

```http
GET /api/v1/users/favorites
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "favorite_country": "BR",
    "favorite_teams": ["team-1", "team-2"],
    "favorite_leagues": ["league-1"],
    "favorite_players": ["player-1"]
  }
}
```

### Update User Favorites

```http
PATCH /api/v1/users/favorites
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_country": "BR",
  "favorite_teams": ["team-1", "team-2"],
  "favorite_leagues": ["league-1"],
  "favorite_players": ["player-1"]
}
```

### Get User Statistics

```http
GET /api/v1/users/statistics
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prediction_points": 100,
    "prediction_rank": 42,
    "total_predictions": 10,
    "correct_predictions": 8,
    "accuracy": 80,
    "followers_count": 5,
    "following_count": 3,
    "profile_completion_score": 85
  }
}
```

### Get Profile Completion Score

```http
GET /api/v1/users/profile-completion
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "max_score": 100,
    "percentage": 85
  }
}
```

### Get Profile Completion Suggestions

```http
GET /api/v1/users/profile-completion/suggestions
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current_score": 85,
    "max_score": 100,
    "suggestions": [
      {
        "field": "bio",
        "points": 10,
        "message": "Write a short bio"
      }
    ]
  }
}
```

### Get World Cup Personalization

```http
GET /api/v1/users/worldcup
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "favorite_country": "BR",
    "favorite_teams": ["team-1", "team-2"],
    "favorite_players": ["player-1"],
    "is_premium": false,
    "language": "en",
    "timezone": "UTC"
  }
}
```

### Update World Cup Personalization

```http
PATCH /api/v1/users/worldcup
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_country": "BR",
  "favorite_teams": ["team-1", "team-2"],
  "favorite_players": ["player-1"],
  "language": "en"
}
```

### Get Notification Preferences

```http
GET /api/v1/users/notifications
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications_enabled": true,
    "match_notifications": true,
    "goal_notifications": true,
    "favorite_team_notifications": true,
    "world_cup_notifications": true,
    "prediction_notifications": true,
    "marketing_notifications": false,
    "push_notifications": true,
    "email_notifications": false
  }
}
```

### Update Notification Preferences

```http
PATCH /api/v1/users/notifications
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "notifications_enabled": true,
  "match_notifications": true,
  "push_notifications": true
}
```

### Get Public User Profile

```http
GET /api/v1/users/:username
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "photo_url": "https://...",
    "country": "US",
    "bio": "Football enthusiast",
    "prediction_points": 100,
    "prediction_rank": 42,
    "total_predictions": 10,
    "correct_predictions": 8,
    "followers_count": 5,
    "following_count": 3,
    "profile_completion_score": 85,
    "favorite_teams": ["team-1"],
    "favorite_leagues": ["league-1"],
    "is_premium": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Follow User

```http
POST /api/v1/users/:userId/follow
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User followed successfully"
}
```

### Unfollow User

```http
DELETE /api/v1/users/:userId/follow
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User unfollowed successfully"
}
```

### Get User Followers

```http
GET /api/v1/users/:userId/followers?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Get User Following

```http
GET /api/v1/users/:userId/following?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Get Leaderboard

```http
GET /api/v1/users/leaderboard?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "user1",
      "display_name": "User One",
      "photo_url": "https://...",
      "prediction_points": 500,
      "prediction_rank": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Search Users

```http
GET /api/v1/users/search?q=john&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Migrate Guest Account

```http
POST /api/v1/users/guest/migrate
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "anonymous_uid": "anonymous-uid",
  "email": "user@example.com",
  "password": "password123",
  "display_name": "John Doe",
  "preserve_data": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {...},
  "firebaseUser": {...}
}
```

### Delete Account

```http
DELETE /api/v1/users/me
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Device Management

### Register Device

```http
POST /api/v1/users/devices
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "platform": "ios",
  "device_model": "iPhone 14",
  "os_version": "16.0",
  "app_version": "1.0.0",
  "fcm_token": "fcm-token-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "device-uuid",
    "user_id": "user-uuid",
    "platform": "ios",
    "device_model": "iPhone 14",
    "is_active": true,
    "created_at": "2024-01-15T00:00:00Z"
  }
}
```

### Get User Devices

```http
GET /api/v1/users/devices
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### Update Device

```http
PATCH /api/v1/users/devices/:deviceId
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "app_version": "1.0.1",
  "fcm_token": "new-fcm-token"
}
```

### Delete Device

```http
DELETE /api/v1/users/devices/:deviceId
Authorization: Bearer <firebase_id_token>
```

### Deactivate Device

```http
POST /api/v1/users/devices/:deviceId/deactivate
Authorization: Bearer <firebase_id_token>
```

### Update FCM Token

```http
PATCH /api/v1/users/devices/:deviceId/fcm-token
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "fcm_token": "new-fcm-token"
}
```

## User Interests

### Get User Interests

```http
GET /api/v1/users/interests
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "favorite_countries": ["BR", "AR"],
    "favorite_teams": ["team-1", "team-2"],
    "favorite_competitions": ["competition-1"],
    "favorite_players": ["player-1"],
    "favorite_clubs": ["club-1"],
    "interests": ["predictions", "live_scores"]
  }
}
```

### Update User Interests

```http
PATCH /api/v1/users/interests
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_countries": ["BR", "AR"],
  "favorite_teams": ["team-1"],
  "interests": ["predictions", "live_scores"]
}
```

## World Cup Fan Profile

### Get Fan Profile

```http
GET /api/v1/users/fan-profile
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "favorite_player": "Lionel Messi",
    "favorite_legend": "Pelé",
    "fan_since": 2010,
    "world_cups_watched": 3,
    "favorite_world_cup_moment": "Messi's goal in 2022"
  }
}
```

### Update Fan Profile

```http
PATCH /api/v1/users/fan-profile
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_player": "Lionel Messi",
  "fan_since": 2010,
  "world_cups_watched": 3
}
```

## Recommendations

### Get Personalized Recommendations

```http
GET /api/v1/users/recommendations?type=all&limit=10
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `type` (optional): Filter by type (all, match, news, content)
- `limit` (optional): Number of recommendations (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "match",
      "id": "upcoming-predictions",
      "name": "Upcoming Predictions",
      "reason": "Based on your interest in predictions",
      "confidence": 0.85,
      "metadata": {...}
    }
  ]
}
```

### Get Match Recommendations

```http
GET /api/v1/users/recommendations/matches?limit=5
Authorization: Bearer <firebase_id_token>
```

### Get News Recommendations

```http
GET /api/v1/users/recommendations/news?limit=5
Authorization: Bearer <firebase_id_token>
```

### Get Content Recommendations

```http
GET /api/v1/users/recommendations/content?limit=5
Authorization: Bearer <firebase_id_token>
```

## Account Status

### Get Account Status

```http
GET /api/v1/users/account-status
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account_status": "active",
    "account_suspended_at": null,
    "account_suspended_reason": null,
    "account_suspended_until": null,
    "account_flagged_at": null,
    "account_flagged_reason": null
  }
}
```

## Social Feed

### Get User Feed

```http
GET /api/v1/users/feed?type=prediction&limit=20
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `type` (optional): Filter by feed type (prediction, match_comment, achievement, milestone)
- `limit` (optional): Number of items (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "feed-uuid",
      "user_id": "user-uuid",
      "feed_type": "prediction",
      "content": "I predict 2-1 for this match",
      "likes_count": 5,
      "comments_count": 2,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### Create Feed Item

```http
POST /api/v1/users/feed
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "feed_type": "prediction",
  "content": "I predict 2-1 for this match",
  "is_public": true
}
```

### Get Feed Item

```http
GET /api/v1/users/feed/:feedId
Authorization: Bearer <firebase_id_token>
```

### Update Feed Item

```http
PATCH /api/v1/users/feed/:feedId
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "content": "Updated content",
  "is_public": false
}
```

### Delete Feed Item

```http
DELETE /api/v1/users/feed/:feedId
Authorization: Bearer <firebase_id_token>
```

### Like Feed Item

```http
POST /api/v1/users/feed/:feedId/like
Authorization: Bearer <firebase_id_token>
```

### Unlike Feed Item

```http
DELETE /api/v1/users/feed/:feedId/like
Authorization: Bearer <firebase_id_token>
```

### Comment on Feed Item

```http
POST /api/v1/users/feed/:feedId/comments
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "comment": "Great prediction!",
  "parent_comment_id": null
}
```

### Get Feed Item Comments

```http
GET /api/v1/users/feed/:feedId/comments?limit=20
Authorization: Bearer <firebase_id_token>
```

### Delete Comment

```http
DELETE /api/v1/users/feed/comments/:commentId
Authorization: Bearer <firebase_id_token>
```

## Onboarding

### Get Onboarding Status

```http
GET /api/v1/onboarding
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "onboarding-uuid",
    "user_id": "user-uuid",
    "favorite_country": "BR",
    "favorite_teams": ["team-1"],
    "interests": ["predictions", "live_scores"],
    "user_mode": "casual",
    "experience_level": "beginner",
    "notification_preferences": {...},
    "completion_rate": 85,
    "is_completed": false,
    "created_at": "2024-01-15T00:00:00Z"
  }
}
```

### Complete Onboarding

```http
POST /api/v1/onboarding/complete
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_country": "BR",
  "favorite_teams": ["team-1"],
  "interests": ["predictions", "live_scores"],
  "user_mode": "casual",
  "experience_level": "beginner",
  "notification_preferences": {
    "match_notifications": true,
    "goal_notifications": true
  }
}
```

### Update Onboarding

```http
PATCH /api/v1/onboarding
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "favorite_teams": ["team-1", "team-2"],
  "interests": ["predictions", "live_scores", "transfers"]
}
```

### Get Onboarding Statistics (Admin)

```http
GET /api/v1/onboarding/statistics
Authorization: Bearer <firebase_id_token>
```

### Reset Onboarding (Testing)

```http
POST /api/v1/onboarding/reset
Authorization: Bearer <firebase_id_token>
```

## Referrals

### Get User Referral Info

```http
GET /api/v1/users/referral
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referral_code": "ABC12345",
    "stats": {
      "total_referrals": 5,
      "completed_referrals": 3,
      "total_points_earned": 300,
      "pending_referrals": 2
    }
  }
}
```

### Create Referral Code

```http
POST /api/v1/users/referral
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "referral-uuid",
    "referral_code": "ABC12345",
    "referrer_id": "user-uuid",
    "status": "pending"
  }
}
```

### Redeem Referral Code

```http
POST /api/v1/users/referral/redeem
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "referral_code": "ABC12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "referral-uuid",
    "status": "completed",
    "reward_points": 100
  }
}
```

### Get Referral History

```http
GET /api/v1/users/referral/history?status=completed
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, cancelled, fraud)

### Get Referral Rewards

```http
GET /api/v1/users/referral/rewards?status=claimed
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, claimed, expired)

## Analytics

### Track Analytics Event

```http
POST /api/v1/analytics/track
Content-Type: application/json

{
  "event_name": "page_view",
  "event_category": "navigation",
  "event_data": {
    "page": "home",
    "referrer": "direct"
  },
  "platform": "ios",
  "app_version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "event_name": "page_view",
    "created_at": "2024-01-15T00:00:00Z"
  }
}
```

### Batch Track Events

```http
POST /api/v1/analytics/batch
Content-Type: application/json

{
  "events": [
    {
      "event_name": "page_view",
      "event_category": "navigation"
    },
    {
      "event_name": "button_click",
      "event_category": "interaction"
    }
  ]
}
```

### Get User Analytics Events

```http
GET /api/v1/analytics/events?event_name=page_view&days=30
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `event_name` (optional): Filter by event name
- `days` (optional): Time range in days (default: 30)

### Get Analytics Stats

```http
GET /api/v1/analytics/stats?days=30
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `days` (optional): Time range in days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_events": 150,
    "unique_events": 10,
    "most_common_event": "page_view",
    "event_count": 50
  }
}
```

### Get Event Counts

```http
GET /api/v1/analytics/counts?days=30
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `days` (optional): Time range in days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "page_view": 50,
    "button_click": 30,
    "scroll": 20
  }
}
```

## Subscriptions

### RevenueCat Webhook

```http
POST /api/v1/subscriptions/webhook
Content-Type: application/json

{
  "event_type": "INITIAL_PURCHASE",
  "customer_id": "customer-id",
  "product_id": "product-id",
  "entitlement_id": "entitlement-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

### Get Subscription Status

```http
GET /api/v1/subscriptions/status
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_premium": true,
    "revenuecat_customer_id": "customer-id"
  }
}
```

### Verify Subscription

```http
POST /api/v1/subscriptions/verify
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_premium": true,
    "revenuecat_customer_id": "customer-id",
    "verified_at": "2024-01-15T00:00:00Z"
  }
}
```

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
