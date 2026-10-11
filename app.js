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

// Aksan & Bölge Veri Tabanı
const ACCENT_REGISTRY = {
  'en-US': { name: 'Amerikan İngilizcesi', flag: 'US', code: 'en-US' },
  'en-GB': { name: 'İngiliz İngilizcesi', flag: 'UK', code: 'en-GB' },
  'en-IN': { name: 'Hint / Güney Asya', flag: 'IN', code: 'en-IN' },
  'en-AU': { name: 'Avustralya İngilizcesi', flag: 'AU', code: 'en-AU' },
  'de-DE': { name: 'Almanca', flag: 'DE', code: 'de-DE' },
  'fr-FR': { name: 'Fransızca', flag: 'FR', code: 'fr-FR' },
  'es-ES': { name: 'İspanyolca', flag: 'ES', code: 'es-ES' },
  'tr-TR': { name: 'Türkçe', flag: 'TR', code: 'tr-TR' }
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

// Varsayılan Konuşmacı Havuzu (Varsayılan olarak tek kullanıcı)
let speakers = [
  { id: 'spk_1', name: 'Konuşmacı 1', accent: 'en-US', color: '#65C7B0' }
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
const activeLangBadgePill = document.getElementById('activeLangBadgePill');
const quickLangBadgeBtn = document.getElementById('quickLangBadgeBtn');
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
});

// İlk kullanıcı etkileşiminde mikrofon akışını bağla ve kalıcı tut
window.addEventListener('pointerdown', () => {
  ensureMicrophoneAccess();
}, { once: true });

function loadWorkspaceData() {
  try {
    const s = localStorage.getItem('sym_speakers_v4');
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) {
        speakers = parsed;
      }
    }
    const h = localStorage.getItem('sym_history_v3');
    if (h) transcriptHistory = JSON.parse(h);
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
      meetingSourceLangSelect.value = src;
    }
    const tgt = localStorage.getItem('sym_target_lang');
    if (tgt) {
      targetLanguage = tgt;
      meetingTargetLangSelect.value = tgt;
    }
  } catch (err) {
    console.warn('Veri yükleme hatası:', err);
  }
}

