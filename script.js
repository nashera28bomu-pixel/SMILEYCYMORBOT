// =============================================
// CYMOR AI ELITE SCRIPT
// FIREBASE MEMORY + ELITE UI
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
// DOM
// =============================================
const chatBox =
    document.getElementById("chatBox");

const userInput =
    document.getElementById("userInput");

const sendBtn =
    document.getElementById("sendBtn");

// =============================================
// CURRENT USER
// =============================================
let currentUser = null;

// =============================================
// AUTH LISTENER
// =============================================
auth.onAuthStateChanged(async (user) => {

    if (user) {

        currentUser = user;

        console.log(
            "🔥 Logged in:",
            user.email
        );

        // SHOW APP
        document.getElementById(
            "loginScreen"
        ).style.display = "none";

        document.getElementById(
            "app"
        ).style.display = "flex";

        // USER NAME
        const firstName =
            user.displayName
                ? user.displayName.split(" ")[0]
                : "User";

        document.getElementById(
            "userName"
        ).innerText = firstName;

        // LOAD HISTORY
        await loadChatHistory();

        // WELCOME MESSAGE
        if (
            chatBox.children.length === 0
        ) {

            showWelcome(firstName);
        }

    } else {

        document.getElementById(
            "loginScreen"
        ).style.display = "flex";

        document.getElementById(
            "app"
        ).style.display = "none";
    }
});

// =============================================
// WELCOME MESSAGE
// =============================================
function showWelcome(name) {

    const message =
        createMessage("", "bot");

    typeWriter(

        message,

        `👋 Hi ${name}, how may I help you today?`,

        18
    );
}

// =============================================
// LOAD CHAT HISTORY
// =============================================
async function loadChatHistory() {

    if (!currentUser) return;

    chatBox.innerHTML = "";

    try {

        const chatRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "chats"
            );

        const q =
            query(
                chatRef,
                orderBy("timestamp"),
                limit(50)
            );

        const snapshot =
            await getDocs(q);

        snapshot.forEach(doc => {

            const data =
                doc.data();

            createMessage(
                data.text,
                data.sender
            );
        });

    } catch (error) {

        console.error(
            "🔥 History Error:",
            error
        );
    }
}

// =============================================
// SAVE MESSAGE
// =============================================
async function saveMessage(
    text,
    sender
) {

    if (!currentUser) return;

    try {

        const chatRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "chats"
            );

        await addDoc(chatRef, {

            text,
            sender,

            timestamp:
                new Date()
        });

    } catch (error) {

        console.error(
            "🔥 Save Error:",
            error
        );
    }
}

// =============================================
// SEND MESSAGE
// =============================================
async function sendMessage() {

    const message =
        userInput.value.trim();

    if (
        !message ||
        !currentUser
    ) return;

    // DISABLE
    userInput.disabled = true;
    sendBtn.disabled = true;

    // USER MESSAGE
    createMessage(
        message,
        "user"
    );

    await saveMessage(
        message,
        "user"
    );

    // CLEAR INPUT
    userInput.value = "";

    // THINKING UI
    const thinking =
        createThinkingMessage();

    try {

        // FETCH
        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    message,

                    userId:
                        currentUser.uid
                })
            });

        const data =
            await response.json();

        thinking.remove();

        if (!response.ok) {

            throw new Error(
                data.reply ||
                "Connection failed"
            );
        }

        // BOT MESSAGE
        const botMessage =
            createMessage("", "bot");

        typeWriter(
            botMessage,
            data.reply,
            8
        );

        await saveMessage(
            data.reply,
            "bot"
        );

    } catch (error) {

        thinking.remove();

        createMessage(
            `⚠️ ${error.message}`,
            "bot"
        );
    }

    finally {

        userInput.disabled = false;
        sendBtn.disabled = false;

        userInput.focus();
    }
}

