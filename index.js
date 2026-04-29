const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const app = express();
const PORT = process.env.PORT || 3000;

// --- WEB DASHBOARD ---
app.get('/', (req, res) => {
    res.send(`<h1 style="color: gold; text-align: center;">SMILEY CYMOR BOT IS ONLINE</h1><p style="text-align: center;">ALWAYS A WINNER</p>`);
});
app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

// --- COMMAND REGISTRY ---
const commands = {
    ping: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "⚡ Pong! ALWAYS A WINNER" }),
    profile: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "👤 *Name:* SMILEY CYMOR\n📱 *Contact:* 0113821327\n🏆 *Motto:* ALWAYS A WINNER" }),
    owner: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "The owner is the legendary SMILEY CYMOR." }),
    contact: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Reach me at: 0113821327" }),
    slogan: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "SMILEY CYMOR BOT: ALWAYS A WINNER" }),
    uptime: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Bot is running smooth. ALWAYS A WINNER." }),
    status: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "System Status: Online & Operational." }),
    id: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: `Chat ID: ${m.key.remoteJid}` }),
    date: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: new Date().toLocaleDateString() }),
    time: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: new Date().toLocaleTimeString() }),
    math: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "I can solve problems! Use !math 2+2" }),
    quote: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Success is not final, failure is not fatal: it is the courage to continue that counts." }),
    flip: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: Math.random() > 0.5 ? "Heads" : "Tails" }),
    roll: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: `You rolled a ${Math.floor(Math.random() * 6) + 1}` }),
    joke: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Why do programmers prefer dark mode? Because light attracts bugs!" }),
    info: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "SMILEY CYMOR BOT v1.0 | Built for Winners." }),
    restart: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Restarting system... (Simulated)" }),
    credits: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Powered by CymorTech." }),
    help: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Type !menu to see all commands." }),
    weather: async (sock, m) => await sock.sendMessage(m.key.remoteJid, { text: "Weather is perfect for winners." }),
    // Automatic Menu Command
    menu: async (sock, m) => {
        let list = Object.keys(commands).map((cmd, i) => `${i + 1}. !${cmd}`).join('\n');
        let menu = `╭═══「 *SMILEY CYMOR BOT* 」═══\n`;
        menu += `│ 👤 Owner: SMILEY CYMOR\n`;
        menu += `│ 📞 Contact: 0113821327\n`;
        menu += `│ 🏆 Motto: ALWAYS A WINNER\n`;
        menu += `╰═══════════════════════════\n\n`;
        menu += `*COMMANDS LIST*\n${list}\n\n_Powered by CymorTech_`;
        await sock.sendMessage(m.key.remoteJid, { text: menu });
    }
};

// --- CORE BOT ENGINE ---
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Auto View Status
        if (msg.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([msg.key]);
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text.startsWith('!')) return;

        const cmdName = text.slice(1).split(' ')[0].toLowerCase();
        
        if (commands[cmdName]) {
            try { await commands[cmdName](sock, msg); } catch (e) { console.error(e); }
        } else {
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Command not found. Type !menu to see available commands." });
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log('SMILEY CYMOR BOT CONNECTED - ALWAYS A WINNER');
        if (update.connection === 'close') startBot();
    });
}

startBot();
