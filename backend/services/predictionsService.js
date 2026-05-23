'use strict';

const logger = require('../utils/logger');
const db = require('../db/supabase');

const SCORING = {
  correct_winner: 5,
  exact_score: 10,
  correct_diff: 3,
};

function evaluatePrediction(pred, match) {
  const ph = pred.predicted_home;
  const pa = pred.predicted_away;
  const ah = match.home_score;
  const aa = match.away_score;

  if (ph === ah && pa === aa) return { result: 'exact_score', points: SCORING.exact_score };
  if ((ph - pa) === (ah - aa)) return { result: 'correct_diff', points: SCORING.correct_diff };
  const predWinner = ph > pa ? 'home' : ph < pa ? 'away' : 'draw';
  const actWinner  = ah > aa ? 'home' : ah < aa ? 'away' : 'draw';
  if (predWinner === actWinner) return { result: 'correct_winner', points: SCORING.correct_winner };
  return { result: 'wrong', points: 0 };
}

async function createPrediction(userId, matchId, predictedHome, predictedAway) {
  // Check match hasn't started by evaluating both short status AND scheduled kickoff time
  const match = await db.query(d =>
    d.from('matches').select('status, start_time').eq('id', matchId).single()
  );
  
  if (match.status !== 'NS') {
    throw new Error('Cannot predict after match has started');
  }
  if (match.start_time && new Date(match.start_time) <= new Date()) {
    throw new Error('Cannot predict after match kickoff time');
  }

  return db.query(d =>
    d.from('predictions').upsert({
      user_id: userId, match_id: matchId,
      predicted_home: predictedHome, predicted_away: predictedAway,
      result: 'pending', points_earned: 0
    }, { onConflict: 'user_id,match_id' }).select().single()
  );
}

async function scorePredictionsForMatch(matchId) {
  const match = await db.query(d =>
    d.from('matches').select('*').eq('id', matchId).single()
  );
  if (match.status !== 'FT') return;

  const preds = await db.query(d =>
    d.from('predictions').select('*').eq('match_id', matchId).eq('result', 'pending')
  );

  let scored = 0;
  for (const pred of preds) {
    const { result, points } = evaluatePrediction(pred, match);
    await db.query(d =>
      d.from('predictions').update({ result, points_earned: points, updated_at: new Date().toISOString() })
        .eq('id', pred.id)
    );
    if (points > 0) {
      await db.query(async (client) => {
        try {
          const { error } = await client.rpc('increment_user_points', { p_user_id: pred.user_id, p_points: points });
          if (error) throw error;
        } catch (rpcErr) {
          logger.warn(`[Predictions] increment_user_points RPC failed: ${rpcErr.message}. Falling back to select-and-update.`);
          const { data: user, error: fetchErr } = await client.from('users').select('total_points').eq('id', pred.user_id).single();
          if (fetchErr) throw fetchErr;
          
          const currentPoints = user?.total_points || 0;
          const { error: updateErr } = await client.from('users')
            .update({ total_points: currentPoints + points })
            .eq('id', pred.user_id);
          if (updateErr) throw updateErr;
        }
      });
    }
    scored++;
  }
  logger.info(`[Predictions] Scored ${scored} predictions for match ${matchId}`);
}

async function getUserPredictions(userId, limit = 20) {
  return db.query(d =>
    d.from('predictions').select('*, matches(home_team, away_team, home_score, away_score, status)')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
  );
}

async function getLeaderboard(limit = 50) {
  return db.query(d =>
    d.from('users').select('id, username, display_name, avatar_url, total_points')
      .order('total_points', { ascending: false }).limit(limit)
  );
}

module.exports = { createPrediction, scorePredictionsForMatch, getUserPredictions, getLeaderboard, evaluatePrediction };
