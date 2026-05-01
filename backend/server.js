const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  findUserByEmail,
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
} = require('./database');
const { generateToken, authenticateToken } = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes

// 1. Authentication APIs

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, classGrade, goals } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = createUser(name, email, password, classGrade || '', goals || '');
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        classGrade: user.class,
        goals: user.goals
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        classGrade: user.class,
        goals: user.goals
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      classGrade: req.user.class,
      goals: req.user.goals,
      createdAt: req.user.created_at
    }
  });
});

// Update profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, classGrade, goals } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (classGrade) updates.class = classGrade;
    if (goals) updates.goals = goals;

    const updatedUser = updateUserProfile(req.user.id, updates);
    
    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        classGrade: updatedUser.class,
        goals: updatedUser.goals
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

// 2. Session APIs

// Start a new study session
app.post('/api/sessions', authenticateToken, (req, res) => {
  try {
    const { mode } = req.body;
    const session = createSession(req.user.id, mode || 'study');
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({ error: 'Server error starting session' });
  }
});

// Get session by ID
app.get('/api/sessions/:id', authenticateToken, (req, res) => {
  try {
    const session = getSessionById(req.params.id);
    
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error getting session' });
  }
});

// Update session (pause, resume, end)
app.put('/api/sessions/:id', authenticateToken, (req, res) => {
  try {
    const session = getSessionById(req.params.id);
    
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { total_duration, active_duration, focus_score, status, end_time } = req.body;
    const updates = {};
    
    if (total_duration !== undefined) updates.total_duration = total_duration;
    if (active_duration !== undefined) updates.active_duration = active_duration;
    if (focus_score !== undefined) updates.focus_score = focus_score;
    if (status) updates.status = status;
    if (end_time) updates.end_time = end_time;
    else if (status === 'completed') updates.end_time = new Date().toISOString();

    const updatedSession = updateSession(req.params.id, updates);
    
    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Session update error:', error);
    res.status(500).json({ error: 'Server error updating session' });
  }
});

// Get user's session history
app.get('/api/sessions', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const sessions = getUserSessions(req.user.id, limit);
    
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error getting sessions' });
  }
});

// Get today's sessions
app.get('/api/sessions/today', authenticateToken, (req, res) => {
  try {
    const sessions = getUserSessionsToday(req.user.id);
    res.json({ sessions });
  } catch (error) {
    console.error('Get today sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get this week's sessions
app.get('/api/sessions/week', authenticateToken, (req, res) => {
  try {
    const sessions = getUserSessionsThisWeek(req.user.id);
    res.json({ sessions });
  } catch (error) {
    console.error('Get week sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Activity Logging APIs

// Log activity event
app.post('/api/activities', authenticateToken, (req, res) => {
  try {
    const { session_id, event_type, event_data } = req.body;
    
    if (!session_id || !event_type) {
      return res.status(400).json({ error: 'Session ID and event type are required' });
    }

    const session = getSessionById(session_id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    logActivity(session_id, event_type, event_data || {});
    
    res.json({ success: true });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Server error logging activity' });
  }
});

// Get session activities
app.get('/api/activities/:sessionId', authenticateToken, (req, res) => {
  try {
    const session = getSessionById(req.params.sessionId);
    
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const activities = getSessionActivity(req.params.sessionId);
    
    res.json({ activities });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server error getting activities' });
  }
});

// 4. Stats & Dashboard APIs

// Get user stats
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    const stats = getUserStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error getting stats' });
  }
});

// 5. Reports APIs

// Generate/update weekly report
app.post('/api/reports/weekly', authenticateToken, (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const weekStart = new Date(today.setDate(diff));
    const weekEnd = new Date(today.setDate(diff + 6));
    
    const report = createOrUpdateWeeklyReport(
      req.user.id,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0]
    );
    
    res.json({ report });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Server error generating report' });
  }
});

// Get weekly reports
app.get('/api/reports', authenticateToken, (req, res) => {
  try {
    const reports = getWeeklyReports(req.user.id);
    res.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error getting reports' });
  }
});

// 6. AI Recommendations API (rule-based)

app.get('/api/ai/recommendations', authenticateToken, (req, res) => {
  try {
    const stats = getUserStats(req.user.id);
    const weekSessions = getUserSessionsThisWeek(req.user.id);
    
    const recommendations = [];
    
    // Analyze patterns
    if (stats.week.avg_focus_score < 70) {
      recommendations.push({
        type: 'warning',
        category: 'focus',
        title: 'Low Focus Score',
        message: 'Your average focus score this week is below 70%. Try shorter study sessions (25-30 mins) with breaks.',
        suggestion: 'Use Pomodoro technique: 25 min study, 5 min break'
      });
    }
    
    // Check best study times
    if (weekSessions.length > 0) {
      const hours = weekSessions.map(s => new Date(s.start_time).getHours());
      const hourCounts = {};
      hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
      
      const bestHour = Object.keys(hourCounts).reduce((a, b) => 
        hourCounts[a] > hourCounts[b] ? a : b, '0');
      
      recommendations.push({
        type: 'tip',
        category: 'timing',
        title: 'Best Study Time',
        message: `You tend to study most around ${bestHour}:00. This appears to be your peak productivity time.`,
        suggestion: `Schedule important study tasks around ${bestHour}:00`
      });
    }
    
    // Check session lengths
    if (stats.week.sessions_count > 0) {
      const avgSessionLength = stats.week.total_time / stats.week.sessions_count;
      if (avgSessionLength > 90) {
        recommendations.push({
          type: 'tip',
          category: 'efficiency',
          title: 'Long Sessions',
          message: 'Your average session is over 90 minutes. Consider breaking into shorter sessions.',
          suggestion: 'Split into 45-min focused sessions with 10-min breaks'
        });
      }
    }
    
    // Check idle patterns
    const idleEvents = weekSessions.flatMap(s => 
      getSessionActivity(s.id).filter(a => a.event_type === 'idle')
    );
    
    if (idleEvents.length > 3) {
      recommendations.push({
        type: 'tip',
        category: 'habit',
        title: 'Manage Idle Time',
        message: `You've had ${idleEvents.length} idle events this week. Clear distractions before studying.`,
        suggestion: 'Put phone away, close unnecessary tabs'
      });
    }
    
    // General tips
    if (recommendations.length < 2) {
      recommendations.push({
        type: 'tip',
        category: 'general',
        title: 'Consistency',
        message: 'Great progress! Keep maintaining your study routine.',
        suggestion: 'Try to study at the same time each day'
      });
    }
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Server error getting recommendations' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Focus AI Backend running on http://localhost:${PORT}`);
});