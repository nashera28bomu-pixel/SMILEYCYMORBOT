require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json());
app.use(express.static(".")); 

// --- AI INITIALIZATION ---
// Ensure the API Key is present before initializing
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fix: Use the full model path 'models/gemini-1.5-flash' to avoid 404 errors
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
    const { message, history = [] } = req.body;
    
    console.log(`📩 Incoming: "${message}"`);

    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ reply: "Configuration error: API Key missing." });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ reply: "Message cannot be empty." });
        }

        // Initialize chat with history
        const chat = model.startChat({ 
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Use a standard async call. The SDK handles most internal timeouts.
        // On Render free tier, the 50s spin-up delay is handled by the browser request, 
        // not the internal JS code.
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        console.log("✅ AI Response generated successfully");
        
        res.json({ 
            reply: `${text}\n\n— Powered by Cymor`
        });

    } catch (error) {
        console.error("🔥 Server Error Details:", error);
        
        let errorMessage = "CymorAI is having trouble connecting. Try again.";
        
        // Specific error handling for common API issues
        if (error.message.includes("404") || error.message.includes("not found")) {
            errorMessage = "Model version mismatch. Please contact admin.";
        } else if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "System Error: Invalid API Key.";
        } else if (error.message.includes("safety")) {
            errorMessage = "I cannot answer that due to safety guidelines.";
        }

        res.status(500).json({ reply: errorMessage });
    }
});

app.get('/health', (req, res) => res.status(200).send('Systems Online'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CymorAI active on port ${PORT}`);
});
