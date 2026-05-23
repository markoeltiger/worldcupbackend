-- ============================================================
-- GoalIQ Live — Migration 01_init
-- Adds schema and custom database functions/triggers
-- ============================================================

-- Enable UUID and PGCrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable RLS by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- 1. Create increment_user_points RPC function for atomic score increments
CREATE OR REPLACE FUNCTION increment_user_points(p_user_id UUID, p_points INT)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET total_points = COALESCE(total_points, 0) + p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Touch updated_at function (shared by triggers)
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Associate touch_updated_at triggers
DROP TRIGGER IF EXISTS trg_matches_updated ON matches;
CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_leagues_updated ON leagues;
CREATE TRIGGER trg_leagues_updated
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_predictions_updated ON predictions;
CREATE TRIGGER trg_predictions_updated
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_provider_health_updated ON provider_health;
CREATE TRIGGER trg_provider_health_updated
  BEFORE UPDATE ON provider_health
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();
