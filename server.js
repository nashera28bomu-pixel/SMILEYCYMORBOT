require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Use the port Render or Railway provides, default to 3000 if not set
const PORT = process.env.PORT || 3000;

// --- CORS CONFIGURATION ---
app.use(cors()); 
app.use(express.json());

// Serve static files (your index.html, css, js)
app.use(express.static("."));

// Initialize Gemini
// Ensure GEMINI_API_KEY is added to your Render Environment Variables
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

        // Fresh session for every request to prevent global session hangs
        const chat = model.startChat({
            history: req.body.history || [], 
        });

        // Set a 25-second timeout for the AI response
        // This prevents the frontend from being "stuck" if the API is slow
        const resultPromise = chat.sendMessage(userMessage);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request Timeout")), 25000)
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        res.json({ 
            reply: `${text}\n\n— Powered by Cymor`
        });

    } catch (error) {
        console.error("🔥 CymorAI Error:", error.message);
        
        let errorMessage = "CymorAI is taking a nap. Try again in a moment.";
        
        if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "System Error: API Key is invalid or missing.";
        } else if (error.message === "Request Timeout") {
            errorMessage = "The AI is taking too long to think. Please try a shorter prompt.";
        }

        res.status(500).json({ reply: errorMessage });
    }
});

// Healthcheck for platform stability
app.get('/health', (req, res) => {
    res.status(200).send('Systems Online');
});

// Bind to 0.0.0.0 so the host can access the container
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CymorAI is live on port ${PORT}`);
});
