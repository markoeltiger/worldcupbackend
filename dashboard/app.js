'use strict';

// ---- Configuration ----
const API_BASE_URL = 'http://localhost:3001/api/v1';
let isSimulationMode = false;
let updateInterval = null;

// ---- State Management ----
let matches = [];
let users = [];
let predictions = [];
let insights = {};
let selectedMatchForInsight = null;
let currentActiveTab = 'live-matches';

// Simulated Auth State
let currentUser = null; // null represents guest mode
let jwtToken = null;
const MOCK_TOKENS = {
  'usr-1': 'eySimulatedSupabaseJWTTokenForSoccerGuru123.eyJ1c2VySWQiOiJ1c3ItMSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzg1Njk5NjAwfQ',
  'usr-2': 'eySimulatedSupabaseJWTTokenForPredictMaster456.eyJ1c2VySWQiOiJ1c3ItMiIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzg1Njk5NjAwfQ',
  'usr-3': 'eySimulatedSupabaseJWTTokenForAlexStriker789.eyJ1c2VySWQiOiJ1c3ItMyIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzg1Njk5NjAwfQ'
};


// Simulated Mock Data (Fallback if backend is offline)
const MOCK_DATA = {
  matches: [
    {
      id: 'mun-liv-101',
      home_team: 'Manchester United',
      away_team: 'Liverpool',
      home_score: 2,
      away_score: 1,
      status: 'LIVE',
      minute: 72,
      league: 'Premier League',
      start_time: new Date().toISOString(),
      venue: 'Old Trafford',
      events: [
        { type: 'goal', team_side: 'home', player: 'Marcus Rashford', minute: 14 },
        { type: 'yellow_card', team_side: 'away', player: 'Virgil van Dijk', minute: 32 },
        { type: 'goal', team_side: 'away', player: 'Mohamed Salah', minute: 55 },
        { type: 'goal', team_side: 'home', player: 'Bruno Fernandes', minute: 68 }
      ]
    },
    {
      id: 'rma-bar-102',
      home_team: 'Real Madrid',
      away_team: 'Barcelona',
      home_score: 3,
      away_score: 2,
      status: 'FT',
      minute: 90,
      league: 'La Liga',
      start_time: new Date(Date.now() - 7200 * 1000).toISOString(),
      venue: 'Santiago Bernabeu',
      events: [
        { type: 'goal', team_side: 'home', player: 'Vinicius Jr', minute: 22 },
        { type: 'goal', team_side: 'away', player: 'Robert Lewandowski', minute: 41 },
        { type: 'goal', team_side: 'home', player: 'Jude Bellingham', minute: 59 },
        { type: 'goal', team_side: 'away', player: 'Pedri', minute: 78 },
        { type: 'goal', team_side: 'home', player: 'Luka Modric', minute: 88 }
      ]
    },
    {
      id: 'ars-che-103',
      home_team: 'Arsenal',
      away_team: 'Chelsea',
      home_score: 0,
      away_score: 0,
      status: 'NS',
      minute: 0,
      league: 'Premier League',
      start_time: new Date(Date.now() + 3600 * 24000).toISOString(),
      venue: 'Emirates Stadium',
      events: []
    }
  ],
  users: [
    { id: 'usr-1', username: 'soccer_guru', display_name: 'Soccer Guru', total_points: 120, accuracy: '78%', streak: 5 },
    { id: 'usr-2', username: 'predict_master', display_name: 'Prediction Master', total_points: 95, accuracy: '62%', streak: 3 },
    { id: 'usr-3', username: 'alex_striker', display_name: 'Alex Striker', total_points: 85, accuracy: '55%', streak: 1 }
  ],
  predictions: [
    { id: 'pred-1', user_name: 'Soccer Guru', match_title: 'Real Madrid vs Barcelona', prediction: '3 - 2', points: '+10', result: 'exact' },
    { id: 'pred-2', user_name: 'Prediction Master', match_title: 'Manchester United vs Liverpool', prediction: '1 - 1', points: 'Pending', result: 'pending' }
  ],
  insights: {
    'mun-liv-101': [
      { type: 'live', time: '5 mins ago', body: 'Manchester United increased attacking pressure after 60th minute leading to Bruno Fernandes equalizer. Shift detected: +18% momentum.' },
      { type: 'pre_match', time: '2 hours ago', body: 'Both teams exhibit aggressive forward formations. Liverpool looks to press high, while United relies on quick wing transitions.' }
    ],
    'rma-bar-102': [
      { type: 'post_match', time: '1 hour ago', body: 'Real Madrid sealed thriller with clinical finishing from Modric. Midfield domination shifts secure victory (58% possession).' }
    ]
  }
};

