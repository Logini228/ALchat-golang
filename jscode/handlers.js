

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