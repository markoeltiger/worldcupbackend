'use strict';

/**
 * Scraper fallback service.
 *
 * Uses Cheerio (lightweight HTML parser) as primary.
 * Falls back to Playwright (headless browser) for JS-rendered pages.
 *
 * ONLY activated when both API-Football and TheSportsDB fail.
 *
 * Target: BBC Sport scores page (structured HTML, publicly accessible).
 * Swap TARGET_URL for any clean HTML scores page.
 */

require('dotenv').config();
const axios    = require('axios');
const cheerio  = require('cheerio');
const { sleep, withRetry } = require('../utils/retry');
const logger   = require('../utils/logger');

const TARGET_URL = 'https://www.bbc.com/sport/football/scores-fixtures';

const USER_AGENTS = (process.env.SCRAPER_USER_AGENTS || '').split(',').filter(Boolean).length
  ? process.env.SCRAPER_USER_AGENTS.split(',')
  : [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    ];

const MIN_DELAY = parseInt(process.env.SCRAPER_MIN_DELAY_MS, 10) || 3000;
const MAX_DELAY = parseInt(process.env.SCRAPER_MAX_DELAY_MS, 10) || 8000;

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

/**
 * Fetch HTML with random UA and polite delay.
 */
async function fetchHTML(url) {
  await sleep(randomDelay());
  const response = await withRetry(
    () => axios.get(url, {
      headers: {
        'User-Agent': randomUserAgent(),
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: 'https://www.google.com/',
      },
      timeout: 15_000,
    }),
    { retries: 3, baseDelayMs: 2000, label: `scraper:${url}` }
  );
  return response.data;
}

/**
 * Parse BBC Sport scores page HTML into normalized match objects.
 * NOTE: Selectors may break if BBC changes markup — log failures gracefully.
 */
function parseBBCSport(html) {
  const $ = cheerio.load(html);
  const matches = [];

  try {
    // BBC Sport uses sp-c-fixture elements (class names may change)
    $('[data-reactid], .sp-c-fixture, article[data-fixture-id]').each((_, el) => {
      try {
        const fixtureId = $(el).attr('data-fixture-id') || $(el).attr('id') || `bbc_${Date.now()}_${Math.random()}`;
        const homeTeam  = $(el).find('[class*="home"] [class*="team-name"], [class*="HomeTeamName"]').text().trim();
        const awayTeam  = $(el).find('[class*="away"] [class*="team-name"], [class*="AwayTeamName"]').text().trim();
        const homeScore = parseInt($(el).find('[class*="home"] [class*="score"]').text().trim(), 10) || 0;
        const awayScore = parseInt($(el).find('[class*="away"] [class*="score"]').text().trim(), 10) || 0;
        const statusEl  = $(el).find('[class*="status"], [class*="match-status"]').text().trim();
        const minuteMatch = statusEl.match(/(\d+)'/);

        if (!homeTeam || !awayTeam) return;

        matches.push({
          match_id:   fixtureId,
          home_team:  homeTeam,
          away_team:  awayTeam,
          home_score: homeScore,
          away_score: awayScore,
          status:     inferStatus(statusEl),
          minute:     minuteMatch ? parseInt(minuteMatch[1], 10) : 0,
          league:     'Unknown',
          start_time: new Date().toISOString(),
          events:     [],
          source:     'scraper_bbc',
        });
      } catch (innerErr) {
        logger.warn(`[Scraper] Failed to parse fixture element: ${innerErr.message}`);
      }
    });
  } catch (err) {
    logger.error(`[Scraper] HTML parse error: ${err.message}`);
  }

  return matches;
}

function inferStatus(text) {
  if (!text) return 'NS';
  const t = text.toLowerCase();
  if (t.includes('half time') || t.includes('ht')) return 'HT';
  if (t.includes('full time') || t.includes('ft')) return 'FT';
  if (t.includes("'") || t.includes('min')) return 'LIVE';
  if (t.includes('postponed')) return 'POSTPONED';
  return 'NS';
}

/**
 * Playwright fallback for JS-rendered pages.
 * Only called if Cheerio returns 0 results.
 */
async function fetchWithPlaywright(url) {
  let playwright, browser;
  try {
    playwright = require('playwright');
    browser    = await playwright.chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'User-Agent': randomUserAgent() });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(randomDelay());
    const html = await page.content();
    return html;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Main export: scrape live matches.
 * Returns array of normalized match objects.
 */
async function scrapeLiveMatches() {
  logger.info('[Scraper] Activating fallback scraper…');

  let html = await fetchHTML(TARGET_URL);
  let matches = parseBBCSport(html);

  if (matches.length === 0) {
    logger.info('[Scraper] Cheerio returned 0 matches — trying Playwright');
    try {
      html    = await fetchWithPlaywright(TARGET_URL);
      matches = parseBBCSport(html);
    } catch (err) {
      logger.error(`[Scraper] Playwright also failed: ${err.message}`);
    }
  }

  logger.info(`[Scraper] Found ${matches.length} matches`);
  return matches;
}

module.exports = { scrapeLiveMatches };
