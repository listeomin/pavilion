// Map track to audio file via API
export async function getAudioUrl(artist, track) {
  if (!artist || !track) return null;
  
  try {
    const response = await fetch(
      `/api/music/get-stream?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.streamUrl || null;
  } catch (error) {
    console.error('Failed to get audio URL:', error);
    return null;
  }
}