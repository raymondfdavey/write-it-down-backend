// Load environment variables for local development
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Restrictive CORS - only allow your frontend domain
const corsOptions = {
  origin: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Alternative dev port
    "https://raymondfdavey.github.io/write-it-down-frontend/",
    "https://your-app.vercel.app", // If using Vercel
    "https://your-app.netlify.app", // If using Netlify
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// =============================================================================
// 🔒 PRIVACY-FIRST API PROXY - No data storage, no logging, no tracking
// =============================================================================
// This proxy exists solely to keep API keys secure. It forwards your requests
// to OpenRouter without storing, logging, or analyzing your conversations.
//
// What this server does:
// ✅ Forwards your message to OpenRouter
// ✅ Returns OpenRouter's response
// ✅ Keeps API key secure
//
// What this server NEVER does:
// ❌ Store your conversations
// ❌ Log your messages
// ❌ Analyze your data
// ❌ Share your data with anyone
// ❌ Keep any records
// =============================================================================

app.post("/api/chat", async (req, res) => {
  try {
    // Simple authentication check
    const authHeader = req.headers["x-api-key"];
    if (!authHeader || authHeader !== process.env.FRONTEND_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { messages, temperature = 0.8, top_p = 1 } = req.body;

    // Direct proxy to OpenRouter - no data stored anywhere
    const response = await fetch(process.env.API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MODEL,
        messages,
        temperature,
        top_p,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // Return response immediately - no storage, no logging
    res.json(data);
  } catch (error) {
    // Only log errors for debugging, never log user data
    console.error("API Proxy Error (no user data logged):", {
      timestamp: new Date().toISOString(),
      error: error.message,
      status: error.status || "unknown",
    });

    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Privacy-first diary proxy is running",
    timestamp: new Date().toISOString(),
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Diary Assistant Privacy-First Proxy",
    endpoints: {
      "POST /api/chat": "Secure proxy to OpenRouter",
      "GET /health": "Health check",
    },
    privacy: "No user data is stored or logged on this server",
    source: "https://github.com/your-username/your-repo-name",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Privacy-first diary proxy running on port ${PORT}`);
  console.log(`📝 No user data is stored or logged on this server`);
});
