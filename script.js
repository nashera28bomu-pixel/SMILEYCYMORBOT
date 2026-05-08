// Determine if we are running locally or on Render
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/chat" 
    : "/chat";

function setPrompt(text) { 
    const input = document.getElementById("userInput");
    if (input) {
        input.value = text;
        input.focus();
    }
}

function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatBox = document.getElementById("chatBox");
    const userText = input.value.trim();
    
    if (!userText) return;

    console.log("📤 Sending message to:", API_URL);

    // 1. UI Update: User Message
    chatBox.insertAdjacentHTML('beforeend', `<div class="message user">${userText}</div>`);
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // 2. UI Update: Thinking State
    const typingId = "typing-" + Date.now();
    chatBox.insertAdjacentHTML('beforeend', `
        <div class="message bot" id="${typingId}">
            <em style="opacity: 0.7;">CymorAI is thinking...</em>
        </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();

        // 3. Remove Thinking Animation
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        if (!response.ok) {
            throw new Error(data.reply || "Server error occurred.");
        }

        // 4. UI Update: Bot Response with Typewriter Effect
        const botId = "msg-" + Date.now();
        chatBox.insertAdjacentHTML('beforeend', `<div class="message bot" id="${botId}"></div>`);
        
        const botElement = document.getElementById(botId);
        const replyText = data.reply;
        let index = 0;

        function typeEffect() {
            if (index < replyText.length) {
                botElement.textContent += replyText.charAt(index);
                index++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(typeEffect, 10);
            }
        }
        typeEffect();

    } catch (error) {
        console.error("❌ Fetch Error:", error);
        
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        chatBox.insertAdjacentHTML('beforeend', `
            <div class="message bot" style="color: #ff4d4d; border-left: 4px solid #ff4d4d;">
                ⚠️ ${error.message}
            </div>
        `);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}
