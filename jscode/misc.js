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

function infoToast(message) {
  const toast = Object.assign(document.createElement('sl-alert'), {
    variant: 'primary',
    duration: 3000,
    closable: true,
    innerHTML: `
            <sl-icon slot="icon" name="info-circle"></sl-icon>
            <strong>Info</strong><br>
            ${message}        `
  });

  document.body.append(toast);
  toast.toast();

  // Clean up after it's hidden
  toast.addEventListener('sl-after-hide', () => toast.remove());
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