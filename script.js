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
            <em>CymorAI is thinking...</em>
        </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Updated: Explicitly pointing to your Railway backend
        const response = await fetch("https://smileycymorbot-production.up.railway.app/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        if (!response.ok) throw new Error("Server error");

        const data = await response.json();

        // Remove thinking message
        document.getElementById(typingId)?.remove();

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
                setTimeout(typeEffect, 12); 
            }
        }
        typeEffect();

    } catch (error) {
        document.getElementById(typingId)?.remove();
        chatBox.insertAdjacentHTML('beforeend', `
            <div class="message bot" style="color: #ef4444;">
                ⚠️ Connection error. Please check your network.
            </div>
        `);
    }
}
