const textarea = document.querySelector('.auto-grow-textarea');

console.log("misc.js loaded")

const autoResize = () => {
  textarea.style.height = 'auto'; // Reset to natural height
  textarea.style.height = Math.min(
    textarea.scrollHeight, // Height needed for content
    parseFloat(getComputedStyle(textarea).maxHeight) // Cap at max-height
  ) + 'px';
};
textarea.addEventListener('input', autoResize);
autoResize();


function addQuestionBox(s) {
  const innerBlock = document.querySelector('.inner-block');
  const newDiv = document.createElement('div');
  newDiv.className = 'question-box';
  newDiv.innerHTML = '<p>' + s + '</p>';
  innerBlock.appendChild(newDiv);
}

// Function to create sl-details elements from an array of strings
function createAnswers(a) {
  const innerBlock = document.querySelector('.inner-block');

  const newDiv = document.createElement('div');
  newDiv.className = 'answer-container';
  newDiv.style.width = 'stretch';
  newDiv.setAttribute('st', '');

  const detailsGroupDiv = document.createElement('div');
  detailsGroupDiv.className = 'details-group';

  a.forEach(str => {
    const detailsElement = document.createElement('sl-details');
    detailsElement.disabled = true;

    const summaryDiv = document.createElement('div');
    summaryDiv.setAttribute('slot', 'summary');
    summaryDiv.textContent = str;

    detailsElement.appendChild(summaryDiv);
    detailsGroupDiv.appendChild(detailsElement);
  });

  newDiv.appendChild(detailsGroupDiv);
  innerBlock.appendChild(newDiv);

  // Add the event listener to the newly created details-group
  addDetailsEventListener(detailsGroupDiv);
}

// Function to fill the latest sl-details with a specific summary and enable it
function fillAnswers([s, ss]) {
  const allDetails = document.querySelectorAll('sl-details');
  let targetElement = null;

  // Find the latest sl-details with the specified summary text
  for (let i = allDetails.length - 1; i >= 0; i--) {
    const summarySlot = allDetails[i].querySelector('[slot="summary"]');
    if (summarySlot && summarySlot.textContent === s) {
      targetElement = allDetails[i];
      break;
    }
  }

  if (targetElement) {
    // Add the content inside the sl-details
    targetElement.innerHTML += ss;
    // Remove the disabled property
    targetElement.disabled = false;
  }
}

// Function to add event listener to a details-group container
function addDetailsEventListener(container) {
  container.addEventListener('sl-show', event => {
    if (event.target.localName === 'sl-details') {
      [...container.querySelectorAll('sl-details')].map(details => (details.open = event.target === details));
    }
  });
}

// Add event listeners to any existing details-group containers on page load
document.addEventListener('DOMContentLoaded', () => {
  const existingContainers = document.querySelectorAll('.details-group');
  existingContainers.forEach(addDetailsEventListener);
});

function test() {
  console.log("test triggered")
}

function successToast(message) {
  const toast = Object.assign(document.createElement('sl-alert'), {
    variant: 'success',
    duration: 3000,
    closable: true,
    innerHTML: `
            <sl-icon slot="icon" name="check-circle"></sl-icon>
            <strong>Success</strong><br>
            ${message}        `
  });

  document.body.append(toast);
  toast.toast();

  // Clean up after it's hidden
  toast.addEventListener('sl-after-hide', () => toast.remove());
}

function warnToast(message) {
  const toast = Object.assign(document.createElement('sl-alert'), {
    variant: 'warning',
    duration: 3000,
    closable: true,
    innerHTML: `
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            <strong>Warning</strong><br>
            ${message}        `
  });

  document.body.append(toast);
  toast.toast();

  toast.addEventListener('sl-after-hide', () => toast.remove());
}

function errorToast(message) {
  const toast = Object.assign(document.createElement('sl-alert'), {
    variant: 'danger',
    duration: 3000,
    closable: true,
    innerHTML: `
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Error</strong><br>
            ${message}
        `
  });

  document.body.append(toast);
  toast.toast();

  toast.addEventListener('sl-after-hide', () => toast.remove());
}