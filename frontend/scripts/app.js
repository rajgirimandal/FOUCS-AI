// Focus AI - Main Application JavaScript

const API_BASE = ''; // Same origin

// State
let state = {
  token: null,
  user: null,
  currentSession: null,
  sessionActive: false,
  sessionPaused: false,
  timer: null,
  elapsedSeconds: 0,
  activeSeconds: 0,
  inactiveSeconds: 0,
  tabSwitches: 0,
  idleEvents: 0,
  lastActivityTime: Date.now(),
  idleThreshold: 60000, // 60 seconds
  syncInterval: null
};

// DOM Elements
const elements = {
  authScreen: document.getElementById('auth-screen'),
  mainApp: document.getElementById('main-app'),
  loginForm: document.getElementById('login-form'),
  signupForm: document.getElementById('signup-form'),
  authError: document.getElementById('auth-error')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initEventListeners();
  
  // Set current date
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
});

// Load state from localStorage
function loadState() {
  const savedToken = localStorage.getItem('focusai_token');
  const savedUser = localStorage.getItem('focusai_user');
  const savedSession = localStorage.getItem('focusai_session');
  
  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    
    if (savedSession && savedSession !== 'null') {
      try {
        const session = JSON.parse(savedSession);
        if (session.status === 'active') {
          state.currentSession = session;
          state.sessionActive = true;
          resumeSessionFromState(session);
        }
      } catch (e) {
        console.error('Error loading session:', e);
      }
    }
    
    showMainApp();
  }
}

// Save state to localStorage
function saveState() {
  if (state.token) {
    localStorage.setItem('focusai_token', state.token);
    localStorage.setItem('focusai_user', JSON.stringify(state.user));
  } else {
    localStorage.removeItem('focusai_token');
    localStorage.removeItem('focusai_user');
  }
  
  if (state.currentSession) {
    localStorage.setItem('focusai_session', JSON.stringify(state.currentSession));
  } else {
    localStorage.removeItem('focusai_session');
  }
}

// Initialize event listeners
function initEventListeners() {
  // Page navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      showPage(page);
    });
  });
  
  // Activity tracking events
  document.addEventListener('mousemove', handleActivity);
  document.addEventListener('keydown', handleActivity);
  document.addEventListener('click', handleActivity);
  
  // Tab visibility
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Window focus
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);
}

// Activity tracking
function handleActivity() {
  const now = Date.now();
  const timeSinceLastActivity = now - state.lastActivityTime;
  
  if (timeSinceLastActivity > state.idleThreshold && state.sessionActive && !state.sessionPaused) {
    // User was idle
    state.idleEvents++;
    logActivity('idle', { duration: Math.floor(timeSinceLastActivity / 1000) });
    updateActivityDisplay();
  }
  
  state.lastActivityTime = now;
  
  if (state.sessionActive && !state.sessionPaused) {
    state.activeSeconds++;
    updateFocusScore();
  }
}

// Focus tracking
function handleVisibilityChange() {
  if (document.hidden && state.sessionActive && !state.sessionPaused) {
    state.tabSwitches++;
    logActivity('tab_switch', { from: 'focus', to: 'hidden' });
    updateActivityDisplay();
  }
}

function handleWindowBlur() {
  // Window lost focus - count as tab switch
}

function handleWindowFocus() {
  // Window regained focus
}

// Auth Functions
function showLogin() {
  elements.loginForm.classList.remove('hidden');
  elements.signupForm.classList.add('hidden');
  elements.authError.classList.add('hidden');
}

