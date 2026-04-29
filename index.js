const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "bomu@09";

let sock = null;
let botStatus = "IDLE ⚪";
let lastPairingCode = "None";
let isConnecting = false;
let users = new Set();
let commandLogs = [];

app.use(express.urlencoded({ extended: true }));

async function startBot() {
    if (isConnecting) return;
    isConnecting = true;

    // 1. Setup Auth
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    // 2. Initialize Socket with Pairing Config
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Set to false to use Pairing Code
        logger: pino({ level: "silent" }),
        // CRITICAL: Must look like a browser for pairing to work
        browser: Browsers.macOS("Chrome") 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            botStatus = "ONLINE ✅";
            isConnecting = false;
            console.log("Cymor Bot Connected!");
        }

        if (connection === "connecting") {
            botStatus = "CONNECTING... ⏳";
        }

        if (connection === "close") {
            isConnecting = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            botStatus = shouldReconnect ? "RECONNECTING... 🔄" : "LOGGED OUT ❌";
            
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000); // 5 second delay before retry
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        users.add(from);
        if (text.startsWith('!')) {
            commandLogs.unshift(text);
            commandLogs = commandLogs.slice(0, 20);
        }

        // Basic Command Handler
        if (text === '!menu') {
            await sock.sendMessage(from, { text: `✨ *SMILEY CYMOR BOT* ✨\n\n🤖 Status: ${botStatus}\n⚡ Utility: !ping !time !uptime\n🎵 Media: !mp3 [link]` });
        }
        if (text === '!ping') await sock.sendMessage(from, { text: "PONG 🏓" });
    });
}

// --- UI ROUTES ---
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta http-equiv="refresh" content="10"> </head>
    <body class="bg-black text-green-400 min-h-screen flex flex-col items-center justify-center font-mono">
        <h1 class="text-5xl font-bold mb-2">CYMOR BOT</h1>
        <p class="mb-8 p-2 border border-green-500">System Status: <span class="font-bold text-white">${botStatus}</span></p>

        <form action="/pair" method="POST" class="flex flex-col gap-4 w-80">
            <input name="number" placeholder="2547..." required class="p-3 bg-gray-900 border border-green-500 rounded text-white focus:outline-none">
            <button type="submit" class="bg-green-500 text-black font-bold p-3 rounded hover:bg-green-400 transition">REQUEST PAIRING CODE</button>
        </form>

        ${lastPairingCode !== "None" ? `
            <div class="mt-8 p-6 border-2 border-dashed border-green-400 animate-pulse">
                <p class="text-center text-sm text-gray-400 uppercase">Your Code:</p>
                <h2 class="text-6xl text-white font-black text-center tracking-widest">${lastPairingCode}</h2>
            </div>
        ` : ''}

        <div class="mt-10 flex gap-4 text-xs">
            <a href="/admin" class="hover:underline">Admin Panel</a>
            <span class="text-gray-600">|</span>
            <a href="https://wa.me/254..." class="hover:underline">Support</a>
        </div>
    </body>
    </html>
    `);
});

app.post('/pair', async (req, res) => {
    let num = req.body.number.replace(/[^0-9]/g, '');
    if (!num) return res.redirect('/');

    try {
        if (!sock || botStatus !== "ONLINE ✅") {
            await startBot();
            // Wait a moment for socket to initialize
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        lastPairingCode = await sock.requestPairingCode(num);
        console.log(`Pairing Code Generated: ${lastPairingCode}`);
        res.redirect('/');
    } catch (err) {
        console.error("Pairing Error:", err);
        lastPairingCode = "ERROR";
        res.redirect('/');
    }
});

// Admin and start logic stays the same...
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startBot();
});
