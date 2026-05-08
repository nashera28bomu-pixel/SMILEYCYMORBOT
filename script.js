// Set prompt when shortcut is clicked
function setPrompt(text) { 
    const input = document.getElementById("userInput");
    input.value = text;
    input.focus();
}

// Handle Enter key for submission
function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatBox = document.getElementById("chatBox");
    const userText = input.value.trim();
    
    if (!userText) return;

    // Add User Message
    chatBox.insertAdjacentHTML('beforeend', `<div class="message user">${userText}</div>`);
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Show Thinking Animation
    const typingId = "typing-" + Date.now();
    chatBox.insertAdjacentHTML('beforeend', `
        <div class="message bot" id="${typingId}">
            <em>Thinking...</em>
        </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        /* CRITICAL FIX: Removed the specific Railway URL. 
           Using "/chat" allows this to work on Render, Railway, or Localhost automatically.
        */
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.reply || "Server error");
        }

        const data = await response.json();

        // Remove thinking message
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        // Add Bot Container
        const botId = "msg-" + Date.now();
        chatBox.insertAdjacentHTML('beforeend', `<div class="message bot" id="${botId}"></div>`);
        
        const botElement = document.getElementById(botId);
        const replyText = data.reply;
        let index = 0;

        // Elite Streaming Effect
        function typeEffect() {
            if (index < replyText.length) {
                botElement.textContent += replyText.charAt(index);
                index++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(typeEffect, 10); // Slightly faster for better feel
            }
        }
        typeEffect();

    } catch (error) {
        // Remove thinking message on error
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        chatBox.insertAdjacentHTML('beforeend', `
            <div class="message bot" style="color: #ff4d4d; border-left: 3px solid #ff4d4d;">
                ⚠️ ${error.message === "Server error" ? "Connection error. Please refresh." : error.message}
            </div>
        `);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}
