'use strict';

const OpenAI = require('openai');
const logger = require('../utils/logger');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function preMatchPrompt(m) {
  return `Football analyst. Write 2-3 sentence pre-match insight for ${m.home_team} vs ${m.away_team} (${m.league}). Cover form, key players, tactical battle. Output insight only.`;
}

function livePrompt(m, events) {
  const evStr = events.map(e => `${e.minute}' ${e.type} ${e.player||''} (${e.team_side})`).join('; ');
  return `Live football analyst. ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}, min ${m.minute}. Events: ${evStr || 'None'}. Write 2-3 sentence momentum analysis with probability shift. Output only.`;
}

function postPrompt(m, events) {
  const goals = events.filter(e => e.type === 'goal').map(g => `${g.minute}' ${g.player}`).join(', ');
  return `Post-match summary. ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}. Goals: ${goals || 'None'}. Write 3-4 sentence analysis covering turning points and standout performers. Output only.`;
}

async function generate(type, prompt, matchId) {
  const client = getClient();
  if (!client) { logger.warn('[AI] No API key — skipping'); return null; }

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });
    const content = res.choices[0]?.message?.content?.trim();
    const tokens = res.usage?.total_tokens;

    if (content) {
      const db = require('../db/supabase');
      await db.query(d => d.from('ai_insights').insert({
        match_id: matchId, type, content, model: MODEL, tokens_used: tokens
      }));
      logger.info(`[AI] ${type} insight for ${matchId} (${tokens} tokens)`);
    }
    return content;
  } catch (err) {
    logger.error(`[AI] ${type} failed: ${err.message}`);
    return null;
  }
}

async function generatePreMatchInsight(match) {
  return generate('pre_match', preMatchPrompt(match), match.id);
}

async function generateLiveInsight(match, events) {
  return generate('live', livePrompt(match, events), match.id);
}

async function generatePostMatchSummary(match, events) {
  return generate('post_match', postPrompt(match, events), match.id);
}

async function getInsightsForMatch(matchId, type) {
  const db = require('../db/supabase');
  let q = db.getClient().from('ai_insights').select('*')
    .eq('match_id', matchId).order('created_at', { ascending: false }).limit(5);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { generatePreMatchInsight, generateLiveInsight, generatePostMatchSummary, getInsightsForMatch };
