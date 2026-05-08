require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ===============================
// API KEY CHECK
// ===============================
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===============================
// UPDATED GEMINI MODEL
// ===============================
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",

    systemInstruction: `
You are CymorAI — an elite futuristic AI assistant.

Rules:
- Be intelligent and confident.
- Be friendly and engaging.
- Keep answers concise but useful.
- Sound modern and premium.
- Never mention being an AI model unless necessary.
- Add slight futuristic personality.
`
});

// ===============================
// CHAT ROUTE
// ===============================
app.post("/chat", async (req, res) => {

    try {

        const { message, history = [] } = req.body;

        console.log("📩 Incoming Message:", message);

        // -------------------------------
        // VALIDATION
        // -------------------------------
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                reply: "⚠️ Missing Gemini API Key."
            });
        }

        if (!message || message.trim() === "") {
            return res.status(400).json({
                reply: "⚠️ Please enter a message."
            });
        }

        // -------------------------------
        // START CHAT
        // -------------------------------
        const chat = model.startChat({
            history,

            generationConfig: {
                maxOutputTokens: 1200,
                temperature: 0.8,
                topP: 0.95,
                topK: 40
            }
        });

        // -------------------------------
        // SEND MESSAGE
        // -------------------------------
        const result = await chat.sendMessage(message);

        const response = result.response;

        const text = response.text();

        console.log("✅ Response Generated");

        // -------------------------------
        // RETURN RESPONSE
        // -------------------------------
        res.json({
            reply: `${text}\n\n— Powered by CymorAI`
        });

    } catch (error) {

        console.error("🔥 FULL SERVER ERROR:");
        console.error(error);

        let errorMessage =
            "⚠️ CymorAI encountered a temporary issue.";

        // -------------------------------
        // ERROR HANDLING
        // -------------------------------
        if (
            error.message?.includes("404") ||
            error.message?.includes("not found")
        ) {
            errorMessage =
                "⚠️ AI model unavailable. System updating...";
        }

        else if (
            error.message?.includes("API_KEY_INVALID")
        ) {
            errorMessage =
                "⚠️ Invalid Gemini API Key.";
        }

        else if (
            error.message?.includes("quota")
        ) {
            errorMessage =
                "⚠️ API quota exceeded. Try again later.";
        }

        else if (
            error.message?.includes("network")
        ) {
            errorMessage =
                "⚠️ Network issue detected.";
        }

        res.status(500).json({
            reply: errorMessage
        });
    }
});

// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "online",
        ai: "CymorAI",
        model: "gemini-2.0-flash"
    });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {

    console.log(`
╔══════════════════════════════╗
║      🚀 CYMORAI ONLINE       ║
║      Port: ${PORT}
╚══════════════════════════════╝
`);
});
