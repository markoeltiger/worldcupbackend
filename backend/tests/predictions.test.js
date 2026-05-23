'use strict';

// Mock Supabase completely to prevent loading the actual DB client and throwing missing ENV errors
jest.mock('../db/supabase', () => ({
  getClient: jest.fn(),
  query: jest.fn(),
  upsertMatch: jest.fn(),
  upsertEvent: jest.fn(),
  upsertLiveState: jest.fn(),
  upsertLeague: jest.fn(),
  upsertTeam: jest.fn(),
}));

const db = require('../db/supabase');
const { evaluatePrediction, createPrediction } = require('../services/predictionsService');

describe('Predictions Scoring Service', () => {
  const matchResultHomeWin = { home_score: 3, away_score: 1 }; // home win (3-1)
  const matchResultDraw = { home_score: 2, away_score: 2 }; // draw (2-2)

  test('should award 10 points for exact score match', () => {
    const prediction = { predicted_home: 3, predicted_away: 1 };
    const evaluation = evaluatePrediction(prediction, matchResultHomeWin);
    
    expect(evaluation.result).toBe('exact_score');
    expect(evaluation.points).toBe(10);
  });

  test('should award 3 points for correct goal difference', () => {
    const prediction = { predicted_home: 2, predicted_away: 0 }; // diff = +2, winner = home
    const evaluation = evaluatePrediction(prediction, matchResultHomeWin); // diff = +2, winner = home
    
    expect(evaluation.result).toBe('correct_diff');
    expect(evaluation.points).toBe(3);
  });

  test('should award 5 points for correct winner but wrong difference', () => {
    const prediction = { predicted_home: 4, predicted_away: 0 }; // diff = +4, winner = home
    const evaluation = evaluatePrediction(prediction, matchResultHomeWin); // diff = +2, winner = home
    
    expect(evaluation.result).toBe('correct_winner');
    expect(evaluation.points).toBe(5);
  });

  test('should award 10 points for exact draw score match', () => {
    const prediction = { predicted_home: 2, predicted_away: 2 };
    const evaluation = evaluatePrediction(prediction, matchResultDraw);
    
    expect(evaluation.result).toBe('exact_score');
    expect(evaluation.points).toBe(10);
  });

  test('should award 3 points for correct draw prediction with different scoreline', () => {
    const prediction = { predicted_home: 1, predicted_away: 1 };
    const evaluation = evaluatePrediction(prediction, matchResultDraw);
    
    // Draw goal diff is always 0 (1-1 has same diff as 2-2)
    expect(evaluation.result).toBe('correct_diff');
    expect(evaluation.points).toBe(3);
  });

  test('should award 0 points for completely wrong prediction', () => {
    const prediction = { predicted_home: 0, predicted_away: 2 }; // predicted away win
    const evaluation = evaluatePrediction(prediction, matchResultHomeWin); // actual home win
    
    expect(evaluation.result).toBe('wrong');
    expect(evaluation.points).toBe(0);
  });
});

describe('Prediction Submission Kickoff Safety', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('should reject prediction if match status has moved past NS', async () => {
    db.query.mockResolvedValue({ status: 'LIVE', start_time: new Date(Date.now() + 3600000).toISOString() });

    await expect(createPrediction('user-1', 'match-1', 2, 1))
      .rejects.toThrow('Cannot predict after match has started');
  });

  test('should reject prediction if scheduled kickoff time is in the past, even if status is still NS', async () => {
    db.query.mockResolvedValue({ status: 'NS', start_time: new Date(Date.now() - 10000).toISOString() }); // 10s in past

    await expect(createPrediction('user-1', 'match-1', 2, 1))
      .rejects.toThrow('Cannot predict after match kickoff time');
  });

  test('should accept prediction if match status is NS and kickoff is in the future', async () => {
    db.query.mockResolvedValueOnce({ status: 'NS', start_time: new Date(Date.now() + 3600000).toISOString() }); // 1h in future
    db.query.mockResolvedValueOnce({ id: 'pred-123', status: 'pending' });

    const res = await createPrediction('user-1', 'match-1', 2, 1);
    expect(res.id).toBe('pred-123');
  });
});
