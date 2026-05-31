'use strict';

/**
 * Analytics Repository
 * =====================
 * Database operations for analytics events using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Create analytics event
 */
async function create(eventData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('analytics_events')
        .insert(eventData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[AnalyticsRepository] Error creating analytics event: ${error.message}`);
      throw error;
    }

    logger.info(`[AnalyticsRepository] Analytics event created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[AnalyticsRepository] Error creating analytics event: ${error.message}`);
    throw error;
  }
}

/**
 * Find events by user ID
 */
async function findByUserId(userId, eventName = null, days = 30) {
  try {
    let query = db.query(d =>
      d.from('analytics_events')
        .select('*')
        .eq('user_id', userId)
    );

    if (eventName) {
      query = query.eq('event_name', eventName);
    }

    if (days) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      query = query.gte('created_at', dateThreshold.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error(`[AnalyticsRepository] Error finding events by user: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[AnalyticsRepository] Error finding events by user: ${error.message}`);
    throw error;
  }
}

/**
 * Get analytics stats
 */
async function getAnalyticsStats(userId, days = 30) {
  try {
    const { data, error } = await db.query(d =>
      d.rpc('get_analytics_stats', { p_user_id: userId, p_days: days })
    );

    if (error) {
      logger.error(`[AnalyticsRepository] Error getting analytics stats: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[AnalyticsRepository] Error getting analytics stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get event counts by name
 */
async function getEventCountsByUserId(userId, days = 30) {
  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const { data, error } = await db.query(d =>
      d.from('analytics_events')
        .select('event_name')
        .eq('user_id', userId)
        .gte('created_at', dateThreshold.toISOString())
    );

    if (error) {
      logger.error(`[AnalyticsRepository] Error getting event counts: ${error.message}`);
      throw error;
    }

    // Count events by name
    const counts = {};
    data.forEach(event => {
      counts[event.event_name] = (counts[event.event_name] || 0) + 1;
    });

    return counts;
  } catch (error) {
    logger.error(`[AnalyticsRepository] Error getting event counts: ${error.message}`);
    throw error;
  }
}

/**
 * Delete old events (cleanup)
 */
async function deleteOldEvents(days = 90) {
  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const { error } = await db.query(d =>
      d.from('analytics_events')
        .delete()
        .lt('created_at', dateThreshold.toISOString())
    );

    if (error) {
      logger.error(`[AnalyticsRepository] Error deleting old events: ${error.message}`);
      throw error;
    }

    logger.info(`[AnalyticsRepository] Old analytics events deleted (older than ${days} days)`);
    return true;
  } catch (error) {
    logger.error(`[AnalyticsRepository] Error deleting old events: ${error.message}`);
    throw error;
  }
}

module.exports = {
  create,
  findByUserId,
  getAnalyticsStats,
  getEventCountsByUserId,
  deleteOldEvents,
};
