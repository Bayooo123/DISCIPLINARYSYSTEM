// Vercel serverless entry point — imports and re-exports the Express app.
// Vercel's @vercel/node runtime picks this up automatically.
require('dotenv').config();
const app = require('../src/app');
module.exports = app;
