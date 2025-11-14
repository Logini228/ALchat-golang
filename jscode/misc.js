const textarea = document.querySelector('.auto-grow-textarea');

const autoResize = () => {
  textarea.style.height = 'auto'; // Reset to natural height
  textarea.style.height = Math.min(
    textarea.scrollHeight, // Height needed for content
    parseFloat(getComputedStyle(textarea).maxHeight) // Cap at max-height
  ) + 'px';
};

// Listen for input events
textarea.addEventListener('input', autoResize);

// Trigger once on load in case there's initial content
autoResize();

const container = document.querySelector('.details-group');

// Close all other details when one is shown
container.addEventListener('sl-show', event => {
  if (event.target.localName === 'sl-details') {
    [...container.querySelectorAll('sl-details')].map(details => (details.open = event.target === details));
  }
});




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