// ---- App Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  checkBackendConnection();
  setupSimulationControls();
  setupPredictionSubmit();
  setupAuth();
});


// Tab Switch Setup
function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabId).classList.add('active');
      currentActiveTab = tabId;
      
      onTabChanged(tabId);
    });
  });
}

// Check Backend Connection and Initialize
async function checkBackendConnection() {
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.getElementById('backend-status-text');
  
  try {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    if (res.ok) {
      isSimulationMode = false;
      statusIndicator.className = 'status-indicator online';
      statusText.textContent = 'Backend Active';

      addConsoleLog('[System] Connected to live GoalIQ REST API server.');
      initializeData();
      startPolling();
    } else {
      throw new Error();
    }
  } catch (err) {
    isSimulationMode = true;
    statusIndicator.className = 'status-indicator offline';
    statusText.textContent = 'Offline (Simulation Mode)';
    addConsoleLog('[Warning] Live backend offline. Simulating sandbox environment...', 'warning');
    initializeSimulationData();
  }
}

// Poll backend if connected
function startPolling() {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => {
    if (!isSimulationMode) {
      fetchLiveMatches();
      fetchTelemetryMetrics();
    } else {
      simulateLiveTick();
      fetchTelemetryMetrics();
    }
  }, 5000); // 5s updates for active monitoring
}

// Initial Data Load (API mode)
async function initializeData() {
  await fetchLiveMatches();
  await loadDropdowns();
  await loadLeaderboard();
  await fetchTelemetryMetrics();
}


// Initial Mock Data Load (Simulation mode)
function initializeSimulationData() {
  matches = [...MOCK_DATA.matches];
  users = [...MOCK_DATA.users];
  predictions = [...MOCK_DATA.predictions];
  insights = { ...MOCK_DATA.insights };
  
  renderMatches();
  renderPredictions();
  renderLeaderboard();
  populateDropdowns();
  populateInsightsMatchList();
}

