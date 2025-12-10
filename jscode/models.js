function requestModels() {
    
        fetch("http://localhost:8080/models", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ "input": "openai"})
        //body: JSON.stringify({id: textbox.value})
        //body: JSON.stringify({id: "1"})
    })
}