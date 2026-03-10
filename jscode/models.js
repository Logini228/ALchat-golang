var counter = 0;
var modelbox = document.querySelector('.models-input');

console.log("model.js loaded")

window.onload = function() {
    requestModels();
    //loginJWT()
};

function requestModels() {
    deleteModels();

    fetch("http://127.0.0.1:8080/models", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ "input": modelbox.value })
    })
    .then(response => response.json())
    .then(data => {
        // data is an array of model objects
        data.forEach(model => {
            createCheckboxFromModel(
                model.Aggregator,
                model.Provider,
                model.ID,
                model.Name,
                model.Price,
                model.Context,
                model.Inputs,
                model.Outputs
            );
        });
    })
    .catch(error => {
        console.error('Error fetching models:', error);
    });
}

function createCheckboxFromModel(aggregator, provider, id, name, price, context, inputs, outputs) {
    const checkboxList = document.querySelector('.checkbox-list');

    const newDiv = document.createElement('div');
    newDiv.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'model-' + counter;
    checkbox.value = id;
    checkbox.dataset.aggregator = aggregator;
    checkbox.dataset.provider = provider;
    checkbox.dataset.name = name;

    const label = document.createElement('label');
    label.htmlFor = 'model-' + counter;
    label.textContent = name;

    newDiv.appendChild(checkbox);
    newDiv.appendChild(label);
    checkboxList.appendChild(newDiv);

    counter++;
}

function deleteModels() {
    const checkboxList = document.querySelector('.checkbox-list');
    const checkboxItems = checkboxList.querySelectorAll('.checkbox-item');
    
    // Remove only unchecked items
    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) {
            item.remove();
        }
    });
}

function getSelectedModels() {
    const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
    const selectedModels = [];
    
    checkboxes.forEach(checkbox => {
        selectedModels.push({
            aggregator: checkbox.dataset.aggregator,
            provider: checkbox.dataset.provider,
            id: checkbox.value,
            name: checkbox.dataset.name
        });
    });
    
    return selectedModels;
}