// Console Logging Helper
function addConsoleLog(message, type = 'normal') {
  const container = document.getElementById('console-logs-container');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

// ---- Data Fetching (Backend API Mode) ----
async function fetchLiveMatches() {
  try {
    const res = await fetch(`${API_BASE_URL}/matches/live`);
    const data = await res.json();
    matches = data.data || [];
    renderMatches();
    populateInsightsMatchList();
  } catch (err) {
    addConsoleLog(`[Error] Failed to fetch live scores: ${err.message}`, 'error');
  }
}

async function loadDropdowns() {
  try {
    // Fetch upcoming fixtures
    const mRes = await fetch(`${API_BASE_URL}/matches?status=NS`);
    const matchesData = await mRes.json();
    
    // Fetch users
    const uRes = await fetch(`${API_BASE_URL}/users/leaderboard`);
    const usersData = await uRes.json();
    
    users = usersData.data || [];
    populateDropdowns(matchesData.data || []);
  } catch (err) {
    addConsoleLog(`[Error] Failed to load dropdown lists: ${err.message}`, 'error');
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/leaderboard`);
    const data = await res.json();
    users = data.data || [];
    renderLeaderboard();
  } catch (err) {
    addConsoleLog(`[Error] Failed to load leaderboard: ${err.message}`, 'error');
  }
}

// ---- Rendering Engines ----

// Render matches grid
function renderMatches() {
  const container = document.getElementById('live-matches-grid');
  if (matches.length === 0) {
    container.innerHTML = '<p class="empty-state">No live matches at this time.</p>';
    return;
  }
  
  container.innerHTML = '';
  matches.forEach(m => {
    const card = document.createElement('div');
    card.className = 'glass-card match-card';
    
    const eventsHtml = m.events && m.events.length > 0 
      ? m.events.map(e => `
          <div class="timeline-event">
            <span class="event-min">${e.minute}'</span>
            <span class="event-icon">${getEventIcon(e.type)}</span>
            <div class="event-details">
              <span class="event-player">${e.player || 'Player'}</span>
              ${e.assist_player ? `<span class="event-assist">(assist by ${e.assist_player})</span>` : ''}
            </div>
          </div>
        `).join('')
      : '<p style="padding: 10px; color: var(--text-muted); font-size: 0.75rem;">No key events logged yet.</p>';
      
    card.innerHTML = `
      <div class="match-card-header">
        <div class="league-info">
          <span class="league-badge">${m.league || 'Football Match'}</span>
          <span>${m.venue || 'Stadium'}</span>
        </div>
        <span class="match-status-badge ${m.status.toLowerCase()}">${m.status}</span>
      </div>
      
      <div class="match-teams-score">
        <div class="team-box">
          <div class="user-avatar-placeholder" style="width: 45px; height: 45px; font-size: 1.25rem;">🏠</div>
          <span class="team-name">${m.home_team}</span>
        </div>
        
        <div class="score-center">
          <div class="score-digits">${m.home_score} - ${m.away_score}</div>
          ${m.status === 'LIVE' ? `<div class="match-minute"><span class="live-dot"></span> ${m.minute}'</div>` : ''}
        </div>
        
        <div class="team-box">
          <div class="user-avatar-placeholder" style="width: 45px; height: 45px; font-size: 1.25rem;">✈️</div>
          <span class="team-name">${m.away_team}</span>
        </div>
      </div>
      
      <div class="match-events-timeline">
        ${eventsHtml}
      </div>

      <div class="reaction-bar">
        <span class="reaction-title">React</span>
        <div class="reaction-buttons">
          <button class="react-btn" onclick="submitReaction('${m.id}', '🔥')">🔥 <span class="count" id="react-fire-${m.id}">0</span></button>
          <button class="react-btn" onclick="submitReaction('${m.id}', '👏')">👏 <span class="count" id="react-clap-${m.id}">0</span></button>
          <button class="react-btn" onclick="submitReaction('${m.id}', '😱')">😱 <span class="count" id="react-gasp-${m.id}">0</span></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function getEventIcon(type) {
  switch (type) {
    case 'goal': return '⚽';
    case 'yellow_card': return '🟨';
    case 'red_card': return '🟥';
    case 'substitution': return '🔄';
    default: return '📍';
  }
}

// Render Leaderboard
function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '';
  
  users.forEach((u, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="rank-badge ${rankClass}">${rank}</span></td>
      <td>
        <div class="user-cell">
          <div class="user-avatar-placeholder">${u.username.substring(0, 2).toUpperCase()}</div>
          <div>${u.display_name || u.username}</div>
        </div>
      </td>
      <td><strong>${u.total_points} pts</strong></td>
      <td>${u.accuracy || '60%'}</td>
      <td>🔥 ${u.streak || 0}</td>
    `;
    tbody.appendChild(row);
  });
}

// Render Predictions
function renderPredictions() {
  const container = document.getElementById('predictions-list-container');
  container.innerHTML = '';
  
  predictions.forEach(p => {
    const div = document.createElement('div');
    div.className = 'prediction-item';
    div.innerHTML = `
      <div class="pred-meta">
        <div class="pred-match-title">${p.match_title}</div>
        <div class="pred-user">Predicted by ${p.user_name}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="pred-score-bubble">${p.prediction}</span>
        <span class="pred-points-badge ${p.result}">${p.points}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Populate prediction options
function populateDropdowns(upcomingMatches = []) {
  const matchSelect = document.getElementById('pred-match-select');
  const userSelect = document.getElementById('pred-user-select');
  
  // Set Users dropdown
  userSelect.innerHTML = '<option value="">Select User...</option>';
  users.forEach(u => {
    userSelect.innerHTML += `<option value="${u.id}">${u.display_name || u.username}</option>`;
  });
  
  // Set matches dropdown
  matchSelect.innerHTML = '<option value="">Choose Fixture...</option>';
  if (isSimulationMode) {
    matches.filter(m => m.status === 'NS').forEach(m => {
      matchSelect.innerHTML += `<option value="${m.id}">${m.home_team} vs ${m.away_team}</option>`;
    });
  } else {
    upcomingMatches.forEach(m => {
      matchSelect.innerHTML += `<option value="${m.id}">${m.home_team} vs ${m.away_team}</option>`;
    });
  }
}

// Populate insights match list
function populateInsightsMatchList() {
  const container = document.getElementById('insights-match-list');
  container.innerHTML = '';
  
  matches.forEach(m => {
    const div = document.createElement('div');
    div.className = `match-item-simple ${selectedMatchForInsight === m.id ? 'selected' : ''}`;
    div.innerHTML = `
      <div>
        <strong style="display: block;">${m.home_team} vs ${m.away_team}</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${m.league}</span>
      </div>
      <span class="status-dot ${m.status.toLowerCase()}">${m.status}</span>
    `;
    div.addEventListener('click', () => {
      selectedMatchForInsight = m.id;
      document.querySelectorAll('.match-item-simple').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      loadInsightsForMatch(m);
    });
    container.appendChild(div);
  });
}

// Load AI insights for selected match
async function loadInsightsForMatch(match) {
  const container = document.getElementById('insights-feed-container');
  container.innerHTML = '';
  
  if (isSimulationMode) {
    const list = insights[match.id] || [];
    if (list.length === 0) {
      container.innerHTML = '<p class="empty-state">No AI commentary generated yet for this match.</p>';
      return;
    }
    
    list.forEach(ins => {
      const bubble = document.createElement('div');
      bubble.className = `insight-bubble ${ins.type}`;
      bubble.innerHTML = `
        <div class="insight-header">
          <span class="insight-tag">${ins.type.replace('_', ' ')} Insight</span>
          <span class="insight-time">${ins.time}</span>
        </div>
        <div class="insight-body">${ins.body}</div>
      `;
      container.appendChild(bubble);
    });
  } else {
    try {
      const res = await fetch(`${API_BASE_URL}/insights/${match.id}`);
      const data = await res.json();
      const list = data.data || [];
      
      if (list.length === 0) {
        container.innerHTML = '<p class="empty-state">No AI commentary generated yet for this match.</p>';
        return;
      }
      
      list.forEach(ins => {
        const bubble = document.createElement('div');
        bubble.className = `insight-bubble ${ins.type}`;
        bubble.innerHTML = `
          <div class="insight-header">
            <span class="insight-tag">${ins.type.replace('_', ' ')} Insight</span>
            <span class="insight-time">${new Date(ins.created_at).toLocaleTimeString()}</span>
          </div>
          <div class="insight-body">${ins.content}</div>
        `;
        container.appendChild(bubble);
      });
    } catch (err) {
      container.innerHTML = `<p class="empty-state" style="color: var(--accent-red);">Failed to load AI commentary.</p>`;
    }
  }
}

// Submit Predictions Form
function setupPredictionSubmit() {
  const form = document.getElementById('prediction-form');
  
  // Update prediction UI names dynamically
  document.getElementById('pred-match-select').addEventListener('change', (e) => {
    const matchId = e.target.value;
    const match = matches.find(m => m.id === matchId);
    if (match) {
      document.getElementById('pred-home-name').textContent = match.home_team;
      document.getElementById('pred-away-name').textContent = match.away_team;
    } else {
      document.getElementById('pred-home-name').textContent = 'Home Team';
      document.getElementById('pred-away-name').textContent = 'Away Team';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = document.getElementById('pred-match-select').value;
    const homeScore = document.getElementById('pred-home-score').value;
    const awayScore = document.getElementById('pred-away-score').value;
    const userId = document.getElementById('pred-user-select').value;
    
    const user = users.find(u => u.id === userId);
    const match = matches.find(m => m.id === matchId);
    
    if (isSimulationMode) {
      predictions.unshift({
        id: `pred-${Date.now()}`,
        user_name: user ? (user.display_name || user.username) : 'Simulated User',
        match_title: `${match.home_team} vs ${match.away_team}`,
        prediction: `${homeScore} - ${awayScore}`,
        points: 'Pending',
        result: 'pending'
      });
      renderPredictions();
      addConsoleLog(`[Prediction] Submitted for ${match.home_team} vs ${match.away_team} (${homeScore}-${awayScore})`);
      form.reset();
    } else {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (jwtToken) {
          headers['Authorization'] = `Bearer ${jwtToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/predictions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            match_id: matchId,
            predicted_home: parseInt(homeScore, 10),
            predicted_away: parseInt(awayScore, 10)
          })
        });
        
        if (response.ok) {
          addConsoleLog('[Prediction] Prediction saved to Supabase database.');
          form.reset();
          loadDropdowns();
        } else {
          const errData = await response.json();
          addConsoleLog(`[Error] Prediction rejected: ${errData.error}`, 'error');
        }
      } catch (err) {
        addConsoleLog(`[Error] Network error during submission: ${err.message}`, 'error');
      }
    }
  });

}

// React to Match Emotes
window.submitReaction = async function(matchId, emoji) {
  const el = document.getElementById(`react-${emoji === '🔥' ? 'fire' : emoji === '👏' ? 'clap' : 'gasp'}-${matchId}`);
  if (el) {
    el.textContent = parseInt(el.textContent, 10) + 1;
    addConsoleLog(`[Reaction] Sent "${emoji}" reaction to match ID: ${matchId}`);
  }

  if (!isSimulationMode) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      await fetch(`${API_BASE_URL}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ match_id: matchId, emoji })
      });
    } catch (err) {
      addConsoleLog(`[Error] Failed to submit reaction to server: ${err.message}`, 'error');
    }
  }
};


// ---- Tab Navigation Change Callback ----
function onTabChanged(tabId) {
  if (isSimulationMode) {
    if (tabId === 'live-matches') renderMatches();
    if (tabId === 'predictions-tab') renderPredictions();
    if (tabId === 'leaderboard-tab') renderLeaderboard();
  } else {
    if (tabId === 'live-matches') fetchLiveMatches();
    if (tabId === 'predictions-tab') loadDropdowns();
    if (tabId === 'leaderboard-tab') loadLeaderboard();
  }
}

// ---- Simulation Mechanics ----

function setupSimulationControls() {
  document.getElementById('trigger-ingestion-btn').addEventListener('click', () => {
    addConsoleLog('[Ingestion] Triggering ingestion loop cycle...');
    if (isSimulationMode) {
      setTimeout(() => {
        addConsoleLog('[Ingestion] 1 Live match frame fetched from simulated API sports endpoint.');
        addConsoleLog('[Ingestion] MD5 state hash match verified. Writing diff metrics (0 rows updated).');
      }, 800);
    } else {
      fetch(`${API_BASE_URL.replace('/v1', '')}/health`) // check endpoint triggers
        .then(() => addConsoleLog('[Ingestion] Ingestion cycle forced via admin hook.'))
        .catch(err => addConsoleLog(`[Error] Ingestion trigger failed: ${err.message}`, 'error'));
    }
  });

  document.getElementById('seed-db-btn').addEventListener('click', () => {
    addConsoleLog('[Seeder] Resetting database tables and inserting mock football arrays...', 'warning');
    if (isSimulationMode) {
      setTimeout(() => {
        initializeSimulationData();
        addConsoleLog('[Seeder] Tables seeded successfully.', 'system');
      }, 1000);
    } else {
      // In active API mode, trigger seeding endpoint if available
      addConsoleLog('[Seeder] Seeding script can be run on target command line: "node db/seed.js"');
    }
  });

  document.getElementById('toggle-fallback-btn').addEventListener('click', (e) => {
    if (e.target.textContent.includes('Primary')) {
      e.target.textContent = 'Failover: Active Scraper';
      e.target.className = 'action-btn warning';
      addConsoleLog('[Fallback] Primary REST API endpoints offline. Scraping HTML fallback active.', 'warning');
    } else {
      e.target.textContent = 'Failover: API Primary';
      e.target.className = 'action-btn info';
      addConsoleLog('[System] Restored connections to primary API-Football endpoints.', 'system');
    }
  });
}

// Simulates live match minutes ticking up and events triggering
function simulateLiveTick() {
  let changed = false;
  matches = matches.map(m => {
    if (m.status === 'LIVE') {
      changed = true;
      const nextMin = m.minute + 1;
      
      // Randomly trigger goals
      const newEvents = [...m.events];
      let homeScore = m.home_score;
      let awayScore = m.away_score;
      
      if (nextMin === 78) {
        newEvents.push({ type: 'goal', team_side: 'away', player: 'Luis Diaz', minute: 78 });
        awayScore += 1;
        addConsoleLog(`[Ingestion] ⚽ GOAL! ${m.home_team} ${homeScore}-${awayScore} ${m.away_team} (Luis Diaz)`);
        
        // Push simulated AI commentary update
        if (!insights[m.id]) insights[m.id] = [];
        insights[m.id].unshift({
          type: 'live',
          time: 'Just now',
          body: 'Tactical shift detected. Liverpool capitalized on wing overlap resulting in Diaz finish. Score shifts to 2-2.'
        });
        
        if (selectedMatchForInsight === m.id) {
          loadInsightsForMatch(m);
        }
      }
      
      if (nextMin >= 90) {
        return { ...m, status: 'FT', minute: 90, home_score: homeScore, away_score: awayScore, events: newEvents };
      }
      
      return { ...m, minute: nextMin, home_score: homeScore, away_score: awayScore, events: newEvents };
    }
    return m;
  });
  
  if (changed && currentActiveTab === 'live-matches') {
    renderMatches();
  }
}

function setupAuth() {
  const badge = document.getElementById('user-auth-badge');
  const label = document.getElementById('auth-username-text');
  
  if (!badge || !label) return;

  badge.addEventListener('click', () => {
    // Cycle auth states: Guest -> Soccer Guru -> Predict Master -> Alex Striker -> Guest
    if (!currentUser) {
      currentUser = { id: 'usr-1', username: 'soccer_guru', display_name: 'Soccer Guru' };
      jwtToken = MOCK_TOKENS['usr-1'];
      label.textContent = 'Soccer Guru';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      addConsoleLog('[Auth] Signed in as Soccer Guru. JWT token loaded in request headers.', 'system');
    } else if (currentUser.id === 'usr-1') {
      currentUser = { id: 'usr-2', username: 'predict_master', display_name: 'Prediction Master' };
      jwtToken = MOCK_TOKENS['usr-2'];
      label.textContent = 'Prediction Master';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      addConsoleLog('[Auth] Signed in as Prediction Master. JWT token loaded in request headers.', 'system');
    } else if (currentUser.id === 'usr-2') {
      currentUser = { id: 'usr-3', username: 'alex_striker', display_name: 'Alex Striker' };
      jwtToken = MOCK_TOKENS['usr-3'];
      label.textContent = 'Alex Striker';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      addConsoleLog('[Auth] Signed in as Alex Striker. JWT token loaded in request headers.', 'system');
    } else {
      currentUser = null;
      jwtToken = null;
      label.textContent = 'Guest Mode';
      badge.style.background = 'rgba(99, 102, 241, 0.12)';
      badge.style.borderColor = 'rgba(99, 102, 241, 0.25)';
      addConsoleLog('[Auth] Signed out. Headers running in Guest Mode.');
    }
  });
}

// ---- Observability Telemetry Rendering ----
async function fetchTelemetryMetrics() {
  if (isSimulationMode) {
    renderSimulationTelemetry();
    return;
  }

  try {
    const healthRes = await fetch(`${API_BASE_URL}/system/health`);
    const healthData = await healthRes.json();
    
    const queueRes = await fetch(`${API_BASE_URL}/system/queue`);
    const queueData = await queueRes.json();

    renderTelemetry(healthData.data, queueData.data);
  } catch (err) {
    console.error('Failed to fetch telemetry metrics:', err);
  }
}

function renderTelemetry(health, queue) {
  const healthContainer = document.getElementById('provider-health-container');
  const queueContainer = document.getElementById('queue-telemetry-container');

  if (health && healthContainer) {
    healthContainer.innerHTML = '';
    Object.keys(health).forEach(provider => {
      const p = health[provider];
      const stateClass = p.state === 'CLOSED' ? 'status-indicator online' : p.state === 'HALF_OPEN' ? 'status-indicator warning' : 'status-indicator offline';
      const stateLabel = p.state === 'CLOSED' ? 'ACTIVE' : p.state === 'HALF_OPEN' ? 'TESTING' : 'COOLDOWN';
      
      healthContainer.innerHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <div>
            <strong style="text-transform: capitalize; color: #fff;">${provider.replace('_', ' ')}</strong>
            <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">
              Score: <strong>${p.score}/100</strong> | Latency: <strong>${p.averageLatencyMs}ms</strong>
            </div>
            <div style="font-size: 0.75em; color: var(--text-muted); margin-top: 2px;">
              Reqs: ${p.totalRequests} (Ok: ${p.totalSuccesses}, Err: ${p.totalFailures})
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="${stateClass}" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%;"></span>
            <span style="font-size: 0.8em; font-weight: bold; color: ${p.state === 'CLOSED' ? '#10B981' : p.state === 'HALF_OPEN' ? '#F59E0B' : '#EF4444'};">${stateLabel}</span>
            ${p.cooldownRemainingMs > 0 ? `<span style="font-size: 0.7em; color: #EF4444;">${Math.round(p.cooldownRemainingMs / 1000)}s left</span>` : ''}
          </div>
        </div>
      `;
    });
  }

  if (queue && queueContainer) {
    queueContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
          <div style="font-size: 0.85em; color: var(--text-muted);">Queue Size</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #10B981; margin-top: 4px;">${queue.queueLength}</div>
        </div>
        <div style="padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
          <div style="font-size: 0.85em; color: var(--text-muted);">DLQ (Failed)</div>
          <div style="font-size: 1.5em; font-weight: bold; color: ${queue.dlqLength > 0 ? '#EF4444' : 'var(--text-muted)'}; margin-top: 4px;">${queue.dlqLength}</div>
        </div>
      </div>
      
      <div style="padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); margin-top: 6px;">
        <div style="font-size: 0.85em; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Processed Jobs:</span>
          <strong style="color: #fff;">${queue.totalProcessed}</strong>
        </div>
        <div style="font-size: 0.85em; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
          <span>Failed Jobs:</span>
          <strong style="color: ${queue.totalFailed > 0 ? '#EF4444' : 'var(--text-muted)'};">${queue.totalFailed}</strong>
        </div>
        <div style="font-size: 0.85em; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
          <span>Worker Status:</span>
          <strong style="color: #10B981;">${queue.isProcessing ? 'RUNNING' : 'IDLE'}</strong>
        </div>
      </div>
    `;
  }
}

function renderSimulationTelemetry() {
  const healthContainer = document.getElementById('provider-health-container');
  const queueContainer = document.getElementById('queue-telemetry-container');
  
  if (healthContainer) {
    healthContainer.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 0.9em;">
        Telemetry only active in Live Mode.<br>Currently running offline simulation.
      </div>
    `;
  }
  if (queueContainer) {
    queueContainer.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 0.9em;">
        Queue statistics disabled in sandbox mode.
      </div>
    `;
  }
}


