# YouTube Integration Setup

## Установка yt-dlp на сервере

### 1. SSH на сервер
```bash
ssh root@hhrrr.ru
```

### 2. Установить yt-dlp
```bash
# Через pip (рекомендуется)
pip3 install yt-dlp

# ИЛИ через curl (если нет pip)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
```

### 3. Проверить установку
```bash
yt-dlp --version
```

### 4. Тест получения метаданных
```bash
yt-dlp --dump-json --no-warnings "https://www.youtube.com/watch?v=QjbmmMHXavs"
```

### 5. Тест получения stream URL
```bash
yt-dlp -f bestaudio --get-url "https://www.youtube.com/watch?v=QjbmmMHXavs"
```

## Проверка работы API

### Тест YouTube stream endpoint
```bash
curl "https://hhrrr.ru/pavilion/api/music/youtube-stream.php?v=QjbmmMHXavs"
```

Должен вернуть JSON с `streamUrl`.

## Как это работает

1. **Пользователь отправляет YouTube ссылку** (например: https://youtu.be/QjbmmMHXavs)

2. **YouTubePreviewService.php** парсит ссылку и извлекает:
   - Video ID
   - Метаданные (title, uploader, duration, thumbnail) через `yt-dlp --dump-json`
   - Создает metadata типа `'music'`

3. **Ссылка превращается в audio player** с audioUrl = `/api/music/youtube-stream.php?v=VIDEO_ID`

4. **При воспроизведении** `youtube-stream.php` использует `yt-dlp -f bestaudio --get-url` для получения прямой ссылки на аудио

5. **Аудио плеер** загружает и воспроизводит YouTube аудио через ваш плеер

## Поддерживаемые форматы ссылок

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/watch?v=VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`
- `https://youtube.com/v/VIDEO_ID`

## Обновление yt-dlp

YouTube периодически меняет API, поэтому yt-dlp нужно обновлять:

```bash
pip3 install --upgrade yt-dlp
```

Рекомендуется настроить автообновление через cron (раз в неделю).

## Troubleshooting

### Ошибка "command not found"
- Проверьте PATH: `which yt-dlp`
- Используйте полный путь в PHP: `/usr/local/bin/yt-dlp`

### Ошибка "Unable to extract"
- Обновите yt-dlp: `pip3 install --upgrade yt-dlp`
- Проверьте логи PHP: `tail -f /var/log/php-error.log`

### Медленная загрузка
- Это нормально для первого запроса (yt-dlp парсит YouTube)
- Stream URL кэшируется браузером на ~6 часов
