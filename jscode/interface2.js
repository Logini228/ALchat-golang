const S = {
  activeChat: 0,
  streamEnabled: true,
  activeModels: { gpt4: true, claude: true, gemini: true },
  sidebarVisible: true,
  sidebarWidth: 256,
  chats: [
    {
      name: 'Main.ts',
      messages: [
        { role:'user', text:'Optimize this React hook for better performance by preventing unnecessary re-renders in the child components that consume the context values.' },
        {
          role:'assistant',
          responses: {
            gpt4: {
              label:'GPT-4 Turbo', color:'primary', status:'STREAMING_COMPLETE', open:true,
              text:'To optimize React performance and prevent unnecessary re-renders, use <code>useMemo</code> for the context value object and ensure child components are wrapped in <code>React.memo</code> where appropriate.',
              code:'const contextValue = useMemo(() => ({\n    data,\n    updateData: (val) => setData(val)\n}), [data]);\n\n// Wrapped in Provider\n<DataContext.Provider value={contextValue}>\n    {children}\n</DataContext.Provider>'
            },
            claude: {
              label:'Claude 3.5 Sonnet', color:'secondary', status:'READY_CACHED', open:false,
              text:'Consider splitting your context into multiple smaller contexts separated by concern. This prevents consumers of one context from re-rendering when unrelated state changes.',
              code:'// Split context by concern\nconst DataContext = createContext(null);\nconst ActionsContext = createContext(null);\n\n// Children only re-render for relevant changes'
            },
            gemini: {
              label:'Gemini 1.5 Pro', color:'tertiary', status:'IDLE', open:false,
              text:'Use <code>useCallback</code> to stabilize function references passed through context, combined with <code>useReducer</code> to batch state updates efficiently.',
              code:'const dispatch = useCallback(\n    (action) => internalDispatch(action),\n    [] // Stable reference\n);'
            }
          }
        }
      ]
    },
    { name:'System.py',   messages:[{ role:'user', text:'Write a Python async generator that streams data from a websocket and handles reconnection logic automatically.' }] },
    { name:'Interface.jsx', messages:[{ role:'user', text:'Create a responsive grid layout component that adapts from 1 to 4 columns based on screen size and container width using CSS Grid.' }] }
  ]
};

/* ── RENDER ────────────────────────────────────────────────── */
function render() {
  const mc = document.getElementById('msg-container');
  mc.innerHTML = '';
  S.chats[S.activeChat].messages.forEach((m, i) => mc.appendChild(buildMsg(m, i)));
  mc.scrollTop = mc.scrollHeight;
  updateChatList();
}

function updateChatList() {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  S.chats.forEach((chat, i) => {
    const item = document.createElement('div');
    item.className = `chat-item ${i === S.activeChat ? 'active' : ''}`;
    item.onclick = () => { S.activeChat = i; render(); };
    item.innerHTML = `<span class="icon">chat_bubble</span><span class="chat-name">${chat.name}</span>`;
    list.appendChild(item);
  });
  document.getElementById('chat-count').textContent = S.chats.length;
}

function buildMsg(msg, idx) {
  const d = document.createElement('div');
  d.className = 'msg-in';
  if (msg.role === 'user') {
    d.innerHTML = `<div class="user-label"><span class="icon">person</span> USER_QUERY</div>
      <div class="user-bubble"><p>${esc(msg.text)}</p></div>`;
  } else {
    const wrap = document.createElement('div');
    wrap.className = 'responses-wrap';
    Object.entries(msg.responses).forEach(([k, r]) => wrap.appendChild(buildPanel(r, k, idx)));
    d.appendChild(wrap);
  }
  return d;
}

function buildPanel(r, key, msgIdx) {
  const cv = `var(--${r.color})`;
  const el = document.createElement('div');
  el.className = `model-panel ${r.open ? '' : 'collapsed'}`;
  el.id = `panel-${msgIdx}-${key}`;

  const codeHtml = r.code ? `
    <div class="code-block">
      <pre>${synHL(esc(r.code))}</pre>
      <button class="code-copy-btn" onclick="copyCode(event,\`${r.code.replace(/\\/g,'\\\\').replace(/`/g,'\\`')}\`)">COPY</button>
    </div>` : '';

  el.innerHTML = `
    <div class="panel-hdr" onclick="togglePanel(${msgIdx},'${key}')">
      <div class="panel-hdr-left">
        <span class="icon panel-arrow" style="color:${cv}">${r.open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</span>
        <span class="panel-name" style="color:${cv}">${r.label}</span>
      </div>
      <div class="panel-hdr-right">
        <span class="status-badge" style="background:${cv}22;color:${cv};border-color:${cv}44">${r.status}</span>
        <span class="icon panel-copy" style="font-size:14px;color:var(--text-muted)" onmouseenter="this.style.color='${cv}'" onmouseleave="this.style.color='var(--text-muted)'" onclick="copyResp(event,'${key}',${msgIdx})" title="Copy">content_copy</span>
      </div>
    </div>
    <div class="panel-body ${r.open ? 'open' : ''}" id="pbody-${msgIdx}-${key}">
      <div class="panel-body-inner">
        <div class="panel-text">${applyCodeColor(r.text, cv)}</div>
        ${codeHtml}
      </div>
    </div>`;
  return el;
}

