'use strict';

const logger = require('../utils/logger');
let admin = null;

function getFirebaseAdmin() {
  if (admin) return admin;
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    }
    return admin;
  } catch (err) {
    logger.warn(`[FCM] Firebase init failed: ${err.message}`);
    return null;
  }
}

async function sendToToken(token, title, body, data = {}) {
  const fb = getFirebaseAdmin();
  if (!fb) return;
  try {
    await fb.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high', notification: { sound: 'default', channelId: 'goaliq_live' } },
    });
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      logger.debug(`[FCM] Stale token removed`);
    } else {
      logger.error(`[FCM] Send failed: ${err.message}`);
    }
  }
}

async function sendToTopic(topic, title, body, data = {}) {
  const fb = getFirebaseAdmin();
  if (!fb) return;
  try {
    await fb.messaging().send({
      topic,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
    logger.debug(`[FCM] Sent to topic: ${topic}`);
  } catch (err) {
    logger.error(`[FCM] Topic send failed: ${err.message}`);
  }
}

const EVENT_TEMPLATES = {
  goal: (m, e) => ({
    title: `⚽ GOAL! ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}`,
    body: `${e.minute}' ${e.player || 'Goal'} (${e.team_side})`,
  }),
  red_card: (m, e) => ({
    title: `🟥 Red Card! ${m.home_team} vs ${m.away_team}`,
    body: `${e.minute}' ${e.player || 'Player'} sent off`,
  }),
  match_start: (m) => ({
    title: `🏟️ Kick-off! ${m.home_team} vs ${m.away_team}`,
    body: `${m.league} — Match is underway`,
  }),
  full_time: (m) => ({
    title: `🏁 FT: ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}`,
    body: m.league,
  }),
};

async function triggerMatchNotifications(match, newEvents = []) {
  const topic = `match_${match.external_id || match.id}`;
  for (const ev of newEvents) {
    const tmpl = EVENT_TEMPLATES[ev.type];
    if (!tmpl) continue;
    const { title, body } = tmpl(match, ev);
    await sendToTopic(topic, title, body, { match_id: match.id, event_type: ev.type });

    // Log notification
    try {
      const db = require('../db/supabase');
      await db.query(d => d.from('notifications').insert({
        match_id: match.id, type: ev.type, title, body
      }));
    } catch (_) { /* best effort */ }
  }
}

module.exports = { sendToToken, sendToTopic, triggerMatchNotifications };
