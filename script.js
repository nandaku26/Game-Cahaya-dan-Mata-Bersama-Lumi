/**
 * PETUALANGAN CAHAYA & MATA BERSAMA LUMI
 * Game Edukasi IPAS Kelas 5 SD (Live Multi-Device Leaderboard + Reset 4 Jam)
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 0. KONFIGURASI FIREBASE REALTIME DATABASE
  // =========================================================================
  const firebaseConfig = {
    apiKey: "AIzaSyAglAG3kGX_wOTR099rWERfuBYLpXzfg20",
    authDomain: "game-ipas-lumi.firebaseapp.com",
    databaseURL: "https://game-ipas-lumi-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "game-ipas-lumi",
    storageBucket: "game-ipas-lumi.firebasestorage.app",
    messagingSenderId: "760746029292",
    appId: "1:760746029292:web:f8c2f96b85f906b7c775c9",
    measurementId: "G-D18SZHRS56"
  };

  let liveDb = null;
  let isActuallyConnected = false;
  let firebaseErrorMsg = '';

  const isFirebaseConfigured =
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "ISI_API_KEY_KAMU" &&
    typeof firebase !== 'undefined';

  if (isFirebaseConfigured) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      liveDb = firebase.database();

      // Memantau status koneksi asli ke server Firebase
      liveDb.ref('.info/connected').on('value', (snap) => {
        isActuallyConnected = snap.val() === true;
        updateLeaderboardResetBadge();
      });
    } catch (err) {
      firebaseErrorMsg = err.message || 'Gagal inisialisasi Firebase';
      console.error("Gagal menghubungkan ke Firebase:", err);
    }
  } else {
    firebaseErrorMsg = 'SDK Firebase belum termuat';
  }

  // ID unik per sesi perangkat agar tanda "(Kamu!)" akurat meski nama siswa sama
  let currentDeviceEntryId = sessionStorage.getItem('IPAS_DEVICE_ENTRY_ID');
  if (!currentDeviceEntryId) {
    currentDeviceEntryId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem('IPAS_DEVICE_ENTRY_ID', currentDeviceEntryId);
  }

  // =========================================================================
  // 1. SISTEM AUDIO SINTETIS (WEB AUDIO API)
  // =========================================================================
  let audioCtx = null;
  let soundEnabled = true;
  let bgmInterval = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playClickSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  function playCorrectSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = audioCtx.currentTime + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (e) {}
  }

  function playWrongSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    try {
      const notes = [320, 240];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = audioCtx.currentTime + idx * 0.16;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch (e) {}
  }

  function playHeartLostSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  function playCelebrationSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    try {
      const fanfare = [
        { f: 523.25, d: 0.12 }, { f: 523.25, d: 0.12 }, { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.22 }, { f: 783.99, d: 0.22 }, { f: 1046.50, d: 0.45 }
      ];
      let offset = 0;
      fanfare.forEach((n) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = audioCtx.currentTime + offset;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + n.d);
        offset += n.d * 0.9;
      });
    } catch (e) {}
  }

  const bgmNotes = [
    523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25,
    659.25, 783.99, 1046.50, 880.00, 783.99, 587.33, 523.25, 659.25
  ];
  let bgmStep = 0;

  function startBgmLoop() {
    if (bgmInterval) clearInterval(bgmInterval);
    bgmInterval = setInterval(() => {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;
        const freq = bgmNotes[bgmStep % bgmNotes.length];
        bgmStep++;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } catch (err) {}
    }, 450);
  }

  function toggleSound() {
    initAudioContext();
    soundEnabled = !soundEnabled;
    const btnHeaderSound = document.getElementById('btn-sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    const btnStartSound = document.getElementById('btn-start-sound');

    if (soundEnabled) {
      soundIcon.textContent = '🔊';
      soundText.textContent = 'SUARA: ON';
      btnHeaderSound.classList.remove('muted');
      if (btnStartSound) btnStartSound.innerHTML = '<span>🔊</span> Suara: Aktif';
      startBgmLoop();
      playClickSound();
    } else {
      soundIcon.textContent = '🔇';
      soundText.textContent = 'SUARA: OFF';
      btnHeaderSound.classList.add('muted');
      if (btnStartSound) btnStartSound.innerHTML = '<span>🔇</span> Suara: Mati';
      if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    }
  }

  // =========================================================================
  // 2. SISTEM LIVE LEADERBOARD MULTI-DEVICE + RESET OTOMATIS 4 JAM
  // =========================================================================
  const DB_KEY = 'IPAS_CAHAYA_MATA_LEADERBOARD_FALLBACK';
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  let activeWindowId = Math.floor(Date.now() / FOUR_HOURS_MS);
  let activeFirebaseRef = null;
  let cachedLeaderboardList = [];

  function getCurrent4HourWindowId() {
    return Math.floor(Date.now() / FOUR_HOURS_MS);
  }

  function getResetCountdownText() {
    const now = Date.now();
    const nextResetTimestamp = (getCurrent4HourWindowId() + 1) * FOUR_HOURS_MS;
    const remainingMs = Math.max(0, nextResetTimestamp - now);

    const totalSec = Math.floor(remainingMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function updateLeaderboardResetBadge() {
    const statusLiveBadge = isActuallyConnected
      ? `<span style="display:inline-block; margin-right:6px; background:#DCFCE7; color:#15803D; padding:2px 10px; border-radius:10px; font-size:0.82rem; font-weight:800;">🟢 LIVE MULTI-DEVICE</span>`
      : `<span style="display:inline-block; margin-right:6px; background:#FEE2E2; color:#B91C1C; padding:2px 10px; border-radius:10px; font-size:0.82rem; font-weight:800;">🟠 BELUM TERHUBUNG (${firebaseErrorMsg || 'Menghubungkan ke Firebase...'})</span>`;

    const htmlContent = `Juara ditentukan dari <strong>Jawaban Paling Banyak Benar</strong> & <strong>Waktu Tercepat!</strong><br>
      <div style="margin-top:6px;">
        ${statusLiveBadge}
        <span style="display:inline-block; background:#FEF3C7; color:#92400E; padding:2px 10px; border-radius:10px; font-size:0.82rem; font-weight:700;">
          🔄 Reset otomatis setiap 4 jam (Sisa waktu: ${getResetCountdownText()})
        </span>
      </div>`;

    document.querySelectorAll('.lb-subtitle').forEach((el) => {
      el.innerHTML = htmlContent;
    });
  }

  function sortLeaderboardList(list) {
    return list.sort((a, b) => {
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      if (a.totalTimeSec !== b.totalTimeSec) return a.totalTimeSec - b.totalTimeSec;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function renderAllLeaderboards(list) {
    cachedLeaderboardList = list;
    renderLeaderboardComponent(list, 'leaderboard-tbody', 'podium-stage');
    renderLeaderboardComponent(list, 'modal-leaderboard-tbody', 'modal-podium-stage');
  }

  function subscribeToLiveLeaderboard() {
    const currentWinId = getCurrent4HourWindowId();
    activeWindowId = currentWinId;

    if (liveDb) {
      if (activeFirebaseRef) {
        activeFirebaseRef.off();
      }
      activeFirebaseRef = liveDb.ref(`ipas_leaderboard/window_${currentWinId}`);
      activeFirebaseRef.on('value', (snapshot) => {
        firebaseErrorMsg = '';
        const rawData = snapshot.val();
        const list = [];
        if (rawData) {
          Object.keys(rawData).forEach((key) => {
            list.push({
              id: key,
              ...rawData[key]
            });
          });
        }
        renderAllLeaderboards(sortLeaderboardList(list));
        updateLeaderboardResetBadge();
      }, (error) => {
        firebaseErrorMsg = error.code || 'Akses Ditolak (Cek Aturan Firebase)';
        console.error("Error membaca Live Leaderboard:", error);
        updateLeaderboardResetBadge();
        const fallbackData = getLocalFallbackData(currentWinId);
        renderAllLeaderboards(sortLeaderboardList(fallbackData));
      });
    } else {
      const fallbackData = getLocalFallbackData(currentWinId);
      renderAllLeaderboards(sortLeaderboardList(fallbackData));
    }
  }

  function getLocalFallbackData(winId) {
    try {
      const stored = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
      if (stored.windowId === winId && Array.isArray(stored.items)) {
        return stored.items;
      }
    } catch (e) {}
    return [];
  }

  function saveLocalFallbackData(winId, items) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify({ windowId: winId, items }));
    } catch (e) {}
  }

  setInterval(() => {
    const nowWinId = getCurrent4HourWindowId();
    updateLeaderboardResetBadge();

    if (nowWinId !== activeWindowId) {
      if (liveDb && isActuallyConnected) {
        liveDb.ref(`ipas_leaderboard/window_${activeWindowId}`).remove().catch(() => {});
      }
      subscribeToLiveLeaderboard();
    }
  }, 1000);

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const state = {
    playerName: '',
    startTime: null,
    totalDurationSec: 0,
    timerAccumulatedSec: 0,
    timerIsPaused: false,
    timerInterval: null,
    isModuleBUnlocked: false,
    hearts: 5,
    maxHearts: 5,
    activeScreen: 'screen-start',
    activeModule: 'A',
    currentSlide: 0,
    quizPack: 'A',
    quizIndex: 0,
    scores: { modulA: null, modulB: null },
    quizHistory: {}
  };

  function startOrResumeTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.startTime = Date.now();
    state.timerIsPaused = false;
    const timerPill = document.getElementById('header-timer-pill');
    if (timerPill) timerPill.style.opacity = '1';
    const timerText = document.getElementById('header-timer-text');
    state.timerInterval = setInterval(() => {
      const elapsed = state.timerAccumulatedSec + Math.floor((Date.now() - state.startTime) / 1000);
      state.totalDurationSec = elapsed;
      if (timerText) timerText.textContent = formatDuration(elapsed);
    }, 1000);
  }

  function pauseTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.startTime) state.timerAccumulatedSec += Math.floor((Date.now() - state.startTime) / 1000);
    state.timerIsPaused = true;
    const timerPill = document.getElementById('header-timer-pill');
    if (timerPill) timerPill.style.opacity = '0.5';
  }

  function stopTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.startTime) state.totalDurationSec = state.timerAccumulatedSec + Math.floor((Date.now() - state.startTime) / 1000);
    const timerPill = document.getElementById('header-timer-pill');
    if (timerPill) timerPill.style.opacity = '1';
  }

  function updateModuleLockUI() {
    const cardB = document.getElementById('card-modul-b');
    const lockOverlay = document.getElementById('lock-overlay-b');
    const badgeB = document.getElementById('badge-status-modul-b');
    const btnMateriB = document.getElementById('btn-modul-b-materi');
    const btnKuisB = document.getElementById('btn-modul-b-kuis');

    if (!state.isModuleBUnlocked) {
      if (cardB) cardB.classList.add('module-locked');
      if (lockOverlay) lockOverlay.style.display = 'flex';
      if (badgeB) badgeB.textContent = 'MODUL B (TERKUNCI 🔒)';
      if (btnMateriB) { btnMateriB.disabled = true; btnMateriB.innerHTML = '🔒 Belajar & Simulasi'; }
      if (btnKuisB) { btnKuisB.disabled = true; btnKuisB.innerHTML = '🔒 Kuis Mata (5 Soal)'; }
    } else {
      if (cardB) cardB.classList.remove('module-locked');
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (badgeB) badgeB.textContent = 'MODUL B (TERBUKA 🔓)';
      if (btnMateriB) { btnMateriB.disabled = false; btnMateriB.innerHTML = '📚 Belajar & Simulasi'; }
      if (btnKuisB) { btnKuisB.disabled = false; btnKuisB.innerHTML = '✏️ Kuis Mata (5 Soal)'; }
    }
  }

  function saveCurrentPlayerToLeaderboard() {
    if (!state.playerName) return;

    const currentWinId = getCurrent4HourWindowId();
    let totalCorrect = 0;
    [...quizBank.A, ...quizBank.B].forEach(q => {
      const pack = q.id <= 5 ? 'A' : 'B';
      const hist = state.quizHistory[`${pack}-${q.id}`];
      if (hist && hist.isCorrect) totalCorrect++;
    });

    const totalScore = (state.scores.modulA || 0) + (state.scores.modulB || 0);
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} (${pad(now.getHours())}:${pad(now.getMinutes())})`;

    const entryPayload = {
      deviceEntryId: currentDeviceEntryId,
      name: state.playerName,
      totalCorrect,
      totalScore,
      totalTimeSec: state.totalDurationSec,
      date: dateStr,
      createdAt: Date.now()
    };

    if (liveDb) {
      liveDb.ref(`ipas_leaderboard/window_${currentWinId}/${currentDeviceEntryId}`)
        .set(entryPayload)
        .then(() => {
          console.log("Skor berhasil dikirim ke Firebase Realtime Database!");
        })
        .catch((err) => {
          firebaseErrorMsg = err.code || 'Gagal Menulis Data (Cek Aturan Firebase)';
          console.error("Gagal menyimpan skor live:", err);
          updateLeaderboardResetBadge();
        });
    } else {
      const list = getLocalFallbackData(currentWinId);
      const existingIdx = list.findIndex(item => item.deviceEntryId === currentDeviceEntryId);
      if (existingIdx >= 0) list[existingIdx] = entryPayload;
      else list.push(entryPayload);
      saveLocalFallbackData(currentWinId, list);
      renderAllLeaderboards(sortLeaderboardList(list));
    }
  }

  function renderLeaderboardComponent(list, tbodyId, podiumId) {
    const tbody = document.getElementById(tbodyId);
    const podium = document.getElementById(podiumId);
    if (!tbody || !podium) return;
    tbody.innerHTML = '';
    podium.innerHTML = '';

    if (!list || list.length === 0) {
      podium.innerHTML = `
        <div style="text-align:center; padding: 18px 24px; background: #FFFBEB; border: 2px dashed #FCD34D; border-radius: 18px; width: 100%; color: #92400E;">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🏆✨</div>
          <strong style="font-family: var(--font-main); font-size: 1.05rem;">Podium Juara Masih Kosong!</strong>
          <p style="font-size: 0.9rem; margin-top: 4px;">Ayo selesaikan Modul A dan Modul B untuk menjadi juara pertama secara langsung!</p>
        </div>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 20px; color: #64748B; font-style: italic;">
            Belum ada peserta didik yang tercatat pada sesi 4 jam ini. Skor dari semua perangkat akan muncul otomatis di sini!
          </td>
        </tr>
      `;
      return;
    }

    const top3 = list.slice(0, 3);
    const podiumVisual = [];
    if (top3[1]) podiumVisual.push({ item: top3[1], rank: 2 });
    if (top3[0]) podiumVisual.push({ item: top3[0], rank: 1 });
    if (top3[2]) podiumVisual.push({ item: top3[2], rank: 3 });

    podiumVisual.forEach(p => {
      const card = document.createElement('div');
      card.className = `podium-card podium-rank-${p.rank}`;
      card.innerHTML = `
        <div class="podium-avatar-wrap">
          ${p.rank === 1 ? '<span class="podium-crown">👑</span>🥇' : p.rank === 2 ? '🥈' : '🥉'}
        </div>
        <div class="podium-name">${escapeHtml(p.item.name)}</div>
        <div class="podium-score">${p.item.totalCorrect}/10 Benar</div>
        <div class="podium-time">⚡ ${formatDuration(p.item.totalTimeSec)}</div>
        <div class="podium-block">#${p.rank}</div>
      `;
      podium.appendChild(card);
    });

    list.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const isPlayer = item.deviceEntryId === currentDeviceEntryId;
      if (isPlayer) tr.className = 'row-current-player';
      let rankBadgeClass = idx === 0 ? 'rb-1' : idx === 1 ? 'rb-2' : idx === 2 ? 'rb-3' : 'rb-other';
      tr.innerHTML = `
        <td><span class="rank-badge ${rankBadgeClass}">${idx + 1}</span></td>
        <td><strong>${escapeHtml(item.name)}</strong> ${isPlayer ? '<span class="badge-you">Kamu!</span>' : ''}</td>
        <td><strong>${item.totalCorrect} / 10</strong> (${item.totalScore} Poin)</td>
        <td>⚡ ${formatDuration(item.totalTimeSec)}</td>
        <td>${escapeHtml(item.date || '')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =========================================================================
  // 3. MATERI MODUL A & MODUL B
  // =========================================================================
  const materialData = {
    A: {
      title: 'Modul A: Simulasi Cahaya',
      slides: [
        {
          id: 1, icon: '☀️', title: '1. Pengertian Cahaya', subtitle: 'Mengenal energi yang menerangi dunia kita',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Tahukah kamu? Tanpa cahaya, seluruh dunia akan gelap gulita dan kita tidak bisa melihat indahnya warna-warni bunga!',
          text: `Cahaya adalah energi yang membantu kita melihat benda-benda di sekitar. Sumber cahaya yang sering kita temui dalam kehidupan sehari-hari adalah matahari, lampu rumah, nyala api unggun, dan lampu senter.`,
          highlight: `Sifat utama cahaya: dapat merambat lurus, dipantulkan, dibiaskan, dan diuraikan menjadi warna-warni!`,
          hasWidget: 'sunlight-beam'
        },
        {
          id: 2, icon: '💧', title: '2. Pembiasan Cahaya', subtitle: 'Mengapa pensil di dalam air terlihat patah & lebih gelap?',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Ayo coba simulasi interaktif pensil di samping! Perhatikan bagian pensil yang tercelup air terlihat membengkok dan warnanya tampak sedikit lebih gelap!',
          text: `Pembiasan cahaya adalah peristiwa membeloknya arah rambat cahaya ketika melewati dua zat bening yang berbeda kerapatannya, misalnya dari udara ke air.<br><br>
          Saat pensil dicelupkan ke dalam air, cahaya dari pensil berbelok ketika melewati batas air dan udara menuju mata kita, sehingga pensil terlihat bengkok/patah dan bagian di dalam air tampak lebih gelap.`,
          highlight: `Cahaya berbelok karena kecepatan cahaya di udara dan di air berbeda. Inilah yang disebut Pembiasan Cahaya!`,
          hasWidget: 'pencil-refraction'
        },
        {
          id: 3, icon: '🪞', title: '3. Pemantulan Cahaya', subtitle: 'Keajaiban bayangan di depan cermin',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Setiap pagi saat bersiap ke sekolah, kamu pasti bercermin kan? Cahaya di wajahmu memantul rapi ke cermin lalu sampai ke matamu!',
          text: `Pemantulan cahaya adalah peristiwa kembalinya cahaya setelah mengenai permukaan suatu benda. Pada cermin datar yang licin dan mengilap, cahaya dipantulkan secara teratur sehingga menghasilkan bayangan yang sama persis dengan aslinya.`,
          highlight: `Benda dapat terlihat oleh mata kita karena benda tersebut memantulkan cahaya ke arah mata kita!`,
          hasWidget: 'mirror-reflection'
        },
        {
          id: 4, icon: '🌈', title: '4. Penguraian Cahaya (Pelangi)', subtitle: 'Rahasia terurainya cahaya matahari menjadi 7 warna',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Geser slider sinar matahari di bawah ini untuk melihat cahaya putih terurai menjadi pelangi Me-Ji-Ku-Hi-Bi-Ni-U!',
          text: `Penguraian cahaya (dispersi) adalah peristiwa terurainya cahaya putih menjadi berbagai warna yang indah. Saat setelah hujan dan matahari bersinar, tetesan air hujan menguraikan cahaya matahari menjadi 7 warna pelangi: Merah, Jingga, Kuning, Hijau, Biru, Nila, dan Ungu.`,
          highlight: `Rumus hafal warna pelangi: Me-Ji-Ku-Hi-Bi-Ni-U (Merah, Jingga, Kuning, Hijau, Biru, Nila, Ungu).`,
          hasWidget: 'rainbow-dispersion'
        },
        {
          id: 5, icon: '🌱', title: '5. Manfaat Cahaya dalam Kehidupan', subtitle: 'Cahaya bagi manusia, hewan, dan tumbuhan',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Bukan hanya manusia, tanaman di kebun juga butuh sinar matahari untuk memasak makanan melalui fotosintesis!',
          text: `Cahaya matahari membantu manusia melihat lingkungan, membantu tumbuhan hijau melakukan fotosintesis, serta memberikan penerangan alami pada siang hari. Sedangkan lampu dan senter membantu kita melihat di tempat gelap.`,
          highlight: `Cahaya adalah sumber energi yang sangat vital bagi kelangsungan seluruh makhluk hidup di bumi!`,
          hasWidget: 'light-benefits'
        },
        {
          id: 6, icon: '📋', title: '6. Kesimpulan Modul Cahaya', subtitle: 'Rangkuman pemahaman petualangan cahaya',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Keren sekali! Kamu sudah menuntaskan Modul A. Sekarang saatnya menguji kepintaranmu di Kuis Simulasi Cahaya!',
          text: `Cahaya memiliki sifat merambat lurus, dapat dipantulkan (bercermin), dapat dibiaskan (pensil dalam air terlihat patah), dan dapat diuraikan (terbentuknya 7 warna pelangi).`,
          highlight: `Kamu sudah siap! Klik tombol di bawah untuk membuktikan kemampuanmu dalam Kuis Cahaya!`,
          hasWidget: 'badge-summary-a'
        }
      ]
    },
    B: {
      title: 'Modul B: Cara Kerja Mata',
      slides: [
        {
          id: 1, icon: '👁️', title: '1. Pengertian Mata', subtitle: 'Alat indra penglihatan yang sangat berharga',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Mata adalah jendela dunia! Berkat mata, kita bisa melihat pemandangan indah, membaca buku cerita, dan mengenali wajah sahabat kita.',
          text: `Mata merupakan salah satu alat indra manusia yang berfungsi untuk melihat benda-benda di sekitar. Dengan mata, kita dapat mengenali bentuk, warna, ukuran, dan gerakan benda.`,
          highlight: `Mata kita bekerja sama erat dengan cahaya. Tanpa cahaya, mata kita tidak akan bisa melihat bayangan benda.`,
          hasWidget: 'eye-intro-card'
        },
        {
          id: 2, icon: '🔍', title: '2. Bagian-Bagian Mata & Fungsinya', subtitle: 'Kenali 6 bagian penting pada anatomi mata asli',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Ayo klik angka merah pada gambar anatomi mata asli di samping untuk mengetahui nama dan tugas masing-masing bagian mata!',
          text: `Bagian-bagian penting mata:
          <ul style="margin-top: 8px; margin-left: 20px;">
            <li><strong>Kornea:</strong> Selaput bening terdepan tempat masuk dan membeloknya cahaya pertama kali.</li>
            <li><strong>Pupil:</strong> Lubang hitam di tengah mata tempat masuknya cahaya.</li>
            <li><strong>Iris:</strong> Bagian berwarna yang mengatur membesar & mengecilnya pupil.</li>
            <li><strong>Lensa Mata:</strong> Memfokuskan cahaya agar bayangan jatuh jelas di retina.</li>
            <li><strong>Retina:</strong> Lapisan belakang mata yang menangkap bayangan dan mengubahnya menjadi sinyal.</li>
            <li><strong>Kelopak Mata:</strong> Melindungi mata dari debu dan menjaga kelembapan mata.</li>
          </ul>`,
          highlight: `Klik setiap titik nomor pada anatomi mata di samping untuk menjelajahinya!`,
          hasWidget: 'eye-anatomy-interactive'
        },
        {
          id: 3, icon: '🧠', title: '3. Bagaimana Proses Mata Melihat?', subtitle: 'Perjalanan cahaya dari benda hingga ke otak',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Klik tombol "Nyalakan Cahaya" di diagram anatomi mata untuk melihat berkas cahaya berjalan melintasi kornea sampai ke otak!',
          text: `Urutan lengkap proses kita melihat benda:
          <div style="background:#F0F9FF; padding:12px; border-radius:12px; margin-top:10px; border-left:4px solid #0284C7; font-weight:600;">
            Cahaya dari Benda ➡️ Kornea ➡️ Pupil ➡️ Lensa Mata ➡️ Retina ➡️ Saraf Optik ➡️ Otak!
          </div>`,
          highlight: `Retina menangkap bayangan dalam posisi terbalik, namun otak kita memutarnya kembali menjadi tegak!`,
          hasWidget: 'eye-ray-simulation'
        },
        {
          id: 4, icon: '🥕', title: '4. Cara Menjaga Kesehatan Mata', subtitle: 'Kebiasaan baik agar mata selalu sehat dan jernih',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Aku paling suka makan wortel dan bayam! Sayuran itu mengandung vitamin A yang sangat baik untuk menjaga kesehatan mata kita.',
          text: `Cara menjaga kesehatan mata:
          <ol style="margin-top: 8px; margin-left: 20px;">
            <li>Membaca buku dengan pencahayaan yang cukup dan tidak terlalu dekat.</li>
            <li>Mengistirahatkan mata setelah menggunakan HP atau komputer.</li>
            <li>Mengonsumsi makanan bergizi, seperti wortel dan sayuran.</li>
            <li>Tidak mengucek mata menggunakan tangan yang kotor.</li>
          </ol>`,
          highlight: `Mata adalah karunia berharga, mari kita rawat dan jaga setiap hari!`,
          hasWidget: 'healthy-eye-habits'
        },
        {
          id: 5, icon: '🏆', title: '5. Kesimpulan Modul Mata', subtitle: 'Rangkuman pemahaman cara kerja mata',
          speaker: 'Lumi', speakerImg: './Lumi.png',
          bubble: 'Hebat! Kamu telah menuntaskan seluruh materi IPAS kelas 5 hari ini. Ayo uji pemahamanmu di Kuis Cara Kerja Mata!',
          text: `Proses melihat terjadi ketika cahaya masuk melalui kornea, melewati pupil, difokuskan oleh lensa mata, ditangkap oleh retina, lalu sinyal diteruskan ke otak sehingga kita dapat melihat benda dengan jelas.`,
          highlight: `Siapkan dirimu dan selesaikan 5 soal kuis pilihan ganda (A, B, C, D) berikutnya!`,
          hasWidget: 'badge-summary-b'
        }
      ]
    }
  };

  // =========================================================================
  // 4. BANK SOAL PILIHAN GANDA A, B, C, D (KELAS 5 SD)
  // =========================================================================
  const quizBank = {
    A: [
      {
        id: 1,
        question: 'Pensil yang dimasukkan ke dalam gelas berisi air akan terlihat...',
        options: [
          { text: 'Bengkok atau patah', key: 'a' },
          { text: 'Menyala terang', key: 'b' },
          { text: 'Hilang tak terlihat', key: 'c' },
          { text: 'Berubah menjadi kecil sekali', key: 'd' }
        ],
        correct: 'a',
        explanation: 'Pensil terlihat bengkok atau patah karena cahaya mengalami pembelokan (pembiasan) saat merambat dari udara ke dalam air.',
        illustrationType: 'pencil-water'
      },
      {
        id: 2,
        question: 'Pensil terlihat bengkok di dalam air karena terjadi peristiwa...',
        options: [
          { text: 'Pembiasan cahaya', key: 'a' },
          { text: 'Pemantulan cahaya', key: 'b' },
          { text: 'Penguapan air', key: 'c' },
          { text: 'Penyerapan warna', key: 'd' }
        ],
        correct: 'a',
        explanation: 'Peristiwa membeloknya arah cahaya saat melewati dua zat bening yang berbeda (udara dan air) disebut pembiasan cahaya.',
        illustrationType: 'refraction-ray'
      },
      {
        id: 3,
        question: 'Pembiasan adalah peristiwa...',
        options: [
          { text: 'Cahaya yang membelok', key: 'a' },
          { text: 'Cahaya yang hilang', key: 'b' },
          { text: 'Cahaya yang berhenti total', key: 'c' },
          { text: 'Cahaya yang memantul kembali', key: 'd' }
        ],
        correct: 'a',
        explanation: 'Pembiasan terjadi ketika arah rambat cahaya membelok saat berpindah melewati dua medium bening yang berbeda kerapatannya.',
        illustrationType: 'bending-wave'
      },
      {
        id: 4,
        question: 'Pelangi biasanya muncul pada saat...',
        options: [
          { text: 'Saat gempa bumi terjadi', key: 'a' },
          { text: 'Pada malam hari yang gelap', key: 'b' },
          { text: 'Setelah hujan, saat matahari bersinar', key: 'c' },
          { text: 'Saat angin topan bertiup kencang', key: 'd' }
        ],
        correct: 'c',
        explanation: 'Pelangi terbentuk ketika cahaya matahari mengenai dan diuraikan oleh sisa-sisa tetesan air hujan di langit.',
        illustrationType: 'rainbow-cloud'
      },
      {
        id: 5,
        question: 'Ada berapa warna yang terlihat pada pelangi?',
        options: [
          { text: '7 warna', key: 'a' },
          { text: '3 warna', key: 'b' },
          { text: '10 warna', key: 'c' },
          { text: '5 warna', key: 'd' }
        ],
        correct: 'a',
        explanation: 'Cahaya putih matahari terurai menjadi 7 warna pelangi: merah, jingga, kuning, hijau, biru, nila, dan ungu (MeJiKuHiBiNiU).',
        illustrationType: 'rainbow-spectrum'
      }
    ],
    B: [
      {
        id: 6,
        question: 'Alat indra tubuh yang kita pakai untuk melihat benda di sekitar adalah...',
        options: [
          { text: 'Hidung', key: 'a' },
          { text: 'Mata', key: 'b' },
          { text: 'Telinga', key: 'c' },
          { text: 'Kulit', key: 'd' }
        ],
        correct: 'b',
        explanation: 'Mata adalah alat indra penglihatan manusia untuk mengenali bentuk, warna, ukuran, dan benda di sekitar.',
        illustrationType: 'eye-view'
      },
      {
        id: 7,
        question: 'Bagian mata yang bening dan terletak paling depan disebut...',
        options: [
          { text: 'Kelopak mata', key: 'a' },
          { text: 'Alis mata', key: 'b' },
          { text: 'Kornea', key: 'c' },
          { text: 'Retina', key: 'd' }
        ],
        correct: 'c',
        explanation: 'Kornea adalah selaput bening di bagian paling depan mata yang melindungi mata dan menjadi tempat pertama masuknya cahaya.',
        illustrationType: 'cornea-spot'
      },
      {
        id: 8,
        question: 'Bagian mata yang membantu mengumpulkan dan memfokuskan cahaya agar bayangan jelas disebut...',
        options: [
          { text: 'Lensa mata', key: 'a' },
          { text: 'Kelopak mata', key: 'b' },
          { text: 'Alis mata', key: 'c' },
          { text: 'Bulu mata', key: 'd' }
        ],
        correct: 'a',
        explanation: 'Lensa mata berfungsi memfokuskan cahaya yang masuk agar bayangan jatuh tepat di retina sehingga terlihat jelas.',
        illustrationType: 'lens-focus'
      },
      {
        id: 9,
        question: 'Bayangan benda ditangkap oleh lapisan di bagian belakang mata yang bernama...',
        options: [
          { text: 'Kelopak mata', key: 'a' },
          { text: 'Retina', key: 'b' },
          { text: 'Alis mata', key: 'c' },
          { text: 'Iris', key: 'd' }
        ],
        correct: 'b',
        explanation: 'Retina berada di bagian belakang mata dan bertugas menangkap bayangan cahaya lalu mengubahnya menjadi sinyal ke otak.',
        illustrationType: 'retina-screen'
      },
      {
        id: 10,
        question: 'Cahaya yang masuk ke dalam mata pertama kali melewati...',
        options: [
          { text: 'Otak', key: 'a' },
          { text: 'Retina', key: 'b' },
          { text: 'Kornea', key: 'c' },
          { text: 'Saraf optik', key: 'd' }
        ],
        correct: 'c',
        explanation: 'Urutan cahaya masuk ke mata dimulai pertama kali dari bagian paling depan, yaitu kornea, lalu ke pupil, lensa, dan retina.',
        illustrationType: 'light-path-first'
      }
    ]
  };

  // =========================================================================
  // 5. WIDGET SIMULASI INTERAKTIF
  // =========================================================================
  function getWidgetHtml(widgetType) {
    switch (widgetType) {
      case 'pencil-refraction':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">🔬 Simulasi Pembiasan Pensil</span>
            <div class="sim-canvas-box" id="pencil-box">
              <svg id="svg-pencil" viewBox="0 0 320 260" width="100%" height="100%">
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.52"/>
                    <stop offset="100%" stop-color="#0369A1" stop-opacity="0.82"/>
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="320" height="260" fill="#F8FAFC" />
                <rect x="20" y="225" width="280" height="20" rx="6" fill="#D7CCC8" />
                <path d="M 85 50 L 100 220 A 15 15 0 0 0 115 230 L 205 230 A 15 15 0 0 0 220 220 L 235 50 Z" 
                      fill="none" stroke="#64748B" stroke-width="4" stroke-linejoin="round" />
                <g id="pencil-upper" transform="rotate(-20 160 130)">
                  <rect x="154" y="30" width="12" height="100" rx="3" fill="#FFB703" stroke="#FB8500" stroke-width="2" />
                  <rect x="154" y="20" width="12" height="12" rx="2" fill="#F472B6" />
                </g>
                <g id="pencil-lower" transform="translate(18, 0) rotate(-7 160 130)">
                  <rect id="pencil-lower-body" x="154" y="130" width="12" height="75" rx="2" fill="#B4690E" stroke="#78350F" stroke-width="2" />
                  <polygon id="pencil-lower-tip" points="154,205 166,205 160,220" fill="#92400E" />
                </g>
                <path id="water-body" d="M 91 130 Q 160 140 229 130 L 218 222 A 10 10 0 0 1 205 228 L 115 228 A 10 10 0 0 1 102 222 Z" 
                      fill="url(#waterGrad)" />
                <ellipse cx="160" cy="130" rx="69" ry="8" fill="#BAE6FD" opacity="0.7"/>
                <text x="25" y="85" font-family="Fredoka" font-size="12" font-weight="700" fill="#475569">Udara (Terang)</text>
                <text x="25" y="175" font-family="Fredoka" font-size="12" font-weight="700" fill="#0369A1">Air (Lebih Gelap)</text>
                <line x1="160" y1="95" x2="160" y2="195" stroke="#94A3B8" stroke-dasharray="4,4" stroke-width="2" />
                <path id="ray-path" d="M 125 45 L 160 130 L 195 210" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="5,3"/>
                <circle cx="160" cy="130" r="4" fill="#EF4444" />
                <text x="175" y="142" font-family="Fredoka" font-size="11" font-weight="bold" fill="#E11D48">Cahaya Berbelok!</text>
              </svg>
            </div>
            <div class="sim-controls-row">
              <button id="btn-toggle-water" class="btn-3d btn-primary" style="font-size:0.85rem; padding:8px 16px;">
                🔄 Angkat Pensil dari Air
              </button>
              <button id="btn-reset-pencil" class="btn-pill" style="font-size:0.82rem;">
                Tampilkan Garis Lurus Asli
              </button>
            </div>
            <p id="pencil-desc" style="font-size:0.82rem; color:#475569; margin-top:8px; text-align:center;">
              Pensil di dalam air tampak membengkok dan warnanya terlihat lebih gelap!
            </p>
          </div>
        `;

      case 'rainbow-dispersion':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">🌈 Simulasi Penguraian Pelangi</span>
            <div class="sim-canvas-box" id="rainbow-box">
              <svg viewBox="0 0 340 260" width="100%" height="100%">
                <rect width="340" height="260" fill="#E0F2FE" />
                <g transform="translate(45, 45)">
                  <circle cx="0" cy="0" r="26" fill="#FBBF24" stroke="#F59E0B" stroke-width="3" />
                  <circle cx="-8" cy="-5" r="3" fill="#78350F"/>
                  <circle cx="8" cy="-5" r="3" fill="#78350F"/>
                  <path d="M -8 8 Q 0 16 8 8" fill="none" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
                </g>
                <path d="M 68 55 L 155 125" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
                <text x="75" y="80" font-family="Fredoka" font-size="11" font-weight="700" fill="#B45309">Sinar Putih</text>
                <g transform="translate(165, 125)">
                  <path d="M 0 -35 C 25 -5, 30 18, 0 35 C -30 18, -25 -5, 0 -35 Z" fill="#60A5FA" fill-opacity="0.55" stroke="#2563EB" stroke-width="3"/>
                  <text x="-25" y="52" font-family="Fredoka" font-size="11" font-weight="700" fill="#1D4ED8">Tetes Air Hujan</text>
                </g>
                <g id="rainbow-fan" transform="translate(180, 125)">
                  <line x1="0" y1="-10" x2="135" y2="-45" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="-7" x2="135" y2="-32" stroke="#F97316" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="-4" x2="135" y2="-19" stroke="#EAB308" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="-1" x2="135" y2="-6" stroke="#22C55E" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="2" x2="135" y2="7" stroke="#06B6D4" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="5" x2="135" y2="20" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
                  <line x1="0" y1="8" x2="135" y2="33" stroke="#A855F7" stroke-width="4" stroke-linecap="round"/>
                </g>
                <text x="260" y="65" font-family="Fredoka" font-size="9" font-weight="bold" fill="#B91C1C">Merah</text>
                <text x="260" y="80" font-family="Fredoka" font-size="9" font-weight="bold" fill="#C2410C">Jingga</text>
                <text x="260" y="95" font-family="Fredoka" font-size="9" font-weight="bold" fill="#A16207">Kuning</text>
                <text x="260" y="110" font-family="Fredoka" font-size="9" font-weight="bold" fill="#15803D">Hijau</text>
                <text x="260" y="125" font-family="Fredoka" font-size="9" font-weight="bold" fill="#0E7490">Biru</text>
                <text x="260" y="140" font-family="Fredoka" font-size="9" font-weight="bold" fill="#1D4ED8">Nila</text>
                <text x="260" y="155" font-family="Fredoka" font-size="9" font-weight="bold" fill="#7E22CE">Ungu</text>
              </svg>
            </div>
            <div class="sim-controls-row">
              <label class="sim-slider-label">
                <span>Intensitas Sinar Matahari:</span>
                <input type="range" id="slider-rainbow" min="1" max="100" value="85" class="sim-slider">
              </label>
            </div>
            <p id="rainbow-desc" style="font-size:0.82rem; color:#475569; margin-top:6px; text-align:center;">
              Tetesan air hujan menguraikan cahaya putih matahari menjadi 7 warna pelangi!
            </p>
          </div>
        `;

      case 'eye-anatomy-interactive':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">👁️ Anatomi Mata Manusia Asli (Klik Nomor!)</span>
            <div class="eye-interactive-wrapper">
              <svg viewBox="0 0 380 270" width="100%" height="100%">
                <defs>
                  <radialGradient id="scleraGrad" cx="45%" cy="50%" r="55%">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="80%" stop-color="#F8FAFC"/>
                    <stop offset="100%" stop-color="#E2E8F0"/>
                  </radialGradient>
                  <radialGradient id="lensGrad" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
                    <stop offset="60%" stop-color="#BAE6FD" stop-opacity="0.85"/>
                    <stop offset="100%" stop-color="#7DD3FC" stop-opacity="0.9"/>
                  </radialGradient>
                  <linearGradient id="corneaGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#E0F2FE" stop-opacity="0.15"/>
                  </linearGradient>
                  <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FDBA74"/>
                    <stop offset="100%" stop-color="#FB923C"/>
                  </linearGradient>
                </defs>
                <path d="M 140 38 Q 210 20 285 52 L 275 64 Q 210 38 145 48 Z" fill="#FCA5A5" stroke="#EF4444" stroke-width="1.5"/>
                <path d="M 140 232 Q 210 250 285 218 L 275 206 Q 210 232 145 222 Z" fill="#FCA5A5" stroke="#EF4444" stroke-width="1.5"/>
                <path d="M 300 120 C 335 122, 355 130, 375 138 L 375 162 C 350 154, 330 146, 300 146 Z" fill="#FDE68A" stroke="#D97706" stroke-width="2"/>
                <path d="M 305 130 L 370 146 M 305 137 L 370 153" stroke="#F59E0B" stroke-width="1.5"/>
                <text x="302" y="175" font-family="Fredoka" font-size="10" font-weight="bold" fill="#92400E">Saraf Optik</text>
                <path d="M 102 78 A 105 96 0 1 1 102 192 Q 112 135 102 78 Z" fill="url(#scleraGrad)" stroke="#94A3B8" stroke-width="3.5"/>
                <path d="M 110 76 A 98 89 0 1 1 110 194" fill="none" stroke="#991B1B" stroke-width="5"/>
                <path id="part-retina" d="M 118 78 A 92 84 0 1 1 118 192" fill="none" stroke="#F59E0B" stroke-width="6" stroke-linecap="round"/>
                <path id="part-kornea" d="M 104 76 C 62 92, 62 178, 104 194 C 95 160, 95 110, 104 76 Z" fill="url(#corneaGrad)" stroke="#0284C7" stroke-width="3.5"/>
                <line x1="115" y1="82" x2="128" y2="100" stroke="#CBD5E1" stroke-width="2"/>
                <line x1="115" y1="188" x2="128" y2="170" stroke="#CBD5E1" stroke-width="2"/>
                <path id="part-lensa" d="M 128 98 C 145 112, 145 158, 128 172 C 113 158, 113 112, 128 98 Z" fill="url(#lensGrad)" stroke="#0369A1" stroke-width="2.5"/>
                <path id="part-iris-top" d="M 106 78 L 112 114 L 103 114 L 99 82 Z" fill="#78350F" stroke="#451A03" stroke-width="1.5"/>
                <path id="part-iris-bot" d="M 106 192 L 112 156 L 103 156 L 99 188 Z" fill="#78350F" stroke="#451A03" stroke-width="1.5"/>
                <rect id="part-pupil" x="103" y="114" width="9" height="42" rx="3" fill="#0F172A"/>
                <path id="part-kelopak-top" d="M 48 68 Q 82 42 125 62 Q 95 66 62 76 Z" fill="url(#skinGrad)" stroke="#EA580C" stroke-width="2"/>
                <path d="M 62 74 Q 46 66 40 58 M 72 71 Q 58 61 53 53 M 82 68 Q 70 57 66 49" fill="none" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
                <path id="part-kelopak-bot" d="M 48 202 Q 82 228 125 208 Q 95 204 62 194 Z" fill="url(#skinGrad)" stroke="#EA580C" stroke-width="2"/>
                <path d="M 62 196 Q 48 204 43 212 M 74 199 Q 62 208 58 215" fill="none" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              <button class="hotspot-btn" style="top:45%; left:15%;" data-part="kornea" title="1. Kornea">1</button>
              <button class="hotspot-btn" style="top:45%; left:24%;" data-part="pupil" title="2. Pupil">2</button>
              <button class="hotspot-btn" style="top:31%; left:24%;" data-part="iris" title="3. Iris">3</button>
              <button class="hotspot-btn" style="top:45%; left:33%;" data-part="lensa" title="4. Lensa Mata">4</button>
              <button class="hotspot-btn" style="top:45%; left:76%;" data-part="retina" title="5. Retina">5</button>
              <button class="hotspot-btn" style="top:15%; left:19%;" data-part="kelopak" title="6. Kelopak Mata">6</button>
            </div>
            <div class="eye-part-info-box" id="eye-part-info">
              👈 <strong>Klik salah satu angka lingkaran merah</strong> pada gambar anatomi mata di atas untuk melihat nama dan fungsinya!
            </div>
          </div>
        `;

      case 'eye-ray-simulation':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">💡 Simulasi Jalannya Sinar Masuk ke Anatomi Mata</span>
            <div class="sim-canvas-box" id="eye-ray-box">
              <svg viewBox="0 0 380 250" width="100%" height="100%">
                <g transform="translate(18, 100)">
                  <rect x="16" y="25" width="8" height="26" fill="#78350F" />
                  <circle cx="20" cy="18" r="18" fill="#22C55E" />
                  <circle cx="15" cy="14" r="3" fill="#EF4444" />
                  <text x="-4" y="66" font-family="Fredoka" font-size="11" font-weight="bold" fill="#15803D">Benda</text>
                </g>
                <g transform="translate(105, 18)">
                  <path d="M 185 98 L 218 106 L 218 118 L 185 114 Z" fill="#FDE68A" stroke="#D97706" stroke-width="1.5"/>
                  <path d="M 48 52 A 76 68 0 1 1 48 162 Q 55 107 48 52 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2.5"/>
                  <path d="M 56 54 A 68 60 0 1 1 56 160" fill="none" stroke="#F59E0B" stroke-width="4.5"/>
                  <path d="M 48 52 C 18 68, 18 146, 48 162" fill="#E0F2FE" fill-opacity="0.4" stroke="#0284C7" stroke-width="3"/>
                  <line x1="50" y1="54" x2="52" y2="85" stroke="#78350F" stroke-width="4"/>
                  <line x1="50" y1="160" x2="52" y2="129" stroke="#78350F" stroke-width="4"/>
                  <path d="M 68 74 C 82 88, 82 126, 68 140 C 56 126, 56 88, 68 74 Z" fill="#BAE6FD" stroke="#0369A1" stroke-width="2"/>
                  <g transform="translate(182, 107) scale(0.55) rotate(180)">
                    <rect x="0" y="5" width="5" height="15" fill="#78350F" />
                    <circle cx="2.5" cy="0" r="10" fill="#22C55E" />
                  </g>
                </g>
                <g transform="translate(325, 112)">
                  <circle cx="16" cy="16" r="22" fill="#F472B6" stroke="#DB2777" stroke-width="2"/>
                  <text x="1" y="50" font-family="Fredoka" font-size="11" font-weight="bold" fill="#9D174D">Otak</text>
                </g>
                <path id="anim-light-ray" d="M 42 115 L 135 112 L 173 105 L 285 125 L 325 128 M 42 135 L 135 138 L 173 145 L 285 125" 
                      fill="none" stroke="#FACC15" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6,4"/>
              </svg>
            </div>
            <div class="sim-controls-row">
              <button id="btn-fire-light" class="btn-3d btn-primary" style="font-size:0.88rem; padding:8px 18px;">
                💡 Nyalakan Cahaya & Lihat Perjalanan!
              </button>
            </div>
            <p id="ray-step-text" style="font-size:0.82rem; color:#1E40AF; margin-top:8px; font-weight:700; text-align:center;">
              Urutan: Benda ➔ Kornea ➔ Pupil ➔ Lensa ➔ Retina ➔ Otak
            </p>
          </div>
        `;

      case 'sunlight-beam':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">☀️ Sumber Cahaya di Sekitar Kita</span>
            <div class="sim-canvas-box" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; background:linear-gradient(180deg, #E0F2FE 0%, #FEF08A 100%);">
              <div style="font-size:3.5rem;">☀️ 🔦 💡 🔥</div>
              <div style="font-family:'Fredoka'; font-weight:700; color:#B45309; text-align:center; font-size:1rem; padding:0 15px;">
                Matahari, Lampu Senter, Bohlam, dan Nyala Api adalah sumber cahaya yang memancarkan energi terang!
              </div>
            </div>
          </div>
        `;

      case 'mirror-reflection':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">🪞 Simulasi Pemantulan Cermin Datar</span>
            <div class="sim-canvas-box">
              <svg viewBox="0 0 300 240" width="100%" height="100%">
                <rect width="300" height="240" fill="#F8FAFC"/>
                <line x1="150" y1="20" x2="150" y2="220" stroke="#0284C7" stroke-width="6"/>
                <text x="135" y="15" font-family="Fredoka" font-size="11" font-weight="bold" fill="#0369A1">Cermin</text>
                <path d="M 40 50 L 150 120" stroke="#F59E0B" stroke-width="4" stroke-dasharray="6,3"/>
                <circle cx="40" cy="50" r="10" fill="#F59E0B"/>
                <text x="15" y="40" font-family="Fredoka" font-size="10" fill="#B45309">Sinar Datang</text>
                <path d="M 150 120 L 40 190" stroke="#EF4444" stroke-width="4" stroke-dasharray="6,3"/>
                <circle cx="40" cy="190" r="12" fill="#E0F2FE" stroke="#0284C7" stroke-width="2"/>
                <text x="10" y="215" font-family="Fredoka" font-size="10" fill="#E11D48">Mata Melihat Bayangan</text>
                <circle cx="150" cy="120" r="5" fill="#EF4444"/>
              </svg>
            </div>
            <p style="font-size:0.82rem; color:#475569; margin-top:8px; text-align:center;">
              Cahaya mengenai permukaan cermin lalu dipantulkan kembali ke mata kita!
            </p>
          </div>
        `;

      case 'light-benefits':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">🌱 Manfaat Luar Biasa Cahaya</span>
            <div class="sim-canvas-box" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px; padding:15px; background:#F0FDF4;">
              <span style="font-size:3rem;">☀️ ➡️ 🍃 ➡️ 🍎</span>
              <p style="font-family:'Fredoka'; font-size:0.95rem; font-weight:700; color:#166534; text-align:center;">
                Fotosintesis: Daun tanaman menyerap cahaya matahari untuk membuat makanan dan menghasilkan oksigen segar!
              </p>
            </div>
          </div>
        `;

      case 'healthy-eye-habits':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">🥕 Makanan & Kebiasaan Sehat</span>
            <div class="sim-canvas-box" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:10px; padding:15px; background:#FFF7ED;">
              <div style="font-size:3.2rem;">🥕 🥦 🍅 📖 ⏰</div>
              <p style="font-family:'Fredoka'; font-size:0.95rem; font-weight:700; color:#C2410C; text-align:center;">
                Wortel, sayuran hijau, pencahayaan cukup, dan istirahat teratur menjaga mata tetap sehat!
              </p>
            </div>
          </div>
        `;

      case 'eye-intro-card':
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">👀 Jendela Dunia Kita</span>
            <div class="sim-canvas-box" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:10px; background:#EFF6FF;">
              <span style="font-size:4rem;">👁️✨</span>
              <p style="font-family:'Fredoka'; font-size:0.95rem; font-weight:700; color:#1D4ED8; text-align:center; padding:0 15px;">
                Mata manusia mampu mengenali bentuk, warna, ukuran, dan gerakan benda berkat bantuan cahaya!
              </p>
            </div>
          </div>
        `;

      default:
        return `
          <div class="simulation-widget">
            <span class="sim-title-badge">⭐ Kamu Luar Biasa!</span>
            <div class="sim-canvas-box" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; background:linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);">
              <span style="font-size:4rem;">🎖️✨</span>
              <strong style="font-family:'Fredoka'; font-size:1.15rem; color:#B45309; text-align:center;">
                Materi Tuntas! Siap Uji Kemampuan?
              </strong>
            </div>
          </div>
        `;
    }
  }

  function attachWidgetListeners(widgetType) {
    if (widgetType === 'pencil-refraction') {
      const btnToggle = document.getElementById('btn-toggle-water');
      const btnReset = document.getElementById('btn-reset-pencil');
      const pencilLower = document.getElementById('pencil-lower');
      const pencilLowerBody = document.getElementById('pencil-lower-body');
      const pencilLowerTip = document.getElementById('pencil-lower-tip');
      const waterBody = document.getElementById('water-body');
      const rayPath = document.getElementById('ray-path');
      const pencilDesc = document.getElementById('pencil-desc');

      let inWater = true;

      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          playClickSound();
          inWater = !inWater;
          if (inWater) {
            pencilLower.setAttribute('transform', 'translate(18, 0) rotate(-7 160 130)');
            if (pencilLowerBody) {
              pencilLowerBody.setAttribute('fill', '#B4690E');
              pencilLowerBody.setAttribute('stroke', '#78350F');
            }
            if (pencilLowerTip) pencilLowerTip.setAttribute('fill', '#92400E');
            waterBody.style.opacity = '1';
            rayPath.style.display = 'block';
            pencilDesc.textContent = 'Pensil di dalam air: Cahaya terbiaskan, pensil terlihat patah dan warnanya lebih gelap!';
            btnToggle.textContent = '🔄 Angkat Pensil dari Air';
          } else {
            pencilLower.setAttribute('transform', 'rotate(-20 160 130)');
            if (pencilLowerBody) {
              pencilLowerBody.setAttribute('fill', '#FFB703');
              pencilLowerBody.setAttribute('stroke', '#FB8500');
            }
            if (pencilLowerTip) pencilLowerTip.setAttribute('fill', '#FBBF24');
            waterBody.style.opacity = '0.08';
            rayPath.style.display = 'none';
            pencilDesc.textContent = 'Pensil di luar air: Pensil lurus utuh dan warnanya kembali kuning cerah!';
            btnToggle.textContent = '🔄 Celupkan Pensil ke Air';
          }
        });
      }

      if (btnReset) {
        btnReset.addEventListener('click', () => {
          playClickSound();
          pencilLower.setAttribute('transform', 'rotate(-20 160 130)');
          pencilDesc.textContent = 'Garis lurus asli pensil: Sebenarnya pensil tidak patah sama sekali!';
          setTimeout(() => {
            if (inWater) {
              pencilLower.setAttribute('transform', 'translate(18, 0) rotate(-7 160 130)');
              pencilDesc.textContent = 'Dan kembali tampak membengkok serta lebih gelap di dalam air!';
            }
          }, 1800);
        });
      }
    }

    if (widgetType === 'rainbow-dispersion') {
      const slider = document.getElementById('slider-rainbow');
      const fan = document.getElementById('rainbow-fan');
      const desc = document.getElementById('rainbow-desc');
      if (slider && fan) {
        slider.addEventListener('input', (e) => {
          const val = e.target.value;
          fan.style.opacity = (val / 100);
          fan.style.transform = `translate(180px, 125px) scale(${0.7 + (val / 250)})`;
          desc.textContent = `Intensitas Cahaya ${val}%: Semakin terang cahaya matahari mengenai tetes air, spektrum 7 warna pelangi semakin jelas terpancar!`;
        });
      }
    }

    if (widgetType === 'eye-anatomy-interactive') {
      const infoBox = document.getElementById('eye-part-info');
      const hotspots = document.querySelectorAll('.hotspot-btn');
      const partData = {
        kornea: {
          name: '1. Kornea (Selaput Bening Depan)',
          desc: 'Bagian bening yang terletak paling depan pada mata. Berfungsi melindungi bagian dalam mata dan membantu membelokkan cahaya yang masuk pertama kali.'
        },
        pupil: {
          name: '2. Pupil (Celah Masuk Cahaya)',
          desc: 'Lubang kecil di tengah mata tempat masuknya cahaya. Pupil dapat membesar di tempat gelap dan mengecil di tempat terang!'
        },
        iris: {
          name: '3. Iris (Selaput Berwarna)',
          desc: 'Bagian mata yang memiliki warna (seperti cokelat atau hitam). Berfungsi mengatur besar dan kecilnya pupil.'
        },
        lensa: {
          name: '4. Lensa Mata (Bikonveks)',
          desc: 'Bagian bening di belakang pupil yang berfungsi memfokuskan cahaya agar bayangan benda jatuh tepat dan jelas di retina.'
        },
        retina: {
          name: '5. Retina (Lapisan Belakang Mata)',
          desc: 'Lapisan di bagian belakang bola mata yang menangkap cahaya masuk dan mengubahnya menjadi sinyal ke otak melalui saraf optik.'
        },
        kelopak: {
          name: '6. Kelopak Mata',
          desc: 'Melindungi mata dari debu, kotoran, dan benda asing, serta menjaga kelembapan mata saat berkedip.'
        }
      };

      hotspots.forEach(btn => {
        btn.addEventListener('click', (e) => {
          playClickSound();
          hotspots.forEach(b => b.classList.remove('active-spot'));
          e.currentTarget.classList.add('active-spot');
          const partKey = e.currentTarget.getAttribute('data-part');
          const data = partData[partKey];
          if (data && infoBox) {
            infoBox.innerHTML = `<strong>✨ ${data.name}:</strong><br>${data.desc}`;
          }
        });
      });
    }

    if (widgetType === 'eye-ray-simulation') {
      const btnFire = document.getElementById('btn-fire-light');
      const lightRay = document.getElementById('anim-light-ray');
      const stepText = document.getElementById('ray-step-text');
      if (btnFire) {
        btnFire.addEventListener('click', () => {
          playCorrectSound();
          const steps = [
            '1. Cahaya dipantulkan dari Benda (Pohon) ☀️',
            '2. Menembus Kornea bening di bagian depan 🌊',
            '3. Masuk melewati celah Pupil 🕳️',
            '4. Difokuskan oleh Lensa Mata 🔍',
            '5. Bayangan ditangkap oleh Retina di belakang 🎯',
            '6. Dikirim lewat Saraf Optik ke Otak: "Kita melihat pohon!" 🧠🎉'
          ];
          let stepIdx = 0;
          stepText.textContent = steps[0];
          lightRay.setAttribute('stroke', '#22C55E');
          lightRay.setAttribute('stroke-width', '5');
          const timer = setInterval(() => {
            stepIdx++;
            if (stepIdx < steps.length) {
              stepText.textContent = steps[stepIdx];
            } else {
              clearInterval(timer);
              lightRay.setAttribute('stroke', '#FACC15');
              lightRay.setAttribute('stroke-width', '3.5');
            }
          }, 900);
        });
      }
    }
  }

  // =========================================================================
  // 6. NAVIGASI LAYAR, MATERI, KUIS & PREVIEW AKHIR
  // =========================================================================
  function switchScreen(screenId) {
    playClickSound();
    document.querySelectorAll('.screen').forEach(scr => {
      scr.classList.add('hidden');
      scr.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
      state.activeScreen = screenId;
    }
    const globalHeader = document.getElementById('global-header');
    if (screenId === 'screen-start') globalHeader.classList.add('hidden');
    else globalHeader.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderHearts() {
    const heartsRow = document.getElementById('hearts-row');
    if (!heartsRow) return;
    heartsRow.innerHTML = '';
    for (let i = 1; i <= state.maxHearts; i++) {
      const heartSpan = document.createElement('span');
      heartSpan.className = 'heart-icon';
      heartSpan.setAttribute('data-index', i);
      if (i <= state.hearts) heartSpan.textContent = '❤️';
      else { heartSpan.textContent = '💔'; heartSpan.classList.add('lost'); }
      heartsRow.appendChild(heartSpan);
    }
  }

  function decreaseHeart() {
    if (state.hearts > 0) {
      state.hearts--;
      playHeartLostSound();
      renderHearts();
      const lostIcon = document.querySelector(`.heart-icon[data-index="${state.hearts + 1}"]`);
      if (lostIcon) lostIcon.classList.add('shake');
      if (state.hearts <= 0) setTimeout(() => switchScreen('screen-gameover'), 900);
    }
  }

  function refillHearts() {
    state.hearts = 5;
    renderHearts();
  }

  function loadMaterialModule(moduleType, startSlideIndex = 0) {
    state.activeModule = moduleType;
    state.currentSlide = startSlideIndex;
    if (moduleType === 'B') pauseTimer();
    renderSlide(materialData[moduleType], state.currentSlide);
    switchScreen('screen-material');
  }

  function renderSlide(moduleData, slideIndex) {
    const slide = moduleData.slides[slideIndex];
    const totalSlides = moduleData.slides.length;
    document.getElementById('slide-indicator').textContent = `Slide ${slideIndex + 1} dari ${totalSlides}`;

    const stepper = document.getElementById('material-stepper');
    stepper.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (i === slideIndex ? ' active' : i < slideIndex ? ' completed' : '');
      dot.addEventListener('click', () => { state.currentSlide = i; renderSlide(moduleData, i); });
      stepper.appendChild(dot);
    }

    const btnPrev = document.getElementById('btn-slide-prev');
    const btnNext = document.getElementById('btn-slide-next');
    const btnDirectQuiz = document.getElementById('btn-slide-quiz-direct');

    btnPrev.style.display = slideIndex === 0 ? 'none' : 'inline-flex';
    if (slideIndex === totalSlides - 1) {
      btnNext.style.display = 'none';
      btnDirectQuiz.classList.remove('hidden');
    } else {
      btnNext.style.display = 'inline-flex';
      btnDirectQuiz.classList.add('hidden');
    }

    document.getElementById('material-slide-card').innerHTML = `
      <div class="slide-header">
        <div class="slide-title-wrap">
          <span class="slide-icon">${slide.icon}</span>
          <div>
            <h2 class="slide-title">${slide.title}</h2>
            <p class="slide-subtitle">${slide.subtitle}</p>
          </div>
        </div>
      </div>
      <div class="slide-body">
        <div class="slide-text-col">
          <div class="slide-para">${slide.text}</div>
          <div class="slide-highlight-box">💡 <strong>Catatan Pintar:</strong> ${slide.highlight}</div>
          <div class="slide-guide-box">
            <img src="${slide.speakerImg}" alt="${slide.speaker}" class="slide-guide-avatar">
            <div class="slide-guide-text">
              <strong>Pesan ${slide.speaker}:</strong> "${slide.bubble}"
            </div>
          </div>
        </div>
        <div class="slide-widget-col">${getWidgetHtml(slide.hasWidget)}</div>
      </div>
    `;
    attachWidgetListeners(slide.hasWidget);
  }

  function startQuiz(quizPackType) {
    state.quizPack = quizPackType;
    state.quizIndex = 0;
    renderHearts();
    if (quizPackType === 'A') {
      state.timerAccumulatedSec = 0;
      state.totalDurationSec = 0;
      state.startTime = null;
      const timerText = document.getElementById('header-timer-text');
      if (timerText) timerText.textContent = '00:00';
      startOrResumeTimer();
    } else if (quizPackType === 'B') {
      startOrResumeTimer();
    }
    loadQuestion(state.quizPack, state.quizIndex);
    switchScreen('screen-quiz');
  }

  function loadQuestion(pack, index) {
    const questions = quizBank[pack];
    const q = questions[index];
    document.getElementById('quiz-pack-title').textContent = pack === 'A' ? 'Kuis Modul A: Simulasi Cahaya' : 'Kuis Modul B: Cara Kerja Mata';
    document.getElementById('quiz-number-tag').textContent = `Soal ${index + 1} dari ${questions.length}`;
    document.getElementById('quiz-progress-fill').style.width = `${((index + 1) / questions.length) * 100}%`;
    document.getElementById('quiz-question-text').textContent = q.question;
    document.getElementById('quiz-illustration').innerHTML = getQuizIllustrationSvg(q.illustrationType);

    const optList = document.getElementById('quiz-options-list');
    optList.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span class="opt-letter">${letter}</span><span class="opt-text">${opt.text}</span>`;
      btn.addEventListener('click', () => handleAnswerSelect(opt.key, q, btn));
      optList.appendChild(btn);
    });

    const feedbackBox = document.getElementById('quiz-feedback-box');
    feedbackBox.className = 'quiz-feedback-box hidden';
    document.getElementById('btn-quiz-retry').classList.add('hidden');
  }

  function handleAnswerSelect(selectedKey, questionObj, selectedBtn) {
    initAudioContext();
    const isCorrect = selectedKey === questionObj.correct;
    document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

    const feedbackBox = document.getElementById('quiz-feedback-box');
    const feedbackBadge = document.getElementById('feedback-badge');
    const feedbackMascotImg = document.getElementById('feedback-mascot-img');
    const feedbackExp = document.getElementById('feedback-explanation');
    const btnRetry = document.getElementById('btn-quiz-retry');
    const btnNext = document.getElementById('btn-quiz-next');

    state.quizHistory[`${state.quizPack}-${questionObj.id}`] = {
      questionId: questionObj.id,
      questionText: questionObj.question,
      userAnswer: selectedKey,
      correctAnswer: questionObj.correct,
      isCorrect,
      explanation: questionObj.explanation
    };

    feedbackBox.classList.remove('hidden');

    if (isCorrect) {
      playCorrectSound();
      selectedBtn.classList.add('correct');
      feedbackBox.classList.remove('state-wrong');
      feedbackBox.classList.add('state-correct');
      feedbackBadge.textContent = '🎉 HEBAT, JAWABANMU BENAR!';
      feedbackMascotImg.src = './Lumi.png';
      feedbackExp.innerHTML = `<strong>Alasan / Pembahasan:</strong><br>${questionObj.explanation}`;
      btnRetry.classList.add('hidden');
      btnNext.textContent = state.quizIndex === 4 ? 'Lihat Hasil Kuis! 🏆' : 'Lanjut ke Soal Berikutnya ➡️';
    } else {
      playWrongSound();
      selectedBtn.classList.add('wrong');
      feedbackBox.classList.remove('state-correct');
      feedbackBox.classList.add('state-wrong');
      feedbackBadge.textContent = '❌ YAH, JAWABANMU BELUM TEPAT! (-1 HATI)';
      feedbackMascotImg.src = './Lumi.png';
      feedbackExp.innerHTML = `Ayo coba pikirkan lagi atau ingat kembali materi tadi! Hatimu berkurang 1 (💔).<br>Klik <strong>"🔄 Coba Jawab Ulang Soal Ini"</strong> atau <strong>"Lewati & Lanjut"</strong>.`;
      decreaseHeart();
      btnRetry.classList.remove('hidden');
      btnNext.textContent = 'Lewati & Lanjut ➡️';
    }
  }

  function retryCurrentQuestion() {
    playClickSound();
    loadQuestion(state.quizPack, state.quizIndex);
  }

  function getQuizIllustrationSvg(type) {
    switch (type) {
      case 'pencil-water':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><rect width="200" height="160" fill="#F8FAFC"/><path d="M 60 30 L 70 140 Q 70 150 85 150 L 115 150 Q 130 150 130 140 L 140 30 Z" fill="#E0F2FE" stroke="#0284C7" stroke-width="2"/><path d="M 65 75 Q 100 80 135 75 L 130 140 Q 130 148 115 148 L 85 148 Q 70 148 70 140 Z" fill="#0284C7" opacity="0.65"/><line x1="85" y1="20" x2="100" y2="75" stroke="#FFB703" stroke-width="6" stroke-linecap="round"/><line x1="110" y1="75" x2="125" y2="135" stroke="#92400E" stroke-width="6" stroke-linecap="round"/></svg>`;
      case 'refraction-ray':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><rect width="200" height="160" fill="#F8FAFC"/><rect x="0" y="80" width="200" height="80" fill="#BAE6FD" opacity="0.6"/><line x1="100" y1="20" x2="100" y2="140" stroke="#94A3B8" stroke-dasharray="4,4"/><path d="M 40 30 L 100 80 L 140 145" fill="none" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/></svg>`;
      case 'bending-wave':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><rect width="200" height="160" fill="#F8FAFC"/><circle cx="100" cy="80" r="45" fill="#FEF08A" stroke="#F59E0B" stroke-width="3"/><path d="M 60 70 Q 100 110 140 60" fill="none" stroke="#EA580C" stroke-width="5" stroke-linecap="round"/><text x="45" y="145" font-family="Fredoka" font-size="12" font-weight="bold" fill="#B45309">Arah Cahaya Membelok</text></svg>`;
      case 'rainbow-cloud':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><rect width="200" height="160" fill="#F0F9FF"/><circle cx="50" cy="50" r="22" fill="#FBBF24"/><ellipse cx="140" cy="55" rx="35" ry="20" fill="#94A3B8"/><path d="M 50 140 A 60 60 0 0 1 170 140" fill="none" stroke="#EF4444" stroke-width="4"/><path d="M 55 140 A 55 55 0 0 1 165 140" fill="none" stroke="#F97316" stroke-width="4"/><path d="M 60 140 A 50 50 0 0 1 160 140" fill="none" stroke="#EAB308" stroke-width="4"/><path d="M 65 140 A 45 45 0 0 1 155 140" fill="none" stroke="#22C55E" stroke-width="4"/><path d="M 70 140 A 40 40 0 0 1 150 140" fill="none" stroke="#06B6D4" stroke-width="4"/><path d="M 75 140 A 35 35 0 0 1 145 140" fill="none" stroke="#A855F7" stroke-width="4"/></svg>`;
      case 'rainbow-spectrum':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><g transform="translate(25, 18)"><rect x="0" y="0" width="150" height="15" fill="#EF4444" rx="4"/><rect x="0" y="17" width="150" height="15" fill="#F97316" rx="4"/><rect x="0" y="34" width="150" height="15" fill="#EAB308" rx="4"/><rect x="0" y="51" width="150" height="15" fill="#22C55E" rx="4"/><rect x="0" y="68" width="150" height="15" fill="#06B6D4" rx="4"/><rect x="0" y="85" width="150" height="15" fill="#3B82F6" rx="4"/><rect x="0" y="102" width="150" height="15" fill="#A855F7" rx="4"/><text x="35" y="132" font-family="Fredoka" font-size="12" font-weight="bold" fill="#1E293B">7 Warna Pelangi</text></g></svg>`;
      case 'eye-view':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><path d="M 35 80 Q 100 25 165 80 Q 100 135 35 80 Z" fill="#FFFFFF" stroke="#0284C7" stroke-width="4"/><circle cx="100" cy="80" r="28" fill="#78350F"/><circle cx="100" cy="80" r="14" fill="#0F172A"/><circle cx="93" cy="73" r="5" fill="#FFFFFF"/></svg>`;
      case 'cornea-spot':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><path d="M 75 45 A 45 45 0 1 1 75 115" fill="#FFFFFF" stroke="#64748B" stroke-width="3"/><path d="M 75 45 C 48 60, 48 100, 75 115" fill="#BAE6FD" stroke="#0284C7" stroke-width="4"/><circle cx="54" cy="80" r="7" fill="#EF4444"/><text x="35" y="142" font-family="Fredoka" font-size="12" font-weight="bold" fill="#0284C7">Kornea (Paling Depan)</text></svg>`;
      case 'lens-focus':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><path d="M 95 35 C 115 55, 115 105, 95 125 C 75 105, 75 55, 95 35 Z" fill="#BAE6FD" stroke="#0284C7" stroke-width="3"/><line x1="20" y1="50" x2="85" y2="65" stroke="#F59E0B" stroke-width="3"/><line x1="20" y1="110" x2="85" y2="95" stroke="#F59E0B" stroke-width="3"/><line x1="105" y1="65" x2="175" y2="80" stroke="#EF4444" stroke-width="3"/><line x1="105" y1="95" x2="175" y2="80" stroke="#EF4444" stroke-width="3"/><text x="40" y="148" font-family="Fredoka" font-size="11" font-weight="bold" fill="#0284C7">Lensa Memfokuskan Cahaya</text></svg>`;
      case 'retina-screen':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><circle cx="95" cy="80" r="52" fill="#FFFFFF" stroke="#64748B" stroke-width="3"/><path d="M 132 38 A 48 48 0 0 1 132 122" fill="none" stroke="#F59E0B" stroke-width="7" stroke-linecap="round"/><text x="32" y="148" font-family="Fredoka" font-size="11" font-weight="bold" fill="#B45309">Retina (Belakang Mata)</text></svg>`;
      case 'light-path-first':
        return `<svg viewBox="0 0 200 160" width="100%" height="100%"><line x1="20" y1="80" x2="72" y2="80" stroke="#F59E0B" stroke-width="5" stroke-linecap="round"/><path d="M 85 45 C 60 60, 60 100, 85 115" fill="none" stroke="#0284C7" stroke-width="6"/><text x="98" y="85" font-family="Fredoka" font-size="12" font-weight="bold" fill="#0284C7">Kornea</text></svg>`;
      default:
        return `<div style="font-size:3rem;">🔬💡</div>`;
    }
  }

  function finishQuiz(pack) {
    playCelebrationSound();
    const questions = quizBank[pack];
    let correctCount = 0;
    questions.forEach(q => {
      const hist = state.quizHistory[`${pack}-${q.id}`];
      if (hist && hist.isCorrect) correctCount++;
    });

    const score = correctCount * 20;
    if (pack === 'A') {
      state.scores.modulA = score;
      document.getElementById('badge-score-a').textContent = `${score} / 100`;
      state.isModuleBUnlocked = true;
      updateModuleLockUI();
    } else {
      state.scores.modulB = score;
      document.getElementById('badge-score-b').textContent = `${score} / 100`;
      stopTimer();
      saveCurrentPlayerToLeaderboard();
    }

    document.getElementById('complete-title').textContent = pack === 'A' ? 'Kuis Modul Cahaya Selesai!' : 'Kuis Modul Mata Selesai!';
    document.getElementById('complete-score').textContent = score;
    const completeMsg = document.getElementById('complete-message');
    if (pack === 'A') {
      completeMsg.innerHTML = `Kamu berhasil menjawab ${correctCount} dari 5 soal dengan benar!<br><div style="margin-top:10px; background:#DCFCE7; color:#15803D; padding:10px; border-radius:14px; font-weight:800;">🔓 GEMBOK MODUL B TELAH TERBUKA! 🔓</div>`;
    } else {
      completeMsg.innerHTML = `Luar biasa ${escapeHtml(state.playerName || 'Siswa')}! Kamu menjawab ${correctCount} dari 5 soal dengan benar!<br><div style="margin-top:10px; background:#EFF6FF; color:#1D4ED8; padding:10px; border-radius:14px; font-weight:800;">⏱️ Total Waktu: ${formatDuration(state.totalDurationSec)}</div>`;
    }

    const btnNextModule = document.getElementById('btn-complete-next-module');
    if (pack === 'A') {
      btnNextModule.textContent = '🚀 Lanjut ke Modul B (Cara Kerja Mata) 🔓';
      btnNextModule.onclick = () => loadMaterialModule('B', 0);
    } else {
      btnNextModule.textContent = '🏆 Lihat Rekapitulasi & Papan Peringkat';
      btnNextModule.onclick = () => renderFinalPreview();
    }
    switchScreen('screen-quiz-complete');
  }

  function renderFinalPreview() {
    stopTimer();
    const scA = state.scores.modulA;
    const scB = state.scores.modulB;
    document.getElementById('final-score-a').textContent = scA !== null ? `${scA} / 100` : 'Belum Dikerjakan';
    document.getElementById('final-status-a').textContent = scA !== null ? (scA >= 80 ? '🌟 Sangat Membanggakan!' : '👍 Terus Belajar!') : 'Pilih di Menu Utama';
    document.getElementById('final-score-b').textContent = scB !== null ? `${scB} / 100` : 'Belum Dikerjakan';
    document.getElementById('final-status-b').textContent = scB !== null ? (scB >= 80 ? '🌟 Sangat Membanggakan!' : '👍 Terus Belajar!') : 'Pilih di Menu Utama';

    const elTimeSpent = document.getElementById('final-time-spent');
    if (elTimeSpent) elTimeSpent.textContent = formatDuration(state.totalDurationSec);

    let totalCorrect = 0;
    const allQuestions = [...quizBank.A, ...quizBank.B];
    allQuestions.forEach(q => {
      const pack = q.id <= 5 ? 'A' : 'B';
      const hist = state.quizHistory[`${pack}-${q.id}`];
      if (hist && hist.isCorrect) totalCorrect++;
    });

    document.getElementById('final-total-score').textContent = `${totalCorrect} / 10 Benar`;
    const elRating = document.getElementById('final-star-rating');
    elRating.textContent = totalCorrect >= 9 ? '⭐⭐⭐⭐⭐ (Ilmuwan Jenius!)' : totalCorrect >= 7 ? '⭐⭐⭐⭐ (Siswa Berprestasi!)' : totalCorrect >= 5 ? '⭐⭐⭐ (Pintar & Bersemangat!)' : '⭐⭐ (Ayo Coba Lagi!)';

    if (scA !== null && scB !== null) {
      saveCurrentPlayerToLeaderboard();
    } else {
      renderAllLeaderboards(cachedLeaderboardList);
    }
    updateLeaderboardResetBadge();

    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    allQuestions.forEach((q, idx) => {
      const pack = q.id <= 5 ? 'A' : 'B';
      const hist = state.quizHistory[`${pack}-${q.id}`];
      let statusClass = 'status-unanswered';
      let statusPill = '<span class="review-status-pill pill-belum">Belum Dikerjakan</span>';
      if (hist) {
        statusClass = hist.isCorrect ? 'status-correct' : 'status-wrong';
        statusPill = hist.isCorrect ? '<span class="review-status-pill pill-benar">✅ BENAR</span>' : '<span class="review-status-pill pill-salah">❌ KURANG TEPAT</span>';
      }
      const optObj = q.options.find(o => o.key === q.correct);
      const correctAnswerText = optObj ? `${q.correct.toUpperCase()}. ${optObj.text}` : '';
      const itemDiv = document.createElement('div');
      itemDiv.className = `review-item ${statusClass}`;
      itemDiv.innerHTML = `
        <div class="review-item-header">
          <span class="review-q-num">Soal #${idx + 1} (${pack === 'A' ? 'Cahaya' : 'Mata'})</span>
          ${statusPill}
        </div>
        <div class="review-q-text">${q.question}</div>
        <div class="review-q-answer"><strong>Kunci Jawaban:</strong> ${correctAnswerText}</div>
        <div class="review-q-reason"><strong>Pembahasan:</strong> ${q.explanation}</div>
      `;
      reviewList.appendChild(itemDiv);
    });
    switchScreen('screen-final-score');
  }

  // =========================================================================
  // 7. EVENT LISTENERS
  // =========================================================================
  document.getElementById('btn-sound-toggle').addEventListener('click', toggleSound);
  const startSoundBtn = document.getElementById('btn-start-sound');
  if (startSoundBtn) startSoundBtn.addEventListener('click', toggleSound);

  document.getElementById('btn-header-home').addEventListener('click', () => switchScreen('screen-menu'));

  document.getElementById('btn-start-game').addEventListener('click', () => {
    const inputName = document.getElementById('input-student-name');
    const nameVal = inputName ? inputName.value.trim() : '';
    const validationMsg = document.getElementById('name-validation-msg');
    if (!nameVal) {
      playWrongSound();
      if (validationMsg) validationMsg.classList.remove('hidden');
      if (inputName) inputName.focus();
      return;
    }
    if (validationMsg) validationMsg.classList.add('hidden');
    state.playerName = nameVal;
    document.getElementById('header-player-name').textContent = nameVal;
    document.getElementById('mascot-welcome-title').textContent = `Selamat Datang, ${nameVal}! 🔬`;

    initAudioContext();
    startBgmLoop();
    renderHearts();
    state.timerAccumulatedSec = 0;
    state.totalDurationSec = 0;
    state.startTime = null;
    document.getElementById('header-timer-text').textContent = '00:00';
    updateModuleLockUI();
    switchScreen('screen-menu');
  });

  document.getElementById('btn-modul-a-materi').addEventListener('click', () => loadMaterialModule('A', 0));
  document.getElementById('btn-modul-a-kuis').addEventListener('click', () => startQuiz('A'));
  document.getElementById('btn-modul-b-materi').addEventListener('click', () => { if (state.isModuleBUnlocked) loadMaterialModule('B', 0); });
  document.getElementById('btn-modul-b-kuis').addEventListener('click', () => { if (state.isModuleBUnlocked) startQuiz('B'); });
  document.getElementById('btn-goto-final-preview').addEventListener('click', () => renderFinalPreview());
  document.getElementById('btn-material-back-menu').addEventListener('click', () => switchScreen('screen-menu'));

  document.getElementById('btn-slide-prev').addEventListener('click', () => {
    playClickSound();
    if (state.currentSlide > 0) { state.currentSlide--; renderSlide(materialData[state.activeModule], state.currentSlide); }
  });
  document.getElementById('btn-slide-next').addEventListener('click', () => {
    playClickSound();
    const total = materialData[state.activeModule].slides.length;
    if (state.currentSlide < total - 1) { state.currentSlide++; renderSlide(materialData[state.activeModule], state.currentSlide); }
  });
  document.getElementById('btn-slide-quiz-direct').addEventListener('click', () => startQuiz(state.activeModule));

  document.getElementById('btn-quiz-retry').addEventListener('click', retryCurrentQuestion);
  document.getElementById('btn-quiz-next').addEventListener('click', () => {
    playClickSound();
    const questions = quizBank[state.quizPack];
    if (state.quizIndex < questions.length - 1) { state.quizIndex++; loadQuestion(state.quizPack, state.quizIndex); }
    else finishQuiz(state.quizPack);
  });

  document.getElementById('btn-complete-to-rekap').addEventListener('click', () => renderFinalPreview());
  document.getElementById('btn-complete-to-menu').addEventListener('click', () => switchScreen('screen-menu'));

  document.getElementById('btn-gameover-refill').addEventListener('click', () => {
    playClickSound();
    refillHearts();
    loadQuestion(state.quizPack, state.quizIndex);
    switchScreen('screen-quiz');
  });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => { refillHearts(); switchScreen('screen-menu'); });

  document.getElementById('btn-repeat-yes').addEventListener('click', () => {
    playClickSound();
    currentDeviceEntryId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem('IPAS_DEVICE_ENTRY_ID', currentDeviceEntryId);

    state.scores.modulA = null;
    state.scores.modulB = null;
    state.quizHistory = {};
    state.isModuleBUnlocked = false;
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    state.timerAccumulatedSec = 0;
    state.totalDurationSec = 0;
    state.startTime = null;
    document.getElementById('header-timer-text').textContent = '00:00';
    document.getElementById('badge-score-a').textContent = 'Belum Dikerjakan';
    document.getElementById('badge-score-b').textContent = 'Belum Dikerjakan';
    refillHearts();
    updateModuleLockUI();
    switchScreen('screen-menu');
  });

  document.getElementById('btn-repeat-no').addEventListener('click', () => { playCelebrationSound(); stopTimer(); switchScreen('screen-goodbye'); });
  document.getElementById('btn-goodbye-restart').addEventListener('click', () => {
    playClickSound();
    currentDeviceEntryId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem('IPAS_DEVICE_ENTRY_ID', currentDeviceEntryId);

    refillHearts();
    state.scores.modulA = null;
    state.scores.modulB = null;
    state.quizHistory = {};
    state.isModuleBUnlocked = false;
    document.getElementById('badge-score-a').textContent = 'Belum Dikerjakan';
    document.getElementById('badge-score-b').textContent = 'Belum Dikerjakan';
    switchScreen('screen-start');
  });

  // Leaderboard & Modals
  const openLb = () => {
    playClickSound();
    subscribeToLiveLeaderboard();
    updateLeaderboardResetBadge();
    document.getElementById('modal-leaderboard').classList.remove('hidden');
  };
  document.getElementById('btn-open-leaderboard').addEventListener('click', openLb);
  document.getElementById('btn-start-leaderboard').addEventListener('click', openLb);
  document.getElementById('btn-refresh-leaderboard').addEventListener('click', () => {
    playClickSound();
    subscribeToLiveLeaderboard();
    updateLeaderboardResetBadge();
  });

  // Modal Profil Pengembang
  const openDevModal = () => {
    playClickSound();
    document.getElementById('modal-developer').classList.remove('hidden');
  };
  document.getElementById('btn-open-dev').addEventListener('click', openDevModal);
  document.getElementById('btn-start-dev').addEventListener('click', openDevModal);

  document.getElementById('btn-open-tujuan').addEventListener('click', () => { playClickSound(); document.getElementById('modal-tujuan').classList.remove('hidden'); });
  document.getElementById('btn-open-tools').addEventListener('click', () => { playClickSound(); document.getElementById('modal-tools').classList.remove('hidden'); });
  document.getElementById('btn-open-tutorial').addEventListener('click', () => { playClickSound(); document.getElementById('modal-tutorial').classList.remove('hidden'); });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playClickSound();
      const modal = document.getElementById(e.currentTarget.getAttribute('data-close'));
      if (modal) modal.classList.add('hidden');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) e.target.classList.add('hidden'); });
  });

  // Inisialisasi awal
  renderHearts();
  updateModuleLockUI();
  updateLeaderboardResetBadge();
  subscribeToLiveLeaderboard();
});