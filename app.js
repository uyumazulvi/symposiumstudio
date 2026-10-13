// ==========================================================================
// SYMPOSIUM STUDIO — İLERİ SEVİYE SES, AKSAN VE ÇOK DİLLİ ÇEVİRİ MOTORU
// ==========================================================================

// Uygulama Çekirdek Durumu (State)
let currentMode = 'ptt'; // 'ptt' (Bas-Konuş) | 'tap' (Sürekli Akış)
let isRecording = false;
let isRecognitionActive = false;
let isRecognitionStopping = false;
let isPttActive = false;
let isSessionWarm = false;
let pttReleaseTimer = null;
let pendingLangSwitch = null;
let pendingStartSpeakerId = null;
let recognition = null;
let activeSpeakerId = null;
let geminiApiKey = '';
let currentFilter = 'all'; // 'all' | 'tr'
let currentFontSize = 'standard';

// Sesli Tercüman (TTS / Kulaklıkla Dinleme) Durumu
let isTtsActive = false;
let ttsSpeed = 1.05; // Canlı kongre için akıcı eşzamanlı hız
let ttsSpeechQueue = [];
let isTtsSpeaking = false;
let availableVoices = [];
let currentTtsUtterance = null;

// Dil Ayarları (Toplantı Dili & Çevrilecek Hedef Dil)
let sourceLanguage = 'en-US'; // Sahnede konuşulan dil
let targetLanguage = 'tr';    // Hedef çeviri dili

// Audio Metre (Web Audio API Stüdyo VU LED)
let audioContext = null;
let analyser = null;
let microphoneStream = null;
let isVuMeterRunning = false;

// Dil Sözlüğü (İsimler ve Kodlar)
const LANGUAGE_NAMES = {
  'tr': 'Türkçe',
  'en': 'İngilizce',
  'de': 'Almanca',
  'fr': 'Fransızca',
  'es': 'İspanyolca',
  'it': 'İtalyanca',
  'ru': 'Rusça',
  'ar': 'Arapça',
  'zh': 'Çince',
  'ja': 'Japonca'
};

const SOURCE_LANG_NAMES = {
  'en-US': 'İngilizce (ABD)',
  'en-GB': 'İngilizce (İngiltere)',
  'en-IN': 'İngilizce (Hint / Asya)',
  'en-AU': 'İngilizce (Avustralya)',
  'de-DE': 'Almanca',
  'fr-FR': 'Fransızca',
  'es-ES': 'İspanyolca',
  'it-IT': 'İtalyanca',
  'ru-RU': 'Rusça',
  'ar-SA': 'Arapça',
  'zh-CN': 'Çince',
  'ja-JP': 'Japonca',
  'tr-TR': 'Türkçe'
};

// Dil Kısa Kodları (Soundboard Pad Rozetleri İçin)
const LANGUAGE_SHORT_CODES = {
  'tr': 'TR',
  'en': 'EN',
  'de': 'DE',
  'fr': 'FR',
  'es': 'ES',
  'it': 'IT',
  'ru': 'RU',
  'ar': 'AR',
  'zh': 'ZH',
  'ja': 'JA'
};

// Aksan & Bölge Veri Tabanı
const ACCENT_REGISTRY = {
  'en-US': { name: 'Amerikan İngilizcesi', short: 'EN', flag: 'US', code: 'en-US' },
  'en-GB': { name: 'İngiliz İngilizcesi', short: 'EN', flag: 'UK', code: 'en-GB' },
  'en-IN': { name: 'Hint / Güney Asya', short: 'EN', flag: 'IN', code: 'en-IN' },
  'en-AU': { name: 'Avustralya İngilizcesi', short: 'EN', flag: 'AU', code: 'en-AU' },
  'de-DE': { name: 'Almanca', short: 'DE', flag: 'DE', code: 'de-DE' },
  'fr-FR': { name: 'Fransızca', short: 'FR', flag: 'FR', code: 'fr-FR' },
  'es-ES': { name: 'İspanyolca', short: 'ES', flag: 'ES', code: 'es-ES' },
  'it-IT': { name: 'İtalyanca', short: 'IT', flag: 'IT', code: 'it-IT' },
  'ru-RU': { name: 'Rusça', short: 'RU', flag: 'RU', code: 'ru-RU' },
  'ar-SA': { name: 'Arapça', short: 'AR', flag: 'SA', code: 'ar-SA' },
  'zh-CN': { name: 'Çince (Mandarin)', short: 'ZH', flag: 'CN', code: 'zh-CN' },
  'ja-JP': { name: 'Japonca', short: 'JA', flag: 'JP', code: 'ja-JP' },
  'tr-TR': { name: 'Türkçe', short: 'TR', flag: 'TR', code: 'tr-TR' }
};

// Hedef Dilden Konuşma Tanıma Koduna Eşleme
const DEFAULT_SPEECH_LOCALES = {
  'tr': 'tr-TR',
  'en': 'en-US',
  'de': 'de-DE',
  'fr': 'fr-FR',
  'es': 'es-ES',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'zh': 'zh-CN',
  'ja': 'ja-JP'
};

// Profesyonel Konuşmacı Renk Paleti (Editoryal & Muted)
const STUDIO_ACCENTS = [
  '#65C7B0', // Kontrollü Turkuaz
  '#D6A66B', // Muted Amber
  '#8EAA90', // Adaçayı Yeşili
  '#8E9AAF', // Arduvaz Mavisi
  '#C98B75', // Sıcak Terracotta
  '#A09F96'  // Nötr Taş
];

// Varsayılan Konuşmacı Havuzu (Konuşmacı 1 İngilizce, Konuşmacı 2 Almanca, Konuşmacı 3 Türkçe)
let speakers = [
  { id: 'spk_1', name: 'Konuşmacı 1 (İngilizce)', accent: 'en-US', color: '#65C7B0' },
  { id: 'spk_2', name: 'Konuşmacı 2 (Almanca)', accent: 'de-DE', color: '#D6A66B' },
  { id: 'spk_3', name: 'Konuşmacı 3 (Türkçe)', accent: 'tr-TR', color: '#8EAA90' }
];

// Oturum Tutanak Arşivi
let transcriptHistory = [];

// DOM Önbelleği
const recordingPill = document.getElementById('recordingPill');
const statusLabel = document.getElementById('statusLabel');
const vuLeds = document.getElementById('vuLeds');
const modePttBtn = document.getElementById('modePttBtn');
const modeTapBtn = document.getElementById('modeTapBtn');

// Sekmeler & Görünümler
const tabLiveBtn = document.getElementById('tabLiveBtn');
const tabLangBtn = document.getElementById('tabLangBtn');
const viewLiveSection = document.getElementById('viewLiveSection');
const viewLanguageSection = document.getElementById('viewLanguageSection');
const headerNativeLangSelect = document.getElementById('headerNativeLangSelect');
const activeLangBadgePill = document.getElementById('activeLangBadgePill');
const quickLangBadgeBtn = document.getElementById('quickLangBadgeBtn');
const stageLangRouteBadge = document.getElementById('stageLangRouteBadge');
const badgeSourceText = document.getElementById('badgeSourceText');
const badgeTargetText = document.getElementById('badgeTargetText');
const targetLangLabelBadge = document.getElementById('targetLangLabelBadge');

// Dil Paneli Girişleri
const meetingSourceLangSelect = document.getElementById('meetingSourceLangSelect');
const meetingTargetLangSelect = document.getElementById('meetingTargetLangSelect');
const swapLanguagesBtn = document.getElementById('swapLanguagesBtn');
const applyLangSettingsBtn = document.getElementById('applyLangSettingsBtn');
const presetPills = document.querySelectorAll('.preset-pill');

// Canlı Sahne Elemanları
const activeSpeakerNameDisplay = document.getElementById('activeSpeakerNameDisplay');
const activeSpeakerAccentDisplay = document.getElementById('activeSpeakerAccentDisplay');
const speakerAvatarDot = document.getElementById('speakerAvatarDot');
const liveEngineBadge = document.getElementById('liveEngineBadge');
const stagePttBtn = document.getElementById('stagePttBtn');
const liveOriginalStream = document.getElementById('liveOriginalStream');
const liveTranslationStream = document.getElementById('liveTranslationStream');
const transcriptFeed = document.getElementById('transcriptFeed');
const emptyNotice = document.getElementById('emptyNotice');
const historyCounter = document.getElementById('historyCounter');
const dockInstructionText = document.getElementById('dockInstructionText');
const soundboardGrid = document.getElementById('soundboardGrid');
const stopSessionBtn = document.getElementById('stopSessionBtn');

// Mobil Çekmece (Expandable Drawer) Elemanları
const switcherConsole = document.getElementById('switcherConsole') || document.querySelector('.switcher-console');
const mobileDrawerHeader = document.getElementById('mobileDrawerHeader');
const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
const mobileDrawerExpandBtn = document.getElementById('mobileDrawerExpandBtn');
const mobileDrawerCloseBtn = document.getElementById('mobileDrawerCloseBtn');
const mobileDrawerHandleBtn = document.getElementById('mobileDrawerHandleBtn');
const drawerAddSpeakerBtn = document.getElementById('drawerAddSpeakerBtn');
const drawerSpeakerCountBadge = document.getElementById('drawerSpeakerCountBadge');
const mobileDrawerExpandCount = document.getElementById('mobileDrawerExpandCount');

// Modallar ve Ayarlar
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const ttsSpeedSelect = document.getElementById('ttsSpeedSelect');
const headphoneTtsBtn = document.getElementById('headphoneTtsBtn');

const addNewSpeakerBtn = document.getElementById('addNewSpeakerBtn');
const addSpeakerModal = document.getElementById('addSpeakerModal');
const closeAddSpeakerBtn = document.getElementById('closeAddSpeakerBtn');
const cancelAddSpeakerBtn = document.getElementById('cancelAddSpeakerBtn');
const addSpeakerForm = document.getElementById('addSpeakerForm');
const speakerNameInput = document.getElementById('speakerNameInput');
const speakerAccentInput = document.getElementById('speakerAccentInput');

const editSpeakerModal = document.getElementById('editSpeakerModal');
const closeEditSpeakerBtn = document.getElementById('closeEditSpeakerBtn');
const cancelEditSpeakerBtn = document.getElementById('cancelEditSpeakerBtn');
const deleteSpeakerBtn = document.getElementById('deleteSpeakerBtn');
const editSpeakerForm = document.getElementById('editSpeakerForm');
const editSpeakerIdInput = document.getElementById('editSpeakerIdInput');
const editSpeakerNameInput = document.getElementById('editSpeakerNameInput');
const editSpeakerAccentInput = document.getElementById('editSpeakerAccentInput');

const copyScriptBtn = document.getElementById('copyScriptBtn');
const downloadScriptBtn = document.getElementById('downloadScriptBtn');
const clearBtn = document.getElementById('clearBtn');
const viewAllBtn = document.getElementById('viewAllBtn');
const viewTrBtn = document.getElementById('viewTrBtn');

