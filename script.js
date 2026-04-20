/* ── script.js ─── Custom Audio Player ──────────────────── */

(function () {
  'use strict';

  /* ── DOM Refs ─────────────────────────────────────────── */
  const audio       = document.getElementById('audio-element');
  const playBtn     = document.getElementById('play-btn');
  const pauseBtn    = document.getElementById('pause-btn');
  const rewindBtn   = document.getElementById('rewind-btn');
  const forwardBtn  = document.getElementById('forward-btn');
  const seekSlider  = document.getElementById('seek-slider');
  const volSlider   = document.getElementById('volume-slider');
  const muteBtn     = document.getElementById('mute-btn');
  const volIcon     = document.getElementById('volume-icon');
  const volLabel    = document.getElementById('vol-label');
  const currentTime = document.getElementById('current-time');
  const durationEl  = document.getElementById('duration');
  const statusDot   = document.getElementById('status-dot');
  const trackTitle  = document.getElementById('track-title');
  const barsContainer = document.getElementById('bars-container');

  /* ── State ────────────────────────────────────────────── */
  let isMuted    = false;
  let lastVolume = 0.8;
  let isSeeking  = false;

  /* ── Waveform Bars ────────────────────────────────────── */
  const BAR_COUNT = 48;
  const barEls = [];

  // Generate random heights once (decorative static waveform)
  const barHeights = Array.from({ length: BAR_COUNT }, () =>
    Math.random() * 0.65 + 0.18
  );

  function buildWaveform() {
    barsContainer.innerHTML = '';
    barHeights.forEach((h) => {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${h * 100}%`;
      barsContainer.appendChild(bar);
      barEls.push(bar);
    });
  }

  function updateWaveBars() {
    const pct = audio.duration
      ? audio.currentTime / audio.duration
      : 0;
    const activeBars = Math.floor(pct * BAR_COUNT);
    barEls.forEach((bar, i) => {
      bar.classList.toggle('active', i < activeBars);
    });
  }

  function setBarAnimations(playing) {
    barEls.forEach((bar, i) => {
      if (playing) {
        bar.style.animationDelay = `${(i % 7) * 0.07}s`;
        bar.classList.add('animated');
      } else {
        bar.classList.remove('animated');
      }
    });
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function formatTime(secs) {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setSeekFill(pct) {
    seekSlider.style.background =
      `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`;
  }

  function setVolFill(pct) {
    volSlider.style.background =
      `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`;
  }

  function updateVolIcon(vol) {
    const muted = isMuted || vol === 0;
    const svg = muted
      ? `<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"></polygon>
         <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
         <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
      : vol < 0.4
      ? `<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"></polygon>
         <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : `<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"></polygon>
         <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    volIcon.innerHTML = svg;
  }

  function setPlayingState(playing) {
    playBtn.classList.toggle('hidden', playing);
    pauseBtn.classList.toggle('hidden', !playing);
    statusDot.classList.toggle('playing', playing);
    setBarAnimations(playing);
  }

  /* ── Try to detect track name from src ───────────────── */
  function extractFileName(src) {
    if (!src) return 'No Track Loaded';
    try {
      const url = new URL(src, window.location.href);
      const name = url.pathname.split('/').pop();
      return name ? decodeURIComponent(name).replace(/\.[^.]+$/, '') : 'Unknown Track';
    } catch {
      return src.split('/').pop().replace(/\.[^.]+$/, '') || 'Unknown Track';
    }
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    buildWaveform();

    // Set initial volume
    audio.volume = lastVolume;
    setVolFill(lastVolume * 100);
    updateVolIcon(lastVolume);

    // Set track title
    trackTitle.textContent = extractFileName(audio.currentSrc || audio.src) || 'audio.mp3';
  }

  /* ── Play / Pause ─────────────────────────────────────── */
  playBtn.addEventListener('click', () => {
    audio.play().catch(() => {
      // If no file found, still toggle UI so it's visually interactive
      setPlayingState(true);
    });
  });

  pauseBtn.addEventListener('click', () => {
    audio.pause();
  });

  audio.addEventListener('play',  () => setPlayingState(true));
  audio.addEventListener('pause', () => setPlayingState(false));
  audio.addEventListener('ended', () => {
    setPlayingState(false);
    seekSlider.value = 0;
    setSeekFill(0);
    updateWaveBars();
  });

  /* ── Seek ─────────────────────────────────────────────── */
  seekSlider.addEventListener('input', () => {
    isSeeking = true;
    const pct = parseFloat(seekSlider.value);
    setSeekFill(pct);
    currentTime.textContent = formatTime((pct / 100) * (audio.duration || 0));
  });

  seekSlider.addEventListener('change', () => {
    const pct = parseFloat(seekSlider.value);
    if (audio.duration) {
      audio.currentTime = (pct / 100) * audio.duration;
    }
    isSeeking = false;
  });

  audio.addEventListener('timeupdate', () => {
    if (isSeeking || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekSlider.value = pct;
    setSeekFill(pct);
    currentTime.textContent = formatTime(audio.currentTime);
    updateWaveBars();
  });

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    trackTitle.textContent = extractFileName(audio.currentSrc || audio.src) || 'audio.mp3';
  });

  /* ── Rewind / Forward ─────────────────────────────────── */
  rewindBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });

  forwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
  });

  /* ── Volume ───────────────────────────────────────────── */
  volSlider.addEventListener('input', () => {
    const vol = parseFloat(volSlider.value);
    audio.volume = vol;
    lastVolume = vol > 0 ? vol : lastVolume;
    isMuted = vol === 0;
    muteBtn.classList.toggle('muted', isMuted);
    setVolFill(vol * 100);
    volLabel.textContent = `${Math.round(vol * 100)}%`;
    updateVolIcon(vol);
  });

  /* ── Mute toggle ──────────────────────────────────────── */
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    audio.muted = isMuted;
    muteBtn.classList.toggle('muted', isMuted);

    if (isMuted) {
      setVolFill(0);
      volSlider.value = 0;
      volLabel.textContent = '0%';
    } else {
      audio.volume = lastVolume;
      volSlider.value = lastVolume;
      setVolFill(lastVolume * 100);
      volLabel.textContent = `${Math.round(lastVolume * 100)}%`;
    }
    updateVolIcon(isMuted ? 0 : lastVolume);
  });

  /* ── Keyboard Shortcuts ───────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        audio.paused ? audio.play().catch(() => setPlayingState(true)) : audio.pause();
        break;
      case 'ArrowLeft':
        audio.currentTime = Math.max(0, audio.currentTime - 5);
        break;
      case 'ArrowRight':
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
        break;
      case 'ArrowUp':
        volSlider.value = Math.min(1, parseFloat(volSlider.value) + 0.05);
        volSlider.dispatchEvent(new Event('input'));
        break;
      case 'ArrowDown':
        volSlider.value = Math.max(0, parseFloat(volSlider.value) - 0.05);
        volSlider.dispatchEvent(new Event('input'));
        break;
      case 'KeyM':
        muteBtn.click();
        break;
    }
  });

  /* ── Run ──────────────────────────────────────────────── */
  init();
})();