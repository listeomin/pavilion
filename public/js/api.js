// public/js/api.js
export function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = name + "=" + value + ";path=/;expires=" + d.toUTCString() + ";SameSite=Lax";
}

export function getCookie(name) {
  const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return v ? v.pop() : null;
}

export async function apiInit(API, sessionId, COOKIE_NAME) {
  const form = new FormData();
  if (sessionId) form.append('session_id', sessionId);
  const res = await fetch(API + '?action=init', { method: 'POST', body: form });
  const data = await res.json();
  setCookie(COOKIE_NAME, data.session_id, 30);
  return data;
}

export async function apiSend(API, sessionId, text, metadata = null) {
  const payload = { session_id: sessionId, text: text };
  if (metadata) payload.metadata = metadata;
  const res = await fetch(API + '?action=send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function apiPoll(API, lastId) {
  const url = API + '?action=poll&after_id=' + encodeURIComponent(lastId);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}

export async function apiChangeName(API, sessionId) {
  const form = new FormData();
  form.append('session_id', sessionId);
  const res = await fetch(API + '?action=change_name', { method: 'POST', body: form });
  if (!res.ok) return null;
  return await res.json();
}

export async function apiUploadImage(API, file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const res = await fetch(API + '?action=upload_image', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const error = await res.json();
    return { success: false, error: error.error || 'Upload failed' };
  }
  
  return await res.json();
}

export async function apiDeleteImage(API, id) {
  const res = await fetch(API + '?action=delete_image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id })
  });
  
  if (!res.ok) return { success: false, error: 'Delete failed' };
  return await res.json();
}
