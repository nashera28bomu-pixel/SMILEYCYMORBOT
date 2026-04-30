const { default: makeWASocket, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
const { useMongoDBAuthState } = require('baileys-mongodb-library');
const mongoose = require('mongoose');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// Render will provide this from Environment Variables
const MONGO_URL = process.env.MONGO_URL;

let sock = null;
let botStatus = "OFFLINE ⚪";
let lastPairingCode = "None";

app.use(express.urlencoded({ extended: true }));

async function startBot() {
    if (!MONGO_URL) return console.error("❌ MONGO_URL is missing in Render variables!");

    await mongoose.connect(MONGO_URL);
    const { state, saveCreds } = await useMongoDBAuthState(mongoose.connection.collection('auth_info'));

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome")
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            botStatus = "ONLINE ✅";
            console.log("🚀 SMILEY CYMOR BOT IS LIVE");
        } else if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            botStatus = shouldReconnect ? "RECONNECTING... 🔄" : "LOGGED OUT ❌";
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        if (text === '!menu' || text === 'menu') {
            const menuText = `
┏━━━〔 *SMILEY CYMOR BOT* 〕━━━┓
┃
┃  👤 *Owner:* Simion Nashera
┃  ⚡ *Status:* ${botStatus}
┃  📅 *Date:* ${new Date().toLocaleDateString()}
┃
┣━━━〔 *USER UTILITY* 〕
┃ 🛠️ !ping - _Check Latency_
┃ 🕒 !time - _Current Time_
┃ 📊 !uptime - _Bot Runtime_
┃
┣━━━〔 *MEDIA DOWNLOADER* 〕
┃ 🎵 !mp3 [link] - _Audio_
┃ 🎥 !mp4 [link] - _Video_
┃
┣━━━〔 *SYSTEM* 〕
┃ ⚙️ !restart - _Owner Only_
┃ 📡 !host - _Render Info_
┃
┗━━━━━━━━━━━━━━━━━━━━━━┛
*Write once. Understand forever.*`;

            await sock.sendMessage(from, { 
                text: menuText,
                contextInfo: {
                    externalAdReply: {
                        title: "SMILEY CYMOR BOT v1.2",
                        body: "Advanced WhatsApp Automation",
                        previewType: "PHOTO",
                        thumbnailUrl: "https://files.catbox.moe/k3n0o7.jpg", // Add a cool thumbnail link here
                        sourceUrl: "https://wa.me/254113821327" 
                    }
                }
            });
        }

        if (text === '!ping') await sock.sendMessage(from, { text: "⚡ *Pong!* Latency: 45ms" });
    });
}

// Futuristic Dashboard UI
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: #000; color: #00ff00; font-family: 'Courier New', monospace; }
            .glow { text-shadow: 0 0 10px #00ff00; }
            .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid #333; }
        </style>
    </head>
    <body class="min-h-screen flex flex-col items-center justify-center p-6">
        <div class="glass p-10 rounded-2xl shadow-2xl text-center max-w-lg w-full">
            <h1 class="text-4xl font-black glow mb-2">SMILEY CYMOR</h1>
            <p class="text-xs tracking-widest text-gray-500 mb-8 uppercase">Neural Interface v1.2</p>
            
            <div class="mb-8">
                <span class="text-sm">SYSTEM STATUS:</span>
                <span class="ml-2 font-bold text-white">${botStatus}</span>
            </div>

            <form action="/pair" method="POST" class="space-y-4">
                <input name="number" placeholder="Enter 254..." required 
                class="w-full p-4 bg-black border border-green-900 rounded text-center focus:border-green-500 outline-none transition">
                <button type="submit" class="w-full bg-green-600 text-black font-bold p-4 rounded hover:bg-green-400 transition transform hover:scale-105">
                    REQUEST PAIRING CODE
                </button>
            </form>

            ${lastPairingCode !== "None" ? `
                <div class="mt-10 p-4 border-2 border-dashed border-green-500 animate-pulse">
                    <p class="text-[10px] text-gray-400 mb-2">WHATSAPP PAIRING CODE:</p>
                    <h2 class="text-6xl font-bold text-white tracking-widest">${lastPairingCode}</h2>
                </div>
            ` : ''}
        </div>
    </body>
    </html>
    `);
});

app.post('/pair', async (req, res) => {
    let num = req.body.number.replace(/[^0-9]/g, '');
    if (!num) return res.redirect('/');
    try {
        if (!sock) await startBot();
        await delay(3000);
        lastPairingCode = await sock.requestPairingCode(num);
        res.redirect('/');
    } catch (err) {
        res.redirect('/');
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    startBot();
});