// Global Modal Kontrolleri
function openModal(modal) {
  if (!modal) return;
  closeMobileDrawer();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
}

// ==========================================================================
// 1. YAŞAM DÖNGÜSÜ & YEREL HAFIZA (STORAGE)
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  loadWorkspaceData();
  renderSoundboardPads();
  renderTranscriptFeed();
  initRecognitionEngine();
  initTtsEngine();
  initStudioVuMeter();
  setupEventListeners();
  updateLanguageDisplayBadges();

  if (speakers.length > 0) {
    setActiveSpeaker(speakers[0].id, false);
  }
  updateEngineBadge();
  updateStopButtonState(false);
  initPwaInstallationFlow();
});

// İlk kullanıcı etkileşiminde mikrofon akışını bağla ve kalıcı tut
window.addEventListener('pointerdown', () => {
  ensureMicrophoneAccess();
}, { once: true });

function loadWorkspaceData() {
  try {
    const s = localStorage.getItem('sym_speakers_v6');
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) {
        speakers = parsed;
      }
    } else {
      const sOld = localStorage.getItem('sym_speakers_v5') || localStorage.getItem('sym_speakers_v4');
      if (sOld) {
        const parsedOld = JSON.parse(sOld);
        if (Array.isArray(parsedOld) && parsedOld.length >= 1) {
          const hasTr = parsedOld.some(sp => (sp.accent || '').startsWith('tr'));
          if (!hasTr) {
            parsedOld.push({ id: 'spk_3', name: 'Konuşmacı 3 (Türkçe)', accent: 'tr-TR', color: '#8EAA90' });
          }
          speakers = parsedOld;
        }
      }
    }
    const h = localStorage.getItem('sym_history_v3');
    if (h) {
      transcriptHistory = JSON.parse(h);
      if (Array.isArray(transcriptHistory) && transcriptHistory.length >= 2) {
        const getTs = (item) => {
          if (item && item.timestamp) return item.timestamp;
          if (item && item.id && item.id.startsWith('tr_')) {
            const num = parseInt(item.id.replace('tr_', ''), 10);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        };
        const firstTs = getTs(transcriptHistory[0]);
        const lastTs = getTs(transcriptHistory[transcriptHistory.length - 1]);
        if (firstTs > 0 && lastTs > 0 && firstTs < lastTs) {
          transcriptHistory.reverse();
        }
      }
    }
    const k = localStorage.getItem('sym_gemini_key');
    if (k) {
      geminiApiKey = k;
      geminiApiKeyInput.value = k;
    }
    const m = localStorage.getItem('sym_mode_pref_v2');
    if (m === 'tap' || m === 'ptt') {
      setOperationMode(m, false);
    } else {
      setOperationMode('ptt', false);
    }
    const f = localStorage.getItem('sym_font_pref');
    if (f) {
      currentFontSize = f;
      fontSizeSelect.value = f;
      applyFontSize(f);
    }
    const src = localStorage.getItem('sym_source_lang');
    if (src) {
      sourceLanguage = src;
      if (meetingSourceLangSelect) meetingSourceLangSelect.value = src;
    }
    const tgt = localStorage.getItem('sym_target_lang_v2');
    if (tgt) {
      targetLanguage = tgt;
      if (meetingTargetLangSelect) meetingTargetLangSelect.value = tgt;
      if (headerNativeLangSelect) headerNativeLangSelect.value = tgt;
    } else {
      targetLanguage = 'tr';
      if (meetingTargetLangSelect) meetingTargetLangSelect.value = 'tr';
      if (headerNativeLangSelect) headerNativeLangSelect.value = 'tr';
    }
    const t = localStorage.getItem('sym_tts_pref');
    if (t === 'true') {
      isTtsActive = true;
    }
    const sp = localStorage.getItem('sym_tts_speed');
    if (sp) {
      const parsedSpeed = parseFloat(sp);
      if (!isNaN(parsedSpeed) && parsedSpeed >= 0.7 && parsedSpeed <= 1.5) {
        ttsSpeed = parsedSpeed;
        if (ttsSpeedSelect) ttsSpeedSelect.value = sp;
      }
    }
  } catch (err) {
    console.warn('Veri yükleme hatası:', err);
  }
}

function saveWorkspaceData() {
  try {
    localStorage.setItem('sym_speakers_v6', JSON.stringify(speakers));
    localStorage.setItem('sym_history_v3', JSON.stringify(transcriptHistory));
    localStorage.setItem('sym_gemini_key', geminiApiKey);
    localStorage.setItem('sym_mode_pref_v2', currentMode);
    localStorage.setItem('sym_mode_pref', currentMode);
    localStorage.setItem('sym_font_pref', currentFontSize);
    localStorage.setItem('sym_source_lang', sourceLanguage);
    localStorage.setItem('sym_target_lang_v2', targetLanguage);
    localStorage.setItem('sym_target_lang', targetLanguage);
    localStorage.setItem('sym_tts_pref', isTtsActive ? 'true' : 'false');
    localStorage.setItem('sym_tts_speed', ttsSpeed.toString());
  } catch (err) {
    console.warn('Veri kayıt hatası:', err);
  }
}

function updateEngineBadge() {
  if (!liveEngineBadge) return;
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    liveEngineBadge.textContent = 'GEMINI PRO';
    liveEngineBadge.classList.remove('hidden');
    liveEngineBadge.style.color = '#D6A66B';
    liveEngineBadge.style.borderColor = 'rgba(214, 166, 107, 0.35)';
    liveEngineBadge.style.backgroundColor = 'rgba(214, 166, 107, 0.12)';
  } else {
    liveEngineBadge.textContent = '';
    liveEngineBadge.classList.add('hidden');
  }
}

// ==========================================================================
// 2. DİL DEĞİŞİKLİKLERİ VE GÖSTERGE GÜNCELLEMELERİ
// ==========================================================================
function updateLanguageDisplayBadges() {
  const activeSpk = getActiveSpeaker();
  const spkLocale = getSpeakerLang(activeSpk);
  const srcCode = (spkLocale || 'en').split('-')[0].toLowerCase();
  const tgtCode = (targetLanguage || 'tr').toLowerCase();

  const spkAccentObj = ACCENT_REGISTRY[spkLocale] || { name: spkLocale };
  const spkName = spkAccentObj.name.split(' ')[0] || spkLocale;
  const tgtName = LANGUAGE_NAMES[tgtCode] || tgtCode.toUpperCase();

  // Üst Sekme Rozeti (Varsa)
  if (activeLangBadgePill) {
    activeLangBadgePill.textContent = `${spkName} → ${tgtName}`;
  }

  // Sahne Dil Köprüsü Rozeti (Aktif Konuşmacı Dili ➔ Dinleyici Ana Dili)
  if (badgeSourceText && badgeTargetText) {
    badgeSourceText.textContent = spkName;
    if (srcCode === tgtCode) {
      badgeTargetText.textContent = 'Orijinal';
    } else {
      badgeTargetText.textContent = tgtName;
    }
  }

  // Altyazı Kartı Başlığı
  if (targetLangLabelBadge) {
    targetLangLabelBadge.textContent = `${tgtName.toUpperCase()} ALTYAZI`;
  }

  // Header Ana Dil Seçici senkronizasyonu
  if (headerNativeLangSelect && headerNativeLangSelect.value !== targetLanguage) {
    headerNativeLangSelect.value = targetLanguage;
  }
  if (meetingTargetLangSelect && meetingTargetLangSelect.value !== targetLanguage) {
    meetingTargetLangSelect.value = targetLanguage;
  }
}

function applySelectedLanguages() {
  if (meetingSourceLangSelect) sourceLanguage = meetingSourceLangSelect.value;
  if (meetingTargetLangSelect) targetLanguage = meetingTargetLangSelect.value;
  if (headerNativeLangSelect) headerNativeLangSelect.value = targetLanguage;

  updateLanguageDisplayBadges();
  renderSoundboardPads();
  saveWorkspaceData();

  // Eğer kayıt aktifse taze motorla yeni dile uyarla
  if (isRecording) {
    const spk = getActiveSpeaker();
    startSpeechCapture(spk.id);
  } else {
    updateListeningPrompt();
  }

  // Akış tamponlarını temizle
  lastTranslatedSourceText = '';
  stopTtsSpeaking();

  // Canlı Sahneye Geri Dön
  switchTab('live');
  showToast(`Ana Dil: ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}`);
}

function swapLanguages() {
  const curSpk = getActiveSpeaker();
  const curSpkLocale = getSpeakerLang(curSpk);
  const curSrcPrefix = (curSpkLocale || 'en').split('-')[0].toLowerCase();
  const curTgtPrefix = (targetLanguage || 'tr').toLowerCase();

  // Hedef dili aktif konuşmacının dili yap
  const newSourceLocale = DEFAULT_SPEECH_LOCALES[curTgtPrefix] || (curTgtPrefix + '-' + curTgtPrefix.toUpperCase());
  const newTargetCode = curSrcPrefix;

  curSpk.accent = newSourceLocale;
  targetLanguage = newTargetCode;

  if (meetingSourceLangSelect) meetingSourceLangSelect.value = newSourceLocale;
  if (meetingTargetLangSelect) meetingTargetLangSelect.value = targetLanguage;
  if (headerNativeLangSelect) headerNativeLangSelect.value = targetLanguage;

  renderSoundboardPads();
  setActiveSpeaker(curSpk.id, false);
  updateLanguageDisplayBadges();
  saveWorkspaceData();

  // Ses tanıma motorunun dilini anında güncelle
  if (isRecording) {
    startSpeechCapture(curSpk.id);
  } else {
    updateListeningPrompt(curSpk);
  }

  // Ekran tamponlarını ve referans metinleri temizle
  lastTranslatedSourceText = '';
  stopTtsSpeaking();

  const srcAcc = ACCENT_REGISTRY[curSpk.accent] || { name: curSpk.accent };
  const tgtName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  showToast(`Diller Değiştirildi: ${srcAcc.name.split(' ')[0]} ⇄ ${tgtName}`);
}

function switchTab(tabName) {
  if (tabName === 'live') {
    if (tabLiveBtn) tabLiveBtn.classList.add('active');
    if (tabLangBtn) tabLangBtn.classList.remove('active');
    if (viewLiveSection) viewLiveSection.classList.remove('hidden');
    if (viewLanguageSection) viewLanguageSection.classList.add('hidden');
  } else {
    if (tabLangBtn) tabLangBtn.classList.add('active');
    if (tabLiveBtn) tabLiveBtn.classList.remove('active');
    if (viewLanguageSection) viewLanguageSection.classList.remove('hidden');
    if (viewLiveSection) viewLiveSection.classList.add('hidden');
  }
}

// ==========================================================================
// 3. KALICI MİKROFON ERİŞİMİ VE STÜDYO VU METRE
// ==========================================================================
let isRecognitionSoundActive = false;
let speechRestartTimeout = null;

