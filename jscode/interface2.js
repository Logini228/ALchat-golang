/* ── CORE FUNCTIONS ── */

function getHistory() {
  const nodes = document.getElementById('msg-container').children;
  return Array.from(nodes).map(node => {
    const isId = node.classList.contains('answer-container');
    const content = isId ? (node.dataset.id || "") : node.innerText.trim();
    return [isId, content];
  });
}

function createQuestion(s) {
  const mc = document.getElementById('msg-container');
  const q = document.createElement('div');
  q.className = 'question-box';
  q.innerHTML = `<div class="user-bubble">${escapeHtml(s)}</div>`;
  mc.appendChild(q);
  mc.scrollTop = mc.scrollHeight;
}

function createAnswers(ids) {
  const mc = document.getElementById('msg-container');
  const group = document.createElement('div');
  group.className = 'answer-container pending-group';
  
  ids.forEach(id => {
    const detail = document.createElement('div');
    detail.className = 'sl-details open';
    detail.innerHTML = `
      <div class="panel-hdr" onclick="this.parentElement.classList.toggle('open')">
        <div class="panel-hdr-left">
          <span class="icon arrow">keyboard_arrow_down</span>
          <span class="model-name">${id.toUpperCase()}</span>
        </div>
        <div class="panel-hdr-right">
          <span class="status-badge">WAITING...</span>
          <input type="checkbox" class="answer-toggle" onclick="event.stopPropagation()">
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-text">Processing...</div>
      </div>`;
    group.appendChild(detail);
  });
  
  mc.appendChild(group);
  mc.scrollTop = mc.scrollHeight;
}

function fillAnswers([modelName, content, id]) {
  const group = document.querySelector('.pending-group');
  if (!group) return;

  const panels = group.querySelectorAll('.sl-details');
  panels.forEach(p => {
    if (p.querySelector('.model-name').innerText === modelName.toUpperCase()) {
      p.querySelector('.panel-text').innerHTML = content;
      p.querySelector('.status-badge').innerText = 'COMPLETE';
      p.dataset.id = id;
      p.querySelector('.answer-toggle').value = id;
    }
  });

  const stillWaiting = Array.from(panels).some(p => p.querySelector('.status-badge').innerText === 'WAITING...');
  if (!stillWaiting) group.classList.remove('pending-group');
}

function clearChatContent() {
  document.getElementById('msg-container').innerHTML = '';
}

function getSelectedAnswerIds() {
  return Array.from(document.querySelectorAll('.answer-toggle:checked')).map(el => el.value);
}

function renderChatList(data) {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  data.forEach(([id, name]) => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `<span class="icon">chat_bubble</span><span>${escapeHtml(name)}</span>`;
    item.onclick = () => window.location.hash = id;
    list.appendChild(item);
  });
}

