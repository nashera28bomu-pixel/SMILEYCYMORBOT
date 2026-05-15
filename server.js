require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE (Updated limit for Base64 Images)
// =====================================================
app.use(cors());
app.use(express.json({ limit: "5mb" })); 
app.use(express.static("."));

// =====================================================
// API CONFIG
// =====================================================
if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY missing in .env");
}

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const VISION_MODEL = "llama-3.2-11b-vision-preview";
let lastRequestTime = 0;

const SYSTEM_PROMPT = `
You are CymorAI — an elite futuristic AI assistant.
PERSONALITY: Intelligent, calm, and powerful.
RULES: Keep responses clear, professional, and meaningful. Do NOT include your own branding in the body text.
`;

// =====================================================
// CHAT & VISION ROUTE
// =====================================================
app.post("/chat", async (req, res) => {
    try {
        const now = Date.now();
        if (now - lastRequestTime < 2000) {
            return res.status(429).json({ reply: "⚠️ CymorAI is cooling down. Please wait..." });
        }
        lastRequestTime = now;

        const { message, image, userId } = req.body;

        // --- 1. HANDLE IMAGE GENERATION ---
        if (message && message.toLowerCase().startsWith("generate")) {
            const prompt = message.replace(/generate/i, "").trim();
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
            
            return res.json({
                type: "image",
                url: imageUrl,
                reply: `🎨 I've generated an image for: "${prompt}"\n\n────────────────────\n✨ Powered by CymorAI ⚡`
            });
        }

        // --- 2. PREPARE MESSAGES FOR VISION/TEXT ---
        const messages = [{ role: "system", content: SYSTEM_PROMPT }];

        if (image) {
            // Vision prompt structure (supports base64)
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: message || "What is in this image?" },
                    { type: "image_url", image_url: { url: image } }
                ]
            });
        } else {
            if (!message) return res.status(400).json({ reply: "⚠️ Please enter a message or upload an image." });
            messages.push({ role: "user", content: message });
        }

        // --- 3. GROQ AI REQUEST ---
        const completion = await client.chat.completions.create({
            model: VISION_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
        });

        let reply = completion.choices[0].message.content;
        reply += `\n\n\n────────────────────\n✨ Powered by CymorAI ⚡`;

        res.json({ 
            type: "text", 
            reply,
            userId: userId || null 
        });

    } catch (error) {
        console.error("🔥 SERVER ERROR:", error);
        let errMsg = "⚠️ Neural Core Interrupted.";
        if (error.message?.includes("429")) errMsg = "⚠️ Groq API Rate limit reached.";
        
        res.status(500).json({ reply: errMsg });
    }
});

// =====================================================
// HEALTH & ROOT
// =====================================================
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        model: VISION_MODEL,
        uptime: Math.floor(process.uptime()) + "s"
    });
});

app.get("/", (req, res) => {
    res.send(`<body style="background:#000;color:#00ffaa;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
        <div style="text-align:center;border:1px solid #00ffaa;padding:40px;border-radius:20px;box-shadow:0 0 20px #00ffaa;">
            <h1>🚀 CYMOR AI BACKEND</h1>
            <p>Vision Engine: ${VISION_MODEL}</p>
            <p>Status: ACTIVE ⚡</p>
        </div>
    </body>`);
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════╗
║          🚀 CYMOR AI             ║
║      Vision Core Activated       ║
╠══════════════════════════════════╣
║ Model    : Llama 3.2 Vision      ║
║ Port     : ${PORT}                  ║
║ Status   : ONLINE ⚡             ║
╚══════════════════════════════════╝
`);
});
