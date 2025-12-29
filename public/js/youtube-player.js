// public/js/youtube-player.js
// YouTube IFrame Player API wrapper

class YouTubePlayerManager {
  constructor() {
    this.currentPlayer = null;
    this.players = new Map();
    this.apiReady = false;
    this.apiLoading = false;
    this.apiLoadCallbacks = [];

    // Load YouTube IFrame API
    this.loadAPI();
  }

  loadAPI() {
    // Check if API is already loaded or loading
    if (window.YT && window.YT.Player) {
      this.apiReady = true;
      return;
    }

    if (this.apiLoading || this.apiReady) return;
    this.apiLoading = true;

    // Load IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // API will call this when ready
    // Only set if not already set
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        this.apiReady = true;
        this.apiLoading = false;
        console.log('[YouTube] IFrame API ready');

        // Execute callbacks
        this.apiLoadCallbacks.forEach(cb => cb());
        this.apiLoadCallbacks = [];
      };
    }
  }

  whenReady(callback) {
    if (this.apiReady) {
      callback();
    } else {
      this.apiLoadCallbacks.push(callback);
    }
  }

  createPlayer(element, videoId, metadata, playBtn = null) {
    this.whenReady(() => {
      const player = new YouTubePlayer(element, videoId, metadata, this, playBtn);
      this.players.set(element, player);
    });
  }

  pauseOthers(currentPlayer) {
    this.players.forEach(player => {
      if (player !== currentPlayer && player.isPlaying) {
        player.pause();
      }
    });
  }
}

class YouTubePlayer {
  constructor(element, videoId, metadata, manager, playBtn = null) {
    this.element = element;
    this.videoId = videoId;
    this.metadata = metadata;
    this.manager = manager;
    this.isPlaying = false;
    this.player = null;
    this.updateInterval = null;

    this.playBtn = playBtn || element.querySelector('.audio-play-btn');
    this.progressBar = element.querySelector('.audio-progress-bar');
    this.progressContainer = element.querySelector('.audio-progress-container');
    this.timeDisplay = element.querySelector('.audio-time');

    this.init();
  }

  init() {
    // Create hidden container for YouTube iframe
    const playerContainer = document.createElement('div');
    playerContainer.id = 'yt-player-' + this.videoId;
    playerContainer.style.display = 'none';
    document.body.appendChild(playerContainer);

    // Create YouTube player
    this.player = new YT.Player(playerContainer.id, {
      height: '1',
      width: '1',
      videoId: this.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: (e) => this.onPlayerReady(e),
        onStateChange: (e) => this.onPlayerStateChange(e)
      }
    });

    this.setupEventListeners();
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
  }

  onPlayerReady(event) {
    console.log('[YouTube] Player ready for:', this.videoId);
    // Fetch and update track title
    this.updateTitle();
  }

  onPlayerStateChange(event) {
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.playBtn.classList.add('playing');
      this.element.classList.add('playing');
      this.startProgressUpdates();
    } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
      this.isPlaying = false;
      this.playBtn.classList.remove('playing');
      this.element.classList.remove('playing');
      this.stopProgressUpdates();

      if (state === YT.PlayerState.ENDED) {
        this.onEnded();
      }
    }
  }

  updateTitle() {
    // Get video title from YouTube player
    if (this.player && this.player.getVideoData) {
      const videoData = this.player.getVideoData();
      if (videoData && videoData.title) {
        const artistEl = this.element.querySelector('.audio-artist');
        const trackEl = this.element.querySelector('.audio-track');

        if (trackEl) {
          trackEl.textContent = videoData.title;
        }

        if (videoData.author && artistEl) {
          artistEl.textContent = videoData.author;
        }
      }
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (!this.player || !this.player.playVideo) return;
    this.manager.pauseOthers(this);
    this.player.playVideo();
  }

  pause() {
    if (!this.player || !this.player.pauseVideo) return;
    this.player.pauseVideo();
  }

  seek(e) {
    if (!this.player || !this.player.getDuration) return;
    const duration = this.player.getDuration();
    if (!duration) return;

    const rect = this.progressContainer.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;

    if (!isNaN(newTime) && this.player.seekTo) {
      this.player.seekTo(newTime, true);
    }
  }

  startProgressUpdates() {
    this.stopProgressUpdates();
    this.updateInterval = setInterval(() => this.updateProgress(), 100);
  }

  stopProgressUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  updateProgress() {
    if (!this.player || !this.player.getCurrentTime || !this.player.getDuration) return;

    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();

    if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      this.progressBar.style.width = percent + '%';
      this.updateTime(currentTime, duration);
    }
  }

  updateTime(currentTime, duration) {
    const remaining = duration - currentTime;
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

  onEnded() {
    this.isPlaying = false;
    this.playBtn.classList.remove('playing');
    if (this.player && this.player.seekTo) {
      this.player.seekTo(0);
    }
    this.updateProgress();
  }
}

export const youtubePlayerManager = new YouTubePlayerManager();

export function initYouTubePlayer(element, videoId, metadata, playBtn = null) {
  youtubePlayerManager.createPlayer(element, videoId, metadata, playBtn);
}
