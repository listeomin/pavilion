// public/js/audio-player.js

class AudioPlayerManager {
  constructor() {
    this.currentPlayer = null;
    this.players = new Map();
  }

  createPlayer(element, audioUrl, metadata, playBtn = null) {
    const player = new AudioPlayer(element, audioUrl, metadata, this, playBtn);
    this.players.set(element, player);
    return player;
  }

  pauseOthers(currentPlayer) {
    this.players.forEach(player => {
      if (player !== currentPlayer && player.isPlaying) {
        player.pause();
      }
    });
  }
}

class AudioPlayer {
  constructor(element, audioUrl, metadata, manager, playBtn = null) {
    this.element = element;
    this.audioUrl = audioUrl;
    this.metadata = metadata;
    this.manager = manager;
    
    console.log('AudioPlayer init:', { audioUrl, metadata });
    console.log('Full audio URL:', window.location.origin + '/' + audioUrl);
    
    this.audio = new Audio(audioUrl);
    this.audio.addEventListener('error', (e) => {
      console.error('Audio load error:', e);
      console.error('Attempted URL:', audioUrl);
      console.error('Audio error code:', this.audio.error?.code);
      console.error('Audio error message:', this.audio.error?.message);
    });
    this.isPlaying = false;
    
    this.playBtn = playBtn || element.querySelector('.audio-play-btn');
    this.progressBar = element.querySelector('.audio-progress-bar');
    this.progressContainer = element.querySelector('.audio-progress-container');
    this.timeDisplay = element.querySelector('.audio-time');
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.playBtn) return;
    
    // Play/Pause
    this.playBtn.addEventListener('click', () => this.togglePlay());
    
    // Progress bar click
    this.progressContainer.addEventListener('click', (e) => this.seek(e));
    
    // Audio events
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('loadedmetadata', () => this.onLoaded());
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    console.log('play() called');
    this.manager.pauseOthers(this);
    console.log('Attempting to play audio:', this.audio.src);
    console.log('Audio element:', this.audio);
    console.log('Audio duration:', this.audio.duration);
    console.log('Audio paused:', this.audio.paused);
    console.log('Audio muted:', this.audio.muted);
    console.log('Audio volume:', this.audio.volume);
    
    this.audio.play().then(() => {
      console.log('Audio started playing successfully');
      console.log('Current time:', this.audio.currentTime);
      console.log('Paused after play:', this.audio.paused);
      
      // Check after 3 seconds
      setTimeout(() => {
        console.log('=== 3 SECONDS CHECK ===');
        console.log('Still playing:', !this.audio.paused);
        console.log('Current time after 3s:', this.audio.currentTime);
        if (this.audio.currentTime > 2.5) {
          console.log('✅ SUCCESS! Audio is playing!');
        } else {
          console.log('❌ FAIL! Audio not progressing');
        }
      }, 3000);
    }).catch(err => {
      console.error('Play failed:', err);
    });
    this.isPlaying = true;
    this.playBtn.classList.add('playing');
    
    const playIcon = this.playBtn.querySelector('.play-icon');
    const pauseIcon = this.playBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.playBtn.classList.remove('playing');
    
    const playIcon = this.playBtn.querySelector('.play-icon');
    const pauseIcon = this.playBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
  }

  seek(e) {
    const rect = this.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = percent * this.audio.duration;
  }

  updateProgress() {
    const percent = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressBar.style.width = percent + '%';
    this.updateTime();
  }

  updateTime() {
    const current = this.formatTime(this.audio.currentTime);
    const duration = this.formatTime(this.audio.duration);
    this.timeDisplay.textContent = `${current}`;
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  onLoaded() {
    this.updateTime();
  }

  onEnded() {
    this.isPlaying = false;
    this.playBtn.classList.remove('playing');
    this.audio.currentTime = 0;
    this.updateProgress();
  }
}

export const audioPlayerManager = new AudioPlayerManager();

export function initAudioPlayer(element, audioUrl, metadata, playBtn = null) {
  return audioPlayerManager.createPlayer(element, audioUrl, metadata, playBtn);
}
