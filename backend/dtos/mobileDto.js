'use strict';

/**
 * Mobile Data Transfer Objects (DTOs)
 * ===================================
 * Optimized data structures for mobile clients.
 * Stable JSON contracts, minimal payload size, low bandwidth.
 */

/**
 * Optimize match for mobile
 */
function optimizeMatchForMobile(match) {
  if (!match) return null;

  return {
    id: match.external_id,
    ht: match.home_team?.name || null,
    at: match.away_team?.name || null,
    hs: match.home_score || 0,
    as: match.away_score || 0,
    st: match.status || 'NS',
    mn: match.minute || 0,
    el: match.elapsed || null,
    vn: match.venue?.name || null,
    lg: match.league?.name || null,
    tm: match.start_time || null,
    // Minimal event count
    ec: match.events?.length || 0,
  };
}

/**
 * Optimize matches list for mobile
 */
function optimizeMatchesForMobile(matches) {
  if (!matches || !Array.isArray(matches)) return [];

  return matches.map(m => optimizeMatchForMobile(m)).filter(Boolean);
}

/**
 * Optimize event for mobile
 */
function optimizeEventForMobile(event) {
  if (!event) return null;

  return {
    t: event.type || null,
    ts: event.team_side || null,
    p: event.player || null,
    a: event.assist || null,
    mn: event.minute || 0,
    dt: event.detail || null,
  };
}

/**
 * Optimize events for mobile
 */
function optimizeEventsForMobile(events) {
  if (!events || !Array.isArray(events)) return [];

  return events.map(e => optimizeEventForMobile(e)).filter(Boolean);
}

/**
 * Optimize team for mobile
 */
function optimizeTeamForMobile(team) {
  if (!team) return null;

  return {
    id: team.id || null,
    n: team.name || null,
    l: team.logo || null,
    c: team.country || null,
  };
}

/**
 * Optimize standings for mobile
 */
function optimizeStandingsForMobile(standings) {
  if (!standings || !Array.isArray(standings)) return [];

  return standings.map(row => ({
    r: row.rank || 0,
    tn: row.team?.name || null,
    p: row.played || 0,
    w: row.won || 0,
    d: row.drawn || 0,
    l: row.lost || 0,
    gf: row.goals_for || 0,
    ga: row.goals_against || 0,
    gd: row.goal_difference || 0,
    pts: row.points || 0,
  })).filter(Boolean);
}

/**
 * Optimize statistics for mobile
 */
function optimizeStatisticsForMobile(stats) {
  if (!stats) return null;

  return {
    pos: stats.possession || null,
    sh: stats.shots || null,
    sht: stats.shots_on_target || null,
    cr: stats.corners || null,
    fl: stats.fouls || null,
    yc: stats.yellow_cards || null,
    rc: stats.red_cards || null,
  };
}

/**
 * Create paginated response for mobile
 */
function createPaginatedResponse(data, page, limit, total) {
  return {
    d: data,
    p: page,
    l: limit,
    t: total,
    tp: Math.ceil(total / limit),
  };
}

/**
 * Create error response for mobile
 */
function createErrorResponse(error, code = 'ERROR') {
  return {
    s: false,
    e: code,
    m: error?.message || 'An error occurred',
  };
}

/**
 * Create success response for mobile
 */
function createSuccessResponse(data, meta = null) {
  const response = {
    s: true,
    d: data,
  };

  if (meta) {
    response.m = meta;
  }

  return response;
}

/**
 * Compress response if needed
 */
function compressResponse(response) {
  // In a real implementation, this would use compression
  // For now, just return the response
  return response;
}

/**
 * Validate mobile request
 */
function validateMobileRequest(req, requiredFields = []) {
  const missing = requiredFields.filter(field => !req.query[field] && !req.params[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      missing,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Get mobile-friendly timestamp
 */
function getMobileTimestamp(date) {
  if (!date) return null;
  
  try {
    const d = new Date(date);
    return d.toISOString();
  } catch (error) {
    return null;
  }
}

module.exports = {
  optimizeMatchForMobile,
  optimizeMatchesForMobile,
  optimizeEventForMobile,
  optimizeEventsForMobile,
  optimizeTeamForMobile,
  optimizeStandingsForMobile,
  optimizeStatisticsForMobile,
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
  compressResponse,
  validateMobileRequest,
  getMobileTimestamp,
};
