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

    // Lazy loading: Audio is NOT created until user clicks play
    this.audio = null;
    this.isPlaying = false;
    this.isLoading = false;

    this.playBtn = playBtn || element.querySelector('.audio-play-btn');
    this.progressBar = element.querySelector('.audio-progress-bar');
    this.progressContainer = element.querySelector('.audio-progress-container');
    this.timeDisplay = element.querySelector('.audio-time');

    this.setupEventListeners();
  }

  // Create Audio element only when needed (lazy loading)
  ensureAudio() {
    if (!this.audio && this.audioUrl) {
      this.audio = new Audio();
      this.audio.preload = 'none'; // Don't preload anything
      this.audio.src = this.audioUrl;

      // Setup audio events
      this.audio.addEventListener('timeupdate', () => this.updateProgress());
      this.audio.addEventListener('ended', () => this.onEnded());
      this.audio.addEventListener('loadedmetadata', () => this.onLoaded());
      this.audio.addEventListener('canplay', () => {
        this.isLoading = false;
        this.playBtn.classList.remove('loading');
      });
      this.audio.addEventListener('error', (e) => {
        console.error('[AudioPlayer] Error loading audio:', e);
        this.isLoading = false;
        this.playBtn.classList.remove('loading');
      });
    }
    return this.audio;
  }

  setupEventListeners() {
    if (!this.playBtn) return;

    // Play/Pause
    this.playBtn.addEventListener('click', () => this.togglePlay());

    // Progress bar drag/click
    let isDragging = false;

    this.progressContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      this.seek(e);
    });

    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        this.seek(e);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Audio events are now set up in ensureAudio()
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.manager.pauseOthers(this);

    // Lazy load audio on first play
    const audio = this.ensureAudio();
    if (!audio) return;

    // Show loading state on first play
    if (audio.readyState < 3) {
      this.isLoading = true;
      this.playBtn.classList.add('loading');
    }

    audio.play().catch(e => {
      console.error('[AudioPlayer] Play failed:', e);
      this.isLoading = false;
      this.playBtn.classList.remove('loading');
    });

    this.isPlaying = true;
    this.playBtn.classList.add('playing');
    this.element.classList.add('playing');
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.playBtn.classList.remove('playing');
    this.element.classList.remove('playing');
  }

  seek(e) {
    if (!this.audio || !this.audio.duration) return;
    const rect = this.progressContainer.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * this.audio.duration;
    if (!isNaN(newTime)) {
      this.audio.currentTime = newTime;
    }
  }

  updateProgress() {
    if (!this.audio) return;
    const percent = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressBar.style.width = percent + '%';
    this.updateTime();
  }

  updateTime() {
    if (!this.audio) return;
    const remaining = this.audio.duration - this.audio.currentTime;
    const time = this.formatTime(remaining);
    const prefix = this.isPlaying ? '-' : '';
    this.timeDisplay.textContent = `${prefix}${time}`;
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
    this.element.classList.remove('playing');
    if (this.audio) {
      this.audio.currentTime = 0;
    }
    this.updateProgress();
  }
}

export const audioPlayerManager = new AudioPlayerManager();

export function initAudioPlayer(element, audioUrl, metadata, playBtn = null) {
  return audioPlayerManager.createPlayer(element, audioUrl, metadata, playBtn);
}
