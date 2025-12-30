// public/js/weather-preview.js
export function renderWeatherPreview(metadata) {
  if (!metadata || metadata.type !== 'weather') {
    return '';
  }

  const { city, temperature, wind, humidity, precipitation } = metadata;

  return `
    <div class="weather-preview-card">
      <div class="weather-preview-badge">ПОГОДА</div>
      <div class="weather-preview-content">
        <div class="weather-preview-city">${escapeHtml(city)}</div>
        <div class="weather-preview-data">
          <div class="weather-preview-temp">${escapeHtml(String(temperature))}°C</div>
          <div class="weather-preview-details">
            <div class="weather-detail">
              <span class="weather-label">Ветер:</span>
              <span class="weather-value">${escapeHtml(String(wind))} м/с</span>
            </div>
            <div class="weather-detail">
              <span class="weather-label">Влажность:</span>
              <span class="weather-value">${escapeHtml(String(humidity))}%</span>
            </div>
            <div class="weather-detail">
              <span class="weather-label">Вероятность осадков:</span>
              <span class="weather-value">${escapeHtml(String(precipitation))}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
