require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Render automatically assigns a PORT, default to 3000 for local testing
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json());
app.use(express.static(".")); // Serves your index.html and script.js

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are CymorAI, an intelligent, friendly, and slightly futuristic AI assistant.
- Be clear, helpful, and engaging.
- Keep answers concise but powerful.
- Sound confident and smart.
- Occasionally feel human-like.`
});

// --- ROUTES ---

app.post("/chat", async (req, res) => {
    const userMessage = req.body.message;
    console.log("📩 Received message:", userMessage);

    try {
        // 1. Check if API Key exists in Environment Variables
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ ERROR: GEMINI_API_KEY is not set in Render Environment Variables.");
            return res.status(500).json({ reply: "Server configuration error: Missing API Key." });
        }

        // 2. Validate input
        if (!userMessage || userMessage.trim().length === 0) {
            return res.status(400).json({ reply: "Please say something!" });
        }

        // 3. Start Chat Session
        const chat = model.startChat({
            history: req.body.history || [], 
        });

        // 4. Create a timeout to prevent Render from hanging the request indefinitely
        const resultPromise = chat.sendMessage(userMessage);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request Timeout")), 25000)
        );

        // Race the AI response against the 25s timeout
        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        console.log("✅ AI Responded successfully");
        
        res.json({ 
            reply: `${text}\n\n— Powered by Cymor`
        });

    } catch (error) {
        console.error("🔥 CymorAI Error:", error.message);
        
        let errorMessage = "CymorAI is having trouble connecting. Try again.";
        
        if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "System Error: API Key is invalid.";
        } else if (error.message === "Request Timeout") {
            errorMessage = "The AI is taking too long to think. Try a shorter message.";
        }

        res.status(500).json({ reply: errorMessage });
    }
});

// Healthcheck endpoint for Render monitoring
app.get('/health', (req, res) => {
    res.status(200).send('Systems Online');
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CymorAI active on port ${PORT}`);
    console.log(`📡 Ready to receive requests at /chat`);
});
