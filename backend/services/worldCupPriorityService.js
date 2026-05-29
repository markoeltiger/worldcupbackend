'use strict';

/**
 * World Cup Priority Service
 * =========================
 * Dedicated World Cup optimization layer.
 * Prioritizes FIFA World Cup fixtures with faster refresh intervals.
 */

const logger = require('../utils/logger');
const rapidApiProvider = require('../ingestion/providers/rapidApiFootballProvider');
const normalizer = require('../normalizers/rapidApiNormalizer');
const cacheManager = require('../cache/footballCacheManager');
const persistenceService = require('./persistenceService');

// World Cup configuration
const WORLD_CUP_CONFIG = {
  leagueId: null, // Will be set when detected
  leagueName: 'World Cup',
  pollingInterval: 5000, // 5 seconds for World Cup matches
  cacheNamespace: 'worldcup',
};

class WorldCupPriorityService {
  constructor() {
    this.isRunning = false;
    this.pollingInterval = null;
    this.worldCupLeagueId = null;
    this.matchCache = new Map();
  }

  /**
   * Initialize the World Cup priority service
   */
  async initialize() {
    logger.info('[WorldCup] Initializing World Cup priority service...');

    // Detect World Cup league ID
    await this.detectWorldCupLeague();

    // Start dedicated polling
    this.startWorldCupPolling();

    // Warm up cache
    await this.warmUpCache();

    this.isRunning = true;
    logger.info('[WorldCup] World Cup priority service initialized');
  }

  /**
   * Detect World Cup league ID from available leagues
   */
  async detectWorldCupLeague() {
    try {
      // This would typically come from a leagues endpoint
      // For now, we'll use a known World Cup league ID if available
      // FIFA World Cup 2022 league ID is typically 1 in many APIs
      this.worldCupLeagueId = process.env.WORLD_CUP_LEAGUE_ID || '1';
      
      logger.info(`[WorldCup] Detected World Cup league ID: ${this.worldCupLeagueId}`);
    } catch (error) {
      logger.error(`[WorldCup] Error detecting World Cup league: ${error.message}`);
    }
  }

  /**
   * Start World Cup polling
   */
  startWorldCupPolling() {
    if (!this.worldCupLeagueId) {
      logger.warn('[WorldCup] No World Cup league ID detected, skipping polling');
      return;
    }

    this.pollingInterval = setInterval(async () => {
      await this.pollWorldCupMatches();
    }, WORLD_CUP_CONFIG.pollingInterval);

    logger.info(`[WorldCup] Started World Cup polling (${WORLD_CUP_CONFIG.pollingInterval}ms interval)`);
  }

  /**
   * Poll World Cup matches
   */
  async pollWorldCupMatches() {
    try {
      logger.debug('[WorldCup] Polling World Cup matches...');

      const rawMatches = await rapidApiProvider.getFixtures(this.worldCupLeagueId);
      if (!rawMatches || rawMatches.length === 0) {
        logger.debug('[WorldCup] No World Cup matches found');
        return;
      }

      const normalizedMatches = normalizer.normalizeMatches(rawMatches);
      const validMatches = normalizedMatches.filter(m => normalizer.validateMatch(m));

      // Filter for live matches
      const liveMatches = validMatches.filter(m => m.status === 'LIVE' || m.status === 'HT');
      const upcomingMatches = validMatches.filter(m => m.status === 'NS');
      const finishedMatches = validMatches.filter(m => m.status === 'FT');

      logger.info(`[WorldCup] Found ${liveMatches.length} live, ${upcomingMatches.length} upcoming, ${finishedMatches.length} finished matches`);

      // Cache World Cup data
      await cacheManager.set('worldcup_live', 'all', liveMatches);
      await cacheManager.set('worldcup_fixtures', 'all', upcomingMatches);
      await cacheManager.set('worldcup_finished', 'all', finishedMatches);

      // Persist live matches
      for (const match of liveMatches) {
        await persistenceService.upsertMatch(match);
      }

      // Update cache
      for (const match of validMatches) {
        this.matchCache.set(match.external_id, match);
      }

    } catch (error) {
      logger.error(`[WorldCup] Error polling World Cup matches: ${error.message}`);
    }
  }

