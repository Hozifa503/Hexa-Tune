const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackAlbum = document.getElementById('track-album');
const albumImage = document.getElementById('album-image');
const defaultArt = document.getElementById('default-art');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
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
const STORE_NAME = 'playlist';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDb initalized successfully');
            resolve();
        };

        request.onupgradeneed = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log('Object store created');
            }
        };
    });
}

async function savePlaylist() {
    if (!db) return;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        store.clear();

        playlist.forEach((track, index) => {
            if (track.thumbnail && track.thumbnail.startsWith('blob:')) {
                delete track.thumbnail;
            }
            store.put(track);
        });

        transaction.oncomplete = () => {
            console.log('Playlist saved to IndexDB');
            showNotification('Playlist saved successfully!');
            resolve();
        }

        transaction.onerror = (event) => {
            console.error('Error Saving Playlist', event.target.error);
            reject(event.target.error);
        };
    });
}

async function loadPlaylist() {
    if (!db) return [];

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const savedPlaylist = event.target.result;
            console.log(`Loaded ${savedPlaylist.length} tracks from IndexedDB`);
            resolve(savePlaylist);
        };

        request.onerror = (event) => {
            console.error('Error loading playlist:', event.target.error);
            reject(event.target.error);
        };
    });

}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

async function initPlayer() {
    try {
        await initDB();

        const savedPlaylist = await loadPlaylist();

        if (savedPlaylist && savePlaylist.length > 0) {
            playlist = savedPlaylist;

            playlist.forEach(track => {
                if (track.src && track.src.startsWith('data')) {
                    const blob = dataURLtoBlob(track.src);
                    track.src = URL.createObjectURL(blob);
                }
            });
            renderPlaylist();

            if (playlist.length > 0) {
                loadTrack(0);
            }
        }
        showNotification('Playlist loaded from storage!')
    } catch (error) {
        console.error('Error initializing player:', error);
        showNotification('Error loading saved playlist');
    }

    audio.volume = 0.7;
    updateVolumeUI();
}

function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

function renderPlaylist() {
    playListEl.innerHTML = '';

    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = index === currentTrackIndex ? 'active' : '';

        const thumbnailSrc = track.thumbnail || 'images/default.jpg';

        li.innerHTML = `
                    <img class="track-thumbnail" src="${thumbnailSrc}" alt="${track.title}">
                    <div class="track-details">
                        <div class="playlist-title">${track.title}</div>
                        <div class="playlist-artist">${track.artist || 'Unknown Artist'}</div>
                        ${track.album ? `<div class="playlist-album">${track.album}</div>` : ''}
                    </div>
                    <div class="track-duration">${track.duration || '0:00'}</div>
                    <button class="delete-btn" data-index="${index}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    `;

        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('fa-trash')) {


                loadTrack(index);
                playTrack();

            }
        });

        playListEl.appendChild(li);
    });

    tracksCount.textContent = playlist.length;

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            deleteTrack(index);
        });
    });
}

async function extractMetadata(file, track) {
    return new Promise((resolve) => {
        const tempAudio = new Audio();
        const objectURL = URL.createObjectURL(file);
        tempAudio.src = objectURL;

        tempAudio.addEventListener('loadedmetadata', () => {
            track.duration = formatTime(tempAudio.duration);

            const render = new FileReader();

            render.onload = function (e) {
                try {
                    const arrayBuffer = e.target.result;

                    const dataView = new DataView(arrayBuffer);

                    const fileName = file.name.replace(/\.[^/.]+$/, "");
                    const dashIndex = fileName.indexOf(' - ');
                    const underscoreIndex = fileName.indexOf('_');
                    const separatorIndex = dashIndex !== -1 ? dashIndex : underscoreIndex;

                    if (separatorIndex !== -1) {
                        track.artist = fileName.substring(0, separatorIndex).trim();
                        track.title = fileName.substring(separatorIndex + 3).trim();
                    } else {
                        track.title = fileName;
                    }

                    if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
                        extractAlbumArtFromMP3(arrayBuffer, track);
                    }

                    resolve(track);
                } catch (error) {
                    console.error('Error extracting metadata:', error);
                    resolve(track);
                }
            };

            render.readAsArrayBuffer(file.slice(0, 1024 * 1024));

            setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
        });

        tempAudio.onerror = () => {
            console.error('Error loading audio file for metadata extraction');
            resolve(track);
        };
    });

}

