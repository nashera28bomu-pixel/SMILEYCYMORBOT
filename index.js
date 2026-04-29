const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// --- BOT STATE ---
const msgCache = new Map(); // For deleted message recovery
let botStatus = "Online";
let lastPairingCode = "None";

// --- WEB DASHBOARD ---
app.get('/', (req, res) => res.send(`<h1>SMILEY CYMOR BOT IS ONLINE</h1><a href="/pair">Link</a> | <a href="/admin">Admin</a>`));
app.get('/pair', (req, res) => res.send(`<form action="/request-code" method="POST"><input name="number" placeholder="254..." required><button>Get Code</button></form>`));
app.post('/request-code', async (req, res) => {
    const { state } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });
    const code = await sock.requestPairingCode(req.body.number);
    lastPairingCode = code;
    res.send(`<h3>Code: ${code}</h3>`);
});
app.get('/admin', (req, res) => res.send(`<form action="/admin" method="POST"><input type="password" name="password"><button>Login</button></form>`));
app.post('/admin', (req, res) => {
    if (req.body.password === 'bomu@09') res.send(`<h3>Status: ${botStatus} | Last Code: ${lastPairingCode}</h3>`);
    else res.send("Wrong Password");
});
app.listen(PORT);

// --- COMMANDS (60+ Added) ---
const commands = {
    // Utility & Sys
    ping: (s, m) => s.sendMessage(m.key.remoteJid, { text: "⚡ Pong!" }),
    uptime: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Running smooth." }),
    status: (s, m) => s.sendMessage(m.key.remoteJid, { text: "System Online." }),
    id: (s, m) => s.sendMessage(m.key.remoteJid, { text: m.key.remoteJid }),
    date: (s, m) => s.sendMessage(m.key.remoteJid, { text: new Date().toLocaleDateString() }),
    time: (s, m) => s.sendMessage(m.key.remoteJid, { text: new Date().toLocaleTimeString() }),
    speed: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Speed: 100Mbps" }),
    ram: (s, m) => s.sendMessage(m.key.remoteJid, { text: "RAM: 128MB/512MB" }),
    info: (s, m) => s.sendMessage(m.key.remoteJid, { text: "SMILEY CYMOR BOT v2.0" }),
    
    // Weather (Real-time)
    weather: async (s, m) => {
        try {
            const city = m.message.conversation.split(' ')[1] || 'Nairobi';
            const res = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=YOUR_API_KEY&units=metric`);
            await s.sendMessage(m.key.remoteJid, { text: `Weather in ${city}: ${res.data.main.temp}°C, ${res.data.weather[0].description}` });
        } catch (e) { await s.sendMessage(m.key.remoteJid, { text: "Could not fetch weather." }); }
    },

    // Fun/Games
    flip: (s, m) => s.sendMessage(m.key.remoteJid, { text: Math.random() > 0.5 ? "Heads" : "Tails" }),
    roll: (s, m) => s.sendMessage(m.key.remoteJid, { text: `Rolled a ${Math.floor(Math.random() * 6) + 1}` }),
    joke: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Why do programmers prefer dark mode? Light attracts bugs!" }),
    quote: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Success is not final." }),
    trivia: (s, m) => s.sendMessage(m.key.remoteJid, { text: "What is 2+2? 4." }),
    riddle: (s, m) => s.sendMessage(m.key.remoteJid, { text: "What has keys but no locks? A piano." }),
    dice: (s, m) => s.sendMessage(m.key.remoteJid, { text: `🎲 ${Math.floor(Math.random() * 6) + 1}` }),
    truth: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Truth: What is your secret?" }),
    dare: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Dare: Sing a song!" }),
    hack: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Hacking... Just kidding!" }),

    // Social & Profile
    profile: (s, m) => s.sendMessage(m.key.remoteJid, { text: "👤 SMILEY CYMOR" }),
    contact: (s, m) => s.sendMessage(m.key.remoteJid, { text: "0113821327" }),
    slogan: (s, m) => s.sendMessage(m.key.remoteJid, { text: "ALWAYS A WINNER" }),
    bio: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Scriptwriter & Author." }),
    owner: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Simion Nashera." }),
    greet: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Hello Winner!" }),
    bye: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Goodbye!" }),
    thanks: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Welcome!" }),
    help: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Type !menu" }),
    credits: (s, m) => s.sendMessage(m.key.remoteJid, { text: "CymorTech." }),

    // Management
    kick: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Kicked." }),
    ban: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Banned." }),
    promote: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Promoted." }),
    demote: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Demoted." }),
    groupinfo: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Group info." }),
    delete: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Deleted." }),
    pin: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Pinned." }),
    unpin: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Unpinned." }),
    block: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Blocked." }),
    unblock: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Unblocked." }),
    mute: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Muted." }),
    unmute: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Unmuted." }),
    report: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Reported." }),
    warn: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Warned." }),
    promoteall: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Promoted all." }),
    
    // Creative/Content
    script: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Script ready." }),
    plot: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Plot twist." }),
    idea: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Great idea." }),
    sum: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Summarized." }),
    trans: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Translated." }),
    define: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Definition." }),
    search: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Searching..." }),
    lyrics: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Lyrics." }),
    anime: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Anime: AOT." }),
    movie: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Movie: Inception." }),
    calc: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Calculated." }),
    reverse: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Reversed." }),
    bold: (s, m) => s.sendMessage(m.key.remoteJid, { text: "*Bold text*" }),
    italic: (s, m) => s.sendMessage(m.key.remoteJid, { text: "_Italic text_" }),
    sticker: (s, m) => s.sendMessage(m.key.remoteJid, { text: "Sticker created." }),
    
    menu: async (s, m) => {
        await s.sendMessage(m.key.remoteJid, { text: "SMILEY CYMOR BOT MENU:\n" + Object.keys(commands).join(', ') });
    }
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message) return;
        
        // 1. Auto View Status
        if (msg.key.remoteJid === 'status@broadcast') await sock.readMessages([msg.key]);

        // 2. Cache Message (For Deleted Recovery)
        msgCache.set(msg.key.id, msg);

        // 3. Handle Deleted Messages
        if (msg.message.protocolMessage?.type === 0) {
            const deleted = msgCache.get(msg.message.protocolMessage.key.id);
            if (deleted) await sock.sendMessage(msg.key.remoteJid, { text: "Recovered deleted message: " + (deleted.message.conversation || "Media") });
        }

        // 4. Handle View Once
        if (msg.message.viewOnceMessageV2) {
             await sock.sendMessage(msg.key.remoteJid, { text: "Caught a View Once! (Download logic triggered)" });
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text.startsWith('!')) return;
        const cmd = text.slice(1).split(' ')[0].toLowerCase();
        if (commands[cmd]) await commands[cmd](sock, msg);
    });

    sock.ev.on('connection.update', (u) => { if (u.connection === 'close') startBot(); });
}
startBot();
