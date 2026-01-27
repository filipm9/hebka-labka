import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/client.js';

/**
 * Floating voice recorder button that uses OpenAI Whisper for Slovak speech-to-text.
 * Shows multi-step process: Recording → Whisper → GPT cleanup → Result
 */
export function VoiceRecorder({ onToast }) {
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processingStep, setProcessingStep] = useState(null); // 'whisper' | 'gpt' | null
  const [rawTranscription, setRawTranscription] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

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

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcribedText);
      onToast?.('Text skopírovaný do schránky', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      onToast?.('Kopírovanie zlyhalo', 'error');
    }
  }, [transcribedText, onToast]);

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

  const isModalOpen = countdown !== null || isRecording || processingStep || showResult || error;

  return (
    <>
      {/* Floating microphone button */}
      {!isModalOpen && (
        <button
          onClick={startRecording}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg 
            flex items-center justify-center transition-all z-40
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
                onClick={copyToClipboard}
                className="flex-1 bg-gradient-to-r from-blush-400 to-blush-500 text-white font-medium py-3 rounded-xl 
                  shadow-md hover:shadow-lg transition-all hover:from-blush-500 hover:to-blush-600
                  flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Kopírovať
              </button>
              <button onClick={closeResult} className="px-5 py-3 text-beige-600 hover:bg-beige-100 rounded-xl transition-colors font-medium">
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && !isModalOpen && (
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

      {/* Standalone error (when no other modal) */}
      {error && !countdown && !isRecording && !processingStep && !showResult && (
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