function extractAlbumArtFromMP3(arrayBuffer, track) {
    try {
        const dataView = new DataView(arrayBuffer);

        if (dataView.getUint32(0) === 0x49443300) {
            const id3Size = syncsafeToInt(dataView.getUint32(6));

            let offset = 10;

            while (offset < id3Size + 10) {
                const frameId = String.fromCharCode(
                    dataView.getUint8(offset),
                    dataView.getUint8(offset + 1),
                    dataView.getUint8(offset + 2),
                    dataView.getUint8(offset + 3)
                );

                const frameSize = dataView.getUint32(offset + 4);

                if (frameId === "APIC") {
                    let pictureOffset = offset + 10;

                    pictureOffset += 1;

                    while (dataView.getUint8(pictureOffset) !== 0 && pictureOffset < offset + frameSize + 10) {
                        pictureOffset += 1;
                    }
                    pictureOffset += 1;

                    while (dataView.getUint8(pictureOffset) !== 0 && pictureOffset < offset + frameSize + 10) {
                        pictureOffset += 1;
                    }
                    pictureOffset += 1;

                    const pictureSize = frameSize - (pictureOffset - offset - 10);

                    if (pictureSize > 0) {
                        const pictureData = arrayBuffer.slice(pictureOffset, pictureOffset + pictureSize);
                        const blob = new Blob([pictureData], { type: 'image/jpeg' });
                        track.thumbnail = URL.createObjectURL(blob);
                        break;
                    }
                }

                offset += 10 + frameSize;
            }
        }
    } catch (error) {
        console.error('Error extracting album art:', error);
    }
}

function syncsafeToInt(syncsafe) {
    let result = 0;
    result = (syncsafe & 0x7F000000) >> 0;
    result += (syncsafe & 0x007F0000) >> 1;
    result += (syncsafe & 0x00007F00) >> 2;
    result += (syncsafe & 0x0000007F) >> 3;
    return result
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    const track = playlist[index];
    currentTrackIndex = index;

    audio.src = track.src;

    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || 'Unknown Artist';
    trackAlbum.textContent = track.album || '';

    if (track.thumbnail) {
        albumImage.src = track.thumbnail;
        albumImage.classList.add('active');
        defaultArt.style.display = 'none';
    } else {
        albumImage.src = 'images/default.thumb.jpg'
        albumImage.classList.add('active');
        defaultArt.style.display = 'none';
    }

    progress.style.width = '0%';
    currentTimeEl.textContent = '0:00';

    renderPlaylist();

    audio.addEventListener('loadeddata', () => {
        if(!playlist[index].duration || playlist[index].duration === '0:00') {
            playlist[index].duration = formatTime(audio.duration);
        }
        durationEl.textContent = formatTime(audio.duration);
    }, {once: true});
}

async function handleFiles(files) {
    if (files.length === 0) return;

    showNotification(`Processing ${files.length} file(s)...`);

    for(let i = 0; i < files.length; i++) {
        const file = files[i];

        if(!file.type.startsWith('audio/')) {
            console.log(`"${file.name}" is not valid audio file. Skipping.`);
            continue;
        }

        const objectUrl = URL.createObjectURL(file);

        const newTrack = {
            id: Date.now() + i + Math.random(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            src: objectUrl,
            fileName: file.name,
            fileType: file.type,
            duration: '0:00'
        };
        
        await extractMetadata(file, newTrack);

        playlist.push(newTrack);
    }

    renderPlaylist();
    await savePlaylist();

    if(currentTrackIndex === -1 && playlist.length > 0) { 
        loadTrack(0);
    }

    showNotification(`Added ${files.length} track(s) to your playlist!`);
}