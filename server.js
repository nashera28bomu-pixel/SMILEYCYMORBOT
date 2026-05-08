require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CORS CONFIGURATION ---
app.use(cors()); // Simplified for general compatibility
app.use(express.json());
app.use(express.static("."));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are CymorAI, an intelligent, friendly, and slightly futuristic AI assistant.
- Be clear, helpful, and engaging.
- Keep answers concise but powerful.
- Sound confident and smart.
- Occasionally feel human-like.`
});

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage || userMessage.trim().length === 0) {
            return res.status(400).json({ reply: "Please say something!" });
        }

        if (userMessage.length > 2000) {
            return res.status(400).json({ reply: "Message is too long." });
        }

        // Start a fresh chat session per request (or pass history from frontend)
        // This prevents the server from hanging on a single corrupted global session
        const chat = model.startChat({
            history: req.body.history || [], 
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        res.json({ 
            reply: `${text}\n\n— Powered by Cymor`,
            // Send back history if you want to support multi-turn later
        });

    } catch (error) {
        console.error("🔥 CymorAI Error:", error.message);
        
        // Handle specific API Key error
        if (error.message.includes("API_KEY_INVALID")) {
            return res.status(500).json({ reply: "System Error: Invalid API Key." });
        }

        res.status(500).json({ reply: "CymorAI is taking a nap. Try again in a moment." });
    }
});

// Healthcheck
app.get('/health', (req, res) => {
    res.status(200).send('Systems Online');
});

// Port configuration
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CymorAI running on port ${port}`);
});
