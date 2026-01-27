import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  getSavedTranscriptions,
  saveTranscription,
  deleteTranscription,
  markTranscriptionProcessed,
  getUnprocessedCount
} from '../utils/helpers.js';

/**
 * Floating voice recorder button that uses OpenAI Whisper for Slovak speech-to-text.
 * Shows multi-step process: Recording → Whisper → GPT cleanup → Result
 * Supports saving transcriptions to localStorage and viewing saved messages.
 */
export function VoiceRecorder({ onToast, showSavedListExternal, onCloseSavedList }) {
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processingStep, setProcessingStep] = useState(null); // 'whisper' | 'gpt' | null
  const [rawTranscription, setRawTranscription] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  
  // Saved transcriptions state
  const [showSavedList, setShowSavedList] = useState(false);
  const [savedTranscriptions, setSavedTranscriptions] = useState([]);
  const [unprocessedCount, setUnprocessedCount] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  // Load saved transcriptions on mount
  useEffect(() => {
    setSavedTranscriptions(getSavedTranscriptions());
    setUnprocessedCount(getUnprocessedCount());
  }, []);

  // Sync external showSavedList prop with internal state
  useEffect(() => {
    if (showSavedListExternal) {
      setShowSavedList(true);
    }
  }, [showSavedListExternal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current.t1);
        clearTimeout(countdownRef.current.t2);
        clearTimeout(countdownRef.current.t3);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const actuallyStartRecording = useCallback((stream) => {
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
    }

    const options = mimeType ? { mimeType } : {};
    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      recordingStartTimeRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (chunksRef.current.length === 0) {
        setError('Neboli zaznamenané žiadne audio dáta');
        return;
      }

      const audioBlob = new Blob(chunksRef.current, {
        type: mediaRecorder.mimeType || 'audio/webm',
      });

      // Start processing
      setProcessingStep('whisper');
      setRawTranscription('');
      setTranscribedText('');

      try {
        const result = await api.transcribeAudio(audioBlob);
        setRawTranscription(result.raw);
        setProcessingStep('gpt');
        
        // Small delay to show the GPT step
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setTranscribedText(result.text);
        setProcessingStep(null);
        setShowResult(true);
      } catch (err) {
        console.error('Transcription failed:', err);
        setError(err.message || 'Prepis zlyhal');
        setProcessingStep(null);
        onToast?.(err.message || 'Prepis zlyhal', 'error');
      } finally {
        setRecordingTime(0);
      }
    };

    mediaRecorder.start(1000);
    setIsRecording(true);
    setRecordingTime(0);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    recordingStartTimeRef.current = Date.now();
    
    const tick = () => {
      const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      setRecordingTime(elapsed);
      timerRef.current = setTimeout(tick, 250);
    };
    timerRef.current = setTimeout(tick, 250);
  }, [onToast]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRawTranscription('');
      setTranscribedText('');
      setShowResult(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setCountdown(3);
      
      const t1 = setTimeout(() => setCountdown(2), 1000);
      const t2 = setTimeout(() => setCountdown(1), 2000);
      const t3 = setTimeout(() => {
        setCountdown(null);
        actuallyStartRecording(stream);
      }, 3000);

      countdownRef.current = { t1, t2, t3 };

    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Prístup k mikrofónu bol odmietnutý');
        onToast?.('Prístup k mikrofónu bol odmietnutý', 'error');
      } else if (err.name === 'NotFoundError') {
        setError('Mikrofón nebol nájdený');
        onToast?.('Mikrofón nebol nájdený', 'error');
      } else {
        setError('Nepodarilo sa spustiť nahrávanie');
        onToast?.('Nepodarilo sa spustiť nahrávanie', 'error');
      }
    }
  }, [onToast, actuallyStartRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearTimeout(countdownRef.current.t1);
      clearTimeout(countdownRef.current.t2);
      clearTimeout(countdownRef.current.t3);
      countdownRef.current = null;
    }
    setCountdown(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleSave = useCallback(() => {
    try {
      saveTranscription(transcribedText, rawTranscription);
      setSavedTranscriptions(getSavedTranscriptions());
      setUnprocessedCount(getUnprocessedCount());
      onToast?.('Uložené! Upozornenie: Dáta sú len v cache prehliadača a môžete o ne prísť.', 'warning');
      setShowResult(false);
      setTranscribedText('');
      setRawTranscription('');
    } catch (err) {
      console.error('Failed to save:', err);
      onToast?.('Uloženie zlyhalo', 'error');
    }
  }, [transcribedText, rawTranscription, onToast]);

  const handleDiscard = useCallback(() => {
    setShowResult(false);
    setTranscribedText('');
    setRawTranscription('');
    onToast?.('Prepis zahodený', 'info');
  }, [onToast]);

  const handleDeleteTranscription = useCallback((id) => {
    deleteTranscription(id);
    setSavedTranscriptions(getSavedTranscriptions());
    setUnprocessedCount(getUnprocessedCount());
    onToast?.('Správa zmazaná', 'success');
  }, [onToast]);

  const handleMarkProcessed = useCallback((id) => {
    markTranscriptionProcessed(id);
    setSavedTranscriptions(getSavedTranscriptions());
    setUnprocessedCount(getUnprocessedCount());
  }, []);

  const handleCopyText = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('Text skopírovaný do schránky', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      onToast?.('Kopírovanie zlyhalo', 'error');
    }
  }, [onToast]);

  const closeSavedList = useCallback(() => {
    setShowSavedList(false);
    onCloseSavedList?.();
  }, [onCloseSavedList]);

  const closeResult = useCallback(() => {
    setShowResult(false);
    setTranscribedText('');
    setRawTranscription('');
    setError(null);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isModalOpen = countdown !== null || isRecording || processingStep || showResult || error || showSavedList;

  return (
    <>
      {/* Floating buttons */}
      {!isModalOpen && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          {/* Saved transcriptions button - only show if there are saved items */}
          {savedTranscriptions.length > 0 && (
            <button
              onClick={() => setShowSavedList(true)}
              className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all
                bg-beige-100 hover:bg-beige-200 hover:shadow-xl hover:scale-105 relative"
              title="Uložené prepisy"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-beige-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {unprocessedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unprocessedCount > 9 ? '9+' : unprocessedCount}
                </span>
              )}
            </button>
          )}
          
          {/* Microphone button */}
          <button
            onClick={startRecording}
            className="w-14 h-14 rounded-full shadow-lg 
              flex items-center justify-center transition-all
              bg-blush-400 hover:bg-blush-500 hover:shadow-xl hover:scale-105"
            title="Nahrať hlasovú poznámku"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      )}

      {/* Countdown Modal */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-blush-100 to-blush-200 flex items-center justify-center">
              <span key={countdown} className="text-5xl font-bold text-blush-500 animate-in zoom-in-50 duration-300">
                {countdown}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-beige-800">Pripravte sa</h3>
              <p className="text-sm text-beige-500 mt-1">Nahrávanie začne o chvíľu...</p>
            </div>
            <button onClick={cancelCountdown} className="text-sm text-beige-500 hover:text-beige-700 transition-colors">
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {/* Recording Modal */}
      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-6">
            {/* Animated mic */}
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-red-400/30 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
            </div>

            {/* Timer */}
            <div>
              <p className="text-4xl font-mono font-bold text-red-500">{formatTime(recordingTime)}</p>
              <p className="text-sm text-beige-500 mt-2">Hovorte po slovensky...</p>
            </div>

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-semibold rounded-2xl 
                shadow-lg hover:shadow-xl transition-all hover:from-red-600 hover:to-red-700 active:scale-[0.98]
                flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Ukončiť nahrávanie
            </button>
          </div>
        </div>
      )}

      {/* Processing Modal */}
      {processingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-md w-full space-y-6">
            {/* Progress steps */}
            <div className="flex items-center justify-center gap-3">
              {/* Whisper step */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                processingStep === 'whisper' 
                  ? 'bg-blush-100 text-blush-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {processingStep === 'whisper' ? (
                  <div className="w-4 h-4 border-2 border-blush-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                Whisper
              </div>

              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-beige-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>

              {/* GPT step */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                processingStep === 'gpt'
                  ? 'bg-blush-100 text-blush-600'
                  : processingStep === 'whisper'
                    ? 'bg-beige-100 text-beige-400'
                    : 'bg-green-100 text-green-600'
              }`}>
                {processingStep === 'gpt' ? (
                  <div className="w-4 h-4 border-2 border-blush-500 border-t-transparent rounded-full animate-spin" />
                ) : processingStep === 'whisper' ? (
                  <div className="w-4 h-4" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                ChatGPT
              </div>
            </div>

            {/* Current step info */}
            <div className="text-center">
              {processingStep === 'whisper' ? (
                <>
                  <h3 className="text-lg font-semibold text-beige-800">Prepisujem audio...</h3>
                  <p className="text-sm text-beige-500 mt-1">OpenAI Whisper analyzuje váš hlas</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-beige-800">Opravujem text...</h3>
                  <p className="text-sm text-beige-500 mt-1">ChatGPT kontroluje gramatiku a preklepy</p>
                </>
              )}
            </div>

            {/* Show raw transcription when available */}
            {rawTranscription && (
              <div className="bg-beige-50 rounded-2xl p-4 border border-beige-200">
                <p className="text-xs font-medium text-beige-400 uppercase tracking-wide mb-2">Whisper prepis:</p>
                <p className="text-beige-700 text-sm">{rawTranscription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && transcribedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm px-4" onClick={closeResult}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full space-y-5" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-beige-800">Prepis hotový</h3>
              </div>
              <button onClick={closeResult} className="text-beige-400 hover:text-beige-600 transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Show both versions if they differ */}
            {rawTranscription && rawTranscription !== transcribedText && (
              <div className="bg-beige-50/50 rounded-xl p-3 border border-beige-100">
                <p className="text-xs font-medium text-beige-400 mb-1">Pôvodný prepis (Whisper):</p>
                <p className="text-sm text-beige-500 line-through">{rawTranscription}</p>
              </div>
            )}

            {/* Final text */}
            <div className="bg-gradient-to-br from-green-50 to-beige-50 rounded-2xl p-4 border border-green-200">
              <p className="text-xs font-medium text-green-600 mb-2">Opravený text:</p>
              <p className="text-beige-800 leading-relaxed">{transcribedText}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 rounded-xl 
                  shadow-md hover:shadow-lg transition-all hover:from-green-600 hover:to-green-700
                  flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Uložiť
              </button>
              <button 
                onClick={handleDiscard} 
                className="flex-1 bg-beige-100 hover:bg-beige-200 text-beige-700 font-medium py-3 rounded-xl transition-colors
                  flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Zahodiť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Transcriptions List Modal */}
      {showSavedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm px-4" onClick={closeSavedList}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-beige-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-beige-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-beige-800">Uložené prepisy</h3>
                {unprocessedCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {unprocessedCount} nespracovaných
                  </span>
                )}
              </div>
              <button onClick={closeSavedList} className="text-beige-400 hover:text-beige-600 transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Warning banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-xs text-amber-700">
                Tieto dáta sú uložené len v cache prehliadača. Pri vymazaní cache alebo zmene prehliadača o ne môžete prísť.
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {savedTranscriptions.length === 0 ? (
                <div className="text-center py-8 text-beige-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p>Žiadne uložené prepisy</p>
                </div>
              ) : (
                savedTranscriptions.map((item) => (
                  <div 
                    key={item.id} 
                    className={`rounded-xl p-4 border transition-all ${
                      item.processed 
                        ? 'bg-beige-50/50 border-beige-100' 
                        : 'bg-white border-beige-200 shadow-sm'
                    }`}
                  >
                    {/* Item header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-beige-400">
                          {new Date(item.createdAt).toLocaleDateString('sk-SK', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {item.processed ? (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Spracované
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                            Nové
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Text content */}
                    <p className={`text-sm leading-relaxed mb-3 ${item.processed ? 'text-beige-500' : 'text-beige-700'}`}>
                      {item.text}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyText(item.text)}
                        className="text-xs px-3 py-1.5 bg-beige-100 hover:bg-beige-200 text-beige-600 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Kopírovať
                      </button>
                      
                      {!item.processed && (
                        <button
                          onClick={() => handleMarkProcessed(item.id)}
                          className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Označiť ako spracované
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteTranscription(item.id)}
                        className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Zmazať
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-beige-100">
              <button
                onClick={closeSavedList}
                className="w-full py-3 bg-beige-100 hover:bg-beige-200 text-beige-700 font-medium rounded-xl transition-colors"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone error (when no other modal) */}
      {error && !countdown && !isRecording && !processingStep && !showResult && !showSavedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/60 backdrop-blur-sm px-4" onClick={() => setError(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-beige-800">Chyba</h3>
              <p className="text-beige-600 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="w-full py-3 bg-beige-100 hover:bg-beige-200 text-beige-700 font-medium rounded-xl transition-colors">
              Zavrieť
            </button>
          </div>
        </div>
      )}
    </>
  );
}