async function ensureMicrophoneAccess() {
  if (microphoneStream && microphoneStream.active) {
    if (audioContext && audioContext.state === 'suspended') {
      try { await audioContext.resume(); } catch (e) {}
    }
    return true;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      const source = audioContext.createMediaStreamSource(microphoneStream);
      source.connect(analyser);
      startVuMeterLoop();
    } else if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    return true;
  } catch (err) {
    console.warn('Mikrofon erişim durumu:', err);
    return false;
  }
}

function triggerVuActivity(active) {
  isRecognitionSoundActive = active;
  const leds = vuLeds ? vuLeds.querySelectorAll('.vu-led') : [];
  if (active && (!analyser || audioContext?.state !== 'running')) {
    leds.forEach((led, idx) => {
      if (idx < 5) led.classList.add('lit');
      else led.classList.remove('lit');
    });
  } else if (!active && (!analyser || audioContext?.state !== 'running')) {
    leds.forEach(led => led.classList.remove('lit'));
  }
}

function startVuMeterLoop() {
  if (isVuMeterRunning || !analyser) return;
  isVuMeterRunning = true;

  const leds = vuLeds ? vuLeds.querySelectorAll('.vu-led') : [];
  const timeData = new Uint8Array(analyser.fftSize || 512);

  function updateLeds() {
    if (analyser && isRecording && audioContext && audioContext.state === 'running') {
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const dev = (timeData[i] - 128) / 128;
        sum += dev * dev;
      }
      const rms = Math.sqrt(sum / timeData.length);

      let litCount = 0;
      if (rms > 0.012) {
        litCount = Math.min(8, Math.max(1, Math.round(((rms - 0.012) / 0.16) * 8)));
      } else if (isRecognitionSoundActive) {
        litCount = 3;
      }

      leds.forEach((led, idx) => {
        if (idx < litCount) {
          led.classList.add('lit');
        } else {
          led.classList.remove('lit');
        }
      });
    } else if (isRecording && isRecognitionSoundActive) {
      leds.forEach((led, idx) => {
        if (idx < 4) led.classList.add('lit');
        else led.classList.remove('lit');
      });
    } else {
      leds.forEach(led => led.classList.remove('lit'));
    }
    requestAnimationFrame(updateLeds);
  }
  updateLeds();
}

async function initStudioVuMeter() {
  try {
    ensureMicrophoneAccess().catch(() => {});
  } catch (e) {}
}

// ==========================================================================
// 4. SES TANIMA VE TAMPON MOTORU (SPEECH ENGINE)
// ==========================================================================
let turnSpeechBuffer = '';
let streamAutoCommitTimer = null;
let isCommittingTurn = false;
let lastCommittedOriginal = '';
let lastCommittedTimestamp = 0;
let hasUncommittedSpeech = false;

function getSpeakerLang(spk) {
  if (spk && spk.accent) return spk.accent;
  return 'en-US';
}

function createFreshRecognition(targetLang) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('Tarayıcınız Web Speech API desteklemiyor (Chrome/Edge önerilir).');
    return null;
  }

  // Önceki motor örneğini temizle ve sonlandır
  if (recognition) {
    try {
      recognition.onstart = null;
      recognition.onaudiostart = null;
      recognition.onsoundstart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onsoundend = null;
      recognition.onaudioend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    } catch (e) {}
    recognition = null;
  }

  const rec = new SpeechRec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.lang = targetLang;

  rec.onstart = () => {
    isRecognitionActive = true;
    isRecognitionStopping = false;
    setRecordingState(true);
    updateListeningPrompt();
  };

  rec.onaudiostart = () => {
    triggerVuActivity(true);
  };

  rec.onsoundstart = () => {
    triggerVuActivity(true);
  };

  rec.onspeechstart = () => {
    triggerVuActivity(true);
    const pulse = document.querySelector('.listening-pulse');
    if (pulse) {
      pulse.textContent = '● Ses Algılandı';
    }
  };

  rec.onspeechend = () => {
    triggerVuActivity(false);
  };

  rec.onsoundend = () => {
    triggerVuActivity(false);
  };

  rec.onaudioend = () => {
    triggerVuActivity(false);
  };

  rec.onresult = (event) => {
    if (currentMode === 'ptt' && !isPttActive && !isRecording) {
      return;
    }

    let interimChunk = '';
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalChunk += text;
      } else {
        interimChunk += text;
      }
    }

    if (finalChunk.trim().length > 0 || interimChunk.trim().length > 0) {
      hasUncommittedSpeech = true;
    }

    const currentLiveStream = (turnSpeechBuffer + ' ' + finalChunk + ' ' + interimChunk).trim();
    if (currentLiveStream.length > 0) {
      liveOriginalStream.textContent = currentLiveStream;
      liveOriginalStream.scrollTop = liveOriginalStream.scrollHeight;
      triggerLiveTranslation(currentLiveStream);
    }

    if (finalChunk.trim().length > 0) {
      turnSpeechBuffer = (turnSpeechBuffer + ' ' + finalChunk).trim();

      if (currentMode === 'tap') {
        const hasPunctuation = /[.?!;]\s*$/.test(turnSpeechBuffer);
        const isLongEnough = turnSpeechBuffer.length >= 80;

        if (hasPunctuation || isLongEnough) {
          if (streamAutoCommitTimer) clearTimeout(streamAutoCommitTimer);
          streamAutoCommitTimer = null;
          commitSpeechTurn();
        } else {
          if (streamAutoCommitTimer) clearTimeout(streamAutoCommitTimer);
          streamAutoCommitTimer = setTimeout(() => {
            if (currentMode === 'tap' && turnSpeechBuffer.trim().length > 0) {
              commitSpeechTurn();
            }
          }, 1400);
        }
      }
    } else if (interimChunk.trim().length > 0 && currentMode === 'tap') {
      if (streamAutoCommitTimer) clearTimeout(streamAutoCommitTimer);
      streamAutoCommitTimer = setTimeout(() => {
        if (currentMode === 'tap' && turnSpeechBuffer.trim().length > 0) {
          commitSpeechTurn();
        }
      }, 1600);
    }
  };

  rec.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('❌ Mikrofon izni engellendi. Tarayıcı adres çubuğundaki kilit simgesinden mikrofon iznini verin.');
      isRecording = false;
      isRecognitionActive = false;
      isRecognitionStopping = false;
      isPttActive = false;
      isSessionWarm = false;
      setRecordingState(false);
      if (liveOriginalStream) {
        liveOriginalStream.innerHTML = '<span style="color:#d95d5d;">❌ Mikrofon izni engellendi (Adres çubuğundaki kilit simgesinden izin verin)</span>';
      }
    } else if (event.error === 'audio-capture') {
      showToast('❌ Mikrofon donanımından ses alınamıyor. Windows ses ayarlarından giriş aygıtını kontrol edin.');
      isRecording = false;
      isRecognitionActive = false;
      isRecognitionStopping = false;
      setRecordingState(false);
      if (liveOriginalStream) {
        liveOriginalStream.innerHTML = '<span style="color:#d95d5d;">❌ Mikrofon aygıtı bulunamadı. Windows Ses Ayarları > Giriş Aygıtını kontrol edin.</span>';
      }
    } else if (event.error === 'network') {
      showToast('⚠️ Google Konuşma Tanıma sunucusuna bağlanılamadı. Otomatik yeniden deneniyor...');
    } else if (event.error === 'no-speech') {
      const spk = getActiveSpeaker();
      if (!turnSpeechBuffer) {
        updateListeningPrompt(spk);
      }
    } else if (event.error === 'aborted') {
      // Bilinçli durdurma
    } else {
      showToast(`Konuşma tanıma bildirimi: ${event.error}`);
    }
  };

  rec.onend = () => {
    isRecognitionActive = false;
    triggerVuActivity(false);

    if ((isRecording || isSessionWarm) && !isRecognitionStopping) {
      clearTimeout(speechRestartTimeout);
      speechRestartTimeout = setTimeout(() => {
        if ((isRecording || isSessionWarm) && !isRecognitionStopping) {
          const spk = getActiveSpeaker();
          const targetRecLang = getSpeakerLang(spk);
          try {
            createFreshRecognition(targetRecLang);
            if (recognition) {
              recognition.start();
              isRecognitionActive = true;
            }
          } catch (e) {
            console.warn('Otomatik devam başlatma:', e);
          }
        }
      }, 120);
    } else {
      setRecordingState(false);
    }
  };

  recognition = rec;
  return rec;
}

function initRecognitionEngine() {
  const spk = getActiveSpeaker();
  createFreshRecognition(getSpeakerLang(spk));
}

function quickSwitchTestMode(mode) {
  if (mode === 'tr-en') {
    let trSpk = speakers.find(s => (s.accent || '').startsWith('tr'));
    if (!trSpk) {
      trSpk = { id: 'spk_tr_' + Date.now(), name: 'Konuşmacı (Türkçe)', accent: 'tr-TR', color: '#8EAA90' };
      speakers.push(trSpk);
    }
    targetLanguage = 'en';
    if (headerNativeLangSelect) headerNativeLangSelect.value = 'en';
    if (meetingTargetLangSelect) meetingTargetLangSelect.value = 'en';

    setActiveSpeaker(trSpk.id, false);
    renderSoundboardPads();
    saveWorkspaceData();

    startSpeechCapture(trSpk.id);
    showToast('🇹🇷 Türkçe Konuşma ➔ 🇬🇧 İngilizce Çeviri Modu Başlatıldı!');
  }
}
window.quickSwitchTestMode = quickSwitchTestMode;

function updateListeningPrompt(speaker) {
  const spk = speaker || getActiveSpeaker();
  const acc = ACCENT_REGISTRY[spk.accent] || { name: spk.accent, short: 'EN' };

  if (liveOriginalStream && (!turnSpeechBuffer || liveOriginalStream.textContent.startsWith('Dinleniyor') || liveOriginalStream.querySelector('.listening-pulse'))) {
    liveOriginalStream.innerHTML = `<span class="listening-pulse">● Dinleniyor...</span>`;
  }

  if (liveTranslationStream && (!turnSpeechBuffer || liveTranslationStream.textContent.startsWith('Konuşmacı') || liveTranslationStream.querySelector('.prompt-container') || liveTranslationStream.textContent.includes('konuştuğunuzda') || liveTranslationStream.textContent.includes('akacaktır') || liveTranslationStream.textContent.includes('görünecektir'))) {
    liveTranslationStream.innerHTML = `<span class="listening-hint">Çevirisi burada akacaktır.</span>`;
  }
}

// ==========================================================================
// 5. ÇOK DİLLİ ÇEVİRİ PİPELİNE'I (GEMINI LLM, GOOGLE GTX & MYMEMORY FALLBACK)
// ==========================================================================
let liveTranslateTimer = null;
let liveTranslateSeq = 0;
let lastTranslatedSourceText = '';
const liveTranslationCache = new Map();

