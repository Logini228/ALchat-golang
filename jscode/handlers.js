

console.log("handlers.js loaded")

window.onload = async function () {
    clearChatContent()
    requestModels();
    if (loginJWT()) {
        const chats = await loadChatList();
        await renderChatList(chats);
        await loadChat()
    }
    renderFooter();
};

async function handleChat() {

    if (!window.location.pathname.startsWith('/chat/')) {
        await newChat()
    }

    const ta = document.getElementById('prompt-ta');
    const llmInput = ta.value.trim();
    if (!llmInput) return;

    models = getSelectedModels()
    if (models[0] == null) { warnToast("Please choose at least 1 model"); return };

    const names = models.map(model => model.name);
    const ids = models.map(model => model.id);
    const mode = getMode()

    if (mode == 1 || mode == 2) {
        createQuestion(llmInput);
        createAnswers(ids);
        requestLLM(ids, llmInput, (mode == 1));
    }

    document.getElementById('prompt-ta').value = "";
    autoResize();
}
function logged(data) {
    loggud = true

    userName = data.name;

    if (data.avatar) {
        userAvatar = data.avatar;
    }
    renderFooter()
}

function handleChatlistClick(id, data) {
    clearChatContent();
    moveUserTo(id); // Assumed to update URL string
    loadChat(id);

    // Re-render immediately using passed data array
    renderChatList(data);
    return true;
}

function handleSearchModel(val) {
    const query = val.toLowerCase();
    const items = document.querySelectorAll('#body-models .model-item');

    items.forEach(item => {
        // Get text from label or data attributes
        const name = item.querySelector('.model-lbl').textContent.toLowerCase();
        const id = item.getAttribute('data-id').toLowerCase();

        // Toggle display based on match
        if (name.includes(query) || id.includes(query)) {
            item.style.display = 'flex'; // or original display style
        } else {
            item.style.display = 'none';
        }
    });
}

function newChat() {
    clearChatContent()
    moveUserHome()
    return true
}