// nest.js - инициализация страницы Гнездо без чата
import { getCookie, apiInit } from './api.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';

(async function () {
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  const userEmojiEl = document.getElementById('user-emoji');

  // Инициализация NightShift
  NightShift.init();

  // Инициализация API чтобы получить session_id и emoji
  const data = await apiInit('/server/api.php', sessionId, COOKIE_NAME);
  sessionId = data.session_id;
  const myName = data.name;
  const emoji = myName.split(' ')[0];
  userEmojiEl.textContent = emoji;

  // Инициализация AnimalProfile
  const animalProfile = new AnimalProfile(sessionId, emoji, (newName) => {
    const newEmoji = newName.split(' ')[0];
    userEmojiEl.textContent = newEmoji;
  });
  await animalProfile.init();

  // Кнопка профиля
  const profileBtn = document.getElementById('animal-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      animalProfile.open();
    });
  }
})();
