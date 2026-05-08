require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());

app.use(express.json({
    limit: "1mb"
}));

app.use(express.static("."));

// =====================================================
// API KEY CHECK
// =====================================================
if (!process.env.GROQ_API_KEY) {

    console.error(`
❌ ERROR:
GROQ_API_KEY missing in .env
`);
}

// =====================================================
// GROQ CLIENT
// =====================================================
const client = new OpenAI({

    apiKey: process.env.GROQ_API_KEY,

    baseURL: "https://api.groq.com/openai/v1"
});

// =====================================================
// ANTI-SPAM / RATE LIMIT
// =====================================================
let lastRequestTime = 0;

// =====================================================
// CYMOR SYSTEM PROMPT
// =====================================================
const SYSTEM_PROMPT = `
You are CymorAI — an elite futuristic AI assistant.

PERSONALITY:
- Intelligent
- Confident
- Futuristic
- Helpful
- Modern
- Slightly cinematic

RULES:
- Keep responses concise but powerful.
- Be engaging and natural.
- Help with coding, AI, school, business, creativity, and strategy.
- Never sound robotic.
- Use premium futuristic tone.
- Avoid excessive emojis.
`;

// =====================================================
// CHAT ROUTE
// =====================================================
app.post("/chat", async (req, res) => {

    try {

        const now = Date.now();

        // =================================================
        // COOLDOWN PROTECTION
        // =================================================
        if (now - lastRequestTime < 2500) {

            return res.status(429).json({

                reply:
                    "⚠️ Neural systems cooling down. Please wait a moment."
            });
        }

        lastRequestTime = now;

        // =================================================
        // REQUEST DATA
        // =================================================
        const {
            message
        } = req.body;

        console.log(`
📩 Incoming Message:
${message}
`);

        // =================================================
        // VALIDATION
        // =================================================
        if (!process.env.GROQ_API_KEY) {

            return res.status(500).json({

                reply:
                    "⚠️ GROQ API Key missing."
            });
        }

        if (!message || message.trim() === "") {

            return res.status(400).json({

                reply:
                    "⚠️ Please enter a message."
            });
        }

        // =================================================
        // GROQ AI REQUEST
        // =================================================
        const completion =
            await client.chat.completions.create({

                // FAST + SMART MODEL
                model:
                    "llama-3.3-70b-versatile",

                messages: [

                    {
                        role: "system",

                        content: SYSTEM_PROMPT
                    },

                    {
                        role: "user",

                        content: message
                    }
                ],

                temperature: 0.7,

                max_tokens: 300,

                top_p: 0.9,

                stream: false
            });

        // =================================================
        // EXTRACT RESPONSE
        // =================================================
        const reply =
            completion
            .choices[0]
            .message
            .content;

        console.log("✅ Response generated");

        // =================================================
        // SEND RESPONSE
        // =================================================
        res.json({

            reply:
`${reply}

— Powered by CymorAI`
        });

    } catch (error) {

        console.error(`
🔥 FULL SERVER ERROR:
`);

        console.error(error);

        let errorMessage =
            "⚠️ CymorAI encountered a temporary issue.";

        // =================================================
        // SMART ERROR HANDLING
        // =================================================

        // RATE LIMIT
        if (

            error.message?.includes("rate_limit") ||

            error.message?.includes("429")
        ) {

            errorMessage =
                "⚠️ CymorAI is currently busy. Try again shortly.";
        }

        // INVALID KEY
        else if (

            error.message?.includes("Invalid API Key") ||

            error.message?.includes("authentication")
        ) {

            errorMessage =
                "⚠️ Invalid GROQ API Key.";
        }

        // NETWORK ERROR
        else if (

            error.message?.includes("fetch") ||

            error.message?.includes("network")
        ) {

            errorMessage =
                "⚠️ Network connection issue detected.";
        }

        // SERVER ERROR
        else if (

            error.message?.includes("500")
        ) {

            errorMessage =
                "⚠️ Neural core temporarily unstable.";
        }

        // MODEL ERROR
        else if (

            error.message?.includes("model")
        ) {

            errorMessage =
                "⚠️ AI model temporarily unavailable.";
        }

        // =================================================
        // SEND ERROR RESPONSE
        // =================================================
        res.status(500).json({

            reply: errorMessage
        });
    }
});

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/health", (req, res) => {

    res.status(200).json({

        status: "online",

        ai: "CymorAI",

        provider: "Groq",

        model: "llama-3.3-70b-versatile",

        uptime:
            Math.floor(process.uptime()) + " seconds"
    });
});

// =====================================================
// ROOT ROUTE
// =====================================================
app.get("/", (req, res) => {

    res.send(`
    <h1 style="font-family:sans-serif;">
        🚀 CymorAI Backend Online
    </h1>

    <p>Groq Neural Engine Active</p>
    `);
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, "0.0.0.0", () => {

    console.log(`
╔══════════════════════════════════╗
║          🚀 CYMOR AI             ║
║      Neural Core Activated       ║
║----------------------------------║
║  Provider : GROQ                 ║
║  Model    : Llama 3.3 70B        ║
║  Port     : ${PORT}
╚══════════════════════════════════╝
`);
});
