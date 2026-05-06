require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CRITICAL CORS CONFIGURATION ---
app.use(cors({ 
    origin: "*", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"] 
}));

app.use(express.json());
app.use(express.static("."));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are CymorAI, an intelligent, friendly, and slightly futuristic AI assistant.
- Be clear, helpful, and engaging
- Keep answers concise but powerful
- Sound confident and smart
- Occasionally feel human-like`
});

// Start chat session
const chat = model.startChat({
    history: [],
});

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage || userMessage.length > 1000) {
            return res.status(400).json({ reply: "Invalid message." });
        }

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        let reply = response.text();

        reply += "\n\n— Powered by Cymor";

        res.json({ reply });

    } catch (error) {
        console.error("🔥 ERROR:", error.message);
        res.status(500).json({ reply: "CymorAI is currently unavailable." });
    }
});

// Updated Healthcheck for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Port configuration for Railway compatibility
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CymorAI running on port ${port}`);
});
