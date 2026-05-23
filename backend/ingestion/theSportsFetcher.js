'use strict';

const axios = require('axios');
const cache = require('../utils/cache');
const retry = require('../utils/retry');
const logger = require('../utils/logger');

const API_BASE_URL = 'https://api.thesports.com/v1/football';
const THESPORTS_USER = process.env.THESPORTS_USER || '';
const THESPORTS_SECRET = process.env.THESPORTS_SECRET || '';

// Fallback Mock Data matching thesports.com schema
const MOCK_THESPORTS_RESPONSE = [
  {
    id: 9988771,
    competition_id: 1606,
    home_team_id: 1045,
    away_team_id: 1046,
    status_id: 2, // Live (First Half)
    match_time: Math.floor(Date.now() / 1000) - 1500,
    home_scores: [2, 0, 0, 0, 0, 0, 0],
    away_scores: [1, 0, 0, 0, 0, 0, 0],
    home_team: {
      name: "Manchester City",
      logo: "https://img.thesports.com/football/team/mancity.png"
    },
    away_team: {
      name: "Real Madrid",
      logo: "https://img.thesports.com/football/team/realmadrid.png"
    },
    competition: {
      name: "UEFA Champions League",
      logo: "https://img.thesports.com/football/league/ucl.png"
    },
    events: [
      {
        time: 14,
        type: 1, // Goal
        team: 1, // Home
        player_name: "Erling Haaland"
      },
      {
        time: 21,
        type: 1, // Goal
        team: 2, // Away
        player_name: "Vinicius Junior"
      },
      {
        time: 38,
        type: 3, // Yellow Card
        team: 1, // Home
        player_name: "Rodri"
      }
    ]
  },
  {
    id: 9988772,
    competition_id: 1200,
    home_team_id: 2011,
    away_team_id: 2012,
    status_id: 1, // Not Started
    match_time: Math.floor(Date.now() / 1000) + 3600,
    home_scores: [0, 0, 0, 0, 0, 0, 0],
    away_scores: [0, 0, 0, 0, 0, 0, 0],
    home_team: {
      name: "Arsenal",
      logo: "https://img.thesports.com/football/team/arsenal.png"
    },
    away_team: {
      name: "Chelsea",
      logo: "https://img.thesports.com/football/team/chelsea.png"
    },
    competition: {
      name: "Premier League",
      logo: "https://img.thesports.com/football/league/epl.png"
    },
    events: []
  }
];

/**
 * Fetch matches/fixtures from TheSports API with caching layer.
 * Falls back to local sandbox mock data if credentials are not configured.
 */
async function fetchMatches() {
  const cacheKey = 'thesports:matches';
  
  return cache.getOrSet(cacheKey, async () => {
    const isMock = !THESPORTS_USER || !THESPORTS_SECRET || 
                   THESPORTS_USER.includes('your-') || 
                   THESPORTS_SECRET.includes('your-');
                   
    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('[TheSports API] No credentials configured. Returning empty match list.');
        return [];
      }
      logger.info('[TheSports API] No valid credentials found. Returning sandbox simulation matches.');
      return MOCK_THESPORTS_RESPONSE;
    }

    logger.info('[TheSports API] Cache miss. Fetching live matches from API endpoint.');
    
    try {
      const res = await retry.withRetry(() => axios.get(`${API_BASE_URL}/match/live`, {
        params: {
          user: THESPORTS_USER,
          secret: THESPORTS_SECRET
        },
        timeout: 5000
      }), { label: 'thesports live matches' });
      
      const data = res.data?.results || res.data?.data;
      if (!data) {
        throw new Error('Malformed response from TheSports API (no results/data fields found)');
      }
      return data;
    } catch (err) {
      logger.error(`[TheSports API] Live request failed: ${err.message}`);
      throw err;
    }
  }, 10); // 10 seconds TTL for fast live score refresh
}

module.exports = {
  fetchMatches
};
