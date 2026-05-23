'use strict';

const idempotency = require('../services/idempotencyService');
const diffEngine = require('../services/diffEngine');
const healthManager = require('../services/healthManager');
const batchAggregator = require('../services/batchAggregator');

describe('GoalIQ Event-Driven System Upgrade Suite', () => {

  describe('1. Idempotency & Deduplication Service', () => {
    it('should generate deterministic MD5 keys', () => {
      const hash1 = idempotency.getEventKey('match-123', 'goal', 45, 'Lionel Messi', 'football_data');
      const hash2 = idempotency.getEventKey('match-123', 'goal', 45, 'Lionel Messi', 'football_data');
      const hash3 = idempotency.getEventKey('match-123', 'yellow_card', 45, 'Lionel Messi', 'football_data');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(32);
    });

    it('should identify and mark duplicate events', async () => {
      const isDup1 = await idempotency.checkAndMarkDuplicate('match-abc', 'card', 12, 'Ronaldo', 'api_football');
      const isDup2 = await idempotency.checkAndMarkDuplicate('match-abc', 'card', 12, 'Ronaldo', 'api_football');

      expect(isDup1).toBe(false); // First run is not duplicate
      expect(isDup2).toBe(true);  // Second run is duplicate
    });

    it('should deduplicate identical events across different providers (cross-provider)', async () => {
      const isDup1 = await idempotency.checkAndMarkDuplicate('match-xyz', 'goal', 30, 'Salah', 'api_football');
      const isDup2 = await idempotency.checkAndMarkDuplicate('match-xyz', 'goal', 30, 'Salah', 'sportsdb');

      expect(isDup1).toBe(false); // First provider reports it: not duplicate
      expect(isDup2).toBe(true);  // Second provider reports it: duplicate (blocked!)
    });
  });

  describe('2. Event Diff Engine', () => {
    it('should return empty array for no changes', () => {
      const oldState = {
        home_score: 1,
        away_score: 0,
        status: 'LIVE',
        minute: 60,
        events: [{ type: 'goal', minute: 10, player: 'Messi' }]
      };
      const newState = {
        home_score: 1,
        away_score: 0,
        status: 'LIVE',
        minute: 60,
        events: [{ type: 'goal', minute: 10, player: 'Messi' }]
      };

      const events = diffEngine.diffMatchStates('match-123', oldState, newState, 'sportsdb');
      expect(events).toHaveLength(0);
    });

    it('should detect score, minute, status, and new timeline events', () => {
      const oldState = {
        home_score: 1,
        away_score: 0,
        status: 'LIVE',
        minute: 60,
        events: [{ type: 'goal', minute: 10, player: 'Messi' }]
      };
      const newState = {
        home_score: 2, // score change
        away_score: 0,
        status: 'FT',   // status change
        minute: 90,   // minute change
        events: [
          { type: 'goal', minute: 10, player: 'Messi' },
          { type: 'goal', minute: 82, player: 'Suarez' } // new event
        ]
      };

      const events = diffEngine.diffMatchStates('match-123', oldState, newState, 'sportsdb');

      // Should output: STATUS_CHANGE, SCORE_CHANGE, MINUTE_UPDATE, NEW_EVENT
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('STATUS_CHANGE');
      expect(eventTypes).toContain('SCORE_CHANGE');
      expect(eventTypes).toContain('MINUTE_UPDATE');
      expect(eventTypes).toContain('NEW_EVENT');

      const statusChange = events.find(e => e.type === 'STATUS_CHANGE');
      expect(statusChange.payload.previous_status).toBe('LIVE');
      expect(statusChange.payload.current_status).toBe('FT');

      const scoreChange = events.find(e => e.type === 'SCORE_CHANGE');
      expect(scoreChange.payload.current_home_score).toBe(2);

      const newEv = events.find(e => e.type === 'NEW_EVENT');
      expect(newEv.payload.player).toBe('Suarez');
    });
  });

  describe('3. Provider Health & Circuit Breaker Manager', () => {
    beforeEach(() => {
      // Reset health values if needed
    });

    it('should start all providers in CLOSED state', () => {
      const metrics = healthManager.getMetrics();
      expect(metrics.football_data.state).toBe('CLOSED');
      expect(metrics.api_football.state).toBe('CLOSED');
      expect(healthManager.getProviderScore('football_data')).toBe(100);
    });

    it('should trip to OPEN if failure threshold exceeded', () => {
      // 3 consecutive failures
      healthManager.recordFailure('api_football');
      healthManager.recordFailure('api_football');
      healthManager.recordFailure('api_football');

      const metrics = healthManager.getMetrics();
      expect(metrics.api_football.state).toBe('OPEN');
      expect(metrics.api_football.score).toBe(0);
      expect(metrics.api_football.cooldownRemainingMs).toBeGreaterThan(0);
    });

    it('should select fallback provider when primary is OPEN', () => {
      // With api_football tripped, football_data should be preferred first if healthy
      // Let's trip football_data to force it to api_football (but api_football is tripped, so it should go to sportsdb!)
      healthManager.recordFailure('football_data');
      healthManager.recordFailure('football_data');
      healthManager.recordFailure('football_data');

      const active = healthManager.getActiveProvider();
      expect(active).toBe('sportsdb');
    });
  });

  describe('4. Real-Time Batch Aggregator', () => {
    it('should buffer and merge updates before flushing', () => {
      batchAggregator.addEvents('match-x', [{ type: 'SCORE_CHANGE', hash: 'h1', payload: {} }], { home_score: 1 });
      batchAggregator.addEvents('match-x', [{ type: 'MINUTE_UPDATE', hash: 'h2', payload: {} }], { minute: 4 });

      const recent = batchAggregator.getRecentBatches();
      const countBeforeFlush = recent.length;

      batchAggregator.flush();

      const countAfterFlush = batchAggregator.getRecentBatches().length;
      expect(countAfterFlush).toBeGreaterThan(countBeforeFlush);

      const latest = batchAggregator.getRecentBatches().pop();
      expect(latest.match_id).toBe('match-x');
      expect(latest.updates).toHaveLength(2);
      expect(latest.state_diff.home_score).toBe(1);
      expect(latest.state_diff.minute).toBe(4);
    });
  });

});