async function fetchWebTranslation(cleanText, srcCode, tgtCode) {
  if (!cleanText || srcCode === tgtCode) return cleanText;

  // 1. Google Clients5 API (Ultra Hızlı, Açık CORS, CAPTCHA engeli yok)
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(srcCode)}&tl=${encodeURIComponent(tgtCode)}&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const result = Array.isArray(data[0]) ? data[0].join(' ').trim() : String(data[0]).trim();
        if (result) return result;
      }
    }
  } catch (err) {
    console.warn('Google Clients5 çeviri hatası, alternatif servise geçiliyor:', err);
  }

  // 2. Google GTX (Alternatif)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcCode}&tl=${tgtCode}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const result = data[0].map(s => s[0]).join('').trim();
        if (result) return result;
      }
    }
  } catch (err) {
    console.warn('Google GTX çeviri hatası, yedek servise geçiliyor:', err);
  }

  // 3. Yedek Servis: MyMemory API (Ağ engeli veya kota aşımlarında devreye girer)
  try {
    const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${srcCode}|${tgtCode}`;
    const fbRes = await fetch(fallbackUrl);
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      const fbResult = fbData?.responseData?.translatedText;
      if (fbResult && !fbResult.startsWith('MYMEMORY WARNING:')) {
        return fbResult.trim();
      }
    }
  } catch (fbErr) {
    console.warn('Yedek çeviri servisi hatası:', fbErr);
  }

  return cleanText;
}

function triggerLiveTranslation(sourceText) {
  if (!sourceText || sourceText.trim().length === 0) return;
  const clean = sourceText.trim();
  if (clean === lastTranslatedSourceText) return;
  if (clean === 'Dinleniyor...' || clean.startsWith('Sistemi başlatmak')) return;

  const activeSpk = getActiveSpeaker();
  const spkLocale = getSpeakerLang(activeSpk);
  const srcCode = (spkLocale || 'en').split('-')[0].toLowerCase();
  const tgtCode = (targetLanguage || 'tr').toLowerCase();

  // Konuşmacının dili ile dinleyicinin ana dili aynı ise çeviri yapmadan direkt göster
  if (srcCode === tgtCode) {
    liveTranslationStream.textContent = clean;
    liveTranslationStream.scrollTop = liveTranslationStream.scrollHeight;
    lastTranslatedSourceText = clean;
    return;
  }

  const cacheKey = `${srcCode}_${tgtCode}_${clean}`;
  if (liveTranslationCache.has(cacheKey)) {
    liveTranslationStream.textContent = liveTranslationCache.get(cacheKey);
    liveTranslationStream.scrollTop = liveTranslationStream.scrollHeight;
    lastTranslatedSourceText = clean;
    return;
  }

  clearTimeout(liveTranslateTimer);
  liveTranslateTimer = setTimeout(async () => {
    const currentSeq = ++liveTranslateSeq;
    try {
      const translated = await fetchWebTranslation(clean, srcCode, tgtCode);
      if (translated && currentSeq === liveTranslateSeq) {
        liveTranslationStream.textContent = translated;
        liveTranslationStream.scrollTop = liveTranslationStream.scrollHeight;
        lastTranslatedSourceText = clean;
        liveTranslationCache.set(cacheKey, translated);
        if (liveTranslationCache.size > 200) {
          const firstKey = liveTranslationCache.keys().next().value;
          liveTranslationCache.delete(firstKey);
        }
      }
    } catch (e) {
      console.warn('Canlı anlık çeviri hatası:', e);
    }
  }, 100);
}

async function translateSpeechTurn(sourceText, speaker) {
  if (!sourceText || sourceText.trim() === '') return '';
  const cleanText = sourceText.trim();

  const spk = speaker || getActiveSpeaker();
  const spkLocale = getSpeakerLang(spk);
  const srcCode = (spkLocale || 'en').split('-')[0].toLowerCase();
  const tgtCode = (targetLanguage || 'tr').toLowerCase();

  if (srcCode === tgtCode) return cleanText;

  const tgtLangName = LANGUAGE_NAMES[tgtCode] || targetLanguage;

  // 1. Google Gemini 1.5 Flash (Varsa Profesyonel Kongre Çevirmeni)
  if (geminiApiKey && geminiApiKey.trim() !== '') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`;
      const payload = {
        contents: [{
          parts: [{
            text: `Sen uluslararası bir kongre ve sempozyumda görevli profesyonel simultane çevirmensin. Verilen konuşmayı teknik, akademik ve doğal bir ${tgtLangName} diline çevir. Sadece nihai ${tgtLangName} çeviriyi döndür, ekstra hiçbir yorum ekleme:\n\n"${cleanText}"`
          }]
        }]
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const geminiResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiResult) return geminiResult.trim();
      }
    } catch (e) {
      console.warn('Gemini API yanıt vermedi, standart web çevirisine geçiliyor:', e);
    }
  }

  // Önbellekten kontrol et
  const cacheKey = `${srcCode}_${tgtCode}_${cleanText}`;
  if (liveTranslationCache.has(cacheKey)) {
    return liveTranslationCache.get(cacheKey);
  }

  // 2. Standart Hızlı Web Çevirisi (GTX + MyMemory Fallback)
  const result = await fetchWebTranslation(cleanText, srcCode, tgtCode);
  if (result) {
    liveTranslationCache.set(cacheKey, result);
    return result;
  }

  return cleanText;
}

// ==========================================================================
// 6. CÜMLEYİ TUTANAĞA ARŞİVLEME
// ==========================================================================
async function commitSpeechTurn() {
  if (isCommittingTurn) return;

  const rawText = turnSpeechBuffer || (hasUncommittedSpeech ? liveOriginalStream.textContent : '');
  const textToArchive = (rawText || '').trim();

  turnSpeechBuffer = '';
  hasUncommittedSpeech = false;

  if (!textToArchive || 
      textToArchive.startsWith('Sistemi başlatmak') || 
      textToArchive.startsWith('Dinleniyor') || 
      textToArchive.includes('● Dinleniyor') ||
      textToArchive === '● CANLI DİNLENİYOR...') {
    return;
  }

  // Çift kayıt engeli: Son 5 saniye içinde aynı metin zaten işlendiyse atla
  const now = Date.now();
  if (lastCommittedOriginal && 
      lastCommittedOriginal.toLowerCase() === textToArchive.toLowerCase() && 
      (now - lastCommittedTimestamp) < 5000) {
    return;
  }

  isCommittingTurn = true;
  lastCommittedOriginal = textToArchive;
  lastCommittedTimestamp = now;

  try {
    const speaker = getActiveSpeaker();
    await archiveSpeechTurnForSpeaker(speaker, textToArchive);
  } finally {
    isCommittingTurn = false;
  }
}

async function archiveSpeechTurnForSpeaker(speaker, textToArchive) {
  if (!textToArchive || 
      textToArchive.startsWith('Sistemi başlatmak') || 
      textToArchive.startsWith('Dinleniyor') || 
      textToArchive.includes('● Dinleniyor') ||
      textToArchive === '● CANLI DİNLENİYOR...') {
    return;
  }

  const cleanOriginal = textToArchive.trim();
  const now = Date.now();

  // Katman 1: Orijinal metin üzerinden son tutanak kaydıyla mükerrerlik kontrolü
  if (transcriptHistory.length > 0) {
    const lastEntry = transcriptHistory[0];
    const isRecent = (now - (lastEntry.timestamp || 0)) < 6000;
    const isSameOriginal = lastEntry.original && 
      lastEntry.original.trim().toLowerCase() === cleanOriginal.toLowerCase();
    
    if (isRecent && isSameOriginal) {
      return;
    }
  }

  const timeFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // Çeviriyi bu konuşmacının dilinden hedef ana dile yap
  const translated = await translateSpeechTurn(cleanOriginal, speaker);

  // Katman 2: Çeviri tamamlandıktan sonra mükerrerlik kontrolü
  if (transcriptHistory.length > 0) {
    const lastEntry = transcriptHistory[0];
    const isRecent = (now - (lastEntry.timestamp || 0)) < 6000;
    const isSameTranslation = translated && lastEntry.translation && 
      lastEntry.translation.trim().toLowerCase() === translated.trim().toLowerCase();
    const isSameOriginal = lastEntry.original && 
      lastEntry.original.trim().toLowerCase() === cleanOriginal.toLowerCase();
    
    if (isRecent && (isSameTranslation || isSameOriginal)) {
      return;
    }
  }

  // Canlı Altyazıyı Güncelle
  liveTranslationStream.textContent = translated;

  // Sesli Tercüman (TTS / Kulaklıkla Simultane Dinleme):
  // Konuşmacı dinleyicinin seçtiği ana dilden farklı bir dilde konuşuyorsa çeviriyi seslendir
  if (isTtsActive && translated) {
    const spkLocale = getSpeakerLang(speaker);
    const srcFamily = (spkLocale || 'en').split('-')[0].toLowerCase();
    const tgtFamily = (targetLanguage || 'tr').split('-')[0].toLowerCase();
    if (srcFamily !== tgtFamily) {
      speakTranslatedText(translated, tgtFamily);
    }
  }

  // Tutanağa ekle (En güncel konuşma her zaman en üstte)
  const entry = {
    id: 'tr_' + Date.now(),
    timestamp: Date.now(),
    speakerName: speaker.name,
    speakerColor: speaker.color,
    speakerAccent: speaker.accent,
    time: timeFormatted,
    original: cleanOriginal,
    translation: translated
  };

  transcriptHistory.unshift(entry);
  renderTranscriptFeed();
  saveWorkspaceData();
}

// ==========================================================================
// 6.5. SESLİ SİMULTANE TERCÜMAN (TTS / KULAKLIKLA DİNLEME MOTORU)
// ==========================================================================
function initTtsEngine() {
  if (!('speechSynthesis' in window)) {
    console.warn('Web Speech Synthesis API bu tarayıcıda desteklenmiyor.');
    if (headphoneTtsBtn) {
      headphoneTtsBtn.style.display = 'none';
    }
    return;
  }

  loadTtsVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadTtsVoices;
  }

  updateHeadphoneButtonState();
}

function loadTtsVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    availableVoices = voices;
  }
}

function updateHeadphoneButtonState() {
  if (!headphoneTtsBtn) return;
  if (isTtsActive) {
    headphoneTtsBtn.classList.add('active');
    headphoneTtsBtn.setAttribute('aria-pressed', 'true');
    headphoneTtsBtn.setAttribute('title', 'Kulaklıkla Sesli Simultane Tercüman Aktif (Tıkla ve Kapat)');
  } else {
    headphoneTtsBtn.classList.remove('active', 'speaking');
    headphoneTtsBtn.setAttribute('aria-pressed', 'false');
    headphoneTtsBtn.setAttribute('title', 'Kulaklıkla Sesli Simultane Tercümanı Aç (Çevirileri Seslendir)');
  }
}

