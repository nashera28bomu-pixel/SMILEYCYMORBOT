// Set prompt when shortcut is clicked
function setPrompt(text) { 
    const input = document.getElementById("userInput");
    if (input) {
        input.value = text;
        input.focus();
    }
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

    // 1. Add User Message to UI
    chatBox.insertAdjacentHTML('beforeend', `<div class="message user">${userText}</div>`);
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // 2. Show Thinking Animation with a unique ID
    const typingId = "typing-" + Date.now();
    chatBox.insertAdjacentHTML('beforeend', `
        <div class="message bot" id="${typingId}">
            <em style="opacity: 0.7;">Thinking...</em>
        </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 3. The Fetch Call (Now correctly pointing to your local /chat route)
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        // 4. Handle Server Errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.reply || "Connection lost. Please refresh.");
        }

        const data = await response.json();

        // 5. Remove thinking message
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        // 6. Create Bot Response Container
        const botId = "msg-" + Date.now();
        chatBox.insertAdjacentHTML('beforeend', `<div class="message bot" id="${botId}"></div>`);
        
        const botElement = document.getElementById(botId);
        const replyText = data.reply;
        let index = 0;

        // 7. Elite Typewriter Effect
        function typeEffect() {
            if (index < replyText.length) {
                botElement.textContent += replyText.charAt(index);
                index++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(typeEffect, 8); // Fast and snappy
            }
        }
        typeEffect();

    } catch (error) {
        // Handle failures gracefully
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        chatBox.insertAdjacentHTML('beforeend', `
            <div class="message bot" style="color: #ff4d4d; border-left: 4px solid #ff4d4d;">
                ⚠️ ${error.message}
            </div>
        `);
        chatBox.scrollTop = chatBox.scrollHeight;
        console.error("Fetch Error:", error);
    }
}
