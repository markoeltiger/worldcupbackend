'use strict';

/**
 * Realtime Live Engine
 * ===================
 * Real-time live update system with polling and broadcasting.
 * Polls live matches every 15 seconds, World Cup matches every 5 seconds.
 */

const logger = require('../utils/logger');
const rapidApiProvider = require('../ingestion/providers/rapidApiFootballProvider');
const normalizer = require('../normalizers/rapidApiNormalizer');
const cacheManager = require('../cache/footballCacheManager');
const persistenceService = require('./persistenceService');
const diffEngine = require('./diffEngine');
const idempotencyService = require('./idempotencyService');

// Polling intervals (in milliseconds)
const POLLING_INTERVALS = {
  live_matches: 15000,      // 15 seconds for regular live matches
  worldcup_live: 5000,       // 5 seconds for World Cup live matches
  fixtures: 120000,          // 2 minutes for fixtures
  standings: 300000,         // 5 minutes for standings
};

class RealtimeEngine {
  constructor() {
    this.isRunning = false;
    this.pollingIntervals = new Map();
    this.matchStateCache = new Map(); // In-memory cache for match states
    this.subscribers = new Map(); // SSE subscribers
  }

  /**
   * Start the realtime engine
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[RealtimeEngine] Already running');
      return;
    }

    this.isRunning = true;

    // Start polling live matches
    this.startLiveMatchPolling();

    // Start polling fixtures (less frequent)
    this.startFixturePolling();

    logger.info('[RealtimeEngine] Started');
  }

  /**
   * Stop the realtime engine
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all polling intervals
    for (const [name, intervalId] of this.pollingIntervals) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();

    logger.info('[RealtimeEngine] Stopped');
  }

  /**
   * Start polling live matches
   */
  startLiveMatchPolling() {
    const intervalId = setInterval(async () => {
      await this.pollLiveMatches();
    }, POLLING_INTERVALS.live_matches);

    this.pollingIntervals.set('live_matches', intervalId);
    logger.info(`[RealtimeEngine] Started live match polling (${POLLING_INTERVALS.live_matches}ms interval)`);
  }

  /**
   * Start polling fixtures
   */
  startFixturePolling() {
    const intervalId = setInterval(async () => {
      await this.pollFixtures();
    }, POLLING_INTERVALS.fixtures);

    this.pollingIntervals.set('fixtures', intervalId);
    logger.info(`[RealtimeEngine] Started fixture polling (${POLLING_INTERVALS.fixtures}ms interval)`);
  }

  /**
   * Poll live matches
   */
  async pollLiveMatches() {
    try {
      logger.debug('[RealtimeEngine] Polling live matches...');

      const rawMatches = await rapidApiProvider.getLiveMatches();
      if (!rawMatches || rawMatches.length === 0) {
        logger.debug('[RealtimeEngine] No live matches found');
        return;
      }

      const normalizedMatches = normalizer.normalizeMatches(rawMatches);
      const validMatches = normalizedMatches.filter(m => normalizer.validateMatch(m));

      logger.info(`[RealtimeEngine] Found ${validMatches.length} live matches`);

      // Process each match
      for (const match of validMatches) {
        await this.processLiveMatch(match);
      }

      // Cache live matches
      await cacheManager.set('live_matches', 'all', validMatches);

    } catch (error) {
      logger.error(`[RealtimeEngine] Error polling live matches: ${error.message}`);
    }
  }

  /**
   * Poll fixtures
   */
  async pollFixtures() {
    try {
      logger.debug('[RealtimeEngine] Polling fixtures...');

      const rawFixtures = await rapidApiProvider.getFixtures();
      if (!rawFixtures || rawFixtures.length === 0) {
        logger.debug('[RealtimeEngine] No fixtures found');
        return;
      }

      const normalizedFixtures = normalizer.normalizeMatches(rawFixtures);
      const validFixtures = normalizedFixtures.filter(m => normalizer.validateMatch(m));

      // Cache fixtures
      await cacheManager.set('fixtures', 'all', validFixtures);

      logger.debug(`[RealtimeEngine] Cached ${validFixtures.length} fixtures`);

    } catch (error) {
      logger.error(`[RealtimeEngine] Error polling fixtures: ${error.message}`);
    }
  }