function getChatIdFromURL() {
  return window.location.hash.substring(1) || null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── MODEL SELECTION ── */

function createCheckboxFromModel(aggregator, provider, id, name) {
  const list = document.getElementById('body-models');
  const item = document.createElement('div');
  item.className = 'model-item';
  item.dataset.id = id;
  item.onclick = () => toggleModel(id);
  item.innerHTML = `
    <span class="model-dot" style="background:var(--primary)"></span>
    <span class="model-lbl">${escapeHtml(name)}</span>
  `;
  list.appendChild(item);
}

function getSelectedModels() {
  return Array.from(document.querySelectorAll('.model-item:not(.disabled)')).map(el => ({
    id: el.dataset.id,
    name: el.querySelector('.model-lbl').innerText
  }));
}

/* ── UI ACTIONS ── */

function toggleSection(name) {
  const body = document.getElementById(`body-${name}`);
  const isOpen = body.classList.toggle('open');
  document.getElementById(`hdr-${name}`).classList.toggle('open', isOpen);
}

function toggleSidebar() {
  const isHidden = document.getElementById('sidebar').classList.toggle('hidden-sb');
  document.getElementById('sb-toggle').classList.toggle('collapsed', isHidden);
}

function toggleModel(id) {
  document.querySelector(`.model-item[data-id="${id}"]`).classList.toggle('disabled');
  const active = Array.from(document.querySelectorAll('.model-item:not(.disabled)'))
    .map(el => el.querySelector('.model-lbl').innerText.split(' ')[0].toUpperCase());
  document.getElementById('active-lbl').textContent = active.join(' · ') || 'NONE';
}

function toggleStream() {
  const el = document.getElementById('stream-toggle');
  const isEnabled = el.innerText === 'ENABLED';
  el.innerText = isEnabled ? 'DISABLED' : 'ENABLED';
  el.style.color = isEnabled ? 'var(--text-muted)' : 'var(--tertiary)';
}

function autoResize() {
  const ta = document.getElementById('prompt-ta');
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
}

function sendQuery() {
  const ta = document.getElementById('prompt-ta');
  const val = ta.value.trim();
  if (!val) return;

  createQuestion(val);
  const selected = getSelectedModels().map(m => m.id);
  if (selected.length) createAnswers(selected);
  
  ta.value = '';
  autoResize();
}

/* ── RESIZING ── */
const handle = document.getElementById('resize-handle');
handle.addEventListener('mousedown', () => {
  const onMove = (e) => {
    let w = Math.min(Math.max(e.clientX, 180), 600);
    document.getElementById('sidebar').style.width = `${w}px`;
    document.documentElement.style.setProperty('--sb-width', `${w}px`);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), {once:true});
});
function clearModels() {
  const modelList = document.getElementById('body-models');
  if (modelList) {
    modelList.innerHTML = '';
  }
}
var textbox = document.getElementById('prompt-ta');
var modelbox = document.getElementById('body-models');

/* ── NOTIFICATION & TOAST LOGIC ── */

/**
 * toggleNotifPanel
 * Toggles the visibility of the notification sidebar.
 */
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) {
    panel.classList.toggle('open');
  }
}

/**
 * addNotification
 * Internal helper to inject a new notification item into the panel.
 */
function addNotification(message, type = 'info') {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'notif-item';
  
  // Set border color based on type
  const colorMap = {
    info: 'var(--secondary)',
    success: 'var(--primary)',
    error: '#ff4d4d'
  };
  item.style.borderColor = colorMap[type] || colorMap.info;

  item.innerHTML = `
    <div class="notif-item-title" style="color:${item.style.borderColor}">${type.toUpperCase()}</div>
    <div class="notif-item-msg">${message}</div>
  `;

  // Prepend so newest is at top
  list.insertBefore(item, list.firstChild);

  // Update badge count
  const badge = document.getElementById('notif-badge');
  if (badge) {
    let count = parseInt(badge.textContent) || 0;
    badge.textContent = count + 1;
    badge.style.display = 'flex';
  }
}

/**
 * toast commands
 * All redirected to addNotification but keeping original names.
 */
function showToast(msg) { addNotification(msg, 'info'); }
function infoToast(msg) { addNotification(msg, 'info'); }
function successToast(msg) { addNotification(msg, 'success'); }
function errorToast(msg) { addNotification(msg, 'error'); }
function warnToast(msg) { addNotification(msg, 'error'); }

/**
 * toggleTool
 * Updated to use new notification redirect.
 */
function toggleTool(el) {
  el.classList.toggle('on');
  successToast('Tool configuration updated');
}

/**
 * deploySync
 * Updated to use new notification redirect.
 */
function deploySync() {
  const sb = document.getElementById('status-bar');
  sb.classList.add('syncing');
  infoToast('Deploying synchronized environment...');
  setTimeout(() => sb.classList.remove('syncing'), 3000);
}

/**
 * updateTokenCount
 * Updates the visual counter in the prompt bar.
 * @param {string} val - The raw text from the textarea.
 */
function updateTokenCount(val) {
  const counterEl = document.getElementById('token-counter');
  if (!counterEl) return;

  // Approximate tokens: ~4 chars per token for English
  // Adjust logic if using specific Byte Pair Encoding (BPE)
  const tokenCount = Math.ceil(val.length / 4);
  
  // Update the UI text
  counterEl.textContent = tokenCount.toLocaleString();

  // Visual feedback: turn red if approaching limit (8,192)
  if (tokenCount > 7000) {
    counterEl.style.color = 'var(--error, #ff4d4d)';
  } else {
    counterEl.style.color = 'inherit';
  }
}