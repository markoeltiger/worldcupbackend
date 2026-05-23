-- ============================================================
-- GoalIQ Live — PostgreSQL Database Schema
-- Run this against your Supabase project's SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE match_status AS ENUM ('NS', 'LIVE', 'HT', 'FT', 'POSTPONED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE event_type   AS ENUM ('goal', 'yellow_card', 'red_card', 'substitution', 'penalty', 'own_goal', 'var');
CREATE TYPE team_side    AS ENUM ('home', 'away');
CREATE TYPE pred_result  AS ENUM ('pending', 'correct_winner', 'exact_score', 'correct_diff', 'wrong');

-- ============================================================
-- LEAGUES
-- ============================================================
CREATE TABLE IF NOT EXISTS leagues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT UNIQUE NOT NULL,          -- from data source
  name          TEXT NOT NULL,
  country       TEXT,
  logo_url      TEXT,
  season        TEXT,                           -- e.g. "2024"
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leagues_external_id ON leagues(external_id);
CREATE INDEX idx_leagues_active      ON leagues(is_active);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  short_name    TEXT,
  logo_url      TEXT,
  country       TEXT,
  league_id     UUID REFERENCES leagues(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_external_id ON teams(external_id);
CREATE INDEX idx_teams_league_id   ON teams(league_id);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id     TEXT UNIQUE NOT NULL,
  home_team_id    UUID REFERENCES teams(id),
  away_team_id    UUID REFERENCES teams(id),
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  home_score      INTEGER DEFAULT 0,
  away_score      INTEGER DEFAULT 0,
  status          match_status DEFAULT 'NS',
  minute          INTEGER DEFAULT 0,
  league_id       UUID REFERENCES leagues(id),
  league          TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  venue           TEXT,
  referee         TEXT,
  source          TEXT DEFAULT 'api',          -- 'api' | 'scraper'
  raw_data        JSONB,                        -- preserve source data
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_external_id ON matches(external_id);
CREATE INDEX idx_matches_status      ON matches(status);
CREATE INDEX idx_matches_league_id   ON matches(league_id);
CREATE INDEX idx_matches_updated_at  ON matches(updated_at DESC);
CREATE INDEX idx_matches_start_time  ON matches(start_time);

-- ============================================================
-- MATCH EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  external_id     TEXT,                        -- deduplication key
  type            event_type NOT NULL,
  team_side       team_side NOT NULL,
  player          TEXT,
  player_id       TEXT,
  assist_player   TEXT,
  minute          INTEGER NOT NULL,
  extra_time      INTEGER DEFAULT 0,
  extra           JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_events_dedup    ON events(match_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_events_match_id        ON events(match_id);
CREATE INDEX idx_events_type            ON events(type);

-- ============================================================
-- LIVE MATCH STATE CACHE (in-db hot cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS live_match_state (
  match_id      UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  state         JSONB NOT NULL,               -- full normalized match object
  event_hash    TEXT,                         -- hash of events for change detection
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STANDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS standings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id     UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season        TEXT NOT NULL,
  rank          INTEGER,
  played        INTEGER DEFAULT 0,
  won           INTEGER DEFAULT 0,
  drawn         INTEGER DEFAULT 0,
  lost          INTEGER DEFAULT 0,
  goals_for     INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_diff     INTEGER DEFAULT 0,
  points        INTEGER DEFAULT 0,
  form          TEXT,                         -- e.g. "WDLWW"
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, season)
);

CREATE INDEX idx_standings_league_id ON standings(league_id);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         TEXT UNIQUE,                -- Supabase Auth UID
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  fcm_token       TEXT,                       -- Firebase push token
  favorite_teams  TEXT[] DEFAULT '{}',
  favorite_leagues TEXT[] DEFAULT '{}',
  total_points    INTEGER DEFAULT 0,
  prediction_streak INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id    ON users(auth_id);
CREATE INDEX idx_users_total_pts  ON users(total_points DESC);

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_home  INTEGER NOT NULL,
  predicted_away  INTEGER NOT NULL,
  result          pred_result DEFAULT 'pending',
  points_earned   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

CREATE INDEX idx_predictions_user_id  ON predictions(user_id);
CREATE INDEX idx_predictions_match_id ON predictions(match_id);
CREATE INDEX idx_predictions_result   ON predictions(result);

-- ============================================================
-- REACTIONS (lightweight social)
-- ============================================================
CREATE TABLE IF NOT EXISTS reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,               -- e.g. "🔥", "😱", "👏"
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id, emoji)
);

