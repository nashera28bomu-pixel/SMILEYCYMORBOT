const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const ytdl = require('ytdl-core');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// --- BOT STATE ---
let sock = null;
let botStatus = "IDLE";
let lastPairingCode = "Not Generated";

// --- ENHANCED MENU (WhatsApp View) ---
const getMenu = () => {
    return `
╭═════════════════════════════╮
      ✨ *SMILEY CYMOR BOT* ✨
╰═════════════════════════════╯

🤖 *STATUS:* ${botStatus}
📅 *DATE:* ${new Date().toLocaleDateString()}

〔 ⚡ *UTILITY* 〕
• !ping • !uptime • !id • !date • !speed

〔 ☁️ *WEATHER* 〕
• !weather [city]

〔 🎲 *FUN & GAMES* 〕
• !flip • !roll • !joke • !quote • !trivia

〔 🛡️ *MANAGEMENT* 〕
• !kick • !ban • !promote • !groupinfo

〔 🎨 *CREATIVE* 〕
• !script • !plot • !idea • !sticker • !song

╭═════════════════════════════╮
    *©️ CYMOR TECH 2026*
╰═════════════════════════════╯`;
};

// --- COMMANDS OBJECT ---
const commands = {
    'Utility': ['ping', 'uptime', 'status', 'id', 'date', 'time', 'speed', 'ram', 'info'],
    'Weather': ['weather'],
    'Fun': ['flip', 'roll', 'joke', 'quote', 'trivia', 'riddle', 'dice', 'truth', 'dare', 'hack'],
    'Profile': ['profile', 'contact', 'slogan', 'bio', 'owner', 'greet', 'bye', 'thanks', 'help', 'credits'],
    'Management': ['kick', 'ban', 'promote', 'demote', 'groupinfo', 'delete', 'pin', 'unpin', 'block', 'unblock', 'mute', 'unmute', 'report', 'warn', 'promoteall'],
    'Creative': ['script', 'plot', 'idea', 'sum', 'trans', 'define', 'search', 'lyrics', 'anime', 'movie', 'calc', 'reverse', 'bold', 'italic', 'sticker', 'song']
};

// --- CORE BOT LOGIC ---
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') botStatus = "ONLINE";
        if (connection === 'close') {
            botStatus = "OFFLINE";
            startBot(); 
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (text === '!menu') await sock.sendMessage(msg.key.remoteJid, { text: getMenu() });
    });
}

// --- WEB DASHBOARD (COOL UI) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: #050505; color: #00ff41; font-family: 'Orbitron', sans-serif; }
            .glass { background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(15px); border: 1px solid #00ff41; box-shadow: 0 0 15px rgba(0, 255, 65, 0.2); }
            .btn-glow { box-shadow: 0 0 20px #00ff41; }
        </style>
    </head>
    <body class="p-8">
        <div class="max-w-2xl mx-auto glass p-8 rounded-3xl">
            <h1 class="text-4xl font-bold mb-2 text-center tracking-widest">CYMOR_BOT</h1>
            <p class="text-center text-sm mb-8 animate-pulse text-gray-400">SYSTEM STATUS: ${botStatus}</p>
            
            <div class="space-y-6">
                <form action="/pair" method="POST" class="flex flex-col gap-4">
                    <input name="number" placeholder="ENTER NUMBER (254...)" class="bg-black border border-green-500 p-4 rounded-lg outline-none text-center">
                    <button class="bg-green-600 hover:bg-green-500 text-black font-bold p-4 rounded-lg btn-glow transition-all">GENERATE LINK</button>
                </form>
                
                <div class="border-t border-green-900 pt-6">
                    <h3 class="mb-4 text-sm uppercase">Command Directory</h3>
                    <div class="grid grid-cols-2 gap-4 text-xs opacity-80">
                        ${Object.keys(commands).map(cat => `
                            <div>
                                <span class="text-green-500 font-bold block">${cat}</span>
                                <ul class="mt-2">
                                    ${commands[cat].slice(0, 3).map(c => `<li>!${c}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`);
});

app.post('/pair', async (req, res) => {
    if (!sock) await startBot();
    try {
        lastPairingCode = await sock.requestPairingCode(req.body.number);
        res.redirect('/');
    } catch (e) { res.send("Error: Please restart or check logs."); }
});

app.listen(PORT, () => startBot());
