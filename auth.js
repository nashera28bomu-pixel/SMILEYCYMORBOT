import { auth, db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "firebase/firestore";

import {
    onAuthStateChanged
} from "firebase/auth";

// =============================================
// CYMOR AI ELITE SCRIPT + FIREBASE MEMORY
// =============================================

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/chat"
        : "/chat";

// DOM
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");

// CURRENT USER
let currentUser = null;

// =============================================
// AUTH LISTENER (FIXED)
// =============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        console.log("🔥 Logged in:", user.email);

        await loadChatHistory();
    }
});

// =============================================
// LOAD CHAT HISTORY
// =============================================
async function loadChatHistory() {
    if (!currentUser) return;

    try {
        const chatRef = collection(db, "users", currentUser.uid, "chats");
        const q = query(chatRef, orderBy("timestamp"), limit(50));

        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            createMessage(data.text, data.sender);
        });

    } catch (err) {
        console.error("Chat load error:", err);
    }
}

// =============================================
// SAVE MESSAGE
// =============================================
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
        console.error("Save error:", err);
    }
}

// =============================================
// UI FUNCTIONS
// =============================================
function setPrompt(text) {
    userInput.value = text;
    userInput.focus();
}

function handleKey(event) {
    if (event.key === "Enter") sendMessage();
}

function createMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.innerHTML = text;

    chatBox.appendChild(message);
    scrollToBottom();

    return message;
}

function scrollToBottom() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
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
// THINKING
// =============================================
function createThinkingMessage() {
    const thinking = document.createElement("div");
    thinking.className = "message bot";
    thinking.innerHTML = "⚡ CymorAI processing neural memory...";
    chatBox.appendChild(thinking);
    scrollToBottom();
    return thinking;
}

// =============================================
// SEND MESSAGE
// =============================================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    if (!currentUser) {
        alert("Please login first");
        return;
    }

    userInput.disabled = true;

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

        if (!response.ok) throw new Error(data.reply);

        const botMessage = createMessage("", "bot");
        typeWriter(botMessage, data.reply, 8);

        await saveMessage(data.reply, "bot");

    } catch (error) {
        thinking.remove();
        createMessage(`⚠️ ${error.message}`, "bot");
    }

    userInput.disabled = false;
    userInput.focus();
}

// =============================================
// STARTUP
// =============================================
window.addEventListener("load", () => {
    setTimeout(() => {
        createMessage(
            "🚀 CymorAI Neural Core Active. Waiting for authentication...",
            "bot"
        );
    }, 1000);
});

// GLOBAL EXPORT
window.sendMessage = sendMessage;
window.setPrompt = setPrompt;
window.handleKey = handleKey;
