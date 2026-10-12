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

// Varsayılan Konuşmacı Havuzu (Örnek: Konuşmacı 1 İngilizce, Konuşmacı 2 Almanca)
let speakers = [
  { id: 'spk_1', name: 'Konuşmacı 1', accent: 'en-US', color: '#65C7B0' },
  { id: 'spk_2', name: 'Konuşmacı 2', accent: 'de-DE', color: '#D6A66B' }
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
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

// ==========================================================================
// 1. YAŞAM DÖNGÜSÜ & YEREL HAFIZA (STORAGE)
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  loadWorkspaceData();
  renderSoundboardPads();
  renderTranscriptFeed();
  initRecognitionEngine();
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
    const s = localStorage.getItem('sym_speakers_v5');
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) {
        speakers = parsed;
      }
    } else {
      const sOld = localStorage.getItem('sym_speakers_v4');
      if (sOld) {
        const parsedOld = JSON.parse(sOld);
        if (Array.isArray(parsedOld) && parsedOld.length >= 2) {
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
    const m = localStorage.getItem('sym_mode_pref');
    if (m === 'tap' || m === 'ptt') setOperationMode(m);
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
    const tgt = localStorage.getItem('sym_target_lang');
    if (tgt) {
      targetLanguage = tgt;
      if (meetingTargetLangSelect) meetingTargetLangSelect.value = tgt;
      if (headerNativeLangSelect) headerNativeLangSelect.value = tgt;
    } else {
      targetLanguage = 'tr';
      if (headerNativeLangSelect) headerNativeLangSelect.value = 'tr';
    }
  } catch (err) {
    console.warn('Veri yükleme hatası:', err);
  }
}

function saveWorkspaceData() {
  try {
    localStorage.setItem('sym_speakers_v5', JSON.stringify(speakers));
    localStorage.setItem('sym_history_v3', JSON.stringify(transcriptHistory));
    localStorage.setItem('sym_gemini_key', geminiApiKey);
    localStorage.setItem('sym_mode_pref', currentMode);
    localStorage.setItem('sym_font_pref', currentFontSize);
    localStorage.setItem('sym_source_lang', sourceLanguage);
    localStorage.setItem('sym_target_lang', targetLanguage);
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

  // Eğer ses tanıma motoru çalışıyorsa yeni kaynak dile uyarla
  if (recognition) {
    const targetRecLang = getSpeakerLang(getActiveSpeaker());
    if (isRecording && isRecognitionActive) {
      pendingLangSwitch = targetRecLang;
      isRecognitionStopping = true;
      try {
        recognition.stop();
      } catch (e) {}
    } else {
      recognition.lang = targetRecLang;
    }
  }

  // Akış tamponlarını temizle
  lastTranslatedSourceText = '';

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
  if (recognition) {
    const targetRecLang = getSpeakerLang(getActiveSpeaker());
    if (isRecording && isRecognitionActive) {
      pendingLangSwitch = targetRecLang;
      isRecognitionStopping = true;
      try { recognition.stop(); } catch (e) {}
    } else {
      recognition.lang = targetRecLang;
    }
  }

  // Ekran tamponlarını ve referans metinleri temizle
  lastTranslatedSourceText = '';
  liveOriginalStream.textContent = 'Dinleniyor...';
  liveTranslationStream.textContent = '...';

  const srcAcc = ACCENT_REGISTRY[curSpk.accent] || { name: curSpk.accent };
  const tgtName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  showToast(`Diller Değiştirildi: ${srcAcc.name.split(' ')[0]} ⇄ ${tgtName}`);
}

function switchTab(tabName) {
  if (tabName === 'live') {
    tabLiveBtn.classList.add('active');
    tabLangBtn.classList.remove('active');
    viewLiveSection.classList.remove('hidden');
    viewLanguageSection.classList.add('hidden');
  } else {
    tabLangBtn.classList.add('active');
    tabLiveBtn.classList.remove('active');
    viewLanguageSection.classList.remove('hidden');
    viewLiveSection.classList.add('hidden');
  }
}

// ==========================================================================
// 3. KALICI MİKROFON ERİŞİMİ VE STÜDYO VU METRE
// ==========================================================================
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
      analyser.fftSize = 32;
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

function startVuMeterLoop() {
  if (isVuMeterRunning || !analyser) return;
  isVuMeterRunning = true;

  const leds = vuLeds ? vuLeds.querySelectorAll('.vu-led') : [];
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function updateLeds() {
    if (analyser && isRecording) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      let average = sum / dataArray.length;

      let litCount = Math.min(8, Math.round((average / 110) * 8));

      leds.forEach((led, idx) => {
        if (idx < litCount) {
          led.classList.add('lit');
        } else {
          led.classList.remove('lit');
        }
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
    await ensureMicrophoneAccess();
  } catch (e) {}
}

// ==========================================================================
// 4. SES TANIMA VE TAMPON MOTORU (SPEECH ENGINE)
// ==========================================================================
let turnSpeechBuffer = '';
let streamAutoCommitTimer = null;

function getSpeakerLang(spk) {
  if (spk && spk.accent) return spk.accent;
  return 'en-US';
}

function initRecognitionEngine() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('Tarayıcınız Web Speech API desteklemiyor (Chrome/Edge önerilir).');
    return;
  }

  if (recognition) return;

  recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecognitionActive = true;
    isRecognitionStopping = false;
    setRecordingState(true);
  };

  recognition.onresult = (event) => {
    // Bas-Konuş modunda tuşa basılı değilken ve tolerans süresi dışındayken konuşmaları yok say
    if (currentMode === 'ptt' && !isPttActive) {
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

    const currentLiveStream = (turnSpeechBuffer + ' ' + finalChunk + ' ' + interimChunk).trim();
    if (currentLiveStream.length > 0) {
      liveOriginalStream.textContent = currentLiveStream;
      liveOriginalStream.scrollTop = liveOriginalStream.scrollHeight;
      triggerLiveTranslation(currentLiveStream);
    }

    if (finalChunk.trim().length > 0) {
      turnSpeechBuffer = (turnSpeechBuffer + ' ' + finalChunk).trim();

      // Sürekli Akış modunda: uzun konuşmaların dev bir paragrafa dönüşüp sahneyi doldurmasını önle
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

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Mikrofon erişim izni verilmedi.');
      isRecording = false;
      isRecognitionActive = false;
      isRecognitionStopping = false;
      isPttActive = false;
      isSessionWarm = false;
      setRecordingState(false);
    } else if (event.error === 'aborted') {
      // Bilinçli durdurmalarda yoksay
    }
  };

  recognition.onend = () => {
    isRecognitionActive = false;
    isRecognitionStopping = false;

    // 1. Bekleyen dil geçişi varsa yeni dille başlat
    if (pendingLangSwitch) {
      const targetLang = pendingLangSwitch;
      pendingLangSwitch = null;
      recognition.lang = targetLang;
      if (isSessionWarm || isRecording) {
        try {
          recognition.start();
          isRecognitionActive = true;
        } catch (e) {
          console.warn('Dil geçişinde başlatma hatası:', e);
        }
      }
      return;
    }

    // 2. Bekleyen konuşmacı başlatması varsa
    if (pendingStartSpeakerId) {
      const spkId = pendingStartSpeakerId;
      pendingStartSpeakerId = null;
      if (isSessionWarm || isRecording) {
        const spk = speakers.find(s => s.id === spkId) || getActiveSpeaker();
        recognition.lang = getSpeakerLang(spk);
        try {
          recognition.start();
          isRecognitionActive = true;
        } catch (e) {
          console.warn('Bekleyen konuşmacı başlatma hatası:', e);
        }
      }
      return;
    }

    // 3. Oturum aktifse (Sürekli akış veya Bas-Konuş arka planı): sessizlik zaman aşımında motoru sıcak tut
    if (isSessionWarm || isRecording) {
      try {
        const cur = getActiveSpeaker();
        recognition.lang = getSpeakerLang(cur);
        recognition.start();
        isRecognitionActive = true;
      } catch (e) {
        console.warn('Otomatik devam başlatma:', e);
      }
    } else {
      setRecordingState(false);
    }
  };
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

  // 1. Google GTX (Özel Kaynak ve Hedef Dil Parametreleri ile)
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

  // 2. Yedek Servis: MyMemory API (Ağ engeli veya kota aşımlarında devreye girer)
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
  const textToArchive = (turnSpeechBuffer || liveOriginalStream.textContent).trim();
  turnSpeechBuffer = '';

  if (!textToArchive || textToArchive.startsWith('Sistemi başlatmak') || textToArchive === 'Dinleniyor...') {
    return;
  }

  const speaker = getActiveSpeaker();
  await archiveSpeechTurnForSpeaker(speaker, textToArchive);
}

async function archiveSpeechTurnForSpeaker(speaker, textToArchive) {
  if (!textToArchive || textToArchive.startsWith('Sistemi başlatmak') || textToArchive === 'Dinleniyor...') {
    return;
  }

  const timeFormatted = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // Çeviriyi bu konuşmacının dilinden hedef ana dile yap
  const translated = await translateSpeechTurn(textToArchive, speaker);

  // Canlı Altyazıyı Güncelle
  liveTranslationStream.textContent = translated;

  // Tutanağa ekle (En güncel konuşma her zaman en üstte)
  const entry = {
    id: 'tr_' + Date.now(),
    timestamp: Date.now(),
    speakerName: speaker.name,
    speakerColor: speaker.color,
    speakerAccent: speaker.accent,
    time: timeFormatted,
    original: textToArchive,
    translation: translated
  };

  transcriptHistory.unshift(entry);
  renderTranscriptFeed();
  saveWorkspaceData();
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

    pad.innerHTML = `
      <div class="pad-head">
        <div class="pad-identity-tag">
          <span class="pad-monogram">${monogram}</span>
          ${keyNumber ? `<span class="pad-key-badge" title="Klavye Kısayolu: [${keyNumber}]">${keyNumber}</span>` : ''}
        </div>
        <div class="pad-tools">
          <span class="pad-route-tag" title="Çeviri Rotası: ${fullRouteHint}">${routeLabel}</span>
          <button type="button" class="pad-edit-btn" title="Düzenle veya Sil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <span class="pad-status-dot"></span>
        </div>
      </div>
      <div class="pad-body">
        <span class="pad-name">${escapeHtml(speaker.name)}</span>
        <div class="pad-meta-row">
          <span class="pad-accent">${acc.name}</span>
        </div>
      </div>
      <div class="pad-foot">
        <span class="pad-mobile-lang">${routeLabel}</span>
        <span class="pad-trigger-text">${currentMode === 'ptt' ? 'Basılı Tutun' : 'Aktif Et'}</span>
      </div>
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
      pad.addEventListener('pointerdown', async (e) => {
        e.preventDefault();
        clearTimeout(pttReleaseTimer);
        lastTranslatedSourceText = '';
        await ensureMicrophoneAccess();
        isSessionWarm = true;
        isPttActive = true;
        setActiveSpeaker(speaker.id, false);
        pad.classList.add('pressed');
        setRecordingState(true);
        startSpeechCapture(speaker.id);
      });

      const releasePad = () => {
        if (pad.classList.contains('pressed')) {
          pad.classList.remove('pressed');
          // Son hecelerin şebekeden tam ulaşması için 300ms tolerans
          clearTimeout(pttReleaseTimer);
          pttReleaseTimer = setTimeout(() => {
            isPttActive = false;
            setRecordingState(false);
            commitSpeechTurn();
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
    showToast(`Konuşmacı seçildi: [${index + 1}] ${targetSpeaker.name}`);
  }

  // Tuşa hafif basılma efekti ver
  const pads = soundboardGrid.querySelectorAll('.switcher-pad');
  if (pads[index]) {
    pads[index].classList.add('pressed');
    setTimeout(() => pads[index].classList.remove('pressed'), 200);
  }
}

function switchSpeakerLive(newSpeaker) {
  if (activeSpeakerId === newSpeaker.id) return;

  if (streamAutoCommitTimer) {
    clearTimeout(streamAutoCommitTimer);
    streamAutoCommitTimer = null;
  }

  const prevSpeaker = getActiveSpeaker();
  const textToArchive = (turnSpeechBuffer || liveOriginalStream.textContent).trim();
  turnSpeechBuffer = '';
  lastTranslatedSourceText = '';
  liveOriginalStream.textContent = 'Dinleniyor...';

  // Önceki konuşmacının metnini arka planda kaydet ve çevir
  if (textToArchive && !textToArchive.startsWith('Sistemi başlatmak') && textToArchive !== 'Dinleniyor...') {
    archiveSpeechTurnForSpeaker(prevSpeaker, textToArchive);
  }

  // Yeni konuşmacıyı gecikmesiz olarak aktif yap (Arayüz anında güncellenir)
  setActiveSpeaker(newSpeaker.id, false);

  const currentRecLang = recognition ? recognition.lang : sourceLanguage;
  const targetRecLang = getSpeakerLang(newSpeaker);
  const currentFamily = (currentRecLang || '').split('-')[0].toLowerCase();
  const targetFamily = (targetRecLang || '').split('-')[0].toLowerCase();

  // AYNI DİL AİLESİ: Tanıma motorunu asla kesme! Mikrofon açık kalır, sıfır izin sorusu!
  if (currentFamily === targetFamily && isRecognitionActive) {
    return;
  }

  // FARKLI DİL AİLESİ: Güvenli dil geçişi yap
  if (isRecognitionActive) {
    pendingLangSwitch = targetRecLang;
    isRecognitionStopping = true;
    try {
      recognition.stop();
    } catch (e) {}
  } else {
    startSpeechCapture(newSpeaker.id);
  }
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
    }
  });

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
  if (!recognition) initRecognitionEngine();
  if (!recognition) return;

  const spk = speakers.find(s => s.id === speakerId) || getActiveSpeaker();
  const targetLang = getSpeakerLang(spk);

  // Motor durma aşamasındaysa durunca başlaması için kaydet
  if (isRecognitionStopping) {
    pendingStartSpeakerId = spk.id;
    setRecordingState(true);
    turnSpeechBuffer = '';
    lastTranslatedSourceText = '';
    liveOriginalStream.textContent = 'Dinleniyor...';
    return;
  }

  // Zaten çalışıyorsa (motor sıcaksa) ve aynı dilse tekrar start ÇAĞIRMA! (InvalidStateError ve izin penceresini önler)
  if (isRecognitionActive) {
    const currentFamily = (recognition.lang || '').split('-')[0].toLowerCase();
    const targetFamily = (targetLang || '').split('-')[0].toLowerCase();
    if (currentFamily === targetFamily) {
      turnSpeechBuffer = '';
      lastTranslatedSourceText = '';
      liveOriginalStream.textContent = 'Dinleniyor...';
      return;
    }
    // Farklı dilse durdurup onend içinde yeni dille başlat
    pendingLangSwitch = targetLang;
    isRecognitionStopping = true;
    try { recognition.stop(); } catch (e) {}
    return;
  }

  recognition.lang = targetLang;
  turnSpeechBuffer = '';
  lastTranslatedSourceText = '';
  liveOriginalStream.textContent = 'Dinleniyor...';
  setRecordingState(true);

  try {
    recognition.start();
    isRecognitionActive = true;
  } catch (e) {
    console.warn('startSpeechCapture başlatma:', e);
    if (isRecording || isSessionWarm) {
      pendingStartSpeakerId = spk.id;
    }
  }
}

function stopSpeechCapture() {
  if (!isRecording && !isRecognitionActive) return;
  isRecording = false;
  isPttActive = false;
  isSessionWarm = false;
  clearTimeout(pttReleaseTimer);
  if (streamAutoCommitTimer) {
    clearTimeout(streamAutoCommitTimer);
    streamAutoCommitTimer = null;
  }
  pendingLangSwitch = null;
  pendingStartSpeakerId = null;

  if (isRecognitionActive) {
    isRecognitionStopping = true;
    try { recognition.stop(); } catch (e) {}
  }

  setRecordingState(false);
  commitSpeechTurn();
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
}

function updateStopButtonState(active) {
  if (!stopSessionBtn) return;
  if (active) {
    stopSessionBtn.classList.remove('start-mode');
    stopSessionBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <span class="stop-btn-text-full">Dinlemeyi Durdur</span>
      <span class="stop-btn-text-short">Durdur</span>
    `;
    stopSessionBtn.setAttribute('title', 'Dinlemeyi Durdur');
  } else {
    stopSessionBtn.classList.add('start-mode');
    stopSessionBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
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
function setOperationMode(mode) {
  isPttActive = false;
  clearTimeout(pttReleaseTimer);
  if (isRecording) {
    commitSpeechTurn();
    setRecordingState(false);
  }

  currentMode = mode;
  if (mode === 'ptt') {
    modePttBtn.classList.add('active');
    modePttBtn.setAttribute('aria-selected', 'true');
    modeTapBtn.classList.remove('active');
    modeTapBtn.setAttribute('aria-selected', 'false');
    dockInstructionText.innerHTML = '<strong>Bas-Konuş:</strong> Tuşa basılı tutun.';
    stopSessionBtn.classList.add('hidden');
  } else {
    modeTapBtn.classList.add('active');
    modeTapBtn.setAttribute('aria-selected', 'true');
    modePttBtn.classList.remove('active');
    modePttBtn.setAttribute('aria-selected', 'false');
    dockInstructionText.innerHTML = '<strong>Sürekli Akış:</strong> Konuşmacıya dokunun.';
    stopSessionBtn.classList.remove('hidden');
    updateStopButtonState(isRecording);
  }

  renderSoundboardPads();
  saveWorkspaceData();
  showToast(mode === 'ptt' ? 'Bas-Konuş Modu Aktif' : 'Sürekli Akış Modu Aktif');
}

// ==========================================================================
// 10. TUTANAK AKIŞI (TRANSCRIPT)
// ==========================================================================
function renderTranscriptFeed() {
  historyCounter.textContent = `${transcriptHistory.length} Kayıt`;

  if (transcriptHistory.length === 0) {
    emptyNotice.classList.remove('hidden');
    Array.from(transcriptFeed.children).forEach(c => {
      if (c.id !== 'emptyNotice') c.remove();
    });
    return;
  }

  emptyNotice.classList.add('hidden');
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

  // Header Ana Dil Seçici Olayı (Dinleyici Ana Dili Değişimi)
  if (headerNativeLangSelect) {
    headerNativeLangSelect.addEventListener('change', () => {
      targetLanguage = headerNativeLangSelect.value;
      if (meetingTargetLangSelect) meetingTargetLangSelect.value = targetLanguage;
      saveWorkspaceData();
      updateLanguageDisplayBadges();
      renderSoundboardPads();
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
      saveWorkspaceData();
      updateLanguageDisplayBadges();
      renderSoundboardPads();
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

  // Dinlemeyi Başlat / Durdur Toggle Butonu
  stopSessionBtn.addEventListener('click', async () => {
    if (isRecording) {
      isSessionWarm = false;
      isPttActive = false;
      clearTimeout(pttReleaseTimer);
      stopSpeechCapture();
      showToast('Dinleme durduruldu');
    } else {
      await ensureMicrophoneAccess();
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
    openModal(settingsModal);
  });

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

  saveSettingsBtn.addEventListener('click', () => {
    geminiApiKey = geminiApiKeyInput.value.trim();
    currentFontSize = fontSizeSelect.value;
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
// 12. PWA AKILLI YÜKLEME ŞERİDİ (SMART INSTALL BANNER & IOS REHBERİ)
// ==========================================================================
let deferredInstallPrompt = null;
const pwaSmartBanner = document.getElementById('pwaSmartBanner');
const pwaInstallActionBtn = document.getElementById('pwaInstallActionBtn');
const pwaDismissBannerBtn = document.getElementById('pwaDismissBannerBtn');
const iosGuideModal = document.getElementById('iosGuideModal');
const closeIosGuideBtn = document.getElementById('closeIosGuideBtn');
const dismissIosGuideBtn = document.getElementById('dismissIosGuideBtn');

function initPwaInstallationFlow() {
  if (!pwaSmartBanner) return;

  // Önceki kapatma kayıtlarını temizle (her sayfa yenilendiğinde garanti çıkması için)
  try { localStorage.removeItem('sym_pwa_dismissed'); } catch (e) {}

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  // Yalnızca uygulama ana ekrandan tam ekran açılmışsa gizle
  if (isStandalone) {
    pwaSmartBanner.classList.add('hidden');
    return;
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // MOBİLDE HER SAYFA YENİLENDİĞİNDE ŞERİDİ GÖSTER
  if (isMobile) {
    setTimeout(() => {
      showPwaBanner();
    }, 350);
  }

  // Android ve Masaüstü Tarayıcılar İçin Otomatik Yükleme Olayı
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (isMobile) {
      showPwaBanner();
    }
  });

  // Ekle Butonuna Basıldığında
  if (pwaInstallActionBtn) {
    pwaInstallActionBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        // Android / Desktop Chrome: Resmi sistem yükleme penceresini aç
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          hidePwaBanner();
        }
        deferredInstallPrompt = null;
      } else if (isIos) {
        // iPhone (Safari): 2 adımlı şık mini rehberi aç
        openModal(iosGuideModal);
      } else {
        openModal(iosGuideModal);
      }
    });
  }

  // Kapat Butonuna Basıldığında: Sadece o an kapatır, sayfa yenilendiğinde tekrar gelir
  if (pwaDismissBannerBtn) {
    pwaDismissBannerBtn.addEventListener('click', () => {
      hidePwaBanner();
    });
  }

  // iOS Rehberi Kapatma Butonları
  if (closeIosGuideBtn) closeIosGuideBtn.addEventListener('click', () => closeModal(iosGuideModal));
  if (dismissIosGuideBtn) dismissIosGuideBtn.addEventListener('click', () => closeModal(iosGuideModal));
}

function showPwaBanner() {
  if (pwaSmartBanner) {
    pwaSmartBanner.classList.remove('hidden');
  }
}

function hidePwaBanner() {
  if (pwaSmartBanner) {
    pwaSmartBanner.classList.add('hidden');
  }
}

