// =============================================
// CYMOR AI ELITE SCRIPT
// FULL FIRESTORE ANALYTICS INTEGRATION
// LEGENDARY SMILEY CYMOR EDITION
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
let chatBox;
let userInput;
let sendBtn;

let currentUser = null;

// =============================================
// DEVICE + COUNTRY DETECTION
// =============================================
const deviceInfo = navigator.userAgent;

let detectedCountry = "Unknown";

try {

    detectedCountry =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone
            .split("/")[0];

} catch {

    detectedCountry = "Unknown";
}

// =============================================
// DOM LOADED
// =============================================
window.addEventListener(

    "DOMContentLoaded",

    () => {

        chatBox =
            document.getElementById(
                "chatBox"
            );

        userInput =
            document.getElementById(
                "userInput"
            );

        sendBtn =
            document.getElementById(
                "sendBtn"
            );

        console.log(
            "✅ CYMOR UI INITIALIZED"
        );
    }
);

// =============================================
// AUTH STATE
// =============================================
auth.onAuthStateChanged(

    async (user) => {

        if (user) {

            currentUser = user;

            console.log(
                "🔥 Neural Link Established:",
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

                    ? user.displayName
                        .split(" ")[0]

                    : "Explorer";

            const userName =
                document.getElementById(
                    "userName"
                );

            if (userName) {

                userName.innerText =
                    firstName;
            }

            // =================================
            // UPDATE USER ANALYTICS
            // =================================
            await updateUserAnalytics(
                user
            );

            // LOAD HISTORY
            await loadChatHistory();

            // WELCOME
            setTimeout(() => {

                if (userInput) {

                    userInput.focus();

                    userInput.click();
                }

                if (
                    chatBox &&
                    chatBox.children.length === 0
                ) {

                    sendWelcome(
                        firstName
                    );
                }

            }, 800);

        }

        else {

            document.getElementById(
                "loginScreen"
            ).style.display = "flex";

            document.getElementById(
                "app"
            ).style.display = "none";
        }
    }
);

// =============================================
// UPDATE USER ANALYTICS
// =============================================
async function updateUserAnalytics(
    user
) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );

        await setDoc(

            userRef,

            {

                uid:
                    user.uid,

                name:
                    user.displayName ||
                    "User",

                email:
                    user.email ||

                    "Unknown",

                country:
                    detectedCountry,

                device:
                    deviceInfo,

                role:
                    "user",

                lastActive:
                    serverTimestamp(),

                createdAt:
                    serverTimestamp(),

                totalMessages:
                    increment(0),

                aiRequests:
                    increment(0),

                status:
                    "online"

            },

            {
                merge: true
            }
        );

    } catch (error) {

        console.error(
            "🔥 Analytics Error:",
            error
        );
    }
}

// =============================================
// WELCOME MESSAGE
// =============================================
function sendWelcome(name) {

    const msg =
        createMessage(
            "",
            "bot"
        );

    typeWriter(

        msg,

        `👋 Welcome back ${name}.\n\n🚀 CymorAI Neural Core is online and ready to assist you.`,

        18
    );
}

