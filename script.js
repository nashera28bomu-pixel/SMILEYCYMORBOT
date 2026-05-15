// =============================================
// CYMOR AI ELITE SCRIPT
// UPDATED WITH VISION & IMAGE GENERATION
// =============================================

import { auth, db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================
// API CONFIG
// =============================================
const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/chat"
        : "/chat";

// =============================================
// GLOBALS
// =============================================
let chatBox, userInput, sendBtn;
let currentUser = null;
let selectedImageBase64 = null; // New Global for Images

const deviceInfo = navigator.userAgent;
let detectedCountry = "Unknown";

try {
    detectedCountry = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/")[0];
} catch {
    detectedCountry = "Unknown";
}

// =============================================
// DOM LOADED
// =============================================
window.addEventListener("DOMContentLoaded", () => {
    chatBox = document.getElementById("chatBox");
    userInput = document.getElementById("userInput");
    sendBtn = document.getElementById("sendBtn");
    console.log("✅ CYMOR UI INITIALIZED");
});

// =============================================
// IMAGE HANDLING FUNCTIONS (GLOBAL)
// =============================================
window.handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Add size check (Groq limit is ~4MB for Base64)
    if (file.size > 4 * 1024 * 1024) {
        alert("Image too large. Please select an image under 4MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        selectedImageBase64 = event.target.result;
        document.getElementById('previewImg').src = selectedImageBase64;
        document.getElementById('imagePreview').style.display = 'flex';
    };
    reader.readAsDataURL(file);
};

window.clearImage = () => {
    selectedImageBase64 = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageInput').value = '';
};

// =============================================
// AUTH STATE
// =============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "flex";

        const firstName = user.displayName ? user.displayName.split(" ")[0] : "Explorer";
        
        await updateUserAnalytics(user);
        await loadChatHistory();

        if (chatBox && chatBox.children.length === 0) {
            sendWelcome(firstName);
        }
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
});

// =============================================
// CORE CHAT LOGIC
// =============================================
async function sendMessage() {
    if (!userInput || !chatBox || !currentUser) return;

    const message = userInput.value.trim();
    
    // Prevent sending empty data
    if (!message && !selectedImageBase64) return;

    // LOCK UI
    userInput.disabled = true;
    sendBtn.disabled = true;

    // USER BUBBLE (Logic to show text + image if present)
    const userMsgDiv = createMessage(message, "user");
    if (selectedImageBase64) {
        const imgTag = document.createElement('img');
        imgTag.src = selectedImageBase64;
        imgTag.style.cssText = "max-width:100%; border-radius:12px; margin-top:10px; display:block; border:1px solid rgba(255,255,255,0.2)";
        userMsgDiv.appendChild(imgTag);
    }

    // Capture image and clear preview for next message
    const currentImgData = selectedImageBase64;
    window.clearImage();
    userInput.value = "";

    await saveMessage(message || "[Neural Image Data]", "user");

    const thinking = createThinkingMessage();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                image: currentImgData,
                userId: currentUser.uid
            })
        });

        const data = await response.json();
        thinking.remove();

        if (!response.ok) throw new Error(data.reply || "Neural Core Interrupted");

        // BOT RESPONSE
        const botMsg = createMessage("", "bot");

        // Check if bot returned a generated image or just text
        if (data.type === "image") {
            botMsg.innerHTML = `<img src="${data.url}" style="width:100%; border-radius:12px; margin-bottom:10px; border:1px solid var(--green);"><br>${data.reply.replace(/\n/g, "<br>")}`;
            await saveMessage(`[Generated Image]: ${message}`, "bot");
        } else {
            typeWriter(botMsg, data.reply, 12);
            await saveMessage(data.reply, "bot");
        }

    } catch (error) {
        if (document.querySelector(".thinking")) document.querySelector(".thinking").remove();
        createMessage(`⚠️ ${error.message}`, "bot");
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// =============================================
// FIREBASE ANALYTICS & HISTORY
// =============================================
async function updateUserAnalytics(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || "User",
            email: user.email || "Unknown",
            country: detectedCountry,
            device: deviceInfo,
            lastActive: serverTimestamp(),
            status: "online"
        }, { merge: true });
    } catch (error) { console.error("🔥 Analytics Error:", error); }
}

async function saveMessage(text, sender) {
    if (!currentUser) return;
    try {
        const chatRef = collection(db, "users", currentUser.uid, "chats");
        await addDoc(chatRef, {
            text, sender, timestamp: serverTimestamp()
        });

        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            totalMessages: increment(1),
            lastActive: serverTimestamp(),
            aiRequests: increment(sender === "user" ? 1 : 0)
        });
    } catch (error) { console.error("🔥 Save Error:", error); }
}

async function loadChatHistory() {
    if (!currentUser || !chatBox) return;
    chatBox.innerHTML = "";
    try {
        const chatRef = collection(db, "users", currentUser.uid, "chats");
        const q = query(chatRef, orderBy("timestamp", "asc"), limit(50));
        const snapshot = await getDocs(q);
        snapshot.forEach((docu) => {
            const data = docu.data();
            createMessage(data.text, data.sender);
        });
        scrollToBottom(true);
    } catch (error) { console.error("🔥 History Error:", error); }
}

// =============================================
// UI HELPERS
// =============================================
function createMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = text.replace(/\n/g, "<br>");

    if (sender === "user") {
        msg.style.cssText = "align-self:flex-end; background:linear-gradient(135deg,#00ffaa,#0066ff); color:#000; font-weight:600;";
    } else {
        msg.style.cssText = "align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(0,255,170,0.2); color:#ffffff;";
    }

    chatBox.appendChild(msg);
    scrollToBottom();
    return msg;
}

function createThinkingMessage() {
    const div = document.createElement("div");
    div.className = "message bot thinking";
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:14px; height:14px; border-radius:50%; background:#00ffaa; box-shadow:0 0 10px #00ffaa; animation:pulse 1s infinite;"></div>
            <span>🧠 CymorAI is processing...</span>
        </div>`;
    chatBox.appendChild(div);
    scrollToBottom();
    return div;
}

function typeWriter(element, text, speed = 15) {
    let i = 0;
    element.innerHTML = "";
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i) === "\n" ? "<br>" : text.charAt(i);
            i++;
            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}

function scrollToBottom(instant = false) {
    if (!chatBox) return;
    if (instant) { chatBox.scrollTop = chatBox.scrollHeight; }
    else { setTimeout(() => { chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" }); }, 40); }
}

function sendWelcome(name) {
    const msg = createMessage("", "bot");
    typeWriter(msg, `👋 Welcome back ${name}.\n\n🚀 CymorAI Neural Core is online. I can now analyze images you upload or generate art if you type 'generate [prompt]'.`, 18);
}

// =============================================
// WINDOW ASSIGNMENTS
// =============================================
window.sendMessage = sendMessage;
window.handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
window.setPrompt = (text) => { userInput.value = text; userInput.focus(); };

// =============================================
// STYLE INJECTION
// =============================================
const style = document.createElement("style");
style.innerHTML = `@keyframes pulse{ 0%{transform:scale(1); opacity:1;} 50%{transform:scale(1.3); opacity:0.5;} 100%{transform:scale(1); opacity:1;} }`;
document.head.appendChild(style);

console.log("🚀 CYMOR AI ELITE SYSTEM LOADED");
