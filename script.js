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
// AUTH LISTENER
// =============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("🔥 Logged in:", user.email);

        const loginScreen = document.getElementById("loginScreen");
        const appScreen = document.getElementById("app");
        const userNameDisp = document.getElementById("userName");

        if(loginScreen) loginScreen.style.display = "none";
        if(appScreen) appScreen.style.display = "flex";
        
        // Get name for UI and Welcome message
        const firstName = user.displayName ? user.displayName.split(' ')[0] : "User";
        if(userNameDisp) userNameDisp.innerText = firstName;

        // LOAD MEMORY
        await loadChatHistory();

        // SEND PERSONALIZED WELCOME (Only if chat is empty)
        if (chatBox.children.length === 0) {
            sendWelcomeMessage(firstName);
        }

    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
});

// =============================================
// NEW: WELCOME MESSAGE FUNCTION
// =============================================
function sendWelcomeMessage(name) {
    const welcomeText = `Hi ${name}! How may I be of help to you today?`;
    const botMessage = createMessage("", "bot");
    typeWriter(botMessage, welcomeText, 20);
}

// =============================================
// LOAD CHAT HISTORY
// =============================================
async function loadChatHistory() {
    if (!currentUser) return;
    chatBox.innerHTML = "";

    const chatRef = collection(db, "users", currentUser.uid, "chats");
    const q = query(chatRef, orderBy("timestamp"), limit(50));

    try {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const data = doc.data();
            createMessage(data.text, data.sender);
        });
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

// =============================================
// SAVE MESSAGE
// =============================================
async function saveMessage(text, sender) {
    if (!currentUser) return;
    const chatRef = collection(db, "users", currentUser.uid, "chats");
    try {
        await addDoc(chatRef, {
            text,
            sender,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error saving to Firebase:", e);
    }
}

// =============================================
// SEND MESSAGE (FIXED LOGIC)
// =============================================
async function sendMessage() {
    const message = userInput.value.trim();
    
    // Prevent sending if empty OR if user isn't logged in yet
    if (!message || !currentUser) return;

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
                userId: currentUser.uid
            })
        });

        const data = await response.json();
        if (thinking) thinking.remove();

        if (!response.ok) throw new Error(data.reply || "Server connection failed");

        const botMessage = createMessage("", "bot");
        typeWriter(botMessage, data.reply, 8);
        await saveMessage(data.reply, "bot");

    } catch (error) {
        if (thinking) thinking.remove();
        createMessage(`⚠️ Error: ${error.message}`, "bot");
    } finally {
        userInput.disabled = false;
        userInput.focus();
    }
}

// =============================================
// HELPER FUNCTIONS (KEEPING YOUR UI LOGIC)
// =============================================
function createMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.innerHTML = text;
    chatBox.appendChild(message);
    scrollToBottom();
    return message;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

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

function createThinkingMessage() {
    const thinking = document.createElement("div");
    thinking.className = "message bot thinking";
    thinking.innerHTML = "⚡ CymorAI processing...";
    chatBox.appendChild(thinking);
    scrollToBottom();
    return thinking;
}

function handleKey(event) {
    if (event.key === "Enter") sendMessage();
}

function setPrompt(text) {
    userInput.value = text;
    userInput.focus();
}

// GLOBAL ACCESS
window.sendMessage = sendMessage;
window.setPrompt = setPrompt;
window.handleKey = handleKey;
