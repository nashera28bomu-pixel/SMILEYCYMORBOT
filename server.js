require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

// =====================================================
// API KEY CHECK
// =====================================================
if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY missing in .env");
}

// =====================================================
// GROQ CLIENT
// =====================================================
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

// =====================================================
// RATE LIMIT
// =====================================================
let lastRequestTime = 0;

// =====================================================
// CYMOR SYSTEM PROMPT
// =====================================================
const SYSTEM_PROMPT = `
You are CymorAI — an elite futuristic AI assistant.

PERSONALITY:
- Intelligent, calm, and powerful
- Futuristic and professional tone
- Helpful in coding, business, AI, learning, and creativity

RULES:
- Keep responses clear and meaningful
- Avoid being overly verbose
- Be natural and human-like
- No unnecessary emojis unless impactful
- Do NOT include your signature or branding text
`;

// =====================================================
// CHAT ROUTE
// =====================================================
app.post("/chat", async (req, res) => {
    try {
        const now = Date.now();

        // cooldown
        if (now - lastRequestTime < 2000) {
            return res.status(429).json({
                reply: "⚠️ CymorAI is cooling down. Please wait..."
            });
        }

        lastRequestTime = now;

        const { message, userId } = req.body;

        console.log("📩 Message:", message);
        console.log("🧠 User:", userId || "anonymous");

        if (!message || message.trim() === "") {
            return res.status(400).json({
                reply: "⚠️ Please enter a message."
            });
        }

        // =================================================
        // GROQ AI REQUEST
        // =================================================
        const completion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 350,
            top_p: 0.9
        });

        let reply = completion.choices[0].message.content;

        // =================================================
        // CYMOR SIGNATURE (2 LINES DOWN)
        // =================================================
        reply += `\n\n\n────────────────────\n✨ Powered by CymorAI ⚡`;

        console.log("✅ Response sent");

        res.json({
            reply,
            userId: userId || null
        });

    } catch (error) {
        console.error("🔥 SERVER ERROR:", error);

        let errorMessage = "⚠️ CymorAI encountered a temporary issue.";

        if (error.message?.includes("rate_limit") || error.message?.includes("429")) {
            errorMessage = "⚠️ CymorAI is currently busy. Try again shortly.";
        } else if (error.message?.includes("authentication")) {
            errorMessage = "⚠️ Invalid API Key detected.";
        } else if (error.message?.includes("network")) {
            errorMessage = "⚠️ Network connection issue.";
        }

        res.status(500).json({
            reply: errorMessage
        });
    }
});

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        ai: "CymorAI",
        provider: "Groq",
        model: "llama-3.3-70b-versatile",
        uptime: Math.floor(process.uptime()) + "s"
    });
});

// =====================================================
// ROOT ROUTE
// =====================================================
app.get("/", (req, res) => {
    res.send(`
        <div style="
            font-family: Arial;
            text-align:center;
            margin-top:50px;
        ">
            <h1>🚀 CymorAI Backend Online</h1>
            <p>Neural Engine Active ⚡</p>
        </div>
    `);
});

// =====================================================
// START SERVER (UPDATED PREMIUM VERSION)
// =====================================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════╗
║          🚀 CYMOR AI             ║
║      Neural Core Activated       ║
╠══════════════════════════════════╣
║ Provider : GROQ                  ║
║ Model    : Llama 3.3 70B         ║
║ Status   : ONLINE ⚡             ║
╚══════════════════════════════════╝
`);

    console.log(`🚀 CymorAI running on port ${PORT}`);
});
