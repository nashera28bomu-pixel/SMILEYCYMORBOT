require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json());
// Ensure your index.html, style.css, and script.js are in the same directory
app.use(express.static(".")); 

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
    const userHistory = req.body.history || [];
    
    console.log(`📩 Incoming: "${userMessage}"`);

    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ MISSING API KEY in Environment Variables");
            return res.status(500).json({ reply: "Configuration error: API Key missing." });
        }

        if (!userMessage || userMessage.trim().length === 0) {
            return res.status(400).json({ reply: "Message cannot be empty." });
        }

        const chat = model.startChat({ history: userHistory });

        // Increased timeout to 60s to handle Render's free tier wake-up time
        const resultPromise = chat.sendMessage(userMessage);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request Timeout")), 60000)
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        console.log("✅ AI Response generated successfully");
        
        res.json({ 
            reply: `${text}\n\n— Powered by Cymor`
        });

    } catch (error) {
        console.error("🔥 Server Error Details:", error);
        
        let errorMessage = "CymorAI is having trouble connecting. Try again.";
        
        if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "System Error: Invalid API Key.";
        } else if (error.message === "Request Timeout") {
            errorMessage = "The AI is taking too long to wake up. Please try one more time.";
        }

        res.status(500).json({ reply: errorMessage });
    }
});

app.get('/health', (req, res) => res.status(200).send('Systems Online'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CymorAI active on port ${PORT}`);
});