CREATE INDEX idx_reactions_match_id ON reactions(match_id);

-- ============================================================
-- AI INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,              -- 'pre_match' | 'live' | 'post_match'
  content     TEXT NOT NULL,
  model       TEXT,
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_match_id ON ai_insights(match_id);
CREATE INDEX idx_insights_type     ON ai_insights(type);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,              -- 'goal' | 'match_start' | 'red_card' | 'ft' | 'prediction_result'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  delivered   BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);

-- ============================================================
-- USER STATS (materialized per-user aggregate)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_predictions     INTEGER DEFAULT 0,
  correct_winners       INTEGER DEFAULT 0,
  exact_scores          INTEGER DEFAULT 0,
  correct_diffs         INTEGER DEFAULT 0,
  total_points          INTEGER DEFAULT 0,
  accuracy_pct          NUMERIC(5,2) DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INGESTION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider            TEXT NOT NULL,
  status              TEXT NOT NULL,               -- 'success' | 'failure'
  duration_ms         INTEGER NOT NULL,
  matches_processed   INTEGER DEFAULT 0,
  matches_updated     INTEGER DEFAULT 0,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingestion_logs_provider ON ingestion_logs(provider);
CREATE INDEX idx_ingestion_logs_status   ON ingestion_logs(status);
CREATE INDEX idx_ingestion_logs_created  ON ingestion_logs(created_at DESC);

-- ============================================================
-- PROVIDER HEALTH
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_health (
  provider            TEXT PRIMARY KEY,            -- e.g. 'football_data', 'api_football', 'sportsdb', 'scraper'
  state               TEXT NOT NULL DEFAULT 'CLOSED', -- 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failure_count       INTEGER DEFAULT 0,
  average_latency_ms  INTEGER DEFAULT 0,
  total_requests      INTEGER DEFAULT 0,
  total_successes     INTEGER DEFAULT 0,
  total_failures      INTEGER DEFAULT 0,
  last_success        TIMESTAMPTZ,
  cooldown_until      TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION QUEUE (asynchronous outbox)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means broadcast topic
  match_id            UUID REFERENCES matches(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,              -- 'goal' | 'match_start' | 'red_card' | 'ft' | 'prediction_result'
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  attempts            INTEGER DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_created ON notification_queue(created_at);

-- ============================================================
-- SUPABASE REALTIME — enable for live-score tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE live_match_state;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- ============================================================
-- ROW-LEVEL SECURITY (basic — expand for production)
-- ============================================================
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY "users_own" ON users
  FOR ALL USING (auth.uid()::text = auth_id);

-- Users can manage their own predictions
CREATE POLICY "predictions_own" ON predictions
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()::text));

-- Reactions: public read, own write
CREATE POLICY "reactions_read" ON reactions FOR SELECT USING (TRUE);
CREATE POLICY "reactions_write" ON reactions
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()::text));

-- Notifications: own read only
CREATE POLICY "notifications_own" ON notifications
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()::text));

-- Public read for match/league/team/standings data
ALTER TABLE matches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_public_read"   ON matches   FOR SELECT USING (TRUE);
CREATE POLICY "leagues_public_read"   ON leagues   FOR SELECT USING (TRUE);
CREATE POLICY "teams_public_read"     ON teams     FOR SELECT USING (TRUE);
CREATE POLICY "standings_public_read" ON standings FOR SELECT USING (TRUE);
CREATE POLICY "events_public_read"    ON events    FOR SELECT USING (TRUE);

-- Service role bypasses RLS (used by backend)
-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_matches_updated   BEFORE UPDATE ON matches   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_teams_updated     BEFORE UPDATE ON teams     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_leagues_updated   BEFORE UPDATE ON leagues   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_predictions_updated BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_provider_health_updated BEFORE UPDATE ON provider_health FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RLS for backend tables
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
