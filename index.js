const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "bomu@09";

// --- STATE ---
let sock = null;
let botStatus = "STARTING...";
let lastPairingCode = "Not Generated";
let isConnecting = false;

let users = new Set();
let commandLogs = [];

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));

// --- MENU ---
const getMenu = () => `
✨ *SMILEY CYMOR BOT* ✨

🤖 Status: ${botStatus}

⚡ Utility: !ping !time !date !uptime
🎲 Fun: !joke !quote !flip !roll
🎵 Media: !mp3 [link]
🧠 AI: !ai [text]
🎨 Creative: !reverse !bold !italic
👤 Profile: !owner !help
`;

// --- BOT ---
async function startBot() {
    if (isConnecting) return;
    isConnecting = true;

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            botStatus = "ONLINE ✅";
            isConnecting = false;
        }

        if (connection === "close") {
            botStatus = "RECONNECTING...";
            isConnecting = false;

            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        users.add(from);

        // --- LOG COMMAND ---
        if (text.startsWith('!')) {
            commandLogs.unshift(text);
            commandLogs = commandLogs.slice(0, 20);
        }

        // --- COMMANDS ---
        if (text === '!menu') return sock.sendMessage(from, { text: getMenu() });

        if (text === '!ping') return sock.sendMessage(from, { text: "PONG 🏓" });

        if (text === '!time') return sock.sendMessage(from, { text: new Date().toLocaleTimeString() });

        if (text === '!date') return sock.sendMessage(from, { text: new Date().toDateString() });

        if (text === '!flip') return sock.sendMessage(from, { text: Math.random() > 0.5 ? "HEADS" : "TAILS" });

        if (text === '!roll') return sock.sendMessage(from, { text: `🎲 ${Math.floor(Math.random()*6)+1}` });

        if (text === '!joke') {
            const res = await axios.get('https://official-joke-api.appspot.com/random_joke');
            return sock.sendMessage(from, { text: `${res.data.setup}\n${res.data.punchline}` });
        }

        if (text.startsWith('!reverse ')) {
            return sock.sendMessage(from, { text: text.slice(9).split('').reverse().join('') });
        }

        if (text.startsWith('!bold ')) {
            return sock.sendMessage(from, { text: `*${text.slice(6)}*` });
        }

        if (text.startsWith('!italic ')) {
            return sock.sendMessage(from, { text: `_${text.slice(8)}_` });
        }

        // --- AI CHAT ---
        if (text.startsWith('!ai ')) {
            return sock.sendMessage(from, { text: "AI feature coming soon 🚀" });
        }

        // --- MP3 DOWNLOAD ---
        if (text.startsWith('!mp3 ')) {
            try {
                const url = text.split(' ')[1];
                const info = await ytdl.getInfo(url);
                const title = info.videoDetails.title;

                const stream = ytdl(url, { filter: 'audioonly' });

                await sock.sendMessage(from, {
                    audio: stream,
                    mimetype: 'audio/mpeg'
                });

            } catch {
                sock.sendMessage(from, { text: "Failed to download MP3" });
            }
        }
    });
}

// --- UI ---
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>

    <body class="bg-black text-green-400 min-h-screen flex flex-col items-center justify-center">

        <h1 class="text-5xl font-bold">CYMOR BOT</h1>
        <p class="mb-4">Status: ${botStatus}</p>

        <form action="/pair" method="POST" class="flex flex-col gap-4 w-80">
            <input name="number" placeholder="254..." class="p-3 bg-black border border-green-500">
            <button class="bg-green-500 text-black p-3">PAIR</button>
        </form>

        <h2 class="mt-4 text-2xl">${lastPairingCode}</h2>

        <a href="/admin" class="mt-4 underline">Admin</a>

    </body>
    </html>
    `);
});

// --- PAIR ---
app.post('/pair', async (req, res) => {
    try {
        if (!sock) await startBot();
        lastPairingCode = await sock.requestPairingCode(req.body.number);
    } catch {
        lastPairingCode = "ERROR";
    }
    res.redirect('/');
});

// --- ADMIN ---
app.get('/admin', (req, res) => {
    res.send(`
    <form method="POST">
        <input name="password" placeholder="Password"/>
        <button>Login</button>
    </form>
    `);
});

app.post('/admin', (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.send("Wrong password");

    res.send(`
    <h1>ADMIN DASHBOARD</h1>

    <p>Users: ${users.size}</p>
    <p>Status: ${botStatus}</p>

    <h3>Recent Commands:</h3>
    <ul>${commandLogs.map(c => `<li>${c}</li>`).join('')}</ul>

    <form method="POST" action="/broadcast">
        <input name="msg" placeholder="Broadcast message"/>
        <button>Send</button>
    </form>

    <a href="/">Back</a>
    `);
});

// --- BROADCAST ---
app.post('/broadcast', async (req, res) => {
    const msg = req.body.msg;

    for (let user of users) {
        await sock.sendMessage(user, { text: msg });
    }

    res.send("Sent to all users ✅");
});

// --- START ---
app.listen(PORT, () => {
    startBot();
});