function toggleTtsInterpretation() {
  if (!('speechSynthesis' in window)) {
    showToast('Tarayıcınız ses sentezi (TTS) desteklemiyor.');
    return;
  }

  isTtsActive = !isTtsActive;
  updateHeadphoneButtonState();
  saveWorkspaceData();

  if (isTtsActive) {
    const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage.toUpperCase();
    showToast(`Kulaklık Modu Açık: ${langName} sesli tercüme aktif`);
    // Tarayıcı audio/autoplay kısıtını açmak için kullanıcı jestiyle sessiz mikro utterance tetikle
    try {
      const primer = new SpeechSynthesisUtterance(' ');
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
    } catch (e) {}
  } else {
    stopTtsSpeaking();
    showToast('Sesli tercüman kapatıldı.');
  }
}

function stopTtsSpeaking() {
  ttsSpeechQueue = [];
  isTtsSpeaking = false;
  currentTtsUtterance = null;
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (headphoneTtsBtn) {
    headphoneTtsBtn.classList.remove('speaking');
  }
}

function getVoiceForLanguage(langCode) {
  if (!availableVoices || availableVoices.length === 0) {
    loadTtsVoices();
  }
  if (!availableVoices || availableVoices.length === 0) return null;

  const codeLower = (langCode || 'tr').toLowerCase();
  const defaultLocale = (DEFAULT_SPEECH_LOCALES[codeLower] || `${codeLower}-${codeLower.toUpperCase()}`).toLowerCase();

  // 1. Varsayılan tam yerel kod eşleşmesi (örn: 'tr-tr', 'en-us')
  let matched = availableVoices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === defaultLocale);
  if (matched) return matched;

  // 2. Dil ailesi eşleşmesi (örn: 'tr', 'en')
  const langPrefix = codeLower.split('-')[0];
  matched = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
  if (matched) return matched;

  return null;
}

function speakTranslatedText(text, langCode) {
  if (!isTtsActive || !('speechSynthesis' in window)) return;
  if (!text || typeof text !== 'string') return;

  const clean = text
    .replace(/[*_#`~[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) return;

  // Canlı kongre temposunda yığılmayı önlemek için bekleme kuyruğunu maksimum 2 cümlede tut
  if (ttsSpeechQueue.length >= 2) {
    ttsSpeechQueue.shift();
  }

  const targetLang = langCode || targetLanguage || 'tr';
  ttsSpeechQueue.push({ text: clean, lang: targetLang });

  if (!isTtsSpeaking) {
    processTtsQueue();
  }
}

function processTtsQueue() {
  if (!isTtsActive || ttsSpeechQueue.length === 0) {
    isTtsSpeaking = false;
    currentTtsUtterance = null;
    if (headphoneTtsBtn) {
      headphoneTtsBtn.classList.remove('speaking');
    }
    return;
  }

  isTtsSpeaking = true;
  if (headphoneTtsBtn) {
    headphoneTtsBtn.classList.add('speaking');
  }

  const nextItem = ttsSpeechQueue.shift();
  const utterance = new SpeechSynthesisUtterance(nextItem.text);
  currentTtsUtterance = utterance;

  const langPrefix = (nextItem.lang || 'tr').toLowerCase();
  const defaultLocale = DEFAULT_SPEECH_LOCALES[langPrefix] || `${langPrefix}-${langPrefix.toUpperCase()}`;
  utterance.lang = defaultLocale;

  const voice = getVoiceForLanguage(langPrefix);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate = ttsSpeed || 1.05;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    isTtsSpeaking = false;
    currentTtsUtterance = null;
    if (ttsSpeechQueue.length > 0) {
      processTtsQueue();
    } else {
      if (headphoneTtsBtn) {
        headphoneTtsBtn.classList.remove('speaking');
      }
    }
  };

  utterance.onerror = (e) => {
    isTtsSpeaking = false;
    currentTtsUtterance = null;
    if (ttsSpeechQueue.length > 0) {
      setTimeout(processTtsQueue, 50);
    } else {
      if (headphoneTtsBtn) {
        headphoneTtsBtn.classList.remove('speaking');
      }
    }
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('speechSynthesis.speak hatası:', err);
    isTtsSpeaking = false;
    currentTtsUtterance = null;
    if (headphoneTtsBtn) headphoneTtsBtn.classList.remove('speaking');
  }
}

// ==========================================================================
// 7. SOUNDBOARD (DEV HARDWARE PADLER)
// ==========================================================================
function renderSoundboardPads() {
  soundboardGrid.innerHTML = '';

  const tgtShort = (LANGUAGE_SHORT_CODES[targetLanguage] || targetLanguage.toUpperCase());

  speakers.forEach((speaker, index) => {
    const isSelected = speaker.id === activeSpeakerId;
    const pad = document.createElement('div');
    pad.className = `switcher-pad ${isSelected ? 'active' : ''}`;
    pad.style.setProperty('--speaker-tint', speaker.color);

    const acc = ACCENT_REGISTRY[speaker.accent] || { flag: '🌐', name: speaker.accent, short: 'EN' };
    const monogram = speaker.name.substring(0, 2).toUpperCase();
    const keyNumber = index < 9 ? (index + 1) : null;

    const spkShort = acc.short || (speaker.accent ? speaker.accent.split('-')[0].toUpperCase() : 'EN');
    const isSameLang = spkShort.toLowerCase() === tgtShort.toLowerCase();
    const routeLabel = isSameLang ? `${spkShort} (Orijinal)` : `${spkShort} ➔ ${tgtShort}`;
    const fullRouteHint = isSameLang ? `${acc.name} (Orijinal)` : `${acc.name} ➔ ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}`;

    const cleanLangName = acc.name.split(' ')[0];

    pad.innerHTML = `
      <div class="pad-avatar" style="background-color: ${speaker.color}">
        ${monogram}
      </div>
      <div class="pad-info">
        <div class="pad-name-row">
          <span class="pad-name">${escapeHtml(speaker.name)}</span>
          ${keyNumber ? `<span class="pad-key-badge" title="Kısayol: [${keyNumber}]">${keyNumber}</span>` : ''}
        </div>
        <span class="pad-lang-tag">${acc.flag || '🌐'} ${cleanLangName}</span>
      </div>
      <button type="button" class="pad-edit-btn" title="Düzenle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    `;

    // Düzenleme Butonu Dinleyicisi (Masaüstü ve Tıklamalar)
    const editBtn = pad.querySelector('.pad-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      editBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      editBtn.addEventListener('touchstart', (e) => e.stopPropagation());
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openEditSpeakerModal(speaker.id);
      });
    }

    // Mobilde Uzun Basma (Long-Press ~450ms) ile Konuşmacı Düzenleme Modalı Açma
    let touchTimer = null;
    let didLongPress = false;

    pad.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1 && currentMode === 'tap') {
        didLongPress = false;
        touchTimer = setTimeout(() => {
          didLongPress = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (_) {}
          }
          openEditSpeakerModal(speaker.id);
        }, 450);
      }
    }, { passive: true });

    const cancelLongPress = () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    pad.addEventListener('touchmove', cancelLongPress, { passive: true });
    pad.addEventListener('touchend', cancelLongPress, { passive: true });
    pad.addEventListener('touchcancel', cancelLongPress, { passive: true });

    // SIFIR GECİKMELİ POINTER EVENTS
    if (currentMode === 'ptt') {
      // BAS-KONUŞ (KESİNTİSİZ & İZİNSİZ AUDIO-GATE)
      pad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        clearTimeout(pttReleaseTimer);
        lastTranslatedSourceText = '';
        if (audioContext && audioContext.state === 'suspended') {
          try { audioContext.resume(); } catch (_) {}
        }
        ensureMicrophoneAccess().catch(() => {});
        isSessionWarm = true;
        isPttActive = true;
        setActiveSpeaker(speaker.id, false);
        pad.classList.add('pressed');
        if (stagePttBtn) stagePttBtn.classList.add('pressed');
        setRecordingState(true);
        startSpeechCapture(speaker.id);
      });

      const releasePad = () => {
        if (pad.classList.contains('pressed')) {
          pad.classList.remove('pressed');
          if (stagePttBtn) stagePttBtn.classList.remove('pressed');
          // Son hecelerin şebekeden tam ulaşması için 300ms tolerans
          clearTimeout(pttReleaseTimer);
          pttReleaseTimer = setTimeout(() => {
            isPttActive = false;
            stopSpeechCapture();
          }, 300);
        }
      };

      pad.addEventListener('pointerup', releasePad);
      pad.addEventListener('pointercancel', releasePad);
      pad.addEventListener('pointerleave', releasePad);

    } else {
      // SÜREKLİ AKIŞ (TEK TIKLA GEÇİŞ)
      pad.addEventListener('click', async (e) => {
        if (didLongPress) {
          didLongPress = false;
          return;
        }
        await ensureMicrophoneAccess();
        if (isRecording && activeSpeakerId === speaker.id) {
          if (window.innerWidth <= 768 && speakers.length >= 2) {
            toggleMobileDrawer();
          }
          return;
        }

        if (isRecording) {
          switchSpeakerLive(speaker);
        } else {
          setActiveSpeaker(speaker.id, false);
          startSpeechCapture(speaker.id);
        }
      });
    }

    soundboardGrid.appendChild(pad);
  });

  updateDrawerCounts();
}

function selectSpeakerByIndex(index) {
  if (index < 0 || index >= speakers.length) return;
  const targetSpeaker = speakers[index];
  if (!targetSpeaker) return;

  if (targetSpeaker.id === activeSpeakerId && isRecording) {
    return;
  }

  if (isRecording) {
    switchSpeakerLive(targetSpeaker);
    showToast(`Konuşmacı: [${index + 1}] ${targetSpeaker.name}`);
  } else {
    setActiveSpeaker(targetSpeaker.id, false);
    if (currentMode === 'tap') {
      startSpeechCapture(targetSpeaker.id);
      showToast(`Konuşmacı Canlı: [${index + 1}] ${targetSpeaker.name}`);
    } else {
      showToast(`Konuşmacı seçildi: [${index + 1}] ${targetSpeaker.name}`);
    }
  }

  // Tuşa hafif basılma efekti ver
  const pads = soundboardGrid.querySelectorAll('.switcher-pad');
  if (pads[index]) {
    pads[index].classList.add('pressed');
    setTimeout(() => pads[index].classList.remove('pressed'), 200);
  }
}

function switchSpeakerLive(newSpeaker) {
  if (activeSpeakerId === newSpeaker.id && isRecording) return;

  if (streamAutoCommitTimer) {
    clearTimeout(streamAutoCommitTimer);
    streamAutoCommitTimer = null;
  }

  const prevSpeaker = getActiveSpeaker();
  const textToArchive = (turnSpeechBuffer || (hasUncommittedSpeech ? liveOriginalStream.textContent : '')).trim();
  turnSpeechBuffer = '';
  hasUncommittedSpeech = false;
  lastTranslatedSourceText = '';

  if (textToArchive && !textToArchive.startsWith('Sistemi başlatmak') && !textToArchive.startsWith('Dinleniyor') && !textToArchive.includes('● Dinleniyor')) {
    archiveSpeechTurnForSpeaker(prevSpeaker, textToArchive);
  }

  setActiveSpeaker(newSpeaker.id, false);
  startSpeechCapture(newSpeaker.id);
}