function saveWorkspaceData() {
  try {
    localStorage.setItem('sym_speakers_v4', JSON.stringify(speakers));
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
  const srcName = SOURCE_LANG_NAMES[sourceLanguage] || sourceLanguage;
  const tgtName = LANGUAGE_NAMES[targetLanguage] || targetLanguage.toUpperCase();

  // Üst Sekme Rozeti
  activeLangBadgePill.textContent = `${srcName.split(' ')[0]} → ${tgtName}`;

  // Canlı Sahne Rozeti
  badgeSourceText.textContent = srcName.split(' ')[0];
  badgeTargetText.textContent = tgtName;

  // Altyazı Kartı Başlığı
  targetLangLabelBadge.textContent = `${tgtName.toUpperCase()} ALTYAZI`;
}

function applySelectedLanguages() {
  sourceLanguage = meetingSourceLangSelect.value;
  targetLanguage = meetingTargetLangSelect.value;

  updateLanguageDisplayBadges();
  saveWorkspaceData();

  // Eğer ses tanıma motoru çalışıyorsa yeni kaynak dile uyarla
  if (isRecording && recognition && isRecognitionActive) {
    const cur = getActiveSpeaker();
    pendingLangSwitch = getSpeakerLang(cur);
    isRecognitionStopping = true;
    try {
      recognition.stop();
    } catch (e) {}
  }

  // Canlı Sahneye Geri Dön
  switchTab('live');
  showToast(`Toplantı Dili: ${SOURCE_LANG_NAMES[sourceLanguage]} ➔ Çeviri: ${LANGUAGE_NAMES[targetLanguage]}`);
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

function getSpeakerLang(spk) {
  if (!spk) return sourceLanguage;
  const langPrefix = sourceLanguage.split('-')[0];
  return (spk.accent && spk.accent.startsWith(langPrefix)) ? spk.accent : sourceLanguage;
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
      triggerLiveTranslation(currentLiveStream);
    }

    if (finalChunk.trim().length > 0) {
      turnSpeechBuffer = (turnSpeechBuffer + ' ' + finalChunk).trim();
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
// 5. ÇOK DİLLİ ÇEVİRİ PİPELİNE'I (GEMINI LLM & GOOGLE GTX)
// ==========================================================================
let liveTranslateTimer = null;
let liveTranslateSeq = 0;
let lastTranslatedSourceText = '';
const liveTranslationCache = new Map();

function triggerLiveTranslation(sourceText) {
  if (!sourceText || sourceText.trim().length === 0) return;
  const clean = sourceText.trim();
  if (clean === lastTranslatedSourceText) return;
  if (clean === 'Dinleniyor...' || clean.startsWith('Sistemi başlatmak')) return;

  const cacheKey = `${sourceLanguage}_${targetLanguage}_${clean}`;
  if (liveTranslationCache.has(cacheKey)) {
    liveTranslationStream.textContent = liveTranslationCache.get(cacheKey);
    lastTranslatedSourceText = clean;
    return;
  }

  clearTimeout(liveTranslateTimer);
  liveTranslateTimer = setTimeout(async () => {
    const currentSeq = ++liveTranslateSeq;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (res.ok && currentSeq === liveTranslateSeq) {
        const data = await res.json();
        if (data && data[0]) {
          const translated = data[0].map(s => s[0]).join('').trim();
          if (translated && currentSeq === liveTranslateSeq) {
            liveTranslationStream.textContent = translated;
            lastTranslatedSourceText = clean;
            liveTranslationCache.set(cacheKey, translated);
            if (liveTranslationCache.size > 200) {
              const firstKey = liveTranslationCache.keys().next().value;
              liveTranslationCache.delete(firstKey);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Canlı anlık çeviri hatası:', e);
    }
  }, 100);
}

async function translateSpeechTurn(sourceText) {
  if (!sourceText || sourceText.trim() === '') return '';

  const cleanText = sourceText.trim();
  const tgtLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

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
  const cacheKey = `${sourceLanguage}_${targetLanguage}_${cleanText}`;
  if (liveTranslationCache.has(cacheKey)) {
    return liveTranslationCache.get(cacheKey);
  }

  // 2. Standart Hızlı Web Çevirisi (GTX Uç Noktası - Hedef Dile Dinamik Çağrı)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const result = data[0].map(s => s[0]).join('').trim();
        liveTranslationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Web çeviri hatası:', err);
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

  // Çeviriyi tamamla
  const translated = await translateSpeechTurn(textToArchive);

  // Canlı Altyazıyı Güncelle
  liveTranslationStream.textContent = translated;

  // Tutanağa ekle
  const entry = {
    id: 'tr_' + Date.now(),
    speakerName: speaker.name,
    speakerColor: speaker.color,
    speakerAccent: speaker.accent,
    time: timeFormatted,
    original: textToArchive,
    translation: translated
  };

  transcriptHistory.push(entry);
  renderTranscriptFeed();
  saveWorkspaceData();
}

// ==========================================================================
// 7. SOUNDBOARD (DEV HARDWARE PADLER)
// ==========================================================================
function renderSoundboardPads() {
  soundboardGrid.innerHTML = '';

  speakers.forEach(speaker => {
    const isSelected = speaker.id === activeSpeakerId;
    const pad = document.createElement('div');
    pad.className = `switcher-pad ${isSelected ? 'active' : ''}`;
    pad.style.setProperty('--speaker-tint', speaker.color);

    const acc = ACCENT_REGISTRY[speaker.accent] || { flag: '🌐', name: speaker.accent };
    const monogram = speaker.name.substring(0, 2).toUpperCase();

    pad.innerHTML = `
      <div class="pad-head">
        <span class="pad-monogram">${monogram}</span>
        <div class="pad-tools">
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
        <span class="pad-accent">${acc.name}</span>
      </div>
      <div class="pad-foot">
        <span class="pad-trigger-text">${currentMode === 'ptt' ? 'Basılı Tutun' : 'Aktif Et'}</span>
      </div>
    `;

    // Düzenleme Butonu Dinleyicisi
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
      pad.addEventListener('click', async () => {
        await ensureMicrophoneAccess();
        if (isRecording && activeSpeakerId === speaker.id) return;

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
}

function switchSpeakerLive(newSpeaker) {
  if (activeSpeakerId === newSpeaker.id) return;

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
  if (active) {
    recordingPill.className = 'session-pill live';
    statusLabel.textContent = 'CANLI YAYIN';
  } else {
    recordingPill.className = 'session-pill idle';
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
      <span>Dinlemeyi Durdur</span>
    `;
    stopSessionBtn.setAttribute('title', 'Dinlemeyi Durdur');
  } else {
    stopSessionBtn.classList.add('start-mode');
    stopSessionBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="6 4 20 12 6 20 6 4"/>
      </svg>
      <span>Dinlemeyi Başlat</span>
    `;
    stopSessionBtn.setAttribute('title', 'Dinlemeyi Başlat');
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

  transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
}

// ==========================================================================
// 11. OLAY DİNLEYİCİLERİ VE BAĞLANTILAR
// ==========================================================================
function setupEventListeners() {
  // Ana Sekme Geçişleri
  tabLiveBtn.addEventListener('click', () => switchTab('live'));
  tabLangBtn.addEventListener('click', () => switchTab('lang'));
  quickLangBadgeBtn.addEventListener('click', () => switchTab('lang'));

  // Dil Paneli Olayları
  applyLangSettingsBtn.addEventListener('click', applySelectedLanguages);

  // Dil Değiştir (Swap) Butonu
  swapLanguagesBtn.addEventListener('click', () => {
    const curSource = meetingSourceLangSelect.value;
    const curTarget = meetingTargetLangSelect.value;

    // Basit swap haritalama
    const targetMap = { 'tr': 'tr-TR', 'en': 'en-US', 'de': 'de-DE', 'fr': 'fr-FR', 'es': 'es-ES' };
    const sourceMap = { 'tr-TR': 'tr', 'en-US': 'en', 'en-GB': 'en', 'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es' };

    if (targetMap[curTarget]) meetingSourceLangSelect.value = targetMap[curTarget];
    if (sourceMap[curSource]) meetingTargetLangSelect.value = sourceMap[curSource];

    showToast('Diller karşılıklı yer değiştirdi.');
  });

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

  // Panoya Kopyala
  copyScriptBtn.addEventListener('click', () => {
    if (transcriptHistory.length === 0) {
      showToast('Kopyalanacak tutanak kaydı yok.');
      return;
    }
    let text = `SYMPOSIUM KONGRE TUTANAĞI — ${new Date().toLocaleDateString('tr-TR')}\n`;
    text += `Diller: ${SOURCE_LANG_NAMES[sourceLanguage]} ➔ ${LANGUAGE_NAMES[targetLanguage]}\n\n`;
    transcriptHistory.forEach(t => {
      text += `[${t.time}] ${t.speakerName}:\n  Orijinal: ${t.original}\n  Çeviri (${LANGUAGE_NAMES[targetLanguage]}): ${t.translation}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      showToast('Tutanak panoya kopyalandı.');
    });
  });

  // TXT Olarak İndir
  downloadScriptBtn.addEventListener('click', () => {
    if (transcriptHistory.length === 0) {
      showToast('İndirilecek kayıt yok.');
      return;
    }
    let text = `SYMPOSIUM KONGRE TUTANAĞI — ${new Date().toLocaleDateString('tr-TR')}\n`;
    text += `Diller: ${SOURCE_LANG_NAMES[sourceLanguage]} ➔ ${LANGUAGE_NAMES[targetLanguage]}\n\n`;
    transcriptHistory.forEach(t => {
      text += `[${t.time}] ${t.speakerName}:\n  Orijinal: ${t.original}\n  Çeviri (${LANGUAGE_NAMES[targetLanguage]}): ${t.translation}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `symposium_tutanak_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    showToast('Tutanak TXT olarak indirildi.');
  });

  // Sıfırla
  clearBtn.addEventListener('click', () => {
    if (confirm('Tüm oturum tutanağını silmek istediğinize emin misiniz?')) {
      transcriptHistory = [];
      saveWorkspaceData();
      renderTranscriptFeed();
      liveOriginalStream.textContent = 'Sistemi başlatmak için aşağıdaki konuşmacı tuşuna dokunun veya basılı tutun...';
      liveTranslationStream.textContent = 'Konuşmacı başladığında eşzamanlı çeviri burada görünecektir.';
      showToast('Tutanak temizlendi.');
    }
  });

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
      closeModal(editSpeakerModal);
      showToast(`"${spk.name}" silindi.`);
    }
  });

  // Modalların Dışındaki Karanlık Alana Tıklayınca Kapat
  [addSpeakerModal, editSpeakerModal, settingsModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });

  // ESC Tuşuna Basınca Modalları Kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(addSpeakerModal);
      closeModal(editSpeakerModal);
      closeModal(settingsModal);
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
