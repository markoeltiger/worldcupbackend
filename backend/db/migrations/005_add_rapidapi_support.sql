-- ============================================================
-- RapidAPI Football Data Provider Support
-- ============================================================
-- This migration adds support for the RapidAPI football data provider
-- by adding missing columns and tables to the existing schema.

-- Add missing columns to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS founded INTEGER,
ADD COLUMN IF NOT EXISTS stadium TEXT,
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add missing columns to leagues table
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add missing columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS assist TEXT,
ADD COLUMN IF NOT EXISTS elapsed INTEGER,
ADD COLUMN IF NOT EXISTS detail TEXT,
ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS substitutions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS var BOOLEAN DEFAULT FALSE;

-- Update live_match_state table structure
ALTER TABLE live_match_state
DROP COLUMN IF EXISTS state,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS minute INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS elapsed INTEGER,
ADD COLUMN IF NOT EXISTS home_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS away_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS possession JSONB,
ADD COLUMN IF NOT EXISTS shots JSONB;

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT UNIQUE,
  name          TEXT NOT NULL,
  team          TEXT,
  position      TEXT,
  number        INTEGER,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_external_id ON players(external_id);
CREATE INDEX idx_players_name ON players(name);

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT UNIQUE,
  name          TEXT NOT NULL,
  city          TEXT,
  capacity      INTEGER,
  surface       TEXT,
  image         TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_external_id ON venues(external_id);
CREATE INDEX idx_venues_name ON venues(name);

-- Add source column to matches if not exists
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'api';

-- Add elapsed column to matches if not exists
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS elapsed INTEGER;

-- Enable RLS for new tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Public read policies for new tables
CREATE POLICY "players_public_read" ON players FOR SELECT USING (TRUE);
CREATE POLICY "venues_public_read" ON venues FOR SELECT USING (TRUE);

-- Add updated_at trigger for new tables
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_venues_updated BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
