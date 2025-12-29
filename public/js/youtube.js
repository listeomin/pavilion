// public/js/youtube.js

// Parse YouTube URL and extract video ID
export function parseYouTubeUrl(url) {
  // Support formats:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // youtube.com/watch?v=VIDEO_ID (without protocol)
  // www.youtube.com/watch?v=VIDEO_ID (without protocol)

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Render YouTube as music player (reuses existing music player)
export function renderYouTubePlayer(metadata) {
  if (!metadata || metadata.type !== 'youtube') {
    return '';
  }

  // YouTube metadata is converted to music metadata
  // and rendered by the existing music player
  return '';
}

export function isYouTubeUrl(url) {
  return /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/.test(url);
}