// =============================================
// CREATE MESSAGE
// =============================================
function createMessage(
    text,
    sender
) {

    const message =
        document.createElement("div");

    message.className =
        `message ${sender}`;

    message.innerHTML = text;

    // ELITE STYLE
    message.style.padding = "14px";
    message.style.margin = "12px";
    message.style.borderRadius = "16px";
    message.style.fontFamily = "'Outfit', sans-serif";
    message.style.lineHeight = "1.6";
    message.style.animation =
        "fadeIn 0.4s ease";

    if (sender === "user") {

        message.style.background =
            "linear-gradient(45deg,#ff0033,#660000)";

        message.style.color = "white";

        message.style.marginLeft = "auto";

        message.style.maxWidth = "80%";

    } else {

        message.style.background =
            "rgba(255,255,255,0.05)";

        message.style.border =
            "1px solid rgba(255,0,51,0.2)";

        message.style.color =
            "#ffffff";

        message.style.maxWidth =
            "85%";
    }

    chatBox.appendChild(message);

    scrollToBottom();

    return message;
}

// =============================================
// THINKING MESSAGE
// =============================================
function createThinkingMessage() {

    const thinking =
        document.createElement("div");

    thinking.className =
        "message bot";

    thinking.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:12px;
            padding:10px;
        ">

            <div class="brain-loader"></div>

            <div style="
                color:#ff3355;
                font-weight:600;
                font-family:'Orbitron',sans-serif;
                text-shadow:0 0 10px red;
            ">
                🧠 CymorAI is thinking...
            </div>

        </div>
    `;

    chatBox.appendChild(thinking);

    scrollToBottom();

    return thinking;
}

// =============================================
// TYPEWRITER
// =============================================
function typeWriter(
    element,
    text,
    speed = 10
) {

    let i = 0;

    element.innerHTML = "";

    function type() {

        if (i < text.length) {

            element.innerHTML +=
                text.charAt(i);

            i++;

            scrollToBottom();

            setTimeout(
                type,
                speed
            );
        }
    }

    type();
}

// =============================================
// AUTO SCROLL
// =============================================
function scrollToBottom() {

    chatBox.scrollTo({

        top:
            chatBox.scrollHeight,

        behavior:
            "smooth"
    });
}

// =============================================
// ENTER KEY
// =============================================
function handleKey(event) {

    if (
        event.key === "Enter"
    ) {

        sendMessage();
    }
}

// =============================================
// QUICK PROMPTS
// =============================================
function setPrompt(text) {

    userInput.value = text;

    userInput.focus();
}

// =============================================
// BUTTON STYLE
// =============================================
if (sendBtn) {

    sendBtn.style.background =
        "linear-gradient(45deg,#ff0033,#660000)";

    sendBtn.style.border = "none";

    sendBtn.style.color = "white";

    sendBtn.style.borderRadius =
        "14px";

    sendBtn.style.padding =
        "14px 18px";

    sendBtn.style.cursor =
        "pointer";

    sendBtn.style.boxShadow =
        "0 0 20px rgba(255,0,0,0.5)";

    sendBtn.style.fontSize =
        "18px";

    sendBtn.style.transition =
        "0.3s";
}

// =============================================
// GLOWING BRAIN STYLE
// =============================================
const style =
    document.createElement("style");

style.innerHTML = `

.brain-loader{

    width:18px;
    height:18px;

    border-radius:50%;

    background:#ff0033;

    box-shadow:
        0 0 10px #ff0033,
        0 0 20px #ff0033,
        0 0 35px #ff0033;

    animation:
        pulseBrain 1s infinite;
}

@keyframes pulseBrain{

    0%{
        transform:scale(1);
        opacity:1;
    }

    50%{
        transform:scale(1.3);
        opacity:0.6;
    }

    100%{
        transform:scale(1);
        opacity:1;
    }
}

@keyframes fadeIn{

    from{
        opacity:0;
        transform:translateY(10px);
    }

    to{
        opacity:1;
        transform:translateY(0);
    }
}
`;

document.head.appendChild(style);

// =============================================
// GLOBAL ACCESS
// =============================================
window.sendMessage =
    sendMessage;

window.setPrompt =
    setPrompt;

window.handleKey =
    handleKey;
