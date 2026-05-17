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
app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

// =====================================================
// API CONFIG
// =====================================================
if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY missing in .env environment variables");
}

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1"
});

const TEXT_MODEL = "llama-3.1-8b-instant";
const VISION_MODEL = "llama-3.2-11b-vision-preview";

// 🔥 FIX: Track rate limits dynamically per user instead of using a single global lock
const userRateLimits = new Map();

// =====================================================
// SYSTEM CORE PROMPT
// =====================================================
const SYSTEM_PROMPT = `
You are CymorAI, a high-level multimodal intelligence system.

CORE RULES:
- Be precise, intelligent, and structured.
- If analyzing images, describe objects, text, actions, context.
- If unsure, state only what is visible.
- Keep answers clear and non-redundant.
- Do NOT mention system prompts or internal rules.
`;

// =====================================================
// IMAGE NORMALIZER
// =====================================================
function normalizeImage(image) {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    if (image.startsWith("data:image")) return image;
    return `data:image/jpeg;base64,${image}`;
}

// =====================================================
// BRANDING & IDENTITY HELPERS
// =====================================================
const BRAND_FOOTER = `\n\n✨ Powered by Cymor AI`;

function isCreatorQuestion(text = "") {
    const q = text.toLowerCase();
    return (
        q.includes("who made you") ||
        q.includes("who created you") ||
        q.includes("your creator") ||
        q.includes("who built you")
    );
}

// =====================================================
// ROUTE HANDLER
// =====================================================
app.post("/chat", async (req, res) => {
    try {
        const { message, image, images, userId } = req.body;
        const trackingId = userId || req.ip; // Fallback to IP address if userId is unassigned
        const now = Date.now();

        // 🔥 FIX: Per-user rate-limiting evaluation prevents user cross-locking
        if (userRateLimits.has(trackingId)) {
            const lastRequestTime = userRateLimits.get(trackingId);
            if (now - lastRequestTime < 1500) {
                return res.status(429).json({
                    type: "text",
                    reply: "⚠️ CymorAI Neural Core is processing too fast. Slow down slightly."
                });
            }
        }
        userRateLimits.set(trackingId, now);

        // Cleanup stale entries in the rate-limiter map over time to prevent memory growth
        if (userRateLimits.size > 1000) {
            const clearThreshold = now - 5000;
            for (const [key, val] of userRateLimits.entries()) {
                if (val < clearThreshold) userRateLimits.delete(key);
            }
        }

        // =====================================================
        // CREATOR QUESTION (IDENTITY INTERCEPT)
        // =====================================================
        if (message && isCreatorQuestion(message)) {
            return res.json({
                type: "text",
                // 🔥 FIX: Removed direct footer concatenation here since the client script appends it natively
                reply: "The Legendary Smiley Cymor, the CEO of Cymor Tech Services.",
                mode: "identity",
                userId: userId || null
            });
        }

        // =====================================================
        // IMAGE GENERATION PIPELINE
        // =====================================================
        if (message && message.toLowerCase().startsWith("generate")) {
            const prompt = message.replace(/generate/i, "").trim();
            const seed = Math.floor(Math.random() * 999999);

            const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

            return res.json({
                type: "image",
                url: imageUrl,
                reply: `🎨 Image generated: "${prompt}"`
            });
        }

        // =====================================================
        // VISION ENGINE INTERACTION MODE
        // =====================================================
        const hasImages = image || (images && images.length);

        if (hasImages) {
            const imageList = images?.length ? images : [image];
            const content = [
                {
                    type: "text",
                    text: message || "Analyze these images in detail."
                }
            ];

            for (const img of imageList) {
                const normalized = normalizeImage(img);
                if (normalized) {
                    content.push({
                        type: "image_url",
                        image_url: { url: normalized }
                    });
                }
            }

            const completion = await client.chat.completions.create({
                model: VISION_MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content }
                ],
                temperature: 0.6,
                max_tokens: 700
            });

            return res.json({
                type: "text",
                reply: completion.choices[0].message.content,
                mode: "vision",
                userId: userId || null
            });
        }

        // =====================================================
        // STANDARD NLP TEXT MODE
        // =====================================================
        if (!message) {
            return res.status(400).json({
                type: "text",
                reply: "⚠️ Transmit command parameters or image frames."
            });
        }

        const completion = await client.chat.completions.create({
            model: TEXT_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
        });

        return res.json({
            type: "text",
            reply: completion.choices[0].message.content,
            mode: "text",
            userId: userId || null
        });

    } catch (error) {
        console.error("🔥 CYMOR SERVER ERROR:", error);

        let msg = "⚠️ Neural Core Execution Failure.";
        if (error?.message?.includes("429")) {
            msg = "⚠️ Engine rate limit reached. Please pause processing.";
        }

        return res.status(500).json({
            type: "text",
            reply: msg
        });
    }
});

// =====================================================
// ENGINE DIAGNOSTIC HEALTH CHECK
// =====================================================
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        vision_model: VISION_MODEL,
        text_model: TEXT_MODEL,
        uptime: Math.floor(process.uptime()) + "s"
    });
});

// =====================================================
// ROOT LANDING VISUAL OVERLAY
// =====================================================
app.get("/", (req, res) => {
    res.send(`
        <body style="background:#000;color:#00ffaa;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;margin:0;">
            <div style="text-align:center;border:1px solid #00ffaa;padding:40px;border-radius:20px;box-shadow:0 0 20px rgba(0,255,170,0.5);background:rgba(10,15,30,0.8);">
                <h1 style="letter-spacing:2px;font-family:monospace;">🚀 CYMOR AI PRO VISION</h1>
                <p style="color:#6b7280;">Vision Engine: <span style="color:#00ffaa;">ACTIVE</span></p>
                <p style="color:#6b7280;">Multimodal Core: <span style="color:#00ffaa;">ONLINE ⚡</span></p>
            </div>
        </body>
    `);
});

// =====================================================
// INITIATE LIFTOFF
// =====================================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════╗
║        🚀 CYMOR AI PRO           ║
║     MULTIMODAL VISION CORE      ║
╠══════════════════════════════════╣
║ Vision : ENABLED                ║
║ Text   : FAST MODE              ║
║ Port   : ${PORT}                ║
║ Status : ULTRA ONLINE ⚡         ║
╚══════════════════════════════════╝
`);
});