function showSignup() {
  elements.loginForm.classList.add('hidden');
  elements.signupForm.classList.remove('hidden');
  elements.authError.classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  
  btn.textContent = 'Signing in...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    state.token = data.token;
    state.user = data.user;
    saveState();
    showMainApp();
    
  } catch (error) {
    showAuthError(error.message);
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

async function handleSignup(e) {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const classGrade = document.getElementById('signup-class').value;
  const goals = document.getElementById('signup-goals').value;
  const btn = document.getElementById('signup-btn');
  
  btn.textContent = 'Creating account...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, classGrade, goals })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    state.token = data.token;
    state.user = data.user;
    saveState();
    showMainApp();
    
  } catch (error) {
    showAuthError(error.message);
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.classList.remove('hidden');
}

function handleLogout() {
  // End active session if any
  if (state.sessionActive) {
    endSession();
  }
  
  // Clear state
  state = {
    ...state,
    token: null,
    user: null,
    currentSession: null,
    sessionActive: false,
    sessionPaused: false
  };
  
  localStorage.clear();
  
  // Show auth screen
  elements.authScreen.classList.remove('hidden');
  elements.mainApp.classList.add('hidden');
  
  // Reset forms
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('signup-name').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
}

function showMainApp() {
  elements.authScreen.classList.add('hidden');
  elements.mainApp.classList.remove('hidden');
  
  // Update user info
  document.getElementById('display-name').textContent = state.user?.name || 'User';
  document.getElementById('display-class').textContent = state.user?.classGrade || '';
  document.getElementById('user-avatar').textContent = state.user?.name?.charAt(0).toUpperCase() || 'U';
  
  // Load initial data
  loadDashboardData();
  showPage('dashboard');
}

// Page Navigation
function showPage(page) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  // Show page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden');
  });
  document.getElementById(`page-${page}`).classList.remove('hidden');
  
  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'history':
      loadHistory();
      break;
    case 'reports':
      loadReports();
      break;
    case 'recommendations':
      loadRecommendations();
      break;
  }
}

