var textbox = document.getElementById('mytextbox');
var modelbox = document.getElementById('modelbox');
var chatid = "0";

console.log("chat.js loaded")

function fetchData() {
    fetch("http://localhost:8080/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-chatid": chatid
        },
        body: JSON.stringify({ "model": new String(modelbox.value), "messages": [{ "role": "user", "content": new String(textbox.value) }] })
    })
        .then(response => response.text())
        .then(data => {
            //document.getElementById("datta").innerHTML = data;
            //var parsed = JSON.parse(data);
            console.log(data);
            addParsedBlock(data, "ai");

            //addBlock(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById("datta").innerHTML = "Error: " + error;
        });
}

var blockCount = 0;
function parseMarkdown(text) {
    var txt = JSON.parse(text.trim().replace(/^[^{]*/, '')).choices[0].message.content;
    return txt
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

function addParsedBlock(text, bg = "user") {
    blockCount++;
    const container = document.getElementById('container');

    if (typeof text != 'string') {
        text = textbox.value
    }


    // Create new div
    const newBlock = document.createElement('div');
    newBlock.id = 'block-' + blockCount;
    newBlock.style.margin = '10px 0';

    // Add content with parsed markdown
    newBlock.innerHTML = `
       <p class=${bg}>${parseMarkdown(text)}</p>
   `;

    container.appendChild(newBlock);
}

function addBlock(text, bg = "user") {
    blockCount++;
    const container = document.getElementById('container');

    if (typeof text != 'string') {
        text = textbox.value
    }

    // Create new div
    const newBlock = document.createElement('div');
    newBlock.id = 'block-' + blockCount;
    newBlock.style.margin = '10px 0';

    // Add content
    newBlock.innerHTML = `
        <p class=${bg}>${text}</p>
    `;
    container.appendChild(newBlock);
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
