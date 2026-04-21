var textbox = document.getElementById('mytextbox');
var modelbox = document.getElementById('modelbox');

console.log("chat.js loaded")

async function requestLLM(models, message) {
    try {
        const history = getHistory();
        const empty = (history.length === 0);

        const response = await fetch("http://localhost:8080/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-chatid": getChatIdFromURL()
            },
            body: JSON.stringify({
                "model": models,
                "prompt": message,
                "history": history,
                "empty": empty
            }),
            credentials:"include"
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        const model = data.model;
                        const mess_uuid = data.mess_uuid;
                        const responseText = data.response;

                        // Update UI with each chunk
                        
                        fillAnswers([model, stylizeJson(responseText)], mess_uuid);

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

function createQuestion(s) {
    const innerBlock = document.querySelector('.inner-block');
    const newDiv = document.createElement('div');
    newDiv.className = 'question-box';
    newDiv.innerHTML = '<p>' + s + '</p>';
    innerBlock.appendChild(newDiv);
}

function createAnswers(a) {
  const innerBlock = document.querySelector('.inner-block');
  const newDiv = document.createElement('div');
  newDiv.className = 'answer-container';
  newDiv.style.width = 'stretch';

  const detailsGroupDiv = document.createElement('div');
  detailsGroupDiv.className = 'details-group';

  a.forEach(str => {
    const detailsElement = document.createElement('sl-details');
    detailsElement.disabled = true;

    const summaryDiv = document.createElement('div');
    summaryDiv.setAttribute('slot', 'summary');
    // Flexbox to keep name left and toggle right
    summaryDiv.style.display = 'flex';
    summaryDiv.style.justifyContent = 'space-between';
    summaryDiv.style.alignItems = 'center';
    summaryDiv.style.width = '100%';

    summaryDiv.innerHTML = `
      <span class="model-name">${str}</span>
      <sl-switch class="answer-toggle" checked onclick="event.stopPropagation()"></sl-switch>
    `;

    detailsElement.appendChild(summaryDiv);
    detailsGroupDiv.appendChild(detailsElement);
  });

  newDiv.appendChild(detailsGroupDiv);
  innerBlock.appendChild(newDiv);
  addDetailsEventListener(detailsGroupDiv);
}

function clearChatContent() {
    const innerBlock = document.querySelector('.inner-block');
    if (innerBlock) {
        innerBlock.innerHTML = '';
    } else {
        warnToast("Couldn't clear chat dialogue: Container .inner-block not found.");
    }
}

function fillAnswers([s, ss, id]) {
  const allDetails = document.querySelectorAll('sl-details');
  let targetElement = null;

  for (let i = allDetails.length - 1; i >= 0; i--) {
    const summaryName = allDetails[i].querySelector('.model-name');
    if (summaryName && summaryName.textContent === s) {
      targetElement = allDetails[i];
      break;
    }
  }

  if (targetElement) {
    // Apply the ID
    targetElement.setAttribute('data-answer-id', id);

    const toggle = targetElement.querySelector('.answer-toggle');
    
    if (ss == 'Provider returned error' || ss == "No endpoints available matching your guardrail restrictions and data policy. Configure: https://openrouter.ai/settings/privacy") {
      const summaryName = targetElement.querySelector('.model-name');
      summaryName.innerHTML += ' <sl-tag variant="danger" size="small">error</sl-tag>';
      
      // Turn toggle off for errors
      if (toggle) toggle.checked = false;
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = ss;
    targetElement.appendChild(contentWrapper);
    targetElement.disabled = false;
  }
}

function getSelectedAnswerIds() {
  const activeIds = [];
  const allDetails = document.querySelectorAll('sl-details[data-answer-id]');

  allDetails.forEach(el => {
    const toggle = el.querySelector('.answer-toggle');
    if (toggle && toggle.checked) {
      activeIds.push(el.getAttribute('data-answer-id'));
    }
  });

  return activeIds;
}

async function loadChatList() {
    try {
        const response = await fetch('http://localhost:8080/chatlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "g-recaptcha-response": 0
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const data = await response.json();
        const nestedChats = data.chatlist.map(c => [c.chat_id, c.chat_name])
        console.log("chats: ", nestedChats);


        return nestedChats;
    } catch (err) {
        warnToast('Error getting chatlist:', err);
        return [[]]
    }
}

function renderChatList(data) {
    const container = document.querySelector('.chat-list');

    // Clear existing items if necessary
    container.innerHTML = '';

    // data is [[id, name], [id, name]]
    data.forEach(([id, name]) => {
        const btn = document.createElement('sl-button');
        btn.setAttribute('variant', 'default');
        btn.id = id;
        btn.textContent = name;
        btn.addEventListener('click', () => { handleChatlistClick(id); });
        container.appendChild(btn);
    });
}

function getChatIdFromURL() {
    const match = window.location.pathname.match(/\/chat\/(\w+)/);
    return match ? match[1] : null;
}

function loadChat(id) {
    if (!id) return;

    fetch(`http://localhost:8080/chat/${id}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (!data.valid || !Array.isArray(data.messages)) return;

            const msgs = data.messages;
            
            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].sender_user == true) {
                    createQuestion(msgs[i].message);

                    let modelMessages = [];
                    let j = i + 1;
                    
                    while (j < msgs.length && msgs[j].sender_user == false) {
                        modelMessages.push(msgs[j]);
                        j++;
                    }

                    if (modelMessages.length > 0) {
                        const modelNames = modelMessages.map(m => m.sender);
                        createAnswers(modelNames);
                        modelMessages.forEach(m => {
                            fillAnswers([m.sender, stylizeJson(m.message), m.mess_uuid]);
                        });
                    }

                    i = j - 1;
                }
            }
        })
        .catch(error => console.error("Fetch error:", error));
}

window.addEventListener('popstate', () => {
    loadChat(getChatIdFromURL());
});

window.addEventListener('load', () => {
    loadChat(getChatIdFromURL());
});

async function newChat() {
    const response = await fetch('http://localhost:8080/newchat', { method: 'POST', credentials: "include" });
    const data = await response.json();

    chatid = data.chatid;

    if (chatid != undefined) {
        moveUserTo(chatid)
    }
}

function moveUserTo(chatid) {
    window.history.pushState({}, "", `/chat/${chatid}`);
    return true;
}

function getHistory() {
    const history = [];
    const innerBlock = document.querySelector('.inner-block');
    
    if (!innerBlock) return history;

    const elements = innerBlock.children;

    for (let el of elements) {
        if (el.classList.contains('question-box')) {
            const promptText = el.querySelector('p')?.innerText || "";
            history.push([false, promptText]);
        } 
        
        else if (el.classList.contains('answer-container')) {
            const allDetails = el.querySelectorAll('sl-details[data-answer-id]');
            
            allDetails.forEach(detail => {
                const toggle = detail.querySelector('.answer-toggle');
                const answerId = detail.getAttribute('data-answer-id');
                
                if (toggle && toggle.checked && answerId) {
                    history.push([true, answerId]);
                }
            });
        }
    }
    return history;
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