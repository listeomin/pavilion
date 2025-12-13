// Map track to audio file
export function getAudioUrl(artist, track) {
  const mapping = {
    'Asadov': {
      'Nostalvibe': 'assets/Asadov - Nostalvibe.mp3'
    },
    'Costa Mee': {
      'Around This World': 'assets/Costa Mee - Around This World.mp3'
    },
    'Pete Bellis Tommy Marc Philippe': {
      'Do You Wanna Know Marc Phil': 'assets/Pete Bellis Tommy Marc Philippe - Do You Wanna Know Marc Phil.mp3'
    }
  };
  
  return mapping[artist]?.[track] || null;
}
