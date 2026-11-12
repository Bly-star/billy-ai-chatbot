const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const botNameInput = document.getElementById('bot-name');
const modelInput = document.getElementById('model-choice');
const systemPromptInput = document.getElementById('system-prompt');
const saveSettingsButton = document.getElementById('save-settings');
const apiStatus = document.getElementById('api-status');
const headerName = document.getElementById('header-name');

const DEFAULT_BOT_NAME = 'Billy';
const STORAGE_KEY = 'billy-ai-chatbot-settings';

let messages = [];

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const settings = raw ? JSON.parse(raw) : {};
  botNameInput.value = settings.botName || DEFAULT_BOT_NAME;
  modelInput.value = settings.model || 'gpt-5.4-mini';
  systemPromptInput.value = settings.systemPrompt || 'You are Billy, a helpful and thoughtful assistant. Be clear, warm, practical, and honest. When you are uncertain, say so directly instead of guessing.';
  headerName.textContent = botNameInput.value || DEFAULT_BOT_NAME;
}

function saveSettings() {
  const settings = {
    botName: botNameInput.value.trim() || DEFAULT_BOT_NAME,
    model: modelInput.value.trim() || 'gpt-5.4-mini',
    systemPrompt: systemPromptInput.value.trim() || 'You are Billy, a helpful and thoughtful assistant. Be clear, warm, practical, and honest. When you are uncertain, say so directly instead of guessing.'
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  headerName.textContent = settings.botName;
  apiStatus.textContent = 'Saved locally';
}

function addMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'Health check failed');
    }
    const botName = json.botName || DEFAULT_BOT_NAME;
    headerName.textContent = botName;
    if (!botNameInput.value.trim()) {
      botNameInput.value = botName;
    }
    apiStatus.textContent = json.configured ? 'OpenAI ready' : 'API key not configured yet';
    apiStatus.style.color = json.configured ? '#b8f7d3' : '#ffd3a8';
  } catch (error) {
    apiStatus.textContent = 'Backend unavailable';
    apiStatus.style.color = '#ffb4b4';
    console.error(error);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage('user', message);
  messages.push({ role: 'user', content: message });
  messageInput.value = '';
  messageInput.disabled = true;
  messageInput.placeholder = 'Billy is thinking…';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: messages.slice(-20),
        botName: botNameInput.value.trim() || DEFAULT_BOT_NAME,
        model: modelInput.value.trim() || 'gpt-5.4-mini',
        systemPrompt: systemPromptInput.value.trim() || 'You are Billy, a helpful and thoughtful assistant. Be clear, warm, practical, and honest. When you are uncertain, say so directly instead of guessing.'
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to get a reply');
    }

    const reply = payload.reply || 'I did not get a reply.';
    addMessage('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
  } catch (error) {
    addMessage('assistant', `Sorry — ${error.message}`);
  } finally {
    messageInput.disabled = false;
    messageInput.placeholder = 'Send a message to Billy…';
    messageInput.focus();
  }
}

loadSettings();
checkHealth();
saveSettingsButton.addEventListener('click', saveSettings);
chatForm.addEventListener('submit', sendMessage);
