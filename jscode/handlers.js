

console.log("handlers.js loaded")

window.onload = async function () {
    clearChatContent()
    requestModels();
    if (loginJWT()) {
        const chats = await loadChatList(); 
        renderChatList(chats);
    }
};

async function handleChat() {

    if (!window.location.pathname.startsWith('/chat/')) {
        await newChat()
    }

    llmInput = document.getElementById("llm-input").value
    models = getSelectedModels()
    names = models.map(model => model.name);
    ids = models.map(model => model.id);

    createQuestion(llmInput)
    createAnswers(ids)
    requestLLM(ids, llmInput)

    document.getElementById("llm-input").value = ""
}
function logged(data) {
    document.getElementById('google-auth').style.display = 'none';

    document.getElementById('name').style.display = 'content';
    document.getElementById('name').textContent = data.name;

    if (data.avatar) {
        document.getElementById('avatar').style.display = 'content';
        document.getElementById('avatar').src = data.avatar;
    }
}

function handleChatlistClick(id) {
    clearChatContent()
    moveUserTo(id)
    loadChat(id)
    return true
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