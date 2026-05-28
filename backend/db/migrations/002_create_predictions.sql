-- Migration: Create predictions table
-- Description: Stores user match predictions for betting

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, evaluated, locked
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_match_user ON predictions(match_id, user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own predictions
CREATE POLICY "Users can manage their own predictions"
  ON predictions
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all predictions
CREATE POLICY "Service role can manage all predictions"
  ON predictions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE predictions IS 'Stores user match predictions for betting';
COMMENT ON COLUMN predictions.match_id IS 'External match ID from API-Football';
COMMENT ON COLUMN predictions.status IS 'Prediction status: pending, evaluated, locked';
COMMENT ON COLUMN predictions.points_earned IS 'Points earned from correct predictions';
