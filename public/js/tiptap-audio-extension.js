// public/js/tiptap-audio-extension.js - TipTap extension for audio player
import { Node, mergeAttributes } from 'https://esm.sh/@tiptap/core@2.1.13';

export const AudioPlayer = Node.create({
  name: 'audioPlayer',

  group: 'block',

  atom: true,

  draggable: false,

  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      artist: {
        default: '',
      },
      track: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-audio-player]',
        getAttrs: (dom) => {
          // Extract attributes from HTML when loading existing content
          const audioUrl = dom.getAttribute('data-audio-url');
          const artistEl = dom.querySelector('.audio-artist');
          const trackEl = dom.querySelector('.audio-track');

          return {
            src: audioUrl,
            artist: artistEl ? artistEl.textContent : '',
            track: trackEl ? trackEl.textContent : '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, artist, track } = HTMLAttributes;

    // Create audio player HTML structure
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-audio-player': '',
        'data-audio-url': src,
        'class': 'audio-player',
      }),
      [
        'button',
        {
          class: 'audio-play-btn',
          title: 'Воспроизвести',
        },
        [
          'svg',
          {
            viewBox: '0 0 10 12',
            fill: 'none',
            class: 'play-icon',
          },
          [
            'path',
            {
              d: 'M0.5 0.492737V11.5077C0.501568 11.5956 0.526397 11.6815 0.571779 11.7567C0.617162 11.832 0.681744 11.894 0.758733 11.9364C0.835721 11.9788 0.922609 12.0001 1.01049 11.9983C1.09838 11.9964 1.18423 11.9714 1.25938 11.9258L10.2644 6.41826C10.3363 6.37479 10.3958 6.31343 10.4371 6.24017C10.4784 6.16692 10.5 6.08415 10.5 6.00015C10.5 5.91616 10.4784 5.83339 10.4371 5.76014C10.3958 5.68688 10.3363 5.62552 10.2644 5.58205L1.25938 0.0745248C1.18423 0.0289309 1.09838 0.00393112 1.01049 0.00208127C0.922609 0.000231421 0.835721 0.0215731 0.758733 0.0639786C0.681744 0.106384 0.617162 0.168341 0.571779 0.243595C0.526397 0.318849 0.501568 0.404787 0.5 0.492737Z',
              fill: '#FAF9F5',
            },
          ],
        ],
        [
          'svg',
          {
            viewBox: '0 0 8 12',
            fill: 'none',
            class: 'pause-icon',
            style: 'display: none;',
          },
          [
            'path',
            {
              d: 'M0.5 1C0.5 0.723858 0.723858 0.5 1 0.5H2.5C2.77614 0.5 3 0.723858 3 1V11C3 11.2761 2.77614 11.5 2.5 11.5H1C0.723858 11.5 0.5 11.2761 0.5 11V1Z M5 1C5 0.723858 5.22386 0.5 5.5 0.5H7C7.27614 0.5 7.5 0.723858 7.5 1V11C7.5 11.2761 7.27614 11.5 7 11.5H5.5C5.22386 11.5 5 11.2761 5 11V1Z',
              fill: '#FAF9F5',
            },
          ],
        ],
        [
          'div',
          {
            class: 'audio-equalizer',
          },
          ['div', { class: 'audio-equalizer-bar' }],
          ['div', { class: 'audio-equalizer-bar' }],
          ['div', { class: 'audio-equalizer-bar' }],
        ],
      ],
      [
        'div',
        { class: 'audio-info' },
        [
          'div',
          { class: 'audio-artist' },
          artist || '',
        ],
        [
          'div',
          { class: 'audio-track' },
          track || 'Аудио файл',
        ],
      ],
      [
        'div',
        { class: 'audio-time' },
        '00:00',
      ],
      [
        'div',
        { class: 'audio-progress-container' },
        [
          'div',
          { class: 'audio-progress-bar' },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setAudioPlayer: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
