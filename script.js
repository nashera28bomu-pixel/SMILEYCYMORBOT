// =============================================
// CYMOR AI ELITE SCRIPT (BRANDED VERSION)
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
let chatBox, userInput, sendBtn, imageUpload;
let currentUser = null;
let selectedImageBase64 = null;

const deviceInfo = navigator.userAgent;
let detectedCountry = "Unknown";

try {
    detectedCountry = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/")[0];
} catch {
    detectedCountry = "Unknown";
}

// =============================================
// DOM INITIALIZATION
// =============================================
window.addEventListener("DOMContentLoaded", () => {
    chatBox = document.getElementById("chatBox");
    userInput = document.getElementById("userInput");
    sendBtn = document.getElementById("sendBtn");
    imageUpload = document.getElementById("imageUpload");

    // Bind Image Upload events if the elements exist
    if (imageUpload) {
        imageUpload.addEventListener("change", handleImageSelect);
    }
    
    console.log("✅ CYMOR UI INITIALIZED");
});

// =============================================
// IMAGE HANDLING
// =============================================
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
        alert("Image too large. Please select an image under 4MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        selectedImageBase64 = event.target.result;
        
        // Visual indicator on the attachment button that an image is staged
        const uploadBtn = document.querySelector(".upload-btn");
        if (uploadBtn) {
            uploadBtn.innerHTML = "✅";
            uploadBtn.style.borderColor = "var(--green)";
        }
    };
    reader.readAsDataURL(file);
}

window.clearImage = () => {
    selectedImageBase64 = null;
    if (imageUpload) imageUpload.value = '';
    
    const uploadBtn = document.querySelector(".upload-btn");
    if (uploadBtn) {
        uploadBtn.innerHTML = "📎";
        uploadBtn.style.borderColor = "";
    }
};

// =============================================
// AUTH STATE MANAGEMENT
// =============================================
auth.onAuthStateChanged(async (user) => {
    const loginScreen = document.getElementById("loginScreen");
    const appContainer = document.getElementById("app");

    if (user) {
        currentUser = user;
        if (loginScreen) loginScreen.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";

        const firstName = user.displayName ? user.displayName.split(" ")[0] : "Explorer";

        await updateUserAnalytics(user);
        await loadChatHistory();

        if (chatBox && chatBox.children.length === 0) {
            sendWelcome(firstName);
        }
    } else {
        if (loginScreen) loginScreen.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";
    }
});

// =============================================
// CORE CHAT ACTIONS
// =============================================
async function sendMessage() {
    if (!userInput || !chatBox || !currentUser) return;

    const message = userInput.value.trim();
    if (!message && !selectedImageBase64) return;

    // UI Lock down during network request
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Create container message bubble
    const userMsgDiv = createMessage(message, "user");

    // Append image if staged
    if (selectedImageBase64) {
        const imgTag = document.createElement('img');
        imgTag.src = selectedImageBase64;
        imgTag.style.cssText = "max-width:100%; border-radius:12px; margin-top:10px; display:block; border:1px solid rgba(255,255,255,0.2)";
        userMsgDiv.appendChild(imgTag);
    }

    const currentImgData = selectedImageBase64;
    window.clearImage();
    userInput.value = "";

    await saveMessage(message || "[Image]", "user");
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

        if (!response.ok) throw new Error(data.reply || "Engine connection failure.");

        const botMsg = createMessage("", "bot");

        // Image Response Process
        if (data.type === "image") {
            botMsg.innerHTML = `
                <img src="${data.url}" style="width:100%; border-radius:12px; margin-bottom:10px; border:1px solid var(--green);" alt="Generated Asset">
                <br>${data.reply}
                <br><br><span style="font-size:11px; opacity:0.5;">✨ Powered by Cymor AI</span>
            `;
            await saveMessage(`[Image Generated] ${message}`, "bot");
        } 
        // Text Response Process
        else {
            typeWriter(botMsg, data.reply + "\n\n✨ Powered by Cymor AI", 12);
            await saveMessage(data.reply, "bot");
        }

    } catch (error) {
        if (document.querySelector(".thinking")) {
            document.querySelector(".thinking").remove();
        }
        createMessage(`⚠️ Error: ${error.message}`, "bot");
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// =============================================
// DATABASE OPERATIONS
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
    } catch (error) {
        console.error("🔥 Analytics Sync Error:", error);
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

        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            totalMessages: increment(1),
            lastActive: serverTimestamp(),
            aiRequests: increment(sender === "user" ? 1 : 0)
        });
    } catch (error) {
        console.error("🔥 Firestore Save Error:", error);
    }
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
    } catch (error) {
        console.error("🔥 History Retrieval Error:", error);
    }
}

// =============================================
// INTERFACE STRUCTURAL INJECTIONS
// =============================================
function createMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = text.replace(/\n/g, "<br>");

    // Colors now lean directly on the stylesheet logic instead of overwriting classes inline
    chatBox.appendChild(msg);
    scrollToBottom();
    return msg;
}

function createThinkingMessage() {
    const div = document.createElement("div");
    div.className = "message bot thinking";
    div.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:12px;height:12px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:pulse 1s infinite;"></div>
            <span style="font-size:14px; color: #a1a1aa;">CymorAI processing...</span>
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

    if (instant) {
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        setTimeout(() => {
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
        }, 40);
    }
}

function sendWelcome(name) {
    const msg = createMessage("", "bot");
    typeWriter(
        msg,
        `👋 Welcome back, ${name}.\n\n🚀 CymorAI Neural Core is online and optimized.`,
        18
    );
}

// =============================================
// ENGINE WINDOW HOOKS
// =============================================
window.sendMessage = sendMessage;

window.handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

window.setPrompt = (text) => {
    if (!userInput) return;
    userInput.value = text;
    userInput.focus();
};

// =============================================
// COMPONENT SPECIFIC KEYFRAMES
// =============================================
const style = document.createElement("style");
style.innerHTML = `
@keyframes pulse {
  0% { transform:scale(1); opacity:1; }
  50% { transform:scale(1.2); opacity:0.6; }
  100% { transform:scale(1); opacity:1; }
}`;
document.head.appendChild(style);

console.log("🚀 CYMOR AI BRANDED SYSTEM OPERATIONAL");