function openEditSpeakerModal(id) {
  const spk = speakers.find(s => s.id === id);
  if (!spk) return;
  editSpeakerIdInput.value = spk.id;
  editSpeakerNameInput.value = spk.name;
  editSpeakerAccentInput.value = spk.accent;
  openModal(editSpeakerModal);
  editSpeakerNameInput.focus();
}

function setActiveSpeaker(speakerId, autoStart = false) {
  activeSpeakerId = speakerId;
  const cur = getActiveSpeaker();

  activeSpeakerNameDisplay.textContent = cur.name;
  speakerAvatarDot.style.backgroundColor = cur.color;
  speakerAvatarDot.style.boxShadow = 'none';

  const acc = ACCENT_REGISTRY[cur.accent] || { name: cur.accent };
  activeSpeakerAccentDisplay.textContent = acc.name;

  // Aktif konuşmacının diliyle sahne çeviri rotası rozetini güncelle
  updateLanguageDisplayBadges();

  // Pad durumlarını güncelle
  const pads = soundboardGrid.querySelectorAll('.switcher-pad, .studio-pad');
  speakers.forEach((s, i) => {
    if (pads[i]) {
      const active = s.id === activeSpeakerId;
      pads[i].classList.toggle('active', active);
      const trig = pads[i].querySelector('.pad-trigger-text');
      if (trig) {
        trig.textContent = active ? '● CANLI' : (currentMode === 'ptt' ? 'Basılı Tutun' : 'Aktif Et');
      }
    }
  });

  if (isRecording) {
    updateListeningPrompt(cur);
  }

  if (autoStart) {
    startSpeechCapture(speakerId);
  }
}

function getActiveSpeaker() {
  return speakers.find(s => s.id === activeSpeakerId) || speakers[0];
}

// ==========================================================================
// 8. KAYIT KONTROL DÖNGÜSÜ
// ==========================================================================
function startSpeechCapture(speakerId) {
  const spk = speakers.find(s => s.id === speakerId) || getActiveSpeaker();
  const targetLang = getSpeakerLang(spk);

  // AudioContext'i kullanıcı etkileşimi akışında hemen uyandır
  if (audioContext && audioContext.state === 'suspended') {
    try { audioContext.resume(); } catch (e) {}
  }
  // Mikrofon akışını arka planda aç (engelleme yapmadan)
  ensureMicrophoneAccess().catch(() => {});

  isSessionWarm = true;
  turnSpeechBuffer = '';
  hasUncommittedSpeech = false;
  lastTranslatedSourceText = '';
  setRecordingState(true);
  setActiveSpeaker(spk.id, false);
  updateListeningPrompt(spk);

  // Zaten tanıma aktifse ve aynı dildeyse durdurup yeniden başlatmaya gerek yok
  if (isRecognitionActive && recognition && recognition.lang === targetLang) {
    return;
  }

  isRecognitionStopping = false;
  try {
    createFreshRecognition(targetLang);
    if (recognition) {
      recognition.start();
      isRecognitionActive = true;
    }
  } catch (e) {
    console.warn('startSpeechCapture başlatma hatası:', e);
    if (e.name === 'InvalidStateError') {
      setTimeout(() => {
        if (isRecording || isSessionWarm) {
          try {
            createFreshRecognition(targetLang);
            if (recognition) {
              recognition.start();
              isRecognitionActive = true;
            }
          } catch (err) {}
        }
      }, 150);
    } else {
      showToast(`Mikrofon uyarısı: ${e.message || e.name}`);
    }
  }
}

function stopSpeechCapture() {
  isRecording = false;
  isPttActive = false;
  isSessionWarm = false;
  isRecognitionStopping = true;
  clearTimeout(pttReleaseTimer);
  clearTimeout(speechRestartTimeout);
  if (streamAutoCommitTimer) {
    clearTimeout(streamAutoCommitTimer);
    streamAutoCommitTimer = null;
  }
  pendingLangSwitch = null;
  pendingStartSpeakerId = null;

  if (recognition) {
    try {
      recognition.onend = null;
      recognition.stop();
    } catch (e) {}
  }
  isRecognitionActive = false;
  isRecognitionStopping = false;

  setRecordingState(false);
  commitSpeechTurn();
  triggerVuActivity(false);
}

function setRecordingState(active) {
  isRecording = active;
  if (recordingPill) {
    recordingPill.className = active ? 'session-pill live' : 'session-pill idle';
  }
  if (statusLabel) {
    statusLabel.textContent = '';
  }
  updateStopButtonState(active);

  // Pad durumlarını güncelle (Aktif konuşmacı CANLI rozeti alır)
  const pads = soundboardGrid.querySelectorAll('.switcher-pad, .studio-pad');
  speakers.forEach((s, i) => {
    if (pads[i]) {
      const isCur = s.id === activeSpeakerId;
      pads[i].classList.toggle('active', isCur);
      const trig = pads[i].querySelector('.pad-trigger-text');
      if (trig) {
        if (isCur && active) {
          trig.textContent = '● CANLI';
        } else if (isCur && !active) {
          trig.textContent = 'Seçili';
        } else {
          trig.textContent = currentMode === 'ptt' ? 'Basılı Tutun' : 'Aktif Et';
        }
      }
    }
  });
}

function updateStopButtonState(active) {
  if (!stopSessionBtn) return;
  if (active) {
    stopSessionBtn.classList.remove('start-mode');
    stopSessionBtn.innerHTML = `
      <svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; display: block; flex-shrink: 0;">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <span class="stop-btn-text-full">Dinlemeyi Durdur</span>
      <span class="stop-btn-text-short">Durdur</span>
    `;
    stopSessionBtn.setAttribute('title', 'Dinlemeyi Durdur');
  } else {
    stopSessionBtn.classList.add('start-mode');
    stopSessionBtn.innerHTML = `
      <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; display: block; flex-shrink: 0;">
        <polygon points="6 4 20 12 6 20 6 4"/>
      </svg>
      <span class="stop-btn-text-full">Dinlemeyi Başlat</span>
      <span class="stop-btn-text-short">Başlat</span>
    `;
    stopSessionBtn.setAttribute('title', 'Dinlemeyi Başlat');
  }
}

// ==========================================================================
// 8. MOBİL YUKARI AÇILIR ÇEKMECE (EXPANDABLE BROADCAST DECK)
// ==========================================================================
function openMobileDrawer() {
  if (!switcherConsole) return;
  switcherConsole.classList.add('drawer-open');
  if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('hidden');
  updateDrawerCounts();
}

function closeMobileDrawer() {
  if (!switcherConsole) return;
  switcherConsole.classList.remove('drawer-open');
  if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.add('hidden');
}

function toggleMobileDrawer() {
  if (!switcherConsole) return;
  if (switcherConsole.classList.contains('drawer-open')) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}

function updateDrawerCounts() {
  const count = speakers ? speakers.length : 0;
  if (drawerSpeakerCountBadge) drawerSpeakerCountBadge.textContent = count;
  if (mobileDrawerExpandCount) mobileDrawerExpandCount.textContent = count;
  if (mobileDrawerExpandBtn) {
    if (count >= 2) {
      mobileDrawerExpandBtn.classList.remove('hidden');
    } else {
      mobileDrawerExpandBtn.classList.add('hidden');
    }
  }
}

// ==========================================================================
// 9. MOD GEÇİŞİ (BAS-KONUŞ vs SÜREKLİ AKIŞ)
// ==========================================================================
function setOperationMode(mode, showNotification = true) {
  isPttActive = false;
  clearTimeout(pttReleaseTimer);
  if (isRecording) {
    stopSpeechCapture();
  }

  currentMode = mode;
  if (mode === 'ptt') {
    modePttBtn.classList.add('active');
    modePttBtn.setAttribute('aria-selected', 'true');
    modeTapBtn.classList.remove('active');
    modeTapBtn.setAttribute('aria-selected', 'false');
    dockInstructionText.innerHTML = '<strong>Bas-Konuş:</strong> Tuşa basılı tutun (veya Boşluk tuşu).';
    stopSessionBtn.classList.add('hidden');
    if (stagePttBtn) stagePttBtn.classList.remove('hidden');
  } else {
    modeTapBtn.classList.add('active');
    modeTapBtn.setAttribute('aria-selected', 'true');
    modePttBtn.classList.remove('active');
    modePttBtn.setAttribute('aria-selected', 'false');
    dockInstructionText.innerHTML = '<strong>Sürekli Akış:</strong> Konuşmacıya dokunun.';
    stopSessionBtn.classList.remove('hidden');
    if (stagePttBtn) stagePttBtn.classList.add('hidden');
    updateStopButtonState(isRecording);
  }

  renderSoundboardPads();
  saveWorkspaceData();
  if (showNotification) {
    showToast(mode === 'ptt' ? 'Bas-Konuş Modu Aktif' : 'Sürekli Akış Modu Aktif');
  }
}

// ==========================================================================
// 10. TUTANAK AKIŞI (TRANSCRIPT)
// ==========================================================================
function renderTranscriptFeed() {
  historyCounter.textContent = `${transcriptHistory.length} Kayıt`;

  const actionsWrap = document.querySelector('.journal-actions');
  const filterWrap = document.querySelector('.journal-filter-switch');
  const countBadge = document.getElementById('historyCounter');

  if (transcriptHistory.length === 0) {
    if (emptyNotice) emptyNotice.classList.remove('hidden');
    if (actionsWrap) actionsWrap.classList.add('hidden');
    if (filterWrap) filterWrap.classList.add('hidden');
    if (countBadge) countBadge.classList.add('hidden');
    Array.from(transcriptFeed.children).forEach(c => {
      if (c.id !== 'emptyNotice') c.remove();
    });
    return;
  }

  if (emptyNotice) emptyNotice.classList.add('hidden');
  if (actionsWrap) actionsWrap.classList.remove('hidden');
  if (filterWrap) filterWrap.classList.remove('hidden');
  if (countBadge) countBadge.classList.remove('hidden');
  transcriptFeed.innerHTML = '';

  const showBoth = currentFilter === 'all';

  transcriptHistory.forEach(item => {
    const entry = document.createElement('article');
    entry.className = 'journal-entry';

    const acc = ACCENT_REGISTRY[item.speakerAccent] || { name: item.speakerAccent };

    entry.innerHTML = `
      <div class="entry-meta">
        <div class="entry-speaker">
          <span class="entry-speaker-dot" style="background-color: ${item.speakerColor}"></span>
          <span class="entry-speaker-name">${escapeHtml(item.speakerName)}</span>
          <span class="entry-meta-divider">/</span>
          <span class="entry-speaker-accent">${acc.name}</span>
        </div>
        <time class="entry-timestamp">${item.time}</time>
      </div>
      <div class="entry-content">
        ${showBoth ? `<p class="entry-original">${escapeHtml(item.original)}</p>` : ''}
        <p class="entry-translation">${escapeHtml(item.translation)}</p>
      </div>
    `;

    transcriptFeed.appendChild(entry);
  });

  transcriptFeed.scrollTop = 0;
}