// Dashboard
async function loadDashboardData() {
  try {
    const response = await fetch(`${API_BASE}/api/stats`, getAuthHeaders());
    const stats = await response.json();
    
    // Update stats
    document.getElementById('today-time').textContent = formatDuration(stats.today?.total_time || 0);
    document.getElementById('focus-score').textContent = Math.round(stats.today?.avg_focus_score || 0) + '%';
    document.getElementById('sessions-today').textContent = stats.today?.sessions_count || 0;
    document.getElementById('week-time').textContent = formatDuration(stats.week?.total_time || 0);
    
    // Load today's sessions
    loadTodaySessions();
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadTodaySessions() {
  try {
    const response = await fetch(`${API_BASE}/api/sessions/today`, getAuthHeaders());
    const data = await response.json();
    
    const list = document.getElementById('today-sessions');
    if (!data.sessions || data.sessions.length === 0) {
      list.innerHTML = '<p class="empty-state">No sessions today</p>';
      return;
    }
    
    list.innerHTML = data.sessions.map(session => {
      const scoreClass = getScoreClass(session.focus_score);
      const time = formatDuration(session.total_duration);
      
      return `
        <div class="session-item">
          <div>
            <div class="session-mode">${session.mode || 'Study'}</div>
            <div class="session-time">${time} duration</div>
          </div>
          <div class="session-score ${scoreClass}">${Math.round(session.focus_score)}%</div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading today sessions:', error);
  }
}

// Sessions
async function startQuickSession() {
  showPage('session');
  await startSession();
}

async function startSession() {
  if (state.sessionActive) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ mode: 'study' })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to start session');
    }
    
    state.currentSession = data.session;
    state.sessionActive = true;
    state.sessionPaused = false;
    state.elapsedSeconds = 0;
    state.activeSeconds = 0;
    state.inactiveSeconds = 0;
    state.tabSwitches = 0;
    state.idleEvents = 0;
    state.lastActivityTime = Date.now();
    
    updateSessionUI();
    startTimer();
    saveState();
    
    logActivity('session_start', {});
    
  } catch (error) {
    console.error('Error starting session:', error);
    alert('Failed to start session: ' + error.message);
  }
}

function pauseSession() {
  if (!state.sessionActive || state.sessionPaused) return;
  
  state.sessionPaused = true;
  stopTimer();
  updateSessionUI();
  logActivity('pause', {});
  
  updateSessionState();
}

function resumeSession() {
  if (!state.sessionActive || !state.sessionPaused) return;
  
  state.sessionPaused = false;
  state.lastActivityTime = Date.now();
  startTimer();
  updateSessionUI();
  logActivity('resume', {});
  
  updateSessionState();
}

function resumeSessionFromState(session) {
  // Resume timer from saved session
  const startTime = new Date(session.start_time);
  state.elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
  state.activeSeconds = session.active_duration || 0;
  state.currentSession = session;
  
  updateSessionUI();
  startTimer();
}

async function endSession() {
  if (!state.sessionActive) return;
  
  try {
    stopTimer();
    
    const focusScore = state.elapsedSeconds > 0 
      ? (state.activeSeconds / state.elapsedSeconds) * 100 
      : 0;
    
    await fetch(`${API_BASE}/api/sessions/${state.currentSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        total_duration: state.elapsedSeconds,
        active_duration: state.activeSeconds,
        focus_score: focusScore,
        status: 'completed'
      })
    });
    
    logActivity('session_end', { focus_score: focusScore });
    
    // Clear state
    state.sessionActive = false;
    state.sessionPaused = false;
    state.currentSession = null;
    state.elapsedSeconds = 0;
    state.activeSeconds = 0;
    state.inactiveSeconds = 0;
    state.tabSwitches = 0;
    state.idleEvents = 0;
    
    // Clear localStorage
    localStorage.removeItem('focusai_session');
    
    updateSessionUI();
    showPage('dashboard');
    loadDashboardData();
    
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

async function updateSessionState() {
  if (!state.currentSession) return;
  
  const focusScore = state.elapsedSeconds > 0 
    ? (state.activeSeconds / state.elapsedSeconds) * 100 
    : 0;
  
  try {
    await fetch(`${API_BASE}/api/sessions/${state.currentSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        total_duration: state.elapsedSeconds,
        active_duration: state.activeSeconds,
        focus_score: focusScore,
        status: state.sessionPaused ? 'paused' : 'active'
      })
    });
    
    state.currentSession = {
      ...state.currentSession,
      total_duration: state.elapsedSeconds,
      active_duration: state.activeSeconds,
      focus_score: focusScore
    };
    saveState();
    
  } catch (error) {
    console.error('Error updating session:', error);
  }
}

// Timer
function startTimer() {
  state.timer = setInterval(() => {
    if (!state.sessionPaused) {
      state.elapsedSeconds++;
      updateTimerDisplay();
    }
  }, 1000);
  
  // Sync to server every 10 seconds
  state.syncInterval = setInterval(() => {
    if (state.sessionActive && !state.sessionPaused) {
      updateSessionState();
    }
  }, 10000);
}

function stopTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  if (state.syncInterval) {
    clearInterval(state.syncInterval);
    state.syncInterval = null;
  }
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (display) {
    display.textContent = formatTime(state.elapsedSeconds);
  }
  
  // Update other displays
  document.getElementById('active-time').textContent = formatTime(state.activeSeconds);
  document.getElementById('inactive-time').textContent = formatTime(state.inactiveSeconds);
}

function updateFocusScore() {
  const focusScore = state.elapsedSeconds > 0 
    ? Math.round((state.activeSeconds / state.elapsedSeconds) * 100) 
    : 0;
  
  document.getElementById('live-focus-score').textContent = focusScore + '%';
}

function updateActivityDisplay() {
  document.getElementById('tab-switches').textContent = state.tabSwitches;
  document.getElementById('idle-events').textContent = state.idleEvents;
}

async function logActivity(eventType, eventData) {
  try {
    await fetch(`${API_BASE}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        session_id: state.currentSession?.id,
        event_type: eventType,
        event_data: eventData
      })
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
  
  // Add to UI
  addActivityToUI(eventType, eventData);
}

function addActivityToUI(eventType, eventData) {
  const list = document.getElementById('activity-list');
  const entry = document.createElement('div');
  entry.className = 'activity-entry';
  
  let typeText = eventType;
  if (eventType === 'idle') typeText = 'Idle detected';
  if (eventType === 'tab_switch') typeText = 'Tab switch';
  if (eventType === 'session_start') typeText = 'Session started';
  if (eventType === 'session_end') typeText = 'Session ended';
  if (eventType === 'pause') typeText = 'Session paused';
  if (eventType === 'resume') typeText = 'Session resumed';
  
  entry.innerHTML = `
    <span class="activity-type">${typeText}</span>
    <span class="activity-time">${new Date().toLocaleTimeString()}</span>
  `;
  
  list.insertBefore(entry, list.firstChild);
  
  // Keep max 50 entries
  while (list.children.length > 50) {
    list.removeChild(list.lastChild);
  }
}

function updateSessionUI() {
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const endBtn = document.getElementById('end-btn');
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.getElementById('status-indicator');
  
  if (state.sessionActive) {
    startBtn.classList.add('hidden');
    endBtn.classList.remove('hidden');
    
    if (state.sessionPaused) {
      pauseBtn.classList.add('hidden');
      resumeBtn.classList.remove('hidden');
      statusText.textContent = 'Paused';
      statusIndicator.className = 'status-indicator paused';
    } else {
      pauseBtn.classList.remove('hidden');
      resumeBtn.classList.add('hidden');
      statusText.textContent = 'Focusing';
      statusIndicator.className = 'status-indicator active';
    }
  } else {
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    resumeBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
    statusText.textContent = 'Ready to focus';
    statusIndicator.className = 'status-indicator';
    
    // Reset displays
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('live-focus-score').textContent = '0%';
    document.getElementById('active-time').textContent = '0:00';
    document.getElementById('inactive-time').textContent = '0:00';
    document.getElementById('tab-switches').textContent = '0';
    document.getElementById('idle-events').textContent = '0';
    document.getElementById('activity-list').innerHTML = '';
  }
}

// History
async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, getAuthHeaders());
    const data = await response.json();
    
    const list = document.getElementById('history-list');
    
    if (!data.sessions || data.sessions.length === 0) {
      list.innerHTML = '<p class="empty-state">No sessions yet</p>';
      return;
    }
    
    list.innerHTML = data.sessions.map(session => {
      const scoreClass = getScoreClass(session.focus_score);
      const date = new Date(session.start_time).toLocaleDateString();
      const time = new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="history-item">
          <div class="history-item-info">
            <h4>${session.mode || 'Study'} Session</h4>
            <p>${date} at ${time}</p>
          </div>
          <div class="history-item-stats">
            <div class="history-stat">
              <div class="history-stat-value">${formatDuration(session.total_duration)}</div>
              <div class="history-stat-label">Duration</div>
            </div>
            <div class="history-stat">
              <div class="history-stat-value ${scoreClass}">${Math.round(session.focus_score)}%</div>
              <div class="history-stat-label">Focus</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

function filterHistory() {
  // Could add filtering logic here
}

// Reports
async function loadReports() {
  try {
    // Generate current week report
    await fetch(`${API_BASE}/api/reports/weekly`, getAuthHeaders());
    
    // Load all reports
    const response = await fetch(`${API_BASE}/api/reports`, getAuthHeaders());
    const data = await response.json();
    
    // Update summary
    if (data.reports && data.reports.length > 0) {
      const current = data.reports[0];
      document.getElementById('report-total-time').textContent = formatDuration(current.total_study_time);
      document.getElementById('report-avg-focus').textContent = Math.round(current.avg_focus_score) + '%';
      document.getElementById('report-sessions').textContent = current.sessions_count;
      
      const trendEl = document.getElementById('report-trend');
      trendEl.textContent = current.trend || '--';
      trendEl.className = 'report-value trend-' + (current.trend || 'stable');
    }
    
    // List all reports
    const list = document.getElementById('reports-list');
    if (!data.reports || data.reports.length === 0) {
      list.innerHTML = '<p class="empty-state">No reports generated yet</p>';
      return;
    }
    
    list.innerHTML = data.reports.map(report => {
      const trendClass = 'trend-' + (report.trend || 'stable');
      
      return `
        <div class="report-item">
          <div class="report-item-header">
            <span>${report.week_start} - ${report.week_end}</span>
            <span class="${trendClass}">${report.trend || '--'}</span>
          </div>
          <div class="report-item-stats">
            <span>${formatDuration(report.total_study_time)}</span>
            <span>Focus: ${Math.round(report.avg_focus_score)}%</span>
            <span>${report.sessions_count} sessions</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading reports:', error);
  }
}

// Recommendations
async function loadRecommendations() {
  try {
    const response = await fetch(`${API_BASE}/api/ai/recommendations`, getAuthHeaders());
    const data = await response.json();
    
    const list = document.getElementById('recommendations-list');
    
    if (!data.recommendations || data.recommendations.length === 0) {
      list.innerHTML = '<p class="empty-state">No recommendations available</p>';
      return;
    }
    
    list.innerHTML = data.recommendations.map(rec => {
      return `
        <div class="recommendation-card ${rec.type}">
          <div class="recommendation-header">
            <span class="recommendation-icon">${rec.type === 'warning' ? '⚠️' : '💡'}</span>
            <span class="recommendation-title">${rec.title}</span>
          </div>
          <p class="recommendation-message">${rec.message}</p>
          <div class="recommendation-suggestion">
            <strong>Suggestion:</strong> ${rec.suggestion}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading recommendations:', error);
    document.getElementById('recommendations-list').innerHTML = '<p class="empty-state">Error loading recommendations</p>';
  }
}

// Utilities
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${state.token}`
  };
}

function formatDuration(seconds) {
  if (!seconds) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getScoreClass(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}