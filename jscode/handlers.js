

console.log("handlers.js loaded")

function handleChat() {

    llm_input = document.getElementById("llm_input").value
    models = getSelectedModels()
    names = models.map(model => model.name);

    addQuestionBox(llm_input)
    createAnswers(names)

    document.getElementById("llm_input").value = ""
}