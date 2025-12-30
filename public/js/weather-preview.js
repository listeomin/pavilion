// public/js/weather-preview.js
export function renderWeatherPreview(metadata) {
  if (!metadata || metadata.type !== 'weather') {
    return '';
  }

  const { city, temperature, wind, humidity, precipitation, icon } = metadata;

  console.log('[Weather] Rendering weather preview:', metadata);
  console.log('[Weather] Icon:', icon);

  return `
    <div class="weather-preview-card">
      <div class="weather-preview-badge">ПОГОДА</div>
      <div class="weather-preview-content">
        <div class="weather-preview-left">
          ${icon ? `<div class="weather-icon">${icon}</div>` : ''}
          <div class="weather-preview-city">${escapeHtml(city)}</div>
          <div class="weather-preview-temp">${escapeHtml(String(temperature))}°C</div>
        </div>
        <div class="weather-preview-details">
          <div class="weather-detail">Ветер: ${escapeHtml(String(wind))} м/с</div>
          <div class="weather-detail">Влажность: ${escapeHtml(String(humidity))}%</div>
          <div class="weather-detail">Вероятность осадков: ${escapeHtml(String(precipitation))}%</div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
