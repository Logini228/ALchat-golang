const textarea = document.querySelector('.auto-grow-textarea');

const autoResize = () => {
  textarea.style.height = 'auto'; // Reset to natural height
  textarea.style.height = Math.min(
    textarea.scrollHeight, // Height needed for content
    parseFloat(getComputedStyle(textarea).maxHeight) // Cap at max-height
  ) + 'px';
};
textarea.addEventListener('input', autoResize);
autoResize();



function filterCheckboxes() {
  const input = document.getElementById('searchInput');
  const filter = input.value.toUpperCase();
  const checkboxList = document.getElementById('checkboxList');
  const items = checkboxList.getElementsByClassName('checkbox-item');
  const noResults = document.getElementById('noResults');

  let visibleCount = 0;

  for (let i = 0; i < items.length; i++) {
    const label = items[i].getElementsByTagName('label')[0];
    const txtValue = label.textContent || label.innerText;

    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      items[i].style.display = '';
      visibleCount++;
    } else {
      items[i].style.display = 'none';
    }
  }

  // Show/hide no results message
  if (visibleCount === 0) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
  }
}

// Optional: Add select all functionality
function selectAll() {
  const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
}

// Optional: Add clear selection functionality
function clearSelection() {
  const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
}

// Optional: Get selected items
function getSelectedItems() {
  const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
  const selected = [];
  checkboxes.forEach(checkbox => {
    selected.push(checkbox.value);
  });
  return selected;
}

function addQuestionBox(q) {
    const innerBlock = document.querySelector('.inner-block');
    const newDiv = document.createElement('div');
    newDiv.className = 'question-box';
    newDiv.innerHTML = '<p>' + q + '</p>';
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