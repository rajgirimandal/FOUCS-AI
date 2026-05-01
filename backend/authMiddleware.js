const jwt = require('jsonwebtoken');
const { findUserById } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'focus-ai-secret-key-2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    const dbUser = findUserById(user.id);
    if (!dbUser) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    req.user = dbUser;
    next();
  });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken
};