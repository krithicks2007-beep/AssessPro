// Vercel Serverless Function entry point
// This file re-exports the Express app from backend/server.js
// so Vercel can route /api/* requests to it.

import app from '../backend/server.js';

export default app;
