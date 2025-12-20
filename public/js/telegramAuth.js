// public/js/telegramAuth.js
import { CONFIG } from './config.js';

export class TelegramAuth {
  constructor() {
    this.authData = null;
    this.onAuthCallback = null;
  }

  /**
   * Инициализация Telegram Login Widget
   * @param {string} containerId - ID контейнера для кнопки
   * @param {string} botUsername - Username бота (без @)
   * @param {function} onAuth - Callback после успешной авторизации
   */
  init(containerId, botUsername, onAuth) {
    this.onAuthCallback = onAuth;
    
    // Проверяем текущую сессию
    this.checkAuth().then(authData => {
      if (authData && authData.telegram_id) {
        this.authData = authData;
        this.hideLoginButton(containerId);
        this.renderMyChatButton(containerId, authData.telegram_username);
        if (this.onAuthCallback) {
          this.onAuthCallback(authData);
        }
      } else {
        this.renderLoginButton(containerId, botUsername);
      }
    });
  }

  /**
   * Проверка текущей авторизации
   */
  async checkAuth() {
    try {
      const res = await fetch(`${CONFIG.BASE_PATH}/api/telegram_auth.php?action=check`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (e) {
      console.error('[TelegramAuth] Check failed:', e);
      return null;
    }
  }

  /**
   * Рендер кнопки авторизации
   */
  renderLoginButton(containerId, botUsername) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Создаём скрипт для Telegram Widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-auth-url', `${window.location.origin}${CONFIG.BASE_PATH}/api/telegram_auth.php`);
    script.setAttribute('data-request-access', 'write');

    container.appendChild(script);

    // Слушаем событие авторизации
    window.addEventListener('message', this.handleTelegramAuth.bind(this));
  }

  /**
   * Обработка авторизации через Telegram
   */
  async handleTelegramAuth(event) {
    if (event.origin !== 'https://oauth.telegram.org') return;

    const data = event.data;
    if (!data || !data.id) return;

    try {
      const res = await fetch(`${CONFIG.BASE_PATH}/api/telegram_auth.php?action=auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.success) {
        this.authData = result.data;
        
        // Скрываем кнопку авторизации
        const container = document.querySelector('[data-telegram-login]')?.parentElement;
        if (container) {
          this.hideLoginButton(container.id);
          this.renderMyChatButton(container.id, result.data.telegram_username);
        }

        if (this.onAuthCallback) {
          this.onAuthCallback(result.data);
        }
      }
    } catch (e) {
      console.error('[TelegramAuth] Auth failed:', e);
    }
  }

  /**
   * Скрыть кнопку авторизации
   */
  hideLoginButton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Рендер кнопки "мой чат"
   */
  renderMyChatButton(containerId, username) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <a 
        href="https://t.me/${username}" 
        target="_blank" 
        class="my-chat-button"
        title="Открыть чат в Telegram"
      >
        [${username}]
      </a>
    `;
  }

  /**
   * Разлогиниться
   */
  async logout() {
    try {
      const res = await fetch(`${CONFIG.BASE_PATH}/api/telegram_auth.php?action=logout`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        this.authData = null;
        location.reload();
      }
    } catch (e) {
      console.error('[TelegramAuth] Logout failed:', e);
    }
  }
}
