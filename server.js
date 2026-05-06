require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.static(".")); // serve frontend

// Simple in-memory chat history (per session idea)
let conversationHistory = [];

// 🔥 CymorAI Personality
const SYSTEM_PROMPT = `
You are CymorAI, an intelligent, friendly, and slightly futuristic AI assistant.
- Be clear, helpful, and engaging
- Keep answers concise but powerful
- Sound confident and smart
- Occasionally feel human-like
`;

// 🧠 Chat Endpoint
app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        // 🚨 Validation
        if (!userMessage || userMessage.length > 1000) {
            return res.status(400).json({
                reply: "Invalid message."
            });
        }

        // Add user message to memory
        conversationHistory.push({ role: "user", content: userMessage });

        // Limit memory (last 10 messages)
        if (conversationHistory.length > 10) {
            conversationHistory.shift();
        }

        // Build messages array
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory
        ];

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4.1-mini",
                messages: messages,
                temperature: 0.7, // creativity
                max_tokens: 500
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            }
        );

        let reply = response.data.choices[0].message.content;

        // Save AI reply in memory
        conversationHistory.push({ role: "assistant", content: reply });

        // Add Cymor branding
        reply += "\n\n— Powered by Cymor";

        res.json({ reply });

    } catch (error) {
        console.error("🔥 ERROR:", error.message);

        // Smart error responses
        let message = "CymorAI is having trouble responding. Try again.";

        if (error.response?.status === 401) {
            message = "API key error. Check configuration.";
        } else if (error.code === "ECONNABORTED") {
            message = "Request timed out. Please retry.";
        }

        res.status(500).json({ reply: message });
    }
});

// 🚀 Health check route (pro feature)
app.get("/health", (req, res) => {
    res.json({ status: "OK", service: "CymorAI" });
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CymorAI running on http://localhost:${PORT}`);
});
