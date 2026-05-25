let handler;

try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in environment variables');
  if (!process.env.JWT_SECRET)   throw new Error('JWT_SECRET is not set in environment variables');

  handler = require('../backend/api/index');
} catch (startupErr) {
  console.error('Function startup failed:', startupErr);
  handler = (_req, res) => {
    res.status(500).json({ error: 'Startup error: ' + startupErr.message });
  };
}

module.exports = handler;
