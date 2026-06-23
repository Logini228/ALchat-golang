console.log("interface.js loaded")

/* ── CORE FUNCTIONS ── */

function getHistory() {
  const history = [];
  const innerBlock = document.getElementById('msg-container');
  if (!innerBlock) return history;

  const elements = innerBlock.children;

  for (let el of elements) {
    if (el.classList.contains('msg-in')) {
      const toggle = el.querySelector('.mini-switch');

      // FIX: Check classList instead of .checked
      if (toggle && toggle.classList.contains('on')) {
        const id = el.getAttribute('data-dbid');
        const text = el.querySelector('.user-bubble').children[0]?.innerText || "";

        if (id != "undefined") { history.push([true, id]); }
        else { history.push([false, text]) }
      }
    }

    else if (el.classList.contains('answer-container')) {
      // NOTE: HTML have '.model-panel', not 'sl-details'
      const allDetails = el.querySelectorAll('.model-panel');

      allDetails.forEach(det => {
        const detToggle = det.querySelector('.mini-switch');
        const detId = det.getAttribute('data-dbid'); // HTML use id/data-dbid, not data-id

        // FIX: Check classList instead of .checked
        if (detToggle && detToggle.classList.contains('on') && detId) {
          history.push([true, detId]);
        }
      });
    }
  };

  return history;
}

function createQuestion(s, id) {
  const mc = document.getElementById('msg-container');
  const q = document.createElement('div');
  q.className = 'msg-in';
  q.dataset.dbid = id
  q.innerHTML = `
    <div class="user-label">
      <span class="icon">person</span> USER_QUERY
      <div class="mini-switch on" onclick="this.classList.toggle('on')">
        <div class="mini-switch-knob"></div>
      </div>
    </div>
    <div class="user-bubble">
      <p>${escapeHtml(s)}</p>
    </div>
  `;
  mc.appendChild(q);
  mc.scrollTop = mc.scrollHeight;
}

