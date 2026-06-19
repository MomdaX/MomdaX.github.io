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
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
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

        // 对称波形绘制（参考代码方案）
        const len = Math.floor(bufferLength / 2.5); // 剔除高频部分
        const barWidth = canvasWidth / len / 2; // 左右对称

        for (let i = 0; i < len; i++) {
            const data = dataArray[i];
            const barHeight = (data / 255) * canvasHeight;
            const y = canvasHeight - barHeight;

            // 右半部分
            const x1 = i * barWidth + canvasWidth / 2;
            visualizerCtx.fillStyle = '#667eea';
            visualizerCtx.fillRect(x1, y, barWidth - 1, barHeight);

            // 左半部分（镜像）
            const x2 = canvasWidth / 2 - (i + 1) * barWidth;
            visualizerCtx.fillRect(x2, y, barWidth - 1, barHeight);
        }

        animationId = requestAnimationFrame(drawVisualizer);
    }
    
    function drawIdleBars() {
        if (!visualizerCtx || !visualizerCanvas) return;

        const canvasWidth = visualizerCanvas.width;
        const canvasHeight = visualizerCanvas.height;

        visualizerCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 对称 idle 条
        const barCount = 36;
        const halfCount = Math.floor(barCount / 2);
        const barWidth = canvasWidth / barCount;
        const idleHeight = 4;

        for (let i = 0; i < halfCount; i++) {
            const x = i * barWidth;
            const y = canvasHeight - idleHeight;

            // 右半部分
            visualizerCtx.fillStyle = 'rgba(102, 126, 234, 0.3)';
            visualizerCtx.fillRect(canvasWidth / 2 + x, y, barWidth - 1, idleHeight);

            // 左半部分（镜像）
            visualizerCtx.fillRect(canvasWidth / 2 - x - barWidth, y, barWidth - 1, idleHeight);
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
    
    // 从 settings 恢复按钮状态（优先使用新设置系统）
    try {
        const savedSettings = JSON.parse(localStorage.getItem('trainSettings') || '{}');
        if (savedSettings.headlight !== undefined) {
            headlightBtn.classList.toggle('active', savedSettings.headlight !== false);
        } else {
            // 兼容旧的 trainState
            const savedState = JSON.parse(localStorage.getItem('trainState') || 'null');
            if (savedState) {
                headlightBtn.classList.toggle('active', savedState.headlightOn !== false);
            } else {
                headlightBtn.classList.add('active');
            }
        }
    } catch (e) {
        headlightBtn.classList.add('active');
    }
    
    headlightBtn.addEventListener('click', () => {
        if (window.railTrackSystem) {
            const newState = !window.railTrackSystem.headlightOn;
            window.railTrackSystem.setHeadlightOn(newState);
            headlightBtn.classList.toggle('active', newState);
        }
    });
    

    // 初始化可视化画布尺寸
    if (visualizerCanvas) {
        visualizerCanvas.width = 120;
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