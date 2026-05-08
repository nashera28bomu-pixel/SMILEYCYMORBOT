// =============================================
// CYMOR AI ELITE SCRIPT - FULL INTEGRATION
// =============================================

import { auth, db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================
// API CONFIGURATION
// =============================================
const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/chat"
        : "/chat";

// =============================================
// GLOBAL STATE & DOM
// =============================================
let chatBox, userInput, sendBtn;
let currentUser = null;

// Ensure DOM is ready before assigning elements
window.addEventListener("DOMContentLoaded", () => {
    chatBox = document.getElementById("chatBox");
    userInput = document.getElementById("userInput");
    sendBtn = document.getElementById("sendBtn");
});

// =============================================
// AUTH LISTENER & UI TRANSITION
// =============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("🔥 Neural Link Established:", user.email);

        // UI Transitions
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "flex";

        // Set User Name
        const firstName = user.displayName ? user.displayName.split(" ")[0] : "Explorer";
        document.getElementById("userName").innerText = firstName;

        // Load Chat
        await loadChatHistory();

        // Updated Logic: Auto-welcome every time a link is established
        if (chatBox) {
            setTimeout(() => sendWelcome(firstName), 500);
        }
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
});

// =============================================
// WELCOME MESSAGE LOGIC
// =============================================
function sendWelcome(name) {
    const welcomeMsg = createMessage("", "bot");
    typeWriter(welcomeMsg, `Hi ${name}! 🚀 How may I be of help to you today?`, 30);
}

// =============================================
// DATABASE OPERATIONS
// =============================================
async function loadChatHistory() {
    if (!currentUser || !chatBox) return;
    chatBox.innerHTML = "";

    try {
        const chatRef = collection(db, "users", currentUser.uid, "chats");
        const q = query(chatRef, orderBy("timestamp", "asc"), limit(50));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            createMessage(data.text, data.sender);
        });
        scrollToBottom(true); // Instant scroll for history
    } catch (err) {
        console.error("History Error:", err);
    }
}

async function saveMessage(text, sender) {
    if (!currentUser) return;
    try {
        const chatRef = collection(db, "users", currentUser.uid, "chats");
        await addDoc(chatRef, {
            text,
            sender,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Save Error:", err);
    }
}

// =============================================
// CORE CHAT LOGIC
// =============================================
async function sendMessage() {
    if (!userInput || !chatBox || !currentUser) return;

    const message = userInput.value.trim();
    if (!message) return;

    // Lock UI
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Display User Message
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

        if (!response.ok) throw new Error(data.reply || "Neural Link Interrupted");

        const botMsg = createMessage("", "bot");
        typeWriter(botMsg, data.reply, 15);
        await saveMessage(data.reply, "bot");

    } catch (error) {
        if(document.querySelector('.thinking')) document.querySelector('.thinking').remove();
        createMessage(`⚠️ System Error: ${error.message}`, "bot");
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// =============================================
// UI HELPERS (BUBBLES & TYPEWRITER)
// =============================================
function createMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`; 
    msg.innerHTML = text;

    chatBox.appendChild(msg);
    scrollToBottom();
    return msg;
}

function createThinkingMessage() {
    const div = document.createElement("div");
    div.className = "message bot thinking";
    div.innerHTML = `🧠 CymorAI is processing...`;
    chatBox.appendChild(div);
    scrollToBottom();
    return div;
}

function typeWriter(element, text, speed = 20) {
    let i = 0;
    element.innerHTML = "";
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            // Instant scroll during typing for smoothness
            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}

// Enhanced Scroll Logic
function scrollToBottom(instant = false) {
    if (!chatBox) return;
    if (instant) {
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        setTimeout(() => {
            chatBox.scrollTo({
                top: chatBox.scrollHeight,
                behavior: "smooth"
            });
        }, 50);
    }
}

// =============================================
// GLOBAL EVENT EXPORTS
// =============================================
window.sendMessage = sendMessage;
window.handleKey = (e) => { 
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(); 
    }
};
window.setPrompt = (text) => { 
    userInput.value = text; 
    userInput.focus(); 
};
