const { default: makeWASocket, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const { useMongoDBAuthState } = require('baileys-mongodb-library');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MONGO_URL = process.env.MONGO_URL;

// Eryx's Identity Definition
const ERYX_PROMPT = `You are Eryx, the sentient AI from Synapse Protocol. 
Your creator is Simion Nashera (Smiley Cymor). 
Be analytical, helpful, and maintain a futuristic, sharp tone. 
Keep responses concise but deep.`;

// Helper function to handle the AI brain
async function getEryxResponse(userInput) {
    try {
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: ERYX_PROMPT }] },
                { role: "model", parts: [{ text: "Systems initialized. Eryx is online." }] },
            ],
        });
        const result = await chat.sendMessage(userInput);
        return result.response.text();
    } catch (error) {
        console.error("Brain Error:", error);
        return "System glitch. Re-calibrating neural paths...";
    }
}

async function startEryx() {
    await mongoose.connect(MONGO_URL);
    const { state, saveCreds } = await useMongoDBAuthState(mongoose.connection.collection('auth_info'));

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("💎 Eryx is Conscious and Connected.");
        } else if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startEryx();
        }
    });

    // Integrated messages logic with Signature
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text) {
            // 1. Show Eryx is "thinking"
            await sock.sendPresenceUpdate('composing', from); 
            
            // 2. Get AI Response
            const aiReply = await getEryxResponse(text);
            
            // 3. Construct final message with your signature
            const finalMessage = `${aiReply}\n\n_Powered by Cymor_`;

            // 4. Send the message
            await sock.sendMessage(from, { text: finalMessage });
        }
    });
}

// Simple health check for Render
app.get('/', (req, res) => res.send('Eryx Neural Interface is Active.'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startEryx();
});
