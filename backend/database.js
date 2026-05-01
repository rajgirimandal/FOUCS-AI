const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'focusai.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    class TEXT,
    goals TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Study sessions table
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    total_duration INTEGER DEFAULT 0,
    active_duration INTEGER DEFAULT 0,
    focus_score REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Activity logs table
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  -- Reports table
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_study_time INTEGER DEFAULT 0,
    avg_focus_score REAL DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    trend TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_reports_week ON reports(week_start, week_end);
`);

console.log('Database initialized successfully');

// Helper functions
function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function createUser(name, email, password, classGrade = '', goals = '') {
  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password, class, goals)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, email, hashedPassword, classGrade, goals);
  return findUserById(id);
}

function updateUserProfile(id, updates) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (['name', 'class', 'goals'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return findUserById(id);
}

function createSession(userId, mode) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, mode, start_time)
    VALUES (?, ?, ?, datetime('now'))
  `);
  stmt.run(id, userId, mode);
  return getSessionById(id);
}

function getSessionById(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function updateSession(id, updates) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (['end_time', 'total_duration', 'active_duration', 'focus_score', 'status'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  values.push(id);
  
  const stmt = db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getSessionById(id);
}

function getUserSessions(userId, limit = 50) {
  return db.prepare(`
    SELECT * FROM sessions 
    WHERE user_id = ? 
    ORDER BY start_time DESC 
    LIMIT ?
  `).all(userId, limit);
}

function getUserSessionsToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT * FROM sessions 
    WHERE user_id = ? AND date(start_time) = ?
    ORDER BY start_time DESC
  `).all(userId, today);
}

function getUserSessionsThisWeek(userId) {
  return db.prepare(`
    SELECT * FROM sessions 
    WHERE user_id = ? AND start_time >= datetime('now', '-7 days')
    ORDER BY start_time DESC
  `).all(userId);
}

function logActivity(sessionId, eventType, eventData = {}) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO activity_logs (id, session_id, event_type, event_data)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, sessionId, eventType, JSON.stringify(eventData));
}

function getSessionActivity(sessionId) {
  return db.prepare(`
    SELECT * FROM activity_logs 
    WHERE session_id = ? 
    ORDER BY timestamp DESC
  `).all(sessionId);
}

function createOrUpdateWeeklyReport(userId, weekStart, weekEnd) {
  const existingReport = db.prepare(`
    SELECT * FROM reports 
    WHERE user_id = ? AND week_start = ? AND week_end = ?
  `).get(userId, weekStart, weekEnd);

  const sessions = db.prepare(`
    SELECT 
      SUM(total_duration) as total_time,
      AVG(focus_score) as avg_score,
      COUNT(*) as count
    FROM sessions 
    WHERE user_id = ? AND start_time >= ? AND start_time <= ?
  `).get(userId, weekStart, weekEnd + ' 23:59:59');

  const totalStudyTime = sessions?.total_time || 0;
  const avgFocusScore = sessions?.avg_score || 0;
  const sessionsCount = sessions?.count || 0;

  // Calculate trend (compare to previous week)
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
  
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

  const prevSessions = db.prepare(`
    SELECT AVG(focus_score) as avg_score
    FROM sessions 
    WHERE user_id = ? AND start_time >= ? AND start_time <= ?
  `).get(userId, prevWeekStartStr, prevWeekEndStr + ' 23:59:59');

  let trend = 'stable';
  if (prevSessions?.avg_score) {
    const diff = avgFocusScore - prevSessions.avg_score;
    if (diff > 5) trend = 'improving';
    else if (diff < -5) trend = 'declining';
  }

  const id = existingReport?.id || uuidv4();
  
  if (existingReport) {
    db.prepare(`
      UPDATE reports SET 
        total_study_time = ?,
        avg_focus_score = ?,
        sessions_count = ?,
        trend = ?
      WHERE id = ?
    `).run(totalStudyTime, avgFocusScore, sessionsCount, trend, id);
  } else {
    db.prepare(`
      INSERT INTO reports (id, user_id, week_start, week_end, total_study_time, avg_focus_score, sessions_count, trend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, weekStart, weekEnd, totalStudyTime, avgFocusScore, sessionsCount, trend);
  }

  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}

function getWeeklyReports(userId) {
  return db.prepare(`
    SELECT * FROM reports 
    WHERE user_id = ? 
    ORDER BY week_start DESC
    LIMIT 12
  `).all(userId);
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function getUserStats(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const todayStats = db.prepare(`
    SELECT 
      COALESCE(SUM(total_duration), 0) as total_time,
      COALESCE(AVG(focus_score), 0) as avg_focus_score,
      COUNT(*) as sessions_count
    FROM sessions 
    WHERE user_id = ? AND date(start_time) = ?
  `).get(userId, today);

  const weekStats = db.prepare(`
    SELECT 
      COALESCE(SUM(total_duration), 0) as total_time,
      COALESCE(AVG(focus_score), 0) as avg_focus_score,
      COUNT(*) as sessions_count
    FROM sessions 
    WHERE user_id = ? AND start_time >= datetime('now', '-7 days')
  `).get(userId);

  const allTimeStats = db.prepare(`
    SELECT 
      COALESCE(SUM(total_duration), 0) as total_time,
      COALESCE(AVG(focus_score), 0) as avg_focus_score,
      COUNT(*) as sessions_count
    FROM sessions 
    WHERE user_id = ?
  `).get(userId);

  return {
    today: todayStats,
    week: weekStats,
    allTime: allTimeStats
  };
}

module.exports = {
  db,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserProfile,
  createSession,
  getSessionById,
  updateSession,
  getUserSessions,
  getUserSessionsToday,
  getUserSessionsThisWeek,
  logActivity,
  getSessionActivity,
  createOrUpdateWeeklyReport,
  getWeeklyReports,
  verifyPassword,
  getUserStats
};