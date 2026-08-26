const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackAlbum = document.getElementById('track-album');
const albumImage = document.getElementById('album-image');
const defaultArt = document.getElementById('default-art');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');
const currentTimeEl =  document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const playPausBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumePercent = document.getElementById('volume-percent');
const uploadArea = document.getElementById('upload-area');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const clearBtn = document.getElementById('clear-btn');
const playListEl = document.getElementById('playlist');
const tracksCount = document.getElementById('tracks-count');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

const audio = new Audio();
let isPlaying = false;
let currentTrackIndex = -1;
let playlist = [];

let db;
const DB_NAME = 'MusicPlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'playlist'