// ==========================================================================
// 11. OLAY DİNLEYİCİLERİ VE BAĞLANTILAR
// ==========================================================================
function setupEventListeners() {
  // Ana Sekme Geçişleri
  if (tabLiveBtn) tabLiveBtn.addEventListener('click', () => switchTab('live'));
  if (tabLangBtn) tabLangBtn.addEventListener('click', () => switchTab('lang'));
  if (quickLangBadgeBtn) quickLangBadgeBtn.addEventListener('click', swapLanguages);

  const tabResourcesBtn = document.getElementById('tabResourcesBtn');
  if (tabResourcesBtn) {
    tabResourcesBtn.addEventListener('click', () => {
      switchTab('live');
      const card = document.querySelector('.transcript-journal-card') || document.getElementById('transcriptFeed');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Oturum Tutanağı');
    });
  }

  // Mobil Kenar Çubuğu (Drawer) Geçişleri
  const mobileMenuToggleBtn = document.getElementById('mobileMenuToggleBtn');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  if (mobileMenuToggleBtn && appSidebar) {
    mobileMenuToggleBtn.addEventListener('click', () => {
      appSidebar.classList.toggle('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('hidden');
    });
  }

  if (sidebarBackdrop && appSidebar) {
    sidebarBackdrop.addEventListener('click', () => {
      appSidebar.classList.remove('open');
      sidebarBackdrop.classList.add('hidden');
    });
  }

  // Tema Butonu
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      showToast('Karanlık Stüdyo Teması Aktif');
    });
  }

  // Kulaklıkla Sesli Simultane Tercüman Butonu
  if (headphoneTtsBtn) {
    headphoneTtsBtn.addEventListener('click', toggleTtsInterpretation);
  }

  // Header Ana Dil Seçici Olayı (Dinleyici Ana Dili Değişimi)
  if (headerNativeLangSelect) {
    headerNativeLangSelect.addEventListener('change', () => {
      targetLanguage = headerNativeLangSelect.value;
      if (meetingTargetLangSelect) meetingTargetLangSelect.value = targetLanguage;
      stopTtsSpeaking();
      saveWorkspaceData();
      updateLanguageDisplayBadges();
      renderSoundboardPads();
      updateListeningPrompt();
      const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
      showToast(`Ana Dil Değiştirildi: ${langName}`);
    });
  }

  // Dil Paneli Olayları
  if (applyLangSettingsBtn) applyLangSettingsBtn.addEventListener('click', applySelectedLanguages);
  if (swapLanguagesBtn) swapLanguagesBtn.addEventListener('click', swapLanguages);
  if (meetingTargetLangSelect) {
    meetingTargetLangSelect.addEventListener('change', () => {
      targetLanguage = meetingTargetLangSelect.value;
      if (headerNativeLangSelect) headerNativeLangSelect.value = targetLanguage;
      stopTtsSpeaking();
      saveWorkspaceData();
      updateLanguageDisplayBadges();
      renderSoundboardPads();
      updateListeningPrompt();
    });
  }

  // Hızlı Dil Şablonları (Presets)
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const src = pill.getAttribute('data-src');
      const tgt = pill.getAttribute('data-tgt');
      if (src) meetingSourceLangSelect.value = src;
      if (tgt) meetingTargetLangSelect.value = tgt;
      applySelectedLanguages();
    });
  });

  // Mod Değiştirme
  modePttBtn.addEventListener('click', () => setOperationMode('ptt'));
  modeTapBtn.addEventListener('click', () => setOperationMode('tap'));

  // Sahnede Hızlı Bas-Konuş Butonu (Doğrudan Sahne Üzerinden Konuşma)
  if (stagePttBtn) {
    stagePttBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      clearTimeout(pttReleaseTimer);
      lastTranslatedSourceText = '';
      if (audioContext && audioContext.state === 'suspended') {
        try { audioContext.resume(); } catch (_) {}
      }
      ensureMicrophoneAccess().catch(() => {});
      isSessionWarm = true;
      isPttActive = true;
      stagePttBtn.classList.add('pressed');
      const activePad = soundboardGrid.querySelector('.switcher-pad.active');
      if (activePad) activePad.classList.add('pressed');
      setRecordingState(true);
      startSpeechCapture(activeSpeakerId);
    });

    const releaseStagePtt = () => {
      if (stagePttBtn.classList.contains('pressed')) {
        stagePttBtn.classList.remove('pressed');
        const activePad = soundboardGrid.querySelector('.switcher-pad.pressed');
        if (activePad) activePad.classList.remove('pressed');
        clearTimeout(pttReleaseTimer);
        pttReleaseTimer = setTimeout(() => {
          isPttActive = false;
          stopSpeechCapture();
        }, 300);
      }
    };

    stagePttBtn.addEventListener('pointerup', releaseStagePtt);
    stagePttBtn.addEventListener('pointercancel', releaseStagePtt);
    stagePttBtn.addEventListener('pointerleave', releaseStagePtt);
  }

  // Dinlemeyi Başlat / Durdur Toggle Butonu
  stopSessionBtn.addEventListener('click', () => {
    if (isRecording) {
      isSessionWarm = false;
      isPttActive = false;
      clearTimeout(pttReleaseTimer);
      stopSpeechCapture();
      showToast('Dinleme durduruldu');
    } else {
      if (audioContext && audioContext.state === 'suspended') {
        try { audioContext.resume(); } catch (e) {}
      }
      ensureMicrophoneAccess().catch(() => {});
      isSessionWarm = true;
      const spk = getActiveSpeaker();
      startSpeechCapture(spk.id);
      showToast('Dinleme başlatıldı');
    }
  });

  // Tutanak Filtreleri
  viewAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    viewAllBtn.classList.add('active');
    viewTrBtn.classList.remove('active');
    renderTranscriptFeed();
  });

  viewTrBtn.addEventListener('click', () => {
    currentFilter = 'tr';
    viewTrBtn.classList.add('active');
    viewAllBtn.classList.remove('active');
    renderTranscriptFeed();
  });

  const modalCopyBtn = document.getElementById('modalCopyBtn');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const modalClearBtn = document.getElementById('modalClearBtn');

  function copyTranscriptAction() {
    if (transcriptHistory.length === 0) {
      showToast('Kopyalanacak tutanak kaydı yok.');
      return;
    }
    let text = `SYMPOSIUM KONGRE TUTANAĞI — ${new Date().toLocaleDateString('tr-TR')}\n`;
    text += `Dinleyici Ana Dili: ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}\n\n`;
    transcriptHistory.forEach(t => {
      const spkAcc = ACCENT_REGISTRY[t.speakerAccent] || { name: t.speakerAccent || '' };
      text += `[${t.time}] ${t.speakerName} [${spkAcc.name}]:\n  Orijinal: ${t.original}\n  Çeviri (${LANGUAGE_NAMES[targetLanguage]}): ${t.translation}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      showToast('Tutanak panoya kopyalandı.');
    });
  }

  function downloadTranscriptAction() {
    if (transcriptHistory.length === 0) {
      showToast('İndirilecek kayıt yok.');
      return;
    }
    let text = `SYMPOSIUM KONGRE TUTANAĞI — ${new Date().toLocaleDateString('tr-TR')}\n`;
    text += `Dinleyici Ana Dili: ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}\n\n`;
    transcriptHistory.forEach(t => {
      const spkAcc = ACCENT_REGISTRY[t.speakerAccent] || { name: t.speakerAccent || '' };
      text += `[${t.time}] ${t.speakerName} [${spkAcc.name}]:\n  Orijinal: ${t.original}\n  Çeviri (${LANGUAGE_NAMES[targetLanguage]}): ${t.translation}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `symposium_tutanak_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    showToast('Tutanak TXT olarak indirildi.');
  }

  function clearTranscriptAction() {
    if (confirm('Tüm oturum tutanağını silmek istediğinize emin misiniz?')) {
      transcriptHistory = [];
      saveWorkspaceData();
      renderTranscriptFeed();
      liveOriginalStream.textContent = '';
      liveTranslationStream.textContent = 'Konuşmacı başladığında eşzamanlı çeviri burada görünecektir.';
      showToast('Tutanak temizlendi.');
      closeModal(settingsModal);
    }
  }

  // Panoya Kopyala
  copyScriptBtn.addEventListener('click', copyTranscriptAction);
  if (modalCopyBtn) modalCopyBtn.addEventListener('click', copyTranscriptAction);

  // TXT Olarak İndir
  downloadScriptBtn.addEventListener('click', downloadTranscriptAction);
  if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', downloadTranscriptAction);

  // Sıfırla
  clearBtn.addEventListener('click', clearTranscriptAction);
  if (modalClearBtn) modalClearBtn.addEventListener('click', clearTranscriptAction);

  // Ayarlar Modalı
  settingsBtn.addEventListener('click', () => {
    geminiApiKeyInput.value = geminiApiKey;
    fontSizeSelect.value = currentFontSize;
    if (ttsSpeedSelect) ttsSpeedSelect.value = ttsSpeed.toString();
    openModal(settingsModal);
  });

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

  saveSettingsBtn.addEventListener('click', () => {
    geminiApiKey = geminiApiKeyInput.value.trim();
    currentFontSize = fontSizeSelect.value;
    if (ttsSpeedSelect) {
      const sp = parseFloat(ttsSpeedSelect.value);
      if (!isNaN(sp) && sp >= 0.7 && sp <= 1.5) {
        ttsSpeed = sp;
      }
    }
    applyFontSize(currentFontSize);
    updateEngineBadge();
    saveWorkspaceData();
    closeModal(settingsModal);
    showToast('Yapılandırma kaydedildi.');
  });

  // Yeni Konuşmacı Modalı
  addNewSpeakerBtn.addEventListener('click', () => {
    speakerNameInput.value = '';
    openModal(addSpeakerModal);
    speakerNameInput.focus();
  });

  if (closeAddSpeakerBtn) closeAddSpeakerBtn.addEventListener('click', () => closeModal(addSpeakerModal));
  if (cancelAddSpeakerBtn) cancelAddSpeakerBtn.addEventListener('click', () => closeModal(addSpeakerModal));

  // Konuşmacı Düzenleme & Silme Modalı
  if (closeEditSpeakerBtn) closeEditSpeakerBtn.addEventListener('click', () => closeModal(editSpeakerModal));
  if (cancelEditSpeakerBtn) cancelEditSpeakerBtn.addEventListener('click', () => closeModal(editSpeakerModal));

  // Konuşmacı Düzenleme Kaydet
  editSpeakerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editSpeakerIdInput.value;
    const newName = editSpeakerNameInput.value.trim();
    const newAccent = editSpeakerAccentInput.value;
    if (!newName) return;

    const spk = speakers.find(s => s.id === id);
    if (spk) {
      spk.name = newName;
      spk.accent = newAccent;
      saveWorkspaceData();
      renderSoundboardPads();
      if (activeSpeakerId === id) {
        setActiveSpeaker(id, false);
      }
      closeModal(editSpeakerModal);
      showToast(`"${newName}" güncellendi.`);
    }
  });

  // Konuşmacı Silme Butonu
  deleteSpeakerBtn.addEventListener('click', () => {
    const id = editSpeakerIdInput.value;
    const spk = speakers.find(s => s.id === id);
    if (!spk) return;

    if (speakers.length <= 1) {
      showToast('En az bir konuşmacı kalmalıdır.');
      return;
    }

    if (confirm(`"${spk.name}" konuşmacısını silmek istediğinize emin misiniz?`)) {
      speakers = speakers.filter(s => s.id !== id);
      if (activeSpeakerId === id) {
        activeSpeakerId = speakers[0].id;
        setActiveSpeaker(activeSpeakerId, false);
      }
      saveWorkspaceData();
      renderSoundboardPads();
      updateDrawerCounts();
      if (speakers.length < 2) {
        closeMobileDrawer();
      }
      closeModal(editSpeakerModal);
      showToast(`"${spk.name}" silindi.`);
    }
  });

  // Sahne Başlığındaki Konuşmacı Bilgisine Dokunulduğunda Düzenleme Modalı Açma (Özellikle Mobilde Çok Rahat)
  const speakerIdentityEl = document.querySelector('.speaker-identity');
  if (speakerIdentityEl) {
    speakerIdentityEl.addEventListener('click', () => {
      if (activeSpeakerId) {
        openEditSpeakerModal(activeSpeakerId);
      }
    });
  }

  // Mobil Çekmece Olayları
  if (mobileDrawerExpandBtn) {
    mobileDrawerExpandBtn.addEventListener('click', toggleMobileDrawer);
  }
  if (mobileDrawerCloseBtn) {
    mobileDrawerCloseBtn.addEventListener('click', closeMobileDrawer);
  }
  if (mobileDrawerHandleBtn) {
    mobileDrawerHandleBtn.addEventListener('click', closeMobileDrawer);
  }
  if (mobileDrawerBackdrop) {
    mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);
  }
  if (drawerAddSpeakerBtn) {
    drawerAddSpeakerBtn.addEventListener('click', () => {
      speakerNameInput.value = '';
      openModal(addSpeakerModal);
      speakerNameInput.focus();
    });
  }

  // Mobilde Çekmece Tutamağından Aşağı Kaydırarak Kapatma (Swipe Down)
  if (mobileDrawerHeader) {
    let touchStartY = 0;
    mobileDrawerHeader.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    mobileDrawerHeader.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const touchEndY = e.changedTouches[0].clientY;
        if (touchEndY - touchStartY > 35) {
          closeMobileDrawer();
        }
      }
    }, { passive: true });
  }

  // Modalların Dışındaki Karanlık Alana Tıklayınca Kapat
  [addSpeakerModal, editSpeakerModal, settingsModal, iosGuideModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });

  // Klavye Kısayolları (Masaüstü): ESC ile Kapatma ve 1-9 Rakamları ile Konuşmacı Değiştirme
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileDrawer();
      closeModal(addSpeakerModal);
      closeModal(editSpeakerModal);
      closeModal(settingsModal);
      closeModal(iosGuideModal);
      return;
    }

    // Input veya textarea üzerinde yazı yazılıyorsa kısayolları engelle
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable
    )) {
      return;
    }

    // Modallardan biri açıkken kısayolları tetikleme
    const isModalOpen = !addSpeakerModal.classList.contains('hidden') ||
                        !editSpeakerModal.classList.contains('hidden') ||
                        !settingsModal.classList.contains('hidden') ||
                        (iosGuideModal && !iosGuideModal.classList.contains('hidden'));
    if (isModalOpen) return;

    // 1-9 Rakam Tuşları ile Konuşmacılar Arasında Geçiş Yap (Ali = 1, Mehmet = 2, ...)
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const speakerIdx = parseInt(e.key, 10) - 1;
      if (speakerIdx >= 0 && speakerIdx < speakers.length) {
        e.preventDefault();
        selectSpeakerByIndex(speakerIdx);
      }
    }

    // Bas-Konuş Modunda Boşluk (Space) Tuşu ile Basılı Tutma Desteği
    if (e.code === 'Space' && currentMode === 'ptt' && !e.repeat) {
      e.preventDefault();
      const activePad = soundboardGrid.querySelector('.switcher-pad.active') || soundboardGrid.querySelector('.switcher-pad');
      if (activePad && !activePad.classList.contains('pressed')) {
        clearTimeout(pttReleaseTimer);
        lastTranslatedSourceText = '';
        if (audioContext && audioContext.state === 'suspended') {
          try { audioContext.resume(); } catch (_) {}
        }
        ensureMicrophoneAccess().catch(() => {});
        isSessionWarm = true;
        isPttActive = true;
        activePad.classList.add('pressed');
        if (stagePttBtn) stagePttBtn.classList.add('pressed');
        setRecordingState(true);
        startSpeechCapture(activeSpeakerId);
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && currentMode === 'ptt') {
      const activePad = soundboardGrid.querySelector('.switcher-pad.pressed');
      if (activePad) {
        activePad.classList.remove('pressed');
      }
      if (stagePttBtn) {
        stagePttBtn.classList.remove('pressed');
      }
      clearTimeout(pttReleaseTimer);
      pttReleaseTimer = setTimeout(() => {
        isPttActive = false;
        stopSpeechCapture();
      }, 300);
    }
  });

  addSpeakerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = speakerNameInput.value.trim();
    if (!name) return;
    const accent = speakerAccentInput.value;
    const color = STUDIO_ACCENTS[speakers.length % STUDIO_ACCENTS.length];

    const newSpk = {
      id: 'spk_' + Date.now(),
      name: name,
      accent: accent,
      color: color
    };

    speakers.push(newSpk);
    saveWorkspaceData();
    renderSoundboardPads();
    setActiveSpeaker(newSpk.id, false);
    updateDrawerCounts();
    if (window.innerWidth <= 768 && speakers.length >= 2) {
      openMobileDrawer();
    }
    closeModal(addSpeakerModal);
    showToast(`"${name}" eklendi.`);
  });
}

function applyFontSize(size) {
  if (size === 'compact') {
    liveTranslationStream.style.fontSize = '22px';
  } else if (size === 'cinema') {
    liveTranslationStream.style.fontSize = '38px';
  } else {
    liveTranslationStream.style.fontSize = '30px';
  }
}

// Sistem Toast Bildirimi
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('systemToast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ==========================================================================
// 12. PWA "ANA EKRANA EKLE" POP-UP VE ADIM ADIM REHBER MOTORU
// ==========================================================================
let deferredInstallPrompt = null;

const pwaEntryModal = document.getElementById('pwaEntryModal');
const pwaEntryInstallBtn = document.getElementById('pwaEntryInstallBtn');
const pwaEntryDismissBtn = document.getElementById('pwaEntryDismissBtn');

const pwaStepsGuideModal = document.getElementById('pwaStepsGuideModal');
const closePwaGuideBtn = document.getElementById('closePwaGuideBtn');
const pwaGuideDoneBtn = document.getElementById('pwaGuideDoneBtn');

const pwaTabIosBtn = document.getElementById('pwaTabIosBtn');
const pwaTabAndroidBtn = document.getElementById('pwaTabAndroidBtn');
const pwaGuideIosContent = document.getElementById('pwaGuideIosContent');
const pwaGuideAndroidContent = document.getElementById('pwaGuideAndroidContent');

const sidebarInstallBtn = document.getElementById('sidebarInstallBtn');

function selectPwaGuideTab(platform) {
  if (platform === 'ios') {
    if (pwaTabIosBtn) pwaTabIosBtn.classList.add('active');
    if (pwaTabAndroidBtn) pwaTabAndroidBtn.classList.remove('active');
    if (pwaGuideIosContent) pwaGuideIosContent.classList.remove('hidden');
    if (pwaGuideAndroidContent) pwaGuideAndroidContent.classList.add('hidden');
  } else {
    if (pwaTabAndroidBtn) pwaTabAndroidBtn.classList.add('active');
    if (pwaTabIosBtn) pwaTabIosBtn.classList.remove('active');
    if (pwaGuideAndroidContent) pwaGuideAndroidContent.classList.remove('hidden');
    if (pwaGuideIosContent) pwaGuideIosContent.classList.add('hidden');
  }
}

function initPwaInstallationFlow() {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Android / Chrome için yerel yükleme olayını yakala
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  // Webe girince ana ekrana ekle pop-up'ını otomatik göster
  setTimeout(() => {
    const entryModal = document.getElementById('pwaEntryModal');
    if (entryModal) {
      openModal(entryModal);
    }
  }, 250);

  // Pop-up içindeki "Ana Ekrana Ekle" butonuna basıldığında
  if (pwaEntryInstallBtn) {
    pwaEntryInstallBtn.addEventListener('click', async () => {
      if (pwaEntryModal) closeModal(pwaEntryModal);

      // Android'de sistem promptu varsa tetikle
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt = null;
        } catch (e) {}
      }

      // Her halükarda nasıl ekleneceğinin adım adım rehberini aç
      selectPwaGuideTab(isIos ? 'ios' : 'android');
      if (pwaStepsGuideModal) {
        openModal(pwaStepsGuideModal);
      }
    });
  }

  // Pop-up içindeki "Daha Sonra" butonuna basıldığında
  if (pwaEntryDismissBtn) {
    pwaEntryDismissBtn.addEventListener('click', () => {
      if (pwaEntryModal) closeModal(pwaEntryModal);
    });
  }

  // Sekme geçişleri (iOS / Android)
  if (pwaTabIosBtn) {
    pwaTabIosBtn.addEventListener('click', () => selectPwaGuideTab('ios'));
  }
  if (pwaTabAndroidBtn) {
    pwaTabAndroidBtn.addEventListener('click', () => selectPwaGuideTab('android'));
  }

  // Rehberi kapatma butonları
  if (closePwaGuideBtn) {
    closePwaGuideBtn.addEventListener('click', () => {
      if (pwaStepsGuideModal) closeModal(pwaStepsGuideModal);
    });
  }
  if (pwaGuideDoneBtn) {
    pwaGuideDoneBtn.addEventListener('click', () => {
      if (pwaStepsGuideModal) closeModal(pwaStepsGuideModal);
    });
  }

  // Yan menüdeki (Sidebar) "Uygulamayı Ekle" butonu
  if (sidebarInstallBtn) {
    sidebarInstallBtn.addEventListener('click', () => {
      const appSidebar = document.getElementById('appSidebar');
      const sidebarBackdrop = document.getElementById('sidebarBackdrop');
      if (appSidebar) appSidebar.classList.remove('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');

      selectPwaGuideTab(isIos ? 'ios' : 'android');
      if (pwaStepsGuideModal) {
        openModal(pwaStepsGuideModal);
      }
    });
  }
}

// Sayfa yüklendiğinde veya script çalıştığında tetikle
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwaInstallationFlow);
} else {
  initPwaInstallationFlow();
}

