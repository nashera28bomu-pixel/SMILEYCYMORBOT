// =============================================
// CYMOR AI ELITE SCRIPT
// FIREBASE MEMORY + STABLE UI FIX
// =============================================

import { auth, db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================
// API URL
// =============================================
const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/chat"
        : "/chat";

// =============================================
// DOM (SAFE INIT)
// =============================================
let chatBox, userInput, sendBtn;
let currentUser = null;

// =============================================
// DOM READY CHECK (IMPORTANT FIX YOU ADDED)
// =============================================
window.addEventListener("DOMContentLoaded", () => {

    chatBox = document.getElementById("chatBox");
    userInput = document.getElementById("userInput");
    sendBtn = document.getElementById("sendBtn");

    if (!chatBox || !userInput) {
        console.error("Chat UI not loaded properly");
        return;
    }
});

// =============================================
// AUTH LISTENER
// =============================================
auth.onAuthStateChanged(async (user) => {

    if (user) {

        currentUser = user;

        console.log("🔥 Logged in:", user.email);

        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "flex";

        const firstName =
            user.displayName
                ? user.displayName.split(" ")[0]
                : "User";

        document.getElementById("userName").innerText = firstName;

        await loadChatHistory();

        if (chatBox && chatBox.children.length === 0) {
            showWelcome(firstName);
        }

    } else {

        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
});

// =============================================
// WELCOME MESSAGE
// =============================================
function showWelcome(name) {

    const msg = createMessage("", "bot");

    typeWriter(
        msg,
        `👋 Hi ${name}, how may I help you today?`,
        18
    );
}

// =============================================
// LOAD HISTORY
// =============================================
async function loadChatHistory() {

    if (!currentUser || !chatBox) return;

    chatBox.innerHTML = "";

    const chatRef =
        collection(db, "users", currentUser.uid, "chats");

    const q =
        query(chatRef, orderBy("timestamp"), limit(50));

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();
        createMessage(data.text, data.sender);
    });
}

// =============================================
// SAVE MESSAGE
// =============================================
async function saveMessage(text, sender) {

    if (!currentUser) return;

    const chatRef =
        collection(db, "users", currentUser.uid, "chats");

    await addDoc(chatRef, {
        text,
        sender,
        timestamp: new Date()
    });
}

// =============================================
// SEND MESSAGE (FIXED SAFE VERSION)
// =============================================
async function sendMessage() {

    if (!userInput || !chatBox || !currentUser) return;

    const message = userInput.value.trim();
    if (!message) return;

    userInput.disabled = true;
    sendBtn.disabled = true;

    createMessage(message, "user");
    await saveMessage(message, "user");

    userInput.value = "";

    const thinking = createThinkingMessage();

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                userId: currentUser.uid
            })
        });

        const data = await response.json();

        thinking.remove();

        if (!response.ok) {
            throw new Error(data.reply || "Connection failed");
        }

        const botMsg = createMessage("", "bot");
        typeWriter(botMsg, data.reply, 8);

        await saveMessage(data.reply, "bot");

    } catch (error) {

        thinking.remove();

        createMessage(`⚠️ ${error.message}`, "bot");

    } finally {

        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// =============================================
// CREATE MESSAGE
// =============================================
function createMessage(text, sender) {

    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = text;

    msg.style.padding = "14px";
    msg.style.margin = "12px";
    msg.style.borderRadius = "16px";
    msg.style.lineHeight = "1.6";
    msg.style.animation = "fadeIn 0.3s ease";

    if (sender === "user") {

        msg.style.background =
            "linear-gradient(45deg,#ff0033,#660000)";
        msg.style.color = "white";
        msg.style.marginLeft = "auto";
        msg.style.maxWidth = "80%";

    } else {

        msg.style.background =
            "rgba(255,255,255,0.05)";
        msg.style.border =
            "1px solid rgba(255,0,51,0.2)";
        msg.style.maxWidth = "85%";
    }

    chatBox.appendChild(msg);
    scrollToBottom();

    return msg;
}

// =============================================
// THINKING MESSAGE
// =============================================
function createThinkingMessage() {

    const div = document.createElement("div");
    div.className = "message bot thinking";

    div.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <div class="brain-loader"></div>
            🧠 CymorAI is thinking...
        </div>
    `;

    chatBox.appendChild(div);
    scrollToBottom();

    return div;
}

// =============================================
// TYPEWRITER
// =============================================
function typeWriter(element, text, speed = 10) {

    let i = 0;
    element.innerHTML = "";

    function type() {

        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            scrollToBottom();
            setTimeout(type, speed);
        }
    }

    type();
}

// =============================================
// SCROLL
// =============================================
function scrollToBottom() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
}

// =============================================
// KEY HANDLER
// =============================================
function handleKey(event) {
    if (event.key === "Enter") sendMessage();
}

// =============================================
// PROMPT
// =============================================
function setPrompt(text) {
    userInput.value = text;
    userInput.focus();
}

// =============================================
// GLOBAL EXPORTS
// =============================================
window.sendMessage = sendMessage;
window.setPrompt = setPrompt;
window.handleKey = handleKey;