  /**
   * Warm up World Cup cache
   */
  async warmUpCache() {
    try {
      logger.info('[WorldCup] Warming up World Cup cache...');

      // Fetch standings
      if (this.worldCupLeagueId) {
        const rawStandings = await rapidApiProvider.getStandings(this.worldCupLeagueId);
        if (rawStandings) {
          const normalizedStandings = normalizer.normalizeStandings(rawStandings);
          await cacheManager.set('worldcup_standings', 'all', normalizedStandings);
          await persistenceService.upsertStandings(this.worldCupLeagueId, normalizedStandings);
        }
      }

      // Fetch teams
      const rawTeams = await rapidApiProvider.getTeams(this.worldCupLeagueId);
      if (rawTeams) {
        const normalizedTeams = rawTeams.map(t => normalizer.normalizeTeam(t)).filter(Boolean);
        await cacheManager.set('worldcup_teams', 'all', normalizedTeams);
      }

      logger.info('[WorldCup] World Cup cache warm-up complete');
    } catch (error) {
      logger.error(`[WorldCup] Error warming up cache: ${error.message}`);
    }
  }

  /**
   * Get World Cup live matches
   */
  async getLiveMatches() {
    try {
      const cached = await cacheManager.get('worldcup_live', 'all');
      if (cached) {
        return cached;
      }

      // Fallback to fetch
      const rawMatches = await rapidApiProvider.getLiveMatches();
      const worldCupMatches = rawMatches.filter(m => 
        m.league && m.league.name && m.league.name.toLowerCase().includes('world cup')
      );
      
      const normalized = normalizer.normalizeMatches(worldCupMatches);
      await cacheManager.set('worldcup_live', 'all', normalized);
      
      return normalized;
    } catch (error) {
      logger.error(`[WorldCup] Error getting live matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Get World Cup fixtures
   */
  async getFixtures() {
    try {
      const cached = await cacheManager.get('worldcup_fixtures', 'all');
      if (cached) {
        return cached;
      }

      const rawFixtures = await rapidApiProvider.getFixtures(this.worldCupLeagueId);
      const normalized = normalizer.normalizeMatches(rawFixtures);
      await cacheManager.set('worldcup_fixtures', 'all', normalized);
      
      return normalized;
    } catch (error) {
      logger.error(`[WorldCup] Error getting fixtures: ${error.message}`);
      return [];
    }
  }

  /**
   * Get World Cup standings
   */
  async getStandings() {
    try {
      const cached = await cacheManager.get('worldcup_standings', 'all');
      if (cached) {
        return cached;
      }

      const rawStandings = await rapidApiProvider.getStandings(this.worldCupLeagueId);
      const normalized = normalizer.normalizeStandings(rawStandings);
      await cacheManager.set('worldcup_standings', 'all', normalized);
      
      return normalized;
    } catch (error) {
      logger.error(`[WorldCup] Error getting standings: ${error.message}`);
      return [];
    }
  }

  /**
   * Get World Cup teams
   */
  async getTeams() {
    try {
      const cached = await cacheManager.get('worldcup_teams', 'all');
      if (cached) {
        return cached;
      }

      const rawTeams = await rapidApiProvider.getTeams(this.worldCupLeagueId);
      const normalized = rawTeams.map(t => normalizer.normalizeTeam(t)).filter(Boolean);
      await cacheManager.set('worldcup_teams', 'all', normalized);
      
      return normalized;
    } catch (error) {
      logger.error(`[WorldCup] Error getting teams: ${error.message}`);
      return [];
    }
  }

  /**
   * Get World Cup groups
   */
  async getGroups() {
    try {
      const standings = await this.getStandings();
      
      // Group standings by group (if available)
      const groups = {};
      standings.forEach(row => {
        const group = row.group || 'Unknown';
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(row);
      });

      return groups;
    } catch (error) {
      logger.error(`[WorldCup] Error getting groups: ${error.message}`);
      return {};
    }
  }

  /**
   * Get World Cup bracket
   */
  async getBracket() {
    try {
      // This would typically come from a dedicated bracket endpoint
      // For now, return empty structure
      return {
        round_of_16: [],
        quarter_finals: [],
        semi_finals: [],
        final: null,
      };
    } catch (error) {
      logger.error(`[WorldCup] Error getting bracket: ${error.message}`);
      return null;
    }
  }

  /**
   * Stop the World Cup priority service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    logger.info('[WorldCup] World Cup priority service stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      leagueId: this.worldCupLeagueId,
      pollingInterval: WORLD_CUP_CONFIG.pollingInterval,
      cachedMatches: this.matchCache.size,
    };
  }
}

module.exports = new WorldCupPriorityService();
