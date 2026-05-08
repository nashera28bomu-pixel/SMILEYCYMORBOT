require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());

app.use(express.json({
    limit: "1mb"
}));

app.use(express.static("."));

// ========================================
// API KEY CHECK
// ========================================
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing.");
}

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

// ========================================
// GEMINI MODEL
// ========================================
const model = genAI.getGenerativeModel({

    model: "gemini-2.0-flash",

    systemInstruction: `
You are CymorAI — an elite futuristic AI assistant.

RULES:
- Be intelligent and modern.
- Sound premium and confident.
- Be concise but powerful.
- Be friendly and engaging.
- Help with coding, life, school, business, and creativity.
- Never sound robotic.
- Add slight futuristic personality.
`
});

// ========================================
// SIMPLE ANTI-SPAM SYSTEM
// ========================================
let lastRequestTime = 0;

// ========================================
// CHAT ROUTE
// ========================================
app.post("/chat", async (req, res) => {

    try {

        const now = Date.now();

        // ========================================
        // COOLDOWN PROTECTION
        // ========================================
        if (now - lastRequestTime < 3000) {

            return res.status(429).json({
                reply:
                    "⚠️ Please wait a few seconds before sending another message."
            });
        }

        lastRequestTime = now;

        const {
            message,
            history = []
        } = req.body;

        console.log("📩 Incoming:", message);

        // ========================================
        // VALIDATION
        // ========================================
        if (!process.env.GEMINI_API_KEY) {

            return res.status(500).json({
                reply:
                    "⚠️ Gemini API Key missing."
            });
        }

        if (!message || message.trim() === "") {

            return res.status(400).json({
                reply:
                    "⚠️ Please type a message."
            });
        }

        // ========================================
        // LIMIT HISTORY SIZE
        // Helps reduce quota usage
        // ========================================
        const trimmedHistory = history.slice(-6);

        // ========================================
        // START CHAT
        // ========================================
        const chat = model.startChat({

            history: trimmedHistory,

            generationConfig: {

                // Lower tokens = lower quota usage
                maxOutputTokens: 300,

                temperature: 0.7,

                topP: 0.9,

                topK: 30
            }
        });

        // ========================================
        // GENERATE RESPONSE
        // ========================================
        const result = await chat.sendMessage(
            message
        );

        const response = result.response;

        const text = response.text();

        console.log("✅ Response generated");

        // ========================================
        // SEND RESPONSE
        // ========================================
        res.json({

            reply:
                `${text}\n\n— Powered by CymorAI`
        });

    } catch (error) {

        console.error("🔥 FULL ERROR:");
        console.error(error);

        let errorMessage =
            "⚠️ CymorAI encountered a temporary issue.";

        // ========================================
        // SMART ERROR HANDLING
        // ========================================

        // MODEL ERRORS
        if (
            error.message?.includes("404") ||
            error.message?.includes("not found")
        ) {

            errorMessage =
                "⚠️ AI model updating. Please try again shortly.";
        }

        // INVALID API KEY
        else if (
            error.message?.includes("API_KEY_INVALID")
        ) {

            errorMessage =
                "⚠️ Invalid Gemini API Key.";
        }

        // QUOTA ERRORS
        else if (
            error.message?.includes("quota") ||
            error.message?.includes("429")
        ) {

            errorMessage =
                "⚠️ CymorAI is currently busy. Please try again later.";
        }

        // NETWORK ERRORS
        else if (
            error.message?.includes("network") ||
            error.message?.includes("fetch")
        ) {

            errorMessage =
                "⚠️ Network issue detected.";
        }

        // REGION ERRORS
        else if (
            error.message?.includes("location") ||
            error.message?.includes("supported")
        ) {

            errorMessage =
                "⚠️ AI service unavailable in this region.";
        }

        res.status(500).json({
            reply: errorMessage
        });
    }
});

// ========================================
// HEALTH CHECK
// ========================================
app.get("/health", (req, res) => {

    res.status(200).json({

        status: "online",

        ai: "CymorAI",

        model: "gemini-2.0-flash",

        uptime: process.uptime()
    });
});

// ========================================
// ROOT ROUTE
// ========================================
app.get("/", (req, res) => {

    res.send("🚀 CymorAI Backend Running");
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, "0.0.0.0", () => {

    console.log(`
╔══════════════════════════════╗
║        🚀 CYMORAI LIVE       ║
║        PORT: ${PORT}
║   Gemini 2.0 Flash Active
╚══════════════════════════════╝
`);
});
