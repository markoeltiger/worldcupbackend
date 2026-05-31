'use strict';

/**
 * Analytics Service
 * ==================
 * Business logic for analytics event tracking.
 */

const analyticsRepository = require('../repositories/analyticsRepository');
const analyticsDto = require('../dtos/analyticsDto');
const analyticsValidator = require('../validators/analyticsValidator');
const logger = require('../utils/logger');

/**
 * Track analytics event
 */
async function trackEvent(userId, eventData, ipAddress = null, userAgent = null) {
  try {
    // Validate event data
    const validation = analyticsValidator.validateAnalyticsEvent(eventData);
    if (!validation.valid) {
      return analyticsDto.errorResponse('VALIDATION_ERROR', 'Invalid event data', validation.errors);
    }

    // Convert to event data
    const data = analyticsDto.toAnalyticsEventData(eventData);
    data.user_id = userId;
    data.ip_address = ipAddress;
    data.user_agent = userAgent;

    // Create event
    const event = await analyticsRepository.create(data);

    logger.info(`[AnalyticsService] Event tracked for user: ${userId}, event: ${event.event_name}`);
    return analyticsDto.successResponse(
      analyticsDto.toAnalyticsEventDTO(event),
      'Event tracked successfully'
    );
  } catch (error) {
    logger.error(`[AnalyticsService] Error tracking event: ${error.message}`);
    throw error;
  }
}

/**
 * Get user analytics events
 */
async function getUserEvents(userId, eventName = null, days = 30) {
  try {
    const events = await analyticsRepository.findByUserId(userId, eventName, days);

    return {
      success: true,
      data: analyticsDto.toAnalyticsEventDTOs(events),
    };
  } catch (error) {
    logger.error(`[AnalyticsService] Error getting user events: ${error.message}`);
    throw error;
  }
}

/**
 * Get analytics stats
 */
async function getAnalyticsStats(userId, days = 30) {
  try {
    const stats = await analyticsRepository.getAnalyticsStats(userId, days);

    return {
      success: true,
      data: analyticsDto.toAnalyticsStatsDTO(stats),
    };
  } catch (error) {
    logger.error(`[AnalyticsService] Error getting analytics stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get event counts
 */
async function getEventCounts(userId, days = 30) {
  try {
    const counts = await analyticsRepository.getEventCountsByUserId(userId, days);

    return {
      success: true,
      data: counts,
    };
  } catch (error) {
    logger.error(`[AnalyticsService] Error getting event counts: ${error.message}`);
    throw error;
  }
}

/**
 * Batch track events
 */
async function batchTrackEvents(userId, events, ipAddress = null, userAgent = null) {
  try {
    const results = [];
    const errors = [];

    for (const eventData of events) {
      try {
        const validation = analyticsValidator.validateAnalyticsEvent(eventData);
        if (!validation.valid) {
          errors.push({ event: eventData, errors: validation.errors });
          continue;
        }

        const data = analyticsDto.toAnalyticsEventData(eventData);
        data.user_id = userId;
        data.ip_address = ipAddress;
        data.user_agent = userAgent;

        const event = await analyticsRepository.create(data);
        results.push(analyticsDto.toAnalyticsEventDTO(event));
      } catch (error) {
        errors.push({ event: eventData, errors: [error.message] });
      }
    }

    logger.info(`[AnalyticsService] Batch track completed: ${results.length} successful, ${errors.length} failed`);

    return {
      success: true,
      data: {
        successful: results,
        failed: errors,
        total: events.length,
        success_count: results.length,
        error_count: errors.length,
      },
    };
  } catch (error) {
    logger.error(`[AnalyticsService] Error batch tracking events: ${error.message}`);
    throw error;
  }
}

module.exports = {
  trackEvent,
  getUserEvents,
  getAnalyticsStats,
  getEventCounts,
  batchTrackEvents,
};
