console.log("Let's start the script!");

// Global variables
let currentFolder = null; // Track current folder
let songs = []; // Array to hold song names
let audio = new Audio(); // Global audio player
let currentSongIndex = 0;

// Function to fetch song names from directory listing
async function getSongs(folder) {
    if (!folder) {
        throw new Error("Folder name is undefined");
    }

    const encodedFolder = encodeURIComponent(folder);
    const response = await fetch(`/songs/${encodedFolder}/`);

    if (!response.ok) {
        throw new Error(`Failed to fetch songs from ${folder}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href$=".mp3"]');

    return Array.from(links).map(link => {
        const url = new URL(link.href);
        return url.pathname.split('/').pop();
    });
}

// Global playSong function
function playSong(index) {
    if (!audio || index < 0 || index >= songs.length) return;

    currentSongIndex = index;
    const song = songs[index];
    const readableName = decodeURIComponent(song)
        .replace(/\.mp3$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    audio.src = `./songs/${currentFolder}/${song}`;
    audio.play();
    const play = document.getElementById('play');
    if (play) play.src = "assets/pause1.png";
    const info = document.querySelector("#songinfo");
    if (info) info.innerHTML = readableName;
}

async function displayAlbums() {
    // console.log("Displaying albums...");
    let a = await fetch(`/songs/`);
    let response = await a.text();
    let div = document.createElement('div');
    div.innerHTML = response;
    let anchors = div.getElementsByTagName('a');
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";

    // Create array of valid song folders
    let folders = Array.from(anchors)
        .filter(e => e.href.includes("/songs/") && !e.href.endsWith('/songs/'))
        .map(e => {
            let url = new URL(e.href);
            return url.pathname.split('/').filter(part => part)[1];
        })
        .filter(folder => folder && folder !== '.' && folder !== '..');

    for (const folder of folders) {
        try {
            let res = await fetch(`/songs/${folder}/info.json`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            let info = await res.json();
            // console.log("Folder:", folder, "Info:", info); // To debug folder loading

            cardContainer.innerHTML += `<div class="card bg-[#181818] hover:bg-[#282828] rounded-[6px] p-4 w-[180px]" data-folder="${folder}">
                <div class="relative mb-4 z-0">
                    <div class="flex items-center justify-center cursor-pointer absolute h-[48px] w-[48px] bg-green-500 rounded-full mb-2 right-[15px] bottom-[128px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <img class="h-[18px] w-auto ml-0.5" src="assets/play-button.png" alt="Play">
                    </div>
                    <img class="h-auto w-full cursor-pointer rounded-[6px]" src="songs/${folder}/cover.png" alt="${info.title}">
                </div>
                <div class="items-start w-full">
                    <span class="text-[16px] font-bold cursor-pointer hover:underline">${info.title}</span>
                    <span class="text-[13px] text-[#b3b3b3] cursor-pointer hover:underline">${info.description}</span>
                </div>
            </div>`;
        } catch (error) {
            console.error(`Error loading ${folder}:`, error);
        }
    }

    // Add event listeners
    cardContainer.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async function () {
            const folder = this.dataset.folder;
            if (!folder) {
                console.error("Folder name is missing in card dataset");
                return;
            }

            console.log("Fetching songs for:", folder);
            try {
                // Set current folder and load songs
                currentFolder = folder;
                songs = await getSongs(folder);
                console.log("Loaded songs:", songs);

                // Update UI with new songs
                populateSongList();

                // Preload first song
                if (songs.length > 0) {
                    audio.src = `./songs/${currentFolder}/${songs[0]}`;
                }
            } catch (error) {
                console.error("Error fetching songs:", error);
            }
        });
    });
}

// Function to populate song list in UI
function populateSongList() {
    const songUL = document.querySelector('#songslist ul');
    if (!songUL) {
        console.error("songslist <ul> not found in DOM");
        return;
    }

    songUL.innerHTML = '';

    songs.forEach((song, index) => {
        const readableName = decodeURIComponent(song)
            .replace(/\.mp3$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

        const li = document.createElement('li');
        li.className = "flex gap-3 items-center justify-between text-white text-[12px] py-1 px-3 border-2 border-white rounded-[10px] my-3 hover:text-gray-300 cursor-pointer";
        li.innerHTML = `
            <div class="flex items-center gap-3 ">
                <img class="h-[15px]" src="assets/music-player.png" alt="">
                <div class="flex flex-col">
                    <span class=" font-semibold ">${readableName}</span>
                    <span class=" text-xs ">Artist</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span>Play Now</span>
                <img class="h-[14px]" src="assets/small-play-button.png" alt="">
            </div>
        `;
        li.addEventListener('click', () => playSong(index));
        songUL.appendChild(li);
    });
}

function setupVolumeControls(audioElement) {
    const volBtn = document.getElementById('volBtn');
    const volumeSlider = document.getElementById('volume');

    if (!volBtn || !volumeSlider || !audioElement) {
        console.error('Volume controls or audio element not found');
        return;
    }

    // Set initial volume
    audioElement.volume = volumeSlider.value;

    // Volume slider event
    volumeSlider.addEventListener('input', () => {
        const volume = parseFloat(volumeSlider.value);
        audioElement.volume = volume;

        // Update button icon based on volume level
        if (volume === 0) {
            volBtn.src = "assets/Mutebutton.png";
        } else {
            volBtn.src = "assets/volume-up.png";
        }
    });

    // Mute button event
    volBtn.addEventListener('click', () => {
        if (audioElement.volume > 0) {
            // Store previous volume before muting
            volBtn.dataset.previousVolume = audioElement.volume;
            audioElement.volume = 0;
            volumeSlider.value = 0;
            volBtn.src = "assets/Mutebutton.png";
        } else {
            // Restore to previous volume or default to 1 if none
            const previousVolume = parseFloat(volBtn.dataset.previousVolume) || 1;
            audioElement.volume = previousVolume;
            volumeSlider.value = previousVolume;
            volBtn.src = "assets/volume-up.png";
        }

        // Update slider background
        updateSliderBackground(volumeSlider);
    });

    // Function to update slider gradient
    function updateSliderBackground(slider) {
        const value = slider.value;
        slider.style.background = `linear-gradient(to right, gray ${value * 100}%, white ${value * 100}%)`;
    }

    // Initialize slider background
    updateSliderBackground(volumeSlider);
}

// Player control functions
function setupPlayerControls() {
    const slider = document.querySelector('input.slider');
    const play = document.getElementById('play');
    const nextBtn = document.getElementById('next');
    const prevBtn = document.getElementById('prev');
    const volumeSlider = document.getElementById('volume');
    const shuffleBtn = document.getElementById('shuffle');
    const volBtn = document.getElementById("volBtn");

    let isShuffle = false;

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // Function to toggle play/pause
    function togglePlayPause() {
        if (!audio) return;
        if (audio.paused) {
            audio.play();
            if (play) play.src = "assets/pause1.png";
        } else {
            audio.pause();
            if (play) play.src = "assets/play-button.png";
        }
    }

    // Spacebar control
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            togglePlayPause();
        }
    });

    // Play/pause button
    if (play) {
        play.addEventListener('click', togglePlayPause);
    }

    // Update progress bar and time
    if (slider) {
        function updateSliderBackground(sliderEl) {
            if (!sliderEl) return;
            const val = (sliderEl.value - sliderEl.min) / (sliderEl.max - sliderEl.min) * 100;
            sliderEl.style.background = `linear-gradient(to right, gray ${val}%, white ${val}%)`;
        }

        slider.addEventListener('input', function () {
            updateSliderBackground(this);
            if (!isNaN(audio.duration)) {
                audio.currentTime = (this.value / 100) * audio.duration;
            }
        });
        updateSliderBackground(slider);
    }

    audio.addEventListener('timeupdate', () => {
        if (slider && !isNaN(audio.duration)) {
            slider.value = (audio.currentTime / audio.duration) * 100;
        }
        const timeDisplay = document.querySelector("#songtime");
        if (timeDisplay) {
            timeDisplay.innerHTML = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
    });

    // Next/Previous buttons
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            let nextIndex = (currentSongIndex + 1) % songs.length;
            playSong(nextIndex);
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            let prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            playSong(prevIndex);
        });
    }

    // Auto-play next
    audio.addEventListener('ended', () => {
        let nextIndex = (currentSongIndex + 1) % songs.length;
        playSong(nextIndex);
    });

    // Volume control
    if (volumeSlider) {
        audio.volume = 1;
        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value;
        });
    }

    // Shuffle toggle
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('bg-white');
            shuffleBtn.classList.toggle('text-black');
            shuffleBtn.textContent = isShuffle ? '🔀 Shuffle ON' : '🔀 Shuffle';
        });
    }

    // Volume Control
    if (volBtn) {
        volBtn.addEventListener('click', () => {
            if (!volumeSlider) return;
            if (volumeSlider.value == 0) {
                volumeSlider.value = 1;
                audio.volume = 1;
                volBtn.src = "assets/volume-up.png";
            } else {
                volumeSlider.value = 0;
                audio.volume = 0;
                volBtn.src = "assets/Mutebutton.png";
            }
        });
    }
}

// Main function
async function main() {
    try {
        // Initialize player controls
        setupPlayerControls();

        // Display albums without loading songs initially
        await displayAlbums();
    } catch (error) {
        console.error("Error in main function:", error);
    }

    try {
        const audio = new Audio();

        // Setup volume controls
        setupVolumeControls(audio);

        // Rest of your existing code...
    } catch (error) {
        console.error("Error in main function:", error);
    }

    
}

function toggleSidebar() {
    const sidebar = document.getElementById('LEFT');
    const backdrop = document.getElementById('backdrop');

    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

// Close sidebar when clicking outside on mobile
document.querySelector('#menu-icon').addEventListener('click', (e) => {
    document.querySelector('#LEFT').style.left = '0';
    document.querySelector('#backdrop').classList.remove('hidden');
    if (LEFT.classList.contains('left-0')){
        document.querySelector('#menu-icon').classList.add('hidden');9
    }
    
});


// Run after DOM is loaded
document.addEventListener("DOMContentLoaded", main); 