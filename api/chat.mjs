export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    if (!OPENAI_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'OPENAI_API_KEY is missing. Add it to Vercel project env or GitHub secrets.' }));
    }

    const body = await readJsonBody(req);
    const message = sanitizeText(body?.message, 4000);
    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Please send a message before chatting.' }));
    }

    const history = sanitizeHistory(body?.history);
    const botName = sanitizeText(body?.botName, 60) || (process.env.BOT_NAME || 'Billy');
    const model = sanitizeModel(body?.model) || (process.env.OPENAI_MODEL || 'gpt-5.4-mini');
    const promptOverride = sanitizeText(body?.systemPrompt, 4000);
    const DEFAULT_SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
      'You are Billy, a helpful and thoughtful assistant. Be clear, warm, practical, and honest. When you are uncertain, say so directly instead of guessing.';

    const developerPrompt = promptOverride || DEFAULT_SYSTEM_PROMPT.replaceAll('Billy', botName).replaceAll('billy', botName.toLowerCase());

    const input = [
      { role: 'developer', content: developerPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, input })
    });

    const data = await safeParseJson(apiResponse);

    if (!apiResponse.ok) {
      const apiError = data?.error?.message || data?.message || 'OpenAI returned an error while generating a reply.';
      res.writeHead(apiResponse.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: apiError }));
    }

    const reply = extractOutputText(data);
    if (!reply) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'The AI did not return any text. Try again with a slightly different prompt.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ reply, modelUsed: data?.model || model }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Internal server error.' }));
  }
}

// Helpers
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return {}; }
}

async function safeParseJson(response) {
  try { return await response.json(); } catch { return null; }
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  if (!Array.isArray(data?.output)) return '';
  return data.output
    .flatMap(item => Array.isArray(item?.content) ? item.content : [])
    .map(item => item?.text || item?.refusal || '')
    .join('\n')
    .trim();
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
    .map(item => ({ role: item.role, content: sanitizeText(item.content, 4000) }))
    .filter(item => item.content)
    .slice(-20);
}

function sanitizeModel(value) {
  if (typeof value !== 'string') return '';
  const model = value.trim();
  return /^[a-zA-Z0-9._:-]+$/.test(model) ? model : '';
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
