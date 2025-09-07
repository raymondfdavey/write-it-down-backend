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
    "https://raymondfdavey.github.io",
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

// =============================================================================
// 🔧 ADMIN ENDPOINTS - Simple authentication for account management
// =============================================================================

// Admin login endpoint
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Generate a simple session token (in production, use JWT or similar)
    const sessionToken = Buffer.from(`${username}:${Date.now()}`).toString(
      "base64"
    );

    res.json({
      success: true,
      token: sessionToken,
      message: "Login successful",
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }
});

// Middleware to verify admin session
const verifyAdminSession = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No valid session token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [username, timestamp] = decoded.split(":");

    // Check if token is valid (username matches and token is less than 24 hours old)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (username === process.env.ADMIN_USERNAME && tokenAge < maxAge) {
      next();
    } else {
      res.status(401).json({ error: "Invalid or expired session" });
    }
  } catch (error) {
    res.status(401).json({ error: "Invalid session token" });
  }
};

// Get OpenRouter account info
app.get("/admin/account", verifyAdminSession, async (req, res) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // Return relevant account info
    res.json({
      success: true,
      account: {
        label: data.data?.label || "Unknown",
        usage: data.data?.usage || 0,
        limit: data.data?.limit || 0,
        is_free_tier: data.data?.is_free_tier || false,
        rate_limit: data.data?.rate_limit || {},
      },
    });
  } catch (error) {
    console.error("Admin Account Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch account info",
    });
  }
});

// Get usage stats
app.get("/admin/usage", verifyAdminSession, async (req, res) => {
  try {
    // OpenRouter doesn't have a specific usage endpoint, but we can get it from the key info
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    const usage = data.data?.usage || 0;
    const limit = data.data?.limit || 0;
    const remaining = limit - usage;
    const percentageUsed = limit > 0 ? ((usage / limit) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      usage: {
        used: usage,
        limit: limit,
        remaining: Math.max(0, remaining),
        percentage_used: percentageUsed,
        currency: "USD", // OpenRouter typically uses USD
      },
    });
  } catch (error) {
    console.error("Admin Usage Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch usage info",
    });
  }
});

// Simple admin dashboard HTML (optional - you can build your own frontend)
app.get("/admin", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .login-form, .dashboard { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            input, button { padding: 10px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; cursor: pointer; }
            .hidden { display: none; }
            .info-card { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>OpenRouter Admin Dashboard</h1>
        
        <div id="loginForm" class="login-form">
            <h3>Login</h3>
            <input type="text" id="username" placeholder="Username">
            <input type="password" id="password" placeholder="Password">
            <button onclick="login()">Login</button>
            <div id="loginError" style="color: red; margin-top: 10px;"></div>
        </div>
        
        <div id="dashboard" class="dashboard hidden">
            <h3>Account Information</h3>
            <button onclick="loadAccountInfo()">Refresh Account Info</button>
            <button onclick="logout()" style="background: #dc3545; float: right;">Logout</button>
            
            <div id="accountInfo" class="info-card">
                <p>Click "Refresh Account Info" to load your OpenRouter account details.</p>
            </div>
        </div>

        <script>
            let authToken = localStorage.getItem('adminToken');
            
            if (authToken) {
                showDashboard();
                loadAccountInfo();
            }
            
            async function login() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        authToken = data.token;
                        localStorage.setItem('adminToken', authToken);
                        showDashboard();
                        loadAccountInfo();
                    } else {
                        document.getElementById('loginError').textContent = data.error;
                    }
                } catch (error) {
                    document.getElementById('loginError').textContent = 'Login failed';
                }
            }
            
            function showDashboard() {
                document.getElementById('loginForm').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
            }
            
            function logout() {
                localStorage.removeItem('adminToken');
                authToken = null;
                document.getElementById('loginForm').classList.remove('hidden');
                document.getElementById('dashboard').classList.add('hidden');
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                document.getElementById('loginError').textContent = '';
            }
            
            async function loadAccountInfo() {
                try {
                    const [accountResponse, usageResponse] = await Promise.all([
                        fetch('/admin/account', {
                            headers: { 'Authorization': 'Bearer ' + authToken }
                        }),
                        fetch('/admin/usage', {
                            headers: { 'Authorization': 'Bearer ' + authToken }
                        })
                    ]);
                    
                    const accountData = await accountResponse.json();
                    const usageData = await usageResponse.json();
                    
                    if (accountData.success && usageData.success) {
                        const account = accountData.account;
                        const usage = usageData.usage;
                        
                        document.getElementById('accountInfo').innerHTML = \`
                            <h4>Account Details</h4>
                            <p><strong>Label:</strong> \${account.label}</p>
                            <p><strong>Account Type:</strong> \${account.is_free_tier ? 'Free Tier' : 'Paid'}</p>
                            
                            <h4>Usage Information</h4>
                            <p><strong>Used:</strong> $\${usage.used.toFixed(4)}</p>
                            <p><strong>Limit:</strong> $\${usage.limit.toFixed(2)}</p>
                            <p><strong>Remaining:</strong> $\${usage.remaining.toFixed(4)}</p>
                            <p><strong>Usage:</strong> \${usage.percentage_used}%</p>
                            
                            <div style="background: #e9ecef; border-radius: 4px; height: 20px; margin: 10px 0;">
                                <div style="background: \${usage.percentage_used > 80 ? '#dc3545' : '#007bff'}; height: 100%; border-radius: 4px; width: \${usage.percentage_used}%;"></div>
                            </div>
                        \`;
                    } else {
                        document.getElementById('accountInfo').innerHTML = '<p style="color: red;">Failed to load account info</p>';
                    }
                } catch (error) {
                    document.getElementById('accountInfo').innerHTML = '<p style="color: red;">Error loading account info</p>';
                }
            }
        </script>
    </body>
    </html>
  `);
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

      "POST /admin/login": "Admin login",
      "GET /admin/account": "Account info (requires auth)",
      "GET /admin/usage": "Usage info (requires auth)",
    },
    privacy: "No user data is stored or logged on this server",
    source: "https://github.com/your-username/your-repo-name",
  });
});

app.listen(PORT, () => {
  console.log(`Privacy-first diary proxy running on port ${PORT}`);
  console.log(`Admin dashboard available at /admin`);
  console.log(`No user data is stored or logged on this server`);
});
