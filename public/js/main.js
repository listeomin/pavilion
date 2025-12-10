// public/js/main.js
(function(){
  const API = '/pavilion/server/api.php';   // путь к API
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  let myName = '';
  let lastId = 0;
  let pollInterval = 3000;
  const chatLog = document.getElementById('chat-log');
  const youEl = document.getElementById('you');

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + "=" + value + ";path=/pavilion;expires=" + d.toUTCString() + ";SameSite=Lax";
  }
  function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : null;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function renderMessages(messages) {
    if (!messages || !messages.length) return;
    const frag = document.createDocumentFragment();
    messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg';
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = m.author + ':';
      const text = document.createElement('span');
      text.innerHTML = ' ' + escapeHtml(m.text);
      div.appendChild(meta);
      div.appendChild(text);
      frag.appendChild(div);
      lastId = Math.max(lastId, Number(m.id));
    });
    chatLog.appendChild(frag);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  async function apiInit() {
    const form = new FormData();
    if (sessionId) form.append('session_id', sessionId);
    const res = await fetch(API + '?action=init', { method: 'POST', body: form });
    const data = await res.json();
    sessionId = data.session_id;
    myName = data.name;
    youEl.textContent = 'Вы: ' + myName;
    setCookie(COOKIE_NAME, sessionId, 30);
    renderMessages(data.messages || []);
  }

  async function apiSend(text) {
    const payload = { session_id: sessionId, text: text };
    const res = await fetch(API + '?action=send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) return;
    const msg = await res.json();
    renderMessages([msg]);
  }

  async function apiPoll() {
    try {
      const url = API + '?action=poll&after_id=' + encodeURIComponent(lastId);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length) {
        renderMessages(data.messages);
      }
    } catch (e) {
      // silent
    } finally {
      setTimeout(apiPoll, pollInterval);
    }
  }

  document.getElementById('sendForm').addEventListener('submit', function(e){
    e.preventDefault();
    const input = document.getElementById('text');
    const text = input.value.trim();
    if (!text) return;
    apiSend(text);
    input.value = '';
    input.focus();
  });

  // init
  apiInit().then(() => {
    setTimeout(apiPoll, pollInterval);
  });
})();
