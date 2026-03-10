

console.log("handlers.js loaded")

function handleChat() {

    llmInput = document.getElementById("llm-input").value
    models = getSelectedModels()
    names = models.map(model => model.name);
    ids = models.map(model => model.id);

    addQuestionBox(llmInput)
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