  /**
   * Process a single live match
   */
  async processLiveMatch(match) {
    try {
      const matchId = match.external_id;

      // Check if state has changed
      const hasChanged = await persistenceService.hasMatchStateChanged(matchId, match);
      
      if (!hasChanged) {
        logger.debug(`[RealtimeEngine] Match ${matchId} state unchanged, skipping`);
        return;
      }

      logger.info(`[RealtimeEngine] Match ${matchId} state changed, processing...`);

      // Get previous state from cache
      const previousState = this.matchStateCache.get(matchId);

      // Diff the states
      const diffEvents = diffEngine.diffMatchStates(matchId, previousState, match, 'rapidapi');

      // Deduplicate events
      const uniqueEvents = [];
      for (const event of diffEvents) {
        const isDup = await idempotencyService.checkAndMarkDuplicate(
          matchId,
          event.type === 'NEW_EVENT' ? event.payload.type : event.type,
          event.type === 'NEW_EVENT' ? event.payload.minute : event.payload.minute || 0,
          event.type === 'NEW_EVENT' ? event.payload.player : '',
          'rapidapi'
        );
        if (!isDup) {
          uniqueEvents.push(event);
        }
      }

      // Persist match
      await persistenceService.upsertMatch(match);

      // Persist events if any
      if (match.events && match.events.length > 0) {
        await persistenceService.upsertMatchEvents(matchId, match.events);
      }

      // Persist live state
      await persistenceService.upsertLiveMatchState(matchId, {
        status: match.status,
        minute: match.minute,
        elapsed: match.elapsed,
        home_score: match.home_score,
        away_score: match.away_score,
        possession: match.statistics?.possession,
        shots: match.statistics?.shots,
      });

      // Broadcast changes
      if (uniqueEvents.length > 0) {
        await this.broadcastMatchUpdate(matchId, {
          match,
          events: uniqueEvents,
        });
      }

      // Update cache
      this.matchStateCache.set(matchId, match);

      logger.info(`[RealtimeEngine] Processed match ${matchId} with ${uniqueEvents.length} new events`);

    } catch (error) {
      logger.error(`[RealtimeEngine] Error processing match: ${error.message}`);
    }
  }

  /**
   * Broadcast match update to subscribers
   */
  async broadcastMatchUpdate(matchId, data) {
    try {
      // Broadcast via SSE to subscribers
      const subscribers = this.subscribers.get(matchId) || [];
      
      for (const res of subscribers) {
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          logger.error(`[RealtimeEngine] Error broadcasting to subscriber: ${error.message}`);
        }
      }

      // Could also broadcast via Supabase Realtime here
      // await supabase.channel(`match:${matchId}`).send({ type: 'UPDATE', payload: data });

      logger.debug(`[RealtimeEngine] Broadcasted update for match ${matchId} to ${subscribers.length} subscribers`);
    } catch (error) {
      logger.error(`[RealtimeEngine] Error broadcasting: ${error.message}`);
    }
  }

  /**
   * Add SSE subscriber for a match
   */
  addSubscriber(matchId, response) {
    if (!this.subscribers.has(matchId)) {
      this.subscribers.set(matchId, []);
    }
    
    this.subscribers.get(matchId).push(response);
    
    // Send initial state
    const cachedState = this.matchStateCache.get(matchId);
    if (cachedState) {
      response.write(`data: ${JSON.stringify({ match: cachedState, initial: true })}\n\n`);
    }

    logger.debug(`[RealtimeEngine] Added subscriber for match ${matchId}`);
  }

  /**
   * Remove SSE subscriber
   */
  removeSubscriber(matchId, response) {
    const subscribers = this.subscribers.get(matchId);
    if (subscribers) {
      const index = subscribers.indexOf(response);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }

    logger.debug(`[RealtimeEngine] Removed subscriber for match ${matchId}`);
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingIntervals: Array.from(this.pollingIntervals.keys()),
      cachedMatches: this.matchStateCache.size,
      subscribers: this.subscribers.size,
    };
  }

  /**
   * Get match state from cache
   */
  getMatchState(matchId) {
    return this.matchStateCache.get(matchId);
  }
}

module.exports = new RealtimeEngine();