function applyCodeColor(html, color) {
  return html.replace(/<code>/g, `<code style="color:${color}">`);
}

function synHL(code) {
  return code
    .replace(/(const|let|var|function|return|async|await|import|export|default|class|if|else|for|while|new|from|of)\b/g, '<span class="syn-kw">$1</span>')
    .replace(/\/\/.*/g, '<span class="syn-cmt">$&</span>')
    .replace(/\b(useMemo|useCallback|useReducer|useState|useContext|useEffect|createContext|dispatch)\b/g, '<span class="syn-fn">$1</span>');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── UI ACTIONS ────────────────────────────────────────────── */
function togglePanel(msgIdx, key) {
  const r = S.chats[S.activeChat].messages[msgIdx]?.responses?.[key];
  if (!r) return;
  r.open = !r.open;
  render();
}

function toggleSection(name) {
  const hdr = document.getElementById(`hdr-${name}`);
  const body = document.getElementById(`body-${name}`);
  const isOpen = body.classList.toggle('open');
  hdr.classList.toggle('open', isOpen);
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('sb-toggle');
  S.sidebarVisible = !S.sidebarVisible;
  
  sb.classList.toggle('hidden-sb', !S.sidebarVisible);
  btn.classList.toggle('collapsed', !S.sidebarVisible);
}

function toggleMoreMenu() {
  document.getElementById('more-menu').classList.toggle('open');
}

function toggleStream() {
  S.streamEnabled = !S.streamEnabled;
  const el = document.getElementById('stream-toggle');
  el.textContent = S.streamEnabled ? 'ENABLED' : 'DISABLED';
  el.style.color = S.streamEnabled ? 'var(--tertiary)' : 'var(--text-muted)';
}

function toggleModel(id) {
  const item = document.querySelector(`.model-item[data-id="${id}"]`);
  S.activeModels[id] = !S.activeModels[id];
  item.classList.toggle('disabled', !S.activeModels[id]);
  
  const active = Object.entries(S.activeModels)
    .filter(([_,v]) => v)
    .map(([k]) => k.toUpperCase())
    .join(' · ');
  document.getElementById('active-lbl').textContent = active || 'NONE';
}

function toggleTool(el) {
  el.classList.toggle('on');
  showToast('Tool configuration updated');
}

function updateTokenCount(val) {
  const count = Math.floor(val.length / 4);
  document.getElementById('token-counter').textContent = count.toLocaleString();
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
}

function sendQuery() {
  const ta = document.getElementById('prompt-ta');
  const text = ta.value.trim();
  if (!text) return;
  
  S.chats[S.activeChat].messages.push({ role:'user', text });
  ta.value = '';
  updateTokenCount('');
  render();
  
  // Simulate AI response
  setTimeout(() => {
    S.chats[S.activeChat].messages.push({
      role: 'assistant',
      responses: {
        gpt4: { label:'GPT-4 Turbo', color:'primary', status:'COMPLETED', open:true, text:'Query processed in SYNCHRONIZED mode.' }
      }
    });
    render();
    document.getElementById('status-msg').textContent = 'RESPONSE_RECEIVED';
    document.getElementById('status-msg').style.opacity = '1';
    setTimeout(() => { document.getElementById('status-msg').style.opacity = '0'; }, 2000);
  }, 600);
}

function deploySync() {
  const sb = document.getElementById('status-bar');
  sb.classList.add('syncing');
  showToast('Deploying synchronized environment...');
  setTimeout(() => sb.classList.remove('syncing'), 3000);
}

function newChat() {
  S.chats.unshift({ name: 'new_chat.ts', messages: [] });
  S.activeChat = 0;
  render();
  showToast('New chat initialized');
}

function clearAll() {
  S.chats = [{ name: 'Session.log', messages: [] }];
  S.activeChat = 0;
  render();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('open');
}

function copyCode(e, code) {
  e.stopPropagation();
  const el = document.createElement('textarea');
  el.value = code;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  showToast('Code copied to clipboard');
}

/* ── RESIZING LOGIC ────────────────────────────────────────── */
const handle = document.getElementById('resize-handle');
const sidebar = document.getElementById('sidebar');
let isDragging = false;

handle.addEventListener('mousedown', (e) => {
  isDragging = true;
  document.body.style.cursor = 'col-resize';
  handle.classList.add('dragging');
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
  if (!isDragging) return;
  let newWidth = e.clientX;
  if (newWidth < 180) newWidth = 180;
  if (newWidth > 600) newWidth = 600;
  
  S.sidebarWidth = newWidth;
  sidebar.style.width = `${newWidth}px`;
  document.documentElement.style.setProperty('--sb-width', `${newWidth}px`);
}

function onMouseUp() {
  isDragging = false;
  document.body.style.cursor = '';
  handle.classList.remove('dragging');
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

/* ── INIT ──────────────────────────────────────────────────── */
window.onload = () => {
  render();
  
  // Close menu on outside click
  window.addEventListener('click', (e) => {
    if (!e.target.closest('#more-btn') && !e.target.closest('#more-menu')) {
      document.getElementById('more-menu').classList.remove('open');
    }
  });
};