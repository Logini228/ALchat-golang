var textbox = document.getElementById('mytextbox');
var modelbox = document.getElementById('modelbox');
var chatid = "0";

console.log("chat.js loaded")

async function requestLLM(models, message) {
    try {
        const response = await fetch("http://localhost:8080/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-chatid": chatid
            },
            body: JSON.stringify({
                "model": models,
                "messages": [{ "role": "user", "content": message }]
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Split by newlines
            const lines = buffer.split('\n');

            // Keep the last incomplete line in buffer
            buffer = lines.pop();

            // Process each complete line
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        const model = data.model;
                        const success = data.success
                        const responseText = data.response;

                        // Update UI with each chunk
                        if (success) {
                            fillAnswers([model, stylizeJson(responseText)]);
                        } else {
                            fillErrors([model, responseText])
                        }
                    } catch (e) {
                        console.error('Failed to parse line:', line, e);
                    }
                }
            }
        }

        // Handle any remaining data in buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                fillAnswers([data.model, stylizeJson(data.response)]);
            } catch (e) {
                console.error('Failed to parse final buffer:', buffer, e);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        document.getElementById("datta").innerHTML = "Error: " + error;
    }
}

async function loadChatList() {
    try {
        const response = await fetch('http://localhost:8080/chatlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-authtype': 'loginJWT',
                "g-recaptcha-response": 0
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const data = await response.json();
        console.log("chats: ", data.chatlist);


        return true;
    } catch (err) {
        warnToast('Error getting chatlist:', err);
        return false
    }
}

function loadChat() {
    fetch(`http://localhost:8080/chat/${chatid}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(msgJSON => {
                var msg = JSON.parse(msgJSON);
                //console.log(msg.choices[0].message.content);
                console.log(JSON.stringify(msg)); // Pretty print
                addParsedBlock(msgJSON);
            });
        });
}

window.addEventListener('load', () => {
    const match = location.pathname.match(/\/chat\/(\w+)/);
    if (match) {
        chatid = match[1];
        loadChat()
    }
});

async function newChat() {
    const response = await fetch('http://localhost:8080/newchat', { method: 'POST' });
    const data = await response.json();

    chatid = data.id;

    window.history.pushState({}, "", `/chat/${data.id}`);
}

function stylizeJson(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }

    let html = text;

    // 1. Code blocks (must be done first, before other replacements)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // 2. Tables (detect and convert markdown tables)
    html = html.replace(/(\|.+\|[\r\n]+\|[-:\s|]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g, (match) => {
        const rows = match.trim().split('\n').map(row =>
            row.split('|').slice(1, -1).map(cell => cell.trim())
        );

        const header = rows[0];
        const body = rows.slice(2); // Skip separator row

        let table = '<table><thead><tr>';
        header.forEach(cell => table += `<th>${cell}</th>`);
        table += '</tr></thead><tbody>';
        body.forEach(row => {
            table += '<tr>';
            row.forEach(cell => table += `<td>${cell}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    });

    // 3. Headers (h1-h6)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 4. Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // 5. Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // 6. Unordered lists
    html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 7. Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // 8. Bold (before italic to avoid conflicts)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 9. Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // 10. Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 11. Links [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 12. Line breaks (do this last)
    html = html.replace(/\n/g, '<br>');

    return html;
}

// Helper function to escape HTML in code blocks
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}