function createAnswers(ids) {
  const mc = document.getElementById('msg-container');
  if (!mc) return;

  const group = document.createElement('div');
  group.className = 'answer-container pending-group';

  // Track structural index context to match streaming array slots directly
  group.dataset.currentIndex = "0";
  group.dataset.totalPanels = ids.length.toString();

  const wrap = document.createElement('div');
  wrap.className = 'responses-wrap';

  ids.forEach((id, index) => {
    const colorMap = { gpt4: 'primary', claude: 'secondary', gemini: 'tertiary' };
    const cv = `var(--${colorMap[id] || 'primary'})`;

    const panel = document.createElement('div');
    panel.className = 'model-panel collapsed';

    // Explicitly order panels numerically rather than by model name string signatures
    panel.dataset.panelIndex = index.toString();
    panel.dataset.modelKey = id;

    panel.innerHTML = `
      <div class="panel-hdr" onclick="togglePanel(this)">
        <div class="panel-hdr-left">
          <span class="icon panel-arrow" style="color:${cv}">keyboard_arrow_right</span>
          <span class="panel-name" style="color:${cv}">${id.toUpperCase()}</span>
        </div>
        <div class="panel-hdr-right">
          <span class="status-badge" style="background:var(--secondary)22;color:var(--secondary);border-color:var(--secondary)44">WAITING...</span>
          <span class="icon panel-copy" style="font-size: 14px; color: var(--text-muted);" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color='var(--text-muted)'" onclick="copyResp(event,'${id}')" title="Copy">content_copy</span>
          <div class="mini-switch on" onclick="event.stopPropagation();this.classList.toggle('on')" style="--sw-on:var(--primary)" title="Toggle response"><div class="mini-switch-knob"></div></div>
        </div>
      </div>
      <div class="panel-body">
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
 * Matches targets sequentially based on structural execution index pointers
 */
function fillAnswers([modelName, content, id]) {
  // Always access the oldest unresolved active interface container first
  const group = document.querySelector('.pending-group');
  if (!group) return;

  const currentIndexStr = group.dataset.currentIndex || "0";
  const currentIndex = parseInt(currentIndexStr, 10);

  // Directly locate the exact target slot by its array index position
  const panel = group.querySelector(`[data-panel-index="${currentIndex}"]`);
  if (!panel) return;

  const textDiv = panel.querySelector('.panel-text');
  const badge = panel.querySelector('.status-badge');

  if (textDiv && badge) {
    textDiv.innerHTML = content;
    badge.innerText = 'COMPLETE';
    panel.dataset.dbid = id;

    // If the dynamic API response contains a specific model version name, preserve it
    if (modelName) {
      const nameSpan = panel.querySelector('.panel-name');
      if (nameSpan) nameSpan.innerText = modelName.toUpperCase();
    }
  }

  // Advance execution pointer state to prepare for next chunk sequence item
  const nextIndex = currentIndex + 1;
  group.dataset.currentIndex = nextIndex.toString();

  const totalPanels = parseInt(group.dataset.totalPanels || "0", 10);
  if (nextIndex >= totalPanels) {
    group.classList.remove('pending-group');
  }
}

function fillQuestion(id) {
  const elements = document.querySelectorAll('.msg-in[data-dbid="undefined"]');
  if (elements.length === 0) return;

  const lastElement = elements[elements.length - 1];
  lastElement.setAttribute('data-dbid', id);
}

/**
 * togglePanel
 * Stateless toggle using classList and icon swap.
 */
function togglePanel(headerElement) {
  if (!headerElement) return;

  // Find wrapper box containing header and body
  const panel = headerElement.parentElement;
  if (!panel) return;

  // Find body inside wrapper box
  const body = panel.querySelector('.panel-body');
  const arrow = panel.querySelector('.panel-arrow');

  if (!body) return;

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
  const currentChatId = getChatIdFromURL(); 
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  
for (const [id, name] of data) {
    if (name === "") { continue; } // Works perfect here
    
    const item = document.createElement('div');
    const isActive = (id == currentChatId);
    item.className = `chat-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `<span class="icon">chat_bubble</span><span>${escapeHtml(name)}</span>`;
    item.addEventListener('click', () => { handleChatlistClick(id, data); });
    list.appendChild(item);
  }
}

function getChatIdFromURL() {
  const match = window.location.pathname.match(/\/chat\/(\w+)/);
  return match ? match[1] : null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── MODEL SELECTION ── */

const MODEL_META = {};
let infoTip = null;
let infoTipHideTimer = null;

function esc(text) {
  return escapeHtml(text || '');
}

function showInfoTip(e, key) {
  clearTimeout(infoTipHideTimer);
  
  if (!infoTip) {
    infoTip = document.getElementById('info-tooltip');
    if (!infoTip) {
      infoTip = document.createElement('div');
      infoTip.id = 'info-tooltip';
      infoTip.className = 'info-tooltip';
      document.body.appendChild(infoTip);
    }
  }

  const m = MODEL_META[key];
  if (!m) return;
  const cv = `var(--${m.color})`;

  infoTip.innerHTML = `
    <div class="info-tooltip-title" style="color:${cv}">${esc(m.name)}</div>
    <div class="info-row"><span class="info-key">Aggregator</span><span class="info-val">${esc(m.aggregator)}</span></div>
    <div class="info-row"><span class="info-key">Provider</span><span class="info-val">${esc(m.provider)}</span></div>
    <div class="info-row"><span class="info-key">Model ID</span><span class="info-val info-mono">${esc(m.id)}</span></div>
    <div class="info-row"><span class="info-key">Name</span><span class="info-val">${esc(m.name)}</span></div>
    <div class="info-row"><span class="info-key">Price</span><span class="info-val">${esc(m.price)}</span></div>
    <div class="info-row"><span class="info-key">Context</span><span class="info-val">${esc(m.context)}</span></div>
    <div class="info-row"><span class="info-key">Inputs</span><span class="info-val">${esc(m.inputs)}</span></div>
    <div class="info-row"><span class="info-key">Outputs</span><span class="info-val">${esc(m.outputs)}</span></div>\n`;
  infoTip.style.borderColor = `${cv}66`;

  // Position relative to the hovered icon, clamped to viewport
  const rect = e.currentTarget.getBoundingClientRect();
  infoTip.style.visibility = 'hidden';
  infoTip.style.display = 'block';
  const tipH = infoTip.offsetHeight;
  const tipW = infoTip.offsetWidth;

  let left = rect.right + 10;
  let top = rect.top + rect.height / 2 - tipH / 2;

  // Flip below/right edge clamp
  if (left + tipW > window.innerWidth - 8) left = rect.left - tipW - 10;
  if (top < 8) top = 8;
  if (top + tipH > window.innerHeight - 8) top = window.innerHeight - tipH - 8;

  infoTip.style.left = left + 'px';
  infoTip.style.top = top + 'px';
  infoTip.style.visibility = '';
  infoTip.classList.add('show');
}

function hideInfoTip() {
  infoTipHideTimer = setTimeout(() => {
    if (infoTip) {
      infoTip.classList.remove('show');
    }
  }, 60);
}

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

  // Determine color based on provider/id
  const colorMap = { gpt4: 'primary', claude: 'secondary', gemini: 'tertiary' };
  const cv = `var(--${colorMap[id] || 'primary'})`;

  // Save to metadata map
  MODEL_META[id] = {
    aggregator: aggregator || '',
    provider: provider || '',
    id: id || '',
    name: name || '',
    price: price || '',
    context: context || '',
    inputs: inputs || '',
    outputs: outputs || '',
    color: cv
  };

  item.innerHTML = `
    <span class="model-dot" id="${id}" style="background:${cv}"></span>
    <span class="model-lbl" id="${id}">${escapeHtml(name)}</span>
    <span class="icon info-icon" style="color:${cv}" onmouseenter="showInfoTip(event,'${id}')" onmouseleave="hideInfoTip()" onclick="event.stopPropagation()">info</span>
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
    handleChat();
  }
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
 * triggerToast
 * Uses the pre-styled single #toast element from the DOM.
 */
function triggerToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Clear any existing timeout to avoid premature hiding if spamming alerts
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }

  // Define fallback colors to match the theme if CSS vars are missing
  const colorMap = {
    info: 'var(--secondary, #2196f3)',
    success: 'var(--quinternary, #bac6ff)',
    error: 'var(--tertiary, #f44336)',
    warn: 'var(--quaternary, #ff9800)'
  };

  // Update content and text color dynamically based on type
  toast.style.color = colorMap[type] || colorMap.info;
  toast.innerHTML = `[${type.toUpperCase()}] ${message}`;

  // Fire animation sequence via CSS classes
  toast.classList.add('show');

  // Register auto-hide sequence
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * addNotification
 * Injects item into sidebar panel and triggers the separate toast sequence.
 */
function addNotification(message, type = 'info') {
  // 1. Sidebar Panel Logging
  const list = document.getElementById('notif-list');
  if (list) {
    const item = document.createElement('div');
    item.className = 'notif-item';

    const colorMap = {
      info: 'var(--secondary)',
      success: 'var(--primary)',
      error: 'var(--tertiary)',
      warn: 'var(--quaternary)'
    };
    const borderColor = colorMap[type] || colorMap.info;
    item.style.borderColor = borderColor;

    item.innerHTML = `
      <div class="notif-item-title" style="color:${borderColor}">${type.toUpperCase()}</div>
      <div class="notif-item-msg">${message}</div>
    `;
    list.insertBefore(item, list.firstChild);

    const badge = document.getElementById('notif-badge');
    if (badge) {
      let count = parseInt(badge.textContent) || 0;
      badge.textContent = count + 1;
      badge.style.display = 'flex';
    }
  }

  // 2. Delegate to toast function
  triggerToast(message, type);
}

/**
 * toast commands
 * All redirected to addNotification but keeping original names.
 */
function showToast(msg) { addNotification(msg, 'info'); }
function infoToast(msg) { addNotification(msg, 'info'); }
function successToast(msg) { addNotification(msg, 'success'); }
function errorToast(msg) { addNotification(msg, 'error'); }
function warnToast(msg) { addNotification(msg, 'warn'); }

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

var loggud = false;

var userName = "User"; // Placeholder name for toast
var userAvatar = null; // Test placeholder styling

function renderFooter() {
  const footer = document.getElementById('sb-footer');
  if (loggud) {
    const avatarHtml = userAvatar
      ? `<img class="footer-avatar" src="${userAvatar}" alt="${userName}"/>`
      : `<div class="footer-avatar-placeholder" style="width:20px;height:20px;border-radius:50%;background-color:var(--primary);display:inline-block;vertical-align:middle;"></div>`;
    footer.innerHTML = `
      <div class="footer-user">
        <div class="footer-user-info">
          ${avatarHtml}
          <span class="footer-username">${userName}</span>
        </div>
        <div class="notif-wrap">
          <span class="icon" style="font-size:20px;cursor:pointer;transition:color var(--tr)" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color=''" onclick="toggleNotifPanel()">notifications</span>
          <span class="notif-badge" id="notif-badge">2</span>
        </div>
        <span class="icon" style="font-size:20px;cursor:pointer;transition:color var(--tr);margin-left:6px" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color=''" onclick="showToast('Settings — coming soon')">settings</span>
        <span class="icon" style="font-size:20px;cursor:pointer;transition:color var(--tr);margin-left:6px" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color=''" onclick="handleLogout()">logout</span>
      </div>`;
  } else {
    footer.innerHTML = `
      <div class="footer-auth">
        <span class="footer-auth-label">Sign in to save chats and sync across devices.</span>
        <button class="btn-google" onclick="handleGoogleAuth()">
          <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>`;
  }
}

function handleGoogleAuth() {
  signInWithGoogle()
}

function handleLogout() {
  //CookieStoreManager.removeItem('longJWT');
  localStorage.removeItem('shortJWT');
  clearChatContent();
  moveUserHome();
  loggud = false;
  renderFooter();
  infoToast('Logout is WIP, reload the page');
}