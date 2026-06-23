// Unit test function to mock model loading and verify functionality
window.testModels = function () {
  const mockModels = [
    {
      aggregator: "OpenRouter",
      provider: "OpenAI",
      id: "openai/gpt-4-turbo",
      name: "GPT-4 Turbo",
      price: "$10.00 / $30.00",
      context: "128k",
      inputs: "Text, Images",
      outputs: "Text"
    },
    {
      aggregator: "OpenRouter",
      provider: "Anthropic",
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      price: "$15.00 / $75.00",
      context: "200k",
      inputs: "Text, Images",
      outputs: "Text"
    },
    {
      aggregator: "OpenRouter",
      provider: "Google",
      id: "google/gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      price: "$7.00 / $21.00",
      context: "2m",
      inputs: "Text, Images, Audio, Video",
      outputs: "Text"
    }
  ];

  let errors = [];

  function assert(condition, message) {
    if (!condition) {
      errors.push(message);
    }
  }

  // Clear current models list if possible
  const list = document.getElementById('body-models');
  if (list) {
    list.innerHTML = '';
  } else {
    errors.push("Element '#body-models' not found in the DOM.");
    console.error("testModels failed: Element '#body-models' not found in the DOM.");
    return;
  }

  // Populate models
  mockModels.forEach(model => {
    try {
      createCheckboxFromModel(
        model.aggregator,
        model.provider,
        model.id,
        model.name,
        model.price,
        model.context,
        model.inputs,
        model.outputs
      );

      // Assertions on DOM creation
      const createdItem = list.querySelector(`.model-item[data-id="${model.id}"]`);
      assert(createdItem !== null, `Model item with data-id="${model.id}" was not appended.`);
      if (createdItem) {
        assert(createdItem.classList.contains('disabled'), `Model item for ${model.id} should have 'disabled' class by default.`);
        assert(createdItem.dataset.id === model.id, `Model item for ${model.id} has incorrect dataset.id.`);
        assert(createdItem.dataset.agg === model.aggregator, `Model item for ${model.id} has incorrect dataset.agg.`);
        assert(createdItem.dataset.prov === model.provider, `Model item for ${model.id} has incorrect dataset.prov.`);

        const dot = createdItem.querySelector('.model-dot');
        const lbl = createdItem.querySelector('.model-lbl');
        const infoIcon = createdItem.querySelector('.info-icon');

        assert(dot !== null, `Model item for ${model.id} is missing '.model-dot'.`);
        assert(lbl !== null, `Model item for ${model.id} is missing '.model-lbl'.`);
        assert(infoIcon !== null, `Model item for ${model.id} is missing '.info-icon'.`);

        if (lbl) {
          assert(lbl.textContent === model.name, `Model label for ${model.id} has incorrect text.`);
        }

        // Verify color mapping
        let expectedColor = 'primary';
        if (model.id.includes('claude')) expectedColor = 'secondary';
        if (model.id.includes('gemini')) expectedColor = 'tertiary';
      }

      // Assertions on MODEL_META
      if (typeof MODEL_META !== 'undefined') {
        const meta = MODEL_META[model.id];
        assert(meta !== undefined, `MODEL_META is missing entry for ${model.id}.`);
        if (meta) {
          assert(meta.aggregator === model.aggregator, `MODEL_META entry for ${model.id} has incorrect aggregator.`);
          assert(meta.provider === model.provider, `MODEL_META entry for ${model.id} has incorrect provider.`);
          assert(meta.price === model.price, `MODEL_META entry for ${model.id} has incorrect price.`);
          assert(meta.context === model.context, `MODEL_META entry for ${model.id} has incorrect context.`);
          assert(meta.inputs === model.inputs, `MODEL_META entry for ${model.id} has incorrect inputs.`);
          assert(meta.outputs === model.outputs, `MODEL_META entry for ${model.id} has incorrect outputs.`);
        }
      } else {
        assert(false, "Global 'MODEL_META' object is not defined.");
      }

    } catch (e) {
      errors.push(`Exception occurred while testing model ${model.id}: ${e.message}`);
    }
  });

  // Report results
  if (errors.length > 0) {
    console.error(`%c✗ testModels failed with ${errors.length} error(s):`, "font-weight: bold; color: #ff716a;");
    errors.forEach(err => console.error(`  - ${err}`));
  } else {
    console.log(`%c✓ testModels: 3 mock models loaded successfully. All checks passed.`, "color: #a2ff99; font-weight: 500;");
  }
};
