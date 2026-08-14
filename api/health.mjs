export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  const configured = Boolean(process.env.OPENAI_API_KEY);
  const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const DEFAULT_BOT_NAME = process.env.BOT_NAME || 'Billy';

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  return res.end(JSON.stringify({ ok: true, configured, defaultModel: DEFAULT_MODEL, botName: DEFAULT_BOT_NAME }));
}