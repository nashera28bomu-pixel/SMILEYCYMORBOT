import { auth, db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit
} from "firebase/firestore";

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
// AUTH LISTENER (IDENTIFY USER)
// =============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;

        console.log("🔥 Logged in:", user.email);

        await loadChatHistory();
    }
});

// =============================================
// LOAD CHAT HISTORY (FIREBASE MEMORY)
// =============================================
async function loadChatHistory() {
    if (!currentUser) return;

    const chatRef = collection(db, "users", currentUser.uid, "chats");
    const q = query(chatRef, orderBy("timestamp"), limit(50));

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();
        createMessage(data.text, data.sender);
    });
}

// =============================================
// SAVE MESSAGE TO FIREBASE MEMORY
// =============================================
async function saveMessage(text, sender) {
    if (!currentUser) return;

    const chatRef = collection(db, "users", currentUser.uid, "chats");

    await addDoc(chatRef, {
        text,
        sender,
        timestamp: new Date()
    });
}

// =============================================
// QUICK PROMPTS
// =============================================
function setPrompt(text) {
    userInput.value = text;
    userInput.focus();
}

// =============================================
// ENTER KEY
// =============================================
function handleKey(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// =============================================
// CREATE MESSAGE (ELITE UI)
// =============================================
function createMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.innerHTML = text;

    chatBox.appendChild(message);
    scrollToBottom();

    return message;
}

// =============================================
// AUTO SCROLL
// =============================================
function scrollToBottom() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
}

// =============================================
// TYPEWRITER EFFECT
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
// THINKING ANIMATION
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
// SEND MESSAGE (WITH MEMORY + FIREBASE)
// =============================================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    userInput.disabled = true;

    // USER MESSAGE
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
                userId: currentUser?.uid
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

        createMessage(
            `⚠️ ${error.message}`,
            "bot"
        );
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
            "🚀 CymorAI Neural Core Active. Waiting for authenticated user...",
            "bot"
        );
    }, 1000);
});

// GLOBAL ACCESS
window.sendMessage = sendMessage;
window.setPrompt = setPrompt;
window.handleKey = handleKey;
