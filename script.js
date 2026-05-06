function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatBox = document.getElementById("chatBox");

    const userText = input.value.trim();
    if (!userText) return;

    // Add user message
    chatBox.innerHTML += `<div class="user">You: ${userText}</div>`;
    input.value = "";

    // Create AI thinking message
    const typingId = "typing-" + Date.now();
    chatBox.innerHTML += `
        <div class="bot" id="${typingId}">
            CymorAI is thinking 
            <span class="brain">🧠</span>
            <span class="typing">
                <span></span><span></span><span></span>
            </span>
        </div>
    `;

    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();

        // Remove thinking animation
        document.getElementById(typingId).remove();

        // Create empty bot message for streaming
        const botId = "bot-" + Date.now();
        chatBox.innerHTML += `<div class="bot" id="${botId}"></div>`;

        const botElement = document.getElementById(botId);

        // ✍️ Typing/streaming effect
        let text = "CymorAI: " + data.reply;
        let index = 0;

        function typeEffect() {
            if (index < text.length) {
                botElement.innerHTML += text.charAt(index);
                index++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(typeEffect, 15); // speed (lower = faster)
            }
        }

        typeEffect();

    } catch (error) {
        document.getElementById(typingId)?.remove();
        chatBox.innerHTML += `
            <div class="bot">
                ⚠️ CymorAI encountered an error. Try again.
            </div>
        `;
    }
}
