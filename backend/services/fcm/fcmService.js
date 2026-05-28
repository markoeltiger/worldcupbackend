'use strict';

/**
 * services/fcm/fcmService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Cloud Messaging (FCM) service for push notifications.
 *
 * RULES:
 * - Uses Firebase Admin SDK for sending notifications
 * - Supports notification types: SYSTEM, LIVE_GOAL, AI_ALERT
 * - Handles token registration and management
 * - Queries database for subscribed users
 */

const firebase = require('../../src/config/firebase');
const supabase = require('../../db/supabaseAdmin');

/**
 * Notification types matching client SQLite DB categories
 */
const NOTIFICATION_TYPES = {
  SYSTEM: 'SYSTEM',
  LIVE_GOAL: 'LIVE_GOAL',
  LIVE_CARD: 'LIVE_CARD',
  LIVE_START: 'LIVE_START',
  LIVE_END: 'LIVE_END',
  AI_ALERT: 'AI_ALERT',
};

/**
 * Send FCM notification to a single device
 */
async function sendNotification(registrationToken, title, body, data = {}) {
  const messaging = firebase.getMessaging();
  
  if (!messaging) {
    console.warn('[FCM] Firebase not initialized, skipping notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const message = {
      token: registrationToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
    };

    const response = await messaging.send(message);
    console.log('[FCM] Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('[FCM] Failed to send notification:', err.message);
    
    // If token is invalid, mark it as inactive in database
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      await deactivateToken(registrationToken);
    }
    
    return { success: false, error: err.message, code: err.code };
  }
}

/**
 * Send notification to multiple devices (batch)
 */
async function sendMulticastNotification(registrationTokens, title, body, data = {}) {
  const messaging = firebase.getMessaging();
  
  if (!messaging) {
    console.warn('[FCM] Firebase not initialized, skipping multicast notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const message = {
      tokens: registrationTokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
    };

    const response = await messaging.sendMulticast(message);
    
    console.log('[FCM] Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // Deactivate failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(registrationTokens[idx]);
        }
      });
      
      await Promise.all(failedTokens.map(token => deactivateToken(token)));
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[FCM] Failed to send multicast notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to users subscribed to a specific match
 */
async function sendToMatchSubscribers(matchId, notificationType, title, body, additionalData = {}) {
  try {
    // Query database for users subscribed to this match
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('firebase_token')
      .eq('is_active', true)
      .contains('subscribed_matches', [matchId.toString()]);

    if (error) {
      console.error('[FCM] Failed to query subscribed users:', error.message);
      return { success: false, error: error.message };
    }

    if (!tokens || tokens.length === 0) {
      console.log('[FCM] No subscribers for match:', matchId);
      return { success: true, sentCount: 0 };
    }

    const registrationTokens = tokens.map(t => t.firebase_token);
    
    // Send multicast notification
    const data = {
      type: notificationType,
      match_id: matchId.toString(),
      ...additionalData,
    };

    const result = await sendMulticastNotification(registrationTokens, title, body, data);
    
    return {
      success: result.success,
      sentCount: result.successCount || 0,
      failedCount: result.failureCount || 0,
    };
  } catch (err) {
    console.error('[FCM] Failed to send to match subscribers:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deactivate an invalid FCM token
 */
async function deactivateToken(registrationToken) {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('firebase_token', registrationToken);

    if (error) {
      console.error('[FCM] Failed to deactivate token:', error.message);
    } else {
      console.log('[FCM] Token deactivated:', registrationToken);
    }
  } catch (err) {
    console.error('[FCM] Failed to deactivate token:', err.message);
  }
}

/**
 * Register or update FCM token for a user
 */
async function registerToken(userId, firebaseToken, deviceInfo = {}) {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
        firebase_token: firebaseToken,
        device_info: deviceInfo,
        last_used_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'firebase_token',
      });

    if (error) {
      console.error('[FCM] Failed to register token:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[FCM] Token registered successfully for user:', userId);
    return { success: true, data };
  } catch (err) {
    console.error('[FCM] Failed to register token:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe user to match notifications
 */
async function subscribeToMatch(userId, matchId) {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .update({
        subscribed_matches: supabase.raw('array_append(subscribed_matches, ?)', [matchId.toString()]),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('[FCM] Failed to subscribe to match:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[FCM] User subscribed to match:', userId, matchId);
    return { success: true, data };
  } catch (err) {
    console.error('[FCM] Failed to subscribe to match:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Unsubscribe user from match notifications
 */
async function unsubscribeFromMatch(userId, matchId) {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .update({
        subscribed_matches: supabase.raw('array_remove(subscribed_matches, ?)', [matchId.toString()]),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('[FCM] Failed to unsubscribe from match:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[FCM] User unsubscribed from match:', userId, matchId);
    return { success: true, data };
  } catch (err) {
    console.error('[FCM] Failed to unsubscribe from match:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send goal notification
 */
async function sendGoalNotification(matchId, homeTeam, awayTeam, scorer, minute, homeScore, awayScore) {
  const title = `GOAL! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} ⚽`;
  const body = `${scorer} scores in the ${minute}'!`;
  
  return sendToMatchSubscribers(
    matchId,
    NOTIFICATION_TYPES.LIVE_GOAL,
    title,
    body,
    {
      scorer,
      minute: minute.toString(),
      home_score: homeScore.toString(),
      away_score: awayScore.toString(),
    }
  );
}

/**
 * Send card notification
 */
async function sendCardNotification(matchId, homeTeam, awayTeam, player, cardType, minute) {
  const title = `${cardType === 'yellow_card' ? 'Yellow Card' : 'Red Card'} ⚠️`;
  const body = `${player} (${cardType === 'yellow_card' ? 'Yellow' : 'Red'}) in the ${minute}'`;
  
  return sendToMatchSubscribers(
    matchId,
    NOTIFICATION_TYPES.LIVE_CARD,
    title,
    body,
    {
      player,
      card_type: cardType,
      minute: minute.toString(),
    }
  );
}

/**
 * Send match start notification
 */
async function sendMatchStartNotification(matchId, homeTeam, awayTeam) {
  const title = `Match Started: ${homeTeam} vs ${awayTeam} 🏟️`;
  const body = 'The match has begun!';
  
  return sendToMatchSubscribers(
    matchId,
    NOTIFICATION_TYPES.LIVE_START,
    title,
    body,
    {
      home_team: homeTeam,
      away_team: awayTeam,
    }
  );
}

/**
 * Send match end notification
 */
async function sendMatchEndNotification(matchId, homeTeam, awayTeam, homeScore, awayScore) {
  const title = `Full Time: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} 🏁`;
  const body = 'The match has ended.';
  
  return sendToMatchSubscribers(
    matchId,
    NOTIFICATION_TYPES.LIVE_END,
    title,
    body,
    {
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore.toString(),
      away_score: awayScore.toString(),
    }
  );
}

module.exports = {
  NOTIFICATION_TYPES,
  sendNotification,
  sendMulticastNotification,
  sendToMatchSubscribers,
  registerToken,
  subscribeToMatch,
  unsubscribeFromMatch,
  sendGoalNotification,
  sendCardNotification,
  sendMatchStartNotification,
  sendMatchEndNotification,
};