// =============================================
// LOAD CHAT HISTORY
// =============================================
async function loadChatHistory() {

    if (
        !currentUser ||
        !chatBox
    ) return;

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

                orderBy(
                    "timestamp",
                    "asc"
                ),

                limit(100)
            );

        const snapshot =
            await getDocs(q);

        snapshot.forEach((docu) => {

            const data =
                docu.data();

            createMessage(

                data.text,

                data.sender
            );
        });

        scrollToBottom(true);

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

        // SAVE MESSAGE
        await addDoc(

            chatRef,

            {

                text,

                sender,

                timestamp:
                    serverTimestamp(),

                userId:
                    currentUser.uid,

                email:
                    currentUser.email,

                country:
                    detectedCountry,

                device:
                    deviceInfo
            }
        );

        // UPDATE STATS
        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        await updateDoc(

            userRef,

            {

                totalMessages:
                    increment(1),

                lastActive:
                    serverTimestamp(),

                aiRequests:
                    increment(
                        sender === "user"
                            ? 1
                            : 0
                    )
            }
        );

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

    if (

        !userInput ||

        !chatBox ||

        !currentUser

    ) return;

    const message =
        userInput.value.trim();

    if (!message) return;

    // LOCK UI
    userInput.disabled = true;

    sendBtn.disabled = true;

    // USER BUBBLE
    createMessage(
        message,
        "user"
    );

    await saveMessage(
        message,
        "user"
    );

    userInput.value = "";

    // THINKING
    const thinking =
        createThinkingMessage();

    try {

        const response =
            await fetch(

                API_URL,

                {

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
                }
            );

        const data =
            await response.json();

        thinking.remove();

        if (!response.ok) {

            throw new Error(

                data.reply ||

                "Neural Core Interrupted"
            );
        }

        // BOT RESPONSE
        const botMsg =
            createMessage(
                "",
                "bot"
            );

        typeWriter(

            botMsg,

            data.reply,

            12
        );

        await saveMessage(
            data.reply,
            "bot"
        );

    } catch (error) {

        const think =
            document.querySelector(
                ".thinking"
            );

        if (think)
            think.remove();

        createMessage(

            `⚠️ ${error.message}`,

            "bot"
        );
    }

    finally {

        userInput.disabled =
            false;

        sendBtn.disabled =
            false;

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

    const msg =
        document.createElement("div");

    msg.className =
        `message ${sender}`;

    msg.innerHTML =
        text.replace(/\n/g,"<br>");

    // USER STYLE
    if (sender === "user") {

        msg.style.alignSelf =
            "flex-end";

        msg.style.background =
            "linear-gradient(135deg,#00ffaa,#0066ff)";

        msg.style.color =
            "#000";

        msg.style.fontWeight =
            "600";
    }

    // BOT STYLE
    else {

        msg.style.alignSelf =
            "flex-start";

        msg.style.background =
            "rgba(255,255,255,0.05)";

        msg.style.border =
            "1px solid rgba(0,255,170,0.2)";

        msg.style.color =
            "#ffffff";
    }

    chatBox.appendChild(msg);

    scrollToBottom();

    return msg;
}

// =============================================
// THINKING UI
// =============================================
function createThinkingMessage() {

    const div =
        document.createElement("div");

    div.className =
        "message bot thinking";

    div.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:10px;
        ">

            <div style="
                width:14px;
                height:14px;
                border-radius:50%;
                background:#00ffaa;
                box-shadow:
                    0 0 10px #00ffaa,
                    0 0 25px #00ffaa;
                animation:pulse 1s infinite;
            "></div>

            <span>
                🧠 CymorAI is processing...
            </span>

        </div>
    `;

    chatBox.appendChild(div);

    scrollToBottom();

    return div;
}

// =============================================
// TYPEWRITER
// =============================================
function typeWriter(

    element,

    text,

    speed = 15
) {

    let i = 0;

    element.innerHTML = "";

    function type() {

        if (i < text.length) {

            element.innerHTML +=
                text.charAt(i);

            i++;

            chatBox.scrollTop =
                chatBox.scrollHeight;

            setTimeout(
                type,
                speed
            );
        }
    }

    type();
}

// =============================================
// SCROLL
// =============================================
function scrollToBottom(
    instant = false
) {

    if (!chatBox) return;

    if (instant) {

        chatBox.scrollTop =
            chatBox.scrollHeight;
    }

    else {

        setTimeout(() => {

            chatBox.scrollTo({

                top:
                    chatBox.scrollHeight,

                behavior:
                    "smooth"
            });

        }, 40);
    }
}

// =============================================
// GLOBAL FUNCTIONS
// =============================================
window.sendMessage =
    sendMessage;

window.handleKey =
    (e) => {

        if (

            e.key === "Enter" &&

            !e.shiftKey
        ) {

            e.preventDefault();

            sendMessage();
        }
    };

window.setPrompt =
    (text) => {

        userInput.value =
            text;

        userInput.focus();
    };

// =============================================
// GLOW ANIMATION
// =============================================
const style =
    document.createElement("style");

style.innerHTML = `

@keyframes pulse{

    0%{
        transform:scale(1);
        opacity:1;
    }

    50%{
        transform:scale(1.3);
        opacity:0.5;
    }

    100%{
        transform:scale(1);
        opacity:1;
    }
}
`;

document.head.appendChild(style);

console.log(
    "🚀 CYMOR AI ELITE SYSTEM LOADED"
);
