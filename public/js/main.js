/**
 * Pavilion Chat - Frontend Logic
 * Добавлена поддержка автоматического отображения изображений по прямым ссылкам
 */

// Конфигурация из config.js загружается отдельно
let sessionId = null;
let userName = null;
let lastMessageId = 0;
let isPolling = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initChat();
    setupFormHandlers();
});

/**
 * Инициализация чата - получение сессии и загрузка истории
 */
async function initChat() {
    try {
        const response = await fetch(`${API_BASE}?action=init`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        sessionId = data.session_id;
        userName = data.name;
        
        // Отображаем имя пользователя
        const authorElement = document.querySelector('.author');
        if (authorElement) {
            authorElement.textContent = userName;
        }
        
        // Рендерим историю сообщений
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => renderMessage(msg));
            lastMessageId = Math.max(...data.messages.map(m => m.id));
            scrollToBottom();
        }
        
        // Запускаем polling
        startPolling();
        
    } catch (error) {
        console.error('Init error:', error);
    }
}

/**
 * Настройка обработчиков формы
 */
function setupFormHandlers() {
    const textarea = document.querySelector('textarea[name="message"]');
    const submitBtn = document.querySelector('button[type="submit"]');
    const form = document.querySelector('form');
    
    if (!textarea || !submitBtn || !form) return;
    
    // Показываем/скрываем кнопку отправки
    textarea.addEventListener('input', () => {
        const hasText = textarea.value.trim().length > 0;
        submitBtn.style.opacity = hasText ? '1' : '0';
        submitBtn.style.pointerEvents = hasText ? 'auto' : 'none';
    });
    
    // Отправка по Enter (но не Shift+Enter)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
    
    // Обработка отправки формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });
}

/**
 * Отправка сообщения
 */
async function sendMessage() {
    const textarea = document.querySelector('textarea[name="message"]');
    const text = textarea.value.trim();
    
    if (!text || !sessionId) return;
    
    try {
        const response = await fetch(`${API_BASE}?action=send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                text: text
            })
        });
        
        const message = await response.json();
        
        // Рендерим отправленное сообщение
        renderMessage(message);
        lastMessageId = message.id;
        
        // Очищаем форму
        textarea.value = '';
        textarea.dispatchEvent(new Event('input')); // Скрываем кнопку
        
        scrollToBottom();
        
    } catch (error) {
        console.error('Send error:', error);
    }
}

/**
 * Запуск polling для получения новых сообщений
 */
function startPolling() {
    if (isPolling) return;
    isPolling = true;
    
    setInterval(async () => {
        await pollNewMessages();
    }, 3000); // каждые 3 секунды
}

/**
 * Получение новых сообщений
 */
async function pollNewMessages() {
    if (!sessionId) return;
    
    try {
        const response = await fetch(`${API_BASE}?action=poll&after_id=${lastMessageId}`);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
            const wasAtBottom = isScrolledToBottom();
            
            data.messages.forEach(msg => renderMessage(msg));
            lastMessageId = Math.max(...data.messages.map(m => m.id));
            
            // Автоскролл только если пользователь был внизу
            if (wasAtBottom) {
                scrollToBottom();
            }
        }
        
    } catch (error) {
        console.error('Poll error:', error);
    }
}

/**
 * Рендеринг сообщения в чат
 */
function renderMessage(msg) {
    const chatMessages = document.querySelector('.messages');
    if (!chatMessages) return;
    
    // Проверяем, не добавлено ли уже это сообщение
    if (document.querySelector(`[data-message-id="${msg.id}"]`)) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.setAttribute('data-message-id', msg.id);
    messageDiv.style.animation = 'fadeIn 0.3s ease-in';
    
    // Обрабатываем текст: экранируем HTML, затем linkify изображения
    const processedText = linkifyImages(escapeHtml(msg.text));
    
    messageDiv.innerHTML = `
        <div class="author">${escapeHtml(msg.author)}</div>
        <div class="text">${processedText}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
}

/**
 * Преобразование ссылок на изображения в теги <img>
 * Поддерживает: .png, .jpg, .jpeg, .gif, .webp
 */
function linkifyImages(text) {
    // Регулярка для URL изображений
    const imageRegex = /(https?:\/\/[^\s<>"]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"]*)?)/gi;
    
    return text.replace(imageRegex, (url) => {
        // Экранируем URL для использования в атрибутах
        const escapedUrl = url.replace(/"/g, '&quot;');
        
        return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">
                    <img src="${escapedUrl}" 
                         alt="Image" 
                         style="max-width: 100%; 
                                height: auto; 
                                border-radius: 8px; 
                                margin: 8px 0; 
                                display: block;
                                cursor: pointer;
                                transition: opacity 0.2s;"
                         onerror="this.parentElement.outerHTML='<a href=&quot;${escapedUrl}&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot;>${escapedUrl}</a>'"
                         loading="lazy"
                         onmouseover="this.style.opacity='0.9'"
                         onmouseout="this.style.opacity='1'" />
                </a>`;
    });
}

/**
 * Экранирование HTML для предотвращения XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Проверка, находится ли скролл внизу
 */
function isScrolledToBottom() {
    const chatMessages = document.querySelector('.messages');
    if (!chatMessages) return true;
    
    const threshold = 100; // порог в пикселях
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
}

/**
 * Прокрутка чата вниз
 */
function scrollToBottom() {
    const chatMessages = document.querySelector('.messages');
    if (!chatMessages) return;
    
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

// CSS для fade-in анимации (добавить в <style> если нет)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .message img {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .message img:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);
