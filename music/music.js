/**
 * 音乐播放器组件
 * 依赖: railTrackSystem (可选，用于车灯控制)
 */
export async function initMusicPlayer() {
    let audioFiles = [];
    
    try {
        const response = await fetch('../assets/audio/music.json');
        if (response.ok) {
            audioFiles = await response.json();
        }
    } catch (e) {
        console.error('Failed to load music list:', e);
        audioFiles = [
            { title: 'Call Me Tonight', artist: 'Unknown Artist', path: '../assets/audio/CallMe Tonight.mp3' }
        ];
    }
    
    if (audioFiles.length === 0) {
        audioFiles = [
            { title: 'No Music Found', artist: '-', path: '' }
        ];
    }
    
    let currentTrack = 0;
    let audio = null;
    let isPlaying = false;
    let audioContext = null;
    let analyser = null;
    let sourceNode = null;
    let animationId = null;
    
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const timeDisplay = document.getElementById('timeDisplay');
    const musicTitle = document.getElementById('musicTitle');
    const musicArtist = document.getElementById('musicArtist');
    const visualizerCanvas = document.getElementById('visualizer');
    const visualizerCtx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;
    
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 99;
            analyser.smoothingTimeConstant = 1;
        }
    }
    
    function connectAudioSource() {
        if (!audio || !audioContext || !analyser) return;
        
        try {
            sourceNode = audioContext.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(audioContext.destination);
            console.log('Audio source connected to analyser');
        } catch (e) {
            console.error('createMediaElementSource error:', e);
        }
    }
    
    function drawVisualizer() {
        if (!visualizerCtx || !analyser || !isPlaying) {
            if (visualizerCtx && visualizerCanvas) {
                visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
                drawIdleBars();
            }
            return;
        }
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        const canvasWidth = visualizerCanvas.width;
        const canvasHeight = visualizerCanvas.height;
        
        visualizerCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const barCount = 40;
        const barWidth = canvasWidth / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i + 1) * bufferLength / (barCount + 1));
            let value = dataArray[dataIndex];
            
            if (i >= barCount * 0.6) {
                const idx1 = Math.floor(bufferLength * 0.5 + (i - barCount * 0.6) * bufferLength * 0.5 / (barCount * 0.4));
                const idx2 = Math.floor(bufferLength * 0.75 + (i - barCount * 0.6) * bufferLength * 0.25 / (barCount * 0.4));
                value = Math.max(value, dataArray[idx1] * 2, dataArray[idx2] * 2.5);
            } else if (i >= barCount * 0.3) {
                value = value * 1.5;
            }
            
            let barHeight = (value / 255) * canvasHeight;
            barHeight = Math.max(barHeight, 2);
            barHeight = Math.min(barHeight, canvasHeight * 0.95);
            
            const x = i * barWidth;
            const y = canvasHeight - barHeight;
            
            visualizerCtx.fillStyle = '#667eea';
            visualizerCtx.fillRect(x, y, barWidth - 1, barHeight);
        }
        
        animationId = requestAnimationFrame(drawVisualizer);
    }
    
    function drawIdleBars() {
        if (!visualizerCtx || !visualizerCanvas) return;
        
        const canvasWidth = visualizerCanvas.width;
        const canvasHeight = visualizerCanvas.height;
        
        const barCount = 36;
        const barWidth = canvasWidth / barCount - 1;
        const barSpacing = 1;
        const idleHeight = 4;
        
        for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + barSpacing);
            const y = canvasHeight - idleHeight;
            
            visualizerCtx.fillStyle = 'rgba(102, 126, 234, 0.3)';
            visualizerCtx.fillRect(x, y, barWidth, idleHeight);
        }
    }
    
    function updateProgress() {
        if (!audio || isNaN(audio.duration)) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        updateTimeDisplay();
    }
    
    function updateDuration() {
        if (!audio || isNaN(audio.duration)) {
            timeDisplay.textContent = '0:00 / 0:00';
        } else {
            updateTimeDisplay();
        }
    }
    
    function updateTimeDisplay() {
        if (!audio || isNaN(audio.duration)) return;
        const current = formatTime(audio.currentTime);
        const duration = formatTime(audio.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
    }
    
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function onTrackEnded() {
        nextTrack();
    }
    
    function handleAudioError(e) {
        console.error('Audio error:', e);
    }
    
    function togglePlay() {
        initAudioContext();
        
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
        
        if (!audio) {
            const track = audioFiles[currentTrack];
            audio = new Audio(track.path);
            audio.loop = false;
            
            musicTitle.textContent = track.title;
            musicArtist.textContent = track.artist;
            
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('ended', onTrackEnded);
            audio.addEventListener('error', handleAudioError);
            
            if (!sourceNode) {
                connectAudioSource();
            }
        }
        
        if (audio.paused) {
            audio.play().then(() => {
                isPlaying = true;
                playBtn.textContent = '⏸';
                drawVisualizer();
            }).catch(e => {
                console.error('Play error:', e);
                playBtn.textContent = '▶';
                isPlaying = false;
            });
        } else {
            audio.pause();
            isPlaying = false;
            playBtn.textContent = '▶';
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            drawIdleBars();
        }
    }
    
    function prevTrack() {
        currentTrack = (currentTrack - 1 + audioFiles.length) % audioFiles.length;
        const track = audioFiles[currentTrack];
        
        if (audio) {
            audio.src = track.path;
            musicTitle.textContent = track.title;
            musicArtist.textContent = track.artist;
            
            if (isPlaying) {
                audio.play().catch(e => console.error('Play error:', e));
                drawVisualizer();
            }
        }
    }
    
    function nextTrack() {
        currentTrack = (currentTrack + 1) % audioFiles.length;
        const track = audioFiles[currentTrack];
        
        if (audio) {
            audio.src = track.path;
            musicTitle.textContent = track.title;
            musicArtist.textContent = track.artist;
            
            if (isPlaying) {
                audio.play().catch(e => console.error('Play error:', e));
                drawVisualizer();
            }
        }
    }
    
    function seekTo(e) {
        if (!audio || isNaN(audio.duration)) return;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    }
    
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);
    progressBar.addEventListener('click', seekTo);
    
    // 车灯控制按钮
    const headlightBtn = document.getElementById('headlightBtn');
    if (window.railTrackSystem && window.railTrackSystem.headlightOn) {
        headlightBtn.classList.add('active');
    }
    headlightBtn.addEventListener('click', () => {
        if (window.railTrackSystem) {
            window.railTrackSystem.toggleHeadlights();
            headlightBtn.classList.toggle('active');
        }
    });
    
    // 初始化可视化画布尺寸
    if (visualizerCanvas) {
        visualizerCanvas.width = 200;
        visualizerCanvas.height = 40;
        drawIdleBars();
    }
    
    window.musicPlayer = {
        play: togglePlay,
        pause: () => { if (audio && !audio.paused) { audio.pause(); isPlaying = false; playBtn.textContent = '▶'; if (animationId) cancelAnimationFrame(animationId); drawIdleBars(); } },
        next: nextTrack,
        prev: prevTrack,
        currentTrack: () => currentTrack,
        totalTracks: () => audioFiles.length
    };
}