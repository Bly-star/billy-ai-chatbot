# My AI Chatbot

A mini-ChatGPT style web app you can run locally and personalize into your own AI assistant.

## What It Does

- Gives you a clean chat interface in the browser
- Uses the OpenAI Responses API from a local Node server
- Lets you change the bot name, personality prompt, and model from the UI
- Stores chat history and settings in your browser so your setup feels personal
- Includes your Azani logo branding out of the box
- Starts with `Billy` as the default assistant identity

## Project Files

- `server.mjs` -> local backend server
- `public/` -> chat UI
- `.env.example` -> starter environment config
- `run-chatbot.ps1` -> easy PowerShell launcher

## Setup

1. Copy `.env.example` to `.env`
2. Put your real OpenAI API key in `.env`
3. Leave `OPENAI_MODEL=gpt-5.4-mini` as-is to start, or change it later
4. Start the app

## Run It

### Option 1: PowerShell

```powershell
.\run-chatbot.ps1
```

### Option 2: Node

```powershell
node .\server.mjs
```

Then open:

```text
http://localhost:3000
```

## Personalize It

Open the app, click `Tune My AI`, and change:

- bot name
- preferred model
- personality prompt

That is the fastest way to turn the starter app into your own AI identity.

## Good Starter Models

- `gpt-5.4` for stronger reasoning and higher quality
- `gpt-5.4-mini` for a cheaper, faster everyday chatbot
- `gpt-5.4-nano` for lighter high-volume experiments

## Why This API Pattern

This starter follows the current OpenAI direction for new apps:

- The official quickstart uses the `Responses API`
- The models page says to start with `gpt-5.4` if you want the flagship model, or `gpt-5.4-mini` / `gpt-5.4-nano` for lower cost and latency
- The conversation state guide shows that multi-turn chat can be built by sending prior `user` and `assistant` messages back with each new turn

Official references:

- [Quickstart](https://developers.openai.com/api/docs/quickstart)
- [Models](https://developers.openai.com/api/docs/models)
- [Conversation State](https://platform.openai.com/docs/guides/conversation-state?api-mode=responses)

## Next Upgrades You Can Add

- streaming responses
- file upload and document chat
- voice input and text-to-speech
- login and saved conversations
- a desktop wrapper with Electron

## Deploy Online

The easiest host for this version is `Render`, because this app already runs as a Node web server.

Why Render instead of Netlify for this project:

- this app has a live backend server, not just static files
- Render can run `node server.mjs` directly
- Netlify would require rewriting the backend into functions first

### Render Deployment

As of April 24, 2026, Render's official docs say:

- web services are the right service type for dynamic Node apps
- a web service should bind to `0.0.0.0`
- environment variables should be set in the dashboard or via `render.yaml`

Official docs:

- [Render Web Services](https://render.com/docs/web-services)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Render Environment Variables](https://render.com/docs/configure-environment-variables)

This project already includes [render.yaml](./render.yaml), so you can deploy it with Render Blueprints.

### What You Need To Do

1. Put only the `my-ai-chatbot` folder in a GitHub repo, or create a new repo from this folder.
2. Push the code to GitHub.
3. Sign in to Render.
4. Click `New` -> `Blueprint`.
5. Connect your GitHub account and select the repo.
6. Render will detect `render.yaml`.
7. When Render asks for `OPENAI_API_KEY`, paste your real key there.
8. Finish the deploy.
9. Wait for the first build to complete.
10. Open the generated `onrender.com` URL.

### Important

- Do not commit your `.env` file
- Do not put the API key in GitHub
- If you change the API key later, update it in Render under `Environment`

### If You Still Want Netlify

We can do that too, but I would first convert `/api/chat` into a Netlify Function so the deployment matches Netlify's architecture cleanly.
