// Vercel Serverless Function entry point
// Uses dynamic import since backend uses ESM ("type": "module")
export default async function handler(req, res) {
  const { default: app } = await import('../backend/server.js');
  return app(req, res);
}
