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

window.testChat = function () {
  let errors = [];

  function assert(condition, message) {
    if (!condition) {
      errors.push(message);
    }
  }

  function assertIncludes(actual, expected, message) {
    if (!actual.includes(expected)) {
      errors.push(`${message} (Expected "${expected}" in "${actual}")`);
    }
  }

  const mc = document.getElementById('msg-container');
  if (!mc) {
    errors.push("Element '#msg-container' not found in the DOM.");
    console.error("testChat failed: Element '#msg-container' not found in the DOM.");
    return;
  }

  // 1. Create first question
  createQuestion("Test Question 1");

  // 2. Create first set of answers (3 models)
  const models = ["gpt4", "claude", "gemini"];
  createAnswers(models);

  // Get the group we just created
  const groups1 = mc.querySelectorAll('.answer-container');
  const group1 = groups1[groups1.length - 1];

  // Fill first answers
  const ans1 = "**Lorem ipsum** gpt4 bold";
  const ans2 = "*Lorem ipsum* claude italic";
  const ans3 = "`Lorem ipsum` gemini code";

  fillAnswers(["gpt4", stylizeJson(ans1), "dbid-1", 0]);
  fillAnswers(["claude", stylizeJson(ans2), "dbid-2", 0]);
  fillAnswers(["gemini", stylizeJson(ans3), "dbid-3", 0]);

  // Assertions for first set of answers
  if (group1) {
    const panels = group1.querySelectorAll('.model-panel');
    assert(panels.length === 3, "Expected 3 panels in group 1");
    if (panels.length === 3) {
      const text0 = panels[0].querySelector('.panel-text').innerHTML;
      const text1 = panels[1].querySelector('.panel-text').innerHTML;
      const text2 = panels[2].querySelector('.panel-text').innerHTML;

      assertIncludes(text0, "<strong>Lorem ipsum</strong>", "gpt4 bold formatting failed");
      assertIncludes(text1, "<em>Lorem ipsum</em>", "claude italic formatting failed");
      assertIncludes(text2, "<code>Lorem ipsum</code>", "gemini code formatting failed");
    }
  } else {
    assert(false, "Group 1 answer-container not found");
  }

  // 3. Create second question
  createQuestion("Test Question 2");

  // 4. Create second set of answers (3 models)
  createAnswers(models);

  // Get the group we just created
  const groups2 = mc.querySelectorAll('.answer-container');
  const group2 = groups2[groups2.length - 1];

  // Fill second answers
  const ans4 = "```text\nLorem ipsum gpt4 codeblock\n```";
  const ans5 = "> Lorem ipsum claude blockquote";
  const ans6 = "- Lorem ipsum gemini list";

  fillAnswers(["gpt4", stylizeJson(ans4), "dbid-4", 0]);
  fillAnswers(["claude", stylizeJson(ans5), "dbid-5", 0]);
  fillAnswers(["gemini", stylizeJson(ans6), "dbid-6", 0]);

  // Assertions for second set of answers
  if (group2) {
    const panels = group2.querySelectorAll('.model-panel');
    assert(panels.length === 3, "Expected 3 panels in group 2");
    if (panels.length === 3) {
      const text3 = panels[0].querySelector('.panel-text').innerHTML;
      const text4 = panels[1].querySelector('.panel-text').innerHTML;
      const text5 = panels[2].querySelector('.panel-text').innerHTML;

      assertIncludes(text3, '<pre><code class="language-text">Lorem ipsum gpt4 codeblock</code></pre>', "gpt4 codeblock formatting failed");
      assertIncludes(text4, "<blockquote>Lorem ipsum claude blockquote</blockquote>", "claude blockquote formatting failed");
      assertIncludes(text5, "<ul><li>Lorem ipsum gemini list</li></ul>", "gemini list formatting failed");
    }
  } else {
    assert(false, "Group 2 answer-container not found");
  }

  // Report results
  if (errors.length > 0) {
    console.error("testChat failed: " + errors.join("; "));
  } else {
    console.log("all good");
  }
};

window.testFail = function () {
  let errors = [];

  function assert(condition, message) {
    if (!condition) {
      errors.push(message);
    }
  }

  const mc = document.getElementById('msg-container');
  if (!mc) {
    console.error("testFail failed: Element '#msg-container' not found in the DOM.");
    return;
  }

  // Create a question and an answer group with 3 models
  createQuestion("Test Question (Fail)");
  const models = ["gpt4", "claude", "gemini"];
  createAnswers(models);

  const groups = mc.querySelectorAll('.answer-container');
  const group = groups[groups.length - 1];

  // Fill one successful answer and two failed ones (code != 0)
  fillAnswers(["gpt4",   stylizeJson("I am working fine!"), "dbid-fail-1", 0]);
  fillAnswers(["claude", "",                                "dbid-fail-2", 1]);
  fillAnswers(["gemini", "",                                "dbid-fail-3", 429]);

  // Assert the failed panels have the ERROR badge
  if (group) {
    const panels = group.querySelectorAll('.model-panel');
    assert(panels.length === 3, "Expected 3 panels in fail group");
    if (panels.length === 3) {
      const badge0 = panels[0].querySelector('.status-badge');
      const badge1 = panels[1].querySelector('.status-badge');
      const badge2 = panels[2].querySelector('.status-badge');

      assert(badge0 && badge0.innerText === 'COMPLETE', "Panel 0 should be COMPLETE");
      assert(badge1 && badge1.innerText === 'ERROR',    "Panel 1 (code=1) should be ERROR");
      assert(badge2 && badge2.innerText === 'ERROR',    "Panel 2 (code=429) should be ERROR");
    }
  } else {
    assert(false, "Fail group answer-container not found");
  }

  // Report results
  if (errors.length > 0) {
    console.error(`%c✗ testFail failed with ${errors.length} error(s):`, "font-weight: bold; color: #ff716a;");
    errors.forEach(err => console.error(`  - ${err}`));
  } else {
    console.log(`%c✓ testFail: failed-model rendering verified successfully.`, "color: #a2ff99; font-weight: 500;");
  }
};
