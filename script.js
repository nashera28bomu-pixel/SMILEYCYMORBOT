// =============================================
// CYMOR AI ELITE SCRIPT
// Optimized for GROQ Backend
// =============================================

// =============================================
// API URL
// =============================================
const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"

        ? "http://localhost:3000/chat"

        : "/chat";

// =============================================
// DOM ELEMENTS
// =============================================
const chatBox =
    document.getElementById("chatBox");

const userInput =
    document.getElementById("userInput");

// =============================================
// QUICK PROMPTS
// =============================================
function setPrompt(text) {

    userInput.value = text;

    userInput.focus();
}

// =============================================
// ENTER KEY SUPPORT
// =============================================
function handleKey(event) {

    if (event.key === "Enter") {

        sendMessage();
    }
}

// =============================================
// CREATE MESSAGE
// =============================================
function createMessage(text, sender) {

    const message =
        document.createElement("div");

    message.className =
        `message ${sender}`;

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
function typeWriter(element, text, speed = 12) {

    let index = 0;

    element.innerHTML = "";

    function type() {

        if (index < text.length) {

            element.innerHTML +=
                text.charAt(index);

            index++;

            scrollToBottom();

            setTimeout(type, speed);
        }
    }

    type();
}

// =============================================
// CYMOR THINKING MESSAGE
// =============================================
function createThinkingMessage() {

    const thinking =
        document.createElement("div");

    thinking.className =
        "message bot thinking";

    thinking.innerHTML = `
        <span class="thinking-text">
            ⚡ CymorAI neural engine processing...
        </span>
    `;

    chatBox.appendChild(thinking);

    scrollToBottom();

    return thinking;
}

// =============================================
// SEND MESSAGE
// =============================================
async function sendMessage() {

    const message =
        userInput.value.trim();

    if (!message) return;

    // =========================================
    // DISABLE INPUT TEMPORARILY
    // =========================================
    userInput.disabled = true;

    // =========================================
    // SHOW USER MESSAGE
    // =========================================
    createMessage(message, "user");

    // =========================================
    // CLEAR INPUT
    // =========================================
    userInput.value = "";

    // =========================================
    // SHOW THINKING
    // =========================================
    const thinkingMessage =
        createThinkingMessage();

    try {

        console.log(
            "📤 Sending to:",
            API_URL
        );

        // =====================================
        // FETCH REQUEST
        // =====================================
        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    message
                })
            });

        const data =
            await response.json();

        // =====================================
        // REMOVE THINKING
        // =====================================
        thinkingMessage.remove();

        // =====================================
        // ERROR CHECK
        // =====================================
        if (!response.ok) {

            throw new Error(
                data.reply ||
                "Unknown server error."
            );
        }

        // =====================================
        // CREATE BOT MESSAGE
        // =====================================
        const botMessage =
            createMessage("", "bot");

        // =====================================
        // TYPE RESPONSE
        // =====================================
        typeWriter(
            botMessage,
            data.reply,
            8
        );

    } catch (error) {

        console.error(
            "❌ CYMOR ERROR:",
            error
        );

        // REMOVE THINKING
        thinkingMessage.remove();

        // SHOW ERROR
        createMessage(
            `
            ⚠️ ${error.message}
            `,
            "bot"
        );

    } finally {

        // =====================================
        // ENABLE INPUT AGAIN
        // =====================================
        userInput.disabled = false;

        userInput.focus();
    }
}

// =============================================
// STARTUP ANIMATION
// =============================================
window.addEventListener("load", () => {

    console.log(`
╔══════════════════════════════╗
║       CYMOR AI ACTIVE        ║
║   Neural Interface Loaded    ║
╚══════════════════════════════╝
`);

    // Small boot effect
    setTimeout(() => {

        createMessage(
            `
            🚀 Neural systems initialized.<br>
            ⚡ Groq intelligence core connected.<br>
            🧠 CymorAI ready for interaction.
            `,
            "bot"
        );

    }, 1200);
});

// =============================================
// CYMOR BACKGROUND EFFECT
// =============================================
setInterval(() => {

    const words =
        document.querySelectorAll(
            ".floating-words span"
        );

    words.forEach(word => {

        const randomX =
            Math.random() * 100;

        word.style.left =
            randomX + "%";
    });

}, 8000);
