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




