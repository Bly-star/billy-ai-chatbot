import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadEnvFile(path.join(__dirname, ".env"));

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const DEFAULT_BOT_NAME = process.env.BOT_NAME || "Billy";
const DEFAULT_SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "You are Billy, a helpful and thoughtful assistant. Be clear, warm, practical, and honest. When you are uncertain, say so directly instead of guessing.";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        configured: Boolean(OPENAI_API_KEY),
        defaultModel: DEFAULT_MODEL,
        botName: DEFAULT_BOT_NAME
      });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(req, res);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(url.pathname, req.method, res);
    }

    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "The local server hit an unexpected error." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`My AI chatbot is running on ${HOST}:${PORT}`);
});

async function handleChat(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 500, {
      error: "OPENAI_API_KEY is missing. Add it to a .env file or your environment variables."
    });
  }

  const body = await readJsonBody(req);
  const message = sanitizeText(body?.message, 4000);

  if (!message) {
    return sendJson(res, 400, { error: "Please send a message before chatting." });
  }

  const history = sanitizeHistory(body?.history);
  const botName = sanitizeText(body?.botName, 60) || DEFAULT_BOT_NAME;
  const model = sanitizeModel(body?.model) || DEFAULT_MODEL;
  const promptOverride = sanitizeText(body?.systemPrompt, 4000);
  const developerPrompt =
    promptOverride ||
    DEFAULT_SYSTEM_PROMPT.replaceAll("Billy", botName).replaceAll("billy", botName.toLowerCase());

  const input = [
    { role: "developer", content: developerPrompt },
    ...history,
    { role: "user", content: message }
  ];

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input
    })
  });

  const data = await safeParseJson(apiResponse);

  if (!apiResponse.ok) {
    const apiError =
      data?.error?.message ||
      data?.message ||
      "OpenAI returned an error while generating a reply.";
    return sendJson(res, apiResponse.status, { error: apiError });
  }

  const reply = extractOutputText(data);

  if (!reply) {
    return sendJson(res, 502, {
      error: "The AI did not return any text. Try again with a slightly different prompt."
    });
  }

  return sendJson(res, 200, {
    reply,
    modelUsed: data?.model || model
  });
}

async function serveStatic(rawPathname, method, res) {
  const pathname = rawPathname === "/" ? "/index.html" : rawPathname;
  const safePath = path.normalize(path.join(publicDir, decodeURIComponent(pathname)));

  if (!safePath.startsWith(publicDir)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  const filePath = existsSync(safePath) ? safePath : path.join(publicDir, "index.html");

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });

    if (method === "HEAD") {
      return res.end();
    }

    return res.end(file);
  } catch {
    return sendJson(res, 404, { error: "File not found." });
  }
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: sanitizeText(item.content, 4000)
    }))
    .filter((item) => item.content)
    .slice(-20);
}

function sanitizeModel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const model = value.trim();
  return /^[a-zA-Z0-9._:-]+$/.test(model) ? model : "";
}

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .map((item) => item?.text || item?.refusal || "")
    .join("\n")
    .trim();
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const file = readFileSync(filePath, "utf8");
  const lines = file.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
