require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors"); // Added CORS

const app = express();
app.use(cors()); // Enable CORS for your frontend
app.use(express.json());
app.use(express.static("."));

let conversationHistory = [];

const SYSTEM_PROMPT = `
You are CymorAI, an intelligent, friendly, and slightly futuristic AI assistant.
- Be clear, helpful, and engaging
- Keep answers concise but powerful
- Sound confident and smart
- Occasionally feel human-like
`;

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage || userMessage.length > 1000) {
            return res.status(400).json({ reply: "Invalid message." });
        }

        conversationHistory.push({ role: "user", content: userMessage });

        if (conversationHistory.length > 10) {
            conversationHistory.shift();
        }

        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory
        ];

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                // UPDATED: Use a valid model like 'gpt-4o' or 'gpt-4o-mini'
                model: "gpt-4o-mini", 
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 15000 // Increased timeout for slower networks
            }
        );

        let reply = response.data.choices[0].message.content;

        conversationHistory.push({ role: "assistant", content: reply });

        // Add Cymor branding
        reply += "\n\n— Powered by Cymor";

        res.json({ reply });

    } catch (error) {
        console.error("🔥 ERROR:", error.response?.data || error.message);
        
        let message = "CymorAI is currently unavailable.";
        if (error.response?.status === 401) message = "Authentication error.";
        
        res.status(500).json({ reply: message });
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "OK", service: "CymorAI" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CymorAI running on port ${PORT}`);
});
