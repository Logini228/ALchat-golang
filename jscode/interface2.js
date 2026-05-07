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
/**
 * createAnswers
 * Uses model-panel class. Default state is open (not collapsed).
 * Groups panels inside responses-wrap.
 */
/**
 * createAnswers
 * Matches precise HTML structure: responses-wrap > model-panel.
 * IDs follow pattern: panel-[msgIdx]-[modelId].
 */
function createAnswers(ids) {
  const mc = document.getElementById('msg-container');
  const msgIdx = mc.querySelectorAll('.answer-container').length + 1;

  const group = document.createElement('div');
  group.className = 'answer-container pending-group';

  const wrap = document.createElement('div');
  wrap.className = 'responses-wrap';

  ids.forEach(id => {
    // Determine color variable based on common model keys
    const colorMap = { gpt4: 'primary', claude: 'secondary', gemini: 'tertiary' };
    const cv = `var(--${colorMap[id] || 'primary'})`;

    const panel = document.createElement('div');
    panel.className = 'model-panel';
    panel.id = `panel-${msgIdx}-${id}`;

    panel.innerHTML = `
      <div class="panel-hdr" onclick="togglePanel(${msgIdx},'${id}')">
        <div class="panel-hdr-left">
          <span class="icon panel-arrow" style="color:${cv}">keyboard_arrow_down</span>
          <span class="panel-name" style="color:${cv}">${id.toUpperCase()}</span>
        </div>
        <div class="panel-hdr-right">
          <span class="status-badge" style="background:${cv}22;color:${cv};border-color:${cv}44">WAITING...</span>
          <span class="icon panel-copy" style="font-size:14px;color:var(--text-muted)" 
            onmouseenter="this.style.color='${cv}'" 
            onmouseleave="this.style.color='var(--text-muted)'" 
            onclick="copyResp(event,'${id}',${msgIdx})" title="Copy">content_copy</span>
        </div>
      </div>
      <div class="panel-body open" id="pbody-${msgIdx}-${id}">
        <div class="panel-body-inner">
          <div class="panel-text">Processing...</div>
        </div>
      </div>`;
    wrap.appendChild(panel);
  });

  group.appendChild(wrap);
  mc.appendChild(group);
  mc.scrollTop = mc.scrollHeight;
}

/**
 * fillAnswers
 * Injects content into panel-body-inner and updates status.
 */
function fillAnswers([modelName, content, id]) {
  const group = document.querySelector('.pending-group');
  if (!group) return;

  const panel = group.querySelector(`[id$="-${modelName}"]`);
  if (panel) {
    const textDiv = panel.querySelector('.panel-text');
    const badge = panel.querySelector('.status-badge');

    // content expected to be sanitized/formatted HTML string
    textDiv.innerHTML = content;
    badge.innerText = 'STREAMING_COMPLETE';
    panel.dataset.dbid = id;
  }

  // Remove pending tag if all panels in this group finished
  const waiting = group.querySelectorAll('.status-badge');
  const allDone = Array.from(waiting).every(b => b.innerText !== 'WAITING...');
  if (allDone) group.classList.remove('pending-group');
}

/**
 * togglePanel
 * Stateless toggle using classList and icon swap.
 */
function togglePanel(msgIdx, id) {
  const panel = document.getElementById(`panel-${msgIdx}-${id}`);
  const body = document.getElementById(`pbody-${msgIdx}-${id}`);
  const arrow = panel.querySelector('.panel-arrow');

  const isCollapsed = panel.classList.toggle('collapsed');
  body.classList.toggle('open', !isCollapsed);

  if (arrow) {
    arrow.innerText = isCollapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_down';
  }
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

/**
 * createCheckboxFromModel
 * adds 'disabled' class by default.
 */
function createCheckboxFromModel(aggregator, provider, id, name, price, context, inputs, outputs) {
  const list = document.getElementById('body-models');
  if (!list) return;

  const item = document.createElement('div');
  // Logic: Add 'disabled' by default so user must opt-in
  item.className = 'model-item disabled';
  item.dataset.id = id;
  item.dataset.agg = aggregator;
  item.dataset.prov = provider;
  item.onclick = () => toggleModel(id);

  item.innerHTML = `
    <span class="model-dot"></span>
    <span class="model-lbl">${escapeHtml(name)}</span>
  `;
  list.appendChild(item);
}

/**
 * getSelectedModels
 * returns only active (non-disabled) models.
 */
function getSelectedModels() {
  const activeNodes = document.querySelectorAll('.model-item:not(.disabled)');
  return Array.from(activeNodes).map(el => ({
    id: el.dataset.id,
    aggregator: el.dataset.agg,
    provider: el.dataset.prov,
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
  document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
});

function clearModels() {
  const modelList = document.getElementById('body-models');
  if (!modelList) return;

  const items = modelList.querySelectorAll(':scope > :not(.sb-search)');
  
  items.forEach(item => item.remove());
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