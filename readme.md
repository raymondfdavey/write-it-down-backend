# Diary Assistant - Privacy-First Proxy

A minimal, secure proxy server for the Diary Assistant journaling app. This server exists solely to keep API keys secure while ensuring zero data storage.

## 🔒 Privacy & Security

**Your data stays with you.** This proxy server forwards requests without storing anything:

### What this server does:

- ✅ Forwards your messages to OpenRouter AI
- ✅ Returns AI responses back to you
- ✅ Keeps API keys secure
- ✅ Provides CORS headers for browser access

### What this server NEVER does:

- ❌ Stores your conversations
- ❌ Logs your messages
- ❌ Analyzes your data
- ❌ Shares data with anyone
- ❌ Keeps any records

## 🚀 API Endpoints

- `POST /api/chat` - Secure proxy to OpenRouter (main endpoint)
- `GET /health` - Health check
- `GET /` - Server info and endpoints

## 🛠 Environment Variables

Set these in your Heroku dashboard (never in code):

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
MODEL=your-preferred-model
```

## 📦 Deployment

```bash
# Clone and setup
git clone your-repo-url
cd your-repo-name
npm install

# Deploy to Heroku
heroku create your-app-name
heroku config:set OPENROUTER_API_KEY=your-key
heroku config:set MODEL=your-model
git push heroku main
```

## 🔍 Open Source Transparency

The entire server is just ~80 lines of clearly commented code. You can inspect every line to verify:

1. No database connections
2. No data storage
3. No logging of user messages
4. Simple request forwarding

## ⚡ Performance

This proxy adds minimal latency (~10-50ms) while providing:

- Server-to-server connections (often faster than browser-direct)
- No cold starts on paid Heroku plans
- CORS handling for browser requests

---

**Questions about privacy?** Read the source code - it's all here and commented for transparency.
