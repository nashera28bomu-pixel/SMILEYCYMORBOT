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
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing in Environment Variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * FIX: Updated model string to "gemini-1.5-flash-latest".
 * This helps avoid the 404 error seen in your Render logs by 
 * pointing to the most stable production endpoint.
 */
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", 
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
                temperature: 0.7,
            },
        });

        // Sending the message
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
        
        // Handling the 404/Mismatch error explicitly
        if (error.message.includes("404") || error.message.includes("not found")) {
            errorMessage = "CymorAI version mismatch. Try refreshing the page.";
            console.log("Tip: Ensure your API key has access to the Flash model in your region.");
        } else if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "System Error: Invalid API Key.";
        } else if (error.message.includes("safety")) {
            errorMessage = "I cannot answer that due to safety guidelines.";
        }

        res.status(500).json({ reply: errorMessage });
    }
});

// Health check for Render monitoring
app.get('/health', (req, res) => res.status(200).send('Systems Online'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CymorAI active on port ${PORT}`);
});
