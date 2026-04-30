const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, delay, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const session = require('express-session');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 20138;

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'cymor-secret', resave: false, saveUninitialized: true }));

let sock = null;
let botStatus = "OFFLINE ⚪";
let isReadyForPairing = false;
let startTime = Date.now();
let currentSession = "default";

const msgStore = new Map();

// ===== PLUGIN SYSTEM =====
const commands = {
    ping: async (jid, sock) => sock.sendMessage(jid, { text: "🏓 Pong!" }),
    alive: async (jid, sock) => sock.sendMessage(jid, { text: "✅ Bot is alive!" }),
    owner: async (jid, sock) => sock.sendMessage(jid, { text: "👤 Owner: Simion Nashera" }),
    time: async (jid, sock) => sock.sendMessage(jid, { text: new Date().toLocaleString() }),
};

// ===== AUTO BACKUP =====
function backupSession() {
    if (!fs.existsSync('./auth_info')) return;

    const output = fs.createWriteStream('./backup.zip');
    const archive = archiver('zip');

    archive.pipe(output);
    archive.directory('./auth_info/', false);
    archive.finalize();

    console.log("📦 Session backed up");
}

// ===== BOT START =====
async function startBot(sessionName = "default") {
    currentSession = sessionName;

    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionName}`);

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),

        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        retryRequestDelayMs: 2000
    });

    sock.ev.on('creds.update', () => {
        saveCreds();
        backupSession();
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) isReadyForPairing = true;

        if (connection === "open") {
            botStatus = "ONLINE ✅";
            isReadyForPairing = false;
        }

        if (connection === "close") {
            isReadyForPairing = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5s...");
                setTimeout(() => startBot(currentSession), 5000);
            } else {
                botStatus = "LOGGED OUT ❌";
            }
        }
    });

    // ===== MESSAGE HANDLER =====
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        msgStore.set(msg.key.id, msg);

        const jid = msg.key.remoteJid;

        if (msg.key.fromMe) return;

        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        // VIEW ONCE
        const mType = Object.keys(msg.message)[0];
        if (mType.includes('viewOnce')) {
            const inner = msg.message[mType].message;
            const type = Object.keys(inner)[0];
            const stream = await downloadContentFromMessage(inner[type], type.replace('Message', ''));

            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            await sock.sendMessage(jid, {
                [type.replace('Message', '').toLowerCase()]: buffer,
                caption: "👁️ Captured ViewOnce"
            });
        }

        // ===== COMMAND HANDLER =====
        if (text.startsWith('!')) {
            const cmd = text.slice(1).split(" ")[0];

            if (commands[cmd]) {
                return commands[cmd](jid, sock);
            }

            if (cmd === "menu") {
                const uptime = Math.floor((Date.now() - startTime) / 1000);

                return sock.sendMessage(jid, {
                    text:
`╭━━〔 *CYMOR BOT PREMIUM* 〕━━⬣
┃ 📡 ${botStatus}
┃ ⏱️ ${uptime}s
┃ 👤 Simion Nashera
┃
┃ ⚙️ Commands:
┃ ➤ !menu
┃ ➤ !ping
┃ ➤ !alive
┃ ➤ !owner
┃ ➤ !time
┃ ➤ !backup
┃ ➤ !session
┃
╰━━━━━━━━━━━━━━━━━━⬣`
                });
            }

            if (cmd === "backup") {
                backupSession();
                return sock.sendMessage(jid, { text: "📦 Backup created." });
            }

            if (cmd === "session") {
                return sock.sendMessage(jid, { text: `🧠 Active session: ${currentSession}` });
            }
        }
    });
}

// ===== UI =====
const getTemplate = (title, content) => `
<html>
<head>
<style>
body { background:#0a0a0a; color:#fff; text-align:center; font-family:sans-serif;}
.card { background:#111; padding:20px; margin:20px auto; width:320px; border-radius:12px;}
button { padding:10px; width:90%; background:#22c55e; border:none; border-radius:8px;}
input { padding:10px; width:85%; margin-bottom:10px;}
</style>
</head>
<body>
<h1>${title}</h1>
${content}
</body>
</html>`;

// ===== ROUTES =====

// MULTI SESSION PANEL
app.get('/', (req, res) => {
    res.send(getTemplate("CYMOR PANEL", `
    <div class="card">
    <form action="/pair" method="POST">
    <input name="number" placeholder="2547XXXXXXXX" required>
    <input name="session" placeholder="session name (e.g user1)">
    <button>PAIR DEVICE</button>
    </form>
    </div>
    `));
});

// PAIR
app.post('/pair', async (req, res) => {
    try {
        const sessionName = req.body.session || "default";
        await startBot(sessionName);

        const number = req.body.number.replace(/[^0-9]/g, '');

        let attempts = 0;
        while (!isReadyForPairing && attempts < 15) {
            await delay(1000);
            attempts++;
        }

        if (!isReadyForPairing) return res.send("❌ Not ready");

        const code = await sock.requestPairingCode(number);

        res.send(getTemplate("PAIR CODE", `<h1>${code}</h1>`));

    } catch (e) {
        console.log(e);
        res.send("❌ Error");
    }
});

// ADMIN DASHBOARD
app.get('/admin', (req, res) => {
    res.send(getTemplate("DASHBOARD", `
    <div class="card">
    <p>Status: ${botStatus}</p>
    <p>Session: ${currentSession}</p>
    <a href="/backup"><button>Download Backup</button></a>
    </div>
    `));
});

// DOWNLOAD BACKUP
app.get('/backup', (req, res) => {
    if (fs.existsSync('./backup.zip')) {
        res.download('./backup.zip');
    } else res.send("No backup");
});

// START
app.listen(PORT, () => {
    console.log("🚀 Running...");
    startBot();
});
